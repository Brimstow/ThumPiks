/**
 * Prisma Singleton Factory
 *
 * WHAT: Centralized Prisma client management with automatic cleanup
 * WHY: Prevents connection pool leaks in tests and reduces worker failures
 * HOW: Use getPrisma() instead of direct "new PrismaClient()"
 *
 * Problem Solved:
 * - 16+ services had global `const prisma = new PrismaClient()` without cleanup
 * - Tests created multiple connection pools (never disconnected)
 * - Jest workers couldn't exit gracefully
 *
 * Solution:
 * - Single Prisma instance shared across entire application
 * - Automatic cleanup via auto-cleanup registry
 * - Type-safe with PrismaClient type
 *
 * Alignment:
 * - Modular Design: Clear interface via factory function
 * - Safety: Backwards compatible, no breaking changes
 * - Best Practice: Industry standard singleton pattern for DB connections
 */

import { PrismaClient } from '@prisma/client';

// Singleton storage
let prismaInstance: PrismaClient | null = null;

/**
 * Get Prisma client instance (singleton)
 *
 * Creates a single instance on first call, returns cached instance on subsequent calls.
 * Automatically disconnects on process exit and test cleanup.
 *
 * @example
 * const prisma = getPrisma();
 * const users = await prisma.user.findMany();
 *
 * @returns PrismaClient instance
 */
export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

    // Auto-disconnect on process exit (graceful shutdown)
    process.on('beforeExit', async () => {
      await disconnectPrisma();
    });
  }

  return prismaInstance;
}

/**
 * Disconnect Prisma client (for cleanup)
 *
 * Called automatically by:
 * - Process exit (graceful shutdown)
 * - Jest global teardown (auto-cleanup.ts)
 *
 * Safe to call multiple times.
 */
export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}

/**
 * Reset Prisma singleton (for testing only)
 *
 * Forces new instance creation on next getPrisma() call.
 * Useful for test isolation when you need fresh state.
 *
 * @example
 * afterEach(async () => {
 *   await resetPrisma();
 * });
 */
export async function resetPrisma(): Promise<void> {
  await disconnectPrisma();
}

/**
 * Health check for Prisma connection
 *
 * Verifies database is reachable.
 * Useful for monitoring and debugging.
 *
 * @returns true if connected, false otherwise
 */
export async function healthCheckPrisma(): Promise<boolean> {
  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Prisma health check failed:', error);
    return false;
  }
}

// Export type for convenience
export type { PrismaClient };
