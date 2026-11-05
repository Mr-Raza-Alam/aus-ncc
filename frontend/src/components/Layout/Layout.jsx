import Navbar from '../Navbar/Navbar';
import Footer from '../Footer/Footer';
import './Layout.css';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout-main">
        <div className="container">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

