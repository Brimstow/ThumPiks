import React, { useState, useRef, useCallback } from 'react';
import {
  Search,
  Upload,
  Type,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
  Zap,
  Eye,
  Database,
} from 'lucide-react';
import { authPost, authGet } from '../../utils/api';

// ============================================
// TYPES
// ============================================

type SearchMode = 'image' | 'text';

interface SimilarityMatch {
  id: string;
  score: number;
  thumbnailId: string;
  imageUrl: string;
  title: string;
  userId: string;
}

interface SearchResult {
  matches: SimilarityMatch[];
  total: number;
}

// ============================================
// COMPONENT
// ============================================

const VisualSearchPage: React.FC = () => {
  const [searchMode, setSearchMode] = useState<SearchMode>('image');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [textQuery, setTextQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    qdrant: boolean;
    jina: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image upload
  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be under 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setResults(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setResults(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // ============================================
  // URL RESOLUTION UTILITIES
  // ============================================

  // Trusted image CDN domains (whitelist for security)
  const TRUSTED_IMAGE_DOMAINS = [
    'i.ytimg.com',
    'img.youtube.com',
    'static-cdn.jtvnw.net',
    'clips-media-assets2.twitch.tv',
    'p16-sign.tiktokcdn.com',
    'p16-sign-sg.tiktokcdn.com', 
    'p16-sign-va.tiktokcdn.com',
  ];

  // Validate URL is from trusted domain or is a direct image
  const isValidImageUrl = useCallback((url: string): boolean => {
    try {
      const parsed = new URL(url);
      // Must be http or https
      if (!['http:', 'https:'].includes(parsed.protocol)) return false;
      // Check if trusted domain
      if (TRUSTED_IMAGE_DOMAINS.some(domain => parsed.hostname.includes(domain))) return true;
      // Check if looks like direct image URL
      if (/\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(parsed.pathname)) return true;
      return false;
    } catch {
      return false;
    }
  }, []);

  // Extract YouTube video ID (comprehensive regex from best practices research)
  const extractYouTubeId = useCallback((url: string): string | null => {
    // Comprehensive pattern handling all YouTube URL formats:
    // - youtube.com/watch?v=ID
    // - youtu.be/ID  
    // - youtube.com/embed/ID
    // - youtube.com/v/ID
    // - youtube.com/shorts/ID
    // - youtube-nocookie.com variants
    // - With extra query params
    const regex = /(?:youtube(?:-nocookie)?\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = url.match(regex);
    
    // Also handle shorts separately
    if (!match) {
      const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i);
      return shortsMatch ? shortsMatch[1] : null;
    }
    
    return match ? match[1] : null;
  }, []);

  // Extract Twitch username from URL
  const extractTwitchUsername = useCallback((url: string): string | null => {
    // Patterns for Twitch live streams:
    // - twitch.tv/username
    // - twitch.tv/username/
    // NOT: twitch.tv/videos/ID, twitch.tv/username/clip/ID
    const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)(?:\/)?$/i);
    if (match && !['videos', 'clip', 'directory', 'settings'].includes(match[1].toLowerCase())) {
      return match[1];
    }
    return null;
  }, []);

  // Check if URL is TikTok (needs backend resolution)
  const isTikTokUrl = useCallback((url: string): boolean => {
    return /(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/.test(url);
  }, []);

  // Convert social media URL to image URL (client-side for YouTube/Twitch)
  const convertToImageUrl = useCallback((url: string): { imageUrl: string | null; needsBackend: boolean; platform: string | null } => {
    // YouTube
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return {
        imageUrl: `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`,
        needsBackend: false,
        platform: 'YouTube'
      };
    }

    // Twitch Live Stream
    const twitchUsername = extractTwitchUsername(url);
    if (twitchUsername) {
      return {
        imageUrl: `https://static-cdn.jtvnw.net/previews-ttv/live_user_${twitchUsername.toLowerCase()}-1280x720.jpg`,
        needsBackend: false,
        platform: 'Twitch'
      };
    }

    // TikTok - needs backend oEmbed resolution
    if (isTikTokUrl(url)) {
      return {
        imageUrl: null,
        needsBackend: true,
        platform: 'TikTok'
      };
    }

    return { imageUrl: null, needsBackend: false, platform: null };
  }, [extractYouTubeId, extractTwitchUsername, isTikTokUrl]);

  // Resolve URL via backend (for TikTok oEmbed)
  const resolveUrlViaBackend = useCallback(async (url: string): Promise<string | null> => {
    try {
      const response = await authPost('/api/visual-search/resolve-url', { url });
      if (response.ok) {
        const data = await response.json();
        return data.imageUrl || null;
      }
    } catch {
      // Fall through to return null
    }
    return null;
  }, []);

  // Search by image
  const handleSearchByImage = useCallback(async () => {
    let url = uploadedImage || imageUrl.trim();
    if (!url) return;

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      // For uploaded images we still need a URL - the backend needs a publicly accessible URL
      if (url.startsWith('data:')) {
        setError(
          'Visual search requires a publicly accessible image URL. Upload your image first via the Create tool, then search by URL.'
        );
        setIsSearching(false);
        return;
      }

      // Try to convert social media URLs to image URLs
      const resolved = convertToImageUrl(url);
      
      if (resolved.imageUrl) {
        // Client-side resolution (YouTube, Twitch)
        url = resolved.imageUrl;
        console.log(`Resolved ${resolved.platform} URL to: ${url}`);
      } else if (resolved.needsBackend) {
        // Backend resolution needed (TikTok)
        const backendUrl = await resolveUrlViaBackend(url);
        if (backendUrl) {
          url = backendUrl;
          console.log(`Resolved ${resolved.platform} URL via backend to: ${url}`);
        } else {
          setError(
            `Could not resolve ${resolved.platform} thumbnail. The video may be private or unavailable.`
          );
          setIsSearching(false);
          return;
        }
      } else if (!isValidImageUrl(url)) {
        // Not a recognized platform and not a valid image URL
        setError(
          'Please enter a direct image URL or a supported platform link (YouTube, Twitch, TikTok).'
        );
        setIsSearching(false);
        return;
      }

      const response = await authPost('/api/visual-search/by-image', {
        imageUrl: url,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setResults({ matches: data.matches || [], total: data.total || 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [uploadedImage, imageUrl, convertToImageUrl, resolveUrlViaBackend, isValidImageUrl]);

  // Search by text
  const handleSearchByText = useCallback(async () => {
    if (!textQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults(null);

    try {
      const response = await authPost('/api/visual-search/by-text', {
        text: textQuery.trim(),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setResults({ matches: data.matches || [], total: data.total || 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [textQuery]);

  // Index batch
  const handleIndexBatch = useCallback(async () => {
    setIsIndexing(true);
    setIndexStatus(null);
    setError(null);

    try {
      const response = await authPost('/api/visual-search/index-batch', {
        batchSize: 50,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Indexing failed');
      }

      const data = await response.json();
      setIndexStatus(
        `Indexed ${data.indexed} thumbnails${data.errors > 0 ? ` (${data.errors} errors)` : ''}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Indexing failed');
    } finally {
      setIsIndexing(false);
    }
  }, []);

  // Health check
  const handleHealthCheck = useCallback(async () => {
    try {
      const response = await authGet('/api/visual-search/health');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
      }
    } catch {
      setHealthStatus({ qdrant: false, jina: false });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              Visual Search
            </h1>
            <p className="text-slate-400 text-sm sm:text-lg">
              Find similar thumbnails using AI-powered visual similarity
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleHealthCheck}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Status</span>
            </button>
            <button
              onClick={handleIndexBatch}
              disabled={isIndexing}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {isIndexing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Index My Thumbnails</span>
              <span className="sm:hidden">Index</span>
            </button>
          </div>
        </div>

        {/* Status indicators */}
        {healthStatus && (
          <div className="mt-4 flex gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${healthStatus.qdrant ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-slate-400">
                Qdrant: {healthStatus.qdrant ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div
                className={`w-2 h-2 rounded-full ${healthStatus.jina ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span className="text-slate-400">
                Jina CLIP: {healthStatus.jina ? 'Configured' : 'Not configured'}
              </span>
            </div>
          </div>
        )}

        {indexStatus && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
            <Database className="w-4 h-4" />
            {indexStatus}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Search Input */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Mode Toggle */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => {
                setSearchMode('image');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                searchMode === 'image'
                  ? 'text-violet-400 border-b-2 border-violet-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <Search className="w-4 h-4" />
              Search by Image
            </button>
            <button
              onClick={() => {
                setSearchMode('text');
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                searchMode === 'text'
                  ? 'text-violet-400 border-b-2 border-violet-400 bg-slate-800/50'
                  : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <Type className="w-4 h-4" />
              Search by Text
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            {searchMode === 'image' && (
              <>
                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Image URL
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/thumbnail.jpg"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && imageUrl.trim())
                        handleSearchByImage();
                    }}
                  />
                </div>

                {/* Or upload */}
                <div className="relative flex items-center gap-4">
                  <div className="flex-1 h-px bg-slate-700" />
                  <span className="text-xs text-slate-500">or upload</span>
                  <div className="flex-1 h-px bg-slate-700" />
                </div>

                {uploadedImage ? (
                  <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Query"
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`w-full aspect-[3/1] bg-slate-800/50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
                      isDragging
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <Upload
                      className={`w-8 h-8 pointer-events-none ${isDragging ? 'text-violet-400' : 'text-slate-500'}`}
                    />
                    <span className="text-xs text-slate-400 pointer-events-none">
                      Drop image or click to upload
                    </span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <button
                  onClick={handleSearchByImage}
                  disabled={(!imageUrl.trim() && !uploadedImage) || isSearching}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/25"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Find Similar
                    </>
                  )}
                </button>
              </>
            )}

            {searchMode === 'text' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Describe the thumbnail you're looking for
                  </label>
                  <textarea
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="e.g., bright gaming thumbnail with neon colors and bold text..."
                    className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-violet-500 transition-colors"
                  />
                </div>

                <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                  <p className="text-xs text-slate-400">
                    Text search uses CLIP's cross-modal understanding to match
                    your description against thumbnail embeddings. Results may
                    vary in accuracy compared to image search.
                  </p>
                </div>

                <button
                  onClick={handleSearchByText}
                  disabled={!textQuery.trim() || isSearching}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-purple-500 hover:shadow-lg hover:shadow-violet-500/25"
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Search
                    </>
                  )}
                </button>
              </>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="space-y-4">
          {results && results.matches.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {results.total} Similar Thumbnail{results.total !== 1 ? 's' : ''} Found
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {results.matches.map((match) => (
                  <div
                    key={match.id}
                    className="group relative bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
                  >
                    <div className="aspect-video bg-slate-800">
                      <img
                        src={match.imageUrl}
                        alt={match.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm text-white truncate">
                        {match.title}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-violet-400 font-medium">
                          {(match.score * 100).toFixed(1)}% match
                        </span>
                        <a
                          href={match.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {/* Score bar */}
                      <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                          style={{ width: `${match.score * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : results && results.matches.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <Search className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No Matches Found
              </h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Try indexing your thumbnails first, or adjust your search query.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 p-4 mb-4 shadow-lg shadow-violet-500/20">
                <Eye className="w-full h-full text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Visual Search
              </h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Search by image or text to find visually similar thumbnails
                using AI embeddings.
              </p>
              <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-violet-400">1024</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Dimensions
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-violet-400">CLIP</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Jina v2
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-violet-400">
                    Cosine
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Similarity</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualSearchPage;
