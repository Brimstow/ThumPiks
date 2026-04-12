import React, { useEffect, useLayoutEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useLocation,
} from 'react-router-dom';
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ThumPiksLanding from './components/ThumPiksLanding';
import ThumPiksTest from './components/PikzelsTest';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import VerifyEmailSuccess from './components/auth/VerifyEmailSuccess';
import ShadcnTest from './components/ShadcnTest';

// User Components
import Dashboard from './components/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardHome from './components/dashboard/DashboardHome';
import HelpPage from './components/dashboard/HelpPage';
import BrandPage from './components/dashboard/BrandPage';
import ProjectsPage from './components/dashboard/ProjectsPage';
import ProjectDetail from './components/projects/ProjectDetail';
import TemplatesPage from './components/dashboard/TemplatesPage';
import AnalyticsPage from './components/dashboard/AnalyticsPage';
import MyThumbnailsPage from './components/dashboard/MyThumbnailsPage';
import UploadsPage from './components/dashboard/UploadsPage';
import TrendingPage from './components/dashboard/TrendingPage';
import PricingPage from './components/dashboard/PricingPage';
import CreditsPage from './components/dashboard/CreditsPage';
import NotificationsPage from './components/notifications/NotificationsPage';
import AIToolsPage from './components/dashboard/AIToolsPage';
import VisionToolPage from './components/dashboard/VisionToolPage';
import VisualSearchPage from './components/dashboard/VisualSearchPage';
import ABTestingPage from './components/dashboard/ABTestingPage';
import QuickEditView from './components/dashboard/QuickEditView';
import ErrorBoundary from './components/ErrorBoundary';
import BatchEditor from './components/BatchEditor';
import CanvasEditorPage from './pages/CanvasEditorPage';
import PresetEditorPage from './pages/PresetEditorPage';
import ThumbnailStudioPage from './pages/ThumbnailStudioPage';
import UserAnalyticsDashboard from './components/AnalyticsDashboard';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import SocialShareAnalytics from './components/SocialShareAnalytics';
import AccountPage from './components/account/AccountPage';
import SharedThumbnailPage from './components/SharedThumbnailPage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import FeaturesPage from './pages/FeaturesPage';
import ReviewsPage from './pages/ReviewsPage';
import ChangelogPage from './pages/ChangelogPage';
import VideoEditorPage from './pages/VideoEditorPage';
import CreatePlusPage from './pages/CreatePlusPage';
import DemoCheckout from './components/dashboard/DemoCheckout';

// Import custom styles
import './styles/animations.css';



// Simple test component
const TestPage = () => (
  <div style={{ padding: '20px', background: '#f0f0f0', minHeight: '100vh' }}>
    <h1 style={{ color: '#333' }}>🎉 App is Working!</h1>
    <p style={{ color: '#666' }}>This confirms React is rendering properly.</p>
    <div style={{ marginTop: '20px' }}>
      <h3>Test Navigation:</h3>
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginTop: '10px',
        }}
      >
        <a href="/" style={{ color: '#007bff', textDecoration: 'underline' }}>
          Home (Landing)
        </a>
        <a
          href="/login"
          style={{ color: '#007bff', textDecoration: 'underline' }}
        >
          Login
        </a>
        <a
          href="/register"
          style={{ color: '#007bff', textDecoration: 'underline' }}
        >
          Register
        </a>
        <a
          href="/forgot-password"
          style={{ color: '#007bff', textDecoration: 'underline' }}
        >
          Forgot Password
        </a>
      </div>
    </div>
  </div>
);

