import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SelectUnitPage.css';

export default function SelectUnitPage() {
  const [ausLogoError, setAusLogoError] = useState(false);
  const [nccLogoError, setNccLogoError] = useState(false);
  const navigate = useNavigate();

  const handleSelectUnit = (unitCode) => {
    navigate(`/login?unit=${unitCode}`);
  };

  return (
    <div className="select-unit-page">
      {/* ── Institutional Header ───────────────────────────── */}
      <header className="select-unit-topbar">
        <div className="container select-unit-topbar-inner">
          <Link to="/" className="select-brand-link">
            {!ausLogoError && (
              <img
                src="/logos/aus_logo.jpg"
                alt="Assam University Crest"
                className="select-logo-img"
                onError={() => setAusLogoError(true)}
              />
            )}
            <div className="select-brand-text">
              <span className="select-title-main">AUS-NCC Portal</span>
              <span className="select-title-sub">Assam University Silchar</span>
            </div>
          </Link>

          {!nccLogoError && (
            <img
              src="/logos/Ncc_Logo.jpg"
              alt="NCC Official Crest"
              className="select-logo-img"
              onError={() => setNccLogoError(true)}
            />
          )}
        </div>
      </header>

      {/* ── Gateway Body ───────────────────────────────────── */}
      <main className="select-unit-main container">
        <div className="select-unit-header-card">
          <span className="select-badge">Department Authentication Gateway</span>
          <h1>Select Your Battalion</h1>
          <p className="select-subtitle">
            Choose your assigned NCC battalion to proceed to the Cadet and Officer login portal.
          </p>
        </div>

        <div className="battalion-gateway-grid">
          {/* ── Card 1: 3 Assam Bn NCC ─────────────────────── */}
          <div className="battalion-card" onClick={() => handleSelectUnit('3AB')}>
            <div className="battalion-card-header">
              <span className="battalion-code-badge">Unit Code: 3AB</span>
              <span className="battalion-wing-pill pill-mixed">SD &amp; SW Co-ed</span>
            </div>

            <div className="battalion-card-body">
              <div className="battalion-icon-wrap">
                <span className="battalion-card-num">01</span>
              </div>
              <h2>3 Assam Bn NCC</h2>
              <p className="battalion-designation">
                Senior Division (Boys) &amp; Senior Wing (Girls)
              </p>
              <p className="battalion-desc">
                Catering to all enrolled undergraduate and postgraduate students of Assam University Silchar across Army Wing SD (Boys) and SW (Girls).
              </p>
            </div>

            <div className="battalion-card-footer">
              <button
                type="button"
                className="btn btn-primary btn-portal-enter"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectUnit('3AB');
                }}
              >
                Enter 3 Assam Bn Portal →
              </button>
            </div>
          </div>

          {/* ── Card 2: 62 Assam Girls Bn NCC ──────────────── */}
          <div className="battalion-card" onClick={() => handleSelectUnit('62AB')}>
            <div className="battalion-card-header">
              <span className="battalion-code-badge">Unit Code: 62AB</span>
              <span className="battalion-wing-pill pill-sw">SW Only (Girls)</span>
            </div>

            <div className="battalion-card-body">
              <div className="battalion-icon-wrap">
                <span className="battalion-card-num">02</span>
              </div>
              <h2>62 Assam Girls Bn NCC</h2>
              <p className="battalion-designation">
                Senior Wing (Women Cadets Exclusively)
              </p>
              <p className="battalion-desc">
                Specialised dedicated women&apos;s wing battalion empowering female cadets of Assam University Silchar under Silchar Group HQ.
              </p>
            </div>

            <div className="battalion-card-footer">
              <button
                type="button"
                className="btn btn-primary btn-portal-enter"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectUnit('62AB');
                }}
              >
                Enter 62 Assam Girls Bn Portal →
              </button>
            </div>
          </div>
        </div>

        <div className="select-unit-footer-actions">
          <Link to="/" className="back-to-home-link">
            ← Return to Main Portal (AUS-NCC Home)
          </Link>
        </div>
      </main>
    </div>
  );
}

