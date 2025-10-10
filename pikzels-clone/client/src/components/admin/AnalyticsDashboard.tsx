import React, { useState, useEffect } from 'react';
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

  // Mock analytics data
  const [analyticsData, setAnalyticsData] = useState({
    overview: {
      totalUsers: 2543,
      activeUsers: 1876,
      totalRevenue: 45670,
      monthlyGrowth: 12.5
    },
    userMetrics: {
      newUsers: 324,
      retentionRate: 78.5,
      averageSessionTime: 245
    },
    contentMetrics: {
      totalThumbnails: 8921,
      newThumbnails: 567,
      totalProjects: 1234,
      popularCategories: [
        { name: 'YouTube Thumbnails', count: 4015, percentage: 45 },
        { name: 'Social Media', count: 2230, percentage: 25 },
        { name: 'Blog Headers', count: 1338, percentage: 15 },
        { name: 'Presentations', count: 892, percentage: 10 },
        { name: 'Other', count: 446, percentage: 5 }
      ]
    },
    revenueMetrics: {
      monthlyRevenue: 12450,
      averageRevenuePerUser: 18.50,
      subscriptionBreakdown: [
        { plan: 'Basic', count: 1234, revenue: 6170, percentage: 35 },
        { plan: 'Pro', count: 876, revenue: 17520, percentage: 50 },
        { plan: 'Enterprise', count: 123, revenue: 12300, percentage: 15 }
      ]
    }
  });

  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // Mock API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate mock chart data
      const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
      const mockChartData: ChartData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockChartData.push({
          date: date.toISOString().split('T')[0],
          value: Math.floor(Math.random() * 100) + 50
        });
      }
      
      setChartData(mockChartData);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setLoading(false);
  };

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
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">Comprehensive platform insights and metrics</p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={loadAnalyticsData}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-1">
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
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
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
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {metricCards.map((metric, index) => (
              <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                    <p className={`text-sm mt-1 ${
                      metric.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Growth Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">User Growth</h3>
                <span className="text-sm text-gray-500">Last {selectedPeriod}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="h-64 flex items-end space-x-1">
                  {chartData.map((point, index) => (
                    <div
                      key={index}
                      className="bg-blue-500 rounded-t flex-1 min-w-0"
                      style={{ height: `${(point.value / 150) * 100}%` }}
                      title={`${point.date}: ${point.value}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Revenue Chart */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Revenue Growth</h3>
                <span className="text-sm text-gray-500">Last {selectedPeriod}</span>
              </div>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="h-64 flex items-end space-x-1">
                  {chartData.map((point, index) => (
                    <div
                      key={index}
                      className="bg-green-500 rounded-t flex-1 min-w-0"
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
          {/* Content Stats */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Thumbnails</span>
                <span className="font-semibold">{analyticsData.contentMetrics.totalThumbnails.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New This Month</span>
                <span className="font-semibold text-green-600">+{analyticsData.contentMetrics.newThumbnails}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Projects</span>
                <span className="font-semibold">{analyticsData.contentMetrics.totalProjects.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Categories</h3>
            <div className="space-y-3">
              {analyticsData.contentMetrics.popularCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: `hsl(${index * 360 / 5}, 70%, 50%)` }}
                    />
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{category.count.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{category.percentage}%</div>
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
          {/* Revenue Stats */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Revenue</span>
                <span className="font-semibold">${analyticsData.revenueMetrics.monthlyRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Revenue Per User</span>
                <span className="font-semibold">${analyticsData.revenueMetrics.averageRevenuePerUser}</span>
              </div>
            </div>
          </div>

          {/* Subscription Breakdown */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Plans</h3>
            <div className="space-y-3">
              {analyticsData.revenueMetrics.subscriptionBreakdown.map((plan, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: `hsl(${index * 120}, 70%, 50%)` }}
                    />
                    <span className="text-sm text-gray-700">{plan.plan}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">${plan.revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{plan.count} users</div>
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