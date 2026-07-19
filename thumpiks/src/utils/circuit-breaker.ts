import CircuitBreaker from 'opossum';
import { logger } from './logger';

interface BreakerOptions {
  timeout?: number;
  errorThresholdPercentage?: number;
  resetTimeout?: number;
  volumeThreshold?: number;
}

const DEFAULT_OPTIONS: BreakerOptions = {
  timeout: 15000, // 15s per call
  errorThresholdPercentage: 50, // Open after 50% failures
  resetTimeout: 30000, // Try again after 30s
  volumeThreshold: 5, // Minimum calls before tripping
};

const breakers = new Map<string, CircuitBreaker>();

/**
 * Create (or retrieve) a named circuit breaker for an external service call.
 *
 * Usage:
 *   const breaker = createBreaker('replicate', replicateService.segment);
 *   const result = await breaker.fire(image, options);
 *
 * When the circuit opens, fire() rejects immediately with a meaningful error
 * instead of waiting for the external service to time out.
 */
export function createBreaker<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
  options: BreakerOptions = {}
): CircuitBreaker<TArgs, TResult> {
  const existing = breakers.get(name);
  if (existing) return existing as CircuitBreaker<TArgs, TResult>;

  const opts = { ...DEFAULT_OPTIONS, ...options };

  const breaker = new CircuitBreaker(fn, {
    timeout: opts.timeout,
    errorThresholdPercentage: opts.errorThresholdPercentage,
    resetTimeout: opts.resetTimeout,
    volumeThreshold: opts.volumeThreshold,
    name,
  });

  // Fallback returns a descriptive error so callers can handle gracefully
  breaker.fallback((..._args: TArgs) => {
    throw new Error(
      `Service "${name}" is temporarily unavailable (circuit open)`
    );
  });

  breaker.on('open', () => {
    logger.warn(
      `Circuit breaker OPEN for "${name}" — requests will fail fast`,
      {
        service: name,
      }
    );
  });

  breaker.on('halfOpen', () => {
    logger.info(`Circuit breaker HALF-OPEN for "${name}" — testing recovery`, {
      service: name,
    });
  });

  breaker.on('close', () => {
    logger.info(`Circuit breaker CLOSED for "${name}" — service recovered`, {
      service: name,
    });
  });

  breakers.set(name, breaker as unknown as CircuitBreaker);
  return breaker;
}

/**
 * Get stats for all registered circuit breakers.
 * Useful for health check endpoints.
 */
export function getCircuitBreakerStats(): Record<
  string,
  { state: string; stats: object }
> {
  const result: Record<string, { state: string; stats: object }> = {};
  for (const [name, breaker] of breakers) {
    result[name] = {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'halfOpen' : 'closed',
      stats: breaker.stats,
    };
  }
  return result;
}

/**
 * Shutdown all circuit breakers gracefully.
 */
export function shutdownBreakers(): void {
  for (const [name, breaker] of breakers) {
    breaker.shutdown();
    logger.info(`Circuit breaker "${name}" shut down`);
  }
  breakers.clear();
}
