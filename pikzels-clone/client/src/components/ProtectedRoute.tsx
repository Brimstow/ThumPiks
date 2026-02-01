import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authGet } from '../utils/api';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check auth via HttpOnly cookie
        const response = await authGet('/api/user/profile');

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Show loading indicator while checking auth
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-gray-900 dark:text-white">Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    navigate('/login', { replace: true });
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-gray-900 dark:text-white">
          Redirecting to login...
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
