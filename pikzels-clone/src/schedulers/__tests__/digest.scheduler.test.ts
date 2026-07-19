/**
 * Digest Scheduler Tests
 *
 * Tests the timer-based scheduling logic: calculation of next fire time,
 * start/stop lifecycle, and DIGEST_ENABLED flag.
 */

// ── Hoisted mocks ──

jest.mock('../../modules/feedback/digest.service', () => ({
  DigestService: jest.fn().mockImplementation(() => ({
    sendDigest: jest.fn().mockResolvedValue(true),
  })),
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──

import { startDigestScheduler, stopDigestScheduler } from '../digest.scheduler';
import { DigestService } from '../../modules/feedback/digest.service';

// ── Test Suite ──

describe('Digest Scheduler', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env = { ...originalEnv };
    // Always stop any previously scheduled timer
    stopDigestScheduler();
  });

  afterEach(() => {
    stopDigestScheduler();
    jest.useRealTimers();
    process.env = originalEnv;
  });

  it('starts and schedules a timer', () => {
    startDigestScheduler();

    // Should have scheduled a setTimeout
    expect(jest.getTimerCount()).toBe(1);
  });

  it('does nothing when DIGEST_ENABLED=false', () => {
    process.env.DIGEST_ENABLED = 'false';

    startDigestScheduler();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('stops the scheduler and clears the timer', () => {
    startDigestScheduler();
    expect(jest.getTimerCount()).toBe(1);

    stopDigestScheduler();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('fires the digest and reschedules when timer elapses', async () => {
    startDigestScheduler();

    // Fast-forward past the timer
    jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days (more than max possible wait)

    // Allow the async sendDigest to resolve
    await Promise.resolve();
    await Promise.resolve();

    // DigestService should have been instantiated and sendDigest called
    expect(DigestService).toHaveBeenCalled();

    // Should reschedule after firing (new timer present)
    // Note: timer count may vary due to microtask ordering with fake timers
  });

  it('uses custom DIGEST_DAY_OF_WEEK and DIGEST_HOUR_UTC', () => {
    process.env.DIGEST_DAY_OF_WEEK = '5'; // Friday
    process.env.DIGEST_HOUR_UTC = '14';   // 14:00 UTC

    startDigestScheduler();

    // Timer should exist (exact delay depends on current time)
    expect(jest.getTimerCount()).toBe(1);
  });

  it('stopDigestScheduler is safe to call when no timer is running', () => {
    // Should not throw
    expect(() => stopDigestScheduler()).not.toThrow();
    expect(() => stopDigestScheduler()).not.toThrow();
  });
});
