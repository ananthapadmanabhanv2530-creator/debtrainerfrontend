import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import ThemeToggle from '../../components/ThemeToggle';
import { User, Shield, Trash2, Palette } from 'lucide-react';
import GradualBlur from '../../components/reactbits/GradualBlur';

const Settings = () => {
  const { user, dbUser, logout } = useAuth();
  const { theme } = useTheme();
  const [name, setName] = useState(dbUser?.name || user?.displayName || '');

  const displayEmail = dbUser?.email || user?.email || '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account</p>
      </div>

      {/* Appearance Section */}
      <motion.div
        className="glass-card settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3>
          <Palette size={18} /> Appearance
        </h3>

        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 500 }}>Theme</div>
            <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>
              Currently using {theme === 'dark' ? 'dark' : 'light'} mode
            </div>
          </div>
          <ThemeToggle size="lg" />
        </div>
      </motion.div>

      {/* Profile Section */}
      <motion.div
        className="glass-card settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3>
          <User size={18} /> Profile
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
          <motion.div
            className="user-avatar"
            style={{ width: 64, height: 64, fontSize: 24 }}
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" />
            ) : (
              name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            )}
          </motion.div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 14, color: 'var(--fg-secondary)' }}>{displayEmail}</div>
          </div>
        </div>

        <div className="auth-form" style={{ maxWidth: 400 }}>
          <div className="input-group">
            <label>Display Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              className="input"
              value={displayEmail}
              disabled
              style={{ opacity: 0.6 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Account Section */}
      <motion.div
        className="glass-card settings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3>
          <Shield size={18} /> Account
        </h3>

        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 500 }}>Authentication Provider</div>
            <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>
              {user?.providerData?.[0]?.providerId === 'google.com'
                ? 'Google Account'
                : 'Email & Password'}
            </div>
          </div>
        </div>

        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 500 }}>Account Created</div>
            <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>
              {dbUser?.createdAt
                ? new Date(dbUser.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        className="glass-card settings-section"
        style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 style={{ color: 'var(--danger)' }}>
          <Trash2 size={18} /> Danger Zone
        </h3>

        <div className="settings-row">
          <div>
            <div style={{ fontWeight: 500 }}>Sign Out</div>
            <div style={{ fontSize: 13, color: 'var(--fg-tertiary)', marginTop: 2 }}>
              Sign out of your account on this device
            </div>
          </div>
          <motion.button
            className="btn btn-danger btn-sm"
            onClick={logout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Sign Out
          </motion.button>
        </div>
      </motion.div>

      <GradualBlur position="bottom" height="4rem" strength={2} divCount={5} curve="bezier" target="parent" />
    </motion.div>
  );
};

export default Settings;
