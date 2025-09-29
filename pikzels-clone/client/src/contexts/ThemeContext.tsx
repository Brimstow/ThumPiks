import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check user's preferred theme from settings or system preference
    const fetchUserTheme = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Fallback to system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
        return;
      }

      try {
        const response = await fetch('/api/user/settings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          const userTheme = data.settings?.theme;
          if (userTheme === 'dark' || userTheme === 'light') {
            setTheme(userTheme);
          } else {
            // Fallback to system preference if no user preference is set
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemPrefersDark ? 'dark' : 'light');
          }
        } else {
          // Fallback to system preference if unable to fetch settings
          const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(systemPrefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Error fetching user theme preference:', error);
        // Fallback to system preference
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(systemPrefersDark ? 'dark' : 'light');
      }
    };

    fetchUserTheme();
  }, []);

  useEffect(() => {
    // Apply theme to document element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      
      // Save to user settings if logged in
      const token = localStorage.getItem('token');
      if (token) {
        fetch('/api/user/settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            settings: {
              theme: newTheme
            }
          })
        }).catch(error => {
          console.error('Error saving theme preference:', error);
        });
      }
      
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};