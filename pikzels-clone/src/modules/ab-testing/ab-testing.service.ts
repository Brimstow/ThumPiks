import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { CacheService } from '../../services/cache.service';
import {
  ABTestCreate,
  ABTestResult,
  ABTestVariantStats,
  ABTestServiceDependencies,
} from './types';

export class ABTestingService {
  private prisma: PrismaClient;
  private cache: CacheService;

  constructor(dependencies: ABTestServiceDependencies = {}) {
    this.prisma = dependencies.prisma || getPrisma();
    this.cache = dependencies.cache || CacheService.getInstance();
  }

  /**
   * Create a new A/B test with variants.
   */
  async createTest(userId: string, data: ABTestCreate): Promise<ABTestResult> {
    if (!data.variants || data.variants.length < 2) {
      throw new Error('At least 2 variants are required');
    }

    if (data.variants.length > 5) {
      throw new Error('Maximum 5 variants allowed');
    }

    // Ensure at least one control variant
    const hasControl = data.variants.some(v => v.isControl);
    if (!hasControl) {
      data.variants[0]!.isControl = true;
    }

    const test = await this.prisma.aBTest.create({
      data: {
        id: uuidv4(),
        name: data.name,
        description: data.description || null,
        userId,
        status: 'draft',
        variants: {
          create: data.variants.map(v => ({
            id: uuidv4(),
            name: v.name,
            thumbnailId: v.thumbnailId,
            isControl: v.isControl || false,
          })),
        },
      },
      include: {
        variants: {
          include: {
            Thumbnail: true,
          },
        },
      },
    });

    return this.formatTestResult(test);
  }

  /**
   * Get all tests for a user.
   */
  async getUserTests(userId: string): Promise<ABTestResult[]> {
    const cacheKey = `abtests:user:${userId}`;

    const fetchFn = async () => {
      const tests = await this.prisma.aBTest.findMany({
        where: { userId },
        include: {
          variants: {
            include: {
              Thumbnail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return tests.map(t => this.formatTestResult(t));
    };

    return this.cache.getOrSet(cacheKey, fetchFn, 60);
  }

  /**
   * Get a single test with full stats.
   */
  async getTest(testId: string, userId: string): Promise<ABTestResult> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, userId },
      include: {
        variants: {
          include: {
            Thumbnail: true,
          },
        },
      },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    return this.formatTestResult(test);
  }

  /**
   * Start an A/B test (set to active).
   */
  async startTest(testId: string, userId: string): Promise<ABTestResult> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status === 'active') {
      throw new Error('Test is already active');
    }

    if (test.status === 'completed') {
      throw new Error('Cannot restart a completed test');
    }

    const updated = await this.prisma.aBTest.update({
      where: { id: testId },
      data: { status: 'active', startDate: new Date() },
      include: {
        variants: {
          include: {
            Thumbnail: true,
          },
        },
      },
    });

    await this.invalidateUserCache(userId);
    return this.formatTestResult(updated);
  }

  /**
   * Pause a running test.
   */
  async pauseTest(testId: string, userId: string): Promise<ABTestResult> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status !== 'active') {
      throw new Error('Only active tests can be paused');
    }

    const updated = await this.prisma.aBTest.update({
      where: { id: testId },
      data: { status: 'paused' },
      include: {
        variants: {
          include: {
            Thumbnail: true,
          },
        },
      },
    });

    await this.invalidateUserCache(userId);
    return this.formatTestResult(updated);
  }

  /**
   * Complete a test and determine the winner.
   */
  async completeTest(testId: string, userId: string): Promise<ABTestResult> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status === 'completed') {
      throw new Error('Test is already completed');
    }

    const updated = await this.prisma.aBTest.update({
      where: { id: testId },
      data: { status: 'completed', endDate: new Date() },
      include: {
        variants: {
          include: {
            Thumbnail: true,
          },
        },
      },
    });

    await this.invalidateUserCache(userId);
    return this.formatTestResult(updated);
  }

  /**
   * Record an impression or click for a variant.
   */
  async recordEvent(
    testId: string,
    variantId: string,
    userId: string,
    action: 'impression' | 'click'
  ): Promise<void> {
    // Verify test is active
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, status: 'active' },
    });

    if (!test) {
      throw new Error('Test not found or not active');
    }

    // Record impression
    await this.prisma.aBTestImpression.create({
      data: {
        id: uuidv4(),
        testId,
        variantId,
        userId,
        action,
      },
    });

    // Update variant counters
    if (action === 'impression') {
      await this.prisma.aBTestVariant.update({
        where: { id: variantId },
        data: { impressions: { increment: 1 } },
      });
    } else if (action === 'click') {
      await this.prisma.aBTestVariant.update({
        where: { id: variantId },
        data: { clicks: { increment: 1 } },
      });
    }

    // Recalculate CTR
    const variant = await this.prisma.aBTestVariant.findUnique({
      where: { id: variantId },
    });

    if (variant && variant.impressions > 0) {
      const ctr = variant.clicks / variant.impressions;
      await this.prisma.aBTestVariant.update({
        where: { id: variantId },
        data: { ctr },
      });
    }
  }

  /**
   * Delete a test (only draft or completed tests).
   */
  async deleteTest(testId: string, userId: string): Promise<void> {
    const test = await this.prisma.aBTest.findFirst({
      where: { id: testId, userId },
    });

    if (!test) {
      throw new Error('Test not found');
    }

    if (test.status === 'active') {
      throw new Error(
        'Cannot delete an active test. Pause or complete it first.'
      );
    }

    await this.prisma.aBTest.delete({ where: { id: testId } });
    await this.invalidateUserCache(userId);
  }

  private async invalidateUserCache(userId: string): Promise<void> {
    await this.cache.set(`abtests:user:${userId}`, null, 0);
  }

  private formatTestResult(test: Record<string, unknown>): ABTestResult {
    const variants: ABTestVariantStats[] = (
      (test.variants as unknown[]) || []
    ).map((v: unknown) => {
      const variant = v as {
        id: string;
        name: string;
        thumbnailId: string;
        Thumbnail?: { imageUrl?: string };
        impressions: number;
        clicks: number;
        ctr: number;
        isControl: boolean;
      };
      return {
        id: variant.id,
        name: variant.name,
        thumbnailId: variant.thumbnailId,
        thumbnailUrl: (variant.Thumbnail?.imageUrl || null) as string,
        impressions: variant.impressions,
        clicks: variant.clicks,
        ctr: variant.ctr,
        isControl: variant.isControl,
      };
    });

    const totalImpressions = variants.reduce(
      (sum, v) => sum + v.impressions,
      0
    );
    const totalClicks = variants.reduce((sum, v) => sum + v.clicks, 0);

    // Determine winner: variant with highest CTR (needs minimum impressions)
    const eligibleVariants = variants.filter(v => v.impressions >= 10);
    const winner =
      eligibleVariants.length > 0
        ? eligibleVariants.reduce((best, v) => (v.ctr > best.ctr ? v : best))
        : null;

    return {
      id: test.id as string,
      name: test.name as string,
      description: test.description as string | null,
      status: test.status as string,
      startDate:
        (test.startDate as Date | null | undefined)?.toISOString() ?? null,
      endDate: (test.endDate as Date | null | undefined)?.toISOString() ?? null,
      createdAt: (test.createdAt as Date).toISOString(),
      variants,
      totalImpressions,
      totalClicks,
      winner,
    };
  }
}
