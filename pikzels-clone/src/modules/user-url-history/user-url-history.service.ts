import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { v4 as uuidv4 } from 'uuid';

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
          selectedFrameTime: data.selectedFrameTime ?? existing.selectedFrameTime,
          createdAt: new Date(), // bump to top of recents
        },
      });
      console.log(`🔗 URL history updated: ${updated.id} for user ${data.userId}`);
      return updated;
    }

    // Enforce limit: keep last 20, evict oldest
    const count = await this.prisma.userUrlHistory.count({
      where: { userId: data.userId },
    });

    if (count >= 20) {
      const oldest = await this.prisma.userUrlHistory.findFirst({
        where: { userId: data.userId },
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

    console.log(`🔗 URL history created: ${entry.id} for user ${data.userId}`);
    return entry;
  }

  async getHistory(userId: string, limit = 20) {
    return this.prisma.userUrlHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async deleteEntry(id: string, userId: string) {
    const entry = await this.prisma.userUrlHistory.findUnique({ where: { id } });

    if (!entry) {
      throw new Error('Entry not found');
    }
    if (entry.userId !== userId) {
      throw new Error('Forbidden');
    }

    await this.prisma.userUrlHistory.delete({ where: { id } });
    return { success: true };
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
