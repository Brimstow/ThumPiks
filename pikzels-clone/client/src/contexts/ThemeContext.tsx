import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeName = 'ocean' | 'sunset' | 'forest' | 'midnight' | 'galaxy' | 'aurora' | 'cyberpunk';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    hero: string;
    card: string;
    button: string;
    sidebar: string;
  };
  effects: {
    glow: string;
    shadow: string;
    blur: string;
    particles: string[];
  };
  animations: {
    duration: string;
    easing: string;
  };
}

const themes: Record<ThemeName, Theme> = {
  ocean: {
    name: 'ocean',
    displayName: '🌊 Ocean Breeze',
    description: 'Cool blues and teals inspired by ocean waves',
    colors: {
      primary: '#0ea5e9',
      secondary: '#0891b2',
      accent: '#06b6d4',
      background: '#f0f9ff',
      surface: '#ffffff',
      text: '#0f172a',
      textSecondary: '#64748b',
      success: '#059669',
      warning: '#d97706',
      error: '#dc2626',
      info: '#2563eb'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
      secondary: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      hero: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #bae6fd 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,249,255,0.8) 100%)',
      button: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
      sidebar: 'linear-gradient(180deg, #0c4a6e 0%, #075985 50%, #0891b2 100%)'
    },
    effects: {
      glow: '0 0 20px rgba(14, 165, 233, 0.3)',
      shadow: '0 25px 50px -12px rgba(14, 165, 233, 0.25)',
      blur: 'blur(16px)',
      particles: ['#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9']
    },
    animations: {
      duration: '0.4s',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  },

  sunset: {
    name: 'sunset',
    displayName: '🌅 Sunset Glow',
    description: 'Warm oranges and pinks of a beautiful sunset',
    colors: {
      primary: '#f97316',
      secondary: '#ea580c',
      accent: '#fb923c',
      background: '#fff7ed',
      surface: '#ffffff',
      text: '#1c1917',
      textSecondary: '#78716c',
      success: '#16a34a',
      warning: '#eab308',
      error: '#dc2626',
      info: '#3b82f6'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)',
      secondary: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
      hero: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 50%, #fdba74 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,247,237,0.8) 100%)',
      button: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      sidebar: 'linear-gradient(180deg, #7c2d12 0%, #9a3412 50%, #ea580c 100%)'
    },
    effects: {
      glow: '0 0 20px rgba(249, 115, 22, 0.3)',
      shadow: '0 25px 50px -12px rgba(249, 115, 22, 0.25)',
      blur: 'blur(16px)',
      particles: ['#fed7aa', '#fdba74', '#fb923c', '#f97316']
    },
    animations: {
      duration: '0.35s',
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }
  },

  forest: {
    name: 'forest',
    displayName: '🌲 Forest Green',
    description: 'Natural greens and earth tones of a peaceful forest',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#10b981',
      background: '#f0fdf4',
      surface: '#ffffff',
      text: '#14532d',
      textSecondary: '#6b7280',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      secondary: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
      hero: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,253,244,0.8) 100%)',
      button: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      sidebar: 'linear-gradient(180deg, #14532d 0%, #166534 50%, #047857 100%)'
    },
    effects: {
      glow: '0 0 20px rgba(5, 150, 105, 0.3)',
      shadow: '0 25px 50px -12px rgba(5, 150, 105, 0.25)',
      blur: 'blur(16px)',
      particles: ['#dcfce7', '#bbf7d0', '#86efac', '#10b981']
    },
    animations: {
      duration: '0.45s',
      easing: 'cubic-bezier(0.23, 1, 0.32, 1)'
    }
  },

  midnight: {
    name: 'midnight',
    displayName: '🌙 Midnight Blue',
    description: 'Deep blues and purples of a starry night',
    colors: {
      primary: '#6366f1',
      secondary: '#4f46e5',
      accent: '#8b5cf6',
      background: '#0f0f23',
      surface: '#1e1b3a',
      text: '#f8fafc',
      textSecondary: '#cbd5e1',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#f87171',
      info: '#60a5fa'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      secondary: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      hero: 'linear-gradient(135deg, #0f0f23 0%, #1e1b3a 50%, #312e81 100%)',
      card: 'linear-gradient(135deg, rgba(30,27,58,0.9) 0%, rgba(15,15,35,0.8) 100%)',
      button: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
      sidebar: 'linear-gradient(180deg, #0f0f23 0%, #1e1b3a 50%, #312e81 100%)'
    },
    effects: {
      glow: '0 0 20px rgba(99, 102, 241, 0.4)',
      shadow: '0 25px 50px -12px rgba(99, 102, 241, 0.3)',
      blur: 'blur(20px)',
      particles: ['#c7d2fe', '#a5b4fc', '#818cf8', '#6366f1']
    },
    animations: {
      duration: '0.5s',
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }
  },

  galaxy: {
    name: 'galaxy',
    displayName: '🌌 Galaxy Purple',
    description: 'Cosmic purples and magentas of distant galaxies',
    colors: {
      primary: '#a855f7',
      secondary: '#9333ea',
      accent: '#c084fc',
      background: '#faf5ff',
      surface: '#ffffff',
      text: '#581c87',
      textSecondary: '#7c3aed',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
      secondary: 'linear-gradient(135deg, #9333ea 0%, #d946ef 100%)',
      hero: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #e9d5ff 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(250,245,255,0.8) 100%)',
      button: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
      sidebar: 'linear-gradient(180deg, #581c87 0%, #7c3aed 50%, #9333ea 100%)'
    },
    effects: {
      glow: '0 0 20px rgba(168, 85, 247, 0.3)',
      shadow: '0 25px 50px -12px rgba(168, 85, 247, 0.25)',
      blur: 'blur(16px)',
      particles: ['#f3e8ff', '#e9d5ff', '#c084fc', '#a855f7']
    },
    animations: {
      duration: '0.4s',
      easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }
  },

  aurora: {
    name: 'aurora',
    displayName: '✨ Aurora Borealis',
    description: 'Mystical greens and blues of the northern lights',
    colors: {
      primary: '#14b8a6',
      secondary: '#0891b2',
      accent: '#06d6a0',
      background: '#f0fdfa',
      surface: '#ffffff',
      text: '#134e4a',
      textSecondary: '#0f766e',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#0ea5e9'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #14b8a6 0%, #06d6a0 50%, #0891b2 100%)',
      secondary: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)',
      hero: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 30%, #99f6e4 60%, #5eead4 100%)',
      card: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,253,250,0.9) 100%)',
      button: 'linear-gradient(135deg, #14b8a6 0%, #06d6a0 100%)',
      sidebar: 'linear-gradient(180deg, #134e4a 0%, #0f766e 30%, #14b8a6 70%, #06d6a0 100%)'
    },
    effects: {
      glow: '0 0 25px rgba(20, 184, 166, 0.4)',
      shadow: '0 25px 50px -12px rgba(20, 184, 166, 0.3)',
      blur: 'blur(18px)',
      particles: ['#ccfbf1', '#99f6e4', '#5eead4', '#14b8a6']
    },
    animations: {
      duration: '0.6s',
      easing: 'cubic-bezier(0.19, 1, 0.22, 1)'
    }
  },

  cyberpunk: {
    name: 'cyberpunk',
    displayName: '🤖 Cyberpunk Neon',
    description: 'Electric neons and dark tech vibes of the future',
    colors: {
      primary: '#ff0080',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#0a0a0a',
      surface: '#1a1a1a',
      text: '#ffffff',
      textSecondary: '#a0a0a0',
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0040',
      info: '#00ffff'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #ff0080 0%, #00ffff 100%)',
      secondary: 'linear-gradient(135deg, #00ffff 0%, #ffff00 100%)',
      hero: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #2a0a2a 100%)',
      card: 'linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(10,10,10,0.9) 100%)',
      button: 'linear-gradient(135deg, #ff0080 0%, #ff0040 100%)',
      sidebar: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #2a0a2a 100%)'
    },
    effects: {
      glow: '0 0 30px rgba(255, 0, 128, 0.5)',
      shadow: '0 25px 50px -12px rgba(255, 0, 128, 0.4)',
      blur: 'blur(12px)',
      particles: ['#ff0080', '#00ffff', '#ffff00', '#ff0040']
    },
    animations: {
      duration: '0.3s',
      easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)'
    }
  }
};

