import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: '⊞', label: 'Dashboard' },
  { path: '/vehicles', icon: '🚛', label: 'Vehicle Registry' },
  { path: '/trips', icon: '🗺', label: 'Trip Dispatcher' },
  { path: '/maintenance', icon: '🔧', label: 'Maintenance Logs' },
  { path: '/fuel', icon: '⛽', label: 'Fuel & Expenses' },
  { path: '/drivers', icon: '👤', label: 'Driver Profiles' },
  { path: '/analytics', icon: '📊', label: 'Analytics & Reports' },
];

const ROLE_NAV = {
  'Fleet Manager':     [{ path: '/vehicles', icon: '🚛', label: 'Vehicle Registry' }, { path: '/maintenance', icon: '🔧', label: 'Maintenance Logs' }],
  'Dispatcher':        [{ path: '/trips', icon: '🗺', label: 'Trip Dispatcher' }, { path: '/drivers', icon: '👤', label: 'Driver Profiles' }],
  'Safety Officer':    [{ path: '/drivers', icon: '👤', label: 'Driver Profiles' }, { path: '/maintenance', icon: '🔧', label: 'Maintenance Logs' }],
  'Financial Analyst': [{ path: '/fuel', icon: '⛽', label: 'Fuel & Expenses' }, { path: '/analytics', icon: '📊', label: 'Analytics & Reports' }],
};

export default function Sidebar() {
  const { user, logout } = useAuth();

  const roleColor = {
    'Fleet Manager': '#3b82f6',
    'Dispatcher': '#10b981',
    'Safety Officer': '#f59e0b',
    'Financial Analyst': '#8b5cf6',
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🚚</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text-primary)' }}>FleetFlow</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Fleet Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
          Main Menu
        </div>
        {NAV_ITEMS.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 8,
              textDecoration: 'none',
              marginBottom: 2,
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent-blue)' : '3px solid transparent',
              transition: 'all 0.15s ease',
            })}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{icon}</span>
            {label}
          </NavLink>
        ))}

        {/* Role quick-access */}
        {ROLE_NAV[user?.role] && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', padding: '0 8px', margin: '14px 0 8px' }}>
              My Focus
            </div>
            {ROLE_NAV[user?.role].map(({ path, icon, label }) => (
              <NavLink key={path + '-role'} to={path} end={path === '/'}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                  borderRadius: 8, textDecoration: 'none', marginBottom: 2, fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? roleColor[user?.role] : 'var(--text-muted)',
                  background: isActive ? `${roleColor[user?.role]}18` : 'transparent',
                  borderLeft: isActive ? `3px solid ${roleColor[user?.role]}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                })}>
                <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{icon}</span>
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <NavLink to="/profile" style={({ isActive }) => ({
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          textDecoration: 'none', padding: '6px 8px', borderRadius: 8,
          background: isActive ? 'rgba(59,130,246,0.1)' : 'transparent',
          border: isActive ? '1px solid rgba(59,130,246,0.2)' : '1px solid transparent',
          transition: 'all 0.15s',
        })}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: roleColor[user?.role] || '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚙</span>
        </NavLink>
        <button
          onClick={logout}
          style={{
            width: '100%', padding: '7px', borderRadius: 6, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(239,68,68,0.1)'; e.target.style.color = '#ef4444'; e.target.style.borderColor = 'rgba(239,68,68,0.3)'; }}
          onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text-muted)'; e.target.style.borderColor = 'var(--border)'; }}
        >
          ⎋ Sign Out
        </button>
      </div>
    </aside>
  );
}
