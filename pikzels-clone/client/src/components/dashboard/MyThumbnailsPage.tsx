import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Youtube, Instagram, Music, Twitter, Filter, ArrowUpDown, Edit, Download, Image, RefreshCw, Sparkles } from 'lucide-react';
import { DragDropProvider } from '@dnd-kit/react';
import { useDraggable, useDroppable } from '@dnd-kit/react';
import { IS_DEVELOPMENT, API_BASE_URL } from '../../config/environment';
import { authGet } from '../../utils/api';
import { formatRelativeTime } from '../../lib/formatters';
import { recategorizeThumbnail } from '../../services/quickEditService';
import RecreateBetterModal from '../ui/RecreateBetterModal';
import ImagePreviewModal from '../ui/ImagePreviewModal';
import AssetContextMenu, { ThumbnailPlatform } from '../ui/AssetContextMenu';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface Thumbnail {
  id: string;
  title: string;
  imageUrl: string;
  prompt?: string;
  parameters?: {
    platform?: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
    videoUrl?: string;
    videoId?: string;
    generatedFrom?: string;
  };
  createdAt: string;
  userId: string;
  projectId: string;
}

type PlatformFilter = 'all' | 'youtube' | 'instagram' | 'tiktok' | 'twitter';

// ═══════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Get platform icon component based on platform type
 */
function getPlatformIcon(platform?: string): { icon: React.ReactNode; bgClass: string; hoverClass: string } {
  switch (platform?.toLowerCase()) {
    case 'youtube':
      return {
        icon: <Youtube className="w-3 h-3" strokeWidth={3} />,
        bgClass: 'bg-red-600/90',
        hoverClass: 'hover:shadow-red-500/10 hover:border-red-500/50'
      };
    case 'instagram':
      return {
        icon: <Instagram className="w-3 h-3" strokeWidth={3} />,
        bgClass: 'bg-pink-600/90',
        hoverClass: 'hover:shadow-pink-500/10 hover:border-pink-500/50'
      };
    case 'tiktok':
      return {
        icon: <Music className="w-3 h-3" strokeWidth={3} />,
        bgClass: 'bg-cyan-600/90',
        hoverClass: 'hover:shadow-cyan-500/10 hover:border-cyan-500/50'
      };
    case 'twitter':
      return {
        icon: <Twitter className="w-3 h-3" strokeWidth={2} />,
        bgClass: 'bg-slate-700/90',
        hoverClass: 'hover:shadow-slate-500/10 hover:border-slate-500/50'
      };
    default:
      return {
        icon: <Image className="w-3 h-3" strokeWidth={2} />,
        bgClass: 'bg-blue-600/90',
        hoverClass: 'hover:shadow-blue-500/10 hover:border-blue-500/50'
      };
  }
}

/**
 * Generate grid span classes for Pinterest-style layout
 * Creates visual variety based on index position
 */
function getGridSpanClass(index: number): string {
  // Pattern creates variety: wide items, tall items, large items, regular items
  const patterns = [
    'col-span-2 row-span-1', // Wide
    'col-span-1 row-span-1', // Regular
    'col-span-1 row-span-2', // Tall
    'col-span-1 row-span-1', // Regular
    'col-span-1 row-span-2', // Tall
    'col-span-2 row-span-2', // Large
    'col-span-1 row-span-1', // Regular
    'col-span-2 row-span-1', // Wide
    'col-span-1 row-span-1', // Regular
    'col-span-1 row-span-2', // Tall
    'col-span-1 row-span-1', // Regular
    'col-span-1 row-span-1', // Regular
    'col-span-2 row-span-1', // Wide
    'col-span-1 row-span-2', // Tall
  ];
  return patterns[index % patterns.length];
}

// ═══════════════════════════════════════════════════════════════════
// SKELETON COMPONENT
// ═══════════════════════════════════════════════════════════════════

