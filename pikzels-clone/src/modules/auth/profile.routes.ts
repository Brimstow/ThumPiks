import { Router, Response } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const profileController = new ProfileController();

router.get('/profile', authenticateToken, (req: any, res: Response) =>
  profileController.getProfile(req, res)
);
router.put('/profile', authenticateToken, (req: any, res: Response) =>
  profileController.updateProfile(req, res)
);

// User settings routes
router.get('/settings', authenticateToken, (req: any, res: Response) =>
  profileController.getUserSettings(req, res)
);
router.put('/settings', authenticateToken, (req: any, res: Response) =>
  profileController.updateUserSettings(req, res)
);

export default router;