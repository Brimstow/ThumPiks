import { Router, Response, RequestHandler } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { validateRequest } from '../../middleware/validation.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();
const profileController = new ProfileController();

router.get('/profile', authenticateToken, userApiRateLimit, ((
  req: AuthRequest,
  res: Response
) => profileController.getProfile(req, res)) as unknown as RequestHandler);
router.put(
  '/profile',
  authenticateToken,
  userApiRateLimit,
  validateRequest({
    body: [
      {
        field: 'name',
        required: false,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        sanitize: true,
        custom: (value: unknown) => {
          const htmlPattern = /<[^>]*>/g;
          if (typeof value === 'string' && htmlPattern.test(value)) {
            return 'Name cannot contain HTML tags or scripts';
          }
          return true;
        },
      },
      {
        field: 'email',
        required: false,
        type: 'email',
        sanitize: true,
      },
    ],
  }),
  ((req: AuthRequest, res: Response) =>
    profileController.updateProfile(req, res)) as unknown as RequestHandler
);

// User settings routes
router.get('/settings', authenticateToken, userApiRateLimit, ((
  req: AuthRequest,
  res: Response
) => profileController.getUserSettings(req, res)) as unknown as RequestHandler);
router.put(
  '/settings',
  authenticateToken,
  userApiRateLimit,
  validateRequest({
    body: [
      {
        field: 'settings',
        required: true,
        type: 'object',
      },
    ],
  }),
  ((req: AuthRequest, res: Response) =>
    profileController.updateUserSettings(req, res)) as unknown as RequestHandler
);

export default router;
