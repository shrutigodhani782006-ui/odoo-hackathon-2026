import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fleetflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fleetflow_token');
      localStorage.removeItem('fleetflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  seedAdmin: () => api.post('/auth/seed-admin'),
  seedData:  () => api.post('/auth/seed-data'),
};

// ─── Vehicles ────────────────────────────────────────────────────────────────
export const vehiclesAPI = {
  getAll: (params) => api.get('/vehicles/', { params }),
  getAvailable: () => api.get('/vehicles/available'),
  getStats: () => api.get('/vehicles/stats'),
  getOne: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles/', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  updateStatus: (id, status) => api.patch(`/vehicles/${id}/status`, null, { params: { status } }),
  retire: (id) => api.patch(`/vehicles/${id}/retire`),
  delete: (id) => api.delete(`/vehicles/${id}`),
};

// ─── Drivers ─────────────────────────────────────────────────────────────────
export const driversAPI = {
  getAll: (params) => api.get('/drivers/', { params }),
  getAvailable: () => api.get('/drivers/available'),
  getStats: () => api.get('/drivers/stats'),
  getExpiring: (days) => api.get('/drivers/expiring-licenses', { params: { days } }),
  getOne: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers/', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  updateStatus: (id, status) => api.patch(`/drivers/${id}/status`, null, { params: { status } }),
  delete: (id) => api.delete(`/drivers/${id}`),
};

// ─── Trips ───────────────────────────────────────────────────────────────────
export const tripsAPI = {
  getAll: (params) => api.get('/trips/', { params }),
  getStats: () => api.get('/trips/stats'),
  getOne: (id) => api.get(`/trips/${id}`),
  create: (data) => api.post('/trips/', data),
  dispatch: (id) => api.patch(`/trips/${id}/dispatch`),
  complete: (id, data) => api.patch(`/trips/${id}/complete`, data),
  cancel: (id) => api.patch(`/trips/${id}/cancel`),
  delete: (id) => api.delete(`/trips/${id}`),
};

// ─── Maintenance ─────────────────────────────────────────────────────────────
export const maintenanceAPI = {
  getAll: (params) => api.get('/maintenance/', { params }),
  getStats: () => api.get('/maintenance/stats'),
  getOne: (id) => api.get(`/maintenance/${id}`),
  create: (data) => api.post('/maintenance/', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
  complete: (id) => api.patch(`/maintenance/${id}/complete`),
  delete: (id) => api.delete(`/maintenance/${id}`),
};

// ─── Fuel ────────────────────────────────────────────────────────────────────
export const fuelAPI = {
  getAll: (params) => api.get('/fuel/', { params }),
  getStats: () => api.get('/fuel/stats'),
  getVehicleSummary: (vehicleId) => api.get(`/fuel/vehicle/${vehicleId}/summary`),
  getOne: (id) => api.get(`/fuel/${id}`),
  create: (data) => api.post('/fuel/', data),
  update: (id, data) => api.put(`/fuel/${id}`, data),
  delete: (id) => api.delete(`/fuel/${id}`),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  vehicleROI: () => api.get('/analytics/vehicle-roi'),
  fuelEfficiency: () => api.get('/analytics/fuel-efficiency'),
  monthlyCosts: () => api.get('/analytics/monthly-costs'),
  tripPerformance: () => api.get('/analytics/trip-performance'),
};

export default api;
