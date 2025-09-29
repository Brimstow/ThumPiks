import React, { useState, useEffect } from 'react';

interface SocialShareStat {
  platform: string;
  totalShares: number;
  successfulShares: number;
  failedShares: number;
}

interface SocialShareAnalyticsProps {
  theme: 'light' | 'dark';
}

const SocialShareAnalytics: React.FC<SocialShareAnalyticsProps> = ({ theme }) => {
  const [stats, setStats] = useState<SocialShareStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('/api/social-share/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch social share stats');
        }

        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-900'}`}>
        <p>Error loading social share analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div 
          key={stat.platform} 
          className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}
        >
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <span className="text-white text-xl">
                  {stat.platform === 'twitter' && '🐦'}
                  {stat.platform === 'facebook' && '📘'}
                  {stat.platform === 'linkedin' && '💼'}
                  {stat.platform === 'pinterest' && '📌'}
                </span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} truncate`}>
                    {stat.platform.charAt(0).toUpperCase() + stat.platform.slice(1)}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className={`text-2xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {stat.totalShares}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className={theme === 'dark' ? 'text-green-400' : 'text-green-600'}>
                  Success: {stat.successfulShares}
                </span>
                <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                  Failed: {stat.failedShares}
                </span>
              </div>
              <div className={`mt-1 w-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2`}>
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stat.totalShares > 0 ? (stat.successfulShares / stat.totalShares) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {stats.length === 0 && (
        <div className={`col-span-full text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No social share data available yet.</p>
          <p className="mt-2 text-sm">Share your thumbnails to see analytics here.</p>
        </div>
      )}
    </div>
  );
};

export default SocialShareAnalytics;