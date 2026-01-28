import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, UploadCloud, Link2, Image, UserPlus, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogleDrive } from '@fortawesome/free-brands-svg-icons';
import { API_BASE_URL, IS_DEVELOPMENT } from '../../config/environment';
import { useNavigate } from 'react-router-dom';

// Types for type safety
interface GenerateThumbnailRequest {
  videoUrl: string;
  includeFace?: boolean;
}

interface GenerateThumbnailResponse {
  success: boolean;
  thumbnailId?: string;
  thumbnailUrl?: string;
  message?: string;
}

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // State management
  const [videoLink, setVideoLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeFace, setIncludeFace] = useState(false);
  const [successData, setSuccessData] = useState<GenerateThumbnailResponse | null>(null);

  // Check for pending video link from landing page
  useEffect(() => {
    const pendingVideoLink = localStorage.getItem('pendingVideoLink');
    if (pendingVideoLink) {
      console.log('Found pending video link in DashboardHome:', pendingVideoLink);
      setVideoLink(pendingVideoLink);
      localStorage.removeItem('pendingVideoLink');
    }
  }, []);

  // YouTube URL validation
  const isValidYouTubeUrl = useCallback((url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }, []);

  // Generate thumbnail handler with error handling
  const handleGenerateThumbnail = useCallback(async () => {
    // Validation
    if (!videoLink.trim()) {
      setError('Please enter a YouTube video link');
      return;
    }

    if (!isValidYouTubeUrl(videoLink)) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    // Reset error state
    setError(null);
    setIsGenerating(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('Authentication required');
      }

      // API call with proper error handling
      // Use relative URL in development to leverage Vite proxy
      const apiUrl = IS_DEVELOPMENT ? '/api/thumbnails/generate' : `${API_BASE_URL}/api/thumbnails/generate`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUrl: videoLink,
          includeFace,
        } as GenerateThumbnailRequest),
      });

      if (!response.ok) {
        // Handle HTTP errors
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          errorData.error ||
          `Failed to generate thumbnail (${response.status})`
        );
      }

      const data: GenerateThumbnailResponse = await response.json();

      if (data.success) {
        console.log('✅ Thumbnail generated successfully:', data);
        setSuccessData(data);
        setVideoLink(''); // Clear the input field
        
        // Navigate to My Thumbnails page after 3 seconds
        navigationTimeoutRef.current = setTimeout(() => {
          navigate('/dashboard/thumbnails');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to generate thumbnail');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('❌ Error generating thumbnail:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [videoLink, includeFace, isValidYouTubeUrl]);

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
      {/* Generate Thumbnail Box */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-0 -top-8 mx-auto h-56 max-w-5xl rounded-[28px] bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-indigo-500/15 blur-3xl"></div>

          <div className="sm:p-8 shadow-black/40 bg-[#020818] border-slate-800 border ring-slate-900/80 ring-1 rounded-2xl p-6 relative shadow-xl backdrop-blur">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6 text-slate-50">
              Generate Thumbnail
            </h2>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/50 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            {/* Row 1: Upload Options */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              {/* Left Button */}
              <button 
                onClick={() => setIncludeFace(!includeFace)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  includeFace 
                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700' 
                    : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                Include Face {includeFace && '✓'}
              </button>

              {/* Middle: Upload Buttons */}
              <div className="flex-1 w-full flex justify-center">
                <div className="flex w-full h-32 max-w-md relative items-center justify-center">
                  <div className="relative w-64 h-24">
                    {/* Center: Upload */}
                    <button className="absolute inset-0 m-auto w-40 h-24 px-6 py-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-sm font-medium text-slate-100 hover:from-slate-800 hover:to-slate-700 hover:border-slate-500 shadow-lg shadow-black/40 transition-all flex flex-col items-center justify-center gap-2">
                      <UploadCloud className="w-6 h-6" />
                      Upload
                    </button>

                    {/* Left: Google Drive */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 opacity-40">
                      <button className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center hover:opacity-100 hover:border-slate-600 transition-opacity">
                        <FontAwesomeIcon icon={faGoogleDrive} className="w-5 h-5 text-slate-300" />
                      </button>
                      <p className="text-xs text-center mt-1 text-slate-500">Google</p>
                    </div>

                    {/* Right: Apple Drive */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 opacity-40">
                      <button className="flex hover:opacity-100 hover:border-slate-600 transition-opacity bg-slate-950 w-16 h-16 border-slate-800 border rounded-lg items-center justify-center">
                        <svg
                          role="img"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 text-slate-300"
                        >
                          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.99 3.91-.99 1.832 0 2.35.99 3.96.958 1.637-.033 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.666.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"></path>
                        </svg>
                      </button>
                      <p className="text-xs text-center mt-1 text-slate-500">Apple</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Button */}
              <button className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2">
                See Example
                <Image className="w-5 h-5" />
              </button>
            </div>

            {/* Row 2: YouTube Link Input */}
            <div className="mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Drop link to your YouTube video"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-base text-slate-100 bg-slate-900 w-full border-slate-800 border rounded-xl p-4 pl-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    <Link2 className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 3: Generate Button */}
            <div>
              <button 
                onClick={handleGenerateThumbnail}
                disabled={isGenerating || !videoLink.trim()}
                className={`w-full px-6 py-4 rounded-xl text-base font-semibold text-white shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 ${
                  isGenerating || !videoLink.trim()
                    ? 'bg-slate-700 cursor-not-allowed opacity-60'
                    : 'bg-[#2563ff] hover:bg-[#1d4fff]'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Thumbnail
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Projects Section */}
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

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300 relative">
            {/* Close button */}
            <button
              onClick={() => {
                if (navigationTimeoutRef.current) {
                  clearTimeout(navigationTimeoutRef.current);
                }
                setSuccessData(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              ×
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-50">Thumbnail Generated!</h3>
                <p className="text-sm text-slate-400">Your thumbnail has been created successfully</p>
              </div>
            </div>

            {/* Show the thumbnail */}
            {successData.thumbnailUrl && (
              <div className="mb-6">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-lg">
                  <img
                    src={successData.thumbnailUrl}
                    alt="Generated Thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1280x720/1e293b/94a3b8?text=Thumbnail+Preview';
                    }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Redirecting to your thumbnails in 3 seconds...
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (navigationTimeoutRef.current) {
                    clearTimeout(navigationTimeoutRef.current);
                  }
                  setSuccessData(null);
                  navigate('/dashboard/thumbnails');
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                View in My Thumbnails
              </button>
              <button
                onClick={() => {
                  if (navigationTimeoutRef.current) {
                    clearTimeout(navigationTimeoutRef.current);
                  }
                  setSuccessData(null);
                }}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium transition-colors"
              >
                Stay Here
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardHome;
