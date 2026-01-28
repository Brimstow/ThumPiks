/**
 * Video Processing Service Types
 * Core type definitions for video editing capabilities
 */

// ============================================
// VIDEO SOURCE TYPES
// ============================================

export type VideoSourceType = 'file' | 'youtube' | 'tiktok' | 'instagram' | 'url';

export interface VideoSource {
  type: VideoSourceType;
  url?: string;
  file?: File;
  platformId?: string; // e.g., YouTube video ID
}

export interface VideoMetadata {
  duration: number; // in seconds
  width: number;
  height: number;
  fps: number;
  codec: string;
  fileSize: number;
  mimeType: string;
}

// ============================================
// FRAME EXTRACTION
// ============================================

export interface FrameExtractionOptions {
  timestamps: number[]; // seconds
  width?: number; // output width (maintains aspect ratio if height not specified)
  height?: number;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number; // 1-100 for jpeg/webp
}

export interface ExtractedFrame {
  timestamp: number;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

// ============================================
// CLIP EXTRACTION
// ============================================

export interface ClipExtractionOptions {
  startTime: number;
  endTime: number;
  outputFormat?: 'mp4' | 'webm' | 'gif';
  width?: number;
  height?: number;
  fps?: number;
}

export interface ExtractedClip {
  blob: Blob;
  duration: number;
  format: string;
  size: number;
}

// ============================================
// TIMELINE & PREVIEW
// ============================================

export interface TimelineFrame {
  timestamp: number;
  thumbnail: string; // base64 data URL
}

export interface VideoPreviewConfig {
  frameCount: number; // number of preview frames to generate
  thumbnailWidth: number;
  thumbnailHeight: number;
}

// ============================================
// SOCIAL MEDIA PLATFORMS
// ============================================

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  urlPatterns: RegExp[];
  extractVideoId: (url: string) => string | null;
  proxyEndpoint: string;
  enabled: boolean;
}

export interface PlatformVideoInfo {
  platform: VideoSourceType;
  videoId: string;
  title?: string;
  thumbnail?: string;
  duration?: number;
  author?: string;
}

// ============================================
// PROCESSING STATE
// ============================================

export interface VideoProcessingState {
  isLoading: boolean;
  progress: number; // 0-100
  stage: 'idle' | 'loading' | 'analyzing' | 'extracting' | 'encoding' | 'complete' | 'error';
  message: string;
  error?: string;
}

export interface VideoProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// SERVICE INTERFACE
// ============================================

export interface IVideoService {
  // Initialization
  initialize(): Promise<void>;
  isReady(): boolean;
  
  // Video loading
  loadVideo(source: VideoSource): Promise<VideoMetadata>;
  loadFromUrl(url: string): Promise<VideoMetadata>;
  loadFromFile(file: File): Promise<VideoMetadata>;
  
  // Frame extraction
  extractFrame(timestamp: number, options?: Partial<FrameExtractionOptions>): Promise<ExtractedFrame>;
  extractFrames(options: FrameExtractionOptions): Promise<ExtractedFrame[]>;
  
  // Timeline generation
  generateTimeline(config: VideoPreviewConfig): Promise<TimelineFrame[]>;
  
  // Clip extraction
  extractClip(options: ClipExtractionOptions): Promise<ExtractedClip>;
  
  // Platform detection
  detectPlatform(url: string): PlatformVideoInfo | null;
  
  // Cleanup
  dispose(): void;
}
