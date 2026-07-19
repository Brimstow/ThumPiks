/**
 * Feedback Module Public API
 *
 * Exports only the public surface of the feedback module.
 * Other modules should import from this file, not from internal files.
 *
 * Alignment:
 * - Modular Design: index.ts is the module boundary per AGENTS.md policy
 */

// Routes (for server.ts registration)
export { default as feedbackRoutes } from './feedback.routes';
export { default as feedbackAdminRoutes } from './feedback.admin.routes';

// Services (for service factory registration)
export { FeedbackService } from './feedback.service';
export { TicketService } from './ticket.service';
export { DigestService } from './digest.service';
export type { DigestPeriod } from './digest.service';

// Types (for consumers)
export type {
  FeedbackType,
  FeedbackPriority,
  FeedbackSentiment,
  CreateFeedbackInput,
  FeedbackRecord,
  FeedbackWithTicket,
  FeedbackListQuery,
  TicketStatus,
  TicketRecord,
  TicketWithReplies,
  TicketReplyRecord,
  TicketListQuery,
  UpdateTicketInput,
  CreateTicketReplyInput,
  PaginatedResponse,
} from './types';
