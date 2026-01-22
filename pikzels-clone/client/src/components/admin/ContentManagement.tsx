import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Generate mock content data
    const statuses: ('published' | 'draft' | 'archived')[] = ['published', 'draft', 'archived'];
    const mockContent: ContentItem[] = [
      // Thumbnails
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `thumb_${i + 1}`,
        type: 'thumbnail' as const,
        title: `YouTube Thumbnail ${i + 1}`,
        description: `Professional YouTube thumbnail design with modern styling`,
        author: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
        authorId: `user_${Math.floor(Math.random() * 3) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        status: statuses[Math.floor(Math.random() * 3)],
        tags: ['gaming', 'tutorial', 'lifestyle', 'tech', 'entertainment'].slice(0, Math.floor(Math.random() * 3) + 1),
        thumbnailUrl: `https://picsum.photos/400/300?random=${i + 1}`,
        downloads: Math.floor(Math.random() * 1000),
        views: Math.floor(Math.random() * 5000),
        rating: Math.random() * 5,
        featured: Math.random() > 0.8,
        category: ['Gaming', 'Education', 'Lifestyle', 'Technology'][Math.floor(Math.random() * 4)],
        size: { width: 1920, height: 1080 }
      })),
      // Templates
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `template_${i + 1}`,
        type: 'template' as const,
        title: `Template Design ${i + 1}`,
        description: `Customizable template for various use cases`,
        author: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
        authorId: `user_${Math.floor(Math.random() * 3) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        status: statuses[Math.floor(Math.random() * 3)],
        tags: ['modern', 'minimal', 'corporate', 'creative', 'colorful'].slice(0, Math.floor(Math.random() * 3) + 1),
        thumbnailUrl: `https://picsum.photos/400/300?random=${i + 16}`,
        downloads: Math.floor(Math.random() * 500),
        views: Math.floor(Math.random() * 2000),
        rating: Math.random() * 5,
        featured: Math.random() > 0.7,
        category: ['Business', 'Social Media', 'Marketing', 'Personal'][Math.floor(Math.random() * 4)],
        size: { width: 1080, height: 1080 }
      })),
      // Projects
      ...Array.from({ length: 8 }, (_, i) => ({
        id: `project_${i + 1}`,
        type: 'project' as const,
        title: `User Project ${i + 1}`,
        description: `Custom project created by user`,
        author: ['John Doe', 'Jane Smith', 'Mike Johnson'][Math.floor(Math.random() * 3)],
        authorId: `user_${Math.floor(Math.random() * 3) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        status: statuses[Math.floor(Math.random() * 3)],
        tags: ['custom', 'personal', 'business', 'creative'].slice(0, Math.floor(Math.random() * 2) + 1),
        thumbnailUrl: `https://picsum.photos/400/300?random=${i + 26}`,
        downloads: Math.floor(Math.random() * 100),
        views: Math.floor(Math.random() * 500),
        rating: Math.random() * 5,
        featured: false,
        category: ['Personal', 'Business', 'Creative'][Math.floor(Math.random() * 3)],
        size: { width: 1200, height: 800 }
      }))
    ];

    setContent(mockContent);
  }, []);

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
      case 'published': return 'text-green-600 bg-green-50 border-green-200';
      case 'draft': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'archived': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text mb-2">
          🎨 Content Management
        </h1>
        <p className="text-gray-600 font-medium">Manage thumbnails, templates, and user projects</p>
      </div>

      {/* Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-2 shadow-lg border border-white/20 mb-6 inline-flex">
        {[
          { id: 'all', label: 'All Content', count: content.length },
          { id: 'thumbnails', label: 'Thumbnails', count: content.filter(c => c.type === 'thumbnail').length },
          { id: 'templates', label: 'Templates', count: content.filter(c => c.type === 'template').length },
          { id: 'projects', label: 'Projects', count: content.filter(c => c.type === 'project').length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-semibold transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-1 rounded-full text-xs ${
              activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200'
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white/80"
            />
          </div>

          {/* Filters */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white/80"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-4 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 bg-white/80"
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
              <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
              <button
                onClick={() => handleBulkAction('publish')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
              >
                Publish
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700"
              >
                Archive
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white/80">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
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
              className="bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
            >
              <div className="relative">
                <img 
                  src={item.thumbnailUrl} 
                  alt={item.title}
                  className="w-full h-48 object-cover"
                />
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
                    className="rounded border-gray-300 text-blue-600"
                  />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(item.type)}
                  <span className="text-xs text-gray-500 uppercase font-medium">{item.type}</span>
                </div>
                
                <h3 className="font-bold text-gray-900 mb-1 truncate">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{item.author}</span>
                  <span>{item.createdAt.toLocaleDateString()}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {item.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {item.downloads}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1 text-gray-600 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">
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
                      className="rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredContent.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
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
                        className="rounded border-gray-300 text-blue-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={item.thumbnailUrl} alt={item.title} className="w-12 h-12 rounded-lg object-cover" />
                        <div>
                          <div className="flex items-center gap-2">
                            {getTypeIcon(item.type)}
                            <span className="font-medium text-gray-900">{item.title}</span>
                            {item.featured && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                          </div>
                          <p className="text-sm text-gray-600 truncate max-w-xs">{item.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.author}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="space-y-1">
                        <div>{item.views} views</div>
                        <div>{item.downloads} downloads</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-600 hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No content found</h3>
          <p className="text-gray-600">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
};

export default ContentManagement;