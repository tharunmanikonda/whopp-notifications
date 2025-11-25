import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={styles.nav}>
      <div style={styles.brand} onClick={() => navigate('/dashboard')}>
        <span style={styles.logo}>⚡</span>
        <span style={styles.brandText}>Health AI</span>
      </div>

      <div style={styles.links}>
        <button
          style={{
            ...styles.navLink,
            ...(isActive('/dashboard') ? styles.activeLink : {}),
          }}
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </button>
        <button
          style={{
            ...styles.navLink,
            ...(isActive('/devices') ? styles.activeLink : {}),
          }}
          onClick={() => navigate('/devices')}
        >
          Connected Devices
        </button>
      </div>

      <div style={styles.userSection}>
        {user && <span style={styles.userName}>{user.full_name}</span>}
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#1e293b',
    borderBottom: '1px solid #334155',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  logo: {
    fontSize: '24px',
  },
  brandText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  links: {
    display: 'flex',
    gap: '8px',
  },
  navLink: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeLink: {
    backgroundColor: '#334155',
    color: '#f8fafc',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userName: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
