import { z } from 'zod';

/**
 * Zod schema for Thumbnail.parameters JSON column.
 *
 * This column stores different shapes depending on how the thumbnail was created:
 * - AI generation: { style, variation, aiGenerated, ... }
 * - Canvas editor: { width, height, tool }
 * - Video URL import: { videoUrl, videoId, platform, generatedFrom, ... }
 * - Edits/processing: { edits, processedImageUrl, ... }
 * - Share links: { shareToken, shareExpiresAt, ... }
 *
 * Uses .passthrough() to allow extra/variant-specific fields while
 * validating the known optional fields that are commonly used.
 */
export const ThumbnailParametersSchema = z
  .object({
    style: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    tool: z.string().optional(),
    aiGenerated: z.boolean().optional(),
    variation: z.number().optional(),
    platform: z.string().optional(),
    videoUrl: z.string().optional(),
    videoId: z.string().optional(),
    generatedFrom: z.string().optional(),
  })
  .passthrough();

export type ThumbnailParameters = z.infer<typeof ThumbnailParametersSchema>;
