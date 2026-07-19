import {
  BrandKitState,
  LogoAsset,
  ColorPalette,
  FontFamily,
  BrandVoice,
  PhotoAsset,
  GraphicAsset,
  IconAsset,
  StylePreset,
  BrandUsageStat,
  BrandActivityItem,
  CustomCategory,
} from './types';

// ── Logo Assets ───────────────────────────────────────────────────────

const mockLogos: LogoAsset[] = [
  {
    id: 'logo-1',
    name: 'Primary Logo (Dark)',
    url: '/brand/logo-dark.svg',
    variant: 'dark',
    isPrimary: true,
    fileType: 'svg',
    createdAt: '2025-12-15T10:00:00Z',
  },
  {
    id: 'logo-2',
    name: 'Primary Logo (Light)',
    url: '/brand/logo-light.svg',
    variant: 'light',
    isPrimary: false,
    fileType: 'svg',
    createdAt: '2025-12-15T10:05:00Z',
  },
  {
    id: 'logo-3',
    name: 'Icon Only',
    url: '/brand/logo-icon.png',
    variant: 'icon',
    isPrimary: false,
    fileType: 'png',
    createdAt: '2025-12-20T14:30:00Z',
  },
  {
    id: 'logo-4',
    name: 'Full Wordmark',
    url: '/brand/logo-full.svg',
    variant: 'full',
    isPrimary: false,
    fileType: 'svg',
    createdAt: '2026-01-02T09:00:00Z',
  },
];

// ── Color Palettes ────────────────────────────────────────────────────

const mockColorPalettes: ColorPalette[] = [
  {
    id: 'palette-1',
    name: 'Primary Brand',
    isPrimary: true,
    createdAt: '2025-11-01T08:00:00Z',
    colors: [
      { id: 'c1', hex: '#2563FF', name: 'Brand Blue', role: 'primary' },
      { id: 'c2', hex: '#10B981', name: 'Success Green', role: 'secondary' },
      { id: 'c3', hex: '#F43F5E', name: 'Accent Rose', role: 'accent' },
      { id: 'c4', hex: '#F59E0B', name: 'Highlight Amber', role: 'accent' },
    ],
  },
  {
    id: 'palette-2',
    name: 'Dark Theme',
    isPrimary: false,
    createdAt: '2025-12-10T12:00:00Z',
    colors: [
      { id: 'c5', hex: '#0F172A', name: 'Slate 900', role: 'primary' },
      { id: 'c6', hex: '#1E293B', name: 'Slate 800', role: 'secondary' },
      { id: 'c7', hex: '#334155', name: 'Slate 700', role: 'neutral' },
      { id: 'c8', hex: '#94A3B8', name: 'Slate 400', role: 'neutral' },
    ],
  },
  {
    id: 'palette-3',
    name: 'Thumbnail Accents',
    isPrimary: false,
    createdAt: '2026-01-05T16:00:00Z',
    colors: [
      { id: 'c9', hex: '#8B5CF6', name: 'Violet', role: 'accent' },
      { id: 'c10', hex: '#EC4899', name: 'Pink', role: 'accent' },
      { id: 'c11', hex: '#06B6D4', name: 'Cyan', role: 'accent' },
      { id: 'c12', hex: '#F97316', name: 'Orange', role: 'accent' },
    ],
  },
];

// ── Font Families ─────────────────────────────────────────────────────

const mockFonts: FontFamily[] = [
  {
    id: 'font-1',
    name: 'Inter',
    fontFamily: '"Inter", sans-serif',
    role: 'heading',
    previewText: 'Aa',
    createdAt: '2025-11-01T08:00:00Z',
    weights: [
      { weight: 700, label: 'Bold', style: 'normal' },
      { weight: 800, label: 'Extra Bold', style: 'normal' },
      { weight: 900, label: 'Black', style: 'normal' },
    ],
  },
  {
    id: 'font-2',
    name: 'Playfair Display',
    fontFamily: '"Playfair Display", serif',
    role: 'subheading',
    previewText: 'Aa',
    createdAt: '2025-11-15T10:00:00Z',
    weights: [
      { weight: 400, label: 'Regular', style: 'normal' },
      { weight: 400, label: 'Italic', style: 'italic' },
      { weight: 700, label: 'Bold', style: 'normal' },
    ],
  },
];

