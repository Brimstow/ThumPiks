import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, UploadCloud, Link2, Image, UserPlus, AlertCircle, Loader2, CheckCircle, X, Upload, ChevronLeft, ChevronRight, PenTool, Video, Star } from 'lucide-react';
import { API_BASE_URL, IS_DEVELOPMENT } from '../../config/environment';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProjectsAndUploadsWidget, RecentThumbnailsWidget, StatsWidget, StorageIndicator } from './widgets';
import { authPost } from '../../utils/api';
import { formatFileSize } from '../../lib/formatters';
import { uploadAsset } from '../../services/quickEditService';
import ThumbnailActionBar from '../ui/ThumbnailActionBar';
import RecreateBetterModal from '../ui/RecreateBetterModal';
import ThumbnailResultModal from '../ui/ThumbnailResultModal';
import { getPendingThumbnail, clearPendingThumbnail } from '../../utils/pendingThumbnail';
import Tooltip from '../ui/Tooltip';
// CollapsibleSection utilities available if needed
// import { getDisclosurePref, setDisclosurePref } from '../ui/CollapsibleSection';

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

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

// Platform configuration for animated input
const platforms = [
  { name: 'YouTube', placeholder: 'Drop link to your YouTube video', color: 'text-red-400' },
  { name: 'TikTok', placeholder: 'Drop link to your TikTok video', color: 'text-cyan-400' },
  { name: 'Instagram', placeholder: 'Drop link to your Instagram Reel', color: 'text-pink-400' },
  { name: 'Twitter', placeholder: 'Drop link to your Twitter post', color: 'text-sky-400' },
];

