import { WATERMARK_CONFIG } from '@shared/watermark.config';

/**
 * Draw a diagonal tiled "ThumPiks" watermark onto a canvas 2D context.
 *
 * The pattern matches the backend Sharp SVG implementation so that
 * frontend previews and server-side outputs look identical.
 *
 * Call this on a **clone** of the editor canvas — never on the live
 * editor canvas itself (users should see a clean preview).
 */
export function drawTiledWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const {
    text,
    opacity,
    angleDegrees,
    fontFamily,
    fontWeight,
    color,
    strokeColor,
    strokeWidthRatio,
    fontSizeRatio,
    fontSizeMin,
    spacingXRatio,
    spacingYRatio,
  } = WATERMARK_CONFIG;

  const fontSize = Math.max(Math.round(width * fontSizeRatio), fontSizeMin);
  const spacingX = Math.max(Math.round(width * spacingXRatio), fontSize * 4);
  const spacingY = Math.max(Math.round(height * spacingYRatio), fontSize * 3);
  const strokeWidth = Math.max(fontSize * strokeWidthRatio, 0.5);

  const angleRad = (angleDegrees * Math.PI) / 180;

  ctx.save();

  ctx.globalAlpha = opacity;
  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  ctx.fillStyle = color;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;
  ctx.textBaseline = 'middle';

  // Translate to centre, rotate, then draw a grid that over-extends
  // the bounds so tiles still cover the corners after rotation.
  ctx.translate(width / 2, height / 2);
  ctx.rotate(angleRad);

  // The diagonal of the image is the worst-case span we need to cover
  const diagonal = Math.sqrt(width * width + height * height);
  const halfDiag = diagonal / 2;

  for (let y = -halfDiag; y < halfDiag; y += spacingY) {
    for (let x = -halfDiag; x < halfDiag; x += spacingX) {
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }

  ctx.restore();
}
