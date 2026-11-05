import { useState } from 'react';
import { useAuth } from '../../shared/auth/AuthContext';
import CadetAttendanceView from './views/CadetAttendanceView';
import OfficerSessionView from './views/OfficerSessionView';
import CadetRosterView from './views/CadetRosterView';
import AttendanceReportsView from './views/AttendanceReportsView';
import RefreshmentLedgerView from './views/RefreshmentLedgerView';
import YearlyPromotionView from './views/YearlyPromotionView';
import AttendanceSettingsView from './views/AttendanceSettingsView';
import AuditTrailView from './views/AuditTrailView';

export default function AttendanceModule({ initialTab }) {
  const { user, isLeadAdmin, isCTO } = useAuth();
  const isSUO = user?.rank === 'SUO';
  const isOfficerOrSUO = isLeadAdmin || isCTO || isSUO;

  // For regular cadets, always render their personal attendance view
  const isBasicCadet = !isOfficerOrSUO;

  const [activeTab, setActiveTab] = useState(
    initialTab || (isBasicCadet ? 'my-attendance' : 'session')
  );

  if (isBasicCadet) {
    return <CadetAttendanceView />;
  }

  return (
    <div className="attendance-module-container">
      {/* ── Sub-Navigation Bar for Officers & SUO ─────────── */}
      <div className="card" style={{ marginBottom: '20px', padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'session' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            onClick={() => setActiveTab('session')}
          >
            Live Session
          </button>

          {(isCTO || isLeadAdmin) && (
            <button
              type="button"
              className={`btn ${activeTab === 'roster' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              onClick={() => setActiveTab('roster')}
            >
              Cadet Roster
            </button>
          )}

          <button
            type="button"
            className={`btn ${activeTab === 'refreshment' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            onClick={() => setActiveTab('refreshment')}
          >
            Refreshment Ledger
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-outline'}`}
            style={{ padding: '8px 14px', fontSize: '0.84rem' }}
            onClick={() => setActiveTab('reports')}
          >
            Reports &amp; HQ Export
          </button>

          {(isCTO || isLeadAdmin) && (
            <button
              type="button"
              className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              onClick={() => setActiveTab('settings')}
            >
              Unit Settings
            </button>
          )}

          {(isCTO || isLeadAdmin) && (
            <button
              type="button"
              className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '8px 14px', fontSize: '0.84rem' }}
              onClick={() => setActiveTab('audit')}
            >
              Audit Trail
            </button>
          )}
        </div>
      </div>

      {/* ── Active View Rendering ─────────────────────────── */}
      {activeTab === 'session' && <OfficerSessionView />}
      {activeTab === 'roster' && <CadetRosterView />}
      {activeTab === 'refreshment' && <RefreshmentLedgerView />}
      {activeTab === 'reports' && <AttendanceReportsView />}
      {activeTab === 'settings' && <AttendanceSettingsView />}
      {activeTab === 'audit' && <AuditTrailView />}
    </div>
  );
}
