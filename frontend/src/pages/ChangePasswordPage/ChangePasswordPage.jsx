import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import api from '../../shared/api/axios';
import FormInput from '../../components/FormInput/FormInput';
import './ChangePasswordPage.css';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from the current password.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      if (response.data.success) {
        setSuccess('Password updated successfully! Proceeding…');
        setTimeout(() => {
          if (!user?.profileCompleted && user?.roles?.includes('ncc-cdt') && !user?.roles?.includes('lead_admin')) {
            navigate('/onboarding', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 1000);
      } else {
        setError(response.data.message || 'Failed to change password.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'An error occurred while changing password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-pw-page">
      <div className="change-pw-card">
        <div className="change-pw-header">
          <h1>Security Requirement</h1>
          <p>
            {user?.name ? `Welcome, ${user.name}. ` : ''}
            You must change your temporary/default password before accessing your account.
          </p>
        </div>

        {error && <div className="change-pw-alert">{error}</div>}
        {success && (
          <div className="badge badge-success" style={{ width: '100%', padding: '10px', textAlign: 'center', marginBottom: '16px' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="change-pw-form">
          <FormInput
            label="Current / Initial Password"
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password (e.g. DOB DDMMYYYY)"
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

          <div className="change-pw-requirements">
            <strong>Password Guidelines:</strong>
            <ul>
              <li>At least 8 characters in length</li>
              <li>Include uppercase, lowercase, numbers or symbols for strength</li>
              <li>Keep it confidential — never share your credentials</li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn btn-primary change-pw-submit"
            disabled={loading}
          >
            {loading ? 'Saving Security Credentials…' : 'Set New Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

