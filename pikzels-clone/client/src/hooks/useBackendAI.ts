/**
 * useBackendAI Hook
 *
 * Routes all paid AI operations through the backend for unified credit billing.
 * Replaces client-side Replicate/TensorFlow for billable operations.
 *
 * JJ: Now includes per-tool AbortController + timeout + cancel support.
 * The hook exposes `cancel()` and `isAborted` so consumers (AIToolsPanel)
 * can wire up cancel buttons and handle timeout/abort errors.
 */

import { useState, useCallback, useRef } from 'react';
import { authPost, createAIToolAbortController } from '../utils/api';

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
  /** JJ: Cancel the current in-flight AI request */
  cancel: () => void;
  /** JJ: True when the last error was caused by abort/timeout (not a server error) */
  isAborted: boolean;
}

export function useBackendAI(): UseBackendAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);
  const [progress, setProgress] = useState(0);
  const [isAborted, setIsAborted] = useState(false);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // JJ: Track the active AbortController + its timeout so we can cancel on demand
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** JJ: Cancel any in-flight AI request */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    abortRef.current = null;
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setIsLoading(false);
    setProgress(0);
    setIsAborted(true);
    setError('Operation cancelled.');
  }, []);

  const callBackendAI = useCallback(
    async (
      operation: BackendAIOperation,
      request: Record<string, unknown>
    ): Promise<string[]> => {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setProgress(0);
      setIsAborted(false);

      // JJ: Per-tool AbortController with timeout
      const { controller, timeoutId } = createAIToolAbortController(operation);
      abortRef.current = controller;
      timeoutRef.current = timeoutId;

      // Simulate progress while waiting for the API
      progressRef.current = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      try {
        const endpoint = `/api/thumbnails/ai/${operation}`;

        const response = await authPost(endpoint, request, { signal: controller.signal });

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
        // JJ: Distinguish abort/timeout from real errors
        if (err instanceof Error && err.name === 'AbortError') {
          setIsAborted(true);
          setError('Operation timed out or was cancelled. Please try again.');
        } else {
          const errorMessage =
            err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage);
        }
        throw err;
      } finally {
        // JJ: Clean up timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        abortRef.current = null;
        setIsLoading(false);
      }
    },
    []
  );

  return { callBackendAI, isLoading, error, result, progress, cancel, isAborted };
}
