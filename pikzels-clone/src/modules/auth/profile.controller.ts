import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export class ProfileController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.status(200).json({
        user: req.user
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { name },
        select: {
          id: true,
          email: true,
          name: true
        }
      });

      res.status(200).json({
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name || undefined
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Get user settings
  async getUserSettings(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          settings: true
        }
      });

      res.status(200).json({
        settings: user?.settings || {}
      });
    } catch (error) {
      console.error('Error fetching user settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Update user settings
  async updateUserSettings(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { settings } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { settings },
        select: {
          settings: true
        }
      });

      res.status(200).json({
        settings: updatedUser.settings || {}
      });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}