// ── Brand Voice ───────────────────────────────────────────────────────

const mockBrandVoice: BrandVoice = {
  id: 'voice-1',
  tone: 'Friendly & Professional',
  description:
    'Friendly, professional, and concise tone for all generated text. Speak directly to creators and keep language action-oriented.',
  keywords: ['bold', 'creative', 'engaging', 'professional', 'action-oriented'],
  dos: [
    'Use active voice and direct language',
    'Keep sentences short and punchy',
    'Address the viewer directly with "you"',
    'Use power words that create urgency',
  ],
  donts: [
    'Avoid passive voice or filler words',
    'Don\'t use jargon or technical terms',
    'Never use clickbait that misleads',
    'Avoid all-caps except for emphasis',
  ],
  createdAt: '2025-12-01T08:00:00Z',
  updatedAt: '2026-01-10T14:30:00Z',
};

// ── Photo Assets ──────────────────────────────────────────────────────

const mockPhotos: PhotoAsset[] = [
  {
    id: 'photo-1',
    name: 'Professional Headshot',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop',
    tags: ['headshot', 'professional', 'portrait'],
    category: 'headshot',
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'photo-2',
    name: 'Studio Portrait',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=800&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop',
    tags: ['portrait', 'studio', 'male'],
    category: 'headshot',
    createdAt: '2025-12-05T14:00:00Z',
  },
  {
    id: 'photo-3',
    name: 'Casual Portrait',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=800&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop',
    tags: ['casual', 'portrait', 'outdoor'],
    category: 'headshot',
    createdAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'photo-4',
    name: 'Gaming Setup BG',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1280&h=720&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&h=170&fit=crop',
    tags: ['gaming', 'tech', 'background'],
    category: 'background',
    createdAt: '2025-12-15T11:00:00Z',
  },
  {
    id: 'photo-5',
    name: 'Neon Abstract BG',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1280&h=720&fit=crop',
    thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=170&fit=crop',
    tags: ['neon', 'abstract', 'colorful', 'background'],
    category: 'background',
    createdAt: '2025-12-18T16:00:00Z',
  },
];

// ── Graphic Assets ────────────────────────────────────────────────────

