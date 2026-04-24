import React, { useState, useEffect, useCallback } from 'react';
import { Youtube, Gamepad2, Music2, BookOpen, Tv, Dumbbell, ChefHat, Sparkles, ExternalLink, Clock, Eye, TrendingUp, Globe, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

// Region detection from browser locale
const detectRegion = (): string => {
  try {
    // Get browser language/locale (e.g., "en-US", "en-GB", "pt-BR")
    const locale = navigator.language || (navigator as any).userLanguage || 'en-US';
    const parts = locale.split('-');
    // Return country code (last part) or default to US
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'US';
  } catch {
    return 'US';
  }
};

// Supported regions for the dropdown
const SUPPORTED_REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'SE', name: 'Sweden' },
  { code: 'PL', name: 'Poland' },
  { code: 'RU', name: 'Russia' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' },
];

// Types for YouTube API response
interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  thumbnailHigh: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  categoryId: string;
}

interface APIStatus {
  configured: boolean;
  quotaRemaining?: number;
}

// Categories for YouTube trending thumbnails
const YOUTUBE_CATEGORIES = [
  { id: 'all', name: 'All', icon: TrendingUp },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'music', name: 'Music', icon: Music2 },
  { id: 'education', name: 'Education', icon: BookOpen },
  { id: 'entertainment', name: 'Entertainment', icon: Tv },
  { id: 'sports', name: 'Sports', icon: Dumbbell },
  { id: 'food', name: 'Food', icon: ChefHat },
];

// Curated example thumbnails (placeholder until YouTube API integration)
const CURATED_EXAMPLES = [
  {
    id: '1',
    title: 'High-contrast gaming setup with neon accents',
    style: 'Gaming / Tech',
    image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800&auto=format&fit=crop',
    category: 'gaming',
    whyItWorks: 'Bold colors, clean composition, single focal point',
  },
  {
    id: '2',
    title: 'Vibrant gradient with minimal text overlay',
    style: 'Abstract / Vlog',
    image: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop',
    category: 'entertainment',
  },
  {
    id: '3',
    title: 'Portrait with dramatic lighting',
    style: 'Lifestyle / Fashion',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    category: 'entertainment',
  },
  {
    id: '4',
    title: 'Product showcase with clean background',
    style: 'Tech Review',
    image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=800&auto=format&fit=crop',
    category: 'education',
  },
  {
    id: '5',
    title: 'Cyberpunk aesthetic with neon glow',
    style: 'Gaming / Music',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop',
    category: 'gaming',
  },
  {
    id: '6',
    title: 'Abstract art with flowing shapes',
    style: 'Creative / Art',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop',
    category: 'entertainment',
  },
  {
    id: '7',
    title: 'Retro tech setup with warm tones',
    style: 'Tech / Nostalgia',
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop',
    category: 'gaming',
  },
  {
    id: '8',
    title: 'Action sports with motion blur',
    style: 'Sports / Action',
    image: 'https://images.unsplash.com/photo-1546519638-68e109498888?q=80&w=800&auto=format&fit=crop',
    category: 'sports',
  },
  {
    id: '9',
    title: 'Moody portrait with bokeh lights',
    style: 'Portrait / Cinematic',
    image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop',
    category: 'entertainment',
  },
  {
    id: '10',
    title: 'Concert/DJ setup with purple haze',
    style: 'Music / Events',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop',
    category: 'music',
  },
  {
    id: '11',
    title: 'Podcast microphone close-up',
    style: 'Podcast / Talk',
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=800&auto=format&fit=crop',
    category: 'education',
  },
  {
    id: '12',
    title: 'Crypto/finance dark aesthetic',
    style: 'Finance / Tech',
    image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop',
    category: 'education',
  },
  {
    id: '13',
    title: 'Fitness workout high energy',
    style: 'Fitness / Health',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop',
    category: 'sports',
  },
  {
    id: '14',
    title: 'Music production studio vibes',
    style: 'Music / Tutorial',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop',
    category: 'music',
  },
];

// Format view counts (e.g., 1.2M, 500K)
const formatViewCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return count.toString();
};

