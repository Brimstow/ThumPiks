/**
 * Contact Module
 *
 * WHAT: Contact form submission handling with spam protection
 * WHY: Provides public contact form API with validation, spam detection, and admin management
 * HOW: Exports contact routes for mounting in server.ts
 *
 * Public Endpoint:
 * - POST /api/contact - Submit contact form (no auth required)
 *
 * Admin Endpoints (auth required):
 * - GET /api/contact - List submissions
 * - GET /api/contact/stats - Get statistics
 * - GET /api/contact/:id - Get single submission
 * - PATCH /api/contact/:id/status - Update submission status
 */

export { default as contactRoutes } from './contact.routes';
export { ContactService } from './contact.service';
export type {
  ContactFormInput,
  ContactSubject,
  ContactSubmissionResponse,
  ContactSubmissionRecord,
  ContactListQuery,
  ContactListResponse,
  ContactSubmissionStatus,
  SpamCheckResult,
  ContactValidationResult,
} from './types';
export {
  CONTACT_SUBJECT_LABELS,
  CONTACT_VALIDATION,
  SPAM_PROTECTION,
} from './types';
