/**
 * Session Persistence Hook
 * 
 * This hook handles session persistence across server restarts,
 * automatically detecting when servers restart and maintaining login state
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface SessionData {
  token: string;
  user: {
    id: string;
    type: 'admin' | 'user';
    permissions: string[];
  };
  sessionId: string;
  lastActivity: number;
}

interface ServerStatus {
  backendOnline: boolean;
  frontendOnline: boolean;
  lastRestart: number;
  reconnecting: boolean;
}

export const useSessionPersistence = () => {
  const [session, setSession] = useState<SessionData | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    backendOnline: true,
    frontendOnline: true,
    lastRestart: Date.now(),
    reconnecting: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const healthCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const maxReconnectAttempts = 10;

  /**
   * Store session data in localStorage and state
   */
  const persistSession = useCallback((sessionData: SessionData) => {
    try {
      localStorage.setItem('thumpiks_session', JSON.stringify(sessionData));
      setSession(sessionData);
      console.log('✅ Session persisted successfully');
    } catch (error) {
      console.error('❌ Error persisting session:', error);
    }
  }, []);

  /**
   * Retrieve session from localStorage
   */
  const loadPersistedSession = useCallback((): SessionData | null => {
    try {
      const stored = localStorage.getItem('thumpiks_session');
      if (stored) {
        const sessionData = JSON.parse(stored);
        
        // Check if session is not too old (24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        if (Date.now() - sessionData.lastActivity < maxAge) {
          return sessionData;
        } else {
          localStorage.removeItem('thumpiks_session');
          console.log('🕒 Session expired, removed from storage');
        }
      }
    } catch (error) {
      console.error('❌ Error loading persisted session:', error);
      localStorage.removeItem('thumpiks_session');
    }
    return null;
  }, []);

  /**
   * Clear session from storage and state
   */
  const clearSession = useCallback(() => {
    localStorage.removeItem('thumpiks_session');
    setSession(null);
    console.log('🗑️ Session cleared');
  }, []);

  /**
   * Check server health
   */
  const checkServerHealth = useCallback(async (): Promise<ServerStatus> => {
    const status: ServerStatus = {
      backendOnline: false,
      frontendOnline: true, // Assume frontend is online if this code is running
      lastRestart: Date.now(),
      reconnecting: false
    };

    try {
      // Check backend health with 5s timeout via AbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        status.backendOnline = true;
        
        // Check for server restart indicator
        const restartHeader = response.headers.get('X-Server-Restart');
        if (restartHeader) {
          status.lastRestart = parseInt(restartHeader);
        }
      }
    } catch (error) {
      console.warn('⚠️ Backend health check failed:', error);
      status.backendOnline = false;
    }

    return status;
  }, []);

  /**
   * Validate current session with backend
   */
  const validateSession = useCallback(async (sessionData: SessionData): Promise<boolean> => {
    try {
      const response = await fetch(`/admin/auth/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${sessionData.token}`,
          'Content-Type': 'application/json',
          'X-Session-ID': sessionData.sessionId
        }
      });

      if (response.ok) {
        // Update last activity
        sessionData.lastActivity = Date.now();
        persistSession(sessionData);
        return true;
      } else if (response.status === 401) {
        console.log('🔒 Session validation failed - token invalid');
        clearSession();
        return false;
      }
    } catch (error) {
      console.warn('⚠️ Session validation failed:', error);
    }
    
    return false;
  }, [persistSession, clearSession]);

  /**
   * Attempt to reconnect and restore session
   */
  const attemptReconnection = useCallback(async () => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('💥 Max reconnection attempts reached');
      setServerStatus(prev => ({ ...prev, reconnecting: false }));
      return;
    }

    setServerStatus(prev => ({ ...prev, reconnecting: true }));
    setReconnectAttempts(prev => prev + 1);

    console.log(`🔄 Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`);

    const status = await checkServerHealth();
    setServerStatus(prev => ({ ...prev, ...status }));

    if (status.backendOnline) {
      // Server is back online, try to validate session
      const persistedSession = loadPersistedSession();
      if (persistedSession) {
        const isValid = await validateSession(persistedSession);
        if (isValid) {
          console.log('✅ Session restored successfully after reconnection');
          setReconnectAttempts(0);
          setServerStatus(prev => ({ ...prev, reconnecting: false }));
          return;
        }
      }
      
      setReconnectAttempts(0);
      setServerStatus(prev => ({ ...prev, reconnecting: false }));
    } else {
      // Still offline, try again after delay
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff, max 10s
      reconnectTimeout.current = setTimeout(() => {
        attemptReconnection();
      }, delay);
    }
  }, [reconnectAttempts, checkServerHealth, loadPersistedSession, validateSession]);

  /**
   * Start monitoring server health
   */
  const startHealthMonitoring = useCallback(() => {
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current);
    }

    healthCheckInterval.current = setInterval(async () => {
      const status = await checkServerHealth();
      
      setServerStatus(prevStatus => {
        // If backend was offline and is now online, attempt session restoration
        if (!prevStatus.backendOnline && status.backendOnline && session) {
          console.log('🔄 Backend came back online, validating session...');
          validateSession(session);
        }
        
        // If backend went offline, start reconnection process
        if (prevStatus.backendOnline && !status.backendOnline) {
          console.log('⚠️ Backend went offline, starting reconnection...');
          attemptReconnection();
        }

        return { ...prevStatus, ...status };
      });
    }, 5000); // Check every 5 seconds
  }, [checkServerHealth, session, validateSession, attemptReconnection]);

  /**
   * Stop monitoring
   */
  const stopHealthMonitoring = useCallback(() => {
    if (healthCheckInterval.current) {
      clearInterval(healthCheckInterval.current);
      healthCheckInterval.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  /**
   * Initialize session on mount
   */
  useEffect(() => {
    const initializeSession = async () => {
      setIsLoading(true);
      
      // Load persisted session
      const persistedSession = loadPersistedSession();
      if (persistedSession) {
        setSession(persistedSession);
        
        // Validate with backend if online
        const status = await checkServerHealth();
        setServerStatus(status);
        
        if (status.backendOnline) {
          await validateSession(persistedSession);
        }
      } else {
        // No persisted session, just check server status
        const status = await checkServerHealth();
        setServerStatus(status);
      }

      setIsLoading(false);
      
      // Start health monitoring
      startHealthMonitoring();
    };

    initializeSession();

    // Cleanup on unmount
    return () => {
      stopHealthMonitoring();
    };
  }, [loadPersistedSession, checkServerHealth, validateSession, startHealthMonitoring, stopHealthMonitoring]);

  /**
   * Login function
   */
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        const sessionData: SessionData = {
          token: data.token,
          user: data.user,
          sessionId: data.sessionId,
          lastActivity: Date.now()
        };
        
        persistSession(sessionData);
        console.log('✅ Login successful, session persisted');
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.message || 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: 'Network error - server may be restarting' };
    } finally {
      setIsLoading(false);
    }
  }, [persistSession]);

  /**
   * Logout function
   */
  const logout = useCallback(async () => {
    if (session) {
      try {
        // Notify backend of logout
        await fetch(`/admin/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.token}`,
            'X-Session-ID': session.sessionId
          }
        });
      } catch (error) {
        console.warn('⚠️ Logout request failed (server may be offline):', error);
      }
    }
    
    clearSession();
    console.log('👋 Logged out successfully');
  }, [session, clearSession]);

  return {
    session,
    serverStatus,
    isLoading,
    login,
    logout,
    clearSession,
    isAuthenticated: !!session,
    isServerOnline: serverStatus.backendOnline && serverStatus.frontendOnline,
    isReconnecting: serverStatus.reconnecting
  };
};