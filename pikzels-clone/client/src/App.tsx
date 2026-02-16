import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import LandingPage from './components/LandingPage';
import LandingPage2 from './components/LandingPage2';
import ThumPiksLanding from './components/PikzelsLanding';
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
import TrendingPage from './components/dashboard/TrendingPage';
import PricingPage from './components/dashboard/PricingPage';
import CreditsPage from './components/dashboard/CreditsPage';
import AIToolsPage from './components/dashboard/AIToolsPage';
import VisionToolPage from './components/dashboard/VisionToolPage';
import VisualSearchPage from './components/dashboard/VisualSearchPage';
import ABTestingPage from './components/dashboard/ABTestingPage';
import ErrorBoundary from './components/ErrorBoundary';
import ThumbnailEditor from './components/ThumbnailEditor';
import BatchEditor from './components/BatchEditor';
import CanvasEditorPage from './pages/CanvasEditorPage';
import ThumbnailStudioPage from './pages/ThumbnailStudioPage';
import UserAnalyticsDashboard from './components/AnalyticsDashboard';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import SocialShareAnalytics from './components/SocialShareAnalytics';
import UserSettings from './components/UserSettings';
import CreateThumbnail from './components/CreateThumbnail';
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

// Admin Components
import AdminLogin from './components/admin/AdminLogin';
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import UserManagement from './components/admin/UserManagement';
import SitemapAdmin from './components/admin/SitemapAdmin';
import AnalyticsDashboard from './components/admin/AnalyticsDashboard';
import SystemHealthMonitoring from './components/admin/SystemHealthMonitoring';
import AuditLogs from './components/admin/AuditLogs';
import AdminSettings from './components/admin/AdminSettings';
import RolePermissionManagement from './components/admin/RolePermissionManagement';
import ContentManagement from './components/admin/ContentManagement';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

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

function App() {
  useEffect(() => {
    console.log('🚀 App component mounted successfully!');
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<ThumPiksLanding />} />
              <Route path="/landing2" element={<LandingPage2 />} />
              <Route path="/thumpiks" element={<ThumPiksLanding />} />
              <Route path="/test-thumpiks" element={<ThumPiksTest />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPassword />}
              />
              <Route
                path="/reset-password"
                element={<ResetPassword />}
              />
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
              <Route path="/demo-checkout" element={
                <ProtectedRoute>
                  <DemoCheckout />
                </ProtectedRoute>
              } />

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
                <Route path="create" element={<DashboardHome />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="editor" element={<ThumbnailStudioPage />} />
                <Route path="editor/:id" element={<ThumbnailStudioPage />} />
                <Route path="brand" element={<BrandPage />} />
                <Route path="ai-tools" element={<ErrorBoundary><AIToolsPage /></ErrorBoundary>} />
                <Route path="vision" element={<ErrorBoundary><VisionToolPage /></ErrorBoundary>} />
                <Route path="visual-search" element={<ErrorBoundary><VisualSearchPage /></ErrorBoundary>} />
                <Route path="ab-testing" element={<ErrorBoundary><ABTestingPage /></ErrorBoundary>} />
                <Route path="trending" element={<TrendingPage />} />
                <Route path="settings" element={<UserSettings />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="pricing" element={<PricingPage />} />
                <Route path="credits" element={<CreditsPage />} />
                <Route path="account" element={<AccountPage />} />
                <Route path="account/:section" element={<AccountPage />} />
                <Route path="video-editor" element={<VideoEditorPage />} />
                <Route path="create-plus" element={<CreatePlusPage />} />
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
              <Route
                path="/thumbnails/edit/:id"
                element={
                  <ProtectedRoute>
                    <ThumbnailEditor />
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
                element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <UserSettings />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />

                {/* User Management */}
                <Route
                  path="users"
                  element={
                    <AdminProtectedRoute requiredPermissions={['users.view']}>
                      <UserManagement />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="users/roles"
                  element={
                    <AdminProtectedRoute requiredPermissions={['admin.roles']}>
                      <RolePermissionManagement />
                    </AdminProtectedRoute>
                  }
                />

                {/* Content Management */}
                <Route
                  path="content"
                  element={
                    <AdminProtectedRoute requiredPermissions={['content.view']}>
                      <ContentManagement />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="content/thumbnails"
                  element={
                    <AdminProtectedRoute requiredPermissions={['content.view']}>
                      <ContentManagement />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="content/templates"
                  element={
                    <AdminProtectedRoute requiredPermissions={['content.view']}>
                      <ContentManagement />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="content/projects"
                  element={
                    <AdminProtectedRoute requiredPermissions={['content.view']}>
                      <ContentManagement />
                    </AdminProtectedRoute>
                  }
                />

                {/* Sitemap */}
                <Route
                  path="sitemap"
                  element={
                    <AdminProtectedRoute requiredPermissions={['content.view']}>
                      <SitemapAdmin />
                    </AdminProtectedRoute>
                  }
                />

                {/* Analytics */}
                <Route
                  path="analytics"
                  element={
                    <AdminProtectedRoute
                      requiredPermissions={['analytics.view']}
                    >
                      <AnalyticsDashboard />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="analytics/users"
                  element={
                    <AdminProtectedRoute
                      requiredPermissions={['analytics.view']}
                    >
                      <AnalyticsDashboard />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="analytics/performance"
                  element={
                    <AdminProtectedRoute
                      requiredPermissions={['analytics.view']}
                    >
                      <AnalyticsDashboard />
                    </AdminProtectedRoute>
                  }
                />

                {/* System Management */}
                <Route
                  path="system/health"
                  element={
                    <AdminProtectedRoute
                      requiredPermissions={['system.health']}
                    >
                      <SystemHealthMonitoring />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="system/logs"
                  element={
                    <AdminProtectedRoute requiredPermissions={['system.logs']}>
                      <AuditLogs />
                    </AdminProtectedRoute>
                  }
                />
                <Route
                  path="system/settings"
                  element={
                    <AdminProtectedRoute
                      requiredPermissions={['system.config']}
                    >
                      <AdminSettings />
                    </AdminProtectedRoute>
                  }
                />
              </Route>

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
    </Router>
  );
}

export default App;
