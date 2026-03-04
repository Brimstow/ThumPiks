import { spawn, ChildProcess } from 'child_process';
import { logger } from '../../utils/logger';

// ffmpeg-static provides a path to a bundled ffmpeg binary
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string = require('ffmpeg-static');

// ============================================
// CONCURRENCY CONTROLS
// ============================================

/** Max ffmpeg processes running at once across ALL requests */
const MAX_CONCURRENT_FFMPEG = 3;

/** Max queued requests before rejecting new ones */
const MAX_QUEUE_SIZE = 10;

/** Per-process timeout in ms */
const PROCESS_TIMEOUT_MS = 30_000;

/** Cache TTL in ms (5 minutes — CDN URLs expire after ~6 hours) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Max cached entries */
const MAX_CACHE_SIZE = 50;

let activeProcesses = 0;
const waitQueue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];

/**
 * Semaphore: acquire a slot before spawning ffmpeg.
 * If all slots are busy, the caller waits in a FIFO queue.
 */
function acquireSlot(): Promise<void> {
  if (activeProcesses < MAX_CONCURRENT_FFMPEG) {
    activeProcesses++;
    return Promise.resolve();
  }

  if (waitQueue.length >= MAX_QUEUE_SIZE) {
    return Promise.reject(new Error(
      `Frame extraction queue full (${MAX_QUEUE_SIZE} waiting). Try again later.`
    ));
  }

  return new Promise((resolve, reject) => {
    waitQueue.push({ resolve, reject });
  });
}

function releaseSlot(): void {
  const next = waitQueue.shift();
  if (next) {
    // Hand the slot directly to the next waiter (no decrement/increment)
    next.resolve();
  } else {
    activeProcesses--;
  }
}

// ============================================
// LRU CACHE (keyed by videoId, not stream URL which expires)
// ============================================

interface CacheEntry {
  frames: ExtractedFrameResult[];
  createdAt: number;
}

const frameCache = new Map<string, CacheEntry>();

function getCached(cacheKey: string): ExtractedFrameResult[] | null {
  const entry = frameCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    frameCache.delete(cacheKey);
    return null;
  }
  // Move to end (LRU refresh)
  frameCache.delete(cacheKey);
  frameCache.set(cacheKey, entry);
  return entry.frames;
}

function setCache(cacheKey: string, frames: ExtractedFrameResult[]): void {
  // Evict oldest if at capacity
  if (frameCache.size >= MAX_CACHE_SIZE) {
    const oldest = frameCache.keys().next().value;
    if (oldest !== undefined) frameCache.delete(oldest);
  }
  frameCache.set(cacheKey, { frames, createdAt: Date.now() });
}

// ============================================
// TYPES
// ============================================

export interface ExtractedFrameResult {
  timestamp: number;
  buffer: Buffer;
  label: string;
}

// ============================================
// SINGLE FRAME EXTRACTION (with semaphore)
// ============================================

/**
 * Extract a single frame from a remote video URL at a specific timestamp.
 * Uses ffmpeg's fast-seek (-ss before -i) so only a few KB are downloaded
 * per frame instead of the entire video.
 * Respects the global concurrency semaphore.
 */
async function extractFrameAtTimestamp(
  streamUrl: string,
  timestamp: number,
  width = 1280,
  height = 720,
): Promise<Buffer> {
  await acquireSlot();

  try {
    return await _spawnFFmpegFrame(streamUrl, timestamp, width, height);
  } finally {
    releaseSlot();
  }
}

