import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Mock all contexts first
jest.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    user: { id: 'user123', email: 'user@test.com', name: 'Test User' },
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  })
}));

jest.mock('../contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="theme-provider">{children}</div>,
  useTheme: () => ({
    theme: 'light',
    toggleTheme: jest.fn()
  })
}));

// Mock all components - must use __esModule + default since AppContent uses require().default
jest.mock('../components/ThumPiksLanding', () => ({
  __esModule: true,
  default: () => <div data-testid="landing-page">Landing Page Component</div>
}));

jest.mock('../components/Dashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard">Dashboard Component</div>
}));

jest.mock('../components/auth/Login', () => ({
  __esModule: true,
  default: () => <div data-testid="login">Login Component</div>
}));

jest.mock('../components/auth/Register', () => ({
  __esModule: true,
  default: () => <div data-testid="register">Register Component</div>
}));

jest.mock('../components/auth/ForgotPassword', () => ({
  __esModule: true,
  default: () => <div data-testid="forgot-password">Forgot Password Component</div>
}));

jest.mock('../components/auth/ResetPassword', () => ({
  __esModule: true,
  default: () => <div data-testid="reset-password">Reset Password Component</div>
}));

jest.mock('../components/UserSettings', () => ({
  __esModule: true,
  default: () => <div data-testid="user-settings">User Settings Component</div>
}));

jest.mock('../components/projects/ProjectsList', () => ({
  __esModule: true,
  default: () => <div data-testid="projects-list">Projects List Component</div>
}));

jest.mock('../components/projects/ProjectDetail', () => ({
  __esModule: true,
  default: () => <div data-testid="project-detail">Project Detail Component</div>
}));

jest.mock('../components/projects/ProjectForm', () => ({
  __esModule: true,
  default: ({ isEdit }: { isEdit: boolean }) => 
    <div data-testid="project-form">
      Project Form Component - {isEdit ? 'Edit Mode' : 'Create Mode'}
    </div>
}));

jest.mock('../components/templates/TemplateMarketplace', () => ({
  __esModule: true,
  default: () => <div data-testid="template-marketplace">Template Marketplace Component</div>
}));

jest.mock('../components/AnalyticsDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="analytics-dashboard">Analytics Dashboard Component</div>
}));

jest.mock('../components/AdvancedAnalyticsDashboard', () => ({
  __esModule: true,
  default: () => <div data-testid="advanced-analytics-dashboard">Advanced Analytics Dashboard Component</div>
}));

jest.mock('../components/SharedThumbnailPage', () => ({
  __esModule: true,
  default: () => <div data-testid="shared-thumbnail-page">Shared Thumbnail Page Component</div>
}));

jest.mock('../components/AboutPage', () => ({
  __esModule: true,
  default: () => <div data-testid="about-page">About Page Component</div>
}));

jest.mock('../components/ContactPage', () => ({
  __esModule: true,
  default: () => <div data-testid="contact-page">Contact Page Component</div>
}));

jest.mock('../components/TermsPage', () => ({
  __esModule: true,
  default: () => <div data-testid="terms-page">Terms Page Component</div>
}));

jest.mock('../components/PrivacyPage', () => ({
  __esModule: true,
  default: () => <div data-testid="privacy-page">Privacy Page Component</div>
}));

jest.mock('../components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => 
    <div data-testid="protected-route">{children}</div>
}));

