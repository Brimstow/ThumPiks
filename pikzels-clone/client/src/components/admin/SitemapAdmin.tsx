import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  RefreshCw, 
  Download, 
  Upload, 
  Search, 
  Filter,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Settings,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';

interface SitemapEntry {
  id: string;
  url: string;
  lastModified: string;
  changeFreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
  status: 'active' | 'pending' | 'excluded';
  type: 'page' | 'thumbnail' | 'template' | 'project' | 'user_profile';
  indexStatus: 'indexed' | 'not_indexed' | 'blocked' | 'error';
  crawledAt?: string;
  clicks?: number;
  impressions?: number;
}

interface SitemapStats {
  totalUrls: number;
  indexedUrls: number;
  pendingUrls: number;
  errorUrls: number;
  lastGenerated: string;
  fileSize: string;
  avgClickThrough: number;
}

const SitemapAdmin: React.FC = () => {
  const [sitemapEntries, setSitemapEntries] = useState<SitemapEntry[]>([]);
  const [stats, setStats] = useState<SitemapStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [sortField, setSortField] = useState<keyof SitemapEntry>('lastModified');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Mock data - replace with actual API calls
  useEffect(() => {
    const fetchSitemapData = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        
        // Fetch stats
        const statsResponse = await fetch('/api/admin/sitemap/stats', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData.data);
        }
        
        // Fetch entries
        const entriesResponse = await fetch('/api/admin/sitemap/entries', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (entriesResponse.ok) {
          const entriesData = await entriesResponse.json();
          setSitemapEntries(entriesData.data.entries);
        }
        
      } catch (error) {
        console.error('Error fetching sitemap data:', error);
        // Fallback to mock data
        const mockStats: SitemapStats = {
          totalUrls: 1247,
          indexedUrls: 1089,
          pendingUrls: 158,
          errorUrls: 23,
          lastGenerated: '2024-01-15T10:30:00Z',
          fileSize: '2.3 MB',
          avgClickThrough: 3.2
        };

        const mockEntries: SitemapEntry[] = [
          {
            id: '1',
            url: 'https://thumbnailcreator.com/',
            lastModified: '2024-01-15T10:00:00Z',
            changeFreq: 'daily',
            priority: 1.0,
            status: 'active',
            type: 'page',
            indexStatus: 'indexed',
            crawledAt: '2024-01-15T08:30:00Z',
            clicks: 1250,
            impressions: 5670
          },
          {
            id: '2',
            url: 'https://thumbnailcreator.com/templates',
            lastModified: '2024-01-14T15:20:00Z',
            changeFreq: 'weekly',
            priority: 0.8,
            status: 'active',
            type: 'page',
            indexStatus: 'indexed',
            crawledAt: '2024-01-14T12:15:00Z',
            clicks: 890,
            impressions: 3420
          },
          {
            id: '3',
            url: 'https://thumbnailcreator.com/thumbnails/gaming-header-123',
            lastModified: '2024-01-13T09:45:00Z',
            changeFreq: 'monthly',
            priority: 0.6,
            status: 'active',
            type: 'thumbnail',
            indexStatus: 'indexed',
            crawledAt: '2024-01-13T14:20:00Z',
            clicks: 45,
            impressions: 180
          },
          {
            id: '4',
            url: 'https://thumbnailcreator.com/user/johndoe',
            lastModified: '2024-01-12T16:30:00Z',
            changeFreq: 'weekly',
            priority: 0.4,
            status: 'pending',
            type: 'user_profile',
            indexStatus: 'not_indexed',
            clicks: 12,
            impressions: 67
          },
          {
            id: '5',
            url: 'https://thumbnailcreator.com/templates/youtube-banner-template',
            lastModified: '2024-01-11T11:15:00Z',
            changeFreq: 'monthly',
            priority: 0.7,
            status: 'active',
            type: 'template',
            indexStatus: 'error',
            clicks: 0,
            impressions: 0
          }
        ];
        
        setStats(mockStats);
        setSitemapEntries(mockEntries);
      } finally {
        setLoading(false);
      }
    };

    fetchSitemapData();
  }, []);

  // Filter and search logic
  const filteredEntries = sitemapEntries.filter(entry => {
    const matchesSearch = entry.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || entry.type === filterType;
    const matchesStatus = filterStatus === 'all' || entry.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort logic
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0;
    if (aValue === undefined) return 1;
    if (bValue === undefined) return -1;
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const handleSort = (field: keyof SitemapEntry) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntries(prev => 
      prev.includes(entryId) 
        ? prev.filter(id => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on entries:`, selectedEntries);
    // Implement bulk actions
  };

  const handleGenerateSitemap = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/sitemap/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Sitemap generated:', data);
        // Refresh the data
        window.location.reload();
      } else {
        console.error('Failed to generate sitemap');
      }
    } catch (error) {
      console.error('Error generating sitemap:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportSitemap = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('/api/admin/sitemap/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'sitemap.xml';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to export sitemap');
      }
    } catch (error) {
      console.error('Error exporting sitemap:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'indexed':
        return <CheckCircle className="text-green-600" size={16} />;
      case 'not_indexed':
        return <Clock className="text-yellow-600" size={16} />;
      case 'blocked':
        return <AlertCircle className="text-red-600" size={16} />;
      case 'error':
        return <AlertCircle className="text-red-600" size={16} />;
      default:
        return <Clock className="text-gray-600" size={16} />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 0.8) return 'text-green-600 bg-green-50';
    if (priority >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
        <span className="ml-2 text-gray-600">Loading sitemap data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sitemap Management</h1>
          <p className="text-gray-600">Manage your website's sitemap and SEO visibility</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleExportSitemap}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export Sitemap</span>
          </button>
          <button 
            onClick={handleGenerateSitemap}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Generating...' : 'Generate Sitemap'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total URLs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUrls.toLocaleString()}</p>
              </div>
              <Globe className="text-blue-600" size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Indexed URLs</p>
                <p className="text-2xl font-bold text-green-600">{stats.indexedUrls.toLocaleString()}</p>
              </div>
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending URLs</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingUrls.toLocaleString()}</p>
              </div>
              <Clock className="text-yellow-600" size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error URLs</p>
                <p className="text-2xl font-bold text-red-600">{stats.errorUrls.toLocaleString()}</p>
              </div>
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search URLs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="page">Pages</option>
              <option value="thumbnail">Thumbnails</option>
              <option value="template">Templates</option>
              <option value="project">Projects</option>
              <option value="user_profile">User Profiles</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="excluded">Excluded</option>
            </select>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add URL</span>
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedEntries.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedEntries.length} items selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('reindex')}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reindex
                </button>
                <button
                  onClick={() => handleBulkAction('exclude')}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Exclude
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sitemap Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEntries(sortedEntries.map(entry => entry.id));
                      } else {
                        setSelectedEntries([]);
                      }
                    }}
                    checked={selectedEntries.length === sortedEntries.length && sortedEntries.length > 0}
                    className="rounded border-gray-300"
                  />
                </th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('url')}
                >
                  URL
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Status</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('priority')}
                >
                  Priority
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Change Freq</th>
                <th 
                  className="px-4 py-3 text-left text-sm font-medium text-gray-900 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lastModified')}
                >
                  Last Modified
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Performance</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedEntries.includes(entry.id)}
                      onChange={() => handleSelectEntry(entry.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(entry.indexStatus)}
                      <a 
                        href={entry.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
                      >
                        {entry.url}
                      </a>
                      <ExternalLink size={12} className="text-gray-400" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {entry.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      entry.status === 'active' ? 'bg-green-100 text-green-800' :
                      entry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(entry.priority)}`}>
                      {entry.priority.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {entry.changeFreq}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(entry.lastModified).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span>{entry.impressions?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <TrendingUp size={12} />
                        <span>{entry.clicks?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Edit3 size={14} />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {sortedEntries.length} of {sitemapEntries.length} entries
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            Previous
          </button>
          <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SitemapAdmin;