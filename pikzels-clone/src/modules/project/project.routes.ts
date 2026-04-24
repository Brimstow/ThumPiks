import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';
import {
  cacheMiddleware,
  invalidateCacheMiddleware,
} from '../../middleware/cache.middleware';
import { CacheKeys } from '../../services/cache.service';

const router = Router();
const projectController = new ProjectController();

// 🏗️ HIERARCHY ROUTES (must come before /:id routes to avoid conflicts)
router.get(
  '/tree',
  authenticateToken,
  userApiRateLimit,
  cacheMiddleware({ ttl: 300 }),
  (req, res) => {
    projectController.getProjectsTree(req as AuthRequest, res);
  }
);

// Project CRUD operations with authentication and caching
// POST - invalidate user cache after creating project to ensure fresh data
router.post(
  '/',
  authenticateToken,
  userApiRateLimit,
  invalidateCacheMiddleware([
    `api:*:/:*`, // Invalidate all API caches for this user
    CacheKeys.userProjects('*'), // Invalidate projects cache
  ]),
  (req, res) => {
    projectController.createProject(req as AuthRequest, res);
  }
);
// GET - use cache for listing projects
router.get(
  '/',
  authenticateToken,
  userApiRateLimit,
  cacheMiddleware({ ttl: 300 }),
  (req, res) => {
    projectController.getProjects(req as AuthRequest, res);
  }
);
router.get(
  '/:id',
  authenticateToken,
  userApiRateLimit,
  cacheMiddleware({ ttl: 600 }),
  (req, res) => {
    projectController.getProjectById(req as AuthRequest, res);
  }
);
router.put(
  '/:id',
  authenticateToken,
  userApiRateLimit,
  invalidateCacheMiddleware([
    `api:*:/:*`, // Invalidate all API caches for this user
    CacheKeys.userProjects('*'), // Invalidate projects cache
  ]),
  (req, res) => {
    projectController.updateProject(req as AuthRequest, res);
  }
);
router.delete(
  '/:id',
  authenticateToken,
  userApiRateLimit,
  invalidateCacheMiddleware([
    `api:*:/:*`, // Invalidate all API caches for this user
    CacheKeys.userProjects('*'), // Invalidate projects cache
  ]),
  (req, res) => {
    projectController.deleteProject(req as AuthRequest, res);
  }
);

// Duplicate project
router.post(
  '/:id/duplicate',
  authenticateToken,
  userApiRateLimit,
  (req, res) => {
    projectController.duplicateProject(req as AuthRequest, res);
  }
);

// Archive/Unarchive project
router.put('/:id/archive', authenticateToken, userApiRateLimit, (req, res) => {
  projectController.archiveProject(req as AuthRequest, res);
});

router.put(
  '/:id/unarchive',
  authenticateToken,
  userApiRateLimit,
  (req, res) => {
    projectController.unarchiveProject(req as AuthRequest, res);
  }
);

// Additional project operations
router.put(
  '/:projectId/featured-thumbnail',
  authenticateToken,
  userApiRateLimit,
  (req, res) => {
    projectController.setFeaturedThumbnail(req as AuthRequest, res);
  }
);

// More hierarchy routes
router.get(
  '/:id/children',
  authenticateToken,
  userApiRateLimit,
  cacheMiddleware({ ttl: 300 }),
  (req, res) => {
    projectController.getProjectChildren(req as AuthRequest, res);
  }
);
router.get(
  '/:id/breadcrumb',
  authenticateToken,
  userApiRateLimit,
  cacheMiddleware({ ttl: 600 }),
  (req, res) => {
    projectController.getProjectBreadcrumb(req as AuthRequest, res);
  }
);
router.put('/:id/move', authenticateToken, userApiRateLimit, (req, res) => {
  projectController.moveProject(req as AuthRequest, res);
});

export default router;
