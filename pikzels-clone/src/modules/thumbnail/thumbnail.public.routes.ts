import { Router } from 'express';
import { accessSharedThumbnail } from './thumbnail.controller';

const router = Router();

// Public route for accessing shared thumbnails (no authentication required)
router.get('/share/:token', accessSharedThumbnail);

export default router;
