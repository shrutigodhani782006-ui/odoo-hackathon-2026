import React from 'react';

export default function KPICard({ icon, label, value, color = '#3b82f6', trend, trendLabel, suffix = '' }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div className="kpi-value" style={{ color }}>
        {value !== undefined && value !== null ? value : '—'}{suffix}
      </div>
      <div className="kpi-label">{label}</div>
      {trend !== undefined && (
        <div className="kpi-trend" style={{ color: trend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% {trendLabel || ''}
        </div>
      )}
    </div>
  );
}
