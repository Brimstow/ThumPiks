import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  User,
  History,
  ArrowUpCircle,
  Bell,
  Zap,
  LayoutGrid,
  Home,
  Plus,
  Wand2,
  Edit3,
  Video,
  Folder,
  Palette,
  BarChart2,
  Settings,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

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
    if (location.pathname === path) {
      toggleSidebar();
    } else {
      // Otherwise, expand and navigate
      expandSidebar();
      navigate(path);
    }
  };

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/dashboard' },
    { id: 'create', label: 'Create', icon: Plus, path: '/dashboard/create' },
    { id: 'ai-tools', label: 'AI Tools', icon: Wand2, path: '/dashboard/ai-tools' },
    { id: 'editor', label: 'Editor', icon: Edit3, path: '/dashboard/editor' },
    { id: 'templates', label: 'Templates', icon: Video, path: '/dashboard/templates' },
    { id: 'projects', label: 'Projects', icon: Folder, path: '/dashboard/projects' },
    { id: 'brand', label: 'Brand', icon: Palette, path: '/dashboard/brand' },
    { id: 'analytics', label: 'Analytics', icon: BarChart2, path: '/dashboard/analytics' },
  ];

  const categoryNavItems = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Thumbnails', path: '/dashboard/thumbnails' },
    { label: 'Templates', path: '/dashboard/templates' },
    { label: 'Analytics', path: '/dashboard/analytics' },
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
              className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-slate-700 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand */}
            <a href="#" className="flex-1 lg:flex-none text-center">
              <span className="sm:text-3xl text-2xl font-semibold text-slate-50 tracking-tight">
                ThumPiks
              </span>
            </a>

            {/* Actions */}
            <div className="flex flex-1 sm:gap-3 gap-x-2 gap-y-2 items-center justify-end">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-lg blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
                <button
                  className="relative p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-all"
                  aria-label="Search"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
              <button
                className="hidden sm:inline-flex p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50"
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </button>
              <button
                className="hidden sm:inline-flex p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50"
                aria-label="History"
              >
                <History className="w-5 h-5" />
              </button>
              <button
                className="inline-flex hover:bg-slate-800/80 hover:text-slate-50 text-slate-400 rounded-lg p-2"
                aria-label="Upgrade"
              >
                <ArrowUpCircle className="w-5 h-5" />
              </button>

              {/* Notification */}
              <button className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50">
                <Bell className="w-5 h-5" />
                <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900"></span>
              </button>

              {/* Credits */}
              <div className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-slate-50">90</span>
              </div>

              {/* Add more credits */}
              <button className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#2563ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4fff] whitespace-nowrap">
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
                      location.pathname === item.path ? 'text-slate-50' : ''
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

          {/* Main Navigation */}
          <div className="flex flex-col items-stretch gap-2 w-full">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
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
                location.pathname === '/dashboard/settings'
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
                  location.pathname === '/dashboard/help'
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;