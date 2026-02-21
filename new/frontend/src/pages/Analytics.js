import React, { useState, useEffect } from 'react';
import { analyticsAPI, vehiclesAPI } from '../utils/api';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const CHART_OPTS = (title) => ({
  responsive: true,
  plugins: { legend: { labels: { color: '#8b92a9', font: { size: 11 } } }, title: { display: false } },
  scales: {
    x: { ticks: { color: '#555e76', font: { size: 10 } }, grid: { color: '#2d3348' } },
    y: { ticks: { color: '#555e76', font: { size: 10 } }, grid: { color: '#2d3348' } },
  },
});

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [roi, setRoi] = useState([]);
  const [fuelEff, setFuelEff] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [tripPerf, setTripPerf] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [ov, r, fe, mc, tp] = await Promise.all([
        analyticsAPI.overview(),
        analyticsAPI.vehicleROI(),
        analyticsAPI.fuelEfficiency(),
        analyticsAPI.monthlyCosts(),
        analyticsAPI.tripPerformance(),
      ]);
      setOverview(ov.data);
      setRoi(r.data);
      setFuelEff(fe.data);
      setMonthly(mc.data);
      setTripPerf(tp.data);
    } catch { toast.error('Failed to load analytics.'); }
    finally { setLoading(false); }
  };

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) { toast.warning('No data to export.'); return; }
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filename}.csv`);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  // Chart Data
  const monthlyCostChart = {
    labels: monthly.map(m => m.month),
    datasets: [
      { label: 'Fuel Cost ₹', data: monthly.map(m => m.fuel_cost), backgroundColor: 'rgba(249,115,22,0.7)', borderRadius: 4 },
      { label: 'Maintenance ₹', data: monthly.map(m => m.maintenance_cost), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
    ],
  };

  const roiChart = {
    labels: roi.slice(0,8).map(v => v.name),
    datasets: [
      { label: 'Revenue ₹', data: roi.slice(0,8).map(v => v.revenue), backgroundColor: 'rgba(16,185,129,0.7)', borderRadius: 4 },
      { label: 'Ops Cost ₹', data: roi.slice(0,8).map(v => v.total_operational_cost), backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
    ],
  };

  const fuelEffChart = {
    labels: fuelEff.slice(0,8).map(v => v.vehicle_name || v.license_plate),
    datasets: [{
      label: 'km/L',
      data: fuelEff.slice(0,8).map(v => v.fuel_efficiency_km_per_l),
      backgroundColor: 'rgba(59,130,246,0.7)',
      borderRadius: 4,
    }],
  };

  const tripDonut = {
    labels: ['Completed', 'Dispatched', 'Draft', 'Cancelled'],
    datasets: [{
      data: [tripPerf.completed||0, tripPerf.dispatched||0, tripPerf.draft||0, tripPerf.cancelled||0],
      backgroundColor: ['#10b981', '#3b82f6', '#8b92a9', '#ef4444'],
      borderColor: '#1e2435',
      borderWidth: 2,
    }],
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Analytics & Financial Reports</div>
          <div className="page-subtitle">Fleet KPIs, ROI analysis, and operational insights</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-outline" onClick={() => exportCSV(roi, 'vehicle_roi')}>📥 Export ROI CSV</button>
          <button className="btn btn-outline" onClick={() => exportCSV(fuelEff, 'fuel_efficiency')}>📥 Export Fuel CSV</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[{k:'overview',l:'Overview'},{k:'roi',l:'Vehicle ROI'},{k:'fuel',l:'Fuel Efficiency'},{k:'monthly',l:'Monthly Costs'}].map(t=>(
          <button key={t.k} className={`tab-btn ${activeTab===t.k?'active':''}`} onClick={()=>setActiveTab(t.k)}>{t.l}</button>
        ))}
      </div>

      {activeTab==='overview' && (
        <div>
          {/* Overview KPIs */}
          <div className="kpi-grid" style={{ marginBottom:28 }}>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}>💰</div>
              <div className="kpi-value" style={{ color:'#10b981' }}>₹{(overview?.total_revenue||0).toLocaleString()}</div>
              <div className="kpi-label">Total Revenue</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background:'rgba(239,68,68,0.1)', color:'#ef4444' }}>⛽</div>
              <div className="kpi-value" style={{ color:'#ef4444' }}>₹{(overview?.total_operational_cost||0).toLocaleString()}</div>
              <div className="kpi-label">Total Operational Cost</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background:'rgba(59,130,246,0.1)', color:'#3b82f6' }}>📈</div>
              <div className="kpi-value" style={{ color: overview?.net_profit >= 0 ? '#10b981' : '#ef4444' }}>
                ₹{Math.abs(overview?.net_profit||0).toLocaleString()}
              </div>
              <div className="kpi-label">{overview?.net_profit >= 0 ? 'Net Profit' : 'Net Loss'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-icon" style={{ background:'rgba(139,92,246,0.1)', color:'#8b5cf6' }}>✅</div>
              <div className="kpi-value" style={{ color:'#8b5cf6' }}>{tripPerf.completion_rate||0}%</div>
              <div className="kpi-label">Trip Completion Rate</div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
            <div className="card">
              <div className="card-title" style={{ marginBottom:16 }}>Monthly Cost Breakdown</div>
              {monthly.length > 0 ? <Bar data={monthlyCostChart} options={CHART_OPTS()} height={200} /> : <div className="empty-state" style={{ padding:30 }}><div>No monthly data yet</div></div>}
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom:16 }}>Trip Status Distribution</div>
              {tripPerf.total > 0 ? (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:24 }}>
                  <div style={{ maxWidth:160 }}><Doughnut data={tripDonut} options={{ plugins: { legend: { display: false } } }} /></div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[{label:'Completed', color:'#10b981', val:tripPerf.completed},{label:'Dispatched', color:'#3b82f6', val:tripPerf.dispatched},{label:'Draft', color:'#8b92a9', val:tripPerf.draft},{label:'Cancelled', color:'#ef4444', val:tripPerf.cancelled}].map(item=>(
                      <div key={item.label} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:'50%', background:item.color }} />
                        <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{item.label}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)', marginLeft:'auto' }}>{item.val||0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="empty-state" style={{ padding:30 }}><div>No trip data yet</div></div>}
            </div>
          </div>
        </div>
      )}

      {activeTab==='roi' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-title" style={{ marginBottom:16 }}>Revenue vs Operational Cost by Vehicle</div>
            {roi.length > 0 ? <Bar data={roiChart} options={CHART_OPTS()} height={180} /> : <div className="empty-state" style={{ padding:30 }}><div>No vehicle data yet</div></div>}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th><th>Type</th><th>Revenue</th><th>Fuel Cost</th>
                  <th>Maint. Cost</th><th>Ops Cost</th><th>Acq. Cost</th><th>ROI %</th><th>Trips</th>
                </tr>
              </thead>
              <tbody>
                {roi.length === 0 ? (
                  <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">📊</div><div>No data yet</div></div></td></tr>
                ) : roi.map(v => (
                  <tr key={v.vehicle_id}>
                    <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{v.name}</td>
                    <td><span style={{ fontSize:11, color:'var(--accent-blue-light)' }}>{v.vehicle_type}</span></td>
                    <td style={{ color:'var(--accent-green)' }}>₹{v.revenue?.toLocaleString()}</td>
                    <td style={{ color:'var(--accent-orange)' }}>₹{v.fuel_cost?.toLocaleString()}</td>
                    <td style={{ color:'var(--accent-red)' }}>₹{v.maintenance_cost?.toLocaleString()}</td>
                    <td>₹{v.total_operational_cost?.toLocaleString()}</td>
                    <td>₹{v.acquisition_cost?.toLocaleString()}</td>
                    <td>
                      <span style={{ fontWeight:700, color: v.roi_percent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                        {v.roi_percent}%
                      </span>
                    </td>
                    <td>{v.trips_completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab==='fuel' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-title" style={{ marginBottom:16 }}>Fuel Efficiency (km/L) by Vehicle</div>
            {fuelEff.length > 0 ? <Bar data={fuelEffChart} options={CHART_OPTS()} height={180} /> : <div className="empty-state" style={{ padding:30 }}><div>No fuel data logged yet</div></div>}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Vehicle</th><th>License Plate</th><th>Total Liters</th><th>Fuel Cost</th><th>Distance (km)</th><th>Efficiency (km/L)</th></tr>
              </thead>
              <tbody>
                {fuelEff.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">⛽</div><div>No fuel data yet</div></div></td></tr>
                ) : fuelEff.map(v => (
                  <tr key={v.vehicle_id}>
                    <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{v.vehicle_name}</td>
                    <td style={{ fontFamily:'monospace', fontSize:12 }}>{v.license_plate}</td>
                    <td>{v.total_liters}L</td>
                    <td style={{ color:'var(--accent-orange)' }}>₹{v.total_fuel_cost?.toLocaleString()}</td>
                    <td>{v.distance_km} km</td>
                    <td>
                      <span style={{ fontWeight:700, color: v.fuel_efficiency_km_per_l >= 12 ? 'var(--accent-green)' : v.fuel_efficiency_km_per_l >= 8 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                        {v.fuel_efficiency_km_per_l} km/L
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab==='monthly' && (
        <div>
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-title" style={{ marginBottom:16 }}>Monthly Cost Trend</div>
            {monthly.length > 0 ? <Bar data={monthlyCostChart} options={CHART_OPTS()} height={200} /> : <div className="empty-state" style={{ padding:30 }}><div>No monthly data yet</div></div>}
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr><th>Month</th><th>Fuel Cost</th><th>Maintenance Cost</th><th>Total Cost</th></tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr><td colSpan={4}><div className="empty-state"><div className="empty-state-icon">📅</div><div>No monthly data yet</div></div></td></tr>
                ) : monthly.map(m => (
                  <tr key={m.month}>
                    <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{m.month}</td>
                    <td style={{ color:'var(--accent-orange)' }}>₹{m.fuel_cost?.toLocaleString()}</td>
                    <td style={{ color:'var(--accent-red)' }}>₹{m.maintenance_cost?.toLocaleString()}</td>
                    <td style={{ fontWeight:700, color:'var(--text-primary)' }}>₹{m.total?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
