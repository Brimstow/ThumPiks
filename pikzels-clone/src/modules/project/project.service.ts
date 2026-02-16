import { PrismaClient } from '@prisma/client';
import { CacheService } from '../../services/cache.service';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../utils/prisma-factory';

// Default instances for production use
const defaultPrisma = getPrisma();
const defaultCache = CacheService.getInstance();

export interface ProjectServiceDependencies {
  prisma?: PrismaClient;
  cache?: CacheService;
}

export class ProjectService {
  private prisma: PrismaClient;
  private cache: CacheService;

  constructor(dependencies: ProjectServiceDependencies = {}) {
    this.prisma = dependencies.prisma || defaultPrisma;
    this.cache = dependencies.cache || defaultCache;
  }
  // 🏗️ HIERARCHY HELPER METHODS

  /**
   * Generate project path for efficient hierarchy queries
   * Example: "/root-id/sub1-id/sub2-id"
   */
  private async generateProjectPath(parentProjectId?: string): Promise<string> {
    if (!parentProjectId) {
      return '/'; // Root project
    }

    const parentProject = await this.prisma.project.findUnique({
      where: { id: parentProjectId },
      select: { projectPath: true },
    });

    return `${parentProject?.projectPath || '/'}${parentProjectId}/`;
  }

  /**
   * Calculate project depth based on parent
   */
  private async calculateDepth(parentProjectId?: string): Promise<number> {
    if (!parentProjectId) {
      return 0; // Root project
    }

    const parentProject = await this.prisma.project.findUnique({
      where: { id: parentProjectId },
      select: { depth: true },
    });

    return (parentProject?.depth || 0) + 1;
  }

  /**
   * Validate hierarchy rules (max depth = 2 for 3-level structure)
   */
  private async validateHierarchy(
    parentProjectId?: string,
    folderType: 'project' | 'folder' = 'project'
  ): Promise<void> {
    if (!parentProjectId) return; // Root projects are always valid

    const parentProject = await this.prisma.project.findUnique({
      where: { id: parentProjectId },
      select: { depth: true, folderType: true },
    });

    if (!parentProject) {
      throw new Error('Parent project not found');
    }

    // 3-level structure: Root (0) -> Sub-Project (1) -> Thumbnails (2)
    if (parentProject.depth >= 2) {
      throw new Error('Maximum nesting depth of 3 levels exceeded');
    }

    // Only projects can contain sub-projects
    if (parentProject.folderType === 'folder' && folderType === 'project') {
      throw new Error('Folders cannot contain sub-projects');
    }
  }

  async createProject(data: {
    name: string;
    description?: string;
    userId: string;
    // 🏗️ NEW HIERARCHY FIELDS
    parentProjectId?: string;
    folderType?: 'project' | 'folder';
  }) {
    const folderType = data.folderType || 'project';

    // Validate hierarchy rules
    await this.validateHierarchy(data.parentProjectId, folderType);

    // Calculate depth and path
    const depth = await this.calculateDepth(data.parentProjectId);
    const projectPath = await this.generateProjectPath(data.parentProjectId);

    const project = await this.prisma.project.create({
      data: {
        id: uuidv4(),
        name: data.name,
        description: data.description || null,
        userId: data.userId,
        parentProjectId: data.parentProjectId || null,
        folderType,
        depth,
        projectPath,
        updatedAt: new Date(),
      },
    });

    // Invalidate related caches
    await this.cache.del(`projects:user:${data.userId}`);
    await this.cache.del(`projects:tree:${data.userId}`);
    if (data.parentProjectId) {
      await this.cache.del(`projects:children:${data.parentProjectId}`);
    }

    return project;
  }