// Example thumbnails for preview - YouTube standard size 1280x720 (16:9)
const exampleThumbnails = [
  { id: 1, title: 'Gaming Highlight', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop', category: 'Gaming' },
  { id: 2, title: 'Tech Review', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&h=720&fit=crop', category: 'Technology' },
  { id: 3, title: 'Cooking Tutorial', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1280&h=720&fit=crop', category: 'Cooking' },
  { id: 4, title: 'Fitness Guide', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1280&h=720&fit=crop', category: 'Fitness' },
  { id: 5, title: 'Travel Vlog', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1280&h=720&fit=crop', category: 'Travel' },
  { id: 6, title: 'Music Video', image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1280&h=720&fit=crop', category: 'Music' },
];


const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);
  
  // Subscription success banner
  const [showSubscriptionSuccess, setShowSubscriptionSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setShowSubscriptionSuccess(true);
      // Clean up the URL without triggering a re-render/navigation
      searchParams.delete('subscription');
      setSearchParams(searchParams, { replace: true });
      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => setShowSubscriptionSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, []);

  // State management
  const [videoLink, setVideoLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeFace, setIncludeFace] = useState(false);
  const [successData, setSuccessData] = useState<GenerateThumbnailResponse | null>(null);
  
  // Modal states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  const [showPendingThumbnailModal, setShowPendingThumbnailModal] = useState(false);
  const [pendingThumbnailData, setPendingThumbnailData] = useState<{
    thumbnailUrl: string;
    thumbnailId?: string;
    videoTitle?: string;
    creditCost: number;
  } | null>(null);
  
  // Face inclusion states
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceFileName, setFaceFileName] = useState<string | null>(null);
  const [faceDragActive, setFaceDragActive] = useState(false);
  
  // Upload states
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mainDragActive, setMainDragActive] = useState(false);
  
  
  // Example modal state
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  
  // Platform typing animation state
  const [currentPlatformIndex, setCurrentPlatformIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(
    () => !sessionStorage.getItem('reviewPromptDismissed')
  );
  
  const currentPlatform = platforms[currentPlatformIndex];

  // Check for pending video link and pending thumbnails from landing page
  useEffect(() => {
    // Check for pending thumbnail first (higher priority)
    const pendingThumbnail = getPendingThumbnail();
    if (pendingThumbnail) {
      console.log('Found pending thumbnail in DashboardHome:', pendingThumbnail);
      setPendingThumbnailData({
        thumbnailUrl: pendingThumbnail.thumbnailUrl,
        thumbnailId: pendingThumbnail.thumbnailId,
        videoTitle: pendingThumbnail.videoTitle,
        creditCost: pendingThumbnail.creditCost,
      });
      setShowPendingThumbnailModal(true);
      // Don't clear yet - wait for user to close modal
      return;
    }
    
    // Check for pending video link
    const pendingVideoLink = localStorage.getItem('pendingVideoLink');
    if (pendingVideoLink) {
      console.log('Found pending video link in DashboardHome:', pendingVideoLink);
      setVideoLink(pendingVideoLink);
      localStorage.removeItem('pendingVideoLink');
    }
  }, []);

  // Platform typing animation effect
  useEffect(() => {
    const typingSpeed = 150;
    const deletingSpeed = 75;
    const pauseAfterComplete = 2500;
    const pauseBeforeTyping = 400;
    
    const targetText = currentPlatform.name;
    
    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setShowCursor(true);
      }, pauseBeforeTyping);
      return () => clearTimeout(pauseTimer);
    }
    
    const timer = setTimeout(() => {
      if (!isDeleting) {
        if (displayedText.length < targetText.length) {
          setDisplayedText(targetText.slice(0, displayedText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), pauseAfterComplete);
        }
      } else {
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setShowCursor(false);
          setIsPaused(true);
          setCurrentPlatformIndex((prev) => (prev + 1) % platforms.length);
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed);
    
    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, isPaused, currentPlatformIndex, currentPlatform.name]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowFaceModal(false);
        setShowExampleModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // YouTube URL validation
  const isValidYouTubeUrl = useCallback((url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return youtubeRegex.test(url);
  }, []);

  // Validate social media URL
  const isValidSocialUrl = useCallback((url: string): boolean => {
    const socialRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com)\/.+$/;
    return socialRegex.test(url);
  }, []);

  // Generate thumbnail handler with error handling
  const handleGenerateThumbnail = useCallback(async () => {
    if (!videoLink.trim()) {
      setError('Please enter a video link');
      return;
    }

    if (!isValidSocialUrl(videoLink)) {
      setError('Please enter a valid YouTube, TikTok, Instagram, or Twitter URL');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const response = await authPost('/api/thumbnails/generate', {
        videoUrl: videoLink,
        includeFace,
        faceImage: faceImage || undefined,
      } as GenerateThumbnailRequest);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          errorData.error ||
          `Failed to generate thumbnail (${response.status})`
        );
      }

      const data: GenerateThumbnailResponse = await response.json();

      if (data.success) {
        console.log('Thumbnail generated successfully:', data);
        setSuccessData(data);
        setVideoLink('');
        
        navigationTimeoutRef.current = setTimeout(() => {
          navigate('/dashboard/thumbnails');
        }, 3000);
      } else {
        throw new Error(data.message || 'Failed to generate thumbnail');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Error generating thumbnail:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [videoLink, includeFace, faceImage, isValidSocialUrl, navigate]);

  // File upload handlers
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    const startTime = Date.now();
    
    const reader = new FileReader();
    
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    
    reader.onload = (e) => {
      setUploadProgress(100);
      const elapsed = Date.now() - startTime;
      const base64 = e.target?.result as string;
      const finalize = () => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          preview: base64,
        });
        setIsUploading(false);
        setUploadProgress(0);
      };
      // Persist to user-assets in background (fire-and-forget)
      uploadAsset({ type: 'background', imageData: base64, name: file.name }).catch((err) =>
        console.error('Failed to persist upload:', err)
      );
      // Minimum 300ms display to prevent jarring flash on small files
      if (elapsed >= 300) {
        finalize();
      } else {
        setTimeout(finalize, 300 - elapsed);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    };
    
    reader.readAsDataURL(file);
  }, []);

  // Face image upload handler
  const handleFaceUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file for face detection');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setFaceImage(base64);
      setFaceFileName(file.name);
      setIncludeFace(true);
      // Persist face to user-assets in background (fire-and-forget)
      uploadAsset({ type: 'face', imageData: base64, name: file.name }).catch((err) =>
        console.error('Failed to persist face upload:', err)
      );
    };
    reader.onerror = () => {
      setError('Failed to read face image. Please try again.');
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, setActive: (active: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, setActive: (active: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(false);
  }, []);

  const handleMainDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMainDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFaceDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFaceDragActive(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFaceUpload(file);
    }
  }, [handleFaceUpload]);

  return (
    <>
      {/* Subscription Success Banner */}
      {showSubscriptionSuccess && (
        <div className="mx-auto max-w-4xl mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10 p-5">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white">Payment Successful!</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Your subscription has been activated. Your credits have been loaded and you're ready to create amazing thumbnails.
                </p>
              </div>
              <button
                onClick={() => setShowSubscriptionSuccess(false)}
                className="flex-shrink-0 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
      />
      <input
        ref={faceFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFaceUpload(e.target.files[0])}
      />

      {/* Quick Edit Hero Banner */}
      <div className="mb-6">
        {/* Animated border wrapper — pauses on hover */}
        <div className="relative rounded-2xl p-[1px] overflow-hidden group qe-banner">
          {/* Rotating gradient border */}
          <div
            className="absolute inset-0 rounded-2xl qe-anim"
            style={{
              background: 'conic-gradient(from 0deg, #a855f740 0%, #a855f7 10%, #6366f1 20%, #a855f740 35%, transparent 45%, transparent 55%, #f59e0b40 65%, #f59e0b 75%, #a855f7 85%, #a855f740 100%)',
              animation: 'spin 8s linear infinite',
              opacity: 0.5,
            }}
          />
          {/* Glow pulse behind border */}
          <div
            className="absolute inset-0 rounded-2xl blur-md qe-anim"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0%, #a855f750 20%, transparent 40%, transparent 60%, #f59e0b40 80%, transparent 100%)',
              animation: 'spin 8s linear infinite',
              opacity: 0.3,
            }}
          />
          <button
            onClick={() => navigate('/dashboard/quick-edit')}
            className="relative w-full rounded-2xl bg-[#0a0f1e] p-6 sm:p-8 transition-all duration-300 overflow-hidden"
          >
            {/* Shimmer sweep moving toward the arrow */}
            <div
              className="absolute inset-0 opacity-20 qe-anim"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, transparent 40%, rgba(168,85,247,0.12) 50%, rgba(99,102,241,0.08) 60%, transparent 70%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 4s ease-in-out infinite',
              }}
            />
            <div className="relative flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                  <div
                    className="absolute inset-0 rounded-2xl bg-purple-500/20 blur-lg qe-anim"
                    style={{ animation: 'pulse-glow 3s ease-in-out infinite' }}
                  />
                  <Sparkles className="relative w-6 h-6 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white">Quick Edit</h3>
                  <p className="text-sm text-slate-400 mt-0.5">Paste a link, upload, or generate with AI — thumbnail in 60 seconds</p>
                </div>
              </div>
              <ChevronRight
                className="w-5 h-5 text-purple-400 flex-shrink-0 qe-anim"
                style={{ animation: 'nudge-right 2.5s ease-in-out infinite' }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Quick Edit banner animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes nudge-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        .qe-banner:hover .qe-anim {
          animation-play-state: paused !important;
        }
      `}</style>

      {/* Generate Thumbnail Box */}
      <div className="mb-8">
        <div className="relative">
          <div className="absolute inset-0 -top-8 mx-auto h-56 max-w-5xl rounded-[28px] bg-gradient-to-r from-blue-500/15 via-sky-500/10 to-indigo-500/15 blur-3xl"></div>

          <div 
            className={`sm:p-8 shadow-black/40 bg-[#020818] border-slate-800 border ring-slate-900/80 ring-1 rounded-2xl p-6 relative shadow-xl backdrop-blur transition-all duration-300 ${mainDragActive ? 'border-blue-500 ring-blue-500/50 bg-blue-500/5' : ''}`}
            onDragOver={(e) => handleDragOver(e, setMainDragActive)}
            onDragLeave={(e) => handleDragLeave(e, setMainDragActive)}
            onDrop={handleMainDrop}
          >
            {/* Drag overlay */}
            {mainDragActive && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/90 rounded-2xl border-2 border-dashed border-blue-500">
                <div className="text-center">
                  <Upload className="w-12 h-12 mx-auto text-blue-400 mb-3" />
                  <p className="text-lg font-medium text-blue-400">Drop your image here</p>
                  <p className="text-sm text-slate-400 mt-1">Supports JPG, PNG, GIF up to 10MB</p>
                </div>
              </div>
            )}

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

            {/* Uploaded file preview */}
            {uploadedFile && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50 flex items-center gap-4">
                {uploadedFile.preview && (
                  <img src={uploadedFile.preview} alt="Preview" className="w-16 h-12 object-cover rounded-lg" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(uploadedFile.size)}</p>
                </div>
                <Tooltip content="Remove file">
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
                </Tooltip>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/50">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-400">Reading file...</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Row 1: Include Face | Upload | See Example */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              {/* Left Button - Include Face */}
              <button 
                onClick={() => setShowFaceModal(true)}
                className={`w-full sm:w-auto px-6 py-3 rounded-xl border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  includeFace 
                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700' 
                    : 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-slate-800 hover:border-slate-700'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                Include Face {includeFace && '✓'}
              </button>

              {/* Center: Upload */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-sm font-medium text-slate-100 hover:from-slate-800 hover:to-slate-700 hover:border-slate-500 shadow-lg shadow-black/40 transition-all flex items-center justify-center gap-2 group"
              >
                <UploadCloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
                Upload
              </button>

              {/* Right Button - See Example */}
              <button
                onClick={() => setShowExampleModal(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2 group"
              >
                See Example
                <Image className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            {/* Row 2: Animated Platform Link Input */}
            <div className="mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg group-hover:bg-blue-500/30 transition-all opacity-0 group-hover:opacity-100"></div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={currentPlatform.placeholder}
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
        </div>
      </div>

      {/* Editor Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard/editor')}
          className="group relative rounded-xl border border-slate-700/60 bg-[#0a0f1e] p-5 text-left transition-all duration-200 hover:border-blue-500/50 hover:bg-[#0d1224]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <PenTool className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Canvas Editor</h4>
              <p className="text-xs text-slate-400 mt-0.5">Full editor with layers, text, shapes, and effects</p>
            </div>
          </div>
        </button>
        <button
          onClick={() => navigate('/dashboard/video-editor')}
          className="group relative rounded-xl border border-slate-700/60 bg-[#0a0f1e] p-5 text-left transition-all duration-200 hover:border-emerald-500/50 hover:bg-[#0d1224]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <Video className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Video Editor</h4>
              <p className="text-xs text-slate-400 mt-0.5">Extract frames, analyze with AI, and create from video</p>
            </div>
          </div>
        </button>
      </div>

      {/* Review Prompt Card — dismissible per session */}
      {reviewPromptVisible && (
        <div className="mb-6 relative overflow-hidden rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 via-transparent to-yellow-500/5 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">Enjoying ThumPiks?</p>
              <p className="text-xs text-slate-400 mt-0.5">Your honest review helps other creators discover us</p>
            </div>
            <button
              onClick={() => navigate('/reviews')}
              className="flex-shrink-0 px-4 py-2 rounded-lg bg-yellow-500/15 text-yellow-400 text-sm font-medium hover:bg-yellow-500/25 transition-colors"
            >
              Leave a Review
            </button>
            <Tooltip content="Dismiss">
            <button
              onClick={() => {
                sessionStorage.setItem('reviewPromptDismissed', 'true');
                setReviewPromptVisible(false);
              }}
              className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
              aria-label="Dismiss review prompt"
            >
              <X className="w-4 h-4" />
            </button>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Face Inclusion Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-slate-50">Include Face in Thumbnail</h3>
              <button
                onClick={() => setShowFaceModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Current face preview */}
            {faceImage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/50">
                <div className="flex items-center gap-4">
                  <img src={faceImage} alt="Face" className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{faceFileName}</p>
                    <p className="text-xs text-emerald-400 mt-1">Face selected</p>
                  </div>
                  <button
                    onClick={() => {
                      setFaceImage(null);
                      setFaceFileName(null);
                      setIncludeFace(false);
                    }}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                faceDragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 hover:border-slate-600 hover:bg-slate-900/50'
              }`}
              onDragOver={(e) => handleDragOver(e, setFaceDragActive)}
              onDragLeave={(e) => handleDragLeave(e, setFaceDragActive)}
              onDrop={handleFaceDrop}
              onClick={() => faceFileInputRef.current?.click()}
            >
              <Upload className="w-10 h-10 mx-auto text-slate-500 mb-3" />
              <p className="text-sm font-medium text-slate-300 mb-1">Drop your face image here</p>
              <p className="text-xs text-slate-500">or click to browse</p>
            </div>

            {/* Confirm button */}
            <button
              onClick={() => setShowFaceModal(false)}
              className="w-full mt-6 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
            >
              {faceImage ? 'Confirm Selection' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* See Example Modal - YouTube Thumbnail Size (1280x720) */}
      {showExampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-6 max-w-4xl w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-50">Thumbnail Examples</h3>
                <p className="text-sm text-slate-400 mt-1">YouTube Standard Size: 1280 × 720px (16:9)</p>
              </div>
              <button
                onClick={() => setShowExampleModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Main carousel - YouTube 16:9 aspect ratio */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 mb-4 max-w-[1280px] mx-auto">
              <img
                src={exampleThumbnails[currentExampleIndex].image}
                alt={exampleThumbnails[currentExampleIndex].title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <span className="px-2 py-1 rounded bg-blue-500/80 text-xs font-medium text-white">
                  {exampleThumbnails[currentExampleIndex].category}
                </span>
                <h4 className="text-lg font-semibold text-white mt-2">
                  {exampleThumbnails[currentExampleIndex].title}
                </h4>
              </div>

              {/* Navigation arrows */}
              <button
                onClick={() => setCurrentExampleIndex((prev) => (prev === 0 ? exampleThumbnails.length - 1 : prev - 1))}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => setCurrentExampleIndex((prev) => (prev === exampleThumbnails.length - 1 ? 0 : prev + 1))}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {exampleThumbnails.map((thumb, index) => (
                <button
                  key={thumb.id}
                  onClick={() => setCurrentExampleIndex(index)}
                  className={`flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentExampleIndex
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : 'border-transparent hover:border-slate-600'
                  }`}
                >
                  <img src={thumb.image} alt={thumb.title} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Counter */}
            <p className="text-center text-sm text-slate-400 mt-4">
              {currentExampleIndex + 1} / {exampleThumbnails.length}
            </p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300 relative">
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

            {successData.thumbnailUrl && (
              <div className="mb-6">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shadow-lg">
                  <img
                    src={successData.thumbnailUrl}
                    alt="Generated Thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"%3E%3Crect fill="%231e293b" width="1280" height="720"/%3E%3Ctext fill="%2394a3b8" font-family="Arial" font-size="24" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EThumbnail Preview%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Action Bar */}
            {successData.thumbnailUrl && (
              <div className="mb-6">
                <ThumbnailActionBar
                  context={{
                    imageUrl: successData.thumbnailUrl,
                    imageId: successData.thumbnailId,
                    sourceSettings: {
                      videoUrl: videoLink || undefined,
                      includeFace,
                    },
                  }}
                  visibleActions={['edit', 'download', 'regenerate', 'recreateBetter']}
                  variant="horizontal"
                />
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

      {/* Recreate Better Modal */}
      <RecreateBetterModal />

      {/* Pending Thumbnail Result Modal */}
      <ThumbnailResultModal
        isOpen={showPendingThumbnailModal}
        onClose={() => {
          setShowPendingThumbnailModal(false);
          clearPendingThumbnail(); // Clear from localStorage when closed
          setPendingThumbnailData(null);
        }}
        thumbnailUrl={pendingThumbnailData?.thumbnailUrl || ''}
        thumbnailId={pendingThumbnailData?.thumbnailId}
        videoTitle={pendingThumbnailData?.videoTitle}
        creditCost={pendingThumbnailData?.creditCost || 1}
        onGenerateAnother={() => {
          setShowPendingThumbnailModal(false);
          clearPendingThumbnail();
          setPendingThumbnailData(null);
          // Scroll to the generate section
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Dashboard Widgets Section */}
      <div className="mt-16 space-y-6">
        {/* Top row: Projects + Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ProjectsAndUploadsWidget />
          </div>
          <div>
            <StorageIndicator />
          </div>
        </div>

        {/* Bottom row: Recent Thumbnails + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <RecentThumbnailsWidget />
          <StatsWidget />
        </div>
      </div>
    </>
  );
};

export default DashboardHome;
