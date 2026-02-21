import React, { useState, useEffect } from 'react';
import { fuelAPI, vehiclesAPI, tripsAPI } from '../utils/api';
import { toast } from 'react-toastify';

const INIT = { vehicle_id:'', trip_id:'', liters:'', cost_per_liter:'', total_cost:'', date:'', odometer_km:'', station:'' };

export default function FuelExpense() {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({});
  const [vehicleSummary, setVehicleSummary] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedVehicle) loadVehicleSummary(); else setVehicleSummary(null); }, [selectedVehicle]);

  const load = async () => {
    setLoading(true);
    try {
      const [fl, st, vs, ts] = await Promise.all([fuelAPI.getAll(), fuelAPI.getStats(), vehiclesAPI.getAll(), tripsAPI.getAll({ status:'Completed' })]);
      setLogs(fl.data);
      setStats(st.data);
      setVehicles(vs.data);
      setTrips(ts.data);
    } catch { toast.error('Failed to load fuel logs.'); }
    finally { setLoading(false); }
  };

  const loadVehicleSummary = async () => {
    try {
      const res = await fuelAPI.getVehicleSummary(selectedVehicle);
      setVehicleSummary(res.data);
    } catch {}
  };

  const autoCalcTotal = (liters, cpl) => {
    if (liters && cpl) setForm(p => ({...p, total_cost: (parseFloat(liters) * parseFloat(cpl)).toFixed(2)}));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.liters || !form.total_cost || !form.date || !form.odometer_km) {
      toast.error('Vehicle, Liters, Cost, Date and Odometer are required.'); return;
    }
    setSaving(true);
    try {
      await fuelAPI.create({ ...form, liters:parseFloat(form.liters), cost_per_liter:parseFloat(form.cost_per_liter)||0, total_cost:parseFloat(form.total_cost), odometer_km:parseFloat(form.odometer_km), trip_id:form.trip_id||null });
      toast.success('Fuel log added!');
      setShowModal(false);
      load();
      if (selectedVehicle) loadVehicleSummary();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await fuelAPI.delete(id); toast.success('Deleted.'); load(); } catch { toast.error('Failed.'); }
  };

  const filteredLogs = selectedVehicle ? logs.filter(l => l.vehicle_id === selectedVehicle) : logs;

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#f97316' }}>₹{(stats.total_cost||0).toLocaleString()}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Total Fuel Spend</div>
        </div>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#3b82f6' }}>{(stats.total_liters||0).toLocaleString()}L</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Total Liters Filled</div>
        </div>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#10b981' }}>{stats.total_logs||0}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Fuel Log Entries</div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Fuel & Expense Logging</div>
          <div className="page-subtitle">Auto-calculates Total Operational Cost per Vehicle</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(INIT); setShowModal(true); }}>+ Log Fuel</button>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} style={{ minWidth:200 }}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
        </select>
      </div>

      {/* Vehicle Summary */}
      {vehicleSummary && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-title" style={{ marginBottom:16 }}>📊 Operational Cost Summary — {vehicles.find(v=>v.id===selectedVehicle)?.name}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {[
              { label:'Fuel Cost', value:`₹${vehicleSummary.total_fuel_cost?.toLocaleString()}`, color:'#f97316' },
              { label:'Maintenance Cost', value:`₹${vehicleSummary.total_maintenance_cost?.toLocaleString()}`, color:'#ef4444' },
              { label:'Total Operational Cost', value:`₹${vehicleSummary.total_operational_cost?.toLocaleString()}`, color:'#8b5cf6' },
              { label:'Fuel Efficiency', value:`${vehicleSummary.fuel_efficiency_km_per_l} km/L`, color:'#10b981' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-secondary)', borderRadius:8, padding:14, border:'1px solid var(--border)' }}>
                <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:16 }}>
            {[
              { label:'Total Liters', value:`${vehicleSummary.total_liters}L` },
              { label:'Distance Tracked', value:`${vehicleSummary.distance_km} km` },
              { label:'Cost per KM', value:`₹${vehicleSummary.cost_per_km}` },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--bg-secondary)', borderRadius:8, padding:12, border:'1px solid var(--border)', textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>{s.value}</div>
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th><th>Date</th><th>Liters</th><th>₹/Liter</th>
                <th>Total Cost</th><th>Odometer</th><th>Station</th><th>Trip</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">⛽</div><div className="empty-state-title">No fuel logs found</div></div></td></tr>
              ) : filteredLogs.map(l => (
                <tr key={l.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{l.vehicle_name || l.vehicle_id}</td>
                  <td style={{ fontSize:12 }}>{l.date}</td>
                  <td>{l.liters}L</td>
                  <td>{l.cost_per_liter ? `₹${l.cost_per_liter}` : '—'}</td>
                  <td style={{ fontWeight:600, color:'var(--accent-orange)' }}>₹{l.total_cost?.toLocaleString()}</td>
                  <td style={{ fontSize:12 }}>{l.odometer_km} km</td>
                  <td style={{ fontSize:12 }}>{l.station || '—'}</td>
                  <td style={{ fontSize:11, color:'var(--text-muted)' }}>{l.trip_id ? l.trip_id.slice(-6) : '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">Log Fuel / Expense</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <select className="form-control" value={form.vehicle_id} onChange={e=>setForm(p=>({...p,vehicle_id:e.target.value}))} required>
                    <option value="">— Select Vehicle —</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Link Trip (optional)</label>
                  <select className="form-control" value={form.trip_id} onChange={e=>setForm(p=>({...p,trip_id:e.target.value}))}>
                    <option value="">— No Trip —</option>
                    {trips.filter(t => !form.vehicle_id || t.vehicle_id === form.vehicle_id).map(t => <option key={t.id} value={t.id}>{t.origin} → {t.destination}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Liters Filled *</label>
                  <input type="number" step="0.1" className="form-control" placeholder="40.5" value={form.liters}
                    onChange={e=>{ setForm(p=>({...p,liters:e.target.value})); autoCalcTotal(e.target.value, form.cost_per_liter); }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost per Liter (₹)</label>
                  <input type="number" step="0.01" className="form-control" placeholder="92.50" value={form.cost_per_liter}
                    onChange={e=>{ setForm(p=>({...p,cost_per_liter:e.target.value})); autoCalcTotal(form.liters, e.target.value); }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Total Cost (₹) *</label>
                  <input type="number" step="0.01" className="form-control" placeholder="3750" value={form.total_cost} onChange={e=>setForm(p=>({...p,total_cost:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input type="date" className="form-control" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer at Fill (km) *</label>
                  <input type="number" className="form-control" placeholder="15000" value={form.odometer_km} onChange={e=>setForm(p=>({...p,odometer_km:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Fuel Station</label>
                  <input className="form-control" placeholder="HP Petrol Pump, Andheri" value={form.station} onChange={e=>setForm(p=>({...p,station:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Add Fuel Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
