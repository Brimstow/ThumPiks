import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: {
    id: string;
    title: string;
    imageUrl: string;
  };
  creator: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  tags: string[];
  downloads: number;
  likes: number;
  createdAt: string;
}

const TemplateMarketplace: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/templates?isPublic=true');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every(tag => template.tags.includes(tag));

    return matchesSearch && matchesTags;
  });

  const allTags = Array.from(
    new Set(templates.flatMap(template => template.tags))
  );

  // Show loading state while authentication is being checked
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user is not authenticated, don't show the marketplace
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p>Please log in to access the template marketplace.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Template Marketplace</h1>

      {/* Search and Filter Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search templates..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        {/* Tags Filter */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Filter by Tags</h2>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            No templates found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
            >
              <div className="relative">
                <img
                  src={template.thumbnail.imageUrl}
                  alt={template.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                  {template.downloads} downloads
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center mb-2">
                  <img
                    src={template.creator.avatarUrl || '/default-avatar.png'}
                    alt={template.creator.name}
                    className="w-8 h-8 rounded-full mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {template.creator.name}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-1">{template.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {template.description}
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {template.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <button className="flex items-center text-gray-500 hover:text-red-500">
                      <svg
                        className="w-5 h-5 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      <span>{template.likes}</span>
                    </button>
                  </div>

                  <button
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    onClick={() => {
                      // TODO: Implement template usage
                      alert(`Use template: ${template.name}`);
                    }}
                  >
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateMarketplace;
