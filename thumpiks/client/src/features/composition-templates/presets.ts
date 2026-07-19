/**
 * Built-in Composition Template Presets
 *
 * Each preset defines a multi-image layout with positioned slots,
 * text areas, masks, and blend modes.  All coordinates are expressed
 * as fractions (0–1) of a 1920×1080 reference canvas so they scale
 * to any resolution.
 */

import type { LayoutPreset } from './types';

// ============================================
// HELPER — minimal SVG wireframe generator
// ============================================

function rect(x: number, y: number, w: number, h: number, fill = '#555', label?: string): string {
  const lx = Math.round((x + w / 2) * 200);
  const ly = Math.round((y + h / 2) * 112);
  const labelSvg = label
    ? `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">${label}</text>`
    : '';
  return `<rect x="${Math.round(x * 200)}" y="${Math.round(y * 112)}" width="${Math.round(w * 200)}" height="${Math.round(h * 112)}" rx="3" fill="${fill}" opacity="0.7"/>${labelSvg}`;
}

function wireframe(inner: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 112" fill="none">`
    + `<rect width="200" height="112" rx="6" fill="#1a1a2e"/>`
    + inner
    + `</svg>`;
}

// ============================================
// PRESETS
// ============================================

export const SPLIT_SCREEN_VERTICAL: LayoutPreset = {
  id: 'split-screen-vertical',
  name: 'Split Screen',
  description: 'Two images side by side with text in the center',
  category: 'split-screen',
  tags: ['split', 'versus', 'comparison', 'two-person'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 0.5, 1, '#e74c3c', 'Left')
    + rect(0.5, 0, 0.5, 1, '#3498db', 'Right')
    + rect(0.3, 0.35, 0.4, 0.3, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'left',
      label: 'Left Image',
      role: 'primary',
      bounds: { x: 0, y: 0, width: 0.5, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'right',
      label: 'Right Image',
      role: 'secondary',
      bounds: { x: 0.5, y: 0, width: 0.5, height: 1 },
      fit: 'cover',
      zIndex: 1,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.15, y: 0.35, width: 0.7, height: 0.3 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Impact',
        fontSize: 96,
        fontWeight: 800,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 4,
        textAlign: 'center',
        textTransform: 'uppercase',
      },
      placeholder: 'VS',
    },
  ],
  fallbackBackground: '#000000',
  builtIn: true,
  popularity: 95,
};

export const SPLIT_SCREEN_DIAGONAL: LayoutPreset = {
  id: 'split-screen-diagonal',
  name: 'Diagonal Split',
  description: 'Two images separated by a dramatic diagonal cut',
  category: 'split-screen',
  tags: ['split', 'diagonal', 'dynamic', 'versus'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    `<polygon points="0,0 130,0 70,112 0,112" fill="#e74c3c" opacity="0.7"/>`
    + `<text x="45" y="56" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">Left</text>`
    + `<polygon points="130,0 200,0 200,112 70,112" fill="#3498db" opacity="0.7"/>`
    + `<text x="155" y="56" text-anchor="middle" dominant-baseline="central" fill="#fff" font-size="9" font-family="sans-serif">Right</text>`
    + rect(0.25, 0.7, 0.5, 0.2, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'left',
      label: 'Left Image',
      role: 'primary',
      bounds: { x: 0, y: 0, width: 0.65, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'diagonal-left',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'right',
      label: 'Right Image',
      role: 'secondary',
      bounds: { x: 0.35, y: 0, width: 0.65, height: 1 },
      fit: 'cover',
      zIndex: 1,
      mask: 'diagonal-right',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.15, y: 0.7, width: 0.7, height: 0.2 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Impact',
        fontSize: 72,
        fontWeight: 800,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3,
        textAlign: 'center',
        textTransform: 'uppercase',
      },
      placeholder: 'YOUR TITLE',
    },
  ],
  fallbackBackground: '#000000',
  builtIn: true,
  popularity: 88,
};

