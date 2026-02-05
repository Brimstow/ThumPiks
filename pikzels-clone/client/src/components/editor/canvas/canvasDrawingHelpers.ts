/**
 * Canvas Drawing Helpers
 * 
 * This module contains imperative canvas 2D drawing operations.
 * These functions directly manipulate the canvas context but remain
 * isolated from React component logic.
 * 
 * Architecture alignment:
 * - Imperative canvas operations are allowed here (per AGENTS.md policy)
 * - React components orchestrate *when* to draw
 * - These helpers decide *how* to draw
 */

export interface Point {
  x: number;
  y: number;
}

export interface DrawingConfig {
  color: string;
  lineWidth: number;
  lineCap: CanvasLineCap;
  strokeStyle: string;
}

/**
 * Initialize a blank canvas with a background color
 */
export function initializeCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string = '#ffffff'
): void {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Clear the entire canvas
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  backgroundColor: string = '#ffffff'
): void {
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Begin a new drawing path at the specified point
 */
export function beginDrawPath(
  ctx: CanvasRenderingContext2D,
  point: Point,
  config: DrawingConfig
): void {
  ctx.beginPath();
  ctx.moveTo(point.x, point.y);
  ctx.lineWidth = config.lineWidth;
  ctx.lineCap = config.lineCap;
  ctx.strokeStyle = config.strokeStyle;
}

/**
 * Continue drawing to a new point
 */
export function drawToPoint(
  ctx: CanvasRenderingContext2D,
  point: Point
): void {
  ctx.lineTo(point.x, point.y);
  ctx.stroke();
}

/**
 * Get canvas-relative coordinates from a mouse event
 */
export function getCanvasCoordinates(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

/**
 * Capture the current canvas state as ImageData
 */
export function captureCanvasState(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ImageData {
  return ctx.getImageData(0, 0, width, height);
}

/**
 * Restore a previously captured canvas state
 */
export function restoreCanvasState(
  ctx: CanvasRenderingContext2D,
  imageData: ImageData
): void {
  ctx.putImageData(imageData, 0, 0);
}

/**
 * Export canvas as a data URL
 */
export function exportCanvasAsDataURL(
  canvas: HTMLCanvasElement,
  format: 'image/png' | 'image/jpeg' = 'image/png',
  quality?: number
): string {
  return canvas.toDataURL(format, quality);
}
