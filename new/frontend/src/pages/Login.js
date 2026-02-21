import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import { toast } from 'react-toastify';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedingData, setSeedingData] = useState(false);

  const handleChange = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter email and password.'); return; }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! Loading your dashboard...');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await authAPI.seedAdmin();
      toast.success(`Demo accounts ready: ${res.data.seeded?.join(', ') || 'already exist'}`);
    } catch {
      toast.info('Demo accounts already exist.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedData = async () => {
    setSeedingData(true);
    try {
      const res = await authAPI.seedData();
      if (res.data.skipped) {
        toast.info('Demo data already exists in the database.');
      } else {
        toast.success(`Data seeded! ${res.data.vehicles}v · ${res.data.drivers}d · ${res.data.trips}t · ${res.data.fuel_logs}f`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Seed failed. Try again.');
    } finally {
      setSeedingData(false);
    }
  };

  const quickFill = (email, password) => setForm({ email, password });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
          }}>🚚</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>FleetFlow</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 13 }}>
            Modular Fleet & Logistics Management
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Sign In</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
            Access your fleet command center
          </p>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Password</span>
                <span style={{ color: 'var(--accent-blue-light)', cursor: 'pointer', fontWeight: 500, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
                  Forgot password?
                </span>
              </label>
              <input
                type="password"
                name="password"
                className="form-control"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: 14, marginTop: 8, justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in...</> : '→ Sign In'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demo Accounts</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: '🏢 Fleet Manager', email: 'manager@fleetflow.io', pwd: 'manager123' },
                { label: '📦 Dispatcher', email: 'dispatcher@fleetflow.io', pwd: 'dispatch123' },
                { label: '🛡 Safety Officer', email: 'safety@fleetflow.io', pwd: 'safety123' },
                { label: '💰 Finance', email: 'finance@fleetflow.io', pwd: 'finance123' },
              ].map(d => (
                <button
                  key={d.email}
                  onClick={() => quickFill(d.email, d.pwd)}
                  style={{
                    padding: '7px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                    borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11,
                    fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              style={{
                width: '100%', marginTop: 10, padding: '7px',
                background: 'transparent', border: '1px dashed var(--border)',
                borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {seeding ? 'Creating accounts...' : '⚡ Seed Demo Accounts (First Run)'}
            </button>
            <button
              onClick={handleSeedData}
              disabled={seedingData}
              style={{
                width: '100%', marginTop: 6, padding: '7px',
                background: 'transparent', border: '1px dashed var(--border)',
                borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer',
                fontSize: 11, fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >
              {seedingData ? 'Seeding fleet data...' : '📦 Seed Demo Data (Vehicles, Trips, Drivers…)'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link
            to="/signup"
            style={{ fontSize: 12, color: 'var(--accent-blue-light)', textDecoration: 'none', fontWeight: 500 }}
          >
            Don't have an account? Create one →
          </Link>
        </div>
        <p style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          FleetFlow v1.0 · Secure Role-Based Access Control
        </p>
      </div>
    </div>
  );
}
