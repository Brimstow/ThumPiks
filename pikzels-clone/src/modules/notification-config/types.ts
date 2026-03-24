/**
 * Notification Config Types
 *
 * Shared types for the notification configuration module.
 */

export type NotificationChannel = 'admin_panel' | 'email';

export const VALID_CHANNELS: NotificationChannel[] = ['admin_panel', 'email'];

/** Known event keys the system emits. Admin can configure routing for each. */
export const KNOWN_EVENT_KEYS = [
  'feedback.submitted',
  'feedback.urgent',
  'ticket.created',
  'ticket.updated',
  'ticket.escalated',
  'contact.submitted',
  'digest.weekly',
] as const;

export type KnownEventKey = (typeof KNOWN_EVENT_KEYS)[number];

export interface NotificationConfigRow {
  id: string;
  key: string;
  channels: NotificationChannel[];
  emails: string[];
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertConfigInput {
  key: string;
  channels: NotificationChannel[];
  emails: string[];
  enabled: boolean;
}

/** Human-readable labels for event keys */
export const EVENT_KEY_LABELS: Record<string, { label: string; description: string }> = {
  'feedback.submitted': {
    label: 'Feedback Submitted',
    description: 'When a user submits feedback via the widget or chatbot',
  },
  'feedback.urgent': {
    label: 'Urgent Feedback',
    description: 'When AI flags feedback as high-priority or critical',
  },
  'ticket.created': {
    label: 'Ticket Created',
    description: 'When a new support ticket is created',
  },
  'ticket.updated': {
    label: 'Ticket Updated',
    description: 'When a ticket status changes or receives a reply',
  },
  'ticket.escalated': {
    label: 'Ticket Escalated',
    description: 'When a chatbot conversation escalates to a ticket',
  },
  'contact.submitted': {
    label: 'Contact Form Submitted',
    description: 'When someone submits the public contact form',
  },
  'digest.weekly': {
    label: 'Weekly Digest',
    description: 'Scheduled weekly summary of feedback and tickets',
  },
};
