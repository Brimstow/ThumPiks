import { Router } from 'express';
import { videoProxyController } from './video-proxy.controller';

const router = Router();

/**
 * Video Proxy Routes
 *
 * Base path: /api/video
 *
 * These endpoints provide proxy functionality for downloading and streaming
 * videos from various social media platforms, bypassing CORS restrictions
 * for browser-based video processing.
 */

// Platform detection and info
router.get('/platforms', (req, res) =>
  videoProxyController.listPlatforms(req, res)
);
router.get('/detect', (req, res) =>
  videoProxyController.detectPlatform(req, res)
);
router.get('/info', (req, res) => videoProxyController.getVideoInfo(req, res));

// Generic video streaming
router.get('/stream', (req, res) => videoProxyController.streamVideo(req, res));

// Platform-specific proxy endpoints
router.get('/proxy/youtube', (req, res) =>
  videoProxyController.proxyYouTube(req, res)
);
router.get('/proxy/tiktok', (req, res) =>
  videoProxyController.proxyTikTok(req, res)
);
router.get('/proxy/instagram', (req, res) =>
  videoProxyController.proxyInstagram(req, res)
);

export default router;
