import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, Search, RefreshCw, Loader2, AlertCircle, Trash2, X, Image } from 'lucide-react';
import { DragDropProvider } from '@dnd-kit/react';
import { useDraggable, useDroppable } from '@dnd-kit/react';
import { getUserAssets, uploadAsset, deleteAsset, getStorageUsage, recategorizeAsset, UserAsset } from '../../services/quickEditService';
import { formatRelativeTime, formatFileSize } from '../../lib/formatters';
import ImagePreviewModal from '../ui/ImagePreviewModal';
import AssetContextMenu, { AssetType } from '../ui/AssetContextMenu';
import Tooltip from '../ui/Tooltip';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

type AssetTypeFilter = 'all' | 'face' | 'background' | 'logo';
type UploadAssetType = 'face' | 'background' | 'logo' | 'other';

const FILTER_TABS: { value: AssetTypeFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'face', label: 'Faces' },
  { value: 'background', label: 'Images' },
  { value: 'logo', label: 'Brand' },
];

const UPLOAD_TYPE_OPTIONS: { value: UploadAssetType; label: string }[] = [
  { value: 'face', label: 'Face' },
  { value: 'background', label: 'Image' },
  { value: 'logo', label: 'Brand Logo' },
  { value: 'other', label: 'Other' },
];

