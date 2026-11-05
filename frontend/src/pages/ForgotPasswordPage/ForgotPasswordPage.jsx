import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../shared/api/axios';
import FormInput from '../../components/FormInput/FormInput';
import './ForgotPasswordPage.css';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [dob, setDob] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim() || !dob || !newPassword || !confirmPassword) {
      setError('Please fill in all recovery fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: identifier.trim(),
        dob,
        newPassword,
      });

      if (response.data.success) {
        setSuccess('Password verified and updated! Redirecting to login…');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1500);
      } else {
        setError(response.data.message || 'Verification failed.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'An error occurred during verification.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-pw-page">
      <div className="forgot-pw-card">
        <div className="forgot-pw-header">
          <h1>Password Recovery</h1>
          <p>
            Verify your cadet credentials using your Regimental Number and registered Date of Birth.
          </p>
        </div>

        {error && <div className="forgot-pw-alert">{error}</div>}
        {success && (
          <div className="badge badge-success" style={{ width: '100%', padding: '10px', textAlign: 'center', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-pw-form">
          <FormInput
            label="Regimental No. or Registered Email"
            name="identifier"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. AS/24/SDA/100201 or cadet@aus.ac.in"
            required
            disabled={loading}
          />

          <FormInput
            label="Date of Birth (DOB as registered in Unit)"
            name="dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            disabled={loading}
          />

          <FormInput
            label="New Password"
            name="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            disabled={loading}
          />

          <FormInput
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            required
            disabled={loading}
          />

          <div className="forgot-pw-info">
            Notice: If your Date of Birth is not on file or verification fails, please contact your unit Care Taker Officer (CTO) or Senior Under Officer (SUO) for manual verification.
          </div>

          <button
            type="submit"
            className="btn btn-primary forgot-pw-submit"
            disabled={loading}
          >
            {loading ? 'Verifying with Unit Records…' : 'Reset Password'}
          </button>
        </form>

        <div className="forgot-pw-footer">
          <Link to="/login" className="forgot-pw-back">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

