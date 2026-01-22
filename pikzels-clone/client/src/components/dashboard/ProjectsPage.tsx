import React from 'react';
import {
  ChevronDown,
  PlayCircle,
  PenTool,
  LayoutTemplate,
  Figma,
  Users,
  Compass,
  FileCode,
  Image as ImageIcon,
  FileBox,
  Check,
  Play,
} from 'lucide-react';

const ProjectsPage: React.FC = () => {
  const filters = ['Type', 'Category', 'Owner', 'Date modified'];

  const latestProjects = [
    {
      id: 1,
      title: 'Rive Animation',
      type: 'video',
      timeAgo: '23 days ago',
      icon: PlayCircle,
      iconColor: 'text-rose-500',
      bgGradient: 'from-slate-900 via-[#1e1b4b] to-black',
    },
    {
      id: 2,
      title: 'Abstractions Vol. 2',
      type: 'image',
      timeAgo: '6 months ago',
      badge: 'P',
      badgeColor: 'bg-orange-500',
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Portfolio 2024',
      type: 'template',
      timeAgo: '6 months ago',
      icon: LayoutTemplate,
      iconColor: 'text-indigo-400',
      isTemplate: true,
    },
    {
      id: 4,
      title: 'Daily Planner App',
      type: 'figma',
      timeAgo: '8 months ago',
      icon: Figma,
      iconColor: 'text-purple-400',
      isFigma: true,
    },
  ];

  const designs = [
    {
      id: 1,
      title: 'User Flow v2',
      timeAgo: '1 day ago',
      icon: PenTool,
      iconColor: 'text-pink-500',
      image: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?q=80&w=2669&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Green & Beige Illus.',
      timeAgo: '3 days ago',
      icon: Users,
      iconColor: 'text-yellow-500',
      image: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=2670&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'Untitled Design',
      timeAgo: '1 week ago',
      icon: Compass,
      iconColor: 'text-purple-400',
      bgGradient: 'from-[#4a148c] to-[#311b92]',
    },
  ];

  const images = [
    {
      id: 1,
      title: 'vimeo-receipt.html',
      size: '73 KB',
      timeAgo: '1d ago',
      icon: FileCode,
      image: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=2574&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'vegan-promo.png',
      size: '473 KB',
      timeAgo: '2d ago',
      icon: ImageIcon,
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2670&auto=format&fit=crop',
    },
    {
      id: 3,
      title: 'rocket-news.jpg',
      size: '445 KB',
      timeAgo: '3d ago',
      icon: ImageIcon,
      isPlaceholder: true,
    },
    {
      id: 4,
      title: 'myBrainCo-promo',
      size: '935 KB',
      timeAgo: '4d ago',
      icon: FileBox,
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop',
    },
    {
      id: 5,
      title: 'order-confirm.png',
      size: '62 KB',
      timeAgo: '1 week ago',
      icon: ImageIcon,
      isConfirmation: true,
    },
    {
      id: 6,
      title: 'coco-review.html',
      size: '525 KB',
      timeAgo: '1 week ago',
      icon: FileCode,
      image: 'https://images.unsplash.com/photo-1614332287897-cdc485fa562d?q=80&w=2670&auto=format&fit=crop',
      hasOverlay: true,
    },
  ];

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-100 tracking-tight mb-2">Projects</h1>
        <p className="text-slate-400 text-base max-w-2xl">
          Manage and organize your creative projects, design assets, and thumbnails in one centralized workspace to
          maintain consistency across all your channels.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8 items-center">
        {filters.map((filter) => (
          <button
            key={filter}
            className="bg-[#0f1629] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all"
          >
            {filter}
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </button>
        ))}
      </div>

      {/* Section: Latest */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-5 group cursor-pointer">
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Latest</h2>
          <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">4</span>
          <div className="h-px bg-slate-800 flex-1"></div>
          <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors">
            View all
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {latestProjects.map((project) => (
            <div key={project.id} className="group cursor-pointer">
              <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl">
                {project.type === 'video' && (
                  <>
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${project.bgGradient} opacity-90 group-hover:scale-105 transition-transform duration-500`}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <div className="bg-black/50 p-2 rounded-full border border-white/10 backdrop-blur-sm">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  </>
                )}
                {project.type === 'image' && project.image && (
                  <img
                    src={project.image}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                    alt={project.title}
                  />
                )}
                {project.isTemplate && (
                  <div className="bg-[#0f1115] p-4 flex flex-col gap-2 h-full">
                    <div className="w-full h-2/3 bg-indigo-600 rounded-lg group-hover:bg-indigo-500 transition-colors"></div>
                    <div className="flex gap-2 h-1/3">
                      <div className="w-1/2 bg-slate-800 rounded-lg"></div>
                      <div className="w-1/2 bg-slate-800 rounded-lg"></div>
                    </div>
                  </div>
                )}
                {project.isFigma && (
                  <div className="bg-white p-3 flex flex-col items-center justify-center h-full">
                    <div className="w-full h-full border border-slate-200 rounded-lg bg-slate-50 relative p-2">
                      <div className="w-full h-2 bg-slate-200 rounded-full mb-2"></div>
                      <div className="w-2/3 h-2 bg-slate-200 rounded-full"></div>
                      <div className="absolute top-0 left-0 w-full h-8 border-b border-dashed border-slate-300"></div>
                    </div>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors">
                {project.title}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {project.icon && (
                  <project.icon className={`w-3 h-3 ${project.iconColor}`} />
                )}
                {project.badge && (
                  <span className={`${project.badgeColor} rounded text-[8px] font-bold text-black px-1`}>
                    {project.badge}
                  </span>
                )}
                Edited {project.timeAgo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Designs */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-5 group cursor-pointer">
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Designs</h2>
          <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">3</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {designs.map((design) => (
            <div key={design.id} className="group cursor-pointer">
              <div className="aspect-video bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl">
                {design.image ? (
                  <img
                    src={design.image}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                    alt={design.title}
                  />
                ) : (
                  <>
                    <div className="bg-[#311b92] flex items-center justify-center h-full relative">
                      <div className="w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
                      <div
                        className={`absolute inset-0 bg-gradient-to-tr ${design.bgGradient} opacity-80`}
                      ></div>
                      <div className="w-20 h-20 rounded-full bg-white/5 backdrop-blur-md z-10"></div>
                    </div>
                  </>
                )}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-blue-400 transition-colors">
                {design.title}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <design.icon className={`w-3 h-3 ${design.iconColor}`} />
                Edited {design.timeAgo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Images */}
      <div>
        <div className="flex items-center gap-4 mb-5 group cursor-pointer">
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Images</h2>
          <span className="bg-slate-800 text-slate-400 text-xs font-semibold px-2 py-0.5 rounded-full">5</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
          {images.map((img) => (
            <div key={img.id} className="group cursor-pointer">
              <div className="aspect-[9/16] bg-slate-900 rounded-xl border border-slate-800/80 overflow-hidden relative mb-3 shadow-lg transition-all duration-300 group-hover:border-slate-600 group-hover:shadow-xl">
                {img.image ? (
                  <>
                    <img
                      src={img.image}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      alt={img.title}
                    />
                    {img.hasOverlay && (
                      <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent"></div>
                    )}
                  </>
                ) : img.isPlaceholder ? (
                  <div className="bg-white p-2 h-full">
                    <div className="w-full h-full border border-slate-100 rounded bg-slate-50 relative flex flex-col gap-2 p-2">
                      <div className="h-2 w-1/3 bg-slate-200 rounded"></div>
                      <div className="h-20 w-full bg-slate-200 rounded"></div>
                      <div className="h-2 w-full bg-slate-200 rounded"></div>
                      <div className="h-2 w-2/3 bg-slate-200 rounded"></div>
                    </div>
                  </div>
                ) : img.isConfirmation ? (
                  <div className="bg-white w-full h-full flex flex-col items-center justify-center p-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <Check className="w-5 h-5 text-green-500" strokeWidth={2} />
                    </div>
                    <div className="h-2 w-1/2 bg-slate-100 rounded mb-1"></div>
                    <div className="h-2 w-1/3 bg-slate-100 rounded"></div>
                  </div>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 truncate group-hover:text-blue-400 transition-colors">
                {img.title}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <img.icon className="w-3 h-3 text-slate-400" />
                {img.size} • {img.timeAgo}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ProjectsPage;