import React, { createContext, useContext, useState, useEffect } from 'react';

export interface DashboardPreferences {
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: number;
  compactMode: boolean;
  showAnimations: boolean;
  defaultTimeFilter: string;
  favoriteWidgets: string[];
  widgetLayout: 'grid' | 'list';
  notificationSettings: {
    desktop: boolean;
    email: boolean;
    critical: boolean;
  };
}

interface DashboardContextType {
  preferences: DashboardPreferences;
  updatePreferences: (updates: Partial<DashboardPreferences>) => void;
  resetPreferences: () => void;
  isCustomizing: boolean;
  setIsCustomizing: (value: boolean) => void;
}

const defaultPreferences: DashboardPreferences = {
  theme: 'light',
  refreshInterval: 5000,
  compactMode: false,
  showAnimations: true,
  defaultTimeFilter: '7d',
  favoriteWidgets: ['users', 'revenue', 'thumbnails'],
  widgetLayout: 'grid',
  notificationSettings: {
    desktop: true,
    email: false,
    critical: true
  }
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('dashboard-preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.warn('Failed to parse saved preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage when they change
  useEffect(() => {
    localStorage.setItem('dashboard-preferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (updates: Partial<DashboardPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    localStorage.removeItem('dashboard-preferences');
  };

  return (
    <DashboardContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        isCustomizing,
        setIsCustomizing
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};