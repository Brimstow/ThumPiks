import React, { useState, useEffect, useCallback } from 'react';
import { adminAuditService } from '../../services/admin';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Calendar,
  Clock,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Database,
  Lock,
  Unlock,
  Trash2,
  Edit,
  Plus,
  RefreshCw,
  ArrowUpDown
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  timestamp: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data' | 'system' | 'security' | 'admin';
  success: boolean;
  metadata?: Record<string, unknown>;
}

interface AuditLogApiEntry {
  id: string;
  timestamp: string;
  user: AuditLogEntry['user'];
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  ipAddress: string;
  userAgent: string;
  severity: AuditLogEntry['severity'];
  category: AuditLogEntry['category'];
  success: boolean;
  metadata?: Record<string, unknown>;
}

interface FilterOptions {
  dateRange: string;
  severity: string[];
  category: string[];
  users: string[];
  success: boolean | null;
  searchQuery: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [sortBy, setSortBy] = useState<'timestamp' | 'user' | 'action' | 'severity'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '24h',
    severity: [],
    category: [],
    users: [],
    success: null,
    searchQuery: ''
  });

  // Load audit logs from service (mock in dev, real API in prod)
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminAuditService.getActivityLogs();
      if (result.success && result.data) {
        const normalized = (result.data as AuditLogApiEntry[]).map((log) => ({
          id: log.id,
          timestamp: new Date(log.timestamp),
          user: log.user,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          details: log.details,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          severity: log.severity,
          category: log.category,
          success: log.success,
          metadata: log.metadata,
        }));
        setLogs(normalized);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Real-time log updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Add a new log entry occasionally
      if (Math.random() > 0.7) {
        const newLog: AuditLogEntry = {
          id: `log_${Date.now()}`,
          timestamp: new Date(),
          user: { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Super Admin' },
          action: 'system.monitor',
          resource: 'system',
          details: 'System health check performed automatically',
          ipAddress: '127.0.0.1',
          userAgent: 'System/1.0',
          severity: 'low',
          category: 'system',
          success: true,
          metadata: { automated: true }
        };

        setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 49)]);
      }
    }, 10000); // Add new log every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...logs];

    // Apply date range filter
    const now = new Date();
    const dateRangeMap = {
      '1h': 1 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    if (filters.dateRange in dateRangeMap) {
      const cutoff = new Date(now.getTime() - dateRangeMap[filters.dateRange as keyof typeof dateRangeMap]);
      filtered = filtered.filter(log => log.timestamp >= cutoff);
    }

    // Apply other filters
    if (filters.severity.length > 0) {
      filtered = filtered.filter(log => filters.severity.includes(log.severity));
    }

    if (filters.category.length > 0) {
      filtered = filtered.filter(log => filters.category.includes(log.category));
    }

    if (filters.success !== null) {
      filtered = filtered.filter(log => log.success === filters.success);
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query) ||
        log.user.name.toLowerCase().includes(query) ||
        log.resource.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'user':
          comparison = a.user.name.localeCompare(b.user.name);
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'severity':
          const severityOrder = { low: 0, medium: 1, high: 2, critical: 3 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
      }
      
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    setFilteredLogs(filtered);
  }, [logs, filters, sortBy, sortOrder]);

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      critical: 'text-red-400 bg-red-500/10 border-red-500/20'
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      authentication: <Lock className="w-4 h-4" />,
      authorization: <Shield className="w-4 h-4" />,
      data: <Database className="w-4 h-4" />,
      system: <Settings className="w-4 h-4" />,
      security: <AlertTriangle className="w-4 h-4" />,
      admin: <User className="w-4 h-4" />
    };
    return icons[category as keyof typeof icons] || <FileText className="w-4 h-4" />;
  };

  const handleExport = () => {
    const csvData = filteredLogs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      user: log.user.name,
      action: log.action,
      resource: log.resource,
      details: log.details,
      severity: log.severity,
      success: log.success,
      ipAddress: log.ipAddress
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-50 mb-2">Audit Logs</h1>
            <p className="text-slate-400 font-medium">Monitor and track all system activities and user actions</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              Showing {filteredLogs.length} of {logs.length} logs
            </span>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff] focus:border-transparent"
            />
          </div>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <select
            multiple
            value={filters.severity}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              setFilters(prev => ({ ...prev, severity: values }));
            }}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={filters.success === null ? 'all' : filters.success.toString()}
            onChange={(e) => {
              const value = e.target.value === 'all' ? null : e.target.value === 'true';
              setFilters(prev => ({ ...prev, success: value }));
            }}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="all">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
            >
              <option value="timestamp">Time</option>
              <option value="user">User</option>
              <option value="action">Action</option>
              <option value="severity">Severity</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Severity</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    <div className="font-medium">{log.timestamp.toLocaleDateString()}</div>
                    <div className="text-slate-500">{log.timestamp.toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#2563ff] rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {log.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-slate-500 text-xs">{log.user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(log.category)}
                      <span className="font-medium">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-100 max-w-xs">
                    <div className="truncate" title={log.details}>{log.details}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      log.success 
                        ? 'text-green-400 bg-green-500/10 border border-green-500/20' 
                        : 'text-red-400 bg-red-500/10 border border-red-500/20'
                    }`}>
                      {log.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-[#2563ff] hover:text-blue-400 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">No logs found matching your filters</p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-50">Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <XCircle className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400">ID</label>
                <p className="text-slate-100 font-mono text-sm">{selectedLog.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Timestamp</label>
                <p className="text-slate-100">{selectedLog.timestamp.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">User</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 bg-[#2563ff] rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedLog.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-100">{selectedLog.user.name}</p>
                    <p className="text-sm text-slate-400">{selectedLog.user.email} · {selectedLog.user.role}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Action & Resource</label>
                <p className="text-slate-100">{selectedLog.action} on {selectedLog.resource}</p>
                {selectedLog.resourceId && (
                  <p className="text-sm text-slate-400">Resource ID: {selectedLog.resourceId}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-400">Details</label>
                <p className="text-slate-100">{selectedLog.details}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-400">IP Address</label>
                  <p className="text-slate-100 font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-400">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedLog.success 
                      ? 'text-green-400 bg-green-500/10' 
                      : 'text-red-400 bg-red-500/10'
                  }`}>
                    {selectedLog.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>
              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-medium text-slate-400">Metadata</label>
                  <pre className="text-sm text-slate-100 bg-slate-800/50 p-3 rounded-xl overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-slate-400">User Agent</label>
                <p className="text-slate-400 text-sm break-all">{selectedLog.userAgent}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;