/**
 * Brand Kit Service - Frontend API client
 * Handles all brand kit related API requests
 */

import { authFetch } from '../utils/api';
import {
  BrandKitState,
  LogoAsset,
  ColorPalette,
  ColorSwatch,
  FontFamily,
  BrandVoice,
  PhotoAsset,
  GraphicAsset,
  IconAsset,
  StylePreset,
  CustomCategory,
} from '../components/dashboard/brand/types';

// ============================================
// GET FULL BRAND KIT
// ============================================

export const getBrandKit = async (): Promise<BrandKitState> => {
  const response = await authFetch('/api/brand-kit');
  if (!response.ok) {
    throw new Error('Failed to fetch brand kit');
  }
  return response.json();
};

// ============================================
// AI BRAND GENERATION
// ============================================

export interface AIBrandInput {
  brandName: string;
  tagline?: string;
  industry: string;
  stylePreferences: string[];
  colorPreferences: string[];
  brandPersonality: string[];
  targetAudience?: string;
}

export interface GeneratedColor {
  hex: string;
  name: string;
  usage: 'primary' | 'secondary' | 'accent' | 'background' | 'text';
  emotion?: string;
}

export interface GeneratedFont {
  name: string;
  category: 'serif' | 'sans-serif' | 'display' | 'handwriting' | 'monospace';
  usage: 'heading' | 'body' | 'accent';
  googleFontsUrl?: string;
}

export interface GeneratedBrandSuggestion {
  id: string;
  name: string;
  description: string;
  colors: GeneratedColor[];
  fonts: GeneratedFont[];
  moodKeywords: string[];
  voiceTone: string;
  visualStyle: string;
}

export interface AIBrandGeneratorResult {
  success: boolean;
  suggestions: GeneratedBrandSuggestion[];
  input: AIBrandInput;
  generatedAt: string;
  error?: string;
}

export const generateBrandWithAI = async (input: AIBrandInput): Promise<AIBrandGeneratorResult> => {
  const response = await authFetch('/api/brand-kit/generate-brand', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to generate brand' }));
    throw new Error(err.error || 'Failed to generate brand suggestions');
  }
  
  return response.json();
};

// ============================================
// BRAND EXTRACTION (URL IMPORT)
// ============================================

export interface ExtractedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  name?: string;
  usage: 'background' | 'text' | 'accent' | 'border' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  frequency: number;
}

export interface ExtractedFont {
  family: string;
  weights: string[];
  usage: 'heading' | 'body' | 'accent' | 'unknown';
  source?: string;
}

export interface ExtractedLogo {
  url: string;
  type: 'favicon' | 'og-image' | 'header-logo' | 'svg-logo';
  width?: number;
  height?: number;
}

export interface BrandExtractionResult {
  url: string;
  timestamp: string;
  colors: ExtractedColor[];
  fonts: ExtractedFont[];
  logos: ExtractedLogo[];
  metadata: {
    title?: string;
    description?: string;
    siteName?: string;
  };
  screenshot?: string;
}

export const extractBrandFromUrl = async (url: string): Promise<BrandExtractionResult> => {
  const response = await authFetch('/api/brand-kit/extract-from-url', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to extract brand' }));
    throw new Error(err.error || 'Failed to extract brand from website');
  }
  
  return response.json();
};

// ============================================
// LOGOS
// ============================================

export const addLogo = async (data: {
  name: string;
  variant?: string;
  isPrimary?: boolean;
  fileType?: string;
  imageData?: string;
  imageUrl?: string;
}): Promise<LogoAsset> => {
  const response = await authFetch('/api/brand-kit/logos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Failed to add logo' }));
    throw new Error(err.error || 'Failed to add logo');
  }
  const result = await response.json();
  return result.logo;
};

export const updateLogo = async (id: string, updates: Partial<LogoAsset>): Promise<LogoAsset> => {
  const response = await authFetch(`/api/brand-kit/logos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update logo');
  }
  const result = await response.json();
  return result.logo;
};

export const deleteLogo = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/logos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete logo');
  }
};

export const setPrimaryLogo = async (id: string): Promise<LogoAsset> => {
  const response = await authFetch(`/api/brand-kit/logos/${id}/primary`, {
    method: 'PUT',
  });
  if (!response.ok) {
    throw new Error('Failed to set primary logo');
  }
  const result = await response.json();
  return result.logo;
};

// ============================================
// COLOR PALETTES
// ============================================

export const addColorPalette = async (data: {
  name: string;
  isPrimary?: boolean;
}): Promise<ColorPalette> => {
  const response = await authFetch('/api/brand-kit/palettes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add color palette');
  }
  const result = await response.json();
  return result.palette;
};

export const updateColorPalette = async (
  id: string,
  updates: Partial<ColorPalette>
): Promise<ColorPalette> => {
  const response = await authFetch(`/api/brand-kit/palettes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update palette');
  }
  const result = await response.json();
  return result.palette;
};

