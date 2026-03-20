import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { getUserUrlHistoryService } from './user-url-history.service';

export const getUrlHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const history = await getUserUrlHistoryService().getHistory(
      req.user.id,
      limit
    );

    return res.status(200).json({ history });
  } catch (error) {
    console.error('Error fetching URL history:', error);
    return res.status(500).json({ error: 'Failed to fetch URL history' });
  }
};

export const saveUrl = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url, title, platform, thumbnailUrl, selectedFrameTime } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    const upsertData: Record<string, any> = {
      userId: req.user.id,
      url,
    };
    if (title) upsertData.title = title;
    if (platform) upsertData.platform = platform;
    if (thumbnailUrl) upsertData.thumbnailUrl = thumbnailUrl;
    if (selectedFrameTime != null)
      upsertData.selectedFrameTime = Number(selectedFrameTime);

    const entry = await getUserUrlHistoryService().upsertUrl(upsertData as any);

    return res.status(201).json({ entry });
  } catch (error) {
    console.error('Error saving URL history:', error);
    return res.status(500).json({ error: 'Failed to save URL' });
  }
};

export const clearAllHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const includePinned = req.query.includePinned === 'true';
    const result = await getUserUrlHistoryService().clearAll(
      req.user.id,
      includePinned
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error clearing URL history:', error);
    return res.status(500).json({ error: 'Failed to clear URL history' });
  }
};

export const togglePinEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    const entry = await getUserUrlHistoryService().togglePin(
      String(id),
      req.user.id
    );
    return res.status(200).json({ entry });
  } catch (error: any) {
    if (error.message === 'Entry not found') {
      return res.status(404).json({ error: 'Entry not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error('Error toggling pin:', error);
    return res.status(500).json({ error: 'Failed to toggle pin' });
  }
};

export const bulkDeleteEntries = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    const result = await getUserUrlHistoryService().bulkDelete(
      ids,
      req.user.id
    );
    return res.status(200).json(result);
  } catch (error: any) {
    if (error.message === 'No valid entries found') {
      return res.status(404).json({ error: 'No valid entries found' });
    }
    console.error('Error bulk deleting URL history:', error);
    return res.status(500).json({ error: 'Failed to bulk delete' });
  }
};

export const deleteUrlEntry = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Entry ID is required' });
    }

    await getUserUrlHistoryService().deleteEntry(String(id), req.user.id);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    if (error.message === 'Entry not found') {
      return res.status(404).json({ error: 'Entry not found' });
    }
    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error('Error deleting URL history entry:', error);
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
};
