import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { isProductionLike, isDevelopmentEnv } from './utils/env';

// Load environment variables FIRST
dotenv.config();

// Import security middleware
import {
  securityHeaders,
  generalRateLimit,
  authRateLimit,
  sanitizeInput,
  httpsRedirect,
  securityLogger,
  requestSizeLimit,
  apiVersioning,
} from './middleware/security.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';

// Import services AFTER environment variables are loaded
import { CacheService } from './services/cache.service';
import { OAuthService } from './modules/auth/oauth.service';
import {
  performanceMiddleware,
  responseTimeMiddleware,
} from './middleware/performance.middleware';
import { logger, flushLogger } from './utils/logger';
import { getRequestId } from './utils/request-context';
import { eventRegistry } from './events';
import { getReplicateQueue } from './modules/thumbnail/replicate-queue.service';
import { healthCheckPrisma } from './utils/prisma-factory';

// Import routes
import authRoutes from './modules/auth/auth.routes';
import profileRoutes from './modules/auth/profile.routes';
import thumbnailRoutes from './modules/thumbnail/thumbnail.routes';
import thumbnailPublicRoutes from './modules/thumbnail/thumbnail.public.routes';
import projectRoutes from './modules/project/project.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import socialShareRoutes from './modules/social-share/social-share.routes';
import templateRoutes from './modules/templates/template.routes';
import collaborationRoutes from './modules/collaboration/collaboration.routes';
import performanceRoutes from './routes/performance.routes';
import videoProxyRoutes from './modules/video-proxy/video-proxy.routes';
import subscriptionRoutes from './modules/subscription/subscription.routes';
import creditRoutes from './modules/credit/credit.routes';
import billingRoutes from './modules/billing/billing.routes';
import polarWebhookRoutes from './modules/billing/polar-webhook.routes';
import userSettingsRoutes from './modules/user/user-settings.routes';
import accountRoutes from './modules/account/account.routes';
import visionRoutes from './modules/vision/vision.routes';
import visualSearchRoutes from './modules/visual-search/visual-search.routes';
import abTestingRoutes from './modules/ab-testing/ab-testing.routes';
import userAssetRoutes from './modules/user-asset/user-asset.routes';
import urlHistoryRoutes from './modules/user-url-history/user-url-history.routes';
import editorCommandRoutes from './modules/editor-command/editor-command.routes';
import editorChatRoutes from './modules/editor-chat/editor-chat.routes';
import compositionLayoutRoutes from './modules/composition-layout/composition-layout.routes';
import youtubeTrendingRoutes from './modules/youtube-trending/youtube-trending.routes';
import brandKitRoutes from './modules/brand-kit/brand-kit.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';
import feedbackAdminRoutes from './modules/feedback/feedback.admin.routes';
import globalChatRoutes from './modules/global-chat/global-chat.routes';
import contactRoutes from './modules/contact/contact.routes';
import reviewRoutes from './modules/review/review.routes';
import reviewAdminRoutes from './modules/review/review.admin.routes';

// Import admin routes
import adminAuthRoutes from './modules/admin/admin-auth.routes';
import userManagementRoutes from './modules/admin/user-management.routes';
import analyticsAdminRoutes from './modules/admin/analytics.routes';
import systemMonitoringRoutes from './modules/admin/system-monitoring.routes';
import sitemapRoutes from './modules/admin/sitemap.routes';
import notificationConfigRoutes from './modules/notification-config/notification-config.routes';
import adminNotificationRoutes from './modules/admin-notification/admin-notification.routes';
import userNotificationRoutes from './modules/user-notification/user-notification.routes';
import userSSERoutes, { adminSSERouter } from './modules/notification-sse/notification-sse.routes';
import { startDigestScheduler } from './schedulers/digest.scheduler';

const app = express();
const PORT = Number(process.env.PORT) || 8550;

// Trust proxy for Railway/production-like deployment (production + staging)
if (isProductionLike()) {
  app.set('trust proxy', true);
}

// Initialize cache service
const cache = CacheService.getInstance();

// Security middleware (first priority)
if (process.env.ENABLE_HTTPS_REDIRECT === 'true') {
  app.use(httpsRedirect);
}

if (process.env.ENABLE_SECURITY_HEADERS === 'true') {
  app.use(securityHeaders);
  logger.info('Security headers enabled');
}

// Request ID tracking (must be before any logging middleware)
app.use(requestIdMiddleware);

// Security logging
app.use(securityLogger);

// Request size limiting
app.use(requestSizeLimit);

// API versioning
app.use(apiVersioning);

