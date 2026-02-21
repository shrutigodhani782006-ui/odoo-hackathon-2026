import React, { useState, useEffect } from 'react';
import { vehiclesAPI } from '../utils/api';
import StatusPill from '../components/StatusPill';
import { toast } from 'react-toastify';

const INIT = { name:'', license_plate:'', vehicle_type:'Truck', max_capacity_kg:'', odometer_km:'', region:'', acquisition_cost:'', year:'' };

export default function VehicleRegistry() {
  const [vehicles, setVehicles] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type:'', status:'', search:'' });
  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [vs, st] = await Promise.all([vehiclesAPI.getAll(), vehiclesAPI.getStats()]);
      setVehicles(vs.data);
      setStats(st.data);
    } catch { toast.error('Failed to load vehicles.'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditVehicle(null); setForm(INIT); setShowModal(true); };
  const openEdit = (v) => {
    setEditVehicle(v);
    setForm({ name:v.name, license_plate:v.license_plate, vehicle_type:v.vehicle_type, max_capacity_kg:v.max_capacity_kg, odometer_km:v.odometer_km, region:v.region||'', acquisition_cost:v.acquisition_cost||'', year:v.year||'' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.license_plate || !form.max_capacity_kg) { toast.error('Name, License Plate and Capacity are required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form, max_capacity_kg: parseFloat(form.max_capacity_kg), odometer_km: parseFloat(form.odometer_km)||0, acquisition_cost: parseFloat(form.acquisition_cost)||0, year: parseInt(form.year)||null };
      if (editVehicle) { await vehiclesAPI.update(editVehicle.id, payload); toast.success('Vehicle updated!'); }
      else { await vehiclesAPI.create(payload); toast.success('Vehicle added to registry!'); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving vehicle.'); }
    finally { setSaving(false); }
  };

  const handleRetire = async (v) => {
    if (!window.confirm(`Retire ${v.name}? This marks it as Out of Service.`)) return;
    try { await vehiclesAPI.retire(v.id); toast.success(`${v.name} retired.`); load(); } catch { toast.error('Failed to retire vehicle.'); }
  };

  const handleStatusChange = async (id, status) => {
    try { await vehiclesAPI.updateStatus(id, status); toast.success('Status updated.'); load(); } catch { toast.error('Failed.'); }
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Delete ${v.name}?`)) return;
    try { await vehiclesAPI.delete(v.id); toast.success('Deleted.'); load(); } catch { toast.error('Failed.'); }
  };

  const filtered = vehicles.filter(v => {
    if (filter.type && v.vehicle_type !== filter.type) return false;
    if (filter.status && v.status !== filter.status) return false;
    if (filter.search && !v.name.toLowerCase().includes(filter.search.toLowerCase()) && !v.license_plate.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total', value: stats.total||0, color:'#3b82f6' },
          { label:'Available', value: stats.available||0, color:'#10b981' },
          { label:'On Trip', value: stats.on_trip||0, color:'#60a5fa' },
          { label:'In Shop', value: stats.in_shop||0, color:'#f59e0b' },
          { label:'Utilization', value: `${stats.utilization_rate||0}%`, color:'#8b5cf6' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'16px', textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Vehicle Registry</div>
          <div className="page-subtitle">{filtered.length} vehicles shown</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Vehicle</button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input className="search-input" placeholder="Search by name or plate…" value={filter.search} onChange={e => setFilter(p=>({...p,search:e.target.value}))} />
        <select className="filter-select" value={filter.type} onChange={e=>setFilter(p=>({...p,type:e.target.value}))}>
          <option value="">All Types</option><option>Truck</option><option>Van</option><option>Bike</option>
        </select>
        <select className="filter-select" value={filter.status} onChange={e=>setFilter(p=>({...p,status:e.target.value}))}>
          <option value="">All Statuses</option><option>Available</option><option>On Trip</option><option>In Shop</option><option>Retired</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Vehicle Name</th><th>Type</th><th>License Plate</th>
                <th>Max Capacity</th><th>Odometer</th><th>Region</th>
                <th>Acq. Cost</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">🚛</div><div className="empty-state-title">No vehicles found</div><div className="empty-state-text">Add a vehicle to get started.</div></div></td></tr>
              ) : filtered.map(v => (
                <tr key={v.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{v.name}</td>
                  <td><StatusPill status={v.vehicle_type} size="sm" /></td>
                  <td style={{ fontFamily:'monospace' }}>{v.license_plate}</td>
                  <td>{v.max_capacity_kg?.toLocaleString()} kg</td>
                  <td>{v.odometer_km?.toLocaleString()} km</td>
                  <td>{v.region || '—'}</td>
                  <td>{v.acquisition_cost ? `₹${v.acquisition_cost.toLocaleString()}` : '—'}</td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <StatusPill status={v.status} size="sm" />
                      {v.status !== 'Retired' && (
                        <select
                          className="filter-select"
                          style={{ fontSize:10, padding:'2px 6px' }}
                          value={v.status}
                          onChange={e => handleStatusChange(v.id, e.target.value)}
                        >
                          <option>Available</option><option>On Trip</option><option>In Shop</option>
                        </select>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>✏</button>
                      {v.status !== 'Retired' && <button className="btn btn-warning btn-sm" onClick={() => handleRetire(v)} title="Retire">🔴</button>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v)}>🗑</button>
                    </div>
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
              <h2 className="modal-title">{editVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vehicle Name / Model *</label>
                  <input className="form-control" placeholder="e.g. Van-05 · Toyota HiAce" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">License Plate *</label>
                  <input className="form-control" placeholder="MH-01-AB-1234" value={form.license_plate} onChange={e=>setForm(p=>({...p,license_plate:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type</label>
                  <select className="form-control" value={form.vehicle_type} onChange={e=>setForm(p=>({...p,vehicle_type:e.target.value}))}>
                    <option>Truck</option><option>Van</option><option>Bike</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Load Capacity (kg) *</label>
                  <input type="number" className="form-control" placeholder="500" value={form.max_capacity_kg} onChange={e=>setForm(p=>({...p,max_capacity_kg:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer (km)</label>
                  <input type="number" className="form-control" placeholder="0" value={form.odometer_km} onChange={e=>setForm(p=>({...p,odometer_km:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input className="form-control" placeholder="e.g. North Zone" value={form.region} onChange={e=>setForm(p=>({...p,region:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Acquisition Cost (₹)</label>
                  <input type="number" className="form-control" placeholder="0" value={form.acquisition_cost} onChange={e=>setForm(p=>({...p,acquisition_cost:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input type="number" className="form-control" placeholder="2022" value={form.year} onChange={e=>setForm(p=>({...p,year:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editVehicle ? 'Update Vehicle' : 'Add Vehicle')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
