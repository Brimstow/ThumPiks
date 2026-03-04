import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, UploadCloud, Link2, Image, UserPlus, AlertCircle, Loader2, CheckCircle, X, Upload, FolderOpen, Cloud, Scan, ChevronLeft, ChevronRight, PenTool, Video } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogleDrive } from '@fortawesome/free-brands-svg-icons';
import { API_BASE_URL, IS_DEVELOPMENT } from '../../config/environment';
import { useNavigate } from 'react-router-dom';
import { AllProjectsWidget, RecentThumbnailsWidget, StatsWidget, StorageIndicator } from './widgets';
import { authPost } from '../../utils/api';
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

// Mock Google Drive files
const mockGoogleDriveFiles = [
  { id: 'g1', name: 'profile-photo.jpg', type: 'image/jpeg', size: 245000, icon: '🖼️' },
  { id: 'g2', name: 'brand-logo.png', type: 'image/png', size: 89000, icon: '🖼️' },
  { id: 'g3', name: 'headshot-2024.jpg', type: 'image/jpeg', size: 512000, icon: '🖼️' },
  { id: 'g4', name: 'team-photo.png', type: 'image/png', size: 1200000, icon: '🖼️' },
];

// Mock iCloud files
const mockICloudFiles = [
  { id: 'i1', name: 'vacation-portrait.heic', type: 'image/heic', size: 3200000, icon: '🖼️' },
  { id: 'i2', name: 'selfie.jpg', type: 'image/jpeg', size: 1800000, icon: '🖼️' },
  { id: 'i3', name: 'avatar.png', type: 'image/png', size: 156000, icon: '🖼️' },
  { id: 'i4', name: 'photo-library-export.jpg', type: 'image/jpeg', size: 890000, icon: '🖼️' },
];

