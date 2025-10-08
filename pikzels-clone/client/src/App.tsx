import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import ShadcnTest from './components/ShadcnTest';

// Admin Components
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import SitemapAdmin from './components/admin/SitemapAdmin';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

// Simple test component
const TestPage = () => (
  <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
    <h1 style={{ color: '#333' }}>🎉 App is Working!</h1>
    <p style={{ color: '#666' }}>This confirms React is rendering properly.</p>
    <div style={{ marginTop: '20px' }}>
      <h3>Test Navigation:</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
        <a href="/" style={{ color: '#007bff', textDecoration: 'underline' }}>Home (Landing)</a>
        <a href="/login" style={{ color: '#007bff', textDecoration: 'underline' }}>Login</a>
        <a href="/register" style={{ color: '#007bff', textDecoration: 'underline' }}>Register</a>
        <a href="/forgot-password" style={{ color: '#007bff', textDecoration: 'underline' }}>Forgot Password</a>
      </div>
    </div>
  </div>
);

function App() {
  useEffect(() => {
    console.log('🚀 App component mounted successfully!');
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              
              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={
                  <AdminProtectedRoute requiredPermissions={['users.view']}>
                    <UserManagement />
                  </AdminProtectedRoute>
                } />
                <Route path="sitemap" element={
                  <AdminProtectedRoute requiredPermissions={['content.view']}>
                    <SitemapAdmin />
                  </AdminProtectedRoute>
                } />
              </Route>
              
              {/* Test pages */}
              <Route path="/test" element={<TestPage />} />
              <Route path="/shadcn-test" element={<ShadcnTest />} />
              
              {/* Catch-all for testing */}
              <Route path="*" element={<TestPage />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