interface ThemeContextType {
  currentTheme: Theme;
  themeName: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: Record<ThemeName, Theme>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [themeName, setThemeName] = useState<ThemeName>('ocean');
  
  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('dashboard-theme') as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      setThemeName(savedTheme);
    }
  }, []);

  // Save theme to localStorage when changed
  useEffect(() => {
    localStorage.setItem('dashboard-theme', themeName);
    
    // Apply theme to document root for CSS variables
    const root = document.documentElement;
    const theme = themes[themeName];
    
    // Set CSS custom properties
    root.style.setProperty('--color-primary', theme.colors.primary);
    root.style.setProperty('--color-secondary', theme.colors.secondary);
    root.style.setProperty('--color-accent', theme.colors.accent);
    root.style.setProperty('--color-background', theme.colors.background);
    root.style.setProperty('--color-surface', theme.colors.surface);
    root.style.setProperty('--color-text', theme.colors.text);
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--gradient-primary', theme.gradients.primary);
    root.style.setProperty('--gradient-hero', theme.gradients.hero);
    root.style.setProperty('--effect-glow', theme.effects.glow);
    root.style.setProperty('--effect-shadow', theme.effects.shadow);
    
    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme.colors.primary);
    }
  }, [themeName]);

  const setTheme = (theme: ThemeName) => {
    setThemeName(theme);
  };

  const value: ThemeContextType = {
    currentTheme: themes[themeName],
    themeName,
    setTheme,
    themes
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
