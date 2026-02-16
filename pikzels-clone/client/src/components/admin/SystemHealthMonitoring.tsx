import React, { useState, useEffect, useCallback } from 'react';
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
  Shield,
  RefreshCw
} from 'lucide-react';
import { adminSystemService } from '../../services/admin';

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
        return { icon: CheckCircle, color: 'text-green-400 bg-green-500/10 border-green-500/20', text: 'Healthy' };
      case 'warning':
      case 'degraded':
        return { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', text: 'Warning' };
      case 'critical':
      case 'offline':
        return { icon: XCircle, color: 'text-red-400 bg-red-500/10 border-red-500/20', text: 'Critical' };
      default:
        return { icon: CheckCircle, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', text: 'Unknown' };
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

const MetricChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 40 }) => {
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

  // Load initial data from service (mock in dev, real API in prod)
  const loadSystemData = useCallback(async () => {
    try {
      const [healthResult, perfResult] = await Promise.all([
        adminSystemService.getHealth(),
        adminSystemService.getPerformanceMetrics(),
      ]);

      if (healthResult.success && healthResult.data) {
        const h = healthResult.data as any;
        if (h.services && Array.isArray(h.services)) {
          setServices(h.services.map((s: any) => ({
            name: s.service || s.name,
            status: s.status === 'healthy' ? 'online' : s.status === 'degraded' ? 'degraded' : 'online',
            uptime: s.uptime ?? '99.9%',
            responseTime: s.responseTime ?? 0,
            lastCheck: new Date(s.lastChecked || Date.now()),
          })));
        }
      }

      if (perfResult.success && perfResult.data) {
        const p = perfResult.data as any;
        setSystemMetrics(prev => prev.map(metric => {
          if (metric.name === 'CPU Usage' && p.cpu) {
            return { ...metric, value: p.cpu.usage, history: [...metric.history.slice(1), p.cpu.usage] };
          }
          if (metric.name === 'Memory Usage' && p.memory) {
            return { ...metric, value: p.memory.percentage, history: [...metric.history.slice(1), p.memory.percentage] };
          }
          if (metric.name === 'Disk Usage' && p.disk) {
            return { ...metric, value: p.disk.percentage, history: [...metric.history.slice(1), p.disk.percentage] };
          }
          if (metric.name === 'Response Time' && p.requests) {
            return { ...metric, value: p.requests.averageResponseTime, history: [...metric.history.slice(1), p.requests.averageResponseTime] };
          }
          return metric;
        }));
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading system data:', error);
    }
  }, []);

  useEffect(() => {
    loadSystemData();
  }, [loadSystemData]);

  // Real-time polling simulation for live metric updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prevMetrics => 
        prevMetrics.map(metric => {
          const variance = metric.value * 0.1;
          const newValue = Math.max(0, metric.value + (Math.random() - 0.5) * variance);
          
          let newStatus: 'good' | 'warning' | 'critical' = 'good';
          if (newValue >= metric.threshold.critical) newStatus = 'critical';
          else if (newValue >= metric.threshold.warning) newStatus = 'warning';
          
          const newHistory = [...metric.history.slice(1), newValue];
          
          return {
            ...metric,
            value: newValue,
            status: newStatus,
            history: newHistory
          };
        })
      );

      setServices(prevServices =>
        prevServices.map(service => ({
          ...service,
          responseTime: Math.max(1, service.responseTime + (Math.random() - 0.5) * 10),
          lastCheck: new Date()
        }))
      );

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
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSystemData();
    setIsRefreshing(false);
  };

  const overallHealth = () => {
    const criticalCount = systemMetrics.filter(m => m.status === 'critical').length;
    const warningCount = systemMetrics.filter(m => m.status === 'warning').length;
    
    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'good';
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-50">System Health</h1>
            <p className="text-sm text-slate-400 mt-1">Real-time performance and health metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <StatusBadge status={overallHealth()} />
              <p className="text-xs text-slate-500 mt-1">
                Updated {lastUpdate.toLocaleTimeString()}
              </p>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-800 hover:border-slate-600 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {systemMetrics.map((metric) => (
          <div 
            key={metric.name}
            className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  metric.name.includes('CPU') ? 'bg-blue-500/10' :
                  metric.name.includes('Memory') ? 'bg-green-500/10' :
                  metric.name.includes('Disk') ? 'bg-orange-500/10' :
                  metric.name.includes('Network') ? 'bg-blue-500/10' :
                  metric.name.includes('Database') ? 'bg-blue-500/10' :
                  'bg-blue-500/10'
                }`}>
                  {metric.name.includes('CPU') && <Cpu className="w-4 h-4 text-blue-400" />}
                  {metric.name.includes('Memory') && <Server className="w-4 h-4 text-green-400" />}
                  {metric.name.includes('Disk') && <HardDrive className="w-4 h-4 text-orange-400" />}
                  {metric.name.includes('Network') && <Wifi className="w-4 h-4 text-blue-400" />}
                  {metric.name.includes('Database') && <Database className="w-4 h-4 text-blue-400" />}
                  {metric.name.includes('Response') && <Activity className="w-4 h-4 text-blue-400" />}
                </div>
                <h3 className="font-semibold text-slate-100 text-sm">{metric.name}</h3>
              </div>
              <StatusBadge status={metric.status} />
            </div>
            
            <div className="mb-3">
              <div className="text-2xl font-bold text-slate-50">
                {metric.value.toFixed(1)}<span className="text-sm text-slate-500 ml-1">{metric.unit}</span>
              </div>
            </div>
            
            <MetricChart 
              data={metric.history} 
              color={
                metric.status === 'good' ? 'bg-emerald-500' :
                metric.status === 'warning' ? 'bg-yellow-500' :
                'bg-red-500'
              }
            />
          </div>
        ))}
      </div>

      {/* Services & Server Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-50">Services</h2>
          </div>
          
          <div className="space-y-3">
            {services.map((service) => (
              <div 
                key={service.name}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={service.status} />
                  <div>
                    <h3 className="font-medium text-slate-100 text-sm">{service.name}</h3>
                    <p className="text-xs text-slate-500">{service.uptime}</p>
                  </div>
                </div>
                <p className="font-medium text-slate-300 text-sm">{service.responseTime.toFixed(0)}ms</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Server className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-50">Servers</h2>
          </div>
          
          <div className="space-y-3">
            {servers.map((server) => (
              <div 
                key={server.name}
                className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={server.status} />
                  <div>
                    <h3 className="font-medium text-slate-100 text-sm">{server.name}</h3>
                    <p className="text-xs text-slate-500">{server.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 bg-slate-700 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${
                        server.load > 80 ? 'bg-red-500' : 
                        server.load > 60 ? 'bg-yellow-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${server.load}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-300 w-10 text-right">{server.load.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Requests</span>
              <span className="font-medium text-slate-100">2.4M</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Error Rate</span>
              <span className="font-medium text-green-400">0.03%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Sessions</span>
              <span className="font-medium text-slate-100">1,456</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">Performance</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Load Time</span>
              <span className="font-medium text-blue-400">1.2s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Memory</span>
              <span className="font-medium text-slate-100">8.2GB</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Cache Hit</span>
              <span className="font-medium text-green-400">94.5%</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-100 mb-3">Recent Alerts</h3>
          <div className="space-y-2">
            <div className="text-sm flex items-start gap-2">
              <span className="text-yellow-400 font-medium">Warn:</span>
              <span className="text-slate-400">High disk usage</span>
            </div>
            <div className="text-sm flex items-start gap-2">
              <span className="text-green-400 font-medium">OK:</span>
              <span className="text-slate-400">Memory cleared</span>
            </div>
            <div className="text-sm flex items-start gap-2">
              <span className="text-blue-400 font-medium">Info:</span>
              <span className="text-slate-400">Backup complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitoring;
