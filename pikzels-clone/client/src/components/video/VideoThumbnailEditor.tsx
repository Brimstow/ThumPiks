/**
 * VideoThumbnailEditor Component
 * Professional video editor for thumbnail frame extraction
 * 
 * Architecture:
 * - Functional composition with custom hooks
 * - Observer pattern for video state management
 * - Strategy pattern for frame analysis algorithms
 * - Command pattern for undo/redo operations
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Rewind,
  FastForward,
  Camera,
  ChevronLeft,
  ChevronRight,
  Zap,
  Activity,
  Star,
  Download,
  Grid3x3,
  Film,
  Link,
  Upload,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  detectPlatformLocally,
  isDirectVideoUrl,
  getPlatformLabel,
  getVideoSrcUrl,
  fetchVideoInfo,
  type VideoUrlInfo,
} from '../../services/videoUrlService';
import { useVideoExtractorStore } from '../../stores/videoExtractorStore';

// ============================================================================
// Type Definitions (Algebraic Data Types)
// ============================================================================

interface TimePosition {
  readonly seconds: number;
  readonly frame: number;
}

interface MarkerPoint extends TimePosition {
  readonly id: string;
  readonly type: 'in' | 'out' | 'key';
  readonly label?: string;
}

interface ExtractedFrame {
  readonly id: string;
  readonly timestamp: TimePosition;
  readonly dataUrl: string;
  readonly qualityScore: number;
  readonly aiAnalysis: FrameAnalysis;
  readonly starred: boolean;
}

interface FrameAnalysis {
  readonly sharpness: number;
  readonly brightness: number;
  readonly contrast: number;
  readonly faceDetected: boolean;
  readonly textDetected: boolean;
  readonly actionScore: number;
}

interface VideoMetadata {
  readonly duration: number;
  readonly fps: number;
  readonly width: number;
  readonly height: number;
  readonly frameCount: number;
}

// ============================================================================
// Pure Functional Utilities
// ============================================================================

const formatTimecode = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const secondsToFrame = (seconds: number, fps: number): number => 
  Math.floor(seconds * fps);

const frameToSeconds = (frame: number, fps: number): number => 
  frame / fps;

// Frame quality analysis using computer vision heuristics
const analyzeFrame = (canvas: HTMLCanvasElement): FrameAnalysis => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { sharpness: 0, brightness: 0, contrast: 0, faceDetected: false, textDetected: false, actionScore: 0 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Calculate brightness and contrast
  let totalBrightness = 0;
  let minBrightness = 255;
  let maxBrightness = 0;

  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    totalBrightness += brightness;
    minBrightness = Math.min(minBrightness, brightness);
    maxBrightness = Math.max(maxBrightness, brightness);
  }

  const avgBrightness = totalBrightness / (data.length / 4);
  const contrast = maxBrightness - minBrightness;

  // Sharpness estimation using edge detection (simplified Laplacian)
  let edgeStrength = 0;
  const width = canvas.width;
  const height = canvas.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const center = data[idx];
      const neighbors = [
        data[((y - 1) * width + x) * 4],
        data[((y + 1) * width + x) * 4],
        data[(y * width + (x - 1)) * 4],
        data[(y * width + (x + 1)) * 4],
      ];
      const laplacian = Math.abs(4 * center - neighbors.reduce((a, b) => a + b, 0));
      edgeStrength += laplacian;
    }
  }

  const sharpness = Math.min(100, (edgeStrength / (width * height)) / 10);

  return {
    sharpness: Math.round(sharpness),
    brightness: Math.round((avgBrightness / 255) * 100),
    contrast: Math.round((contrast / 255) * 100),
    faceDetected: false, // Would integrate with face detection API
    textDetected: false, // Would integrate with OCR API
    actionScore: Math.round(sharpness * 0.7 + contrast * 0.3), // Heuristic
  };
};

// ============================================================================
// Custom Hooks (Higher-Order Functions)
// ============================================================================

const useVideoState = (videoRef: React.RefObject<HTMLVideoElement | null>, videoSrc: string) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setMetadata({
        duration: video.duration,
        fps: 30, // Approximate, would need actual detection
        width: video.videoWidth,
        height: video.videoHeight,
        frameCount: Math.floor(video.duration * 30),
      });
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleRateChange = () => setPlaybackRate(video.playbackRate);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ratechange', handleRateChange);

    // If metadata already loaded before listeners were attached
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [videoRef, videoSrc]);

  return { isPlaying, currentTime, duration, playbackRate, metadata };
};

const useKeyboardControls = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  handlers: {
    onExtract: () => void;
    onMarkIn: () => void;
    onMarkOut: () => void;
  }
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - (e.shiftKey ? 5 : 1 / 30));
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + (e.shiftKey ? 5 : 1 / 30));
          break;
        case 'i':
          e.preventDefault();
          handlers.onMarkIn();
          break;
        case 'o':
          e.preventDefault();
          handlers.onMarkOut();
          break;
        case 'c':
          e.preventDefault();
          handlers.onExtract();
          break;
        case 'j':
          e.preventDefault();
          video.playbackRate = Math.max(0.25, video.playbackRate - 0.25);
          break;
        case 'k':
          e.preventDefault();
          video.pause();
          break;
        case 'l':
          e.preventDefault();
          video.playbackRate = Math.min(2, video.playbackRate + 0.25);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [videoRef, handlers]);
};

// ============================================================================
// Main Component
// ============================================================================

interface VideoThumbnailEditorProps {
  videoUrl?: string;
  onFramesExtracted?: (frames: ExtractedFrame[]) => void;
  onClose?: () => void;
}

export const VideoThumbnailEditor: React.FC<VideoThumbnailEditorProps> = ({
  videoUrl,
  onFramesExtracted,
  onClose,
}) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Persisted state from store (shared with VideoFrameExtractor)
  const {
    sourceTab: inputMode,
    setSourceTab: setInputMode,
    urlInput,
    setUrlInput,
    videoSrc: storedVideoSrc,
    setVideoLoaded,
    extractedFrames: storedFrames,
    addExtractedFrame,
    clearVideo,
  } = useVideoExtractorStore();
  
  // Local video source (initialize from store or prop)
  const [videoSrc, setVideoSrc] = useState<string>(videoUrl || storedVideoSrc || '');
  
  // Local transient state (UI-specific, doesn't need persistence)
  const [videoInfo, setVideoInfo] = useState<VideoUrlInfo | null>(null);
  const [markers, setMarkers] = useState<MarkerPoint[]>([]);
  const [localExtractedFrames, setLocalExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(false);
  const [autoAnalyzeMode, setAutoAnalyzeMode] = useState(false);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  
  // Sync local video source with store when it changes
  useEffect(() => {
    if (storedVideoSrc && storedVideoSrc !== videoSrc) {
      setVideoSrc(storedVideoSrc);
    }
  }, [storedVideoSrc]);
  
  // Convert stored frames to local format on mount
  useEffect(() => {
    if (storedFrames.length > 0 && localExtractedFrames.length === 0) {
      const converted: ExtractedFrame[] = storedFrames.map((sf, idx) => ({
        id: `stored-frame-${idx}-${sf.timestamp}`,
        timestamp: {
          seconds: sf.timestamp,
          frame: Math.floor(sf.timestamp * 30), // Approximate 30fps
        },
        dataUrl: sf.dataUrl,
        qualityScore: 0, // Not stored, default
        aiAnalysis: {
          sharpness: 0,
          brightness: 0,
          contrast: 0,
          faceDetected: false,
          textDetected: false,
          actionScore: 0,
        },
        starred: false,
      }));
      setLocalExtractedFrames(converted);
    }
  }, [storedFrames]);

  // Custom hooks
  const { isPlaying, currentTime, duration, playbackRate, metadata } = useVideoState(videoRef, videoSrc);

  // Playback controls (Pure functions wrapped in useCallback)
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  }, []);

  const seek = useCallback((time: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, time));
  }, [duration]);

  const stepFrame = useCallback((direction: 1 | -1) => {
    if (!videoRef.current || !metadata) return;
    const frameTime = 1 / metadata.fps;
    seek(currentTime + (direction * frameTime));
  }, [currentTime, metadata, seek]);

  const setSpeed = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
  }, []);

  // Marker management
  const addMarker = useCallback((type: MarkerPoint['type']) => {
    const newMarker: MarkerPoint = {
      id: `marker-${Date.now()}`,
      seconds: currentTime,
      frame: metadata ? secondsToFrame(currentTime, metadata.fps) : 0,
      type,
      label: `${type.toUpperCase()} - ${formatTimecode(currentTime)}`,
    };
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.seconds - b.seconds));
  }, [currentTime, metadata]);

  // Frame extraction (Pure function with side effects properly isolated)
  const extractCurrentFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !metadata) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Analyze frame quality
    const analysis = analyzeFrame(canvas);
    const qualityScore = Math.round(
      (analysis.sharpness * 0.4 +
        analysis.contrast * 0.3 +
        analysis.actionScore * 0.3)
    );

    const newFrame: ExtractedFrame = {
      id: `frame-${Date.now()}`,
      timestamp: {
        seconds: currentTime,
        frame: secondsToFrame(currentTime, metadata.fps),
      },
      dataUrl,
      qualityScore,
      aiAnalysis: analysis,
      starred: false,
    };

    // Add to local state for UI
    setLocalExtractedFrames(prev => [...prev, newFrame].sort((a, b) => a.timestamp.seconds - b.timestamp.seconds));
    
    // Sync to store for persistence (shared with VideoFrameExtractor)
    addExtractedFrame({
      timestamp: currentTime,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      blob: new Blob(), // Placeholder - store uses dataUrl
    });
  }, [currentTime, metadata, addExtractedFrame]);

  // Auto-analyze: Extract frames at key moments
  const autoAnalyzeVideo = useCallback(async () => {
    if (!videoRef.current || !metadata) return;
    
    setAutoAnalyzeMode(true);
    const samplePoints = 20; // Extract 20 frames
    const interval = duration / samplePoints;

    for (let i = 0; i < samplePoints; i++) {
      const time = i * interval;
      seek(time);
      // Wait for seek to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      await extractCurrentFrame();
    }
    
    setAutoAnalyzeMode(false);
  }, [duration, metadata, seek, extractCurrentFrame]);

  // Toggle frame selection
  const toggleFrameSelection = useCallback((frameId: string) => {
    setSelectedFrames(prev => {
      const next = new Set(prev);
      if (next.has(frameId)) {
        next.delete(frameId);
      } else {
        next.add(frameId);
      }
      return next;
    });
  }, []);

  // Star frame
  const toggleFrameStar = useCallback((frameId: string) => {
    setLocalExtractedFrames(prev =>
      prev.map(f => f.id === frameId ? { ...f, starred: !f.starred } : f)
    );
  }, []);

  // Export selected frames
  const exportFrames = useCallback(() => {
    const selected = localExtractedFrames.filter(f => selectedFrames.has(f.id));
    if (onFramesExtracted) {
      onFramesExtracted(selected);
    }
  }, [localExtractedFrames, selectedFrames, onFramesExtracted]);

  // Keyboard controls
  useKeyboardControls(videoRef, {
    onExtract: extractCurrentFrame,
    onMarkIn: () => addMarker('in'),
    onMarkOut: () => addMarker('out'),
  });

  // File upload handler
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoInfo(null);
    setUrlError(null);
    // Sync to store
    setVideoLoaded(true, url, null);
  }, [setVideoLoaded]);

  // URL load handler
  const handleUrlLoad = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setUrlError(null);
    setUrlLoading(true);

    try {
      const detected = detectPlatformLocally(trimmed);
      const isDirect = isDirectVideoUrl(trimmed);

      if (!detected && !isDirect) {
        setUrlError('Unsupported URL. Paste a YouTube, TikTok, Vimeo, or direct video URL.');
        setUrlLoading(false);
        return;
      }

      const info = await fetchVideoInfo(trimmed);
      if (!info.supported) {
        setUrlError('This URL is not supported or the video is unavailable.');
        setUrlLoading(false);
        return;
      }

      const src = getVideoSrcUrl(trimmed);
      setVideoInfo(info);
      setVideoSrc(src);
      setUrlError(null);
      // Sync to store
      setVideoLoaded(true, src, null);
    } catch {
      setUrlError('Failed to load video. Check the URL and try again.');
    } finally {
      setUrlLoading(false);
    }
  }, [urlInput, setVideoLoaded]);

  // Computed values
  const currentFrame = useMemo(
    () => metadata ? secondsToFrame(currentTime, metadata.fps) : 0,
    [currentTime, metadata]
  );

  const progressPercentage = useMemo(
    () => duration > 0 ? (currentTime / duration) * 100 : 0,
    [currentTime, duration]
  );

  return (
    <div className="flex flex-col bg-slate-950 text-slate-100" style={{ height: 'calc(100vh - 116px)' }}>
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <Film className="w-5 h-5 text-blue-400" />
          <h1 className="text-lg font-semibold">Video Thumbnail Editor</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showGrid
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Player */}
          <div className="flex-1 min-h-0 flex items-center justify-center bg-black relative overflow-hidden">
            {!videoSrc ? (
              <div className="w-full max-w-lg px-6">
                {/* Tab switcher */}
                <div className="flex rounded-xl bg-slate-800/60 p-1 mb-6">
                  <button
                    onClick={() => { setInputMode('file'); setUrlError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === 'file'
                        ? 'bg-slate-700 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload File
                  </button>
                  <button
                    onClick={() => { setInputMode('url'); setUrlError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputMode === 'url'
                        ? 'bg-slate-700 text-slate-100'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Link className="w-4 h-4" />
                    Video URL
                  </button>
                </div>

                {inputMode === 'file' ? (
                  <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-700 rounded-xl cursor-pointer hover:border-blue-500/60 hover:bg-blue-500/5 transition-all group">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Film className="w-10 h-10 text-slate-600 group-hover:text-blue-400 mb-3 transition-colors" />
                    <span className="text-slate-400 group-hover:text-slate-200 font-medium transition-colors">
                      Click to upload a video file
                    </span>
                    <span className="text-slate-600 text-xs mt-1">MP4, WebM, MOV, AVI supported</span>
                  </label>
                ) : (
                  <div className="space-y-3">
                    <p className="text-slate-400 text-sm text-center mb-4">
                      Paste a video URL to load and extract frames
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUrlLoad()}
                        placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
                        className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30"
                        autoFocus
                      />
                      <button
                        onClick={handleUrlLoad}
                        disabled={urlLoading || !urlInput.trim()}
                        className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center gap-2 whitespace-nowrap"
                      >
                        {urlLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Link className="w-4 h-4" />
                        )}
                        {urlLoading ? 'Loading…' : 'Load'}
                      </button>
                    </div>
                    {urlError && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{urlError}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {['YouTube', 'TikTok', 'Vimeo', 'Direct MP4'].map(p => (
                        <span key={p} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 text-xs border border-slate-700">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="max-w-full max-h-full"
                  preload="metadata"
                  crossOrigin="anonymous"
                />
                {/* Change source button */}
                <button
                  onClick={() => { 
                    setVideoSrc(''); 
                    setVideoInfo(null); 
                    setUrlInput(''); 
                    setUrlError(null);
                    // Clear store state
                    clearVideo();
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/60 text-slate-400 hover:text-slate-100 hover:bg-black/80 transition-colors"
                  title="Change video"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Timecode Overlay */}
            {videoSrc && (
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur font-mono text-sm">
                {formatTimecode(currentTime)}
              </div>
            )}

            {/* Video info badge (URL mode) */}
            {videoSrc && videoInfo?.title && (
              <div className="absolute bottom-3 left-3 right-12 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur text-xs text-slate-300 truncate">
                {getPlatformLabel(videoInfo.platform)} · {videoInfo.title}
              </div>
            )}
          </div>

          {/* Timeline */}
          {videoSrc && (
            <div className="p-4 bg-slate-900/50 border-t border-slate-800">
              <div className="space-y-2">
                {/* Progress bar */}
                <div
                  ref={timelineRef}
                  className="relative h-12 bg-slate-800 rounded-lg cursor-pointer overflow-hidden group"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = x / rect.width;
                    seek(percentage * duration);
                  }}
                >
                  {/* Progress fill */}
                  <div
                    className="absolute inset-y-0 left-0 bg-blue-500/30 transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />

                  {/* Markers */}
                  {markers.map(marker => (
                    <div
                      key={marker.id}
                      className="absolute top-0 bottom-0 w-0.5"
                      style={{ left: `${(marker.seconds / duration) * 100}%` }}
                    >
                      <div className={`w-2 h-2 rounded-full -ml-1 ${
                        marker.type === 'in' ? 'bg-green-500' :
                        marker.type === 'out' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                    </div>
                  ))}

                  {/* Playhead */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-blue-400 transition-all"
                    style={{ left: `${progressPercentage}%` }}
                  >
                    <div className="w-3 h-3 rounded-full bg-blue-400 -ml-1.5 -mt-1" />
                  </div>

                  {/* Hover time indicator */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>

                {/* Info bar */}
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span>Frame: {currentFrame}</span>
                    <span>Duration: {formatTimecode(duration)}</span>
                    <span>FPS: {metadata?.fps || 30}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Speed: {playbackRate}x</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          {videoSrc && (
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <div className="flex items-center justify-center gap-2">
                {/* Frame step back */}
                <button
                  onClick={() => stepFrame(-1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Previous Frame (←)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Skip back */}
                <button
                  onClick={() => seek(currentTime - 5)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Skip Back 5s"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                {/* Slow motion */}
                <button
                  onClick={() => setSpeed(0.25)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Slow Motion (J)"
                >
                  <Rewind className="w-5 h-5" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={togglePlayPause}
                  className="p-3 rounded-xl bg-blue-500 hover:bg-blue-600 transition-colors"
                  title="Play/Pause (Space)"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>

                {/* Fast forward */}
                <button
                  onClick={() => setSpeed(2)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Fast Forward (L)"
                >
                  <FastForward className="w-5 h-5" />
                </button>

                {/* Skip forward */}
                <button
                  onClick={() => seek(currentTime + 5)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Skip Forward 5s"
                >
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Frame step forward */}
                <button
                  onClick={() => stepFrame(1)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                  title="Next Frame (→)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="w-px h-8 bg-slate-700 mx-2" />

                {/* Mark In */}
                <button
                  onClick={() => addMarker('in')}
                  className="px-3 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors text-sm font-medium"
                  title="Mark In Point (I)"
                >
                  Mark In
                </button>

                {/* Mark Out */}
                <button
                  onClick={() => addMarker('out')}
                  className="px-3 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium"
                  title="Mark Out Point (O)"
                >
                  Mark Out
                </button>

                <div className="w-px h-8 bg-slate-700 mx-2" />

                {/* Extract Frame */}
                <button
                  onClick={extractCurrentFrame}
                  className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-colors text-sm font-semibold flex items-center gap-2"
                  title="Capture Frame (C)"
                >
                  <Camera className="w-4 h-4" />
                  Capture
                </button>

                {/* Auto Analyze */}
                <button
                  onClick={autoAnalyzeVideo}
                  disabled={autoAnalyzeMode}
                  className="px-4 py-2 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Auto-analyze video for best frames"
                >
                  <Zap className="w-4 h-4" />
                  {autoAnalyzeMode ? 'Analyzing...' : 'Auto Analyze'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Extracted Frames */}
        {videoSrc && (
          <div className="w-80 border-l border-slate-800 bg-slate-900/30 flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  Extracted Frames
                </h2>
                <span className="text-xs text-slate-500">{localExtractedFrames.length} frames</span>
              </div>
              {selectedFrames.size > 0 && (
                <button
                  onClick={exportFrames}
                  className="w-full px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export {selectedFrames.size} Frame{selectedFrames.size > 1 ? 's' : ''}
                </button>
              )}
            </div>

            {/* Frame List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {localExtractedFrames.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  No frames captured yet
                </div>
              ) : (
                localExtractedFrames.map(frame => (
                  <div
                    key={frame.id}
                    className={`group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedFrames.has(frame.id)
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => toggleFrameSelection(frame.id)}
                  >
                    {/* Thumbnail */}
                    <img
                      src={frame.dataUrl}
                      alt={`Frame at ${formatTimecode(frame.timestamp.seconds)}`}
                      className="w-full aspect-video object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-300">
                          {formatTimecode(frame.timestamp.seconds)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-blue-400" />
                          <span className="text-slate-300">{frame.qualityScore}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFrameStar(frame.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          frame.starred ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'
                        }`}
                      />
                    </button>

                    {/* Selection indicator */}
                    {selectedFrames.has(frame.id) && (
                      <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="px-6 py-2 bg-slate-900/50 border-t border-slate-800">
        <div className="flex items-center gap-6 text-xs text-slate-500">
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Space</kbd> Play/Pause</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">←/→</kbd> Frame Step</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">I/O</kbd> Mark In/Out</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">C</kbd> Capture</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">J/K/L</kbd> Playback Speed</span>
        </div>
      </div>
    </div>
  );
};

export default VideoThumbnailEditor;