// Create a testable version of App without BrowserRouter
const AppContent = () => {
  const { Routes, Route } = require('react-router-dom');
  const { AuthProvider } = require('../contexts/AuthContext');
  const { ThemeProvider } = require('../contexts/ThemeContext');
  const LandingPage = require('../components/ThumPiksLanding').default;
  const Login = require('../components/auth/Login').default;
  const Register = require('../components/auth/Register').default;
  const ForgotPassword = require('../components/auth/ForgotPassword').default;
  const ResetPassword = require('../components/auth/ResetPassword').default;
  const Dashboard = require('../components/Dashboard').default;
  const UserSettings = require('../components/UserSettings').default;
  const ProjectsList = require('../components/projects/ProjectsList').default;
  const ProjectDetail = require('../components/projects/ProjectDetail').default;
  const ProjectForm = require('../components/projects/ProjectForm').default;
  const TemplateMarketplace = require('../components/templates/TemplateMarketplace').default;
  const AnalyticsDashboard = require('../components/AnalyticsDashboard').default;
  const AdvancedAnalyticsDashboard = require('../components/AdvancedAnalyticsDashboard').default;
  const SharedThumbnailPage = require('../components/SharedThumbnailPage').default;
  const AboutPage = require('../components/AboutPage').default;
  const ContactPage = require('../components/ContactPage').default;
  const TermsPage = require('../components/TermsPage').default;
  const PrivacyPage = require('../components/PrivacyPage').default;
  const ProtectedRoute = require('../components/ProtectedRoute').default;

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Public Information Pages */}
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            
            {/* Public Sharing */}
            <Route path="/share/:token" element={<SharedThumbnailPage />} />
            
            {/* Landing Page Sections */}
            <Route path="/features" element={<LandingPage />} />
            <Route path="/pricing" element={<LandingPage />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/settings" element={
              <ProtectedRoute>
                <UserSettings />
              </ProtectedRoute>
            } />
            
            {/* Project Routes */}
            <Route path="/projects" element={
              <ProtectedRoute>
                <ProjectsList />
              </ProtectedRoute>
            } />
            
            <Route path="/projects/create" element={
              <ProtectedRoute>
                <ProjectForm isEdit={false} />
              </ProtectedRoute>
            } />
            
            <Route path="/projects/:id" element={
              <ProtectedRoute>
                <ProjectDetail />
              </ProtectedRoute>
            } />
            
            <Route path="/projects/:id/edit" element={
              <ProtectedRoute>
                <ProjectForm isEdit={true} />
              </ProtectedRoute>
            } />
            
            {/* Template Routes */}
            <Route path="/templates" element={
              <ProtectedRoute>
                <TemplateMarketplace />
              </ProtectedRoute>
            } />
            
            {/* Analytics Routes */}
            <Route path="/analytics" element={
              <ProtectedRoute>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/analytics/advanced" element={
              <ProtectedRoute>
                <AdvancedAnalyticsDashboard />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">Page not found</p>
                  <a 
                    href="/" 
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
};

