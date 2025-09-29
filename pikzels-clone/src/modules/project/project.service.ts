import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProjectService {
  async createProject(data: {
    name: string;
    description?: string;
    userId: string;
  }) {
    return prisma.project.create({
      data
    });
  }

  async getProjectsByUser(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        featuredThumbnail: true
      }
    });
  }

  async getProjectById(id: string) {
    return prisma.project.findUnique({
      where: { id },
      include: {
        featuredThumbnail: true,
        thumbnails: {
          take: 5, // Get the 5 most recent thumbnails
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  }

  async updateProject(id: string, data: Partial<{
    name: string;
    description?: string;
    featuredThumbnailId?: string;
  }>) {
    return prisma.project.update({
      where: { id },
      data
    });
  }

  async deleteProject(id: string) {
    return prisma.project.delete({
      where: { id }
    });
  }

  async setFeaturedThumbnail(projectId: string, thumbnailId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await prisma.thumbnail.findUnique({
      where: { id: thumbnailId }
    });

    if (!thumbnail || thumbnail.projectId !== projectId) {
      throw new Error('Thumbnail does not belong to this project');
    }

    // Update the project with the featured thumbnail
    return prisma.project.update({
      where: { id: projectId },
      data: {
        featuredThumbnailId: thumbnailId
      }
    });
  }
}