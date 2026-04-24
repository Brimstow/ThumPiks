import React, { useState, useEffect } from 'react';
import { adminSystemService } from '../../services/admin';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Server, 
  Database, 
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  RefreshCw,
  Bell,
  X
} from 'lucide-react';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  errorMessage?: string;
  lastChecked: Date;
  details?: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'down';
  services: HealthCheck[];
  uptime: number;
  timestamp: Date;
}

interface PerformanceMetrics {
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  value: number;
  threshold: number;
  triggeredAt: Date;
  acknowledged: boolean;
}

const SystemMonitoring: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    loadSystemData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSystemData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    setLoading(true);
    try {
      const [healthResult, perfResult, alertsResult] = await Promise.all([
        adminSystemService.getHealth(),
        adminSystemService.getPerformanceMetrics(),
        adminSystemService.getAlerts(),
      ]);

      if (healthResult.success && healthResult.data) {
        const h = healthResult.data as any;
        setSystemHealth({
          ...h,
          timestamp: new Date(h.timestamp ?? Date.now()),
          services: (h.services ?? []).map((s: any) => ({
            ...s,
            lastChecked: new Date(s.lastChecked ?? Date.now()),
          })),
        });
      }
      if (perfResult.success && perfResult.data) {
        setPerformanceMetrics(perfResult.data as PerformanceMetrics);
      }
      if (alertsResult.success && alertsResult.data) {
        const raw = alertsResult.data as any[];
        setAlerts(raw.map((a: any) => ({
          ...a,
          triggeredAt: new Date(a.triggeredAt ?? Date.now()),
        })));
      }
    } catch (error) {
      console.error('Error loading system data:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-500/10';
      case 'degraded': return 'text-yellow-400 bg-yellow-500/10';
      case 'down': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle size={16} />;
      case 'degraded': return <AlertTriangle size={16} />;
      case 'down': return <XCircle size={16} />;
      default: return <Activity size={16} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-blue-400 bg-blue-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'high': return 'text-orange-400 bg-orange-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
      default: return 'text-slate-400 bg-slate-500/10';
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const result = await adminSystemService.acknowledgeAlert(alertId);
      if (result.success) {
        setAlerts(prev => prev.map(alert => 
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ));
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563ff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-50">System Monitoring</h1>
          <p className="text-slate-400 mt-2">Real-time system health and performance monitoring</p>
        </div>
        
        <button
          onClick={loadSystemData}
          className="px-4 py-2 bg-[#2563ff] text-white rounded-lg hover:bg-[#1d4fff] transition-colors flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Overall Status */}
      {systemHealth && (
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(systemHealth.overall)}`}>
                {getStatusIcon(systemHealth.overall)}
                <span className="font-medium capitalize">{systemHealth.overall}</span>
              </div>
              <div className="text-slate-400">
                Uptime: {formatUptime(systemHealth.uptime)}
              </div>
            </div>
            <div className="text-sm text-slate-500">
              Last updated: {systemHealth.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'services', label: 'Services' },
            { id: 'performance', label: 'Performance' },
            { id: 'alerts', label: 'Alerts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedTab === tab.id
                  ? 'bg-[#2563ff] text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && performanceMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* CPU Usage */}
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">CPU Usage</p>
                <p className="text-2xl font-bold text-slate-50 mt-1">{performanceMetrics.cpu.usage}%</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Cpu className="text-blue-400" size={24} />
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Memory Usage</p>
                <p className="text-2xl font-bold text-slate-50 mt-1">{performanceMetrics.memory.percentage}%</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(performanceMetrics.memory.used * 1024 * 1024)} / {formatBytes(performanceMetrics.memory.total * 1024 * 1024)}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <MemoryStick className="text-green-400" size={24} />
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Disk Usage</p>
                <p className="text-2xl font-bold text-slate-50 mt-1">{performanceMetrics.disk.percentage}%</p>
                <p className="text-xs text-slate-500">
                  {formatBytes(performanceMetrics.disk.used * 1024 * 1024)} / {formatBytes(performanceMetrics.disk.total * 1024 * 1024)}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <HardDrive className="text-orange-400" size={24} />
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-400">Network</p>
                <p className="text-sm text-slate-100 mt-1">
                  ↓ {formatBytes(performanceMetrics.network.bytesIn)}
                </p>
                <p className="text-sm text-slate-100">
                  ↑ {formatBytes(performanceMetrics.network.bytesOut)}
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Wifi className="text-purple-400" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {selectedTab === 'services' && systemHealth && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-50">Service Health</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {systemHealth.services.map((service, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      <span className="font-medium capitalize">{service.status}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-100 capitalize">{service.service}</h3>
                      {service.responseTime && (
                        <p className="text-sm text-slate-500">Response: {service.responseTime}ms</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-500">
                    Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                  </div>
                </div>
                {service.errorMessage && (
                  <div className="mt-2 text-sm text-red-400">
                    Error: {service.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {selectedTab === 'alerts' && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-50">System Alerts</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No active alerts
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                        <Bell size={16} />
                        <span className="font-medium capitalize">{alert.severity}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-100">{alert.ruleName}</h3>
                        <p className="text-sm text-slate-400">{alert.message}</p>
                        <p className="text-xs text-slate-500">
                          Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.acknowledged ? (
                        <span className="text-sm text-green-400">Acknowledged</span>
                      ) : (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 bg-[#2563ff] text-white rounded-lg hover:bg-[#1d4fff] transition-colors text-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SystemMonitoring;