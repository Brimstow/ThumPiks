/**
 * Contact Module Types
 *
 * WHAT: TypeScript types for contact form submission
 * WHY: Type safety for contact form inputs, validation, and responses
 * HOW: Matches Prisma schema ContactSubmission model + spam protection fields
 */

// ============================================
// FORM INPUT TYPES
// ============================================

export type ContactSubject = 'general' | 'support' | 'billing' | 'feature' | 'bug';

export interface ContactFormInput {
  name: string;
  email: string;
  subject: ContactSubject;
  message: string;
  // Spam protection fields
  honeypot?: string; // Should be empty - bots will fill this
  formLoadTime?: number; // Timestamp when form was loaded (ms)
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ContactValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface SpamCheckResult {
  isSpam: boolean;
  reason?: string;
  score: number; // 0-1, higher = more likely spam
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface ContactSubmissionResponse {
  success: boolean;
  message: string;
  submissionId?: string;
}

export interface ContactSubmissionRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactSubmissionStatus;
  ipAddress?: string | null;
  createdAt: Date;
  resolvedAt?: Date | null;
  ticketId?: string | null;
  userId?: string | null;
}

export type ContactSubmissionStatus =
  | 'PENDING'
  | 'TRIAGED'
  | 'AUTO_RESOLVED'
  | 'TICKET_CREATED'
  | 'DISMISSED';

// ============================================
// QUERY TYPES (for admin)
// ============================================

export interface ContactListQuery {
  page?: number;
  pageSize?: number;
  status?: ContactSubmissionStatus;
  subject?: ContactSubject;
  sortBy?: 'createdAt' | 'email' | 'status';
  sortOrder?: 'asc' | 'desc';
  search?: string; // Search by name, email, or message content
}

export interface ContactListResponse {
  data: ContactSubmissionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// CONSTANTS
// ============================================

export const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  general: 'General Inquiry',
  support: 'Technical Support',
  billing: 'Billing Question',
  feature: 'Feature Request',
  bug: 'Bug Report',
};

export const CONTACT_VALIDATION = {
  name: {
    minLength: 1,
    maxLength: 100,
  },
  email: {
    maxLength: 255,
  },
  subject: {
    allowedValues: ['general', 'support', 'billing', 'feature', 'bug'] as ContactSubject[],
  },
  message: {
    minLength: 10,
    maxLength: 5000,
  },
} as const;

// Spam protection constants
export const SPAM_PROTECTION = {
  // Minimum time (ms) a human should take to fill the form
  minFormFillTime: 3000, // 3 seconds
  // Maximum submissions per IP per hour
  maxSubmissionsPerHour: 5,
  // Maximum submissions per IP per day
  maxSubmissionsPerDay: 10,
  // Suspicious keywords that increase spam score
  spamKeywords: [
    'buy now',
    'click here',
    'free money',
    'viagra',
    'casino',
    'lottery winner',
    'nigerian prince',
    'crypto investment',
    'make money fast',
  ],
} as const;
