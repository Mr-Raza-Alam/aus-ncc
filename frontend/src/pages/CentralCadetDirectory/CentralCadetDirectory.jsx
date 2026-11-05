import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../shared/api/axios';
import { useAuth } from '../../shared/auth/AuthContext';
import Loader from '../../components/Loader/Loader';
import Modal from '../../components/Modal/Modal';
import FormInput from '../../components/FormInput/FormInput';
import YearlyPromotionView from '../../modules/attendance/views/YearlyPromotionView';
import './CentralCadetDirectory.css';

function BatchUploadSlot({ year, title, onImportSuccess }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFile(selected || null);
    setPreview(null);
    setStatusMsg('');
    setErrorMsg('');
  };

  const handleValidatePreview = async () => {
    if (!file) return;
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', year);

      const res = await api.post('/api/attendance/roster/import?dryRun=true', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.data);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Validation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setImporting(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('year', year);

      const res = await api.post('/api/attendance/roster/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setStatusMsg(res.data.message || 'Batch imported successfully.');
      setPreview(null);
      setFile(null);
      if (onImportSuccess) onImportSuccess();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="batch-slot-card">
      <div className="slot-badge">Slot {year} • {title}</div>
      <p className="slot-hint">Upload <code>{year === 1 ? '1st' : year === 2 ? '2nd' : '3rd'}_year_record.csv</code></p>

      <div className="slot-file-row">
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="slot-input"
        />
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleValidatePreview}
          disabled={!file || loading}
        >
          {loading ? 'Reading…' : 'Validate Preview'}
        </button>
      </div>

      {preview && (
        <div className="preview-results-box">
          <div className="preview-summary-text">
            <strong>{year === 1 ? '1st' : year === 2 ? '2nd' : '3rd'} Year:</strong> {preview.totalRows} rows read •{' '}
            <span className="text-success">{preview.validCount} valid</span> •{' '}
            <span className={preview.rejectedCount > 0 ? 'text-danger' : ''}>{preview.rejectedCount} rejected</span>
          </div>

          {preview.rejectedRows && preview.rejectedRows.length > 0 && (
            <div className="rejected-details">
              <strong>Rejected Rows ({preview.rejectedRows.length}):</strong>
              <ul>
                {preview.rejectedRows.slice(0, 5).map((r, i) => (
                  <li key={i}>
                    Row {r.row} ({r.regimentalNo || 'No RegtNo'}): {r.reason}
                  </li>
                ))}
                {preview.rejectedRows.length > 5 && (
                  <li>…and {preview.rejectedRows.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={importing || preview.validCount === 0}
            >
              {importing ? 'Upserting Cadets…' : `Confirm & Import ${preview.validCount} Cadets`}
            </button>
          </div>
        </div>
      )}

      {statusMsg && <div className="slot-status-msg text-success">{statusMsg}</div>}
      {errorMsg && <div className="slot-status-msg text-danger">{errorMsg}</div>}
    </div>
  );
}

export default function CentralCadetDirectory() {
  const { user, isAdmin, activeUnit } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'directory';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [cadets, setCadets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterRank, setFilterRank] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  // Edit cadet modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCadet, setEditingCadet] = useState(null);
  const [editRank, setEditRank] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const currentUnit = isAdmin ? activeUnit : user?.unit || '3AB';
  const unitDisplayName = currentUnit === '62AB' ? '62 Assam Girls Bn NCC' : '3 Assam Bn NCC';

  const fetchRoster = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/roster', {
        params: {
          search,
          year: filterYear,
          rank: filterRank,
          status: filterStatus,
        },
      });
      setCadets(res.data.data || []);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filterYear, filterRank, filterStatus]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Keep tab state synchronized with URL query params
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const openEditModal = (cadet) => {
    setEditingCadet(cadet);
    setEditRank(cadet.rank || 'Cadet');
    setEditDepartment(cadet.department || '');
    setEditPhone(cadet.phone || '');
    setEditStatus(cadet.status || 'active');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingCadet) return;
    setEditSubmitting(true);

    try {
      await api.patch(`/api/attendance/roster/${editingCadet._id}`, {
        rank: editRank,
        department: editDepartment,
        phone: editPhone,
        status: editStatus,
      });
      setEditModalOpen(false);
      fetchRoster();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update cadet.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Compute batch breakdown
  const year1Count = cadets.filter((c) => c.year === 1 || c.year === '1').length;
  const year2Count = cadets.filter((c) => c.year === 2 || c.year === '2').length;
  const year3Count = cadets.filter((c) => c.year === 3 || c.year === '3').length;

  if (loading) return <Loader text="Loading Central Cadet Directory…" />;

  return (
    <div className="central-directory-page">
      {/* ── Main Institutional Header ───────────────────────── */}
      <div className="central-header card">
        <div className="central-title-row">
          <div>
            <span className="unit-indicator-badge">Central Personnel Hub</span>
            <h1>Central Cadet Directory</h1>
            <p className="central-subtext">
              The single source of truth for all cadet records across {unitDisplayName}. Information maintained here automatically powers Attendance, Camps, Refreshments, and Academics.
            </p>
          </div>
          <div className="central-unit-card">
            <span className="central-unit-label">Active Battalion:</span>
            <span className="central-unit-val">{unitDisplayName}</span>
          </div>
        </div>
      </div>

      {/* ── Directory Sub-Navigation Tabs ───────────────────── */}
      <div className="card central-subnav-card">
        <div className="central-subnav-inner">
          <button
            type="button"
            className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTabChange('directory')}
          >
            Master Cadet Directory ({cadets.length})
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'upload' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTabChange('upload')}
          >
            3-Slot CSV Batch Intake
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'promote' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => handleTabChange('promote')}
          >
            1 April Annual Promotion
          </button>
        </div>
      </div>

      {/* ── Tab 1: Master Directory & Table ─────────────────── */}
      {activeTab === 'directory' && (
        <div className="card roster-table-card">
          <div className="card-header roster-table-header">
            <div>
              <h2>Master Personnel Registry</h2>
              <div className="batch-pill-row">
                <span className="batch-stat-pill">1st Year: {year1Count}</span>
                <span className="batch-stat-pill">2nd Year: {year2Count}</span>
                <span className="batch-stat-pill">3rd Year: {year3Count}</span>
                <span className="batch-stat-pill total">Total: {cadets.length}</span>
              </div>
            </div>

            <div className="roster-filter-bar">
              <input
                type="text"
                placeholder="Search Name / Regt No / Dept…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="roster-search-input"
              />

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="roster-select"
              >
                <option value="all">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="alumni">Alumni</option>
              </select>

              <select
                value={filterRank}
                onChange={(e) => setFilterRank(e.target.value)}
                className="roster-select"
              >
                <option value="all">All Ranks</option>
                <option value="SUO">SUO</option>
                <option value="JUO">JUO</option>
                <option value="CSM">CSM</option>
                <option value="CQMS">CQMS</option>
                <option value="Sergeant">Sergeant</option>
                <option value="Cadet">Cadet</option>
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="roster-select"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated / Alumni</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="roster-table">
              <thead>
                <tr>
                  <th>Regimental No</th>
                  <th>Cadet Name</th>
                  <th>Rank</th>
                  <th>Year</th>
                  <th>Gender</th>
                  <th>Department</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cadets.map((c) => (
                  <tr key={c._id}>
                    <td className="reg-no-cell">{c.regimentalNo}</td>
                    <td><strong>{c.name}</strong></td>
                    <td><span className="rank-badge">{c.rank}</span></td>
                    <td>Year {c.year}</td>
                    <td><span className="gender-tag">{c.gender}</span></td>
                    <td>{c.department || '—'}</td>
                    <td>{c.phone || '—'}</td>
                    <td>
                      <span className={`status-pill ${c.status === 'active' ? 'active' : 'inactive'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-edit-cadet"
                        onClick={() => openEditModal(c)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {cadets.length === 0 && (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '36px' }}>
                      <p style={{ marginBottom: '10px', color: 'var(--text-secondary)' }}>
                        No cadet records found in the directory.
                      </p>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => handleTabChange('upload')}
                      >
                        Upload CSV Batch Intake →
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab 2: 3-Slot Batch Intake ──────────────────────── */}
      {activeTab === 'upload' && (
        <div className="card batch-slots-container">
          <div className="card-header">
            <h2>Three-Batch CSV Intake Slots</h2>
            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
              Import official student spreadsheets. Each slot strictly validates and assigns the cadet year. Re-imports are safe and update existing details without duplicating records.
            </p>
          </div>

          <div className="batch-slots-grid">
            <BatchUploadSlot
              year={1}
              title="1st Year Cadets Intake"
              onImportSuccess={fetchRoster}
            />
            <BatchUploadSlot
              year={2}
              title="2nd Year Cadets Batch"
              onImportSuccess={fetchRoster}
            />
            <BatchUploadSlot
              year={3}
              title="3rd Year Cadets Batch"
              onImportSuccess={fetchRoster}
            />
          </div>
        </div>
      )}

      {/* ── Tab 3: 1 April Annual Promotion ─────────────────── */}
      {activeTab === 'promote' && <YearlyPromotionView />}

      {/* ── Edit Cadet Modal ────────────────────────────────── */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Cadet: ${editingCadet?.name || ''}`}
      >
        <form onSubmit={handleEditSubmit} className="edit-cadet-form">
          <div className="form-group">
            <label className="form-label">Service Rank</label>
            <select
              className="form-input"
              value={editRank}
              onChange={(e) => setEditRank(e.target.value)}
            >
              <option value="Cadet">Cadet</option>
              <option value="Lance Corporal">Lance Corporal</option>
              <option value="Corporal">Corporal</option>
              <option value="Sergeant">Sergeant</option>
              <option value="CQMS">CQMS</option>
              <option value="CSM">CSM</option>
              <option value="JUO">JUO</option>
              <option value="SUO">SUO</option>
            </select>
          </div>

          <FormInput
            label="Department / Course"
            name="dept"
            type="text"
            value={editDepartment}
            onChange={(e) => setEditDepartment(e.target.value)}
          />

          <FormInput
            label="Contact Phone"
            name="phone"
            type="text"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">Enrollment Status</label>
            <select
              className="form-input"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated / Alumni</option>
              <option value="discharged">Discharged</option>
            </select>
          </div>

          <div className="modal-actions" style={{ marginTop: '16px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={editSubmitting}
            >
              {editSubmitting ? 'Saving Changes…' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

