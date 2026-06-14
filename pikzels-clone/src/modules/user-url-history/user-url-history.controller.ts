import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { getUserUrlHistoryService } from './user-url-history.service';
import { logger } from '../../utils/logger';

export const getUrlHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const history = await getUserUrlHistoryService().getHistory(
      user.id,
      limit
    );

    return res.status(200).json({ history });
  } catch (error) {
    logger.error('Error fetching URL history', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to fetch URL history' });
  }
};

export const saveUrl = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { url, title, platform, thumbnailUrl, selectedFrameTime } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const upsertData: {
      userId: string;
      url: string;
      title?: string;
      platform?: string;
      thumbnailUrl?: string;
      selectedFrameTime?: number;
    } = {
      userId: user.id,
      url,
    };
    if (title) upsertData.title = title;
    if (platform) upsertData.platform = platform;
    if (thumbnailUrl) upsertData.thumbnailUrl = thumbnailUrl;
    if (selectedFrameTime != null)
      upsertData.selectedFrameTime = Number(selectedFrameTime);

    const entry = await getUserUrlHistoryService().upsertUrl(upsertData);

    return res.status(201).json({ entry });
  } catch (error) {
    logger.error('Error saving URL history', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to save URL' });
  }
};

export const clearAllHistory = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const includePinned = req.query.includePinned === 'true';
    const result = await getUserUrlHistoryService().clearAll(
      user.id,
      includePinned
    );
    return res.status(200).json(result);
  } catch (error) {
    logger.error('Error clearing URL history', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to clear URL history' });
  }
};

export const togglePinEntry = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    const entry = await getUserUrlHistoryService().togglePin(
      String(id),
      user.id
    );
    return res.status(200).json({ entry });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'Entry not found') {
      return res.status(404).json({ error: 'Entry not found' });
    }
    if (errMsg === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    logger.error('Error toggling pin', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to toggle pin' });
  }
};

export const bulkDeleteEntries = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await getUserUrlHistoryService().bulkDelete(
      ids,
      user.id
    );
    return res.status(200).json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'No valid entries found') {
      return res.status(404).json({ error: 'No valid entries found' });
    }
    logger.error('Error bulk deleting URL history', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to bulk delete' });
  }
};

export const deleteUrlEntry = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    await getUserUrlHistoryService().deleteEntry(String(id), user.id);

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'Entry not found') {
      return res.status(404).json({ error: 'Entry not found' });
    }
    if (errMsg === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    logger.error('Error deleting URL history entry', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
};
