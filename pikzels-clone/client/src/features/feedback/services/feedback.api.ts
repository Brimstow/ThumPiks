/**
 * Feedback API Service (Frontend)
 *
 * Typed API client for feedback endpoints.
 * Uses the shared authFetch/authPost/authGet helpers.
 */

import { authPost, authGet, authDelete } from '../../../utils/api';
import type {
  CreateFeedbackInput,
  FeedbackRecord,
  PaginatedResponse,
  FeedbackListParams,
} from '../types';

const BASE = '/api/feedback';

/**
 * Submit new feedback
 */
export async function submitFeedback(
  input: CreateFeedbackInput
): Promise<FeedbackRecord> {
  const res = await authPost(BASE, input);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Failed to submit feedback (${res.status})`);
  }

  return res.json();
}

/**
 * List user's feedback with pagination/filters
 */
export async function listFeedback(
  params?: FeedbackListParams
): Promise<PaginatedResponse<FeedbackRecord>> {
  const searchParams = new URLSearchParams();

  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params?.type) searchParams.set('type', params.type);
  if (params?.priority) searchParams.set('priority', params.priority);
  if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const qs = searchParams.toString();
  const url = qs ? `${BASE}?${qs}` : BASE;

  const res = await authGet(url);

  if (!res.ok) {
    throw new Error(`Failed to list feedback (${res.status})`);
  }

  return res.json();
}

/**
 * Get single feedback by ID
 */
export async function getFeedback(id: string): Promise<FeedbackRecord> {
  const res = await authGet(`${BASE}/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to get feedback (${res.status})`);
  }

  return res.json();
}

/**
 * Delete feedback by ID
 */
export async function deleteFeedback(id: string): Promise<void> {
  const res = await authDelete(`${BASE}/${id}`);

  if (!res.ok && res.status !== 204) {
    throw new Error(`Failed to delete feedback (${res.status})`);
  }
}
