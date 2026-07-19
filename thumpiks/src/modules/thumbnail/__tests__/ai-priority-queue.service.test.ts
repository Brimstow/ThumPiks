/**
 * Tests for AIPriorityQueueService
 *
 * Covers:
 * - Priority resolution (ultra_pro=1, all others=10)
 * - executeViaQueue dispatches to BullMQ with correct priority
 * - Graceful fallback to direct execution when queue is not ready
 * - Queue full (503) behavior
 */

// Mock bullmq before any imports
jest.mock('bullmq', () => {
  const mockAdd = jest.fn();
  const mockClose = jest.fn().mockResolvedValue(undefined);
  const mockGetWaitingCount = jest.fn().mockResolvedValue(0);
  const mockGetActiveCount = jest.fn().mockResolvedValue(0);

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: mockAdd,
      close: mockClose,
      getWaitingCount: mockGetWaitingCount,
      getActiveCount: mockGetActiveCount,
    })),
    Worker: jest.fn().mockImplementation(() => ({
      close: mockClose,
      on: jest.fn(),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      close: mockClose,
      on: jest.fn(),
    })),
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

import { AIPriorityQueueService } from '../ai-priority-queue.service';
import { Queue } from 'bullmq';

describe('AIPriorityQueueService', () => {
  let service: AIPriorityQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AIPriorityQueueService();
  });

  afterEach(async () => {
    await service.shutdown();
  });

  describe('resolvePriority', () => {
    it('returns 1 for ultra_pro plan', () => {
      expect(service.resolvePriority('ultra_pro')).toBe(1);
    });

    it('returns 10 for pro plan', () => {
      expect(service.resolvePriority('pro')).toBe(10);
    });

    it('returns 10 for starter plan', () => {
      expect(service.resolvePriority('starter')).toBe(10);
    });

    it('returns 10 for free plan', () => {
      expect(service.resolvePriority('free')).toBe(10);
    });

    it('returns 10 for unknown plan types', () => {
      expect(service.resolvePriority('nonexistent')).toBe(10);
    });
  });

  describe('executeViaQueue', () => {
    const baseJobParams = {
      operationType: 'generate' as const,
      userId: 'user-123',
      planType: 'ultra_pro',
      provider: 'comet',
      model: 'model-v1',
      tier: 'pro',
      payload: { prompt: 'a cool thumbnail' },
      toolTimeout: 60000,
    };

    it('falls back to directExecutor when queue is not initialized', async () => {
      const directResult = { images: ['http://example.com/img.png'] };
      const directExecutor = jest.fn().mockResolvedValue(directResult);

      const result = await service.executeViaQueue(baseJobParams, directExecutor);

      expect(result).toEqual(directResult);
      expect(directExecutor).toHaveBeenCalledWith(baseJobParams.payload);
    });

    it('dispatches to queue with priority 1 for ultra_pro after initialization', async () => {
      await service.initialize();

      const mockJob = {
        id: 'test-job-1',
        waitUntilFinished: jest.fn().mockResolvedValue({ images: ['url'] }),
      };
      const mockQueue = (Queue as unknown as jest.Mock).mock.results[0]!.value;
      mockQueue.add.mockResolvedValue(mockJob);

      const directExecutor = jest.fn();
      await service.executeViaQueue(baseJobParams, directExecutor);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate',
        expect.objectContaining({
          operationType: 'generate',
          userId: 'user-123',
        }),
        expect.objectContaining({
          priority: 1,
        })
      );
      expect(directExecutor).not.toHaveBeenCalled();
    });

    it('dispatches with priority 10 for free plan', async () => {
      await service.initialize();

      const mockJob = {
        id: 'test-job-2',
        waitUntilFinished: jest.fn().mockResolvedValue({ images: ['url'] }),
      };
      const mockQueue = (Queue as unknown as jest.Mock).mock.results[0]!.value;
      mockQueue.add.mockResolvedValue(mockJob);

      const freeParams = { ...baseJobParams, planType: 'free' };
      const directExecutor = jest.fn();
      await service.executeViaQueue(freeParams, directExecutor);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate',
        expect.anything(),
        expect.objectContaining({
          priority: 10,
        })
      );
    });

    it('returns 503-like error when queue is full', async () => {
      await service.initialize();

      const mockQueue = (Queue as unknown as jest.Mock).mock.results[0]!.value;
      mockQueue.getWaitingCount.mockResolvedValue(500);

      const directExecutor = jest.fn();
      await expect(
        service.executeViaQueue(baseJobParams, directExecutor)
      ).rejects.toThrow(/queue is full/i);
    });

    it('falls back to directExecutor when queue.add throws', async () => {
      await service.initialize();

      const mockQueue = (Queue as unknown as jest.Mock).mock.results[0]!.value;
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.add.mockRejectedValue(new Error('Redis connection lost'));

      const directResult = { images: ['fallback.png'] };
      const directExecutor = jest.fn().mockResolvedValue(directResult);

      const result = await service.executeViaQueue(baseJobParams, directExecutor);

      expect(result).toEqual(directResult);
      expect(directExecutor).toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('returns false before initialization', () => {
      expect(service.isReady()).toBe(false);
    });

    it('returns true after initialization', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });

    it('returns false after shutdown', async () => {
      await service.initialize();
      await service.shutdown();
      expect(service.isReady()).toBe(false);
    });
  });
});
