/**
 * useImageActions - Shared hook for thumbnail action logic
 * 
 * Provides consistent save/edit/download/regenerate/recreateBetter functionality
 * across all pages that display generated or processed images.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authPost } from '../utils/api';
import type {
  ImageAction,
  ActionResult,
  RegenerateSettings,
  SaveMetadata,
  EditorNavigationState,
  UseImageActionsReturn,
} from '../types/image-actions.types';
import type { VisionAnalysisResult } from '../types/vision.types';

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useImageActions(): UseImageActionsReturn {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState<Record<ImageAction, boolean>>({
    save: false,
    edit: false,
    download: false,
    regenerate: false,
    recreateBetter: false,
  });
  
  const [error, setError] = useState<string | null>(null);

  const setLoadingState = useCallback((action: ImageAction, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [action]: loading }));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================
  // SAVE TO LIBRARY
  // ============================================
  
  const saveToLibrary = useCallback(async (
    imageUrl: string,
    metadata?: SaveMetadata
  ): Promise<ActionResult> => {
    setLoadingState('save', true);
    setError(null);

    try {
      const response = await authPost('/api/thumbnails', {
        imageUrl,
        title: metadata?.title || `Thumbnail ${new Date().toLocaleDateString()}`,
        platform: metadata?.platform || 'youtube',
        videoId: metadata?.videoId,
        sourceUrl: metadata?.sourceUrl,
        parameters: {
          platform: metadata?.platform || 'youtube',
          source: 'image-action-bar',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save thumbnail');
      }

      const data = await response.json();
      
      return {
        success: true,
        action: 'save',
        data: { thumbnailId: data.id, thumbnail: data },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save thumbnail';
      setError(message);
      return {
        success: false,
        action: 'save',
        error: message,
      };
    } finally {
      setLoadingState('save', false);
    }
  }, [setLoadingState]);

  // ============================================
  // OPEN IN EDITOR
  // ============================================
  
  const openInEditor = useCallback((
    imageUrl: string,
    state?: EditorNavigationState
  ): void => {
    const navigationState: EditorNavigationState = {
      initialImage: imageUrl,
      source: state?.source || 'image-action-bar',
      prompt: state?.prompt,
      style: state?.style,
      analysisResult: state?.analysisResult,
    };

    // Backup to sessionStorage for page refresh resilience
    sessionStorage.setItem('pendingEditorImage', JSON.stringify(navigationState));
    
    navigate('/dashboard/editor', { state: navigationState });
  }, [navigate]);

  // ============================================
  // DOWNLOAD IMAGE
  // ============================================
  
  const downloadImage = useCallback((
    imageUrl: string,
    filename?: string
  ): void => {
    const defaultFilename = `thumbnail-${Date.now()}.png`;
    
    // For data URLs, create blob and download
    if (imageUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = filename || defaultFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For remote URLs, fetch and download
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || defaultFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        // Fallback: open in new tab
        window.open(imageUrl, '_blank');
      });
  }, []);

  // ============================================
  // REGENERATE
  // ============================================
  
  const regenerate = useCallback(async (
    settings: RegenerateSettings
  ): Promise<ActionResult> => {
    setLoadingState('regenerate', true);
    setError(null);

    try {
      const toolType = settings.toolType || 'generate';
      let endpoint = '/api/thumbnails/ai/generate';
      let body: Record<string, any> = {};

      // Map tool type to appropriate endpoint and body
      switch (toolType) {
        case 'generate':
          endpoint = '/api/thumbnails/ai/generate';
          body = {
            prompt: settings.prompt,
            style: settings.style,
            aspectRatio: settings.aspectRatio || '16:9',
            tier: settings.tier || 'balanced',
          };
          break;
        case 'inpaint':
          endpoint = '/api/thumbnails/ai/inpaint';
          body = {
            image: settings.image,
            prompt: settings.prompt,
            mask: settings.mask,
            tier: settings.tier,
          };
          break;
        case 'enhance':
          endpoint = '/api/thumbnails/ai/enhance';
          body = {
            image: settings.image,
            enhancementType: settings.enhancementType || 'auto',
          };
          break;
        case 'upscale':
          endpoint = '/api/thumbnails/ai/upscale';
          body = {
            image: settings.image,
            scale: settings.scale || '2x',
          };
          break;
        case 'remove-bg':
          endpoint = '/api/thumbnails/ai/remove-background';
          body = {
            image: settings.image,
            backgroundColor: settings.backgroundColor,
          };
          break;
        case 'face-swap':
          endpoint = '/api/thumbnails/ai/face-swap';
          body = {
            sourceImage: settings.sourceImage,
            targetImage: settings.targetImage,
            prompt: settings.prompt,
          };
          break;
        case 'expand':
          endpoint = '/api/thumbnails/ai/expand';
          body = {
            image: settings.image,
            prompt: settings.prompt,
            direction: settings.direction || 'all',
            expandPixels: settings.expandPixels,
          };
          break;
      }

      const response = await authPost(endpoint, body);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate');
      }

      const data = await response.json();
      
      return {
        success: true,
        action: 'regenerate',
        data: {
          images: data.images || [data.image],
          image: data.images?.[0] || data.image,
        },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate';
      setError(message);
      return {
        success: false,
        action: 'regenerate',
        error: message,
      };
    } finally {
      setLoadingState('regenerate', false);
    }
  }, [setLoadingState]);

  // ============================================
  // START RECREATE BETTER
  // ============================================
  
  const startRecreateBetter = useCallback((
    imageUrl: string,
    existingAnalysis?: VisionAnalysisResult
  ): void => {
    // Store state for the modal to pick up
    sessionStorage.setItem('recreateBetterState', JSON.stringify({
      imageUrl,
      existingAnalysis: existingAnalysis || null,
    }));

    // Dispatch custom event for the modal to open
    window.dispatchEvent(new CustomEvent('openRecreateBetter', {
      detail: { imageUrl, existingAnalysis },
    }));
  }, []);

  return {
    saveToLibrary,
    openInEditor,
    downloadImage,
    regenerate,
    startRecreateBetter,
    isLoading,
    error,
    clearError,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Enhance a prompt based on vision analysis CTR factors
 */
