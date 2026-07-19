import { ProfileController } from './profile.controller';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe('ProfileController', () => {
  let profileController: ProfileController;
  let mockPrisma: any;

  beforeEach(() => {
    profileController = new ProfileController();
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSettings', () => {
    it('should return user settings when user exists', async () => {
      const mockReq: any = {
        user: { id: 'user123' },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          theme: 'dark',
          language: 'en',
        },
      });

      await profileController.getUserSettings(mockReq, mockRes);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { settings: true },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        settings: {
          theme: 'dark',
          language: 'en',
        },
      });
    });

    it('should return empty settings when user has no settings', async () => {
      const mockReq: any = {
        user: { id: 'user123' },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: null,
      });

      await profileController.getUserSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        settings: {},
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const mockReq: any = {};
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await profileController.getUserSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
      });
    });

    it('should handle database errors', async () => {
      const mockReq: any = {
        user: { id: 'user123' },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockPrisma.user.findUnique.mockRejectedValueOnce(
        new Error('Database error')
      );

      await profileController.getUserSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings successfully', async () => {
      const mockReq: any = {
        user: { id: 'user123' },
        body: {
          settings: {
            theme: 'light',
            language: 'es',
          },
        },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockPrisma.user.update.mockResolvedValueOnce({
        settings: {
          theme: 'light',
          language: 'es',
        },
      });

      await profileController.updateUserSettings(mockReq, mockRes);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: { settings: { theme: 'light', language: 'es' } },
        select: { settings: true },
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        settings: {
          theme: 'light',
          language: 'es',
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      const mockReq: any = {
        body: { settings: { theme: 'light' } },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await profileController.updateUserSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
      });
    });

    it('should handle database errors', async () => {
      const mockReq: any = {
        user: { id: 'user123' },
        body: { settings: { theme: 'light' } },
      };
      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      mockPrisma.user.update.mockRejectedValueOnce(new Error('Database error'));

      await profileController.updateUserSettings(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Internal server error',
      });
    });
  });
});
