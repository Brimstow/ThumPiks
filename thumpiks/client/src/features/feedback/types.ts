/**
 * Feedback Feature Types (Frontend)
 *
 * Mirrors backend types for type-safe API communication.
 */

export type FeedbackType = 'BUG' | 'FEATURE_REQUEST' | 'GENERAL';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateFeedbackInput {
  type: FeedbackType;
  subject: string;
  message: string;
  screenshotUrl?: string;
  screenshotPublicId?: string;
}

export interface FeedbackRecord {
  id: string;
  userId: string;
  type: string;
  subject: string;
  message: string;
  screenshotUrl: string | null;
  screenshotPublicId: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  category: string | null;
  tags: string[];
  aiSummary: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeedbackListParams {
  page?: number;
  pageSize?: number;
  type?: FeedbackType;
  priority?: FeedbackPriority;
  sortBy?: 'createdAt' | 'priority';
  sortOrder?: 'asc' | 'desc';
}
