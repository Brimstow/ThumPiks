import { Router, Request, Response, NextFunction } from 'express';
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

/**
 * Middleware: Set CORS headers for video streaming endpoints.
 * Required so <video crossOrigin="anonymous"> can be drawn to a canvas
 * without tainting it. The global cors() middleware may set credentials
 * mode headers; this ensures the correct headers for anonymous access.
 */
function videoCors(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  // Override Helmet's same-origin CORP so cross-origin <video> can load
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}

// Platform detection and info
router.get('/platforms', (req, res) =>
  videoProxyController.listPlatforms(req, res)
);
router.get('/detect', (req, res) =>
  videoProxyController.detectPlatform(req, res)
);
router.get('/info', (req, res) => videoProxyController.getVideoInfo(req, res));

// Frame Picker: selectable frames from any video URL
// SSE streaming endpoint (real-time progress as frames are extracted)
router.get('/frames/stream', (req, res) =>
  videoProxyController.getVideoFramesStream(req, res)
);
// Non-streaming fallback
router.get('/frames', (req, res) =>
  videoProxyController.getVideoFrames(req, res)
);

// YouTube storyboard frames (fallback for quick preview)
router.get('/storyboard', (req, res) =>
  videoProxyController.getStoryboardFrames(req, res)
);

// Generic video streaming (with explicit CORS for canvas access)
router.options('/stream', videoCors);
router.get('/stream', videoCors, (req, res) => videoProxyController.streamVideo(req, res));

// Platform-specific proxy endpoints (with explicit CORS for canvas access)
router.options('/proxy/youtube', videoCors);
router.get('/proxy/youtube', videoCors, (req, res) =>
  videoProxyController.proxyYouTube(req, res)
);
router.options('/proxy/tiktok', videoCors);
router.get('/proxy/tiktok', videoCors, (req, res) =>
  videoProxyController.proxyTikTok(req, res)
);
router.options('/proxy/instagram', videoCors);
router.get('/proxy/instagram', videoCors, (req, res) =>
  videoProxyController.proxyInstagram(req, res)
);

export default router;
