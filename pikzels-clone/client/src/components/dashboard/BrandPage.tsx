import React from 'react';
import {
  Share,
  Aperture,
  Palette,
  Type,
  Megaphone,
  Image as ImageIcon,
  Layers,
  Sticker,
  BarChart3,
  Plus,
} from 'lucide-react';

const BrandPage: React.FC = () => {
  const brandCategories = [
    {
      id: 1,
      icon: Aperture,
      title: 'Logos',
      count: '4 assets',
      color: 'blue',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      textColor: 'text-blue-400',
      hoverColor: 'group-hover:text-blue-300',
      content: (
        <div className="mt-4 flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white"></div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-slate-950"></div>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-xs text-slate-500">
            +2
          </div>
        </div>
      ),
    },
    {
      id: 2,
      icon: Palette,
      title: 'Colors',
      count: '3 palettes',
      color: 'purple',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      textColor: 'text-purple-400',
      hoverColor: 'group-hover:text-purple-300',
      content: (
        <div className="mt-4 flex gap-2">
          <div className="h-8 w-12 rounded bg-[#2563ff] shadow-sm"></div>
          <div className="h-8 w-12 rounded bg-emerald-500 shadow-sm"></div>
          <div className="h-8 w-12 rounded bg-rose-500 shadow-sm"></div>
          <div className="h-8 w-12 rounded bg-amber-400 shadow-sm"></div>
        </div>
      ),
    },
    {
      id: 3,
      icon: Type,
      title: 'Fonts',
      count: '2 families',
      color: 'emerald',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      textColor: 'text-emerald-400',
      hoverColor: 'group-hover:text-emerald-300',
      content: (
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-2xl font-bold text-slate-200">Aa</span>
          <span className="text-2xl text-slate-400" style={{ fontFamily: '"Playfair Display", serif' }}>
            Aa
          </span>
        </div>
      ),
    },
    {
      id: 4,
      icon: Megaphone,
      title: 'Brand Voice',
      count: 'Set up',
      color: 'rose',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      textColor: 'text-rose-400',
      hoverColor: 'group-hover:text-rose-300',
      content: (
        <p className="mt-3 text-xs text-slate-400 leading-relaxed line-clamp-2">
          Friendly, professional, and concise tone for all generated text.
        </p>
      ),
    },
    {
      id: 5,
      icon: ImageIcon,
      title: 'Photos',
      count: '128 items',
      color: 'amber',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      textColor: 'text-amber-400',
      hoverColor: 'group-hover:text-amber-300',
      content: (
        <div className="mt-4 flex -space-x-2 overflow-hidden">
          <img
            className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=64&h=64"
            alt=""
          />
          <img
            className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
            src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=64&h=64"
            alt=""
          />
          <img
            className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 object-cover"
            src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64"
            alt=""
          />
          <div className="h-8 w-8 rounded-full ring-2 ring-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-medium">
            +125
          </div>
        </div>
      ),
    },
    {
      id: 6,
      icon: Layers,
      title: 'Graphics',
      count: '12 items',
      color: 'indigo',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/20',
      textColor: 'text-indigo-400',
      hoverColor: 'group-hover:text-indigo-300',
      content: (
        <div className="mt-4 grid grid-cols-4 gap-1 opacity-60">
          <div className="h-2 w-full bg-indigo-500/40 rounded-sm"></div>
          <div className="h-2 w-full bg-slate-700 rounded-sm"></div>
          <div className="h-2 w-full bg-indigo-500/40 rounded-sm"></div>
          <div className="h-2 w-full bg-slate-700 rounded-sm"></div>
        </div>
      ),
    },
    {
      id: 7,
      icon: Sticker,
      title: 'Icons',
      count: 'Library',
      color: 'cyan',
      bgColor: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      textColor: 'text-cyan-400',
      hoverColor: 'group-hover:text-cyan-300',
      content: (
        <div className="mt-4 flex gap-3 text-slate-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      ),
    },
    {
      id: 8,
      icon: BarChart3,
      title: 'Charts',
      count: 'Styles',
      color: 'orange',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/20',
      textColor: 'text-orange-400',
      hoverColor: 'group-hover:text-orange-300',
      content: (
        <div className="mt-4 flex items-end gap-1 h-6">
          <div className="w-2 bg-orange-500/40 h-full rounded-t-sm"></div>
          <div className="w-2 bg-orange-500/70 h-3/4 rounded-t-sm"></div>
          <div className="w-2 bg-orange-500 h-1/2 rounded-t-sm"></div>
        </div>
      ),
    },
  ];

  const projects = [
    {
      id: 1,
      title: '24 Hours with Danny Duncan (The Most Dangerous Neighborhood)',
      badge: 'Free Plan',
      image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2669&auto=format&fit=crop',
      label: 'Demo project',
    },
    {
      id: 2,
      title: 'Curry Drills 12 Threes Including The Game Winner',
      badge: 'Free Plan',
      demo: true,
      image: 'https://images.unsplash.com/photo-1546519638-68e109498888?q=80&w=2670&auto=format&fit=crop',
      label: 'Demo project',
    },
    {
      id: 3,
      title: 'Tal Wilkenfeld: Music, Guitar, Bass, Jeff Beck',
      badge: 'Free Plan',
      image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=2669&auto=format&fit=crop',
      label: 'Demo project',
    },
  ];

  const recentThumbnails = [
    { id: 1, title: 'How to Build Amazing...', time: '2 hours ago', gradient: 'from-blue-500/30 to-indigo-500/30' },
    { id: 2, title: 'Top 10 Design Tips', time: '1 day ago', gradient: 'from-sky-500/30 to-blue-500/30' },
    { id: 3, title: 'Ultimate Guide to...', time: '3 days ago', gradient: 'from-emerald-500/30 to-teal-500/30' },
  ];

  const stats = [
    { value: '127', label: 'Thumbnails Created' },
    { value: '89%', label: 'Click-Through Rate' },
    { value: '42', label: 'Templates Used' },
    { value: '2.4M', label: 'Total Views' },
  ];

  return (
    <>
      {/* Brand Kit Section */}
      <div className="mb-12 relative">
        <div className="absolute inset-0 -top-12 mx-auto h-96 max-w-6xl rounded-[40px] bg-gradient-to-b from-blue-500/10 via-purple-500/5 to-transparent blur-3xl -z-10"></div>

        <div className="flex flex-col sm:flex-row items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-50">Brand Kit</h2>
            <p className="text-slate-400 mt-2 text-sm max-w-xl">
              Manage your brand identity assets to maintain consistency across all your thumbnails and designs.
            </p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 hover:bg-white text-slate-900 px-4 py-2 text-sm font-semibold transition-all">
            <Share className="w-4 h-4" />
            Share Kit
          </button>
        </div>

        {/* Brand Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {brandCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <div
                key={category.id}
                className="group relative rounded-2xl border border-slate-800 bg-[#020818]/80 hover:bg-slate-900/90 backdrop-blur-sm p-5 transition-all cursor-pointer hover:border-slate-700 hover:shadow-lg hover:shadow-black/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`p-2.5 rounded-xl ${category.bgColor} ${category.borderColor} border ${category.textColor} ${category.hoverColor} transition-colors`}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-medium text-slate-500 group-hover:text-slate-400">
                    {category.count}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-slate-100">{category.title}</h3>
                {category.content}
              </div>
            );
          })}

          {/* New Category Card */}
          <div className="group relative rounded-2xl border border-dashed border-slate-700 bg-slate-900/20 hover:bg-slate-900/50 backdrop-blur-sm p-5 transition-all cursor-pointer hover:border-slate-500 flex flex-col items-center justify-center text-center h-full min-h-[160px]">
            <div className="p-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800 transition-all mb-3">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300 group-hover:text-slate-100">New Category</h3>
            <p className="text-xs text-slate-500 mt-1">Add custom asset type</p>
          </div>
        </div>
      </div>

      {/* Existing Tabs and Projects Section */}
      <div className="mt-10 mb-12">
        {/* Section Header with Tabs and Stats */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-1 gap-y-4">
          {/* Left: Tabs */}
          <div className="flex items-center gap-8">
            <button className="relative pb-4 text-sm font-semibold text-slate-50">
              All projects (0)
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"></span>
            </button>
            <button className="relative pb-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors">
              Saved projects (0)
            </button>
          </div>

          {/* Right: Stats & Status */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-400 pb-3 lg:pb-0">
            <span className="font-medium font-mono text-slate-500">0 GB / 100 GB</span>

            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-300">Auto-save</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
              <span className="text-slate-300">Auto-import</span>
            </div>

            <span className="bg-slate-800 border border-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase">
              Beta
            </span>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {projects.map((project) => (
            <div key={project.id} className="group cursor-pointer">
              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800/80 shadow-lg shadow-black/40 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-slate-700 group-hover:shadow-xl">
                {/* Badges */}
                <div className="absolute top-3 left-3 z-20 flex gap-2">
                  <span className="bg-white text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                    {project.badge}
                  </span>
                  {project.demo && (
                    <span className="bg-slate-900/90 backdrop-blur text-slate-200 border border-slate-700 text-[11px] font-bold px-2 py-0.5 rounded shadow-sm">
                      Demo
                    </span>
                  )}
                </div>

                {/* Background Image */}
                <img
                  src={project.image}
                  alt="Project Thumbnail"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent opacity-80"></div>

                {/* Bottom Label inside Image */}
                <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                  <div className="inline-flex items-center rounded bg-slate-950/60 backdrop-blur-md border border-white/10 px-2 py-1">
                    <span className="text-[11px] text-slate-300 font-medium">{project.label}</span>
                  </div>
                </div>
              </div>

              {/* Content Below */}
              <div className="mt-3 px-1">
                <h3 className="text-sm font-semibold text-slate-100 leading-snug tracking-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                  {project.title}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1.5">{project.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Thumbnails Card */}
        <div className="bg-[#020818] border border-slate-800 rounded-2xl p-6 backdrop-blur ring-1 ring-slate-900/80 shadow-xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold tracking-tight text-slate-50">Recent Thumbnails</h3>
            <button className="text-sm text-slate-400 hover:text-blue-400">View All</button>
          </div>
          <div className="space-y-3">
            {recentThumbnails.map((thumbnail) => (
              <div
                key={thumbnail.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80 transition-all"
              >
                <div
                  className={`w-20 h-12 rounded-md bg-gradient-to-br ${thumbnail.gradient} border border-slate-700`}
                ></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{thumbnail.title}</p>
                  <p className="text-xs text-slate-500">{thumbnail.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-[#020818] border border-slate-800 rounded-2xl p-6 backdrop-blur ring-1 ring-slate-900/80 shadow-xl shadow-black/40">
          <h3 className="text-xl font-semibold tracking-tight mb-4 text-slate-50">Your Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div key={index} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-3xl font-semibold text-slate-50">{stat.value}</div>
                <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default BrandPage;