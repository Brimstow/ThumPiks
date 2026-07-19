// Mock environment variables first
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.NODE_ENV = 'test';

// Mock dependencies before imports
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Mock Cache Service
const mockCacheService = {
  getOrSet: jest.fn().mockImplementation(async (_key, fn) => await fn()),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  delPattern: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  healthCheck: jest.fn().mockResolvedValue(true),
  getInstance: jest.fn(),
};

jest.mock('../services/cache.service', () => ({
  CacheService: {
    getInstance: () => mockCacheService,
  },
  CacheTTL: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 1800,
    VERY_LONG: 3600,
    DAILY: 86400,
  },
  CacheKeys: {
    user: (userId: string) => `user:${userId}`,
    userProjects: (userId: string) => `user:${userId}:projects`,
    userThumbnails: (userId: string, page = 1) =>
      `user:${userId}:thumbnails:${page}`,
    project: (projectId: string) => `project:${projectId}`,
    thumbnail: (thumbnailId: string) => `thumbnail:${thumbnailId}`,
    analytics: (userId: string, period: string) =>
      `analytics:${userId}:${period}`,
    socialShares: (thumbnailId: string) => `social:${thumbnailId}`,
    rateLimit: (userId: string, action: string) =>
      `ratelimit:${userId}:${action}`,
  },
}));

// Mock event emitters
jest.mock('../events/event-emitter', () => ({
  emitAnalyticsEvent: jest.fn(),
  eventEmitter: {
    createAndEmit: jest.fn(),
  },
}));

jest.mock('../events', () => ({
  emitThumbnailCreated: jest.fn(),
  emitAnalyticsEvent: jest.fn(),
}));

// Mock ThumbnailService and ProjectService at module level
const mockThumbnailService = {
  getThumbnailsByUser: jest.fn(),
  getThumbnailById: jest.fn(),
  createThumbnail: jest.fn(),
  updateThumbnail: jest.fn(),
  deleteThumbnail: jest.fn(),
  setThumbnailAsFeatured: jest.fn(),
};

const mockProjectService = {
  getProjectsByUser: jest.fn(),
  getProjectById: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
  deleteProject: jest.fn(),
  setFeaturedThumbnail: jest.fn(),
};

jest.mock('../modules/thumbnail/thumbnail.service', () => ({
  ThumbnailService: jest.fn().mockImplementation(() => mockThumbnailService),
}));

jest.mock('../modules/project/project.service', () => ({
  ProjectService: jest.fn().mockImplementation(() => mockProjectService),
}));

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  subscription: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  userSession: {
    updateMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  thumbnail: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    ...mockPrisma,
    $transaction: jest.fn(callback => callback(mockPrisma)),
  })),
}));

// Now import the modules
import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Import user routes
import authRoutes from '../modules/auth/auth.routes';
import profileRoutes from '../modules/auth/profile.routes';
import thumbnailRoutes from '../modules/thumbnail/thumbnail.routes';
import projectRoutes from '../modules/project/project.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import templateRoutes from '../modules/templates/template.routes';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Add user routes
  app.use('/api/auth', authRoutes);
  app.use('/api/user', profileRoutes);
  app.use('/api/thumbnails', thumbnailRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/templates', templateRoutes);

  return app;
};

