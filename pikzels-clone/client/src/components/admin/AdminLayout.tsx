import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DashboardProvider } from '../../contexts/DashboardContext';
import { getAdminUser, isAdminAuthenticated } from '../../services/admin/adminApiClient';
import { adminAuthService } from '../../services/admin/adminAuthService';
import { useAdminNavItems } from '../../features/admin';
import type { AdminNavItem } from '../../features/admin';
import { 
  Bell, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  Search,
  Maximize2,
  Minimize2,
  Zap,
} from 'lucide-react';

interface AdminUserData {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  avatar?: string | null;
  lastLogin?: string;
}

const AdminLayout: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Load admin user from authenticated session
  useEffect(() => {
    let cancelled = false;

    async function loadAdminUser() {
      if (!isAdminAuthenticated()) {
        navigate('/admin/login', { replace: true });
        return;
      }

      // Show cached user instantly while validating
      const cached = getAdminUser() as AdminUserData | null;
      if (cached) {
        setAdminUser(cached);
        setIsLoading(false);
      }

      // Validate session with backend/mock
      const result = await adminAuthService.getCurrentAdmin();
      if (cancelled) return;

      if (result.success && result.data) {
        setAdminUser(result.data as AdminUserData);
        setIsLoading(false);
      } else if (!cached) {
        navigate('/admin/login', { replace: true });
      }
    }

    loadAdminUser();
    return () => { cancelled = true; };
  }, [navigate]);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Enhanced search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search logic here
    console.log('Searching for:', query);
  };

  // Navigation items from the admin module registry, filtered by permissions
  const visibleNavItems = useAdminNavItems(adminUser?.permissions ?? []);

  const handleLogout = async () => {
    await adminAuthService.logout();
    navigate('/admin/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020817] text-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#2563ff] border-t-transparent"></div>
          <p className="text-slate-400 text-sm">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!adminUser) {
    return null;
  }

  return (
    <DashboardProvider>
      <div className="flex h-screen relative overflow-hidden bg-[#020817] text-slate-100">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:flex ${
        sidebarExpanded ? 'w-64' : 'w-20'
      } bg-[#020818] border-r border-slate-800 transition-all duration-500 flex-col`}>
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className={`${!sidebarExpanded ? 'hidden' : 'block'} transition-all duration-500`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0F172A] border border-slate-700 flex items-center justify-center shadow-md shadow-black/40">
                  <Zap className="w-6 h-6 text-slate-100" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-50">Admin Panel</h2>
                  <p className="text-sm text-slate-400">ThumPiks</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSidebarExpanded(!sidebarExpanded)}
              className="p-2 rounded-xl hover:bg-[#202020] text-slate-400 transition-colors"
              title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <ChevronDown size={20} className={`transition-transform ${sidebarExpanded ? 'rotate-90' : '-rotate-90'}`} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {sidebarExpanded && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search admin panel..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff] focus:border-transparent transition-all text-sm"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-400 font-mono">⌘K</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {visibleNavItems.map((item, index) => (
            <div
              key={item.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-in slide-in-from-left-5 duration-500"
            >
              <NavItem 
                item={item} 
                currentPath={location.pathname}
                sidebarOpen={sidebarExpanded}
              />
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 bg-[#2563ff] rounded-xl flex items-center justify-center text-white text-sm font-bold">
                {adminUser.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#020818] bg-green-400"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{adminUser.name}</p>
              <p className="text-xs text-slate-400 truncate">{adminUser.role}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div className={`lg:hidden fixed inset-0 z-10 bg-black/60 backdrop-blur-sm flex items-center justify-center ${
        mobileMenuOpen ? 'block' : 'hidden'
      }`}>
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-50">Admin Panel</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-xl transition-colors text-slate-400 hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="space-y-2">
            {visibleNavItems.map((item, index) => (
              <div
                key={item.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-in slide-in-from-left-5 duration-500"
              >
                <button
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                      ? 'bg-[#2563ff] text-white'
                      : 'text-slate-100 hover:bg-[#202020]'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              </div>
            ))}
          </nav>
          
          <button
            onClick={() => {
              handleLogout();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-400 hover:bg-red-500/10 mt-4"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-800 px-6 py-4 bg-[#020817]/95 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl transition-colors text-slate-400 hover:text-slate-50 hover:bg-slate-800/80"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              <div>
                <h1 className="text-2xl font-bold text-slate-50">Admin Dashboard</h1>
                <p className="text-sm text-slate-400">Welcome back, {adminUser.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Search (Desktop) */}
              <div className="hidden md:block relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff] focus:border-transparent transition-all text-sm"
                />
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-colors"
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                
                <button className="relative p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-colors">
                  <Bell size={20} />
                  {notifications > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {notifications}
                      </span>
                      <span className="absolute -top-1 -right-1 bg-red-400 rounded-full h-5 w-5 animate-ping"></span>
                    </>
                  )}
                </button>

                {/* User Menu */}
                <div className="flex items-center gap-3 ml-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-slate-50">{adminUser.name}</p>
                    <p className="text-xs text-slate-400">{adminUser.email}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-[#2563ff] rounded-xl flex items-center justify-center text-white text-sm font-bold hover:bg-[#1d4fff] transition-colors cursor-pointer">
                      {adminUser.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#020817] bg-green-400"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
    </DashboardProvider>
  );
};

// Navigation Item Component
interface NavItemProps {
  item: AdminNavItem;
  currentPath: string;
  sidebarOpen: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, currentPath, sidebarOpen }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const isActive = currentPath === item.path || currentPath.startsWith(item.path + '/');
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else {
      navigate(item.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full h-10 rounded-xl flex items-center justify-between px-3 transition-colors group ${
          isActive 
            ? 'bg-[#2563ff] hover:bg-[#1d4fff] text-white'
            : 'hover:bg-[#202020] text-slate-100'
        }`}
        title={!sidebarOpen ? item.label : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="w-6 flex justify-center shrink-0">
            {item.icon}
          </div>
          {sidebarOpen && (
            <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
          )}
        </div>
        {sidebarOpen && hasChildren && (
          <ChevronDown 
            size={16} 
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            } ${isActive ? 'text-white' : 'text-slate-400'}`} 
          />
        )}
      </button>

      {/* Sub-navigation */}
      {sidebarOpen && hasChildren && isOpen && (
        <div className="ml-6 mt-1 space-y-1">
          {item.children?.map((child) => (
            <button
              key={child.id}
              onClick={() => navigate(child.path)}
              className={`w-full h-9 flex items-center gap-3 px-3 rounded-xl text-sm transition-colors ${
                currentPath === child.path
                  ? 'bg-[#2563ff]/80 text-white'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-[#202020]'
              }`}
            >
              <div className="w-5 flex justify-center shrink-0">
                {child.icon}
              </div>
              <span className="font-medium">{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminLayout;