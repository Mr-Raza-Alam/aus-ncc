import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import './OfficerSessionView.css';

const SESSION_TYPES = [
  'Ground Drill / Practical Parade',
  'Theory / Classroom Lecture',
  'Firing / Range Practice',
  'Special / Camp Training',
];

export default function OfficerSessionView() {
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionReport, setSessionReport] = useState(null);

  // Open session form state
  const [sessionType, setSessionType] = useState('Ground Drill / Practical Parade');
  const [venueLat, setVenueLat] = useState(24.6865);
  const [venueLng, setVenueLng] = useState(92.7483);
  const [venueName, setVenueName] = useState('Assam University NCC Ground');
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [declaredCount, setDeclaredCount] = useState(0);
  const [locating, setLocating] = useState(false);
  const [openError, setOpenError] = useState('');
  const [openSubmitting, setOpenSubmitting] = useState(false);

  // Countdown timer state
  const [timeRemainingStr, setTimeRemainingStr] = useState('');
  const [isWindowExpired, setIsWindowExpired] = useState(false);

  // Extend window state
  const [extending, setExtending] = useState(false);
  const [extendMsg, setExtendMsg] = useState('');

  // Close & Reconcile modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reconcileCount, setReconcileCount] = useState(0);
  const [concludeCategory, setConcludeCategory] = useState('refreshment');
  const [closeSubmitting, setCloseSubmitting] = useState(false);

  // Photo upload state during active session
  const [photoFile, setPhotoFile] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState('');

  // Dossier card photo upload state (post-session)
  const [dossierPhotoFile, setDossierPhotoFile] = useState(null);
  const [dossierPhotoUploading, setDossierPhotoUploading] = useState(false);
  const [dossierPhotoMsg, setDossierPhotoMsg] = useState('');

  // Manual mark modal state
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [cadetSearch, setCadetSearch] = useState('');
  const [rosterCadets, setRosterCadets] = useState([]);
  const [selectedCadetId, setSelectedCadetId] = useState('');
  const [manualStatus, setManualStatus] = useState('P');
  const [manualReason, setManualReason] = useState('Device GPS failure on ground');
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualMsg, setManualMsg] = useState('');

  // Tally refresh & NER state
  const [refreshingTally, setRefreshingTally] = useState(false);
  const [nerSubmitting, setNerSubmitting] = useState(false);
  const [nerRefNo, setNerRefNo] = useState('');
  const [switchingCategory, setSwitchingCategory] = useState(false);

  const fetchSessionData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingTally(true);
    try {
      const [resActive, resLatestClosed, resSettings] = await Promise.all([
        api.get('/api/attendance/session/active'),
        api.get('/api/attendance/session/latest-closed').catch(() => ({ data: { data: null } })),
        api.get('/api/attendance/settings').catch(() => ({ data: { data: {} } })),
      ]);

      const session = resActive.data.data;
      setActiveSession(session);
      if (session) {
        setReconcileCount(session.declaredPresentCount || session.presentCount || 0);
      } else if (resLatestClosed.data?.data) {
        setSessionReport(resLatestClosed.data.data);
      }

      if (resSettings.data.data?.geofenceRadiusMeters && !session) {
        setRadiusMeters(resSettings.data.data.geofenceRadiusMeters);
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshingTally(false);
    }
  }, []);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  // Live timer interval
  useEffect(() => {
    if (!activeSession?.endTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const end = new Date(activeSession.endTime).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeRemainingStr('Window Closed (Pending Officer Final Review)');
        setIsWindowExpired(true);
      } else {
        setIsWindowExpired(false);
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setTimeRemainingStr(`${mins}m ${secs < 10 ? '0' : ''}${secs}s remaining`);
      }
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);
    return () => clearInterval(timerId);
  }, [activeSession?.endTime]);

  // Load roster cadets for manual mark modal
  const loadRosterForManual = async () => {
    try {
      const res = await api.get('/api/attendance/roster?status=active');
      setRosterCadets(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    }
  };

  const handleAcquireGPS = () => {
    if (!navigator.geolocation) {
      setOpenError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setOpenError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVenueLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setVenueLng(parseFloat(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        setOpenError(`Could not fetch device GPS: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOpenSession = async (e) => {
    e.preventDefault();
    setOpenSubmitting(true);
    setOpenError('');

    try {
      const res = await api.post('/api/attendance/session/open', {
        sessionType,
        venue: {
          lat: Number(venueLat),
          lng: Number(venueLng),
          radiusMeters: Number(radiusMeters),
          name: venueName,
        },
        declaredPresentCount: Number(declaredCount) || 0,
      });
      setActiveSession(res.data.data);
      setReconcileCount(Number(declaredCount) || 0);
      setSessionReport(null); // Clear previous closed report when new session is opened
    } catch (err) {
      setOpenError(err.response?.data?.message || err.message || 'Failed to open session.');
    } finally {
      setOpenSubmitting(false);
    }
  };

  const handleExtendSession = async () => {
    if (!activeSession) return;
    setExtending(true);
    setExtendMsg('');
    try {
      const res = await api.post(`/api/attendance/session/${activeSession._id}/extend`, {
        extensionMinutes: 15,
      });
      setActiveSession((prev) => ({
        ...prev,
        endTime: res.data.data.endTime,
      }));
      setExtendMsg('+15 minutes grace window added successfully.');
      setTimeout(() => setExtendMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to extend session window.');
    } finally {
      setExtending(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile || !activeSession) return;

    setPhotoUploading(true);
    setPhotoMessage('');

    try {
      const formData = new FormData();
      formData.append('photo', photoFile);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            formData.append(
              'coords',
              JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            );
            const res = await api.post(`/api/attendance/session/${activeSession._id}/photo`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setActiveSession((prev) => ({ ...prev, ...res.data.data }));
            setPhotoMessage('Ground photo geo-tagged and uploaded to Cloudflare R2.');
            setPhotoUploading(false);
            setPhotoFile(null);
          },
          async () => {
            const res = await api.post(`/api/attendance/session/${activeSession._id}/photo`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setActiveSession((prev) => ({ ...prev, ...res.data.data }));
            setPhotoMessage('Ground photo uploaded to Cloudflare R2.');
            setPhotoUploading(false);
            setPhotoFile(null);
          }
        );
      } else {
        const res = await api.post(`/api/attendance/session/${activeSession._id}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setActiveSession((prev) => ({ ...prev, ...res.data.data }));
        setPhotoMessage('Ground photo uploaded to Cloudflare R2.');
        setPhotoUploading(false);
        setPhotoFile(null);
      }
    } catch (err) {
      setPhotoMessage(`Upload error: ${err.response?.data?.message || err.message}`);
      setPhotoUploading(false);
    }
  };

  const handleDossierPhotoUpload = async (e, sessionId) => {
    e.preventDefault();
    if (!dossierPhotoFile || !sessionId) return;
    setDossierPhotoUploading(true);
    setDossierPhotoMsg('');

    try {
      const formData = new FormData();
      formData.append('photo', dossierPhotoFile);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            formData.append(
              'coords',
              JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            );
            const res = await api.post(`/api/attendance/session/${sessionId}/photo`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSessionReport((prev) => ({
              ...prev,
              session: {
                ...prev.session,
                photoUrl: res.data.data.photoUrl,
                photoCoords: res.data.data.photoCoords,
                photoCapturedAt: res.data.data.photoCapturedAt,
              },
            }));
            setDossierPhotoUploading(false);
            setDossierPhotoFile(null);
            setDossierPhotoMsg('Parade ground photo geo-tagged and attached to Inspection Dossier.');
          },
          async () => {
            const res = await api.post(`/api/attendance/session/${sessionId}/photo`, formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSessionReport((prev) => ({
              ...prev,
              session: {
                ...prev.session,
                photoUrl: res.data.data.photoUrl,
                photoCoords: res.data.data.photoCoords,
                photoCapturedAt: res.data.data.photoCapturedAt,
              },
            }));
            setDossierPhotoUploading(false);
            setDossierPhotoFile(null);
            setDossierPhotoMsg('Parade ground photo attached to Inspection Dossier.');
          }
        );
      } else {
        const res = await api.post(`/api/attendance/session/${sessionId}/photo`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setSessionReport((prev) => ({
          ...prev,
          session: {
            ...prev.session,
            photoUrl: res.data.data.photoUrl,
            photoCoords: res.data.data.photoCoords,
            photoCapturedAt: res.data.data.photoCapturedAt,
          },
        }));
        setDossierPhotoUploading(false);
        setDossierPhotoFile(null);
        setDossierPhotoMsg('Parade ground photo attached to Inspection Dossier.');
      }
    } catch (err) {
      setDossierPhotoMsg(`Upload error: ${err.response?.data?.message || err.message}`);
      setDossierPhotoUploading(false);
    }
  };

  const handleOpenReviewModal = () => {
    setReconcileCount(activeSession?.declaredPresentCount || activeSession?.presentCount || 0);
    setReviewModalOpen(true);
  };

  const handleConfirmCloseSession = async () => {
    if (!activeSession) return;
    setCloseSubmitting(true);
    try {
      const res = await api.post(`/api/attendance/session/${activeSession._id}/close`, {
        declaredPresentCount: Number(reconcileCount) || 0,
        sessionCategory: concludeCategory,
      });
      setSessionReport(res.data.data);
      setActiveSession(null);
      setReviewModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to close session.');
    } finally {
      setCloseSubmitting(false);
    }
  };

  const handleSwitchCategory = async (sessionId, newCategory) => {
    setSwitchingCategory(true);
    try {
      const res = await api.patch(`/api/attendance/session/${sessionId}/category`, {
        sessionCategory: newCategory,
      });
      setSessionReport((prev) => ({
        ...prev,
        session: res.data.data,
        entitlementAmount:
          res.data.data.entitlementAmount ||
          (newCategory === 'refreshment' ? (prev.actualPresentCount || 0) * 18 : 0),
      }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to switch category.');
    } finally {
      setSwitchingCategory(false);
    }
  };

  const handleMarkNERDone = async (sessionId) => {
    setNerSubmitting(true);
    try {
      const res = await api.post(`/api/attendance/session/${sessionId}/ner-done`, {
        nerRefNo,
      });
      setSessionReport((prev) => ({
        ...prev,
        session: {
          ...prev.session,
          nerUploaded: true,
          nerUploadedAt: res.data.data.nerUploadedAt || new Date().toISOString(),
          nerRefNo: res.data.data.nerRefNo || nerRefNo,
        },
      }));
      alert('NER Directorate sync confirmed and locked.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to confirm NER upload.');
    } finally {
      setNerSubmitting(false);
    }
  };

  const handleDownloadNERCSV = async (sessionId) => {
    try {
      const res = await api.get(`/api/attendance/session/${sessionId}/ner-csv`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NER_MusterRoll_${sessionId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download NER CSV: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleManualMarkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCadetId || !activeSession) return;

    setManualSubmitting(true);
    setManualMsg('');
    try {
      await api.post('/api/attendance/manual-mark', {
        sessionId: activeSession._id,
        userId: selectedCadetId,
        status: manualStatus,
        reason: manualReason,
      });
      setManualMsg('Manual mark saved and logged to audit trail.');
      setSelectedCadetId('');
      fetchSessionData(true);
    } catch (err) {
      setManualMsg(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setManualSubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading Training Session Controller…" />;

  const filteredRoster = rosterCadets.filter(
    (c) =>
      c.name.toLowerCase().includes(cadetSearch.toLowerCase()) ||
      c.regimentalNo.toLowerCase().includes(cadetSearch.toLowerCase())
  );

  const presentTally = activeSession?.presentCount ?? 0;
  const totalEnrolled = activeSession?.totalCadets ?? 0;
  const turnoutPercent = totalEnrolled > 0 ? ((presentTally / totalEnrolled) * 100).toFixed(1) : 0;

  const currentReportSession = sessionReport?.session;
  const isRefreshmentDay = currentReportSession?.sessionCategory === 'refreshment';

  return (
    <div className="officer-session-page">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="officer-session-header card">
        <div className="header-meta-row">
          <div>
            <span className="unit-indicator-badge">Training Operations Workspace</span>
            <h1>Live Training Session Controller</h1>
            <p className="header-sub">
              Manage live attendance sessions, configure GPS geofence radius, enforce verification rules, upload geo-tagged ground photos, and reconcile muster roll headcounts.
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Session View ────────────────────────────── */}
      {activeSession ? (
        <div className="card session-active-card">
          <div className="active-card-topbar">
            <div className="status-indicator-box">
              <span className="status-dot-pulse" />
              <div>
                <div className="session-type-badge-pill">
                  {activeSession.sessionType || 'Ground Drill / Practical Parade'}
                </div>
                <h2>TRAINING ATTENDANCE SESSION IS OPEN</h2>
                <div className="session-time-range">
                  Started:{' '}
                  {new Date(activeSession.startTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  • Closes:{' '}
                  {new Date(activeSession.endTime).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  <span className={`timer-badge ${isWindowExpired ? 'timer-expired' : 'timer-active'}`}>
                    • {timeRemainingStr}
                  </span>
                </div>
              </div>
            </div>

            <div className="active-top-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleExtendSession}
                disabled={extending}
                title="Add 15 minutes grace period for late arrivals"
              >
                {extending ? 'Extending…' : '+15 Min Grace Extension'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  loadRosterForManual();
                  setManualModalOpen(true);
                }}
              >
                Manual Fallback Mark
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleOpenReviewModal}
              >
                Conclude &amp; Reconcile Session
              </button>
            </div>
          </div>

          {extendMsg && <div className="alert-box alert-success">{extendMsg}</div>}

          {/* ── Live Attendance Tally Cards ───────────────────── */}
          <div className="live-tally-container">
            <div className="tally-card">
              <div className="tally-label">Verified Present</div>
              <div className="tally-value text-success">{presentTally}</div>
              <div className="tally-sub">Marked via GPS &amp; manual</div>
            </div>
            <div className="tally-card">
              <div className="tally-label">Total Enrolled Cadets</div>
              <div className="tally-value">{totalEnrolled}</div>
              <div className="tally-sub">Active in this battalion</div>
            </div>
            <div className="tally-card">
              <div className="tally-label">Live Turnout Rate</div>
              <div className="tally-value">{turnoutPercent}%</div>
              <div className="tally-sub">Muster attendance ratio</div>
            </div>
            <div className="tally-card tally-action-box">
              <div className="tally-label">Session Controls</div>
              <button
                type="button"
                className="btn btn-outline btn-refresh-tally"
                onClick={() => fetchSessionData(true)}
                disabled={refreshingTally}
              >
                {refreshingTally ? 'Refreshing…' : 'Refresh Live Tally'}
              </button>
            </div>
          </div>

          {/* ── Active Details Grid ──────────────────────────── */}
          <div className="active-details-grid">
            <div className="detail-box">
              <div className="detail-label">Training Venue</div>
              <div className="detail-value">{activeSession.venue?.name}</div>
              <div className="detail-sub">
                Coords: {activeSession.venue?.lat?.toFixed(5)}, {activeSession.venue?.lng?.toFixed(5)}
              </div>
            </div>

            <div className="detail-box">
              <div className="detail-label">Geofence Radius</div>
              <div className="detail-value">{activeSession.venue?.radiusMeters} Meters</div>
              <div className="detail-sub">Haversine verified on mobile GPS</div>
            </div>

            <div className="detail-box">
              <div className="detail-label">Initial Fall-in Headcount</div>
              <div className="detail-value">{activeSession.declaredPresentCount || 0} Cadets</div>
              <div className="detail-sub">Physical roll call by SUO at start</div>
            </div>
          </div>

          {/* ── Recent Verified Check-ins Feed ────────────────── */}
          {activeSession.recentRecords && activeSession.recentRecords.length > 0 && (
            <div className="recent-checkins-card">
              <div className="recent-checkins-header">
                <strong>Recent Verified Check-Ins (Live Stream)</strong>
                <span className="recent-checkins-sub">Showing latest verified cadets</span>
              </div>
              <div className="recent-checkins-list">
                {activeSession.recentRecords.map((rec) => (
                  <div key={rec._id} className="recent-checkin-item">
                    <span className="checkin-badge">Verified</span>
                    <span className="checkin-name">
                      {rec.userId?.name || 'Cadet'} ({rec.userId?.regimentalNo || 'N/A'})
                    </span>
                    <span className="checkin-dist">
                      {rec.distanceMeters !== undefined ? `${rec.distanceMeters.toFixed(1)}m from center` : 'Manual'}
                    </span>
                    <span className="checkin-time">
                      {new Date(rec.markedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Geo-Tagged Ground Photo Audit Section ──────────── */}
          <div className="photo-audit-section">
            <h3>Parade / Class Ground Photo Audit (Anti-Proxy Proof)</h3>
            <p className="photo-desc">
              Capture a geo-tagged ground photo of cadets formed up in ranks. Uploaded directly to Cloudflare R2 for tamper-evident audit records.
            </p>

            {activeSession.photoUrl ? (
              <div className="photo-preview-box">
                <img src={activeSession.photoUrl} alt="Parade Ground Audit" className="uploaded-parade-img" />
                <div className="photo-meta-info">
                  <strong>Photo Captured &amp; Verified</strong>
                  <span>
                    Uploaded at:{' '}
                    {activeSession.photoCapturedAt
                      ? new Date(activeSession.photoCapturedAt).toLocaleTimeString('en-IN')
                      : 'Recently'}
                  </span>
                  {activeSession.photoCoords?.lat && (
                    <span>
                      GPS: {activeSession.photoCoords.lat.toFixed(5)}, {activeSession.photoCoords.lng.toFixed(5)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handlePhotoUpload} className="photo-upload-form">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="photo-file-input"
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={photoUploading || !photoFile}
                >
                  {photoUploading ? 'Uploading to R2…' : 'Upload Geo-Tagged Photo'}
                </button>
              </form>
            )}

            {photoMessage && <div className="photo-msg">{photoMessage}</div>}
          </div>
        </div>
      ) : (
        /* ── Idle / Open Session Form ────────────────────────── */
        <div className="idle-session-wrapper">
          {/* ── Concluded Session Inspection Dossier Card ── */}
          {sessionReport && (
            <div className="session-dossier-card">
              {isRefreshmentDay ? (
                /* REFRESHMENT DAY INSPECTION DOSSIER */
                <div className="dossier-content refreshment-dossier">
                  <div className="dossier-header-bar">
                    <div className="dossier-title-group">
                      <span className="dossier-type-badge refreshment-badge">
                        Refreshment Distribution Day (Saturday Parade)
                      </span>
                      <h3>Parade Refreshment &amp; Inspection Dossier</h3>
                      <p className="dossier-meta-sub">
                        Session Date: <strong>{currentReportSession?.date}</strong> • Unit: <strong>{currentReportSession?.unit}</strong> • Closed At:{' '}
                        {currentReportSession?.closedAt ? new Date(currentReportSession.closedAt).toLocaleTimeString('en-IN') : 'N/A'}
                      </p>
                    </div>

                    <div className="dossier-status-pill-group">
                      {currentReportSession?.nerUploaded ? (
                        <span className="ner-status-pill ner-confirmed">
                          ✓ NER Directorate Upload Confirmed
                        </span>
                      ) : (
                        <span className="ner-status-pill ner-pending">
                          ⚠ Pending NER Directorate Upload
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4-Stat Reconciled Grid */}
                  <div className="dossier-stats-grid">
                    <div className="dossier-stat-box">
                      <div className="stat-label">Total Enrolled Cadets</div>
                      <div className="stat-value">{sessionReport.totalCadets || '—'}</div>
                      <div className="stat-sub">Active Battalion Strength</div>
                    </div>
                    <div className="dossier-stat-box">
                      <div className="stat-label">Physical Fall-In Headcount</div>
                      <div className="stat-value">{sessionReport.declaredPresentCount}</div>
                      <div className="stat-sub">SUO Ground Roll Call</div>
                    </div>
                    <div className="dossier-stat-box highlight-success">
                      <div className="stat-label">Verified Digital Present</div>
                      <div className="stat-value text-success">{sessionReport.actualPresentCount}</div>
                      <div className="stat-sub">Mobile GPS &amp; Verified Manual</div>
                    </div>
                    <div className="dossier-stat-box highlight-entitlement">
                      <div className="stat-label">Government Entitlement</div>
                      <div className="stat-value text-navy">₹{sessionReport.entitlementAmount || sessionReport.actualPresentCount * 18}</div>
                      <div className="stat-sub">{sessionReport.actualPresentCount} Cadets × ₹18 Standard Rate</div>
                    </div>
                  </div>

                  {sessionReport.countMismatch && (
                    <div className="alert-box alert-danger" style={{ marginTop: '12px', fontSize: '0.85rem' }}>
                      ⚠ <strong>Discrepancy Logged:</strong> Physical headcount ({sessionReport.declaredPresentCount}) did not match verified digital check-in ({sessionReport.actualPresentCount}). Audit log archived for CTO oversight.
                    </div>
                  )}

                  {/* Geo-Location Photo Proof Section */}
                  <div className="dossier-photo-section">
                    <div className="section-title-row">
                      <h4>Class Geo-Location Photo Proof (Anti-Proxy Ground Evidence)</h4>
                      <span className="proof-tag">Official Muster Evidence</span>
                    </div>

                    {currentReportSession?.photoUrl ? (
                      <div className="photo-dossier-view">
                        <div className="photo-container">
                          <img
                            src={currentReportSession.photoUrl}
                            alt="Parade Ground Geo-tagged Audit"
                            className="dossier-img"
                          />
                        </div>
                        <div className="photo-stamp-metadata">
                          <div className="stamp-title">Tamper-Proof Ground Evidence</div>
                          <div className="stamp-item">
                            <span className="stamp-label">Venue:</span>
                            <span className="stamp-val">{currentReportSession.venue?.name || 'Assam University Parade Ground'}</span>
                          </div>
                          <div className="stamp-item">
                            <span className="stamp-label">GPS Coordinates:</span>
                            <span className="stamp-val">
                              {currentReportSession.photoCoords?.lat
                                ? `${currentReportSession.photoCoords.lat.toFixed(6)}° N, ${currentReportSession.photoCoords.lng.toFixed(6)}° E`
                                : currentReportSession.venue?.lat
                                ? `${currentReportSession.venue.lat.toFixed(6)}° N, ${currentReportSession.venue.lng.toFixed(6)}° E`
                                : 'Coordinates Tagged'}
                            </span>
                          </div>
                          <div className="stamp-item">
                            <span className="stamp-label">Captured Timestamp:</span>
                            <span className="stamp-val">
                              {currentReportSession.photoCapturedAt
                                ? new Date(currentReportSession.photoCapturedAt).toLocaleString('en-IN')
                                : 'Parade Muster Time'}
                            </span>
                          </div>
                          <div className="stamp-item">
                            <span className="stamp-label">Archival Storage:</span>
                            <span className="stamp-val">Cloudflare R2 Encrypted Bucket</span>
                          </div>
                          <div className="stamp-item">
                            <span className="stamp-label">Inspection Readiness:</span>
                            <span className="stamp-val stamp-ready">Verified for Commanding Officer Inspection</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="photo-upload-fallback-box">
                        <div className="missing-photo-banner">
                          ⚠ <strong>Photo Proof Not Attached Yet:</strong> Upload the geo-tagged class ground photo now to complete the permanent inspection record.
                        </div>
                        <form
                          onSubmit={(e) => handleDossierPhotoUpload(e, currentReportSession?._id)}
                          className="dossier-photo-form"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => setDossierPhotoFile(e.target.files[0])}
                            required
                            className="photo-file-input"
                          />
                          <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={dossierPhotoUploading || !dossierPhotoFile}
                          >
                            {dossierPhotoUploading ? 'Attaching Photo…' : 'Attach Geo-Tagged Ground Photo'}
                          </button>
                        </form>
                        {dossierPhotoMsg && <div className="photo-msg">{dossierPhotoMsg}</div>}
                      </div>
                    )}
                  </div>

                  {/* Directorate NER Portal Synchronization Section */}
                  <div className="dossier-ner-section">
                    <div className="section-title-row">
                      <h4>Directorate NER Portal Synchronization</h4>
                      <span className="ner-guideline-badge">Mandatory for Refreshment Claims</span>
                    </div>

                    <p className="ner-instruction-text">
                      Under NCC Directorate NER guidelines, geo-tagged parade muster photos and attendance counts for refreshment distribution days must be submitted to the Directorate Portal.
                    </p>

                    <div className="ner-actions-row">
                      <a
                        href="https://ner.nccindia.nic.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary ner-link-btn"
                      >
                        Open Directorate Portal (ner.nccindia.nic.in) ↗
                      </a>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => handleDownloadNERCSV(currentReportSession?._id)}
                      >
                        Download Directorate Format (CSV)
                      </button>
                    </div>

                    {/* NER Upload Confirmation / Ref No Form */}
                    {currentReportSession?.nerUploaded ? (
                      <div className="ner-confirmed-receipt-box">
                        <div className="receipt-check">✓</div>
                        <div className="receipt-details">
                          <strong>Directorate Submission Confirmed &amp; Recorded</strong>
                          <div>
                            Confirmed At:{' '}
                            {currentReportSession.nerUploadedAt
                              ? new Date(currentReportSession.nerUploadedAt).toLocaleString('en-IN')
                              : 'Earlier today'}
                          </div>
                          {currentReportSession.nerRefNo && (
                            <div>Directorate Ref / Dispatch No: <code>{currentReportSession.nerRefNo}</code></div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="ner-confirm-form-box">
                        <div className="confirm-desc">
                          Once you have uploaded the class photo and attendance count to the NER Portal, record your Directorate confirmation below:
                        </div>
                        <div className="ner-input-group">
                          <input
                            type="text"
                            className="form-input"
                            value={nerRefNo}
                            onChange={(e) => setNerRefNo(e.target.value)}
                            placeholder="Directorate Dispatch / Ack Ref No (Optional, e.g. NER-SAT-01)"
                          />
                          <button
                            type="button"
                            className="btn btn-success"
                            onClick={() => handleMarkNERDone(currentReportSession?._id)}
                            disabled={nerSubmitting}
                          >
                            {nerSubmitting ? 'Recording…' : 'Confirm Directorate Upload & Lock Dossier'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dossier Bottom Utilities */}
                  <div className="dossier-footer-controls">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleSwitchCategory(currentReportSession?._id, 'casual')}
                      disabled={switchingCategory}
                      title="Switch to casual day if refreshments were not distributed"
                    >
                      {switchingCategory ? 'Switching…' : 'Switch to Casual Day (No Refreshment)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setSessionReport(null)}
                    >
                      Dismiss Dossier View
                    </button>
                  </div>
                </div>
              ) : (
                /* CASUAL TRAINING DAY CARD */
                <div className="dossier-content casual-dossier">
                  <div className="dossier-header-bar">
                    <div className="dossier-title-group">
                      <span className="dossier-type-badge casual-badge">
                        Casual Training Day (Routine Lecture / Drill)
                      </span>
                      <h3>Training Session Concluded &amp; Sealed</h3>
                      <p className="dossier-meta-sub">
                        Session Date: <strong>{currentReportSession?.date}</strong> • Unit: <strong>{currentReportSession?.unit}</strong> • Closed At:{' '}
                        {currentReportSession?.closedAt ? new Date(currentReportSession.closedAt).toLocaleTimeString('en-IN') : 'N/A'}
                      </p>
                    </div>

                    <div className="dossier-status-pill-group">
                      <span className="ner-status-pill casual-pill">
                        No Refreshment Distributed • NER Upload Not Required
                      </span>
                    </div>
                  </div>

                  <div className="casual-summary-box">
                    <p>
                      Muster roll for this routine mid-week session has been sealed and logged to the central attendance register.
                    </p>
                    <div className="casual-stats-inline">
                      <span>Verified Present: <strong>{sessionReport.actualPresentCount} Cadets</strong></span>
                      <span>•</span>
                      <span>SUO Fall-in Headcount: <strong>{sessionReport.declaredPresentCount} Cadets</strong></span>
                      {sessionReport.totalCadets && (
                        <>
                          <span>•</span>
                          <span>Enrolled: <strong>{sessionReport.totalCadets} Cadets</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="dossier-footer-controls">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => handleSwitchCategory(currentReportSession?._id, 'refreshment')}
                      disabled={switchingCategory}
                      title="Change to Refreshment Day if refreshment was distributed"
                    >
                      {switchingCategory ? 'Switching…' : 'Switch to Refreshment Day (Show Dossier & NER Link)'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setSessionReport(null)}
                    >
                      Dismiss Notice
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Open New Session Form ── */}
          <div className="card open-session-card">
            <div className="card-header">
              <h2>Open Attendance Session</h2>
              <p className="text-secondary">
                Initiating a training session activates live GPS check-in for enrolled cadets within the designated geofence radius on Assam University premises.
              </p>
            </div>

            {openError && <div className="alert-box alert-danger">{openError}</div>}

            <form onSubmit={handleOpenSession} className="open-session-form">
              {/* Session Type Selector */}
              <div className="form-group">
                <label className="form-label">Training Session Type</label>
                <select
                  className="form-input"
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  required
                >
                  {SESSION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  Categorizes training records for monthly DG NCC Annual Training Reports.
                </span>
              </div>

              {/* Auto-Detect Venue GPS */}
              <div className="gps-action-banner">
                <div>
                  <strong>Auto-Detect Venue GPS Coordinates</strong>
                  <p>Acquires device GPS location anchored within the Assam University Silchar campus perimeter.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleAcquireGPS}
                  disabled={locating}
                >
                  {locating ? 'Acquiring GPS…' : 'Acquire Current GPS'}
                </button>
              </div>

              <div className="form-grid-2col">
                <FormInput
                  label="Latitude (Dec Degrees)"
                  name="lat"
                  type="number"
                  step="0.000001"
                  value={venueLat}
                  onChange={(e) => setVenueLat(e.target.value)}
                  required
                />
                <FormInput
                  label="Longitude (Dec Degrees)"
                  name="lng"
                  type="number"
                  step="0.000001"
                  value={venueLng}
                  onChange={(e) => setVenueLng(e.target.value)}
                  required
                />
              </div>

              <div className="form-grid-2col">
                <FormInput
                  label="Training Venue Name"
                  name="venueName"
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="e.g. Assam University NCC Ground"
                  required
                />
                <FormInput
                  label="Geofence Radius (Meters)"
                  name="radius"
                  type="number"
                  min="20"
                  max="500"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <FormInput
                  label="Physical Roll Call Headcount (Optional Fall-in Count)"
                  name="declaredCount"
                  type="number"
                  min="0"
                  value={declaredCount}
                  onChange={(e) => setDeclaredCount(e.target.value)}
                  placeholder="e.g. 52"
                />
                <span className="form-hint">
                  SUO physical headcount at morning fall-in. Reconciled gracefully when closing the session.
                </span>
              </div>

              <div className="form-submit-row">
                <button
                  type="submit"
                  className="btn btn-primary btn-open-session"
                  disabled={openSubmitting}
                >
                  {openSubmitting ? 'Activating Session…' : 'Activate Attendance Session Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Conclude & Headcount Reconciliation Modal ───────── */}
      <Modal
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Conclude Training Session & Reconcile Roll Call"
      >
        <div className="reconcile-modal-content">
          <p className="modal-subtext">
            Review digital check-in count against your physical ground headcount and designate session category before sealing the session.
          </p>

          {/* Session Category Selector */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: 700 }}>
              Session Category &amp; Refreshment Distribution
            </label>
            <div className="category-selection-container">
              <label className={`category-radio-card ${concludeCategory === 'refreshment' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="sessionCategory"
                  value="refreshment"
                  checked={concludeCategory === 'refreshment'}
                  onChange={() => setConcludeCategory('refreshment')}
                />
                <div className="category-card-text">
                  <strong>Refreshment Day (Saturday Parade)</strong>
                  <p>Refreshment distributed to present cadets. Generates ₹18/cadet entitlement, geo-tagged ground photo dossier, and Directorate NER link.</p>
                </div>
              </label>

              <label className={`category-radio-card ${concludeCategory === 'casual' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="sessionCategory"
                  value="casual"
                  checked={concludeCategory === 'casual'}
                  onChange={() => setConcludeCategory('casual')}
                />
                <div className="category-card-text">
                  <strong>Casual Training Day (Routine Lecture / Drill)</strong>
                  <p>Routine mid-week parade or classroom lecture. No refreshment distributed; dismisses NER Directorate upload requirement.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="reconcile-stats-grid">
            <div className="reconcile-stat-card">
              <div className="reconcile-stat-title">Digital Verified Present</div>
              <div className="reconcile-stat-value text-success">{presentTally}</div>
              <div className="reconcile-stat-sub">Cadets verified via mobile GPS / manual</div>
            </div>

            <div className="reconcile-stat-card">
              <div className="reconcile-stat-title">Total Enrolled Cadets</div>
              <div className="reconcile-stat-value">{totalEnrolled}</div>
              <div className="reconcile-stat-sub">Active battalion strength</div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Final Physical Ground Headcount</label>
            <input
              type="number"
              className="form-input"
              value={reconcileCount}
              min="0"
              onChange={(e) => setReconcileCount(e.target.value)}
              placeholder="e.g. 45"
            />
            <span className="form-hint">
              Update if latecomers or authorized cadets arrived during the training session.
            </span>
          </div>

          {/* Discrepancy indicator */}
          {Number(reconcileCount) === Number(presentTally) ? (
            <div className="alert-box alert-success" style={{ marginTop: '12px' }}>
              ✓ <strong>Counts Reconciled:</strong> Physical roll call matches digital check-ins exactly.
            </div>
          ) : (
            <div className="alert-box alert-danger" style={{ marginTop: '12px' }}>
              ⚠ <strong>Notice:</strong> Physical headcount ({reconcileCount}) differs from digital check-in ({presentTally}). Any discrepancy will be permanently recorded in the audit trail for CTO oversight.
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setReviewModalOpen(false);
                loadRosterForManual();
                setManualModalOpen(true);
              }}
            >
              Perform Manual Fallback First
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmCloseSession}
              disabled={closeSubmitting}
            >
              {closeSubmitting ? 'Sealing Session…' : 'Confirm & Finalize Session'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Manual Fallback Marking Modal ──────────────────── */}
      <Modal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Manual Attendance Fallback (Audited)"
      >
        <p className="modal-subtext">
          Use only when a cadet is physically present on the ground but unable to mark due to phone battery, network, or hardware GPS malfunction. This action is permanently recorded in the audit trail.
        </p>

        {manualMsg && <div className="alert-box alert-success">{manualMsg}</div>}

        <form onSubmit={handleManualMarkSubmit} className="manual-mark-form">
          <FormInput
            label="Search Cadet by Name or Regimental No"
            name="search"
            type="text"
            value={cadetSearch}
            onChange={(e) => setCadetSearch(e.target.value)}
            placeholder="Type to filter list below…"
          />

          <div className="cadet-select-list">
            {filteredRoster.slice(0, 15).map((c) => (
              <label
                key={c._id}
                className={`cadet-select-item ${selectedCadetId === c._id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="selectedCadet"
                  value={c._id}
                  checked={selectedCadetId === c._id}
                  onChange={() => setSelectedCadetId(c._id)}
                />
                <div className="cadet-select-info">
                  <strong>{c.name}</strong> <span>({c.regimentalNo})</span> • {c.rank} • Year {c.year}
                </div>
              </label>
            ))}
          </div>

          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Marking Status</label>
            <select
              className="form-input"
              value={manualStatus}
              onChange={(e) => setManualStatus(e.target.value)}
            >
              <option value="P">P — Present</option>
              <option value="A">A — Absent</option>
            </select>
          </div>

          <FormInput
            label="Reason for Manual Override (Mandatory Audit Requirement)"
            name="reason"
            type="text"
            value={manualReason}
            onChange={(e) => setManualReason(e.target.value)}
            placeholder="e.g. Device GPS failure on ground"
            required
          />

          <div className="modal-actions" style={{ marginTop: '16px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={manualSubmitting || !selectedCadetId}
            >
              {manualSubmitting ? 'Recording…' : 'Record Manual Mark'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setManualModalOpen(false)}
            >
              Done
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}