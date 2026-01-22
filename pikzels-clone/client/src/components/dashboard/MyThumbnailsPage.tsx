import React from 'react';
import { Search, Plus, Youtube, Instagram, Music, Twitter, Filter, ArrowUpDown, Edit, Download } from 'lucide-react';

const MyThumbnailsPage = () => {
  return (
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
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search thumbnails..."
              className="bg-[#0B1121] border border-slate-800 text-slate-300 text-sm rounded-lg block w-64 pl-10 p-2.5 placeholder-slate-500 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-blue-500/20">
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            Create New
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-1 mb-8 gap-4">
        <div className="flex items-center gap-8 overflow-x-auto w-full sm:w-auto no-scrollbar">
          <button className="relative pb-4 text-sm font-semibold text-slate-50 whitespace-nowrap">
            All Projects
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
          </button>
          <button className="relative pb-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap">
            <Youtube className="w-[14px] h-[14px] text-red-500" strokeWidth={2} />
            YouTube
          </button>
          <button className="relative pb-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap">
            <Instagram className="w-[14px] h-[14px] text-pink-500" strokeWidth={2} />
            Instagram
          </button>
          <button className="relative pb-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-2 whitespace-nowrap">
            <Music className="w-[14px] h-[14px] text-cyan-400" strokeWidth={2} />
            TikTok
          </button>
          <button className="relative pb-4 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors whitespace-nowrap">
            Twitter / X
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <Filter className="w-[14px] h-[14px]" strokeWidth={1.5} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowUpDown className="w-[14px] h-[14px]" strokeWidth={1.5} />
            Sort by Date
          </button>
        </div>
      </div>

      {/* Dense Grid Layout - Pinterest Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 auto-rows-[200px] grid-flow-dense">
        {/* Item 1: Product Ad - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Gaming Monitor"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Curved Monitor Ad</span>
              <div className="flex gap-2">
                <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                  <Edit className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Item 2: Youtube Gaming - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Gaming Setup"
          />
          <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Youtube className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Best RGB Setup</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 3: Instagram Fashion - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Fashion"
          />
          <div className="absolute top-2 right-2 bg-pink-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Instagram className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Summer Collection</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 4: Tech Product - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="iPad"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Tablet Review</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 5: Tiktok Lifestyle - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Lifestyle"
          />
          <div className="absolute top-2 right-2 bg-cyan-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Music className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Vlog Daily #42</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 6: TV Ad - Large (spans 2 cols x 2 rows) */}
        <div className="group relative w-full h-full col-span-2 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1593784991067-9457995f7b1c?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="TV"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Smart TV Sale</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 7: Twitter Quote - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-500/10 hover:border-slate-500/50 cursor-pointer">
          <div className="w-full h-full bg-slate-900 flex items-center justify-center p-6 text-center">
            <p className="text-slate-200 font-serif italic text-lg leading-snug">
              "Design is not just what it looks like and feels like. Design is how it works."
            </p>
          </div>
          <div className="absolute top-2 right-2 bg-slate-700/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Twitter className="w-3 h-3" strokeWidth={2} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Daily Quote Card</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 8: Headphone Ad - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Headphones"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Pro Sound Gear</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 9: Youtube Vlog - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Nature"
          />
          <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Youtube className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Hiking the Alps</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 10: Camera Gear - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Camera"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">New Lens Drop</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 11: Food/Instagram - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Food"
          />
          <div className="absolute top-2 right-2 bg-pink-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Instagram className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Best Pizza NYC</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 12: Sneaker Ad - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1552346154-21d32810aba3?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Sneakers"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Runner Pro 2</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 13: Tiktok Dance - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Dance"
          />
          <div className="absolute top-2 right-2 bg-cyan-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Music className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Morning Routine</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 14: Tech Phone - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Phone"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Ad
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Flagship Killer</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 15: Create New Placeholder - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-slate-900/50 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 hover:border-slate-500 transition-all">
          <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-slate-800 mb-3 shadow-sm border border-slate-700">
            <Plus className="w-6 h-6" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-slate-400 group-hover:text-slate-200">New Thumbnail</span>
        </div>
      </div>

    </main>
  );
};

export default MyThumbnailsPage;
