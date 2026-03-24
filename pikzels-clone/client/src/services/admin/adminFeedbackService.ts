/**
 * Admin Feedback API Service
 *
 * API client for admin feedback and ticket management endpoints.
 */

import { adminApi, adminFetch } from './adminApiClient';

export interface AdminFeedbackRecord {
  id: string;
  userId: string;
  type: string;
  subject: string;
  message: string;
  screenshotUrl: string | null;
  sentiment: string | null;
  sentimentScore: number | null;
  category: string | null;
  tags: string[];
  aiSummary: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
  Ticket?: { id: string; status: string } | null;
}

export interface AdminTicketRecord {
  id: string;
  feedbackId: string | null;
  status: string;
  assignee: string | null;
  resolution: string | null;
  internalNotes: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  Feedback?: {
    subject: string;
    type: string;
    priority: string;
  } | null;
  Replies?: AdminTicketReply[];
}

export interface AdminTicketReply {
  id: string;
  ticketId: string;
  authorType: string;
  authorId: string;
  authorName: string;
  message: string;
  isInternal: boolean;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class AdminFeedbackService {
  async listFeedback(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    priority?: string;
    sentiment?: string;
    category?: string;
  }): Promise<PaginatedResult<AdminFeedbackRecord>> {
    const result = await adminApi.get<PaginatedResult<AdminFeedbackRecord>>(
      '/support/feedback',
      params as Record<string, string | number | boolean | undefined>
    );
    // Backend returns { data: [...], total, page, pageSize, totalPages } directly.
    // adminFetch maps this as AdminApiResponse where .data = the feedback array.
    // Reconstruct the paginated shape from the raw response.
    const raw = result as unknown as PaginatedResult<AdminFeedbackRecord> & { success?: boolean };
    return { data: raw.data ?? [], total: raw.total ?? 0, page: raw.page ?? 1, pageSize: raw.pageSize ?? 20, totalPages: raw.totalPages ?? 0 };
  }

  async listTickets(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    assignee?: string;
  }): Promise<PaginatedResult<AdminTicketRecord>> {
    const result = await adminApi.get<PaginatedResult<AdminTicketRecord>>(
      '/support/tickets',
      params as Record<string, string | number | boolean | undefined>
    );
    const raw = result as unknown as PaginatedResult<AdminTicketRecord> & { success?: boolean };
    return { data: raw.data ?? [], total: raw.total ?? 0, page: raw.page ?? 1, pageSize: raw.pageSize ?? 20, totalPages: raw.totalPages ?? 0 };
  }

  async getTicket(id: string): Promise<AdminTicketRecord> {
    const result = await adminApi.get<AdminTicketRecord>(
      `/support/tickets/${id}`
    );
    // Single ticket responses are also returned directly by the backend
    return (result as unknown as AdminTicketRecord).id
      ? (result as unknown as AdminTicketRecord)
      : result.data!;
  }

  async updateTicket(
    id: string,
    data: { status?: string; assignee?: string; resolution?: string; internalNotes?: string }
  ): Promise<AdminTicketRecord> {
    const result = await adminFetch<AdminTicketRecord>(
      `/support/tickets/${id}`,
      { method: 'PATCH', body: data as Record<string, unknown> }
    );
    return (result as unknown as AdminTicketRecord).id
      ? (result as unknown as AdminTicketRecord)
      : result.data!;
  }

  async addReply(
    ticketId: string,
    message: string,
    isInternal = false
  ): Promise<AdminTicketReply> {
    const result = await adminApi.post<AdminTicketReply>(
      `/support/tickets/${ticketId}/replies`,
      { message, isInternal }
    );
    return (result as unknown as AdminTicketReply).id
      ? (result as unknown as AdminTicketReply)
      : result.data!;
  }

  async createTicket(feedbackId?: string): Promise<AdminTicketRecord> {
    const result = await adminApi.post<AdminTicketRecord>(
      '/support/tickets/create',
      { feedbackId }
    );
    return (result as unknown as AdminTicketRecord).id
      ? (result as unknown as AdminTicketRecord)
      : result.data!;
  }
}

export const adminFeedbackService = new AdminFeedbackService();
