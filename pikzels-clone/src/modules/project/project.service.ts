import { PrismaClient } from '@prisma/client';
import { CacheService } from '../../services/cache.service';
import { v4 as uuidv4 } from 'uuid';

// Default instances for production use
const defaultPrisma = new PrismaClient();
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
      select: { projectPath: true }
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
      select: { depth: true }
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
      select: { depth: true, folderType: true }
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

  async getProjectsByUser(userId: string) {
    const cacheKey = `projects:user:${userId}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        return this.prisma.project.findMany({
          where: { userId },
          orderBy: {
            createdAt: 'desc',
          },
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
    // Get project info for cache invalidation
    const existingProject = await this.prisma.project.findUnique({
      where: { id },
      select: { userId: true },
    });

    const project = await this.prisma.project.delete({
      where: { id },
    });

    // Invalidate caches
    await this.cache.del(`project:${id}`);
    if (existingProject) {
      await this.cache.del(`projects:user:${existingProject.userId}`);
    }

    return project;
  }

  async setFeaturedThumbnail(projectId: string, thumbnailId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await this.prisma.thumbnail.findUnique({
      where: { id: thumbnailId },
    });

    if (!thumbnail || thumbnail.projectId !== projectId) {
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
          orderBy: [
            { depth: 'asc' },
            { name: 'asc' }
          ],
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
            _count: {
              select: {
                other_Project: true,
                Thumbnail_Thumbnail_projectIdToProject: true
              }
            }
          },
        });
        
        // Build tree structure
        const projectMap = new Map();
        const rootProjects: any[] = [];
        
        // First pass: create map of all projects
        allProjects.forEach(project => {
          projectMap.set(project.id, {
            ...project,
            children: []
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
            { name: 'asc' }
          ],
          include: {
            Thumbnail_Project_featuredThumbnailIdToThumbnail: true,
            _count: {
              select: {
                other_Project: true,
                Thumbnail_Thumbnail_projectIdToProject: true
              }
            }
          }
        });
      },
      300
    );
  }
  
  /**
   * Get project breadcrumb path
   */
  async getProjectBreadcrumb(projectId: string): Promise<Array<{id: string, name: string, folderType: string}>> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, folderType: true, parentProjectId: true }
    });
    
    if (!project) return [];
    
    const breadcrumb = [{
      id: project.id,
      name: project.name,
      folderType: project.folderType
    }];
    
    if (project.parentProjectId) {
      const parentBreadcrumb = await this.getProjectBreadcrumb(project.parentProjectId);
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
        projectPath: newPath
      }
    });
    
    // Invalidate relevant caches
    const projectInfo = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { userId: true }
    });
    
    if (projectInfo) {
      await this.cache.del(`projects:tree:${projectInfo.userId}`);
      await this.cache.del(`projects:user:${projectInfo.userId}`);
    }
    
    return project;
  }
}
