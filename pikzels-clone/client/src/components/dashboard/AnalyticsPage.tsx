import React, { useState, useEffect } from 'react';
import { Image, CheckCircle2, Eye, Calendar, ChevronDown, Download, Lightbulb, ArrowUp, RefreshCw, AlertCircle } from 'lucide-react';
import { config } from '../../config/environment';
import { authGet } from '../../utils/api';

// ============================================
// TYPESCRIPT INTERFACES
// ============================================

interface AnalyticsData {
  totals: {
    thumbnails: number;
    projects: number;
    recentThumbnails: number;
  };
  trends: {
    daily: Record<string, number>;
  };
  styles: Record<string, number>;
  projects: Array<{
    id: string;
    name: string;
    thumbnailCount: number;
  }>;
  hourlyDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
}

interface TopPerformer {
  id: string;
  title: string;
  imageUrl: string;
  performanceScore: number;
  socialShares: number;
  downloads: number;
  edits: number;
  daysActive: number;
}

interface StatCard {
  id: number;
  title: string;
  value: string;
  change: string;
  icon: React.ComponentType<any>;
  gradient: string;
  shadowColor: string;
}

type TimeframeFilter = '7' | '30' | '90';
type PlatformFilter = 'all' | 'youtube' | 'tiktok' | 'instagram' | 'twitter';

