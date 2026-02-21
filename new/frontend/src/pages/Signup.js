import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { toast } from 'react-toastify';

const ROLES = [
  { value: 'Fleet Manager', label: '🏢 Fleet Manager', desc: 'Full system access' },
  { value: 'Dispatcher', label: '📦 Dispatcher', desc: 'Manage trips & vehicles' },
  { value: 'Safety Officer', label: '🛡 Safety Officer', desc: 'Drivers & maintenance' },
  { value: 'Financial Analyst', label: '💰 Financial Analyst', desc: 'Fuel logs & analytics' },
];

export default function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'Dispatcher' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Enter a valid email address.';
    if (form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    try {
      await authAPI.register({ name: form.name, email: form.email, password: form.password, role: form.role });
      toast.success('Account created! You can now sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return null;
    if (p.length < 6) return { level: 1, label: 'Too short', color: '#ef4444' };
    if (p.length < 8 || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return { level: 2, label: 'Fair', color: '#f59e0b' };
    if (/[^a-zA-Z0-9]/.test(p)) return { level: 4, label: 'Strong', color: '#10b981' };
    return { level: 3, label: 'Good', color: '#3b82f6' };
  })();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: 460, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 60, height: 60, margin: '0 auto 16px', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, boxShadow: '0 8px 24px rgba(139,92,246,0.3)' }}>🚚</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>FleetFlow</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>Modular Fleet & Logistics Management</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Create Account</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>Join your fleet operations team</p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>⚠ {error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                className="form-control"
                placeholder="you@fleetflow.io"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            {/* Role */}
            <div className="form-group">
              <label className="form-label">Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, role: r.value }))}
                    style={{
                      padding: '10px 12px',
                      background: form.role === r.value ? 'rgba(139,92,246,0.12)' : 'var(--bg-secondary)',
                      border: `1px solid ${form.role === r.value ? '#8b5cf6' : 'var(--border)'}`,
                      borderRadius: 8,
                      color: form.role === r.value ? '#c4b5fd' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'inherit',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.7 }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, padding: 0 }}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {/* Strength bar */}
              {strength && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= strength.level ? strength.color : 'var(--border)', transition: 'background 0.2s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 10, color: strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Confirm Password</span>
                {form.confirmPassword && (
                  <span style={{ fontSize: 11, color: form.password === form.confirmPassword ? '#10b981' : '#ef4444', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
                    {form.password === form.confirmPassword ? '✓ Matches' : '✗ No match'}
                  </span>
                )}
              </label>
              <input
                type="password"
                name="confirmPassword"
                className="form-control"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 8, justifyContent: 'center', background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)' }}
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Creating account...</>
                : '→ Create Account'}
            </button>
          </form>

          {/* Sign in link */}
          <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Already have an account?</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <Link
            to="/login"
            style={{ display: 'block', textAlign: 'center', marginTop: 12, padding: '9px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--accent-blue-light)', fontSize: 13, fontWeight: 500, textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            ← Back to Sign In
          </Link>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
          FleetFlow v1.0 · Secure Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
