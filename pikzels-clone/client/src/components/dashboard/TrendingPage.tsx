import React from 'react';
import { Youtube, Instagram, Music, Edit, Download } from 'lucide-react';

const TrendingPage = () => {
  return (
    <main className="flex-1 overflow-y-auto bg-[#020817] px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section - Simplified */}
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-50">Trending Thumbnails</h1>
        <p className="text-slate-400 mt-2 text-sm max-w-2xl leading-relaxed">
          Discover what's popular right now. Explore trending thumbnail designs and get inspiration from the most successful content creators across all platforms.
        </p>
      </div>

      {/* Dense Grid Layout - Pinterest Style */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 auto-rows-[200px] grid-flow-dense">
        {/* Item 1: Product Ad - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="3D Abstract"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Trending
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
            src="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Gradient Background"
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
            src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Urban Style"
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
            src="https://images.unsplash.com/photo-1526947425960-945c6e72858f?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Explosion Effect"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Hot
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
            src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Cyberpunk Neon"
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
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Abstract Art"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Popular
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

        {/* Item 7: Headphone Ad - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Tech Setup"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Trending
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

        {/* Item 8: Youtube Vlog - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-red-500/10 hover:border-red-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1608889825103-eb5ed706fc64?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Gaming Controller"
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

        {/* Item 9: Sports Action - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1546519638-68e109498888?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Basketball"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Hot
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Epic Dunk Highlights</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 10: Food/Instagram - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:border-pink-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Portrait"
          />
          <div className="absolute top-2 right-2 bg-pink-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Instagram className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Portrait Photography</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 11: Sneaker Ad - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-orange-500/10 hover:border-orange-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Music Gear"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Popular
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Audio Equipment</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 12: Tiktok Dance - Wide (spans 2 columns) */}
        <div className="group relative w-full h-full col-span-2 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1603048588665-791ca8aea617?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Microphone"
          />
          <div className="absolute top-2 right-2 bg-cyan-600/90 backdrop-blur-md p-1 rounded text-white border border-white/10">
            <Music className="w-3 h-3" strokeWidth={3} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Podcast Setup</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 13: Tech Phone - Tall (spans 2 rows) */}
        <div className="group relative w-full h-full col-span-1 row-span-2 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Crypto"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Trending
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Crypto Trading</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 14: Fitness - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-green-500/10 hover:border-green-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Fitness"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Hot
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">30-Day Challenge</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Edit className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        {/* Item 15: Music Production - Regular */}
        <div className="group relative w-full h-full col-span-1 row-span-1 bg-[#0F172A] rounded-xl overflow-hidden border border-slate-800 shadow-sm transition-all hover:shadow-xl hover:shadow-purple-500/10 hover:border-purple-500/50 cursor-pointer">
          <img
            src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            alt="Music"
          />
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10">
            Popular
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
              <span className="text-xs font-medium text-white truncate">Beat Making 101</span>
              <button className="p-1.5 bg-white text-slate-900 rounded-full hover:bg-slate-200">
                <Download className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default TrendingPage;