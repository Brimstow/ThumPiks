import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import { cacheMiddleware } from '../../middleware/cache.middleware';

const router = Router();
const projectController = new ProjectController();

// 🏗️ HIERARCHY ROUTES (must come before /:id routes to avoid conflicts)
router.get('/tree', authenticateToken, cacheMiddleware({ ttl: 300 }), (req, res) => {
  projectController.getProjectsTree(req as AuthRequest, res);
});

// Project CRUD operations with authentication and caching
router.post('/', authenticateToken, (req, res) => {
  projectController.createProject(req as AuthRequest, res);
});
router.get('/', authenticateToken, cacheMiddleware({ ttl: 300 }), (req, res) => {
  projectController.getProjects(req as AuthRequest, res);
});
router.get('/:id', authenticateToken, cacheMiddleware({ ttl: 600 }), (req, res) => {
  projectController.getProjectById(req as AuthRequest, res);
});
router.put('/:id', authenticateToken, (req, res) => {
  projectController.updateProject(req as AuthRequest, res);
});
router.delete('/:id', authenticateToken, (req, res) => {
  projectController.deleteProject(req as AuthRequest, res);
});

// Additional project operations
router.put('/:projectId/featured-thumbnail', authenticateToken, (req, res) => {
  projectController.setFeaturedThumbnail(req as AuthRequest, res);
});

// More hierarchy routes
router.get('/:id/children', authenticateToken, cacheMiddleware({ ttl: 300 }), (req, res) => {
  projectController.getProjectChildren(req as AuthRequest, res);
});
router.get('/:id/breadcrumb', authenticateToken, cacheMiddleware({ ttl: 600 }), (req, res) => {
  projectController.getProjectBreadcrumb(req as AuthRequest, res);
});
router.put('/:id/move', authenticateToken, (req, res) => {
  projectController.moveProject(req as AuthRequest, res);
});

export default router;
