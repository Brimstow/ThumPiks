import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { ReplicateAIService } from './replicate-ai.service';
import { createBreaker } from '../../utils/circuit-breaker';
import { getRedisConfig } from './redis-config';
import { logger } from '../../utils/logger';

/**
 * ReplicateQueueService - Production-grade request queue for Replicate API
 *
 * Provides multi-user scaling with:
 * - Request queuing to prevent concurrent overload
 * - Rate limiting per Replicate's 600 predictions/minute limit
 * - Job deduplication to avoid duplicate predictions
 * - Automatic retries handled by BullMQ
 * - Priority queuing for premium users (future)
 *
 * Uses Redis (via ioredis) as the backing store for distributed queuing.
 *
 * @see https://docs.bullmq.io/
 */

// Queue configuration
const QUEUE_NAME = 'replicate-predictions';

// Rate limiting: Stay well under Replicate's 600/min limit
// With multiple app instances, each should use a fraction
const MAX_CONCURRENT_JOBS = 10; // Process up to 10 jobs at once
const RATE_LIMIT_MAX = 100; // Max 100 jobs per duration window
const RATE_LIMIT_DURATION = 60000; // 1 minute window

// Job configuration
const JOB_TIMEOUT = 180000; // 3 minutes max per job
const DEFAULT_ATTEMPTS = 1; // Let ReplicateAIService handle retries internally

// Job types for type safety
export type ReplicateJobType =
  | 'segment'
  | 'segmentInteractive'
  | 'removeBackground'
  | 'upscale'
  | 'expand';

export interface ReplicateJobData {
  type: ReplicateJobType;
  userId: string;
  imageBase64: string;
  options?: Record<string, unknown>;
  // For segmentInteractive
  clicks?: Array<{ x: number; y: number; label: number }>;
  // For expand
  prompt?: string;
  direction?: 'left' | 'right' | 'top' | 'bottom' | 'all';
  expandPixels?: number;
  // For upscale
  scale?: number;
  faceEnhance?: boolean;
}

export interface ReplicateJobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Singleton queue service for Replicate predictions
 */
export class ReplicateQueueService {
  private static instance: ReplicateQueueService | null = null;
  private queue: Queue<ReplicateJobData, ReplicateJobResult> | null = null;
  private worker: Worker<ReplicateJobData, ReplicateJobResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private replicateService: ReplicateAIService;
  private isInitialized = false;

