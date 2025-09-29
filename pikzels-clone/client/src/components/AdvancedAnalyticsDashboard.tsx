import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface DetailedAdvancedAnalyticsData {
  productivity: {
    bestDay: { date: string; count: number } | null;
    bestHour: { hour: number; count: number };
    consistency: number;
    creationTrend: Array<{ date: string; count: number }>;
  };
  editing: {
    mostComplexThumbnail: { id: string; title: string; editCount: number } | null;
    averageEditComplexity: number;
    editDistribution: Record<string, number>;
  };
  engagement: {
    mostShared: { id: string; title: string; shareCount: number } | null;
    sharingRate: number;
    platformDistribution: Array<{ platform: string; count: number }>;
  };
  timeframeData: {
    totalThumbnails: number;
    averagePerDay: number;
  };
}

interface ComparativeAnalyticsData {
  current: DetailedAdvancedAnalyticsData;
  previous: DetailedAdvancedAnalyticsData;
  comparison: {
    thumbnails: {
      current: number;
      previous: number;
      change: number;
    };
    averagePerDay: {
      current: number;
      previous: number;
      change: number;
    };
    sharingRate: {
      current: number;
      previous: number;
      change: number;
    };
    averageEditComplexity: {
      current: number;
      previous: number;
      change: number;
    };
  };
}

const AdvancedAnalyticsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [analyticsData, setAnalyticsData] = useState<ComparativeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`/api/analytics/comparative?timeframe=${timeframe}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch advanced analytics data');
        }

        const data = await response.json();
        setAnalyticsData(data.comparativeAnalytics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [timeframe]);

  const handleTimeframeChange = (newTimeframe: 'daily' | 'weekly' | 'monthly') => {
    setTimeframe(newTimeframe);
  };

  const renderTrendIndicator = (change: number) => {
    if (change > 0) {
      return (
        <span className="flex items-center text-green-600 dark:text-green-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          {change}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-red-600 dark:text-red-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {Math.abs(change)}%
        </span>
      );
    } else {
      return <span className="text-gray-500 dark:text-gray-400">0%</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-md p-4 ${theme === 'dark' ? 'bg-red-900' : 'bg-red-50'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-red-200' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-red-200' : 'text-red-800'}`}>Error</h3>
            <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className={`rounded-md p-4 ${theme === 'dark' ? 'bg-yellow-900' : 'bg-yellow-50'}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-800'}`}>No Data</h3>
            <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'}`}>
              <p>No advanced analytics data available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Advanced Analytics</h2>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Detailed insights into your thumbnail creation activity and performance.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <div className="flex rounded-md shadow-sm">
              <button
                type="button"
                onClick={() => handleTimeframeChange('daily')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md ${
                  timeframe === 'daily'
                    ? 'bg-indigo-600 text-white'
                    : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => handleTimeframeChange('weekly')}
                className={`px-4 py-2 text-sm font-medium ${
                  timeframe === 'weekly'
                    ? 'bg-indigo-600 text-white'
                    : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border-t border-b border-gray-300`
                }`}
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => handleTimeframeChange('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md ${
                  timeframe === 'monthly'
                    ? 'bg-indigo-600 text-white'
                    : `${theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'} border border-gray-300`
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Thumbnails */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Total Thumbnails</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.current.timeframeData.totalThumbnails}
                    </div>
                    <div className="ml-2">
                      {renderTrendIndicator(analyticsData.comparison.thumbnails.change)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Average Per Day */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Avg. Per Day</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.current.timeframeData.averagePerDay}
                    </div>
                    <div className="ml-2">
                      {renderTrendIndicator(analyticsData.comparison.averagePerDay.change)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Best Creation Hour */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Best Hour</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.current.productivity.bestHour.hour}:00
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Sharing Rate */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Sharing Rate</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.current.engagement.sharingRate}%
                    </div>
                    <div className="ml-2">
                      {renderTrendIndicator(analyticsData.comparison.sharingRate.change)}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* Creation Trend Chart */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Creation Trend</h3>
          <div className="h-64 flex items-center justify-center">
            {analyticsData.current.productivity.creationTrend.length > 0 ? (
              <div className="w-full">
                <div className="flex items-end h-48 space-x-2">
                  {analyticsData.current.productivity.creationTrend.map((item, index) => (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                        style={{ height: `${(item.count / Math.max(...analyticsData.current.productivity.creationTrend.map(t => t.count))) * 100}%` }}
                      ></div>
                      <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Thumbnail creation trend
                </div>
              </div>
            ) : (
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No trend data available</p>
            )}
          </div>
        </div>

        {/* Edit Distribution Chart */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Edit Distribution</h3>
          <div className="h-64">
            {Object.keys(analyticsData.current.editing.editDistribution).some(key => analyticsData.current.editing.editDistribution[key] > 0) ? (
              <div className="space-y-4">
                {Object.entries(analyticsData.current.editing.editDistribution).map(([range, count]) => {
                  const total = Object.values(analyticsData.current.editing.editDistribution).reduce((sum, val) => sum + val, 0);
                  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                  
                  return (
                    <div key={range} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{range}</span>
                        <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{percentage}% ({count})</span>
                      </div>
                      <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No edit data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Distribution Chart */}
      <div className={`mt-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Platform Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          {analyticsData.current.engagement.platformDistribution.length > 0 ? (
            <div className="w-full">
              <div className="flex items-end h-48 space-x-2">
                {analyticsData.current.engagement.platformDistribution.map((item, index) => (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-purple-500 rounded-t hover:bg-purple-600 transition-colors"
                      style={{ height: `${(item.count / Math.max(...analyticsData.current.engagement.platformDistribution.map(p => p.count))) * 100}%` }}
                    ></div>
                    <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.platform}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Social sharing by platform
              </div>
            </div>
          ) : (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No platform data available</p>
          )}
        </div>
      </div>

      {/* Detailed Metrics Section */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Most Complex Thumbnail */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Most Complex Thumbnail</h3>
          {analyticsData.current.editing.mostComplexThumbnail ? (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              </div>
              <div className="ml-4">
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {analyticsData.current.editing.mostComplexThumbnail.title}
                </h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {analyticsData.current.editing.mostComplexThumbnail.editCount} edits
                </p>
              </div>
            </div>
          ) : (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No edited thumbnails found</p>
          )}
        </div>

        {/* Most Shared Thumbnail */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Most Shared Thumbnail</h3>
          {analyticsData.current.engagement.mostShared ? (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
              </div>
              <div className="ml-4">
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {analyticsData.current.engagement.mostShared.title}
                </h4>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {analyticsData.current.engagement.mostShared.shareCount} shares
                </p>
              </div>
            </div>
          ) : (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No shared thumbnails found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;