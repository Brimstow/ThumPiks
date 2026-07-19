/**
 * useCreditDeductingMutation - Wrapper for mutations that deduct credits
 * 
 * Provides optimistic credit updates with automatic rollback on failure.
 * Use this for any API call that consumes credits (thumbnail generation, vision tools, etc.)
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { optimisticDeductCredits, rollbackCredits, CreditsData } from './useCredits';

interface MutationOptions<T, R> {
  mutationFn: (variables: T) => Promise<R>;
  getCreditCost?: (variables: T) => number;
  onSuccess?: (data: R, variables: T) => void;
  onError?: (error: Error, variables: T, previousData: CreditsData | undefined) => void;
}

interface MutationState<T, R> {
  mutate: (variables: T) => Promise<R>;
  isLoading: boolean;
  error: Error | null;
  data: R | null;
}

/**
 * Hook for mutations that deduct credits with optimistic UI updates
 * 
 * @example
 * const generateThumbnail = useCreditDeductingMutation({
 *   mutationFn: async (params) => {
 *     const response = await authPost('/api/thumbnails/ai/generate', params);
 *     if (!response.ok) throw new Error('Generation failed');
 *     return response.json();
 *   },
 *   getCreditCost: (params) => params.tier === 'flash' ? 1 : 2,
 *   onError: (error) => toast.error(error.message),
 * });
 */
export function useCreditDeductingMutation<T, R>(
  options: MutationOptions<T, R>
): MutationState<T, R> {
  const queryClient = useQueryClient();
  const [state, setState] = useState<{
    isLoading: boolean;
    error: Error | null;
    data: R | null;
  }>({
    isLoading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(
    async (variables: T): Promise<R> => {
      setState({ isLoading: true, error: null, data: null });

      // Determine credit cost (default to 1 if not specified)
      const creditCost = options.getCreditCost?.(variables) ?? 1;

      // Optimistically deduct credits
      const { previousData } = optimisticDeductCredits(queryClient, creditCost);

      try {
        const result = await options.mutationFn(variables);
        
        setState({ isLoading: false, error: null, data: result });
        options.onSuccess?.(result, variables);
        
        return result;
      } catch (error) {
        // Rollback credits on failure
        rollbackCredits(queryClient, previousData);

        const err = error instanceof Error ? error : new Error('Mutation failed');
        setState({ isLoading: false, error: err, data: null });
        options.onError?.(err, variables, previousData);
        
        throw err;
      }
    },
    [queryClient, options]
  );

  return {
    mutate,
    isLoading: state.isLoading,
    error: state.error,
    data: state.data,
  };
}
