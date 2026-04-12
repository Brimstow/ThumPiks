// ============================================
// SHARED TEXT STYLE CONSTANTS
// Single source of truth for text styling across both editors
// Used by: QuickEditView (Quick Editor), ThumbnailStudio (Full Editor)
// ============================================

// --- Types ---

export interface ThumbnailFont {
  label: string;
  value: string;
  category: 'display' | 'sans' | 'serif' | 'handwritten';
}

export interface TextStylePreset {
  id: string;
  label: string;
  fontFamily: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  textShadow: string;
  backgroundColor: string;
}

// --- Fonts ---
// YouTube-style display fonts + general-purpose fonts
// All fonts are loaded via Google Fonts in index.html

export const THUMBNAIL_FONTS: ThumbnailFont[] = [
  // Display fonts (YouTube thumbnail staples)
  { label: 'Impact', value: 'Impact, Arial Black, sans-serif', category: 'display' },
  { label: 'Oswald', value: "'Oswald', sans-serif", category: 'display' },
  { label: 'Bangers', value: "'Bangers', cursive", category: 'display' },
  { label: 'Bebas Neue', value: "'Bebas Neue', sans-serif", category: 'display' },
  { label: 'Anton', value: "'Anton', sans-serif", category: 'display' },
  // Handwritten
  { label: 'Permanent Marker', value: "'Permanent Marker', cursive", category: 'handwritten' },
  // Sans-serif
  { label: 'Montserrat', value: "'Montserrat', sans-serif", category: 'sans' },
  { label: 'Poppins', value: "'Poppins', sans-serif", category: 'sans' },
  { label: 'Inter', value: 'Inter, sans-serif', category: 'sans' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif', category: 'sans' },
  // Serif
  { label: 'Playfair Display', value: "'Playfair Display', serif", category: 'serif' },
  { label: 'Georgia', value: 'Georgia, serif', category: 'serif' },
];

// --- Color presets ---

export const TEXT_COLOR_PRESETS: string[] = [
  '#FFFFFF', '#000000', '#FF0000', '#FFD600',
  '#00E676', '#2979FF', '#FF6D00', '#E040FB',
];

// --- Mood-to-font map (for vision-aware Smart Text styling) ---

export const MOOD_FONTS: Record<string, string> = {
  dramatic: 'Oswald, Impact, sans-serif',
  intense: 'Oswald, Impact, sans-serif',
  dark: 'Oswald, Impact, sans-serif',
  energetic: 'Bangers, Impact, cursive',
  fun: 'Bangers, Poppins, cursive',
  playful: 'Bangers, Poppins, cursive',
  happy: 'Poppins, Nunito, sans-serif',
  bright: 'Poppins, Nunito, sans-serif',
  calm: 'Quicksand, Nunito, sans-serif',
  mysterious: 'Playfair Display, Georgia, serif',
  elegant: 'Playfair Display, Georgia, serif',
  professional: 'Montserrat, Arial, sans-serif',
  serious: 'Montserrat, Oswald, sans-serif',
  bold: 'Impact, Arial Black, sans-serif',
};

// --- Default text style ---
// Applied when no vision analysis is available

export const DEFAULT_TEXT_STYLE: {
  fontFamily: string;
  color: string;
  fontWeight: string;
  fontSize: number;
  textStroke: string;
  textShadow: string;
  letterSpacing: string;
  backgroundColor: string;
  maxWidth: number;
} = {
  fontFamily: 'Impact, Arial Black, sans-serif',
  color: '#FFFFFF',
  fontWeight: '900',
  fontSize: 80,
  textStroke: '2px rgba(0,0,0,0.8)',
  textShadow: '3px 3px 6px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.4)',
  letterSpacing: '2px',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  maxWidth: 90,
};

// --- Style presets ---
// Predefined YouTube-style text effect combinations

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    id: 'yt-bold',
    label: 'YouTube Bold',
    fontFamily: 'Impact, Arial Black, sans-serif',
    fill: '#FFFFFF',
    stroke: '#000000',
    strokeWidth: 4,
    textShadow: '3px 3px 6px rgba(0,0,0,0.8)',
    backgroundColor: '',
  },
  {
    id: 'banner-dark',
    label: 'Dark Banner',
    fontFamily: "'Montserrat', sans-serif",
    fill: '#FFFFFF',
    stroke: '',
    strokeWidth: 0,
    textShadow: '2px 2px 4px rgba(0,0,0,0.7)',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  {
    id: 'neon-pop',
    label: 'Neon Pop',
    fontFamily: "'Bangers', cursive",
    fill: '#00E676',
    stroke: '#000000',
    strokeWidth: 3,
    textShadow: '0 0 20px rgba(0,230,118,0.6), 0 0 40px rgba(0,230,118,0.3)',
    backgroundColor: '',
  },
  {
    id: 'fire-red',
    label: 'Fire Red',
    fontFamily: "'Oswald', sans-serif",
    fill: '#FF0000',
    stroke: '#000000',
    strokeWidth: 3,
    textShadow: '3px 3px 8px rgba(0,0,0,0.9)',
    backgroundColor: '',
  },
  {
    id: 'gold-luxury',
    label: 'Gold Luxury',
    fontFamily: "'Playfair Display', serif",
    fill: '#FFD600',
    stroke: '#000000',
    strokeWidth: 2,
    textShadow: '2px 2px 6px rgba(0,0,0,0.8)',
    backgroundColor: '',
  },
  {
    id: 'clean-pro',
    label: 'Clean Pro',
    fontFamily: "'Poppins', sans-serif",
    fill: '#FFFFFF',
    stroke: '',
    strokeWidth: 0,
    textShadow: '1px 1px 3px rgba(0,0,0,0.5)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
];

// --- Utilities ---

export function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

/**
 * Parse a CSS text-shadow string into Canvas 2D shadow properties.
 * Handles the first shadow in a comma-separated list.
 * Example: "3px 3px 6px rgba(0,0,0,0.8)" → { offsetX: 3, offsetY: 3, blur: 6, color: "rgba(0,0,0,0.8)" }
 */
export function parseTextShadow(shadow: string): {
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
} | null {
  if (!shadow) return null;

  // Take only the first shadow if comma-separated
  const firstShadow = shadow.split(/,(?![^(]*\))/).map(s => s.trim())[0];
  if (!firstShadow) return null;

  // Extract numeric values (px) and the color
  // Pattern: optional-color offsetX offsetY blur? optional-color
  const pxValues: number[] = [];
  let color = 'rgba(0,0,0,0.5)';

  // Match all px values
  const pxRegex = /(-?\d+(?:\.\d+)?)\s*px/g;
  let match;
  while ((match = pxRegex.exec(firstShadow)) !== null) {
    pxValues.push(parseFloat(match[1]));
  }

  // Match color (rgba, rgb, hex, or named)
  const rgbaMatch = firstShadow.match(/rgba?\([^)]+\)/);
  const hexMatch = firstShadow.match(/#[0-9a-fA-F]{3,8}/);
  if (rgbaMatch) {
    color = rgbaMatch[0];
  } else if (hexMatch) {
    color = hexMatch[0];
  }

  // Also handle unitless numbers (e.g., "3 3 6 rgba(...)")
  if (pxValues.length === 0) {
    const numRegex = /(-?\d+(?:\.\d+)?)/g;
    const cleaned = firstShadow.replace(/rgba?\([^)]+\)/, '').replace(/#[0-9a-fA-F]{3,8}/, '');
    let numMatch;
    while ((numMatch = numRegex.exec(cleaned)) !== null) {
      pxValues.push(parseFloat(numMatch[1]));
    }
  }

  if (pxValues.length < 2) return null;

  return {
    offsetX: pxValues[0],
    offsetY: pxValues[1],
    blur: pxValues[2] || 0,
    color,
  };
}
