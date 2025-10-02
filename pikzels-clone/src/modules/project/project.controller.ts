import { Request, Response } from 'express';
import { ProjectService } from './project.service';

const projectService = new ProjectService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export class ProjectController {
  async createProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, description } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          error: 'Project name is required',
        });
      }

      const project = await projectService.createProject({
        name,
        description,
        userId: req.user.id,
      });

      res.status(201).json({ project });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjects(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const projects = await projectService.getProjectsByUser(req.user.id);
      res.status(200).json({ projects });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjectById(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const project = await projectService.getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      res.status(200).json({ project });
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const { name, description, featuredThumbnailId } = req.body;

      const project = await projectService.getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const updatedProject = await projectService.updateProject(id, {
        name,
        description,
        featuredThumbnailId,
      });

      res.status(200).json({ project: updatedProject });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteProject(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { id } = req.params;
      const project = await projectService.getProjectById(id);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Check if user owns this project
      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      await projectService.deleteProject(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async setFeaturedThumbnail(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { projectId } = req.params;
      const { thumbnailId } = req.body;

      // Verify the project exists and belongs to the user
      const project = await projectService.getProjectById(projectId);

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Set the featured thumbnail
      const updatedProject = await projectService.setFeaturedThumbnail(
        projectId,
        thumbnailId
      );

      res.status(200).json({ project: updatedProject });
    } catch (error: any) {
      if (error.message === 'Thumbnail does not belong to this project') {
        return res.status(400).json({ error: error.message });
      }

      console.error('Error setting featured thumbnail:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
