import { PrismaClient, CompositionLayout } from '@prisma/client';

const prisma = new PrismaClient();

export interface CompositionLayoutFilters {
  category?: string;
  search?: string;
  tags?: string[];
  isPublic?: boolean;
  builtIn?: boolean;
  creatorId?: string;
  sortBy?: 'popularity' | 'downloads' | 'likes' | 'createdAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateCompositionLayoutInput {
  name: string;
  description?: string;
  category: string;
  tags: string[];
  canvasWidth?: number;
  canvasHeight?: number;
  wireframeSvg: string;
  slots: any[];
  textSlots?: any[];
  fallbackBackground?: string;
  previewUrl?: string;
  isPublic?: boolean;
}

export class CompositionLayoutService {
  /**
   * Get layouts with filtering, sorting, and pagination
   */
  async getLayouts(filters: CompositionLayoutFilters = {}): Promise<CompositionLayout[]> {
    const {
      category,
      search,
      tags,
      isPublic = true,
      builtIn,
      creatorId,
      sortBy = 'popularity',
      sortOrder = 'desc',
      page = 1,
      limit = 50,
    } = filters;

    const where: any = {};

    if (isPublic !== undefined) where.isPublic = isPublic;
    if (builtIn !== undefined) where.builtIn = builtIn;
    if (category && category !== 'all') where.category = category;
    if (creatorId) where.creatorId = creatorId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Tag filtering — match layouts where tags JSON array contains any of the specified tags
    if (tags && tags.length > 0) {
      where.tags = { array_contains: tags };
    }

    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    return prisma.compositionLayout.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        User: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Get a single layout by ID
   */
  async getLayoutById(id: string): Promise<CompositionLayout | null> {
    return prisma.compositionLayout.findUnique({
      where: { id },
      include: {
        User: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Create a new user-made composition layout
   */
  async createLayout(
    creatorId: string,
    input: CreateCompositionLayoutInput
  ): Promise<CompositionLayout> {
    return prisma.compositionLayout.create({
      data: {
        name: input.name,
        description: input.description || null,
        category: input.category,
        tags: input.tags,
        canvasWidth: input.canvasWidth || 1920,
        canvasHeight: input.canvasHeight || 1080,
        wireframeSvg: input.wireframeSvg,
        slots: input.slots as any,
        textSlots: (input.textSlots || []) as any,
        fallbackBackground: input.fallbackBackground || null,
        previewUrl: input.previewUrl || null,
        isPublic: input.isPublic ?? true,
        builtIn: false,
        creatorId,
      },
      include: {
        User: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Update a layout (only creator or built-in admin can update)
   */
  async updateLayout(
    id: string,
    creatorId: string,
    updates: Partial<CreateCompositionLayoutInput>
  ): Promise<CompositionLayout | null> {
    const layout = await prisma.compositionLayout.findUnique({ where: { id } });
    if (!layout) return null;

    // Only the creator can update their own layouts (built-in layouts are not editable via API)
    if (layout.builtIn || layout.creatorId !== creatorId) return null;

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.description !== undefined) data.description = updates.description;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.tags !== undefined) data.tags = updates.tags;
    if (updates.wireframeSvg !== undefined) data.wireframeSvg = updates.wireframeSvg;
    if (updates.slots !== undefined) data.slots = updates.slots;
    if (updates.textSlots !== undefined) data.textSlots = updates.textSlots;
    if (updates.fallbackBackground !== undefined) data.fallbackBackground = updates.fallbackBackground;
    if (updates.previewUrl !== undefined) data.previewUrl = updates.previewUrl;
    if (updates.isPublic !== undefined) data.isPublic = updates.isPublic;
    if (updates.canvasWidth !== undefined) data.canvasWidth = updates.canvasWidth;
    if (updates.canvasHeight !== undefined) data.canvasHeight = updates.canvasHeight;

    return prisma.compositionLayout.update({
      where: { id },
      data,
      include: {
        User: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Delete a layout (only creator can delete; built-in layouts are protected)
   */
  async deleteLayout(id: string, creatorId: string): Promise<boolean> {
    const layout = await prisma.compositionLayout.findUnique({ where: { id } });
    if (!layout || layout.builtIn || layout.creatorId !== creatorId) return false;

    await prisma.compositionLayout.delete({ where: { id } });
    return true;
  }

  /**
   * Increment download count
   */
  async incrementDownloads(id: string): Promise<CompositionLayout> {
    return prisma.compositionLayout.update({
      where: { id },
      data: { downloads: { increment: 1 } },
    });
  }

  /**
   * Toggle like (simple increment/decrement for now)
   */
  async toggleLike(id: string, increment: boolean): Promise<CompositionLayout> {
    return prisma.compositionLayout.update({
      where: { id },
      data: { likes: { increment: increment ? 1 : -1 } },
    });
  }

  /**
   * Upsert a built-in layout (used by seed script)
   */
  async upsertBuiltIn(layout: {
    id: string;
    name: string;
    description: string;
    category: string;
    tags: string[];
    canvasWidth: number;
    canvasHeight: number;
    wireframeSvg: string;
    slots: any[];
    textSlots: any[];
    fallbackBackground?: string;
    popularity: number;
  }): Promise<CompositionLayout> {
    return prisma.compositionLayout.upsert({
      where: { id: layout.id },
      update: {
        name: layout.name,
        description: layout.description,
        category: layout.category,
        tags: layout.tags,
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight,
        wireframeSvg: layout.wireframeSvg,
        slots: layout.slots as any,
        textSlots: layout.textSlots as any,
        fallbackBackground: layout.fallbackBackground || null,
        popularity: layout.popularity,
      },
      create: {
        id: layout.id,
        name: layout.name,
        description: layout.description,
        category: layout.category,
        tags: layout.tags,
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight,
        wireframeSvg: layout.wireframeSvg,
        slots: layout.slots as any,
        textSlots: layout.textSlots as any,
        fallbackBackground: layout.fallbackBackground || null,
        popularity: layout.popularity,
        builtIn: true,
        isPublic: true,
        creatorId: null,
      },
    });
  }
}
