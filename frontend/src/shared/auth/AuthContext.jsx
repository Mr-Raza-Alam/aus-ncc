import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('aus_ncc_token'));
  const [loading, setLoading] = useState(true);
  const [activeUnit, setActiveUnitState] = useState(
    () => localStorage.getItem('aus_ncc_active_unit') || '3AB'
  );

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      const storedToken = localStorage.getItem('aus_ncc_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          const userData = response.data.data;
          setUser(userData);
          setToken(storedToken);

          // Initialise unit from user data if not already set
          if (!localStorage.getItem('aus_ncc_active_unit') && userData.unit) {
            setActiveUnitState(userData.unit);
            localStorage.setItem('aus_ncc_active_unit', userData.unit);
          }
        } else {
          clearAuth();
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('aus_ncc_token');
    localStorage.removeItem('aus_ncc_user');
    localStorage.removeItem('aus_ncc_active_unit');
  }, []);

  const login = useCallback(async (identifier, password, chosenUnit) => {
    const response = await api.post('/auth/login', { identifier, password });

    if (response.data.success) {
      const { token: newToken, user: userData, mustChangePassword } = response.data.data;

      localStorage.setItem('aus_ncc_token', newToken);
      setToken(newToken);
      setUser(userData);

      // If lead_admin, lock to chosen battalion from login; otherwise strictly lock to user's database unit
      const isLead = userData.roles?.includes('lead_admin');
      const unit = isLead ? (chosenUnit || userData.unit || '3AB') : (userData.unit || '3AB');
      localStorage.setItem('aus_ncc_active_unit', unit);
      setActiveUnitState(unit);

      return {
        mustChangePassword,
        profileCompleted: userData.profileCompleted,
        user: userData,
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  }, []);

  const updateUser = useCallback((updatedUserData) => {
    setUser((prev) => ({ ...prev, ...updatedUserData }));
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    window.location.href = '/login';
  }, [clearAuth]);

  const setActiveUnit = useCallback((unitCode) => {
    localStorage.setItem('aus_ncc_active_unit', unitCode);
    setActiveUnitState(unitCode);
  }, []);

  // ── Role helpers ──────────────────────────────────────────
  const isAuthenticated = !!user && !!token;

  const isLeadAdmin = user?.roles?.includes('lead_admin') ?? false;
  const isCTO = user?.roles?.includes('cto') ?? false;
  const isAssistant = user?.roles?.includes('assistant') ?? false;
  const isAdmin = isLeadAdmin || isCTO || isAssistant;
  const isCadet = user?.roles?.includes('ncc-cdt') ?? false;

  const hasRole = useCallback(
    (role) => user?.roles?.includes(role) ?? false,
    [user]
  );

  const hasAnyRole = useCallback(
    (roles) => roles.some((r) => user?.roles?.includes(r)),
    [user]
  );

  const value = {
    user,
    token,
    loading,
    activeUnit,
    login,
    logout,
    updateUser,
    setActiveUnit,
    isAuthenticated,
    isLeadAdmin,
    isCTO,
    isAssistant,
    isAdmin,
    isCadet,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
