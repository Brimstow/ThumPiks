import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TemplateService {
  /**
   * Create a new template
   */
  async createTemplate(data: {
    name: string;
    description?: string;
    thumbnailId: string;
    creatorId: string;
    parameters: any;
    tags: string[];
    isPublic?: boolean;
  }) {
    return prisma.template.create({
      data: {
        ...data,
        tags: JSON.stringify(data.tags),
        isPublic: data.isPublic ?? false
      },
      include: {
        thumbnail: true,
        creator: true
      }
    });
  }

  /**
   * Get templates with filtering and pagination
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
    const where: any = {};
    
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
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Apply tags filter
    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        path: '$',
        array_contains: JSON.stringify(filters.tags)
      };
    }
    
    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (filters?.sortBy) {
      const sortField = ['createdAt', 'downloads', 'likes'].includes(filters.sortBy) 
        ? filters.sortBy 
        : 'createdAt';
      orderBy = { [sortField]: filters.sortOrder || 'desc' };
    }
    
    // Handle pagination
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;
    
    const templates = await prisma.template.findMany({
      where,
      include: {
        thumbnail: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });
    
    // Parse tags from JSON
    return templates.map(template => ({
      ...template,
      tags: JSON.parse(template.tags as string)
    }));
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        thumbnail: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });
    
    if (!template) {
      return null;
    }
    
    return {
      ...template,
      tags: JSON.parse(template.tags as string)
    };
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: Partial<{
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
  }>) {
    const updateData: any = { ...data };
    
    // Handle tags update
    if (data.tags) {
      updateData.tags = JSON.stringify(data.tags);
    }
    
    const template = await prisma.template.update({
      where: { id },
      data: updateData,
      include: {
        thumbnail: true,
        creator: true
      }
    });
    
    return {
      ...template,
      tags: JSON.parse(template.tags as string)
    };
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string) {
    return prisma.template.delete({
      where: { id }
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
          increment: 1
        }
      }
    });
  }

  /**
   * Toggle template like
   */
  async toggleLike(id: string) {
    const template = await prisma.template.findUnique({
      where: { id },
      select: { likes: true }
    });
    
    if (!template) {
      throw new Error('Template not found');
    }
    
    return prisma.template.update({
      where: { id },
      data: {
        likes: {
          increment: 1
        }
      }
    });
  }
}