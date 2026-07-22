import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ParticleBackground from '../components/ParticleBackground';
import { useState } from 'react';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      {/* Full-screen animated interactive particles */}
      <ParticleBackground particleCount={80} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
