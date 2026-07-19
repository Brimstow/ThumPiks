// thumbnail.controller.ts — Barrel re-export (Finding 10 remediation)
// All handlers are now in domain-specific sub-controllers.
// Routes import from this file to maintain backwards compatibility.

// CRUD + trash lifecycle
export {
  createThumbnail,
  getThumbnails,
  getThumbnailById,
  updateThumbnail,
  deleteThumbnail,
  bulkMoveThumbnails,
  getDeletedThumbnails,
  restoreThumbnail,
  hardDeleteThumbnail,
  cleanupExpiredOriginalsHandler,
} from './thumbnail-crud.controller';

// Prompt/video generation + download
export {
  generateThumbnail,
  downloadThumbnail,
} from './thumbnail-generation.controller';

// Sharing, metadata, style/enhancement
export {
  applyEdits,
  applyStyleTransfer,
  applyImageEnhancement,
  generateShareLink,
  accessSharedThumbnail,
  revokeShareLink,
  setAsFeatured,
  recategorizeThumbnail,
  getAvailableStyles,
  getAvailableEnhancements,
} from './thumbnail-sharing.controller';

// AI content generation (text-to-image, text suggestions, model config)
export {
  aiGenerate,
  aiGenerateText,
  getAIToolModels,
} from './thumbnail-ai-generate.controller';

// AI image editing tools (inpaint, face-swap, upscale, remove-bg, enhance, segment, decompose, expand)
export {
  aiInpaint,
  aiFaceSwap,
  aiUpscale,
  aiRemoveBackground,
  aiEnhance,
  aiSegment,
  aiDecompose,
  aiExpand,
} from './thumbnail-ai-edit.controller';
