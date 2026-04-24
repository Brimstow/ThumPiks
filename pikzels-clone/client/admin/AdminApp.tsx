import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import AdminLogin from '../src/components/admin/AdminLogin';
import AdminLayout from '../src/components/admin/AdminLayout';
import AdminProtectedRoute from '../src/components/admin/AdminProtectedRoute';
import { renderAdminRoutes } from '../src/features/admin';

function AdminApp() {
  return (
    <Router basename="/admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            {renderAdminRoutes()}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default AdminApp;