export const deleteColorPalette = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/palettes/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete palette');
  }
};

export const addColorToPalette = async (
  paletteId: string,
  color: Omit<ColorSwatch, 'id'>
): Promise<ColorSwatch> => {
  const response = await authFetch(`/api/brand-kit/palettes/${paletteId}/colors`, {
    method: 'POST',
    body: JSON.stringify(color),
  });
  if (!response.ok) {
    throw new Error('Failed to add color to palette');
  }
  const result = await response.json();
  return result.color;
};

export const removeColorFromPalette = async (colorId: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/colors/${colorId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to remove color');
  }
};

// ============================================
// FONTS
// ============================================

export const addFont = async (data: Omit<FontFamily, 'id' | 'createdAt'>): Promise<FontFamily> => {
  const response = await authFetch('/api/brand-kit/fonts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add font');
  }
  const result = await response.json();
  return result.font;
};

export const updateFont = async (id: string, updates: Partial<FontFamily>): Promise<FontFamily> => {
  const response = await authFetch(`/api/brand-kit/fonts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update font');
  }
  const result = await response.json();
  return result.font;
};

export const deleteFont = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/fonts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete font');
  }
};

// ============================================
// BRAND VOICE
// ============================================

export const updateBrandVoice = async (
  data: Partial<Omit<BrandVoice, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<BrandVoice> => {
  const response = await authFetch('/api/brand-kit/voice', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update brand voice');
  }
  const result = await response.json();
  return result.brandVoice;
};

export const resetBrandVoice = async (): Promise<void> => {
  const response = await authFetch('/api/brand-kit/voice', {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to reset brand voice');
  }
};

// ============================================
// PHOTOS
// ============================================

export const addPhoto = async (data: {
  name: string;
  category?: string;
  tags?: string[];
  imageData?: string;
  imageUrl?: string;
}): Promise<PhotoAsset> => {
  const response = await authFetch('/api/brand-kit/photos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add photo');
  }
  const result = await response.json();
  return result.photo;
};

export const updatePhoto = async (
  id: string,
  updates: Partial<PhotoAsset>
): Promise<PhotoAsset> => {
  const response = await authFetch(`/api/brand-kit/photos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update photo');
  }
  const result = await response.json();
  return result.photo;
};

export const deletePhoto = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/photos/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete photo');
  }
};

// ============================================
// GRAPHICS
// ============================================

export const addGraphic = async (data: {
  name: string;
  type?: string;
  imageData?: string;
  imageUrl?: string;
}): Promise<GraphicAsset> => {
  const response = await authFetch('/api/brand-kit/graphics', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add graphic');
  }
  const result = await response.json();
  return result.graphic;
};

export const updateGraphic = async (
  id: string,
  updates: Partial<GraphicAsset>
): Promise<GraphicAsset> => {
  const response = await authFetch(`/api/brand-kit/graphics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update graphic');
  }
  const result = await response.json();
  return result.graphic;
};

export const deleteGraphic = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/graphics/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete graphic');
  }
};

// ============================================
// ICONS
// ============================================

export const addIcon = async (data: Omit<IconAsset, 'id' | 'createdAt'>): Promise<IconAsset> => {
  const response = await authFetch('/api/brand-kit/icons', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add icon');
  }
  const result = await response.json();
  return result.icon;
};

export const updateIcon = async (id: string, updates: Partial<IconAsset>): Promise<IconAsset> => {
  const response = await authFetch(`/api/brand-kit/icons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update icon');
  }
  const result = await response.json();
  return result.icon;
};

export const deleteIcon = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/icons/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete icon');
  }
};

// ============================================
// STYLE PRESETS
// ============================================

export const addStyle = async (
  data: Omit<StylePreset, 'id' | 'createdAt'>
): Promise<StylePreset> => {
  const response = await authFetch('/api/brand-kit/styles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add style');
  }
  const result = await response.json();
  return result.style;
};

export const updateStyle = async (
  id: string,
  updates: Partial<StylePreset>
): Promise<StylePreset> => {
  const response = await authFetch(`/api/brand-kit/styles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update style');
  }
  const result = await response.json();
  return result.style;
};

export const deleteStyle = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/styles/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete style');
  }
};

// ============================================
// CUSTOM CATEGORIES
// ============================================

export const addCustomCategory = async (
  data: Omit<CustomCategory, 'id' | 'createdAt'>
): Promise<CustomCategory> => {
  const response = await authFetch('/api/brand-kit/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to add custom category');
  }
  const result = await response.json();
  return result.category;
};

export const deleteCustomCategory = async (id: string): Promise<void> => {
  const response = await authFetch(`/api/brand-kit/categories/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete custom category');
  }
};
