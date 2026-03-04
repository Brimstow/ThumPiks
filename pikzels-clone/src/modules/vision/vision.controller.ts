import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { VisionService } from './vision.service';
import { PrismaClient } from '@prisma/client';
import { getPrisma as getPrismaFactory } from '../../utils/prisma-factory';

let sharedVisionService: VisionService;

export const initializeServices = (prismaClient?: PrismaClient, cacheService?: any) => {
  sharedVisionService = new VisionService({
    prisma: prismaClient || getPrismaFactory(),
    cache: cacheService,
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
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    const result = await getVisionService().analyzeImage(image, req.user.id);

    return res.status(201).json(result);
  } catch (error: any) {
    if (error.message === 'Insufficient credits for vision analysis') {
      return res.status(402).json({ error: error.message });
    }
    if (error.message?.includes('API key not configured')) {
      console.error('Vision describe config error:', error.message);
      return res.status(503).json({ error: 'Vision service not configured' });
    }
    console.error('Error in vision describe:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const searchImages = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
  } catch (error: any) {
    console.error('Error in vision search:', error.message || error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    const analyses = await getVisionService().getHistory(req.user.id, limit);

    return res.status(200).json({ analyses });
  } catch (error) {
    console.error('Error fetching vision history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
