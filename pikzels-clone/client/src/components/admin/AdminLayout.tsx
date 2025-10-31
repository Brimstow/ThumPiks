import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { DashboardProvider } from '../../contexts/DashboardContext';
import InteractiveBackground from '../ui/InteractiveBackground';
import { ThemeToggleButton } from '../ui/ThemeSelector';
import { 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  Activity, 
  FileText, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  Home,
  Image,
  Layout,
  Monitor,
  Globe,
  Search,
  Moon,
  Sun,
  Maximize2,
  Minimize2,
  HelpCircle,
  Command,
  Zap
} from 'lucide-react';

interface AdminNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  children?: AdminNavItem[];
}

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notifications] = useState(3);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Enhanced admin user with more details
  const adminUser = {
    id: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    roles: ['super_admin'],
    permissions: ['*'],
    lastLogin: new Date(),
    status: 'online'
  };

  const hasPermission = (permission: string) => {
    return adminUser.permissions.includes('*') || adminUser.permissions.includes(permission);
  };

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

  // Admin navigation structure
  const navItems: AdminNavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home size={20} />,
      path: '/admin',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <Users size={20} />,
      path: '/admin/users',
      permission: 'users.view',
      children: [
        {
          id: 'users-list',
          label: 'All Users',
          icon: <Users size={16} />,
          path: '/admin/users',
          permission: 'users.view'
        },
        {
          id: 'users-roles',
          label: 'Roles & Permissions',
          icon: <Shield size={16} />,
          path: '/admin/users/roles',
          permission: 'admin.roles'
        }
      ]
    },
    {
      id: 'content',
      label: 'Content Management',
      icon: <Image size={20} />,
      path: '/admin/content',
      permission: 'content.view',
      children: [
        {
          id: 'thumbnails',
          label: 'Thumbnails',
          icon: <Image size={16} />,
          path: '/admin/content/thumbnails',
          permission: 'content.view'
        },
        {
          id: 'templates',
          label: 'Templates',
          icon: <Layout size={16} />,
          path: '/admin/content/templates',
          permission: 'content.view'
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: <FileText size={16} />,
          path: '/admin/content/projects',
          permission: 'content.view'
        }
      ]
    },
    {
      id: 'sitemap',
      label: 'Sitemap Management',
      icon: <Globe size={20} />,
      path: '/admin/sitemap',
      permission: 'content.view'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 size={20} />,
      path: '/admin/analytics',
      permission: 'analytics.view',
      children: [
        {
          id: 'overview',
          label: 'Overview',
          icon: <BarChart3 size={16} />,
          path: '/admin/analytics',
          permission: 'analytics.view'
        },
        {
          id: 'user-activity',
          label: 'User Activity',
          icon: <Activity size={16} />,
          path: '/admin/analytics/users',
          permission: 'analytics.view'
        },
        {
          id: 'performance',
          label: 'Performance',
          icon: <Monitor size={16} />,
          path: '/admin/analytics/performance',
          permission: 'analytics.view'
        }
      ]
    },
    {
      id: 'system',
      label: 'System',
      icon: <Settings size={20} />,
      path: '/admin/system',
      permission: 'system.config',
      children: [
        {
          id: 'health',
          label: 'Health Monitoring',
          icon: <Monitor size={16} />,
          path: '/admin/system/health',
          permission: 'system.health'
        },
        {
          id: 'logs',
          label: 'Audit Logs',
          icon: <FileText size={16} />,
          path: '/admin/system/logs',
          permission: 'system.logs'
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings size={16} />,
          path: '/admin/system/settings',
          permission: 'system.config'
        }
      ]
    }
  ];

  // Filter navigation items based on permissions
  const filterNavItems = (items: AdminNavItem[]): AdminNavItem[] => {
    return items.filter(item => {
      if (item.permission && !hasPermission(item.permission)) {
        return false;
      }
      if (item.children) {
        item.children = filterNavItems(item.children);
      }
      return true;
    });
  };

  const visibleNavItems = filterNavItems(navItems);

  const handleLogout = async () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/admin/login', { replace: true });
  };

  return (
    <DashboardProvider>
      <div className={`flex h-screen transition-colors duration-300 relative overflow-hidden ${
        isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
      }`}>
        {/* Interactive Background */}
        <InteractiveBackground />
      {/* Enhanced Sidebar with Modern Design */}
      <div className={`${
        sidebarCollapsed ? 'w-20' : sidebarOpen ? 'w-80' : 'w-16'
      } ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/80 backdrop-blur-xl border-white/20'} 
      border-r transition-all duration-500 flex flex-col shadow-2xl relative overflow-hidden`}>
        
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>
        
        {/* Enhanced Sidebar Header */}
        <div className={`p-6 border-b relative z-10 ${
          isDarkMode ? 'border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600' : 'border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className={`${sidebarCollapsed ? 'hidden' : 'block'} transition-all duration-500`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Admin Panel</h2>
                  <p className="text-sm text-blue-100 font-medium">Thumbnail Creator Pro</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white"
                  title="Collapse sidebar"
                >
                  <Menu size={20} />
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-xl hover:bg-white/20 transition-colors text-white"
                title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Search Bar */}
        {!sidebarCollapsed && (
          <div className="p-4 relative z-10">
            <div className={`relative ${
              isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
            } rounded-2xl`}>
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} />
              <input
                type="text"
                placeholder="Search admin panel..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 transition-all ${
                  isDarkMode 
                    ? 'bg-gray-700 text-white placeholder-gray-400' 
                    : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                } font-medium`}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className={`px-2 py-1 text-xs rounded ${
                  isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                } font-mono`}>⌘K</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation */}
        <nav className="flex-1 p-4 space-y-2 relative z-10 overflow-y-auto custom-scrollbar">
          {visibleNavItems.map((item, index) => (
            <div
              key={item.id}
              style={{ animationDelay: `${index * 50}ms` }}
              className="animate-in slide-in-from-left-5 duration-500"
            >
              <NavItem 
                item={item} 
                currentPath={location.pathname}
                sidebarOpen={!sidebarCollapsed}
                isDarkMode={isDarkMode}
              />
            </div>
          ))}
        </nav>

        {/* Enhanced Sidebar Footer */}
        <div className={`p-4 border-t relative z-10 ${
          isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white/50'
        }`}>
          {!sidebarCollapsed ? (
            <div className="space-y-4">
              {/* User Profile Card */}
              <div className={`p-4 rounded-2xl transition-all duration-300 hover:shadow-lg ${
                isDarkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-blue-50 to-purple-50'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                      {adminUser.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                      adminUser.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                    } ${
                      isDarkMode ? 'border-gray-700' : 'border-white'
                    }`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold truncate ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{adminUser.name}</p>
                    <p className={`text-xs truncate ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>{adminUser.roles.join(', ')}</p>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleLogout}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      isDarkMode 
                        ? 'text-gray-300 hover:text-red-400 hover:bg-red-500/10' 
                        : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                    }`}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    <ThemeToggleButton />
                    
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`p-2 rounded-xl transition-colors ${
                        isDarkMode 
                          ? 'text-yellow-400 hover:bg-yellow-400/10' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Toggle dark mode"
                    >
                      {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    
                    <button
                      className={`p-2 rounded-xl transition-colors ${
                        isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-600' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Help & Support"
                    >
                      <HelpCircle size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleLogout}
                className={`w-full p-3 rounded-2xl transition-all group ${
                  isDarkMode 
                    ? 'hover:bg-red-500/10 text-gray-400 hover:text-red-400' 
                    : 'hover:bg-red-50 text-gray-600 hover:text-red-600'
                }`}
                title="Logout"
              >
                <LogOut size={20} className="mx-auto" />
              </button>
              
              <div className="space-y-2">
                <div className="flex justify-center">
                  <ThemeToggleButton />
                </div>
                
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className={`w-full p-3 rounded-2xl transition-all ${
                    isDarkMode 
                      ? 'text-yellow-400 hover:bg-yellow-400/10' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Toggle dark mode"
                >
                  {isDarkMode ? <Sun size={20} className="mx-auto" /> : <Moon size={20} className="mx-auto" />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Header */}
        <header className={`transition-colors duration-300 border-b px-6 py-4 ${
          isDarkMode 
            ? 'bg-gray-800/50 backdrop-blur-xl border-gray-700' 
            : 'bg-white/80 backdrop-blur-xl border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`lg:hidden p-2 rounded-xl transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Menu size={20} />
                </button>
              )}
              
              <div>
                <h1 className={`text-2xl font-bold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>Admin Dashboard</h1>
                <p className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>Welcome back, {adminUser.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Enhanced Search (Desktop) */}
              <div className="hidden md:block relative">
                <div className={`relative ${
                  isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                } rounded-2xl`}>
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                  <input
                    type="text"
                    placeholder="Quick search..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className={`w-64 pl-10 pr-4 py-2 rounded-2xl border-0 focus:ring-2 focus:ring-blue-500 transition-all text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 text-white placeholder-gray-400' 
                        : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              
              {/* Enhanced Controls */}
              <div className="flex items-center gap-2">
                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className={`p-2 rounded-xl transition-colors ${
                    isDarkMode 
                      ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-blue-50'
                  }`}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                
                {/* Enhanced Notifications */}
                <button className={`relative p-2 rounded-xl transition-all duration-200 ${
                  isDarkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                }`}>
                  <Bell size={20} />
                  {notifications > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse font-bold">
                        {notifications}
                      </span>
                      <span className="absolute -top-1 -right-1 bg-red-400 rounded-full h-5 w-5 animate-ping"></span>
                    </>
                  )}
                </button>

                {/* Enhanced User Menu */}
                <div className="flex items-center gap-3 ml-2">
                  <div className="text-right hidden sm:block">
                    <p className={`text-sm font-bold ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>{adminUser.name}</p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-blue-400' : 'text-blue-600'
                    }`}>{adminUser.email}</p>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg hover:scale-105 transition-transform cursor-pointer">
                      {adminUser.name?.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                      adminUser.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                    } ${
                      isDarkMode ? 'border-gray-800' : 'border-white'
                    }`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Enhanced Page Content */}
        <main className={`flex-1 overflow-y-auto transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50'
        }`}>
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
  isDarkMode: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, currentPath, sidebarOpen, isDarkMode }) => {
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
        className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-200 group ${
          isActive 
            ? isDarkMode
              ? 'bg-blue-600 text-white shadow-lg border border-blue-500'
              : 'bg-blue-50 text-blue-700 border-2 border-blue-200 shadow-md'
            : isDarkMode
              ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
              : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
        }`}
        title={!sidebarOpen ? item.label : undefined}
      >
        <div className="flex items-center gap-4">
          <div className={`transition-colors ${
            isActive
              ? isDarkMode ? 'text-white' : 'text-blue-600'
              : isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-blue-600'
          }`}>
            {item.icon}
          </div>
          {sidebarOpen && (
            <span className="text-sm font-semibold tracking-wide">{item.label}</span>
          )}
        </div>
        {sidebarOpen && hasChildren && (
          <ChevronDown 
            size={16} 
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            } ${
              isActive
                ? isDarkMode ? 'text-white' : 'text-blue-600'
                : isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} 
          />
        )}
      </button>

      {/* Enhanced Sub-navigation */}
      {sidebarOpen && hasChildren && isOpen && (
        <div className="ml-6 mt-2 space-y-1 animate-in slide-in-from-top-2 duration-300">
          {item.children?.map((child) => (
            <button
              key={child.id}
              onClick={() => navigate(child.path)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm transition-all duration-200 group ${
                currentPath === child.path
                  ? isDarkMode
                    ? 'bg-blue-600/80 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                  : isDarkMode
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-blue-600'
              }`}
            >
              <div className={`transition-colors ${
                currentPath === child.path
                  ? isDarkMode ? 'text-white' : 'text-blue-600'
                  : isDarkMode ? 'text-gray-500 group-hover:text-white' : 'text-gray-500 group-hover:text-blue-600'
              }`}>
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