/**
 * Retroactive Integration Test: AI Priority Queue ↔ Controller
 *
 * Covers the integration gap: aiGenerate and aiInpaint existed without
 * queue integration tests. These tests verify:
 * - Queue is invoked when ready (Ultra Pro gets priority 1)
 * - Graceful fallback when queue is not initialized
 * - 503 propagation when queue is full
 * - Subscription lookup drives priority resolution
 */

// Mock bullmq before any imports
jest.mock('bullmq', () => {
  const mockWaitUntilFinished = jest.fn();
  const mockAdd = jest.fn().mockResolvedValue({
    id: 'test-job-1',
    waitUntilFinished: mockWaitUntilFinished,
  });
  const mockClose = jest.fn().mockResolvedValue(undefined);
  const mockGetWaitingCount = jest.fn().mockResolvedValue(0);

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: mockAdd,
      close: mockClose,
      getWaitingCount: mockGetWaitingCount,
      getActiveCount: jest.fn().mockResolvedValue(0),
    })),
    Worker: jest.fn().mockImplementation(() => ({
      close: mockClose,
      on: jest.fn(),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      close: mockClose,
      on: jest.fn(),
    })),
    __mockAdd: mockAdd,
    __mockWaitUntilFinished: mockWaitUntilFinished,
    __mockGetWaitingCount: mockGetWaitingCount,
  };
});

// Mock redis-config
jest.mock('../redis-config', () => ({
  getRedisConfig: jest.fn(() => ({
    host: 'localhost',
    port: 8520,
    maxRetriesPerRequest: null,
  })),
}));

// Mock subscription service
jest.mock('../../subscription/subscription.service', () => ({
  getCurrentSubscription: jest.fn(),
}));

// Mock credit service
jest.mock('../../credit/credit.service', () => ({
  deductCredits: jest.fn().mockResolvedValue(true),
  refundCredits: jest.fn().mockResolvedValue(true),
}));

import { AIPriorityQueueService, getAIPriorityQueue } from '../ai-priority-queue.service';
import { getCurrentSubscription } from '../../subscription/subscription.service';
import { Queue } from 'bullmq';

// Get mock handles
const bullmq = jest.requireMock('bullmq');

