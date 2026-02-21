import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PAGE_TITLES = {
  '/': { title: 'Command Center', subtitle: 'Fleet overview & real-time KPIs' },
  '/vehicles': { title: 'Vehicle Registry', subtitle: 'Asset management & lifecycle tracking' },
  '/trips': { title: 'Trip Dispatcher', subtitle: 'Create, assign and manage deliveries' },
  '/maintenance': { title: 'Maintenance & Service Logs', subtitle: 'Preventative and reactive vehicle health tracking' },
  '/fuel': { title: 'Fuel & Expense Logging', subtitle: 'Financial tracking per asset' },
  '/drivers': { title: 'Driver Performance & Safety Profiles', subtitle: 'Compliance, scores and duty management' },
  '/analytics': { title: 'Analytics & Financial Reports', subtitle: 'Data-driven insights and ROI reporting' },
  '/profile': { title: 'My Profile', subtitle: 'Account settings & role-based dashboard' },
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const page = PAGE_TITLES[pathname] || { title: 'FleetFlow', subtitle: '' };
  const now = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const [isDark, setIsDark] = useState(() => !document.body.classList.contains('light'));

  useEffect(() => {
    const saved = localStorage.getItem('fleetflow_theme');
    if (saved === 'light') { document.body.classList.add('light'); setIsDark(false); }
    else { document.body.classList.remove('light'); setIsDark(true); }
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) { document.body.classList.remove('light'); localStorage.setItem('fleetflow_theme', 'dark'); }
    else { document.body.classList.add('light'); localStorage.setItem('fleetflow_theme', 'light'); }
  };

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{page.title}</h1>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{page.subtitle}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{now}</div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          style={{
            width: 36, height: 36, borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--bg-card)', color: 'var(--text-secondary)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, transition: 'all 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue-light)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          {isDark ? '☀' : '🌙'}
        </button>

        <div style={{
          padding: '4px 12px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 20, fontSize: 11,
          color: 'var(--accent-blue-light)', fontWeight: 500,
        }}>
          {user?.role}
        </div>
      </div>
    </header>
  );
}
