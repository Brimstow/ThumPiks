import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import axios from 'axios';
import { getStorageService } from '../storage';
import { applyFreemiumWatermark } from './watermark.service';

// Local fallback directory (used when Cloudinary unavailable)
const processedImagesDir = path.join(__dirname, '../../../processed-images');
if (typeof fs !== 'undefined' && fs.mkdir) {
  fs.mkdir(processedImagesDir, { recursive: true }).catch(console.error);
}

export class ImageProcessingService {
  /**
   * Apply comprehensive edits to an image using Sharp.js for high-performance processing
   * 
   * Supports resize, color adjustments, filters, transformations, and crop operations.
   * Processes the image server-side and saves result to the processed-images directory.
   * 
   * @param {string} imageUrl - URL or path to the source image to process
   * @param {Object} edits - Edit parameters configuration object
   * @param {Object} [edits.resize] - Resize dimensions
   * @param {number} edits.resize.width - Target width in pixels (1-4000)
   * @param {number} edits.resize.height - Target height in pixels (1-4000)
   * @param {number} [edits.brightness] - Brightness adjustment (-100 to 100, 0 = no change)
   * @param {number} [edits.contrast] - Contrast adjustment (-100 to 100, 0 = no change)
   * @param {number} [edits.saturation] - Saturation adjustment (-100 to 100, 0 = no change)
   * @param {number} [edits.hue] - Hue rotation in degrees (0-360)
   * @param {number} [edits.blur] - Blur radius (0-50)
   * @param {number} [edits.rotation] - Rotation angle in degrees (0-360)
   * @param {boolean} [edits.flipHorizontal] - Flip image horizontally
   * @param {boolean} [edits.flipVertical] - Flip image vertically
   * @param {Object} [edits.crop] - Crop region as percentages
   * @param {number} edits.crop.x - X position (0-100%)
   * @param {number} edits.crop.y - Y position (0-100%)
   * @param {number} edits.crop.width - Width (1-100%)
   * @param {number} edits.crop.height - Height (1-100%)
   * @param {string} [edits.filter] - Pre-built filter name
   * @param {string} thumbnailId - Unique identifier for the thumbnail (used in output filename)
   * @returns {Promise<string>} Absolute file path to the processed image (PNG format)
   * @throws {Error} When image processing fails or invalid parameters provided
   * 
   * @example Basic resize and brightness adjustment
   * ```typescript
   * const processedPath = await imageService.applyEditsToImage(
   *   'https://example.com/image.jpg',
   *   {
   *     resize: { width: 800, height: 600 },
   *     brightness: 20,
   *     contrast: 10
   *   },
   *   'thumb_123'
   * );
   * console.log('Processed image saved to:', processedPath);
   * ```
   * 
   * @example Apply filter and crop
   * ```typescript
   * const editedImage = await imageService.applyEditsToImage(
   *   '/uploads/photo.png',
   *   {
   *     filter: 'vintage',
   *     crop: { x: 10, y: 10, width: 80, height: 80 },
   *     rotation: 45
   *   },
   *   'thumb_456'
   * );
   * ```
   * 
   * @since 1.0.0
   * @see {@link batchApplyEditsToImages} For processing multiple images with same edits
   */
  async applyEditsToImage(
    imageUrl: string,
    edits: any,
    thumbnailId: string,
    options?: { applyFreemiumWatermark?: boolean }
  ): Promise<string> {
    try {
      // For placeholder images, we'll need to download them first
      // In a real implementation, you would fetch the actual image data
      const imageBuffer = await this.fetchImageBuffer(imageUrl);

      // Start with the base image
      let processedImage = sharp(imageBuffer);

      // Apply resize if specified
      if (edits.resize) {
        const { width, height } = edits.resize;
        processedImage = processedImage.resize(width, height);
      }

      // Apply basic adjustments
      if (
        edits.brightness !== undefined ||
        edits.contrast !== undefined ||
        edits.saturation !== undefined
      ) {
        const brightness =
          edits.brightness !== undefined ? edits.brightness / 100 : 1;
        const contrast =
          edits.contrast !== undefined ? edits.contrast / 100 : 1;
        const saturation =
          edits.saturation !== undefined ? edits.saturation / 100 : 1;

        processedImage = processedImage.modulate({
          brightness,
          saturation,
        });

        // Contrast adjustment (simplified)
        if (contrast !== 1) {
          processedImage = processedImage.linear(
            contrast,
            -(128 * (contrast - 1))
          );
        }
      }

      // Apply hue rotation
      if (edits.hue !== undefined && edits.hue !== 0) {
        processedImage = processedImage.modulate({ hue: edits.hue });
      }

      // Apply blur
      if (edits.blur !== undefined && edits.blur > 0) {
        processedImage = processedImage.blur(edits.blur);
      }

      // Apply rotation
      if (edits.rotation !== undefined && edits.rotation !== 0) {
        processedImage = processedImage.rotate(edits.rotation, {
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        });
      }

      // Apply flip
      // Sharp: flop() = horizontal flip (mirror left-right), flip() = vertical flip (mirror top-bottom)
      if (edits.flipHorizontal || edits.flipVertical) {
        if (edits.flipHorizontal && edits.flipVertical) {
          processedImage = processedImage.flop().flip();
        } else if (edits.flipHorizontal) {
          processedImage = processedImage.flop();
        } else if (edits.flipVertical) {
          processedImage = processedImage.flip();
        }
      }

      // Apply crop
      if (edits.crop) {
        const { x, y, width, height } = edits.crop;
        // Use actual image dimensions for accurate crop
        const imgMeta = await sharp(imageBuffer).metadata();
        const imgWidth = imgMeta.width ?? 1280;
        const imgHeight = imgMeta.height ?? 720;
        const cropX = Math.round((x / 100) * imgWidth);
        const cropY = Math.round((y / 100) * imgHeight);
        const cropWidth = Math.round((width / 100) * imgWidth);
        const cropHeight = Math.round((height / 100) * imgHeight);

        processedImage = processedImage.extract({
          left: cropX,
          top: cropY,
          width: cropWidth,
          height: cropHeight,
        });
      }

      // Apply filters
      if (edits.filter) {
        switch (edits.filter) {
          case 'grayscale':
            processedImage = processedImage.grayscale();
            break;
          case 'sepia':
            processedImage = processedImage.tint('#C0A080');
            break;
          case 'vintage':
            // Apply a combination of effects for vintage look
            processedImage = processedImage
              .modulate({ saturation: 0.8 })
              .tint('#D0C0A0');
            break;
          case 'blackAndWhite':
            processedImage = processedImage
              .grayscale()
              .modulate({ brightness: 1.2 });
            break;
          case 'invert':
            processedImage = processedImage.negate();
            break;
          case 'blur':
            processedImage = processedImage.blur(5);
            break;
          case 'sharpen':
            processedImage = processedImage.sharpen();
            break;
          case 'emboss':
            // Sharp doesn't have a direct emboss filter, so we'll simulate it
            processedImage = processedImage.convolve({
              width: 3,
              height: 3,
              kernel: [-1, -1, 0, -1, 1, 1, 0, 1, 1],
            });
            break;
          case 'edgeDetect':
            // Sharp doesn't have a direct edge detect filter, so we'll simulate it
            processedImage = processedImage.convolve({
              width: 3,
              height: 3,
              kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
            });
            break;
        }
      }

      // Apply text overlays via SVG composite
      if (edits.textOverlays && edits.textOverlays.length > 0) {
        const meta = await sharp(imageBuffer).metadata();
        const imgWidth = meta.width ?? 1280;
        const imgHeight = meta.height ?? 720;

        for (const overlay of edits.textOverlays) {
          if (!overlay.text) continue;

          const fontSize = overlay.fontSize ?? 48;
          const color = overlay.color ?? '#FFFFFF';
          const fontFamily = overlay.fontFamily ?? 'Arial, sans-serif';
          const fontWeight = overlay.fontWeight ?? 'bold';
          const strokeColor = overlay.stroke?.color ?? null;
          const strokeWidth = overlay.stroke?.width ?? 0;
          const shadowColor = overlay.shadow?.color ?? null;
          const shadowBlur = overlay.shadow?.blur ?? 4;
          const shadowOffsetX = overlay.shadow?.offsetX ?? 2;
          const shadowOffsetY = overlay.shadow?.offsetY ?? 2;

          // Determine Y position based on named position or explicit y
          let yPos: number;
          if (overlay.y !== undefined) {
            yPos = Math.round((overlay.y / 100) * imgHeight);
          } else {
            switch (overlay.position) {
              case 'top':    yPos = Math.round(fontSize * 1.5); break;
              case 'center': yPos = Math.round(imgHeight / 2); break;
              case 'bottom': default: yPos = imgHeight - Math.round(fontSize * 1.5); break;
            }
          }

          // Determine X position
          let xPos: number;
          if (overlay.x !== undefined) {
            xPos = Math.round((overlay.x / 100) * imgWidth);
          } else {
            xPos = Math.round(imgWidth / 2);
          }

          const textAnchor = overlay.align === 'left' ? 'start' : overlay.align === 'right' ? 'end' : 'middle';

          // Build SVG filters for shadow
          const filterId = `shadow_${Date.now()}`;
          const filterDef = shadowColor
            ? `<defs>
                <filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="${shadowOffsetX}" dy="${shadowOffsetY}" stdDeviation="${shadowBlur / 2}"
                    flood-color="${shadowColor}" flood-opacity="0.8"/>
                </filter>
              </defs>`
            : '';

          const filterAttr = shadowColor ? `filter="url(#${filterId})"` : '';
          const strokeAttr = strokeColor && strokeWidth > 0
            ? `stroke="${strokeColor}" stroke-width="${strokeWidth}" paint-order="stroke"`
            : '';

          const svg = `<svg width="${imgWidth}" height="${imgHeight}" xmlns="http://www.w3.org/2000/svg">
            ${filterDef}
            <text
              x="${xPos}"
              y="${yPos}"
              font-family="${fontFamily}"
              font-size="${fontSize}"
              font-weight="${fontWeight}"
              fill="${color}"
              text-anchor="${textAnchor}"
              dominant-baseline="middle"
              ${strokeAttr}
              ${filterAttr}
            >${overlay.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
          </svg>`;

          processedImage = processedImage.composite([{
            input: Buffer.from(svg),
            gravity: 'northwest',
          }]);
        }
      }

      // Convert to buffer for upload
      let processedBuffer = await processedImage.png().toBuffer();

      // Apply freemium watermark as the very last step (after all edits)
      if (options?.applyFreemiumWatermark) {
        processedBuffer = await applyFreemiumWatermark(processedBuffer);
      }

      // Try Cloudinary upload first, fall back to local storage
      try {
        const storage = getStorageService();
        const isAvailable = await storage.isAvailable();

        if (isAvailable) {
          const uploadResult = await storage.uploadProcessedImage(
            processedBuffer,
            thumbnailId
          );
          console.log(`☁️ Processed image uploaded to Cloudinary: ${uploadResult.publicId}`);
          return uploadResult.secureUrl;
        }
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
      }

      // Fallback: Save locally (for development or if Cloudinary unavailable)
      const outputFilename = `processed_${thumbnailId}_${Date.now()}.png`;
      const outputPath = path.join(processedImagesDir, outputFilename);
      await fs.writeFile(outputPath, processedBuffer);
      console.log(`💾 Processed image saved locally: ${outputPath}`);

      return outputPath;
    } catch (error) {
      console.error('Error processing image:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Apply the same edits to multiple images
   * @param imageUrls Array of URLs for the source images
   * @param edits The edit parameters to apply to all images
   * @param thumbnailIds Array of IDs for the thumbnails (used for filenames)
   * @returns Array of paths to the processed images
   */
  async batchApplyEditsToImages(
    imageUrls: string[],
    edits: any,
    thumbnailIds: string[]
  ): Promise<string[]> {
    try {
      const processedImagePaths: string[] = [];

      // Process each image with the same edits
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i];
        const thumbnailId = thumbnailIds[i];
        if (!imageUrl) {
          throw new Error(`Image URL at index ${i} is required`);
        }
        if (!thumbnailId) {
          throw new Error(`Thumbnail ID at index ${i} is required`);
        }
        const imagePath = await this.applyEditsToImage(
          imageUrl,
          edits,
          thumbnailId
        );
        processedImagePaths.push(imagePath);
      }

      return processedImagePaths;
    } catch (error) {
      console.error('Error processing batch of images:', error);
      throw new Error('Failed to process batch of images');
    }
  }

  /**
   * Fetch image buffer from URL
   * @param imageUrl The URL of the image to fetch
   * @returns Buffer containing the image data
   */
  private async fetchImageBuffer(imageUrl: string): Promise<Buffer> {
    if (process.env.NODE_ENV === 'test') {
      return Buffer.from('test');
    }

    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1] ?? '';
      return Buffer.from(base64Data, 'base64');
    }

    // Fetch all URLs including placehold.co - no more gray rectangles
    const response = await axios.get<ArrayBuffer>(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: { 'User-Agent': 'ThumPiks/1.0' },
    });
    return Buffer.from(response.data);
  }

  /**
   * Get the URL for a processed image
   * @param imagePath The path to the processed image
   * @returns The URL to access the processed image
   */
  getProcessedImageUrl(imagePath: string): string {
    // In a real implementation, you would serve these images through your API
    // For now, we'll just return a placeholder
    const filename = path.basename(imagePath);
    return `/processed-images/${filename}`;
  }

  /**
   * Get list of available filters
   * @returns Array of filter names
   */
  getAvailableFilters(): string[] {
    return [
      'none',
      'grayscale',
      'sepia',
      'vintage',
      'blackAndWhite',
      'invert',
      'blur',
      'sharpen',
      'emboss',
      'edgeDetect',
    ];
  }
}
