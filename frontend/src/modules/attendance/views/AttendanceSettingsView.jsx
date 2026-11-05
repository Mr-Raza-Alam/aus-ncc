import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import FormInput from '../../../components/FormInput/FormInput';
import './AttendanceSettingsView.css';

export default function AttendanceSettingsView() {
  const [loading, setLoading] = useState(true);
  const [minPercent, setMinPercent] = useState(75);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [nerPortalUrl, setNerPortalUrl] = useState('https://ner.nccindia.nic.in');
  const [classDays, setClassDays] = useState(['Wednesday', 'Saturday']);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/settings');
      const s = res.data.data;
      if (s) {
        setMinPercent(s.minAttendancePercent ?? 75);
        setRadiusMeters(s.geofenceRadiusMeters ?? 100);
        setWindowMinutes(s.attendanceWindowMinutes ?? 30);
        setNerPortalUrl(s.nerPortalUrl || 'https://ner.nccindia.nic.in');
        if (s.classDays) setClassDays(s.classDays);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    setError('');

    try {
      await api.put('/api/attendance/settings', {
        minAttendancePercent: Number(minPercent),
        geofenceRadiusMeters: Number(radiusMeters),
        attendanceWindowMinutes: Number(windowMinutes),
        nerPortalUrl,
        classDays,
      });
      setMsg('Unit attendance parameters updated and logged to audit trail.');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading Unit Policy Settings…" />;

  const toggleDay = (day) => {
    setClassDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="settings-page">
      <div className="settings-header card">
        <div>
          <span className="unit-indicator-badge">Unit Policy Configuration</span>
          <h1>Attendance Policy &amp; Operational Settings</h1>
          <p className="settings-subtext">
            Configure parade ground geofence boundaries, attendance gatekeeper window duration, and Directorate reporting parameters.
          </p>
        </div>
      </div>

      {msg && <div className="alert-box alert-success">{msg}</div>}
      {error && <div className="alert-box alert-danger">{error}</div>}

      <div className="card settings-form-card">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-grid-2col">
            <FormInput
              label="Minimum Attendance Required for B/C Certificate Exams (%)"
              name="minPercent"
              type="number"
              min="1"
              max="100"
              value={minPercent}
              onChange={(e) => setMinPercent(e.target.value)}
              required
            />

            <FormInput
              label="Default Parade Ground Geofence Radius (Meters)"
              name="radiusMeters"
              type="number"
              min="10"
              max="1000"
              value={radiusMeters}
              onChange={(e) => setRadiusMeters(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2col">
            <FormInput
              label="Attendance Window Duration (Minutes)"
              name="windowMinutes"
              type="number"
              min="5"
              max="240"
              value={windowMinutes}
              onChange={(e) => setWindowMinutes(e.target.value)}
              required
            />

            <FormInput
              label="NER Directorate Portal Submission URL"
              name="nerPortalUrl"
              type="url"
              value={nerPortalUrl}
              onChange={(e) => setNerPortalUrl(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Scheduled Parade / Class Days</label>
            <div className="days-checkbox-group">
              {DAYS.map((d) => (
                <label key={d} className={`day-checkbox-label ${classDays.includes(d) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={classDays.includes(d)}
                    onChange={() => toggleDay(d)}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>
            <small style={{ color: 'var(--text-secondary)' }}>
              Parades are conducted on selected days. Saturday classes include refreshment distribution and NER upload reminders.
            </small>
          </div>

          <div className="form-submit-row" style={{ marginTop: '16px' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving Policy…' : 'Save Policy Parameters'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

