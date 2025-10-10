import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Users,
  Globe,
  Shield,
  RefreshCw
} from 'lucide-react';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
  history: number[];
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  responseTime: number;
  lastCheck: Date;
}

interface ServerInfo {
  name: string;
  ip: string;
  location: string;
  load: number;
  status: 'healthy' | 'warning' | 'critical';
}

const StatusBadge: React.FC<{ status: 'good' | 'warning' | 'critical' | 'online' | 'offline' | 'degraded' | 'healthy' }> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'good':
      case 'online':
      case 'healthy':
        return { icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200', text: 'Healthy' };
      case 'warning':
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-yellow-600 bg-yellow-50 border-yellow-200', text: 'Warning' };
      case 'critical':
      case 'offline':
        return { icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200', text: 'Critical' };
      default:
        return { icon: CheckCircle, color: 'text-gray-600 bg-gray-50 border-gray-200', text: 'Unknown' };
    }
  };

  const { icon: Icon, color, text } = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${color}`}>
      <Icon className="w-3 h-3" />
      <span>{text}</span>
    </div>
  );
};

const MetricChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 60 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  return (
    <div className="flex items-end justify-between space-x-1" style={{ height }}>
      {data.map((value, index) => (
        <div
          key={index}
          className={`${color} rounded-t transition-all duration-300 hover:opacity-80 flex-1 min-w-0`}
          style={{ 
            height: range > 0 ? `${((value - min) / range) * 100}%` : '10%',
            minHeight: '4px'
          }}
          title={`${value.toFixed(1)}`}
        />
      ))}
    </div>
  );
};

const SystemHealthMonitoring: React.FC = () => {
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([
    {
      name: 'CPU Usage',
      value: 45.2,
      unit: '%',
      status: 'good',
      threshold: { warning: 70, critical: 85 },
      history: [42, 38, 45, 48, 43, 41, 44, 47, 45, 46, 44, 45]
    },
    {
      name: 'Memory Usage',
      value: 67.8,
      unit: '%',
      status: 'good',
      threshold: { warning: 80, critical: 90 },
      history: [65, 63, 68, 70, 67, 65, 66, 69, 68, 67, 66, 68]
    },
    {
      name: 'Disk Usage',
      value: 78.5,
      unit: '%',
      status: 'warning',
      threshold: { warning: 75, critical: 90 },
      history: [76, 74, 78, 79, 77, 75, 76, 78, 79, 78, 77, 78]
    },
    {
      name: 'Network I/O',
      value: 234.7,
      unit: 'MB/s',
      status: 'good',
      threshold: { warning: 500, critical: 800 },
      history: [220, 210, 235, 240, 230, 225, 230, 238, 235, 232, 228, 235]
    },
    {
      name: 'Database Connections',
      value: 45,
      unit: 'connections',
      status: 'good',
      threshold: { warning: 80, critical: 100 },
      history: [42, 40, 45, 48, 44, 42, 43, 46, 45, 44, 43, 45]
    },
    {
      name: 'Response Time',
      value: 127,
      unit: 'ms',
      status: 'good',
      threshold: { warning: 300, critical: 500 },
      history: [120, 115, 130, 135, 125, 120, 125, 132, 128, 125, 122, 127]
    }
  ]);

  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Web Server',
      status: 'online',
      uptime: '99.98%',
      responseTime: 45,
      lastCheck: new Date()
    },
    {
      name: 'Database',
      status: 'online',
      uptime: '99.95%',
      responseTime: 12,
      lastCheck: new Date()
    },
    {
      name: 'Redis Cache',
      status: 'online',
      uptime: '99.99%',
      responseTime: 3,
      lastCheck: new Date()
    },
    {
      name: 'File Storage',
      status: 'online',
      uptime: '99.97%',
      responseTime: 23,
      lastCheck: new Date()
    },
    {
      name: 'Email Service',
      status: 'degraded',
      uptime: '98.45%',
      responseTime: 156,
      lastCheck: new Date()
    },
    {
      name: 'CDN',
      status: 'online',
      uptime: '99.99%',
      responseTime: 8,
      lastCheck: new Date()
    }
  ]);

  const [servers, setServers] = useState<ServerInfo[]>([
    { name: 'Web-01', ip: '10.0.1.10', location: 'US East', load: 23, status: 'healthy' },
    { name: 'Web-02', ip: '10.0.1.11', location: 'US East', load: 34, status: 'healthy' },
    { name: 'API-01', ip: '10.0.2.10', location: 'US West', load: 56, status: 'healthy' },
    { name: 'DB-01', ip: '10.0.3.10', location: 'US East', load: 78, status: 'warning' },
    { name: 'Cache-01', ip: '10.0.4.10', location: 'EU Central', load: 12, status: 'healthy' }
  ]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prevMetrics => 
        prevMetrics.map(metric => {
          const variance = metric.value * 0.1; // 10% variance
          const newValue = Math.max(0, metric.value + (Math.random() - 0.5) * variance);
          
          // Determine status based on thresholds
          let newStatus: 'good' | 'warning' | 'critical' = 'good';
          if (newValue >= metric.threshold.critical) newStatus = 'critical';
          else if (newValue >= metric.threshold.warning) newStatus = 'warning';
          
          // Update history (keep last 12 points)
          const newHistory = [...metric.history.slice(1), newValue];
          
          return {
            ...metric,
            value: newValue,
            status: newStatus,
            history: newHistory
          };
        })
      );

      // Update service response times
      setServices(prevServices =>
        prevServices.map(service => ({
          ...service,
          responseTime: Math.max(1, service.responseTime + (Math.random() - 0.5) * 10),
          lastCheck: new Date()
        }))
      );

      // Update server loads
      setServers(prevServers =>
        prevServers.map(server => {
          const newLoad = Math.max(0, Math.min(100, server.load + (Math.random() - 0.5) * 10));
          return {
            ...server,
            load: newLoad,
            status: newLoad > 80 ? 'critical' : newLoad > 60 ? 'warning' : 'healthy'
          };
        })
      );

      setLastUpdate(new Date());
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    setLastUpdate(new Date());
  };

  const overallHealth = () => {
    const criticalCount = systemMetrics.filter(m => m.status === 'critical').length;
    const warningCount = systemMetrics.filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'good';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text mb-2">
              🔧 System Health Monitoring
            </h1>
            <p className="text-gray-600 font-medium">Real-time system performance and health metrics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <StatusBadge status={overallHealth()} />
              <p className="text-xs text-gray-500 mt-1">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {systemMetrics.map((metric, index) => (
          <div 
            key={metric.name}
            className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-50">
                  {metric.name.includes('CPU') && <Cpu className="w-5 h-5 text-blue-600" />}
                  {metric.name.includes('Memory') && <Server className="w-5 h-5 text-green-600" />}
                  {metric.name.includes('Disk') && <HardDrive className="w-5 h-5 text-orange-600" />}
                  {metric.name.includes('Network') && <Wifi className="w-5 h-5 text-purple-600" />}
                  {metric.name.includes('Database') && <Database className="w-5 h-5 text-indigo-600" />}
                  {metric.name.includes('Response') && <Activity className="w-5 h-5 text-cyan-600" />}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{metric.name}</h3>
                  <p className="text-sm text-gray-600">{metric.unit}</p>
                </div>
              </div>
              <StatusBadge status={metric.status} />
            </div>
            
            <div className="mb-4">
              <div className="text-3xl font-black text-gray-900 mb-1">
                {metric.value.toFixed(1)}<span className="text-lg text-gray-600 ml-1">{metric.unit}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Warning: {metric.threshold.warning}{metric.unit}</span>
                <span>•</span>
                <span>Critical: {metric.threshold.critical}{metric.unit}</span>
              </div>
            </div>
            
            <MetricChart 
              data={metric.history} 
              color={
                metric.status === 'good' ? 'bg-gradient-to-t from-green-400 to-green-300' :
                metric.status === 'warning' ? 'bg-gradient-to-t from-yellow-400 to-yellow-300' :
                'bg-gradient-to-t from-red-400 to-red-300'
              }
            />
          </div>
        ))}
      </div>

      {/* Services Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-50">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Service Status</h2>
          </div>
          
          <div className="space-y-4">
            {services.map((service, index) => (
              <div 
                key={service.name}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusBadge status={service.status} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-600">Uptime: {service.uptime}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{service.responseTime}ms</p>
                  <p className="text-xs text-gray-500">
                    {service.lastCheck.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Server Status */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-green-50">
              <Server className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Server Status</h2>
          </div>
          
          <div className="space-y-4">
            {servers.map((server, index) => (
              <div 
                key={server.name}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <StatusBadge status={server.status} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{server.name}</h3>
                    <p className="text-sm text-gray-600">{server.ip} • {server.location}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{server.load.toFixed(1)}% load</p>
                  <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        server.load > 80 ? 'bg-red-400' : 
                        server.load > 60 ? 'bg-yellow-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${server.load}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Quick Stats</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Requests</span>
              <span className="font-semibold text-gray-900">2.4M today</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Error Rate</span>
              <span className="font-semibold text-green-600">0.03%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Active Sessions</span>
              <span className="font-semibold text-gray-900">1,456</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-bold text-gray-900 mb-4">⚡ Performance</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Load Time</span>
              <span className="font-semibold text-blue-600">1.2s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Peak Memory</span>
              <span className="font-semibold text-gray-900">8.2GB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cache Hit Rate</span>
              <span className="font-semibold text-green-600">94.5%</span>
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20">
          <h3 className="text-lg font-bold text-gray-900 mb-4">🚨 Recent Alerts</h3>
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-yellow-600 font-medium">Warning:</span>
              <span className="text-gray-600 ml-1">High disk usage on DB-01</span>
            </div>
            <div className="text-sm">
              <span className="text-green-600 font-medium">Resolved:</span>
              <span className="text-gray-600 ml-1">Memory spike cleared</span>
            </div>
            <div className="text-sm">
              <span className="text-blue-600 font-medium">Info:</span>
              <span className="text-gray-600 ml-1">Backup completed</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitoring;