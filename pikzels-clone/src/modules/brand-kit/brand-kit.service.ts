import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { getCloudinaryProvider } from '../storage/cloudinary.provider';
import { v4 as uuidv4 } from 'uuid';

const defaultPrisma = getPrisma();

// ============================================
// TYPES (matching frontend types.ts)
// ============================================

export interface FontWeight {
  weight: number;
  label: string;
  style: 'normal' | 'italic';
}

export interface BrandKitState {
  logos: any[];
  colorPalettes: any[];
  fonts: any[];
  brandVoice: any | null;
  photos: any[];
  graphics: any[];
  icons: any[];
  styles: any[];
  customCategories: any[];
}

// ============================================
// SERVICE
// ============================================

export class BrandKitService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || defaultPrisma;
  }

  // ── GET FULL BRAND KIT ────────────────────────────────────────────────

  async getBrandKit(userId: string): Promise<BrandKitState> {
    const [
      logos,
      colorPalettes,
      fonts,
      brandVoice,
      photos,
      graphics,
      icons,
      styles,
      customCategories,
    ] = await Promise.all([
      this.prisma.brandLogo.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandColorPalette.findMany({
        where: { userId },
        include: { colors: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandFont.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandVoice.findUnique({
        where: { userId },
      }),
      this.prisma.brandPhoto.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandGraphic.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandIcon.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandStylePreset.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brandCustomCategory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      logos,
      colorPalettes: colorPalettes.map(p => ({
        ...p,
        colors: p.colors,
      })),
      fonts: fonts.map(f => ({
        ...f,
        weights: f.weights as unknown as FontWeight[],
      })),
      brandVoice: brandVoice
        ? {
            ...brandVoice,
            keywords: brandVoice.keywords as unknown as string[],
            dos: brandVoice.dos as unknown as string[],
            donts: brandVoice.donts as unknown as string[],
          }
        : null,
      photos: photos.map(p => ({
        ...p,
        tags: p.tags as unknown as string[],
      })),
      graphics,
      icons,
      styles: styles.map(s => ({
        ...s,
        fontPairing: s.fontPairing as unknown as {
          heading: string;
          body: string;
        },
        colorScheme: s.colorScheme as unknown as string[],
      })),
      customCategories,
    };
  }

  // ── LOGOS ─────────────────────────────────────────────────────────────

  async addLogo(data: {
    userId: string;
    name: string;
    variant: string;
    isPrimary: boolean;
    fileType: string;
    imageData?: string;
    imageUrl?: string;
  }) {
    let url = '';
    let publicId: string | null = null;

    // Upload to Cloudinary if image data provided
    if (data.imageData || data.imageUrl) {
      const cloudinary = getCloudinaryProvider();
      const folder = `brand-kit/${data.userId}/logos`;

      if (data.imageData) {
        const matches = data.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches?.[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const result = await cloudinary.uploadFromBuffer(buffer, {
            folder,
            tags: ['brand-logo', data.userId],
          });
          url = result.secureUrl;
          publicId = result.publicId;
        }
      } else if (data.imageUrl) {
        const result = await cloudinary.uploadFromUrl(data.imageUrl, {
          folder,
          tags: ['brand-logo', data.userId],
        });
        url = result.secureUrl;
        publicId = result.publicId;
      }
    }

    // If first logo, set as primary
    const existingCount = await this.prisma.brandLogo.count({
      where: { userId: data.userId },
    });

    const logo = await this.prisma.brandLogo.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        url,
        publicId,
        variant: data.variant,
        isPrimary: existingCount === 0 || data.isPrimary,
        fileType: data.fileType,
      },
    });

    // If this is set as primary, unset others
    if (logo.isPrimary) {
      await this.prisma.brandLogo.updateMany({
        where: { userId: data.userId, id: { not: logo.id } },
        data: { isPrimary: false },
      });
    }

    return logo;
  }

  async updateLogo(
    id: string,
    userId: string,
    updates: Partial<{ name: string; variant: string; isPrimary: boolean }>
  ) {
    const logo = await this.prisma.brandLogo.findUnique({ where: { id } });
    if (logo?.userId !== userId) throw new Error('Logo not found');

    const updated = await this.prisma.brandLogo.update({
      where: { id },
      data: updates,
    });

    if (updates.isPrimary) {
      await this.prisma.brandLogo.updateMany({
        where: { userId, id: { not: id } },
        data: { isPrimary: false },
      });
    }

    return updated;
  }

  async deleteLogo(id: string, userId: string) {
    const logo = await this.prisma.brandLogo.findUnique({ where: { id } });
    if (logo?.userId !== userId) throw new Error('Logo not found');

    // Delete from Cloudinary
    if (logo.publicId) {
      try {
        const cloudinary = getCloudinaryProvider();
        await cloudinary.delete(logo.publicId);
      } catch (err) {
        console.warn('Cloudinary delete failed:', err);
      }
    }

    await this.prisma.brandLogo.delete({ where: { id } });
    return { success: true };
  }

  async setPrimaryLogo(id: string, userId: string) {
    return this.updateLogo(id, userId, { isPrimary: true });
  }

  // ── COLOR PALETTES ────────────────────────────────────────────────────

  async addColorPalette(data: {
    userId: string;
    name: string;
    isPrimary: boolean;
  }) {
    const existingCount = await this.prisma.brandColorPalette.count({
      where: { userId: data.userId },
    });

    const palette = await this.prisma.brandColorPalette.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        isPrimary: existingCount === 0 || data.isPrimary,
      },
      include: { colors: true },
    });

    return palette;
  }

  async updateColorPalette(
    id: string,
    userId: string,
    updates: Partial<{ name: string; isPrimary: boolean }>
  ) {
    const palette = await this.prisma.brandColorPalette.findUnique({
      where: { id },
    });
    if (palette?.userId !== userId) throw new Error('Palette not found');

    return this.prisma.brandColorPalette.update({
      where: { id },
      data: updates,
      include: { colors: true },
    });
  }

  async deleteColorPalette(id: string, userId: string) {
    const palette = await this.prisma.brandColorPalette.findUnique({
      where: { id },
    });
    if (palette?.userId !== userId) throw new Error('Palette not found');

    await this.prisma.brandColorPalette.delete({ where: { id } });
    return { success: true };
  }

  async addColorToPalette(
    paletteId: string,
    userId: string,
    color: { hex: string; name: string; role: string }
  ) {
    const palette = await this.prisma.brandColorPalette.findUnique({
      where: { id: paletteId },
    });
    if (palette?.userId !== userId) throw new Error('Palette not found');

    return this.prisma.brandColorSwatch.create({
      data: {
        id: uuidv4(),
        paletteId,
        hex: color.hex,
        name: color.name,
        role: color.role,
      },
    });
  }

  async removeColorFromPalette(colorId: string, userId: string) {
    const color = await this.prisma.brandColorSwatch.findUnique({
      where: { id: colorId },
      include: { Palette: true },
    });
    if (!color || color.Palette.userId !== userId)
      throw new Error('Color not found');

    await this.prisma.brandColorSwatch.delete({ where: { id: colorId } });
    return { success: true };
  }

  // ── FONTS ─────────────────────────────────────────────────────────────

  async addFont(data: {
    userId: string;
    name: string;
    fontFamily: string;
    weights: FontWeight[];
    role: string;
    previewText?: string;
  }) {
    return this.prisma.brandFont.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        fontFamily: data.fontFamily,
        weights: data.weights as unknown as any,
        role: data.role,
        previewText: data.previewText || 'Aa',
      },
    });
  }

  async updateFont(
    id: string,
    userId: string,
    updates: Partial<{
      name: string;
      fontFamily: string;
      weights: FontWeight[];
      role: string;
    }>
  ) {
    const font = await this.prisma.brandFont.findUnique({ where: { id } });
    if (font?.userId !== userId) throw new Error('Font not found');

    const prismaUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) prismaUpdates.name = updates.name;
    if (updates.fontFamily !== undefined)
      prismaUpdates.fontFamily = updates.fontFamily;
    if (updates.weights !== undefined)
      prismaUpdates.weights = updates.weights as unknown as any;
    if (updates.role !== undefined) prismaUpdates.role = updates.role;

    return this.prisma.brandFont.update({
      where: { id },
      data: prismaUpdates,
    });
  }

  async deleteFont(id: string, userId: string) {
    const font = await this.prisma.brandFont.findUnique({ where: { id } });
    if (font?.userId !== userId) throw new Error('Font not found');

    await this.prisma.brandFont.delete({ where: { id } });
    return { success: true };
  }

  // ── BRAND VOICE ───────────────────────────────────────────────────────

  async updateBrandVoice(
    userId: string,
    data: {
      tone?: string;
      description?: string;
      keywords?: string[];
      dos?: string[];
      donts?: string[];
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.tone !== undefined) updateData.tone = data.tone;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.keywords !== undefined) updateData.keywords = data.keywords;
    if (data.dos !== undefined) updateData.dos = data.dos;
    if (data.donts !== undefined) updateData.donts = data.donts;

    return this.prisma.brandVoice.upsert({
      where: { userId },
      update: updateData,
      create: {
        id: uuidv4(),
        userId,
        tone: data.tone || '',
        description: data.description || '',
        keywords: data.keywords || [],
        dos: data.dos || [],
        donts: data.donts || [],
      },
    });
  }

  async resetBrandVoice(userId: string) {
    await this.prisma.brandVoice.deleteMany({ where: { userId } });
    return { success: true };
  }

  // ── PHOTOS ────────────────────────────────────────────────────────────

  async addPhoto(data: {
    userId: string;
    name: string;
    category: string;
    tags?: string[];
    imageData?: string;
    imageUrl?: string;
  }) {
    let url = '';
    let publicId: string | null = null;
    let thumbnailUrl: string | null = null;

    if (data.imageData || data.imageUrl) {
      const cloudinary = getCloudinaryProvider();
      const folder = `brand-kit/${data.userId}/photos`;

      if (data.imageData) {
        const matches = data.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches?.[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const result = await cloudinary.uploadFromBuffer(buffer, {
            folder,
            tags: ['brand-photo', data.userId],
          });
          url = result.secureUrl;
          publicId = result.publicId;
          // Create thumbnail URL
          thumbnailUrl = url.replace('/upload/', '/upload/c_fill,h_150,w_150/');
        }
      } else if (data.imageUrl) {
        const result = await cloudinary.uploadFromUrl(data.imageUrl, {
          folder,
          tags: ['brand-photo', data.userId],
        });
        url = result.secureUrl;
        publicId = result.publicId;
        thumbnailUrl = url.replace('/upload/', '/upload/c_fill,h_150,w_150/');
      }
    }

    return this.prisma.brandPhoto.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        url,
        publicId,
        thumbnailUrl,
        tags: data.tags || [],
        category: data.category,
      },
    });
  }

  async updatePhoto(
    id: string,
    userId: string,
    updates: Partial<{ name: string; category: string; tags: string[] }>
  ) {
    const photo = await this.prisma.brandPhoto.findUnique({ where: { id } });
    if (photo?.userId !== userId) throw new Error('Photo not found');

    return this.prisma.brandPhoto.update({
      where: { id },
      data: updates,
    });
  }

  async deletePhoto(id: string, userId: string) {
    const photo = await this.prisma.brandPhoto.findUnique({ where: { id } });
    if (photo?.userId !== userId) throw new Error('Photo not found');

    if (photo.publicId) {
      try {
        const cloudinary = getCloudinaryProvider();
        await cloudinary.delete(photo.publicId);
      } catch (err) {
        console.warn('Cloudinary delete failed:', err);
      }
    }

    await this.prisma.brandPhoto.delete({ where: { id } });
    return { success: true };
  }

  // ── GRAPHICS ──────────────────────────────────────────────────────────

  async addGraphic(data: {
    userId: string;
    name: string;
    type: string;
    imageData?: string;
    imageUrl?: string;
  }) {
    let url = '';
    let publicId: string | null = null;
    let thumbnailUrl: string | null = null;

    if (data.imageData || data.imageUrl) {
      const cloudinary = getCloudinaryProvider();
      const folder = `brand-kit/${data.userId}/graphics`;

      if (data.imageData) {
        const matches = data.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (matches?.[2]) {
          const buffer = Buffer.from(matches[2], 'base64');
          const result = await cloudinary.uploadFromBuffer(buffer, {
            folder,
            tags: ['brand-graphic', data.userId],
          });
          url = result.secureUrl;
          publicId = result.publicId;
          thumbnailUrl = url.replace('/upload/', '/upload/c_fill,h_150,w_150/');
        }
      } else if (data.imageUrl) {
        const result = await cloudinary.uploadFromUrl(data.imageUrl, {
          folder,
          tags: ['brand-graphic', data.userId],
        });
        url = result.secureUrl;
        publicId = result.publicId;
        thumbnailUrl = url.replace('/upload/', '/upload/c_fill,h_150,w_150/');
      }
    }

    return this.prisma.brandGraphic.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        url,
        publicId,
        thumbnailUrl,
        type: data.type,
      },
    });
  }

  async updateGraphic(
    id: string,
    userId: string,
    updates: Partial<{ name: string; type: string }>
  ) {
    const graphic = await this.prisma.brandGraphic.findUnique({
      where: { id },
    });
    if (graphic?.userId !== userId) throw new Error('Graphic not found');

    return this.prisma.brandGraphic.update({
      where: { id },
      data: updates,
    });
  }

  async deleteGraphic(id: string, userId: string) {
    const graphic = await this.prisma.brandGraphic.findUnique({
      where: { id },
    });
    if (graphic?.userId !== userId) throw new Error('Graphic not found');

    if (graphic.publicId) {
      try {
        const cloudinary = getCloudinaryProvider();
        await cloudinary.delete(graphic.publicId);
      } catch (err) {
        console.warn('Cloudinary delete failed:', err);
      }
    }

    await this.prisma.brandGraphic.delete({ where: { id } });
    return { success: true };
  }

  // ── ICONS ─────────────────────────────────────────────────────────────

  async addIcon(data: {
    userId: string;
    name: string;
    svg: string;
    category: string;
  }) {
    return this.prisma.brandIcon.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        svg: data.svg,
        category: data.category,
      },
    });
  }

  async updateIcon(
    id: string,
    userId: string,
    updates: Partial<{ name: string; svg: string; category: string }>
  ) {
    const icon = await this.prisma.brandIcon.findUnique({ where: { id } });
    if (icon?.userId !== userId) throw new Error('Icon not found');

    return this.prisma.brandIcon.update({
      where: { id },
      data: updates,
    });
  }

  async deleteIcon(id: string, userId: string) {
    const icon = await this.prisma.brandIcon.findUnique({ where: { id } });
    if (icon?.userId !== userId) throw new Error('Icon not found');

    await this.prisma.brandIcon.delete({ where: { id } });
    return { success: true };
  }

  // ── STYLE PRESETS ─────────────────────────────────────────────────────

  async addStyle(data: {
    userId: string;
    name: string;
    previewUrl?: string;
    textPlacement?: string;
    overlayColor?: string;
    overlayOpacity?: number;
    fontPairing?: { heading: string; body: string };
    colorScheme?: string[];
  }) {
    return this.prisma.brandStylePreset.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        previewUrl: data.previewUrl ?? null,
        textPlacement: data.textPlacement || 'center',
        overlayColor: data.overlayColor || '#000000',
        overlayOpacity: data.overlayOpacity ?? 0.5,
        fontPairing: (data.fontPairing || {}) as unknown as any,
        colorScheme: data.colorScheme || [],
      },
    });
  }

  async updateStyle(
    id: string,
    userId: string,
    updates: Partial<{
      name: string;
      previewUrl: string;
      textPlacement: string;
      overlayColor: string;
      overlayOpacity: number;
      fontPairing: { heading: string; body: string };
      colorScheme: string[];
    }>
  ) {
    const style = await this.prisma.brandStylePreset.findUnique({
      where: { id },
    });
    if (style?.userId !== userId) throw new Error('Style not found');

    return this.prisma.brandStylePreset.update({
      where: { id },
      data: updates,
    });
  }

  async deleteStyle(id: string, userId: string) {
    const style = await this.prisma.brandStylePreset.findUnique({
      where: { id },
    });
    if (style?.userId !== userId) throw new Error('Style not found');

    await this.prisma.brandStylePreset.delete({ where: { id } });
    return { success: true };
  }

  // ── CUSTOM CATEGORIES ─────────────────────────────────────────────────

  async addCustomCategory(data: {
    userId: string;
    name: string;
    icon?: string;
    color?: string;
    bgColor?: string;
    borderColor?: string;
    textColor?: string;
    hoverColor?: string;
  }) {
    return this.prisma.brandCustomCategory.create({
      data: {
        id: uuidv4(),
        userId: data.userId,
        name: data.name,
        icon: data.icon || 'Folder',
        color: data.color || 'slate',
        bgColor: data.bgColor || 'bg-slate-500/10',
        borderColor: data.borderColor || 'border-slate-500/20',
        textColor: data.textColor || 'text-slate-400',
        hoverColor: data.hoverColor || 'group-hover:text-slate-300',
      },
    });
  }

  async deleteCustomCategory(id: string, userId: string) {
    const category = await this.prisma.brandCustomCategory.findUnique({
      where: { id },
    });
    if (category?.userId !== userId) throw new Error('Category not found');

    await this.prisma.brandCustomCategory.delete({ where: { id } });
    return { success: true };
  }
}

// Singleton
let instance: BrandKitService | null = null;

export function getBrandKitService(): BrandKitService {
  if (!instance) {
    instance = new BrandKitService();
  }
  return instance;
}
