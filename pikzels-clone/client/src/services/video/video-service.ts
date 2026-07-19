/**
 * Video Processing Service
 * Browser-based video processing using FFmpeg.wasm
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';
import type {
  IVideoService,
  VideoSource,
  VideoMetadata,
  FrameExtractionOptions,
  ExtractedFrame,
  ClipExtractionOptions,
  ExtractedClip,
  VideoPreviewConfig,
  TimelineFrame,
  PlatformVideoInfo,
  VideoProcessingState,
} from './types';
import { platformRegistry } from './platforms';
import { isCrossOriginIsolated, isSafari, safeCanvasToBlob, safeCanvasToDataURL } from '@/utils/browserCompat';

// ============================================
// API CONFIGURATION
// ============================================

import { API_BASE_URL } from '@/config/environment';

// ============================================
// VIDEO SERVICE IMPLEMENTATION
// ============================================

export class VideoService implements IVideoService {
  private ffmpeg: FFmpeg;
  private ready: boolean = false;
  private currentVideo: Uint8Array | null = null;
  private currentMetadata: VideoMetadata | null = null;
  private videoElement: HTMLVideoElement | null = null;
  /** Original URL kept for lazy-loading the full blob into FFmpeg later */
  private sourceUrl: string | null = null;
  
  private onProgress?: (state: VideoProcessingState) => void;

  constructor() {
    this.ffmpeg = new FFmpeg();
  }

  setProgressCallback(callback: (state: VideoProcessingState) => void): void {
    this.onProgress = callback;
  }

  private updateProgress(state: Partial<VideoProcessingState>): void {
    if (this.onProgress) {
      this.onProgress({
        isLoading: false,
        progress: 0,
        stage: 'idle',
        message: '',
        ...state,
      });
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(): Promise<void> {
    if (this.ready) return;

    this.updateProgress({
      isLoading: true,
      stage: 'loading',
      message: 'Loading FFmpeg (~31MB)...',
      progress: 0,
    });

    // Set up progress logging
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      this.updateProgress({
        isLoading: true,
        progress: Math.round(progress * 100),
        stage: 'extracting',
        message: `Processing... ${Math.round(progress * 100)}%`,
      });
    });

    // @ffmpeg/core@0.12.6 is the single-threaded build (no SharedArrayBuffer needed).
    // The classWorkerURL runs FFmpeg in a Web Worker so the main thread stays responsive.
    // On Safari (no crossOriginIsolated support with credentialless COEP), the worker
    // may fail if it attempts SharedArrayBuffer internally — we catch and retry without it.
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

      if (isCrossOriginIsolated) {
        // Chrome/Firefox with COOP+COEP: full worker support with SharedArrayBuffer
        const workerURL = new URL('/ffmpeg/worker.js', window.location.origin).href;
        console.log('[FFmpeg] Cross-origin isolated — loading with worker (multi-thread capable)');
        await this.ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL });
      } else if (isSafari) {
        // Safari: credentialless COEP not supported, crossOriginIsolated is false.
        // Load without classWorkerURL to avoid SharedArrayBuffer issues.
        console.log('[FFmpeg] Safari detected — loading without worker (single-thread)');
        await this.ffmpeg.load({ coreURL, wasmURL });
      } else {
        // Other browsers without cross-origin isolation: try with worker, fallback without
        console.log('[FFmpeg] Not cross-origin isolated — trying with worker...');
        try {
          const workerURL = new URL('/ffmpeg/worker.js', window.location.origin).href;
          await this.ffmpeg.load({ coreURL, wasmURL, classWorkerURL: workerURL });
        } catch (workerError) {
          console.warn('[FFmpeg] Worker load failed, retrying without worker:', workerError);
          this.ffmpeg = new FFmpeg(); // Reset instance after failed load
          this.ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
          this.ffmpeg.on('progress', ({ progress }) => {
            this.updateProgress({
              isLoading: true,
              progress: Math.round(progress * 100),
              stage: 'extracting',
              message: `Processing... ${Math.round(progress * 100)}%`,
            });
          });
          await this.ffmpeg.load({ coreURL, wasmURL });
        }
      }

      this.ready = true;
      this.updateProgress({
        isLoading: false,
        stage: 'complete',
        message: 'FFmpeg ready',
        progress: 100,
      });
    } catch (error) {
      this.updateProgress({
        isLoading: false,
        stage: 'error',
        message: 'Failed to load FFmpeg',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  // ============================================
  // VIDEO LOADING
  // ============================================

  async loadVideo(source: VideoSource): Promise<VideoMetadata> {
    if (source.file) {
      return this.loadFromFile(source.file);
    } else if (source.url) {
      return this.loadFromUrl(source.url);
    }
    throw new Error('No video source provided');
  }

  async loadFromUrl(url: string): Promise<VideoMetadata> {
    // Don't initialize FFmpeg yet – defer until actually needed for
    // high-quality extraction or clip operations.  This lets the video
    // start playing immediately via the streaming proxy.

    this.updateProgress({
      isLoading: true,
      stage: 'loading',
      message: 'Loading video...',
      progress: 0,
    });

    // Remember the original URL so we can lazy-load the full blob later
    // when an FFmpeg operation (extractFrames, extractClip) is requested.
    this.sourceUrl = url;

    // Build the streaming URL – same pattern used by VideoThumbnailEditor
    const platformInfo = this.detectPlatform(url);
    let videoSrc: string;

    if (platformInfo) {
      // Platform URL → proxy through /api/video/stream with Range support
      videoSrc = `${API_BASE_URL}/api/video/stream?url=${encodeURIComponent(url)}`;
      this.updateProgress({
        isLoading: true,
        stage: 'loading',
        message: `Loading from ${platformInfo.platform}...`,
        progress: 30,
      });
    } else {
      // Direct URL (mp4 link, etc.) – use as-is
      videoSrc = url;
    }

    return this.analyzeVideoFromSrc(videoSrc);
  }

  async loadFromFile(file: File): Promise<VideoMetadata> {
    await this.initialize();

    this.updateProgress({
      isLoading: true,
      stage: 'loading',
      message: 'Loading video file...',
      progress: 0,
    });

    const arrayBuffer = await file.arrayBuffer();
    this.currentVideo = new Uint8Array(arrayBuffer);

    const metadata = await this.analyzeVideo();
    metadata.fileSize = file.size;
    metadata.mimeType = file.type;

    return metadata;
  }

  private async analyzeVideo(): Promise<VideoMetadata> {
    if (!this.currentVideo) {
      throw new Error('No video loaded');
    }

    this.updateProgress({
      isLoading: true,
      stage: 'analyzing',
      message: 'Analyzing video...',
      progress: 20,
    });

    // Write video to FFmpeg filesystem
    await this.ffmpeg.writeFile('input.mp4', this.currentVideo);

    // Use HTML5 video element for metadata extraction (faster than FFmpeg)
    const blob = new Blob([this.currentVideo as BlobPart], { type: 'video/mp4' });
    const videoUrl = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        this.videoElement = video;
        this.currentMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30, // Default, can be detected with FFprobe
          codec: 'h264',
          fileSize: this.currentVideo!.length,
          mimeType: 'video/mp4',
        };

        this.updateProgress({
          isLoading: false,
          stage: 'complete',
          message: 'Video loaded',
          progress: 100,
        });

        resolve(this.currentMetadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video metadata'));
      };

      video.src = videoUrl;
    });
  }

  /**
   * Streaming-first analysis: creates a video element pointed at a URL
   * (typically the /api/video/stream proxy) so playback + canvas-based
   * frame extraction work immediately without downloading the full file.
   */
  private analyzeVideoFromSrc(videoSrc: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      // 'auto' lets the browser buffer enough data for high-quality seeking
      // ('metadata' only downloads enough for dimensions/duration, causing
      // blurry/partial frames when seeking for extraction)
      video.preload = 'auto';
      // Required so canvas.toDataURL works on cross-origin streams
      video.crossOrigin = 'anonymous';

      video.onloadedmetadata = () => {
        this.videoElement = video;
        this.currentMetadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          fps: 30,
          codec: 'h264',
          fileSize: 0, // unknown until full download
          mimeType: 'video/mp4',
        };

        this.updateProgress({
          isLoading: false,
          stage: 'complete',
          message: 'Video loaded',
          progress: 100,
        });

        resolve(this.currentMetadata);
      };

      video.onerror = () => {
        reject(new Error('Failed to load video from stream'));
      };

      video.src = videoSrc;
    });
  }

  /**
   * Lazily downloads the full video blob and loads it into FFmpeg.
   * Called on-demand by extractFrames() / extractClip() which need FFmpeg.
   */
  private async ensureFFmpegLoaded(): Promise<void> {
    if (this.currentVideo) return; // already loaded

    await this.initialize();

    if (!this.sourceUrl) {
      throw new Error('No source URL available for FFmpeg download');
    }

    this.updateProgress({
      isLoading: true,
      stage: 'loading',
      message: 'Downloading full video for processing...',
      progress: 0,
    });

    const platformInfo = this.detectPlatform(this.sourceUrl);
    if (platformInfo) {
      const streamUrl = `${API_BASE_URL}/api/video/stream?url=${encodeURIComponent(this.sourceUrl)}`;
      const response = await fetch(streamUrl);
      if (!response.ok) {
        throw new Error(`Failed to download video for processing`);
      }
      const blob = await response.blob();
      this.currentVideo = new Uint8Array(await blob.arrayBuffer());
    } else {
      this.currentVideo = await fetchFile(this.sourceUrl);
    }

    await this.ffmpeg.writeFile('input.mp4', this.currentVideo);

    this.updateProgress({
      isLoading: false,
      stage: 'complete',
      message: 'Video ready for processing',
      progress: 100,
    });
  }

  // ============================================
  // FRAME EXTRACTION
  // ============================================

  async extractFrame(
    timestamp: number,
    options: Partial<FrameExtractionOptions> = {}
  ): Promise<ExtractedFrame> {
    const frames = await this.extractFrames({
      timestamps: [timestamp],
      ...options,
    });
    return frames[0];
  }

  async extractFrames(options: FrameExtractionOptions): Promise<ExtractedFrame[]> {
    if (!this.currentMetadata) {
      throw new Error('No video loaded');
    }

    // Ensure the full blob is downloaded and FFmpeg is ready
    await this.ensureFFmpegLoaded();

    const { timestamps, width, height, format = 'png', quality = 90 } = options;
    const frames: ExtractedFrame[] = [];

    this.updateProgress({
      isLoading: true,
      stage: 'extracting',
      message: `Extracting ${timestamps.length} frames...`,
      progress: 0,
    });

    // Calculate output dimensions
    const outputWidth = width || this.currentMetadata.width;
    const outputHeight = height || this.currentMetadata.height;

    for (let i = 0; i < timestamps.length; i++) {
      const timestamp = timestamps[i];
      const outputFile = `frame_${i}.${format}`;

      // FFmpeg command to extract frame
      const args = [
        '-ss', timestamp.toFixed(3),
        '-i', 'input.mp4',
        '-vframes', '1',
        '-vf', `scale=${outputWidth}:${outputHeight}`,
      ];

      if (format === 'jpeg' || format === 'webp') {
        args.push('-q:v', String(Math.round((100 - quality) / 3.33))); // FFmpeg quality scale
      }

      args.push('-y', outputFile);

      await this.ffmpeg.exec(args);

      // Read the extracted frame
      const frameData = await this.ffmpeg.readFile(outputFile);
      const blob = new Blob([frameData as BlobPart], { type: `image/${format}` });
      const dataUrl = await this.blobToDataUrl(blob);

      frames.push({
        timestamp,
        dataUrl,
        blob,
        width: outputWidth,
        height: outputHeight,
      });

      // Clean up
      await this.ffmpeg.deleteFile(outputFile);

      this.updateProgress({
        isLoading: true,
        stage: 'extracting',
        message: `Extracted frame ${i + 1}/${timestamps.length}`,
        progress: Math.round(((i + 1) / timestamps.length) * 100),
      });
    }

    this.updateProgress({
      isLoading: false,
      stage: 'complete',
      message: 'Frames extracted',
      progress: 100,
    });

    return frames;
  }

  // ============================================
  // FAST FRAME EXTRACTION (Canvas-based)
  // ============================================

  /**
   * Wait until the video element has a fully composited frame ready.
   * Uses requestVideoFrameCallback (fires after the frame is actually
   * decoded and sent to the compositor) with a fallback to seeked +
   * double-requestAnimationFrame for older browsers.
   */
  private waitForFrameReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve) => {
      const rvfc = (video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: () => void) => void;
      }).requestVideoFrameCallback;

      if (typeof rvfc === 'function') {
        // Best path – fires only after the frame is composited
        rvfc.call(video, () => resolve());
      } else {
        // Fallback: wait for seeked, then two animation frames to let
        // the decoder fully composite the frame
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        };
        video.addEventListener('seeked', onSeeked);
      }
    });
  }

  async extractFrameFast(timestamp: number): Promise<ExtractedFrame> {
    if (!this.videoElement || !this.currentMetadata) {
      throw new Error('No video loaded');
    }

    const video = this.videoElement;

    // Register the frame-ready listener BEFORE seeking to avoid a race
    // condition where the seeked event fires before we're listening.
    const frameReady = this.waitForFrameReady(video);
    video.currentTime = timestamp;
    await frameReady;

    const w = video.videoWidth;
    const h = video.videoHeight;

    // Use createImageBitmap when available for highest-fidelity capture
    // (bypasses potential video element rendering scaling artifacts)
    let source: CanvasImageSource = video;
    let bitmap: ImageBitmap | null = null;
    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(video);
        source = bitmap;
      } catch {
        // Fall back to drawing directly from the video element
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      bitmap?.close();
      throw new Error('Failed to get canvas context');
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, w, h, 0, 0, w, h);

    bitmap?.close();

    const blob = await safeCanvasToBlob(canvas, 'image/png');
    if (!blob) {
      throw new Error('Failed to create blob');
    }
    const dataUrl = safeCanvasToDataURL(canvas, 'image/png');
    return {
      timestamp,
      dataUrl,
      blob,
      width: w,
      height: h,
    };
  }

  // ============================================
  // TIMELINE GENERATION
  // ============================================

  async generateTimeline(config: VideoPreviewConfig): Promise<TimelineFrame[]> {
    if (!this.currentMetadata) {
      throw new Error('No video loaded');
    }

    const { frameCount, thumbnailWidth, thumbnailHeight } = config;
    const duration = this.currentMetadata.duration;
    const interval = duration / frameCount;

    const timestamps = Array.from(
      { length: frameCount },
      (_, i) => i * interval + interval / 2
    );

    this.updateProgress({
      isLoading: true,
      stage: 'extracting',
      message: 'Generating timeline...',
      progress: 0,
    });

    const frames: TimelineFrame[] = [];

    // Use fast canvas-based extraction for timeline
    for (let i = 0; i < timestamps.length; i++) {
      try {
        const frame = await this.extractFrameFast(timestamps[i]);
        
        // Resize to thumbnail size
        const resizedDataUrl = await this.resizeImage(
          frame.dataUrl,
          thumbnailWidth,
          thumbnailHeight
        );

        frames.push({
          timestamp: timestamps[i],
          thumbnail: resizedDataUrl,
        });

        this.updateProgress({
          isLoading: true,
          stage: 'extracting',
          message: `Timeline ${i + 1}/${timestamps.length}`,
          progress: Math.round(((i + 1) / timestamps.length) * 100),
        });
      } catch (error) {
        console.warn(`Failed to extract frame at ${timestamps[i]}s`, error);
      }
    }

    this.updateProgress({
      isLoading: false,
      stage: 'complete',
      message: 'Timeline generated',
      progress: 100,
    });

    return frames;
  }

  // ============================================
  // CLIP EXTRACTION
  // ============================================

  async extractClip(options: ClipExtractionOptions): Promise<ExtractedClip> {
    if (!this.currentMetadata) {
      throw new Error('No video loaded');
    }

    // Ensure the full blob is downloaded and FFmpeg is ready
    await this.ensureFFmpegLoaded();

    const {
      startTime,
      endTime,
      outputFormat = 'mp4',
      width,
      height,
      fps,
    } = options;

    const duration = endTime - startTime;
    const outputFile = `clip.${outputFormat}`;

    this.updateProgress({
      isLoading: true,
      stage: 'encoding',
      message: 'Extracting clip...',
      progress: 0,
    });

    const args = [
      '-ss', startTime.toFixed(3),
      '-i', 'input.mp4',
      '-t', duration.toFixed(3),
    ];

    // Add scaling if specified
    if (width || height) {
      const scaleFilter = `scale=${width || -1}:${height || -1}`;
      args.push('-vf', scaleFilter);
    }

    // Add FPS if specified
    if (fps) {
      args.push('-r', String(fps));
    }

    // Output format specific options
    if (outputFormat === 'gif') {
      args.push('-f', 'gif');
    } else if (outputFormat === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-c:a', 'libopus');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    }

    args.push('-y', outputFile);

    await this.ffmpeg.exec(args);

    const clipData = await this.ffmpeg.readFile(outputFile);
    const mimeType = outputFormat === 'webm' ? 'video/webm' : 
                     outputFormat === 'gif' ? 'image/gif' : 'video/mp4';
    const blob = new Blob([clipData as BlobPart], { type: mimeType });

    await this.ffmpeg.deleteFile(outputFile);

    this.updateProgress({
      isLoading: false,
      stage: 'complete',
      message: 'Clip extracted',
      progress: 100,
    });

    return {
      blob,
      duration,
      format: outputFormat,
      size: blob.size,
    };
  }

  // ============================================
  // PLATFORM DETECTION
  // ============================================

  detectPlatform(url: string): PlatformVideoInfo | null {
    return platformRegistry.detectPlatform(url);
  }

  // ============================================
  // CLEANUP
  // ============================================

  dispose(): void {
    if (this.videoElement) {
      // Only revoke blob: URLs – streaming URLs are not object URLs
      if (this.videoElement.src.startsWith('blob:')) {
        URL.revokeObjectURL(this.videoElement.src);
      }
      this.videoElement = null;
    }
    this.currentVideo = null;
    this.currentMetadata = null;
    this.sourceUrl = null;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async resizeImage(
    dataUrl: string,
    width: number,
    height: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(safeCanvasToDataURL(canvas, 'image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // ============================================
  // GETTERS
  // ============================================

  getMetadata(): VideoMetadata | null {
    return this.currentMetadata;
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  /**
   * Replace the internal video element with an externally-rendered one.
   * This lets a React component render the visible <video> and then hand it
   * to the service so extractFrameFast / generateTimeline operate on the
   * same element the user sees.
   */
  setVideoElement(el: HTMLVideoElement): void {
    this.videoElement = el;
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let videoServiceInstance: VideoService | null = null;

export function getVideoService(): VideoService {
  if (!videoServiceInstance) {
    videoServiceInstance = new VideoService();
  }
  return videoServiceInstance;
}
