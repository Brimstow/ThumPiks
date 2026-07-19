/**
 * useVideoService Hook
 * React hook for accessing video processing capabilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  VideoService,
  getVideoService,
  type VideoSource,
  type VideoMetadata,
  type FrameExtractionOptions,
  type ExtractedFrame,
  type ClipExtractionOptions,
  type ExtractedClip,
  type VideoPreviewConfig,
  type TimelineFrame,
  type VideoProcessingState,
  type PlatformVideoInfo,
} from '../services/video';

interface UseVideoServiceOptions {
  autoInitialize?: boolean;
}

export function useVideoService(options: UseVideoServiceOptions = {}) {
  const { autoInitialize = true } = options;
  
  const serviceRef = useRef<VideoService | null>(null);
  const [state, setState] = useState<VideoProcessingState>({
    isLoading: false,
    progress: 0,
    stage: 'idle',
    message: '',
  });
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [timeline, setTimeline] = useState<TimelineFrame[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string>('');

  // Initialize service
  useEffect(() => {
    serviceRef.current = getVideoService();
    serviceRef.current.setProgressCallback(setState);

    if (autoInitialize) {
      serviceRef.current.initialize()
        .then(() => setIsReady(true))
        .catch(console.error);
    }

    return () => {
      serviceRef.current?.dispose();
    };
  }, [autoInitialize]);

  // ============================================
  // VIDEO LOADING
  // ============================================

  const loadVideo = useCallback(async (source: VideoSource): Promise<VideoMetadata> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    
    const meta = await serviceRef.current.loadVideo(source);
    setMetadata(meta);
    return meta;
  }, []);

  const loadFromUrl = useCallback(async (url: string): Promise<VideoMetadata> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    
    const meta = await serviceRef.current.loadFromUrl(url);
    setMetadata(meta);
    const el = serviceRef.current.getVideoElement();
    if (el) setVideoSrc(el.src);
    return meta;
  }, []);

  const loadFromFile = useCallback(async (file: File): Promise<VideoMetadata> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    
    const meta = await serviceRef.current.loadFromFile(file);
    setMetadata(meta);
    const el = serviceRef.current.getVideoElement();
    if (el) setVideoSrc(el.src);
    return meta;
  }, []);

  // ============================================
  // FRAME EXTRACTION
  // ============================================

  const extractFrame = useCallback(async (
    timestamp: number,
    options?: Partial<FrameExtractionOptions>
  ): Promise<ExtractedFrame> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.extractFrame(timestamp, options);
  }, []);

  const extractFrames = useCallback(async (
    options: FrameExtractionOptions
  ): Promise<ExtractedFrame[]> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.extractFrames(options);
  }, []);

  const extractFrameFast = useCallback(async (
    timestamp: number
  ): Promise<ExtractedFrame> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.extractFrameFast(timestamp);
  }, []);

  // ============================================
  // TIMELINE
  // ============================================

  const generateTimeline = useCallback(async (
    config: VideoPreviewConfig
  ): Promise<TimelineFrame[]> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    
    const frames = await serviceRef.current.generateTimeline(config);
    setTimeline(frames);
    return frames;
  }, []);

  // ============================================
  // CLIP EXTRACTION
  // ============================================

  const extractClip = useCallback(async (
    options: ClipExtractionOptions
  ): Promise<ExtractedClip> => {
    if (!serviceRef.current) throw new Error('Service not initialized');
    return serviceRef.current.extractClip(options);
  }, []);

  // ============================================
  // PLATFORM DETECTION
  // ============================================

  const detectPlatform = useCallback((url: string): PlatformVideoInfo | null => {
    if (!serviceRef.current) return null;
    return serviceRef.current.detectPlatform(url);
  }, []);

  // ============================================
  // UTILITIES
  // ============================================

  const getVideoElement = useCallback((): HTMLVideoElement | null => {
    return serviceRef.current?.getVideoElement() || null;
  }, []);

  const setVideoElement = useCallback((el: HTMLVideoElement): void => {
    serviceRef.current?.setVideoElement(el);
  }, []);

  const dispose = useCallback((): void => {
    serviceRef.current?.dispose();
    setMetadata(null);
    setTimeline([]);
    setVideoSrc('');
  }, []);

  return {
    // State
    ...state,
    isReady,
    metadata,
    timeline,
    videoSrc,

    // Video loading
    loadVideo,
    loadFromUrl,
    loadFromFile,

    // Frame extraction
    extractFrame,
    extractFrames,
    extractFrameFast,

    // Timeline
    generateTimeline,

    // Clip extraction
    extractClip,

    // Platform detection
    detectPlatform,

    // Utilities
    getVideoElement,
    setVideoElement,
    dispose,

    // Direct service access
    service: serviceRef.current,
  };
}

export type UseVideoServiceReturn = ReturnType<typeof useVideoService>;
