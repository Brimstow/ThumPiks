import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

// Initialize Prisma client for database operations
const prisma = getPrisma();

export class ProfileController {
  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = requireUser(req, res);
      if (!user) return;

      return res.status(200).json({ user });
    } catch (error) {
      logger.error('Error getting profile', error instanceof Error ? error : undefined);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateProfile(
    req: AuthRequest & { body: { name?: string; email?: string } },
    res: Response
  ) {
    try {
      const user = requireUser(req, res);
      if (!user) return;

      const { name, email } = req.body as { name?: string; email?: string };

      // Update user profile logic here
      const updatedUser = { ...user, name, email };

      return res.status(200).json({ user: updatedUser });
    } catch (error) {
      logger.error('Error updating profile', error instanceof Error ? error : undefined);
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
      const user = requireUser(req, res);
      if (!user) return;

      // Fetch user settings from database
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { settings: true },
      });

      // Return settings or empty object if no settings found
      const settings = dbUser?.settings || {};

      res.status(200).json({ settings });
    } catch (error) {
      logger.error('Error getting user settings', error instanceof Error ? error : undefined);
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
  async updateUserSettings(
    req: AuthRequest & { body: { settings: unknown } },
    res: Response
  ): Promise<void> {
    try {
      const user = requireUser(req, res);
      if (!user) return;

      const { settings } = req.body as {
        settings: Record<string, unknown> | null;
      };

      // Update user settings in database
      // Cast to InputJsonValue (Prisma's JSON type) since settings can be any valid JSON object
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { settings: settings as object },
        select: { settings: true },
      });

      res.status(200).json({ settings: updatedUser.settings });
    } catch (error) {
      logger.error('Error updating user settings', error instanceof Error ? error : undefined);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