const ASSET_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  face: { label: 'Face', className: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  background: { label: 'Image', className: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  logo: { label: 'Brand', className: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  other: { label: 'Other', className: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

let uploadsAssetsCache: UserAsset[] | null = null;
let uploadsAssetsPromise: Promise<UserAsset[]> | null = null;
let uploadsStorageCache: { usage: { totalBytes: number; count: number }; counts: Record<string, number> } | null = null;
let uploadsStoragePromise: Promise<{ usage: { totalBytes: number; count: number }; counts: Record<string, number> }> | null = null;

async function fetchDefaultUploadsAssetsWithCache(): Promise<UserAsset[]> {
  if (uploadsAssetsCache) {
    return uploadsAssetsCache;
  }

  if (!uploadsAssetsPromise) {
    uploadsAssetsPromise = getUserAssets(undefined)
      .then((data) => {
        uploadsAssetsCache = data;
        return data;
      })
      .catch((err) => {
        uploadsAssetsPromise = null;
        throw err;
      });
  }

  return uploadsAssetsPromise;
}

async function fetchUploadsStorageWithCache(): Promise<{ usage: { totalBytes: number; count: number }; counts: Record<string, number> }> {
  if (uploadsStorageCache) {
    return uploadsStorageCache;
  }

  if (!uploadsStoragePromise) {
    uploadsStoragePromise = getStorageUsage()
      .then((data) => {
        uploadsStorageCache = data;
        return data;
      })
      .catch((err) => {
        uploadsStoragePromise = null;
        throw err;
      });
  }

  return uploadsStoragePromise;
}

export async function prefetchUploadsData(): Promise<void> {
  try {
    await Promise.all([
      fetchDefaultUploadsAssetsWithCache(),
      fetchUploadsStorageWithCache(),
    ]);
  } catch (err) {
    console.error('Error prefetching uploads data:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════
// DRAG-DROP HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Wrapper that makes an asset card draggable */
const DraggableAssetCard: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ id, children }) => {
  const { ref, isDragSource } = useDraggable({ id, data: { type: 'asset', assetId: id } });
  return (
    <div ref={ref} style={{ opacity: isDragSource ? 0.4 : 1, transition: 'opacity 150ms' }}>
      {children}
    </div>
  );
};

/** Wrapper that makes a filter tab a drop target */
const DroppableFilterTab: React.FC<{
  tabValue: AssetTypeFilter;
  children: React.ReactNode;
}> = ({ tabValue, children }) => {
  const { ref, isDropTarget } = useDroppable({ id: `tab-${tabValue}`, data: { tabValue }, disabled: tabValue === 'all' });
  return (
    <div ref={ref} className={`relative transition-all ${isDropTarget ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#020817] rounded-lg scale-105' : ''}`}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════

const UploadsPage: React.FC = () => {
  // Asset data
  const [assets, setAssets] = useState<UserAsset[]>(uploadsAssetsCache ?? []);
  const [loading, setLoading] = useState(uploadsAssetsCache === null);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [typeFilter, setTypeFilter] = useState<AssetTypeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Storage
  const [storageUsage, setStorageUsage] = useState<{ totalBytes: number; count: number } | null>(uploadsStorageCache?.usage ?? null);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>(uploadsStorageCache?.counts ?? {});

  // Upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadType, setUploadType] = useState<UploadAssetType>('face');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Preview
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // ─────────────────────────────────────────────────────────────────
  // DATA FETCHING
  // ─────────────────────────────────────────────────────────────────

  const fetchAssets = useCallback(async () => {
    try {
      const isDefaultFilter = typeFilter === 'all';
      if (isDefaultFilter && uploadsAssetsCache) {
        setAssets(uploadsAssetsCache);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const data = isDefaultFilter
        ? await fetchDefaultUploadsAssetsWithCache()
        : await getUserAssets(typeFilter);

      setAssets(data);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load uploads');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const fetchStorageUsage = useCallback(async () => {
    try {
      if (uploadsStorageCache) {
        setStorageUsage(uploadsStorageCache.usage);
        setTypeCounts(uploadsStorageCache.counts);
        return;
      }

      const data = await fetchUploadsStorageWithCache();
      setStorageUsage(data.usage);
      setTypeCounts(data.counts);
    } catch (err) {
      console.error('Error fetching storage usage:', err);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchStorageUsage();
  }, [fetchStorageUsage]);

  // ─────────────────────────────────────────────────────────────────
  // UPLOAD HANDLERS
  // ─────────────────────────────────────────────────────────────────

  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          await uploadAsset({
            type: uploadType,
            imageData: base64,
            name: file.name,
          });
          await fetchAssets();
          await fetchStorageUsage();
        } catch (err) {
          console.error('Upload failed:', err);
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setIsUploading(false);
    }
  }, [uploadType, fetchAssets, fetchStorageUsage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleFileUpload]);

  // ─────────────────────────────────────────────────────────────────
  // DELETE HANDLER
  // ─────────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (id: string) => {
    try {
      setIsDeleting(true);
      await deleteAsset(id);
      setAssets((prev) => prev.filter((a) => a.id !== id));
      setDeleteConfirmId(null);
      await fetchStorageUsage();
    } catch (err) {
      console.error('Delete failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete asset');
    } finally {
      setIsDeleting(false);
    }
  }, [fetchStorageUsage]);

  // ─────────────────────────────────────────────────────────────────
  // SEARCH FILTER
  // ─────────────────────────────────────────────────────────────────

  const filteredAssets = searchQuery
    ? assets.filter((a) => {
        const q = searchQuery.toLowerCase();
        return (
          (a.name && a.name.toLowerCase().includes(q)) ||
          a.type.toLowerCase().includes(q)
        );
      })
    : assets;

  const handleRefresh = useCallback(() => {
    fetchAssets();
    fetchStorageUsage();
  }, [fetchAssets, fetchStorageUsage]);

  const handleRecategorizeAsset = useCallback(async (assetId: string, newType: AssetType) => {
    try {
      await recategorizeAsset(assetId, newType);
      // Update local state
      setAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, type: newType } : a))
      );
      // Refresh storage counts
      fetchStorageUsage();
    } catch (err) {
      console.error('Recategorize failed:', err);
    }
  }, [fetchStorageUsage]);

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  // Map filter tab value → asset type for drag-drop recategorization
  const tabToAssetType: Record<string, AssetType> = { face: 'face', background: 'background', logo: 'logo' };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    const source = event.operation?.source;
    const target = event.operation?.target;
    if (!source || !target) return;

    const assetId = source.data?.assetId as string | undefined;
    const tabValue = target.data?.tabValue as AssetTypeFilter | undefined;
    if (assetId && tabValue && tabValue !== 'all' && tabToAssetType[tabValue]) {
      handleRecategorizeAsset(assetId, tabToAssetType[tabValue]);
    }
  }, [handleRecategorizeAsset]);

  return (
    <DragDropProvider onDragEnd={handleDragEnd}>
    <div className="space-y-8 pb-12">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Uploads</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
            Manage your uploaded faces, images, and brand assets. Drag and drop files to upload.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search uploads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0B1121] border border-slate-800 text-slate-300 text-sm rounded-lg block w-64 pl-10 p-2.5 placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <Tooltip content="Refresh uploads">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          </Tooltip>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <Upload className="w-[18px] h-[18px]" strokeWidth={2} />
            Upload New
          </button>
        </div>
      </div>

      {/* Storage Bar */}
      {storageUsage && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-300">
              {formatFileSize(storageUsage.totalBytes)} used
            </span>
            <span className="text-xs text-slate-500">
              {storageUsage.count} file{storageUsage.count !== 1 ? 's' : ''}
              {Object.keys(typeCounts).length > 0 && (
                <> &middot; {Object.entries(typeCounts).map(([type, count]) => {
                  const badge = ASSET_TYPE_BADGE[type];
                  return badge ? `${count} ${badge.label}` : null;
                }).filter(Boolean).join(' · ')}</>
              )}
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((storageUsage.totalBytes / (1024 * 1024 * 1024)) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700 hover:border-slate-600 hover:bg-slate-900/30'
        } ${isUploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-300">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-10 h-10 text-slate-500" />
            <div>
              <p className="text-sm text-slate-300">
                {dragActive ? 'Drop file to upload' : 'Drag and drop files here, or click to browse'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Images up to 10MB</p>
            </div>
          </div>
        )}

        {/* Upload type selector */}
        <div className="flex items-center justify-center gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-slate-500">Upload as:</span>
          {UPLOAD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setUploadType(opt.value)}
              className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
                uploadType === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-8 border-b border-slate-800 pb-1">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all'
            ? Object.values(typeCounts).reduce((sum, c) => sum + c, 0)
            : (typeCounts[tab.value] || 0);
          return (
            <DroppableFilterTab key={tab.value} tabValue={tab.value}>
            <button
              onClick={() => setTypeFilter(tab.value)}
              className={`relative pb-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                typeFilter === tab.value ? 'text-slate-50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label} ({count})
              {typeFilter === tab.value && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
              )}
            </button>
            </DroppableFilterTab>
          );
        })}
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button
              onClick={() => { setError(null); handleRefresh(); }}
              className="text-xs text-red-300 hover:text-red-200 underline mt-1"
            >
              Try again
            </button>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-slate-800 rounded-xl mb-3" />
              <div className="h-3 bg-slate-800 rounded w-3/4 mb-2" />
              <div className="h-2 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredAssets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            <Image className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-300 mb-2">
            {searchQuery ? 'No matching uploads' : 'No uploads yet'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md">
            {searchQuery
              ? `No uploads match "${searchQuery}". Try a different search.`
              : 'Upload faces, images, and brand logos to use across your thumbnail projects.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
            >
              <Upload className="w-4 h-4" />
              Upload Your First File
            </button>
          )}
        </div>
      )}

      {/* Asset Grid */}
      {!loading && filteredAssets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredAssets.map((asset) => {
            const badge = ASSET_TYPE_BADGE[asset.type] || ASSET_TYPE_BADGE.other;
            return (
              <DraggableAssetCard key={asset.id} id={asset.id}>
              <AssetContextMenu
                variant="asset"
                currentType={asset.type as AssetType}
                onRecategorize={(newType) => handleRecategorizeAsset(asset.id, newType)}
              >
              <div className="group relative">
                {/* Type Badge */}
                <div className="absolute top-2 right-2 z-10">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Image */}
                <div
                  onClick={() => setPreviewIndex(filteredAssets.indexOf(asset))}
                  className="aspect-square bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl cursor-pointer"
                >
                  <img
                    src={asset.url}
                    alt={asset.name || asset.type}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                      <span className="text-xs text-slate-300 truncate">
                        {asset.sizeBytes ? formatFileSize(asset.sizeBytes) : ''}
                      </span>
                      <Tooltip content="Delete" side="top">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(asset.id);
                        }}
                        className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 hover:text-red-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors truncate">
                    {asset.name || `${badge.label} upload`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatRelativeTime(asset.createdAt)}
                  </p>
                </div>
              </div>
              </AssetContextMenu>
              </DraggableAssetCard>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Upload</h3>
            <p className="text-sm text-slate-400 mb-6">
              Are you sure you want to delete this upload? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewIndex !== null && filteredAssets[previewIndex] && (
        <ImagePreviewModal
          isOpen
          onClose={() => setPreviewIndex(null)}
          imageUrl={filteredAssets[previewIndex].url}
          title={filteredAssets[previewIndex].name || `${(ASSET_TYPE_BADGE[filteredAssets[previewIndex].type] || ASSET_TYPE_BADGE.other).label} upload`}
          metadata={{
            type: (ASSET_TYPE_BADGE[filteredAssets[previewIndex].type] || ASSET_TYPE_BADGE.other).label,
            size: filteredAssets[previewIndex].sizeBytes ?? undefined,
            width: filteredAssets[previewIndex].width ?? undefined,
            height: filteredAssets[previewIndex].height ?? undefined,
            date: filteredAssets[previewIndex].createdAt,
          }}
          actions={{
            onDownload: () => {
              const a = filteredAssets[previewIndex!];
              const link = document.createElement('a');
              link.href = a.url;
              link.download = a.name || 'download';
              link.click();
            },
            onDelete: () => {
              setDeleteConfirmId(filteredAssets[previewIndex!].id);
              setPreviewIndex(null);
            },
          }}
          items={filteredAssets.map((a) => ({ imageUrl: a.url, title: a.name || undefined }))}
          currentIndex={previewIndex}
          onNavigate={(i) => setPreviewIndex(i)}
        />
      )}
    </div>
    </DragDropProvider>
  );
};

export default UploadsPage;