export const PERSON_OVER_BACKGROUND: LayoutPreset = {
  id: 'person-over-bg',
  name: 'Person + Background',
  description: 'Subject in front with a dramatic background behind',
  category: 'person-bg',
  tags: ['person', 'background', 'portrait', 'subject', 'foreground'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 1, 1, '#2c3e50', 'Background')
    + rect(0.25, 0.1, 0.5, 0.9, '#e67e22', 'Person')
    + rect(0.1, 0.05, 0.8, 0.2, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'background',
      label: 'Background',
      role: 'background',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      filter: 'brightness(0.7)',
      required: false,
    },
    {
      id: 'person',
      label: 'Person / Subject',
      role: 'primary',
      bounds: { x: 0.2, y: 0.05, width: 0.6, height: 0.95 },
      fit: 'contain',
      zIndex: 5,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      autoRemoveBg: true,
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.05, y: 0.02, width: 0.9, height: 0.2 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 80,
        fontWeight: 800,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3,
        textAlign: 'center',
      },
      placeholder: 'YOUR TITLE HERE',
    },
    {
      id: 'subtitle',
      label: 'Subtitle',
      role: 'text',
      bounds: { x: 0.1, y: 0.82, width: 0.8, height: 0.12 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 36,
        fontWeight: 600,
        color: '#f1c40f',
        textAlign: 'center',
      },
      placeholder: 'Subtitle goes here',
    },
  ],
  fallbackBackground: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  builtIn: true,
  popularity: 92,
};

export const TRIPLE_PANEL: LayoutPreset = {
  id: 'triple-panel',
  name: 'Triple Panel',
  description: 'Three images in equal vertical panels with title overlay',
  category: 'collage',
  tags: ['collage', 'three', 'panel', 'triple', 'grid'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 0.333, 1, '#e74c3c', '1')
    + rect(0.333, 0, 0.334, 1, '#2ecc71', '2')
    + rect(0.667, 0, 0.333, 1, '#3498db', '3')
    + rect(0.1, 0.75, 0.8, 0.2, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'panel-1',
      label: 'Panel 1',
      role: 'primary',
      bounds: { x: 0, y: 0, width: 0.333, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'panel-2',
      label: 'Panel 2',
      role: 'secondary',
      bounds: { x: 0.333, y: 0, width: 0.334, height: 1 },
      fit: 'cover',
      zIndex: 1,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'panel-3',
      label: 'Panel 3',
      role: 'accent',
      bounds: { x: 0.667, y: 0, width: 0.333, height: 1 },
      fit: 'cover',
      zIndex: 2,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: false,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.05, y: 0.75, width: 0.9, height: 0.2 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Impact',
        fontSize: 80,
        fontWeight: 800,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3,
        textAlign: 'center',
        textTransform: 'uppercase',
      },
      placeholder: 'YOUR TITLE',
    },
  ],
  fallbackBackground: '#000000',
  builtIn: true,
  popularity: 78,
};

export const REACTION_THUMBNAIL: LayoutPreset = {
  id: 'reaction',
  name: 'Reaction',
  description: 'Large content image with a small reaction face in the corner',
  category: 'reaction',
  tags: ['reaction', 'face', 'corner', 'commentary', 'response'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 1, 1, '#34495e', 'Content')
    + rect(0.65, 0.55, 0.32, 0.42, '#e74c3c', 'Face')
    + rect(0.05, 0.05, 0.6, 0.2, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'content',
      label: 'Content Image',
      role: 'background',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'face',
      label: 'Reaction Face',
      role: 'primary',
      bounds: { x: 0.65, y: 0.55, width: 0.33, height: 0.43 },
      fit: 'cover',
      zIndex: 5,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      autoRemoveBg: true,
      required: false,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.03, y: 0.03, width: 0.6, height: 0.25 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 72,
        fontWeight: 800,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 3,
        textAlign: 'left',
        textTransform: 'uppercase',
      },
      placeholder: 'REACTION!',
    },
  ],
  fallbackBackground: '#1a1a2e',
  builtIn: true,
  popularity: 85,
};

