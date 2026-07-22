import { Outlet } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <ParticleBackground particleCount={80} />
      
      {/* Left decorative panel */}
      <div className="auth-layout-left">
        <div className="auth-layout-left-content">
          <img src="/hero-logo.png" alt="DebateAI Hero Logo" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 16 }} />
          <h1>DebateAI</h1>
          <p>
            Master the art of argumentation with AI-powered debate training.
            Get real-time feedback, track your growth, and sharpen your
            rhetorical skills.
          </p>
          <ul className="feature-list">
            <li>
              <span className="feature-dot" />
              AI opponents that adapt to your skill level
            </li>
            <li>
              <span className="feature-dot" />
              Detailed scoring across 5 dimensions
            </li>
            <li>
              <span className="feature-dot" />
              Progress analytics and performance trends
            </li>
            <li>
              <span className="feature-dot" />
              Topics across technology, politics, science & more
            </li>
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-layout-right">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
