import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  History,
  ArrowUpCircle,
  Zap,
  LayoutGrid,
  Home,
  Plus,
  Wand2,
  Folder,
  Palette,
  BarChart2,
  Eye,
  Settings,
  HelpCircle,
  ChevronRight,
  X,
  GitBranch,
  LayoutTemplate,
  SearchCode,
  Sparkles,
  PenTool,
  Video,
} from 'lucide-react';
import AccountDropdown from '../account/AccountDropdown';
import NotificationsDropdown from '../notifications/NotificationsDropdown';
import SearchModal from '../search/SearchModal';
import { authGet } from '../../utils/api';
import { getDisclosurePref, setDisclosurePref } from '../ui/CollapsibleSection';
import { OnboardingOverlay } from '../../features/onboarding';
import { FeedbackWidget } from '../../features/feedback';
import { GlobalChatWidget } from '../../features/global-chat';

interface Subscription {
  creditsBalance: number;
  planType: string;
}

const DashboardLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch subscription data
  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await authGet('/api/subscription/current');
        if (response.ok) {
          const data = await response.json();
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      }
    };
    fetchSubscription();
  }, []);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const expandSidebar = () => {
    if (!sidebarExpanded) {
      setSidebarExpanded(true);
    }
  };

  const handleNavClick = (path: string) => {
    // If clicking on the current active page, toggle sidebar
    if (location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))) {
      toggleSidebar();
    } else {
      // Otherwise, expand and navigate
      expandSidebar();
      navigate(path);
    }
  };

  // Check if a nav item is active (supports nested routes)
  const isNavActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Progressive disclosure: 5 core items always visible, 6 behind "More"
  const coreNavItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
    { id: 'quick-edit', label: 'Quick Edit', icon: Sparkles, path: '/dashboard/quick-edit' },
    { id: 'create', label: 'Create', icon: Plus, path: '/dashboard/create-plus' },
    { id: 'editor', label: 'Editor', icon: PenTool, path: '/dashboard/editor' },
    { id: 'video-editor', label: 'Video Editor', icon: Video, path: '/dashboard/video-editor' },
    { id: 'projects', label: 'Projects', icon: Folder, path: '/dashboard/projects' },
    { id: 'templates', label: 'Templates', icon: LayoutTemplate, path: '/dashboard/templates' },
  ];

  const moreNavItems = [
    { id: 'ai-tools', label: 'AI Tools', icon: Wand2, path: '/dashboard/ai-tools' },
    { id: 'vision', label: 'Vision', icon: Eye, path: '/dashboard/vision' },
    { id: 'visual-search', label: 'Search', icon: SearchCode, path: '/dashboard/visual-search' },
    { id: 'ab-testing', label: 'A/B Test', icon: GitBranch, path: '/dashboard/ab-testing' },
    { id: 'brand', label: 'Brand', icon: Palette, path: '/dashboard/brand' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, path: '/dashboard/analytics' },
  ];

  // All items combined (used by mobile menu)
  const allNavItems = [...coreNavItems, ...moreNavItems];

  // "More" section expanded state — persisted
  const [moreExpanded, setMoreExpanded] = useState(() => getDisclosurePref('sidebar.moreExpanded'));

  const toggleMore = () => {
    setMoreExpanded((prev) => {
      const next = !prev;
      setDisclosurePref('sidebar.moreExpanded', next);
      return next;
    });
  };

  // If user navigates to a "More" item, auto-expand the section
  useEffect(() => {
    const isMoreItemActive = moreNavItems.some((item) => isNavActive(item.path));
    if (isMoreItemActive && !moreExpanded) {
      setMoreExpanded(true);
      setDisclosurePref('sidebar.moreExpanded', true);
    }
  }, [location.pathname, moreExpanded, moreNavItems]);

  // Category nav — deduped (no Templates/Analytics since they're in sidebar)
  const categoryNavItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Thumbnails', path: '/dashboard/thumbnails' },
    { label: 'Uploads', path: '/dashboard/uploads' },
    { label: 'Trending', path: '/dashboard/trending' },
    { label: 'Pricing', path: '/dashboard/pricing' },
    { label: 'Help', path: '/dashboard/help' },
  ];

  return (
    <div
      className={`min-h-screen transition-all duration-300 ${
        sidebarExpanded ? 'lg:pl-[200px]' : 'lg:pl-16'
      } text-slate-100 bg-[#020817]`}
    >
      {/* Header */}
      <header className="sticky z-40 bg-[#020817]/95 border-b border-slate-800 top-0 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Brand */}
            <button onClick={() => navigate('/dashboard')} className="flex-1 lg:flex-none text-center">
              <span className="sm:text-3xl text-2xl font-semibold text-slate-50 tracking-tight">
                ThumPiks
              </span>
            </button>

            {/* Actions */}
            <div className="flex flex-1 sm:gap-3 gap-x-2 gap-y-2 items-center justify-end">
              {/* Search Button */}
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-all"
                  aria-label="Search (⌘K)"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>

              {/* Account Dropdown */}
              <AccountDropdown />

              {/* History Button */}
              <button
                onClick={() => navigate('/dashboard/thumbnails')}
                className="hidden sm:inline-flex p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-colors"
                aria-label="History"
                title="View your thumbnails"
              >
                <History className="w-5 h-5" />
              </button>

              {/* Upgrade Button */}
              <button
                onClick={() => navigate('/dashboard/pricing')}
                className="inline-flex hover:bg-slate-800/80 hover:text-slate-50 text-slate-400 rounded-lg p-2 transition-colors"
                aria-label="Upgrade"
                title="Upgrade your plan"
              >
                <ArrowUpCircle className="w-5 h-5" />
              </button>

              {/* Notifications Dropdown */}
              <NotificationsDropdown />

              {/* Credits Display - Clickable */}
              <button
                onClick={() => navigate('/dashboard/credits')}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 hover:bg-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer"
                title="View billing & usage"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-slate-50">
                  {subscription?.creditsBalance ?? '...'}
                </span>
              </button>

              {/* Add more credits */}
              <button
                onClick={() => navigate('/dashboard/credits')}
                className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#2563ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4fff] whitespace-nowrap transition-colors"
              >
                Add more credits
              </button>
            </div>
          </div>
        </div>

        {/* Category Nav */}
        <nav className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ul className="flex gap-5 overflow-x-auto py-3 text-sm text-slate-400">
              {categoryNavItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => navigate(item.path)}
                    className={`hover:text-slate-50 whitespace-nowrap ${
                      isNavActive(item.path) ? 'text-slate-50' : ''
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {/* Sidebar */}
      <nav
        className="hidden lg:flex flex-col fixed transition-all duration-300 z-50 bg-[#020818] border-slate-800 border-r pt-4 pb-4 top-0 bottom-0 left-0 backdrop-blur items-center justify-between"
        style={{ width: sidebarExpanded ? '200px' : '64px' }}
      >
        {/* Top section */}
        <div className="flex flex-col w-full px-2 gap-y-4 items-stretch">
          {/* Logo */}
          <div className="flex items-center justify-start px-2">
            <div className="h-10 w-10 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-center shadow-md shadow-black/40 text-slate-100">
              <LayoutGrid className="w-5 h-5" />
            </div>
          </div>

          {/* Divider */}
          <div className="h-px w-8 bg-slate-800 mx-auto"></div>

          {/* Core Navigation */}
          <div className="flex flex-col items-stretch gap-2 w-full">
            {coreNavItems.map((item) => {
              const isActive = isNavActive(item.path);
              return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.path)}
                className={`w-full h-10 rounded-xl flex items-center justify-start group px-2 transition-colors ${
                  isActive 
                    ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white' 
                    : 'hover:bg-[#202020] text-slate-100'
                }`}
                aria-label={item.label}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 flex justify-center shrink-0">
                    <item.icon className="w-5 h-5" />
                  </div>
                  {sidebarExpanded && (
                    <span className="text-sm font-medium text-slate-100 whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </div>
              </button>
            )})}

            {/* "More" toggle */}
            <button
              onClick={toggleMore}
              className="w-full h-8 rounded-xl flex items-center justify-start px-2 transition-colors hover:bg-[#202020] text-slate-500 hover:text-slate-300 mt-1"
              aria-expanded={moreExpanded}
              aria-label={moreExpanded ? 'Show fewer options' : 'Show more options'}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 flex justify-center shrink-0">
                  <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${moreExpanded ? 'rotate-90' : ''}`} />
                </div>
                {sidebarExpanded && (
                  <span className="text-xs font-medium uppercase tracking-wider whitespace-nowrap">
                    More
                    {!moreExpanded && <span className="ml-1.5 text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full">{moreNavItems.length}</span>}
                  </span>
                )}
              </div>
            </button>

            {/* More Navigation Items — collapsible */}
            <div
              className="flex flex-col items-stretch gap-2 overflow-hidden transition-all duration-200 ease-out"
              style={{ maxHeight: moreExpanded ? `${moreNavItems.length * 48}px` : '0px', opacity: moreExpanded ? 1 : 0 }}
            >
              {moreNavItems.map((item) => {
                const isActive = isNavActive(item.path);
                return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full h-10 rounded-xl flex items-center justify-start group px-2 transition-colors ${
                    isActive 
                      ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white' 
                      : 'hover:bg-[#202020] text-slate-100'
                  }`}
                  aria-label={item.label}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="w-6 flex justify-center shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    {sidebarExpanded && (
                      <span className="text-sm font-medium text-slate-100 whitespace-nowrap">
                        {item.label}
                      </span>
                    )}
                  </div>
                </button>
              )})}
            </div>
          </div>
        </div>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          <button
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-sm mb-1 hover:bg-slate-200 transition-colors"
            aria-label="Toggle sidebar"
          >
            <ChevronRight
              className={`w-5 h-5 transition-transform ${
                sidebarExpanded ? 'rotate-180' : ''
              }`}
              style={{ color: '#0F172A' }}
            />
          </button>

          {/* Settings row */}
          <div className="w-full border-t border-slate-800 pt-3">
            <button
              className={`h-10 w-full rounded-xl flex items-center justify-start mb-2 px-2 group transition-colors ${
                isNavActive('/dashboard/settings')
                  ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                  : 'hover:bg-[#202020] text-slate-100'
              }`}
              aria-label="Settings"
              onClick={() => handleNavClick('/dashboard/settings')}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-6 flex justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                {sidebarExpanded && (
                  <span className="text-sm font-medium text-slate-100 whitespace-nowrap">
                    Settings
                  </span>
                )}
              </div>
            </button>

            {/* Help button */}
            <div className="w-full">
              <button
                className={`w-full h-10 rounded-xl flex items-center justify-start px-2 transition-colors ${
                  isNavActive('/dashboard/help')
                    ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                    : 'hover:bg-[#202020] text-slate-100'
                }`}
                onClick={() => handleNavClick('/dashboard/help')}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 flex justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  {sidebarExpanded && (
                    <span className="text-sm font-medium whitespace-nowrap">Questions?</span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Onboarding Overlay - shows for new users */}
      <OnboardingOverlay />

      {/* Main Content */}
      <main className={
        location.pathname === '/dashboard/video-editor'
          ? 'overflow-hidden'
          : 'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8'
      }>
        <Outlet />
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav className="fixed top-16 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 lg:hidden overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="p-4 space-y-2">
              {allNavItems.map((item) => {
                const isActive = isNavActive(item.path);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full h-10 rounded-xl flex items-center justify-start px-3 transition-colors ${
                      isActive
                        ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                        : 'hover:bg-slate-800 text-slate-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5 mr-3" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
              
              <div className="border-t border-slate-800 pt-4 mt-4">
                <button
                  onClick={() => {
                    navigate('/dashboard/settings');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full h-10 rounded-xl flex items-center justify-start px-3 transition-colors ${
                    isNavActive('/dashboard/settings')
                      ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                      : 'hover:bg-slate-800 text-slate-100'
                  }`}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">Settings</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/dashboard/help');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full h-10 rounded-xl flex items-center justify-start px-3 mt-2 transition-colors ${
                    isNavActive('/dashboard/help')
                      ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                      : 'hover:bg-slate-800 text-slate-100'
                  }`}
                >
                  <HelpCircle className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">Help</span>
                </button>
              </div>
            </div>
          </nav>
        </>
      )}

      {/* Feedback Widget */}
      <FeedbackWidget />

      {/* Global Chat Widget */}
      <GlobalChatWidget />

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default DashboardLayout;