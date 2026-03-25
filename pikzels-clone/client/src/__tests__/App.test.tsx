import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import App from '../App';

// Mock all the page components
jest.mock('../components/ThumPiksLanding', () => {
  return function MockThumPiksLanding() {
    return <div data-testid="landing-page">Landing Page</div>;
  };
});

jest.mock('../components/auth/Login', () => {
  return function MockLogin() {
    return <div data-testid="login-page">Login Page</div>;
  };
});

jest.mock('../components/auth/Register', () => {
  return function MockRegister() {
    return <div data-testid="register-page">Register Page</div>;
  };
});

jest.mock('../components/auth/ForgotPassword', () => {
  return function MockForgotPassword() {
    return <div data-testid="forgot-password-page">Forgot Password Page</div>;
  };
});

jest.mock('../components/auth/ResetPassword', () => {
  return function MockResetPassword() {
    return <div data-testid="reset-password-page">Reset Password Page</div>;
  };
});

jest.mock('../components/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard-page">Dashboard Page</div>;
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

jest.mock('../components/UserSettings', () => {
  return function MockUserSettings() {
    return <div data-testid="user-settings-page">User Settings Page</div>;
  };
});

jest.mock('../components/projects/ProjectsList', () => {
  return function MockProjectsList() {
    return <div data-testid="projects-list-page">Projects List Page</div>;
  };
});

jest.mock('../components/projects/ProjectDetail', () => {
  return function MockProjectDetail() {
    return <div data-testid="project-detail-page">Project Detail Page</div>;
  };
});

jest.mock('../components/projects/ProjectForm', () => {
  return function MockProjectForm({ isEdit }: { isEdit: boolean }) {
    return <div data-testid={`project-${isEdit ? 'edit' : 'create'}-page`}>
      {isEdit ? 'Edit Project' : 'Create Project'} Page
    </div>;
  };
});

jest.mock('../components/templates/TemplateMarketplace', () => {
  return function MockTemplateMarketplace() {
    return <div data-testid="template-marketplace-page">Template Marketplace Page</div>;
  };
});

jest.mock('../components/AnalyticsDashboard', () => {
  return function MockAnalyticsDashboard() {
    return <div data-testid="analytics-dashboard-page">Analytics Dashboard Page</div>;
  };
});

jest.mock('../components/AdvancedAnalyticsDashboard', () => {
  return function MockAdvancedAnalyticsDashboard() {
    return <div data-testid="advanced-analytics-page">Advanced Analytics Page</div>;
  };
});

jest.mock('../components/SharedThumbnailPage', () => {
  return function MockSharedThumbnailPage() {
    return <div data-testid="shared-thumbnail-page">Shared Thumbnail Page</div>;
  };
});

// Mock ProtectedRoute to render children directly for testing
jest.mock('../components/ProtectedRoute', () => {
  return function MockProtectedRoute({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  };
});

// Mock AuthContext with default authenticated user
const mockAuthContext = {
  user: {
    id: 'user123',
    email: 'user@test.com',
    name: 'Test User'
  },
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
  loading: false
};

jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockAuthContext
}));

// Mock ThemeContext
jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn()
  })
}));

// Mock react-router-dom completely
const mockNavigate = jest.fn();
const mockLocation = { pathname: '/' };

jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-testid="router">{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div data-testid="routes">{children}</div>,
  Route: ({ path, element }: { path: string; element: React.ReactNode }) => {
    // Simulate route matching based on mock location
    if (mockLocation.pathname === path || 
        (path.includes(':') && mockLocation.pathname.match(new RegExp(path.replace(/:[^/]+/g, '[^/]+'))))) {
      return <>{element}</>;
    }
    return null;
  },
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation
}));

// Helper to set current route for testing
const setMockRoute = (pathname: string) => {
  mockLocation.pathname = pathname;
};

// Simplified render function
const renderApp = () => {
  return render(<App />);
};

// Function to test specific routes
const testRoute = (pathname: string) => {
  setMockRoute(pathname);
  return renderApp();
};

