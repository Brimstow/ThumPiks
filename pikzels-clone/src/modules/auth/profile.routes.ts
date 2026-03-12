import { Router, Response } from 'express';
import { ProfileController } from './profile.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { validateRequest } from '../../middleware/validation.middleware';

const router = Router();
const profileController = new ProfileController();

router.get(
  '/profile',
  authenticateToken,
  userApiRateLimit,
  (req: any, res: Response) => profileController.getProfile(req, res)
);
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
        custom: (value: string) => {
          const htmlPattern = /<[^>]*>/g;
          if (htmlPattern.test(value)) {
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
  (req: any, res: Response) => profileController.updateProfile(req, res)
);

// User settings routes
router.get(
  '/settings',
  authenticateToken,
  userApiRateLimit,
  (req: any, res: Response) => profileController.getUserSettings(req, res)
);
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
  (req: any, res: Response) => profileController.updateUserSettings(req, res)
);

export default router;
