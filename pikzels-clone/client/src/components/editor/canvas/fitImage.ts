/**
 * Image Fit Utility
 *
 * Pure function that computes draw coordinates for an image
 * within a container based on fit mode (cover, contain, fill, none).
 */

export interface FitResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute the draw rectangle for an image within a container.
 *
 * @param imageWidth - Natural width of the source image
 * @param imageHeight - Natural height of the source image
 * @param containerWidth - Width of the target container/slot
 * @param containerHeight - Height of the target container/slot
 * @param fit - How to fit the image within the container
 * @returns The position and size to draw the image at (relative to container origin)
 */
export function fitImage(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number,
  fit: 'cover' | 'contain' | 'fill' | 'none'
): FitResult {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }

  switch (fit) {
    case 'fill':
      // Stretch to exact container dimensions
      return { x: 0, y: 0, width: containerWidth, height: containerHeight };

    case 'cover': {
      // Scale to fill completely (may crop), center
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.max(scaleX, scaleY);
      const w = imageWidth * scale;
      const h = imageHeight * scale;
      return {
        x: (containerWidth - w) / 2,
        y: (containerHeight - h) / 2,
        width: w,
        height: h,
      };
    }

    case 'contain': {
      // Scale to fit within container (may letterbox), center
      const scaleX = containerWidth / imageWidth;
      const scaleY = containerHeight / imageHeight;
      const scale = Math.min(scaleX, scaleY);
      const w = imageWidth * scale;
      const h = imageHeight * scale;
      return {
        x: (containerWidth - w) / 2,
        y: (containerHeight - h) / 2,
        width: w,
        height: h,
      };
    }

    case 'none': {
      // Natural size, centered
      return {
        x: (containerWidth - imageWidth) / 2,
        y: (containerHeight - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
      };
    }

    default:
      return { x: 0, y: 0, width: containerWidth, height: containerHeight };
  }
}
