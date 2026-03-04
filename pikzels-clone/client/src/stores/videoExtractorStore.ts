/**
 * Video Extractor Store
 * Persists video frame extraction state across navigation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ExtractedFrame, TimelineFrame, VideoMetadata } from '../services/video';

// ============================================
// TYPES
// ============================================

interface SerializableFrame {
  timestamp: number;
  dataUrl: string;
  width: number;
  height: number;
}

interface VideoExtractorState {
  // Source state
  sourceTab: 'file' | 'url';
  urlInput: string;
  detectedPlatform: string | null;
  
  // Video state
  isVideoLoaded: boolean;
  videoSrc: string | null;
  videoMetadata: VideoMetadata | null;
  
  // Timeline
  timeline: TimelineFrame[];
  
  // Extracted frames (serializable version - no Blob)
  extractedFrames: SerializableFrame[];
  selectedFrameTimestamp: number | null;
  
  // Playback state
  currentTime: number;
}

interface VideoExtractorActions {
  // Source actions
  setSourceTab: (tab: 'file' | 'url') => void;
  setUrlInput: (url: string) => void;
  setDetectedPlatform: (platform: string | null) => void;
  
  // Video actions
  setVideoLoaded: (loaded: boolean, src?: string, metadata?: VideoMetadata | null) => void;
  setTimeline: (timeline: TimelineFrame[]) => void;
  setCurrentTime: (time: number) => void;
  
  // Frame actions
  addExtractedFrame: (frame: ExtractedFrame) => void;
  removeExtractedFrame: (timestamp: number) => void;
  setSelectedFrame: (timestamp: number | null) => void;
  
  // Clear actions
  clearVideo: () => void;
  clearFrames: () => void;
  clearAll: () => void;
}

type VideoExtractorStore = VideoExtractorState & VideoExtractorActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: VideoExtractorState = {
  sourceTab: 'file',
  urlInput: '',
  detectedPlatform: null,
  isVideoLoaded: false,
  videoSrc: null,
  videoMetadata: null,
  timeline: [],
  extractedFrames: [],
  selectedFrameTimestamp: null,
  currentTime: 0,
};

// ============================================
// STORE
// ============================================

export const useVideoExtractorStore = create<VideoExtractorStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Source actions
      setSourceTab: (tab) => set({ sourceTab: tab }),
      
      setUrlInput: (url) => set({ urlInput: url }),
      
      setDetectedPlatform: (platform) => set({ detectedPlatform: platform }),

      // Video actions
      setVideoLoaded: (loaded, src, metadata) => set({
        isVideoLoaded: loaded,
        videoSrc: src ?? null,
        videoMetadata: metadata ?? null,
        currentTime: 0,
      }),

      setTimeline: (timeline) => set({ timeline }),

      setCurrentTime: (time) => set({ currentTime: time }),

      // Frame actions
      addExtractedFrame: (frame) => {
        const serializable: SerializableFrame = {
          timestamp: frame.timestamp,
          dataUrl: frame.dataUrl,
          width: frame.width,
          height: frame.height,
        };
        set((state) => ({
          extractedFrames: [...state.extractedFrames, serializable],
          selectedFrameTimestamp: frame.timestamp,
        }));
      },

      removeExtractedFrame: (timestamp) => set((state) => ({
        extractedFrames: state.extractedFrames.filter((f) => f.timestamp !== timestamp),
        selectedFrameTimestamp: state.selectedFrameTimestamp === timestamp 
          ? null 
          : state.selectedFrameTimestamp,
      })),

      setSelectedFrame: (timestamp) => set({ selectedFrameTimestamp: timestamp }),

      // Clear actions
      clearVideo: () => set({
        isVideoLoaded: false,
        videoSrc: null,
        videoMetadata: null,
        timeline: [],
        currentTime: 0,
        urlInput: '',
        detectedPlatform: null,
      }),

      clearFrames: () => set({
        extractedFrames: [],
        selectedFrameTimestamp: null,
      }),

      clearAll: () => set(initialState),
    }),
    {
      name: 'thumpiks-video-extractor',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Only persist user data, not transient UI state
        sourceTab: state.sourceTab,
        urlInput: state.urlInput,
        detectedPlatform: state.detectedPlatform,
        isVideoLoaded: state.isVideoLoaded,
        videoSrc: state.videoSrc,
        videoMetadata: state.videoMetadata,
        timeline: state.timeline,
        extractedFrames: state.extractedFrames,
        selectedFrameTimestamp: state.selectedFrameTimestamp,
        currentTime: state.currentTime,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const selectExtractedFrames = (state: VideoExtractorStore) => state.extractedFrames;
export const selectSelectedFrame = (state: VideoExtractorStore) => {
  const ts = state.selectedFrameTimestamp;
  return ts !== null ? state.extractedFrames.find((f) => f.timestamp === ts) : null;
};
export const selectIsVideoReady = (state: VideoExtractorStore) => 
  state.isVideoLoaded && state.videoSrc !== null;
