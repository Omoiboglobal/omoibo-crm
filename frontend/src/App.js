import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/sales/Sales';
import Inventory from './pages/inventory/Inventory';
import Logistics from './pages/logistics/Logistics';
import Finance from './pages/finance/Finance';
import HR from './pages/hr/HR';
import Facility from './pages/facility/Facility';
import Admin from './pages/admin/Admin';
import Executive from './pages/executive/Executive';
import AIPage from './pages/ai/AI';

const Spinner = () => (
  <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', flexDirection:'column', gap:12 }}>
    <div style={{ width:36, height:36, border:'3px solid #E2E8F0', borderTop:'3px solid #1B3A6B', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    <div style={{ fontSize:13, color:'#94A3B8' }}>Loading Omoibo CRM...</div>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const ProtectedRoute = ({ children, permission }) => {
  const { user, loading, hasPermission } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  if (permission && !hasPermission(permission)) return (
    <div style={{ textAlign:'center', padding:'80px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🔒</div>
      <div style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>Access Restricted</div>
      <div style={{ color:'#64748B' }}>Your role does not have permission to view this module.</div>
    </div>
  );
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="sales"     element={<ProtectedRoute permission="view_sales"><Sales /></ProtectedRoute>} />
        <Route path="inventory" element={<ProtectedRoute permission="view_inventory"><Inventory /></ProtectedRoute>} />
        <Route path="logistics" element={<ProtectedRoute permission="view_logistics"><Logistics /></ProtectedRoute>} />
        <Route path="finance"   element={<ProtectedRoute permission="view_finance"><Finance /></ProtectedRoute>} />
        <Route path="hr"        element={<ProtectedRoute permission="view_hr"><HR /></ProtectedRoute>} />
        <Route path="facility"  element={<ProtectedRoute permission="view_facility"><Facility /></ProtectedRoute>} />
        <Route path="executive" element={<ProtectedRoute><Executive /></ProtectedRoute>} />
        <Route path="admin"     element={<ProtectedRoute><Admin /></ProtectedRoute>} />
        <Route path="ai"        element={<ProtectedRoute><AIPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{ style:{ fontSize:13, borderRadius:8 }, duration:3000 }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