const AnalyticsPage = () => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [timeframeFilter, setTimeframeFilter] = useState<TimeframeFilter>('30');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  
  // Auto-refresh state (premium feature)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // ============================================
  // API INTEGRATION
  // ============================================

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard analytics data
      const analyticsResponse = await authGet('/api/analytics/dashboard');

      if (!analyticsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsResult = await analyticsResponse.json();
      setAnalyticsData(analyticsResult.userAnalytics);

      // Fetch top performers
      const performersResponse = await authGet('/api/analytics/top-performers?limit=10');

      if (performersResponse.ok) {
        const performersResult = await performersResponse.json();
        setTopPerformers(performersResult.topPerformers || []);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics();
  }, [timeframeFilter]);

  // Auto-refresh effect (premium feature)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchAnalytics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, timeframeFilter]);

  // CSV Export handler
  const handleExportCSV = async () => {
    try {
      const response = await authGet('/api/analytics/export/csv');

      if (!response.ok) {
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError('Failed to export CSV');
    }
  };

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const statCards: StatCard[] = analyticsData ? [
    {
      id: 1,
      title: 'Total Thumbnails',
      value: analyticsData.totals.thumbnails.toLocaleString(),
      change: `${Math.round((analyticsData.totals.recentThumbnails / Math.max(analyticsData.totals.thumbnails, 1)) * 100)}%`,
      icon: Image,
      gradient: 'from-indigo-500 to-blue-600',
      shadowColor: 'blue-900/20',
    },
    {
      id: 2,
      title: 'Active Projects',
      value: analyticsData.totals.projects.toString(),
      change: '5%',
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-teal-500',
      shadowColor: 'emerald-900/20',
    },
    {
      id: 3,
      title: 'Recent (30d)',
      value: analyticsData.totals.recentThumbnails.toString(),
      change: '34%',
      icon: Eye,
      gradient: 'from-cyan-500 to-blue-500',
      shadowColor: 'cyan-900/20',
    },
    {
      id: 4,
      title: 'Top Performer Score',
      value: topPerformers[0]?.performanceScore.toFixed(1) || '0',
      change: '12%',
      icon: Calendar,
      gradient: 'from-orange-500 to-amber-500',
      shadowColor: 'orange-900/20',
    },
  ] : [];

  // ============================================
  // RENDER - LOADING STATE
  // ============================================

  if (loading && !analyticsData) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-lg">Loading analytics data...</p>
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // RENDER - ERROR STATE
  // ============================================

  if (error && !analyticsData) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-2">Failed to load analytics</p>
            <p className="text-slate-500 text-sm mb-4">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // RENDER - EMPTY STATE
  // ============================================

  if (analyticsData && analyticsData.totals.thumbnails === 0) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50 tracking-tight">Analytics Overview</h1>
          <p className="text-lg text-slate-400 mt-2 font-medium">Track your thumbnail performance and insights</p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Image className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-300 text-lg mb-2">No analytics data yet</p>
            <p className="text-slate-500 text-sm">Create some thumbnails to see your analytics here</p>
          </div>
        </div>
      </main>
    );
  }

  // ============================================
  // RENDER - MAIN CONTENT
  // ============================================

  // Keep AI insights as hardcoded for now (will be computed from data in future)
  const aiInsights = [
    { text: 'Neon thumbnails get ', highlight: '34% more clicks', suffix: ' in your niche compared to pastel colors.' },
    { text: 'Your best upload time is ', highlight: 'Tuesday at 3PM EST', suffix: '. Try scheduling your next video then.' },
    { text: 'Consider A/B testing your text size. Thumbnails with larger text (cover >30%) are trending up.', highlight: '', suffix: '' },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-50 tracking-tight">Analytics Overview</h1>
        <p className="text-lg text-slate-400 mt-2 font-medium">Track your thumbnail performance and insights</p>
      </div>

      {/* Stats Grid - Hero Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.id}
              className="group bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 backdrop-blur-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-lg shadow-${stat.shadowColor} group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-6 h-6" strokeWidth={2} />
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <ArrowUp className="w-3 h-3" strokeWidth={2} />
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-bold text-slate-50 tracking-tight">{stat.value}</div>
              <div className="text-sm text-slate-400 mt-1 font-medium">{stat.title}</div>
            </div>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Timeframe Filter */}
          <div className="relative group">
            <button 
              onClick={() => {
                // Cycle through timeframes
                const timeframes: TimeframeFilter[] = ['7', '30', '90'];
                const currentIndex = timeframes.indexOf(timeframeFilter);
                const nextIndex = (currentIndex + 1) % timeframes.length;
                setTimeframeFilter(timeframes[nextIndex]);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors"
            >
              Last {timeframeFilter} Days
              <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
            </button>
          </div>

          {/* Platform Filter */}
          <div className="relative group">
            <button 
              onClick={() => {
                // Cycle through platforms
                const platforms: PlatformFilter[] = ['all', 'youtube', 'tiktok', 'instagram', 'twitter'];
                const currentIndex = platforms.indexOf(platformFilter);
                const nextIndex = (currentIndex + 1) % platforms.length;
                setPlatformFilter(platforms[nextIndex]);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors"
            >
              {platformFilter === 'all' ? 'All Platforms' : platformFilter.charAt(0).toUpperCase() + platformFilter.slice(1)}
              <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
            </button>
          </div>

          {/* Sort Filter */}
          <div className="relative group">
            <button 
              onClick={() => setSortBy(sortBy === 'date' ? 'score' : 'date')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition-colors"
            >
              Sort by {sortBy === 'date' ? 'Date' : 'Score'}
              <ChevronDown className="w-4 h-4 ml-1 opacity-70" />
            </button>
          </div>

          {/* Auto-Refresh Toggle (Premium Feature) */}
          <button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-Refresh
          </button>
        </div>

        {/* Export CSV Button */}
        <button 
          onClick={handleExportCSV}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 hover:brightness-110 transition-all w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
        {/* Large Chart Card (Left) */}
        <div className="lg:col-span-3 bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-semibold text-slate-50 tracking-tight">Click-Through Rate Trend</h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-blue-500"></span>
              <span className="text-xs text-slate-400">Past 30 Days</span>
            </div>
          </div>

          {/* CSS/SVG Chart */}
          <div className="h-[280px] w-full relative pt-4">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-600 font-mono">
              <div className="border-b border-slate-800/50 w-full h-0 relative">
                <span className="absolute -top-3 -left-8">8%</span>
              </div>
              <div className="border-b border-slate-800/50 w-full h-0 relative">
                <span className="absolute -top-3 -left-8">6%</span>
              </div>
              <div className="border-b border-slate-800/50 w-full h-0 relative">
                <span className="absolute -top-3 -left-8">4%</span>
              </div>
              <div className="border-b border-slate-800/50 w-full h-0 relative">
                <span className="absolute -top-3 -left-8">2%</span>
              </div>
              <div className="border-b border-slate-800/50 w-full h-0 relative">
                <span className="absolute -top-3 -left-8">0%</span>
              </div>
            </div>

            {/* Chart Area */}
            <div className="absolute inset-0 pl-2">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,80 C10,75 15,60 25,65 C35,70 40,50 50,45 C60,40 65,30 75,35 C85,40 90,20 100,15 L100,100 L0,100 Z"
                  fill="url(#chartGradient)"
                />
                <path
                  d="M0,80 C10,75 15,60 25,65 C35,70 40,50 50,45 C60,40 65,30 75,35 C85,40 90,20 100,15"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx="75"
                  cy="35"
                  r="3"
                  fill="#020818"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  className="opacity-0 hover:opacity-100 transition-opacity"
                />
              </svg>
            </div>

            {/* X Axis */}
            <div className="absolute bottom-[-24px] left-0 right-0 flex justify-between text-xs text-slate-500 font-mono px-1">
              <span>Nov 1</span>
              <span>Nov 8</span>
              <span>Nov 15</span>
              <span>Nov 22</span>
              <span>Nov 29</span>
            </div>
          </div>
        </div>

        {/* Top Performers Card (Right) */}
        <div className="lg:col-span-2 bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5 flex flex-col">
          <h3 className="text-base font-semibold text-slate-50 tracking-tight mb-5">Best Performing Thumbnails</h3>

          {topPerformers.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No performance data yet
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto">
              {topPerformers.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-900/50 transition-colors group cursor-pointer"
                >
                  <div className="h-12 w-12 rounded-md bg-slate-800 shrink-0 overflow-hidden relative">
                    <img
                      src={item.imageUrl}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      alt="Thumbnail"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-200 truncate group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.daysActive} {item.daysActive === 1 ? 'day' : 'days'} active
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                      {item.performanceScore.toFixed(1)} score
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {item.socialShares} shares
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {/* A/B Testing Card */}
        <div className="bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-50 tracking-tight">Active A/B Tests</h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 uppercase tracking-wide">
              Live
            </span>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="flex-1 aspect-video rounded-md overflow-hidden bg-slate-800 relative group">
              <img
                src="https://images.unsplash.com/photo-1593642532400-2682810df593?q=80&w=300&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt="Variant A"
              />
              <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 rounded text-[10px] font-bold text-white">
                A
              </div>
            </div>
            <div className="flex-1 aspect-video rounded-md overflow-hidden bg-slate-800 relative group">
              <img
                src="https://images.unsplash.com/photo-1593642632823-8f785667771b?q=80&w=300&auto=format&fit=crop"
                className="w-full h-full object-cover"
                alt="Variant B"
              />
              <div className="absolute bottom-1 left-1 bg-black/60 px-1.5 rounded text-[10px] font-bold text-white">
                B
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex justify-between text-xs text-slate-400 mb-2 font-medium">
              <span>Variant A (55%)</span>
              <span>Variant B (45%)</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-blue-500" style={{ width: '55%' }}></div>
              <div className="h-full bg-slate-700" style={{ width: '45%' }}></div>
            </div>
            <a href="#" className="block mt-4 text-sm font-medium text-blue-400 hover:text-blue-300 hover:underline">
              View Details
            </a>
          </div>
        </div>

        {/* Color Analysis Card */}
        <div className="bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5 flex flex-col h-full">
          <h3 className="text-base font-semibold text-slate-50 tracking-tight mb-5">Top Colors This Week</h3>

          <div className="flex items-center gap-6 h-full">
            {/* Donut Chart (CSS Conic Gradient) */}
            <div
              className="relative w-28 h-28 rounded-full shrink-0"
              style={{
                background:
                  'conic-gradient(#f43f5e 0% 35%, #3b82f6 35% 60%, #eab308 60% 80%, #22c55e 80% 90%, #a855f7 90% 100%)',
              }}
            >
              <div className="absolute inset-0 m-auto w-16 h-16 bg-[#020818] rounded-full"></div>
            </div>

            {/* Legend */}
            <ul className="flex-1 space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-slate-300">Red</span>
                </div>
                <span className="font-mono text-slate-500 text-xs">35%</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-slate-300">Blue</span>
                </div>
                <span className="font-mono text-slate-500 text-xs">25%</span>
              </li>
              <li className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span className="text-slate-300">Yellow</span>
                </div>
                <span className="font-mono text-slate-500 text-xs">20%</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Latest Projects Card */}
        <div className="bg-[#020818] border border-slate-800 rounded-2xl p-6 shadow-xl shadow-black/20 ring-1 ring-white/5 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-slate-50 tracking-tight">Recent Projects</h3>
            <button className="text-xs font-medium text-slate-400 hover:text-white">View All</button>
          </div>

          {analyticsData && analyticsData.projects.length > 0 ? (
            <div className="space-y-4">
              {analyticsData.projects.slice(0, 4).map((project) => (
                <div key={project.id} className="flex items-center gap-3">
                  <div className="h-8 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    {project.thumbnailCount}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate w-32">{project.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {project.thumbnailCount} thumbnail{project.thumbnailCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                    Active
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500 text-sm">
              No projects yet
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="rounded-2xl bg-blue-500/5 border-l-4 border-blue-500 p-6 flex flex-col sm:flex-row gap-5 items-start mb-8 backdrop-blur-sm">
        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400 shrink-0 shadow-sm shadow-blue-500/10">
          <Lightbulb className="w-6 h-6" strokeWidth={2} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-50 mb-3 tracking-tight">AI Insights</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            {aiInsights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0"></span>
                <span>
                  {insight.text}
                  {insight.highlight && <span className="text-white font-semibold">{insight.highlight}</span>}
                  {insight.suffix}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
};

export default AnalyticsPage;
