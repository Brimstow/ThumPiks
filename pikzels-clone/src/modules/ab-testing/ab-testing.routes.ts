import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  createTest,
  getUserTests,
  getTest,
  startTest,
  pauseTest,
  completeTest,
  recordEvent,
  deleteTest,
} from './ab-testing.controller';

const router = Router();

// All AB testing routes require authentication
router.use(authenticateToken);

// CRUD
router.post('/', (req, res) => createTest(req as unknown as AuthRequest, res));
router.get('/', (req, res) => getUserTests(req as unknown as AuthRequest, res));
router.get('/:testId', (req, res) => getTest(req as unknown as AuthRequest, res));
router.delete('/:testId', (req, res) => deleteTest(req as unknown as AuthRequest, res));

// Lifecycle
router.post('/:testId/start', (req, res) =>
  startTest(req as unknown as AuthRequest, res)
);
router.post('/:testId/pause', (req, res) =>
  pauseTest(req as unknown as AuthRequest, res)
);
router.post('/:testId/complete', (req, res) =>
  completeTest(req as unknown as AuthRequest, res)
);

// Events
router.post('/:testId/event', (req, res) =>
  recordEvent(req as unknown as AuthRequest, res)
);

export default router;
