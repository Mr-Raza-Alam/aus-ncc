import { Link } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user, isAdmin, isLeadAdmin, isCTO, isCadet, activeUnit } = useAuth();

  // Official Role Title — Admins & CTOs hold official appointments, NOT cadet ranks!
  const getRoleLabel = () => {
    if (user?.roles?.includes('lead_admin')) return 'Lead Administrator';
    if (user?.roles?.includes('cto')) return 'Care Taker Officer (CTO)';
    if (user?.roles?.includes('assistant')) return 'Assistant In-charge';
    if (user?.roles?.includes('ncc-cdt')) return user?.rank || 'NCC Cadet';
    return 'Cadet';
  };

  const getYearLabel = (yr) => {
    if (yr === 1 || yr === '1') return '1st Year Cadet';
    if (yr === 2 || yr === '2') return '2nd Year Cadet (B-Cert)';
    if (yr === 3 || yr === '3') return '3rd Year Cadet (C-Cert)';
    if (yr === 'alumni') return 'NCC Alumni';
    return 'Cadet';
  };

  // Concise Battalion Name
  const currentUnitCode = isAdmin ? activeUnit : user?.unit || '3AB';
  const conciseUnitName = currentUnitCode === '62AB' ? '62 Assam Girls Bn NCC' : '3 Assam Bn NCC';

  return (
    <div className="dashboard-wrapper">
      {/* ── Header / Welcome Card ──────────────────────────── */}
      <div className="dashboard-header">
        <div className="dashboard-greeting">
          <div className="greeting-top-row">
            <span className="greeting-salutation">Jai Hind,</span>
            <h1>{isAdmin ? getRoleLabel() : (user?.name || 'Cadet')}</h1>
          </div>
          <div className="greeting-motto">
            Unity and Discipline — एकता और अनुशासन
          </div>
          {isCadet && (
            <div className="dashboard-user-badges">
              {user?.rank && (
                <span className="dashboard-meta-pill">Rank: {user.rank}</span>
              )}
              {user?.regimentalNo && (
                <span className="dashboard-meta-pill">Regt: {user.regimentalNo}</span>
              )}
              {user?.year && (
                <span className="dashboard-meta-pill">{getYearLabel(user.year)}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Admin View ─────────────────────────────────────── */}
      {isAdmin && (
        <>
          <hr className="admin-section-divider" />

          {/* ── Section 1: Unit Operations & Governance Overview ─── */}
          <div className="admin-section-block">
            <h2 className="admin-section-heading">Unit Operations &amp; Governance Overview</h2>
            <div className="admin-overview-card">
              <div className="admin-overview-header">
                <div className="admin-overview-title-group">
                  <span className="admin-overview-tag">Unit Administration Console</span>
                  <h3 className="admin-overview-subtitle">Four Foundational Operational Pillars</h3>
                </div>
                <div className="admin-overview-battalion-badge">
                  <span className="battalion-label">Active Battalion Context:</span>
                  <span className="battalion-value">{conciseUnitName}</span>
                </div>
              </div>

              <p className="admin-overview-desc">
                Welcome to the official AUS-NCC Administrative Governance Console. You have administrative command across the 4 core service pillars below. All session openings, financial transactions, roster mutations, and Directorate submissions are strictly audited and tamper-evident.
              </p>

              <div className="admin-overview-pillars-summary">
                <div className="pillar-item">
                  <span className="pillar-number">01</span>
                  <div className="pillar-info">
                    <strong>Attendance Board</strong>
                    <p>Geofenced training sessions, live muster verification, cadet directory, refreshment allowance ledger @ ₹18, and NER sync.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <span className="pillar-number">02</span>
                  <div className="pillar-info">
                    <strong>Learning &amp; Academics</strong>
                    <p>NCC Common &amp; Specialised subjects, drill manuals, military history, and B/C Certificate question banks.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <span className="pillar-number">03</span>
                  <div className="pillar-info">
                    <strong>Events &amp; Camps</strong>
                    <p>Annual Training Camps (ATC / CATC), national camp nominations, unit social drives, and certifications.</p>
                  </div>
                </div>

                <div className="pillar-item">
                  <span className="pillar-number">04</span>
                  <div className="pillar-info">
                    <strong>Cadet Selection &amp; Intake</strong>
                    <p>Annual student induction trials, physical endurance scoring, written entrance tests, and merit lists.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="admin-section-divider" />

          {/* ── Section 2: Operational Snapshot & Metrics ─────────── */}
          <div className="admin-section-block">
            <h2 className="admin-section-heading">Operational Snapshot &amp; Metrics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <span className="stat-label">Active Battalion</span>
                  <span className="stat-value">{conciseUnitName}</span>
                </div>
              </div>

              <div className="stat-card stat-card-gold">
                <div className="stat-content">
                  <span className="stat-label">Cadets Enrolled</span>
                  <span className="stat-value">{activeUnit === '62AB' ? '62AB Roster' : '3AB Core Roster'}</span>
                </div>
              </div>

              <div className="stat-card stat-card-sky">
                <div className="stat-content">
                  <span className="stat-label">Parade Schedule</span>
                  <span className="stat-value">Wed &amp; Sat</span>
                </div>
              </div>

              <div className="stat-card stat-card-green">
                <div className="stat-content">
                  <span className="stat-label">Geofence Radius</span>
                  <span className="stat-value">100 Meters</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="admin-section-divider" />

          {/* ── Section 3: Available Administrative Services ──────── */}
          <div className="admin-section-block">
            <h2 className="admin-section-heading">Available Administrative Services</h2>
            <div className="cards-grid">
              <Link to="/dashboard/cadets" className="module-card">
                <div>
                  <div className="module-card-pill">Master Personnel Hub</div>
                  <h3 className="module-card-title">Central Cadet Directory</h3>
                  <p className="module-card-desc">
                    Single point of contact for cadet records. 3-slot CSV batch intake, master search &amp; filters, profile edits, and 1 April promotions.
                  </p>
                </div>
                <div className="module-card-footer">
                  <span>Open Cadet Directory</span>
                  <span>→</span>
                </div>
              </Link>

              <Link to="/dashboard/attendance" className="module-card">
                <div>
                  <div className="module-card-pill">Service 01</div>
                  <h3 className="module-card-title">Attendance Board</h3>
                  <p className="module-card-desc">
                    Live geofenced training sessions, muster roll marking, refreshment allowance ledger (@ ₹18), and NER sync.
                  </p>
                </div>
                <div className="module-card-footer">
                  <span>Open Attendance Board</span>
                  <span>→</span>
                </div>
              </Link>

              <Link to="/dashboard/learning" className="module-card">
                <div>
                  <div className="module-card-pill">Service 02</div>
                  <h3 className="module-card-title">Learning &amp; Academics</h3>
                  <p className="module-card-desc">
                    NCC Common &amp; Specialised syllabus, drill manuals, study materials, and B &amp; C Certificate question banks.
                  </p>
                </div>
                <div className="module-card-footer">
                  <span>Open Library</span>
                  <span>→</span>
                </div>
              </Link>

              <Link to="/dashboard/events" className="module-card">
                <div>
                  <div className="module-card-pill">Service 03</div>
                  <h3 className="module-card-title">Events &amp; Camps Management</h3>
                  <p className="module-card-desc">
                    Annual Training Camps (ATC / CATC), camp nominations, social service outreach, and unit blood donation drives.
                  </p>
                </div>
                <div className="module-card-footer">
                  <span>Manage Events</span>
                  <span>→</span>
                </div>
              </Link>

              <Link to="/dashboard/selection" className="module-card">
                <div>
                  <div className="module-card-pill">Service 04</div>
                  <h3 className="module-card-title">Cadet Selection &amp; Intake</h3>
                  <p className="module-card-desc">
                    Annual student induction trials, physical endurance scoring, entrance tests, and 1st-year enrollment merit lists.
                  </p>
                </div>
                <div className="module-card-footer">
                  <span>Intake Portal</span>
                  <span>→</span>
                </div>
              </Link>

              {(isLeadAdmin || isCTO) && (
                <Link to="/dashboard/settings" className="module-card">
                  <div>
                    <div className="module-card-pill">Unit Governance</div>
                    <h3 className="module-card-title">Unit Policy Settings</h3>
                    <p className="module-card-desc">
                      Configure minimum attendance threshold (75%), geofence distance (100m), window timing, and NER link.
                    </p>
                  </div>
                  <div className="module-card-footer">
                    <span>Unit Settings</span>
                    <span>→</span>
                  </div>
                </Link>
              )}

              {isLeadAdmin && (
                <Link to="/dashboard/users" className="module-card">
                  <div>
                    <div className="module-card-pill">System Administration</div>
                    <h3 className="module-card-title">Officer Accounts &amp; RBAC</h3>
                    <p className="module-card-desc">
                      Manage CTO accounts, battalion assignments, permissions, and institutional role-based access policies.
                    </p>
                  </div>
                  <div className="module-card-footer">
                    <span>Manage Accounts</span>
                    <span>→</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Cadet View ─────────────────────────────────────── */}
      {isCadet && (
        <div className="cadet-quick-actions">
          <h2 className="admin-section-heading">My NCC Services</h2>
          <div className="cards-grid">
            <Link to="/dashboard/attendance" className="module-card">
              <div>
                <h3 className="module-card-title">Mark Attendance</h3>
                <p className="module-card-desc">
                  Verify your GPS location and mark attendance during an active class session.
                </p>
              </div>
              <div className="module-card-footer">
                <span>Go to Attendance</span>
                <span>→</span>
              </div>
            </Link>

            <Link to="/dashboard/learning" className="module-card">
              <div>
                <h3 className="module-card-title">Study Materials &amp; Syllabus</h3>
                <p className="module-card-desc">
                  Access NCC Common and Specialised subjects, drill manuals, and question banks.
                </p>
              </div>
              <div className="module-card-footer">
                <span>Open Library</span>
                <span>→</span>
              </div>
            </Link>

            <Link to="/dashboard/events" className="module-card">
              <div>
                <h3 className="module-card-title">Camps &amp; Activities</h3>
                <p className="module-card-desc">
                  View upcoming ATC, CATC, and national camps. Track nomination status and schedules.
                </p>
              </div>
              <div className="module-card-footer">
                <span>View Camps</span>
                <span>→</span>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
