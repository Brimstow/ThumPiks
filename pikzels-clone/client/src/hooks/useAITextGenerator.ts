/**
 * useAITextGenerator - Core hook for AI-powered title/text generation
 * 
 * Generates click-worthy text suggestions for YouTube thumbnails.
 * Supports two modes:
 *   1. Manual prompt  — generateTitles({ prompt, ... })
 *   2. Image-aware    — generateFromImage({ imageUrl, ... })
 *      Calls vision API first, then builds a prompt from the image description.
 *
 * Uses OpenRouter chat completion (text-only, no image generation).
 * Follows the same pattern as useBackendAI for credit billing.
 */

import { useState, useCallback, useRef } from 'react';
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
  /** Progress step label (e.g. 'Analyzing image...', 'Generating text ideas...') */
  generationStep: string;
  /** Cached vision analysis from the last generateFromImage call */
  visionAnalysis: VisionAnalysisResult | null;
  generateTitles: (options: GenerateTextOptions) => Promise<AITextSuggestion[]>;
  /** Vision-aware: analyze image first, then generate text based on what the image shows */
  generateFromImage: (options: GenerateFromImageOptions) => Promise<AITextSuggestion[]>;
  rewriteText: (text: string, tone?: TextTone) => Promise<AITextSuggestion[]>;
  clearSuggestions: () => void;
  clearVisionAnalysis: () => void;
  markApplied: (id: string) => void;
}

// ============================================
// HOOK
// ============================================

export function useAITextGenerator(): UseAITextGeneratorReturn {
  const [error, setError] = useState<string | null>(null);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [visionAnalysis, setVisionAnalysis] = useState<VisionAnalysisResult | null>(null);

  // Ref keeps the latest visionAnalysis accessible inside async callbacks
  // without depending on React re-render timing.
  const visionRef = useRef<VisionAnalysisResult | null>(null);
  visionRef.current = visionAnalysis;

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
    const { prompt, context, tone = 'clickbait', count = 5, maxLength = 60, tier } = options;

    if (!prompt.trim()) {
      setError('Prompt is required');
      return [];
    }

    setError(null);
    setTextGenerating(true);

    try {
      const response = await authPost('/api/thumbnails/ai/generate-text', {
        prompt,
        context,
        tone,
        count,
        maxLength,
        tier,
      });

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
  // Vision-aware generation
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

    // 1. Vision analysis (use cached if available)
    let analysis: VisionAnalysisResult | null = visionRef.current;
    try {
      setGenerationStep('Analyzing your thumbnail...');
      if (!analysis) {
        const visionBody = imageBase64
          ? { imageBase64 }
          : { image: imageUrl };
        const vRes = await authPost('/api/vision/describe', visionBody);
        if (vRes.ok) {
          analysis = await vRes.json() as VisionAnalysisResult;
          setVisionAnalysis(analysis);
          visionRef.current = analysis;
        }
      }
    } catch {
      // Vision failed — continue with fallback prompt
    }

    // 2. Build prompt from image description (or fall back to supplied prompt)
    let textPrompt: string;
    let textContext: string;

    if (analysis?.description) {
      textPrompt = `YouTube thumbnail showing: ${analysis.description}`;
      textContext = [
        analysis.elements.mood ? `Mood: ${analysis.elements.mood}` : '',
        analysis.elements.style ? `Style: ${analysis.elements.style}` : '',
        analysis.elements.mainSubject ? `Subject: ${analysis.elements.mainSubject}` : '',
        fallbackPrompt ? `Original video title (for reference only): ${fallbackPrompt}` : '',
      ].filter(Boolean).join('. ');
    } else {
      textPrompt = fallbackPrompt || 'YouTube thumbnail text';
      textContext = 'YouTube thumbnail';
    }

    // 3. Generate text suggestions via shared generateTitles
    setGenerationStep('Generating text ideas...');
    try {
      const result = await generateTitles({
        prompt: textPrompt,
        context: textContext,
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

  const clearVisionAnalysis = useCallback(() => {
    setVisionAnalysis(null);
    visionRef.current = null;
  }, []);

  const markApplied = useCallback((id: string) => {
    markTextApplied(id);
  }, [markTextApplied]);

  return {
    suggestions,
    isGenerating,
    error,
    generationStep,
    visionAnalysis,
    generateTitles,
    generateFromImage,
    rewriteText,
    clearSuggestions: clearTextSuggestions,
    clearVisionAnalysis,
    markApplied,
  };
}
