import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThumbnailEditor from './ThumbnailEditor';
import BatchEditor from './BatchEditor';
import ThumbnailFilters from './ThumbnailFilters';
import AnalyticsDashboard from './AnalyticsDashboard';
import CreateThumbnail from './CreateThumbnail';
import SetFeaturedThumbnail from './SetFeaturedThumbnail';
import SocialShareModal from './SocialShareModal';
import { Navigation, StatCard, Button, Card, CardBody } from './ui';
import { useTheme } from '../contexts/ThemeContext';
import './Dashboard.css';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt: string;
  parameters: any;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  featuredThumbnail?: Thumbnail | null;
}

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'thumbnails' | 'projects' | 'analytics'>('dashboard');
  const [editingThumbnail, setEditingThumbnail] = useState<Thumbnail | null>(null);
  const [creatingThumbnail, setCreatingThumbnail] = useState(false);
  const [selectedThumbnails, setSelectedThumbnails] = useState<Thumbnail[]>([]);
  const [batchEditing, setBatchEditing] = useState(false);
  const [shareLinks, setShareLinks] = useState<Record<string, {url: string, token: string}>>({});
  const [filters, setFilters] = useState({
    search: '',
    projectId: '',
    sortBy: 'createdAt',
    sortOrder: 'desc' as 'asc' | 'desc',
    style: '',
    dateFrom: '',
    dateTo: ''
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [settingFeaturedForProject, setSettingFeaturedForProject] = useState<string | null>(null);
  const [socialShareModal, setSocialShareModal] = useState<{ thumbnailId: string; thumbnailTitle: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Fetch user profile
        const profileResponse = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          setUser(profileData.user);
        } else {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        // Fetch thumbnails with filters
        await fetchThumbnails();

        // Fetch projects
        await fetchProjects();
      } catch (error) {
        console.error('Error fetching data:', error);
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const projectsResponse = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setProjects(projectsData.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchThumbnails = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Build query string from filters
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const thumbnailsResponse = await fetch(`/api/thumbnails?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (thumbnailsResponse.ok) {
        const thumbnailsData = await thumbnailsResponse.json();
        setThumbnails(thumbnailsData.thumbnails);
      }
    } catch (error) {
      console.error('Error fetching thumbnails:', error);
    }
  };

  // Update thumbnails when filters change
  useEffect(() => {
    if (!loading) {
      fetchThumbnails();
    }
  }, [filters, loading]);

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveEdits = async (edits: any) => {
    if (!editingThumbnail) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/thumbnails/${editingThumbnail.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ edits })
      });

      if (response.ok) {
        const data = await response.json();
        // Update the thumbnail in our state
        setThumbnails(thumbnails.map(t => 
          t.id === editingThumbnail.id ? data.thumbnail : t
        ));
        setEditingThumbnail(null);
      } else {
        console.error('Failed to save edits');
      }
    } catch (error) {
      console.error('Error saving edits:', error);
    }
  };

  const handleBatchEdit = (edits: any) => {
    // This function will handle applying the same edits to all selected thumbnails
    console.log('Applying batch edits to:', selectedThumbnails);
    console.log('Edits:', edits);
    
    // In a real implementation, you would send a request to your backend
    // to apply these edits to all selected thumbnails
    alert(`Applied edits to ${selectedThumbnails.length} thumbnails`);
    setBatchEditing(false);
    setSelectedThumbnails([]);
  };

  const handleCreateThumbnail = async (prompt: string, style: string, projectId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/thumbnails/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, style, projectId })
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh thumbnails list
        await fetchThumbnails();
        setCreatingThumbnail(false);
        alert(`${data.thumbnails.length} thumbnails generated successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to generate thumbnails: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error creating thumbnail:', error);
      alert('Failed to create thumbnail. Please try again.');
    }
  };

  const toggleThumbnailSelection = (thumbnail: Thumbnail) => {
    if (selectedThumbnails.some(t => t.id === thumbnail.id)) {
      setSelectedThumbnails(selectedThumbnails.filter(t => t.id !== thumbnail.id));
    } else {
      setSelectedThumbnails([...selectedThumbnails, thumbnail]);
    }
  };

  const selectAllThumbnails = () => {
    if (selectedThumbnails.length === thumbnails.length) {
      setSelectedThumbnails([]);
    } else {
      setSelectedThumbnails([...thumbnails]);
    }
  };

  const handleGenerateShareLink = async (thumbnailId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/thumbnails/${thumbnailId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Store the share link in our state
        setShareLinks(prev => ({
          ...prev,
          [thumbnailId]: {
            url: data.shareUrl,
            token: data.shareToken
          }
        }));
        
        // Copy the share link to clipboard
        navigator.clipboard.writeText(data.shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        console.error('Failed to generate share link');
        alert('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Error generating share link');
    }
  };

  const handleRevokeShareLink = async (thumbnailId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/thumbnails/${thumbnailId}/share`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove the share link from our state
        setShareLinks(prev => {
          const newLinks = { ...prev };
          delete newLinks[thumbnailId];
          return newLinks;
        });
        
        alert('Share link revoked successfully');
      } else {
        console.error('Failed to revoke share link');
        alert('Failed to revoke share link');
      }
    } catch (error) {
      console.error('Error revoking share link:', error);
      alert('Error revoking share link');
    }
  };

  const handleSetFeaturedThumbnail = async (projectId: string, thumbnailId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/featured-thumbnail`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ thumbnailId })
      });

      if (response.ok) {
        // Refresh projects to show the updated featured thumbnail
        await fetchProjects();
        setSettingFeaturedForProject(null);
        alert('Featured thumbnail set successfully!');
      } else {
        const errorData = await response.json();
        alert(`Failed to set featured thumbnail: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error setting featured thumbnail:', error);
      alert('Error setting featured thumbnail');
    }
  };

  const handleSocialShare = async (thumbnailId: string, thumbnailTitle: string) => {
    setSocialShareModal({ thumbnailId, thumbnailTitle });
  };

  const performSocialShare = async (platforms: string[], message: string) => {
    if (!socialShareModal) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('/api/social-share/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          thumbnailId: socialShareModal.thumbnailId,
          platforms,
          message
        })
      });

      if (response.ok) {
        const data = await response.json();
        alert('Thumbnail shared successfully!');
        setSocialShareModal(null);
        return data.results;
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to share thumbnail');
      }
    } catch (error) {
      console.error('Error sharing thumbnail:', error);
      alert(`Failed to share thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="dashboard__loading">
        <div>
          <div className="dashboard__loading-spinner"></div>
          <div className="dashboard__loading-text">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  const navigationItems = [
    {
      id: 'templates',
      label: 'Templates',
      onClick: () => navigate('/templates'),
      active: location.pathname === '/templates'
    }
  ];

  return (
    <div className="dashboard">
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onThemeToggle={toggleTheme}
        onLogout={handleLogout}
        theme={theme}
        additionalItems={navigationItems}
      />

      <div className="dashboard__container">
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="dashboard__tab-content">
            <div className="dashboard__welcome">
              <h1 className="dashboard__title">
                Welcome, {user?.name || user?.email.split('@')[0]}!
              </h1>
              <p className="dashboard__subtitle">
                Create stunning thumbnails for your content with AI-powered tools.
              </p>
            </div>

            <div className="dashboard__stats">
              <StatCard
                value={thumbnails.length}
                label="Total Thumbnails"
                icon={
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                iconColor="primary"
                onClick={() => setActiveTab('thumbnails')}
                trend={{
                  direction: 'up',
                  value: 12,
                  label: 'vs last month'
                }}
              />

              <StatCard
                value={projects.length}
                label="Active Projects"
                icon={
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
                iconColor="success"
                onClick={() => setActiveTab('projects')}
                trend={{
                  direction: 'up',
                  value: 8,
                  label: 'vs last month'
                }}
              />

              <StatCard
                value="150"
                label="Credits Remaining"
                subtitle="Renews monthly"
                icon={
                  <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
                iconColor="warning"
                trend={{
                  direction: 'neutral',
                  value: 0,
                  label: 'this month'
                }}
              />
            </div>

            <div className="dashboard__quick-actions">
              <h2 className="dashboard__section-title">Quick Actions</h2>
              <div className="dashboard__actions-grid">
                <Card 
                  variant="default" 
                  className="dashboard__action-card"
                  interactive
                  onClick={() => setCreatingThumbnail(true)}
                  tabIndex={0}
                  role="button"
                  aria-label="Create new thumbnail"
                >
                  <div className="dashboard__action-content">
                    <div className="dashboard__action-icon">
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="dashboard__action-info">
                      <h3 className="dashboard__action-title">Create Thumbnail</h3>
                      <p className="dashboard__action-description">Generate new AI-powered thumbnails</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  variant="default" 
                  className="dashboard__action-card"
                  interactive
                  onClick={() => setActiveTab('projects')}
                  tabIndex={0}
                  role="button"
                  aria-label="Manage projects"
                >
                  <div className="dashboard__action-content">
                    <div className="dashboard__action-icon" style={{background: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-600))'}}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="dashboard__action-info">
                      <h3 className="dashboard__action-title">Manage Projects</h3>
                      <p className="dashboard__action-description">Organize thumbnails into projects</p>
                    </div>
                  </div>
                </Card>

                <Card 
                  variant="default" 
                  className="dashboard__action-card"
                  interactive
                  onClick={() => setActiveTab('analytics')}
                  tabIndex={0}
                  role="button"
                  aria-label="View analytics"
                >
                  <div className="dashboard__action-content">
                    <div className="dashboard__action-icon" style={{background: 'linear-gradient(135deg, #06b6d4, #0891b2)'}}>
                      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div className="dashboard__action-info">
                      <h3 className="dashboard__action-title">View Analytics</h3>
                      <p className="dashboard__action-description">Track performance and insights</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true"></span>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Manage Projects</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>Organize your work</p>
                  </div>
                </button>

                <div 
                  onClick={() => navigate('/settings')}
                  className={`relative rounded-lg border ${
                    theme === 'dark' 
                      ? 'border-gray-700 bg-gray-800 hover:border-gray-500' 
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  } px-6 py-5 shadow-sm flex items-center space-x-3 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 cursor-pointer`}
                >
                  <div className="flex-shrink-0">
                    <svg className={`h-6 w-6 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c-.94 1.543.826 3.31 2.37 2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="absolute inset-0" aria-hidden="true"></span>
                    <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Settings</p>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>Account preferences</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thumbnails Tab */}
        {activeTab === 'thumbnails' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>My Thumbnails</h2>
                <div className="flex space-x-2">
                  {selectedThumbnails.length > 0 && (
                    <button
                      onClick={() => setBatchEditing(true)}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                      </svg>
                      Batch Edit ({selectedThumbnails.length})
                    </button>
                  )}
                  <button
                    onClick={() => setCreatingThumbnail(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New
                  </button>
                </div>
              </div>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                All thumbnails you've created with the AI tool.
              </p>
            </div>

            {/* Thumbnail Filters */}
            <ThumbnailFilters 
              onFilterChange={handleFilterChange} 
              projects={projects.map(p => ({ id: p.id, name: p.name }))} 
            />

            {thumbnails.length === 0 ? (
              <div className={`text-center py-12 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow`}>
                <svg className={`mx-auto h-12 w-12 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h3 className={`mt-2 text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>No thumbnails</h3>
                <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Get started by creating a new thumbnail.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setCreatingThumbnail(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Thumbnail
                  </button>
                </div>
              </div>
            ) : (
              <>
                {selectedThumbnails.length > 0 && (
                  <div className={`mb-4 flex items-center justify-between ${theme === 'dark' ? 'bg-indigo-900' : 'bg-indigo-50'} p-3 rounded-md`}>
                    <div className={`${theme === 'dark' ? 'text-indigo-200' : 'text-indigo-700'}`}>
                      {selectedThumbnails.length} thumbnail{selectedThumbnails.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={selectAllThumbnails}
                        className={`text-sm ${theme === 'dark' ? 'text-indigo-300 hover:text-indigo-100' : 'text-indigo-600 hover:text-indigo-800'}`}
                      >
                        {selectedThumbnails.length === thumbnails.length ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={() => setSelectedThumbnails([])}
                        className={`text-sm ${theme === 'dark' ? 'text-indigo-300 hover:text-indigo-100' : 'text-indigo-600 hover:text-indigo-800'}`}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {thumbnails.map((thumbnail) => (
                    <div 
                      key={thumbnail.id} 
                      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg cursor-pointer transform transition-transform hover:scale-105 ${
                        selectedThumbnails.some(t => t.id === thumbnail.id) 
                          ? 'ring-2 ring-indigo-500 ring-offset-2' 
                          : ''
                      }`}
                      onClick={(e) => {
                        // Only toggle selection if not clicking on action buttons
                        if (!(e.target instanceof SVGElement)) {
                          toggleThumbnailSelection(thumbnail);
                        }
                      }}
                    >
                      <div className="aspect-w-16 aspect-h-9 relative">
                        <img
                          src={thumbnail.imageUrl}
                          alt={thumbnail.title}
                          className="object-cover w-full h-48"
                        />
                        <div 
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer ${
                            selectedThumbnails.some(t => t.id === thumbnail.id)
                              ? 'bg-indigo-500'
                              : theme === 'dark' ? 'bg-gray-700 bg-opacity-70' : 'bg-white bg-opacity-70'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleThumbnailSelection(thumbnail);
                          }}
                        >
                          {selectedThumbnails.some(t => t.id === thumbnail.id) && (
                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div className="px-4 py-4">
                        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>{thumbnail.title}</h3>
                        <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} line-clamp-2`}>{thumbnail.prompt}</p>
                        <div className="mt-4 flex justify-between items-center">
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                            {new Date(thumbnail.createdAt).toLocaleDateString()}
                          </span>
                          <div className="flex space-x-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = `/api/thumbnails/${thumbnail.id}/download`;
                                link.setAttribute('download', `${thumbnail.title}.png`);
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              className={`${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-900'}`}
                              title="Download"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Check if we already have a share link for this thumbnail
                                if (shareLinks[thumbnail.id]) {
                                  // Copy existing link to clipboard
                                  navigator.clipboard.writeText(shareLinks[thumbnail.id].url);
                                  alert('Share link copied to clipboard!');
                                } else {
                                  // Generate new share link
                                  handleGenerateShareLink(thumbnail.id);
                                }
                              }}
                              className={`${theme === 'dark' ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-900'}`}
                              title="Share"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            {shareLinks[thumbnail.id] && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRevokeShareLink(thumbnail.id);
                                }}
                                className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                                title="Revoke Share Link"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSocialShare(thumbnail.id, thumbnail.title);
                              }}
                              className={`${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-900'}`}
                              title="Social Share"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingThumbnail(thumbnail);
                              }}
                              className={`${theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
                              title="Edit"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                // Delete functionality would go here
                              }}
                              className={`${theme === 'dark' ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-900'}`}
                              title="Delete"
                            >
                              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="mb-6">
              <div className="flex justify-between items-center">
                <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Projects</h2>
                <button
                  onClick={() => alert('Project creation form would open here')}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Project
                </button>
              </div>
              <p className={`mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Organize your thumbnails into projects for better management.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div 
                  key={project.id} 
                  className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} overflow-hidden shadow rounded-lg`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {project.name}
                      </h3>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'}`}>
                        Active
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      {project.description || 'No description'}
                    </p>
                    <div className="mt-4">
                      <p className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
                        Created on {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Featured Thumbnail Preview */}
                    {project.featuredThumbnail ? (
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                            Featured Thumbnail
                          </h4>
                          <button
                            onClick={() => setEditingThumbnail(project.featuredThumbnail!)}
                            className={`text-xs ${theme === 'dark' ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-900'}`}
                          >
                            Edit
                          </button>
                        </div>
                        <div className="aspect-w-16 aspect-h-9 rounded-md overflow-hidden">
                          <img
                            src={project.featuredThumbnail.imageUrl}
                            alt={project.featuredThumbnail.title}
                            className="object-cover w-full h-32"
                          />
                        </div>
                        <p className={`mt-1 text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>
                          {project.featuredThumbnail.title}
                        </p>
                      </div>
                    ) : (
                      <div className={`mt-4 p-4 border-2 border-dashed rounded-md ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                        <p className={`text-sm text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          No featured thumbnail set
                        </p>
                      </div>
                    )}
                    
                    {/* Set Featured Thumbnail Button */}
                    <div className="mt-4">
                      <button
                        onClick={() => setSettingFeaturedForProject(project.id)}
                        className={`w-full inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white ${
                          project.featuredThumbnail 
                            ? 'bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500' 
                            : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                        }`}
                      >
                        {project.featuredThumbnail ? 'Change Featured Thumbnail' : 'Set Featured Thumbnail'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Set Featured Thumbnail Modal */}
        {settingFeaturedForProject && (
          <SetFeaturedThumbnail
            projectId={settingFeaturedForProject}
            onClose={() => setSettingFeaturedForProject(null)}
            onSetFeatured={(thumbnailId) => handleSetFeaturedThumbnail(settingFeaturedForProject, thumbnailId)}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}
      </div>

      {/* Thumbnail Editor Modal */}
      {editingThumbnail && (
        <ThumbnailEditor
          thumbnail={editingThumbnail}
          onClose={() => setEditingThumbnail(null)}
          onSave={handleSaveEdits}
        />
      )}

      {/* Batch Editor Modal */}
      {batchEditing && (
        <BatchEditor
          thumbnails={selectedThumbnails}
          onClose={() => setBatchEditing(false)}
          onSave={handleBatchEdit}
        />
      )}
      
      {/* Create Thumbnail Modal */}
      {creatingThumbnail && (
        <CreateThumbnail
          onClose={() => setCreatingThumbnail(false)}
          onCreate={handleCreateThumbnail}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
        />
      )}

      {/* Social Share Modal */}
      {socialShareModal && (
        <SocialShareModal
          thumbnailId={socialShareModal.thumbnailId}
          thumbnailTitle={socialShareModal.thumbnailTitle}
          onClose={() => setSocialShareModal(null)}
          onShare={performSocialShare}
        />
      )}
    </div>
  );
};

export default Dashboard;