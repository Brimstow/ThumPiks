// Mock prisma-factory — inline object to avoid hoisting issue with jest.mock
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

// Stable cloudinary mock shared across calls
const mockCloudinary: any = {
  uploadFromBuffer: jest.fn(),
  uploadFromUrl: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../storage/cloudinary.provider', () => ({
  getCloudinaryProvider: jest.fn(() => mockCloudinary),
}));

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-1234') }));

import { UserAssetService, getUserAssetService } from '../user-asset.service';

// Build a stable prisma mock and inject it via constructor
const mockPrisma: any = {
  userAsset: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
};

const mockAsset = {
  id: 'mock-uuid-1234',
  userId: 'user-abc',
  type: 'face',
  url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
  publicId: 'user-assets/user-abc/faces/test',
  name: 'profile.jpg',
  sizeBytes: 204800,
  mimeType: 'jpg',
  width: 400,
  height: 400,
  createdAt: new Date(),
};

const mockCloudinaryResult = {
  secureUrl: mockAsset.url,
  publicId: mockAsset.publicId,
  bytes: mockAsset.sizeBytes,
  format: 'jpg',
  width: 400,
  height: 400,
};

describe('UserAssetService', () => {
  let service: UserAssetService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (getUserAssetService as any).__instance = undefined;
    const mod = require('../user-asset.service');
    (mod as any).instance = null;

    service = new UserAssetService(mockPrisma);
    mockCloudinary.uploadFromBuffer.mockResolvedValue(mockCloudinaryResult);
    mockCloudinary.uploadFromUrl.mockResolvedValue(mockCloudinaryResult);
    mockCloudinary.delete.mockResolvedValue({ success: true });
    mockPrisma.userAsset.create.mockResolvedValue(mockAsset);
    mockPrisma.userAsset.findMany.mockResolvedValue([mockAsset]);
    mockPrisma.userAsset.findUnique.mockResolvedValue(mockAsset);
    mockPrisma.userAsset.delete.mockResolvedValue(mockAsset);
    mockPrisma.userAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: 204800 }, _count: 1 });
    mockPrisma.userAsset.groupBy.mockResolvedValue([{ type: 'face', _count: 2 }]);
  });

  describe('uploadAsset', () => {
    it('uploads buffer and creates DB record', async () => {
      const buf = Buffer.from('fake-image');
      const result = await service.uploadAsset({
        userId: 'user-abc',
        type: 'face',
        buffer: buf,
        name: 'profile.jpg',
        mimeType: 'image/jpeg',
      });

      expect(mockCloudinary.uploadFromBuffer).toHaveBeenCalledWith(
        buf,
        expect.objectContaining({
          folder: 'user-assets/user-abc/faces',
          tags: ['face', 'user-abc'],
        })
      );
      expect(mockPrisma.userAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: 'mock-uuid-1234',
          userId: 'user-abc',
          type: 'face',
          url: mockCloudinaryResult.secureUrl,
          publicId: mockCloudinaryResult.publicId,
          name: 'profile.jpg',
          mimeType: 'image/jpeg',
        }),
      });
      expect(result).toEqual(mockAsset);
    });

    it('uses cloudinary format when mimeType not provided', async () => {
      await service.uploadAsset({
        userId: 'user-abc',
        type: 'logo',
        buffer: Buffer.from('img'),
      });

      expect(mockPrisma.userAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ mimeType: 'jpg', name: null }),
      });
    });

    it('handles all asset types with correct folder', async () => {
      for (const type of ['face', 'background', 'logo', 'other'] as const) {
        mockCloudinary.uploadFromBuffer.mockClear();
        await service.uploadAsset({ userId: 'user-abc', type, buffer: Buffer.from('img') });
        expect(mockCloudinary.uploadFromBuffer).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({ folder: `user-assets/user-abc/${type}s` })
        );
      }
    });
  });

  describe('uploadAssetFromUrl', () => {
    it('uploads from URL and creates DB record', async () => {
      const result = await service.uploadAssetFromUrl({
        userId: 'user-abc',
        type: 'background',
        url: 'https://example.com/bg.jpg',
        name: 'background.jpg',
      });

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/bg.jpg',
        expect.objectContaining({ folder: 'user-assets/user-abc/backgrounds' })
      );
      expect(result).toEqual(mockAsset);
    });
  });

  describe('getAssetsByUser', () => {
    it('returns all assets for a user', async () => {
      const result = await service.getAssetsByUser('user-abc');
      expect(mockPrisma.userAsset.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-abc' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockAsset]);
    });

    it('filters by type when provided', async () => {
      await service.getAssetsByUser('user-abc', 'face');
      expect(mockPrisma.userAsset.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-abc', type: 'face' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getAssetById', () => {
    it('returns the asset', async () => {
      const result = await service.getAssetById('mock-uuid-1234');
      expect(mockPrisma.userAsset.findUnique).toHaveBeenCalledWith({
        where: { id: 'mock-uuid-1234' },
      });
      expect(result).toEqual(mockAsset);
    });
  });

  describe('deleteAsset', () => {
    it('deletes from cloudinary and DB', async () => {
      const result = await service.deleteAsset('mock-uuid-1234', 'user-abc');

      expect(mockCloudinary.delete).toHaveBeenCalledWith(mockAsset.publicId);
      expect(mockPrisma.userAsset.delete).toHaveBeenCalledWith({ where: { id: 'mock-uuid-1234' } });
      expect(result).toEqual({ success: true });
    });

    it('throws when asset not found', async () => {
      mockPrisma.userAsset.findUnique.mockResolvedValue(null);
      await expect(service.deleteAsset('bad-id', 'user-abc')).rejects.toThrow('Asset not found');
    });

    it('throws when user does not own asset', async () => {
      mockPrisma.userAsset.findUnique.mockResolvedValue({ ...mockAsset, userId: 'other-user' });
      await expect(service.deleteAsset('mock-uuid-1234', 'user-abc')).rejects.toThrow('Forbidden');
    });

    it('continues with DB delete even if cloudinary delete fails', async () => {
      mockCloudinary.delete.mockRejectedValue(new Error('CDN error'));
      const result = await service.deleteAsset('mock-uuid-1234', 'user-abc');
      expect(mockPrisma.userAsset.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('getStorageUsage', () => {
    it('returns total bytes and count', async () => {
      const result = await service.getStorageUsage('user-abc');
      expect(result).toEqual({ totalBytes: 204800, count: 1 });
    });

    it('returns 0 bytes when user has no assets', async () => {
      mockPrisma.userAsset.aggregate.mockResolvedValue({ _sum: { sizeBytes: null }, _count: 0 });
      const result = await service.getStorageUsage('user-abc');
      expect(result).toEqual({ totalBytes: 0, count: 0 });
    });
  });

  describe('getAssetCountByType', () => {
    it('returns count per type', async () => {
      const result = await service.getAssetCountByType('user-abc');
      expect(result).toEqual({ face: 2 });
    });

    it('returns empty object when no assets', async () => {
      mockPrisma.userAsset.groupBy.mockResolvedValue([]);
      const result = await service.getAssetCountByType('user-abc');
      expect(result).toEqual({});
    });
  });
});