// Input sanitization
app.use(sanitizeInput);
logger.info('Input sanitization enabled');

// Performance monitoring middleware
if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  app.use(performanceMiddleware());
  app.use(responseTimeMiddleware());
  logger.info('Performance monitoring enabled');
}

// Performance middleware
if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compression());
  logger.info('Compression enabled');
}

// Rate limiting with security-focused configuration
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  // General API rate limiting
  app.use('/api/', generalRateLimit);

  // Strict rate limiting for auth endpoints
  app.use('/api/auth/', authRateLimit);

  logger.info('Enhanced rate limiting enabled');
}

// Enhanced CORS configuration
// Development: Always include localhost for local testing
// Production: Only use CORS_ORIGIN env var (no localhost exposure)
const isDev = isDevelopmentEnv();
const devOrigins = ['http://localhost:8556', 'http://127.0.0.1:8556'];
const prodOrigins = process.env.CORS_ORIGIN?.split(',') || [];

const corsOptions = {
  origin: isDev ? [...devOrigins, ...prodOrigins] : prodOrigins,
  credentials: true, // Always enable credentials for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-Id',
  ],
  exposedHeaders: [
    'X-API-Version',
    'X-Request-Id',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
  ],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
logger.info('CORS enabled', { origins: corsOptions.origin });

// Cookie parser for HttpOnly authentication cookies
app.use(cookieParser());
logger.info('Cookie parser enabled');

// Initialize Passport for OAuth authentication
app.use(passport.initialize());
OAuthService.initializePassport();
logger.info('Passport OAuth initialized');

