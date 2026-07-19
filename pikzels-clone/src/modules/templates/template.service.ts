import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { isProductionLike } from '../../utils/env';
import { TemplateParametersSchema, TemplateTagsSchema } from './types';
import {
  validateJsonColumn,
  safeParseJsonColumn,
} from '../../utils/json-validation';

const prisma = getPrisma();
const isTestEnv = process.env.NODE_ENV === 'test';
const isProdEnv = isProductionLike();

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    thumbnailId: string;
    creatorId: string;
    parameters: Record<string, unknown>;
    tags: string[];
    isPublic?: boolean;
  }) {
    // Validate JSON columns before writing
    validateJsonColumn(
      TemplateParametersSchema,
      data.parameters,
      'Template.parameters'
    );
    validateJsonColumn(TemplateTagsSchema, data.tags, 'Template.tags');

    return prisma.template.create({
      data: {
        id: uuidv4(),
        ...data,
        parameters: data.parameters as never,
        tags: JSON.stringify(data.tags),
        isPublic: data.isPublic ?? false,
        updatedAt: new Date(),
      },
      include: {
        Thumbnail: true,
      },
    });
  }

  /**
   * Get templates with filtering and pagination
   * Returns real data from database, or mock data in test/dev environments
   */
  async getTemplates(filters?: {
    search?: string;
    tags?: string[];
    isPublic?: boolean;
    creatorId?: string;
    sortBy?: 'createdAt' | 'downloads' | 'likes';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    // In test environment, always use mock data (no DB dependency)
    if (isTestEnv) {
      return this.getMockTemplates(filters);
    }

    const where: Record<string, unknown> = {};

    // Apply public filter
    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    // Apply creator filter
    if (filters?.creatorId) {
      where.creatorId = filters.creatorId;
    }

    // Apply search filter (name or description)
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Apply tags filter
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        path: '$',
        array_contains: JSON.stringify(filters.tags),
      };
    }

    // Build orderBy clause
    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (filters?.sortBy) {
      const sortField = ['createdAt', 'downloads', 'likes'].includes(
        filters.sortBy
      )
        ? filters.sortBy
        : 'createdAt';
      orderBy = { [sortField]: filters.sortOrder || 'desc' };
    }

    // Handle pagination
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    try {
      const templates = await prisma.template.findMany({
        where,
        include: {
          Thumbnail: true,
          User: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      });

      // Parse and validate tags from JSON
      return templates.map(template => ({
        ...template,
        tags: safeParseJsonColumn(
          TemplateTagsSchema,
          (() => {
            try {
              return JSON.parse(template.tags as string);
            } catch {
              return template.tags;
            }
          })(),
          'Template.tags'
        ),
      }));
    } catch (error) {
      // In non-production environments, fall back to mock data if DB access fails
      if (!isProdEnv) {
        logger.warn(
          '🎭 DEMO MODE: TemplateService falling back to mock templates',
          error as Error
        );
        return this.getMockTemplates(filters);
      }

      // In production, surface the error (no silent mock data)
      throw error;
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        Thumbnail: true,
        User: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!template) {
      return null;
    }

    return {
      ...template,
      tags: safeParseJsonColumn(
        TemplateTagsSchema,
        (() => {
          try {
            return JSON.parse(template.tags as string);
          } catch {
            return template.tags;
          }
        })(),
        'Template.tags'
      ),
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      tags: string[];
      isPublic: boolean;
    }>
  ) {
    const updateData: Record<string, unknown> = { ...data };

    // Handle tags update with validation
    if (data.tags) {
      validateJsonColumn(TemplateTagsSchema, data.tags, 'Template.tags');
      updateData.tags = JSON.stringify(data.tags);
    }

    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        Thumbnail: true,
      },
    });

    return {
      ...template,
      tags: safeParseJsonColumn(
        TemplateTagsSchema,
        (() => {
          try {
            return JSON.parse(template.tags as string);
          } catch {
            return template.tags;
          }
        })(),
        'Template.tags'
      ),
    };
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    return prisma.template.delete({
      where: { id },
    });
  }

  /**
   * Increment template download count
   */
  async incrementDownloads(id: string) {
    return prisma.template.update({
      where: { id },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Toggle template like
   */
  async toggleLike(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
      select: { likes: true },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    return prisma.template.update({
      where: { id },
      data: {
        likes: {
          increment: 1,
        },
      },
    });
  }

  /**
   * Environment-aware mock templates for development/test/demo
   * Returned shape is compatible with getTemplates consumers.
   */
  private getMockTemplates(filters?: {
    search?: string;
    tags?: string[];
    isPublic?: boolean;
    creatorId?: string;
    sortBy?: 'createdAt' | 'downloads' | 'likes';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const now = new Date();

    const mockTemplates = [
      {
        id: 'tmpl_mock_1',
        name: 'Neon Cyberpunk Gaming Pack',
        description:
          'High-energy purple neon layout designed for gaming highlight thumbnails.',
        thumbnailId: 'thumb_mock_1',
        creatorId: 'user_mock_1',
        parameters: {},
        tags: ['gaming', 'neon', 'purple'],
        isPublic: true,
        downloads: 1234,
        likes: 150,
        createdAt: now,
        updatedAt: now,
        Thumbnail: {
          id: 'thumb_mock_1',
          title: 'Neon Cyberpunk Gaming Pack',
          imageUrl:
            'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop',
        },
        User: {
          id: 'user_mock_1',
          name: 'Demo Creator',
          avatarUrl: '/default-avatar.png',
        },
      },
      {
        id: 'tmpl_mock_2',
        name: 'Minimal Tech Review',
        description:
          'Clean layout ideal for product review and tech commentary thumbnails.',
        thumbnailId: 'thumb_mock_2',
        creatorId: 'user_mock_2',
        parameters: {},
        tags: ['tech', 'minimal', 'review'],
        isPublic: true,
        downloads: 845,
        likes: 92,
        createdAt: now,
        updatedAt: now,
        Thumbnail: {
          id: 'thumb_mock_2',
          title: 'Minimal Tech Review',
          imageUrl:
            'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop',
        },
        User: {
          id: 'user_mock_2',
          name: 'RetroKing',
          avatarUrl: '/default-avatar.png',
        },
      },
      {
        id: 'tmpl_mock_3',
        name: 'Vlog Cinematic Overlay',
        description:
          'Professional vlog layout with cinematic feel for lifestyle content.',
        thumbnailId: 'thumb_mock_3',
        creatorId: 'user_mock_1',
        parameters: {},
        tags: ['vlog', 'cinematic', 'lifestyle'],
        isPublic: true,
        downloads: 2156,
        likes: 312,
        createdAt: now,
        updatedAt: now,
        Thumbnail: {
          id: 'thumb_mock_3',
          title: 'Vlog Cinematic Overlay',
          imageUrl:
            'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=1200&auto=format&fit=crop',
        },
        User: {
          id: 'user_mock_1',
          name: 'Demo Creator',
          avatarUrl: '/default-avatar.png',
        },
      },
    ];

    let results = [...mockTemplates];

    // Simple in-memory filters to roughly match real API behavior
    if (filters?.isPublic !== undefined) {
      results = results.filter(t => t.isPublic === filters.isPublic);
    }

    if (filters?.creatorId) {
      results = results.filter(t => t.creatorId === filters.creatorId);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(t =>
        filters.tags!.every(tag => t.tags.includes(tag))
      );
    }

    // Sort (default by createdAt desc)
    const sorted = [...results];
    const sortField: 'createdAt' | 'downloads' | 'likes' =
      filters?.sortBy &&
      ['createdAt', 'downloads', 'likes'].includes(filters.sortBy)
        ? (filters.sortBy as 'createdAt' | 'downloads' | 'likes')
        : 'createdAt';
    const sortOrder = filters?.sortOrder === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];

      if (av < bv) return -1 * sortOrder;
      if (av > bv) return 1 * sortOrder;
      return 0;
    });

    // Pagination
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const start = (page - 1) * limit;

    return sorted.slice(start, start + limit);
  }
}
