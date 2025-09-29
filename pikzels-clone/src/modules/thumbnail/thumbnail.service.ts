import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ThumbnailService {
  async createThumbnail(data: {
    title: string;
    imageUrl: string;
    prompt: string;
    parameters: any;
    projectId: string;
    userId: string;
  }) {
    return prisma.thumbnail.create({
      data
    });
  }

  async getThumbnailsByUser(
    userId: string, 
    filters?: {
      search?: string;
      projectId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      style?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    // Build where clause for filtering
    const where: any = { userId };
    
    // Apply project filter
    if (filters?.projectId) {
      where.projectId = filters.projectId;
    }
    
    // Apply search filter (title or prompt)
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { prompt: { contains: filters.search, mode: 'insensitive' } }
      ];
    }
    
    // Apply date range filter
    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }
    
    // Apply style filter (from parameters)
    if (filters?.style) {
      where.parameters = {
        path: ['style'],
        equals: filters.style
      };
    }
    
    // Build orderBy clause for sorting
    let orderBy: any = { createdAt: 'desc' }; // default sort
    if (filters?.sortBy) {
      // Map allowed sort fields to prevent injection
      const allowedSortFields = ['createdAt', 'title', 'prompt'];
      const sortField = allowedSortFields.includes(filters.sortBy) ? filters.sortBy : 'createdAt';
      orderBy = { [sortField]: filters.sortOrder || 'desc' };
    }
    
    return prisma.thumbnail.findMany({
      where,
      include: {
        project: true
      },
      orderBy
    });
  }

  async getThumbnailById(id: string) {
    return prisma.thumbnail.findUnique({
      where: { id },
      include: {
        project: true
      }
    });
  }

  async updateThumbnail(id: string, data: Partial<{
    title: string;
    imageUrl: string;
    prompt: string;
    parameters: any;
  }>) {
    return prisma.thumbnail.update({
      where: { id },
      data
    });
  }

  async deleteThumbnail(id: string) {
    return prisma.thumbnail.delete({
      where: { id }
    });
  }

  async setThumbnailAsFeatured(thumbnailId: string, projectId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await prisma.thumbnail.findUnique({
      where: { id: thumbnailId }
    });

    if (!thumbnail || thumbnail.projectId !== projectId) {
      throw new Error('Thumbnail does not belong to this project');
    }

    // Set this thumbnail as featured for the project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        featuredThumbnailId: thumbnailId
      }
    });

    return thumbnail;
  }
}