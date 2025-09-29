import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const projectController = new ProjectController();

// Project CRUD operations with authentication
router.post('/', authenticateToken, (req, res) => {
  projectController.createProject(req, res);
});
router.get('/', authenticateToken, (req, res) => {
  projectController.getProjects(req, res);
});
router.get('/:id', authenticateToken, (req, res) => {
  projectController.getProjectById(req, res);
});
router.put('/:id', authenticateToken, (req, res) => {
  projectController.updateProject(req, res);
});
router.delete('/:id', authenticateToken, (req, res) => {
  projectController.deleteProject(req, res);
});

// Additional project operations
router.put('/:projectId/featured-thumbnail', authenticateToken, (req, res) => {
  projectController.setFeaturedThumbnail(req, res);
});

export default router;