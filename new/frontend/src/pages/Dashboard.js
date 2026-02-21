import React, { useState, useEffect } from 'react';
import { analyticsAPI, vehiclesAPI, tripsAPI, driversAPI } from '../utils/api';
import KPICard from '../components/KPICard';
import StatusPill from '../components/StatusPill';
import { toast } from 'react-toastify';

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [recentTrips, setRecentTrips] = useState([]);
  const [expiringLicenses, setExpiringLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', status: '', region: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ov, vs, ts, el] = await Promise.all([
        analyticsAPI.overview(),
        vehiclesAPI.getAll(),
        tripsAPI.getAll({ status: 'Dispatched' }),
        driversAPI.getExpiring(30),
      ]);
      setOverview(ov.data);
      setVehicles(vs.data.slice(0, 8));
      setRecentTrips(ts.data.slice(0, 5));
      setExpiringLicenses(el.data.slice(0, 5));
    } catch {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v => {
    if (filter.type && v.vehicle_type !== filter.type) return false;
    if (filter.status && v.status !== filter.status) return false;
    if (filter.region && v.region !== filter.region) return false;
    return true;
  });

  if (loading) return (
    <div className="loading-center">
      <div className="spinner" />
      <span>Loading Command Center...</span>
    </div>
  );

  return (
    <div>
      {/* KPI Row */}
      <div className="kpi-grid">
        <KPICard icon="🚛" label="Active Fleet (On Trip)" value={overview?.active_fleet ?? 0} color="#3b82f6" />
        <KPICard icon="🔧" label="Maintenance Alerts" value={overview?.maintenance_alerts ?? 0} color="#f59e0b" />
        <KPICard icon="📊" label="Fleet Utilization" value={overview?.utilization_rate ?? 0} suffix="%" color="#10b981" />
        <KPICard icon="📦" label="Pending Cargo" value={overview?.pending_cargo ?? 0} color="#8b5cf6" />
      </div>

      {/* Second KPI Row */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 28 }}>
        <KPICard icon="👤" label="Total Drivers" value={overview?.total_drivers ?? 0} color="#06b6d4" />
        <KPICard icon="💰" label="Total Revenue" value={`₹${(overview?.total_revenue ?? 0).toLocaleString()}`} color="#10b981" />
        <KPICard icon="⛽" label="Fuel Costs" value={`₹${(overview?.total_fuel_cost ?? 0).toLocaleString()}`} color="#f97316" />
        <KPICard icon="✅" label="Completed Trips" value={overview?.completed_trips ?? 0} color="#10b981" />
      </div>

      {/* Filters & Vehicle Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Fleet Status Overview</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {overview?.total_vehicles} vehicles in registry
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="filter-select" value={filter.type} onChange={e => setFilter(p => ({ ...p, type: e.target.value }))}>
              <option value="">All Types</option>
              <option>Truck</option><option>Van</option><option>Bike</option>
            </select>
            <select className="filter-select" value={filter.status} onChange={e => setFilter(p => ({ ...p, status: e.target.value }))}>
              <option value="">All Statuses</option>
              <option>Available</option><option>On Trip</option><option>In Shop</option><option>Retired</option>
            </select>
          </div>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Type</th>
                <th>License Plate</th>
                <th>Capacity (kg)</th>
                <th>Odometer</th>
                <th>Region</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state" style={{ padding: 30 }}>
                    <div className="empty-state-icon">🚛</div>
                    <div className="empty-state-title">No vehicles found</div>
                  </div>
                </td></tr>
              ) : filteredVehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.name}</td>
                  <td><StatusPill status={v.vehicle_type} size="sm" /></td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.license_plate}</td>
                  <td>{v.max_capacity_kg?.toLocaleString()}</td>
                  <td>{v.odometer_km?.toLocaleString()} km</td>
                  <td>{v.region || '—'}</td>
                  <td><StatusPill status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Active Trips */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🗺 Active Dispatches</div>
            <span className="pill pill-blue"><span className="pill-dot" />{recentTrips.length} live</span>
          </div>
          {recentTrips.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-icon">🗺</div>
              <div>No active trips right now</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentTrips.map(t => (
                <div key={t.id} style={{
                  padding: '12px', background: 'var(--bg-secondary)',
                  borderRadius: 8, border: '1px solid var(--border)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                      {t.origin} → {t.destination}
                    </span>
                    <StatusPill status={t.status} size="sm" />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Driver: {t.driver_name} · Vehicle: {t.vehicle_name} · {t.cargo_weight_kg}kg
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* License Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚠ License Expiry Alerts</div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Next 30 days</span>
          </div>
          {expiringLicenses.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="empty-state-icon" style={{ color: 'var(--accent-green)' }}>✓</div>
              <div>All licenses valid for 30+ days</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {expiringLicenses.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 12px', background: d.days_until_expiry <= 7 ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)',
                  borderRadius: 8, border: `1px solid ${d.days_until_expiry <= 7 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.license_number}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: d.days_until_expiry <= 7 ? 'var(--accent-red)' : 'var(--accent-yellow)' }}>
                    {d.days_until_expiry === 0 ? 'EXPIRES TODAY' : `${d.days_until_expiry}d left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
