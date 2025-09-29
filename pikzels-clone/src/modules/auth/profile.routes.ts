import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const profileController = new ProfileController();

router.get('/profile', authenticateToken, (req, res) => profileController.getProfile(req, res));
router.put('/profile', authenticateToken, (req, res) => profileController.updateProfile(req, res));

// User settings routes
router.get('/settings', authenticateToken, (req, res) => profileController.getUserSettings(req, res));
router.put('/settings', authenticateToken, (req, res) => profileController.updateUserSettings(req, res));

export default router;