  private constructor() {
    this.replicateService = new ReplicateAIService();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ReplicateQueueService {
    if (!ReplicateQueueService.instance) {
      ReplicateQueueService.instance = new ReplicateQueueService();
    }
    return ReplicateQueueService.instance;
  }

  /**
   * Initialize the queue and worker.
   * Call this on application startup.
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('ReplicateQueueService: Already initialized');
      return;
    }

    const redisConfig = getRedisConfig();
    logger.info('ReplicateQueueService: Connecting to Redis', { host: redisConfig.host, port: redisConfig.port });

    try {
      // Create the queue
      this.queue = new Queue<ReplicateJobData, ReplicateJobResult>(QUEUE_NAME, {
        connection: redisConfig,
        defaultJobOptions: {
          attempts: DEFAULT_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
            count: 500, // Keep last 500 failed jobs
          },
        },
      });

      // Create the worker with rate limiting
      this.worker = new Worker<ReplicateJobData, ReplicateJobResult>(
        QUEUE_NAME,
        async (job: Job<ReplicateJobData, ReplicateJobResult>) => {
          return this.processJob(job);
        },
        {
          connection: redisConfig,
          concurrency: MAX_CONCURRENT_JOBS,
          limiter: {
            max: RATE_LIMIT_MAX,
            duration: RATE_LIMIT_DURATION,
          },
        }
      );

      // Create queue events for monitoring
      this.queueEvents = new QueueEvents(QUEUE_NAME, {
        connection: redisConfig,
      });

      // Set up event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('ReplicateQueueService: Initialized successfully', { maxConcurrent: MAX_CONCURRENT_JOBS, rateLimitMax: RATE_LIMIT_MAX, rateLimitDurationSec: RATE_LIMIT_DURATION / 1000 });
    } catch (error) {
      logger.error('ReplicateQueueService: Failed to initialize', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Set up event handlers for logging and monitoring
   */
  private setupEventHandlers(): void {
    if (!this.worker || !this.queueEvents) return;

    this.worker.on('completed', job => {
      logger.info('ReplicateQueue: Job completed', { jobId: job.id, type: job.data.type });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('ReplicateQueue: Job failed', err, { jobId: job?.id });
    });

    this.worker.on('error', err => {
      logger.error('ReplicateQueue: Worker error', err instanceof Error ? err : new Error(String(err)));
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.info('ReplicateQueue: Job is waiting', { jobId });
    });

    this.queueEvents.on('active', ({ jobId }) => {
      logger.info('ReplicateQueue: Job is now active', { jobId });
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      logger.warn('ReplicateQueue: Job has stalled', { jobId });
    });
  }

  /**
   * Process a job using the ReplicateAIService
   */
  private async processJob(
    job: Job<ReplicateJobData, ReplicateJobResult>
  ): Promise<ReplicateJobResult> {
    logger.info('ReplicateQueue: Processing job', { jobId: job.id, type: job.data.type, userId: job.data.userId });

    // Circuit breaker: fail fast if Replicate API is down
    const breaker = createBreaker(
      'replicate',
      async (args: ReplicateJobData) => {
        switch (args.type) {
          case 'segment':
            return this.replicateService.segment(
              args.imageBase64,
              args.options
            );
          case 'segmentInteractive':
            if (!args.clicks || args.clicks.length === 0) {
              throw new Error('Clicks required for interactive segmentation');
            }
            return this.replicateService.segmentInteractive(
              args.imageBase64,
              args.clicks
            );
          case 'removeBackground':
            return this.replicateService.removeBackground(args.imageBase64);
          case 'upscale':
            return this.replicateService.upscale(
              args.imageBase64,
              args.scale,
              args.faceEnhance
            );
          case 'expand':
            return this.replicateService.expand(
              args.imageBase64,
              args.prompt,
              args.direction,
              args.expandPixels
            );
          default:
            throw new Error(`Unknown job type: ${(args as { type?: string }).type}`);
        }
      },
      { timeout: JOB_TIMEOUT }
    );

    try {
      const result = await breaker.fire(job.data);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error('ReplicateQueue: Job failed', error instanceof Error ? error : new Error(String(error)), { jobId: job.id });
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add a job to the queue and wait for the result.
   *
   * @deprecated Blocks the HTTP connection for up to JOB_TIMEOUT (3 min).
   *   Prefer addJobAsync() + GET /ai/job/:jobId polling to free the
   *   connection immediately and avoid HTTP connection exhaustion.
   *
   * @param jobData Job data including type and parameters
   * @param priority Optional priority (lower = higher priority, default 0)
   * @returns Promise resolving to job result
   */
  async addJob(
    jobData: ReplicateJobData,
    priority: number = 0
  ): Promise<ReplicateJobResult> {
    if (!this.queue || !this.isInitialized) {
      throw new Error(
        'ReplicateQueueService not initialized. Call initialize() first.'
      );
    }

    // Generate job ID based on type and a timestamp
    const jobId = `${jobData.type}-${jobData.userId}-${Date.now()}`;

    const job = await this.queue.add(jobData.type, jobData, {
      jobId,
      priority,
    });

    logger.info('ReplicateQueue: Added job', { jobId: job.id, type: jobData.type, userId: jobData.userId });

    // Wait for the job to complete
    const result = await job.waitUntilFinished(this.queueEvents!, JOB_TIMEOUT);
    return result;
  }

  /**
   * Add a job without waiting for the result.
   * Returns the job ID for later status checking.
   *
   * @param jobData Job data
   * @param priority Optional priority
   * @returns Job ID
   */
  async addJobAsync(
    jobData: ReplicateJobData,
    priority: number = 0
  ): Promise<string> {
    if (!this.queue || !this.isInitialized) {
      throw new Error('ReplicateQueueService not initialized');
    }

    const jobId = `${jobData.type}-${jobData.userId}-${Date.now()}`;

    const job = await this.queue.add(jobData.type, jobData, {
      jobId,
      priority,
    });

    return job.id!;
  }

  /**
   * Get the status of a job by ID
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    result?: ReplicateJobResult | undefined;
  } | null> {
    if (!this.queue) return null;

    const job = await this.queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = (job.progress as number) || 0;

    if (state === 'completed') {
      return { state, progress, result: job.returnvalue };
    }

    return { state, progress };
  }

  /**
   * Get queue statistics for monitoring
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    if (!this.queue) {
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  /**
   * Gracefully shutdown the queue service.
   * Call this on application shutdown.
   */
  async shutdown(): Promise<void> {
    logger.info('ReplicateQueueService: Shutting down...');

    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }

    if (this.queueEvents) {
      await this.queueEvents.close();
      this.queueEvents = null;
    }

    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }

    this.isInitialized = false;
    logger.info('ReplicateQueueService: Shutdown complete');
  }

  /**
   * Check if the service is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton getter for convenience
export function getReplicateQueue(): ReplicateQueueService {
  return ReplicateQueueService.getInstance();
}