// Redirect component for legacy /thumbnails/edit/:id route
const RedirectToEditor = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/editor/${id}`} replace />;
};

// Scroll position storage key
const SCROLL_POSITION_KEY = 'thumpiks-scroll-positions';
const LANDING_PAGE_PATH = '/';

// Save scroll position for a path
function saveScrollPosition(path: string, position: number) {
  try {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    positions[path] = position;
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage errors
  }
}

// Get scroll position for a path
function getScrollPosition(path: string): number {
  try {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    return positions[path] || 0;
  } catch {
    return 0;
  }
}

// Clear scroll position for a path
function clearScrollPosition(path: string) {
  try {
    const positions = JSON.parse(sessionStorage.getItem(SCROLL_POSITION_KEY) || '{}');
    delete positions[path];
    sessionStorage.setItem(SCROLL_POSITION_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage errors
  }
}

// ScrollManager - handles scroll behavior for navigation
function ScrollManager() {
  const { pathname } = useLocation();
  const lastPathRef = useRef<string>(pathname);
  const isFirstRenderRef = useRef(true);

  // Track scroll position on landing page
  useEffect(() => {
    const handleScroll = () => {
      if (window.location.pathname === LANDING_PAGE_PATH) {
        saveScrollPosition(LANDING_PAGE_PATH, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle scroll behavior on route changes
  useLayoutEffect(() => {
    // Always scroll to top on initial app load
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      lastPathRef.current = pathname;
      return;
    }

    const previousPath = lastPathRef.current;
    lastPathRef.current = pathname;

    // If navigating back to landing page, restore scroll position
    if (pathname === LANDING_PAGE_PATH) {
      const savedPosition = getScrollPosition(LANDING_PAGE_PATH);
      // Use setTimeout for Firefox compatibility
      setTimeout(() => {
        window.scrollTo({ top: savedPosition, left: 0, behavior: 'instant' as ScrollBehavior });
      }, 0);
    } else {
      // For all other navigation, scroll to top immediately
      // Use setTimeout for Firefox compatibility
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }, 0);
    }
  }, [pathname]);

  // Set scroll restoration to manual to prevent browser interference
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
  }, []);

  return null;
}

function App() {
  useEffect(() => {
    console.log('🚀 App component mounted successfully!');
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollManager />
      <TooltipProvider delayDuration={300}>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<ThumPiksLanding />} />
              <Route path="/thumpiks" element={<ThumPiksLanding />} />
              <Route path="/test-thumpiks" element={<ThumPiksTest />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/verify-email/:token"
                element={<VerifyEmailSuccess />}
              />

              {/* Public Content Routes */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />

              {/* Demo Checkout (Development Only) */}
              <Route
                path="/demo-checkout"
                element={
                  <ProtectedRoute>
                    <DemoCheckout />
                  </ProtectedRoute>
                }
              />

              {/* Shared Content Routes (No Auth Required) */}
              <Route path="/shared/:token" element={<SharedThumbnailPage />} />
              <Route
                path="/thumbnails/shared/:token"
                element={<SharedThumbnailPage />}
              />

              {/* User Dashboard Routes - New Design */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHome />} />
                <Route path="thumbnails" element={<MyThumbnailsPage />} />
                <Route path="uploads" element={<UploadsPage />} />
                <Route path="create" element={<DashboardHome />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="editor" element={<ThumbnailStudioPage />} />
                <Route path="editor/:id" element={<ThumbnailStudioPage />} />
                <Route path="brand" element={<BrandPage />} />
                <Route
                  path="ai-tools"
                  element={
                    <ErrorBoundary>
                      <AIToolsPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="vision"
                  element={
                    <ErrorBoundary>
                      <VisionToolPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="visual-search"
                  element={
                    <ErrorBoundary>
                      <VisualSearchPage />
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="ab-testing"
                  element={
                    <ErrorBoundary>
                      <ABTestingPage />
                    </ErrorBoundary>
                  }
                />
                <Route path="trending" element={<TrendingPage />} />
                <Route path="settings" element={<Navigate to="/dashboard/account/settings" replace />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="credits" element={<CreditsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="account/:section" element={<AccountPage />} />
                <Route path="video-editor" element={<VideoEditorPage />} />
                <Route path="create-plus" element={<CreatePlusPage />} />
                <Route
                  path="create-plus/:presetId"
                  element={<PresetEditorPage />}
                />
                <Route
                  path="quick-edit"
                  element={
                    <ErrorBoundary>
                      <QuickEditView />
                    </ErrorBoundary>
                  }
                />
              </Route>

              {/* Legacy Thumbnail Routes - Keep for backwards compatibility */}
              <Route
                path="/thumbnails"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/thumbnails/create"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Canvas Editor Routes */}
              <Route
                path="/canvas-editor"
                element={
                  <ProtectedRoute>
                    <CanvasEditorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/canvas-editor/:id"
                element={
                  <ProtectedRoute>
                    <CanvasEditorPage />
                  </ProtectedRoute>
                }
              />

              {/* Thumbnail Studio - Professional Editor */}
              <Route
                path="/studio"
                element={
                  <ProtectedRoute>
                    <ThumbnailStudioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/studio/:id"
                element={
                  <ProtectedRoute>
                    <ThumbnailStudioPage />
                  </ProtectedRoute>
                }
              />

              {/* Projects Routes */}
              <Route
                path="/projects"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ProjectsPage />} />
                <Route path=":id" element={<ProjectDetail />} />
              </Route>
              {/* Legacy Thumbnail Edit Route - Redirect to Unified Editor */}
              <Route
                path="/thumbnails/edit/:id"
                element={
                  <ProtectedRoute>
                    <RedirectToEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/thumbnails/batch-edit"
                element={
                  <ProtectedRoute>
                    <BatchEditor />
                  </ProtectedRoute>
                }
              />

              {/* Analytics Routes */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <UserAnalyticsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/social"
                element={
                  <ProtectedRoute>
                    <SocialShareAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics/advanced"
                element={
                  <ProtectedRoute>
                    <AdvancedAnalyticsDashboard />
                  </ProtectedRoute>
                }
              />

              {/* User Management Routes */}
              <Route
                path="/settings"
                element={<Navigate to="/dashboard/account/settings" replace />}
              />
              <Route
                path="/profile"
                element={<Navigate to="/dashboard/account/profile" replace />}
              />

              {/* Admin is a separate app at /admin/index.html */}

              {/* Test pages - Development Only */}
              <Route path="/test" element={<TestPage />} />
              <Route path="/shadcn-test" element={<ShadcnTest />} />
              <Route path="/test-studio" element={<ThumbnailStudioPage />} />

              {/* Catch-all - Redirect to Landing Page */}
              <Route path="*" element={<ThumPiksLanding />} />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
      </TooltipProvider>
    </Router>
  );
}

export default App;
