/**
 * useBackendAI Hook
 *
 * Routes all paid AI operations through the backend for unified credit billing.
 * Replaces client-side Replicate/TensorFlow for billable operations.
 */

import { useState, useCallback, useRef } from 'react';
import { authPost } from '../utils/api';

export type BackendAIOperation =
  | 'generate'
  | 'inpaint'
  | 'face-swap'
  | 'upscale'
  | 'remove-background'
  | 'enhance'
  | 'expand'
  | 'segment';

export interface UseBackendAIReturn {
  callBackendAI: (
    operation: BackendAIOperation,
    request: Record<string, unknown>
  ) => Promise<string[]>;
  isLoading: boolean;
  error: string | null;
  result: string[] | null;
  progress: number;
}

export function useBackendAI(): UseBackendAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const callBackendAI = useCallback(
    async (
      operation: BackendAIOperation,
      request: Record<string, unknown>
    ): Promise<string[]> => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setProgress(0);

      // Simulate progress while waiting for the API
      progressRef.current = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      try {
        const endpoint = `/api/thumbnails/ai/${operation}`;

        const response = await authPost(endpoint, request);

        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
        setProgress(100);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          if (response.status === 402) {
            throw new Error(
              data.error || 'Insufficient credits. Please purchase more credits.'
            );
          }
          if (response.status === 401) {
            throw new Error('Not authenticated. Please log in.');
          }
          if (response.status === 503) {
            throw new Error('AI service is not configured.');
          }

          throw new Error(
            data.error || `Request failed (${response.status})`
          );
        }

        const data = await response.json();

        if (!data.success || !data.images || data.images.length === 0) {
          throw new Error('No images returned from API');
        }

        setResult(data.images);
        return data.images;
      } catch (err) {
        if (progressRef.current) {
          clearInterval(progressRef.current);
          progressRef.current = null;
        }
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { callBackendAI, isLoading, error, result, progress };
}
