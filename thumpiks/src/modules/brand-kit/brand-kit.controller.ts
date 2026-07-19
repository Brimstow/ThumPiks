import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { getBrandKitService } from './brand-kit.service';
import {
  extractBrandFromUrl,
  BrandExtractionResult,
} from './brand-extraction.service';
import {
  generateBrandSuggestions,
  BrandGeneratorInput,
} from './ai-brand-generator.service';

// ============================================
// AI BRAND GENERATOR
// ============================================

export const generateBrandWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      brandName,
      tagline,
      industry,
      stylePreferences,
      colorPreferences,
      brandPersonality,
      targetAudience,
    } = req.body;

    // Validate required fields
    if (
      !brandName ||
      !industry ||
      !stylePreferences?.length ||
      !colorPreferences?.length ||
      !brandPersonality?.length
    ) {
      return res.status(400).json({
        error:
          'Missing required fields: brandName, industry, stylePreferences, colorPreferences, and brandPersonality are required',
      });
    }

    const input: BrandGeneratorInput = {
      brandName,
      tagline,
      industry,
      stylePreferences,
      colorPreferences,
      brandPersonality,
      targetAudience,
    };

    const result = await generateBrandSuggestions(input);

    return res.status(200).json(result);
  } catch (error: unknown) {
    logger.error('Error generating brand with AI', error instanceof Error ? error : new Error(String(error)));

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('Ollama')) {
      return res
        .status(503)
        .json({ error: 'AI service unavailable. Using fallback generation.' });
    }

    return res
      .status(500)
      .json({ error: 'Failed to generate brand suggestions' });
  }
};

// ============================================
// BRAND EXTRACTION (URL IMPORT)
// ============================================

export const extractBrandFromWebsite = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Extract brand assets from URL
    const result: BrandExtractionResult = await extractBrandFromUrl(url);

    return res.status(200).json(result);
  } catch (error: unknown) {
    logger.error('Error extracting brand from URL', error instanceof Error ? error : new Error(String(error)));

    const message = error instanceof Error ? error.message : String(error);
    // Handle common errors
    if (message.includes('timeout')) {
      return res
        .status(408)
        .json({ error: 'Website took too long to load. Please try again.' });
    }
    if (message.includes('net::ERR')) {
      return res
        .status(400)
        .json({ error: 'Could not reach the website. Please check the URL.' });
    }

    return res
      .status(500)
      .json({ error: 'Failed to extract brand from website' });
  }
};

// ============================================
// GET FULL BRAND KIT
// ============================================

export const getBrandKit = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const brandKit = await getBrandKitService().getBrandKit(user.id);
    return res.status(200).json(brandKit);
  } catch (error) {
    logger.error('Error fetching brand kit', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to fetch brand kit' });
  }
};

// ============================================
// LOGOS
// ============================================

export const addLogo = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, variant, isPrimary, fileType, imageData, imageUrl } =
      req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const logo = await getBrandKitService().addLogo({
      userId: user.id,
      name,
      variant: variant || 'full',
      isPrimary: isPrimary || false,
      fileType: fileType || 'png',
      imageData,
      imageUrl,
    });

    return res.status(201).json({ logo });
  } catch (error) {
    logger.error('Error adding logo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add logo' });
  }
};

export const updateLogo = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const logo = await getBrandKitService().updateLogo(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ logo });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Logo not found') {
      return res.status(404).json({ error: 'Logo not found' });
    }
    logger.error('Error updating logo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update logo' });
  }
};

export const deleteLogo = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteLogo(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Logo not found') {
      return res.status(404).json({ error: 'Logo not found' });
    }
    logger.error('Error deleting logo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete logo' });
  }
};

export const setPrimaryLogo = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const logo = await getBrandKitService().setPrimaryLogo(id, user.id);
    return res.status(200).json({ logo });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Logo not found') {
      return res.status(404).json({ error: 'Logo not found' });
    }
    logger.error('Error setting primary logo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to set primary logo' });
  }
};

// ============================================
// COLOR PALETTES
// ============================================

export const addColorPalette = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, isPrimary } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const palette = await getBrandKitService().addColorPalette({
      userId: user.id,
      name,
      isPrimary: isPrimary || false,
    });

    return res.status(201).json({ palette });
  } catch (error) {
    logger.error('Error adding color palette', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add color palette' });
  }
};

export const updateColorPalette = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const palette = await getBrandKitService().updateColorPalette(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ palette });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Palette not found') {
      return res.status(404).json({ error: 'Palette not found' });
    }
    logger.error('Error updating palette', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update palette' });
  }
};

export const deleteColorPalette = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteColorPalette(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Palette not found') {
      return res.status(404).json({ error: 'Palette not found' });
    }
    logger.error('Error deleting palette', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete palette' });
  }
};

export const addColorToPalette = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const paletteId = String(req.params.paletteId);
    const { hex, name, role } = req.body;

    if (!hex || !name) {
      return res.status(400).json({ error: 'Hex and name are required' });
    }

    const color = await getBrandKitService().addColorToPalette(
      paletteId,
      user.id,
      {
        hex,
        name,
        role: role || 'custom',
      }
    );

    return res.status(201).json({ color });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Palette not found') {
      return res.status(404).json({ error: 'Palette not found' });
    }
    logger.error('Error adding color to palette', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add color' });
  }
};

export const removeColorFromPalette = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const colorId = String(req.params.colorId);
    await getBrandKitService().removeColorFromPalette(colorId, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Color not found') {
      return res.status(404).json({ error: 'Color not found' });
    }
    logger.error('Error removing color', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to remove color' });
  }
};

// ============================================
// FONTS
// ============================================

