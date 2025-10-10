import React, { useState, useEffect } from 'react';
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
      // Mock API calls - replace with actual API endpoints
      const mockSystemHealth: SystemHealth = {
        overall: 'healthy',
        services: [
          {
            service: 'database',
            status: 'healthy',
            responseTime: 45,
            lastChecked: new Date(),
            details: { connectionPool: 'healthy', userCount: 2543 }
          },
          {
            service: 'redis',
            status: 'healthy',
            responseTime: 12,
            lastChecked: new Date(),
            details: { memory: 'usage-info', connectedClients: 'client-list' }
          },
          {
            service: 'filesystem',
            status: 'degraded',
            lastChecked: new Date(),
            details: { diskUsage: 78, totalSpace: 100000, freeSpace: 22000 }
          },
          {
            service: 'api',
            status: 'healthy',
            responseTime: 89,
            lastChecked: new Date(),
            details: { endpoints: ['auth', 'users', 'thumbnails'], averageResponseTime: 89 }
          },
          {
            service: 'external',
            status: 'healthy',
            lastChecked: new Date(),
            details: { cloudinary: 'healthy', email: 'healthy', oauth: 'healthy' }
          }
        ],
        uptime: 1234567,
        timestamp: new Date()
      };

      const mockPerformanceMetrics: PerformanceMetrics = {
        cpu: {
          usage: 45,
          loadAverage: [1.2, 1.5, 1.8]
        },
        memory: {
          used: 6400,
          total: 16000,
          percentage: 40
        },
        disk: {
          used: 78000,
          total: 100000,
          percentage: 78
        },
        network: {
          bytesIn: 1234567,
          bytesOut: 987654
        }
      };

      const mockAlerts: Alert[] = [
        {
          id: '1',
          ruleId: 'disk-space',
          ruleName: 'High Disk Usage',
          message: 'Disk usage exceeded 75%',
          severity: 'medium',
          value: 78,
          threshold: 75,
          triggeredAt: new Date(Date.now() - 1000 * 60 * 5),
          acknowledged: false
        },
        {
          id: '2',
          ruleId: 'memory-usage',
          ruleName: 'Memory Usage Warning',
          message: 'Memory usage approaching limit',
          severity: 'low',
          value: 40,
          threshold: 80,
          triggeredAt: new Date(Date.now() - 1000 * 60 * 15),
          acknowledged: true
        }
      ];

      setSystemHealth(mockSystemHealth);
      setPerformanceMetrics(mockPerformanceMetrics);
      setAlerts(mockAlerts);
    } catch (error) {
      console.error('Error loading system data:', error);
    }
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
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
      // Mock API call
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      ));
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600 mt-2">Real-time system health and performance monitoring</p>
        </div>
        
        <button
          onClick={loadSystemData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Overall Status */}
      {systemHealth && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(systemHealth.overall)}`}>
                {getStatusIcon(systemHealth.overall)}
                <span className="font-medium capitalize">{systemHealth.overall}</span>
              </div>
              <div className="text-gray-600">
                Uptime: {formatUptime(systemHealth.uptime)}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {systemHealth.timestamp.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200 p-1">
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
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
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
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">CPU Usage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{performanceMetrics.cpu.usage}%</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Cpu className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Memory Usage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{performanceMetrics.memory.percentage}%</p>
                <p className="text-xs text-gray-500">
                  {formatBytes(performanceMetrics.memory.used * 1024 * 1024)} / {formatBytes(performanceMetrics.memory.total * 1024 * 1024)}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <MemoryStick className="text-green-600" size={24} />
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Disk Usage</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{performanceMetrics.disk.percentage}%</p>
                <p className="text-xs text-gray-500">
                  {formatBytes(performanceMetrics.disk.used * 1024 * 1024)} / {formatBytes(performanceMetrics.disk.total * 1024 * 1024)}
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <HardDrive className="text-orange-600" size={24} />
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Network</p>
                <p className="text-sm text-gray-900 mt-1">
                  ↓ {formatBytes(performanceMetrics.network.bytesIn)}
                </p>
                <p className="text-sm text-gray-900">
                  ↑ {formatBytes(performanceMetrics.network.bytesOut)}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Wifi className="text-purple-600" size={24} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {selectedTab === 'services' && systemHealth && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Service Health</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {systemHealth.services.map((service, index) => (
              <div key={index} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getStatusColor(service.status)}`}>
                      {getStatusIcon(service.status)}
                      <span className="font-medium capitalize">{service.status}</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 capitalize">{service.service}</h3>
                      {service.responseTime && (
                        <p className="text-sm text-gray-500">Response: {service.responseTime}ms</p>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                  </div>
                </div>
                {service.errorMessage && (
                  <div className="mt-2 text-sm text-red-600">
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
          </div>
          {alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No active alerts
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                        <Bell size={16} />
                        <span className="font-medium capitalize">{alert.severity}</span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{alert.ruleName}</h3>
                        <p className="text-sm text-gray-600">{alert.message}</p>
                        <p className="text-xs text-gray-500">
                          Triggered: {new Date(alert.triggeredAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.acknowledged ? (
                        <span className="text-sm text-green-600">Acknowledged</span>
                      ) : (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm"
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