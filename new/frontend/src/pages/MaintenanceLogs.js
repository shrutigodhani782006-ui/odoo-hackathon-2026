import React, { useState, useEffect } from 'react';
import { maintenanceAPI, vehiclesAPI } from '../utils/api';
import StatusPill from '../components/StatusPill';
import { toast } from 'react-toastify';

const INIT = { vehicle_id:'', service_type:'Oil Change', description:'', cost:'', service_date:'', odometer_at_service:'', technician:'', next_service_date:'', next_service_km:'' };
const SERVICE_TYPES = ['Oil Change','Tire Replacement','Brake Service','Engine Repair','Transmission','Electrical','Bodywork','Inspection','Other'];

export default function MaintenanceLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterCompleted, setFilterCompleted] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const query = {};
      if (filterVehicle) query.vehicle_id = filterVehicle;
      if (filterCompleted !== '') query.is_completed = filterCompleted === 'true';
      const [ls, st, vs] = await Promise.all([
        maintenanceAPI.getAll(query),
        maintenanceAPI.getStats(),
        vehiclesAPI.getAll(),
      ]);
      setLogs(ls.data);
      setStats(st.data);
      setVehicles(vs.data.filter(v => v.status !== 'Retired'));
    } catch { toast.error('Failed to load maintenance logs.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterVehicle, filterCompleted]);

  const openAdd = () => { setEditLog(null); setForm(INIT); setShowModal(true); };
  const openEdit = (l) => {
    setEditLog(l);
    setForm({ vehicle_id:l.vehicle_id, service_type:l.service_type, description:l.description, cost:l.cost, service_date:l.service_date, odometer_at_service:l.odometer_at_service||'', technician:l.technician||'', next_service_date:l.next_service_date||'', next_service_km:l.next_service_km||'' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.service_type || !form.description || !form.cost || !form.service_date) {
      toast.error('Please fill all required fields.'); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, cost: parseFloat(form.cost), odometer_at_service: parseFloat(form.odometer_at_service)||null, next_service_km: parseFloat(form.next_service_km)||null };
      if (editLog) { await maintenanceAPI.update(editLog.id, payload); toast.success('Log updated!'); }
      else { await maintenanceAPI.create(payload); toast.success('Service log added! Vehicle status → In Shop'); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving.'); }
    finally { setSaving(false); }
  };

  const handleComplete = async (id) => {
    try { await maintenanceAPI.complete(id); toast.success('Service completed! Vehicle returned to Available.'); load(); } catch { toast.error('Failed.'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this log?')) return;
    try { await maintenanceAPI.delete(id); toast.success('Deleted.'); load(); } catch { toast.error('Failed.'); }
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:24 }}>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#f59e0b' }}>{stats.vehicles_in_shop||0}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Vehicles In Shop</div>
        </div>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#3b82f6' }}>{stats.total_logs||0}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Total Service Logs</div>
        </div>
        <div className="card" style={{ padding:16, textAlign:'center' }}>
          <div style={{ fontSize:22, fontWeight:800, color:'#ef4444' }}>₹{(stats.total_cost||0).toLocaleString()}</div>
          <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>Total Maintenance Cost</div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <div className="page-title">Maintenance & Service Logs</div>
          <div className="page-subtitle">Adding a log automatically sets vehicle status to "In Shop"</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Log Service</button>
      </div>

      <div className="filter-bar">
        <select className="filter-select" value={filterVehicle} onChange={e => setFilterVehicle(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate})</option>)}
        </select>
        <select className="filter-select" value={filterCompleted} onChange={e => setFilterCompleted(e.target.value)}>
          <option value="">All</option>
          <option value="false">Active / In Progress</option>
          <option value="true">Completed</option>
        </select>
      </div>

      <div className="table-container">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <table>
            <thead>
              <tr>
                <th>Vehicle</th><th>Service Type</th><th>Description</th><th>Cost</th>
                <th>Service Date</th><th>Odometer</th><th>Technician</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">🔧</div><div className="empty-state-title">No service logs found</div></div></td></tr>
              ) : logs.map(l => (
                <tr key={l.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{l.vehicle_name || l.vehicle_id}</td>
                  <td><span style={{ fontSize:11, background:'rgba(59,130,246,0.1)', color:'var(--accent-blue-light)', padding:'2px 8px', borderRadius:4 }}>{l.service_type}</span></td>
                  <td style={{ maxWidth:180, fontSize:12 }}>{l.description}</td>
                  <td style={{ fontWeight:600, color:'var(--accent-red)' }}>₹{l.cost?.toLocaleString()}</td>
                  <td style={{ fontSize:12 }}>{l.service_date}</td>
                  <td style={{ fontSize:12 }}>{l.odometer_at_service ? `${l.odometer_at_service} km` : '—'}</td>
                  <td style={{ fontSize:12 }}>{l.technician || '—'}</td>
                  <td>
                    <span className={`pill ${l.is_completed ? 'pill-green' : 'pill-yellow'}`} style={{ fontSize:10 }}>
                      <span className="pill-dot" />{l.is_completed ? 'Done' : 'Pending'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {!l.is_completed && <button className="btn btn-success btn-sm" onClick={() => handleComplete(l.id)}>✓</button>}
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(l)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l.id)}>🗑</button>
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
              <h2 className="modal-title">{editLog ? 'Edit Service Log' : 'Log New Service'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {!editLog && (
              <div className="alert alert-warning" style={{ marginBottom:16 }}>
                ⚠ Adding this service log will automatically set the vehicle status to <strong>In Shop</strong>, removing it from the dispatching pool.
              </div>
            )}
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Vehicle *</label>
                  <select className="form-control" value={form.vehicle_id} onChange={e=>setForm(p=>({...p,vehicle_id:e.target.value}))} required>
                    <option value="">— Select Vehicle —</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.license_plate}) — {v.status}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Service Type *</label>
                  <select className="form-control" value={form.service_type} onChange={e=>setForm(p=>({...p,service_type:e.target.value}))}>
                    {SERVICE_TYPES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'span 2' }}>
                  <label className="form-label">Description *</label>
                  <textarea className="form-control" rows={2} placeholder="Describe the service performed…" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} style={{ resize:'none' }} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (₹) *</label>
                  <input type="number" className="form-control" placeholder="2500" value={form.cost} onChange={e=>setForm(p=>({...p,cost:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Service Date *</label>
                  <input type="date" className="form-control" value={form.service_date} onChange={e=>setForm(p=>({...p,service_date:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer at Service (km)</label>
                  <input type="number" className="form-control" placeholder="12000" value={form.odometer_at_service} onChange={e=>setForm(p=>({...p,odometer_at_service:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Technician</label>
                  <input className="form-control" placeholder="Technician name" value={form.technician} onChange={e=>setForm(p=>({...p,technician:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Service Date</label>
                  <input type="date" className="form-control" value={form.next_service_date} onChange={e=>setForm(p=>({...p,next_service_date:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Next Service at (km)</label>
                  <input type="number" className="form-control" placeholder="15000" value={form.next_service_km} onChange={e=>setForm(p=>({...p,next_service_km:e.target.value}))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editLog ? 'Update Log' : 'Add Service Log')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
