import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

const defaultPrisma = getPrisma();

export class UserUrlHistoryService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async upsertUrl(data: {
    userId: string;
    url: string;
    title?: string;
    platform?: string;
    thumbnailUrl?: string;
    selectedFrameTime?: number;
  }) {
    // Upsert: if same user+url exists, update it; otherwise create
    const existing = await this.prisma.userUrlHistory.findUnique({
      where: {
        userId_url: {
          userId: data.userId,
          url: data.url,
        },
      },
    });

    if (existing) {
      const updated = await this.prisma.userUrlHistory.update({
        where: { id: existing.id },
        data: {
          title: data.title ?? existing.title,
          platform: data.platform ?? existing.platform,
          thumbnailUrl: data.thumbnailUrl ?? existing.thumbnailUrl,
          selectedFrameTime:
            data.selectedFrameTime ?? existing.selectedFrameTime,
          createdAt: new Date(), // bump to top of recents
        },
      });
      logger.info('URL history updated', { entryId: updated.id, userId: data.userId });
      return updated;
    }

    // Enforce limit: keep last 50 total, evict oldest UNPINNED entry
    const count = await this.prisma.userUrlHistory.count({
      where: { userId: data.userId },
    });

    if (count >= 50) {
      const oldest = await this.prisma.userUrlHistory.findFirst({
        where: { userId: data.userId, pinned: false },
        orderBy: { createdAt: 'asc' },
      });
      if (oldest) {
        await this.prisma.userUrlHistory.delete({ where: { id: oldest.id } });
      }
    }

    const entry = await this.prisma.userUrlHistory.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        url: data.url,
        title: data.title || null,
        platform: data.platform || null,
        thumbnailUrl: data.thumbnailUrl || null,
        selectedFrameTime: data.selectedFrameTime || null,
      },
    });

    logger.info('URL history created', { entryId: entry.id, userId: data.userId });
    return entry;
  }

  async getHistory(userId: string, limit = 50) {
    return this.prisma.userUrlHistory.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  async deleteEntry(id: string, userId: string) {
    const entry = await this.prisma.userUrlHistory.findUnique({
      where: { id },
    });

    if (!entry) {
      throw new Error('Entry not found');
    }
    if (entry.userId !== userId) {
      throw new Error('Forbidden');
    }

    await this.prisma.userUrlHistory.delete({ where: { id } });
    return { success: true };
  }

  async togglePin(id: string, userId: string) {
    const entry = await this.prisma.userUrlHistory.findUnique({
      where: { id },
    });
    if (!entry) throw new Error('Entry not found');
    if (entry.userId !== userId) throw new Error('Forbidden');

    const updated = await this.prisma.userUrlHistory.update({
      where: { id },
      data: { pinned: !entry.pinned },
    });
    logger.info('URL pin toggled', { entryId: id, pinned: updated.pinned });
    return updated;
  }

  async bulkDelete(ids: string[], userId: string) {
    // Verify all entries belong to this user
    const entries = await this.prisma.userUrlHistory.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    const validIds = entries.map(e => e.id);
    if (validIds.length === 0) throw new Error('No valid entries found');

    const result = await this.prisma.userUrlHistory.deleteMany({
      where: { id: { in: validIds } },
    });
    logger.info('URL history bulk deleted', { count: result.count, userId });
    return { success: true, deletedCount: result.count };
  }

  async clearAll(userId: string, includePinned = false) {
    const where: { userId: string; pinned?: boolean } = { userId };
    if (!includePinned) where.pinned = false;

    const result = await this.prisma.userUrlHistory.deleteMany({ where });
    logger.info('URL history cleared', { count: result.count, userId, includePinned });
    return { success: true, deletedCount: result.count };
  }
}

// Singleton
let instance: UserUrlHistoryService | null = null;

export function getUserUrlHistoryService(): UserUrlHistoryService {
  if (!instance) {
    instance = new UserUrlHistoryService();
  }
  return instance;
}
