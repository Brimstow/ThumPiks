import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Loader2, AlertCircle, Upload } from 'lucide-react';
import { authGet } from '../../../utils/api';
import { getUserAssets, UserAsset } from '../../../services/quickEditService';
import { formatRelativeTime } from '../../../lib/formatters';
import ImagePreviewModal from '../../ui/ImagePreviewModal';

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

interface ProjectsAndUploadsWidgetProps {
  className?: string;
}

type ViewMode = 'all' | 'saved' | 'uploads';
type AssetFilter = 'all' | 'face' | 'background' | 'logo';

const ASSET_FILTER_LABELS: { value: AssetFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'face', label: 'Faces' },
  { value: 'background', label: 'Images' },
  { value: 'logo', label: 'Brand' },
];

const ASSET_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  face: { label: 'Face', className: 'bg-purple-500/20 text-purple-300' },
  background: { label: 'Image', className: 'bg-blue-500/20 text-blue-300' },
  logo: { label: 'Brand', className: 'bg-amber-500/20 text-amber-300' },
  other: { label: 'Other', className: 'bg-slate-500/20 text-slate-300' },
};

export const ProjectsAndUploadsWidget: React.FC<ProjectsAndUploadsWidgetProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('all');

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Assets state
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Preview state
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setProjectLoading(true);
      setProjectError(null);

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
      setProjectError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setProjectLoading(false);
    }
  }, [viewMode]);

  const fetchAssets = useCallback(async () => {
    try {
      setAssetLoading(true);
      setAssetError(null);
      const typeParam = assetFilter === 'all' ? undefined : assetFilter;
      const allAssets = await getUserAssets(typeParam);
      setAssetCount(allAssets.length);
      setAssets(allAssets.slice(0, 3));
    } catch (err) {
      console.error('Error fetching assets:', err);
      setAssetError(err instanceof Error ? err.message : 'Failed to load uploads');
    } finally {
      setAssetLoading(false);
    }
  }, [assetFilter]);

  useEffect(() => {
    if (viewMode === 'uploads') {
      fetchAssets();
    } else {
      fetchProjects();
    }
  }, [viewMode, fetchProjects, fetchAssets]);

  const loading = viewMode === 'uploads' ? assetLoading : projectLoading;
  const error = viewMode === 'uploads' ? assetError : projectError;
  const projectCount = projects.length;

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 ${className}`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4">
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
          <button
            onClick={() => setViewMode('uploads')}
            className={`text-sm font-medium transition-colors ${
              viewMode === 'uploads'
                ? 'text-white border-b-2 border-blue-500 pb-1'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            My uploads ({assetCount})
          </button>
        </div>
        {viewMode === 'uploads' && assetCount > 3 && (
          <button
            onClick={() => navigate('/dashboard/uploads')}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            View All &rarr;
          </button>
        )}
      </div>

      {/* Sub-filter pills for uploads */}
      {viewMode === 'uploads' && (
        <div className="flex items-center gap-2 mb-4">
          {ASSET_FILTER_LABELS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setAssetFilter(filter.value)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                assetFilter === filter.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button
              onClick={viewMode === 'uploads' ? fetchAssets : fetchProjects}
              className="text-xs text-red-300 hover:text-red-200 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Projects content */}
      {viewMode !== 'uploads' && !loading && !error && (
        <>
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No projects yet</p>
            </div>
          ) : (
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
        </>
      )}

      {/* Uploads content */}
      {viewMode === 'uploads' && !loading && !error && (
        <>
          {assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Upload className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No uploads yet</p>
              <button
                onClick={() => navigate('/dashboard/uploads')}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {assets.map((asset, index) => (
                <AssetCard key={asset.id} asset={asset} onClick={() => setPreviewIndex(index)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Asset Preview Modal */}
      {previewIndex !== null && assets[previewIndex] && (
        <ImagePreviewModal
          isOpen
          onClose={() => setPreviewIndex(null)}
          imageUrl={assets[previewIndex].url}
          title={assets[previewIndex].name || `${(ASSET_TYPE_BADGE[assets[previewIndex].type] || ASSET_TYPE_BADGE.other).label} upload`}
          metadata={{
            type: (ASSET_TYPE_BADGE[assets[previewIndex].type] || ASSET_TYPE_BADGE.other).label,
            size: assets[previewIndex].sizeBytes ?? undefined,
            width: assets[previewIndex].width ?? undefined,
            height: assets[previewIndex].height ?? undefined,
            date: assets[previewIndex].createdAt,
          }}
          actions={{
            onDownload: () => {
              const a = assets[previewIndex!];
              const link = document.createElement('a');
              link.href = a.url;
              link.download = a.name || 'download';
              link.click();
            },
          }}
          items={assets.map((a) => ({ imageUrl: a.url, title: a.name || undefined }))}
          currentIndex={previewIndex}
          onNavigate={(i) => setPreviewIndex(i)}
        />
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
      {project.description?.includes('Demo') && (
        <div className="absolute top-2 right-2 z-10">
          <span className="bg-slate-700 text-white text-xs font-medium px-2 py-1 rounded">
            Demo
          </span>
        </div>
      )}

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

// Asset Card Component (for uploads tab)
interface AssetCardProps {
  asset: UserAsset;
  onClick?: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick }) => {
  const badge = ASSET_TYPE_BADGE[asset.type] || ASSET_TYPE_BADGE.other;

  return (
    <div className="group relative cursor-pointer" onClick={onClick}>
      <div className="absolute top-2 right-2 z-10">
        <span className={`text-xs font-medium px-2 py-1 rounded ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl">
        <img
          src={asset.url}
          alt={asset.name || asset.type}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
          {asset.name || `${badge.label} upload`}
        </h3>
        <p className="text-xs text-slate-500">
          {formatRelativeTime(asset.createdAt)}
        </p>
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