// Enhanced JSON parsing with security limits
app.use(
  express.json({
    limit: process.env.MAX_FILE_SIZE || '10mb',
    strict: true,
    verify: (req: any, _res, buf) => {
      // Store raw body for webhook verification if needed
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: process.env.MAX_FILE_SIZE || '10mb',
    parameterLimit: 20, // Prevent parameter pollution
  })
);

// Serve static files for processed images
app.use(
  '/processed-images',
  express.static(path.join(__dirname, '../processed-images'))
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', profileRoutes);
app.use('/api/user', userSettingsRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
app.use('/api/thumbnails', thumbnailPublicRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social-share', socialShareRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/composition-layouts', compositionLayoutRoutes);
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/video', videoProxyRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/polar', polarWebhookRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/vision', visionRoutes);
app.use('/api/editor-command', editorCommandRoutes);
app.use('/api/editor-chat', editorChatRoutes);
app.use('/api/global-chat', globalChatRoutes);
app.use('/api/visual-search', visualSearchRoutes);
app.use('/api/ab-tests', abTestingRoutes);
app.use('/api/user-assets', userAssetRoutes);
app.use('/api/url-history', urlHistoryRoutes);
app.use('/api/youtube-trending', youtubeTrendingRoutes);
app.use('/api/brand-kit', brandKitRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', userNotificationRoutes);
app.use('/api/notifications', userSSERoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', userManagementRoutes);
app.use('/api/admin/analytics', analyticsAdminRoutes);
app.use('/api/admin/system', systemMonitoringRoutes);
app.use('/api/admin/sitemap', sitemapRoutes);
app.use('/api/admin/support', feedbackAdminRoutes);
app.use('/api/admin/notifications', notificationConfigRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/notifications', adminSSERouter);
app.use('/api/admin/reviews', reviewAdminRoutes);

// Health check endpoint - MUST be before error handler for Railway healthchecks
app.get('/health', async (_req, res) => {
  try {
    const [cacheStatus, dbStatus] = await Promise.all([
      cache.healthCheck(),
      healthCheckPrisma(),
    ]);
    const eventStats = eventRegistry.getStats();

    // Check Replicate queue status
    const replicateQueue = getReplicateQueue();
    let queueStats = null;
    if (replicateQueue.isReady()) {
      queueStats = await replicateQueue.getStats();
    }

    const statusCode = dbStatus ? 200 : 503;

    res.status(statusCode).json({
      status: dbStatus ? 'OK' : 'DEGRADED',
      message: dbStatus
        ? 'Thumbnail Maker API is running'
        : 'Thumbnail Maker API is degraded - database unreachable',
      services: {
        cache: cacheStatus ? 'healthy' : 'unhealthy',
        database: dbStatus ? 'healthy' : 'unhealthy',
        events: eventStats.totalHandlers > 0 ? 'healthy' : 'unhealthy',
        replicateQueue: replicateQueue.isReady()
          ? 'healthy'
          : 'not initialized',
      },
      events: {
        totalHandlers: eventStats.totalHandlers,
        eventTypes: eventStats.eventTypes,
        registeredEvents: eventStats.handlers,
        emitterStats: eventStats.emitterStats,
      },
      ...(queueStats && {
        replicateQueue: {
          waiting: queueStats.waiting,
          active: queueStats.active,
          completed: queueStats.completed,
          failed: queueStats.failed,
        },
      }),
      performance: {
        compression: process.env.ENABLE_COMPRESSION === 'true',
        caching: process.env.ENABLE_CACHE === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
        monitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Production-like API-only mode (frontend deployed separately)
if (isProductionLike()) {
  app.get('/', (_req, res) => {
    res.json({
      message: 'Thumbnail Maker API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      health: '/health',
      api: '/api',
    });
  });
} else {
  // Development mode - provide API info and redirect to frontend
  app.get('/admin', (_req, res) => {
    res.json({
      message: 'Admin panel is running in development mode',
      frontend: 'http://localhost:8556/admin',
      backend: `http://localhost:${PORT}/api`,
      note: 'Please access the admin panel through the frontend URL above',
    });
  });

  app.get('/', (_req, res) => {
    res.json({
      message: 'Thumbnail Maker API is running',
      environment: 'development',
      frontend: 'http://localhost:8556',
      backend: `http://localhost:${PORT}/api`,
      documentation: `http://localhost:${PORT}/health`,
    });
  });
}

// Global error handler - MUST be after all routes
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    const requestId = getRequestId();

    logger.error('Unhandled API error', err, {
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
    });

    // Don't leak error details in production/staging
    const isDevelopment = isDevelopmentEnv();

    res.status(500).json({
      error: 'Internal server error',
      requestId,
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }
);

// Initialize event system before starting server
async function initializeServer() {
  try {
    // Initialize event handlers
    await eventRegistry.initialize();
    logger.info('Event system initialized');

    // Initialize Replicate queue if Redis is available
    if (process.env.ENABLE_REPLICATE_QUEUE !== 'false') {
      try {
        const replicateQueue = getReplicateQueue();
        await replicateQueue.initialize();
        logger.info('Replicate job queue initialized');
      } catch (queueError) {
        logger.warn('Replicate queue not initialized (Redis may be unavailable)', {
          error: queueError instanceof Error ? queueError.message : String(queueError),
          fallback: 'Replicate requests will be processed directly without queuing',
        });
      }
    }

    // Start server - bind to 0.0.0.0 for Railway
    const server = app.listen(PORT, '0.0.0.0', (error?: Error) => {
      if (error) {
        logger.error('Server failed to start', error);
        process.exit(1);
      }
      logger.info('Server started', { port: PORT, health: `http://localhost:${PORT}/health` });

      if (process.env.ENABLE_CACHE === 'true') {
        logger.info('Redis caching enabled');
      }

      const eventStats = eventRegistry.getStats();
      logger.info('Event system ready', {
        handlers: eventStats.totalHandlers,
        eventTypes: eventStats.eventTypes,
      });

      // Start digest scheduler
      startDigestScheduler();
    });

    return server;
  } catch (error) {
    logger.error(
      'Failed to initialize server',
      error instanceof Error ? error : new Error(String(error))
    );
    process.exit(1);
  }
}

// Export the app for testing (without starting server)
export default app;

// Only start server if this file is run directly (not imported by tests)
if (require.main === module) {
  // Initialize and start server
  const serverPromise = initializeServer();

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    const server = await serverPromise;
    server.close(() => {
      logger.info('Process terminated');
    });

    // Shutdown Replicate queue
    const replicateQueue = getReplicateQueue();
    if (replicateQueue.isReady()) {
      await replicateQueue.shutdown();
    }

    // Shutdown SSE connections
    const { SSEService } = await import('./services/sse.service');
    SSEService.getInstance().shutdown();

    await flushLogger();
    await cache.disconnect();
  });

  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    const server = await serverPromise;
    server.close(() => {
      logger.info('Process terminated');
    });

    // Shutdown Replicate queue
    const replicateQueue = getReplicateQueue();
    if (replicateQueue.isReady()) {
      await replicateQueue.shutdown();
    }

    await flushLogger();
    await cache.disconnect();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error(
      'Unhandled Promise Rejection',
      reason instanceof Error ? reason : new Error(String(reason)),
      {
        promise: promise.toString(),
      }
    );
    // For development, we don't exit the process
    if (isProductionLike()) {
      process.exit(1);
    }
  });
}
