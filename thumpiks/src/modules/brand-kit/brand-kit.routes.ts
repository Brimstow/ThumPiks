import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import {
  getBrandKit,
  extractBrandFromWebsite,
  generateBrandWithAI,
  // Logos
  addLogo,
  updateLogo,
  deleteLogo,
  setPrimaryLogo,
  // Color Palettes
  addColorPalette,
  updateColorPalette,
  deleteColorPalette,
  addColorToPalette,
  removeColorFromPalette,
  // Fonts
  addFont,
  updateFont,
  deleteFont,
  // Brand Voice
  updateBrandVoice,
  resetBrandVoice,
  // Photos
  addPhoto,
  updatePhoto,
  deletePhoto,
  // Graphics
  addGraphic,
  updateGraphic,
  deleteGraphic,
  // Icons
  addIcon,
  updateIcon,
  deleteIcon,
  // Styles
  addStyle,
  updateStyle,
  deleteStyle,
  // Custom Categories
  addCustomCategory,
  deleteCustomCategory,
} from './brand-kit.controller';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// ============================================
// GET FULL BRAND KIT
// ============================================

// GET /api/brand-kit — Get user's complete brand kit
router.get('/', (req, res) => getBrandKit(req as unknown as AuthRequest, res));

// ============================================
// BRAND EXTRACTION (URL IMPORT)
// ============================================

// POST /api/brand-kit/extract-from-url — Extract brand assets from a website
router.post('/extract-from-url', (req, res) =>
  extractBrandFromWebsite(req as unknown as AuthRequest, res)
);

// ============================================
// AI BRAND GENERATOR
// ============================================

// POST /api/brand-kit/generate-brand — Generate brand suggestions with AI
router.post('/generate-brand', (req, res) =>
  generateBrandWithAI(req as unknown as AuthRequest, res)
);

// ============================================
// LOGOS
// ============================================

// POST /api/brand-kit/logos — Add a new logo
router.post('/logos', (req, res) =>
  addLogo(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/logos/:id — Update a logo
router.put('/logos/:id', (req, res) =>
  updateLogo(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/logos/:id — Delete a logo
router.delete('/logos/:id', (req, res) =>
  deleteLogo(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/logos/:id/primary — Set logo as primary
router.put('/logos/:id/primary', (req, res) =>
  setPrimaryLogo(req as unknown as AuthRequest, res)
);

// ============================================
// COLOR PALETTES
// ============================================

// POST /api/brand-kit/palettes — Add a new color palette
router.post('/palettes', (req, res) =>
  addColorPalette(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/palettes/:id — Update a palette
router.put('/palettes/:id', (req, res) =>
  updateColorPalette(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/palettes/:id — Delete a palette
router.delete('/palettes/:id', (req, res) =>
  deleteColorPalette(req as unknown as AuthRequest, res)
);

// POST /api/brand-kit/palettes/:paletteId/colors — Add color to palette
router.post('/palettes/:paletteId/colors', (req, res) =>
  addColorToPalette(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/colors/:colorId — Remove color from palette
router.delete('/colors/:colorId', (req, res) =>
  removeColorFromPalette(req as unknown as AuthRequest, res)
);

// ============================================
// FONTS
// ============================================

// POST /api/brand-kit/fonts — Add a new font
router.post('/fonts', (req, res) =>
  addFont(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/fonts/:id — Update a font
router.put('/fonts/:id', (req, res) =>
  updateFont(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/fonts/:id — Delete a font
router.delete('/fonts/:id', (req, res) =>
  deleteFont(req as unknown as AuthRequest, res)
);

// ============================================
// BRAND VOICE
// ============================================

// PUT /api/brand-kit/voice — Update brand voice (creates if not exists)
router.put('/voice', (req, res) =>
  updateBrandVoice(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/voice — Reset brand voice
router.delete('/voice', (req, res) =>
  resetBrandVoice(req as unknown as AuthRequest, res)
);

// ============================================
// PHOTOS
// ============================================

// POST /api/brand-kit/photos — Add a new photo
router.post('/photos', (req, res) =>
  addPhoto(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/photos/:id — Update a photo
router.put('/photos/:id', (req, res) =>
  updatePhoto(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/photos/:id — Delete a photo
router.delete('/photos/:id', (req, res) =>
  deletePhoto(req as unknown as AuthRequest, res)
);

// ============================================
// GRAPHICS
// ============================================

// POST /api/brand-kit/graphics — Add a new graphic
router.post('/graphics', (req, res) =>
  addGraphic(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/graphics/:id — Update a graphic
router.put('/graphics/:id', (req, res) =>
  updateGraphic(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/graphics/:id — Delete a graphic
router.delete('/graphics/:id', (req, res) =>
  deleteGraphic(req as unknown as AuthRequest, res)
);

// ============================================
// ICONS
// ============================================

// POST /api/brand-kit/icons — Add a new icon
router.post('/icons', (req, res) =>
  addIcon(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/icons/:id — Update an icon
router.put('/icons/:id', (req, res) =>
  updateIcon(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/icons/:id — Delete an icon
router.delete('/icons/:id', (req, res) =>
  deleteIcon(req as unknown as AuthRequest, res)
);

// ============================================
// STYLE PRESETS
// ============================================

// POST /api/brand-kit/styles — Add a new style preset
router.post('/styles', (req, res) =>
  addStyle(req as unknown as AuthRequest, res)
);

// PUT /api/brand-kit/styles/:id — Update a style preset
router.put('/styles/:id', (req, res) =>
  updateStyle(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/styles/:id — Delete a style preset
router.delete('/styles/:id', (req, res) =>
  deleteStyle(req as unknown as AuthRequest, res)
);

// ============================================
// CUSTOM CATEGORIES
// ============================================

// POST /api/brand-kit/categories — Add a new custom category
router.post('/categories', (req, res) =>
  addCustomCategory(req as unknown as AuthRequest, res)
);

// DELETE /api/brand-kit/categories/:id — Delete a custom category
router.delete('/categories/:id', (req, res) =>
  deleteCustomCategory(req as unknown as AuthRequest, res)
);

export default router;