const mockGraphics: GraphicAsset[] = [
  {
    id: 'gfx-1',
    name: 'Subscribe Badge',
    url: '/brand/graphics/subscribe-badge.svg',
    thumbnailUrl: '/brand/graphics/subscribe-badge-thumb.png',
    type: 'badge',
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'gfx-2',
    name: 'Arrow Overlay',
    url: '/brand/graphics/arrow-overlay.svg',
    thumbnailUrl: '/brand/graphics/arrow-overlay-thumb.png',
    type: 'overlay',
    createdAt: '2025-12-05T12:00:00Z',
  },
  {
    id: 'gfx-3',
    name: 'Fire Sticker',
    url: '/brand/graphics/fire-sticker.svg',
    thumbnailUrl: '/brand/graphics/fire-sticker-thumb.png',
    type: 'sticker',
    createdAt: '2025-12-10T08:00:00Z',
  },
  {
    id: 'gfx-4',
    name: 'Geometric Pattern',
    url: '/brand/graphics/geo-pattern.svg',
    thumbnailUrl: '/brand/graphics/geo-pattern-thumb.png',
    type: 'pattern',
    createdAt: '2025-12-15T15:00:00Z',
  },
  {
    id: 'gfx-5',
    name: 'Circle Frame',
    url: '/brand/graphics/circle-frame.svg',
    thumbnailUrl: '/brand/graphics/circle-frame-thumb.png',
    type: 'shape',
    createdAt: '2025-12-20T10:00:00Z',
  },
  {
    id: 'gfx-6',
    name: 'NEW Tag',
    url: '/brand/graphics/new-tag.svg',
    thumbnailUrl: '/brand/graphics/new-tag-thumb.png',
    type: 'badge',
    createdAt: '2026-01-02T09:00:00Z',
  },
  {
    id: 'gfx-7',
    name: 'Halftone Overlay',
    url: '/brand/graphics/halftone.svg',
    thumbnailUrl: '/brand/graphics/halftone-thumb.png',
    type: 'overlay',
    createdAt: '2026-01-05T14:00:00Z',
  },
  {
    id: 'gfx-8',
    name: 'Speed Lines',
    url: '/brand/graphics/speed-lines.svg',
    thumbnailUrl: '/brand/graphics/speed-lines-thumb.png',
    type: 'overlay',
    createdAt: '2026-01-08T11:00:00Z',
  },
  {
    id: 'gfx-9',
    name: 'Explosion Shape',
    url: '/brand/graphics/explosion.svg',
    thumbnailUrl: '/brand/graphics/explosion-thumb.png',
    type: 'shape',
    createdAt: '2026-01-10T16:00:00Z',
  },
  {
    id: 'gfx-10',
    name: 'Star Burst',
    url: '/brand/graphics/star-burst.svg',
    thumbnailUrl: '/brand/graphics/star-burst-thumb.png',
    type: 'shape',
    createdAt: '2026-01-12T09:30:00Z',
  },
  {
    id: 'gfx-11',
    name: 'Lightning Bolt',
    url: '/brand/graphics/lightning.svg',
    thumbnailUrl: '/brand/graphics/lightning-thumb.png',
    type: 'sticker',
    createdAt: '2026-01-14T13:00:00Z',
  },
  {
    id: 'gfx-12',
    name: 'Stripe Pattern',
    url: '/brand/graphics/stripe-pattern.svg',
    thumbnailUrl: '/brand/graphics/stripe-pattern-thumb.png',
    type: 'pattern',
    createdAt: '2026-01-15T10:00:00Z',
  },
];

// ── Icon Assets ───────────────────────────────────────────────────────

const mockIcons: IconAsset[] = [
  {
    id: 'icon-1',
    name: 'Checkmark',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>',
    category: 'action',
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'icon-2',
    name: 'Close',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>',
    category: 'action',
    createdAt: '2025-12-01T10:05:00Z',
  },
  {
    id: 'icon-3',
    name: 'Lightning',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>',
    category: 'media',
    createdAt: '2025-12-05T14:00:00Z',
  },
  {
    id: 'icon-4',
    name: 'Play Button',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
    category: 'media',
    createdAt: '2025-12-10T09:00:00Z',
  },
  {
    id: 'icon-5',
    name: 'Star',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    category: 'ui',
    createdAt: '2025-12-15T11:00:00Z',
  },
  {
    id: 'icon-6',
    name: 'YouTube',
    svg: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    category: 'social',
    createdAt: '2025-12-20T10:00:00Z',
  },
  {
    id: 'icon-7',
    name: 'Instagram',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>',
    category: 'social',
    createdAt: '2026-01-02T09:00:00Z',
  },
  {
    id: 'icon-8',
    name: 'Arrow Right',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    category: 'ui',
    createdAt: '2026-01-05T14:00:00Z',
  },
];

// ── Style Presets ─────────────────────────────────────────────────────

