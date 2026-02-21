import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserProfile from './pages/UserProfile';
import Dashboard from './pages/Dashboard';
import VehicleRegistry from './pages/VehicleRegistry';
import TripDispatcher from './pages/TripDispatcher';
import MaintenanceLogs from './pages/MaintenanceLogs';
import FuelExpense from './pages/FuelExpense';
import DriverProfiles from './pages/DriverProfiles';
import Analytics from './pages/Analytics';

function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-primary)' }}>
      <div className="spinner" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vehicles" element={<VehicleRegistry />} />
            <Route path="/trips" element={<TripDispatcher />} />
            <Route path="/maintenance" element={<MaintenanceLogs />} />
            <Route path="/fuel" element={<FuelExpense />} />
            <Route path="/drivers" element={<DriverProfiles />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer position="bottom-right" theme="dark" autoClose={3000} />
    </AuthProvider>
  );
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}