const ThumbnailSkeleton: React.FC<{ spanClass: string }> = ({ spanClass }) => (
  <div className={`${spanClass} bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 animate-pulse`}>
    <div className="w-full h-full bg-slate-800/50" />
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// DRAG-DROP HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Wrapper that makes a thumbnail card draggable */
const DraggableThumbnailCard: React.FC<{
  id: string;
  index: number;
  children: React.ReactNode;
}> = ({ id, index, children }) => {
  const { ref, isDragSource } = useDraggable({ id, data: { type: 'thumbnail', thumbnailId: id } });
  return (
    <div ref={ref} style={{ opacity: isDragSource ? 0.4 : 1, transition: 'opacity 150ms' }}>
      {children}
    </div>
  );
};

/** Wrapper that makes a platform tab a drop target */
const DroppablePlatformTab: React.FC<{
  platform: PlatformFilter;
  children: React.ReactNode;
  isOver?: boolean;
}> = ({ platform, children }) => {
  const { ref, isDropTarget } = useDroppable({ id: `tab-${platform}`, data: { platform }, disabled: platform === 'all' });
  return (
    <div ref={ref} className={`relative transition-all ${isDropTarget ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#020817] rounded-lg scale-105' : ''}`}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const MyThumbnailsPage: React.FC = () => {
  const navigate = useNavigate();
  // State
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // ═══════════════════════════════════════════════════════════════════
  // DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════

  const fetchThumbnails = useCallback(async () => {
    try {
      setError(null);
      
      // Build query params
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (sortOrder) queryParams.append('sortOrder', sortOrder);

      // Use Vite proxy in development, full URL in production
      const apiUrl = IS_DEVELOPMENT 
        ? `/api/thumbnails?${queryParams.toString()}`
        : `${API_BASE_URL}/api/thumbnails?${queryParams.toString()}`;

      const response = await authGet(apiUrl);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error(`Failed to fetch thumbnails (${response.status})`);
      }

      const data = await response.json();
      setThumbnails(data.thumbnails || []);
    } catch (err) {
      console.error('Error fetching thumbnails:', err);
      setError(err instanceof Error ? err.message : 'Failed to load thumbnails');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortOrder]);

  // Initial fetch
  useEffect(() => {
    fetchThumbnails();
  }, [fetchThumbnails]);

  // ═══════════════════════════════════════════════════════════════════
  // FILTERING
  // ═══════════════════════════════════════════════════════════════════

  const filteredThumbnails = thumbnails.filter(thumbnail => {
    // Platform filter
    if (platformFilter !== 'all') {
      const thumbnailPlatform = thumbnail.parameters?.platform?.toLowerCase();
      if (thumbnailPlatform !== platformFilter) return false;
    }
    return true;
  });

  // ═══════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleRefresh = () => {
    setLoading(true);
    fetchThumbnails();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchThumbnails();
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  const handleRecategorizeThumbnail = useCallback(async (thumbnailId: string, platform: ThumbnailPlatform) => {
    try {
      await recategorizeThumbnail(thumbnailId, platform);
      // Update local state
      setThumbnails((prev) =>
        prev.map((t) =>
          t.id === thumbnailId
            ? { ...t, parameters: { ...t.parameters, platform } }
            : t
        )
      );
    } catch (err) {
      console.error('Recategorize failed:', err);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    const source = event.operation?.source;
    const target = event.operation?.target;
    if (!source || !target) return;

    const thumbnailId = source.data?.thumbnailId as string | undefined;
    const platform = target.data?.platform as string | undefined;
    if (thumbnailId && platform && platform !== 'all') {
      handleRecategorizeThumbnail(thumbnailId, platform as ThumbnailPlatform);
    }
  }, [handleRecategorizeThumbnail]);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
    <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">My Thumbnails</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
            View and manage all your generated thumbnails across different platforms. Organize your YouTube, TikTok,
            and Instagram creatives in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search thumbnails..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="bg-[#0B1121] border border-slate-800 text-slate-300 text-sm rounded-lg block w-64 pl-10 p-2.5 placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
          </form>
          
          {/* Refresh Button */}
          <button 
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Refresh thumbnails"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {/* Create New Button */}
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            Create New
          </button>
        </div>
      </div>

      {/* Platform Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-1 mb-8 gap-4">
        <div className="flex items-center gap-8 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <DroppablePlatformTab platform="all">
          <button 
            onClick={() => setPlatformFilter('all')}
            className={`relative pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              platformFilter === 'all' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Projects
            {platformFilter === 'all' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
            )}
          </button>
          </DroppablePlatformTab>
          <DroppablePlatformTab platform="youtube">
          <button 
            onClick={() => setPlatformFilter('youtube')}
            className={`relative pb-4 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              platformFilter === 'youtube' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-[14px] h-[14px] text-red-500" strokeWidth={2} />
            YouTube
            {platformFilter === 'youtube' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
            )}
          </button>
          </DroppablePlatformTab>
          <DroppablePlatformTab platform="instagram">
          <button 
            onClick={() => setPlatformFilter('instagram')}
            className={`relative pb-4 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              platformFilter === 'instagram' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Instagram className="w-[14px] h-[14px] text-pink-500" strokeWidth={2} />
            Instagram
            {platformFilter === 'instagram' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.6)]" />
            )}
          </button>
          </DroppablePlatformTab>
          <DroppablePlatformTab platform="tiktok">
          <button 
            onClick={() => setPlatformFilter('tiktok')}
            className={`relative pb-4 text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              platformFilter === 'tiktok' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Music className="w-[14px] h-[14px] text-cyan-400" strokeWidth={2} />
            TikTok
            {platformFilter === 'tiktok' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]" />
            )}
          </button>
          </DroppablePlatformTab>
          <DroppablePlatformTab platform="twitter">
          <button 
            onClick={() => setPlatformFilter('twitter')}
            className={`relative pb-4 text-sm font-medium transition-colors whitespace-nowrap ${
              platformFilter === 'twitter' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Twitter / X
            {platformFilter === 'twitter' && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-500 shadow-[0_0_12px_rgba(100,116,139,0.6)]" />
            )}
          </button>
          </DroppablePlatformTab>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <Filter className="w-[14px] h-[14px]" strokeWidth={1.5} />
            Filter
          </button>
          <button 
            onClick={toggleSortOrder}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowUpDown className="w-[14px] h-[14px]" strokeWidth={1.5} />
            Sort by Date ({sortOrder === 'desc' ? 'Newest' : 'Oldest'})
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h3 className="text-lg font-medium text-slate-200 mb-2">Error Loading Thumbnails</h3>
          <p className="text-slate-400 text-sm mb-4 max-w-md">{error}</p>
          <button 
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading State - Skeleton Grid */}
      {loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 auto-rows-[200px] grid-flow-dense">
          {Array.from({ length: 12 }).map((_, index) => (
            <ThumbnailSkeleton key={index} spanClass={getGridSpanClass(index)} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredThumbnails.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
            <Image className="w-10 h-10 text-slate-500" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-medium text-slate-200 mb-2">No Thumbnails Yet</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md">
            {platformFilter !== 'all' 
              ? `No ${platformFilter} thumbnails found. Try a different filter or create your first ${platformFilter} thumbnail.`
              : 'Start creating amazing thumbnails for your videos. Click the button below to get started.'}
          </p>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-5 h-5" strokeWidth={2} />
            Create Your First Thumbnail
          </button>
        </div>
      )}

      {/* Thumbnails Grid */}
      {!loading && !error && filteredThumbnails.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 auto-rows-[200px] grid-flow-dense">
          {filteredThumbnails.map((thumbnail, index) => {
            const platformInfo = getPlatformIcon(thumbnail.parameters?.platform);
            const spanClass = getGridSpanClass(index);
            
            return (
              <DraggableThumbnailCard key={thumbnail.id} id={thumbnail.id} index={index}>
              <AssetContextMenu
                variant="thumbnail"
                currentPlatform={thumbnail.parameters?.platform}
                onRecategorize={(platform) => handleRecategorizeThumbnail(thumbnail.id, platform)}
              >
              <div 
                onClick={() => setPreviewIndex(index)}
                className={`group relative w-full h-full ${spanClass} bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl ${platformInfo.hoverClass} cursor-pointer`}
              >
                {/* Thumbnail Image */}
                {thumbnail.imageUrl ? (
                  <img
                    src={thumbnail.imageUrl}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={thumbnail.title}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                    <Image className="w-12 h-12 text-slate-600" strokeWidth={1.5} />
                  </div>
                )}
                
                {/* Platform Badge */}
                <div className={`absolute top-2 right-2 ${platformInfo.bgClass} backdrop-blur-md p-1 rounded text-white border border-white/10`}>
                  {platformInfo.icon}
                </div>
                
                {/* Timestamp Badge */}
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-white/80 border border-white/10">
                  {formatRelativeTime(thumbnail.createdAt)}
                </div>
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
                    <span className="text-xs font-medium text-white truncate max-w-[60%]">
                      {thumbnail.title || 'Untitled Thumbnail'}
                    </span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Dispatch custom event to open Recreate Better modal
                          window.dispatchEvent(new CustomEvent('openRecreateBetter', {
                            detail: {
                              imageUrl: thumbnail.imageUrl,
                              sourceSettings: {
                                prompt: thumbnail.prompt,
                              },
                            }
                          }));
                        }}
                        className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:shadow-lg hover:shadow-purple-500/30 transition-all"
                        title="Recreate Better with AI"
                      >
                        <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/editor/${thumbnail.id}`); }}
                        className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200 transition-colors"
                        title="Edit thumbnail"
                      >
                        <Edit className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // Download the thumbnail
                          const link = document.createElement('a');
                          link.href = thumbnail.imageUrl;
                          link.download = `${thumbnail.title || 'thumbnail'}.jpg`;
                          link.click();
                        }}
                        className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200 transition-colors"
                        title="Download thumbnail"
                      >
                        <Download className="w-3 h-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              </AssetContextMenu>
              </DraggableThumbnailCard>
            );
          })}

          {/* Create New Placeholder */}
          <div className="group relative w-full h-full col-span-1 row-span-1 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 hover:border-slate-500 transition-all">
            <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 mb-3 shadow-sm border border-slate-700">
              <Plus className="w-6 h-6" strokeWidth={2} />
            </div>
            <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">New Thumbnail</span>
          </div>
        </div>
      )}

      {/* Recreate Better Modal */}
      <RecreateBetterModal />

      {/* Image Preview Modal */}
      {previewIndex !== null && filteredThumbnails[previewIndex] && (
        <ImagePreviewModal
          isOpen
          onClose={() => setPreviewIndex(null)}
          imageUrl={filteredThumbnails[previewIndex].imageUrl}
          title={filteredThumbnails[previewIndex].title}
          metadata={{
            platform: filteredThumbnails[previewIndex].parameters?.platform,
            date: filteredThumbnails[previewIndex].createdAt,
            prompt: filteredThumbnails[previewIndex].prompt,
          }}
          actions={{
            onEdit: () => {
              setPreviewIndex(null);
              navigate(`/dashboard/editor/${filteredThumbnails[previewIndex!].id}`);
            },
            onDownload: () => {
              const t = filteredThumbnails[previewIndex!];
              const link = document.createElement('a');
              link.href = t.imageUrl;
              link.download = `${t.title || 'thumbnail'}.jpg`;
              link.click();
            },
          }}
          items={filteredThumbnails.map((t) => ({ imageUrl: t.imageUrl, title: t.title }))}
          currentIndex={previewIndex}
          onNavigate={(i) => setPreviewIndex(i)}
        />
      )}
    </main>
    </DragDropProvider>
  );
};

export default MyThumbnailsPage;
