import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import './CadetAttendanceView.css';

export default function CadetAttendanceView() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [marking, setMarking] = useState(false);
  const [markResult, setMarkResult] = useState(null);
  const [markError, setMarkError] = useState(null);

  const fetchAttendanceData = useCallback(async () => {
    try {
      try {
        const resActive = await api.get('/api/attendance/session/active');
        setActiveSession(resActive.data.data);
      } catch (errActive) {
        console.error('Failed to load active session:', errActive);
      }

      try {
        const resMe = await api.get('/api/attendance/me');
        setData(resMe.data.data);
      } catch (errMe) {
        console.error('Failed to load personal attendance record:', errMe);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAttendanceData();
    // Refresh active session status every 30 seconds
    const interval = setInterval(fetchAttendanceData, 30000);
    return () => clearInterval(interval);
  }, [fetchAttendanceData]);

  const handleMarkAttendance = () => {
    setMarking(true);
    setMarkResult(null);
    setMarkError(null);

    if (!navigator.geolocation) {
      setMarkError('Geolocation is not supported by your browser. Please use a modern smartphone.');
      setMarking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post('/api/attendance/mark', {
            coords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          });
          setMarkResult(res.data);
          // Refresh personal stats
          fetchAttendanceData();
        } catch (err) {
          const errMsg = err.response?.data?.message || err.message || 'Attendance verification failed.';
          setMarkError(errMsg);
        } finally {
          setMarking(false);
        }
      },
      (err) => {
        let msg = 'Failed to acquire device GPS coordinates.';
        if (err.code === 1) msg = 'Location access denied. Please allow location permissions in your browser.';
        else if (err.code === 2) msg = 'Location unavailable. Ensure GPS is turned on.';
        else if (err.code === 3) msg = 'Location request timed out. Please try again.';
        setMarkError(msg);
        setMarking(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  if (loading) return <Loader text="Loading Cadet Attendance Record…" />;

  const isEligible = data?.isEligible;
  const pct = data?.tenurePercentage ?? 0;

  return (
    <div className="cadet-attendance-page">
      {/* ── Top Header / Cadet Meta ────────────────────────── */}
      <div className="cadet-attendance-header card">
        <div className="cadet-title-row">
          <div>
            <span className="cadet-unit-badge">{data?.cadet?.unit || '3AB'} Contingent</span>
            <h1>Cadet Attendance Record</h1>
            <p className="cadet-submeta">
              <strong>{data?.cadet?.name}</strong> • Regt. No: <code>{data?.cadet?.regimentalNo}</code> • Rank:{' '}
              {data?.cadet?.rank || 'Cadet'} • Year {data?.cadet?.year || '1'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Live Attendance Gatekeeper Action Card ─────────── */}
      <div className={`cadet-gatekeeper-card card ${activeSession ? 'session-live' : 'session-idle'}`}>
        <div className="gatekeeper-header">
          <div className="gatekeeper-status-indicator">
            <span className={`status-dot ${activeSession ? 'dot-pulse-green' : 'dot-idle'}`} />
            <span className="status-label">
              {activeSession ? 'LIVE TRAINING SESSION IN PROGRESS' : 'NO ACTIVE TRAINING SESSION'}
            </span>
          </div>
          {activeSession && (
            <span className="venue-tag">
              Venue: {activeSession.venue?.name || 'Assam University NCC Ground'} (Radius: {activeSession.venue?.radiusMeters || 100}m)
            </span>
          )}
        </div>

        {activeSession ? (
          <div className="gatekeeper-body">
            <div className="session-active-info-pill" style={{ marginBottom: '12px' }}>
              <strong>Type:</strong> {activeSession.sessionType || 'Ground Drill / Practical Parade'} •{' '}
              <strong>Window Closes:</strong>{' '}
              {new Date(activeSession.endTime).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            <p className="gatekeeper-instruction">
              Attendance check-in is currently <strong>OPEN</strong>. Click the button below to acquire your device GPS and verify your presence at the training venue.
            </p>

            <button
              type="button"
              className="btn btn-primary btn-mark-geo"
              onClick={handleMarkAttendance}
              disabled={marking}
            >
              {marking ? 'Verifying Coordinates via GPS…' : 'Verify Location & Mark My Attendance Now'}
            </button>

            {markResult && (
              <div className="alert-box alert-success" style={{ marginTop: '16px' }}>
                <strong>Attendance Verified &amp; Recorded!</strong>
                <p>
                  You are marked present for today&apos;s session (Distance from ground center:{' '}
                  <strong>{markResult.distanceMeters ?? markResult.data?.distanceMeters ?? '0'} meters</strong>).
                </p>
              </div>
            )}

            {markError && (
              <div className="alert-box alert-danger" style={{ marginTop: '16px' }}>
                <strong>Attendance Marking Rejected:</strong>
                <p>{markError}</p>
                <small>If your mobile GPS is malfunctioning on ground, report directly to the SUO / CTO for audited manual fallback.</small>
              </div>
            )}
          </div>
        ) : (
          <div className="gatekeeper-idle-body">
            <p>
              Attendance can only be marked when an Officer or Senior Under Officer (SUO) activates a live training session at the training ground.
            </p>
            <button
              type="button"
              className="btn btn-outline"
              style={{ marginTop: '10px', fontSize: '0.82rem' }}
              onClick={fetchAttendanceData}
            >
              Check for Live Session Now
            </button>
          </div>
        )}
      </div>

      {/* ── Personal Metrics Cards ─────────────────────────── */}
      <div className="cadet-metrics-grid">
        <div className="card metric-card">
          <div className="metric-header">Tenure Attendance</div>
          <div className={`metric-percentage ${pct >= (data?.minAttendancePercent || 75) ? 'text-success' : 'text-danger'}`}>
            {pct}%
          </div>
          <div className="metric-progress-track">
            <div
              className={`metric-progress-fill ${pct >= (data?.minAttendancePercent || 75) ? 'bg-success' : 'bg-danger'}`}
              style={{ width: `${Math.min(100, pct)}%` }}
            />
          </div>
          <div className="metric-footer-text">
            Attended <strong>{data?.attendedCount || 0}</strong> of <strong>{data?.totalSessionsHeld || 0}</strong> parades
          </div>
        </div>

        <div className="card metric-card">
          <div className="metric-header">B &amp; C Exam Eligibility</div>
          <div className="eligibility-status-box">
            {isEligible ? (
              <div className="eligibility-badge eligible">
                ELIGIBLE FOR EXAMINATION
              </div>
            ) : (
              <div className="eligibility-badge ineligible">
                ATTENDANCE SHORTAGE (&lt; {data?.minAttendancePercent || 75}%)
              </div>
            )}
          </div>
          <p className="eligibility-note">
            Directorate rules mandate minimum <strong>{data?.minAttendancePercent || 75}%</strong> parade attendance
            to appear in NCC &apos;B&apos; and &apos;C&apos; certificate examinations.
          </p>
        </div>
      </div>

      {/* ── Parade Attendance History Table ────────────────── */}
      <div className="card cadet-history-card">
        <div className="card-header">
          <h2>Parade Attendance History</h2>
          <span className="history-count">Showing last {data?.history?.length || 0} sessions</span>
        </div>

        {data?.history && data.history.length > 0 ? (
          <div className="table-responsive">
            <table className="cadet-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Parade Venue</th>
                  <th>Status</th>
                  <th>Verification Mode</th>
                  <th>Recorded At</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((s, idx) => (
                  <tr key={idx}>
                    <td><strong>{s.date}</strong></td>
                    <td>{s.venueName || 'Main Parade Ground'}</td>
                    <td>
                      <span className={`status-pill ${s.status === 'P' ? 'pill-present' : 'pill-absent'}`}>
                        {s.status === 'P' ? 'P — Present' : 'A — Absent'}
                      </span>
                    </td>
                    <td>
                      {s.markedVia === 'geo' && <span className="badge-geo">GPS Geofence</span>}
                      {s.markedVia === 'manual' && <span className="badge-manual">Manual Fallback</span>}
                      {!s.markedVia && <span className="text-muted">—</span>}
                    </td>
                    <td>
                      {s.markedAt ? new Date(s.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No parade attendance records found yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

