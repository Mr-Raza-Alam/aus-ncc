import './Footer.css';

export default function Footer() {
  return (
    <footer className="portal-footer">
      <div className="container portal-footer-inner">
        <div className="footer-affiliations">
          <span>Assam University Silchar</span>
          <span>•</span>
          <span>3 Assam Bn NCC</span>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} National Cadet Corps Department, Assam University. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

