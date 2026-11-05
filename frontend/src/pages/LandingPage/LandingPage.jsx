import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/Footer/Footer';
import './LandingPage.css';

const GLIMPSE_ITEMS = [
  {
    id: 1,
    file: '/glimpses/ncc_pic1.jpeg',
    title: 'Weekly Parade & Drill Inspection',
    category: 'Parade Training',
  },
  {
    id: 2,
    file: '/glimpses/ncc_pic2.jpeg',
    title: 'Weapon Training & Firing Practice',
    category: 'Arms Training',
  },
  {
    id: 3,
    file: '/glimpses/ncc_pic3.jpeg',
    title: 'Annual Training Camp (ATC)',
    category: 'Field Camp',
  },
  {
    id: 4,
    file: '/glimpses/ncc_pic4.jpeg',
    title: 'Ceremonial Guard & Saluting',
    category: 'Ceremonial Parade',
  },
  {
    id: 5,
    file: '/glimpses/ncc_pic7.jpeg',
    title: 'Social Service & Tree Plantation',
    category: 'Community Service',
  },
  {
    id: 6,
    file: '/glimpses/ncc_pic9.jpeg',
    title: 'Voluntary Blood Donation Drive',
    category: 'Unit Outreach',
  },
  {
    id: 7,
    file: '/glimpses/ncc_pic10.jpeg',
    title: 'Map Reading & Compass Traversal',
    category: 'Military Subject',
  },
  {
    id: 8,
    file: '/glimpses/ncc_pic11.jpeg',
    title: 'Senior Cadets Leadership Council',
    category: 'Cadet Leadership',
  },
  {
    id: 9,
    file: '/glimpses/ncc_pic12.jpeg',
    title: 'Unit Assembly with Officers & Cadets',
    category: 'Unit Roll-call',
  },
];

const PARADE_TIMETABLE = [
  {
    time: '06:00 AM - 06:45 AM',
    activity: 'Fall-in, Morning PT & Geofenced Attendance',
    focus: 'Physical fitness, attendance verification via digital geo-tagging and parade muster.',
    dress: 'PT Rig / Unit Tracksuit',
  },
  {
    time: '06:45 AM - 08:15 AM',
    activity: 'Squad Drill & Ceremonial Arms Practice',
    focus: 'Foot drill, march past, salute with weapons, synchronization and command delivery.',
    dress: 'Khaki Drill Uniform (Beret, Hackle, Belt, DMS Boots)',
  },
  {
    time: '08:15 AM - 09:00 AM',
    activity: 'Military Subject Instruction / Theory',
    focus: 'Map Reading, Field Craft/Battle Craft, Weapon Training theory, Military History.',
    dress: 'Khaki Drill Uniform',
  },
  {
    time: '09:00 AM - 09:30 AM',
    activity: 'Refreshment Distribution & Accounts Ledger',
    focus: 'Nutritious refreshment serving verified against parade roll with ledger entry.',
    dress: 'Uniform',
  },
  {
    time: '09:30 AM - 10:00 AM',
    activity: 'Debriefing, Camp Announcements & Fall-Out',
    focus: 'CTO address, upcoming camp nominations (CATC, ATC, RDC), final inspection & dismissal.',
    dress: 'Uniform',
  },
];

const RECENT_NOTICES = [
  {
    id: 1,
    date: '28 Oct 2026',
    title: 'Enrolment for Training Year 2026-27 (SD: 3 Assam Bn & SW: 62 Assam Bn)',
    summary: 'Verification of nominal rolls for newly enrolled Senior Division and Senior Wing cadets. All cadets must complete digital onboarding.',
    badge: 'Enrolment',
  },
  {
    id: 2,
    date: '22 Oct 2026',
    title: 'Mandatory 75% Parade Attendance for B & C Certificate Exams',
    summary: 'Cadets with attendance below 75% will not be eligible to appear in the Directorate B & C Certificate Examination for the upcoming cycle.',
    badge: 'Attendance',
  },
  {
    id: 3,
    date: '15 Oct 2026',
    title: 'Combined Annual Training Camp (CATC) - Nomination & Medical Forms',
    summary: 'Selected cadets must submit filled Appendix-A medical fitness certificates and parent consent forms at the AUS NCC Unit Room.',
    badge: 'Camp Notice',
  },
];

