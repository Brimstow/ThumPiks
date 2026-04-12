import React, { useState, useEffect, useRef } from 'react';
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
  Star,
} from 'lucide-react';
import AccountDropdown from '../account/AccountDropdown';
import NotificationsDropdown from '../notifications/NotificationsDropdown';
import SearchModal from '../search/SearchModal';
import Tooltip from '../ui/Tooltip';
import { useCredits } from '../../hooks/useCredits';
import { getDisclosurePref, setDisclosurePref } from '../ui/CollapsibleSection';
import { OnboardingOverlay } from '../../features/onboarding';
import { FeedbackWidget } from '../../features/feedback';
import { GlobalChatWidget } from '../../features/global-chat';
import { prefetchPricingData } from '../../hooks/usePricingData';
import { prefetchMyThumbnailsData } from './MyThumbnailsPage';
import { prefetchUploadsData } from './UploadsPage';

const DashboardLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [betaBannerDismissed, setBetaBannerDismissed] = useState(
    () => sessionStorage.getItem('betaBannerDismissed') === 'true'
  );
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Shared TanStack Query — same cache key as CreditsPage, so both stay in sync
  const { data: creditsData } = useCredits();
  const creditTotal = creditsData?.subscription
    ? (creditsData.subscription.creditsBalance + (creditsData.subscription.addonCreditsBalance ?? 0))
    : null;

  const warmRouteData = (path: string) => {
    if (path === '/dashboard/pricing') {
      void prefetchPricingData();
      return;
    }

    if (path === '/dashboard/thumbnails') {
      void prefetchMyThumbnailsData();
      return;
    }

    if (path === '/dashboard/uploads') {
      void prefetchUploadsData();
    }
  };


  useEffect(() => {
    const runPrefetch = () => {
      warmRouteData('/dashboard/pricing');
      warmRouteData('/dashboard/thumbnails');
      warmRouteData('/dashboard/uploads');
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(() => runPrefetch(), {
        timeout: 1500,
      });
      return () => {
        if (idleWindow.cancelIdleCallback) {
          idleWindow.cancelIdleCallback(idleId);
        }
      };
    }

    const timeoutId = window.setTimeout(runPrefetch, 500);
    return () => window.clearTimeout(timeoutId);
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
    warmRouteData(path);

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
    { id: 'vision', label: 'Vision Analysis', icon: Eye, path: '/dashboard/vision' },
    { id: 'visual-search', label: 'Vision Search', icon: SearchCode, path: '/dashboard/visual-search' },
    { id: 'ab-testing', label: 'A/B Test', icon: GitBranch, path: '/dashboard/ab-testing' },
    { id: 'brand', label: 'Brand Kit', icon: Palette, path: '/dashboard/brand' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, path: '/dashboard/analytics' },
  ];

  // All items combined (used by mobile menu)
  const allNavItems = [...coreNavItems, ...moreNavItems];

  // "More" section expanded state — persisted
  const [moreExpanded, setMoreExpanded] = useState(() => getDisclosurePref('sidebar.moreExpanded'));
  const navScrollRef = useRef<HTMLDivElement>(null);
  const moreItemsRef = useRef<HTMLDivElement>(null);

  const toggleMore = () => {
    setMoreExpanded((prev) => {
      const next = !prev;
      setDisclosurePref('sidebar.moreExpanded', next);
      // Scroll so the expanded More items are fully visible after CSS transition
      if (next) {
        setTimeout(() => {
          moreItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 370);
      }
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
            <button onClick={() => navigate('/dashboard')} className="flex-1 lg:flex-none text-center flex items-center justify-center lg:justify-start gap-2">
              <span className="sm:text-3xl text-2xl font-semibold text-slate-50 tracking-tight">
                ThumPiks
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase bg-blue-600/15 text-blue-400 border border-blue-500/25 px-1.5 py-0.5 rounded hidden sm:inline-block">
                Beta
              </span>
            </button>

            {/* Actions */}
            <div className="flex flex-1 sm:gap-3 gap-x-2 gap-y-2 items-center justify-end">
              {/* Search Button */}
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
                <Tooltip content="Search (⌘K)">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="relative p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-all"
                  aria-label="Search (⌘K)"
                >
                  <Search className="w-5 h-5" />
                </button>
                </Tooltip>
              </div>

              {/* Account Dropdown */}
              <AccountDropdown />

              {/* History Button */}
              <Tooltip content="My Thumbnails">
              <button
                onClick={() => navigate('/dashboard/thumbnails')}
                onMouseEnter={() => warmRouteData('/dashboard/thumbnails')}
                onFocus={() => warmRouteData('/dashboard/thumbnails')}
                className="hidden sm:inline-flex p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-colors"
                aria-label="History"
              >
                <History className="w-5 h-5" />
              </button>
              </Tooltip>

              {/* Upgrade Button */}
              <Tooltip content="Upgrade your plan">
              <button
                onClick={() => {
                  warmRouteData('/dashboard/pricing');
                  navigate('/dashboard/pricing');
                }}
                onMouseEnter={() => warmRouteData('/dashboard/pricing')}
                onFocus={() => warmRouteData('/dashboard/pricing')}
                className="inline-flex hover:bg-slate-800/80 hover:text-slate-50 text-slate-400 rounded-lg p-2 transition-colors"
                aria-label="Upgrade"
              >
                <ArrowUpCircle className="w-5 h-5" />
              </button>
              </Tooltip>

              {/* Notifications Dropdown */}
              <NotificationsDropdown />

              {/* Credits Display - Clickable */}
              <Tooltip content="View billing & usage">
              <button
                onClick={() => navigate('/dashboard/credits')}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 hover:bg-slate-800/80 hover:border-slate-700 transition-colors cursor-pointer"
              >
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-slate-50">
                  {creditTotal !== null ? creditTotal : '...'}
                </span>
              </button>
              </Tooltip>

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

        {/* Beta Flash Banner — dismissable per session */}
        {!betaBannerDismissed && (
          <div className="bg-blue-600/10 border-b border-blue-500/20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-blue-300">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>
                  <strong className="text-blue-200">ThumPiks is in Beta</strong>
                  <span className="hidden sm:inline"> — Features may change. We'd love your </span>
                  <span className="sm:hidden"> — </span>
                  <button
                    onClick={() => setFeedbackOpen(true)}
                    className="underline underline-offset-2 hover:text-blue-100 transition-colors"
                  >
                    feedback
                  </button>
                  <span className="hidden sm:inline">!</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setBetaBannerDismissed(true);
                  sessionStorage.setItem('betaBannerDismissed', 'true');
                }}
                className="text-blue-400/60 hover:text-blue-300 transition-colors shrink-0"
                aria-label="Dismiss beta notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Category Nav */}
        <nav className="border-t border-slate-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ul className="flex gap-5 overflow-x-auto py-3 text-sm text-slate-400">
              {categoryNavItems.map((item) => (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      warmRouteData(item.path);
                      navigate(item.path);
                    }}
                    onMouseEnter={() => warmRouteData(item.path)}
                    onFocus={() => warmRouteData(item.path)}
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
        className="hidden lg:flex flex-col fixed transition-all duration-300 z-50 bg-[#020818] border-slate-800 border-r top-0 bottom-0 left-0 backdrop-blur overflow-visible h-screen"
        style={{ width: sidebarExpanded ? '200px' : '64px' }}
      >
        {/* Rail toggle — half-circle ear on the right edge, vertically centered */}
        <button
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
          className="absolute top-1/2 -translate-y-1/2 -right-[14px] z-10 flex items-center justify-center transition-colors group"
          style={{
            width: '14px',
            height: '40px',
            background: '#020818',
            borderRadius: '0 20px 20px 0',
            borderTop: '1px solid #1e293b',
            borderRight: '1px solid #1e293b',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <ChevronRight
            className={`w-3 h-3 text-slate-500 group-hover:text-slate-200 transition-all duration-300 ${
              sidebarExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>
        {/* Top section — scrollable, stops above bottom section */}
        <div className="flex flex-col w-full px-2 gap-y-4 items-stretch overflow-y-auto scrollbar-none" style={{ paddingBottom: '160px' }} ref={navScrollRef}>
          {/* Logo — height matches header h-16 (64px) so it aligns with ThumPiks */}
          <div className="flex items-center justify-start px-2 h-16 shrink-0">
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
              <Tooltip key={item.id} content={!sidebarExpanded ? item.label : ''} side="right">
              <button
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
              </Tooltip>
            )})}

            {/* "More" toggle */}
            <Tooltip content={!sidebarExpanded ? (moreExpanded ? 'Show less' : 'More') : ''} side="right">
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
            </Tooltip>

            {/* More Navigation Items — collapsible */}
            <div
              ref={moreItemsRef}
              style={{
                display: 'grid',
                gridTemplateRows: moreExpanded ? '1fr' : '0fr',
                opacity: moreExpanded ? 1 : 0,
                transition: moreExpanded
                  ? 'grid-template-rows 380ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0, 0.2, 1) 60ms'
                  : 'opacity 180ms cubic-bezier(0.4, 0, 0.2, 1), grid-template-rows 360ms cubic-bezier(0.4, 0, 0.2, 1) 60ms',
              }}
            >
              <div className="overflow-hidden">
                <div className="flex flex-col items-stretch gap-2 pt-0.5">
                  {moreNavItems.map((item) => {
                    const isActive = isNavActive(item.path);
                    return (
                    <Tooltip key={item.id} content={!sidebarExpanded ? item.label : ''} side="right">
                    <button
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
                    </Tooltip>
                  )})}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section — absolutely pinned to nav bottom, always visible */}
        <div className="absolute bottom-0 left-0 right-0 w-full px-2 pb-4 bg-[#020818] border-t border-slate-800">

          {/* Settings */}
          <Tooltip content={!sidebarExpanded ? 'Settings' : ''} side="right">
          <button
            className={`h-10 w-full rounded-xl flex items-center justify-start mt-3 px-2 group transition-colors ${
              isNavActive('/dashboard/account')
                ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                : 'hover:bg-[#202020] text-slate-100'
            }`}
            aria-label="Settings"
            onClick={() => handleNavClick('/dashboard/account/settings')}
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
          </Tooltip>

          {/* Leave a Review */}
          <Tooltip content={!sidebarExpanded ? 'Leave a Review' : ''} side="right">
          <button
            className="h-10 w-full rounded-xl flex items-center justify-start mt-1 px-2 transition-colors hover:bg-yellow-600/10 text-yellow-500 hover:text-yellow-400"
            aria-label="Leave a Review"
            onClick={() => navigate('/reviews')}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 flex justify-center shrink-0">
                <Star className="w-5 h-5" />
              </div>
              {sidebarExpanded && (
                <span className="text-sm font-medium whitespace-nowrap">Leave a Review</span>
              )}
            </div>
          </button>
          </Tooltip>

          {/* Questions / Help */}
          <Tooltip content={!sidebarExpanded ? 'Help' : ''} side="right">
          <button
            className={`h-10 w-full rounded-xl flex items-center justify-start mt-1 px-2 transition-colors ${
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
          </Tooltip>
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
                      warmRouteData(item.path);
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
                    navigate('/dashboard/account/settings');
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full h-10 rounded-xl flex items-center justify-start px-3 transition-colors ${
                    isNavActive('/dashboard/account')
                      ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
                      : 'hover:bg-slate-800 text-slate-100'
                  }`}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">Settings</span>
                </button>
                <button
                  onClick={() => {
                    navigate('/reviews');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full h-10 rounded-xl flex items-center justify-start px-3 mt-2 transition-colors hover:bg-yellow-600/10 text-yellow-500 hover:text-yellow-400"
                >
                  <Star className="w-5 h-5 mr-3" />
                  <span className="text-sm font-medium">Leave a Review</span>
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
      <FeedbackWidget externalOpen={feedbackOpen} onExternalOpenHandled={() => setFeedbackOpen(false)} />

      {/* Global Chat Widget - hidden on editor page where it overlaps the in-editor AI Chat */}
      {location.pathname !== '/dashboard/editor' && <GlobalChatWidget />}

      {/* Search Modal */}
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

export default DashboardLayout;