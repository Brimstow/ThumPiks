/**
 * useFeedback Hook
 *
 * React hook for submitting feedback and managing submission state.
 * Used by the FeedbackWidget component.
 */

import { useState, useCallback } from 'react';
import { submitFeedback } from '../services/feedback.api';
import type { CreateFeedbackInput, FeedbackRecord } from '../types';

interface UseFeedbackReturn {
  submit: (input: CreateFeedbackInput) => Promise<FeedbackRecord>;
  isSubmitting: boolean;
  error: string | null;
  lastSubmitted: FeedbackRecord | null;
  reset: () => void;
}

export function useFeedback(): UseFeedbackReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState<FeedbackRecord | null>(null);

  const submit = useCallback(async (input: CreateFeedbackInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitFeedback(input);
      setLastSubmitted(result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(msg);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setLastSubmitted(null);
  }, []);

  return { submit, isSubmitting, error, lastSubmitted, reset };
}
