import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ABTestingService } from './ab-testing.service';
import { getPrisma } from '../../utils/prisma-factory';

let sharedService: ABTestingService;

export const initializeServices = (prismaClient?: any, cacheService?: any) => {
  sharedService = new ABTestingService({
    prisma: prismaClient || getPrisma(),
    cache: cacheService,
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
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, variants } = req.body;
    if (!name || !variants || !Array.isArray(variants)) {
      return res
        .status(400)
        .json({ error: 'name and variants array are required' });
    }

    const result = await getService().createTest(req.user.id, {
      name,
      description,
      variants,
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (
      error.message?.includes('variants') ||
      error.message?.includes('Maximum')
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/ab-tests
 */
export const getUserTests = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const tests = await getService().getUserTests(req.user.id);
    return res.status(200).json({ tests });
  } catch (error) {
    console.error('Error fetching AB tests:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/ab-tests/:testId
 */
export const getTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().getTest(testId!, req.user.id);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'Test not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error fetching AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/start
 */
export const startTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().startTest(testId!, req.user.id);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('already') || error.message?.includes('Cannot')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error starting AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/pause
 */
export const pauseTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().pauseTest(testId!, req.user.id);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('Only active')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error pausing AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/complete
 */
export const completeTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    const result = await getService().completeTest(
      testId!,
      req.user.id
    );
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('already completed')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error completing AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/ab-tests/:testId/event
 */
export const recordEvent = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

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
      req.user.id,
      action
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('not active')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error recording AB test event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/ab-tests/:testId
 */
export const deleteTest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

    const testId = Array.isArray(req.params.testId) ? req.params.testId[0] : req.params.testId;
    await getService().deleteTest(testId!, req.user.id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message?.includes('Cannot delete')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error deleting AB test:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
