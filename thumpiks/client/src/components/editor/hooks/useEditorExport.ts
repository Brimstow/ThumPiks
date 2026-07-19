import { useState, useCallback, useEffect } from 'react';
import { authPost } from '../../../utils/api';
import { drawTiledWatermark } from '../../../utils/drawWatermark';
import { safeCanvasToBlob, safeCanvasToDataURL } from '../../../utils/browserCompat';

interface UseEditorExportOptions {
  isYouTubeMode: boolean;
  shouldWatermark: boolean;
  watermarkFreeRemaining: number;
  refreshSubscription: () => void;
}

interface UseEditorExportReturn {
  exportFormat: 'png' | 'jpg' | 'webp';
  setExportFormat: (format: 'png' | 'jpg' | 'webp') => void;
  exportQuality: number;
  setExportQuality: (quality: number) => void;
  isExporting: boolean;
  exportError: string | null;
  setExportError: (error: string | null) => void;
  handleExport: () => Promise<void>;
  handleSave: (opts: {
    thumbnailId?: string;
    adjustments?: any;
    layers: any[];
    markSaved: () => void;
    onSave?: (data: { layers: any[]; preview: string }) => void;
  }) => Promise<void>;
}

const YOUTUBE_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export function useEditorExport({
  isYouTubeMode,
  shouldWatermark,
  watermarkFreeRemaining,
  refreshSubscription,
}: UseEditorExportOptions): UseEditorExportReturn {
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(85);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Auto-switch to JPG when YouTube mode is activated
  useEffect(() => {
    if (isYouTubeMode && exportFormat !== 'jpg') {
      setExportFormat('jpg');
      setExportQuality(90);
    }
  }, [isYouTubeMode]);

  const canvasToOptimizedBlob = useCallback(async (
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpg' | 'webp',
    initialQuality: number,
    maxSizeBytes?: number
  ): Promise<{ blob: Blob; finalQuality: number }> => {
    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

    if (format === 'png') {
      const blob = await safeCanvasToBlob(canvas, mimeType);
      if (blob) return { blob, finalQuality: 100 };
      throw new Error('Failed to create PNG blob');
    }

    let quality = initialQuality / 100;
    let blob: Blob | null = null;
    let attempts = 0;
    const maxAttempts = 10;
    const qualityStep = 0.1;

    while (attempts < maxAttempts) {
      blob = await safeCanvasToBlob(canvas, mimeType, quality);
      if (!blob) throw new Error(`Failed to create ${format.toUpperCase()} blob`);
      if (!maxSizeBytes || blob.size <= maxSizeBytes) {
        return { blob, finalQuality: Math.round(quality * 100) };
      }
      quality = Math.max(0.1, quality - qualityStep);
      attempts++;
    }

    if (blob && maxSizeBytes && blob.size > maxSizeBytes) {
      console.warn(`[Export] Could not reduce file size below ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB`);
    }

    return { blob: blob!, finalQuality: Math.round(quality * 100) };
  }, []);

  const handleExport = useCallback(async () => {
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    setIsExporting(true);
    setExportError(null);

    try {
      let extension: string;
      let maxSize: number | undefined;

      switch (exportFormat) {
        case 'jpg':
          extension = 'jpg';
          maxSize = isYouTubeMode ? YOUTUBE_MAX_FILE_SIZE : undefined;
          break;
        case 'webp':
          extension = 'webp';
          break;
        case 'png':
        default:
          extension = 'png';
          break;
      }

      let exportCanvas = canvas;
      let usedWatermarkFree = false;
      if (shouldWatermark) {
        if (watermarkFreeRemaining > 0) {
          try {
            const wmResponse = await authPost('/api/subscription/use-watermark-free-export', {});
            if (wmResponse.ok) usedWatermarkFree = true;
          } catch { /* fall through to watermarked export */ }
        }

        if (!usedWatermarkFree) {
          const clone = document.createElement('canvas');
          clone.width = canvas.width;
          clone.height = canvas.height;
          const ctx = clone.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0);
            drawTiledWatermark(ctx, clone.width, clone.height);
            exportCanvas = clone;
          }
        }
      }

      const { blob, finalQuality } = await canvasToOptimizedBlob(
        exportCanvas,
        exportFormat,
        exportQuality,
        maxSize
      );

      if (isYouTubeMode && blob.size > YOUTUBE_MAX_FILE_SIZE) {
        setExportError(`File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds YouTube's 2MB limit. Try reducing canvas size or using simpler content.`);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `thumbnail-${Date.now()}${isYouTubeMode ? '-youtube' : ''}.${extension}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      if (finalQuality !== exportQuality) {
        setExportQuality(finalQuality);
      }

      if (usedWatermarkFree) {
        refreshSubscription();
      }
    } catch (error) {
      console.error('[Export] Error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, exportQuality, isYouTubeMode, canvasToOptimizedBlob, shouldWatermark, watermarkFreeRemaining, refreshSubscription]);

  const handleSave = useCallback(async (opts: {
    thumbnailId?: string;
    adjustments?: any;
    layers: any[];
    markSaved: () => void;
    onSave?: (data: { layers: any[]; preview: string }) => void;
  }) => {
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const preview = safeCanvasToDataURL(canvas, 'image/png');

    if (opts.thumbnailId && opts.adjustments) {
      try {
        const response = await authPost(`/api/thumbnails/${opts.thumbnailId}/edit`, { edits: opts.adjustments });
        if (!response.ok) throw new Error('Failed to save adjustments');
        opts.markSaved();
      } catch (error) {
        console.error('Error saving adjustments:', error);
        return;
      }
    } else {
      opts.markSaved();
    }

    opts.onSave?.({ layers: opts.layers, preview });
  }, []);

  return {
    exportFormat,
    setExportFormat,
    exportQuality,
    setExportQuality,
    isExporting,
    exportError,
    setExportError,
    handleExport,
    handleSave,
  };
}
