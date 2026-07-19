/**
 * Freemium Watermark Configuration
 *
 * Single source of truth for all watermark visual parameters.
 * Imported by both backend (Sharp SVG composite) and frontend (Canvas 2D).
 *
 * When `subscription.config.ts` marks a plan with `watermark: true`,
 * exports for that plan are stamped with a diagonal tiled text overlay
 * using the values below.
 */

export const WATERMARK_CONFIG = {
  /** Brand text rendered across the image */
  text: 'ThumPiks',
  /** Opacity of each text instance (0-1) */
  opacity: 0.3,
  /** Rotation angle in degrees (negative = bottom-left → top-right) */
  angleDegrees: -30,
  /** Font stack (must be available in both SVG/libvips and browser) */
  fontFamily: 'Arial, Helvetica, sans-serif',
  /** Font weight (300 = light, per industry best practices) */
  fontWeight: 300,
  /** Text fill color */
  color: '#FFFFFF',
  /** Subtle stroke for visibility on light backgrounds */
  strokeColor: '#000000',
  /** Stroke width relative to font size */
  strokeWidthRatio: 0.02,
  /** Font size as a ratio of image width (e.g. 1280px → 51px) */
  fontSizeRatio: 0.04,
  /** Minimum font size in pixels (for very small images) */
  fontSizeMin: 12,
  /** Horizontal spacing between tile origins as ratio of image width */
  spacingXRatio: 0.3,
  /** Vertical spacing between tile origins as ratio of image height */
  spacingYRatio: 0.18,
} as const;

export type WatermarkConfig = typeof WATERMARK_CONFIG;
