/**
 * Mobile Editor Types
 * Type definitions for the mobile thumbnail editor
 */

import type { Layer, AdjustmentState } from '../types/editor.types';

// Tool tabs available in mobile editor
export type MobileToolTab = 'crop' | 'ai' | 'adjust' | 'export';

// Mobile editor props - matches ThumbnailStudio interface for compatibility
export interface MobileEditorProps {
  thumbnailId?: string;
  thumbnailData?: {
    id: string;
    title?: string;
    imageUrl: string;
    parameters?: {
      edits?: Partial<AdjustmentState>;
      [key: string]: unknown;
    };
  };
  initialImage?: string;
  onSave: (data: { layers: Layer[]; preview: string }) => void;
  onClose: () => void;
}

// Crop aspect ratio presets
export interface CropPreset {
  id: string;
  label: string;
  aspectRatio: number | null;  // null = freeform
  icon?: string;
}

export const CROP_PRESETS: CropPreset[] = [
  { id: 'youtube', label: '16:9', aspectRatio: 16 / 9, icon: 'youtube' },
  { id: 'shorts', label: '9:16', aspectRatio: 9 / 16, icon: 'shorts' },
  { id: 'square', label: '1:1', aspectRatio: 1, icon: 'square' },
  { id: 'free', label: 'Free', aspectRatio: null, icon: 'expand' },
];

// AI tool types available on mobile
export type MobileAITool = 'remove-bg' | 'enhance' | 'upscale';

export interface AIToolConfig {
  id: MobileAITool;
  label: string;
  description: string;
  icon: string;
}

export const MOBILE_AI_TOOLS: AIToolConfig[] = [
  {
    id: 'remove-bg',
    label: 'Remove Background',
    description: 'Automatically remove the background',
    icon: 'eraser',
  },
  {
    id: 'enhance',
    label: 'Enhance',
    description: 'Improve image quality and colors',
    icon: 'sparkles',
  },
  {
    id: 'upscale',
    label: 'Upscale',
    description: 'Increase resolution up to 4x',
    icon: 'maximize',
  },
];

// Export platform options
export type ExportPlatform = 'youtube' | 'tiktok' | 'instagram' | 'custom';

export interface ExportPlatformConfig {
  id: ExportPlatform;
  label: string;
  maxSize: number;  // in bytes
  dimensions: { width: number; height: number };
}

export const EXPORT_PLATFORMS: ExportPlatformConfig[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    maxSize: 2 * 1024 * 1024,  // 2MB
    dimensions: { width: 1280, height: 720 },
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    maxSize: 5 * 1024 * 1024,  // 5MB
    dimensions: { width: 1080, height: 1920 },
  },
  {
    id: 'instagram',
    label: 'Instagram',
    maxSize: 8 * 1024 * 1024,  // 8MB
    dimensions: { width: 1080, height: 1080 },
  },
  {
    id: 'custom',
    label: 'Custom',
    maxSize: 10 * 1024 * 1024,  // 10MB
    dimensions: { width: 1920, height: 1080 },
  },
];

// Adjustment sliders config
export interface AdjustmentSliderConfig {
  id: keyof Pick<AdjustmentState, 'brightness' | 'contrast' | 'saturation'>;
  label: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

export const MOBILE_ADJUSTMENTS: AdjustmentSliderConfig[] = [
  { id: 'brightness', label: 'Brightness', min: 0, max: 200, default: 100, step: 1 },
  { id: 'contrast', label: 'Contrast', min: 0, max: 200, default: 100, step: 1 },
  { id: 'saturation', label: 'Saturation', min: 0, max: 200, default: 100, step: 1 },
];

// Layer thumbnail for mobile layer selector
export interface MobileLayerThumbnail {
  id: string;
  name: string;
  type: Layer['type'];
  thumbnail?: string;  // base64 preview
  visible: boolean;
}

// Bottom sheet state
export interface BottomSheetState {
  isOpen: boolean;
  activeSheet: MobileToolTab | null;
  snapPoint: 'collapsed' | 'half' | 'full';
}

// Canvas transform state for pinch-zoom
export interface CanvasTransform {
  scale: number;
  positionX: number;
  positionY: number;
}

// Processing state for AI operations
export interface ProcessingState {
  isProcessing: boolean;
  tool: MobileAITool | null;
  progress: number;  // 0-100
  error: string | null;
}