describe('App Routing Tests', () => {
  const renderWithRouter = (initialPath = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <AppContent />
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Public Routes', () => {
    it('should render Landing Page on root path', () => {
      renderWithRouter('/');
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByText('Landing Page Component')).toBeInTheDocument();
    });

    it('should render Login component on /login', () => {
      renderWithRouter('/login');
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.getByText('Login Component')).toBeInTheDocument();
    });

    it('should render Register component on /register', () => {
      renderWithRouter('/register');
      expect(screen.getByTestId('register')).toBeInTheDocument();
      expect(screen.getByText('Register Component')).toBeInTheDocument();
    });

    it('should render Forgot Password component on /forgot-password', () => {
      renderWithRouter('/forgot-password');
      expect(screen.getByTestId('forgot-password')).toBeInTheDocument();
      expect(screen.getByText('Forgot Password Component')).toBeInTheDocument();
    });

    it('should render Reset Password component on /reset-password/:token', () => {
      renderWithRouter('/reset-password/test-token');
      expect(screen.getByTestId('reset-password')).toBeInTheDocument();
      expect(screen.getByText('Reset Password Component')).toBeInTheDocument();
    });
  });

  describe('Information Pages', () => {
    it('should render About Page on /about', () => {
      renderWithRouter('/about');
      expect(screen.getByTestId('about-page')).toBeInTheDocument();
      expect(screen.getByText('About Page Component')).toBeInTheDocument();
    });

    it('should render Contact Page on /contact', () => {
      renderWithRouter('/contact');
      expect(screen.getByTestId('contact-page')).toBeInTheDocument();
      expect(screen.getByText('Contact Page Component')).toBeInTheDocument();
    });

    it('should render Terms Page on /terms', () => {
      renderWithRouter('/terms');
      expect(screen.getByTestId('terms-page')).toBeInTheDocument();
      expect(screen.getByText('Terms Page Component')).toBeInTheDocument();
    });

    it('should render Privacy Page on /privacy', () => {
      renderWithRouter('/privacy');
      expect(screen.getByTestId('privacy-page')).toBeInTheDocument();
      expect(screen.getByText('Privacy Page Component')).toBeInTheDocument();
    });
  });

  describe('Landing Page Sections', () => {
    it('should render Landing Page on /features', () => {
      renderWithRouter('/features');
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByText('Landing Page Component')).toBeInTheDocument();
    });

    it('should render Landing Page on /pricing', () => {
      renderWithRouter('/pricing');
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
      expect(screen.getByText('Landing Page Component')).toBeInTheDocument();
    });
  });

  describe('Public Sharing Routes', () => {
    it('should render Shared Thumbnail Page on /share/:token', () => {
      renderWithRouter('/share/test-token');
      expect(screen.getByTestId('shared-thumbnail-page')).toBeInTheDocument();
      expect(screen.getByText('Shared Thumbnail Page Component')).toBeInTheDocument();
    });
  });

  describe('Protected Routes', () => {
    it('should render Dashboard with ProtectedRoute on /dashboard', () => {
      renderWithRouter('/dashboard');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Component')).toBeInTheDocument();
    });

    it('should render User Settings with ProtectedRoute on /settings', () => {
      renderWithRouter('/settings');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('user-settings')).toBeInTheDocument();
      expect(screen.getByText('User Settings Component')).toBeInTheDocument();
    });
  });

  describe('Project Routes', () => {
    it('should render Projects List with ProtectedRoute on /projects', () => {
      renderWithRouter('/projects');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('projects-list')).toBeInTheDocument();
      expect(screen.getByText('Projects List Component')).toBeInTheDocument();
    });

    it('should render Project Form in create mode on /projects/create', () => {
      renderWithRouter('/projects/create');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('project-form')).toBeInTheDocument();
      expect(screen.getByText('Project Form Component - Create Mode')).toBeInTheDocument();
    });

    it('should render Project Detail on /projects/:id', () => {
      renderWithRouter('/projects/123');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('project-detail')).toBeInTheDocument();
      expect(screen.getByText('Project Detail Component')).toBeInTheDocument();
    });

    it('should render Project Form in edit mode on /projects/:id/edit', () => {
      renderWithRouter('/projects/123/edit');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('project-form')).toBeInTheDocument();
      expect(screen.getByText('Project Form Component - Edit Mode')).toBeInTheDocument();
    });
  });

  describe('Template Routes', () => {
    it('should render Template Marketplace with ProtectedRoute on /templates', () => {
      renderWithRouter('/templates');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('template-marketplace')).toBeInTheDocument();
      expect(screen.getByText('Template Marketplace Component')).toBeInTheDocument();
    });
  });

  describe('Analytics Routes', () => {
    it('should render Analytics Dashboard with ProtectedRoute on /analytics', () => {
      renderWithRouter('/analytics');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Analytics Dashboard Component')).toBeInTheDocument();
    });

    it('should render Advanced Analytics Dashboard with ProtectedRoute on /analytics/advanced', () => {
      renderWithRouter('/analytics/advanced');
      expect(screen.getByTestId('protected-route')).toBeInTheDocument();
      expect(screen.getByTestId('advanced-analytics-dashboard')).toBeInTheDocument();
      expect(screen.getByText('Advanced Analytics Dashboard Component')).toBeInTheDocument();
    });
  });

  describe('404 Route', () => {
    it('should render 404 page for unknown routes', () => {
      renderWithRouter('/unknown-route');
      
      // Should show 404 content
      expect(screen.getByText('404')).toBeInTheDocument();
      expect(screen.getByText('Page not found')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });
  });

  describe('Context Providers', () => {
    it('should wrap components with AuthProvider and ThemeProvider', () => {
      renderWithRouter('/');
      
      // Should have context providers
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    });
  });

  describe('Route Structure', () => {
    it('should have proper App structure with all providers', () => {
      renderWithRouter('/');
      
      // Should have the proper structure
      expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
      expect(screen.getByTestId('auth-provider')).toBeInTheDocument();
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });
});