/**
 * Email Templates
 *
 * WHAT: Reusable HTML email templates for the feedback + contact systems
 * WHY: Separates presentation from logic, consistent branding across all emails
 * HOW: Pure functions that return HTML strings - no side effects, easy to test
 *
 * Alignment:
 * - DRY: Shared base layout, per-email content sections
 * - Modular Design: Consumed by NotificationRouter and ContactService
 */

// ============================================
// BASE LAYOUT
// ============================================

const APP_NAME = 'ThumPiks';
const BRAND_COLOR = '#6366f1'; // Indigo-500

function baseLayout(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>` : ''}
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5">
    <tr>
      <td align="center" style="padding:24px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600">${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
                This is an automated message from ${APP_NAME}. Please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// FEEDBACK TEMPLATES
// ============================================

interface FeedbackNotificationData {
  feedbackId: string;
  userName: string;
  userEmail: string;
  type: string;
  subject: string;
  message: string;
  sentiment?: string;
  category?: string;
  priority: string;
  aiSummary?: string;
  screenshotUrl?: string;
}

export function feedbackSubmittedEmail(data: FeedbackNotificationData): string {
  const priorityColors: Record<string, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#eab308',
    LOW: '#22c55e',
  };

  const priorityColor = priorityColors[data.priority] || '#6b7280';
  const typeLabel = data.type.replace(/_/g, ' ');

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px">New Feedback Submitted</h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">From:</strong>
          <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.userName)} (${escapeHtml(data.userEmail)})</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Type:</strong>
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:#ede9fe;color:#7c3aed;font-size:12px;margin-left:8px">${escapeHtml(typeLabel)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Priority:</strong>
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;background-color:${priorityColor}20;color:${priorityColor};font-size:12px;font-weight:600;margin-left:8px">${data.priority}</span>
        </td>
      </tr>
      ${
        data.sentiment
          ? `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Sentiment:</strong>
          <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.sentiment)}</span>
        </td>
      </tr>`
          : ''
      }
      ${
        data.category
          ? `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Category:</strong>
          <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.category)}</span>
        </td>
      </tr>`
          : ''
      }
    </table>

    <div style="margin-bottom:20px">
      <h3 style="margin:0 0 8px;color:#374151;font-size:14px">${escapeHtml(data.subject)}</h3>
      <div style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;border-left:3px solid ${BRAND_COLOR};color:#374151;font-size:14px;line-height:1.6">
        ${escapeHtml(data.message).replace(/\n/g, '<br>')}
      </div>
    </div>

    ${
      data.aiSummary
        ? `
    <div style="margin-bottom:20px;padding:12px 16px;background-color:#ede9fe;border-radius:6px">
      <strong style="color:#7c3aed;font-size:12px;text-transform:uppercase">AI Summary</strong>
      <p style="margin:8px 0 0;color:#374151;font-size:14px">${escapeHtml(data.aiSummary)}</p>
    </div>`
        : ''
    }

    ${
      data.screenshotUrl
        ? `
    <div style="margin-bottom:20px">
      <strong style="color:#374151;font-size:12px">Attached Screenshot:</strong>
      <div style="margin-top:8px">
        <img src="${escapeHtml(data.screenshotUrl)}" alt="Screenshot" style="max-width:100%;border-radius:6px;border:1px solid #e5e7eb">
      </div>
    </div>`
        : ''
    }

    <p style="margin:0;font-size:13px;color:#9ca3af">Feedback ID: ${data.feedbackId}</p>
  `;

  return baseLayout(content, `New ${typeLabel} feedback from ${data.userName}`);
}

// ============================================
// TICKET TEMPLATES
// ============================================

interface TicketStatusData {
  ticketId: string;
  status: string;
  subject: string;
  resolution?: string;
  assignee?: string;
}

