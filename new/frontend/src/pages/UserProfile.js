import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, vehiclesAPI, driversAPI, tripsAPI, maintenanceAPI, fuelAPI, analyticsAPI } from '../utils/api';
import { toast } from 'react-toastify';
import StatusPill from '../components/StatusPill';

const ROLE_META = {
  'Fleet Manager':     { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: '🏢', tagline: 'Full system access · Vehicle health, asset lifecycle & scheduling' },
  'Dispatcher':        { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: '📦', tagline: 'Trip creation, driver assignment & cargo load validation' },
  'Safety Officer':    { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '🛡',  tagline: 'Driver compliance, license expiry tracking & safety scores' },
  'Financial Analyst': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '💰', tagline: 'Fuel spend auditing, maintenance ROI & operational cost analysis' },
};

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const meta = ROLE_META[user?.role] || ROLE_META['Dispatcher'];

  // ── Profile edit state ───────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState('');

  // ── Role-specific data ───────────────────────────────────────────────────
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRoleData(); }, [user?.role]); // eslint-disable-line

  const loadRoleData = async () => {
    setLoading(true);
    try {
      const role = user?.role;
      if (role === 'Fleet Manager') {
        const [vs, ms, ov] = await Promise.all([
          vehiclesAPI.getStats(), maintenanceAPI.getAll(), analyticsAPI.overview(),
        ]);
        setData({ vehicleStats: vs.data, maintenance: ms.data?.slice(0,5), overview: ov.data });
      } else if (role === 'Dispatcher') {
        const [ts, vs, ds] = await Promise.all([
          tripsAPI.getAll({ status: 'Dispatched' }), vehiclesAPI.getAvailable(), driversAPI.getAvailable(),
        ]);
        setData({ activeTrips: ts.data?.slice(0,6), availableVehicles: vs.data, availableDrivers: ds.data });
      } else if (role === 'Safety Officer') {
        const [exp, all, ds] = await Promise.all([
          driversAPI.getExpiring(60), driversAPI.getAll(), driversAPI.getStats(),
        ]);
        setData({ expiring: exp.data, allDrivers: all.data?.slice(0,8), driverStats: ds.data });
      } else if (role === 'Financial Analyst') {
        const [fe, ov, roi] = await Promise.all([
          fuelAPI.getAll(), analyticsAPI.overview(), analyticsAPI.vehicleROI(),
        ]);
        setData({ fuelLogs: fe.data?.slice(0,6), overview: ov.data, roi: roi.data?.slice(0,6) });
      }
    } catch { toast.error('Failed to load dashboard data.'); }
    finally { setLoading(false); }
  };

  // ── Profile CRUD ─────────────────────────────────────────────────────────
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setFormErr('');
    if (!form.name.trim()) { setFormErr('Name is required.'); return; }
    if (form.password && form.password.length < 6) { setFormErr('Password must be at least 6 characters.'); return; }
    if (form.password && form.password !== form.confirmPassword) { setFormErr('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name };
      if (form.email !== user.email) payload.email = form.email;
      if (form.password) payload.password = form.password;
      const res = await authAPI.updateProfile(payload);
      updateUser(res.data);
      setForm(p => ({ ...p, password: '', confirmPassword: '' }));
      setEditMode(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      setFormErr(err.response?.data?.detail || 'Update failed.');
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setForm({ name: user?.name, email: user?.email, password: '', confirmPassword: '' });
    setFormErr('');
    setEditMode(false);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Account settings & role-based dashboard</div>
        </div>
        <button className="btn btn-outline" onClick={loadRoleData}>↻ Refresh</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── LEFT: Profile Card ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Avatar + identity */}
          <div className="card" style={{ textAlign: 'center', padding: '28px 24px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 auto 16px', boxShadow: `0 0 0 4px ${meta.bg}` }}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{user?.email}</div>
            <span style={{ display: 'inline-block', padding: '4px 14px', borderRadius: 20, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 700, border: `1px solid ${meta.color}30`, letterSpacing: 0.5 }}>
              {meta.icon} {user?.role}
            </span>
            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>{meta.tagline}</div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)' }}>
              Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '—'}
            </div>
          </div>

          {/* Edit profile form */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span className="card-title" style={{ marginBottom: 0 }}>Account Details</span>
              {!editMode && (
                <button className="btn btn-outline" style={{ padding: '5px 14px', fontSize: 12 }} onClick={() => setEditMode(true)}>✏ Edit</button>
              )}
            </div>

            {!editMode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[{ label: 'Full Name', val: user?.name }, { label: 'Email Address', val: user?.email }, { label: 'Role', val: user?.role }, { label: 'Password', val: '••••••••' }].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{f.label}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{f.val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <form onSubmit={handleProfileSave}>
                {formErr && <div className="alert alert-error" style={{ marginBottom: 14, fontSize: 12 }}>⚠ {formErr}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">New Password <span style={{ color: 'var(--text-muted)', textTransform: 'none', letterSpacing: 0, fontSize: 10, fontWeight: 400 }}>(leave blank to keep current)</span></label>
                  <input className="form-control" type="password" placeholder="New password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                </div>
                {form.password && (
                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input className="form-control" type="password" placeholder="Re-enter new password" value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '9px' }} disabled={saving}>
                    {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving...</> : '✓ Save Changes'}
                  </button>
                  <button type="button" className="btn btn-outline" style={{ padding: '9px 14px' }} onClick={handleCancel}>✕</button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── RIGHT: Role-based Dashboard ────────────────────────────────── */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}><div className="spinner" /></div>
          ) : (
            <>
              {user?.role === 'Fleet Manager' && <FleetManagerDashboard data={data} reload={loadRoleData} />}
              {user?.role === 'Dispatcher' && <DispatcherDashboard data={data} reload={loadRoleData} />}
              {user?.role === 'Safety Officer' && <SafetyOfficerDashboard data={data} reload={loadRoleData} />}
              {user?.role === 'Financial Analyst' && <FinancialAnalystDashboard data={data} reload={loadRoleData} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FLEET MANAGER DASHBOARD — Vehicle health, asset lifecycle, scheduling
// ════════════════════════════════════════════════════════════════════════════
function FleetManagerDashboard({ data, reload }) {
  const vs = data.vehicleStats || {};
  const maintenance = data.maintenance || [];
  const ov = data.overview || {};

  const kpis = [
    { icon: '🚛', label: 'Total Fleet',    value: vs.total || 0,          color: '#3b82f6' },
    { icon: '✅', label: 'Available',       value: vs.available || 0,      color: '#10b981' },
    { icon: '🔴', label: 'On Trip',         value: vs.on_trip || 0,        color: '#f59e0b' },
    { icon: '🔧', label: 'In Shop',         value: vs.in_shop || 0,        color: '#ef4444' },
    { icon: '📦', label: 'Retired Assets',  value: vs.retired || 0,        color: '#8b92a9' },
    { icon: '📈', label: 'Utilization %',   value: vs.total ? `${Math.round(((vs.on_trip||0)/vs.total)*100)}%` : '0%', color: '#8b5cf6' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader icon="🏢" title="Fleet Health Overview" subtitle="Live vehicle status across your entire fleet" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {kpis.map(k => <KPIMini key={k.label} {...k} />)}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Operational Summary</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <SummaryRow label="Total Revenue" value={`₹${(ov.total_revenue||0).toLocaleString()}`} color="#10b981" />
          <SummaryRow label="Total Ops Cost" value={`₹${(ov.total_operational_cost||0).toLocaleString()}`} color="#ef4444" />
          <SummaryRow label="Net Profit" value={`₹${(ov.net_profit||0).toLocaleString()}`} color={ov.net_profit >= 0 ? '#10b981' : '#ef4444'} />
          <SummaryRow label="Trips Completed" value={ov.trips_completed || 0} color="#3b82f6" />
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Recent Maintenance Alerts</div>
        {maintenance.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">🔧</div><div>No maintenance records</div></div>
        ) : (
          <table><thead><tr><th>Vehicle</th><th>Service Type</th><th>Cost</th><th>Status</th></tr></thead>
          <tbody>{maintenance.map(m => (
            <tr key={m.id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.vehicle_name || m.vehicle_id}</td>
              <td>{m.service_type}</td>
              <td style={{ color: '#f59e0b' }}>₹{(m.cost||0).toLocaleString()}</td>
              <td><StatusPill status={m.status} /></td>
            </tr>
          ))}</tbody></table>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DISPATCHER DASHBOARD — Trips, drivers, cargo validation
// ════════════════════════════════════════════════════════════════════════════
function DispatcherDashboard({ data }) {
  const trips = data.activeTrips || [];
  const vehicles = data.availableVehicles || [];
  const drivers = data.availableDrivers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader icon="📦" title="Dispatch Overview" subtitle="Active trips, available vehicles and ready drivers" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        <KPIMini icon="🗺" label="Active Trips"       value={trips.length}    color="#f59e0b" />
        <KPIMini icon="🚛" label="Available Vehicles" value={vehicles.length} color="#10b981" />
        <KPIMini icon="👤" label="Ready Drivers"      value={drivers.length}  color="#3b82f6" />
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Active Dispatches</div>
        {trips.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">🗺</div><div>No dispatched trips right now</div></div>
        ) : (
          <table><thead><tr><th>Trip</th><th>Origin → Dest.</th><th>Vehicle</th><th>Driver</th><th>Cargo (kg)</th></tr></thead>
          <tbody>{trips.map(t => (
            <tr key={t.id}>
              <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-blue-light)' }}>#{t.id?.slice(-6)}</td>
              <td style={{ fontSize: 12 }}>{t.origin} → {t.destination}</td>
              <td>{t.vehicle_name || t.vehicle_id}</td>
              <td>{t.driver_name || t.driver_id}</td>
              <td><span style={{ fontWeight: 700, color: '#f59e0b' }}>{t.cargo_weight_kg} kg</span></td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Available Vehicles</div>
          {vehicles.length === 0 ? <div className="empty-state" style={{ padding: 16 }}><div>No vehicles available</div></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vehicles.slice(0,5).map(v => (
                <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{v.vehicle_type} · {v.license_plate}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700 }}>{v.max_capacity_kg} kg max</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>Ready Drivers</div>
          {drivers.length === 0 ? <div className="empty-state" style={{ padding: 16 }}><div>No drivers available</div></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {drivers.slice(0,5).map(d => (
                <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>License: {d.license_category}</div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>Score: {d.safety_score}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SAFETY OFFICER DASHBOARD — Compliance, license expiry, safety scores
// ════════════════════════════════════════════════════════════════════════════
function SafetyOfficerDashboard({ data }) {
  const expiring = data.expiring || [];
  const allDrivers = data.allDrivers || [];
  const ds = data.driverStats || {};

  const expired    = expiring.filter(d => d.days_until_expiry <= 0);
  const expireSoon = expiring.filter(d => d.days_until_expiry > 0);
  const suspended  = allDrivers.filter(d => d.status === 'Suspended');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader icon="🛡" title="Safety & Compliance" subtitle="Driver license tracking, suspensions and safety scores" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        <KPIMini icon="👥" label="Total Drivers"    value={ds.total||0}            color="#3b82f6" />
        <KPIMini icon="❌" label="Expired License"  value={expired.length}         color="#ef4444" />
        <KPIMini icon="⚠️" label="Expiring Soon"   value={expireSoon.length}       color="#f59e0b" />
        <KPIMini icon="🚫" label="Suspended"        value={suspended.length}       color="#8b5cf6" />
      </div>

      {(expired.length > 0 || expireSoon.length > 0) && (
        <div className="card" style={{ borderLeft: `3px solid #ef4444` }}>
          <div className="card-title" style={{ marginBottom: 16, color: '#ef4444' }}>⚠ License Expiry Alerts (next 60 days)</div>
          <table><thead><tr><th>Driver</th><th>Category</th><th>Expiry Date</th><th>Days Left</th><th>Status</th></tr></thead>
          <tbody>{expiring.map(d => (
            <tr key={d.id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.name}</td>
              <td>{d.license_category}</td>
              <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : '—'}</td>
              <td><span style={{ fontWeight: 700, color: d.days_until_expiry <= 0 ? '#ef4444' : d.days_until_expiry <= 14 ? '#f59e0b' : '#10b981' }}>
                {d.days_until_expiry <= 0 ? 'EXPIRED' : `${d.days_until_expiry}d`}
              </span></td>
              <td><StatusPill status={d.status} /></td>
            </tr>
          ))}</tbody></table>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Driver Safety Scores</div>
        {allDrivers.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">👤</div><div>No driver data</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allDrivers.slice(0,8).map(d => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: d.status === 'Suspended' ? '#ef444430' : '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: d.status === 'Suspended' ? '#ef4444' : '#3b82f6', flexShrink: 0 }}>
                  {d.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: d.safety_score >= 80 ? '#10b981' : d.safety_score >= 60 ? '#f59e0b' : '#ef4444' }}>{d.safety_score}/100</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', borderRadius: 4, height: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${d.safety_score || 0}%`, height: '100%', borderRadius: 4, background: d.safety_score >= 80 ? '#10b981' : d.safety_score >= 60 ? '#f59e0b' : '#ef4444', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                <StatusPill status={d.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FINANCIAL ANALYST DASHBOARD — Fuel spend, ROI, operational costs
// ════════════════════════════════════════════════════════════════════════════
function FinancialAnalystDashboard({ data }) {
  const ov = data.overview || {};
  const fuelLogs = data.fuelLogs || [];
  const roi = data.roi || [];

  const margin = ov.total_revenue && ov.total_operational_cost
    ? (((ov.total_revenue - ov.total_operational_cost) / ov.total_revenue) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader icon="💰" title="Financial Overview" subtitle="Fuel spend, maintenance ROI & operational cost analysis" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        <div className="card" style={{ borderLeft: '3px solid #10b981', padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Revenue</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>₹{(ov.total_revenue||0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>From {ov.trips_completed||0} completed trips</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid #ef4444', padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Total Ops Cost</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>₹{(ov.total_operational_cost||0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Fuel + Maintenance combined</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid #8b5cf6', padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Net Profit / Loss</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: ov.net_profit >= 0 ? '#10b981' : '#ef4444' }}>₹{Math.abs(ov.net_profit||0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{ov.net_profit >= 0 ? 'Profitable' : 'Running at loss'}</div>
        </div>
        <div className="card" style={{ borderLeft: '3px solid #f59e0b', padding: '16px 20px' }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Profit Margin</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{margin}%</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Revenue margin after costs</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Vehicle ROI Analysis</div>
        {roi.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">📊</div><div>No ROI data yet</div></div>
        ) : (
          <table><thead><tr><th>Vehicle</th><th>Revenue</th><th>Ops Cost</th><th>Net</th><th>ROI %</th></tr></thead>
          <tbody>{roi.map(v => (
            <tr key={v.vehicle_id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v.name}</td>
              <td style={{ color: '#10b981' }}>₹{(v.revenue||0).toLocaleString()}</td>
              <td style={{ color: '#ef4444' }}>₹{(v.total_operational_cost||0).toLocaleString()}</td>
              <td style={{ color: (v.revenue||0) - (v.total_operational_cost||0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                ₹{((v.revenue||0) - (v.total_operational_cost||0)).toLocaleString()}
              </td>
              <td><span style={{ fontWeight: 800, color: v.roi_percent >= 0 ? '#10b981' : '#ef4444' }}>{v.roi_percent}%</span></td>
            </tr>
          ))}</tbody></table>
        )}
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>Recent Fuel Logs</div>
        {fuelLogs.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-icon">⛽</div><div>No fuel logs yet</div></div>
        ) : (
          <table><thead><tr><th>Vehicle</th><th>Date</th><th>Liters</th><th>Cost/L</th><th>Total Cost</th></tr></thead>
          <tbody>{fuelLogs.map(f => (
            <tr key={f.id}>
              <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{f.vehicle_name || f.vehicle_id}</td>
              <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.date ? new Date(f.date).toLocaleDateString() : '—'}</td>
              <td>{f.liters}L</td>
              <td>₹{f.cost_per_liter}/L</td>
              <td style={{ color: '#f59e0b', fontWeight: 600 }}>₹{(f.total_cost||0).toLocaleString()}</td>
            </tr>
          ))}</tbody></table>
        )}
      </div>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</div>
      </div>
    </div>
  );
}

function KPIMini({ icon, label, value, color }) {
  return (
    <div className="card" style={{ padding: '14px 16px', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 2 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function SummaryRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