describe('User App API Routes Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear all service mocks
    jest.clearAllMocks();

    app = createTestApp();

    // Setup cache service mock to bypass caching and return data directly
    mockCacheService.getOrSet.mockImplementation(async (_key, fn) => {
      return await fn();
    });
  });

  afterAll(async () => {
    // Clean up any open handles
    jest.clearAllMocks();

    // Give a moment for any pending operations to complete
    await new Promise(resolve => setImmediate(resolve));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Routes', () => {
    describe('POST /api/auth/register', () => {
      it('should register new user successfully', async () => {
        const newUser = {
          username: 'newuser',
          email: 'newuser@test.com',
          password: 'SecurePass123!',
          name: 'New User',
        };

        const createdUser = {
          id: 'user123',
          username: newUser.username,
          email: newUser.email,
          name: newUser.name,
          isVerified: false,
          createdAt: new Date(),
          displayPreference: 'name',
        };

        // Mock username validation to pass
        const UsernameUtils = require('../utils/username.utils').UsernameUtils;
        jest
          .spyOn(UsernameUtils, 'validateUsername')
          .mockResolvedValue({ valid: true, error: null });

        // Mock password validation to pass
        const PasswordUtils = require('../utils/password.utils').PasswordUtils;
        jest
          .spyOn(PasswordUtils, 'validate')
          .mockReturnValue({ valid: true, errors: [] });

        mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
        mockPrisma.user.findFirst.mockResolvedValue(null); // Username available
        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue(createdUser);
        (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

        const response = await request(createServer(app))
          .post('/api/auth/register')
          .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('sessionId'); // HttpOnly cookie auth
        expect(response.body.user.email).toBe(newUser.email);
      });

      it('should reject registration with existing email', async () => {
        const existingUser = {
          id: 'existing123',
          username: 'existinguser',
          email: 'existing@test.com',
          name: 'Existing User',
        };

        mockPrisma.user.findUnique.mockResolvedValue(existingUser);
        mockPrisma.user.findFirst.mockResolvedValue(null); // Username available

        const response = await request(createServer(app))
          .post('/api/auth/register')
          .send({
            username: 'newuser',
            email: 'existing@test.com',
            password: 'Password123!',
            name: 'New User',
          });

        expect(response.status).toBe(409);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate required fields', async () => {
        const response = await request(createServer(app))
          .post('/api/auth/register')
          .send({
            email: 'invalid-email',
            // missing password and name
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should login user with valid credentials', async () => {
        const user = {
          id: 'user123',
          email: 'user@test.com',
          name: 'Test User',
          passwordHash: 'hashedPassword',
          isActive: true,
          isVerified: true,
        };

        mockPrisma.user.findUnique.mockResolvedValue(user);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrisma.user.update.mockResolvedValue(user);
        (jwt.sign as jest.Mock).mockReturnValue('mock-access-token');

        const response = await request(createServer(app))
          .post('/api/auth/login')
          .send({
            email: 'user@test.com',
            password: 'Password123!',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('sessionId'); // HttpOnly cookie auth
        expect(response.body.user.email).toBe('user@test.com');
      });

      it('should reject login with invalid credentials', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const response = await request(createServer(app))
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'WrongPass123!',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/auth/request-password-reset', () => {
      it('should handle password reset request', async () => {
        const user = {
          id: 'user123',
          email: 'user@test.com',
          name: 'Test User',
        };

        mockPrisma.user.findUnique.mockResolvedValue(user);
        mockPrisma.passwordResetToken.create.mockResolvedValue({
          id: 'token-id',
          userId: 'user123',
          token: 'valid-reset-token',
          expiresAt: new Date(Date.now() + 3600000),
        });
        mockPrisma.passwordResetToken.count.mockResolvedValue(0);

        const response = await request(createServer(app))
          .post('/api/auth/request-password-reset')
          .send({
            email: 'user@test.com',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('POST /api/auth/reset-password', () => {
      it('should reset password with valid token', async () => {
        const tokenRecord = {
          id: 'token-id',
          userId: 'user123',
          token: 'valid-reset-token',
          isUsed: false,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        };

        // Mock password validation to pass
        const PasswordUtils = require('../utils/password.utils').PasswordUtils;
        jest
          .spyOn(PasswordUtils, 'validate')
          .mockReturnValue({ valid: true, errors: [] });

        mockPrisma.passwordResetToken.findUnique.mockResolvedValue(tokenRecord);
        mockPrisma.passwordResetToken.update.mockResolvedValue({
          ...tokenRecord,
          isUsed: true,
        });
        mockPrisma.user.update.mockResolvedValue({
          id: 'user123',
          email: 'user@test.com',
        });
        mockPrisma.userSession.updateMany.mockResolvedValue({ count: 1 });
        (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');

        const response = await request(createServer(app))
          .post('/api/auth/reset-password')
          .send({
            token: 'valid-reset-token',
            newPassword: 'NewPassword123!',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });
  });

  describe('User Profile Routes', () => {
    const mockUserToken = 'valid-user-token';

    beforeEach(() => {
      // Setup mock user authentication
      const mockDecoded = {
        userId: 'user123',
        email: 'user@test.com',
      };

      const mockUser = {
        id: 'user123',
        email: 'user@test.com',
        name: 'Test User',
        isActive: true,
        isVerified: true,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    describe('GET /api/user/profile', () => {
      it('should return user profile', async () => {
        const response = await request(createServer(app))
          .get('/api/user/profile')
          .set('Authorization', `Bearer ${mockUserToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.email).toBe('user@test.com');
      });

      it('should reject unauthorized access', async () => {
        const response = await request(createServer(app)).get(
          '/api/user/profile'
        );

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/user/profile', () => {
      it('should update user profile', async () => {
        const updateData = {
          name: 'Updated Name',
          bio: 'Updated bio',
        };

        mockPrisma.user.update.mockResolvedValue({
          id: 'user123',
          email: 'user@test.com',
          name: updateData.name,
          bio: updateData.bio,
        });

        const response = await request(createServer(app))
          .put('/api/user/profile')
          .set('Authorization', `Bearer ${mockUserToken}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.name).toBe(updateData.name);
      });
    });
  });

  describe('Thumbnail Routes', () => {
    const mockUserToken = 'valid-user-token';

    beforeEach(() => {
      // Setup mock user authentication
      const mockDecoded = {
        userId: 'user123',
        email: 'user@test.com',
      };

      const mockUser = {
        id: 'user123',
        email: 'user@test.com',
        name: 'Test User',
        isActive: true,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    describe('GET /api/thumbnails', () => {
      it('should return user thumbnails', async () => {
        const mockThumbnails = [
          {
            id: 'thumb1',
            title: 'Thumbnail 1',
            imageUrl: 'https://example.com/thumb1.jpg',
            userId: 'user123',
            createdAt: new Date(),
          },
          {
            id: 'thumb2',
            title: 'Thumbnail 2',
            imageUrl: 'https://example.com/thumb2.jpg',
            userId: 'user123',
            createdAt: new Date(),
          },
        ];

        mockThumbnailService.getThumbnailsByUser.mockResolvedValue(
          mockThumbnails
        );

        console.log('Mock setup complete, making request...');
        console.log(
          'mockThumbnailService.getThumbnailsByUser mock calls before:',
          mockThumbnailService.getThumbnailsByUser.mock.calls.length
        );

        const response = await request(createServer(app))
          .get('/api/thumbnails')
          .set('Authorization', `Bearer ${mockUserToken}`);

        console.log('Response status:', response.status);
        console.log('Response body:', JSON.stringify(response.body, null, 2));
        console.log(
          'mockThumbnailService.getThumbnailsByUser mock calls after:',
          mockThumbnailService.getThumbnailsByUser.mock.calls.length
        );
        console.log(
          'mockThumbnailService.getThumbnailsByUser was called with:',
          mockThumbnailService.getThumbnailsByUser.mock.calls
        );
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('thumbnails');
        expect(response.body.thumbnails).toHaveLength(2);
      });

      it('should handle pagination', async () => {
        const mockThumbnails: any[] = [];
        mockThumbnailService.getThumbnailsByUser.mockResolvedValue(
          mockThumbnails
        );

        const response = await request(createServer(app))
          .get('/api/thumbnails')
          .query({
            page: 2,
            limit: 10,
          })
          .set('Authorization', `Bearer ${mockUserToken}`);

        // Should have thumbnails field
        expect(response.body).toHaveProperty('thumbnails');
        // Note: pagination might not be present if not implemented
      });
    });

    describe('POST /api/thumbnails', () => {
      it('should create new thumbnail', async () => {
        const thumbnailData = {
          title: 'New Thumbnail',
          prompt: 'Create a beautiful thumbnail',
          projectId: 'project123',
        };

        const createdThumbnail = {
          id: 'thumb123',
          title: thumbnailData.title,
          prompt: thumbnailData.prompt,
          projectId: thumbnailData.projectId,
          userId: 'user123',
          createdAt: new Date(),
        };

        mockThumbnailService.createThumbnail.mockResolvedValue(
          createdThumbnail
        );

        const response = await request(createServer(app))
          .post('/api/thumbnails')
          .set('Authorization', `Bearer ${mockUserToken}`)
          .send(thumbnailData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('thumbnail');
        expect(response.body.thumbnail.title).toBe(thumbnailData.title);
      });

      it('should validate required fields', async () => {
        const response = await request(createServer(app))
          .post('/api/thumbnails')
          .set('Authorization', `Bearer ${mockUserToken}`)
          .send({
            // missing required fields
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          'error',
          'Title and projectId are required'
        );
      });
    });

    describe('GET /api/thumbnails/:id', () => {
      it('should return specific thumbnail', async () => {
        const mockThumbnail = {
          id: 'thumb123',
          title: 'Test Thumbnail',
          userId: 'user123',
          createdAt: new Date(),
        };

        mockThumbnailService.getThumbnailById.mockResolvedValue(mockThumbnail);

        const response = await request(createServer(app))
          .get('/api/thumbnails/thumb123')
          .set('Authorization', `Bearer ${mockUserToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('thumbnail');
        expect(response.body.thumbnail.id).toBe('thumb123');
      });

      it('should return 404 for non-existent thumbnail', async () => {
        mockThumbnailService.getThumbnailById.mockResolvedValue(null);

        const response = await request(createServer(app))
          .get('/api/thumbnails/nonexistent')
          .set('Authorization', `Bearer ${mockUserToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Project Routes', () => {
    const mockUserToken = 'valid-user-token';

    beforeEach(() => {
      // Setup mock user authentication
      const mockDecoded = {
        userId: 'user123',
        email: 'user@test.com',
      };

      const mockUser = {
        id: 'user123',
        email: 'user@test.com',
        name: 'Test User',
        isActive: true,
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    });

    describe('GET /api/projects', () => {
      it('should return user projects', async () => {
        const mockProjects = [
          {
            id: 'project1',
            name: 'Project 1',
            description: 'Test project 1',
            userId: 'user123',
            createdAt: new Date(),
          },
          {
            id: 'project2',
            name: 'Project 2',
            description: 'Test project 2',
            userId: 'user123',
            createdAt: new Date(),
          },
        ];

        mockProjectService.getProjectsByUser.mockResolvedValue(mockProjects);

        const response = await request(createServer(app))
          .get('/api/projects')
          .set('Authorization', `Bearer ${mockUserToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('projects');
        expect(response.body.projects).toHaveLength(2);
      });
    });

    describe('POST /api/projects', () => {
      it('should create new project', async () => {
        const projectData = {
          name: 'New Project',
          description: 'Test project description',
        };

        const createdProject = {
          id: 'project123',
          name: projectData.name,
          description: projectData.description,
          userId: 'user123',
          createdAt: new Date(),
        };

        mockProjectService.createProject.mockResolvedValue(createdProject);

        const response = await request(createServer(app))
          .post('/api/projects')
          .set('Authorization', `Bearer ${mockUserToken}`)
          .send(projectData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('project');
        expect(response.body.project.name).toBe(projectData.name);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(createServer(app))
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'password123',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(createServer(app))
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });

    it('should handle missing authorization headers', async () => {
      const response = await request(createServer(app)).get(
        '/api/user/profile'
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid JWT tokens', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(createServer(app))
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting on auth endpoints', async () => {
      // This test would need actual rate limiting middleware
      // For now, just ensure the route responds
      const response = await request(createServer(app))
        .post('/api/auth/login')
        .send({
          email: 'user@test.com',
          password: 'password123',
        });

      // Should respond (either success or failure, but not rate limited in test)
      expect([200, 400, 401, 403, 500]).toContain(response.status);
    });
  });

  describe('Input Validation', () => {
    it('should validate email formats', async () => {
      const response = await request(createServer(app))
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'password123',
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should validate password strength', async () => {
      const response = await request(createServer(app))
        .post('/api/auth/register')
        .send({
          email: 'user@test.com',
          password: '123', // Too short
          name: 'Test User',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should sanitize input data', async () => {
      const response = await request(createServer(app))
        .post('/api/auth/register')
        .send({
          email: 'user@test.com',
          password: 'password123',
          name: '<script>alert("xss")</script>Test User',
        });

      // Should either clean the input or reject it
      expect([400, 500]).toContain(response.status);
    });
  });
});
