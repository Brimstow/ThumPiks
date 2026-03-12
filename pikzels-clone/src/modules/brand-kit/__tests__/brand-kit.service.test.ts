// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

const mockCloudinary = {
  uploadFromBuffer: jest.fn(),
  uploadFromUrl: jest.fn(),
  delete: jest.fn(),
};

jest.mock('../../storage/cloudinary.provider', () => ({
  getCloudinaryProvider: jest.fn(() => mockCloudinary),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid'),
}));

// ── Imports (after mocks) ────────────────────────────────────────────

import { BrandKitService, getBrandKitService } from '../brand-kit.service';

// ── Mock Prisma Factory ──────────────────────────────────────────────

function createMockPrisma() {
  return {
    brandLogo: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    brandColorPalette: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandColorSwatch: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    brandFont: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandVoice: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    brandPhoto: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandGraphic: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandIcon: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandStylePreset: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brandCustomCategory: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  } as any;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('BrandKitService', () => {
  let service: BrandKitService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new BrandKitService(mockPrisma);
  });

  // ── getBrandKit ────────────────────────────────────────────────────

  describe('getBrandKit', () => {
    it('queries all 9 asset tables and returns combined state', async () => {
      const result = await service.getBrandKit('user-1');

      expect(mockPrisma.brandLogo.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrisma.brandVoice.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({
        logos: [],
        colorPalettes: [],
        fonts: [],
        brandVoice: null,
        photos: [],
        graphics: [],
        icons: [],
        styles: [],
        customCategories: [],
      });
    });

    it('coerces JSON fields (weights, keywords, tags, fontPairing)', async () => {
      mockPrisma.brandFont.findMany.mockResolvedValue([
        {
          id: 'f1',
          weights: [{ weight: 400, label: 'Regular', style: 'normal' }],
        },
      ]);
      mockPrisma.brandVoice.findUnique.mockResolvedValue({
        userId: 'user-1',
        keywords: ['bold'],
        dos: ['be clear'],
        donts: ['be vague'],
      });
      mockPrisma.brandPhoto.findMany.mockResolvedValue([
        { id: 'p1', tags: ['hero', 'product'] },
      ]);
      mockPrisma.brandStylePreset.findMany.mockResolvedValue([
        {
          id: 's1',
          fontPairing: { heading: 'Inter', body: 'Roboto' },
          colorScheme: ['#fff'],
        },
      ]);

      const result = await service.getBrandKit('user-1');

      expect(result.fonts[0]!.weights).toEqual([
        { weight: 400, label: 'Regular', style: 'normal' },
      ]);
      expect(result.brandVoice!.keywords).toEqual(['bold']);
      expect(result.photos[0]!.tags).toEqual(['hero', 'product']);
      expect(result.styles[0]!.fontPairing).toEqual({
        heading: 'Inter',
        body: 'Roboto',
      });
    });
  });

  // ── Logos ──────────────────────────────────────────────────────────

  describe('addLogo', () => {
    it('uploads base64 image to Cloudinary', async () => {
      const base64 = 'data:image/png;base64,iVBORw0KGgo=';
      mockCloudinary.uploadFromBuffer.mockResolvedValue({
        secureUrl: 'https://cdn.test/logo.png',
        publicId: 'brand-kit/user-1/logos/abc',
      });
      mockPrisma.brandLogo.create.mockResolvedValue({
        id: 'test-uuid',
        isPrimary: true,
      });

      await service.addLogo({
        userId: 'user-1',
        name: 'Main Logo',
        variant: 'full',
        isPrimary: true,
        fileType: 'png',
        imageData: base64,
      });

      expect(mockCloudinary.uploadFromBuffer).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({ folder: 'brand-kit/user-1/logos' })
      );
      expect(mockPrisma.brandLogo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'https://cdn.test/logo.png',
          publicId: 'brand-kit/user-1/logos/abc',
        }),
      });
    });

    it('uploads from URL to Cloudinary', async () => {
      mockCloudinary.uploadFromUrl.mockResolvedValue({
        secureUrl: 'https://cdn.test/logo.png',
        publicId: 'pub-id',
      });
      mockPrisma.brandLogo.create.mockResolvedValue({
        id: 'test-uuid',
        isPrimary: true,
      });

      await service.addLogo({
        userId: 'user-1',
        name: 'Logo',
        variant: 'icon',
        isPrimary: false,
        fileType: 'svg',
        imageUrl: 'https://example.com/logo.svg',
      });

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/logo.svg',
        expect.objectContaining({ folder: 'brand-kit/user-1/logos' })
      );
    });

    it('sets first logo as primary regardless of isPrimary flag', async () => {
      mockPrisma.brandLogo.count.mockResolvedValue(0);
      mockPrisma.brandLogo.create.mockResolvedValue({
        id: 'test-uuid',
        isPrimary: true,
      });

      await service.addLogo({
        userId: 'user-1',
        name: 'Logo',
        variant: 'full',
        isPrimary: false,
        fileType: 'png',
      });

      expect(mockPrisma.brandLogo.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPrimary: true }),
      });
    });

    it('unsets other logos when new logo is primary', async () => {
      mockPrisma.brandLogo.count.mockResolvedValue(2);
      mockPrisma.brandLogo.create.mockResolvedValue({
        id: 'test-uuid',
        isPrimary: true,
      });

      await service.addLogo({
        userId: 'user-1',
        name: 'Logo',
        variant: 'full',
        isPrimary: true,
        fileType: 'png',
      });

      expect(mockPrisma.brandLogo.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { not: 'test-uuid' } },
        data: { isPrimary: false },
      });
    });
  });

  describe('updateLogo', () => {
    it('updates and unsets others when setting primary', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue({
        id: 'logo-1',
        userId: 'user-1',
      });
      mockPrisma.brandLogo.update.mockResolvedValue({
        id: 'logo-1',
        isPrimary: true,
      });

      await service.updateLogo('logo-1', 'user-1', { isPrimary: true });

      expect(mockPrisma.brandLogo.update).toHaveBeenCalledWith({
        where: { id: 'logo-1' },
        data: { isPrimary: true },
      });
      expect(mockPrisma.brandLogo.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', id: { not: 'logo-1' } },
        data: { isPrimary: false },
      });
    });

    it('throws when logo belongs to different user', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue({
        id: 'logo-1',
        userId: 'other-user',
      });

      await expect(
        service.updateLogo('logo-1', 'user-1', { name: 'X' })
      ).rejects.toThrow('Logo not found');
    });
  });

  describe('deleteLogo', () => {
    it('deletes from Cloudinary and database', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue({
        id: 'logo-1',
        userId: 'user-1',
        publicId: 'brand-kit/user-1/logos/abc',
      });

      const result = await service.deleteLogo('logo-1', 'user-1');

      expect(mockCloudinary.delete).toHaveBeenCalledWith(
        'brand-kit/user-1/logos/abc'
      );
      expect(mockPrisma.brandLogo.delete).toHaveBeenCalledWith({
        where: { id: 'logo-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('skips Cloudinary when no publicId', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue({
        id: 'logo-1',
        userId: 'user-1',
        publicId: null,
      });

      await service.deleteLogo('logo-1', 'user-1');

      expect(mockCloudinary.delete).not.toHaveBeenCalled();
      expect(mockPrisma.brandLogo.delete).toHaveBeenCalled();
    });

    it('continues database deletion when Cloudinary fails', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue({
        id: 'logo-1',
        userId: 'user-1',
        publicId: 'pub-id',
      });
      mockCloudinary.delete.mockRejectedValue(new Error('CDN error'));

      const result = await service.deleteLogo('logo-1', 'user-1');

      expect(mockPrisma.brandLogo.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('throws when logo not found', async () => {
      mockPrisma.brandLogo.findUnique.mockResolvedValue(null);

      await expect(service.deleteLogo('logo-1', 'user-1')).rejects.toThrow(
        'Logo not found'
      );
    });
  });

  // ── Color Palettes ────────────────────────────────────────────────

  describe('addColorPalette', () => {
    it('sets first palette as primary', async () => {
      mockPrisma.brandColorPalette.count.mockResolvedValue(0);
      mockPrisma.brandColorPalette.create.mockResolvedValue({
        id: 'test-uuid',
      });

      await service.addColorPalette({
        userId: 'user-1',
        name: 'Brand Colors',
        isPrimary: false,
      });

      expect(mockPrisma.brandColorPalette.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isPrimary: true }),
        include: { colors: true },
      });
    });
  });

  describe('addColorToPalette', () => {
    it('verifies palette ownership before adding color', async () => {
      mockPrisma.brandColorPalette.findUnique.mockResolvedValue({
        id: 'pal-1',
        userId: 'user-1',
      });
      mockPrisma.brandColorSwatch.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addColorToPalette('pal-1', 'user-1', {
        hex: '#FF0000',
        name: 'Red',
        role: 'primary',
      });

      expect(mockPrisma.brandColorSwatch.create).toHaveBeenCalledWith({
        data: {
          id: 'test-uuid',
          paletteId: 'pal-1',
          hex: '#FF0000',
          name: 'Red',
          role: 'primary',
        },
      });
    });

    it('throws when palette belongs to different user', async () => {
      mockPrisma.brandColorPalette.findUnique.mockResolvedValue({
        id: 'pal-1',
        userId: 'other-user',
      });

      await expect(
        service.addColorToPalette('pal-1', 'user-1', {
          hex: '#000',
          name: 'X',
          role: 'accent',
        })
      ).rejects.toThrow('Palette not found');
    });
  });

  describe('removeColorFromPalette', () => {
    it('verifies ownership via palette relation', async () => {
      mockPrisma.brandColorSwatch.findUnique.mockResolvedValue({
        id: 'color-1',
        Palette: { userId: 'user-1' },
      });

      const result = await service.removeColorFromPalette('color-1', 'user-1');

      expect(mockPrisma.brandColorSwatch.delete).toHaveBeenCalledWith({
        where: { id: 'color-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('throws when color palette belongs to different user', async () => {
      mockPrisma.brandColorSwatch.findUnique.mockResolvedValue({
        id: 'color-1',
        Palette: { userId: 'other-user' },
      });

      await expect(
        service.removeColorFromPalette('color-1', 'user-1')
      ).rejects.toThrow('Color not found');
    });
  });

  // ── Fonts ─────────────────────────────────────────────────────────

  describe('addFont', () => {
    it('creates font with uuid and defaults previewText', async () => {
      mockPrisma.brandFont.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addFont({
        userId: 'user-1',
        name: 'Heading',
        fontFamily: 'Inter',
        weights: [{ weight: 700, label: 'Bold', style: 'normal' }],
        role: 'heading',
      });

      expect(mockPrisma.brandFont.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fontFamily: 'Inter',
          previewText: 'Aa',
          role: 'heading',
        }),
      });
    });
  });

  describe('updateFont', () => {
    it('only updates provided fields', async () => {
      mockPrisma.brandFont.findUnique.mockResolvedValue({
        id: 'f1',
        userId: 'user-1',
      });
      mockPrisma.brandFont.update.mockResolvedValue({ id: 'f1' });

      await service.updateFont('f1', 'user-1', { name: 'New Name' });

      expect(mockPrisma.brandFont.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { name: 'New Name' },
      });
    });

    it('throws when font belongs to different user', async () => {
      mockPrisma.brandFont.findUnique.mockResolvedValue({
        id: 'f1',
        userId: 'other',
      });

      await expect(
        service.updateFont('f1', 'user-1', { name: 'X' })
      ).rejects.toThrow('Font not found');
    });
  });

  // ── Brand Voice ───────────────────────────────────────────────────

  describe('updateBrandVoice', () => {
    it('upserts brand voice with provided fields', async () => {
      mockPrisma.brandVoice.upsert.mockResolvedValue({ userId: 'user-1' });

      await service.updateBrandVoice('user-1', {
        tone: 'professional',
        keywords: ['quality', 'innovation'],
      });

      expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { tone: 'professional', keywords: ['quality', 'innovation'] },
        create: expect.objectContaining({
          userId: 'user-1',
          tone: 'professional',
          keywords: ['quality', 'innovation'],
          dos: [],
          donts: [],
        }),
      });
    });

    it('defaults empty strings/arrays in create path', async () => {
      mockPrisma.brandVoice.upsert.mockResolvedValue({ userId: 'user-1' });

      await service.updateBrandVoice('user-1', {});

      expect(mockPrisma.brandVoice.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            tone: '',
            description: '',
            keywords: [],
            dos: [],
            donts: [],
          }),
        })
      );
    });
  });

  describe('resetBrandVoice', () => {
    it('deletes all brand voice entries for user', async () => {
      mockPrisma.brandVoice.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.resetBrandVoice('user-1');

      expect(mockPrisma.brandVoice.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ── Photos ────────────────────────────────────────────────────────

  describe('addPhoto', () => {
    it('generates thumbnail URL from Cloudinary upload', async () => {
      mockCloudinary.uploadFromBuffer.mockResolvedValue({
        secureUrl:
          'https://res.cloudinary.com/x/image/upload/v1/brand-kit/photo.jpg',
        publicId: 'brand-kit/user-1/photos/abc',
      });
      mockPrisma.brandPhoto.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addPhoto({
        userId: 'user-1',
        name: 'Hero',
        category: 'hero',
        tags: ['main'],
        imageData: 'data:image/jpeg;base64,/9j/4AAQ=',
      });

      expect(mockPrisma.brandPhoto.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          thumbnailUrl:
            'https://res.cloudinary.com/x/image/upload/c_fill,h_150,w_150/v1/brand-kit/photo.jpg',
          tags: ['main'],
        }),
      });
    });
  });

  describe('deletePhoto', () => {
    it('deletes from Cloudinary and database', async () => {
      mockPrisma.brandPhoto.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'user-1',
        publicId: 'pub-id',
      });

      await service.deletePhoto('p1', 'user-1');

      expect(mockCloudinary.delete).toHaveBeenCalledWith('pub-id');
      expect(mockPrisma.brandPhoto.delete).toHaveBeenCalledWith({
        where: { id: 'p1' },
      });
    });

    it('throws when photo belongs to different user', async () => {
      mockPrisma.brandPhoto.findUnique.mockResolvedValue({
        id: 'p1',
        userId: 'other',
      });

      await expect(service.deletePhoto('p1', 'user-1')).rejects.toThrow(
        'Photo not found'
      );
    });
  });

  // ── Graphics ──────────────────────────────────────────────────────

  describe('addGraphic', () => {
    it('uploads from URL and creates record', async () => {
      mockCloudinary.uploadFromUrl.mockResolvedValue({
        secureUrl: 'https://res.cloudinary.com/x/image/upload/v1/graphic.png',
        publicId: 'pub-id',
      });
      mockPrisma.brandGraphic.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addGraphic({
        userId: 'user-1',
        name: 'Divider',
        type: 'decorative',
        imageUrl: 'https://example.com/graphic.png',
      });

      expect(mockPrisma.brandGraphic.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'decorative',
          thumbnailUrl: expect.stringContaining('c_fill,h_150,w_150'),
        }),
      });
    });
  });

  describe('deleteGraphic', () => {
    it('throws when graphic belongs to different user', async () => {
      mockPrisma.brandGraphic.findUnique.mockResolvedValue({
        id: 'g1',
        userId: 'other',
      });

      await expect(service.deleteGraphic('g1', 'user-1')).rejects.toThrow(
        'Graphic not found'
      );
    });
  });

  // ── Icons ─────────────────────────────────────────────────────────

  describe('addIcon', () => {
    it('stores SVG directly without Cloudinary', async () => {
      mockPrisma.brandIcon.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addIcon({
        userId: 'user-1',
        name: 'Arrow',
        svg: '<svg>...</svg>',
        category: 'navigation',
      });

      expect(mockCloudinary.uploadFromBuffer).not.toHaveBeenCalled();
      expect(mockPrisma.brandIcon.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          svg: '<svg>...</svg>',
          category: 'navigation',
        }),
      });
    });
  });

  describe('deleteIcon', () => {
    it('deletes from database without Cloudinary', async () => {
      mockPrisma.brandIcon.findUnique.mockResolvedValue({
        id: 'i1',
        userId: 'user-1',
      });

      const result = await service.deleteIcon('i1', 'user-1');

      expect(mockCloudinary.delete).not.toHaveBeenCalled();
      expect(mockPrisma.brandIcon.delete).toHaveBeenCalledWith({
        where: { id: 'i1' },
      });
      expect(result).toEqual({ success: true });
    });
  });

  // ── Style Presets ─────────────────────────────────────────────────

  describe('addStyle', () => {
    it('applies default values for optional fields', async () => {
      mockPrisma.brandStylePreset.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addStyle({ userId: 'user-1', name: 'Clean' });

      expect(mockPrisma.brandStylePreset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          textPlacement: 'center',
          overlayColor: '#000000',
          overlayOpacity: 0.5,
          colorScheme: [],
        }),
      });
    });

    it('uses provided values when given', async () => {
      mockPrisma.brandStylePreset.create.mockResolvedValue({ id: 'test-uuid' });

      await service.addStyle({
        userId: 'user-1',
        name: 'Bold',
        overlayOpacity: 0.8,
        colorScheme: ['#FF0000', '#00FF00'],
        fontPairing: { heading: 'Inter', body: 'Roboto' },
      });

      expect(mockPrisma.brandStylePreset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overlayOpacity: 0.8,
          colorScheme: ['#FF0000', '#00FF00'],
        }),
      });
    });
  });

  describe('deleteStyle', () => {
    it('throws when style belongs to different user', async () => {
      mockPrisma.brandStylePreset.findUnique.mockResolvedValue({
        id: 's1',
        userId: 'other',
      });

      await expect(service.deleteStyle('s1', 'user-1')).rejects.toThrow(
        'Style not found'
      );
    });
  });

  // ── Custom Categories ─────────────────────────────────────────────

  describe('addCustomCategory', () => {
    it('applies default styling when not provided', async () => {
      mockPrisma.brandCustomCategory.create.mockResolvedValue({
        id: 'test-uuid',
      });

      await service.addCustomCategory({ userId: 'user-1', name: 'Templates' });

      expect(mockPrisma.brandCustomCategory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icon: 'Folder',
          color: 'slate',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/20',
        }),
      });
    });
  });

  describe('deleteCustomCategory', () => {
    it('deletes category after ownership check', async () => {
      mockPrisma.brandCustomCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        userId: 'user-1',
      });

      const result = await service.deleteCustomCategory('cat-1', 'user-1');

      expect(mockPrisma.brandCustomCategory.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('throws when category belongs to different user', async () => {
      mockPrisma.brandCustomCategory.findUnique.mockResolvedValue({
        id: 'cat-1',
        userId: 'other',
      });

      await expect(
        service.deleteCustomCategory('cat-1', 'user-1')
      ).rejects.toThrow('Category not found');
    });
  });

  // ── Singleton ─────────────────────────────────────────────────────

  describe('getBrandKitService', () => {
    it('returns the same instance on repeated calls', () => {
      const a = getBrandKitService();
      const b = getBrandKitService();
      expect(a).toBe(b);
    });
  });
});
