import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { getCloudinaryProvider } from '../storage/cloudinary.provider';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';

const defaultPrisma = getPrisma();

export class UserAssetService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  async uploadAsset(data: {
    userId: string;
    type: 'face' | 'background' | 'logo' | 'other';
    buffer: Buffer;
    name?: string;
    mimeType?: string;
  }) {
    const cloudinary = getCloudinaryProvider();

    const folder = `user-assets/${data.userId}/${data.type}s`;
    const result = await cloudinary.uploadFromBuffer(data.buffer, {
      folder,
      tags: [data.type, data.userId],
    });

    const asset = await this.prisma.userAsset.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        type: data.type,
        url: result.secureUrl,
        publicId: result.publicId,
        name: data.name || null,
        sizeBytes: result.bytes,
        mimeType: data.mimeType || result.format,
        width: result.width,
        height: result.height,
      },
    });

    logger.info('User asset uploaded', { assetId: asset.id, type: data.type, userId: data.userId });
    return asset;
  }

  async uploadAssetFromUrl(data: {
    userId: string;
    type: 'face' | 'background' | 'logo' | 'other';
    url: string;
    name?: string;
  }) {
    const cloudinary = getCloudinaryProvider();

    const folder = `user-assets/${data.userId}/${data.type}s`;
    const result = await cloudinary.uploadFromUrl(data.url, {
      folder,
      tags: [data.type, data.userId],
    });

    const asset = await this.prisma.userAsset.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        type: data.type,
        url: result.secureUrl,
        publicId: result.publicId,
        name: data.name || null,
        sizeBytes: result.bytes,
        mimeType: result.format,
        width: result.width,
        height: result.height,
      },
    });

    logger.info('User asset uploaded from URL', { assetId: asset.id, type: data.type, userId: data.userId });
    return asset;
  }

  async getAssetsByUser(userId: string, type?: string) {
    const where: Record<string, unknown> = { userId };
    if (type) {
      where.type = type;
    }

    return this.prisma.userAsset.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAssetById(id: string) {
    return this.prisma.userAsset.findUnique({ where: { id } });
  }

  async deleteAsset(id: string, userId: string) {
    const asset = await this.prisma.userAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new Error('Asset not found');
    }

    if (asset.userId !== userId) {
      throw new Error('Forbidden');
    }

    // Delete from Cloudinary
    try {
      const cloudinary = getCloudinaryProvider();
      await cloudinary.delete(asset.publicId);
      logger.info('Cloudinary asset deleted', { publicId: asset.publicId });
    } catch (err) {
      logger.warn('Cloudinary delete failed (asset may already be removed)', { error: String(err) });
    }

    // Delete from DB
    await this.prisma.userAsset.delete({ where: { id } });

    logger.info('User asset deleted', { assetId: id, userId });
    return { success: true };
  }

  async recategorizeAsset(
    id: string,
    newType: 'face' | 'background' | 'logo' | 'other',
    userId: string
  ) {
    const asset = await this.prisma.userAsset.findUnique({ where: { id } });

    if (!asset) {
      throw new Error('Asset not found');
    }
    if (asset.userId !== userId) {
      throw new Error('Forbidden');
    }

    const updated = await this.prisma.userAsset.update({
      where: { id },
      data: { type: newType },
    });

    logger.info('User asset recategorized', { assetId: id, newType });
    return updated;
  }

  async getStorageUsage(
    userId: string
  ): Promise<{ totalBytes: number; count: number }> {
    const result = await this.prisma.userAsset.aggregate({
      where: { userId },
      _sum: { sizeBytes: true },
      _count: true,
    });

    return {
      totalBytes: result._sum.sizeBytes || 0,
      count: result._count,
    };
  }

  async getAssetCountByType(userId: string): Promise<Record<string, number>> {
    const assets = await this.prisma.userAsset.groupBy({
      by: ['type'],
      where: { userId },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const a of assets) {
      counts[a.type] = a._count;
    }
    return counts;
  }
}

// Singleton
let instance: UserAssetService | null = null;

export function getUserAssetService(): UserAssetService {
  if (!instance) {
    instance = new UserAssetService();
  }
  return instance;
}
