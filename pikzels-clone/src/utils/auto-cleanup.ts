/**
 * Auto-Cleanup Jest Hook
 *
 * WHAT: Automatic singleton cleanup without manual setup.ts updates
 * WHY: Reduces manual cleanup burden and prevents forgotten cleanup
 * HOW: Scans global registry and calls cleanup() automatically
 *
 * Alignment:
 * - Worker Cleanup Policy: Configurable, testable, clear separation
 * - Always/Ask/Never: Always auto-cleanup, never skip
 * - Safety: Graceful error handling, doesn't break tests on cleanup failure
 */

import { getService, cleanupAllServices } from './service-factory';
import { disconnectPrisma } from './prisma-factory';

// Global registry to track services needing cleanup
interface CleanupableService {
  cleanup?: () => void | Promise<void>;
  disconnect?: () => void | Promise<void>;
  stop?: () => void | Promise<void>;
}

class ServiceCleanupRegistry {
  private services = new Set<CleanupableService>();

  /**
   * Register a service for automatic cleanup
   */
  register(service: CleanupableService): void {
    this.services.add(service);
  }

  /**
   * Unregister a service (useful for manual cleanup)
   */
  unregister(service: CleanupableService): void {
    this.services.delete(service);
  }

  /**
   * Cleanup all registered services
   */
  async cleanupAll(): Promise<void> {
    const errors: Error[] = [];

    for (const service of this.services) {
      try {
        // Try cleanup() first (synchronous timers)
        if (service.cleanup) {
          await service.cleanup();
        }

        // Then disconnect() (async connections)
        if (service.disconnect) {
          await service.disconnect();
        }

        // Or stop() (alternative naming)
        if (service.stop) {
          await service.stop();
        }
      } catch (error) {
        errors.push(error as Error);
        console.error('⚠️  Cleanup error for service:', error);
      }
    }

    // Clear registry after cleanup
    this.services.clear();

    // Report errors but don't fail tests
    if (errors.length > 0) {
      console.warn(
        `⚠️  ${errors.length} service cleanup errors occurred (non-fatal)`
      );
    }
  }

  /**
   * Get count of registered services
   */
  getCount(): number {
    return this.services.size;
  }
}

// Singleton registry instance
export const cleanupRegistry = new ServiceCleanupRegistry();

/**
 * Auto-register service on first access
 * Wraps getService() to automatically track services
 */
export function getServiceWithAutoCleanup<T extends 'cache'>(
  type: T
): ReturnType<typeof getService> {
  const service = getService(type);
  cleanupRegistry.register(service as CleanupableService);
  return service;
}

/**
 * Jest global teardown hook
 * Add this to jest.config.js: globalTeardown
 */
export async function jestGlobalTeardown(): Promise<void> {
  console.log('🧹 Auto-cleanup: Starting global teardown...');

  try {
    // Cleanup via factory (handles known services)
    await cleanupAllServices();

    // Cleanup via registry (handles dynamically registered services)
    await cleanupRegistry.cleanupAll();

    // Cleanup Prisma connection
    await disconnectPrisma();

    console.log('✅ Auto-cleanup: All services cleaned up');
  } catch (error) {
    console.error('❌ Auto-cleanup: Global teardown error:', error);
    // Don't throw - allow tests to complete
  }
}

/**
 * Usage in tests:
 *
 * // OLD WAY (manual):
 * afterEach(() => {
 *   const cache = CacheService.getInstance();
 *   cache.cleanup();
 * });
 *
 * // NEW WAY (automatic):
 * import { getServiceWithAutoCleanup } from '../utils/auto-cleanup';
 * const cache = getServiceWithAutoCleanup('cache');
 * // cleanup() called automatically after test suite!
 */
