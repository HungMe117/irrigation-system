import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DeviceManager from './pages/DeviceManager';
import Login from './pages/Login';
import Register from './pages/Register';
import authService from './services/authService';
import Reports from './pages/Reports'; // Đã import

// --- COMPONENT BẢO VỆ (Private Route) ---
const ProtectedRoute = () => {
    const isAuth = authService.isAuthenticated();
    return isAuth ? <Outlet /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- 1. CÁC ROUTE CÔNG KHAI --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* --- 2. CÁC ROUTE BẢO VỆ --- */}
        <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
                
                {/* Trang chủ */}
                <Route index element={<Dashboard />} /> 
                
                {/* Quản lý thiết bị */}
                <Route path="devices" element={<DeviceManager />} />
                
                {/* 👇 SỬA DÒNG NÀY: Gọi component Reports thay vì div placeholder */}
                <Route path="reports" element={<Reports />} />
            
            </Route>
        </Route>

        {/* --- 3. ROUTE 404 --- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;