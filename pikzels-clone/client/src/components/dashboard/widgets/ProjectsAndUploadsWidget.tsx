import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Folder, Image as ImageIcon, Loader2, AlertCircle, Upload } from 'lucide-react';
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
  previewThumbnails?: Array<{
    id?: string;
    imageUrl: string;
    title?: string;
  }>;
  thumbnailCount?: number;
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
    <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6 ${className}`}>
      {/* Header with tabs */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto min-w-0">
          <button
            onClick={() => setViewMode('all')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'all'
                ? 'text-white border-b-2 border-blue-500 pb-1'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All projects ({projectCount})
          </button>
          <button
            onClick={() => setViewMode('saved')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
              viewMode === 'saved'
                ? 'text-white border-b-2 border-blue-500 pb-1'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Saved projects (0)
          </button>
          <button
            onClick={() => setViewMode('uploads')}
            className={`text-sm font-medium transition-colors whitespace-nowrap ${
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
  const isFolder = project.folderType === 'folder';
  const Icon = isFolder ? Folder : FolderOpen;
  const iconColor = isFolder ? 'text-yellow-500' : 'text-slate-400';

  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => onNavigate(project.id)}
    >
      {/* Tab + Body shape — identical to ProjectsPage */}
      <div className="mb-3" style={{ width: '100%' }}>
        {/* === TAB === */}
        <div style={{ display: 'flex', alignItems: 'flex-end', height: '20px' }}>
          <div
            className="bg-slate-800 border-t border-l border-r border-slate-800/80"
            style={{
              width: '45%',
              height: '20px',
              borderBottom: 'none',
              borderRadius: '12px 12px 0 0',
            }}
          />
        </div>

        {/* === BODY === */}
        <div
          className="relative w-full overflow-hidden border border-slate-800/80 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl"
          style={{
            paddingBottom: '62.5%',
            borderRadius: '0 12px 12px 12px',
          }}
        >
          <div className="absolute inset-0">
            {project.previewThumbnails && project.previewThumbnails.length > 0 ? (
              /* Gradient background with seamless thumbnail grid */
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #000000 100%)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: '1fr 1fr',
                    gap: 0,
                  }}
                >
                  {project.previewThumbnails.slice(0, 4).map((thumb, idx) => (
                    <div
                      key={thumb.id || idx}
                      style={{ overflow: 'hidden', backgroundColor: 'transparent' }}
                    >
                      <img
                        src={thumb.imageUrl}
                        alt={thumb.title || `Thumbnail ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 4 - project.previewThumbnails.length) }).map((_, idx) => (
                    <div key={`empty-${idx}`} style={{ backgroundColor: 'transparent' }} />
                  ))}
                </div>
              </div>
            ) : project.featuredThumbnail?.imageUrl ? (
              <img
                src={project.featuredThumbnail.imageUrl}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                alt={project.name}
              />
            ) : (
              /* Empty state */
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center w-full h-full">
                <Icon className={`w-16 h-16 ${iconColor} opacity-50`} />
              </div>
            )}

            {/* Folder badge */}
            {isFolder && (
              <div className="absolute top-2 left-2 bg-yellow-500/20 border border-yellow-500/50 px-2 py-1 rounded-lg">
                <span className="text-yellow-400 text-[10px] font-bold uppercase">Folder</span>
              </div>
            )}

            {/* Thumbnail count badge */}
            {project.thumbnailCount !== undefined && project.thumbnailCount > 0 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  right: '6px',
                  backgroundColor: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(4px)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  zIndex: 10,
                }}
              >
                <ImageIcon style={{ width: '10px', height: '10px', color: '#cbd5e1' }} />
                <span style={{ fontSize: '10px', fontWeight: 500, color: '#e2e8f0' }}>{project.thumbnailCount}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-slate-500 line-clamp-1">
          {project.description}
        </p>
      )}
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
