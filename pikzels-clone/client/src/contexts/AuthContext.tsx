import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { authGet, authPost, publicPost, setTokenExpiration } from '../utils/api';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (
    email: string,
    password: string,
    name: string,
    username: string
  ) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (
    email: string
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Use authGet so expired access tokens trigger automatic refresh
        // via the refresh token cookie (valid 7 days)
        const response = await authGet('/api/user/profile');

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          // Initialize token expiration for proactive refresh (15 minutes from now)
          // This handles the case when user returns with existing session cookie
          setTokenExpiration(900);
        }
      } catch {
        // User not authenticated, ignore error
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authPost('/api/auth/login', { email, password });
      const data = await response.json();

      if (response.ok) {
        // Cookie is set automatically by browser from Set-Cookie header
        setUser(data.user);
        // Store session ID for session tracking (non-critical, may fail in Safari Private Browsing)
        try { if (data.sessionId) localStorage.setItem('sessionId', data.sessionId); } catch { /* Safari Private Browsing */ }
        // Reset session-only onboarding dismissal so Quick Edit overlay reappears on fresh login
        try { sessionStorage.removeItem('thumpiks_onboarding_session_dismissed'); } catch { /* ignore */ }
        // Initialize token expiration for proactive refresh (15 minutes)
        setTokenExpiration(900);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (email: string, password: string, name: string, username: string) => {
    try {
      const response = await authPost('/api/auth/register', { username, email, name, password });
      const data = await response.json();

      if (response.ok) {
        // Cookie is set automatically by browser from Set-Cookie header
        setUser(data.user);
        // Store session ID for session tracking (non-critical, may fail in Safari Private Browsing)
        try { if (data.sessionId) localStorage.setItem('sessionId', data.sessionId); } catch { /* Safari Private Browsing */ }
        // Initialize token expiration for proactive refresh (15 minutes)
        setTokenExpiration(900);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Registration failed' };
      }
    } catch {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const response = await publicPost('/api/auth/request-password-reset', { email });
      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message || 'If your email is registered, you will receive a password reset link.' 
        };
      } else {
        return { success: false, error: data.error || 'Failed to send password reset email' };
      }
    } catch (err) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear HttpOnly cookies
      await authPost('/api/auth/logout', {});
    } catch {
      // Ignore error, clear local state anyway
    }
    // Clear token expiration tracking
    setTokenExpiration(0);
    // Clear session ID
    try { localStorage.removeItem('sessionId'); } catch { /* Safari Private Browsing */ }
    setUser(null);
    navigate('/', { replace: true });
  };

  const value = {
    user,
    login,
    logout,
    register,
    forgotPassword,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
