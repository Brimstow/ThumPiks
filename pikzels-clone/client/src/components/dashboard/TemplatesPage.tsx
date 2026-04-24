import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  ArrowDown,
  Layers,
} from 'lucide-react';
import { authGet } from '../../utils/api';
import { useLayouts } from '../../features/composition-templates/useCompositionTemplates';
import type { LayoutPreset, TemplateCategory } from '../../features/composition-templates/types';

interface Template {
  id: string;
  name: string;
  description: string;
  Thumbnail: {
    id: string;
    title: string;
    imageUrl: string;
  };
  User: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  tags: string[];
  downloads: number;
  likes: number;
  createdAt: Date;
}

// Layout category pills for the composition section
const LAYOUT_CATEGORIES: { id: TemplateCategory | 'all'; name: string }[] = [
  { id: 'all', name: 'All Layouts' },
  { id: 'split-screen', name: 'Split Screen' },
  { id: 'person-bg', name: 'Person + BG' },
  { id: 'collage', name: 'Collage' },
  { id: 'reaction', name: 'Reaction' },
  { id: 'cinematic', name: 'Cinematic' },
  { id: 'minimal', name: 'Minimal' },
];

const TemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'downloads'>('popular');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Composition layouts from API
  const {
    filteredTemplates: compositionLayouts,
    categoryFilter: layoutCategory,
    setCategoryFilter: setLayoutCategory,
    isLoading: layoutsLoading,
    selectTemplate: selectLayout,
  } = useLayouts();

  const handleLayoutClick = (layout: LayoutPreset) => {
    selectLayout(layout.id);
    // TODO: Navigate to editor with selected layout or open layout detail
    console.log('Layout selected:', layout.name);
  };

  // Mock data for carousel
  const carouselItem = {
    id: 1,
    title: 'Neon Cyberpunk Gaming Pack',
    description: 'Stand out with this high-energy, purple neon aesthetic designed for battle royale and FPS gameplay highlights.',
    badge: 'NEW ARRIVAL',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop',
  };

  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All Templates' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'vlogs', name: 'Vlogs' },
    { id: 'tech', name: 'Tech & Reviews' },
    { id: 'education', name: 'Education' },
    { id: 'minimal', name: 'Minimal' },
  ];

  // Fetch templates from API
  useEffect(() => {
    fetchTemplates();
  }, [activeCategory, sortBy, page]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams({
        isPublic: 'true',
        page: page.toString(),
        limit: '6',
      });

      // Add category filter (map to tags)
      if (activeCategory !== 'all') {
        params.append('tags', activeCategory);
      }

      // Add sorting
      if (sortBy === 'recent') {
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', 'desc');
      } else if (sortBy === 'downloads') {
        params.append('sortBy', 'downloads');
        params.append('sortOrder', 'desc');
      } else {
        // popular = sort by likes
        params.append('sortBy', 'likes');
        params.append('sortOrder', 'desc');
      }

      const response = await authGet(`/api/templates?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }

      const data = await response.json();
      
      if (page === 1) {
        setTemplates(data);
      } else {
        setTemplates(prev => [...prev, ...data]);
      }

      // Check if there are more templates to load
      setHasMore(data.length === 6);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
      setError(err.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setPage(1);
    setTemplates([]);
  };

  const handleSortChange = (newSort: 'popular' | 'recent' | 'downloads') => {
    setSortBy(newSort);
    setPage(1);
    setTemplates([]);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleTemplateClick = (template: Template) => {
    // TODO: Navigate to template detail or apply template
    console.log('Template clicked:', template);
    alert(`Template "${template.name}" clicked! Implementation coming soon.`);
  };

  // Map template data to display format
  const displayTemplates = templates.map(template => ({
    id: template.id,
    image: template.Thumbnail?.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225"%3E%3Crect fill="%231e293b" width="400" height="225"/%3E%3Ctext fill="%2394a3b8" font-family="Arial" font-size="16" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ETemplate%3C/text%3E%3C/svg%3E',
    title: template.name,
    creator: template.User?.name || 'Unknown',
    views: template.downloads.toString(),
    isPro: template.tags.includes('pro'),
    category: template.tags[0] || 'General',
  }));

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight mb-2">Templates</h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
          Browse professionally designed templates to jumpstart your thumbnail creation. Filter by category, use pre-built designs, and customize them to match your brand.
        </p>
      </div>

      {/* Hero Carousel Section */}
      <div className="mb-12">
        <div className="relative flex items-center justify-between gap-4">
          {/* Left Arrow */}
          <button className="hidden md:flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all z-10 backdrop-blur-sm">
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Featured Card */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl shadow-blue-900/20 group cursor-pointer h-[320px] md:h-[450px]">
            {/* Background Image */}
            <img
              src={carouselItem.image}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
              alt="Hero Banner"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-white/10"></div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-10">
              <div className="flex items-start">
                <span className="inline-flex items-center rounded-full bg-pink-500 text-white px-3 py-1 text-xs font-bold tracking-wide shadow-lg shadow-pink-900/20">
                  {carouselItem.badge}
                </span>
              </div>

              <div className="max-w-2xl">
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-tight text-white mb-2 drop-shadow-sm">
                  {carouselItem.title}
                </h2>
                <p className="text-sm md:text-base text-slate-300 font-medium max-w-lg drop-shadow-md">
                  {carouselItem.description}
                </p>
              </div>
            </div>
          </div>

          {/* Right Arrow */}
          <button className="hidden md:flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all z-10 backdrop-blur-sm">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-6">
          <button className="h-2.5 w-2.5 rounded-full bg-white transition-all"></button>
          <button className="h-2.5 w-2.5 rounded-full bg-slate-700 hover:bg-slate-500 transition-all"></button>
          <button className="h-2.5 w-2.5 rounded-full bg-slate-700 hover:bg-slate-500 transition-all"></button>
          <button className="h-2.5 w-2.5 rounded-full bg-slate-700 hover:bg-slate-500 transition-all"></button>
        </div>
      </div>

      {/* ─── Composition Layouts Section ─── */}
      <div className="mb-14">
        <div className="flex items-center gap-3 mb-1">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">Layouts</h2>
        </div>
        <p className="text-slate-400 text-sm mb-5 ml-8">
          Pick a layout, drop your images in, and get a finished thumbnail instantly.
        </p>

        {/* Layout Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide ml-8">
          {LAYOUT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setLayoutCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                layoutCategory === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Layout Cards */}
        {layoutsLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : compositionLayouts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No layouts found for this category.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {compositionLayouts.map((layout) => (
              <div
                key={layout.id}
                onClick={() => handleLayoutClick(layout)}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-900/60 hover:border-blue-500/50 hover:bg-slate-800/80 transition-all p-3"
              >
                {/* Wireframe SVG Preview */}
                <div
                  className="aspect-video w-full rounded-lg overflow-hidden bg-slate-950 mb-3 flex items-center justify-center"
                  dangerouslySetInnerHTML={{ __html: layout.wireframeSvg }}
                />

                {/* Layout Info */}
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors truncate">
                  {layout.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                  {layout.description}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {layout.slots.length} slot{layout.slots.length !== 1 ? 's' : ''}
                  </span>
                  {layout.textSlots.length > 0 && (
                    <span>+ {layout.textSlots.length} text</span>
                  )}
                  {layout.builtIn && (
                    <span className="ml-auto bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                      BUILT-IN
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Thumbnail Templates Section ─── */}

      {/* Filters & Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative flex items-center gap-2">
          <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-500 whitespace-nowrap">
            Sort by:
          </span>
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as 'popular' | 'recent' | 'downloads')}
            className="appearance-none bg-transparent text-sm text-slate-200 hover:text-slate-100 cursor-pointer pr-6 focus:outline-none"
          >
            <option value="popular" className="bg-slate-800">Popular</option>
            <option value="recent" className="bg-slate-800">Recent</option>
            <option value="downloads" className="bg-slate-800">Most Downloaded</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-0 pointer-events-none text-slate-400" />
        </div>
      </div>

      {/* Loading State */}
      {loading && page === 1 && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-8">
          <strong className="font-bold">Error: </strong>
          <span>{error}</span>
        </div>
      )}

      {/* Templates Grid */}
      {!loading && displayTemplates.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-lg">No templates found for this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {displayTemplates.map((template) => (
            <div 
              key={template.id} 
              className="group cursor-pointer"
              onClick={() => handleTemplateClick(templates.find(t => t.id === template.id)!)}
            >
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-800 border border-slate-800 group-hover:border-slate-700 transition-all shadow-lg shadow-black/20">
              <img
                src={template.image}
                alt={template.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
              />
              {/* Badges */}
              <div className="absolute bottom-3 left-3 flex gap-2">
                <span
                  className={`${
                    template.isPro ? 'bg-blue-500' : 'bg-emerald-500'
                  } text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm`}
                >
                  {template.isPro ? 'PRO' : 'FREE'}
                </span>
                <span className="bg-slate-900/80 backdrop-blur text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700">
                  {template.category}
                </span>
              </div>
            </div>
            <div className="mt-3 flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-100 group-hover:text-blue-400 transition-colors">
                  {template.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  By {template.creator}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Eye className="w-3 h-3" />
                {template.views}
              </div>
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Load More Button */}
      {hasMore && !loading && displayTemplates.length > 0 && (
        <div className="flex justify-center mb-12">
          <button 
            onClick={handleLoadMore}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load more templates'}
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
};

export default TemplatesPage;
