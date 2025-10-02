import { Router } from 'express';
import { SocialShareController } from './social-share.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const socialShareController = new SocialShareController();

// All routes in this file require authentication
router.use(authenticateToken);

// Social sharing routes
router.post('/share', (req, res) =>
  socialShareController.shareThumbnail(req, res)
);
router.get('/', (req, res) => socialShareController.getSocialShares(req, res));
router.get('/stats', (req, res) =>
  socialShareController.getSocialShareStats(req, res)
);
router.get('/thumbnail/:thumbnailId', (req, res) =>
  socialShareController.getSocialSharesForThumbnail(req, res)
);
router.delete('/:id', (req, res) =>
  socialShareController.deleteSocialShare(req, res)
);

export default router;
