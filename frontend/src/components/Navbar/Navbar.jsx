import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/auth/AuthContext';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, isAdmin, isLeadAdmin, isCTO, activeUnit, setActiveUnit } = useAuth();
  const [serviceDrawerOpen, setServiceDrawerOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [ausLogoError, setAusLogoError] = useState(false);
  const [nccLogoError, setNccLogoError] = useState(false);

  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setServiceDrawerOpen(false);
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, []);

  const closeAllMenus = () => {
    setServiceDrawerOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleLogout = () => {
    closeAllMenus();
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Official Role Label — Admins & CTOs hold appointments, NOT cadet ranks!
  const getRoleLabel = () => {
    if (user?.roles?.includes('lead_admin')) return 'Lead Administrator';
    if (user?.roles?.includes('cto')) return 'Care Taker Officer (CTO)';
    if (user?.roles?.includes('assistant')) return 'Assistant In-charge';
    if (user?.roles?.includes('ncc-cdt')) return user?.rank || 'Cadet';
    return 'Cadet';
  };

  // Concise Battalion Name based on active unit / user unit
  const currentUnitCode = isAdmin ? activeUnit : user?.unit || '3AB';
  const getConciseUnitName = () => {
    if (currentUnitCode === '62AB') return '62 Assam Girls Bn NCC';
    return '3 Assam Bn NCC';
  };

  const getUnitWingTag = () => {
    if (currentUnitCode === '62AB') return 'Senior Wing (SW) • Silchar Group';
    return 'Senior Division (SD) • Silchar Group';
  };

  return (
    <>
      <header className="institutional-header-wrapper">
        {/* ── Tier 1: Reusable Institutional Topbar ────────────────── */}
        <div className="inst-topbar">
          <div className="container inst-topbar-inner">
            {/* Left: Assam University Logo + Official Title */}
            <Link to={user ? '/dashboard' : '/'} className="inst-brand-link" onClick={closeAllMenus}>
              {!ausLogoError && (
                <img
                  src="/logos/aus_logo.jpg"
                  alt="Assam University Crest"
                  className="inst-logo-img"
                  onError={() => setAusLogoError(true)}
                />
              )}
              <div className="inst-brand-text">
                <span className="inst-title-main">AUS-NCC Portal</span>
                <span className="inst-title-sub">Assam University Silchar</span>
              </div>
            </Link>

            {/* Right: NCC Crest + Concise Battalion Name (3px apart, no SD) */}
            <div className="inst-topbar-right">
              {!nccLogoError && (
                <img
                  src="/logos/Ncc_Logo.jpg"
                  alt="NCC Official Crest"
                  className="inst-logo-img ncc-crest-img"
                  onError={() => setNccLogoError(true)}
                />
              )}
              <span className="inst-unit-name">{getConciseUnitName()}</span>
            </div>
          </div>
        </div>

        {/* ── Tier 2: Administrative Control Sub-Bar ───────────────── */}
        {user && (
          <nav className="admin-subbar" aria-label="Administrative Navigation Bar">
            <div className="container admin-subbar-inner">
              {/* Left: Hamburger Service Menu Trigger + Dashboard Title */}
              <div className="subbar-left">
                {isAdmin ? (
                  <div className="subbar-left-group">
                    <button
                      type="button"
                      className={`subbar-service-btn ${serviceDrawerOpen ? 'active' : ''}`}
                      onClick={() => setServiceDrawerOpen((prev) => !prev)}
                      aria-label="Open Operational Services Menu"
                      title="Open Unit Operations &amp; Management Services"
                    >
                      <span className="subbar-hamburger-icon" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                      <span className="subbar-btn-text">Services Menu</span>
                    </button>
                    <span className="subbar-divider" aria-hidden="true">|</span>
                    <span className="subbar-title-text">Administrative Dashboard</span>
                  </div>
                ) : (
                  <div className="subbar-left-group">
                    <span className="subbar-title-text">Cadet Dashboard</span>
                    <span className="subbar-divider" aria-hidden="true">•</span>
                    <span className="subbar-cadet-rank">{user?.rank || 'Cadet'}</span>
                  </div>
                )}
              </div>

              {/* Right: User Profile Icon & Dropdown Trigger */}
              <div className="subbar-right" ref={profileRef}>
                <button
                  type="button"
                  className={`subbar-profile-trigger ${profileDropdownOpen ? 'active' : ''}`}
                  onClick={() => setProfileDropdownOpen((prev) => !prev)}
                  aria-label="Officer Profile &amp; Account Settings"
                  aria-expanded={profileDropdownOpen}
                >
                  <div className="subbar-avatar-circle">
                    {getInitials(user?.name)}
                  </div>
                  <div className="subbar-profile-meta">
                    <span className="subbar-profile-name">{user?.name || 'Officer'}</span>
                    <span className="subbar-profile-designation">
                      {user?.designation || getRoleLabel()}
                    </span>
                  </div>
                  <span className="subbar-chevron" aria-hidden="true">▾</span>
                </button>

                {/* Officer Profile Dropdown Card */}
                {profileDropdownOpen && (
                  <div className="profile-dropdown-card">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar">
                        {getInitials(user?.name)}
                      </div>
                      <div className="dropdown-user-details">
                        <div className="dropdown-name">{user?.name}</div>
                        <div className="dropdown-designation">
                          {user?.designation || getRoleLabel()}
                        </div>
                        <div className="dropdown-submeta">
                          {getConciseUnitName()}
                          {user?.regimentalNo && ` • ${user.regimentalNo}`}
                        </div>
                      </div>
                    </div>

                    <div className="dropdown-links-list">
                      <Link
                        to="/dashboard"
                        className="dropdown-item"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <span className="dropdown-item-icon">🏠</span>
                        <span>Dashboard Home</span>
                      </Link>
                      <Link
                        to="/change-password"
                        className="dropdown-item"
                        onClick={() => setProfileDropdownOpen(false)}
                      >
                        <span className="dropdown-item-icon">🔑</span>
                        <span>Change Password</span>
                      </Link>
                      <button
                        type="button"
                        className="dropdown-item dropdown-logout-btn"
                        onClick={handleLogout}
                      >
                        <span className="dropdown-item-icon">🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* ── Left Slide-Over Drawer: Operational Services ─────────── */}
      {isAdmin && (
        <>
          <div
            className={`service-drawer-overlay ${serviceDrawerOpen ? 'open' : ''}`}
            onClick={() => setServiceDrawerOpen(false)}
            aria-hidden="true"
          />

          <aside
            className={`service-drawer ${serviceDrawerOpen ? 'open' : ''}`}
            aria-label="Operational Services Drawer"
          >
            <div className="drawer-header">
              <div className="drawer-header-title">
                <h2>Operational Services</h2>
                <span className="drawer-unit-badge">{getConciseUnitName()}</span>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setServiceDrawerOpen(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="drawer-content">
              {/* Master Personnel Hub: Central Cadet Directory */}
              <div className="drawer-service-group">
                <div className="service-group-heading">
                  <span className="group-num">★</span>
                  <span>Personnel Hub</span>
                </div>
                <div className="service-sublinks">
                  <NavLink
                    to="/dashboard/cadets"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Central Cadet Directory (Master Records)
                  </NavLink>
                  <NavLink
                    to="/dashboard/cadets?tab=upload"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    3-Slot CSV Batch Intake
                  </NavLink>
                  {(isLeadAdmin || isCTO) && (
                    <NavLink
                      to="/dashboard/cadets?tab=promote"
                      className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                      onClick={closeAllMenus}
                    >
                      1 April Annual Cadet Promotion
                    </NavLink>
                  )}
                </div>
              </div>

              {/* Service Pillar 01: Attendance Board */}
              <div className="drawer-service-group">
                <div className="service-group-heading">
                  <span className="group-num">01</span>
                  <span>Attendance Board</span>
                </div>
                <div className="service-sublinks">
                  <NavLink
                    to="/dashboard/attendance"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Attendance Board Dashboard
                  </NavLink>
                  <NavLink
                    to="/dashboard/attendance/session"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Live Training Sessions &amp; Geo-marking
                  </NavLink>
                  <NavLink
                    to="/dashboard/attendance/roster"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Cadet Roster Board
                  </NavLink>
                  <NavLink
                    to="/dashboard/refreshment"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Refreshment Distribution &amp; Accounts
                  </NavLink>
                  <NavLink
                    to="/dashboard/reports"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Drill % Reports &amp; NER Sync
                  </NavLink>
                  {(isLeadAdmin || isCTO) && (
                    <>
                      <NavLink
                        to="/dashboard/settings"
                        className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                        onClick={closeAllMenus}
                      >
                        Unit Policy &amp; Geofence Settings
                      </NavLink>
                      <NavLink
                        to="/dashboard/attendance/audit"
                        className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                        onClick={closeAllMenus}
                      >
                        Training Session Audit Ledger
                      </NavLink>
                    </>
                  )}
                </div>
              </div>

              {/* Service Pillar 02: Learning & Training */}
              <div className="drawer-service-group">
                <div className="service-group-heading">
                  <span className="group-num">02</span>
                  <span>Learning &amp; Training</span>
                </div>
                <div className="service-sublinks">
                  <NavLink
                    to="/dashboard/learning"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Syllabus, Command Manuals &amp; Notes
                  </NavLink>
                  <NavLink
                    to="/dashboard/learning"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    B &amp; C Certificate Question Banks
                  </NavLink>
                </div>
              </div>

              {/* Service Pillar 03: Events & Camps */}
              <div className="drawer-service-group">
                <div className="service-group-heading">
                  <span className="group-num">03</span>
                  <span>Events &amp; Camps</span>
                </div>
                <div className="service-sublinks">
                  <NavLink
                    to="/dashboard/events"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Annual Training Camps (ATC / CATC)
                  </NavLink>
                  <NavLink
                    to="/dashboard/events"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    Social Outreach &amp; Unit Drives
                  </NavLink>
                </div>
              </div>

              {/* Service Pillar 04: Selection Portal */}
              <div className="drawer-service-group">
                <div className="service-group-heading">
                  <span className="group-num">04</span>
                  <span>Selection Portal</span>
                </div>
                <div className="service-sublinks">
                  <NavLink
                    to="/dashboard/selection"
                    className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                    onClick={closeAllMenus}
                  >
                    New Intake Enrolment &amp; Merit List
                  </NavLink>
                </div>
              </div>

              {/* System & Access Administration */}
              {isLeadAdmin && (
                <div className="drawer-service-group">
                  <div className="service-group-heading">
                    <span className="group-num">★</span>
                    <span>System Administration</span>
                  </div>
                  <div className="service-sublinks">
                    <NavLink
                      to="/dashboard/users"
                      className={({ isActive }) => `drawer-sublink ${isActive ? 'active' : ''}`}
                      onClick={closeAllMenus}
                    >
                      Officer Accounts &amp; RBAC Control
                    </NavLink>
                  </div>
                </div>
              )}
            </div>

            <div className="drawer-footer">
              <span>Assam University Silchar • {getConciseUnitName()}</span>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
