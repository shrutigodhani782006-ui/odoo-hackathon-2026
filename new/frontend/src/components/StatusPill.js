import React from 'react';

const STATUS_MAP = {
  // Vehicle statuses
  'Available': 'pill-green',
  'On Trip': 'pill-blue',
  'In Shop': 'pill-yellow',
  'Retired': 'pill-gray',
  // Driver statuses
  'On Duty': 'pill-green',
  'Off Duty': 'pill-gray',
  'Suspended': 'pill-red',
  // Trip statuses
  'Draft': 'pill-gray',
  'Dispatched': 'pill-blue',
  'Completed': 'pill-green',
  'Cancelled': 'pill-red',
  // Vehicle types
  'Truck': 'pill-orange',
  'Van': 'pill-cyan',
  'Bike': 'pill-purple',
  // Generic
  'Active': 'pill-green',
  'Inactive': 'pill-gray',
  'Expired': 'pill-red',
  'Valid': 'pill-green',
  'Warning': 'pill-yellow',
};

export default function StatusPill({ status, size = 'md' }) {
  const cls = STATUS_MAP[status] || 'pill-gray';
  return (
    <span className={`pill ${cls}`} style={size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : {}}>
      <span className="pill-dot" />
      {status}
    </span>
  );
}
