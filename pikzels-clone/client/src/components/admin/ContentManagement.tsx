import React, { useState, useEffect, useCallback } from 'react';
import { adminContentService } from '../../services/admin';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Image, 
  Layout, 
  FileText, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Download,
  Upload,
  Star,
  Calendar,
  User,
  Tag,
  Grid,
  List,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface ContentItem {
  id: string;
  type: 'thumbnail' | 'template' | 'project';
  title: string;
  description: string;
  author: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  thumbnailUrl: string;
  downloads: number;
  views: number;
  rating: number;
  featured: boolean;
  category: string;
  size?: { width: number; height: number };
}

const ContentManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'thumbnails' | 'templates' | 'projects'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: 'all',
    category: 'all',
    author: 'all',
    dateRange: '30d'
  });

  // Set active tab based on URL path
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/thumbnails')) {
      setActiveTab('thumbnails');
    } else if (path.includes('/templates')) {
      setActiveTab('templates');
    } else if (path.includes('/projects')) {
      setActiveTab('projects');
    } else {
      setActiveTab('all');
    }
  }, [location.pathname]);

  const loadContent = useCallback(async () => {
    try {
      const result = await adminContentService.getContent();
      if (result.success && result.data) {
        const normalized = (result.data as any[]).map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }));
        setContent(normalized);
      }
    } catch (error) {
      console.error('Error loading content:', error);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const filteredContent = content.filter(item => {
    // Tab filter
    if (activeTab !== 'all' && item.type !== activeTab.slice(0, -1)) return false;
    
    // Search filter
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !item.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.author.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    
    // Status filter
    if (filters.status !== 'all' && item.status !== filters.status) return false;
    
    // Category filter
    if (filters.category !== 'all' && item.category !== filters.category) return false;
    
    return true;
  });

  const handleBulkAction = (action: 'delete' | 'publish' | 'archive' | 'feature') => {
    if (selectedItems.length === 0) return;
    
    switch (action) {
      case 'delete':
        if (confirm(`Delete ${selectedItems.length} items?`)) {
          setContent(prev => prev.filter(item => !selectedItems.includes(item.id)));
          setSelectedItems([]);
        }
        break;
      case 'publish':
        setContent(prev => prev.map(item => 
          selectedItems.includes(item.id) ? { ...item, status: 'published' as const } : item
        ));
        setSelectedItems([]);
        break;
      case 'archive':
        setContent(prev => prev.map(item => 
          selectedItems.includes(item.id) ? { ...item, status: 'archived' as const } : item
        ));
        setSelectedItems([]);
        break;
      case 'feature':
        setContent(prev => prev.map(item => 
          selectedItems.includes(item.id) ? { ...item, featured: !item.featured } : item
        ));
        setSelectedItems([]);
        break;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'draft': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'archived': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thumbnail': return <Image className="w-4 h-4" />;
      case 'template': return <Layout className="w-4 h-4" />;
      case 'project': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-50 mb-2">Content Management</h1>
        <p className="text-slate-400 font-medium">Manage thumbnails, templates, and user projects</p>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-2 mb-6 inline-flex">
        {[
          { id: 'all', label: 'All Content', path: '/admin/content', count: content.length },
          { id: 'thumbnails', label: 'Thumbnails', path: '/admin/content/thumbnails', count: content.filter(c => c.type === 'thumbnail').length },
          { id: 'templates', label: 'Templates', path: '/admin/content/templates', count: content.filter(c => c.type === 'template').length },
          { id: 'projects', label: 'Projects', path: '/admin/content/projects', count: content.filter(c => c.type === 'project').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-[#2563ff] text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-1 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-[#2563ff]"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900/80 text-slate-100 focus:ring-2 focus:ring-[#2563ff]"
          >
            <option value="all">All Categories</option>
            <option value="Gaming">Gaming</option>
            <option value="Education">Education</option>
            <option value="Business">Business</option>
            <option value="Technology">Technology</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          {/* Bulk Actions */}
          {selectedItems.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{selectedItems.length} selected</span>
              <button
                onClick={() => handleBulkAction('publish')}
                className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-sm rounded-lg hover:bg-green-500/20"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-sm rounded-lg hover:bg-yellow-500/20"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-sm rounded-lg hover:bg-red-500/20"
              >
                Delete
              </button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-[#2563ff] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-[#2563ff] text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredContent.map(item => (
            <div
              key={item.id}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all duration-200"
            >
              <div className="relative">
                <img src={item.thumbnailUrl} alt={item.title} className="w-full h-48 object-cover" />
                <div className="absolute top-3 left-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {item.featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems(prev => [...prev, item.id]);
                      } else {
                        setSelectedItems(prev => prev.filter(id => id !== item.id));
                      }
                    }}
                    className="rounded border-slate-600 text-[#2563ff] bg-slate-800"
                  />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(item.type)}
                  <span className="text-xs text-slate-500 uppercase font-medium">{item.type}</span>
                </div>
                <h3 className="font-bold text-slate-50 mb-1 truncate">{item.title}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{item.author}</span>
                  <span>{item.createdAt.toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views}</span>
                    <span className="flex items-center gap-1"><Download className="w-3 h-3" />{item.downloads}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-slate-400 hover:text-[#2563ff] transition-colors"><Eye className="w-4 h-4" /></button>
                    <button className="p-1 text-slate-400 hover:text-[#2563ff] transition-colors"><Edit className="w-4 h-4" /></button>
                    <button className="p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredContent.length && filteredContent.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(filteredContent.map(item => item.id));
                        } else {
                          setSelectedItems([]);
                        }
                      }}
                      className="rounded border-slate-600 text-[#2563ff] bg-slate-800"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Content</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Author</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Stats</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredContent.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(prev => [...prev, item.id]);
                          } else {
                            setSelectedItems(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded border-slate-600 text-[#2563ff] bg-slate-800"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.thumbnailUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            <span className="font-medium text-slate-100">{item.title}</span>
                            {item.featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                          </div>
                          <p className="text-sm text-slate-400 truncate max-w-xs">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-100">{item.author}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">
                      <div className="space-y-1">
                        <div>{item.views} views</div>
                        <div>{item.downloads} downloads</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{item.createdAt.toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-slate-400 hover:text-[#2563ff] transition-colors"><Eye className="w-4 h-4" /></button>
                        <button className="p-1 text-slate-400 hover:text-[#2563ff] transition-colors"><Edit className="w-4 h-4" /></button>
                        <button className="p-1 text-slate-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-50 mb-2">No content found</h3>
          <p className="text-slate-400">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;