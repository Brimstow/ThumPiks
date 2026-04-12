/**
 * Shared types for the ThumbnailActionBar system
 * Used across all pages that display generated/processed images
 */

import type { VisionAnalysisResult } from './vision.types';

// ============================================
// ACTION TYPES
// ============================================

export type ImageAction = 'save' | 'edit' | 'download' | 'regenerate' | 'recreateBetter';

export type ActionVisibility = ImageAction[];

export interface ActionResult {
  success: boolean;
  action: ImageAction;
  data?: any;
  error?: string;
}

// ============================================
// CONTEXT TYPES
// ============================================

export interface RegenerateSettings {
  /** The tool that was used to generate the image */
  toolType?: 'generate' | 'inpaint' | 'enhance' | 'upscale' | 'remove-bg' | 'face-swap' | 'expand' | 'object-removal' | 'recreate-better';
  /** Original prompt used for generation */
  prompt?: string;
  /** Style preset ID */
  style?: string;
  /** Aspect ratio */
  aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4' | string;
  /** Quality tier (flash/standard/pro or legacy fast/balanced/quality) */
  tier?: 'flash' | 'standard' | 'pro' | 'fast' | 'balanced' | 'quality';
  /** Any additional settings specific to the tool */
  [key: string]: any;
}

export interface ImageActionContext {
  /** The image URL (required for all actions) */
  imageUrl: string;
  /** If the image is already saved, its ID in the database */
  imageId?: string;
  /** Original image URL (for revert functionality) */
  originalImageUrl?: string;
  /** Settings used to generate this image (for regenerate) */
  sourceSettings?: RegenerateSettings;
  /** If vision analysis was already performed */
  analysisResult?: VisionAnalysisResult;
  /** Title/name for the thumbnail */
  title?: string;
  /** Platform the thumbnail is for */
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
}

// ============================================
// RECREATE BETTER TYPES
// ============================================

export type RecreateBetterStage = 'idle' | 'analyzing' | 'preview' | 'generating' | 'result' | 'error';

export interface RecreateBetterState {
  stage: RecreateBetterStage;
  originalImageUrl: string | null;
  analysisResult: VisionAnalysisResult | null;
  improvedPrompt: string;
  generatedImageUrl: string | null;
  error: string | null;
  /** Estimated credit cost */
  creditCost: number;
}

export interface EnhancedPromptResult {
  originalPrompt: string;
  enhancedPrompt: string;
  improvements: string[];
  ctrScore: number;
}

// ============================================
// HOOK RETURN TYPES
// ============================================

export interface UseImageActionsReturn {
  /** Save image to user's thumbnail library */
  saveToLibrary: (imageUrl: string, metadata?: SaveMetadata) => Promise<ActionResult>;
  /** Open image in the full editor */
  openInEditor: (imageUrl: string, state?: EditorNavigationState) => void;
  /** Download image to local machine */
  downloadImage: (imageUrl: string, filename?: string) => void;
  /** Regenerate with same/similar settings */
  regenerate: (settings: RegenerateSettings) => Promise<ActionResult>;
  /** Start the Recreate Better flow */
  startRecreateBetter: (imageUrl: string, existingAnalysis?: VisionAnalysisResult) => void;
  /** Loading states for each action */
  isLoading: Record<ImageAction, boolean>;
  /** Any active error */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

export interface SaveMetadata {
  title?: string;
  platform?: 'youtube' | 'tiktok' | 'instagram' | 'twitter';
  videoId?: string;
  sourceUrl?: string;
  /** Source context for auto-filling prompt (not shown to user) */
  source?: 'quick-edit' | 'canvas-editor' | 'preset-editor' | 'vision-tool' | 'recreate-better' | 'ai-generate' | 'ai-tools' | 'image-action-bar' | 'landing-page-generation';
  /** AI prompt if available (e.g. from AI generate flow) */
  prompt?: string;
  /** Project ID if already known (skips project picker) */
  projectId?: string;
  /** Clean original image URL (before watermark) for watermark-free export */
  originalImageUrl?: string;
  /** Cloudinary public ID of the clean original */
  originalPublicId?: string;
}

export interface SaveModalResult {
  title: string;
  projectId: string;
  prompt: string;
}

export interface EditorNavigationState {
  initialImage: string;
  source: string;
  prompt?: string;
  style?: string;
  analysisResult?: VisionAnalysisResult;
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface ThumbnailActionBarProps {
  /** Context about the image and how it was created */
  context: ImageActionContext;
  /** Which actions to show (defaults to all) */
  visibleActions?: ActionVisibility;
  /** Callback when an action completes */
  onActionComplete?: (result: ActionResult) => void;
  /** Layout variant */
  variant?: 'horizontal' | 'vertical' | 'compact';
  /** Additional CSS classes */
  className?: string;
  /** Whether actions are disabled */
  disabled?: boolean;
}

export interface RecreateBetterModalProps {
  /** Whether the modal is open (optional - modal can self-manage via events) */
  isOpen?: boolean;
  /** Close the modal (optional - modal can self-manage) */
  onClose?: () => void;
  /** The image to recreate (optional - can come from event) */
  imageUrl?: string;
  /** Pre-existing analysis (skip analyze step if provided) */
  existingAnalysis?: VisionAnalysisResult;
  /** Callback when a new image is generated */
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  /** Callback when user saves the result */
  onSave?: (imageUrl: string) => void;
}
