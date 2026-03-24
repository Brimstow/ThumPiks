/**
 * Service Factory Pattern
 *
 * WHAT: Centralized service creation with automatic lifecycle management
 * WHY: Reduces singleton complexity by hiding getInstance() calls
 * HOW: Import getService() instead of direct singleton access
 *
 * Alignment:
 * - Modular Design: Clear interface contract via factory functions
 * - Always/Ask/Never: Always use factory, never direct getInstance()
 * - Safety: Backwards compatible, no breaking changes
 */

import { CacheService } from '../services/cache.service';
import { EmailService } from '../services/email.service';
import { NotificationRouter } from '../services/notification-router.service';

// Type-safe service registry
type ServiceType = 'cache' | 'email' | 'notificationRouter';

interface ServiceRegistry {
  cache: CacheService;
  email: EmailService;
  notificationRouter: NotificationRouter;
}

/**
 * Get service instance via factory pattern
 *
 * @example
 * const cache = getService('cache');
 * await cache.set('key', value);
 */
export function getService<T extends ServiceType>(type: T): ServiceRegistry[T] {
  switch (type) {
    case 'cache':
      return CacheService.getInstance() as ServiceRegistry[T];
    case 'email':
      return EmailService.getInstance() as ServiceRegistry[T];
    case 'notificationRouter':
      return NotificationRouter.getInstance() as ServiceRegistry[T];
    default:
      throw new Error(`Unknown service type: ${type}`);
  }
}

/**
 * Cleanup all managed services
 * Called automatically by Jest global teardown
 */
export async function cleanupAllServices(): Promise<void> {
  const cache = CacheService.getInstance();
  cache.cleanup();
  await cache.disconnect();

  const email = EmailService.getInstance();
  await email.disconnect();
}

/**
 * Health check for all services
 * Useful for debugging and monitoring
 */
export async function healthCheckServices(): Promise<
  Record<ServiceType, boolean>
> {
  const cache = CacheService.getInstance();
  const email = EmailService.getInstance();
  const router = NotificationRouter.getInstance();

  const [cacheHealth, emailHealth, routerHealth] = await Promise.all([
    cache.healthCheck(),
    email.healthCheck(),
    router.healthCheck().then((h) => h.adminPanel && h.email),
  ]);

  return {
    cache: cacheHealth,
    email: emailHealth,
    notificationRouter: routerHealth,
  };
}

// ============================================
// MIGRATION GUIDE
// ============================================

/**
 * OLD PATTERN (Still works, but discouraged):
 *
 * import { CacheService } from '../services/cache.service';
 * const cache = CacheService.getInstance();
 * await cache.set('key', value);
 *
 * ISSUES:
 * - Direct singleton coupling
 * - Manual lifecycle management
 * - Harder to test
 *
 * NEW PATTERN (Recommended):
 *
 * import { getService } from '../utils/service-factory';
 * const cache = getService('cache');
 * await cache.set('key', value);
 *
 * BENEFITS:
 * - Centralized service access
 * - Automatic cleanup coordination
 * - Type-safe service resolution
 * - Easier to extend (add new services to registry)
 *
 * MIGRATION STEPS:
 * 1. Replace CacheService.getInstance() with getService('cache')
 * 2. Update imports to use service-factory
 * 3. Remove manual cleanup calls (handled by factory)
 * 4. Run tests to verify no regressions
 */
