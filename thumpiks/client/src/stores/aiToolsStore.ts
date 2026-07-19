/**
 * AI Tools Store
 * Persists AI operation results and settings across navigation
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { VisionAnalysisResult, BingImageResult } from '../types/vision.types';

// ============================================
// TYPES
// ============================================

type AIToolTab = 'generate' | 'ai-text' | 'inpaint' | 'remove-bg' | 'face-swap' | 'upscale' | 'enhance' | 'expand' | 'decompose' | 'analyze' | 'vision' | 'vision-search';
type EnhanceType = 'auto' | 'sharpen' | 'denoise' | 'color';
type UpscaleModel = 'general' | 'face' | 'anime';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
type QualityTier = 'flash' | 'standard' | 'pro';
type ExpandDirection = 'left' | 'right' | 'top' | 'bottom' | 'all';

interface AIAnalysisResult {
  success: boolean;
  scores: {
    overall: number;        // 0-100
    virality: number;       // Click-worthiness
    clarity: number;        // Visual clarity
    emotion: number;        // Emotional impact
    curiosity: number;      // Curiosity-inducing
    branding: number;       // Brand consistency
  };
  suggestions: string[];
  issues: {
    type: 'warning' | 'error';
    message: string;
    area?: { x: number; y: number; width: number; height: number };
  }[];
}

// ============================================
// STATE INTERFACE
// ============================================

interface AITextSuggestion {
  id: string;
  text: string;
  style: 'bold' | 'question' | 'listicle' | 'emotional' | 'curiosity';
  score: number;
  applied: boolean;
}

interface AIToolsState {
  // Active tab
  activeTab: AIToolTab;
  
  // AI Text generation
  textPrompt: string;
  textContext: string;
  textTone: 'clickbait' | 'professional' | 'casual' | 'dramatic' | 'educational';
  textSuggestions: AITextSuggestion[];
  textGenerating: boolean;
  textHistory: AITextSuggestion[][];

  // Generation settings
  prompt: string;
  negativePrompt: string;
  style: string;
  aspectRatio: AspectRatio;
  selectedTier: QualityTier;
  steps: number;
  guidance: number;
  showAdvanced: boolean;
  
  // Enhancement settings
  enhanceType: EnhanceType;
  
  // Expand/outpaint settings
  expandDirection: ExpandDirection;
  expandPixels: number;
  expandPrompt: string;
  
  // Upscale settings
  upscaleScale: 2 | 4;
  upscaleModel: UpscaleModel;
  
  // Face swap
  faceSwapSource: string | null;
  
  // Inpaint
  inpaintMask: string | null;
  
  // Results - persisted so they survive navigation
  generatedImages: string[];
  analysisResult: AIAnalysisResult | null;
  
  // Vision tab
  visionResult: VisionAnalysisResult | null;
  visionSearchQuery: string;
  visionSearchResults: BingImageResult[];
}

interface AIToolsActions {
  // Tab
  setActiveTab: (tab: AIToolTab) => void;
  
  // Generation settings
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (prompt: string) => void;
  setStyle: (style: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setSelectedTier: (tier: QualityTier) => void;
  setSteps: (steps: number) => void;
  setGuidance: (guidance: number) => void;
  setShowAdvanced: (show: boolean) => void;
  
  // Enhancement
  setEnhanceType: (type: EnhanceType) => void;
  
  // Expand
  setExpandDirection: (direction: ExpandDirection) => void;
  setExpandPixels: (pixels: number) => void;
  setExpandPrompt: (prompt: string) => void;
  
  // Upscale
  setUpscaleScale: (scale: 2 | 4) => void;
  setUpscaleModel: (model: UpscaleModel) => void;
  
  // Face swap
  setFaceSwapSource: (source: string | null) => void;
  
  // Inpaint
  setInpaintMask: (mask: string | null) => void;
  
  // Results
  addGeneratedImage: (imageUrl: string) => void;
  setGeneratedImages: (images: string[]) => void;
  clearGeneratedImages: () => void;
  setAnalysisResult: (result: AIAnalysisResult | null) => void;
  
  // AI Text
  setTextPrompt: (prompt: string) => void;
  setTextContext: (context: string) => void;
  setTextTone: (tone: AIToolsState['textTone']) => void;
  setTextSuggestions: (suggestions: AITextSuggestion[]) => void;
  setTextGenerating: (generating: boolean) => void;
  addTextHistory: (suggestions: AITextSuggestion[]) => void;
  markTextApplied: (id: string) => void;
  clearTextSuggestions: () => void;

  // Vision
  setVisionResult: (result: VisionAnalysisResult | null) => void;
  setVisionSearchQuery: (query: string) => void;
  setVisionSearchResults: (results: BingImageResult[]) => void;
  
  // Clear all
  clearAll: () => void;
  clearResults: () => void;
}

type AIToolsStore = AIToolsState & AIToolsActions;

// ============================================
// INITIAL STATE
// ============================================

const initialState: AIToolsState = {
  activeTab: 'generate',
  textPrompt: '',
  textContext: '',
  textTone: 'clickbait',
  textSuggestions: [],
  textGenerating: false,
  textHistory: [],
  prompt: '',
  negativePrompt: '',
  style: 'cinematic',
  aspectRatio: '16:9',
  selectedTier: 'standard',
  steps: 4,
  guidance: 0,
  showAdvanced: false,
  enhanceType: 'auto',
  expandDirection: 'all',
  expandPixels: 256,
  expandPrompt: '',
  upscaleScale: 2,
  upscaleModel: 'general',
  faceSwapSource: null,
  inpaintMask: null,
  generatedImages: [],
  analysisResult: null,
  visionResult: null,
  visionSearchQuery: '',
  visionSearchResults: [],
};

// ============================================
// STORE
// ============================================

export const useAIToolsStore = create<AIToolsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Tab
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Generation settings
      setPrompt: (prompt) => set({ prompt }),
      setNegativePrompt: (prompt) => set({ negativePrompt: prompt }),
      setStyle: (style) => set({ style }),
      setAspectRatio: (ratio) => set({ aspectRatio: ratio }),
      setSelectedTier: (tier) => set({ selectedTier: tier }),
      setSteps: (steps) => set({ steps }),
      setGuidance: (guidance) => set({ guidance }),
      setShowAdvanced: (show) => set({ showAdvanced: show }),

      // Enhancement
      setEnhanceType: (type) => set({ enhanceType: type }),

      // Expand
      setExpandDirection: (direction) => set({ expandDirection: direction }),
      setExpandPixels: (pixels) => set({ expandPixels: pixels }),
      setExpandPrompt: (prompt) => set({ expandPrompt: prompt }),

      // Upscale
      setUpscaleScale: (scale) => set({ upscaleScale: scale }),
      setUpscaleModel: (model) => set({ upscaleModel: model }),

      // Face swap
      setFaceSwapSource: (source) => set({ faceSwapSource: source }),

      // Inpaint
      setInpaintMask: (mask) => set({ inpaintMask: mask }),

      // Results
      addGeneratedImage: (imageUrl) =>
        set((state) => ({
          generatedImages: [...state.generatedImages, imageUrl],
        })),

      setGeneratedImages: (images) => set({ generatedImages: images }),

      clearGeneratedImages: () => set({ generatedImages: [] }),

      setAnalysisResult: (result) => set({ analysisResult: result }),

      // AI Text
      setTextPrompt: (prompt) => set({ textPrompt: prompt }),
      setTextContext: (context) => set({ textContext: context }),
      setTextTone: (tone) => set({ textTone: tone }),
      setTextSuggestions: (suggestions) => set({ textSuggestions: suggestions }),
      setTextGenerating: (generating) => set({ textGenerating: generating }),
      addTextHistory: (suggestions) =>
        set((state) => ({
          textHistory: [suggestions, ...state.textHistory].slice(0, 10),
        })),
      markTextApplied: (id) =>
        set((state) => ({
          textSuggestions: state.textSuggestions.map((s) =>
            s.id === id ? { ...s, applied: true } : s
          ),
        })),
      clearTextSuggestions: () => set({ textSuggestions: [], textGenerating: false }),

      // Vision
      setVisionResult: (result) => set({ visionResult: result }),
      setVisionSearchQuery: (query) => set({ visionSearchQuery: query }),
      setVisionSearchResults: (results) => set({ visionSearchResults: results }),

      // Clear
      clearAll: () => set(initialState),

      clearResults: () =>
        set({
          generatedImages: [],
          analysisResult: null,
          visionResult: null,
          visionSearchResults: [],
          textSuggestions: [],
          textGenerating: false,
        }),
    }),
    {
      name: 'thumpiks-ai-tools',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Persist settings and results
        activeTab: state.activeTab,
        prompt: state.prompt,
        negativePrompt: state.negativePrompt,
        style: state.style,
        aspectRatio: state.aspectRatio,
        selectedTier: state.selectedTier,
        steps: state.steps,
        guidance: state.guidance,
        showAdvanced: state.showAdvanced,
        enhanceType: state.enhanceType,
        expandDirection: state.expandDirection,
        expandPixels: state.expandPixels,
        expandPrompt: state.expandPrompt,
        upscaleScale: state.upscaleScale,
        upscaleModel: state.upscaleModel,
        // Results (most important for data loss prevention)
        generatedImages: state.generatedImages,
        analysisResult: state.analysisResult,
        visionResult: state.visionResult,
        visionSearchQuery: state.visionSearchQuery,
        visionSearchResults: state.visionSearchResults,
        textPrompt: state.textPrompt,
        textContext: state.textContext,
        textTone: state.textTone,
        textHistory: state.textHistory,
        // Note: faceSwapSource and inpaintMask are large base64 strings
        // Only persist if they're reasonably sized
        faceSwapSource: state.faceSwapSource,
        inpaintMask: state.inpaintMask,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const selectActiveTab = (state: AIToolsStore) => state.activeTab;
export const selectGeneratedImages = (state: AIToolsStore) => state.generatedImages;
export const selectAnalysisResult = (state: AIToolsStore) => state.analysisResult;
export const selectVisionResult = (state: AIToolsStore) => state.visionResult;
export const selectHasResults = (state: AIToolsStore) =>
  state.generatedImages.length > 0 ||
  state.analysisResult !== null ||
  state.visionResult !== null ||
  state.visionSearchResults.length > 0;
