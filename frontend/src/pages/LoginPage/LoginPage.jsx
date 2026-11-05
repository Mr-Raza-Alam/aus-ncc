import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import FormInput from '../../components/FormInput/FormInput';
import './LoginPage.css';

const PRESET_ACCOUNTS = [
  {
    label: 'Lead Admin',
    identifier: 'admin@ausncc.in',
    password: 'Admin@123',
    role: 'Global Admin',
    unit: 'ALL',
  },
  {
    label: 'CTO 3AB',
    identifier: 'cto.3ab@ausncc.in',
    password: 'Cto3ab@123',
    role: 'Care Taker Officer (3AB)',
    unit: '3AB',
  },
  {
    label: 'CTO 62AB',
    identifier: 'cto.62ab@ausncc.in',
    password: 'Cto62ab@123',
    role: 'Care Taker Officer (62AB)',
    unit: '62AB',
  },
  {
    label: 'SUO (Senior)',
    identifier: 'suo.3ab@ausncc.in',
    password: 'Suo3ab@123',
    role: 'Senior Under Officer',
    unit: '3AB',
  },
  {
    label: '1st Year Cadet',
    identifier: 'AS/24/SDA/100201',
    password: '15082005',
    role: 'Cadet (SD)',
    unit: '3AB',
  },
];

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const searchParams = new URLSearchParams(location.search);
  const preferredUnit = searchParams.get('unit');

  // If user visits /login directly without choosing a unit, redirect to the gateway
  useEffect(() => {
    if (!preferredUnit) {
      navigate('/login/select-unit', { replace: true });
    }
  }, [preferredUnit, navigate]);

  const fillCredentials = (acc) => {
    setIdentifier(acc.identifier);
    setPassword(acc.password);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Please enter both your identifier and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(identifier.trim(), password, preferredUnit || '3AB');

      if (result.mustChangePassword) {
        navigate('/change-password', { replace: true });
      } else if (
        !result.profileCompleted &&
        result.user?.roles?.includes('ncc-cdt') &&
        !result.user?.roles?.includes('lead_admin') &&
        !result.user?.roles?.includes('cto')
      ) {
        navigate('/onboarding', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Filter presets appropriate to the chosen battalion
  const filteredPresets = PRESET_ACCOUNTS.filter((acc) => {
    if (preferredUnit === '62AB') {
      return acc.unit === '62AB' || acc.unit === 'ALL';
    }
    return acc.unit === '3AB' || acc.unit === 'ALL';
  });

  return (
    <div className="login-page">
      <div className="login-card">
        {/* ── Top Navigation Row: Back Link + Unit Code ────── */}
        <div className="login-top-nav-row">
          <Link to="/login/select-unit" className="change-battalion-link">
            ← Change Battalion
          </Link>
          <span className="current-unit-code-badge">
            {preferredUnit === '62AB' ? '62 Assam Girls Bn' : '3 Assam Bn'}
          </span>
        </div>

        {/* ── Battalion Dedicated Header ───────────────────── */}
        <div className="login-header">
          <img
            src="/logos/ncc_icon.png"
            alt="NCC Crest"
            className="login-header-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <h1>{preferredUnit === '62AB' ? '62 Assam Girls Bn NCC' : '3 Assam Bn NCC'}</h1>
          <p className="login-unit-subtitle">
            {preferredUnit === '62AB'
              ? 'Senior Wing (SW) • Female Cadets & Officers Portal'
              : 'Senior Division & Senior Wing • Cadet & Officer Portal'}
          </p>
        </div>

        {/* ── Quick Credential Presets ─────────────────────── */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            Quick Credential Fill ({preferredUnit === '62AB' ? '62AB' : '3AB'}):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {filteredPresets.map((acc) => (
              <button
                key={acc.label}
                type="button"
                onClick={() => fillCredentials(acc)}
                className="btn btn-outline"
                style={{ padding: '8px 10px', fontSize: '0.8rem', textAlign: 'left', lineHeight: '1.2' }}
              >
                <strong>{acc.label}</strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{acc.role}</div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="login-alert">{error}</div>}

        {/* ── Login Form (Zero Dropdowns) ─────────────────── */}
        <form onSubmit={handleSubmit} className="login-form">
          <FormInput
            label="Regimental No. / Email"
            name="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. AS/24/SDA/10001 or admin@ausncc.in"
            required
            disabled={loading}
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
            disabled={loading}
          />

          <div className="login-forgot-row">
            <Link to="/forgot-password" className="forgot-password-link">
              Forgot Password?
            </Link>
          </div>

          <div className="login-info-box">
            <strong>First time logging in as a Cadet?</strong><br />
            Use your Unit Regimental No. and initial password as Date of Birth (DDMMYYYY).
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
          >
            {loading ? 'Authenticating…' : `Sign In to ${preferredUnit === '62AB' ? '62AB' : '3AB'} Portal →`}
          </button>
        </form>
      </div>
    </div>
  );
}