export const addFont = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, fontFamily, weights, role, previewText } = req.body;

    if (!name || !fontFamily) {
      return res
        .status(400)
        .json({ error: 'Name and fontFamily are required' });
    }

    const font = await getBrandKitService().addFont({
      userId: user.id,
      name,
      fontFamily,
      weights: weights || [],
      role: role || 'custom',
      previewText,
    });

    return res.status(201).json({ font });
  } catch (error) {
    logger.error('Error adding font', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add font' });
  }
};

export const updateFont = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const font = await getBrandKitService().updateFont(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ font });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Font not found') {
      return res.status(404).json({ error: 'Font not found' });
    }
    logger.error('Error updating font', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update font' });
  }
};

export const deleteFont = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteFont(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Font not found') {
      return res.status(404).json({ error: 'Font not found' });
    }
    logger.error('Error deleting font', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete font' });
  }
};

// ============================================
// BRAND VOICE
// ============================================

export const updateBrandVoice = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { tone, description, keywords, dos, donts } = req.body;

    const brandVoice = await getBrandKitService().updateBrandVoice(
      user.id,
      {
        tone,
        description,
        keywords,
        dos,
        donts,
      }
    );

    return res.status(200).json({ brandVoice });
  } catch (error) {
    logger.error('Error updating brand voice', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update brand voice' });
  }
};

export const resetBrandVoice = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    await getBrandKitService().resetBrandVoice(user.id);
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error resetting brand voice', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to reset brand voice' });
  }
};

// ============================================
// PHOTOS
// ============================================

export const addPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, category, tags, imageData, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const photo = await getBrandKitService().addPhoto({
      userId: user.id,
      name,
      category: category || 'custom',
      tags,
      imageData,
      imageUrl,
    });

    return res.status(201).json({ photo });
  } catch (error) {
    logger.error('Error adding photo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add photo' });
  }
};

export const updatePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const photo = await getBrandKitService().updatePhoto(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ photo });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Photo not found') {
      return res.status(404).json({ error: 'Photo not found' });
    }
    logger.error('Error updating photo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update photo' });
  }
};

export const deletePhoto = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deletePhoto(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Photo not found') {
      return res.status(404).json({ error: 'Photo not found' });
    }
    logger.error('Error deleting photo', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete photo' });
  }
};

// ============================================
// GRAPHICS
// ============================================

export const addGraphic = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, type, imageData, imageUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const graphic = await getBrandKitService().addGraphic({
      userId: user.id,
      name,
      type: type || 'custom',
      imageData,
      imageUrl,
    });

    return res.status(201).json({ graphic });
  } catch (error) {
    logger.error('Error adding graphic', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add graphic' });
  }
};

export const updateGraphic = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const graphic = await getBrandKitService().updateGraphic(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ graphic });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Graphic not found') {
      return res.status(404).json({ error: 'Graphic not found' });
    }
    logger.error('Error updating graphic', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update graphic' });
  }
};

export const deleteGraphic = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteGraphic(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Graphic not found') {
      return res.status(404).json({ error: 'Graphic not found' });
    }
    logger.error('Error deleting graphic', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete graphic' });
  }
};

// ============================================
// ICONS
// ============================================

export const addIcon = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, svg, category } = req.body;

    if (!name || !svg) {
      return res.status(400).json({ error: 'Name and SVG are required' });
    }

    const icon = await getBrandKitService().addIcon({
      userId: user.id,
      name,
      svg,
      category: category || 'custom',
    });

    return res.status(201).json({ icon });
  } catch (error) {
    logger.error('Error adding icon', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add icon' });
  }
};

export const updateIcon = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const icon = await getBrandKitService().updateIcon(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ icon });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Icon not found') {
      return res.status(404).json({ error: 'Icon not found' });
    }
    logger.error('Error updating icon', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update icon' });
  }
};

export const deleteIcon = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteIcon(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Icon not found') {
      return res.status(404).json({ error: 'Icon not found' });
    }
    logger.error('Error deleting icon', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete icon' });
  }
};

// ============================================
// STYLE PRESETS
// ============================================

export const addStyle = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      name,
      previewUrl,
      textPlacement,
      overlayColor,
      overlayOpacity,
      fontPairing,
      colorScheme,
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const style = await getBrandKitService().addStyle({
      userId: user.id,
      name,
      previewUrl,
      textPlacement,
      overlayColor,
      overlayOpacity,
      fontPairing,
      colorScheme,
    });

    return res.status(201).json({ style });
  } catch (error) {
    logger.error('Error adding style', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add style' });
  }
};

export const updateStyle = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    const updates = req.body;

    const style = await getBrandKitService().updateStyle(
      id,
      user.id,
      updates
    );
    return res.status(200).json({ style });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Style not found') {
      return res.status(404).json({ error: 'Style not found' });
    }
    logger.error('Error updating style', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to update style' });
  }
};

export const deleteStyle = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteStyle(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Style not found') {
      return res.status(404).json({ error: 'Style not found' });
    }
    logger.error('Error deleting style', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete style' });
  }
};

// ============================================
// CUSTOM CATEGORIES
// ============================================

export const addCustomCategory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, icon, color, bgColor, borderColor, textColor, hoverColor } =
      req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await getBrandKitService().addCustomCategory({
      userId: user.id,
      name,
      icon,
      color,
      bgColor,
      borderColor,
      textColor,
      hoverColor,
    });

    return res.status(201).json({ category });
  } catch (error) {
    logger.error('Error adding custom category', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to add custom category' });
  }
};

export const deleteCustomCategory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = String(req.params.id);
    await getBrandKitService().deleteCustomCategory(id, user.id);
    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Category not found') {
      return res.status(404).json({ error: 'Category not found' });
    }
    logger.error('Error deleting custom category', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete custom category' });
  }
};
