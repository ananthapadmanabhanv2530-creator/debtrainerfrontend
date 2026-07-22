import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import {
  LayoutDashboard,
  Swords,
  History,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/debate/new', label: 'New Debate', icon: Swords },
  { path: '/history', label: 'History', icon: History },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, dbUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const displayName = dbUser?.name || user?.displayName || 'User';
  const displayEmail = dbUser?.email || user?.email || '';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <img src="/debai.png" alt="DebateAI" style={{ width: 32, height: 32, objectFit: 'contain' }} />
        <span className="sidebar-title">DebateAI</span>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeToggle size="sm" />
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }
            onClick={onClose}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={displayName} />
            ) : (
              initials
            )}
          </div>
          <div className="user-details">
            <div className="user-name">{displayName}</div>
            <div className="user-email">{displayEmail}</div>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ marginTop: 8 }}>
          <LogOut />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