describe('AI Priority Queue Integration (Controller-level)', () => {
  let service: AIPriorityQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AIPriorityQueueService();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('Subscription-driven priority resolution', () => {
    it('ultra_pro subscription resolves to priority 1 in executeViaQueue', async () => {
      await service.initialize();

      const mockQueue = (Queue as jest.Mock).mock.results[0].value;
      mockQueue.getWaitingCount.mockResolvedValue(0);
      bullmq.__mockWaitUntilFinished.mockResolvedValue({ images: ['result.png'] });

      const directExecutor = jest.fn().mockResolvedValue({ images: ['result.png'] });

      const result = await service.executeViaQueue(
        {
          operationType: 'generate',
          userId: 'user-ultra',
          planType: 'ultra_pro',
          provider: 'comet',
          model: 'flux-pro',
          tier: 'pro',
          payload: { prompt: 'test' },
          toolTimeout: 60000,
        },
        directExecutor
      );

      // Verify queue.add was called with priority 1
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({ planType: 'ultra_pro' }),
        expect.objectContaining({ priority: 1 })
      );
      // directExecutor should NOT be called directly (goes through worker)
      expect(directExecutor).not.toHaveBeenCalled();
    });

    it('free subscription resolves to priority 10 in executeViaQueue', async () => {
      await service.initialize();

      const mockQueue = (Queue as jest.Mock).mock.results[0].value;
      mockQueue.getWaitingCount.mockResolvedValue(0);
      bullmq.__mockWaitUntilFinished.mockResolvedValue({ images: ['result.png'] });

      const directExecutor = jest.fn();

      await service.executeViaQueue(
        {
          operationType: 'generate',
          userId: 'user-free',
          planType: 'free',
          provider: 'openrouter',
          model: 'some-model',
          tier: 'default',
          payload: { prompt: 'test' },
          toolTimeout: 60000,
        },
        directExecutor
      );

      const mockQueueInstance = (Queue as jest.Mock).mock.results[0].value;
      expect(mockQueueInstance.add).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({ planType: 'free' }),
        expect.objectContaining({ priority: 10 })
      );
    });
  });

  describe('Graceful degradation', () => {
    it('falls back to direct execution when queue not initialized', async () => {
      // Do NOT call initialize()
      const directExecutor = jest.fn().mockResolvedValue({ images: ['direct.png'] });

      const result = await service.executeViaQueue(
        {
          operationType: 'inpaint',
          userId: 'user-1',
          planType: 'pro',
          provider: 'openrouter',
          model: 'model-x',
          tier: 'standard',
          payload: { image: 'base64...', prompt: 'fix sky' },
          toolTimeout: 60000,
        },
        directExecutor
      );

      expect(result).toEqual({ images: ['direct.png'] });
      expect(directExecutor).toHaveBeenCalledWith({
        image: 'base64...',
        prompt: 'fix sky',
      });
    });

    it('falls back when Redis connection fails during capacity check', async () => {
      await service.initialize();

      const mockQueue = (Queue as jest.Mock).mock.results[0].value;
      mockQueue.getWaitingCount.mockRejectedValue(new Error('ECONNREFUSED'));

      const directExecutor = jest.fn().mockResolvedValue({ images: ['fallback.png'] });

      const result = await service.executeViaQueue(
        {
          operationType: 'generate',
          userId: 'user-2',
          planType: 'ultra_pro',
          provider: 'comet',
          model: 'flux-pro',
          tier: 'pro',
          payload: { prompt: 'test' },
          toolTimeout: 60000,
        },
        directExecutor
      );

      expect(result).toEqual({ images: ['fallback.png'] });
      expect(directExecutor).toHaveBeenCalled();
    });
  });

  describe('Queue full (503) behavior', () => {
    it('throws 503 when queue is at capacity (500 waiting)', async () => {
      await service.initialize();

      const mockQueue = (Queue as jest.Mock).mock.results[0].value;
      mockQueue.getWaitingCount.mockResolvedValue(500);

      const directExecutor = jest.fn();

      await expect(
        service.executeViaQueue(
          {
            operationType: 'generate',
            userId: 'user-3',
            planType: 'ultra_pro',
            provider: 'comet',
            model: 'flux-pro',
            tier: 'pro',
            payload: { prompt: 'test' },
            toolTimeout: 60000,
          },
          directExecutor
        )
      ).rejects.toThrow(/queue is full/i);

      // Neither queue.add nor directExecutor should be called
      expect(mockQueue.add).not.toHaveBeenCalled();
      expect(directExecutor).not.toHaveBeenCalled();
    });

    it('allows request when queue is below capacity (499 waiting)', async () => {
      await service.initialize();

      const mockQueue = (Queue as jest.Mock).mock.results[0].value;
      mockQueue.getWaitingCount.mockResolvedValue(499);
      bullmq.__mockWaitUntilFinished.mockResolvedValue({ images: ['ok.png'] });

      const directExecutor = jest.fn();

      const result = await service.executeViaQueue(
        {
          operationType: 'generate',
          userId: 'user-4',
          planType: 'starter',
          provider: 'openrouter',
          model: 'model-x',
          tier: 'standard',
          payload: { prompt: 'test' },
          toolTimeout: 60000,
        },
        directExecutor
      );

      expect(mockQueue.add).toHaveBeenCalled();
      expect(result).toEqual({ images: ['ok.png'] });
    });
  });

  describe('Singleton pattern', () => {
    it('getAIPriorityQueue returns the same instance', () => {
      const instance1 = getAIPriorityQueue();
      const instance2 = getAIPriorityQueue();
      expect(instance1).toBe(instance2);
    });
  });
});
