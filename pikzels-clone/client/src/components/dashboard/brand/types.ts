import { LucideIcon } from 'lucide-react';

// ── Core Brand Kit Types ──────────────────────────────────────────────

export type BrandCategoryType =
  | 'logos'
  | 'colors'
  | 'fonts'
  | 'brand-voice'
  | 'photos'
  | 'graphics'
  | 'icons'
  | 'styles'
  | 'custom'; // Placeholder for custom category - actual ID stored in customCategoryId

// Custom category type for user-created categories
export interface CustomCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverColor: string;
  createdAt: string;
}

// ── Asset Item Types ──────────────────────────────────────────────────

export interface LogoAsset {
  id: string;
  name: string;
  url: string;
  variant: 'full' | 'icon' | 'light' | 'dark';
  isPrimary: boolean;
  fileType: 'svg' | 'png' | 'jpg';
  createdAt: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: ColorSwatch[];
  isPrimary: boolean;
  createdAt: string;
}

export interface ColorSwatch {
  id: string;
  hex: string;
  name: string;
  role: 'primary' | 'secondary' | 'accent' | 'neutral' | 'custom';
}

export interface FontFamily {
  id: string;
  name: string;
  fontFamily: string;
  weights: FontWeight[];
  role: 'heading' | 'subheading' | 'body' | 'custom';
  previewText: string;
  createdAt: string;
}

export interface FontWeight {
  weight: number;
  label: string;
  style: 'normal' | 'italic';
}

export interface BrandVoice {
  id: string;
  tone: string;
  description: string;
  keywords: string[];
  dos: string[];
  donts: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PhotoAsset {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  category: 'headshot' | 'background' | 'product' | 'lifestyle' | 'custom';
  createdAt: string;
}

export interface GraphicAsset {
  id: string;
  name: string;
  url: string;
  thumbnailUrl: string;
  type: 'overlay' | 'shape' | 'pattern' | 'sticker' | 'badge' | 'custom';
  createdAt: string;
}

export interface IconAsset {
  id: string;
  name: string;
  svg: string;
  category: 'action' | 'social' | 'media' | 'ui' | 'custom';
  createdAt: string;
}

export interface StylePreset {
  id: string;
  name: string;
  previewUrl: string;
  textPlacement: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  overlayColor: string;
  overlayOpacity: number;
  fontPairing: { heading: string; body: string };
  colorScheme: string[];
  createdAt: string;
}

// ── Brand Category (Card on Grid) ─────────────────────────────────────

export interface BrandCategory {
  id: BrandCategoryType;
  icon: LucideIcon;
  title: string;
  count: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  hoverColor: string;
}

// ── Brand Kit State ───────────────────────────────────────────────────

export interface BrandKitState {
  logos: LogoAsset[];
  colorPalettes: ColorPalette[];
  fonts: FontFamily[];
  brandVoice: BrandVoice | null;
  photos: PhotoAsset[];
  graphics: GraphicAsset[];
  icons: IconAsset[];
  styles: StylePreset[];
  customCategories: CustomCategory[];
}

// ── Brand Usage & Activity ────────────────────────────────────────────

export interface BrandUsageStat {
  assetType: BrandCategoryType;
  assetName: string;
  usageCount: number;
  usagePercentage: number;
}

export interface BrandActivityItem {
  id: string;
  action: 'uploaded' | 'updated' | 'deleted' | 'created';
  assetType: BrandCategoryType;
  assetName: string;
  timestamp: string;
  description: string;
}

// ── Modal / CRUD Types ────────────────────────────────────────────────

export type ModalMode = 'view' | 'add' | 'edit';

export interface BrandKitModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: BrandCategoryType;
  mode: ModalMode;
}
