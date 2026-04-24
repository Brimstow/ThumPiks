/**
 * Digest Scheduler
 *
 * WHAT: Lightweight timer that fires the weekly digest on a configurable schedule.
 * WHY: DigestService exists but nothing triggers it; this wires it to a recurring timer.
 * HOW: Calculates ms until next fire time, uses setTimeout + self-reschedule (no extra deps).
 *
 * Default schedule: Every Monday at 08:00 UTC (configurable via env).
 *
 * Alignment:
 * - Layered: scheduler invokes DigestService (service layer)
 * - No new dependencies: uses built-in setTimeout
 * - Graceful shutdown: clears timer on process exit
 */

import { DigestService } from '../modules/feedback/digest.service';
import { logger } from '../utils/logger';

/** Day of week (0=Sun, 1=Mon, …, 6=Sat) */
const DIGEST_DAY = parseInt(process.env.DIGEST_DAY_OF_WEEK || '1', 10); // Monday
const DIGEST_HOUR = parseInt(process.env.DIGEST_HOUR_UTC || '8', 10);   // 08:00 UTC

let timer: ReturnType<typeof setTimeout> | null = null;

/**
 * Calculate milliseconds until the next occurrence of the target day/hour (UTC).
 */
function msUntilNextFire(): number {
  const now = new Date();
  const next = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    DIGEST_HOUR,
    0,
    0,
    0
  ));

  // Advance to the correct day of week
  let daysAhead = DIGEST_DAY - next.getUTCDay();
  if (daysAhead < 0) daysAhead += 7;
  if (daysAhead === 0 && next.getTime() <= now.getTime()) {
    daysAhead = 7; // already passed this week
  }
  next.setUTCDate(next.getUTCDate() + daysAhead);

  return next.getTime() - now.getTime();
}

async function runDigest(): Promise<void> {
  logger.info('Digest scheduler: firing weekly digest');
  try {
    const service = new DigestService();
    const sent = await service.sendDigest('weekly');
    logger.info(`Digest scheduler: weekly digest ${sent ? 'sent' : 'skipped (no recipients)'}`);
  } catch (err) {
    logger.error('Digest scheduler: failed to send weekly digest', err instanceof Error ? err : new Error(String(err)));
  }

  // Reschedule for next week
  scheduleNext();
}

function scheduleNext(): void {
  const ms = msUntilNextFire();
  const hours = (ms / (1000 * 60 * 60)).toFixed(1);
  logger.info(`Digest scheduler: next fire in ${hours}h (day=${DIGEST_DAY}, hour=${DIGEST_HOUR} UTC)`);
  timer = setTimeout(runDigest, ms);
  // Allow Node to exit even if timer is pending
  if (timer && typeof timer === 'object' && 'unref' in timer) {
    timer.unref();
  }
}

/**
 * Start the digest scheduler. Call once at server startup.
 * No-ops if DIGEST_ENABLED env is 'false'.
 */
export function startDigestScheduler(): void {
  if (process.env.DIGEST_ENABLED === 'false') {
    logger.info('Digest scheduler: disabled via DIGEST_ENABLED=false');
    return;
  }

  scheduleNext();
  logger.info('Digest scheduler: started');
}

/**
 * Stop the scheduler (for graceful shutdown / tests).
 */
export function stopDigestScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    logger.info('Digest scheduler: stopped');
  }
}
