import { Router, RequestHandler } from 'express';
import * as creditController from './credit.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get(
  '/transactions',
  authenticate,
  creditController.getTransactions as unknown as RequestHandler
);
router.get(
  '/balance',
  authenticate,
  creditController.getBalance as unknown as RequestHandler
);
router.post(
  '/purchase',
  authenticate,
  creditController.purchaseCreditPack as unknown as RequestHandler
);

export default router;
