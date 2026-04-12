/**
 * User Data Export Controller
 *
 * GDPR Article 15/20 & CCPA Section 1798.100 compliant endpoint.
 * Rate limited to 1 export per 24 hours per user.
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { exportUserData } from './data-export.service';
import { logger } from '../../utils/logger';

// In-memory rate limit store (per-user, 24h window)
// For production scale, move to Redis
const exportRateLimit = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

function isRateLimited(userId: string): boolean {
  const lastExport = exportRateLimit.get(userId);
  if (!lastExport) return false;
  return Date.now() - lastExport < RATE_LIMIT_WINDOW_MS;
}

function getRetryAfter(userId: string): number {
  const lastExport = exportRateLimit.get(userId);
  if (!lastExport) return 0;
  const remaining = RATE_LIMIT_WINDOW_MS - (Date.now() - lastExport);
  return Math.ceil(remaining / 1000); // seconds
}

/**
 * POST /api/user/export
 * Generate and download a JSON file containing all user data.
 */
export async function requestDataExport(req: Request, res: Response): Promise<void> {
  const userId = (req as AuthRequest).user?.id;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Rate limit check
  if (isRateLimited(userId)) {
    const retryAfter = getRetryAfter(userId);
    res.status(429).json({
      error: 'Export rate limit exceeded',
      message: 'You can request one data export every 24 hours.',
      retryAfterSeconds: retryAfter,
    });
    return;
  }

  try {
    // Audit log
    logger.info('GDPR data export requested', {
      userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const exportData = await exportUserData(userId);

    // Record the export timestamp for rate limiting
    exportRateLimit.set(userId, Date.now());

    // Set download headers
    const filename = `thumpiks-data-export-${new Date().toISOString().split('T')[0]}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    // Audit log completion
    logger.info('GDPR data export completed and delivered', {
      userId,
      filename,
      categories: exportData.exportMetadata.dataCategories.length,
    });

    res.status(200).json(exportData);
  } catch (error) {
    logger.error('GDPR data export failed', error as Error, { userId });
    res.status(500).json({
      error: 'Export failed',
      message: 'Unable to generate data export. Please try again later.',
    });
  }
}
