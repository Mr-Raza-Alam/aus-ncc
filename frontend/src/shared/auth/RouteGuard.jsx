import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Loader from '../../components/Loader/Loader';

/**
 * PrivateRoute – redirects unauthenticated users to /login.
 */
export function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullPage text="Verifying session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/**
 * RoleRoute – additionally checks the user has at least one of the required roles.
 */
export function RoleRoute({ roles, children }) {
  const { hasAnyRole, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Loader fullPage text="Verifying session…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!hasAnyRole(roles)) {
    return <ForbiddenPage />;
  }

  return children;
}

function ForbiddenPage() {
  return (
    <div className="forbidden-page">
      <div className="forbidden-content">
        <h1>403 — Access Denied</h1>
        <p>You do not have permission to view this page.</p>
        <a href="/dashboard" className="btn btn-primary">
          Back to Dashboard
        </a>
      </div>

      <style>{`
        .forbidden-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80vh;
          padding: 24px;
        }
        .forbidden-content {
          text-align: center;
        }
        .forbidden-icon {
          font-size: 4rem;
          display: block;
          margin-bottom: 16px;
        }
        .forbidden-content h1 {
          font-size: 1.75rem;
          color: var(--navy);
          margin-bottom: 8px;
        }
        .forbidden-content p {
          color: var(--text-secondary);
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
}
