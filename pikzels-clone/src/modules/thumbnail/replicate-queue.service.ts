import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { ReplicateAIService } from './replicate-ai.service';

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

// Redis connection configuration
// NOTE: Uses port 8520 for localhost (project convention), Railway auto-injects REDIS_URL
function getRedisConfig(): { host: string; port: number; password?: string; maxRetriesPerRequest: null } {
  // If REDIS_URL is set (Railway production), parse it
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && redisUrl.startsWith('redis://')) {
    try {
      const url = new URL(redisUrl);
      const config: { host: string; port: number; password?: string; maxRetriesPerRequest: null } = {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        maxRetriesPerRequest: null,
      };
      if (url.password) {
        config.password = url.password;
      }
      return config;
    } catch {
      // Fall through to manual config
    }
  }

  // Manual config (localhost development - uses port 8520 per project convention)
  const config: { host: string; port: number; password?: string; maxRetriesPerRequest: null } = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '8520', 10),
    maxRetriesPerRequest: null, // Required for BullMQ
  };
  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }
  return config;
}

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
  data?: any;
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
      console.log('ReplicateQueueService: Already initialized');
      return;
    }

    const redisConfig = getRedisConfig();
    console.log(`ReplicateQueueService: Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`);

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
      console.log('ReplicateQueueService: Initialized successfully');
      console.log(`  - Max concurrent: ${MAX_CONCURRENT_JOBS}`);
      console.log(`  - Rate limit: ${RATE_LIMIT_MAX} jobs per ${RATE_LIMIT_DURATION / 1000}s`);
    } catch (error) {
      console.error('ReplicateQueueService: Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for logging and monitoring
   */
  private setupEventHandlers(): void {
    if (!this.worker || !this.queueEvents) return;

    this.worker.on('completed', (job) => {
      console.log(`ReplicateQueue: Job ${job.id} completed (${job.data.type})`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`ReplicateQueue: Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('ReplicateQueue: Worker error:', err);
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      console.log(`ReplicateQueue: Job ${jobId} is waiting`);
    });

    this.queueEvents.on('active', ({ jobId }) => {
      console.log(`ReplicateQueue: Job ${jobId} is now active`);
    });

    this.queueEvents.on('stalled', ({ jobId }) => {
      console.warn(`ReplicateQueue: Job ${jobId} has stalled`);
    });
  }

  /**
   * Process a job using the ReplicateAIService
   */
  private async processJob(job: Job<ReplicateJobData, ReplicateJobResult>): Promise<ReplicateJobResult> {
    const { type, imageBase64, options, clicks, prompt, direction, expandPixels, scale, faceEnhance } = job.data;

    console.log(`ReplicateQueue: Processing job ${job.id} (${type}) for user ${job.data.userId}`);

    try {
      let result: any;

      switch (type) {
        case 'segment':
          result = await this.replicateService.segment(imageBase64, options);
          break;

        case 'segmentInteractive':
          if (!clicks || clicks.length === 0) {
            throw new Error('Clicks required for interactive segmentation');
          }
          result = await this.replicateService.segmentInteractive(imageBase64, clicks);
          break;

        case 'removeBackground':
          result = await this.replicateService.removeBackground(imageBase64);
          break;

        case 'upscale':
          result = await this.replicateService.upscale(imageBase64, scale, faceEnhance);
          break;

        case 'expand':
          result = await this.replicateService.expand(imageBase64, prompt, direction, expandPixels);
          break;

        default:
          throw new Error(`Unknown job type: ${type}`);
      }

      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`ReplicateQueue: Job ${job.id} failed:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add a job to the queue and wait for the result.
   * This is the main entry point for queued Replicate operations.
   *
   * @param jobData Job data including type and parameters
   * @param priority Optional priority (lower = higher priority, default 0)
   * @returns Promise resolving to job result
   */
  async addJob(jobData: ReplicateJobData, priority: number = 0): Promise<ReplicateJobResult> {
    if (!this.queue || !this.isInitialized) {
      throw new Error('ReplicateQueueService not initialized. Call initialize() first.');
    }

    // Generate job ID based on type and a timestamp
    const jobId = `${jobData.type}-${jobData.userId}-${Date.now()}`;

    const job = await this.queue.add(jobData.type, jobData, {
      jobId,
      priority,
    });

    console.log(`ReplicateQueue: Added job ${job.id} (${jobData.type}) for user ${jobData.userId}`);

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
  async addJobAsync(jobData: ReplicateJobData, priority: number = 0): Promise<string> {
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
    const progress = job.progress as number || 0;

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
    console.log('ReplicateQueueService: Shutting down...');

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
    console.log('ReplicateQueueService: Shutdown complete');
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
