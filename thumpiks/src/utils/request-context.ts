import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  readonly requestId: string;
  readonly startTime: number;
}

/**
 * Singleton AsyncLocalStorage instance for request-scoped context propagation.
 * Context is set by the requestIdMiddleware and is available throughout
 * the entire async call chain of a request without parameter drilling.
 */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Returns the current request context, or undefined if called outside a request scope. */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/** Shorthand to get the current request ID, or undefined if outside request scope. */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

/** Run a function within an artificial request context. Useful for tests and queue workers. */
export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  return requestContextStorage.run(context, fn);
}