export function enhancePromptFromAnalysis(analysis: VisionAnalysisResult): {
  enhancedPrompt: string;
  improvements: string[];
} {
  const { elements, suggestedPrompt } = analysis;
  const improvements: string[] = [];
  const ctr = elements.ctrFactors;

  // Analyze weak areas and suggest improvements
  if (ctr.colorScore < 70) {
    improvements.push('more vibrant, high-contrast colors');
  }
  if (ctr.compositionScore < 70) {
    improvements.push('stronger focal point, rule of thirds composition');
  }
  if (ctr.emotionScore < 70) {
    improvements.push('more dramatic, attention-grabbing mood');
  }
  if (ctr.faceScore < 70 && elements.faces > 0) {
    improvements.push('more expressive facial expressions, direct eye contact');
  }
  if (ctr.textScore < 70 && elements.textOverlay.length > 0) {
    improvements.push('bolder, more readable text with high contrast');
  }

  // Build enhanced prompt
  let enhancedPrompt = suggestedPrompt;
  
  if (improvements.length > 0) {
    enhancedPrompt = `${suggestedPrompt}, enhanced with ${improvements.join(', ')}`;
  }

  // Add general thumbnail optimization keywords
  enhancedPrompt += ', YouTube thumbnail style, eye-catching, high quality, professional';

  return {
    enhancedPrompt,
    improvements,
  };
}

/**
 * Calculate estimated credit cost for Recreate Better
 */
export function calculateRecreateBetterCost(hasExistingAnalysis: boolean): number {
  // Vision analysis: 1 credit (skip if already analyzed)
  // Generation: 1 credit
  return hasExistingAnalysis ? 1 : 2;
}

export default useImageActions;
