import { useState, useEffect, useCallback } from 'react';

export interface RealtimeData {
  userCount: number;
  thumbnailsGenerated: number;
  activeSessions: number;
  revenue: number;
  lastUpdated: Date;
}

export const useRealtimeData = (updateInterval: number = 5000) => {
  const [data, setData] = useState<RealtimeData>({
    userCount: 2543,
    thumbnailsGenerated: 8921,
    activeSessions: 1234,
    revenue: 12543,
    lastUpdated: new Date()
  });
  
  const [isConnected, setIsConnected] = useState(true);
  const [lastActivity, setLastActivity] = useState<string>('');

  // Simulate real-time data updates
  const updateData = useCallback(() => {
    setData(prevData => {
      const variance = {
        userCount: Math.floor(Math.random() * 10) - 5, // -5 to +5
        thumbnailsGenerated: Math.floor(Math.random() * 50), // 0 to 50
        activeSessions: Math.floor(Math.random() * 20) - 10, // -10 to +10
        revenue: Math.floor(Math.random() * 100) // 0 to 100
      };

      return {
        userCount: Math.max(0, prevData.userCount + variance.userCount),
        thumbnailsGenerated: prevData.thumbnailsGenerated + variance.thumbnailsGenerated,
        activeSessions: Math.max(0, prevData.activeSessions + variance.activeSessions),
        revenue: prevData.revenue + variance.revenue,
        lastUpdated: new Date()
      };
    });

    // Simulate activity updates
    const activities = [
      'New user registered from California',
      'Bulk thumbnail processing completed',
      'Payment received from premium user',
      'System backup completed successfully',
      'New template uploaded by admin',
      'User upgraded to premium plan',
      'API rate limit increased for user',
      'Database optimization completed'
    ];
    
    setLastActivity(activities[Math.floor(Math.random() * activities.length)]);
  }, []);

  useEffect(() => {
    // Simulate connection status
    const connectionInterval = setInterval(() => {
      // 95% chance of staying connected
      setIsConnected(Math.random() > 0.05);
    }, 2000);

    // Data update interval
    const dataInterval = setInterval(updateData, updateInterval);

    return () => {
      clearInterval(connectionInterval);
      clearInterval(dataInterval);
    };
  }, [updateData, updateInterval]);

  const refreshData = useCallback(() => {
    updateData();
  }, [updateData]);

  return {
    data,
    isConnected,
    lastActivity,
    refreshData
  };
};