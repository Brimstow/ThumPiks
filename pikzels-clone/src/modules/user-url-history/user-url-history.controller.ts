import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { getUserUrlHistoryService } from './user-url-history.service';

export const getUrlHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
    const history = await getUserUrlHistoryService().getHistory(req.user.id, limit);

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
    if (selectedFrameTime != null) upsertData.selectedFrameTime = Number(selectedFrameTime);

    const entry = await getUserUrlHistoryService().upsertUrl(upsertData as any);

    return res.status(201).json({ entry });
  } catch (error) {
    console.error('Error saving URL history:', error);
    return res.status(500).json({ error: 'Failed to save URL' });
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

    await getUserUrlHistoryService().deleteEntry(id, req.user.id);

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
