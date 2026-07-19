import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { getUserAssetService } from './user-asset.service';
import { logger } from '../../utils/logger';

export const getAssets = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { type } = req.query;
    const assets = await getUserAssetService().getAssetsByUser(
      user.id,
      type ? String(type) : undefined
    );

    return res.status(200).json({ assets });
  } catch (error) {
    logger.error('Error fetching user assets', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to fetch assets' });
  }
};

export const uploadAsset = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { type, name, imageData, imageUrl } = req.body;

    const validTypes = ['face', 'background', 'logo', 'other'];
    if (!validTypes.includes(type)) {
      return res
        .status(400)
        .json({
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        });
    }

    let asset;

    if (imageUrl) {
      // Upload from URL (e.g., frame extraction result)
      asset = await getUserAssetService().uploadAssetFromUrl({
        userId: user.id,
        type,
        url: imageUrl,
        name: name || undefined,
      });
    } else if (imageData) {
      // Upload from base64 data
      const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res
          .status(400)
          .json({
            error: 'Invalid imageData format. Expected base64 data URI.',
          });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      // 10MB limit
      if (buffer.length > 10 * 1024 * 1024) {
        return res
          .status(400)
          .json({ error: 'File size must be less than 10MB' });
      }

      asset = await getUserAssetService().uploadAsset({
        userId: user.id,
        type,
        buffer,
        name: name || undefined,
        mimeType,
      });
    } else {
      return res
        .status(400)
        .json({ error: 'Either imageData (base64) or imageUrl is required' });
    }

    return res.status(201).json({ asset });
  } catch (error) {
    logger.error('Error uploading user asset', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to upload asset' });
  }
};

export const deleteAsset = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    await getUserAssetService().deleteAsset(String(id), user.id);

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    logger.error('Error deleting user asset', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
};

export const recategorizeAsset = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Asset ID is required' });
    }

    const { type } = req.body;
    const validTypes = ['face', 'background', 'logo', 'other'];
    if (!type || !validTypes.includes(type)) {
      return res
        .status(400)
        .json({
          error: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        });
    }

    const asset = await getUserAssetService().recategorizeAsset(
      String(id),
      type,
      user.id
    );

    return res.status(200).json({ asset });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Asset not found') {
      return res.status(404).json({ error: 'Asset not found' });
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    logger.error('Error recategorizing user asset', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to recategorize asset' });
  }
};

export const getStorageUsage = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const usage = await getUserAssetService().getStorageUsage(user.id);
    const counts = await getUserAssetService().getAssetCountByType(user.id);

    return res.status(200).json({ usage, counts });
  } catch (error) {
    logger.error('Error fetching storage usage', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to fetch storage usage' });
  }
};
