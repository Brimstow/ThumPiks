/**
 * Enhanced AI Tools Panel
 * Comprehensive AI toolkit integrated with canvas editor
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { copyToClipboard } from '@/utils/browserCompat';
import { useBackendAI, type BackendAIOperation } from '../../../hooks/useBackendAI';
import { useAIService } from '../../../hooks/useAIService';
import { useAIToolsStore } from '../../../stores/aiToolsStore';
import { useModelTiers } from '../../../features/ai-tools';
import { authGet, authPost } from '../../../utils/api';
import type { 
  AIAnalysisResult,
  AIGenerateRequest,
} from '../../../services/ai-providers';
import type { Layer, ImageLayer, TextLayer } from '../types/editor.types';
import AITextGenerator, { type AITextGeneratorProps } from '../../ai-text/AITextGenerator';
import type { CTRFactors } from '../../../types/vision.types';

// ============================================
// ICONS
// ============================================

const Icons = {
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Wand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </svg>
  ),
  Eraser: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" /><path d="m5 11 9 9" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  Maximize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Expand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 15v4a2 2 0 0 1-2 2h-4M3 15v4a2 2 0 0 0 2 2h4M21 9V5a2 2 0 0 0-2-2h-4M3 9V5a2 2 0 0 1 2-2h4" />
    </svg>
  ),
  BarChart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  ),
  Palette: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  AlertCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.54 12.43-1.42-.65-8.28 3.77a2 2 0 0 1-1.66 0L2.88 11.78l-1.42.65a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22.54 16.43-1.42-.65-8.28 3.77a2 2 0 0 1-1.66 0L2.88 15.78l-1.42.65a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  Type: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
};

// ============================================
// TYPES
// ============================================

type AIToolTab = 'generate' | 'ai-text' | 'inpaint' | 'remove-bg' | 'face-swap' | 'upscale' | 'enhance' | 'expand' | 'decompose' | 'analyze' | 'vision' | 'vision-search';

interface AIToolsPanelProps {
  selectedLayers: Layer[];
  onAddImageLayer: (imageUrl: string, name?: string) => void;
  onAddTextLayer?: (text: string, x: number, y: number) => void;
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

// ============================================
// STYLE PRESETS
// ============================================

// Static config for useAIService - MUST be defined outside component
// to prevent infinite re-render loop (inline object = new reference every render
// → useEffect fires → setState → re-render → new reference → infinite loop)
const AI_SERVICE_CONFIG = {
  config: {
    providers: {
      tensorflow: {},
    },
  },
} as const;

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'minimalist', label: 'Minimalist', icon: '⬜' },
  { id: 'bold', label: 'Bold & Vibrant', icon: '🔥' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
];

const aspectRatios: { value: AIGenerateRequest['aspectRatio']; label: string }[] = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (Shorts)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

// ============================================
// COMPONENT
// ============================================

const AIToolsPanel: React.FC<AIToolsPanelProps> = ({
  selectedLayers,
  onAddImageLayer,
  onAddTextLayer,
  onUpdateLayer,
  canvasRef,
}) => {
  // Backend AI hook for all paid operations
  const { callBackendAI, isLoading, error, cancel: cancelAI, isAborted } = useBackendAI();
  // Local AI service only for free analyze operation
  const localAI = useAIService(AI_SERVICE_CONFIG);
  // Fetch tier config from backend (needed for capability checks)
  const modelTiers = useModelTiers();
  
  // Persisted state from Zustand store
  const {
    activeTab,
    setActiveTab,
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    style,
    setStyle,
    aspectRatio,
    setAspectRatio,
    selectedTier,
    setSelectedTier,
    steps,
    setSteps,
    showAdvanced,
    setShowAdvanced,
    enhanceType,
    setEnhanceType,
    expandDirection,
    setExpandDirection,
    expandPixels,
    setExpandPixels,
    expandPrompt,
    setExpandPrompt,
    upscaleScale,
    setUpscaleScale,
    upscaleModel,
    setUpscaleModel,
    faceSwapSource,
    setFaceSwapSource,
    inpaintMask,
    generatedImages,
    setGeneratedImages,
    analysisResult,
    setAnalysisResult,
    visionResult,
    setVisionResult,
    visionSearchQuery,
    setVisionSearchQuery,
    visionSearchResults,
    setVisionSearchResults,
  } = useAIToolsStore();

  // Whether the selected tier supports 4x upscale (backend-driven capability)
  const is4xAllowed = useMemo(() => {
    const config = modelTiers.getConfig('upscale');
    if (!config) return true; // fail-open while loading
    const tier = config.tiers.find(t => t.id === selectedTier);
    return tier?.capabilities?.maxScale === '4x';
  }, [modelTiers, selectedTier]);

  // Auto-downgrade from 4x to 2x when switching to a tier that doesn't support it
  useEffect(() => {
    if (!is4xAllowed && upscaleScale === 4) {
      setUpscaleScale(2);
    }
  }, [is4xAllowed, upscaleScale, setUpscaleScale]);
  
  // Local transient state (doesn't need persistence)
  const [currentOperation, setCurrentOperation] = useState<BackendAIOperation | 'analyze' | null>(null);
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [visionError, setVisionError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDecomposing, setIsDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [decomposedLayers, setDecomposedLayers] = useState<Array<{ name: string; imageBase64: string; bounds: { x: number; y: number; width: number; height: number }; score: number }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get selected image layer
  const selectedImageLayer = selectedLayers.find(
    (l): l is ImageLayer => l.type === 'image'
  );
  
  // ============================================
  // HANDLERS
  // ============================================
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setCurrentOperation('generate');
    try {
      const images = await callBackendAI('generate', {
        prompt,
        negativePrompt: negativePrompt || undefined,
        style,
        aspectRatio,
        tier: selectedTier,
      });
      if (images.length > 0) {
        setGeneratedImages([images[0], ...generatedImages].slice(0, 8));
        onAddImageLayer(images[0], 'AI Generated');
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [prompt, negativePrompt, style, aspectRatio, selectedTier, callBackendAI, onAddImageLayer, generatedImages, setGeneratedImages]);
  
  const handleRemoveBackground = useCallback(async () => {
    if (!selectedImageLayer) return;
    setCurrentOperation('remove-background');
    try {
      const images = await callBackendAI('remove-background', {
        image: selectedImageLayer.src,
      });
      if (images.length > 0) {
        onUpdateLayer(selectedImageLayer.id, { src: images[0] } as Partial<ImageLayer>);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, callBackendAI, onUpdateLayer]);
  
  const handleEnhance = useCallback(async () => {
    if (!selectedImageLayer) return;
    setCurrentOperation('enhance');
    try {
      const images = await callBackendAI('enhance', {
        image: selectedImageLayer.src,
        enhancementType: enhanceType,
      });
      if (images.length > 0) {
        onUpdateLayer(selectedImageLayer.id, { src: images[0] } as Partial<ImageLayer>);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, enhanceType, callBackendAI, onUpdateLayer]);
  
  const handleExpand = useCallback(async () => {
    if (!selectedImageLayer) return;
    setCurrentOperation('expand');
    try {
      const images = await callBackendAI('expand', {
        image: selectedImageLayer.src,
        prompt: expandPrompt || undefined,
        direction: expandDirection,
        expandPixels,
      });
      if (images.length > 0) {
        // Add expanded image as new layer (preserves original)
        onAddImageLayer(images[0], `Expanded ${expandDirection}`);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, expandPrompt, expandDirection, expandPixels, callBackendAI, onAddImageLayer]);
  
  const handleAnalyze = useCallback(async () => {
    if (!selectedImageLayer) return;
    setCurrentOperation('analyze');
    try {
      const result = await localAI.analyze({
        image: selectedImageLayer.src,
      });
      if (result.success) {
        setAnalysisResult(result as unknown as Parameters<typeof setAnalysisResult>[0]);
      }
    } catch {
      // local analysis failure
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, localAI, setAnalysisResult]);
  
  const handleSelectGeneratedImage = useCallback((imageUrl: string) => {
    onAddImageLayer(imageUrl, 'AI Generated');
  }, [onAddImageLayer]);
  
  const handleInpaint = useCallback(async () => {
    if (!selectedImageLayer || !inpaintMask || !prompt.trim()) return;
    setCurrentOperation('inpaint');
    try {
      const images = await callBackendAI('inpaint', {
        image: selectedImageLayer.src,
        mask: inpaintMask,
        prompt,
        negativePrompt: negativePrompt || undefined,
        tier: selectedTier,
      });
      if (images.length > 0) {
        onUpdateLayer(selectedImageLayer.id, { src: images[0] } as Partial<ImageLayer>);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, inpaintMask, prompt, negativePrompt, selectedTier, callBackendAI, onUpdateLayer]);
  
  const handleUpscale = useCallback(async () => {
    if (!selectedImageLayer) return;
    setCurrentOperation('upscale');
    try {
      const images = await callBackendAI('upscale', {
        image: selectedImageLayer.src,
        scale: `${upscaleScale}x`,
        tier: selectedTier,
      });
      if (images.length > 0) {
        onUpdateLayer(selectedImageLayer.id, { src: images[0] } as Partial<ImageLayer>);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, upscaleScale, selectedTier, callBackendAI, onUpdateLayer]);
  
  const handleFaceSwap = useCallback(async () => {
    if (!selectedImageLayer || !faceSwapSource) return;
    setCurrentOperation('face-swap');
    try {
      const images = await callBackendAI('face-swap', {
        sourceImage: faceSwapSource,
        targetImage: selectedImageLayer.src,
        tier: selectedTier,
      });
      if (images.length > 0) {
        onUpdateLayer(selectedImageLayer.id, { src: images[0] } as Partial<ImageLayer>);
      }
    } catch {
      // error state handled by useBackendAI
    } finally {
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, faceSwapSource, selectedTier, callBackendAI, onUpdateLayer]);
  
  const handleFaceSourceUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setFaceSwapSource(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);
  
  // ============================================
  // VISION HANDLERS
  // ============================================
  
  const handleVisionAnalyze = useCallback(async () => {
    if (!selectedImageLayer) return;
    setIsVisionLoading(true);
    setVisionError(null);
    setVisionResult(null);
    setCurrentOperation('analyze');
    
    try {
      const response = await authPost('/api/vision/describe', {
        imageBase64: selectedImageLayer.src,
      });
      
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 402) {
          throw new Error('Insufficient credits. Please purchase more credits to use vision analysis.');
        }
        throw new Error(data.error || 'Vision analysis failed');
      }
      
      const result = await response.json();
      setVisionResult(result);
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Vision analysis failed');
    } finally {
      setIsVisionLoading(false);
      setCurrentOperation(null);
    }
  }, [selectedImageLayer, setVisionResult]);
  
  const handleVisionSearch = useCallback(async () => {
    if (!visionSearchQuery.trim()) return;
    setIsVisionLoading(true);
    setVisionError(null);
    setVisionSearchResults([]);
    
    try {
      const response = await authGet(
        `/api/vision/search?q=${encodeURIComponent(visionSearchQuery.trim())}&count=12`
      );
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }
      
      const data = await response.json();
      setVisionSearchResults(data.results || []);
    } catch (err) {
      setVisionError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsVisionLoading(false);
    }
  }, [visionSearchQuery, setVisionSearchResults]);
  
  const handleAddSearchResult = useCallback((imageUrl: string, title: string) => {
    onAddImageLayer(imageUrl, title || 'Web Image');
  }, [onAddImageLayer]);
  
  const handleDecompose = useCallback(async () => {
    if (!selectedImageLayer) return;
    setIsDecomposing(true);
    setDecomposeError(null);
    setDecomposedLayers([]);
    
    try {
      const response = await authPost('/api/thumbnails/ai/decompose', {
        image: selectedImageLayer.src,
        maxLayers: 14,
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (response.status === 402) {
          throw new Error('Insufficient credits. 3 credits required.');
        }
        throw new Error(data.error || `Decompose failed (${response.status})`);
      }
      
      const data = await response.json();
      if (!data.success || !data.layers || data.layers.length === 0) {
        throw new Error('No layers returned from decomposition');
      }
      
      setDecomposedLayers(data.layers);
      
      // Auto-add all layers to the canvas
      data.layers.forEach((layer: { name: string; imageBase64: string; bounds: { x: number; y: number; width: number; height: number }; score: number }, idx: number) => {
        onAddImageLayer(layer.imageBase64, layer.name || `Decomposed ${idx + 1}`);
      });
    } catch (err) {
      setDecomposeError(err instanceof Error ? err.message : 'Decompose failed');
    } finally {
      setIsDecomposing(false);
    }
  }, [selectedImageLayer, onAddImageLayer]);
  
  const handleCopyToClipboard = useCallback(async (text: string, field: string) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  }, []);
  
  // ============================================
  // RENDER TABS
  // ============================================
  
  // Detect selected text layer for AI Text tab
  const selectedTextLayer = selectedLayers.find((l): l is TextLayer => l.type === 'text') || null;

  const tabs: { id: AIToolTab; label: string; icon: React.ReactNode }[] = [
    { id: 'generate', label: 'Generate', icon: <Icons.Sparkles /> },
    { id: 'ai-text', label: 'AI Text', icon: <Icons.Type /> },
    { id: 'inpaint', label: 'Inpaint', icon: <Icons.Wand /> },
    { id: 'remove-bg', label: 'Remove BG', icon: <Icons.Eraser /> },
    { id: 'face-swap', label: 'Face Swap', icon: <Icons.User /> },
    { id: 'upscale', label: 'Upscale', icon: <Icons.Maximize /> },
    { id: 'enhance', label: 'Enhance', icon: <Icons.Palette /> },
    { id: 'expand', label: 'Expand', icon: <Icons.Expand /> },
    { id: 'decompose', label: 'Decompose', icon: <Icons.Layers /> },
    { id: 'analyze', label: 'Score', icon: <Icons.BarChart /> },
    { id: 'vision', label: 'Vision', icon: <Icons.Eye /> },
    { id: 'vision-search', label: 'Search', icon: <Icons.Search /> },
  ];
  
  // ============================================
  // RENDER
  // ============================================
  
  return (
    <div className="ai-tools-panel">
      {/* Tab Navigation */}
      <div className="ai-tools-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`ai-tools-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Loading Indicator with Cancel button — JJ */}
      {isLoading && currentOperation && (
        <div className="ai-tools-loading">
          <Icons.Loader />
          <span>Processing {currentOperation}...</span>
          <button
            className="ai-cancel-btn"
            onClick={cancelAI}
            style={{
              marginLeft: '8px',
              padding: '4px 10px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Error Display */}
      {error && (
        <div className="ai-tools-error">
          <Icons.AlertCircle />
          <span>{error}</span>
          {error.includes('Insufficient credits') && (
            <a href="/dashboard/credits" style={{ color: '#60a5fa', fontSize: '12px', marginTop: '4px' }}>
              Purchase more credits
            </a>
          )}
        </div>
      )}
      
      {/* Tab Content */}
      <div className="ai-tools-content">
        {/* AI TEXT TAB */}
        {activeTab === 'ai-text' && (
          <AITextGenerator
            mode="full"
            onAddTextLayer={onAddTextLayer}
            onUpdateTextLayer={onUpdateLayer as AITextGeneratorProps['onUpdateTextLayer']}
            selectedTextLayerId={selectedTextLayer?.id || null}
            selectedTextContent={selectedTextLayer?.content || undefined}
            imageSource={selectedImageLayer?.src || null}
          />
        )}

        {/* GENERATE TAB */}
        {activeTab === 'generate' && (
          <div className="ai-generate-panel">
            <textarea
              className="ai-prompt-input"
              placeholder="Describe your thumbnail... (e.g., 'A futuristic cityscape at sunset')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  handleGenerate();
                }
              }}
            />
            
            {/* Style Selection */}
            <div className="ai-option-group">
              <label>Style</label>
              <div className="ai-style-grid">
                {stylePresets.map(preset => (
                  <button
                    key={preset.id}
                    className={`ai-style-btn ${style === preset.id ? 'active' : ''}`}
                    onClick={() => setStyle(preset.id)}
                  >
                    <span className="ai-style-icon">{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Aspect Ratio */}
            <div className="ai-option-group">
              <label>Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as '16:9' | '9:16' | '1:1' | '4:3' | '3:4')}
              >
                {aspectRatios.map(ar => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>
            
            {/* Advanced Options */}
            <button
              className="ai-advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '− Hide' : '+ Show'} Advanced
            </button>
            
            {showAdvanced && (
              <div className="ai-advanced-options">
                <div className="ai-option-group">
                  <label>Negative Prompt</label>
                  <textarea
                    className="ai-prompt-input small"
                    placeholder="What to avoid..."
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                  />
                </div>
                <div className="ai-option-group">
                  <label>Steps: {steps}</label>
                  <input
                    type="range"
                    min={1}
                    max={50}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
            
            {/* Generate Button */}
            <button
              className="ai-action-btn primary"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading && currentOperation === 'generate' ? (
                <><Icons.Loader /> Generating...</>
              ) : (
                <><Icons.Sparkles /> Generate Thumbnail</>
              )}
            </button>
            <p className="ai-hint">Press Ctrl+Enter to generate</p>
            
            {/* Generated Images History */}
            {generatedImages.length > 0 && (
              <div className="ai-history">
                <h4>Recent</h4>
                <div className="ai-history-grid">
                  {generatedImages.map((url, i) => (
                    <button
                      key={i}
                      className="ai-history-item"
                      onClick={() => handleSelectGeneratedImage(url)}
                    >
                      <img src={url} alt={`Generated ${i + 1}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* INPAINT TAB */}
        {activeTab === 'inpaint' && (
          <div className="ai-inpaint-panel">
            <div className="ai-tool-info">
              <Icons.Wand />
              <div>
                <h4>AI Inpainting</h4>
                <p>Select an area on your image and describe what you want to add or change.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <p className="ai-instruction">
                  1. Use the brush tool (B) to paint over the area you want to change
                </p>
                <textarea
                  className="ai-prompt-input"
                  placeholder="Describe what should appear in the painted area..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <button
                  className="ai-action-btn primary"
                  disabled={isLoading || !prompt.trim()}
                  onClick={handleInpaint}
                >
                  {isLoading && currentOperation === 'inpaint' ? (
                    <><Icons.Loader /> Inpainting...</>
                  ) : (
                    <><Icons.Wand /> Apply Inpainting</>
                  )}
                </button>
              </>
            )}
          </div>
        )}
        
        {/* REMOVE BACKGROUND TAB */}
        {activeTab === 'remove-bg' && (
          <div className="ai-remove-bg-panel">
            <div className="ai-tool-info">
              <Icons.Eraser />
              <div>
                <h4>Background Removal</h4>
                <p>Automatically remove the background from your image using AI.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                <button
                  className="ai-action-btn primary"
                  onClick={handleRemoveBackground}
                  disabled={isLoading}
                >
                  {isLoading && currentOperation === 'remove-background' ? (
                    <><Icons.Loader /> Removing...</>
                  ) : (
                    <><Icons.Eraser /> Remove Background</>
                  )}
                </button>
                <p className="ai-hint">1 credit per removal</p>
              </>
            )}
          </div>
        )}
        
        {/* FACE SWAP TAB */}
        {activeTab === 'face-swap' && (
          <div className="ai-face-swap-panel">
            <div className="ai-tool-info">
              <Icons.User />
              <div>
                <h4>Face Swap</h4>
                <p>Replace faces in your thumbnail seamlessly using AI.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer with a face first</span>
              </div>
            ) : (
              <>
                <div className="ai-option-group">
                  <label>Source Face</label>
                  {faceSwapSource ? (
                    <div className="ai-preview-box" style={{ aspectRatio: '1/1', maxWidth: '120px' }}>
                      <img src={faceSwapSource} alt="Source face" />
                      <button 
                        className="ai-remove-btn"
                        onClick={() => setFaceSwapSource(null)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: 'white' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="ai-add-persona-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span>+</span>
                      <span>Upload Face Image</span>
                    </button>
                  )}
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleFaceSwap}
                  disabled={isLoading || !faceSwapSource}
                >
                  {isLoading && currentOperation === 'face-swap' ? (
                    <><Icons.Loader /> Swapping...</>
                  ) : (
                    <><Icons.User /> Swap Face</>
                  )}
                </button>
                <p className="ai-hint">Credits vary by tier</p>
              </>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFaceSourceUpload}
            />
          </div>
        )}
        
        {/* UPSCALE TAB */}
        {activeTab === 'upscale' && (
          <div className="ai-upscale-panel">
            <div className="ai-tool-info">
              <Icons.Maximize />
              <div>
                <h4>AI Upscaling</h4>
                <p>Increase image resolution while maintaining quality using AI.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                
                <div className="ai-option-group">
                  <label>Scale Factor</label>
                  <div className="ai-enhance-options">
                    <button
                      className={`ai-enhance-btn ${upscaleScale === 2 ? 'active' : ''}`}
                      onClick={() => setUpscaleScale(2)}
                    >
                      2x Upscale
                    </button>
                    <button
                      className={`ai-enhance-btn ${!is4xAllowed ? 'disabled' : ''} ${upscaleScale === 4 ? 'active' : ''}`}
                      onClick={() => is4xAllowed && setUpscaleScale(4)}
                      disabled={!is4xAllowed}
                      title={!is4xAllowed ? '4x requires Pro tier' : undefined}
                    >
                      {is4xAllowed ? '4x Upscale' : '4x (Pro tier)'}
                    </button>
                  </div>
                </div>
                
                <div className="ai-option-group">
                  <label>Model Type</label>
                  <select
                    value={upscaleModel}
                    onChange={(e) => setUpscaleModel(e.target.value as 'general' | 'face' | 'anime')}
                  >
                    <option value="general">General (Best for most images)</option>
                    <option value="face">Face Enhanced (Better for portraits)</option>
                    <option value="anime">Anime/Illustration</option>
                  </select>
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleUpscale}
                  disabled={isLoading}
                >
                  {isLoading && currentOperation === 'upscale' ? (
                    <><Icons.Loader /> Upscaling...</>
                  ) : (
                    <><Icons.Maximize /> Upscale Image</>
                  )}
                </button>
                <p className="ai-hint">Credits vary by tier</p>
              </>
            )}
          </div>
        )}
        
        {/* ENHANCE TAB */}
        {activeTab === 'enhance' && (
          <div className="ai-enhance-panel">
            <div className="ai-tool-info">
              <Icons.Maximize />
              <div>
                <h4>Image Enhancement</h4>
                <p>Improve image quality with AI-powered enhancements.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-enhance-options">
                  {(['auto', 'sharpen', 'denoise', 'color'] as const).map(type => (
                    <button
                      key={type}
                      className={`ai-enhance-btn ${enhanceType === type ? 'active' : ''}`}
                      onClick={() => setEnhanceType(type)}
                    >
                      {type === 'auto' && '✨ Auto'}
                      {type === 'sharpen' && '🔍 Sharpen'}
                      {type === 'denoise' && '🔇 Denoise'}
                      {type === 'color' && '🎨 Color'}
                    </button>
                  ))}
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleEnhance}
                  disabled={isLoading}
                >
                  {isLoading && currentOperation === 'enhance' ? (
                    <><Icons.Loader /> Enhancing...</>
                  ) : (
                    <><Icons.Maximize /> Apply Enhancement</>
                  )}
                </button>
                <p className="ai-hint">1 credit per enhancement</p>
              </>
            )}
          </div>
        )}
        
        {/* EXPAND TAB */}
        {activeTab === 'expand' && (
          <div className="ai-expand-panel">
            <div className="ai-tool-info">
              <Icons.Expand />
              <div>
                <h4>Expand / Outpaint</h4>
                <p>Extend your image canvas in any direction with AI-generated content.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                
                {/* Direction selector */}
                <div className="ai-expand-direction">
                  <label className="ai-label">Direction</label>
                  <div className="ai-expand-direction-grid">
                    {(['all', 'top', 'bottom', 'left', 'right'] as const).map(dir => (
                      <button
                        key={dir}
                        className={`ai-expand-dir-btn ${expandDirection === dir ? 'active' : ''}`}
                        onClick={() => setExpandDirection(dir)}
                        title={dir === 'all' ? 'Expand all sides' : `Expand ${dir}`}
                      >
                        {dir === 'all' && '↔️ All'}
                        {dir === 'top' && '⬆️ Top'}
                        {dir === 'bottom' && '⬇️ Bottom'}
                        {dir === 'left' && '⬅️ Left'}
                        {dir === 'right' && '➡️ Right'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Pixels slider */}
                <div className="ai-expand-pixels">
                  <label className="ai-label">
                    Expansion: {expandPixels}px
                  </label>
                  <input
                    type="range"
                    min="64"
                    max="512"
                    step="64"
                    value={expandPixels}
                    onChange={(e) => setExpandPixels(Number(e.target.value))}
                    className="ai-slider"
                  />
                  <div className="ai-slider-labels">
                    <span>64px</span>
                    <span>512px</span>
                  </div>
                </div>
                
                {/* Prompt input */}
                <div className="ai-expand-prompt">
                  <label className="ai-label">Prompt (optional)</label>
                  <textarea
                    value={expandPrompt}
                    onChange={(e) => setExpandPrompt(e.target.value)}
                    placeholder="Describe what should fill the expanded area... (leave empty for natural extension)"
                    className="ai-textarea"
                    rows={2}
                  />
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleExpand}
                  disabled={isLoading}
                >
                  {isLoading && currentOperation === 'expand' ? (
                    <><Icons.Loader /> Expanding...</>
                  ) : (
                    <><Icons.Expand /> Expand Image</>
                  )}
                </button>
                <p className="ai-hint">2 credits per expansion</p>
                
                {error && currentOperation === 'expand' && (
                  <div className="ai-tools-error">
                    <Icons.AlertCircle />
                    <span>{error}</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* DECOMPOSE TAB */}
        {activeTab === 'decompose' && (
          <div className="ai-decompose-panel">
            <div className="ai-tool-info">
              <Icons.Layers />
              <div>
                <h4>Auto-Decompose</h4>
                <p>Split your image into separate layers for each detected object using AI segmentation.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleDecompose}
                  disabled={isDecomposing}
                >
                  {isDecomposing ? (
                    <><Icons.Loader /> Decomposing...</>
                  ) : (
                    <><Icons.Layers /> Decompose into Layers</>
                  )}
                </button>
                <p className="ai-hint">3 credits • Detects up to 14 elements</p>
                
                {decomposeError && (
                  <div className="ai-tools-error">
                    <Icons.AlertCircle />
                    <span>{decomposeError}</span>
                  </div>
                )}
                
                {decomposedLayers.length > 0 && (
                  <div className="ai-decompose-results">
                    <h5>Extracted {decomposedLayers.length} Layers</h5>
                    <div className="ai-decompose-grid">
                      {decomposedLayers.map((layer, idx) => (
                        <button
                          key={idx}
                          className="ai-decompose-item"
                          onClick={() => onAddImageLayer(layer.imageBase64, `Decomposed ${idx + 1}`)}
                          title={`Coverage: ${(layer.score * 100).toFixed(0)}% • ${layer.bounds.width}×${layer.bounds.height}`}
                        >
                          <img src={layer.imageBase64} alt={layer.name} />
                          <div className="ai-decompose-overlay">
                            <span>{layer.name}</span>
                            <span className="ai-decompose-score">{(layer.score * 100).toFixed(0)}%</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="ai-hint">Click a layer to add it again</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* ANALYZE TAB */}
        {activeTab === 'analyze' && (
          <div className="ai-analyze-panel">
            <div className="ai-tool-info">
              <Icons.BarChart />
              <div>
                <h4>Thumbnail Score</h4>
                <p>Get AI-powered analysis and suggestions for your thumbnail.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <button
                  className="ai-action-btn primary"
                  onClick={handleAnalyze}
                  disabled={isLoading || localAI.isLoading}
                >
                  {(isLoading || localAI.isLoading) && currentOperation === 'analyze' ? (
                    <><Icons.Loader /> Analyzing...</>
                  ) : (
                    <><Icons.BarChart /> Analyze Thumbnail</>
                  )}
                </button>
                
                {analysisResult && (
                  <div className="ai-analysis-result">
                    <div className="ai-score-overall">
                      <span className="score-value">{analysisResult.scores.overall}</span>
                      <span className="score-label">Overall Score</span>
                    </div>
                    
                    <div className="ai-scores-grid">
                      {Object.entries(analysisResult.scores)
                        .filter(([key]) => key !== 'overall')
                        .map(([key, value]) => (
                          <div key={key} className="ai-score-item">
                            <div className="score-bar">
                              <div 
                                className="score-fill" 
                                style={{ width: `${value}%` }}
                              />
                            </div>
                            <span className="score-name">{key}</span>
                            <span className="score-num">{value}</span>
                          </div>
                        ))}
                    </div>
                    
                    {analysisResult.suggestions.length > 0 && (
                      <div className="ai-suggestions">
                        <h5>Suggestions</h5>
                        <ul>
                          {analysisResult.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysisResult.issues.length > 0 && (
                      <div className="ai-issues">
                        <h5>Issues</h5>
                        {analysisResult.issues.map((issue, i) => (
                          <div key={i} className={`ai-issue ${issue.type}`}>
                            <Icons.AlertCircle />
                            <span>{issue.message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* VISION ANALYZE TAB */}
        {activeTab === 'vision' && (
          <div className="ai-vision-panel">
            <div className="ai-tool-info">
              <Icons.Eye />
              <div>
                <h4>Gemini Vision Analysis</h4>
                <p>Deep analysis with design elements, colors, and AI prompt suggestions.</p>
              </div>
            </div>
            
            {!selectedImageLayer ? (
              <div className="ai-notice">
                <Icons.AlertCircle />
                <span>Select an image layer first</span>
              </div>
            ) : (
              <>
                <div className="ai-preview-box">
                  <img src={selectedImageLayer.src} alt="Selected" />
                </div>
                
                <button
                  className="ai-action-btn primary"
                  onClick={handleVisionAnalyze}
                  disabled={isVisionLoading}
                >
                  {isVisionLoading && currentOperation === 'analyze' ? (
                    <><Icons.Loader /> Analyzing with Gemini...</>
                  ) : (
                    <><Icons.Eye /> Analyze with Vision AI</>
                  )}
                </button>
                <p className="ai-hint">1 credit per analysis</p>
                
                {visionError && (
                  <div className="ai-tools-error">
                    <Icons.AlertCircle />
                    <span>{visionError}</span>
                  </div>
                )}
                
                {visionResult && (
                  <div className="ai-vision-result">
                    {/* CTR Prediction Score */}
                    {visionResult.elements.ctrFactors && (
                      <div className="ai-vision-section">
                        <h5>CTR Prediction</h5>
                        <div className="ai-ctr-overall">
                          <span className="ai-ctr-score">{visionResult.elements.ctrFactors.overallCTR}</span>
                          <span className="ai-ctr-label">/ 100</span>
                        </div>
                        <div className="ai-ctr-breakdown">
                          {[
                            { key: 'faceScore', label: 'Face', icon: '👤' },
                            { key: 'emotionScore', label: 'Emotion', icon: '🎭' },
                            { key: 'colorScore', label: 'Color', icon: '🎨' },
                            { key: 'textScore', label: 'Text', icon: '📝' },
                            { key: 'compositionScore', label: 'Layout', icon: '📐' },
                          ].map(({ key, label, icon }) => {
                            const score = visionResult.elements.ctrFactors[key as keyof CTRFactors] || 0;
                            return (
                              <div key={key} className="ai-ctr-bar">
                                <span className="ai-ctr-bar-label">{icon} {label}</span>
                                <div className="ai-ctr-bar-track">
                                  <div
                                    className={`ai-ctr-bar-fill ${score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'}`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                                <span className="ai-ctr-bar-value">{score}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Face Details */}
                    {visionResult.elements.faceDetails && visionResult.elements.faceDetails.length > 0 && (
                      <div className="ai-vision-section">
                        <h5>Face Analysis ({visionResult.elements.faces} detected)</h5>
                        <div className="ai-face-details">
                          {visionResult.elements.faceDetails.map((face, idx) => (
                            <div key={idx} className="ai-face-card">
                              <span className="ai-face-expr">{face.expression}</span>
                              <div className="ai-face-meta">
                                <span>{face.size} face</span>
                                <span>{face.position}</span>
                                <span>{face.eyeContact ? '👁️ eye contact' : 'no eye contact'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement Suggestions */}
                    {visionResult.elements.suggestions && visionResult.elements.suggestions.length > 0 && (
                      <div className="ai-vision-section">
                        <h5>How to Improve</h5>
                        <ul className="ai-suggestions-list">
                          {visionResult.elements.suggestions.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Description */}
                    <div className="ai-vision-section">
                      <h5>Description</h5>
                      <p className="ai-vision-text">{visionResult.description}</p>
                    </div>
                    
                    {/* Suggested Prompt */}
                    <div className="ai-vision-section">
                      <div className="ai-vision-header">
                        <h5>Suggested Prompt</h5>
                        <button
                          className="ai-copy-btn"
                          onClick={() => handleCopyToClipboard(visionResult.suggestedPrompt, 'prompt')}
                        >
                          {copiedField === 'prompt' ? <Icons.Check /> : <Icons.Copy />}
                        </button>
                      </div>
                      <p className="ai-vision-prompt">{visionResult.suggestedPrompt}</p>
                    </div>
                    
                    {/* Design Elements */}
                    <div className="ai-vision-section">
                      <h5>Design Elements</h5>
                      <div className="ai-vision-grid">
                        <div className="ai-vision-item">
                          <span className="label">Subject</span>
                          <span className="value">{visionResult.elements.mainSubject}</span>
                        </div>
                        <div className="ai-vision-item">
                          <span className="label">Faces</span>
                          <span className="value">{visionResult.elements.faces}</span>
                        </div>
                        <div className="ai-vision-item">
                          <span className="label">Mood</span>
                          <span className="value">{visionResult.elements.mood}</span>
                        </div>
                        <div className="ai-vision-item">
                          <span className="label">Style</span>
                          <span className="value">{visionResult.elements.style}</span>
                        </div>
                        <div className="ai-vision-item">
                          <span className="label">Contrast</span>
                          <span className="value">{visionResult.elements.colorContrast || 'N/A'}</span>
                        </div>
                        <div className="ai-vision-item full">
                          <span className="label">Composition</span>
                          <span className="value">{visionResult.elements.composition}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Color Palette */}
                    {visionResult.elements.colorPalette.length > 0 && (
                      <div className="ai-vision-section">
                        <h5>Color Palette</h5>
                        <div className="ai-color-palette">
                          {visionResult.elements.colorPalette.map((color, idx) => (
                            <button
                              key={idx}
                              className="ai-color-swatch"
                              style={{ backgroundColor: color }}
                              onClick={() => handleCopyToClipboard(color, `color-${idx}`)}
                              title={`Copy ${color}`}
                            >
                              {copiedField === `color-${idx}` && <Icons.Check />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Text Overlay */}
                    {visionResult.elements.textOverlay.length > 0 && (
                      <div className="ai-vision-section">
                        <h5>Text Found</h5>
                        <div className="ai-text-tags">
                          {visionResult.elements.textOverlay.map((text, idx) => (
                            <button
                              key={idx}
                              className="ai-text-tag"
                              onClick={() => handleCopyToClipboard(text, `text-${idx}`)}
                            >
                              {copiedField === `text-${idx}` ? 'Copied!' : `"${text}"`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
        
        {/* VISION SEARCH TAB */}
        {activeTab === 'vision-search' && (
          <div className="ai-vision-search-panel">
            <div className="ai-tool-info">
              <Icons.Search />
              <div>
                <h4>Web Image Search</h4>
                <p>Find reference images and add them to your canvas.</p>
              </div>
            </div>
            
            <div className="ai-search-input-group">
              <input
                type="text"
                className="ai-search-input"
                placeholder="Search for thumbnails, images..."
                value={visionSearchQuery}
                onChange={(e) => setVisionSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVisionSearch();
                }}
              />
              <button
                className="ai-search-btn"
                onClick={handleVisionSearch}
                disabled={!visionSearchQuery.trim() || isVisionLoading}
              >
                {isVisionLoading ? <Icons.Loader /> : <Icons.Search />}
              </button>
            </div>
            
            {visionError && (
              <div className="ai-tools-error">
                <Icons.AlertCircle />
                <span>{visionError}</span>
              </div>
            )}
            
            {visionSearchResults.length > 0 && (
              <div className="ai-search-results">
                <p className="ai-hint">{visionSearchResults.length} results. Click to add to canvas.</p>
                <div className="ai-search-grid">
                  {visionSearchResults.map((result, idx) => (
                    <button
                      key={idx}
                      className="ai-search-result-item"
                      onClick={() => handleAddSearchResult(result.url, result.title)}
                      title={result.title}
                    >
                      <img
                        src={result.thumbnailUrl}
                        alt={result.title}
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = result.url;
                        }}
                      />
                      <div className="ai-search-overlay">
                        <span>{result.width}x{result.height}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {!isVisionLoading && visionSearchResults.length === 0 && visionSearchQuery && (
              <div className="ai-notice">
                <Icons.Search />
                <span>Press Enter to search</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Credit Cost Indicator */}
      <div className="ai-cost-indicator">
        <span>
          {activeTab === 'analyze' ? 'Free • Local analysis' : 
           activeTab === 'vision' ? '1 credit • Gemini Vision' :
           activeTab === 'vision-search' ? 'Free • Web search' :
           activeTab === 'ai-text' ? '1 credit • AI text generation' :
           activeTab === 'decompose' ? '3 credits • SAM auto-decomposition' :
           'Uses credits • Billed per operation'}
        </span>
      </div>
    </div>
  );
};

export default React.memo(AIToolsPanel);
