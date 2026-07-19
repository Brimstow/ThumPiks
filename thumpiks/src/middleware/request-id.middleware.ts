import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { requestContextStorage } from '../utils/request-context';

/**
 * Generates or propagates a request ID for every incoming request.
 *
 * - Respects an incoming `X-Request-Id` header (from load balancers/gateways)
 * - Falls back to `crypto.randomUUID()` if none is provided
 * - Sets `req.id` and the `X-Request-Id` response header
 * - Wraps downstream middleware/routes in AsyncLocalStorage so the request ID
 *   is available anywhere via `getRequestId()` without parameter drilling
 *
 * Types use Node's http module directly to avoid @types/express v5 drift
 * (the project has known Express 5 type incompatibilities).
 */
export const requestIdMiddleware = (
  req: IncomingMessage & { id?: string },
  res: ServerResponse,
  next: () => void
): void => {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0
      ? incoming
      : Array.isArray(incoming) &&
          typeof incoming[0] === 'string' &&
          incoming[0].length > 0
        ? incoming[0]
        : randomUUID();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  requestContextStorage.run({ requestId, startTime: Date.now() }, () => {
    next();
  });
};
