/**
 * AI Tools Page
 * Standalone AI tools for image manipulation without the full editor
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Wand2,
  Eraser,
  Users,
  Zap,
  Image as ImageIcon,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  Maximize2,
  X,
  Move,
  MousePointer2,
  Eye,
  TrendingUp,
  Upload,
  FolderOpen,
  Link,
  Loader2,
} from 'lucide-react';
import ThumbnailActionBar from '../ui/ThumbnailActionBar';
import RecreateBetterModal from '../ui/RecreateBetterModal';
import { useAIService } from '../../hooks/useAIService';
import { useAIWorker } from '../../hooks/useAIWorker';
import { config } from '../../config/environment';
import { authPost, authGet, createAIToolAbortController } from '../../utils/api';
import type { AIGenerateRequest } from '../../services/ai-providers';
import { ModelTierSelector, useModelTiers } from '../../features/ai-tools';
import type { ModelTierId } from '../../features/ai-tools';
import ImageUploadZone from '../ui/ImageUploadZone';
import Tooltip from '../ui/Tooltip';

// ============================================
// TYPES
// ============================================

type AIToolId =
  | 'generate'
  | 'inpaint'
  | 'remove-bg'
  | 'face-swap'
  | 'enhance'
  | 'upscale'
  | 'expand'
  | 'object-removal'
  | 'recreate-better';

interface AITool {
  id: AIToolId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  requiresImage: boolean;
  apiCost: string;
}

// ============================================
// STYLE PRESETS
// ============================================

const stylePresets = [
  { id: 'cinematic', label: 'Cinematic', icon: '🎬' },
  { id: 'minimalist', label: 'Minimalist', icon: '⬜' },
  { id: 'bold', label: 'Bold & Vibrant', icon: '🔥' },
  { id: 'professional', label: 'Professional', icon: '💼' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'gaming', label: 'Gaming', icon: '🎮' },
];

const aspectRatios: {
  value: AIGenerateRequest['aspectRatio'];
  label: string;
}[] = [
  { value: '16:9', label: '16:9 (YouTube)' },
  { value: '9:16', label: '9:16 (Shorts/Reels)' },
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Standard)' },
];

// ============================================
// COMPONENT
// ============================================

const AIToolsPage: React.FC = () => {
  // Navigation for opening results in editor
  const navigate = useNavigate();

  // Use Web Worker if available, fallback to main thread
  const worker = useAIWorker();

  // Fetch tier config from backend (single source of truth)
  const modelTiers = useModelTiers();

  // Memoize config to prevent infinite re-render loop in useAIService
  const aiServiceConfig = useMemo(
    () => ({
      config: {
        providers: {
          tensorflow: {},
          replicate: {
            apiKey: config.ai.replicateApiKey || '', // Falls back to mock provider if empty
          },
        },
      },
      autoInitialize: !worker.isReady, // Only initialize if worker not available
    }),
    [worker.isReady]
  );

  // Fallback AI Service (main thread) for browsers without worker support
  const aiService = useAIService(aiServiceConfig);

  // Use worker if available, otherwise fallback to aiService
  const ai = worker.isReady
    ? {
        isLoading: worker.isProcessing,
        error: null,
        isInitializing: false,
        isReady: worker.isReady,
      }
    : aiService;

  // State
  const [selectedTool, setSelectedTool] = useState<AIToolId | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultOriginalUrl, setResultOriginalUrl] = useState<string | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] =
    useState<AIGenerateRequest['aspectRatio']>('16:9');
  const [enhanceType, setEnhanceType] = useState<
    'auto' | 'sharpen' | 'denoise' | 'color'
  >('auto');
  const [upscaleScale, setUpscaleScale] = useState<2 | 4>(2);
  const [faceSwapSource, setFaceSwapSource] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  // JJ: AbortController for cancellable AI operations
  const [aiAbortController, setAiAbortController] = useState<AbortController | null>(null);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expand/Outpaint state
  const [expandDirection, setExpandDirection] = useState<'all' | 'top' | 'bottom' | 'left' | 'right'>('all');
  const [expandPixels, setExpandPixels] = useState<number>(128);
  const [expandPrompt, setExpandPrompt] = useState<string>('');

  // Object Removal state
  const [objectRemovalClicks, setObjectRemovalClicks] = useState<Array<{ x: number; y: number; label: 1 | 0 }>>([]);
  const [objectRemovalMask, setObjectRemovalMask] = useState<string | null>(null);
  const [objectRemovalStep, setObjectRemovalStep] = useState<'select' | 'confirm' | 'processing'>('select');

  // Model tier selection ("Intel Inside" pattern)
  // Default to 'standard' — will be validated against fetched config
  const [selectedTier, setSelectedTier] = useState<ModelTierId>('standard');

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
  }, [is4xAllowed, upscaleScale]);

  // Recreate Better modal state
  const [recreateBetterOpen, setRecreateBetterOpen] = useState(false);
  const [recreateBetterImageUrl, setRecreateBetterImageUrl] = useState<string | null>(null);

  // Recreate Better input source state
  type RecreateBetterInputTab = 'upload' | 'my-thumbnails' | 'url';
  const [recreateBetterInputTab, setRecreateBetterInputTab] = useState<RecreateBetterInputTab>('upload');
  const [recreateBetterUrlInput, setRecreateBetterUrlInput] = useState('');
  const [userThumbnails, setUserThumbnails] = useState<Array<{ id: string; imageUrl: string; title?: string }>>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const [myThumbnailsPreview, setMyThumbnailsPreview] = useState<string | null>(null); // Preview before confirming selection

  // Listen for Recreate Better event from ThumbnailActionBar
  React.useEffect(() => {
    const handleRecreateBetter = (event: CustomEvent<{ imageUrl: string }>) => {
      setRecreateBetterImageUrl(event.detail.imageUrl);
      setRecreateBetterOpen(true);
    };
    window.addEventListener('openRecreateBetter', handleRecreateBetter as EventListener);
    return () => window.removeEventListener('openRecreateBetter', handleRecreateBetter as EventListener);
  }, []);

  // Fetch user thumbnails when Recreate Better tool is selected and My Thumbnails tab is active
  React.useEffect(() => {
    if (selectedTool === 'recreate-better' && recreateBetterInputTab === 'my-thumbnails' && userThumbnails.length === 0) {
      setIsLoadingThumbnails(true);
      authGet('/api/thumbnails?limit=50')
        .then(res => res.json())
        .then(data => {
          setUserThumbnails(data.thumbnails || []);
        })
        .catch(err => {
          console.error('Failed to fetch thumbnails:', err);
        })
        .finally(() => {
          setIsLoadingThumbnails(false);
        });
    }
  }, [selectedTool, recreateBetterInputTab, userThumbnails.length]);

  // Handle URL input for Recreate Better
  const handleRecreateBetterUrlSubmit = useCallback(() => {
    if (!recreateBetterUrlInput.trim()) return;
    // Basic URL validation
    try {
      new URL(recreateBetterUrlInput);
      setUploadedImage(recreateBetterUrlInput);
    } catch {
      setGenerateError('Please enter a valid URL');
    }
  }, [recreateBetterUrlInput]);

  // Tool definitions
  const aiTools: AITool[] = [
    {
      id: 'generate',
      name: 'AI Image Generation',
      description:
        'Create stunning images from text descriptions using advanced AI models',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'from-purple-500 to-pink-500',
      features: [
        'Text-to-image',
        'Style presets',
        'High resolution',
        'Multiple variants',
      ],
      requiresImage: false,
      apiCost: '~$0.003/image',
    },
    {
      id: 'inpaint',
      name: 'AI Inpainting',
      description:
        'Intelligently edit parts of your images by describing what you want',
      icon: <Wand2 className="w-6 h-6" />,
      color: 'from-blue-500 to-cyan-500',
      features: [
        'Smart editing',
        'Context-aware',
        'Natural blending',
        'Precise control',
      ],
      requiresImage: true,
      apiCost: '~$0.003/edit',
    },
    {
      id: 'remove-bg',
      name: 'Background Removal',
      description:
        'Automatically remove backgrounds from images with AI precision',
      icon: <Eraser className="w-6 h-6" />,
      color: 'from-green-500 to-emerald-500',
      features: [
        'One-click removal',
        'Edge detection',
        'Transparent output',
        'PNG export',
      ],
      requiresImage: true,
      apiCost: 'Free (local)',
    },
    {
      id: 'face-swap',
      name: 'Face Swap',
      description: 'Seamlessly swap faces in images using AI face detection',
      icon: <Users className="w-6 h-6" />,
      color: 'from-orange-500 to-red-500',
      features: [
        'Face detection',
        'Natural blending',
        'Multiple faces',
        'Quick swap',
      ],
      requiresImage: true,
      apiCost: '~$0.002/swap',
    },
    {
      id: 'enhance',
      name: 'Image Enhancement',
      description: 'Improve image quality with AI-powered enhancement tools',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-yellow-500 to-orange-500',
      features: ['Auto enhance', 'Sharpen', 'Denoise', 'Color correction'],
      requiresImage: true,
      apiCost: 'Free (local)',
    },
    {
      id: 'upscale',
      name: 'AI Upscaling',
      description:
        'Increase image resolution while maintaining quality using AI',
      icon: <Maximize2 className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-500',
      features: [
        '2x/4x upscale',
        'Detail preservation',
        'Smart interpolation',
        'Quality preservation',
      ],
      requiresImage: true,
      apiCost: '~$0.0015/image',
    },
    {
      id: 'expand',
      name: 'AI Expand / Outpaint',
      description:
        'Extend your image canvas in any direction with AI-generated content',
      icon: <Move className="w-6 h-6" />,
      color: 'from-teal-500 to-cyan-500',
      features: [
        'Extend any direction',
        'Context-aware fill',
        'Seamless blending',
        'Custom prompts',
      ],
      requiresImage: true,
      apiCost: '2 credits/expand',
    },
    {
      id: 'object-removal',
      name: 'Object Removal',
      description:
        'Click on any object to remove it — AI fills the area with matching content',
      icon: <MousePointer2 className="w-6 h-6" />,
      color: 'from-rose-500 to-pink-500',
      features: [
        'Click to select',
        'AI-powered removal',
        'Context-aware fill',
        'Clean results',
      ],
      requiresImage: true,
      apiCost: '2 credits/removal',
    },
    {
      id: 'recreate-better',
      name: 'Recreate Better',
      description:
        'Upload any thumbnail and AI will analyze it, then create an improved version',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-violet-500 to-fuchsia-500',
      features: [
        'Vision analysis',
        'CTR optimization',
        'Auto-improved prompt',
        'One-click regeneration',
      ],
      requiresImage: true,
      apiCost: '2 credits (analyze + generate)',
    },
  ];

  // Handlers — image upload is now handled by the shared ImageUploadZone component

  const handleImageSelect = useCallback(
    (dataUrl: string) => {
      setUploadedImage(dataUrl);
      setResultImage(null);
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!generatePrompt.trim() || ai.isLoading || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Call backend AI generate endpoint with cookies for authentication
      // Send ONLY tier parameter - let backend handle provider+model selection
      const response = await authPost(
        '/api/thumbnails/ai/generate',
        {
          prompt: generatePrompt,
          style,
          tier: selectedTier,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate image');
      }

      const data = await response.json();

      // Backend returns { success, images: string[], model, provider }
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Generate failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Failed to generate image'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [generatePrompt, style, selectedTier, ai.isLoading, isGenerating]);

  const handleRemoveBackground = useCallback(async () => {
    if (!uploadedImage || ai.isLoading || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Call backend OpenRouter API (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/remove-background',
        {
          image: uploadedImage,
          backgroundColor: 'transparent',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove background');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Remove background failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Remove background failed'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, ai.isLoading, isGenerating]);

  const handleEnhance = useCallback(async () => {
    if (!uploadedImage || ai.isLoading || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    // JJ: AbortController with per-tool timeout (40s for enhance)
    const { controller, timeoutId } = createAIToolAbortController('enhance');
    setAiAbortController(controller);
    aiTimeoutRef.current = timeoutId;

    try {
      // Call backend OpenRouter API (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/enhance',
        {
          image: uploadedImage,
          enhancementType: enhanceType,
        },
        { signal: controller.signal }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enhance image');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      // JJ: Distinguish user cancellation from actual errors
      if (error instanceof Error && error.name === 'AbortError') {
        setGenerateError('Enhancement timed out or was cancelled. Please try again.');
      } else {
        console.error('Enhance failed:', error);
        setGenerateError(
          error instanceof Error ? error.message : 'Enhance failed'
        );
      }
    } finally {
      clearTimeout(aiTimeoutRef.current ?? undefined);
      aiTimeoutRef.current = null;
      setAiAbortController(null);
      setIsGenerating(false);
    }
  }, [uploadedImage, enhanceType, ai.isLoading, isGenerating]);

  /** JJ: Cancel the current AI operation */
  const handleCancelAI = useCallback(() => {
    aiAbortController?.abort();
    clearTimeout(aiTimeoutRef.current ?? undefined);
    aiTimeoutRef.current = null;
    setAiAbortController(null);
    setIsGenerating(false);
    setGenerateError('Operation cancelled.');
  }, [aiAbortController]);

  const handleUpscale = useCallback(async () => {
    if (!uploadedImage || ai.isLoading || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Resolve the model from the selected quality tier (backend-driven)
      const resolvedModel = modelTiers.resolveModel('upscale', selectedTier);

      // Call backend OpenRouter API (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/upscale',
        {
          image: uploadedImage,
          scale: upscaleScale === 2 ? '2x' : '4x',
          tier: selectedTier,
          ...(resolvedModel ? { model: resolvedModel } : {}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upscale image');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Upscale failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Upscale failed'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, upscaleScale, selectedTier, ai.isLoading, isGenerating]);

  const handleFaceSwap = useCallback(async () => {
    if (!uploadedImage || !faceSwapSource || ai.isLoading || isGenerating)
      return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Resolve the model from the selected quality tier (backend-driven)
      const resolvedModel = modelTiers.resolveModel('face-swap', selectedTier);

      // Call backend OpenRouter API (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/face-swap',
        {
          sourceImage: faceSwapSource,
          targetImage: uploadedImage,
          tier: selectedTier,
          ...(resolvedModel ? { model: resolvedModel } : {}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to swap faces');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Face swap failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Face swap failed'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, faceSwapSource, selectedTier, ai.isLoading, isGenerating]);

  const handleExpand = useCallback(async () => {
    if (!uploadedImage || ai.isLoading || isGenerating) return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Call backend expand/outpaint endpoint (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/expand',
        {
          image: uploadedImage,
          direction: expandDirection,
          expandPixels: expandPixels,
          prompt: expandPrompt || undefined,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to expand image');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Expand failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Expand failed'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, expandDirection, expandPixels, expandPrompt, ai.isLoading, isGenerating]);

  // Object Removal handlers
  const handleObjectRemovalClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!uploadedImage || objectRemovalStep === 'processing') return;
    
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    
    // Calculate click position relative to actual image dimensions
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    // Add click point (label: 1 = foreground/object to select)
    setObjectRemovalClicks(prev => [...prev, { x, y, label: 1 }]);
    setObjectRemovalMask(null); // Clear previous mask when new click added
    setObjectRemovalStep('select');
  }, [uploadedImage, objectRemovalStep]);

  const handleGenerateMask = useCallback(async () => {
    if (!uploadedImage || objectRemovalClicks.length === 0 || isGenerating) return;
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      // Call SAM segment endpoint in interactive mode
      const response = await authPost('/api/thumbnails/ai/segment', {
        image: uploadedImage,
        mode: 'interactive',
        clicks: objectRemovalClicks,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to detect object');
      }
      
      const data = await response.json();
      if (data.success && data.masks && data.masks.length > 0) {
        // Use the first (best) mask
        setObjectRemovalMask(data.masks[0]);
        setObjectRemovalStep('confirm');
      } else {
        throw new Error('No object detected at clicked location');
      }
    } catch (error) {
      console.error('Object detection failed:', error);
      setGenerateError(error instanceof Error ? error.message : 'Object detection failed');
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, objectRemovalClicks, isGenerating]);

  const handleRemoveObject = useCallback(async () => {
    if (!uploadedImage || !objectRemovalMask || isGenerating) return;
    
    setIsGenerating(true);
    setObjectRemovalStep('processing');
    setGenerateError(null);
    
    try {
      // Call inpaint endpoint with the mask to remove object
      const response = await authPost('/api/thumbnails/ai/inpaint', {
        image: uploadedImage,
        mask: objectRemovalMask,
        prompt: 'Remove the object and fill with surrounding background seamlessly',
        tier: 'standard',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove object');
      }
      
      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
        // Reset object removal state
        setObjectRemovalClicks([]);
        setObjectRemovalMask(null);
        setObjectRemovalStep('select');
      }
    } catch (error) {
      console.error('Object removal failed:', error);
      setGenerateError(error instanceof Error ? error.message : 'Object removal failed');
      setObjectRemovalStep('confirm'); // Go back to confirm step on error
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, objectRemovalMask, isGenerating]);

  const handleClearObjectRemovalClicks = useCallback(() => {
    setObjectRemovalClicks([]);
    setObjectRemovalMask(null);
    setObjectRemovalStep('select');
  }, []);

  const handleInpaint = useCallback(async () => {
    if (!uploadedImage || !inpaintPrompt.trim() || ai.isLoading || isGenerating)
      return;

    setIsGenerating(true);
    setGenerateError(null);

    try {
      // Resolve the model from the selected quality tier (backend-driven)
      const resolvedModel = modelTiers.resolveModel('inpaint', selectedTier);

      // Call backend OpenRouter API (auth via HttpOnly cookie)
      const response = await authPost(
        '/api/thumbnails/ai/inpaint',
        {
          image: uploadedImage,
          mask: '', // For now, we use prompt-only inpainting
          prompt: inpaintPrompt,
          tier: selectedTier,
          ...(resolvedModel ? { model: resolvedModel } : {}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to inpaint image');
      }

      const data = await response.json();
      if (data.success && data.images && data.images.length > 0) {
        setResultImage(data.images[0]);
        setResultOriginalUrl(data.originals?.[0] || null);
      }
    } catch (error) {
      console.error('Inpaint failed:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Inpaint failed'
      );
    } finally {
      setIsGenerating(false);
    }
  }, [uploadedImage, inpaintPrompt, selectedTier, ai.isLoading, isGenerating]);

  const handleDownload = useCallback(() => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `ai-${selectedTool}-${Date.now()}.png`;
    link.click();
  }, [resultImage, selectedTool]);

  // Open AI result in the thumbnail editor
  const handleOpenInEditor = useCallback(() => {
    if (!resultImage) return;

    const state = {
      initialImage: resultImage,
      source: 'ai-tools-page',
      prompt: selectedTool === 'generate' ? generatePrompt : undefined,
      style: selectedTool === 'generate' ? style : undefined,
    };
    // Backup to sessionStorage for page refresh resilience
    sessionStorage.setItem('pendingEditorImage', JSON.stringify(state));
    navigate('/dashboard/editor', { state });
  }, [resultImage, selectedTool, generatePrompt, style, navigate]);

  const handleProcessTool = useCallback(() => {
    switch (selectedTool) {
      case 'generate':
        handleGenerate();
        break;
      case 'inpaint':
        handleInpaint();
        break;
      case 'remove-bg':
        handleRemoveBackground();
        break;
      case 'enhance':
        handleEnhance();
        break;
      case 'upscale':
        handleUpscale();
        break;
      case 'face-swap':
        handleFaceSwap();
        break;
      case 'expand':
        handleExpand();
        break;
      case 'object-removal':
        // Object removal uses a multi-step flow, handled by dedicated buttons
        break;
      default:
        break;
    }
  }, [
    selectedTool,
    handleGenerate,
    handleInpaint,
    handleRemoveBackground,
    handleEnhance,
    handleUpscale,
    handleFaceSwap,
    handleExpand,
  ]);

  const currentTool = aiTools.find(t => t.id === selectedTool);

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-[#020817] text-slate-100 pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AI Tools
        </h1>
        <p className="text-slate-400 text-lg">
          Powerful AI-driven tools to enhance and transform your thumbnails
        </p>
        {ai.isInitializing && (
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Initializing AI models...</span>
          </div>
        )}
      </div>

      {/* Tool Selection Grid */}
      {!selectedTool && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {aiTools.map(tool => (
            <div
              key={tool.id}
              className="group relative bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => setSelectedTool(tool.id)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelectedTool(tool.id)}
            >
              {/* Gradient background effect - z-0 keeps it behind content */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none z-0`}
              />

              {/* Icon - z-10 ensures it's above the overlay */}
              <div
                className={`relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br ${tool.color} p-3 mb-4 shadow-lg shadow-black/20 flex items-center justify-center text-white`}
              >
                {tool.icon}
              </div>

              {/* Content */}
              <h3 className="relative z-10 text-xl font-semibold mb-2 text-slate-100 group-hover:text-white transition-colors">
                {tool.name}
              </h3>
              <p className="relative z-10 text-slate-400 text-sm mb-4 line-clamp-2">
                {tool.description}
              </p>

              {/* Features */}
              <div className="relative z-10 space-y-2 mb-4">
                {tool.features.slice(0, 3).map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center text-xs text-slate-500"
                  >
                    <div
                      className={`w-1 h-1 rounded-full bg-gradient-to-r ${tool.color} mr-2`}
                    />
                    {feature}
                  </div>
                ))}
              </div>

              {/* Cost & Action */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="text-xs text-slate-500">{tool.apiCost}</span>
                <span className="flex items-center gap-1 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                  <span>Use Tool</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tool Interface */}
      {selectedTool && currentTool && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          {/* Tool Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentTool.color} p-2.5 flex items-center justify-center text-white`}
              >
                {currentTool.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {currentTool.name}
                </h2>
                <p className="text-sm text-slate-400">
                  {currentTool.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTool(null);
                setUploadedImage(null);
                setResultImage(null);
                setFaceSwapSource(null);
                setGeneratePrompt('');
                setInpaintPrompt('');
                setGenerateError(null);
                setSelectedTier('standard');
                setExpandDirection('all');
                setExpandPixels(128);
                setExpandPrompt('');
                setObjectRemovalClicks([]);
                setObjectRemovalMask(null);
                setObjectRemovalStep('select');
                // Reset Recreate Better state
                setRecreateBetterInputTab('upload');
                setRecreateBetterUrlInput('');
                setMyThumbnailsPreview(null);
              }}
              className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 items-stretch">
            {/* Left Panel - Controls */}
            <div className="space-y-6 flex flex-col">
              {/* Image Upload (for tools that require it, except recreate-better which has custom UI) */}
              {currentTool.requiresImage && selectedTool !== 'recreate-better' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Upload Image
                  </label>
                  <ImageUploadZone
                    currentImage={uploadedImage}
                    onImageSelect={handleImageSelect}
                    onRemove={() => {
                      setUploadedImage(null);
                      setResultImage(null);
                    }}
                  />
                </div>
              )}

              {/* Recreate Better - Custom Multi-Source Input */}
              {selectedTool === 'recreate-better' && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-slate-300">
                    Select Source Thumbnail
                  </label>

                  {/* Tab buttons */}
                  <div className="flex rounded-xl bg-slate-800/50 p-1">
                    <button
                      onClick={() => {
                        setRecreateBetterInputTab('upload');
                        setMyThumbnailsPreview(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        recreateBetterInputTab === 'upload'
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      Upload
                    </button>
                    <button
                      onClick={() => {
                        setRecreateBetterInputTab('my-thumbnails');
                        setMyThumbnailsPreview(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        recreateBetterInputTab === 'my-thumbnails'
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4" />
                      My Thumbnails
                    </button>
                    <button
                      onClick={() => {
                        setRecreateBetterInputTab('url');
                        setMyThumbnailsPreview(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        recreateBetterInputTab === 'url'
                          ? 'bg-violet-500/20 text-violet-400 border border-violet-500/50'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <Link className="w-4 h-4" />
                      URL
                    </button>
                  </div>

                  {/* Tab content */}
                  {recreateBetterInputTab === 'upload' && (
                    <ImageUploadZone
                      currentImage={uploadedImage}
                      onImageSelect={handleImageSelect}
                      onRemove={() => {
                        setUploadedImage(null);
                        setResultImage(null);
                      }}
                    />
                  )}

                  {recreateBetterInputTab === 'my-thumbnails' && (
                    <div className="relative min-h-[420px]">
                      {/* Base: Thumbnail Grid */}
                      <div className={`transition-opacity duration-200 ${myThumbnailsPreview || uploadedImage ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        {isLoadingThumbnails ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <span className="text-sm">Loading your thumbnails...</span>
                          </div>
                        ) : userThumbnails.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                            <FolderOpen className="w-10 h-10 mb-3" />
                            <span className="text-sm">No thumbnails found</span>
                            <span className="text-xs mt-1">Create some thumbnails first!</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
                            {userThumbnails.map((thumb) => (
                              <button
                                key={thumb.id}
                                onClick={() => setMyThumbnailsPreview(thumb.imageUrl)}
                                className="relative aspect-video rounded-lg overflow-hidden border-2 border-slate-700 hover:border-slate-600 transition-all"
                              >
                                <img
                                  src={thumb.imageUrl}
                                  alt={thumb.title || 'Thumbnail'}
                                  className="w-full h-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Preview Overlay - before selection confirmed */}
                      {myThumbnailsPreview && !uploadedImage && (
                        <div className="absolute inset-0 bg-slate-900 rounded-xl animate-in fade-in duration-150 flex flex-col">
                          {/* Header: Select as Source + Close */}
                          <div className="flex items-center justify-between p-3 border-b border-slate-800">
                            <button
                              onClick={() => {
                                setUploadedImage(myThumbnailsPreview);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-500/50 text-violet-400 hover:bg-violet-500/30 transition-colors text-sm font-medium"
                            >
                              <Check className="w-4 h-4" />
                              Select as Source
                            </button>
                            <Tooltip content="Back to thumbnails">
                            <button
                              onClick={() => setMyThumbnailsPreview(null)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            </Tooltip>
                          </div>

                          {/* Large Preview Image */}
                          <div className="flex-1 p-4 flex items-center justify-center">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-slate-700">
                              <img
                                src={myThumbnailsPreview}
                                alt="Preview thumbnail"
                                className="w-full h-full object-contain bg-slate-950"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Selected Source Overlay - after selection confirmed */}
                      {uploadedImage && recreateBetterInputTab === 'my-thumbnails' && (
                        <div className="absolute inset-0 bg-slate-900 rounded-xl animate-in fade-in duration-150 flex flex-col">
                          {/* Header: Change selection + status */}
                          <div className="flex items-center justify-between p-3 border-b border-slate-800">
                            <div className="flex items-center gap-2 text-sm text-violet-400">
                              <Check className="w-4 h-4" />
                              <span className="font-medium">Source Selected</span>
                            </div>
                            <button
                              onClick={() => {
                                setUploadedImage(null);
                                setMyThumbnailsPreview(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
                            >
                              Change
                            </button>
                          </div>

                          {/* Large Selected Image */}
                          <div className="p-4 flex-1">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-violet-500/50 ring-2 ring-violet-500/20">
                              <img
                                src={uploadedImage}
                                alt="Selected source"
                                className="w-full h-full object-contain bg-slate-950"
                              />
                            </div>
                          </div>

                          {/* What happens next - LEFT SIDE ONLY */}
                          <div className="px-4 pb-4">
                            <div className="bg-slate-800/50 rounded-xl p-3">
                              <h4 className="text-xs font-medium text-slate-400 mb-2">What happens next:</h4>
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold text-[10px]">1</div>
                                  <span>AI analyzes composition, colors, faces & text</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold text-[10px]">2</div>
                                  <span>Generates optimized prompt for higher CTR</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {recreateBetterInputTab === 'url' && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={recreateBetterUrlInput}
                          onChange={(e) => setRecreateBetterUrlInput(e.target.value)}
                          placeholder="https://example.com/thumbnail.jpg"
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors text-sm"
                          onKeyDown={(e) => e.key === 'Enter' && handleRecreateBetterUrlSubmit()}
                        />
                        <button
                          onClick={handleRecreateBetterUrlSubmit}
                          disabled={!recreateBetterUrlInput.trim()}
                          className="px-4 py-3 rounded-xl bg-violet-500/20 border border-violet-500/50 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Load
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Paste any image URL — great for analyzing competitor thumbnails!
                      </p>
                      {uploadedImage && recreateBetterInputTab === 'url' && (
                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-700">
                          <img
                            src={uploadedImage}
                            alt="Loaded from URL"
                            className="w-full h-full object-contain"
                            onError={() => {
                              setGenerateError('Failed to load image from URL');
                              setUploadedImage(null);
                            }}
                          />
                          <button
                            onClick={() => {
                              setUploadedImage(null);
                              setRecreateBetterUrlInput('');
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg hover:bg-black/80 transition-colors"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Generate Tool Options — only prompt stays on left */}
              {selectedTool === 'generate' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Describe Your Image
                  </label>
                  <textarea
                    value={generatePrompt}
                    onChange={e => setGeneratePrompt(e.target.value)}
                    placeholder="A futuristic cityscape at sunset with flying cars..."
                    className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              )}

              {/* Model Tier Selector — shown for all tiered tools */}
              {selectedTool && modelTiers.isTiered(selectedTool) && (
                <ModelTierSelector
                  toolId={selectedTool}
                  tierConfig={modelTiers.getConfig(selectedTool)}
                  selectedTierId={selectedTier}
                  onTierChange={setSelectedTier}
                  disabled={ai.isLoading || isGenerating}
                />
              )}

              {/* Enhance Tool Options */}
              {selectedTool === 'enhance' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Enhancement Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['auto', 'sharpen', 'denoise', 'color'] as const).map(
                      type => (
                        <button
                          key={type}
                          onClick={() => setEnhanceType(type)}
                          className={`p-3 rounded-xl border text-sm transition-all ${
                            enhanceType === type
                              ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {type === 'auto' && '✨ Auto Enhance'}
                          {type === 'sharpen' && '🔍 Sharpen'}
                          {type === 'denoise' && '🔇 Denoise'}
                          {type === 'color' && '🎨 Color Boost'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Upscale Tool Options */}
              {selectedTool === 'upscale' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Scale Factor
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUpscaleScale(2)}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        upscaleScale === 2
                          ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl font-bold">2x</span>
                      <span className="block text-xs mt-1">
                        Double resolution
                      </span>
                    </button>
                    <button
                      onClick={() => is4xAllowed && setUpscaleScale(4)}
                      disabled={!is4xAllowed}
                      className={`p-4 rounded-xl border text-center transition-all ${
                        !is4xAllowed
                          ? 'bg-slate-800/50 border-slate-700/50 text-slate-600 cursor-not-allowed'
                          : upscaleScale === 4
                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl font-bold">4x</span>
                      <span className="block text-xs mt-1">
                        {is4xAllowed ? 'Quadruple resolution' : 'Requires Pro tier'}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Expand/Outpaint Tool Options */}
              {selectedTool === 'expand' && uploadedImage && (
                <div className="space-y-4">
                  {/* Info box */}
                  <div className="p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Move className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-teal-300 mb-1">
                          AI Expand / Outpaint
                        </h4>
                        <p className="text-xs text-slate-400">
                          Extend your image beyond its boundaries. The AI will generate
                          matching content that blends seamlessly with the original.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Direction selector */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Expand Direction
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['all', 'top', 'bottom', 'left', 'right'] as const).map(dir => (
                        <button
                          key={dir}
                          onClick={() => setExpandDirection(dir)}
                          className={`p-3 rounded-xl border text-sm transition-all capitalize ${
                            expandDirection === dir
                              ? 'bg-teal-500/20 border-teal-500 text-teal-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          } ${dir === 'all' ? 'col-span-3' : ''}`}
                        >
                          {dir === 'all' ? '↔ All Directions' : dir === 'top' ? '↑ Top' : dir === 'bottom' ? '↓ Bottom' : dir === 'left' ? '← Left' : '→ Right'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pixel amount slider */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Expand Amount: {expandPixels}px
                    </label>
                    <input
                      type="range"
                      min="64"
                      max="512"
                      step="32"
                      value={expandPixels}
                      onChange={(e) => setExpandPixels(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>64px</span>
                      <span>512px</span>
                    </div>
                  </div>

                  {/* Optional prompt */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Guidance Prompt <span className="text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      value={expandPrompt}
                      onChange={(e) => setExpandPrompt(e.target.value)}
                      placeholder="Describe what should appear in the expanded area... (leave empty for auto-detection)"
                      className="w-full h-20 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-teal-500 transition-colors text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Object Removal Tool Options */}
              {selectedTool === 'object-removal' && uploadedImage && (
                <div className="space-y-4">
                  {/* Info box */}
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <MousePointer2 className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-rose-300 mb-1">
                          Click to Remove Objects
                        </h4>
                        <p className="text-xs text-slate-400">
                          Click on the object you want to remove. You can add multiple clicks
                          to better define the object. Then click "Detect Object" to preview,
                          and "Remove" to complete.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Click-to-select image preview */}
                  <div className="relative">
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Click on object to remove ({objectRemovalClicks.length} point{objectRemovalClicks.length !== 1 ? 's' : ''} selected)
                    </label>
                    <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
                      <img
                        src={uploadedImage}
                        alt="Click to select object"
                        className="w-full h-auto cursor-crosshair"
                        onClick={handleObjectRemovalClick}
                      />
                      {/* Render click points */}
                      {objectRemovalClicks.map((click, idx) => (
                        <div
                          key={idx}
                          className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-rose-500 border-2 border-white shadow-lg pointer-events-none"
                          style={{
                            left: `${(click.x / (document.querySelector(`img[alt="Click to select object"]`) as HTMLImageElement)?.naturalWidth || 1) * 100}%`,
                            top: `${(click.y / (document.querySelector(`img[alt="Click to select object"]`) as HTMLImageElement)?.naturalHeight || 1) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-white bg-slate-800 px-1 rounded">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                      {/* Mask overlay when generated */}
                      {objectRemovalMask && (
                        <div className="absolute inset-0 pointer-events-none">
                          <img
                            src={objectRemovalMask}
                            alt="Mask preview"
                            className="w-full h-full object-contain opacity-50"
                            style={{ mixBlendMode: 'multiply', filter: 'hue-rotate(300deg) saturate(3)' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearObjectRemovalClicks}
                      disabled={objectRemovalClicks.length === 0 || isGenerating}
                      className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Clear Points
                    </button>
                    {objectRemovalStep === 'select' && (
                      <button
                        onClick={handleGenerateMask}
                        disabled={objectRemovalClicks.length === 0 || isGenerating}
                        className="flex-1 py-3 rounded-xl bg-rose-500/20 border border-rose-500 text-rose-400 hover:bg-rose-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Detecting...
                          </>
                        ) : (
                          'Detect Object'
                        )}
                      </button>
                    )}
                    {objectRemovalStep === 'confirm' && (
                      <button
                        onClick={handleRemoveObject}
                        disabled={!objectRemovalMask || isGenerating}
                        className="flex-1 py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold hover:shadow-lg hover:shadow-rose-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                      >
                        {isGenerating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          'Remove Object'
                        )}
                      </button>
                    )}
                  </div>

                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className={objectRemovalStep === 'select' ? 'text-rose-400' : ''}>1. Click object</span>
                    <span>→</span>
                    <span className={objectRemovalStep === 'confirm' ? 'text-rose-400' : ''}>2. Detect</span>
                    <span>→</span>
                    <span className={objectRemovalStep === 'processing' ? 'text-rose-400' : ''}>3. Remove</span>
                  </div>
                </div>
              )}

              {/* Recreate Better Tool Options - only for Upload & URL tabs (My Thumbnails uses overlay) */}
              {selectedTool === 'recreate-better' && uploadedImage && recreateBetterInputTab !== 'my-thumbnails' && (
                <div className="space-y-4">
                  {/* What will happen */}
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-300 mb-3">What happens next:</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold">1</div>
                        <span>AI analyzes composition, colors, faces & text</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold">2</div>
                        <span>Generates optimized prompt with CTR improvements</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold">3</div>
                        <span>Creates improved thumbnail (you can edit the prompt)</span>
                      </div>
                    </div>
                  </div>

                  {/* Credit cost info */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-400">Cost</span>
                    <span className="text-sm font-medium text-violet-400">2 credits (1 analysis + 1 generation)</span>
                  </div>

                  {/* Start button */}
                  <button
                    onClick={() => {
                      // Dispatch event to open the RecreateBetterModal with this image
                      window.dispatchEvent(new CustomEvent('openRecreateBetter', {
                        detail: { imageUrl: uploadedImage }
                      }));
                    }}
                    disabled={!uploadedImage || isGenerating}
                    className="w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/25"
                  >
                    <Sparkles className="w-5 h-5" />
                    Analyze & Improve Thumbnail
                  </button>
                </div>
              )}

              {/* Face Swap Tool Options */}
              {selectedTool === 'face-swap' && uploadedImage && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Source Face
                  </label>
                  <ImageUploadZone
                    variant="compact"
                    icon="face"
                    placeholder="Upload face"
                    currentImage={faceSwapSource}
                    onImageSelect={setFaceSwapSource}
                    onRemove={() => setFaceSwapSource(null)}
                  />
                </div>
              )}

              {/* Inpaint Tool Options */}
              {selectedTool === 'inpaint' && uploadedImage && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Wand2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-blue-300 mb-1">
                          How to use Inpainting
                        </h4>
                        <p className="text-xs text-slate-400">
                          Describe what you want to add, change, or modify in
                          your image. The AI will intelligently edit the image
                          based on your description.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Describe Your Edit
                    </label>
                    <textarea
                      value={inpaintPrompt}
                      onChange={e => setInpaintPrompt(e.target.value)}
                      placeholder="e.g., Add a sunset sky in the background, Replace the text with 'AMAZING', Make the person smile..."
                      className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Process Button (hidden for object-removal and recreate-better which have their own flows) */}
              {selectedTool !== 'object-removal' && selectedTool !== 'recreate-better' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleProcessTool}
                    disabled={
                      ai.isLoading ||
                      isGenerating ||
                      (selectedTool === 'generate' && !generatePrompt.trim()) ||
                      (selectedTool === 'inpaint' && !inpaintPrompt.trim()) ||
                      (currentTool.requiresImage && !uploadedImage) ||
                      (selectedTool === 'face-swap' && !faceSwapSource)
                    }
                    className={`w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${currentTool.color} hover:shadow-lg hover:shadow-purple-500/25`}
                  >
                    {ai.isLoading || isGenerating ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {currentTool.icon}
                        {selectedTool === 'generate'
                          ? 'Generate Image'
                          : `Apply ${currentTool.name}`}
                      </>
                    )}
                  </button>
                  {/* JJ: Cancel button during AI processing */}
                  {(ai.isLoading || isGenerating) && aiAbortController && (
                    <button
                      onClick={handleCancelAI}
                      className="px-4 py-4 rounded-xl font-semibold text-white transition-all bg-slate-700 hover:bg-slate-600 flex items-center justify-center gap-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Error Display */}
              {(ai.error || generateError) && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{ai.error || generateError}</span>
                </div>
              )}
            </div>

            {/* Right Panel - Config + Result */}
            <div className="space-y-4 flex flex-col">
              {/* Recreate Better - Right side info when source is selected */}
              {selectedTool === 'recreate-better' && uploadedImage && (
                <div className="space-y-3">
                  {/* Step 3 - result creation */}
                  <div className="bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-semibold text-[10px]">3</div>
                      <span>Creates improved thumbnail (editable)</span>
                    </div>
                  </div>

                  {/* Cost info */}
                  <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                    <span className="text-xs text-slate-400">Cost</span>
                    <span className="text-xs font-medium text-violet-400">2 credits (1 analysis + 1 generation)</span>
                  </div>

                  {/* Analyze & Improve button */}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('openRecreateBetter', {
                        detail: { imageUrl: uploadedImage }
                      }));
                    }}
                    disabled={isGenerating}
                    className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:shadow-lg hover:shadow-violet-500/25"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analyze & Improve
                  </button>
                </div>
              )}

              {/* Style & Aspect Ratio — moved here from left panel to reduce scroll */}
              {selectedTool === 'generate' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Style
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {stylePresets.map(preset => (
                        <button
                          key={preset.id}
                          onClick={() => setStyle(preset.id)}
                          className={`p-2 rounded-lg border text-sm transition-all ${
                            style === preset.id
                              ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span className="text-base">{preset.icon}</span>
                          <span className="block text-[11px] mt-0.5">
                            {preset.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={aspectRatio}
                      onChange={e =>
                        setAspectRatio(
                          e.target.value as AIGenerateRequest['aspectRatio']
                        )
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                    >
                      {aspectRatios.map(ar => (
                        <option key={ar.value} value={ar.value}>
                          {ar.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300">
                  Result
                </label>
                {resultImage && (
                  <ThumbnailActionBar
                    context={{
                      imageUrl: resultImage,
                      originalImageUrl: resultOriginalUrl || undefined,
                      sourceSettings: {
                        toolType: selectedTool || 'generate',
                        prompt: selectedTool === 'generate' ? generatePrompt : inpaintPrompt,
                        style: selectedTool === 'generate' ? style : undefined,
                        aspectRatio: selectedTool === 'generate' ? aspectRatio : undefined,
                        tier: selectedTier,
                        image: uploadedImage || undefined,
                      },
                    }}
                    visibleActions={['save', 'edit', 'download', 'regenerate', 'recreateBetter']}
                    variant="compact"
                  />
                )}
              </div>

              <div className={`bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex items-center justify-center ${selectedTool === 'recreate-better' ? 'aspect-video' : 'flex-1 min-h-[200px]'}`}>
                {resultImage ? (
                  <img
                    src={resultImage}
                    alt="Result"
                    className="w-full h-full object-contain"
                  />
                ) : ai.isLoading || isGenerating ? (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <RefreshCw className="w-10 h-10 animate-spin" />
                    <span className="text-sm">Processing your image...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <ImageIcon className="w-10 h-10" />
                    <span className="text-sm">Result will appear here</span>
                  </div>
                )}
              </div>

              {/* Success message */}
              {resultImage && !ai.isLoading && !isGenerating && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm">
                  <Check className="w-5 h-5" />
                  <span>Image processed successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recreate Better Modal */}
      {recreateBetterImageUrl && (
        <RecreateBetterModal
          isOpen={recreateBetterOpen}
          onClose={() => {
            setRecreateBetterOpen(false);
            setRecreateBetterImageUrl(null);
          }}
          imageUrl={recreateBetterImageUrl}
          onImageGenerated={(newImageUrl) => {
            setResultImage(newImageUrl);
          }}
        />
      )}
    </div>
  );
};

export default AIToolsPage;
