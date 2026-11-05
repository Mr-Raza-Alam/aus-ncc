import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/api/axios';
import { useAuth } from '../../../shared/auth/AuthContext';
import Loader from '../../../components/Loader/Loader';
import Modal from '../../../components/Modal/Modal';
import FormInput from '../../../components/FormInput/FormInput';
import './RefreshmentLedgerView.css';

export default function RefreshmentLedgerView() {
  const { user, isCTO, isLeadAdmin } = useAuth();
  const canRecordMoney = isCTO || isLeadAdmin;

  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState(null);
  const [activeTab, setActiveTab] = useState('dossiers'); // 'dossiers' | 'bills' | 'payments'

  // Bill upload modal state
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billImageFile, setBillImageFile] = useState(null);
  const [billUploading, setBillUploading] = useState(false);
  const [billMsg, setBillMsg] = useState('');

  // Payment record modal state (CTO only)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [direction, setDirection] = useState('in'); // 'in' = received from Unit, 'out' = paid to vendor
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [payMsg, setPayMsg] = useState('');

  // Bill image view modal
  const [previewImage, setPreviewImage] = useState(null);

  // Inspection Dossier Modal
  const [selectedDossierSession, setSelectedDossierSession] = useState(null);

  const fetchLedger = useCallback(async () => {
    try {
      const res = await api.get('/api/attendance/refreshment/ledger');
      setLedgerData(res.data.data);
    } catch (err) {
      console.error('Failed to load refreshment ledger:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleBillSubmit = async (e) => {
    e.preventDefault();
    if (!billImageFile) {
      alert('Please select a bill receipt image.');
      return;
    }

    setBillUploading(true);
    setBillMsg('');

    try {
      const formData = new FormData();
      formData.append('vendorName', vendorName);
      formData.append('amount', billAmount);
      formData.append('date', billDate);
      formData.append('billImage', billImageFile);

      await api.post('/api/attendance/refreshment/bill', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setBillMsg('Bill receipt uploaded to Cloudflare R2 and recorded.');
      setVendorName('');
      setBillAmount('');
      setBillImageFile(null);
      fetchLedger();
    } catch (err) {
      setBillMsg(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setBillUploading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaySubmitting(true);
    setPayMsg('');

    try {
      await api.post('/api/attendance/refreshment/payment', {
        direction,
        amount: payAmount,
        date: payDate,
        reference,
      });

      setPayMsg(`Money ${direction.toUpperCase()} recorded successfully.`);
      setPayAmount('');
      setReference('');
      fetchLedger();
    } catch (err) {
      setPayMsg(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setPaySubmitting(false);
    }
  };

  if (loading) return <Loader text="Loading Refreshment Ledger & Inspection Dossiers…" />;

  const summary = ledgerData?.summary || {
    totalBilled: 0,
    totalReceived: 0,
    totalPaid: 0,
    totalEntitled: 0,
    outstandingToVendor: 0,
    balanceInHand: 0,
  };

  return (
    <div className="refreshment-ledger-page">
      <div className="ledger-header card">
        <div className="ledger-title-row">
          <div>
            <span className="unit-indicator-badge">Parade Log &amp; Welfare</span>
            <h1>Refreshment Distribution &amp; Inspection Ledger</h1>
            <p className="ledger-subtext">
              Digital receipt trail, official inspection dossiers, geo-location muster proofs, and fund accounting under NCC Directorate NER guidelines.
            </p>
          </div>

          <div className="ledger-header-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setBillMsg('');
                setBillModalOpen(true);
              }}
            >
              Upload Vendor Bill
            </button>

            {canRecordMoney && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setPayMsg('');
                  setPaymentModalOpen(true);
                }}
              >
                Record Money In / Out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary Balances Strip ─────────────────────────── */}
      <div className="balances-grid">
        <div className="card balance-card">
          <div className="balance-label">Total Billed</div>
          <div className="balance-amount">₹{summary.totalBilled.toLocaleString('en-IN')}</div>
          <div className="balance-hint">All vendor invoices submitted</div>
        </div>

        <div className="card balance-card">
          <div className="balance-label">Total Funds Received</div>
          <div className="balance-amount text-success">₹{summary.totalReceived.toLocaleString('en-IN')}</div>
          <div className="balance-hint">Disbursed by Battalion / Unit</div>
        </div>

        <div className="card balance-card">
          <div className="balance-label">Total Vendor Payments</div>
          <div className="balance-amount text-danger">₹{summary.totalPaid.toLocaleString('en-IN')}</div>
          <div className="balance-hint">Settled with suppliers</div>
        </div>

        <div className="card balance-card">
          <div className="balance-label">Outstanding to Vendor</div>
          <div className={`balance-amount ${summary.outstandingToVendor > 0 ? 'text-danger' : 'text-success'}`}>
            ₹{summary.outstandingToVendor.toLocaleString('en-IN')}
          </div>
          <div className="balance-hint">Pending vendor bills</div>
        </div>

        <div className="card balance-card highlight-card">
          <div className="balance-label">Balance in Hand</div>
          <div className="balance-amount text-primary">₹{summary.balanceInHand.toLocaleString('en-IN')}</div>
          <div className="balance-hint">Received minus Total Paid</div>
        </div>
      </div>

      {/* ── Ledger Tabs ────────────────────────────────────── */}
      <div className="card ledger-tables-card">
        <div className="ledger-tabs-header">
          <div className="tabs-toggle">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'dossiers' ? 'active' : ''}`}
              onClick={() => setActiveTab('dossiers')}
            >
              Parade Inspection Dossiers ({ledgerData?.sessions?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'bills' ? 'active' : ''}`}
              onClick={() => setActiveTab('bills')}
            >
              Vendor Bills ({ledgerData?.bills?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              Money In / Out Register ({ledgerData?.payments?.length || 0})
            </button>
          </div>
        </div>

        {/* Tab 1: Inspection Dossiers */}
        {activeTab === 'dossiers' && (
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Session Date</th>
                  <th>Parade Type</th>
                  <th>Verified Present Cadets</th>
                  <th>Geo-Photo Proof</th>
                  <th>Directorate NER Status</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData?.sessions?.map((s) => (
                  <tr key={s._id}>
                    <td>
                      <strong>{s.date}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {s.startTime ? new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                    </td>
                    <td>{s.sessionType}</td>
                    <td>
                      <strong className="text-navy">{s.declaredPresentCount || 0} Cadets</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Physical Roll Call Verified
                      </div>
                    </td>
                    <td>
                      {s.photoUrl ? (
                        <span className="badge-tag photo-available">
                          ✓ Geo-Photo Attached
                        </span>
                      ) : (
                        <span className="badge-tag photo-missing">
                          ⚠ Missing Photo
                        </span>
                      )}
                    </td>
                    <td>
                      {s.nerUploaded ? (
                        <span className="badge-tag ner-tag-done" title={s.nerRefNo ? `Ref: ${s.nerRefNo}` : ''}>
                          ✓ NER Confirmed {s.nerRefNo ? `(${s.nerRefNo})` : ''}
                        </span>
                      ) : (
                        <span className="badge-tag ner-tag-pending">
                          Pending NER Upload
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        onClick={() => setSelectedDossierSession(s)}
                      >
                        View Inspection Dossier
                      </button>
                    </td>
                  </tr>
                ))}
                {(!ledgerData?.sessions || ledgerData.sessions.length === 0) && (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '32px' }}>
                      No refreshment distribution sessions recorded yet. Conclude a Saturday parade session as &quot;Refreshment Day&quot; in the Live Session Controller.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Vendor Bills */}
        {activeTab === 'bills' && (
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vendor Name</th>
                  <th>Amount (₹)</th>
                  <th>Uploaded By</th>
                  <th>Receipt Image</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData?.bills?.map((b) => (
                  <tr key={b._id}>
                    <td>{new Date(b.date).toLocaleDateString('en-IN')}</td>
                    <td><strong>{b.vendorName}</strong></td>
                    <td><strong>₹{b.amount.toLocaleString('en-IN')}</strong></td>
                    <td>{b.uploadedBy?.name || 'Officer'} ({b.uploadedBy?.rank || 'CTO'})</td>
                    <td>
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => setPreviewImage(b.billImageUrl)}
                      >
                        View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
                {(!ledgerData?.bills || ledgerData.bills.length === 0) && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>
                      No refreshment vendor bills recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Money Register */}
        {activeTab === 'payments' && (
          <div className="table-responsive">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Flow Direction</th>
                  <th>Amount (₹)</th>
                  <th>Reference / Voucher No</th>
                  <th>Recorded By</th>
                </tr>
              </thead>
              <tbody>
                {ledgerData?.payments?.map((p) => (
                  <tr key={p._id}>
                    <td>{new Date(p.date).toLocaleDateString('en-IN')}</td>
                    <td>
                      <span className={`direction-badge ${p.direction === 'in' ? 'badge-in' : 'badge-out'}`}>
                        {p.direction === 'in' ? 'IN — Received from Unit' : 'OUT — Paid to Vendor'}
                      </span>
                    </td>
                    <td>
                      <strong className={p.direction === 'in' ? 'text-success' : 'text-danger'}>
                        {p.direction === 'in' ? '+' : '-'}₹{p.amount.toLocaleString('en-IN')}
                      </strong>
                    </td>
                    <td>{p.reference || '—'}</td>
                    <td>{p.recordedBy?.name || 'CTO'} ({p.recordedBy?.designation || 'Commanding Officer'})</td>
                  </tr>
                ))}
                {(!ledgerData?.payments || ledgerData.payments.length === 0) && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px' }}>
                      No fund payments or disbursements recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Inspection Dossier Modal ───────────────────────── */}
      {selectedDossierSession && (
        <Modal
          isOpen={Boolean(selectedDossierSession)}
          onClose={() => setSelectedDossierSession(null)}
          title="Parade Inspection Dossier & Ground Proof"
        >
          <div className="dossier-modal-content">
            <div className="dossier-modal-header">
              <div>
                <strong>{selectedDossierSession.sessionType}</strong>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Date: {selectedDossierSession.date} • Unit: {selectedDossierSession.unit}
                </div>
              </div>
              <div className="dossier-modal-badges">
                {selectedDossierSession.nerUploaded ? (
                  <span className="badge-tag ner-tag-done">✓ NER Confirmed</span>
                ) : (
                  <span className="badge-tag ner-tag-pending">Pending NER Upload</span>
                )}
              </div>
            </div>

            <div className="dossier-modal-stats">
              <div className="modal-stat-box">
                <span className="m-label">Verified Present</span>
                <span className="m-val text-success">{selectedDossierSession.declaredPresentCount || 0} Cadets</span>
              </div>
              <div className="modal-stat-box">
                <span className="m-label">Session Category</span>
                <span className="m-val text-navy" style={{ fontSize: '0.9rem' }}>Refreshment Parade</span>
              </div>
              <div className="modal-stat-box">
                <span className="m-label">Directorate Ref</span>
                <span className="m-val" style={{ fontSize: '0.9rem' }}>{selectedDossierSession.nerRefNo || 'Recorded'}</span>
              </div>
            </div>

            {selectedDossierSession.photoUrl ? (
              <div className="dossier-modal-photo-box">
                <img
                  src={selectedDossierSession.photoUrl}
                  alt="Inspection Ground Proof"
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'cover', borderRadius: '6px' }}
                />
                <div className="photo-stamp-metadata" style={{ marginTop: '12px' }}>
                  <div className="stamp-title">Ground Audit Metadata (Cloudflare R2 Proof)</div>
                  <div className="stamp-item">
                    <span className="stamp-label">Venue:</span>
                    <span className="stamp-val">{selectedDossierSession.venue?.name || 'Assam University Parade Ground'}</span>
                  </div>
                  <div className="stamp-item">
                    <span className="stamp-label">GPS Coordinates:</span>
                    <span className="stamp-val">
                      {selectedDossierSession.photoCoords?.lat
                        ? `${selectedDossierSession.photoCoords.lat.toFixed(6)}° N, ${selectedDossierSession.photoCoords.lng.toFixed(6)}° E`
                        : selectedDossierSession.venue?.lat
                        ? `${selectedDossierSession.venue.lat.toFixed(6)}° N, ${selectedDossierSession.venue.lng.toFixed(6)}° E`
                        : 'Coordinates Tagged'}
                    </span>
                  </div>
                  <div className="stamp-item">
                    <span className="stamp-label">Archived Timestamp:</span>
                    <span className="stamp-val">
                      {selectedDossierSession.photoCapturedAt
                        ? new Date(selectedDossierSession.photoCapturedAt).toLocaleString('en-IN')
                        : 'Parade Muster Time'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert-box alert-danger" style={{ marginTop: '12px' }}>
                No parade ground photo was attached to this session.
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <a
                href="https://ner.nccindia.nic.in"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                Open NER Portal ↗
              </a>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setSelectedDossierSession(null)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Upload Bill Modal ──────────────────────────────── */}
      <Modal
        isOpen={billModalOpen}
        onClose={() => setBillModalOpen(false)}
        title="Upload Refreshment Vendor Bill"
      >
        {billMsg && <div className="alert-box alert-success">{billMsg}</div>}

        <form onSubmit={handleBillSubmit} className="bill-modal-form">
          <FormInput
            label="Vendor / Supplier Name"
            name="vendor"
            type="text"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            placeholder="e.g. Campus Canteen / Sweets Vendor"
            required
          />

          <FormInput
            label="Total Bill Amount (₹)"
            name="amount"
            type="number"
            min="1"
            value={billAmount}
            onChange={(e) => setBillAmount(e.target.value)}
            placeholder="e.g. 2400"
            required
          />

          <FormInput
            label="Bill Date"
            name="date"
            type="date"
            value={billDate}
            onChange={(e) => setBillDate(e.target.value)}
            required
          />

          <div className="form-group">
            <label className="form-label">Bill Receipt Photo / Invoice</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setBillImageFile(e.target.files[0])}
              className="form-input"
              required
            />
            <small style={{ color: 'var(--text-secondary)' }}>
              Uploaded securely to Cloudflare R2 bucket.
            </small>
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={billUploading || !vendorName || !billAmount || !billImageFile}
            >
              {billUploading ? 'Uploading to R2…' : 'Record Bill Invoice'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setBillModalOpen(false)}
            >
              Done
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Record Money Modal (CTO Only) ──────────────────── */}
      {canRecordMoney && (
        <Modal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          title="Record Refreshment Money In / Out"
        >
          {payMsg && <div className="alert-box alert-success">{payMsg}</div>}

          <form onSubmit={handlePaymentSubmit} className="payment-modal-form">
            <div className="form-group">
              <label className="form-label">Transaction Direction</label>
              <select
                className="form-input"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
              >
                <option value="in">IN — Received from Battalion / Unit</option>
                <option value="out">OUT — Paid to Vendor / Supplier</option>
              </select>
            </div>

            <FormInput
              label="Transaction Amount (₹)"
              name="amount"
              type="number"
              min="1"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="e.g. 5000"
              required
            />

            <FormInput
              label="Transaction Date"
              name="date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              required
            />

            <FormInput
              label="Reference / Cheque / Voucher Number"
              name="ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. UTR10293848 or Voucher #42"
            />

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={paySubmitting || !payAmount}
              >
                {paySubmitting ? 'Recording…' : 'Save Transaction'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setPaymentModalOpen(false)}
              >
                Done
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Image Preview Modal ────────────────────────────── */}
      {previewImage && (
        <Modal
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title="Refreshment Vendor Bill Receipt"
        >
          <div style={{ textAlign: 'center' }}>
            <img
              src={previewImage}
              alt="Receipt Invoice"
              style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '6px' }}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
