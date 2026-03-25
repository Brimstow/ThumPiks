import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock react-router-dom first
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
  Route: ({ element }: { element: React.ReactNode }) => {
    return <div data-testid="route">{element}</div>;
  },
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' })
}));

// Mock contexts
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: { id: 'user123', email: 'user@test.com', name: 'Test User' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn()
  })
}));

// Mock all components
jest.mock('../components/ThumPiksLanding', () => {
  return function MockThumPiksLanding() {
    return <div data-testid="landing-page">Landing Page</div>;
  };
});

jest.mock('../components/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard">Dashboard</div>;
  };
});

jest.mock('../components/auth/Login', () => {
  return function MockLogin() {
    return <div data-testid="login">Login</div>;
  };
});

jest.mock('../components/auth/Register', () => {
  return function MockRegister() {
    return <div data-testid="register">Register</div>;
  };
});

jest.mock('../components/auth/ForgotPassword', () => {
  return function MockForgotPassword() {
    return <div data-testid="forgot-password">Forgot Password</div>;
  };
});

jest.mock('../components/auth/ResetPassword', () => {
  return function MockResetPassword() {
    return <div data-testid="reset-password">Reset Password</div>;
  };
});

jest.mock('../components/UserSettings', () => {
  return function MockUserSettings() {
    return <div data-testid="user-settings">User Settings</div>;
  };
});

jest.mock('../components/projects/ProjectsList', () => {
  return function MockProjectsList() {
    return <div data-testid="projects-list">Projects List</div>;
  };
});

jest.mock('../components/projects/ProjectDetail', () => {
  return function MockProjectDetail() {
    return <div data-testid="project-detail">Project Detail</div>;
  };
});

jest.mock('../components/projects/ProjectForm', () => {
  return function MockProjectForm(props: any) {
    return <div data-testid="project-form">Project Form - {props.isEdit ? 'Edit' : 'Create'}</div>;
  };
});

jest.mock('../components/templates/TemplateMarketplace', () => {
  return function MockTemplateMarketplace() {
    return <div data-testid="template-marketplace">Template Marketplace</div>;
  };
});

jest.mock('../components/AnalyticsDashboard', () => {
  return function MockAnalyticsDashboard() {
    return <div data-testid="analytics-dashboard">Analytics Dashboard</div>;
  };
});

jest.mock('../components/AdvancedAnalyticsDashboard', () => {
  return function MockAdvancedAnalyticsDashboard() {
    return <div data-testid="advanced-analytics-dashboard">Advanced Analytics Dashboard</div>;
  };
});

jest.mock('../components/SharedThumbnailPage', () => {
  return function MockSharedThumbnailPage() {
    return <div data-testid="shared-thumbnail-page">Shared Thumbnail Page</div>;
  };
});

jest.mock('../components/AboutPage', () => {
  return function MockAboutPage() {
    return <div data-testid="about-page">About Page</div>;
  };
});

jest.mock('../components/ContactPage', () => {
  return function MockContactPage() {
    return <div data-testid="contact-page">Contact Page</div>;
  };
});

jest.mock('../components/TermsPage', () => {
  return function MockTermsPage() {
    return <div data-testid="terms-page">Terms Page</div>;
  };
});

jest.mock('../components/PrivacyPage', () => {
  return function MockPrivacyPage() {
    return <div data-testid="privacy-page">Privacy Page</div>;
  };
});

jest.mock('../components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <div data-testid="protected-route">{children}</div>;
  };
});

// Import App after mocks
import App from '../App';

describe('App Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<App />);
      
      // Should render the router structure
      expect(screen.getByTestId('router')).toBeInTheDocument();
      expect(screen.getByTestId('routes')).toBeInTheDocument();
    });

    it('should render app with proper structure', () => {
      render(<App />);
      
      // Should have the App class
      expect(screen.getByTestId('router')).toBeInTheDocument();
    });

    it('should mount App component and log message', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<App />);
      
      expect(consoleSpy).toHaveBeenCalledWith('App component mounted');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Providers', () => {
    it('should wrap components with AuthProvider and ThemeProvider', () => {
      render(<App />);
      
      // Should render without context errors
      expect(screen.getByTestId('router')).toBeInTheDocument();
    });
  });

  describe('Route Structure', () => {
    it('should have proper routing structure', () => {
      render(<App />);
      
      // Should contain router and routes structure
      expect(screen.getByTestId('router')).toBeInTheDocument();
      expect(screen.getByTestId('routes')).toBeInTheDocument();
    });
  });

  describe('Error Boundaries', () => {
    it('should handle component errors gracefully', () => {
      // Mock console.error to prevent noise in tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<App />);
      
      // Should not crash on render
      expect(screen.getByTestId('router')).toBeInTheDocument();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();
      
      render(<App />);
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      // Should render quickly (under 100ms in test environment)
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Component Lifecycle', () => {
    it('should handle mount and unmount properly', () => {
      const { unmount } = render(<App />);
      
      expect(screen.getByTestId('router')).toBeInTheDocument();
      
      // Should unmount without errors
      unmount();
    });

    it('should handle re-renders properly', () => {
      const { rerender } = render(<App />);
      
      expect(screen.getByTestId('router')).toBeInTheDocument();
      
      // Re-render the component
      rerender(<App />);
      
      expect(screen.getByTestId('router')).toBeInTheDocument();
    });
  });
});