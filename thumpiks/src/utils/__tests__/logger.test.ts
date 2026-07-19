import { runWithRequestContext } from '../request-context';

// Mock the request-context module for logger tests
jest.mock('../request-context', () => {
  const actual = jest.requireActual('../request-context');
  return {
    ...actual,
    getRequestId: actual.getRequestId,
    runWithRequestContext: actual.runWithRequestContext,
  };
});

// Mock winston-daily-rotate-file to avoid file system access.
// Winston validates that transports have a `log` method and are stream-like.
jest.mock('winston-daily-rotate-file', () => {
  const { EventEmitter } = require('events');
  return jest.fn().mockImplementation(() => {
    const transport = new EventEmitter();
    transport.log = jest.fn((_info: any, cb?: () => void) => {
      cb?.();
    });
    transport.close = jest.fn();
    return transport;
  });
});

// Mock @axiomhq/winston to avoid real Axiom API calls in tests
jest.mock('@axiomhq/winston', () => {
  const { EventEmitter } = require('events');
  const MockAxiomTransport = jest.fn().mockImplementation(() => {
    const transport = new EventEmitter();
    transport.log = jest.fn((_info: any, cb?: () => void) => {
      cb?.();
    });
    transport.close = jest.fn();
    transport.flush = jest.fn((cb?: (err: Error | null) => void) => {
      cb?.(null);
    });
    return transport;
  });
  return { WinstonTransport: MockAxiomTransport };
});

import { logger } from '../logger';

describe('Logger requestId enrichment', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it('includes requestId in log output when inside request context', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    runWithRequestContext(
      { requestId: 'ctx-123', startTime: Date.now() },
      () => {
        logger.info('test message');
      }
    );

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('ctx-123');
  });

  it('does not include requestId when outside request context', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    logger.info('test message');

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).not.toContain('requestId');
  });

  it('preserves explicit requestId from caller context over auto-detected', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    runWithRequestContext(
      { requestId: 'auto-id', startTime: Date.now() },
      () => {
        logger.info('test message', { requestId: 'explicit-id' });
      }
    );

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('explicit-id');
    expect(logOutput).not.toContain('auto-id');
  });

  it('includes requestId in warn logs inside request context', () => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    runWithRequestContext(
      { requestId: 'warn-ctx', startTime: Date.now() },
      () => {
        logger.warn('warning message');
      }
    );

    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('warn-ctx');
  });

  it('includes requestId in error logs inside request context', () => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    runWithRequestContext(
      { requestId: 'err-ctx', startTime: Date.now() },
      () => {
        logger.error('error message', new Error('test error'));
      }
    );

    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('err-ctx');
  });

  it('merges requestId with other context fields', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    runWithRequestContext(
      { requestId: 'merge-ctx', startTime: Date.now() },
      () => {
        logger.info('test message', { userId: 'user-456', url: '/api/test' });
      }
    );

    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('merge-ctx');
    expect(logOutput).toContain('user-456');
    expect(logOutput).toContain('/api/test');
  });
});

describe('Logger flushLogger', () => {
  it('exports flushLogger function', () => {
    const { flushLogger } = require('../logger');
    expect(typeof flushLogger).toBe('function');
  });

  it('flushLogger resolves without error when no Axiom transport', async () => {
    const { flushLogger } = require('../logger');
    // Should not throw even without Axiom configured
    await expect(flushLogger()).resolves.toBeUndefined();
  });
});

describe('Structured context fields', () => {
  let consoleSpy: jest.SpyInstance;

  afterEach(() => {
    consoleSpy?.mockRestore();
  });

  it('preserves numeric fields in log output', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('request', { statusCode: 200, duration: 45 });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    // Verify JSON-serialized context contains numbers, not strings
    expect(logOutput).toContain('"statusCode":200');
    expect(logOutput).toContain('"duration":45');
  });

  it('preserves boolean fields in log output', () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    logger.info('cache', { category: 'cache', hit: true, source: 'redis' });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const logOutput = consoleSpy.mock.calls[0]![0] as string;
    expect(logOutput).toContain('"hit":true');
    expect(logOutput).toContain('"category":"cache"');
  });
});