  async getProjectsByUser(
    userId: string,
    filters?: {
      searchTerm?: string;
      category?: string;
      type?: 'project' | 'folder' | 'all';
      sortBy?: 'name' | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      isArchived?: boolean;
    }
  ) {
    const cacheKey = `projects:user:${userId}:${JSON.stringify(filters || {})}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Build where clause
        const where: any = { userId };

        // Apply filters
        if (filters?.searchTerm) {
          where.OR = [
            { name: { contains: filters.searchTerm, mode: 'insensitive' } },
            {
              description: {
                contains: filters.searchTerm,
                mode: 'insensitive',
              },
            },
          ];
        }

        if (filters?.category && filters.category !== 'all') {
          where.category = filters.category;
        }

        if (filters?.type && filters.type !== 'all') {
          where.folderType = filters.type;
        }

        if (filters?.isArchived !== undefined) {
          where.isArchived = filters.isArchived;
        }

        // Build orderBy clause
        const orderBy: any = {};
        if (filters?.sortBy) {
          orderBy[filters.sortBy] = filters.sortOrder || 'desc';
        } else {
          orderBy.createdAt = 'desc';
        }

        return this.prisma.project.findMany({
          where,
          orderBy,
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
          },
        });
      },
      300 // Cache for 5 minutes
    );
  }

  async getProjectById(id: string) {
    const cacheKey = `project:${id}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.project.findUnique({
          where: { id },
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
            Thumbnail_Thumbnail_projectIdToProject: {
              take: 5, // Get the 5 most recent thumbnails
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });
      },
      600 // Cache for 10 minutes
    );
  }

  async updateProject(
    id: string,
    data: Partial<{
      name: string;
      description?: string;
      featuredThumbnailId?: string;
    }>
  ) {
    // Get project info for cache invalidation
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });

    const project = await this.prisma.project.update({
      where: { id },
      data,
    });

    // Invalidate caches
    await this.cache.del(`project:${id}`);
    if (existingProject) {
      await this.cache.del(`projects:user:${existingProject.userId}`);
    }

    return project;
  }

  async deleteProject(id: string) {
    // Get project info for cache invalidation and to verify existence
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true, featuredThumbnailId: true },
    });

    if (!existingProject) {
      throw new Error('Project not found');
    }

    // Use a transaction to clean up ALL dependent records before deleting.
    // Without this, Prisma throws foreign key constraint errors because:
    //   - Thumbnail.projectId → Project.id (no onDelete cascade)
    //   - Project.parentProjectId → Project.id (no onDelete cascade for children)
    //   - SocialShare/Template/ABTestVariant → Thumbnail.id (no onDelete cascade)
    await this.prisma.$transaction(async tx => {
      // 1. Get all thumbnail IDs belonging to this project
      const thumbnails = await tx.thumbnail.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const thumbnailIds = thumbnails.map((t: { id: string }) => t.id);

      // 2. Clear featuredThumbnailId on THIS project (self-referencing FK)
      if (existingProject.featuredThumbnailId) {
        await tx.project.update({
          where: { id },
          data: { featuredThumbnailId: null },
        });
      }

      if (thumbnailIds.length > 0) {
        // 3. Clear featuredThumbnailId on ANY OTHER project that features
        //    one of our thumbnails (the unique FK would block thumbnail deletion)
        await tx.project.updateMany({
          where: {
            featuredThumbnailId: { in: thumbnailIds },
            id: { not: id },
          },
          data: { featuredThumbnailId: null },
        });

        // 4. Delete SocialShares referencing our thumbnails
        await tx.socialShare.deleteMany({
          where: { thumbnailId: { in: thumbnailIds } },
        });

        // 5. Delete Templates referencing our thumbnails
        await tx.template.deleteMany({
          where: { thumbnailId: { in: thumbnailIds } },
        });

        // 6. Delete ABTestVariants referencing our thumbnails
        //    (ABTestImpressions cascade automatically via onDelete: Cascade)
        await tx.aBTestVariant.deleteMany({
          where: { thumbnailId: { in: thumbnailIds } },
        });

        // 7. Delete all Thumbnails belonging to this project
        await tx.thumbnail.deleteMany({
          where: { projectId: id },
        });
      }

      // 8. Reassign child projects to root level (orphan them)
      //    so their parentProjectId FK doesn't block our deletion
      await tx.project.updateMany({
        where: { parentProjectId: id },
        data: { parentProjectId: null, depth: 0, projectPath: '/' },
      });

      // 9. Finally delete the project itself
      await tx.project.delete({
        where: { id },
      });
    });

    // Invalidate ALL cache layers after successful deletion.
    // There are multiple cache key formats used across the codebase:
    //   - Middleware cache keys: "api:${userId}:${path}:${base64query}"
    //   - Service cache keys:   "projects:user:${userId}:${JSON.stringify(filters)}"
    //   - Individual project:   "project:${id}"
    //   - Projects tree:        "projects:tree:${userId}"
    //   - Children cache:       "projects:children:${id}"
    // We must nuke ALL of them or stale data will reappear in the UI.

    const userId = existingProject.userId;

    // 1. Exact service-level keys
    await this.cache.del(`project:${id}`);
    await this.cache.del(`projects:tree:${userId}`);
    await this.cache.del(`projects:children:${id}`);

    // 2. Pattern-based invalidation for service-level keys (covers all filter combos)
    await this.cache.delPattern(`projects:user:${userId}*`);

    // 3. Pattern-based invalidation for middleware-level keys (covers GET /api/projects)
    await this.cache.delPattern(`api:${userId}:*`);

    return { success: true };
  }

  /**
   * Duplicate a project (creates a copy with "(Copy)" suffix)
   */
  async duplicateProject(id: string, userId: string) {
    // Get original project
    const originalProject = await this.prisma.project.findUnique({
      where: { id },
      select: {
        name: true,
        description: true,
        userId: true,
        parentProjectId: true,
        folderType: true,
      },
    });

    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Verify ownership
    if (originalProject.userId !== userId) {
      throw new Error('You do not have permission to duplicate this project');
    }

    // Create duplicate with "(Copy)" suffix
    const duplicateName = `${originalProject.name} (Copy)`;

    // Validate hierarchy if has parent
    if (originalProject.parentProjectId) {
      const folderType = originalProject.folderType as 'project' | 'folder';
      await this.validateHierarchy(originalProject.parentProjectId, folderType);
    }

    const depth = await this.calculateDepth(
      originalProject.parentProjectId || undefined
    );
    const projectPath = await this.generateProjectPath(
      originalProject.parentProjectId || undefined
    );

    const duplicateProject = await this.prisma.project.create({
      data: {
        id: uuidv4(),
        name: duplicateName,
        description: originalProject.description,
        userId: originalProject.userId,
        parentProjectId: originalProject.parentProjectId,
        folderType: originalProject.folderType,
        depth,
        projectPath,
        updatedAt: new Date(),
      },
    });

    // Invalidate caches
    await this.cache.del(`projects:user:${userId}`);
    await this.cache.del(`projects:tree:${userId}`);
    if (originalProject.parentProjectId) {
      await this.cache.del(
        `projects:children:${originalProject.parentProjectId}`
      );
    }

    return duplicateProject;
  }

  /**
   * Archive a project (soft delete)
   */
  async archiveProject(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('You do not have permission to archive this project');
    }

    const archivedProject = await this.prisma.project.update({
      where: { id },
      data: { isArchived: true, updatedAt: new Date() },
    });

    // Invalidate caches
    await this.cache.del(`project:${id}`);
    await this.cache.del(`projects:user:${userId}`);
    await this.cache.del(`projects:tree:${userId}`);

    return archivedProject;
  }

  /**
   * Unarchive a project
   */
  async unarchiveProject(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.userId !== userId) {
      throw new Error('You do not have permission to unarchive this project');
    }

    const unarchivedProject = await this.prisma.project.update({
      where: { id },
      data: { isArchived: false, updatedAt: new Date() },
    });

    // Invalidate caches
    await this.cache.del(`project:${id}`);
    await this.cache.del(`projects:user:${userId}`);
    await this.cache.del(`projects:tree:${userId}`);

    return unarchivedProject;
  }

  async setFeaturedThumbnail(projectId: string, thumbnailId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await this.prisma.thumbnail.findUnique({
      where: { id: thumbnailId },
    });

    if (thumbnail?.projectId !== projectId) {
      throw new Error('Thumbnail does not belong to this project');
    }

    // Update the project with the featured thumbnail
    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        featuredThumbnailId: thumbnailId,
      },
    });

    // Invalidate project cache
    await this.cache.del(`project:${projectId}`);

    // Get user ID for invalidating user projects cache
    const projectInfo = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (projectInfo) {
      await this.cache.del(`projects:user:${projectInfo.userId}`);
    }

    return project;
  }

  // 🏗️ HIERARCHY-SPECIFIC METHODS

  /**
   * Get projects in hierarchical tree structure
   */
  async getProjectsTree(userId: string) {
    const cacheKey = `projects:tree:${userId}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Get all projects for the user
        const allProjects = await this.prisma.project.findMany({
          where: { userId },
          orderBy: [{ depth: 'asc' }, { name: 'asc' }],
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
            _count: {
              select: {
                other_Project: true,
                Thumbnail_Thumbnail_projectIdToProject: true,
              },
            },
          },
        });

        console.log('DEBUG: All projects fetched:', allProjects.length);
        console.log(
          'DEBUG: Projects with parent IDs:',
          allProjects.filter(p => p.parentProjectId).length
        );
        console.log('DEBUG: Projects by depth:', {
          depth0: allProjects.filter(p => p.depth === 0).length,
          depth1: allProjects.filter(p => p.depth === 1).length,
          depth2: allProjects.filter(p => p.depth === 2).length,
        });

        // Build tree structure
        const projectMap = new Map();
        const rootProjects: any[] = [];

        // First pass: create map of all projects
        allProjects.forEach(project => {
          projectMap.set(project.id, {
            ...project,
            children: [],
          });
        });

        // Second pass: build tree
        allProjects.forEach(project => {
          if (project.parentProjectId) {
            const parent = projectMap.get(project.parentProjectId);
            if (parent) {
              parent.children.push(projectMap.get(project.id));
            }
          } else {
            rootProjects.push(projectMap.get(project.id));
          }
        });

        console.log('DEBUG: Root projects count:', rootProjects.length);
        console.log(
          'DEBUG: Sample root project:',
          rootProjects[0]
            ? {
                id: rootProjects[0].id,
                name: rootProjects[0].name,
                childrenCount: rootProjects[0].children?.length || 0,
              }
            : 'No root projects'
        );

        return rootProjects;
      },
      300 // Cache for 5 minutes
    );
  }

  /**
   * Get direct children of a project
   */
  async getProjectChildren(parentProjectId: string) {
    const cacheKey = `projects:children:${parentProjectId}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.project.findMany({
          where: { parentProjectId },
          orderBy: [
            { folderType: 'asc' }, // Projects first, then folders
            { name: 'asc' },
          ],
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
            _count: {
              select: {
                other_Project: true,
                Thumbnail_Thumbnail_projectIdToProject: true,
              },
            },
          },
        });
      },
      300
    );
  }

  /**
   * Get project breadcrumb path
   */
  async getProjectBreadcrumb(
    projectId: string
  ): Promise<Array<{ id: string; name: string; folderType: string }>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, folderType: true, parentProjectId: true },
    });

    if (!project) return [];

    const breadcrumb = [
      {
        id: project.id,
        name: project.name,
        folderType: project.folderType,
      },
    ];

    if (project.parentProjectId) {
      const parentBreadcrumb = await this.getProjectBreadcrumb(
        project.parentProjectId
      );
      return [...parentBreadcrumb, ...breadcrumb];
    }

    return breadcrumb;
  }

  /**
   * Move project to different parent (with validation)
   */
  async moveProject(projectId: string, newParentId?: string) {
    // Validate the move won't create cycles or exceed depth
    if (newParentId) {
      await this.validateHierarchy(newParentId, 'project');

      // Check for circular reference
      const breadcrumb = await this.getProjectBreadcrumb(newParentId);
      if (breadcrumb.some(item => item.id === projectId)) {
        throw new Error('Cannot move project: would create circular reference');
      }
    }

    const newDepth = await this.calculateDepth(newParentId);
    const newPath = await this.generateProjectPath(newParentId);

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        parentProjectId: newParentId || null,
        depth: newDepth,
        projectPath: newPath,
      },
    });

    // Invalidate relevant caches
    const projectInfo = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true },
    });

    if (projectInfo) {
      await this.cache.del(`projects:tree:${projectInfo.userId}`);
      await this.cache.del(`projects:user:${projectInfo.userId}`);
    }

    return project;
  }
}
