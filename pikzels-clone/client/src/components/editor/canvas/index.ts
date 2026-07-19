/**
 * Canvas Feature Module - Public API
 * 
 * This module follows the explicit modular design policy:
 * - Clear boundaries: All canvas imperative code stays in this module
 * - Explicit interfaces: Only these exports are public
 * - Minimal dependencies: Canvas doesn't depend on other features
 * 
 * Usage from other modules:
 *   import { canvasHelpers } from '@/components/editor/canvas';
 */

export * from './canvasDrawingHelpers';
export { default as CanvasEngine } from './CanvasEngine';
