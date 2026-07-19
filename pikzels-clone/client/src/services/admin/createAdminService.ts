/**
 * Admin Service Proxy Factory
 *
 * Creates a proxy that auto-switches between real API and mock
 * implementations based on the current environment, eliminating
 * repetitive `if (shouldUseMockData())` checks in every method.
 *
 * The proxy evaluates `shouldUseMockData()` at call-time (not
 * creation-time), so it respects dynamic env var changes like
 * VITE_ADMIN_USE_LIVE_API.
 */

import { shouldUseMockData } from './adminApiClient';

/**
 * Creates a service that delegates method calls to either `realImpl`
 * or `mockImpl` depending on the current environment.
 *
 * @example
 * ```ts
 * const realImpl = { async getUsers() { return adminApi.get('/users'); } };
 * const mockImpl = { async getUsers() { return mockGetUsers(); } };
 * export const adminUserService = createAdminService(realImpl, mockImpl);
 * ```
 */
export function createAdminService<T extends Record<string, unknown>>(
  realImpl: T,
  mockImpl: T
): T {
  return new Proxy(realImpl, {
    get(_target, prop, receiver) {
      const impl = shouldUseMockData() ? mockImpl : realImpl;
      const value = Reflect.get(impl, prop, receiver);

      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          return value.apply(impl, args);
        };
      }

      return value;
    },
  }) as T;
}