export const CINEMATIC_WIDE: LayoutPreset = {
  id: 'cinematic-wide',
  name: 'Cinematic',
  description: 'Full-bleed hero image with letterbox bars and title',
  category: 'cinematic',
  tags: ['cinematic', 'movie', 'film', 'hero', 'dramatic', 'widescreen'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 1, 1, '#2c3e50', 'Hero Image')
    + `<rect x="0" y="0" width="200" height="16" fill="#000" opacity="0.8"/>`
    + `<rect x="0" y="96" width="200" height="16" fill="#000" opacity="0.8"/>`
    + rect(0.1, 0.35, 0.8, 0.3, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'hero',
      label: 'Hero Image',
      role: 'primary',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      filter: 'contrast(1.1) saturate(1.2)',
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.05, y: 0.35, width: 0.9, height: 0.3 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Georgia',
        fontSize: 88,
        fontWeight: 700,
        color: '#ffffff',
        stroke: '#000000',
        strokeWidth: 2,
        textAlign: 'center',
        textTransform: 'uppercase',
      },
      placeholder: 'MOVIE TITLE',
    },
  ],
  fallbackBackground: '#000000',
  builtIn: true,
  popularity: 75,
};

export const BLENDED_DOUBLE: LayoutPreset = {
  id: 'blended-double',
  name: 'Blended Overlay',
  description: 'Two images blended together with a soft overlay effect',
  category: 'person-bg',
  tags: ['blend', 'overlay', 'double-exposure', 'artistic', 'fade'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 1, 1, '#8e44ad', 'Base')
    + rect(0, 0, 1, 1, '#e74c3c', 'Overlay')
    + rect(0.15, 0.7, 0.7, 0.2, '#222', 'TEXT')
  ),
  slots: [
    {
      id: 'base',
      label: 'Base Image',
      role: 'background',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      required: true,
    },
    {
      id: 'overlay',
      label: 'Overlay Image',
      role: 'primary',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 1,
      mask: 'none',
      blendMode: 'screen',
      opacity: 60,
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Title',
      role: 'text',
      bounds: { x: 0.1, y: 0.7, width: 0.8, height: 0.2 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 72,
        fontWeight: 800,
        color: '#ffffff',
        textAlign: 'center',
      },
      placeholder: 'BLENDED',
    },
  ],
  fallbackBackground: '#1a1a2e',
  builtIn: true,
  popularity: 70,
};

export const MINIMAL_TEXT_FOCUS: LayoutPreset = {
  id: 'minimal-text-focus',
  name: 'Minimal + Text',
  description: 'Clean single image with large bold text overlay for maximum readability',
  category: 'minimal',
  tags: ['minimal', 'clean', 'text', 'simple', 'bold'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: wireframe(
    rect(0, 0, 1, 1, '#2c3e50', 'Image')
    + rect(0.05, 0.15, 0.55, 0.35, '#222', 'BIG TEXT')
    + rect(0.05, 0.55, 0.4, 0.12, '#333', 'subtitle')
  ),
  slots: [
    {
      id: 'image',
      label: 'Background Image',
      role: 'background',
      bounds: { x: 0, y: 0, width: 1, height: 1 },
      fit: 'cover',
      zIndex: 0,
      mask: 'none',
      blendMode: 'normal',
      opacity: 100,
      filter: 'brightness(0.5)',
      required: true,
    },
  ],
  textSlots: [
    {
      id: 'title',
      label: 'Main Title',
      role: 'text',
      bounds: { x: 0.05, y: 0.15, width: 0.6, height: 0.4 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 110,
        fontWeight: 900,
        color: '#ffffff',
        textAlign: 'left',
        textTransform: 'uppercase',
      },
      placeholder: 'BIG TITLE',
    },
    {
      id: 'subtitle',
      label: 'Subtitle',
      role: 'text',
      bounds: { x: 0.05, y: 0.58, width: 0.5, height: 0.1 },
      zIndex: 10,
      defaultStyle: {
        fontFamily: 'Inter',
        fontSize: 32,
        fontWeight: 500,
        color: '#f1c40f',
        textAlign: 'left',
      },
      placeholder: 'Supporting text here',
    },
  ],
  fallbackBackground: '#0a0a0a',
  builtIn: true,
  popularity: 82,
};

// ============================================
// REGISTRY
// ============================================

export const BUILTIN_LAYOUTS: LayoutPreset[] = [
  PERSON_OVER_BACKGROUND,
  SPLIT_SCREEN_VERTICAL,
  SPLIT_SCREEN_DIAGONAL,
  REACTION_THUMBNAIL,
  TRIPLE_PANEL,
  CINEMATIC_WIDE,
  BLENDED_DOUBLE,
  MINIMAL_TEXT_FOCUS,
];
