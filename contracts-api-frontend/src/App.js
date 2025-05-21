import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Auctions from './pages/Auctions';
import Admin from './pages/Admin';

const App = () => {
  return (
    <div className="app">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-left">
            <Link to="/" className="logo">NFT Auctions</Link>
            <div className="nav-links">
              <Link to="/contract/auctions" className="nav-link">Auctions</Link>
              <Link to="/contract/admin" className="nav-link">Admin</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-container">
          <Routes>
            <Route path="/contract/auctions" element={<Auctions />} />
            <Route path="/contract/admin" element={<Admin />} />
            <Route path="/" element={<Auctions />} />
          </Routes>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="copyright">
            © 2024 NFT Auctions. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
