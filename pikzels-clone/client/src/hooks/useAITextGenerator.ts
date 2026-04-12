/**
 * useAITextGenerator - Core hook for AI-powered title/text generation
 * 
 * Generates click-worthy text suggestions for YouTube thumbnails.
 * Supports two modes:
 *   1. Manual prompt  — generateTitles({ prompt, ... })
 *   2. Image-aware    — generateFromImage({ imageUrl, ... })
 *      Sends the image directly to the backend which uses a vision model
 *      to analyze the image and generate text in a single API call.
 *
 * Uses OpenRouter chat completion. When an image is provided, the backend
 * auto-selects a multimodal vision model for direct image analysis.
 * Follows the same pattern as useBackendAI for credit billing.
 */

import { useState, useCallback } from 'react';
import { authPost } from '../utils/api';
import { useAIToolsStore } from '../stores/aiToolsStore';
import type { VisionAnalysisResult } from '../types/vision.types';

// ============================================
// TYPES
// ============================================

export interface AITextSuggestion {
  id: string;
  text: string;
  style: 'bold' | 'question' | 'listicle' | 'emotional' | 'curiosity';
  score: number;
  applied: boolean;
}

export type TextTone = 'clickbait' | 'professional' | 'casual' | 'dramatic' | 'educational';

export interface GenerateTextOptions {
  prompt: string;
  context?: string;
  tone?: TextTone;
  count?: number;
  maxLength?: number;
  existingText?: string;
  /** Quality tier for model selection (flash/standard/pro) */
  tier?: string;
  /** Optional image URL for vision-aware generation */
  imageUrl?: string;
  /** Optional base64-encoded image for vision-aware generation */
  imageBase64?: string;
}

export interface GenerateFromImageOptions {
  /** Image URL (Cloudinary / data URI / http) */
  imageUrl?: string;
  /** Base64-encoded image (used by the Editor where layers store src as base64) */
  imageBase64?: string;
  /** Fallback prompt if vision analysis fails (e.g. videoTitle) */
  fallbackPrompt?: string;
  tone?: TextTone;
  count?: number;
  maxLength?: number;
  /** Quality tier for model selection (flash/standard/pro) */
  tier?: string;
}

export interface UseAITextGeneratorReturn {
  suggestions: AITextSuggestion[];
  isGenerating: boolean;
  error: string | null;
  /** Progress step label (e.g. 'Generating text from image...') */
  generationStep: string;
  /** @deprecated Vision analysis is now handled server-side. Always null. */
  visionAnalysis: VisionAnalysisResult | null;
  generateTitles: (options: GenerateTextOptions) => Promise<AITextSuggestion[]>;
  /** Vision-aware: sends image directly to the backend for analysis + text generation in one call */
  generateFromImage: (options: GenerateFromImageOptions) => Promise<AITextSuggestion[]>;
  rewriteText: (text: string, tone?: TextTone) => Promise<AITextSuggestion[]>;
  clearSuggestions: () => void;
  /** @deprecated No-op. Vision analysis is now handled server-side. */
  clearVisionAnalysis: () => void;
  markApplied: (id: string) => void;
}

// ============================================
// HOOK
// ============================================

export function useAITextGenerator(): UseAITextGeneratorReturn {
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');

  const {
    textSuggestions: suggestions,
    textGenerating: isGenerating,
    setTextSuggestions,
    setTextGenerating,
    addTextHistory,
    markTextApplied,
    clearTextSuggestions,
  } = useAIToolsStore();

  const generateTitles = useCallback(async (options: GenerateTextOptions): Promise<AITextSuggestion[]> => {
    const { prompt, context, tone = 'clickbait', count = 5, maxLength = 60, tier, imageUrl, imageBase64 } = options;

    if (!prompt.trim() && !imageUrl && !imageBase64) {
      setError('Prompt or image is required');
      return [];
    }

    setError(null);
    setTextGenerating(true);

    try {
      const body: Record<string, unknown> = {
        prompt,
        context,
        tone,
        count,
        maxLength,
        tier,
      };

      // Include image data if provided — backend will auto-select a vision model
      if (imageUrl) body.imageUrl = imageUrl;
      if (imageBase64) body.imageBase64 = imageBase64;

      const response = await authPost('/api/thumbnails/ai/generate-text', body);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Text generation failed (${response.status})`);
      }

      const data = await response.json();

      if (data.success && data.suggestions) {
        const typedSuggestions: AITextSuggestion[] = data.suggestions.map(
          (s: { text: string; style: string; score: number }, i: number) => ({
            id: `${Date.now()}-${i}`,
            text: s.text,
            style: s.style || 'bold',
            score: s.score || 0.8,
            applied: false,
          })
        );

        setTextSuggestions(typedSuggestions);
        addTextHistory(typedSuggestions);
        return typedSuggestions;
      }

      throw new Error('No suggestions returned');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Text generation failed';
      setError(message);
      return [];
    } finally {
      setTextGenerating(false);
    }
  }, [setTextSuggestions, setTextGenerating, addTextHistory]);

  const rewriteText = useCallback(async (text: string, tone: TextTone = 'clickbait'): Promise<AITextSuggestion[]> => {
    return generateTitles({
      prompt: `Rewrite this thumbnail text in different styles: "${text}"`,
      tone,
      existingText: text,
    });
  }, [generateTitles]);

  // ============================================
  // Vision-aware generation (single API call)
  // ============================================

  const generateFromImage = useCallback(async (options: GenerateFromImageOptions): Promise<AITextSuggestion[]> => {
    const {
      imageUrl,
      imageBase64,
      fallbackPrompt,
      tone = 'clickbait',
      count = 4,
      maxLength = 30,
      tier,
    } = options;

    if (!imageUrl && !imageBase64) {
      setError('An image is required for vision-aware generation');
      return [];
    }

    setError(null);
    setTextGenerating(true);
    setGenerationStep('Generating text from image...');

    try {
      // Single API call — the backend vision model sees the image directly
      const result = await generateTitles({
        prompt: fallbackPrompt || '',
        imageUrl,
        imageBase64,
        tone,
        count,
        maxLength,
        tier,
      });
      return result;
    } finally {
      setGenerationStep('');
    }
  }, [generateTitles, setTextGenerating]);

  const markApplied = useCallback((id: string) => {
    markTextApplied(id);
  }, [markTextApplied]);

  return {
    suggestions,
    isGenerating,
    error,
    generationStep,
    visionAnalysis: null, // Deprecated: vision analysis now handled server-side
    generateTitles,
    generateFromImage,
    rewriteText,
    clearSuggestions: clearTextSuggestions,
    clearVisionAnalysis: () => {}, // No-op: vision analysis now handled server-side
    markApplied,
  };
}