const TrendingPage = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState(() => {
    // Check if detected region is supported, otherwise default to US
    const detected = detectRegion();
    return SUPPORTED_REGIONS.some(r => r.code === detected) ? detected : 'US';
  });
  
  // API state
  const [apiStatus, setApiStatus] = useState<APIStatus | null>(null);
  const [liveVideos, setLiveVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if API is configured
  useEffect(() => {
    const checkAPIStatus = async () => {
      try {
        const res = await fetch('/api/youtube-trending/status');
        if (res.ok) {
          const data = await res.json();
          setApiStatus(data);
        } else {
          setApiStatus({ configured: false });
        }
      } catch {
        setApiStatus({ configured: false });
      }
    };
    checkAPIStatus();
  }, []);

  // Fetch trending videos when API is configured
  const fetchTrendingVideos = useCallback(async () => {
    if (!apiStatus?.configured) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const categoryParam = activeCategory !== 'all' ? `&category=${activeCategory}` : '';
      const res = await fetch(`/api/youtube-trending/videos?region=${selectedRegion}${categoryParam}&limit=20`);
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch trending videos');
      }

      const data = await res.json();
      setLiveVideos(data.videos || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trending videos');
      setLiveVideos([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiStatus?.configured, selectedRegion, activeCategory]);

  useEffect(() => {
    if (apiStatus !== null) {
      fetchTrendingVideos();
    }
  }, [fetchTrendingVideos, apiStatus]);

  // Filter curated examples for fallback mode
  const filteredExamples = activeCategory === 'all'
    ? CURATED_EXAMPLES
    : CURATED_EXAMPLES.filter(item => item.category === activeCategory);
  
  // Determine what to show
  const showLiveData = apiStatus?.configured && liveVideos.length > 0;

  return (
    <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Youtube className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50">YouTube Trending</h1>
        </div>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
          Research what's working on YouTube right now. Study thumbnail styles from top-performing videos and apply similar techniques to your own designs.
        </p>
      </div>

      {/* Coming Soon Banner - only show when API is not configured */}
      {!apiStatus?.configured && (
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-100">Live YouTube Integration Coming Soon</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">PLANNED</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                We're building YouTube API integration to show real trending thumbnails by category, with actual view counts and channel data. 
                For now, browse our curated examples of high-performing thumbnail styles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Data Banner - show when API is configured */}
      {apiStatus?.configured && (
        <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-500/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-100">Live YouTube Trending Data</h3>
                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold">LIVE</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Showing real trending videos from YouTube. Thumbnails are updated hourly. Click on any thumbnail to view it on YouTube.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Row: Category Pills + Region Dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide flex-1">
        {YOUTUBE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {cat.name}
            </button>
          );
        })}
        </div>

        {/* Region Dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Globe className="w-4 h-4 text-slate-500" />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
          >
            {SUPPORTED_REGIONS.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
          {apiStatus?.configured && (
            <button
              onClick={fetchTrendingVideos}
              disabled={isLoading}
              className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-sm text-red-400 font-medium">Failed to load trending videos</p>
              <p className="text-xs text-red-400/70">{error}</p>
            </div>
            <button
              onClick={fetchTrendingVideos}
              className="ml-auto px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && apiStatus?.configured && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-red-400 animate-spin" />
            <p className="text-sm text-slate-400">Loading trending videos...</p>
          </div>
        </div>
      )}

      {/* Content Section - show live data or curated examples */}
      {!isLoading && (
        <>
          {/* Section Label */}
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {showLiveData ? 'Live Trending' : 'Curated Examples'}
            </span>
            <span className="text-xs text-slate-600">•</span>
            <span className="text-xs text-slate-500">
              {showLiveData ? `${liveVideos.length} videos` : `${filteredExamples.length} styles`}
            </span>
            {showLiveData && (
              <>
                <span className="text-xs text-slate-600">•</span>
                <span className="text-xs text-slate-500">
                  {SUPPORTED_REGIONS.find(r => r.code === selectedRegion)?.name || selectedRegion}
                </span>
              </>
            )}
          </div>

          {/* Grid Layout - Live Data */}
          {showLiveData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {liveVideos.map((video) => (
                <a
                  key={video.id}
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-video bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/30 cursor-pointer"
                >
                  <img
                    src={video.thumbnailHigh || video.thumbnailUrl}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={video.title}
                  />
                  
                  {/* View count badge */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-slate-300 border border-white/10 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {formatViewCount(video.viewCount)}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs font-medium text-white mb-1 line-clamp-2">
                        {video.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mb-2">
                        {video.channelTitle}
                      </p>
                      <div className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-500 transition-colors">
                        <Youtube className="w-3 h-3" />
                        Watch on YouTube
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Grid Layout - Curated Examples (fallback) */}
          {!showLiveData && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredExamples.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-video bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/30 cursor-pointer"
                >
                  <img
                    src={item.image}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    alt={item.title}
                  />
                  
                  {/* Style badge */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-slate-300 border border-white/10">
                    {item.style}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-xs font-medium text-white mb-2 line-clamp-2">
                        {item.title}
                      </p>
                      {item.whyItWorks && (
                        <p className="text-[10px] text-slate-400 mb-2">
                          💡 {item.whyItWorks}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-medium hover:bg-slate-100 transition-colors">
                          <ExternalLink className="w-3 h-3" />
                          Study Style
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state when no items match filter */}
          {!showLiveData && filteredExamples.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500">No examples found for this category.</p>
            </div>
          )}

          {showLiveData && liveVideos.length === 0 && !error && (
            <div className="text-center py-16">
              <p className="text-slate-500">No trending videos found for this region/category.</p>
            </div>
          )}
        </>
      )}

      {/* Future Feature Preview - only show when API is not configured */}
      {!apiStatus?.configured && (
        <div className="mt-12 p-6 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-300">Coming Soon: Live YouTube Data</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-500">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <p className="font-medium text-slate-400">Real Trending Videos</p>
                <p className="text-xs">Thumbnails from currently trending YouTube videos by category</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-slate-400">View Counts & Stats</p>
                <p className="text-xs">See actual performance metrics for each thumbnail</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="font-medium text-slate-400">Clone Any Style</p>
                <p className="text-xs">Paste a YouTube URL and recreate the thumbnail style</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TrendingPage;