export function ticketStatusEmail(data: TicketStatusData): string {
  const statusColors: Record<string, string> = {
    OPEN: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    WAITING: '#8b5cf6',
    RESOLVED: '#22c55e',
    CLOSED: '#6b7280',
  };

  const statusColor = statusColors[data.status] || '#6b7280';

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px">Ticket Status Updated</h2>

    <div style="margin-bottom:20px;padding:16px;background-color:#f9fafb;border-radius:6px">
      <p style="margin:0 0 8px">
        <strong style="color:#374151">Subject:</strong>
        <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.subject)}</span>
      </p>
      <p style="margin:0 0 8px">
        <strong style="color:#374151">Status:</strong>
        <span style="display:inline-block;padding:2px 10px;border-radius:12px;background-color:${statusColor}20;color:${statusColor};font-size:12px;font-weight:600;margin-left:8px">${data.status.replace(/_/g, ' ')}</span>
      </p>
      ${
        data.assignee
          ? `
      <p style="margin:0 0 8px">
        <strong style="color:#374151">Assigned to:</strong>
        <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.assignee)}</span>
      </p>`
          : ''
      }
    </div>

    ${
      data.resolution
        ? `
    <div style="margin-bottom:20px">
      <h3 style="margin:0 0 8px;color:#374151;font-size:14px">Resolution</h3>
      <div style="padding:12px 16px;background-color:#f0fdf4;border-radius:6px;border-left:3px solid #22c55e;color:#374151;font-size:14px;line-height:1.6">
        ${escapeHtml(data.resolution).replace(/\n/g, '<br>')}
      </div>
    </div>`
        : ''
    }

    <p style="margin:0;font-size:13px;color:#9ca3af">Ticket ID: ${data.ticketId}</p>
  `;

  return baseLayout(content, `Ticket ${data.status}: ${data.subject}`);
}

// ============================================
// CONTACT FORM TEMPLATES
// ============================================

interface ContactAutoResponseData {
  name: string;
  subject: string;
  originalMessage: string;
  aiResponse?: string;
  ticketCreated: boolean;
  ticketId?: string;
}

export function contactAutoResponseEmail(
  data: ContactAutoResponseData
): string {
  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px">Thank you for contacting us, ${escapeHtml(data.name)}</h2>

    <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6">
      We received your message regarding <strong>"${escapeHtml(data.subject)}"</strong> and wanted to let you know we're looking into it.
    </p>

    ${
      data.aiResponse
        ? `
    <div style="margin-bottom:20px;padding:16px;background-color:#eff6ff;border-radius:6px;border-left:3px solid #3b82f6">
      <strong style="color:#1d4ed8;font-size:12px;text-transform:uppercase">Quick Response</strong>
      <p style="margin:8px 0 0;color:#374151;font-size:14px;line-height:1.6">${escapeHtml(data.aiResponse).replace(/\n/g, '<br>')}</p>
    </div>`
        : ''
    }

    ${
      data.ticketCreated
        ? `
    <div style="margin-bottom:20px;padding:12px 16px;background-color:#f0fdf4;border-radius:6px">
      <p style="margin:0;color:#374151;font-size:14px">
        A support ticket has been created for your request${data.ticketId ? ` (Ref: <strong>${data.ticketId.slice(0, 8)}</strong>)` : ''}.
        Our team will follow up with you directly.
      </p>
    </div>`
        : ''
    }

    <div style="margin-bottom:20px">
      <h3 style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase">Your Message</h3>
      <div style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;color:#6b7280;font-size:13px;line-height:1.5">
        ${escapeHtml(data.originalMessage).replace(/\n/g, '<br>')}
      </div>
    </div>

    <p style="margin:0;color:#374151;font-size:14px;line-height:1.6">
      If you need immediate assistance, reply to this email or visit our help center.
    </p>
  `;

  return baseLayout(content, `We received your message: "${data.subject}"`);
}

interface ContactAdminNotificationData {
  submissionId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  triageResult?: {
    intent?: string;
    sentiment?: string;
    confidence?: number;
    isSpam?: boolean;
    suggestedAction?: string;
  };
  screenshotUrl?: string;
}

export function contactAdminNotificationEmail(
  data: ContactAdminNotificationData
): string {
  const triage = data.triageResult;

  const content = `
    <h2 style="margin:0 0 16px;color:#111827;font-size:18px">New Contact Form Submission</h2>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">From:</strong>
          <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.name)} (${escapeHtml(data.email)})</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Subject:</strong>
          <span style="color:#6b7280;margin-left:8px">${escapeHtml(data.subject)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
          <strong style="color:#374151">Status:</strong>
          <span style="color:#6b7280;margin-left:8px">${data.status}</span>
        </td>
      </tr>
    </table>

    ${
      triage
        ? `
    <div style="margin-bottom:20px;padding:12px 16px;background-color:#fefce8;border-radius:6px;border-left:3px solid #eab308">
      <strong style="color:#854d0e;font-size:12px;text-transform:uppercase">AI Triage Result</strong>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:8px">
        ${triage.intent ? `<tr><td style="padding:2px 8px 2px 0;color:#374151;font-size:13px"><strong>Intent:</strong></td><td style="color:#6b7280;font-size:13px">${escapeHtml(triage.intent)}</td></tr>` : ''}
        ${triage.sentiment ? `<tr><td style="padding:2px 8px 2px 0;color:#374151;font-size:13px"><strong>Sentiment:</strong></td><td style="color:#6b7280;font-size:13px">${escapeHtml(triage.sentiment)}</td></tr>` : ''}
        ${triage.confidence !== undefined ? `<tr><td style="padding:2px 8px 2px 0;color:#374151;font-size:13px"><strong>Confidence:</strong></td><td style="color:#6b7280;font-size:13px">${(triage.confidence * 100).toFixed(0)}%</td></tr>` : ''}
        ${triage.suggestedAction ? `<tr><td style="padding:2px 8px 2px 0;color:#374151;font-size:13px"><strong>Suggested:</strong></td><td style="color:#6b7280;font-size:13px">${escapeHtml(triage.suggestedAction)}</td></tr>` : ''}
        ${triage.isSpam ? `<tr><td colspan="2" style="padding:4px 0;color:#ef4444;font-size:13px;font-weight:600">Flagged as potential spam</td></tr>` : ''}
      </table>
    </div>`
        : ''
    }

    <div style="margin-bottom:20px">
      <h3 style="margin:0 0 8px;color:#374151;font-size:14px">Message</h3>
      <div style="padding:12px 16px;background-color:#f9fafb;border-radius:6px;border-left:3px solid ${BRAND_COLOR};color:#374151;font-size:14px;line-height:1.6">
        ${escapeHtml(data.message).replace(/\n/g, '<br>')}
      </div>
    </div>

    ${
      data.screenshotUrl
        ? `
    <div style="margin-bottom:20px">
      <strong style="color:#374151;font-size:12px">Attached Screenshot:</strong>
      <div style="margin-top:8px">
        <img src="${escapeHtml(data.screenshotUrl)}" alt="Screenshot" style="max-width:100%;border-radius:6px;border:1px solid #e5e7eb">
      </div>
    </div>`
        : ''
    }

    <p style="margin:0;font-size:13px;color:#9ca3af">Submission ID: ${data.submissionId}</p>
  `;

  return baseLayout(content, `Contact form: ${data.subject} from ${data.name}`);
}

// ============================================
// UTILITY
// ============================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
