import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { VisionService } from './vision.service';
import { PrismaClient } from '@prisma/client';
import { getPrisma as getPrismaFactory } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';

let sharedVisionService: VisionService;

export const initializeServices = (prismaClient?: PrismaClient, cacheService?: CacheService) => {
  sharedVisionService = new VisionService({
    prisma: prismaClient || getPrismaFactory(),
    ...(cacheService && { cache: cacheService }),
  });
};

if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

const getVisionService = () => {
  if (!sharedVisionService) {
    initializeServices();
  }
  return sharedVisionService;
};

export const describeImage = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { imageUrl, imageBase64 } = req.body;
    const image = imageUrl || imageBase64;

    if (!image) {
      return res.status(400).json({
        error: 'imageUrl or imageBase64 is required',
      });
    }

    // Basic URL validation for non-base64 inputs
    if (imageUrl && !imageUrl.startsWith('data:') && !imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    const result = await getVisionService().analyzeImage(image, user.id);

    return res.status(201).json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    if (errMsg === 'Insufficient credits for vision analysis') {
      return res.status(402).json({ error: errMsg });
    }
    if (errMsg.includes('API key not configured')) {
      logger.error('Vision describe config error', error instanceof Error ? error : new Error(String(error)));
      return res.status(503).json({ error: 'Vision service not configured' });
    }
    logger.error('Error in vision describe', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: errMsg });
  }
};

export const searchImages = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const query = req.query.q as string;
    const count = parseInt(req.query.count as string) || 20;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    if (count < 1 || count > 50) {
      return res.status(400).json({ error: 'Count must be between 1 and 50' });
    }

    const results = await getVisionService().searchWebImages(query.trim(), count);

    return res.status(200).json({ results });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Error in vision search', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: errMsg });
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const limit = parseInt(req.query.limit as string) || 20;

    const analyses = await getVisionService().getHistory(user.id, limit);

    return res.status(200).json({ analyses });
  } catch (error) {
    logger.error('Error fetching vision history', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
