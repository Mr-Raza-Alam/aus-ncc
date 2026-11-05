import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import Loader from '../../../components/Loader/Loader';
import Modal from '../../../components/Modal/Modal';
import './YearlyPromotionView.css';

export default function YearlyPromotionView() {
  const [loading, setLoading] = useState(true);
  const [previewData, setPreviewData] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  const fetchPreview = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/promote/preview');
      setPreviewData(res.data.data);
    } catch (err) {
      console.error('Failed to load promotion preview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleExecutePromotion = async () => {
    setExecuting(true);
    setResultMsg('');
    try {
      const res = await api.post('/api/attendance/promote');
      setResultMsg(res.data.message || 'Promotion successfully executed.');
      setConfirmModalOpen(false);
      fetchPreview();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to execute promotion.');
    } finally {
      setExecuting(false);
    }
  };

  if (loading) return <Loader text="Generating 1 April Promotion Preview…" />;

  const counts = previewData?.counts || {
    firstToSecond: 0,
    secondToThird: 0,
    thirdToAlumni: 0,
    totalAffected: 0,
  };

  return (
    <div className="promotion-page">
      <div className="promotion-header card">
        <div className="promotion-title-row">
          <div>
            <span className="unit-indicator-badge">1 April Annual Milestone</span>
            <h1>Cadet Yearly Promotion (1 April)</h1>
            <p className="promotion-subtext">
              Advances active cadet cohorts to their subsequent training year. Third-year cadets are archived into read-only Alumni status.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-promote-all"
            onClick={() => setConfirmModalOpen(true)}
            disabled={counts.totalAffected === 0}
          >
            Promote All Cadets Now
          </button>
        </div>
      </div>

      {resultMsg && <div className="alert-box alert-success">{resultMsg}</div>}

      {/* ── Summary Count Cards ────────────────────────────── */}
      <div className="promotion-summary-grid">
        <div className="card promo-card">
          <div className="promo-tag">1st Year Cadets</div>
          <div className="promo-shift-label">1st → 2nd Year</div>
          <div className="promo-count">{counts.firstToSecond} Cadets</div>
          <div className="promo-desc">Will advance to 2nd year training curriculum</div>
        </div>

        <div className="card promo-card">
          <div className="promo-tag">2nd Year Cadets</div>
          <div className="promo-shift-label">2nd → 3rd Year</div>
          <div className="promo-count">{counts.secondToThird} Cadets</div>
          <div className="promo-desc">Will advance to Senior Cadet leadership year</div>
        </div>

        <div className="card promo-card">
          <div className="promo-tag">3rd Year Cadets</div>
          <div className="promo-shift-label">3rd → Alumni</div>
          <div className="promo-count">{counts.thirdToAlumni} Cadets</div>
          <div className="promo-desc">Will be archived as read-only Alumni (never deleted)</div>
        </div>
      </div>

      {/* ── Transition Preview Lists ───────────────────────── */}
      <div className="card promo-preview-card">
        <div className="card-header">
          <h2>Dry-Run Transition Preview</h2>
          <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
            Review all cadets who will be updated upon confirmation.
          </p>
        </div>

        <div className="cohort-columns-grid">
          <div className="cohort-col">
            <h3>1st → 2nd Year ({previewData?.preview?.firstToSecond?.length || 0})</h3>
            <div className="cohort-list">
              {previewData?.preview?.firstToSecond?.map((c) => (
                <div key={c.id} className="cohort-item">
                  <strong>{c.name}</strong>
                  <span>{c.regimentalNo}</span>
                </div>
              ))}
              {(!previewData?.preview?.firstToSecond || previewData.preview.firstToSecond.length === 0) && (
                <div className="cohort-empty">No 1st-year cadets found.</div>
              )}
            </div>
          </div>

          <div className="cohort-col">
            <h3>2nd → 3rd Year ({previewData?.preview?.secondToThird?.length || 0})</h3>
            <div className="cohort-list">
              {previewData?.preview?.secondToThird?.map((c) => (
                <div key={c.id} className="cohort-item">
                  <strong>{c.name}</strong>
                  <span>{c.regimentalNo}</span>
                </div>
              ))}
              {(!previewData?.preview?.secondToThird || previewData.preview.secondToThird.length === 0) && (
                <div className="cohort-empty">No 2nd-year cadets found.</div>
              )}
            </div>
          </div>

          <div className="cohort-col">
            <h3>3rd → Alumni ({previewData?.preview?.thirdToAlumni?.length || 0})</h3>
            <div className="cohort-list">
              {previewData?.preview?.thirdToAlumni?.map((c) => (
                <div key={c.id} className="cohort-item">
                  <strong>{c.name}</strong>
                  <span>{c.regimentalNo}</span>
                </div>
              ))}
              {(!previewData?.preview?.thirdToAlumni || previewData.preview.thirdToAlumni.length === 0) && (
                <div className="cohort-empty">No 3rd-year cadets found.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ─────────────────────────────── */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirm 1 April Annual Cadet Promotion"
      >
        <p style={{ lineHeight: '1.5', color: '#334155' }}>
          You are about to advance <strong>{counts.totalAffected}</strong> cadets across all three batches:
        </p>
        <ul style={{ margin: '12px 0 16px 20px', fontSize: '0.9rem', color: '#334155' }}>
          <li>• <strong>{counts.firstToSecond}</strong> 1st Year Cadets will become 2nd Year.</li>
          <li>• <strong>{counts.secondToThird}</strong> 2nd Year Cadets will become 3rd Year.</li>
          <li>• <strong>{counts.thirdToAlumni}</strong> 3rd Year Cadets will become Alumni (archived).</li>
        </ul>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          This action writes a permanent entry to the audit log. Do you wish to proceed?
        </p>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExecutePromotion}
            disabled={executing}
          >
            {executing ? 'Executing Promotion…' : 'Yes, Confirm Promotion'}
          </button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setConfirmModalOpen(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}

