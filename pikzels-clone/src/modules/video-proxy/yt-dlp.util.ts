import { spawn, SpawnOptions } from 'child_process';
import { Readable, PassThrough } from 'stream';
import { logger } from '../../utils/logger';

export interface YtDlpVideoInfo {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  thumbnail?: string;
  uploader?: string;
  upload_date?: string;
  view_count?: number;
  like_count?: number;
  extractor: string;
  extractor_key: string;
  webpage_url: string;
  thumbnails?: { url: string; width?: number; height?: number; id?: string }[];
  formats?: YtDlpFormat[];
}

export interface YtDlpFormat {
  format_id: string;
  format_note?: string;
  ext: string;
  resolution?: string;
  width?: number;
  height?: number;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  url?: string;
}

/**
 * yt-dlp wrapper for Node.js
 * Supports 1000+ video platforms including YouTube, Instagram, TikTok, Twitter, Twitch, etc.
 */
class YtDlpUtil {
  // Use Python module invocation since yt-dlp.exe may not be in PATH
  private readonly ytdlpCommand = process.platform === 'win32' ? 'py' : 'python3';
  private readonly ytdlpArgs = process.platform === 'win32' ? ['-m', 'yt_dlp'] : ['-m', 'yt_dlp'];

  /**
   * Get video metadata without downloading
   */
  async getVideoInfo(url: string): Promise<YtDlpVideoInfo> {
    const args = [
      ...this.ytdlpArgs,
      '--dump-json',
      '--no-download',
      '--no-warnings',
      '--no-playlist',
      url,
    ];

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn(this.ytdlpCommand, args, {
        timeout: 30000,
        windowsHide: true,
      } as SpawnOptions);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        logger.error(`yt-dlp spawn error: ${error.message} for URL: ${url}`);
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          logger.error(`yt-dlp failed with code ${code} for URL: ${url}. stderr: ${stderr}`);
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const info = JSON.parse(stdout) as YtDlpVideoInfo;
          resolve(info);
        } catch (parseError) {
          logger.error(`Failed to parse yt-dlp output for URL: ${url}. stdout length: ${stdout.length}`);
          reject(new Error('Failed to parse video info'));
        }
      });
    });
  }

  /**
   * Get video stream URL without downloading
   * Returns the direct URL that can be streamed
   */
  async getStreamUrl(url: string, quality: 'best' | 'worst' | 'bestaudio' = 'best'): Promise<string> {
    const formatSelector = quality === 'bestaudio' 
      ? 'bestaudio/best' 
      : quality === 'worst' 
        ? 'worst' 
        : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

    const args = [
      ...this.ytdlpArgs,
      '--get-url',
      '--no-warnings',
      '--no-playlist',
      '-f', formatSelector,
      url,
    ];

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      const proc = spawn(this.ytdlpCommand, args, {
        timeout: 30000,
        windowsHide: true,
      } as SpawnOptions);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          logger.error(`yt-dlp get-url failed with code ${code} for URL: ${url}. stderr: ${stderr}`);
          reject(new Error(`yt-dlp exited with code ${code}: ${stderr}`));
          return;
        }

        // yt-dlp may return multiple URLs (video + audio), take the first one
        const streamUrl = stdout.trim().split('\n')[0];
        if (!streamUrl) {
          reject(new Error('No stream URL returned'));
          return;
        }

        resolve(streamUrl);
      });
    });
  }

  /**
   * Download video and return as a readable stream
   * Streams directly to response without saving to disk
   */
  async getVideoStream(url: string, quality: 'best' | 'worst' = 'best'): Promise<Readable> {
    const formatSelector = quality === 'worst' 
      ? 'worst' 
      : 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best';

    const args = [
      ...this.ytdlpArgs,
      '-f', formatSelector,
      '--no-warnings',
      '--no-playlist',
      '-o', '-', // Output to stdout
      url,
    ];

    const proc = spawn(this.ytdlpCommand, args, {
      windowsHide: true,
    } as SpawnOptions);

    const passThrough = new PassThrough();

    proc.stdout?.pipe(passThrough);

    proc.stderr?.on('data', (data) => {
      const msg = data.toString();
      // Log progress but ignore non-error messages
      if (msg.includes('ERROR') || msg.includes('error')) {
        logger.error(`yt-dlp stream error for URL: ${url}. Message: ${msg}`);
      }
    });

    proc.on('error', (error) => {
      logger.error(`yt-dlp stream spawn error: ${error.message} for URL: ${url}`);
      passThrough.destroy(new Error(`Failed to spawn yt-dlp: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0 && code !== null) {
        logger.warn('yt-dlp stream exited', { code, url });
      }
    });

    return passThrough;
  }

  /**
   * Check if a URL is supported by yt-dlp
   */
  async isSupported(url: string): Promise<boolean> {
    const args = [
      ...this.ytdlpArgs,
      '--simulate',
      '--no-warnings',
      '--no-download',
      url,
    ];

    return new Promise((resolve) => {
      const proc = spawn(this.ytdlpCommand, args, {
        timeout: 15000,
        windowsHide: true,
      } as SpawnOptions);

      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    });
  }

  /**
   * Get list of supported extractors
   */
  async getExtractors(): Promise<string[]> {
    const args = [...this.ytdlpArgs, '--list-extractors'];

    return new Promise((resolve, reject) => {
      let stdout = '';

      const proc = spawn(this.ytdlpCommand, args, {
        timeout: 10000,
        windowsHide: true,
      } as SpawnOptions);

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.on('error', (error) => {
        reject(error);
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Failed to get extractors`));
          return;
        }
        resolve(stdout.trim().split('\n').filter(Boolean));
      });
    });
  }
}

export const ytDlpUtil = new YtDlpUtil();
export default ytDlpUtil;
