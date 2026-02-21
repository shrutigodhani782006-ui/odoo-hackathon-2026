import React, { useState, useEffect } from 'react';
import { tripsAPI, vehiclesAPI, driversAPI } from '../utils/api';
import StatusPill from '../components/StatusPill';
import { toast } from 'react-toastify';

const INIT = { vehicle_id:'', driver_id:'', origin:'', destination:'', cargo_weight_kg:'', cargo_description:'', planned_date:'', revenue:'' };

export default function TripDispatcher() {
  const [trips, setTrips] = useState([]);
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [form, setForm] = useState(INIT);
  const [completeForm, setCompleteForm] = useState({ final_odometer_km:'', revenue:'', notes:'' });
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [ts, st, avVehicles, avDrivers] = await Promise.all([
        tripsAPI.getAll(),
        tripsAPI.getStats(),
        vehiclesAPI.getAvailable(),
        driversAPI.getAvailable(),
      ]);
      setTrips(ts.data);
      setStats(st.data);
      setVehicles(avVehicles.data);
      setDrivers(avDrivers.data);
    } catch { toast.error('Failed to load trips.'); }
    finally { setLoading(false); }
  };

  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.driver_id || !form.origin || !form.destination || !form.cargo_weight_kg) {
      toast.error('All required fields must be filled.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, cargo_weight_kg: parseFloat(form.cargo_weight_kg), revenue: parseFloat(form.revenue)||0  };
      await tripsAPI.create(payload);
      toast.success('Trip created as Draft!');
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error creating trip.'); }
    finally { setSaving(false); }
  };

  const handleDispatch = async (id) => {
    try { await tripsAPI.dispatch(id); toast.success('Trip dispatched! Vehicle & Driver status updated.'); load(); } catch (err) { toast.error(err.response?.data?.detail || 'Failed to dispatch.'); }
  };

  const openComplete = (trip) => { setSelectedTrip(trip); setCompleteForm({ final_odometer_km:'', revenue:'', notes:'' }); setShowCompleteModal(true); };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (!completeForm.final_odometer_km) { toast.error('Final odometer reading is required.'); return; }
    setSaving(true);
    try {
      await tripsAPI.complete(selectedTrip.id, { final_odometer_km: parseFloat(completeForm.final_odometer_km), revenue: parseFloat(completeForm.revenue)||0, notes: completeForm.notes, status: 'Completed' });
      toast.success('Trip completed! Vehicle & Driver are now Available.');
      setShowCompleteModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed.'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this trip?')) return;
    try { await tripsAPI.cancel(id); toast.success('Trip cancelled.'); load(); } catch (err) { toast.error(err.response?.data?.detail || 'Failed.'); }
  };

  const filtered = trips.filter(t => {
    if (filterStatus && t.status !== filterStatus) return false;
    if (search && !t.origin?.toLowerCase().includes(search.toLowerCase()) && !t.destination?.toLowerCase().includes(search.toLowerCase()) && !t.vehicle_name?.toLowerCase().includes(search.toLowerCase()) && !t.driver_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const cargoOk = form.vehicle_id && form.cargo_weight_kg && selectedVehicle ? parseFloat(form.cargo_weight_kg) <= selectedVehicle.max_capacity_kg : null;

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Trips', value:stats.total||0, color:'#3b82f6' },
          { label:'Draft', value:stats.draft||0, color:'#8b92a9' },
          { label:'Dispatched', value:stats.dispatched||0, color:'#60a5fa' },
          { label:'Completed', value:stats.completed||0, color:'#10b981' },
          { label:'Cancelled', value:stats.cancelled||0, color:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Trip Dispatcher</div>
          <div className="page-subtitle">{filtered.length} trips · {vehicles.length} vehicles available · {drivers.length} drivers ready</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(INIT); setShowModal(true); }}>+ New Trip</button>
      </div>

      <div className="filter-bar">
        <input className="search-input" placeholder="Search origin, destination, driver…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option><option>Draft</option><option>Dispatched</option><option>Completed</option><option>Cancelled</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <table>
            <thead>
              <tr>
                <th>Route</th><th>Vehicle</th><th>Driver</th><th>Cargo (kg)</th>
                <th>Revenue</th><th>Distance</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🗺</div><div className="empty-state-title">No trips found</div><div className="empty-state-text">Create a new trip to get started.</div></div></td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight:600, color:'var(--text-primary)', fontSize:13 }}>{t.origin}</div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>→ {t.destination}</div>
                  </td>
                  <td style={{ fontSize:12 }}>{t.vehicle_name}</td>
                  <td style={{ fontSize:12 }}>{t.driver_name}</td>
                  <td>{t.cargo_weight_kg?.toLocaleString()}</td>
                  <td>{t.revenue ? `₹${t.revenue.toLocaleString()}` : '—'}</td>
                  <td>{t.distance_km ? `${t.distance_km} km` : '—'}</td>
                  <td><StatusPill status={t.status} /></td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {t.status === 'Draft' && <button className="btn btn-primary btn-sm" onClick={() => handleDispatch(t.id)}>▶ Dispatch</button>}
                      {t.status === 'Dispatched' && <button className="btn btn-success btn-sm" onClick={() => openComplete(t)}>✓ Complete</button>}
                      {(t.status === 'Draft' || t.status === 'Dispatched') && (
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancel(t.id)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Trip Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h2 className="modal-title">Create New Trip</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <select className="form-control" value={form.vehicle_id} onChange={e=>setForm(p=>({...p,vehicle_id:e.target.value}))} required>
                    <option value="">— Select Available Vehicle —</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate}) · {v.max_capacity_kg}kg max</option>)}
                  </select>
                  {selectedVehicle && <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>✓ Max capacity: {selectedVehicle.max_capacity_kg}kg</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Driver *</label>
                  <select className="form-control" value={form.driver_id} onChange={e=>setForm(p=>({...p,driver_id:e.target.value}))} required>
                    <option value="">— Select Available Driver —</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name} · {d.license_categories?.join(', ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Origin *</label>
                  <input className="form-control" placeholder="e.g. Mumbai Warehouse" value={form.origin} onChange={e=>setForm(p=>({...p,origin:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination *</label>
                  <input className="form-control" placeholder="e.g. Pune Depot" value={form.destination} onChange={e=>setForm(p=>({...p,destination:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo Weight (kg) *</label>
                  <input type="number" className="form-control" placeholder="450" value={form.cargo_weight_kg} onChange={e=>setForm(p=>({...p,cargo_weight_kg:e.target.value}))} required />
                  {form.cargo_weight_kg && selectedVehicle && (
                    <div style={{ fontSize:11, marginTop:4, color: cargoOk ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {cargoOk ? `✓ ${form.cargo_weight_kg}kg < ${selectedVehicle.max_capacity_kg}kg (Pass)` : `✗ Exceeds max capacity of ${selectedVehicle.max_capacity_kg}kg!`}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Revenue (₹)</label>
                  <input type="number" className="form-control" placeholder="5000" value={form.revenue} onChange={e=>setForm(p=>({...p,revenue:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Planned Date</label>
                  <input type="datetime-local" className="form-control" value={form.planned_date} onChange={e=>setForm(p=>({...p,planned_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo Description</label>
                  <input className="form-control" placeholder="Electronics, FMCG, etc." value={form.cargo_description} onChange={e=>setForm(p=>({...p,cargo_description:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving || cargoOk === false}>{saving ? 'Creating…' : 'Create Trip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Modal */}
      {showCompleteModal && selectedTrip && (
        <div className="modal-backdrop" onClick={e => { if(e.target===e.currentTarget) setShowCompleteModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Complete Trip</h2>
              <button className="btn-icon" onClick={() => setShowCompleteModal(false)}>✕</button>
            </div>
            <div style={{ padding:'12px', background:'var(--bg-secondary)', borderRadius:8, marginBottom:16 }}>
              <div style={{ fontWeight:600, color:'var(--text-primary)' }}>{selectedTrip.origin} → {selectedTrip.destination}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>Driver: {selectedTrip.driver_name} · Vehicle: {selectedTrip.vehicle_name}</div>
            </div>
            <form onSubmit={handleComplete}>
              <div className="form-group">
                <label className="form-label">Final Odometer Reading (km) *</label>
                <input type="number" className="form-control" placeholder="Enter final odometer km" value={completeForm.final_odometer_km} onChange={e=>setCompleteForm(p=>({...p,final_odometer_km:e.target.value}))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Revenue Collected (₹)</label>
                <input type="number" className="form-control" placeholder="0" value={completeForm.revenue} onChange={e=>setCompleteForm(p=>({...p,revenue:e.target.value}))} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-control" rows={2} placeholder="Any remarks…" value={completeForm.notes} onChange={e=>setCompleteForm(p=>({...p,notes:e.target.value}))} style={{ resize:'none' }} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowCompleteModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={saving}>{saving ? 'Completing…' : '✓ Mark as Completed'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
