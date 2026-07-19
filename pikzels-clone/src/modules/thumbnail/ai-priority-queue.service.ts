import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { getRedisConfig } from './redis-config';
import { SUBSCRIPTION_PLANS } from '../subscription/subscription.config';
import { logger } from '../../utils/logger';

// Queue configuration
const QUEUE_NAME = 'ai-operations';
const DEFAULT_CONCURRENCY = parseInt(process.env.AI_QUEUE_CONCURRENCY || '10', 10);
const MAX_QUEUE_SIZE = parseInt(process.env.AI_QUEUE_MAX_SIZE || '500', 10);

// Priority defaults
const DEFAULT_PRIORITY = 10;

export interface AIJobParams {
  operationType: string;
  userId: string;
  planType: string;
  provider: string;
  model: string;
  tier: string;
  payload: Record<string, unknown>;
  toolTimeout: number;
}

export interface AIJobResult {
  [key: string]: unknown;
}

export type DirectExecutor = (payload: Record<string, unknown>) => Promise<AIJobResult>;

/**
 * AIPriorityQueueService - Routes AI operations through a BullMQ priority queue.
 *
 * Ultra Pro users get priority 1 (dequeue first), all others get priority 10.
 * Falls back to direct execution when Redis/queue is unavailable.
 */
export class AIPriorityQueueService {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private queueEvents: QueueEvents | null = null;
  private initialized = false;
  private executorRegistry = new Map<string, DirectExecutor>();

  /**
   * Resolve BullMQ priority from plan type.
   * Lower number = higher priority.
   */
  resolvePriority(planType: string): number {
    const plan = SUBSCRIPTION_PLANS[planType];
    if (plan?.features?.queuePriority !== undefined) {
      return plan.features.queuePriority;
    }
    return DEFAULT_PRIORITY;
  }

  /**
   * Initialize the queue, worker, and events.
   * Call on server startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const redisConfig = getRedisConfig();

    this.queue = new Queue(QUEUE_NAME, {
      connection: redisConfig,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 500 },
      },
    });

    this.worker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        // Worker processor — looks up the executor registered for this job
        const executor = this.executorRegistry.get(job.id!);
        if (!executor) {
          throw new Error(`No executor registered for job ${job.id}`);
        }
        try {
          return await executor(job.data.payload);
        } finally {
          this.executorRegistry.delete(job.id!);
        }
      },
      {
        connection: redisConfig,
        concurrency: DEFAULT_CONCURRENCY,
      }
    );

    this.worker.on('error', (err) => {
      logger.error('AIPriorityQueue: Worker error', err instanceof Error ? err : new Error(String(err)));
    });

    this.queueEvents = new QueueEvents(QUEUE_NAME, {
      connection: redisConfig,
    });

    this.initialized = true;
  }

  /**
   * Execute an AI operation via the priority queue.
   *
   * If the queue is not ready or Redis fails, gracefully falls back
   * to direct execution via the provided directExecutor.
   *
   * @param params - Job parameters including plan type for priority resolution
   * @param directExecutor - Fallback function that performs the AI operation directly
   */
  async executeViaQueue(
    params: AIJobParams,
    directExecutor: DirectExecutor
  ): Promise<AIJobResult> {
    // Fallback: queue not initialized
    if (!this.initialized || !this.queue || !this.queueEvents) {
      return directExecutor(params.payload);
    }

    // Check queue capacity
    try {
      const waitingCount = await this.queue.getWaitingCount();
      if (waitingCount >= MAX_QUEUE_SIZE) {
        const err = new Error('Queue is full. Please retry later.') as Error & { statusCode: number };
        err.statusCode = 503;
        throw err;
      }
    } catch (err: unknown) {
      if ((err as Error & { statusCode?: number }).statusCode === 503) throw err;
      // Redis error checking capacity — fall back
      return directExecutor(params.payload);
    }

    // Resolve priority from subscription plan
    const priority = this.resolvePriority(params.planType);

    // Dispatch to queue — worker processes in priority order
    try {
      const jobId = `${params.operationType}-${params.userId}-${Date.now()}`;

      // Register executor so the worker can invoke it when the job is dequeued
      this.executorRegistry.set(jobId, directExecutor);

      const job = await this.queue.add(params.operationType, params, {
        jobId,
        priority,
      });

      // Wait for the worker to process and return the result
      const result = await job.waitUntilFinished(this.queueEvents, params.toolTimeout + 15000);
      return result;
    } catch (err: unknown) {
      // If queue dispatch fails, fall back to direct execution
      const e = err as Error & { code?: string };
      if (e.message === 'Redis connection lost' || e.code === 'ECONNREFUSED') {
        return directExecutor(params.payload);
      }
      throw err;
    }
  }

  /**
   * Check if the service is initialized and ready.
   */
  isReady(): boolean {
    return this.initialized;
  }

  /**
   * Gracefully shutdown queue, worker, and events.
   */
  async shutdown(): Promise<void> {
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
    this.initialized = false;
  }
}

// Singleton instance
let instance: AIPriorityQueueService | null = null;

export function getAIPriorityQueue(): AIPriorityQueueService {
  if (!instance) {
    instance = new AIPriorityQueueService();
  }
  return instance;
}
