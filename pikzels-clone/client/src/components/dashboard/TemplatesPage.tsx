import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Eye,
  ArrowDown,
} from 'lucide-react';

const TemplatesPage: React.FC = () => {
  // Mock data for carousel
  const carouselItem = {
    id: 1,
    title: 'Neon Cyberpunk Gaming Pack',
    description: 'Stand out with this high-energy, purple neon aesthetic designed for battle royale and FPS gameplay highlights.',
    badge: 'NEW ARRIVAL',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2670&auto=format&fit=crop',
  };

  // Mock data for categories
  const categories = [
    { id: 'all', name: 'All Templates', active: true },
    { id: 'gaming', name: 'Gaming', active: false },
    { id: 'vlogs', name: 'Vlogs', active: false },
    { id: 'tech', name: 'Tech & Reviews', active: false },
    { id: 'education', name: 'Education', active: false },
    { id: 'minimal', name: 'Minimal', active: false },
  ];

  // Mock data for template cards
  const templates = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1000&auto=format&fit=crop',
      title: 'Cinematic Vlog Overlay',
      creator: 'CreatorLabs',
      views: '1.2k',
      isPro: true,
      category: 'Vlog',
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=1000&auto=format&fit=crop',
      title: 'Modern 3D Shapes',
      creator: 'ThumPiks Team',
      views: '3.4k',
      isPro: false,
      category: 'Abstract',
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1000&auto=format&fit=crop',
      title: 'Retro Computer Review',
      creator: 'RetroKing',
      views: '856',
      isPro: true,
      category: 'Tech',
    },
    {
      id: 4,
      image: 'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/917d6f93-fb36-439a-8c48-884b67b35381_1600w.jpg',
      title: 'Movie Review Classic',
      creator: 'MovieBuff',
      views: '5.1k',
      isPro: false,
      category: 'Cinema',
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=1000&auto=format&fit=crop',
      title: 'Crypto & Stocks Breakdown',
      creator: 'FinanceWiz',
      views: '2.8k',
      isPro: true,
      category: 'Finance',
    },
    {
      id: 6,
      image: 'https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4734259a-bad7-422f-981e-ce01e79184f2_1600w.jpg',
      title: 'Healthy Morning Routine',
      creator: 'LifeStylePro',
      views: '9.1k',
      isPro: false,
      category: 'Lifestyle',
    },
  ];

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-2">Templates</h1>
        <p className="text-slate-400 text-base max-w-2xl">
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
            <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10">
              <div className="flex items-start">
                <span className="inline-flex items-center rounded-full bg-pink-500 text-white px-3 py-1 text-xs font-bold tracking-wide shadow-lg shadow-pink-900/20">
                  {carouselItem.badge}
                </span>
              </div>

              <div className="max-w-2xl">
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2 drop-shadow-sm">
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

      {/* Filters & Sorting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        {/* Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category.id}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                category.active
                  ? 'bg-slate-700 text-white'
                  : 'bg-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center">
          <button className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
            <span className="uppercase tracking-wider text-[11px] font-semibold text-slate-500">
              Sort by:
            </span>
            <span className="font-medium text-slate-200">Popular</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {templates.map((template) => (
          <div key={template.id} className="group cursor-pointer">
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

      {/* Load More Button */}
      <div className="flex justify-center mb-12">
        <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-700 hover:text-white transition-all border border-slate-700">
          Load more templates
          <ArrowDown className="w-4 h-4" />
        </button>
      </div>
    </>
  );
};

export default TemplatesPage;
