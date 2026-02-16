import { Response } from 'express';
import { ProjectService } from './project.service';
import { AuthRequest } from '../../types/auth';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';

// Create shared instances that can be overridden for testing
let sharedPrisma: PrismaClient;
let sharedProjectService: ProjectService;

// Initialize services (can be overridden in tests)
export const initializeProjectServices = (
  prismaClient?: PrismaClient,
  cacheService?: any
) => {
  sharedPrisma = prismaClient || getPrisma();
  sharedProjectService = new ProjectService({
    prisma: sharedPrisma,
    cache: cacheService,
  });
};

// Initialize with default instances for production
if (process.env.NODE_ENV !== 'test') {
  initializeProjectServices();
}

// Getter function to access service
const getProjectService = () => {
  if (!sharedProjectService) {
    initializeProjectServices();
  }
  return sharedProjectService;
};

export class ProjectController {
  async createProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, description, parentProjectId, folderType } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          error: 'Project name is required',
        });
      }

      // Validate folder type
      if (folderType && !['project', 'folder'].includes(folderType)) {
        return res.status(400).json({
          error: 'Folder type must be either "project" or "folder"',
        });
      }

      // If parentProjectId is provided, verify it belongs to the user
      if (parentProjectId) {
        const parentProject =
          await getProjectService().getProjectById(parentProjectId);
        if (!parentProject || parentProject.userId !== req.user.id) {
          return res.status(400).json({
            error: 'Invalid parent project or access denied',
          });
        }
      }

      const project = await getProjectService().createProject({
        name,
        description,
        userId: req.user.id,
        parentProjectId,
        folderType,
      });

      return res.status(201).json({ project });
    } catch (error: any) {
      console.error('Error creating project:', error);

      // Handle hierarchy validation errors
      if (
        error.message.includes('Maximum nesting depth') ||
        error.message.includes('Folders cannot contain') ||
        error.message.includes('Parent project not found')
      ) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjects(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Extract filter parameters from query
      const { search, category, type, sortBy, sortOrder, isArchived } =
        req.query;

      // Build filters object
      const filters: any = {};

      if (search && typeof search === 'string') {
        filters.searchTerm = search;
      }

      if (category && typeof category === 'string' && category !== 'all') {
        filters.category = category;
      }

      if (type && typeof type === 'string' && type !== 'all') {
        filters.type = type as 'project' | 'folder';
      }

      if (sortBy && typeof sortBy === 'string') {
        filters.sortBy = sortBy as 'name' | 'createdAt' | 'updatedAt';
      }

      if (sortOrder && typeof sortOrder === 'string') {
        filters.sortOrder = sortOrder as 'asc' | 'desc';
      }

      if (isArchived !== undefined) {
        filters.isArchived = isArchived === 'true';
      }

      // Parse pagination query params
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
      const skip = (page - 1) * limit;

      // Get filtered projects for user
      const allProjects = await getProjectService().getProjectsByUser(
        req.user.id,
        Object.keys(filters).length > 0 ? filters : undefined
      );

      // Apply pagination in memory for now
      const total = allProjects.length;
      const totalPages = Math.ceil(total / limit);
      const projects = allProjects.slice(skip, skip + limit);

      return res.status(200).json({
        projects,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjectById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      return res.status(200).json({ project });
    } catch (error) {
      console.error('Error fetching project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const { name, description, featuredThumbnailId } = req.body;

      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updatedProject = await getProjectService().updateProject(id, {
        name,
        description,
        featuredThumbnailId,
      });

      return res.status(200).json({ project: updatedProject });
    } catch (error) {
      console.error('Error updating project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await getProjectService().deleteProject(id);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async duplicateProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Verify project exists and user owns it
      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const duplicateProject = await getProjectService().duplicateProject(
        id,
        req.user.id
      );
      return res.status(201).json({ project: duplicateProject });
    } catch (error: any) {
      console.error('Error duplicating project:', error);

      if (
        error.message.includes('Maximum nesting depth') ||
        error.message.includes('permission')
      ) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async archiveProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const archivedProject = await getProjectService().archiveProject(
        id,
        req.user.id
      );
      return res.status(200).json({ project: archivedProject });
    } catch (error: any) {
      console.error('Error archiving project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async unarchiveProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      const project = await getProjectService().getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const unarchivedProject = await getProjectService().unarchiveProject(
        id,
        req.user.id
      );
      return res.status(200).json({ project: unarchivedProject });
    } catch (error: any) {
      console.error('Error unarchiving project:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async setFeaturedThumbnail(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectId = req.params.projectId as string;
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const { thumbnailId } = req.body;
      if (!thumbnailId) {
        return res.status(400).json({ error: 'Thumbnail ID is required' });
      }

      // Verify the project exists and belongs to the user
      const project = await getProjectService().getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Set the featured thumbnail
      const updatedProject = await getProjectService().setFeaturedThumbnail(
        projectId,
        thumbnailId
      );

      return res.status(200).json({ project: updatedProject });
    } catch (error: any) {
      if (error.message === 'Thumbnail does not belong to this project') {
        return res.status(400).json({ error: error.message });
      }

      console.error('Error setting featured thumbnail:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 🏗️ HIERARCHY-SPECIFIC ENDPOINTS

  /**
   * Get projects in hierarchical tree structure
   * GET /api/projects/tree
   */
  async getProjectsTree(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projectsTree = await getProjectService().getProjectsTree(
        req.user.id
      );
      return res.status(200).json({ projectsTree });
    } catch (error) {
      console.error('Error fetching projects tree:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get direct children of a project
   * GET /api/projects/:id/children
   */
  async getProjectChildren(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }

      // Verify the parent project belongs to the user
      const parentProject = await getProjectService().getProjectById(id);
      if (!parentProject || parentProject.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const children = await getProjectService().getProjectChildren(id);
      return res.status(200).json({ children });
    } catch (error) {
      console.error('Error fetching project children:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get project breadcrumb path
   * GET /api/projects/:id/breadcrumb
   */
  async getProjectBreadcrumb(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const project = await getProjectService().getProjectById(id);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const breadcrumb = await getProjectService().getProjectBreadcrumb(id);
      return res.status(200).json({ breadcrumb });
    } catch (error) {
      console.error('Error fetching project breadcrumb:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Move project to different parent
   * PUT /api/projects/:id/move
   */
  async moveProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;
      if (!id) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const { newParentId } = req.body;

      // Verify the project belongs to the user
      const project = await getProjectService().getProjectById(id);
      if (!project || project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // If new parent is specified, verify it belongs to the user
      if (newParentId) {
        const newParent = await getProjectService().getProjectById(newParentId);
        if (!newParent || newParent.userId !== req.user.id) {
          return res.status(400).json({ error: 'Invalid new parent project' });
        }
      }

      const movedProject = await getProjectService().moveProject(
        id,
        newParentId
      );
      return res.status(200).json({ project: movedProject });
    } catch (error: any) {
      console.error('Error moving project:', error);

      // Handle specific move validation errors
      if (
        error.message.includes('circular reference') ||
        error.message.includes('Maximum nesting depth')
      ) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