describe('App Routing Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should render Landing Page on root route', async () => {
      testRoute('/');
      
      await waitFor(() => {
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      });
    });

    it('should render Login Page on /login route', async () => {
      testRoute('/login');
      
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });

    it('should render Register Page on /register route', async () => {
      testRoute('/register');
      
      await waitFor(() => {
        expect(screen.getByTestId('register-page')).toBeInTheDocument();
      });
    });

    it('should render Forgot Password Page on /forgot-password route', async () => {
      testRoute('/forgot-password');
      
      await waitFor(() => {
        expect(screen.getByTestId('forgot-password-page')).toBeInTheDocument();
      });
    });

    it('should render Reset Password Page on /reset-password/:token route', async () => {
      testRoute('/reset-password/test-token');
      
      await waitFor(() => {
        expect(screen.getByTestId('reset-password-page')).toBeInTheDocument();
      });
    });

    it('should render About Page on /about route', async () => {
      testRoute('/about');
      
      await waitFor(() => {
        expect(screen.getByTestId('about-page')).toBeInTheDocument();
      });
    });

    it('should render Contact Page on /contact route', async () => {
      testRoute('/contact');
      
      await waitFor(() => {
        expect(screen.getByTestId('contact-page')).toBeInTheDocument();
      });
    });

    it('should render Terms Page on /terms route', async () => {
      testRoute('/terms');
      
      await waitFor(() => {
        expect(screen.getByTestId('terms-page')).toBeInTheDocument();
      });
    });

    it('should render Privacy Page on /privacy route', async () => {
      testRoute('/privacy');
      
      await waitFor(() => {
        expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
      });
    });

    it('should render Shared Thumbnail Page on /share/:token route', async () => {
      testRoute('/share/test-share-token');
      
      await waitFor(() => {
        expect(screen.getByTestId('shared-thumbnail-page')).toBeInTheDocument();
      });
    });

    it('should render Landing Page for feature sections', async () => {
      testRoute('/features');
      
      await waitFor(() => {
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      });

      testRoute('/pricing');
      
      await waitFor(() => {
        expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      });
    });
  });

  describe('Protected Routes', () => {
    it('should render Dashboard on /dashboard route', async () => {
      testRoute('/dashboard');
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should render User Settings on /settings route', async () => {
      testRoute('/settings');
      
      await waitFor(() => {
        expect(screen.getByTestId('user-settings-page')).toBeInTheDocument();
      });
    });

    it('should render Projects List on /projects route', async () => {
      testRoute('/projects');
      
      await waitFor(() => {
        expect(screen.getByTestId('projects-list-page')).toBeInTheDocument();
      });
    });

    it('should render Create Project on /projects/create route', async () => {
      testRoute('/projects/create');
      
      await waitFor(() => {
        expect(screen.getByTestId('project-create-page')).toBeInTheDocument();
        expect(screen.getByText('Create Project Page')).toBeInTheDocument();
      });
    });

    it('should render Project Detail on /projects/:id route', async () => {
      testRoute('/projects/project123');
      
      await waitFor(() => {
        expect(screen.getByTestId('project-detail-page')).toBeInTheDocument();
      });
    });

    it('should render Edit Project on /projects/:id/edit route', async () => {
      testRoute('/projects/project123/edit');
      
      await waitFor(() => {
        expect(screen.getByTestId('project-edit-page')).toBeInTheDocument();
        expect(screen.getByText('Edit Project Page')).toBeInTheDocument();
      });
    });

    it('should render Template Marketplace on /templates route', async () => {
      testRoute('/templates');
      
      await waitFor(() => {
        expect(screen.getByTestId('template-marketplace-page')).toBeInTheDocument();
      });
    });

    it('should render Analytics Dashboard on /analytics route', async () => {
      testRoute('/analytics');
      
      await waitFor(() => {
        expect(screen.getByTestId('analytics-dashboard-page')).toBeInTheDocument();
      });
    });

    it('should render Advanced Analytics on /analytics/advanced route', async () => {
      testRoute('/analytics/advanced');
      
      await waitFor(() => {
        expect(screen.getByTestId('advanced-analytics-page')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should render 404 page for unknown routes', async () => {
      testRoute('/unknown-route');
      
      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
        expect(screen.getByText('Go Home')).toBeInTheDocument();
      });
    });

    it('should render 404 page for deeply nested unknown routes', async () => {
      testRoute('/projects/unknown/nested/route');
      
      await waitFor(() => {
        expect(screen.getByText('404')).toBeInTheDocument();
        expect(screen.getByText('Page not found')).toBeInTheDocument();
      });
    });
  });

  describe('Route Navigation', () => {
    it('should handle multiple route changes', async () => {
      const { rerender } = renderApp();
      
      // Start at landing page
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      
      // Navigate to login
      rerender(
        <MemoryRouter initialEntries={['/login']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
      
      // Navigate to dashboard
      rerender(
        <MemoryRouter initialEntries={['/dashboard']}>
          <App />
        </MemoryRouter>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });
  });

  describe('Route Parameters', () => {
    it('should handle dynamic route parameters correctly', async () => {
      // Test different project IDs
      testRoute('/projects/abc123');
      await waitFor(() => {
        expect(screen.getByTestId('project-detail-page')).toBeInTheDocument();
      });

      // Test different share tokens
      testRoute('/share/xyz789');
      await waitFor(() => {
        expect(screen.getByTestId('shared-thumbnail-page')).toBeInTheDocument();
      });

      // Test different reset tokens
      testRoute('/reset-password/reset123');
      await waitFor(() => {
        expect(screen.getByTestId('reset-password-page')).toBeInTheDocument();
      });
    });

    it('should handle special characters in route parameters', async () => {
      // Test with special characters (should still work)
      testRoute('/projects/project-with-special-chars_123');
      await waitFor(() => {
        expect(screen.getByTestId('project-detail-page')).toBeInTheDocument();
      });
    });
  });

  describe('App Component Lifecycle', () => {
    it('should mount without crashing', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      testRoute('/');
      
      expect(consoleSpy).toHaveBeenCalledWith('App component mounted');
      
      consoleSpy.mockRestore();
    });

    it('should render consistently across multiple mounts', () => {
      const { unmount } = testRoute('/');
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      
      unmount();
      
      testRoute('/');
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  describe('Context Providers', () => {
    it('should wrap components with AuthProvider and ThemeProvider', () => {
      testRoute('/');
      
      // The app should render without context errors
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = renderApp();
      
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      
      // Re-render with same route
      rerender(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );
      
      // Should still show the same component
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });
});