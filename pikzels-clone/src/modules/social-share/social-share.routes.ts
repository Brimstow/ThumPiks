import { Router } from 'express';
import { SocialShareController } from './social-share.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();
const socialShareController = new SocialShareController();

// All routes in this file require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// Social sharing routes
router.post('/share', (req, res) =>
  socialShareController.shareThumbnail(req as AuthRequest, res)
);
router.get('/', (req, res) =>
  socialShareController.getSocialShares(req as AuthRequest, res)
);
router.get('/stats', (req, res) =>
  socialShareController.getSocialShareStats(req as AuthRequest, res)
);
router.get('/thumbnail/:thumbnailId', (req, res) =>
  socialShareController.getSocialSharesForThumbnail(
    req as unknown as AuthRequest,
    res
  )
);
router.delete('/:id', (req, res) =>
  socialShareController.deleteSocialShare(req as unknown as AuthRequest, res)
);

export default router;
