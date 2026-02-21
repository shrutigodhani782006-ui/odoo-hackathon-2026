import React, { useState, useEffect } from 'react';
import { driversAPI } from '../utils/api';
import StatusPill from '../components/StatusPill';
import { toast } from 'react-toastify';

const INIT = { name:'', employee_id:'', phone:'', license_number:'', license_expiry:'', license_categories:[], status:'Off Duty' };
const CATS = ['Truck','Van','Bike','All'];
const STATUSES = ['On Duty','Off Duty','Suspended'];

export default function DriverProfiles() {
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({});
  const [expiring, setExpiring] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(INIT);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [ds, st, ex] = await Promise.all([driversAPI.getAll(), driversAPI.getStats(), driversAPI.getExpiring(30)]);
      setDrivers(ds.data);
      setStats(st.data);
      setExpiring(ex.data);
    } catch { toast.error('Failed to load drivers.'); }
    finally { setLoading(false); }
  };

  const openAdd = () => { setEditDriver(null); setForm(INIT); setShowModal(true); };
  const openEdit = (d) => {
    setEditDriver(d);
    setForm({ name:d.name, employee_id:d.employee_id, phone:d.phone||'', license_number:d.license_number, license_expiry:d.license_expiry||'', license_categories:d.license_categories||[], status:d.status });
    setShowModal(true);
  };

  const toggleCategory = (cat) => {
    setForm(p => ({ ...p, license_categories: p.license_categories.includes(cat) ? p.license_categories.filter(c=>c!==cat) : [...p.license_categories, cat] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.employee_id || !form.license_number || !form.license_expiry) {
      toast.error('Name, Employee ID, License No. and Expiry are required.'); return;
    }
    setSaving(true);
    try {
      if (editDriver) { await driversAPI.update(editDriver.id, form); toast.success('Driver updated!'); }
      else { await driversAPI.create(form); toast.success('Driver added!'); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving.'); }
    finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    try { await driversAPI.updateStatus(id, status); toast.success('Status updated.'); load(); } catch { toast.error('Failed.'); }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete ${d.name}?`)) return;
    try { await driversAPI.delete(d.id); toast.success('Deleted.'); load(); } catch { toast.error('Failed.'); }
  };

  const filtered = drivers.filter(d => {
    if (activeTab === 'expiring' && (d.days_until_expiry > 30 || d.days_until_expiry < 0)) return false;
    if (activeTab === 'suspended' && d.status !== 'Suspended') return false;
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.employee_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const safetyColor = (score) => score >= 90 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:24 }}>
        {[
          { label:'Total Drivers', value:stats.total||0, color:'#3b82f6' },
          { label:'On Duty', value:stats.on_duty||0, color:'#10b981' },
          { label:'On Trip', value:stats.on_trip||0, color:'#60a5fa' },
          { label:'Off Duty', value:stats.off_duty||0, color:'#8b92a9' },
          { label:'Suspended', value:stats.suspended||0, color:'#ef4444' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:16, textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Expiry alerts */}
      {expiring.length > 0 && (
        <div className="alert alert-warning" style={{ marginBottom:20 }}>
          ⚠ <strong>{expiring.length} driver(s)</strong> have licenses expiring within 30 days: {expiring.map(d=>d.name).join(', ')}
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-title">Driver Profiles</div>
          <div className="page-subtitle">Safety, compliance and performance management</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Driver</button>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div className="tabs" style={{ marginBottom:0 }}>
          {[{key:'all',label:'All Drivers'},{key:'expiring',label:`⚠ Expiring (${expiring.length})`},{key:'suspended',label:`🔴 Suspended (${stats.suspended||0})`}].map(t => (
            <button key={t.key} className={`tab-btn ${activeTab===t.key?'active':''}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>
          ))}
        </div>
        <input className="search-input" placeholder="Search by name or ID…" value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        {loading ? <div className="loading-center"><div className="spinner" /></div> : (
          <table>
            <thead>
              <tr>
                <th>Driver</th><th>Employee ID</th><th>License</th><th>Expiry</th>
                <th>Categories</th><th>Trips</th><th>Safety Score</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">No drivers found</div></div></td></tr>
              ) : filtered.map(d => (
                <tr key={d.id}>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>
                    {d.name}
                    {!d.is_license_valid && <span style={{ marginLeft:6, fontSize:10, background:'rgba(239,68,68,0.15)', color:'#ef4444', padding:'1px 6px', borderRadius:4 }}>EXPIRED</span>}
                  </td>
                  <td style={{ fontFamily:'monospace', fontSize:12 }}>{d.employee_id}</td>
                  <td style={{ fontSize:12 }}>{d.license_number}</td>
                  <td>
                    <div style={{ fontSize:12, color: d.days_until_expiry <= 30 ? (d.days_until_expiry <= 0 ? 'var(--accent-red)' : 'var(--accent-yellow)') : 'var(--text-secondary)' }}>
                      {d.license_expiry}
                      {d.days_until_expiry >= 0 && d.days_until_expiry <= 30 && <div style={{ fontSize:10 }}>{d.days_until_expiry}d left</div>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                      {(d.license_categories||[]).map(c => <span key={c} style={{ fontSize:10, padding:'1px 6px', background:'rgba(59,130,246,0.1)', color:'var(--accent-blue-light)', borderRadius:4 }}>{c}</span>)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize:12 }}>{d.trips_completed}/{d.trips_total}</div>
                    <div style={{ fontSize:10, color:'var(--text-muted)' }}>{d.completion_rate}% completion</div>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', minWidth:50 }}>
                        <div style={{ height:'100%', width:`${d.safety_score||0}%`, background:safetyColor(d.safety_score||0), borderRadius:3, transition:'width 0.5s' }} />
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:safetyColor(d.safety_score||0) }}>{d.safety_score||0}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <StatusPill status={d.status} size="sm" />
                      {d.status !== 'On Trip' && (
                        <select className="filter-select" style={{ fontSize:10, padding:'2px 6px' }} value={d.status} onChange={e=>handleStatusChange(d.id, e.target.value)}>
                          {STATUSES.map(s => <option key={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(d)}>✏</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>🗑</button>
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
              <h2 className="modal-title">{editDriver ? 'Edit Driver Profile' : 'Add New Driver'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" placeholder="Alex Johnson" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Employee ID *</label>
                  <input className="form-control" placeholder="EMP-001" value={form.employee_id} onChange={e=>setForm(p=>({...p,employee_id:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-control" placeholder="+91 9876543210" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">License Number *</label>
                  <input className="form-control" placeholder="MH0120220001234" value={form.license_number} onChange={e=>setForm(p=>({...p,license_number:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">License Expiry Date *</label>
                  <input type="date" className="form-control" value={form.license_expiry} onChange={e=>setForm(p=>({...p,license_expiry:e.target.value}))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'span 2' }}>
                  <label className="form-label">License Categories (Eligible Vehicle Types)</label>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {CATS.map(c => (
                      <button
                        key={c} type="button"
                        onClick={() => toggleCategory(c)}
                        style={{
                          padding:'6px 14px', borderRadius:6, border:`1px solid ${form.license_categories.includes(c) ? 'var(--accent-blue)' : 'var(--border)'}`,
                          background: form.license_categories.includes(c) ? 'rgba(59,130,246,0.15)' : 'transparent',
                          color: form.license_categories.includes(c) ? 'var(--accent-blue-light)' : 'var(--text-muted)',
                          cursor:'pointer', fontSize:13, fontFamily:'inherit', transition:'all 0.15s',
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : (editDriver ? 'Update Driver' : 'Add Driver')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