const DashboardHome: React.FC = () => {
  const navigate = useNavigate();
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceFileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [videoLink, setVideoLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeFace, setIncludeFace] = useState(false);
  const [successData, setSuccessData] = useState<GenerateThumbnailResponse | null>(null);
  
  // Modal states
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showAppleModal, setShowAppleModal] = useState(false);
  const [showExampleModal, setShowExampleModal] = useState(false);
  
  // Face inclusion states
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [faceFileName, setFaceFileName] = useState<string | null>(null);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  const [faceDragActive, setFaceDragActive] = useState(false);
  
  // Upload states
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [mainDragActive, setMainDragActive] = useState(false);
  
  // Cloud integration states
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Example modal state
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
  
  // Platform typing animation state
  const [currentPlatformIndex, setCurrentPlatformIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  
  const currentPlatform = platforms[currentPlatformIndex];

  // Check for pending video link from landing page
  useEffect(() => {
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
        setShowGoogleDriveModal(false);
        setShowAppleModal(false);
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
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setTimeout(() => {
        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          preview: e.target?.result as string,
        });
        setIsUploading(false);
        setUploadProgress(0);
        clearInterval(interval);
      }, 1000);
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
      setFaceImage(e.target?.result as string);
      setFaceFileName(file.name);
      setIncludeFace(true);
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

  // AI Face detection mock
  const handleAIFaceDetection = useCallback(() => {
    setIsDetectingFace(true);
    setTimeout(() => {
      setIsDetectingFace(false);
      // Mock detected face
      setFaceImage('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face');
      setFaceFileName('AI Detected Face');
      setIncludeFace(true);
    }, 2000);
  }, []);

  // Mock Google Drive OAuth
  const handleGoogleDriveConnect = useCallback(() => {
    setIsConnecting(true);
    setTimeout(() => {
      setGoogleDriveConnected(true);
      setIsConnecting(false);
    }, 1500);
  }, []);

  // Mock Apple OAuth
  const handleAppleConnect = useCallback(() => {
    setIsConnecting(true);
    setTimeout(() => {
      setAppleConnected(true);
      setIsConnecting(false);
    }, 1500);
  }, []);

  // Select file from cloud
  const handleSelectCloudFile = useCallback((file: typeof mockGoogleDriveFiles[0], source: 'google' | 'apple') => {
    setFaceImage(`https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face`);
    setFaceFileName(`${file.name} (${source === 'google' ? 'Google Drive' : 'iCloud'})`);
    setIncludeFace(true);
    setShowGoogleDriveModal(false);
    setShowAppleModal(false);
  }, []);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
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
                <button
                  onClick={() => setUploadedFile(null)}
                  className="p-1 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}

            {/* Upload progress */}
            {isUploading && (
              <div className="mb-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/50">
                <div className="flex items-center gap-3 mb-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-400">Uploading...</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Row 1: Include Face | Google + Upload + Apple | See Example */}
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

              {/* Center: Upload with Google/Apple flanking */}
              <div className="flex items-center justify-center">
                <div className="relative w-64 h-24">
                  {/* Center: Upload */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 m-auto w-40 h-24 px-6 py-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 text-sm font-medium text-slate-100 hover:from-slate-800 hover:to-slate-700 hover:border-slate-500 shadow-lg shadow-black/40 transition-all flex flex-col items-center justify-center gap-2 group"
                  >
                    <UploadCloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Upload
                  </button>

                  {/* Left: Google Drive */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12">
                    <button
                      onClick={() => setShowGoogleDriveModal(true)}
                      className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center hover:border-blue-500 hover:bg-slate-900 transition-all group"
                    >
                      <FontAwesomeIcon icon={faGoogleDrive} className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </button>
                    <p className="text-xs text-center mt-1 text-slate-500">Google</p>
                  </div>

                  {/* Right: Apple Drive */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12">
                    <button
                      onClick={() => setShowAppleModal(true)}
                      className="flex hover:border-slate-500 hover:bg-slate-900 transition-all bg-slate-950 w-16 h-16 border-slate-800 border rounded-lg items-center justify-center group"
                    >
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5 text-slate-300 group-hover:text-slate-100 transition-colors"
                      >
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.99 3.91-.99 1.832 0 2.35.99 3.96.958 1.637-.033 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.666.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"></path>
                      </svg>
                    </button>
                    <p className="text-xs text-center mt-1 text-slate-500">Apple</p>
                  </div>
                </div>
              </div>

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

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-slate-800"></div>
              <span className="text-xs text-slate-500 font-medium">OR</span>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>

            {/* AI Detection */}
            <button
              onClick={handleAIFaceDetection}
              disabled={isDetectingFace}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isDetectingFace ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Detecting Face...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  Auto-Detect Face with AI
                </>
              )}
            </button>

            {/* Cloud options */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => {
                  setShowFaceModal(false);
                  setShowGoogleDriveModal(true);
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faGoogleDrive} className="w-4 h-4" />
                Google Drive
              </button>
              <button
                onClick={() => {
                  setShowFaceModal(false);
                  setShowAppleModal(true);
                }}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                iCloud
              </button>
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

      {/* Google Drive Modal */}
      {showGoogleDriveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faGoogleDrive} className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-semibold text-slate-50">Google Drive</h3>
              </div>
              <button
                onClick={() => setShowGoogleDriveModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!googleDriveConnected ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <FontAwesomeIcon icon={faGoogleDrive} className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="text-lg font-medium text-slate-200 mb-2">Connect Google Drive</h4>
                <p className="text-sm text-slate-400 mb-6">Sign in to access your Google Drive files</p>
                <button
                  onClick={handleGoogleDriveConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-60"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faGoogleDrive} className="w-4 h-4" />
                      Sign in with Google
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Connected to Google Drive
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mockGoogleDriveFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectCloudFile(file, 'google')}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3 text-left"
                    >
                      <span className="text-2xl">{file.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                      <FolderOpen className="w-4 h-4 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apple iCloud Modal */}
      {showAppleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#020818] border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Cloud className="w-6 h-6 text-slate-300" />
                <h3 className="text-xl font-semibold text-slate-50">iCloud Drive</h3>
              </div>
              <button
                onClick={() => setShowAppleModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {!appleConnected ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-slate-300">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.99 3.91-.99 1.832 0 2.35.99 3.96.958 1.637-.033 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.666.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"></path>
                  </svg>
                </div>
                <h4 className="text-lg font-medium text-slate-200 mb-2">Connect iCloud Drive</h4>
                <p className="text-sm text-slate-400 mb-6">Sign in with your Apple ID to access iCloud files</p>
                <button
                  onClick={handleAppleConnect}
                  disabled={isConnecting}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-60"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.99 3.91-.99 1.832 0 2.35.99 3.96.958 1.637-.033 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.666.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"></path>
                      </svg>
                      Sign in with Apple
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  Connected to iCloud Drive
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mockICloudFiles.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleSelectCloudFile(file, 'apple')}
                      className="w-full p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-3 text-left"
                    >
                      <span className="text-2xl">{file.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                      <FolderOpen className="w-4 h-4 text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}
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

      {/* Dashboard Widgets Section */}
      <div className="mt-16 space-y-6">
        {/* Top row: Projects + Storage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <AllProjectsWidget />
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
