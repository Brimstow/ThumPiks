import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types/auth';

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

export class ProfileController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      return res.status(200).json({ user: req.user });
    } catch (error) {
      console.error('Error getting profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { name, email } = req.body;
      
      // Update user profile logic here
      const updatedUser = { ...req.user, name, email };
      
      return res.status(200).json({ user: updatedUser });
    } catch (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user settings from database
   * 
   * @param {AuthRequest} req - Express request with authenticated user
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with user settings
   * 
   * @example Success response
   * ```json
   * {
   *   "settings": {
   *     "theme": "dark",
   *     "language": "en"
   *   }
   * }
   * ```
   */
  async getUserSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Fetch user settings from database
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { settings: true },
      });

      // Return settings or empty object if no settings found
      const settings = user?.settings || {};
      
      res.status(200).json({ settings });
    } catch (error) {
      console.error('Error getting user settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update user settings in database
   * 
   * @param {AuthRequest} req - Express request with settings data
   * @param {Response} res - Express response object
   * @returns {Promise<void>} JSON response with updated settings
   * 
   * @example Request body
   * ```json
   * {
   *   "settings": {
   *     "theme": "dark",
   *     "language": "es"
   *   }
   * }
   * ```
   */
  async updateUserSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { settings } = req.body;
      
      // Update user settings in database
      const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: { settings },
        select: { settings: true },
      });
      
      res.status(200).json({ settings: updatedUser.settings });
    } catch (error) {
      console.error('Error updating user settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
