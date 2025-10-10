import React, { useState, useEffect } from 'react';
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
  metadata?: Record<string, any>;
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

  // Generate mock audit log data with real-time updates
  useEffect(() => {
    const generateMockLogs = (): AuditLogEntry[] => {
      const users = [
        { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Super Admin' },
        { id: '2', name: 'John Smith', email: 'john@example.com', role: 'Admin' },
        { id: '3', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Moderator' },
        { id: '4', name: 'Mike Davis', email: 'mike@example.com', role: 'User' }
      ];

      const actions = [
        { action: 'user.login', resource: 'authentication', severity: 'low' as const, category: 'authentication' as const },
        { action: 'user.logout', resource: 'authentication', severity: 'low' as const, category: 'authentication' as const },
        { action: 'user.create', resource: 'user', severity: 'medium' as const, category: 'admin' as const },
        { action: 'user.update', resource: 'user', severity: 'medium' as const, category: 'data' as const },
        { action: 'user.delete', resource: 'user', severity: 'high' as const, category: 'admin' as const },
        { action: 'thumbnail.create', resource: 'thumbnail', severity: 'low' as const, category: 'data' as const },
        { action: 'thumbnail.delete', resource: 'thumbnail', severity: 'medium' as const, category: 'data' as const },
        { action: 'settings.update', resource: 'system_settings', severity: 'high' as const, category: 'system' as const },
        { action: 'backup.create', resource: 'system', severity: 'medium' as const, category: 'system' as const },
        { action: 'security.alert', resource: 'security', severity: 'critical' as const, category: 'security' as const },
        { action: 'permission.grant', resource: 'permissions', severity: 'high' as const, category: 'authorization' as const },
        { action: 'role.assign', resource: 'roles', severity: 'high' as const, category: 'authorization' as const }
      ];

      const mockLogs: AuditLogEntry[] = [];
      
      for (let i = 0; i < 50; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const actionData = actions[Math.floor(Math.random() * actions.length)];
        const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
        const success = Math.random() > 0.1; // 90% success rate

        mockLogs.push({
          id: `log_${i + 1}`,
          timestamp,
          user,
          action: actionData.action,
          resource: actionData.resource,
          resourceId: `${actionData.resource}_${Math.floor(Math.random() * 1000)}`,
          details: generateLogDetails(actionData.action, user.name, success),
          ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          severity: actionData.severity,
          category: actionData.category,
          success,
          metadata: {
            duration: Math.floor(Math.random() * 1000) + 100,
            endpoint: `/${actionData.resource}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)]
          }
        });
      }

      return mockLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    };

    const generateLogDetails = (action: string, userName: string, success: boolean): string => {
      const baseDetails = {
        'user.login': `${userName} ${success ? 'successfully logged in' : 'failed to log in'}`,
        'user.logout': `${userName} logged out`,
        'user.create': `${userName} ${success ? 'created' : 'failed to create'} a new user account`,
        'user.update': `${userName} ${success ? 'updated' : 'failed to update'} user profile`,
        'user.delete': `${userName} ${success ? 'deleted' : 'failed to delete'} user account`,
        'thumbnail.create': `${userName} ${success ? 'created' : 'failed to create'} new thumbnail`,
        'thumbnail.delete': `${userName} ${success ? 'deleted' : 'failed to delete'} thumbnail`,
        'settings.update': `${userName} ${success ? 'modified' : 'failed to modify'} system settings`,
        'backup.create': `${userName} ${success ? 'initiated' : 'failed to initiate'} system backup`,
        'security.alert': `Security alert triggered${success ? '' : ' (false positive)'}`,
        'permission.grant': `${userName} ${success ? 'granted' : 'failed to grant'} permissions`,
        'role.assign': `${userName} ${success ? 'assigned' : 'failed to assign'} user role`
      };
      
      return baseDetails[action as keyof typeof baseDetails] || `${userName} performed ${action}`;
    };

    setLogs(generateMockLogs());
  }, []);

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
      low: 'text-blue-600 bg-blue-50 border-blue-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      critical: 'text-red-600 bg-red-50 border-red-200'
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text mb-2">
              📋 Audit Logs
            </h1>
            <p className="text-gray-600 font-medium">Monitor and track all system activities and user actions</p>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
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
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-lg border border-white/20 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search logs..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date Range */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Severity Filter */}
          <select
            multiple
            value={filters.severity}
            onChange={(e) => {
              const values = Array.from(e.target.selectedOptions, option => option.value);
              setFilters(prev => ({ ...prev, severity: values }));
            }}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Success Filter */}
          <select
            value={filters.success === null ? 'all' : filters.success.toString()}
            onChange={(e) => {
              const value = e.target.value === 'all' ? null : e.target.value === 'true';
              setFilters(prev => ({ ...prev, success: value }));
            }}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>

          {/* Sort Options */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">Time</option>
              <option value="user">User</option>
              <option value="action">Action</option>
              <option value="severity">Severity</option>
            </select>
            
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log, index) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium">
                        {log.timestamp.toLocaleDateString()}
                      </div>
                      <div className="text-gray-500">
                        {log.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {log.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium">{log.user.name}</div>
                        <div className="text-gray-500 text-xs">{log.user.role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(log.category)}
                      <span className="font-medium">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate" title={log.details}>
                      {log.details}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      log.success 
                        ? 'text-green-600 bg-green-50 border border-green-200' 
                        : 'text-red-600 bg-red-50 border border-red-200'
                    }`}>
                      {log.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 hover:text-blue-800 font-medium"
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
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No logs found matching your filters</p>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">ID</label>
                <p className="text-gray-900 font-mono text-sm">{selectedLog.id}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Timestamp</label>
                <p className="text-gray-900">{selectedLog.timestamp.toLocaleString()}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">User</label>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {selectedLog.user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{selectedLog.user.name}</p>
                    <p className="text-sm text-gray-600">{selectedLog.user.email} • {selectedLog.user.role}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Action & Resource</label>
                <p className="text-gray-900">{selectedLog.action} on {selectedLog.resource}</p>
                {selectedLog.resourceId && (
                  <p className="text-sm text-gray-600">Resource ID: {selectedLog.resourceId}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Details</label>
                <p className="text-gray-900">{selectedLog.details}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">IP Address</label>
                  <p className="text-gray-900 font-mono text-sm">{selectedLog.ipAddress}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedLog.success 
                      ? 'text-green-600 bg-green-50' 
                      : 'text-red-600 bg-red-50'
                  }`}>
                    {selectedLog.success ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {selectedLog.success ? 'Success' : 'Failed'}
                  </span>
                </div>
              </div>

              {selectedLog.metadata && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Metadata</label>
                  <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-xl overflow-x-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">User Agent</label>
                <p className="text-gray-600 text-sm break-all">{selectedLog.userAgent}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;