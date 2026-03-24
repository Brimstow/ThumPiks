/**
 * Feedback Module Types
 *
 * Shared type definitions for the feedback + ticketing system.
 * Consumed by service, controller, routes, and frontend API client.
 */

// ============================================
// FEEDBACK TYPES
// ============================================

export type FeedbackType = 'BUG' | 'FEATURE_REQUEST' | 'GENERAL';
export type FeedbackPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FeedbackSentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED';

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
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedbackWithTicket extends FeedbackRecord {
  Ticket?: TicketRecord | null;
}

export interface FeedbackAIAnalysis {
  sentiment: FeedbackSentiment;
  sentimentScore: number;
  category: string;
  tags: string[];
  summary: string;
  priority: FeedbackPriority;
}

// ============================================
// TICKET TYPES
// ============================================

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED' | 'CLOSED';
export type AuthorType = 'ADMIN' | 'USER';

export interface TicketRecord {
  id: string;
  feedbackId: string | null;
  status: string;
  assignee: string | null;
  resolution: string | null;
  internalNotes: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketWithReplies extends TicketRecord {
  Replies: TicketReplyRecord[];
  Feedback?: FeedbackRecord | null;
}

export interface TicketReplyRecord {
  id: string;
  ticketId: string;
  authorType: string;
  authorId: string;
  authorName: string;
  message: string;
  isInternal: boolean;
  createdAt: Date;
}

export interface CreateTicketReplyInput {
  message: string;
  isInternal?: boolean;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  assignee?: string | null;
  resolution?: string;
  internalNotes?: string;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FeedbackListQuery {
  page?: number;
  pageSize?: number;
  type?: FeedbackType;
  priority?: FeedbackPriority;
  sentiment?: FeedbackSentiment;
  category?: string;
  sortBy?: 'createdAt' | 'priority' | 'sentiment';
  sortOrder?: 'asc' | 'desc';
}

export interface TicketListQuery {
  page?: number;
  pageSize?: number;
  status?: TicketStatus;
  assignee?: string;
  sortBy?: 'createdAt' | 'status' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
