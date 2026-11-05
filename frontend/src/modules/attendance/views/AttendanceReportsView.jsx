import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import './AttendanceReportsView.css';

export default function AttendanceReportsView() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [yearFilter, setYearFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/reports', {
        params: { year: yearFilter, search },
      });
      setReportData(res.data.data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [yearFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/api/attendance/reports/export', {
        params: { year: yearFilter },
        responseType: 'blob',
      });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NCC_${reportData?.unit || 'Unit'}_Parade_Attendance_Report.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to export CSV report.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <Loader text="Compiling Attendance Analytics…" />;

  const cadets = reportData?.report || [];
  const flaggedCount = cadets.filter((c) => c.isFlagged).length;

  return (
    <div className="attendance-reports-page">
      <div className="reports-header card">
        <div className="reports-title-row">
          <div>
            <span className="unit-indicator-badge">Battalion Reports &amp; Analytics</span>
            <h1>Parade Attendance Reports</h1>
            <p className="reports-subtext">
              Unit-wide drill attendance percentages, B &amp; C exam qualification tracking, and official headquarters export.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportCSV}
            disabled={exporting || cadets.length === 0}
          >
            {exporting ? 'Generating CSV…' : 'Export HQ CSV Report'}
          </button>
        </div>
      </div>

      {/* ── Summary Metrics ─────────────────────────────────── */}
      <div className="reports-metrics-grid">
        <div className="card report-metric-card">
          <div className="metric-label">Total Parades Conducted</div>
          <div className="metric-val">{reportData?.totalSessionsHeld || 0}</div>
          <div className="metric-hint">Official regular drill sessions</div>
        </div>

        <div className="card report-metric-card">
          <div className="metric-label">Enrolled Cadets</div>
          <div className="metric-val">{reportData?.cadetCount || 0}</div>
          <div className="metric-hint">Active nominal roll count</div>
        </div>

        <div className="card report-metric-card">
          <div className="metric-label">Attendance Threshold</div>
          <div className="metric-val">{reportData?.minAttendancePercent || 75}%</div>
          <div className="metric-hint">Mandatory for certificate exams</div>
        </div>

        <div className="card report-metric-card">
          <div className="metric-label">Cadets with Shortage (&lt;75%)</div>
          <div className={`metric-val ${flaggedCount > 0 ? 'text-danger' : 'text-success'}`}>
            {flaggedCount}
          </div>
          <div className="metric-hint">Ineligible for B/C exams</div>
        </div>
      </div>

      {/* ── Reports Table with Filters ─────────────────────── */}
      <div className="card reports-table-card">
        <div className="card-header reports-filter-header">
          <div>
            <h2>Unit Cadet Attendance Roll</h2>
            <span className="count-sub">{cadets.length} Records</span>
          </div>

          <div className="reports-filters">
            <input
              type="text"
              placeholder="Filter Name / Regt No…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="reports-search-input"
            />

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="reports-select"
            >
              <option value="all">All Cadet Batches</option>
              <option value="1">1st Year Cadets</option>
              <option value="2">2nd Year Cadets</option>
              <option value="3">3rd Year Cadets</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Regimental No</th>
                <th>Cadet Name</th>
                <th>Batch</th>
                <th>Rank</th>
                <th>Wing</th>
                <th>Department</th>
                <th>Parades Attended</th>
                <th>Attendance %</th>
                <th>Eligibility Status</th>
              </tr>
            </thead>
            <tbody>
              {cadets.map((c) => (
                <tr key={c.userId}>
                  <td><code>{c.regimentalNo}</code></td>
                  <td><strong>{c.name}</strong></td>
                  <td>Year {c.year}</td>
                  <td><span className="rank-badge">{c.rank}</span></td>
                  <td>
                    <span className={`wing-pill ${c.gender === 'SW' ? 'pill-sw' : 'pill-sd'}`}>
                      {c.gender}
                    </span>
                  </td>
                  <td>{c.department || '—'}</td>
                  <td><strong>{c.attended}</strong> / {c.totalSessionsHeld}</td>
                  <td>
                    <span className={`pct-value ${c.isFlagged ? 'text-danger' : 'text-success'}`}>
                      {c.percentage}%
                    </span>
                  </td>
                  <td>
                    {c.isFlagged ? (
                      <span className="badge-flagged">Ineligible (&lt; 75%)</span>
                    ) : (
                      <span className="badge-eligible">Eligible</span>
                    )}
                  </td>
                </tr>
              ))}
              {cadets.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>
                    No cadets found matching search criteria.
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

