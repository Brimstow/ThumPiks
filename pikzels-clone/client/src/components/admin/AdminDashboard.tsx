import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Users, Image, Activity, DollarSign,
  BarChart3, PieChart, Zap, Menu, Bell, Sparkles, Star, ArrowRight
} from 'lucide-react';
import { useDashboard } from '../../contexts/DashboardContext';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { DashboardStatsGrid } from '../ui/AnimatedCharts';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: React.ReactNode;
  bgGradient: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon, bgGradient }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, opacity: number}>>([]);

  // Generate floating particles on hover
  useEffect(() => {
    if (isHovered) {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        opacity: Math.random() * 0.8 + 0.2
      }));
      setParticles(newParticles);
    } else {
      setParticles([]);
    }
  }, [isHovered]);

  return (
    <div 
      className={`relative overflow-hidden rounded-3xl p-8 text-white ${bgGradient} transform hover:scale-105 hover:rotate-1 transition-all duration-500 shadow-2xl border border-white/20 group cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-tl from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Floating Particles */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 bg-white/60 rounded-full animate-ping"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            opacity: particle.opacity,
            animationDelay: `${particle.id * 100}ms`,
            animationDuration: '2s'
          }}
        />
      ))}
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="p-4 rounded-2xl bg-white/20 backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
            {icon}
          </div>
          <div className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-300 group-hover:scale-110 ${
            changeType === 'up' 
              ? 'bg-green-400/20 text-green-300 border border-green-400/30 group-hover:bg-green-400/30' 
              : 'bg-red-400/20 text-red-300 border border-red-400/30 group-hover:bg-red-400/30'
          }`}>
            {changeType === 'up' ? <TrendingUp className="w-4 h-4 animate-bounce" /> : <TrendingDown className="w-4 h-4 animate-bounce" />}
            <span className="group-hover:animate-pulse">{change}</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-5xl font-black tracking-tight group-hover:animate-pulse transition-all duration-300">{value}</div>
          <div className="text-white/90 font-semibold text-xl group-hover:text-white transition-colors duration-300">{title}</div>
        </div>
        
        {/* Hover Arrow */}
        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <ArrowRight className="w-5 h-5 text-white/70" />
        </div>
      </div>
    </div>
  );
};

const Sidebar: React.FC = () => {
  const navItems = [
    { id: 'home', label: 'Home', active: false },
    { id: 'calendar', label: 'Calendar', active: false },
    { id: 'reports', label: 'Reports', active: false },
    { id: 'dashboard', label: 'Dashboard', active: true },
    { id: 'contacts', label: 'Contacts', active: false },
  ];

  return (
    <div className="w-80 bg-gradient-to-b from-indigo-900 via-purple-900 to-indigo-900 h-screen fixed left-0 top-0 z-20">
      <div className="p-8">
        <div className="flex items-center space-x-3 mb-12">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Acme</h1>
          <Menu className="w-5 h-5 text-white/70 ml-auto" />
        </div>
        
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl text-left transition-all duration-200 ${
                item.active
                  ? 'bg-blue-600/30 text-white border border-blue-400/50'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="font-semibold">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-16">
          <button className="w-full bg-blue-500 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-600 transition-colors">
            + Add new entry
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { data } = useRealtimeData();
  const [backgroundParticles, setBackgroundParticles] = useState<Array<{id: number, x: number, y: number, size: number, delay: number}>>([]);
  const [animatedValue, setAnimatedValue] = useState(0);

  // Generate background particles
  useEffect(() => {
    const particles = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 5
    }));
    setBackgroundParticles(particles);
  }, []);

  // Animate counter effect
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedValue(prev => (prev + 1) % 100);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      title: 'Number of Sales',
      value: '3450',
      change: '25%',
      changeType: 'up' as const,
      icon: <BarChart3 className="w-8 h-8 text-white" />,
      bgGradient: 'bg-gradient-to-br from-blue-600 to-indigo-700'
    },
    {
      title: 'Sales Revenue',
      value: '$35,256',
      change: '15%',
      changeType: 'up' as const,
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      bgGradient: 'bg-gradient-to-br from-cyan-500 to-blue-600'
    },
    {
      title: 'Average Price',
      value: '$35,256',
      change: '15%',
      changeType: 'down' as const,
      icon: <DollarSign className="w-8 h-8 text-white" />,
      bgGradient: 'bg-gradient-to-br from-emerald-500 to-green-600'
    },
    {
      title: 'Operations',
      value: '15,893',
      change: '8%',
      changeType: 'up' as const,
      icon: <Activity className="w-8 h-8 text-white" />,
      bgGradient: 'bg-gradient-to-br from-purple-500 to-indigo-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Animated Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5 animate-pulse" style={{animationDuration: '4s'}} />
        
        {/* Floating Background Particles */}
        {backgroundParticles.map((particle) => (
          <div
            key={particle.id}
            className="absolute bg-blue-400/20 rounded-full animate-float"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${6 + Math.random() * 4}s`
            }}
          />
        ))}
        
        {/* Geometric Shapes */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-24 h-24 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full blur-xl animate-pulse" style={{animationDelay: '1s'}} />
        <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-gradient-to-br from-pink-500/10 to-indigo-500/10 rounded-full blur-xl animate-pulse" style={{animationDelay: '2s'}} />
      </div>
      
      <Sidebar />
      
      <div className="ml-80">
        {/* Enhanced Header */}
        <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 px-8 py-6 relative">
          {/* Header Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({length: 5}).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-ping"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 2) * 40}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '3s'
                }}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="animate-pulse">
                <p className="text-gray-600 text-sm font-medium">🎯 Dashboard Control Center</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full border border-blue-200/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-xs font-semibold text-gray-700">Live</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">Marcus White</p>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span>Super Admin</span>
                </div>
              </div>
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg hover:scale-110 transition-transform duration-200 cursor-pointer">
                  MW
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content */}
        <div className="p-8 relative z-10">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text mb-2 animate-pulse">
              ✨ Dashboard Overview
            </h1>
            <p className="text-gray-600 font-medium">Real-time insights and analytics at your fingertips</p>
          </div>
          
          {/* Enhanced Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
            {metrics.map((metric, index) => (
              <div 
                key={index} 
                className="animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <MetricCard {...metric} />
              </div>
            ))}
          </div>

          {/* Enhanced Charts Section with Animated Components */}
          <DashboardStatsGrid />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;