/**
 * Video Frame Extractor Panel
 * Extract frames from videos to use as thumbnails
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useVideoService } from '../../../hooks/useVideoService';
import type { 
  ExtractedFrame,
  VideoMetadata,
  TimelineFrame,
} from '../../../services/video';
import './VideoFrameExtractor.css';

// ============================================
// ICONS
// ============================================

const Icons = {
  Video: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Link: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  Image: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  ),
  SkipBack: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polygon points="19 20 9 12 19 4 19 20" />
      <line x1="5" y1="19" x2="5" y2="5" />
    </svg>
  ),
  SkipForward: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="vfe-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Youtube: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
    </svg>
  ),
  Tiktok: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
  Instagram: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
};

// ============================================
// PLATFORM ICONS MAP
// ============================================

const PlatformIcons: Record<string, React.FC> = {
  youtube: Icons.Youtube,
  tiktok: Icons.Tiktok,
  instagram: Icons.Instagram,
};

// ============================================
// TYPES
// ============================================

type SourceTab = 'file' | 'url';

interface VideoFrameExtractorProps {
  onFrameSelect: (frame: ExtractedFrame) => void;
  onAddToCanvas?: (imageUrl: string, name?: string) => void;
  className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============================================
// COMPONENT
// ============================================

const VideoFrameExtractor: React.FC<VideoFrameExtractorProps> = ({
  onFrameSelect,
  onAddToCanvas,
  className = '',
}) => {
  const video = useVideoService({ autoInitialize: false });
  
  // Source state
  const [sourceTab, setSourceTab] = useState<SourceTab>('file');
  const [urlInput, setUrlInput] = useState('');
  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null);
  
  // Video state
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Extracted frames
  const [extractedFrames, setExtractedFrames] = useState<ExtractedFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<ExtractedFrame | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // ============================================
  // URL INPUT HANDLING
  // ============================================

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setUrlInput(url);
    
    // Detect platform
    const platformInfo = video.detectPlatform(url);
    setDetectedPlatform(platformInfo?.platform || null);
  }, [video]);

  // ============================================
  // VIDEO LOADING
  // ============================================

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await video.loadFromFile(file);
      setIsVideoLoaded(true);
      setCurrentTime(0);
      setExtractedFrames([]);
      setSelectedFrame(null);
      
      // Generate timeline after video loads
      if (video.metadata) {
        await video.generateTimeline({
          frameCount: 10,
          thumbnailWidth: 120,
          thumbnailHeight: 68,
        });
      }
    } catch (error) {
      console.error('Failed to load video file:', error);
    }
  }, [video]);

  const handleUrlLoad = useCallback(async () => {
    if (!urlInput.trim()) return;

    try {
      await video.loadFromUrl(urlInput);
      setIsVideoLoaded(true);
      setCurrentTime(0);
      setExtractedFrames([]);
      setSelectedFrame(null);
      
      // Generate timeline after video loads
      if (video.metadata) {
        await video.generateTimeline({
          frameCount: 10,
          thumbnailWidth: 120,
          thumbnailHeight: 68,
        });
      }
    } catch (error) {
      console.error('Failed to load video from URL:', error);
    }
  }, [urlInput, video]);

  // ============================================
  // PLAYBACK CONTROL
  // ============================================

  const updatePlaybackTime = useCallback(() => {
    const videoEl = video.getVideoElement();
    if (videoEl && isPlaying) {
      setCurrentTime(videoEl.currentTime);
      animationRef.current = requestAnimationFrame(updatePlaybackTime);
    }
  }, [video, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updatePlaybackTime);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, updatePlaybackTime]);

  const togglePlayback = useCallback(() => {
    const videoEl = video.getVideoElement();
    if (!videoEl) return;

    if (isPlaying) {
      videoEl.pause();
    } else {
      videoEl.play();
    }
    setIsPlaying(!isPlaying);
  }, [video, isPlaying]);

  const seekTo = useCallback((time: number) => {
    const videoEl = video.getVideoElement();
    if (videoEl) {
      videoEl.currentTime = time;
      setCurrentTime(time);
    }
  }, [video]);

  const seekRelative = useCallback((delta: number) => {
    const videoEl = video.getVideoElement();
    if (videoEl && video.metadata) {
      const newTime = Math.max(0, Math.min(videoEl.currentTime + delta, video.metadata.duration));
      seekTo(newTime);
    }
  }, [video, seekTo]);

  // ============================================
  // TIMELINE INTERACTION
  // ============================================

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !video.metadata) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const time = percentage * video.metadata.duration;
    
    seekTo(time);
  }, [video.metadata, seekTo]);

  const handleTimelineFrameClick = useCallback((timestamp: number) => {
    seekTo(timestamp);
  }, [seekTo]);

  // ============================================
  // FRAME EXTRACTION
  // ============================================

  const extractCurrentFrame = useCallback(async () => {
    if (!isVideoLoaded || video.isLoading) return;

    try {
      const frame = await video.extractFrameFast(currentTime);
      setExtractedFrames(prev => [...prev, frame]);
      setSelectedFrame(frame);
    } catch (error) {
      console.error('Failed to extract frame:', error);
    }
  }, [isVideoLoaded, video, currentTime]);

  const removeExtractedFrame = useCallback((index: number) => {
    setExtractedFrames(prev => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (selectedFrame === removed) {
        setSelectedFrame(updated[0] || null);
      }
      return updated;
    });
  }, [selectedFrame]);

  const handleFrameSelect = useCallback((frame: ExtractedFrame) => {
    setSelectedFrame(frame);
    onFrameSelect(frame);
  }, [onFrameSelect]);

  const handleAddToCanvas = useCallback(() => {
    if (selectedFrame && onAddToCanvas) {
      onAddToCanvas(selectedFrame.dataUrl, `Frame at ${formatTime(selectedFrame.timestamp)}`);
    }
  }, [selectedFrame, onAddToCanvas]);

  const downloadFrame = useCallback((frame: ExtractedFrame) => {
    const a = document.createElement('a');
    a.href = frame.dataUrl;
    a.download = `frame-${formatTime(frame.timestamp).replace(/[:.]/g, '-')}.png`;
    a.click();
  }, []);

  // ============================================
  // CLEANUP
  // ============================================

  useEffect(() => {
    return () => {
      video.dispose();
    };
  }, [video]);

  // ============================================
  // RENDER
  // ============================================

  const duration = video.metadata?.duration || 0;
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const PlatformIcon = detectedPlatform ? PlatformIcons[detectedPlatform] : null;

  return (
    <div className={`vfe ${className}`}>
      {/* Header */}
      <div className="vfe-header">
        <div className="vfe-header-icon">
          <Icons.Video />
        </div>
        <h3 className="vfe-header-title">Video Frame Extractor</h3>
      </div>

      {/* Source Selection */}
      {!isVideoLoaded && (
        <div className="vfe-source">
          {/* Tabs */}
          <div className="vfe-tabs">
            <button
              className={`vfe-tab ${sourceTab === 'file' ? 'vfe-tab--active' : ''}`}
              onClick={() => setSourceTab('file')}
            >
              <Icons.Upload />
              <span>Upload File</span>
            </button>
            <button
              className={`vfe-tab ${sourceTab === 'url' ? 'vfe-tab--active' : ''}`}
              onClick={() => setSourceTab('url')}
            >
              <Icons.Link />
              <span>From URL</span>
            </button>
          </div>

          {/* File Upload */}
          {sourceTab === 'file' && (
            <div className="vfe-upload">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="vfe-upload-input"
              />
              <button
                className="vfe-upload-button"
                onClick={() => fileInputRef.current?.click()}
                disabled={video.isLoading}
              >
                {video.isLoading ? (
                  <>
                    <Icons.Loader />
                    <span>{video.message || 'Loading...'}</span>
                  </>
                ) : (
                  <>
                    <Icons.Upload />
                    <span>Choose Video File</span>
                  </>
                )}
              </button>
              <p className="vfe-upload-hint">
                Supports MP4, WebM, MOV, AVI formats
              </p>
            </div>
          )}

          {/* URL Input */}
          {sourceTab === 'url' && (
            <div className="vfe-url">
              <div className="vfe-url-input-wrapper">
                {PlatformIcon && (
                  <div className="vfe-url-platform">
                    <PlatformIcon />
                  </div>
                )}
                <input
                  type="text"
                  value={urlInput}
                  onChange={handleUrlChange}
                  placeholder="Paste video URL (YouTube, TikTok, Instagram, etc.)"
                  className="vfe-url-input"
                />
              </div>
              <button
                className="vfe-url-button"
                onClick={handleUrlLoad}
                disabled={!urlInput.trim() || video.isLoading}
              >
                {video.isLoading ? (
                  <>
                    <Icons.Loader />
                    <span>{video.message || 'Loading...'}</span>
                  </>
                ) : (
                  <>
                    <Icons.Video />
                    <span>Load Video</span>
                  </>
                )}
              </button>
              {detectedPlatform && (
                <p className="vfe-url-detected">
                  Detected: {detectedPlatform.charAt(0).toUpperCase() + detectedPlatform.slice(1)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video Player */}
      {isVideoLoaded && video.metadata && (
        <div className="vfe-player">
          {/* Video Preview */}
          <div ref={videoContainerRef} className="vfe-video-container">
            {(() => {
              const videoEl = video.getVideoElement();
              if (videoEl) {
                return (
                  <video
                    src={videoEl.src}
                    className="vfe-video"
                    onClick={togglePlayback}
                  />
                );
              }
              return null;
            })()}
            
            {/* Play/Pause Overlay */}
            <div className="vfe-video-overlay" onClick={togglePlayback}>
              {!isPlaying && (
                <div className="vfe-play-icon">
                  <Icons.Play />
                </div>
              )}
            </div>
          </div>

          {/* Video Info */}
          <div className="vfe-video-info">
            <span className="vfe-info-item">
              {video.metadata.width}×{video.metadata.height}
            </span>
            <span className="vfe-info-separator">•</span>
            <span className="vfe-info-item">
              {formatDuration(video.metadata.duration)}
            </span>
            {video.metadata.fileSize > 0 && (
              <>
                <span className="vfe-info-separator">•</span>
                <span className="vfe-info-item">
                  {formatFileSize(video.metadata.fileSize)}
                </span>
              </>
            )}
          </div>

          {/* Timeline */}
          <div className="vfe-timeline-section">
            {/* Timeline Thumbnails */}
            {video.timeline.length > 0 && (
              <div className="vfe-timeline-thumbnails">
                {video.timeline.map((frame, index) => (
                  <button
                    key={index}
                    className="vfe-timeline-thumb"
                    onClick={() => handleTimelineFrameClick(frame.timestamp)}
                    title={formatTime(frame.timestamp)}
                  >
                    <img src={frame.thumbnail} alt={`Frame at ${formatTime(frame.timestamp)}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Scrubber */}
            <div
              ref={timelineRef}
              className="vfe-timeline"
              onClick={handleTimelineClick}
            >
              <div
                className="vfe-timeline-progress"
                style={{ width: `${progressPercentage}%` }}
              />
              <div
                className="vfe-timeline-handle"
                style={{ left: `${progressPercentage}%` }}
              />
            </div>

            {/* Time Display */}
            <div className="vfe-time-display">
              <span className="vfe-time-current">{formatTime(currentTime)}</span>
              <span className="vfe-time-separator">/</span>
              <span className="vfe-time-duration">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="vfe-controls">
            <button
              className="vfe-control-btn"
              onClick={() => seekRelative(-5)}
              title="Back 5 seconds"
            >
              <Icons.SkipBack />
            </button>
            <button
              className="vfe-control-btn vfe-control-btn--primary"
              onClick={togglePlayback}
            >
              {isPlaying ? <Icons.Pause /> : <Icons.Play />}
            </button>
            <button
              className="vfe-control-btn"
              onClick={() => seekRelative(5)}
              title="Forward 5 seconds"
            >
              <Icons.SkipForward />
            </button>
            <div className="vfe-control-divider" />
            <button
              className="vfe-control-btn vfe-control-btn--capture"
              onClick={extractCurrentFrame}
              disabled={video.isLoading}
              title="Capture current frame"
            >
              <Icons.Camera />
              <span>Capture Frame</span>
            </button>
          </div>

          {/* Progress Indicator */}
          {video.isLoading && (
            <div className="vfe-progress">
              <div className="vfe-progress-bar">
                <div
                  className="vfe-progress-fill"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
              <span className="vfe-progress-text">{video.message}</span>
            </div>
          )}
        </div>
      )}

      {/* Extracted Frames */}
      {extractedFrames.length > 0 && (
        <div className="vfe-extracted">
          <div className="vfe-extracted-header">
            <h4 className="vfe-extracted-title">
              <Icons.Image />
              <span>Captured Frames ({extractedFrames.length})</span>
            </h4>
          </div>

          <div className="vfe-extracted-grid">
            {extractedFrames.map((frame, index) => (
              <div
                key={index}
                className={`vfe-frame-card ${selectedFrame === frame ? 'vfe-frame-card--selected' : ''}`}
                onClick={() => handleFrameSelect(frame)}
              >
                <img
                  src={frame.dataUrl}
                  alt={`Frame at ${formatTime(frame.timestamp)}`}
                  className="vfe-frame-image"
                />
                <div className="vfe-frame-info">
                  <span className="vfe-frame-time">{formatTime(frame.timestamp)}</span>
                </div>
                <button
                  className="vfe-frame-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExtractedFrame(index);
                  }}
                  title="Remove frame"
                >
                  <Icons.X />
                </button>
                {selectedFrame === frame && (
                  <div className="vfe-frame-selected-badge">
                    <Icons.Check />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Frame Actions */}
          {selectedFrame && (
            <div className="vfe-frame-actions">
              {onAddToCanvas && (
                <button
                  className="vfe-action-btn vfe-action-btn--primary"
                  onClick={handleAddToCanvas}
                >
                  <Icons.Image />
                  <span>Use as Thumbnail</span>
                </button>
              )}
              <button
                className="vfe-action-btn"
                onClick={() => selectedFrame && downloadFrame(selectedFrame)}
              >
                <Icons.Download />
                <span>Download</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reset Button */}
      {isVideoLoaded && (
        <button
          className="vfe-reset-btn"
          onClick={() => {
            video.dispose();
            setIsVideoLoaded(false);
            setIsPlaying(false);
            setCurrentTime(0);
            setExtractedFrames([]);
            setSelectedFrame(null);
            setUrlInput('');
            setDetectedPlatform(null);
          }}
        >
          Load Different Video
        </button>
      )}
    </div>
  );
};

export default VideoFrameExtractor;