function _spawnFFmpegFrame(
  streamUrl: string,
  timestamp: number,
  width: number,
  height: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const args = [
      '-ss', timestamp.toFixed(3),       // fast-seek before input
      '-i', streamUrl,                    // remote URL (supports HTTP Range)
      '-vframes', '1',                    // extract exactly 1 frame
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-q:v', '2',                        // high quality JPEG (1-31, 2 = near-lossless)
      '-f', 'image2pipe',                 // pipe output
      '-vcodec', 'mjpeg',                 // output as JPEG
      '-an',                              // no audio
      'pipe:1',                           // write to stdout
    ];

    const chunks: Buffer[] = [];
    let stderr = '';
    let killed = false;

    const proc: ChildProcess = spawn(ffmpegPath, args, {
      windowsHide: true,
    });

    // Hard timeout — kill the process if it hangs
    const timer = setTimeout(() => {
      killed = true;
      proc.kill('SIGKILL');
      reject(new Error(`ffmpeg timed out after ${PROCESS_TIMEOUT_MS / 1000}s at ${timestamp}s`));
    }, PROCESS_TIMEOUT_MS);

    proc.stdout?.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      clearTimeout(timer);
      if (!killed) {
        logger.error(`ffmpeg spawn error: ${error.message}`);
        reject(new Error(`Failed to spawn ffmpeg: ${error.message}`));
      }
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (killed) return; // already rejected by timeout
      if (code !== 0 || chunks.length === 0) {
        logger.error(`ffmpeg frame extraction failed (code ${code}) at ${timestamp}s: ${stderr.slice(-500)}`);
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });
  });
}

// ============================================
// MULTI-FRAME EXTRACTION (sequential per request, cached)
// ============================================

/**
 * Extract multiple frames from a video at evenly-spaced timestamps.
 * Frames are extracted SEQUENTIALLY within a request to limit resource
 * usage per user. The global semaphore limits total ffmpeg processes
 * across all concurrent requests.
 *
 * Results are cached by cacheKey (typically videoId) for 5 minutes.
 *
 * @param streamUrl  Direct CDN/stream URL (from yt-dlp)
 * @param duration   Video duration in seconds
 * @param cacheKey   Cache key (e.g. videoId) — same video = instant return
 * @param count      Number of frames to extract (default 8)
 * @param width      Output width (default 1280)
 * @param height     Output height (default 720)
 */
export type FrameProgressCallback = (event: {
  phase: 'resolving' | 'extracting' | 'done';
  current: number;
  total: number;
  frame?: ExtractedFrameResult;
}) => void;

export async function extractFramesFromVideo(
  streamUrl: string,
  duration: number,
  cacheKey: string,
  count = 8,
  width = 1280,
  height = 720,
  onProgress?: FrameProgressCallback,
): Promise<ExtractedFrameResult[]> {
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    logger.info(`Frame cache hit for ${cacheKey} (${cached.length} frames)`);
    return cached;
  }

  // Generate evenly-spaced timestamps, avoiding the very start (often black)
  // and very end (often credits/outro)
  const startOffset = Math.min(duration * 0.05, 5);   // skip first 5% or 5s
  const endOffset = Math.min(duration * 0.05, 5);     // skip last 5% or 5s
  const usableDuration = duration - startOffset - endOffset;

  let timestamps: number[];
  if (usableDuration <= 0) {
    // Very short video — just sample a few points
    timestamps = [duration * 0.25, duration * 0.5, duration * 0.75]
      .filter(t => t > 0 && t < duration);
  } else {
    const interval = usableDuration / (count - 1);
    timestamps = [];
    for (let i = 0; i < count; i++) {
      timestamps.push(startOffset + interval * i);
    }
  }

  const frames = await extractAtTimestamps(streamUrl, timestamps, width, height, onProgress);

  // Cache successful extractions
  setCache(cacheKey, frames);
  return frames;
}

async function extractAtTimestamps(
  streamUrl: string,
  timestamps: number[],
  width: number,
  height: number,
  onProgress?: FrameProgressCallback,
): Promise<ExtractedFrameResult[]> {
  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Extract SEQUENTIALLY — each frame waits for the semaphore slot,
  // so we don't hog all slots for a single user request.
  const total = timestamps.length;
  const frames: ExtractedFrameResult[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i]!;
    onProgress?.({ phase: 'extracting', current: i + 1, total });
    try {
      const buffer = await extractFrameAtTimestamp(streamUrl, ts, width, height);
      const frame: ExtractedFrameResult = {
        timestamp: ts,
        buffer,
        label: `Frame at ${formatTime(ts)}`,
      };
      frames.push(frame);
      onProgress?.({ phase: 'extracting', current: i + 1, total, frame });
    } catch (err) {
      // Log but continue — partial results are better than none
      logger.warn(`Skipping frame at ${ts}s: ${(err as Error).message}`);
    }
  }
  onProgress?.({ phase: 'done', current: total, total });

  if (frames.length === 0) {
    throw new Error('Failed to extract any frames from the video');
  }

  return frames;
}
