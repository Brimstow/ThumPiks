import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SocialShareAnalytics from './SocialShareAnalytics';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  userAnalytics: {
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
  };
  thumbnailStats: {
    total: number;
    averagePerDay: number;
    mostRecent: any;
    byProject: Array<{ name: string; count: number }>;
    byStyle: Record<string, number>;
    editingStats: {
      totalEdited: number;
      totalEdits: number;
      averageEditsPerThumbnail: number;
    };
  };
  advancedAnalytics: {
    productivity: {
      bestDay: { date: string; count: number } | null;
      bestHour: { hour: number; count: number };
      consistency: number;
    };
    editing: {
      mostComplexThumbnail: { id: string; title: string; editCount: number } | null;
      averageEditComplexity: number;
    };
    engagement: {
      mostShared: { id: string; title: string; shareCount: number } | null;
      sharingRate: number;
    };
  };
}

const AnalyticsDashboard: React.FC = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/analytics/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setAnalyticsData(data);
        } else {
          setError('Failed to fetch analytics data');
        }
      } catch (err) {
        setError('Error fetching analytics data');
        console.error('Error fetching analytics data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

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
              <p>No analytics data available.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate percentages for style distribution
  const totalStyleCount = Object.values(analyticsData.thumbnailStats.byStyle).reduce((sum, count) => sum + count, 0);
  const stylePercentages = Object.entries(analyticsData.thumbnailStats.byStyle).map(([style, count]) => ({
    style,
    count,
    percentage: totalStyleCount > 0 ? Math.round((count / totalStyleCount) * 100) : 0
  }));

  // Calculate project percentages
  const totalProjectCount = analyticsData.thumbnailStats.byProject.reduce((sum, project) => sum + project.count, 0);
  const projectPercentages = analyticsData.thumbnailStats.byProject.map(project => ({
    ...project,
    percentage: totalProjectCount > 0 ? Math.round((project.count / totalProjectCount) * 100) : 0
  }));

  // Calculate editing percentage
  const editingPercentage = analyticsData.thumbnailStats.total > 0 ? 
    Math.round((analyticsData.thumbnailStats.editingStats.totalEdited / analyticsData.thumbnailStats.total) * 100) : 0;

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Analytics Dashboard</h2>
            <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              Detailed insights into your thumbnail creation activity and performance.
            </p>
          </div>
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => navigate('/analytics/advanced')}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                theme === 'dark' ? 'focus:ring-offset-gray-800' : 'focus:ring-offset-white'
              }`}
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              Advanced Analytics
            </button>
          </div>
        </div>
      </div>

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
                      {analyticsData.userAnalytics.totals.thumbnails}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Projects */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Projects</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.userAnalytics.totals.projects}
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
                      {analyticsData.thumbnailStats.averagePerDay}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Thumbnails */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>This Week</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.userAnalytics.totals.recentThumbnails}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Metrics Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Editing Percentage */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Edited Thumbnails</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {editingPercentage}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Average Edits Per Thumbnail */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}>
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Avg. Edits/Thumbnail</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.thumbnailStats.editingStats.averageEditsPerThumbnail}
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
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Best Hour</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.advancedAnalytics.productivity.bestHour.hour}:00
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
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>Sharing Rate</dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {analyticsData.advancedAnalytics.engagement.sharingRate}%
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Trend Chart */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Thumbnail Creation Trend</h3>
          <div className="h-64 flex items-center justify-center">
            {Object.keys(analyticsData.userAnalytics.trends.daily).length > 0 ? (
              <div className="w-full">
                <div className="flex items-end h-48 space-x-2">
                  {Object.entries(analyticsData.userAnalytics.trends.daily).map(([date, count]) => (
                    <div key={date} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                        style={{ height: `${(count / Math.max(...Object.values(analyticsData.userAnalytics.trends.daily))) * 100}%` }}
                      ></div>
                      <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Daily thumbnail creation
                </div>
              </div>
            ) : (
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No trend data available</p>
            )}
          </div>
        </div>

        {/* Style Distribution */}
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Style Distribution</h3>
          <div className="h-64">
            {stylePercentages.some(item => item.count > 0) ? (
              <div className="space-y-4">
                {stylePercentages.map(({ style, count, percentage }) => (
                  <div key={style} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{style.charAt(0).toUpperCase() + style.slice(1)}</span>
                      <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{percentage}% ({count})</span>
                    </div>
                    <div className={`w-full rounded-full h-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div 
                        className="bg-indigo-500 h-2 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No style data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hourly Distribution Chart */}
      <div className={`mt-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Hourly Creation Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          {Object.keys(analyticsData.userAnalytics.hourlyDistribution).some(hour => analyticsData.userAnalytics.hourlyDistribution[hour] > 0) ? (
            <div className="w-full">
              <div className="flex items-end h-48 space-x-1">
                {Object.entries(analyticsData.userAnalytics.hourlyDistribution).map(([hour, count]) => (
                  <div key={hour} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors"
                      style={{ height: `${(count / Math.max(...Object.values(analyticsData.userAnalytics.hourlyDistribution))) * 100}%` }}
                    ></div>
                    <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {hour}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Hourly thumbnail creation distribution
              </div>
            </div>
          ) : (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No hourly data available</p>
          )}
        </div>
      </div>

      {/* Day of Week Distribution Chart */}
      <div className={`mt-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Day of Week Distribution</h3>
        <div className="h-64 flex items-center justify-center">
          {Object.keys(analyticsData.userAnalytics.dayOfWeekDistribution).some(day => analyticsData.userAnalytics.dayOfWeekDistribution[day] > 0) ? (
            <div className="w-full">
              <div className="flex items-end h-48 space-x-2">
                {Object.entries(analyticsData.userAnalytics.dayOfWeekDistribution).map(([day, count]) => (
                  <div key={day} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                      style={{ height: `${(count / Math.max(...Object.values(analyticsData.userAnalytics.dayOfWeekDistribution))) * 100}%` }}
                    ></div>
                    <div className={`text-xs mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {day.substring(0, 3)}
                    </div>
                  </div>
                ))}
              </div>
              <div className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Thumbnail creation by day of week
              </div>
            </div>
          ) : (
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>No day of week data available</p>
          )}
        </div>
      </div>

      {/* Social Share Analytics Section */}
      <div className="mt-8">
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Social Share Analytics</h3>
        <SocialShareAnalytics theme={theme} />
      </div>

      <div className="mt-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg p-6`}>
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>Top Projects</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Project
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Thumbnails
                  </th>
                  <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                {projectPercentages.length > 0 ? (
                  projectPercentages.map((project, index) => (
                    <tr key={index}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {project.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {project.count}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'}`}>
                        {project.percentage}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={`px-6 py-4 text-center text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      No project data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;