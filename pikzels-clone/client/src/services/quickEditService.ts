import { authGet, authPost, authDelete, authPatch } from '../utils/api';

// ============================================
// USER ASSETS
// ============================================

export interface UserAsset {
  id: string;
  userId: string;
  type: 'face' | 'background' | 'logo' | 'other';
  url: string;
  publicId: string;
  name: string | null;
  sizeBytes: number;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export async function getUserAssets(type?: string): Promise<UserAsset[]> {
  const query = type ? `?type=${type}` : '';
  const res = await authGet(`/api/user-assets${query}`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  const data = await res.json();
  return data.assets;
}

export async function uploadAsset(payload: {
  type: 'face' | 'background' | 'logo' | 'other';
  imageData?: string;
  imageUrl?: string;
  name?: string;
}): Promise<UserAsset> {
  const res = await authPost('/api/user-assets', payload);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }
  const data = await res.json();
  return data.asset;
}

export async function deleteAsset(id: string): Promise<void> {
  const res = await authDelete(`/api/user-assets/${id}`);
  if (!res.ok) throw new Error('Failed to delete asset');
}

export async function getStorageUsage(): Promise<{
  usage: { totalBytes: number; count: number };
  counts: Record<string, number>;
}> {
  const res = await authGet('/api/user-assets/usage');
  if (!res.ok) throw new Error('Failed to fetch storage usage');
  return res.json();
}

export async function recategorizeAsset(
  id: string,
  type: 'face' | 'background' | 'logo' | 'other'
): Promise<UserAsset> {
  const res = await authPatch(`/api/user-assets/${id}/recategorize`, { type });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Recategorize failed' }));
    throw new Error(err.error || 'Recategorize failed');
  }
  const data = await res.json();
  return data.asset;
}

export async function recategorizeThumbnail(
  id: string,
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter'
): Promise<void> {
  const res = await authPatch(`/api/thumbnails/${id}/recategorize`, { platform });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Recategorize failed' }));
    throw new Error(err.error || 'Recategorize failed');
  }
}

// ============================================
// URL HISTORY
// ============================================

export interface UrlHistoryEntry {
  id: string;
  userId: string;
  url: string;
  title: string | null;
  platform: string | null;
  thumbnailUrl: string | null;
  selectedFrameTime: number | null;
  createdAt: string;
}

export async function getUrlHistory(limit = 20): Promise<UrlHistoryEntry[]> {
  const res = await authGet(`/api/url-history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch URL history');
  const data = await res.json();
  return data.history;
}

export async function saveUrlHistory(payload: {
  url: string;
  title?: string;
  platform?: string;
  thumbnailUrl?: string;
  selectedFrameTime?: number;
}): Promise<UrlHistoryEntry> {
  const res = await authPost('/api/url-history', payload);
  if (!res.ok) throw new Error('Failed to save URL');
  const data = await res.json();
  return data.entry;
}

export async function deleteUrlHistoryEntry(id: string): Promise<void> {
  const res = await authDelete(`/api/url-history/${id}`);
  if (!res.ok) throw new Error('Failed to delete entry');
}

// ============================================
// VIDEO FRAMES (Frame Picker)
// ============================================

export interface VideoFrame {
  url: string;
  label: string;
  width?: number;
  height?: number;
}

export interface VideoFramesResult {
  frames: VideoFrame[];
  videoInfo: {
    title: string;
    videoId: string;
    platform: string;
    duration?: number;
    uploader?: string;
  };
}

export async function fetchVideoFrames(url: string): Promise<VideoFramesResult> {
  const res = await authGet(`/api/video/frames?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to fetch frames' }));
    throw new Error(err.error || 'Failed to fetch frames');
  }
  const json = await res.json();
  return json.data;
}

/** Progress event emitted during streaming frame extraction */
export interface FrameExtractionProgress {
  phase: 'resolving' | 'extracting' | 'done' | 'error';
  message: string;
  current?: number;
  total?: number;
  /** Partial frame received — can be shown as a preview immediately */
  frame?: VideoFrame;
}

/**
 * Streaming version of fetchVideoFrames using SSE.
 * Calls onProgress as each frame is extracted so the UI can show real progress.
 * Returns the complete VideoFramesResult when done.
 */
export async function fetchVideoFramesStreaming(
  url: string,
  onProgress: (progress: FrameExtractionProgress) => void,
): Promise<VideoFramesResult> {
  const apiBaseUrl = (await import('../config/environment')).default.apiBaseUrl;
  const endpoint = `${apiBaseUrl}/api/video/frames/stream?url=${encodeURIComponent(url)}`;

  const res = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Frame extraction failed (${res.status})`);
  }

  if (!res.body) {
    throw new Error('Streaming not supported by browser');
  }

  return new Promise<VideoFramesResult>((resolve, reject) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result: VideoFramesResult | null = null;

    // Persist across processSSELines calls — large base64 payloads
    // arrive in multiple ReadableStream chunks, so event/data state
    // must survive between calls.
    let currentEvent = '';
    let currentData = '';

    function processSSELines(text: string) {
      buffer += text;
      const lines = buffer.split('\n');
      // Keep the last potentially incomplete line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6).trim();
        } else if (line === '' && currentEvent && currentData) {
          // End of SSE message — process it
          try {
            const data = JSON.parse(currentData);
            if (currentEvent === 'progress') {
              onProgress({
                phase: data.phase || 'resolving',
                message: data.message || '',
                current: data.current,
                total: data.total,
              });
            } else if (currentEvent === 'frame') {
              onProgress({
                phase: 'extracting',
                message: `Extracted frame ${data.current} of ${data.total}`,
                current: data.current,
                total: data.total,
                frame: {
                  url: data.url,
                  label: data.label,
                  width: data.width,
                  height: data.height,
                },
              });
            } else if (currentEvent === 'complete') {
              result = {
                frames: data.frames,
                videoInfo: data.videoInfo,
              };
              onProgress({ phase: 'done', message: 'Frames ready!' });
            } else if (currentEvent === 'error') {
              reject(new Error(data.message || 'Frame extraction failed'));
            }
          } catch {
            // Ignore malformed SSE data
          }
          currentEvent = '';
          currentData = '';
        }
      }
    }

    function pump(): void {
      reader.read().then(({ done, value }) => {
        if (done) {
          // Process any remaining buffer
          if (buffer.trim()) processSSELines('\n\n');
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Stream ended without complete result'));
          }
          return;
        }
        processSSELines(decoder.decode(value, { stream: true }));
        pump();
      }).catch(reject);
    }

    pump();
  });
}

// ============================================
// AI GENERATION (uses existing thumbnail endpoints)
// ============================================

export async function generateThumbnail(payload: {
  prompt: string;
  style?: string;
  negativePrompt?: string;
}): Promise<{ imageUrl: string; thumbnailId: string }> {
  const res = await authPost('/api/thumbnails/generate', payload);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Generation failed' }));
    throw new Error(err.error || 'Generation failed');
  }
  return res.json();
}

// ============================================
// PLATFORM DETECTION
// ============================================

export function detectPlatform(url: string): string | null {
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube';
  if (/tiktok\.com/i.test(url)) return 'tiktok';
  if (/instagram\.com/i.test(url)) return 'instagram';
  if (/twitter\.com|x\.com/i.test(url)) return 'twitter';
  if (/facebook\.com|fb\.watch/i.test(url)) return 'facebook';
  if (/twitch\.tv/i.test(url)) return 'twitch';
  return null;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