function GlimpseCard({ item }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="glimpse-item-card">
      {!imgError ? (
        <>
          <img
            src={item.file}
            alt={item.title}
            className="glimpse-img"
            onError={() => setImgError(true)}
          />
          <div className="glimpse-caption-overlay">
            <span className="glimpse-caption-tag">{item.category}</span>
            <span className="glimpse-caption-title">{item.title}</span>
          </div>
        </>
      ) : (
        <div className="glimpse-fallback-placeholder">
          <div className="glimpse-ph-title">{item.title}</div>
          <div className="glimpse-ph-category">{item.category}</div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const vacPortalUrl = import.meta.env.VITE_VAC_PORTAL_URL || 'https://vac-portal.aus.ac.in';
  const [selectedUnit, setSelectedUnit] = useState('ALL');
  const [ausLogoError, setAusLogoError] = useState(false);
  const [nccLogoError, setNccLogoError] = useState(false);

  return (
    <div className="landing-page">
      {/* ── Top Header / Institutional Branding with Logos ── */}
      <header className="landing-topbar">
        <div className="container landing-topbar-inner">
          <div className="landing-logos-brand">
            {!ausLogoError && (
              <img
                src="/logos/aus_logo.jpg"
                alt="Assam University Logo"
                className="topbar-logo-img"
                onError={() => setAusLogoError(true)}
              />
            )}
            <div className="landing-topbar-title">
              <span className="landing-title-main">AUS-NCC Portal</span>
              <span className="landing-title-sub">Assam University Silchar</span>
            </div>
          </div>

          <div className="landing-topbar-right">
            {!nccLogoError && (
              <img
                src="/logos/Ncc_Logo.jpg"
                alt="NCC Official Logo"
                className="topbar-logo-img"
                onError={() => setNccLogoError(true)}
              />
            )}
            <div className="landing-topbar-unit-tag">
              <span className="landing-unit-main-text">3 &amp; 62 Assam Bn NCC</span>
              <span className="landing-unit-sub-text">Silchar Group HQ • NER Directorate</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Institutional Horizontal Sub-Nav Bar ──────────── */}
      <nav className="landing-subnav" aria-label="Portal Navigation Bar">
        <div className="container landing-subnav-inner">
          <div className="subnav-links-left">
            <a href="#about" className="subnav-link">About AUS-NCC</a>
            <a href="#timetable" className="subnav-link">Parade Timetable</a>
            <a href="#notices" className="subnav-link">Notices &amp; Orders</a>
            <a href="#glimpses" className="subnav-link">Photo Glimpses</a>
            <a href="#contact" className="subnav-link">Contact &amp; Unit Room</a>
          </div>

          <div className="subnav-links-right">
            <a
              href={vacPortalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="subnav-link subnav-vac-link"
              title="External Link to 6-Month Value Added Course Portal"
            >
              VAC Portal ↗
            </a>
            <Link
              to="/login/select-unit"
              className="subnav-login-btn"
            >
              Cadet / Officer Login →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Elevated Hero Card Container (Mirrors VAC Portal) ─── */}
      <section className="landing-hero-container">
        <div className="container">
          <div className="hero-feature-card">
            <h1>National Cadet Corps (NCC)</h1>
            <div className="hero-year-badge">2026-2027</div>
            <div className="hero-subtitle">
              {selectedUnit === '62AB'
                ? 'Assam University Silchar • 62 Assam Girls Bn NCC (Senior Wing)'
                : selectedUnit === '3AB'
                ? 'Assam University Silchar • 3 Assam Bn NCC (Senior Division)'
                : 'Assam University Silchar • 3 & 62 Assam Bn NCC'}
            </div>
            <p className="hero-description">
              {selectedUnit === '62AB' ? (
                <>
                  Official digital training and parade management portal for the{' '}
                  <strong>62 Assam Girls Bn NCC (Senior Wing)</strong> at Assam University Silchar.
                  Empowering women cadets with verified attendance, drill records, camp nominations, and unit orders.
                </>
              ) : selectedUnit === '3AB' ? (
                <>
                  Official digital training and operational management portal for the{' '}
                  <strong>3 Assam Bn NCC (Senior Division)</strong> at Assam University Silchar.
                  Access verified parade attendance, refreshment accounting, training records, and unit orders.
                </>
              ) : (
                <>
                  Welcome to the official digital training and operational management portal for the
                  National Cadet Corps (NCC) at Assam University Silchar, operating under{' '}
                  <strong>3 Assam Bn NCC (Senior Division)</strong> and{' '}
                  <strong>62 Assam Girls Bn NCC (Senior Wing)</strong>. Access verified parade attendance,
                  refreshment accounting, training records, and unit orders.
                </>
              )}
            </p>

            <div className="hero-buttons-stack">
              <Link
                to="/login/select-unit"
                className="hero-btn hero-btn-cadet"
              >
                CADET PORTAL LOGIN →
              </Link>
              <Link
                to="/login/select-unit"
                className="hero-btn hero-btn-admin"
              >
                ADMIN / OFFICER LOGIN →
              </Link>
              <div className="hero-vac-link">
                Enrolled in Value Added Course?{' '}
                <a href={vacPortalUrl} target="_blank" rel="noopener noreferrer">
                  Access VAC NCC Portal ↗
                </a>
              </div>
            </div>
          </div>

          <div className="section-divider" />
        </div>
      </section>

      {/* ── Section 1: About AUS-NCC ───────────────────────── */}
      <section id="about" className="landing-section landing-about-section">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-pre-title">NATIONAL CADET CORPS • ASSAM UNIVERSITY</span>
            <h2>About 3 &amp; 62 Assam Bn NCC</h2>
            <div className="section-header-underline" />
            <p className="section-header-desc">
              Building character, discipline, secular outlook, and ideals of selfless service among
              the youth of Assam University under the motto <em>&ldquo;Unity and Discipline&rdquo; (एकता और अनुशासन)</em>.
            </p>
          </div>

          <div className="about-cards-grid">
            <div className="about-card">
              <div className="about-card-tag">Senior Division (SD)</div>
              <h3>3 Assam Battalion NCC</h3>
              <p>
                Headquartered in Silchar, 3 Assam Bn NCC oversees the Army Wing Senior Division (SD)
                cadets of Assam University. Cadets undergo rigorous squad drill, arms training with
                standard service rifles, map reading, obstacle courses, and community service drives.
              </p>
              <div className="about-card-meta">
                <span>Group: Silchar Group HQ</span>
                <span>Affiliation: Indian Army</span>
              </div>
            </div>

            <div className="about-card">
              <div className="about-card-tag">Senior Wing (SW)</div>
              <h3>62 Assam Girls Battalion NCC</h3>
              <p>
                Headquartered in Silchar, 62 Assam Girls Bn NCC empowers women cadets of Assam
                University. Training emphasizes drill precision, self-defence, firing competence,
                disaster management, and participation in prestigious national camps like RDC and TSC.
              </p>
              <div className="about-card-meta">
                <span>Group: Silchar Group HQ</span>
                <span>Contingent: Senior Wing</span>
              </div>
            </div>

            <div className="about-card">
              <div className="about-card-tag">Leadership &amp; Governance</div>
              <h3>Caretaker Officers &amp; Administration</h3>
              <p>
                The AUS-NCC unit functions under designated Caretaker Officers (CTO / ANO) appointed
                by the Vice-Chancellor in liaison with the Commanding Officers of 3 &amp; 62 Assam Bn.
                All parade activities, refreshments, and camp quotas are officially administered.
              </p>
              <div className="about-card-meta">
                <span>Direct: Silchar Group HQ</span>
                <span>Directorate: NER Directorate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Weekly Parade Timetable ─────────────── */}
      <section id="timetable" className="landing-section landing-timetable-section">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-pre-title">REGULAR TRAINING SCHEDULE</span>
            <h2>Weekly Parade Timetable</h2>
            <div className="section-header-underline" />
            <p className="section-header-desc">
              Parades are conducted every Sunday morning at the Assam University Sports Complex /
              Main Parade Ground. Cadets must report in designated dress order on time.
            </p>
          </div>

          <div className="timetable-container">
            <div className="timetable-meta-bar">
              <div><strong>Parade Day:</strong> Every Sunday</div>
              <div><strong>Reporting Time:</strong> 06:00 AM Sharp</div>
              <div><strong>Location:</strong> Sports Complex / Main Parade Ground</div>
              <div><strong>Minimum Attendance Required:</strong> 75% for B/C Exams</div>
            </div>

            <div className="table-responsive">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th>Timing</th>
                    <th>Activity &amp; Drill Order</th>
                    <th>Training Focus</th>
                    <th>Dress Order</th>
                  </tr>
                </thead>
                <tbody>
                  {PARADE_TIMETABLE.map((row, idx) => (
                    <tr key={idx}>
                      <td className="timetable-time-cell">{row.time}</td>
                      <td><strong>{row.activity}</strong></td>
                      <td className="timetable-focus-cell">{row.focus}</td>
                      <td><span className="timetable-dress-pill">{row.dress}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Notices & Unit Orders ───────────────── */}
      <section id="notices" className="landing-section landing-notices-section">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-pre-title">OFFICIAL BULLETIN</span>
            <h2>Notices &amp; Unit Orders</h2>
            <div className="section-header-underline" />
            <p className="section-header-desc">
              Official circulars and announcements from 3 &amp; 62 Assam Bn NCC and the Caretaker Officers.
            </p>
          </div>

          <div className="notices-grid">
            {RECENT_NOTICES.map((n) => (
              <div key={n.id} className="notice-card">
                <div className="notice-card-top">
                  <span className="notice-badge">{n.badge}</span>
                  <span className="notice-date">{n.date}</span>
                </div>
                <h3 className="notice-title">{n.title}</h3>
                <p className="notice-summary">{n.summary}</p>
                <div className="notice-footer">
                  <span className="notice-auth">Issued by: Caretaker Officer / AUS-NCC</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: 3x3 NCC Glimpses Photo Grid ─────────── */}
      <section id="glimpses" className="landing-section landing-glimpses">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-pre-title">PHOTO ARCHIVE</span>
            <h2>Glimpses of NCC Assam University</h2>
            <div className="section-header-underline" />
            <p className="section-header-desc">
              Moments of discipline, camaraderie, weapon training, and national service by our cadets.
            </p>
          </div>

          <div className="glimpses-grid-3x3">
            {GLIMPSE_ITEMS.map((item) => (
              <GlimpseCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: Contact & Unit Room ─────────────────── */}
      <section id="contact" className="landing-section landing-contact-section">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-pre-title">COMMUNICATION &amp; OFFICE</span>
            <h2>Unit Room &amp; Contact</h2>
            <div className="section-header-underline" />
          </div>

          <div className="contact-card-container">
            <div className="contact-detail-box">
              <h3>NCC Unit Room (Assam University)</h3>
              <p>
                Sports Complex / Administrative Annex, Assam University<br />
                Dargakona, Silchar, Cachar, Assam &ndash; 788011
              </p>
              <div className="contact-item">
                <strong>Battalion Affiliations:</strong> 3 Assam Bn NCC (SD) &amp; 62 Assam Girls Bn NCC (SW)
              </div>
              <div className="contact-item">
                <strong>Group Headquarters:</strong> Silchar Group HQ, National Cadet Corps
              </div>
              <div className="contact-item">
                <strong>Directorate:</strong> North Eastern Region (NER) Directorate, Shillong
              </div>
              <div className="contact-item">
                <strong>Email:</strong> <code>ausncc@aus.ac.in</code>
              </div>
            </div>

            <div className="contact-detail-box">
              <h3>Cadet Assistance &amp; Enquiries</h3>
              <p>
                For questions regarding drill attendance discrepancies, camp selection lists,
                or portal login credentials:
              </p>
              <ul className="contact-list">
                <li>• Approach the Senior Under Officer (SUO) or Caretaker Officer during Sunday parade debrief.</li>
                <li>• Visit the NCC Unit Room on working days (14:00 &ndash; 16:30 hrs).</li>
                <li>• For forgotten passwords, use the portal&apos;s <strong>Forgot Password</strong> option with your Regimental No. and Date of Birth.</li>
              </ul>
              <div style={{ marginTop: '16px' }}>
                <Link to="/login/select-unit" className="btn btn-primary" style={{ display: 'inline-block' }}>
                  Proceed to Portal Sign-In →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
