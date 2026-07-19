import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { ABTestingService } from './ab-testing.service';
import { CacheService } from '../../services/cache.service';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import type { PrismaClient } from '@prisma/client';

let sharedService: ABTestingService;

export const initializeServices = (prismaClient?: PrismaClient, cacheService?: CacheService) => {
  sharedService = new ABTestingService({
    prisma: prismaClient || getPrisma(),
    ...(cacheService !== undefined && { cache: cacheService }),
  });
};

if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

const getService = () => {
  if (!sharedService) {
    initializeServices();
  }
  return sharedService;
};

/**
 * POST /api/ab-tests
 */
export const createTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, description, variants } = req.body;
    if (!name || !variants || !Array.isArray(variants)) {
      return res
        .status(400)
        .json({ error: 'name and variants array are required' });
    }

    const result = await getService().createTest(user.id, {
      name,
      description,
      variants,
    });

    return res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('variants') ||
      message.includes('Maximum')
    ) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error creating AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/ab-tests
 */
export const getUserTests = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const tests = await getService().getUserTests(user.id);
    return res.status(200).json({ tests });
  } catch (error: unknown) {
    logger.error('Error fetching AB tests', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/ab-tests/:testId
 */
export const getTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().getTest(testId!, user.id);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === 'Test not found') {
      return res.status(404).json({ error: message });
    }
    logger.error('Error fetching AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/start
 */
export const startTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().startTest(testId!, user.id);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('already') || message.includes('Cannot')) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error starting AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/pause
 */
export const pauseTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().pauseTest(testId!, user.id);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('Only active')) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error pausing AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/complete
 */
export const completeTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().completeTest(
      testId!,
      user.id
    );
    return res.status(200).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('already completed')) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error completing AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/event
 */
export const recordEvent = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { variantId, action } = req.body;
    if (!variantId || !action) {
      return res
        .status(400)
        .json({ error: 'variantId and action are required' });
    }

    if (!['impression', 'click'].includes(action)) {
      return res
        .status(400)
        .json({ error: 'action must be impression or click' });
    }

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    await getService().recordEvent(
      testId!,
      variantId,
      user.id,
      action
    );

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found') || message.includes('not active')) {
      return res.status(404).json({ error: message });
    }
    logger.error('Error recording AB test event', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/ab-tests/:testId
 */
export const deleteTest = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    await getService().deleteTest(testId!, user.id);
    return res.status(204).send();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return res.status(404).json({ error: message });
    }
    if (message.includes('Cannot delete')) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error deleting AB test', error instanceof Error ? error : new Error(message));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
