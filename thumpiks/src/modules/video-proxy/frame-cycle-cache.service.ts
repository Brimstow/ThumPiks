/**
 * Frame Cycle Cache Service
 *
 * Two-tier caching system:
 *
 * 1. FRAME POOL — Stores ALL extracted frames (~24) per user+video in Redis.
 *    Extracted once on first visit. Key: frames:{userId}:{videoId}:pool
 *
 * 2. CYCLES — Each cycle is a random subset of 8 frames from the pool.
 *    "Regenerate" just picks a different 8 from the pool → INSTANT, no ffmpeg.
 *    Key: frames:{userId}:{videoId}:cycles
 *
 * TTL: 24 hours (auto-cleanup, no DB bloat)
 * Uses the existing CacheService singleton (Redis + in-memory fallback).
 */

import { CacheService, CacheTTL } from '../../services/cache.service';
import { logger } from '../../utils/logger';

// ============================================
// TYPES
// ============================================

export interface StoredFrame {
  url: string; // data:image/jpeg;base64,...
  label: string;
  width: number;
  height: number;
}

export interface FrameCycle {
  cycleIndex: number;
  frames: StoredFrame[];
  extractedAt: string; // ISO timestamp
}

export interface FrameCyclesData {
  videoId: string;
  cycles: FrameCycle[];
}

// ============================================
// CONFIGURATION
// ============================================

const CYCLE_CACHE_TTL = CacheTTL.DAILY; // 24 hours
const MAX_CYCLES_PER_VIDEO = 10; // more cycles since they're cheap (just index arrays)
const FRAMES_PER_CYCLE = 8; // frames shown to user per cycle
export const POOL_EXTRACT_COUNT = 24; // total frames extracted on first visit

// ============================================
// CACHE KEY HELPERS
// ============================================

function cyclesCacheKey(userId: string, videoId: string): string {
  return `frames:${userId}:${videoId}:cycles`;
}

function poolCacheKey(userId: string, videoId: string): string {
  return `frames:${userId}:${videoId}:pool`;
}

// ============================================
// SERVICE
// ============================================

const cache = CacheService.getInstance();

/**
 * Get all stored cycles for a user+video.
 * Returns null if no cycles exist.
 */
export async function getFrameCycles(
  userId: string,
  videoId: string
): Promise<FrameCyclesData | null> {
  const key = cyclesCacheKey(userId, videoId);
  const data = await cache.get<FrameCyclesData>(key);
  return data;
}

/**
 * Get a specific cycle by index.
 * Returns null if the cycle doesn't exist.
 */
export async function getFrameCycleByIndex(
  userId: string,
  videoId: string,
  cycleIndex: number
): Promise<FrameCycle | null> {
  const data = await getFrameCycles(userId, videoId);
  if (!data) return null;
  return data.cycles.find(c => c.cycleIndex === cycleIndex) ?? null;
}

/**
 * Append a new cycle of frames for a user+video.
 * If max cycles reached, removes the oldest non-first cycle.
 * Returns the newly created cycle (with its assigned index).
 */
export async function appendFrameCycle(
  userId: string,
  videoId: string,
  frames: StoredFrame[]
): Promise<{ cycle: FrameCycle; totalCycles: number }> {
  const key = cyclesCacheKey(userId, videoId);
  let data = await cache.get<FrameCyclesData>(key);

  if (!data) {
    data = { videoId, cycles: [] };
  }

  // Determine next cycle index
  const nextIndex =
    data.cycles.length > 0
      ? Math.max(...data.cycles.map(c => c.cycleIndex)) + 1
      : 0;

  const newCycle: FrameCycle = {
    cycleIndex: nextIndex,
    frames,
    extractedAt: new Date().toISOString(),
  };

  data.cycles.push(newCycle);

  // Evict oldest cycles (keep first + most recent) if over limit
  if (data.cycles.length > MAX_CYCLES_PER_VIDEO) {
    // Keep the first cycle (index 0) and the newest ones
    const first = data.cycles[0]!;
    const rest = data.cycles.slice(1);
    // Keep only the most recent (MAX - 1) from the rest
    const kept = rest.slice(rest.length - (MAX_CYCLES_PER_VIDEO - 1));
    data.cycles = [first, ...kept];
  }

  await cache.set(key, data, CYCLE_CACHE_TTL);

  logger.info('Frame cycle stored', {
    userId,
    videoId,
    cycleIndex: newCycle.cycleIndex,
    frameCount: frames.length,
    totalCycles: data.cycles.length,
  });

  return { cycle: newCycle, totalCycles: data.cycles.length };
}

/**
 * Get metadata about stored cycles (without the heavy frame data).
 * Useful for the frontend to know how many cycles exist.
 */
