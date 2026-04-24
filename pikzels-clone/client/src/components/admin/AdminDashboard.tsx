import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, BarChart3, Image, Activity
} from 'lucide-react';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { adminAnalyticsService } from '../../services/admin';
import { DashboardStatsGrid } from '../ui/AnimatedCharts';

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  icon: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, changeType, icon }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-xl bg-[#2563ff]/10 text-[#2563ff]">
          {icon}
        </div>
        <div className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-sm font-medium ${
          changeType === 'up' 
            ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {changeType === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{change}</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-bold text-slate-50">{value}</div>
        <div className="text-slate-400 font-medium">{title}</div>
      </div>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { data } = useRealtimeData();
  const [overview, setOverview] = useState<any>(null);

  // Load analytics overview from service
  useEffect(() => {
    const loadOverview = async () => {
      try {
        const result = await adminAnalyticsService.getOverview();
        if (result.success && result.data) {
          setOverview(result.data);
        }
      } catch (error) {
        console.error('Failed to load analytics overview:', error);
      }
    };
    loadOverview();
  }, []);

  const totalThumbnails = overview?.contentMetrics?.totalThumbnails ?? data.thumbnailsGenerated;
  const activeUsers = overview?.overview?.activeUsers ?? data.activeSessions;
  const newThumbnails = overview?.contentMetrics?.newThumbnails ?? 0;
  const monthlyGrowth = overview?.overview?.monthlyGrowth ?? 0;

  const metrics = [
    {
      title: 'Total Thumbnails',
      value: totalThumbnails.toLocaleString(),
      change: `${monthlyGrowth}%`,
      changeType: 'up' as const,
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      title: 'Active Users',
      value: activeUsers.toLocaleString(),
      change: `${overview?.userMetrics?.retentionRate ?? 15}%`,
      changeType: 'up' as const,
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      title: 'Generated Today',
      value: newThumbnails.toLocaleString(),
      change: '8%',
      changeType: 'up' as const,
      icon: <Image className="w-5 h-5" />,
    },
    {
      title: 'Avg. Processing',
      value: `${((overview?.userMetrics?.averageSessionTime ?? 230) / 100).toFixed(1)}s`,
      change: `${overview?.userMetrics?.churnRate ?? 12}%`,
      changeType: 'down' as const,
      icon: <Activity className="w-5 h-5" />,
    }
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">
          Dashboard Overview
        </h1>
        <p className="text-slate-400 font-medium">Real-time insights and analytics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Dashboard Stats Grid */}
      <DashboardStatsGrid />
    </div>
  );
};

export default AdminDashboard;