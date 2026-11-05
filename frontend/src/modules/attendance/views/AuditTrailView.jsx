import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import './AuditTrailView.css';

export default function AuditTrailView() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({
    totalSessionsOpened: 0,
    manualOverridesCount: 0,
    windowExtensionsCount: 0,
    headcountMismatchesCount: 0,
  });
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'OPEN' | 'MANUAL' | 'EXTEND' | 'MISMATCH'

  const fetchAudit = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/audit');
      setLogs(res.data.data || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      alert('No audit logs to export.');
      return;
    }

    const headers = ['Sl_No', 'Timestamp_IST', 'Action_Type', 'Authorizing_Officer', 'Rank_Designation', 'Audit_Details_And_Reason'];
    const rows = filteredLogs.map((l, index) => {
      const istTime = new Date(l.changedAt).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      });
      const officerName = `"${l.changedBy?.name || 'Officer / Admin'}"`;
      const officerRank = `"${l.changedBy?.rank || 'SUO / CTO'}"`;
      const cleanReason = `"${(l.reason || '').replace(/"/g, '""')}"`;
      return [index + 1, `"${istTime}"`, l.action, officerName, officerRank, cleanReason].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AUS_NCC_Attendance_Vigilance_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loader text="Loading Attendance Vigilance Ledger…" />;

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.reason?.toLowerCase().includes(search.toLowerCase()) ||
      l.changedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.changedBy?.rank?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'OPEN') return l.action === 'ATTENDANCE_SESSION_OPEN';
    if (activeFilter === 'MANUAL') return l.action === 'ATTENDANCE_MANUAL_OVERRIDE';
    if (activeFilter === 'EXTEND') return l.action === 'ATTENDANCE_SESSION_EXTEND';
    if (activeFilter === 'MISMATCH') return l.reason?.includes('MISMATCH') || l.action === 'ATTENDANCE_SESSION_CLOSE';

    return true;
  });

  const getActionBadge = (action) => {
    switch (action) {
      case 'ATTENDANCE_SESSION_OPEN':
        return <span className="action-pill badge-open">Session Activated</span>;
      case 'ATTENDANCE_MANUAL_OVERRIDE':
        return <span className="action-pill badge-manual">Manual Override</span>;
      case 'ATTENDANCE_SESSION_EXTEND':
        return <span className="action-pill badge-extend">Grace Extension</span>;
      case 'ATTENDANCE_SESSION_CLOSE':
        return <span className="action-pill badge-close">Session Sealed</span>;
      case 'ATTENDANCE_PHOTO_CAPTURE':
        return <span className="action-pill badge-photo">Photo Uploaded</span>;
      case 'NER_UPLOAD_CONFIRMED':
        return <span className="action-pill badge-ner">NER Confirmed</span>;
      default:
        return <span className="action-pill badge-default">{action}</span>;
    }
  };

  return (
    <div className="audit-trail-page">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="audit-header card">
        <div className="audit-title-row">
          <div>
            <span className="unit-indicator-badge">Attendance Integrity &amp; Officer Vigilance</span>
            <h1>Attendance Board Vigilance Ledger</h1>
            <p className="audit-subtext">
              Immutable log monitoring SUO and CTO attendance session activations, class frequency compliance (authorized twice-a-week parades), manual proxy overrides, and headcount reconciliations to eliminate favoritism.
            </p>
          </div>

          <div className="audit-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-export-csv"
              onClick={handleExportCSV}
              disabled={filteredLogs.length === 0}
            >
              Export Vigilance Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* ── Top Vigilance Metric Cards ─────────────────────────── */}
      <div className="vigilance-metrics-grid">
        <div className="card vigilance-stat-card">
          <div className="v-stat-label">Sessions Activated</div>
          <div className="v-stat-value text-navy">{summary.totalSessionsOpened}</div>
          <div className="v-stat-sub">Parade schedule compliance (2 classes/week)</div>
        </div>

        <div className={`card vigilance-stat-card ${summary.manualOverridesCount > 0 ? 'highlight-amber' : ''}`}>
          <div className="v-stat-label">Manual Overrides Given</div>
          <div className={`v-stat-value ${summary.manualOverridesCount > 0 ? 'text-amber' : 'text-success'}`}>
            {summary.manualOverridesCount}
          </div>
          <div className="v-stat-sub">Direct anti-favoritism &amp; proxy check</div>
        </div>

        <div className="card vigilance-stat-card">
          <div className="v-stat-label">Grace Extensions Granted</div>
          <div className="v-stat-value text-navy">{summary.windowExtensionsCount}</div>
          <div className="v-stat-sub">Window lengthening events (+15m)</div>
        </div>

        <div className={`card vigilance-stat-card ${summary.headcountMismatchesCount > 0 ? 'highlight-danger' : ''}`}>
          <div className="v-stat-label">Headcount Mismatches</div>
          <div className={`v-stat-value ${summary.headcountMismatchesCount > 0 ? 'text-danger' : 'text-success'}`}>
            {summary.headcountMismatchesCount}
          </div>
          <div className="v-stat-sub">Roll call headcount vs verified check-in</div>
        </div>
      </div>

      {/* ── Filter Tabs & Search Bar ──────────────────────────── */}
      <div className="card audit-table-card">
        <div className="audit-controls-bar">
          <div className="audit-filter-tabs">
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('ALL')}
            >
              All Records ({logs.length})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => setActiveFilter('OPEN')}
            >
              Session Activations ({summary.totalSessionsOpened})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === 'MANUAL' ? 'active' : ''}`}
              onClick={() => setActiveFilter('MANUAL')}
            >
              Manual Overrides ({summary.manualOverridesCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === 'EXTEND' ? 'active' : ''}`}
              onClick={() => setActiveFilter('EXTEND')}
            >
              Grace Extensions ({summary.windowExtensionsCount})
            </button>
            <button
              type="button"
              className={`filter-tab-btn ${activeFilter === 'MISMATCH' ? 'active' : ''}`}
              onClick={() => setActiveFilter('MISMATCH')}
            >
              Mismatches &amp; Closures
            </button>
          </div>

          <input
            type="text"
            placeholder="Search cadet reg no, officer, reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="audit-search-input"
          />
        </div>

        {/* ── Vigilance Ledger Table ───────────────────────────── */}
        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Timestamp (IST)</th>
                <th>Integrity Action</th>
                <th>Authorizing Officer / SUO</th>
                <th>Audit Details &amp; Justification</th>
                <th>Vigilance Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => {
                const isManual = l.action === 'ATTENDANCE_MANUAL_OVERRIDE';
                const isMismatch = l.reason?.includes('MISMATCH');
                const isExtend = l.action === 'ATTENDANCE_SESSION_EXTEND';

                return (
                  <tr
                    key={l._id}
                    className={`audit-row ${isManual ? 'row-manual' : ''} ${isMismatch ? 'row-mismatch' : ''}`}
                  >
                    <td className="audit-time-cell">
                      <strong>
                        {new Date(l.changedAt).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </strong>
                      <div className="sub-time">
                        {new Date(l.changedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </div>
                    </td>

                    <td>{getActionBadge(l.action)}</td>

                    <td>
                      <div className="officer-name">
                        <strong>{l.changedBy?.name || 'Officer / Admin'}</strong>
                      </div>
                      <span className="officer-rank-pill">
                        {l.changedBy?.rank || 'SUO / CTO'}
                      </span>
                    </td>

                    <td className="audit-reason-cell">
                      <div className="reason-text">{l.reason || '—'}</div>
                    </td>

                    <td className="audit-status-cell">
                      {isManual && (
                        <span className="integrity-tag tag-amber" title="Manual mark requires valid ground justification">
                          ⚠ Proxy Audit Check
                        </span>
                      )}
                      {isMismatch && (
                        <span className="integrity-tag tag-danger" title="Physical fall-in headcount differed from GPS count">
                          ⚠ Mismatch Logged
                        </span>
                      )}
                      {isExtend && (
                        <span className="integrity-tag tag-blue" title="Check-in window extended by officer">
                          +15m Window Added
                        </span>
                      )}
                      {!isManual && !isMismatch && !isExtend && (
                        <span className="integrity-tag tag-verified">
                          ✓ Normal Integrity
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                    No attendance vigilance records found matching the active filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
