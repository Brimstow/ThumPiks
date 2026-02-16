import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  Image, 
  DollarSign, 
  Activity, 
  Download,
  Calendar,
  Filter,
  RefreshCw
} from 'lucide-react';
import { adminAnalyticsService } from '../../services/admin';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  date: string;
  value: number;
}

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [selectedSection, setSelectedSection] = useState('overview');

  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      monthlyGrowth: 0
    },
    userMetrics: {
      newUsers: 0,
      retentionRate: 0,
      averageSessionTime: 0
    },
    contentMetrics: {
      totalThumbnails: 0,
      newThumbnails: 0,
      totalProjects: 0,
      popularCategories: [] as Array<{ name: string; count: number; percentage: number }>
    },
    revenueMetrics: {
      monthlyRevenue: 0,
      averageRevenuePerUser: 0,
      subscriptionBreakdown: [] as Array<{ plan: string; count: number; revenue: number; percentage: number }>
    }
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);

  const loadAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAnalyticsService.getOverview({ period: selectedPeriod });

      if (result.success && result.data) {
        const d = result.data as any;
        setAnalyticsData({
          overview: d.overview ?? analyticsData.overview,
          userMetrics: d.userMetrics ?? analyticsData.userMetrics,
          contentMetrics: {
            totalThumbnails: d.contentMetrics?.totalThumbnails ?? 0,
            newThumbnails: d.contentMetrics?.newThumbnails ?? 0,
            totalProjects: d.contentMetrics?.totalProjects ?? 0,
            popularCategories: d.contentMetrics?.popularCategories ?? [],
          },
          revenueMetrics: {
            monthlyRevenue: d.revenueMetrics?.monthlyRevenue ?? 0,
            averageRevenuePerUser: d.revenueMetrics?.averageRevenuePerUser ?? 0,
            subscriptionBreakdown: d.revenueMetrics?.subscriptionBreakdown ?? [],
          },
        });

        // Chart data from service
        if (d.chartData && Array.isArray(d.chartData)) {
          setChartData(d.chartData.map((p: any) => ({
            date: p.date,
            value: p.users ?? p.thumbnails ?? p.value ?? 0,
          })));
        }
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  }, [selectedPeriod]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  const metricCards: MetricCard[] = [
    {
      title: 'Total Users',
      value: analyticsData.overview.totalUsers.toLocaleString(),
      change: 12.5,
      changeType: 'increase',
      icon: <Users size={24} />,
      color: 'blue'
    },
    {
      title: 'Active Users',
      value: analyticsData.overview.activeUsers.toLocaleString(),
      change: 8.2,
      changeType: 'increase',
      icon: <Activity size={24} />,
      color: 'green'
    },
    {
      title: 'Total Revenue',
      value: `$${analyticsData.overview.totalRevenue.toLocaleString()}`,
      change: 15.3,
      changeType: 'increase',
      icon: <DollarSign size={24} />,
      color: 'purple'
    },
    {
      title: 'Monthly Growth',
      value: `${analyticsData.overview.monthlyGrowth}%`,
      change: 2.1,
      changeType: 'increase',
      icon: <TrendingUp size={24} />,
      color: 'orange'
    }
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      green: 'bg-green-500/10 text-green-400 border-green-500/20',
      purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">Analytics Dashboard</h1>
          <p className="text-slate-400 mt-2">Comprehensive platform insights and metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-slate-700 rounded-lg bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="px-4 py-2 bg-[#2563ff] text-white rounded-lg hover:bg-[#1d4fff] transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <button className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors flex items-center space-x-2">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'users', label: 'Users' },
            { id: 'content', label: 'Content' },
            { id: 'revenue', label: 'Revenue' }
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedSection === section.id
                  ? 'bg-[#2563ff] text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Section */}
      {selectedSection === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricCards.map((metric, index) => (
              <div key={index} className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-400">{metric.title}</p>
                    <p className="text-2xl font-bold text-slate-50 mt-1">{metric.value}</p>
                    <p className={`text-sm mt-1 ${
                      metric.changeType === 'increase' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {metric.changeType === 'increase' ? '+' : '-'}{metric.change}%
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${getColorClasses(metric.color)}`}>
                    {metric.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-50">User Growth</h3>
                <span className="text-sm text-slate-500">Last {selectedPeriod}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563ff]"></div>
                </div>
              ) : (
                <div className="h-64 flex items-end space-x-1">
                  {chartData.map((point, index) => (
                    <div
                      key={index}
                      className="bg-[#2563ff] rounded-t flex-1 min-w-0"
                      style={{ height: `${(point.value / 150) * 100}%` }}
                      title={`${point.date}: ${point.value}`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-50">Revenue Growth</h3>
                <span className="text-sm text-slate-500">Last {selectedPeriod}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563ff]"></div>
                </div>
              ) : (
                <div className="h-64 flex items-end space-x-1">
                  {chartData.map((point, index) => (
                    <div
                      key={index}
                      className="bg-emerald-500 rounded-t flex-1 min-w-0"
                      style={{ height: `${(point.value / 150) * 100}%` }}
                      title={`${point.date}: $${point.value * 10}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Content Section */}
      {selectedSection === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Content Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Thumbnails</span>
                <span className="font-semibold text-slate-100">{analyticsData.contentMetrics.totalThumbnails.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New This Month</span>
                <span className="font-semibold text-green-400">+{analyticsData.contentMetrics.newThumbnails}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Projects</span>
                <span className="font-semibold text-slate-100">{analyticsData.contentMetrics.totalProjects.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Popular Categories</h3>
            <div className="space-y-3">
              {analyticsData.contentMetrics.popularCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: `hsl(${index * 360 / 5}, 70%, 50%)` }}
                    />
                    <span className="text-sm text-slate-300">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-100">{category.count.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{category.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Revenue Section */}
      {selectedSection === 'revenue' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Revenue Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Monthly Revenue</span>
                <span className="font-semibold text-slate-100">${analyticsData.revenueMetrics.monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Revenue Per User</span>
                <span className="font-semibold text-slate-100">${analyticsData.revenueMetrics.averageRevenuePerUser}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <h3 className="text-lg font-semibold text-slate-50 mb-4">Subscription Plans</h3>
            <div className="space-y-3">
              {analyticsData.revenueMetrics.subscriptionBreakdown.map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: `hsl(${index * 120}, 70%, 50%)` }}
                    />
                    <span className="text-sm text-slate-300">{plan.plan}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-100">${plan.revenue.toLocaleString()}</div>
                    <div className="text-xs text-slate-500">{plan.count} users</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;