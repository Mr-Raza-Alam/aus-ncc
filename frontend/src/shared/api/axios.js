import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ── Request interceptor ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Prevent accidental duplicate '/api/api' prefixes
    if (config.url && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api/, '');
    }

    const token = localStorage.getItem('aus_ncc_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const activeUnit = localStorage.getItem('aus_ncc_active_unit');
    if (activeUnit) {
      config.headers['x-active-unit'] = activeUnit;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor ─────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('aus_ncc_token');
      localStorage.removeItem('aus_ncc_user');
      localStorage.removeItem('aus_ncc_active_unit');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