export async function getFrameCyclesMeta(
  userId: string,
  videoId: string
): Promise<{
  totalCycles: number;
  cycles: { cycleIndex: number; frameCount: number; extractedAt: string }[];
} | null> {
  const data = await getFrameCycles(userId, videoId);
  if (!data) return null;

  return {
    totalCycles: data.cycles.length,
    cycles: data.cycles.map(c => ({
      cycleIndex: c.cycleIndex,
      frameCount: c.frames.length,
      extractedAt: c.extractedAt,
    })),
  };
}

/**
 * Clear ALL frame data (pool + cycles) for a user+video.
 * Called before storing a fresh pool so old cycle data doesn't mix with new frames.
 */
export async function clearFrameData(
  userId: string,
  videoId: string
): Promise<void> {
  await Promise.all([
    cache.del(poolCacheKey(userId, videoId)),
    cache.del(cyclesCacheKey(userId, videoId)),
  ]);
  logger.info('Cleared frame pool + cycles', { userId, videoId });
}

// ============================================
// FRAME POOL (over-extract then shuffle)
// ============================================

export interface FramePool {
  videoId: string;
  frames: StoredFrame[]; // ALL extracted frames (~24)
  extractedAt: string;
}

/**
 * Store the full frame pool (all ~24 frames) for a user+video.
 * Called once on first extraction.
 */
export async function storeFramePool(
  userId: string,
  videoId: string,
  frames: StoredFrame[]
): Promise<void> {
  const key = poolCacheKey(userId, videoId);
  const pool: FramePool = {
    videoId,
    frames,
    extractedAt: new Date().toISOString(),
  };
  await cache.set(key, pool, CYCLE_CACHE_TTL);
  logger.info('Frame pool stored', {
    userId,
    videoId,
    frameCount: frames.length,
  });
}

/**
 * Get the full frame pool for a user+video.
 * Returns null if no pool exists (needs extraction).
 */
export async function getFramePool(
  userId: string,
  videoId: string
): Promise<FramePool | null> {
  const key = poolCacheKey(userId, videoId);
  return await cache.get<FramePool>(key);
}

/**
 * Generate a new cycle by picking a random subset from the pool.
 * Tracks ALL previously shown frames across ALL cycles — guarantees
 * every regeneration shows completely new frames until the pool is exhausted.
 *
 * Returns null when the pool has no unseen frames left, signalling the
 * controller to do a fresh ffmpeg extraction with new timestamps.
 */
export async function generateCycleFromPool(
  userId: string,
  videoId: string
): Promise<{
  frames: StoredFrame[];
  cycleIndex: number;
  totalCycles: number;
} | null> {
  const pool = await getFramePool(userId, videoId);
  if (!pool || pool.frames.length === 0) return null;

  // Collect ALL frame labels that have been shown in ANY previous cycle
  const existingData = await getFrameCycles(userId, videoId);
  const usedIndices = new Set<number>();
  if (existingData) {
    for (const cycle of existingData.cycles) {
      for (const frame of cycle.frames) {
        const idx = pool.frames.findIndex(f => f.label === frame.label);
        if (idx >= 0) usedIndices.add(idx);
      }
    }
  }

  // Determine unseen frames
  const allIndices = Array.from({ length: pool.frames.length }, (_, i) => i);
  const unseen = allIndices.filter(i => !usedIndices.has(i));

  // If fewer unseen frames than a full cycle, pool is exhausted — return null
  // so the controller can do a fresh extraction with new timestamps
  if (unseen.length < FRAMES_PER_CYCLE) {
    logger.info('Frame pool exhausted, need fresh extraction', {
      userId,
      videoId,
      poolSize: pool.frames.length,
      unseenLeft: unseen.length,
    });
    return null;
  }

  // Fisher-Yates shuffle
  const shuffle = <T>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a;
  };

  // Pick FRAMES_PER_CYCLE from unseen only — guaranteed all new
  const selected = shuffle(unseen).slice(0, FRAMES_PER_CYCLE);
  selected.sort((a, b) => a - b); // sort by timestamp order

  const cycleFrames = selected.map(i => pool.frames[i]!);

  // Store as a new cycle
  const { cycle, totalCycles } = await appendFrameCycle(
    userId,
    videoId,
    cycleFrames
  );

  logger.info('Cycle generated from pool (all new frames)', {
    userId,
    videoId,
    cycleIndex: cycle.cycleIndex,
    poolSize: pool.frames.length,
    unseenRemaining: unseen.length - FRAMES_PER_CYCLE,
  });

  return { frames: cycleFrames, cycleIndex: cycle.cycleIndex, totalCycles };
}
