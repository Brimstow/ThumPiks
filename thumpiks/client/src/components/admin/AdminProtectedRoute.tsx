import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ 
  children, 
  requiredPermissions = [] 
}) => {
  const location = useLocation();
  
  // Check if admin is authenticated
  const adminToken = localStorage.getItem('adminToken');
  const adminUserStr = localStorage.getItem('adminUser');
  
  if (!adminToken || !adminUserStr) {
    // Redirect to admin login if not authenticated
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  try {
    const adminUser = JSON.parse(adminUserStr);
    
    // Check if user has required permissions
    if (requiredPermissions.length > 0) {
      const userPermissions = adminUser.permissions || [];
      const hasAllPermissions = requiredPermissions.every(permission => 
        userPermissions.includes('*') || userPermissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        // Redirect to admin dashboard if insufficient permissions
        return <Navigate to="/admin" replace />;
      }
    }
    
    return <>{children}</>;
  } catch (error) {
    // Invalid user data, redirect to login
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }
};

export default AdminProtectedRoute;