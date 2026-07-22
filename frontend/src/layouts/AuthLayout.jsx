import { Outlet } from 'react-router-dom';
import ParticleBackground from '../components/ParticleBackground';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      {/* Left decorative panel */}
      <div className="auth-layout-left">
        <div className="auth-layout-left-content">
          <div className="brand-icon">⚡</div>
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
        <ParticleBackground particleCount={30} />
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
