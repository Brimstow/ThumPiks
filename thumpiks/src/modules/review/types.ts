/**
 * Review Module Types
 */

export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CreateReviewInput {
  rating: number; // 1-5
  title?: string;
  body: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: string;
  niche?: string;
  improvement?: string;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  body?: string;
  channelName?: string;
  channelUrl?: string;
  subscribers?: string;
  niche?: string;
  improvement?: string;
}

export interface AdminReviewUpdate {
  status?: ReviewStatus;
  isFeatured?: boolean;
  adminNote?: string;
}

export interface ReviewRecord {
  id: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string;
  channelName: string | null;
  channelUrl: string | null;
  subscribers: string | null;
  niche: string | null;
  improvement: string | null;
  status: string;
  isFeatured: boolean;
  adminNote: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  channelName: string | null;
  subscribers: string | null;
  niche: string | null;
  improvement: string | null;
  isFeatured: boolean;
  createdAt: Date;
  authorName: string;
  authorAvatar: string | null;
}

export interface ReviewListQuery {
  page?: number;
  pageSize?: number;
  status?: ReviewStatus;
  isFeatured?: boolean;
  sortBy?: 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
