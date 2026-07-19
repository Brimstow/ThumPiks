import { Router, RequestHandler } from 'express';
import * as userSettingsController from './user-settings.controller';
import { requestDataExport } from './data-export.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get(
  '/settings',
  authenticate,
  userSettingsController.getSettings as unknown as RequestHandler
);
router.put(
  '/settings/email',
  authenticate,
  userSettingsController.updateEmailPreferences as unknown as RequestHandler
);
router.get(
  '/storage',
  authenticate,
  userSettingsController.getStorage as unknown as RequestHandler
);
router.put(
  '/settings/auto-save',
  authenticate,
  userSettingsController.updateAutoSave as unknown as RequestHandler
);
router.put(
  '/settings/auto-import',
  authenticate,
  userSettingsController.updateAutoImport as unknown as RequestHandler
);
router.put(
  '/password',
  authenticate,
  userSettingsController.changePassword as unknown as RequestHandler
);
router.delete(
  '/account',
  authenticate,
  userSettingsController.deleteAccount as unknown as RequestHandler
);
router.post(
  '/export',
  authenticate,
  requestDataExport as unknown as RequestHandler
);

export default router;
