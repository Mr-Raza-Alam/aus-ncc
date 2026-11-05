import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../shared/api/axios';
import { useAuth } from '../../../shared/auth/AuthContext';
import Loader from '../../../components/Loader/Loader';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import './CadetRosterView.css';

export default function CadetRosterView() {
  const { user, isAdmin, activeUnit } = useAuth();
  const [loading, setLoading] = useState(true);
  const [cadets, setCadets] = useState([]);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterRank, setFilterRank] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');

  const currentUnit = isAdmin ? activeUnit : user?.unit || '3AB';
  const unitDisplayName =
    currentUnit === '62AB'
      ? '62 Assam Girls Bn NCC (Senior Wing • SW Only)'
      : '3 Assam Bn NCC (Senior Division & Senior Wing Mixed)';

  // Edit cadet modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingCadet, setEditingCadet] = useState(null);
  const [editRank, setEditRank] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [editSubmitting, setEditSubmitting] = useState(false);

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

  if (loading) return <Loader text="Loading Cadet Roster…" />;

  return (
    <div className="cadet-roster-page">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="roster-header card">
        <div className="roster-title-row">
          <div>
            <span className="unit-indicator-badge">Attendance Board • Enrolled Cadets</span>
            <h1>Cadet Roster Board</h1>
            <p className="roster-subtext">
              View, search, and verify the muster roll of enrolled cadets in {unitDisplayName}. Records are centrally synchronized from the Central Cadet Directory.
            </p>
          </div>
          <div className="roster-active-unit-card">
            <span className="roster-unit-label">Assigned Battalion:</span>
            <span className="roster-unit-val">{unitDisplayName}</span>
          </div>
        </div>
      </div>

      {/* ── Central Hub Sync & Intake Status Banner ─────────── */}
      <div className="card roster-sync-banner">
        <div className="sync-banner-info">
          <div>
            <strong>Battalion Intake Status:</strong>
            <div className="batch-status-indicators">
              <span className={`batch-indicator-pill ${year1Count > 0 ? 'pill-loaded' : 'pill-empty'}`}>
                1st Year: {year1Count > 0 ? `${year1Count} Enrolled` : 'Empty'}
              </span>
              <span className={`batch-indicator-pill ${year2Count > 0 ? 'pill-loaded' : 'pill-empty'}`}>
                2nd Year: {year2Count > 0 ? `${year2Count} Enrolled` : 'Empty'}
              </span>
              <span className={`batch-indicator-pill ${year3Count > 0 ? 'pill-loaded' : 'pill-empty'}`}>
                3rd Year: {year3Count > 0 ? `${year3Count} Enrolled` : 'Empty'}
              </span>
              <span className="batch-indicator-pill pill-total">
                Total: {cadets.length} Cadets
              </span>
            </div>
          </div>
          <p className="sync-hint">
            To upload new CSV batches or perform annual promotions, visit the dedicated Central Directory.
          </p>
        </div>

        <Link to="/dashboard/cadets?tab=upload" className="btn btn-primary btn-goto-central">
          Manage &amp; Upload CSV in Central Directory →
        </Link>
      </div>

      {/* ── Cadet Roster Table with Search & Filters ───────── */}
      <div className="card roster-table-card">
        <div className="card-header roster-table-header">
          <div>
            <h2>Enrolled Cadet Roster</h2>
            <span className="roster-count">{cadets.length} Cadets Listed</span>
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
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      No cadet records found for this unit.
                    </p>
                    <Link to="/dashboard/cadets?tab=upload" className="btn btn-primary">
                      Upload Batch CSV in Central Directory →
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              {editSubmitting ? 'Saving…' : 'Save Changes'}
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
