import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
// import rateLimit from 'express-rate-limit'; // TODO: Implement rate limiting

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

// Import services AFTER environment variables are loaded
import { CacheService } from './services/cache.service';
import {
  performanceMiddleware,
  responseTimeMiddleware,
} from './middleware/performance.middleware';
import { logger } from './utils/logger';
import { eventRegistry } from './events';

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
import userSettingsRoutes from './modules/user/user-settings.routes';

// Import admin routes
import adminAuthRoutes from './modules/admin/admin-auth.routes';
import userManagementRoutes from './modules/admin/user-management.routes';
import analyticsAdminRoutes from './modules/admin/analytics.routes';
import systemMonitoringRoutes from './modules/admin/system-monitoring.routes';
import sitemapRoutes from './modules/admin/sitemap.routes';

const app = express();
const PORT = Number(process.env.PORT) || 8550;

// Trust proxy for Railway/production deployment
if (process.env.NODE_ENV === 'production') {
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
  console.log('🛡️  Security headers enabled');
}

// Security logging
app.use(securityLogger);

// Request size limiting
app.use(requestSizeLimit);

// API versioning
app.use(apiVersioning);

// Input sanitization
app.use(sanitizeInput);
console.log('🧹 Input sanitization enabled');

// Performance monitoring middleware
if (process.env.ENABLE_PERFORMANCE_MONITORING === 'true') {
  app.use(performanceMiddleware());
  app.use(responseTimeMiddleware());
  console.log('📊 Performance monitoring enabled');
}

// Performance middleware
if (process.env.ENABLE_COMPRESSION === 'true') {
  app.use(compression());
  console.log('🗜️  Compression enabled');
}

// Rate limiting with security-focused configuration
if (process.env.ENABLE_RATE_LIMITING === 'true') {
  // General API rate limiting
  app.use('/api/', generalRateLimit);

  // Strict rate limiting for auth endpoints
  app.use('/api/auth/', authRateLimit);

  console.log('🛡️  Enhanced rate limiting enabled');
}

// Enhanced CORS configuration
// Development: Always include localhost for local testing
// Production: Only use CORS_ORIGIN env var (no localhost exposure)
const isDev = process.env.NODE_ENV !== 'production';
const devOrigins = ['http://localhost:8556', 'http://127.0.0.1:8556'];
const prodOrigins = process.env.CORS_ORIGIN?.split(',') || [];

const corsOptions = {
  origin: isDev ? [...devOrigins, ...prodOrigins] : prodOrigins,
  credentials: true, // Always enable credentials for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-API-Version'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
console.log('🌐 Enhanced CORS enabled with origins:', corsOptions.origin);

// Cookie parser for HttpOnly authentication cookies
app.use(cookieParser());
console.log('🍪 Cookie parser enabled');

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
app.use('/api/collaboration', collaborationRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/video', videoProxyRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/billing', billingRoutes);

// Admin routes
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/users', userManagementRoutes);
app.use('/api/admin/analytics', analyticsAdminRoutes);
app.use('/api/admin/system', systemMonitoringRoutes);
app.use('/api/admin/sitemap', sitemapRoutes);

// Production API-only mode (frontend deployed separately)
if (process.env.NODE_ENV === 'production') {
  app.get('/', (_req, res) => {
    res.json({
      message: 'Thumbnail Maker API',
      version: '1.0.0',
      environment: 'production',
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
    logger.error('Unhandled API error', err, {
      url: req.url,
      method: req.method,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
    });

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';

    res.status(500).json({
      error: 'Internal server error',
      ...(isDevelopment && { details: err.message, stack: err.stack }),
    });
  }
);

// Health check endpoint
app.get('/health', async (_req, res) => {
  const cacheStatus = await cache.healthCheck();
  const eventStats = eventRegistry.getStats();

  res.status(200).json({
    status: 'OK',
    message: 'Thumbnail Maker API is running',
    services: {
      cache: cacheStatus ? 'healthy' : 'unhealthy',
      database: 'healthy', // Will add Prisma health check later
      events: eventStats.totalHandlers > 0 ? 'healthy' : 'unhealthy',
    },
    events: {
      totalHandlers: eventStats.totalHandlers,
      eventTypes: eventStats.eventTypes,
      registeredEvents: eventStats.handlers,
      emitterStats: eventStats.emitterStats,
    },
    performance: {
      compression: process.env.ENABLE_COMPRESSION === 'true',
      caching: process.env.ENABLE_CACHE === 'true',
      rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
      monitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    },
    timestamp: new Date().toISOString(),
  });
});

// Initialize event system before starting server
async function initializeServer() {
  try {
    // Initialize event handlers
    await eventRegistry.initialize();
    console.log('📡 Event system initialized');

    // Start server - bind to 0.0.0.0 for Railway
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`🎯 Health check: http://localhost:${PORT}/health`);

      // Log performance features
      if (process.env.ENABLE_CACHE === 'true') {
        console.log('⚡ Redis caching enabled');
      }

      // Log event system stats
      const eventStats = eventRegistry.getStats();
      console.log(
        `📊 Event system: ${eventStats.totalHandlers} handlers for ${eventStats.eventTypes} event types`
      );
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
    console.log('📝 Received SIGTERM, shutting down gracefully');
    const server = await serverPromise;
    server.close(() => {
      console.log('👋 Process terminated');
    });
    await cache.disconnect();
  });

  process.on('SIGINT', async () => {
    console.log('📝 Received SIGINT, shutting down gracefully');
    const server = await serverPromise;
    server.close(() => {
      console.log('👋 Process terminated');
    });
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
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}