const mockStyles: StylePreset[] = [
  {
    id: 'style-1',
    name: 'Bold Gaming',
    previewUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop',
    textPlacement: 'bottom-left',
    overlayColor: '#000000',
    overlayOpacity: 0.6,
    fontPairing: { heading: 'Inter', body: 'Inter' },
    colorScheme: ['#FF0000', '#FFFF00', '#FFFFFF'],
    createdAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'style-2',
    name: 'Clean Minimal',
    previewUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop',
    textPlacement: 'center',
    overlayColor: '#0F172A',
    overlayOpacity: 0.4,
    fontPairing: { heading: 'Playfair Display', body: 'Inter' },
    colorScheme: ['#FFFFFF', '#94A3B8', '#2563FF'],
    createdAt: '2025-12-15T14:00:00Z',
  },
  {
    id: 'style-3',
    name: 'Neon Pop',
    previewUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=400&h=225&fit=crop',
    textPlacement: 'top-center',
    overlayColor: '#1E1B4B',
    overlayOpacity: 0.5,
    fontPairing: { heading: 'Inter', body: 'Inter' },
    colorScheme: ['#A78BFA', '#EC4899', '#06B6D4'],
    createdAt: '2026-01-05T09:00:00Z',
  },
];

// ── Brand Usage Stats ─────────────────────────────────────────────────

const mockUsageStats: BrandUsageStat[] = [
  { assetType: 'logos', assetName: 'Primary Logo (Dark)', usageCount: 47, usagePercentage: 78 },
  { assetType: 'colors', assetName: 'Primary Brand palette', usageCount: 89, usagePercentage: 92 },
  { assetType: 'fonts', assetName: 'Inter', usageCount: 63, usagePercentage: 85 },
  { assetType: 'photos', assetName: 'Professional Headshot', usageCount: 31, usagePercentage: 52 },
  { assetType: 'graphics', assetName: 'Subscribe Badge', usageCount: 24, usagePercentage: 40 },
  { assetType: 'styles', assetName: 'Bold Gaming', usageCount: 18, usagePercentage: 30 },
];

// ── Brand Activity Feed ───────────────────────────────────────────────

const mockActivity: BrandActivityItem[] = [
  {
    id: 'act-1',
    action: 'uploaded',
    assetType: 'logos',
    assetName: 'Full Wordmark',
    timestamp: '2026-02-14T08:30:00Z',
    description: 'Uploaded new full wordmark logo variant',
  },
  {
    id: 'act-2',
    action: 'updated',
    assetType: 'colors',
    assetName: 'Thumbnail Accents',
    timestamp: '2026-02-13T16:45:00Z',
    description: 'Added Orange (#F97316) to accent palette',
  },
  {
    id: 'act-3',
    action: 'created',
    assetType: 'styles',
    assetName: 'Neon Pop',
    timestamp: '2026-02-12T11:20:00Z',
    description: 'Created new Neon Pop style preset',
  },
  {
    id: 'act-4',
    action: 'uploaded',
    assetType: 'photos',
    assetName: 'Neon Abstract BG',
    timestamp: '2026-02-11T09:15:00Z',
    description: 'Uploaded new background photo for thumbnails',
  },
  {
    id: 'act-5',
    action: 'updated',
    assetType: 'brand-voice',
    assetName: 'Brand Voice',
    timestamp: '2026-02-10T14:00:00Z',
    description: 'Updated tone guidelines and added new keywords',
  },
  {
    id: 'act-6',
    action: 'deleted',
    assetType: 'graphics',
    assetName: 'Old Badge v1',
    timestamp: '2026-02-09T10:30:00Z',
    description: 'Removed outdated badge graphic',
  },
  {
    id: 'act-7',
    action: 'uploaded',
    assetType: 'icons',
    assetName: 'Arrow Right',
    timestamp: '2026-02-08T16:00:00Z',
    description: 'Added Arrow Right icon to UI category',
  },
];

// ── Aggregate State ───────────────────────────────────────────────────

export const initialBrandKitState: BrandKitState = {
  logos: mockLogos,
  colorPalettes: mockColorPalettes,
  fonts: mockFonts,
  brandVoice: mockBrandVoice,
  photos: mockPhotos,
  graphics: mockGraphics,
  icons: mockIcons,
  styles: mockStyles,
  customCategories: [],
};

export const brandUsageStats: BrandUsageStat[] = mockUsageStats;
export const brandActivityFeed: BrandActivityItem[] = mockActivity;

// ── Helper: generate unique IDs ───────────────────────────────────────

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
