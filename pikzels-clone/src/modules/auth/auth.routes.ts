import { Router } from 'express';
import { register, login, requestPasswordReset, resetPassword } from './auth.controller';
import { validateRequest, commonValidations } from '../../middleware/validation.middleware';

const router = Router();


router.post(
  '/register',
  validateRequest({
    body: [commonValidations.email, commonValidations.password, commonValidations.name]
  }),
  register
);

router.post(
  '/login',
  validateRequest({
    body: [commonValidations.email, commonValidations.password]
  }),
  login
);

router.post(
  '/request-password-reset',
  validateRequest({
    body: [commonValidations.email]
  }),
  requestPasswordReset
);

router.post(
  '/reset-password',
  validateRequest({
    body: [
      { field: 'token', required: true, type: 'string', minLength: 1 },
      { field: 'newPassword', required: true, type: 'string', minLength: 6 }
    ]
  }),
  resetPassword
);

export default router;
