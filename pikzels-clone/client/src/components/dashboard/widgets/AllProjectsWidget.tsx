import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import { authGet } from '../../../utils/api';

interface Project {
  id: string;
  name: string;
  description: string | null;
  featuredThumbnail?: {
    imageUrl: string;
  } | null;
  folderType: 'project' | 'folder';
  createdAt: string;
}

interface AllProjectsWidgetProps {
  className?: string;
}

export const AllProjectsWidget: React.FC<AllProjectsWidgetProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'saved'>('all');

  useEffect(() => {
    fetchProjects();
  }, [viewMode]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '3',
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      if (viewMode === 'saved') {
        params.append('saved', 'true');
      }

      const response = await authGet(`/api/projects?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects || []);

    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const projectCount = projects.length;

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 ${className}`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setViewMode('all')}
            className={`text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'text-white border-b-2 border-blue-500 pb-1'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All projects ({projectCount})
          </button>
          <button
            onClick={() => setViewMode('saved')}
            className={`text-sm font-medium transition-colors ${
              viewMode === 'saved'
                ? 'text-white border-b-2 border-blue-500 pb-1'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Saved projects (0)
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && process.env.NODE_ENV === 'production' && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button
              onClick={fetchProjects}
              className="text-xs text-red-300 hover:text-red-200 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">No projects yet</p>
        </div>
      )}

      {/* Projects grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard 
              key={project.id} 
              project={project} 
              onNavigate={(id) => navigate(`/projects/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Project Card Component
interface ProjectCardProps {
  project: Project;
  onNavigate: (projectId: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onNavigate }) => {
  return (
    <div 
      className="group relative cursor-pointer"
      onClick={() => onNavigate(project.id)}
    >
      {/* Demo Project Badge (if applicable) */}
      {project.description?.includes('Demo') && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-slate-700 text-white text-xs font-medium px-2 py-1 rounded">
            Demo
          </span>
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl">
        {project.featuredThumbnail?.imageUrl ? (
          <img
            src={project.featuredThumbnail.imageUrl}
            alt={project.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-black">
            <FolderOpen className="w-16 h-16 text-slate-600 opacity-50" />
          </div>
        )}
      </div>

      {/* Project Info */}
      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
          {project.name}
        </h3>
        {project.description && (
          <p className="text-xs text-slate-500 line-clamp-1">
            {project.description}
          </p>
        )}
      </div>
    </div>
  );
};

// Mock data helper (development fallback only)
function getMockProjects(): Project[] {
  return [
    {
      id: '1',
      name: '24 Hours with Danny Duncan (The Most Dangerous Neighborhood)',
      description: 'Demo project',
      featuredThumbnail: {
        imageUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1280&h=720&fit=crop'
      },
      folderType: 'project',
      createdAt: new Date().toISOString()
    },
    {
      id: '2',
      name: 'Curry Drills 12 Threes Including The Game Winner',
      description: 'Demo project',
      featuredThumbnail: {
        imageUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1280&h=720&fit=crop'
      },
      folderType: 'project',
      createdAt: new Date().toISOString()
    },
    {
      id: '3',
      name: 'Tal Wilkenfeld: Music, Guitar, Bass, Jeff Beck',
      description: 'Demo project',
      featuredThumbnail: {
        imageUrl: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=1280&h=720&fit=crop'
      },
      folderType: 'project',
      createdAt: new Date().toISOString()
    }
  ];
}
