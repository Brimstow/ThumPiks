import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef } from 'react';
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
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Eager: Landing + Auth (needed on first paint)
import ThumPiksLanding from './components/ThumPiksLanding';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';

// Lazy: Auth supplementary
const VerifyEmailSuccess = lazy(() => import('./components/auth/VerifyEmailSuccess'));

// Lazy: Dashboard shell + pages
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'));
const DashboardHome = lazy(() => import('./components/dashboard/DashboardHome'));
const HelpPage = lazy(() => import('./components/dashboard/HelpPage'));
const BrandPage = lazy(() => import('./components/dashboard/BrandPage'));
const ProjectsPage = lazy(() => import('./components/dashboard/ProjectsPage'));
const ProjectDetail = lazy(() => import('./components/projects/ProjectDetail'));
const TemplatesPage = lazy(() => import('./components/dashboard/TemplatesPage'));
const AnalyticsPage = lazy(() => import('./components/dashboard/AnalyticsPage'));
const MyThumbnailsPage = lazy(() => import('./components/dashboard/MyThumbnailsPage'));
const UploadsPage = lazy(() => import('./components/dashboard/UploadsPage'));
const TrendingPage = lazy(() => import('./components/dashboard/TrendingPage'));
const PricingPage = lazy(() => import('./components/dashboard/PricingPage'));
const CreditsPage = lazy(() => import('./components/dashboard/CreditsPage'));
const NotificationsPage = lazy(() => import('./components/notifications/NotificationsPage'));
const AIToolsPage = lazy(() => import('./components/dashboard/AIToolsPage'));
const VisionToolPage = lazy(() => import('./components/dashboard/VisionToolPage'));
const VisualSearchPage = lazy(() => import('./components/dashboard/VisualSearchPage'));
const ABTestingPage = lazy(() => import('./components/dashboard/ABTestingPage'));
const QuickEditView = lazy(() => import('./components/dashboard/QuickEditView'));
const AccountPage = lazy(() => import('./components/account/AccountPage'));
const DemoCheckout = lazy(() => import('./components/dashboard/DemoCheckout'));

// Lazy: Editors (heaviest components)
const ThumbnailStudioPage = lazy(() => import('./pages/ThumbnailStudioPage'));
const CanvasEditorPage = lazy(() => import('./pages/CanvasEditorPage'));
const PresetEditorPage = lazy(() => import('./pages/PresetEditorPage'));
const VideoEditorPage = lazy(() => import('./pages/VideoEditorPage'));
const CreatePlusPage = lazy(() => import('./pages/CreatePlusPage'));
const BatchEditor = lazy(() => import('./components/BatchEditor'));

// Lazy: Analytics
const UserAnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));
const AdvancedAnalyticsDashboard = lazy(() => import('./components/AdvancedAnalyticsDashboard'));
const SocialShareAnalytics = lazy(() => import('./components/SocialShareAnalytics'));

// Lazy: Static content pages
const AboutPage = lazy(() => import('./components/AboutPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const PrivacyPage = lazy(() => import('./components/PrivacyPage'));
const TermsPage = lazy(() => import('./components/TermsPage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage'));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage'));

// Lazy: Misc
const SharedThumbnailPage = lazy(() => import('./components/SharedThumbnailPage'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const ThumPiksTest = lazy(() => import('./components/PikzelsTest'));
const ShadcnTest = lazy(() => import('./components/ShadcnTest'));

// Import custom styles
import './styles/animations.css';

// Suspense fallback for lazy-loaded routes
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--background, #0a0a0a)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid #2563ff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#888', fontSize: '14px' }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}



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
            <Suspense fallback={<PageLoader />}>
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
            </Suspense>
          </div>
        </AuthProvider>
      </ThemeProvider>
      </TooltipProvider>
    </Router>
  );
}

export default App;
