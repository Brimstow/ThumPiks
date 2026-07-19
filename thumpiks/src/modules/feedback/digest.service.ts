/**
 * Feedback Digest Service
 *
 * WHAT: Generates periodic summary digests (daily/weekly) of feedback activity
 * WHY: Keeps admins informed about trends without per-item email noise
 * HOW: Queries Prisma for time-windowed aggregates, formats as HTML email via EmailService
 *
 * Alignment:
 * - Layered: service → Prisma (no controller needed, invoked by cron or admin action)
 * - DRY: Reuses EmailService + email template infrastructure
 * - Service Factory: Can be registered if needed; uses lazy singleton
 */

import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { EmailService } from '../../services/email.service';
import { logger } from '../../utils/logger';

export type DigestPeriod = 'daily' | 'weekly';

interface DigestStats {
  period: DigestPeriod;
  startDate: Date;
  endDate: Date;
  feedback: {
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    bySentiment: Record<string, number>;
    topCategories: { category: string; count: number }[];
  };
  tickets: {
    opened: number;
    resolved: number;
    closedCount: number;
    currentOpen: number;
    currentInProgress: number;
  };
  highlights: {
    criticalItems: { id: string; subject: string; type: string; priority: string }[];
    avgSentimentScore: number | null;
  };
}

export class DigestService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrisma();
  }

  /**
   * Generate and send a digest email for the given period.
   * Returns true if the email was sent (or logged) successfully.
   */
  async sendDigest(period: DigestPeriod): Promise<boolean> {
    const recipients = await this.getDigestRecipients(period);
    if (recipients.length === 0) {
      logger.info('No digest recipients configured', { period });
      return false;
    }

    const stats = await this.gatherStats(period);
    const html = this.buildDigestHtml(stats);
    const subject = this.buildSubject(stats);

    const email = EmailService.getInstance();
    const result = await email.send({
      to: recipients,
      subject,
      html,
    });

    if (result.success) {
      logger.info('Digest email sent', {
        period,
        recipients: recipients.length,
        feedbackTotal: stats.feedback.total,
      });
    } else {
      logger.error('Digest email failed', new Error(result.error || 'Unknown'), { period });
    }

    return result.success;
  }

  /**
   * Gather all statistics for the digest period.
   */
  async gatherStats(period: DigestPeriod): Promise<DigestStats> {
    const { startDate, endDate } = this.getDateRange(period);
    const dateFilter = { gte: startDate, lt: endDate };

    // Run queries in parallel for performance
    const [
      feedbackRows,
      ticketsOpened,
      ticketsResolved,
      ticketsClosed,
      currentOpenTickets,
      currentInProgressTickets,
    ] = await Promise.all([
      this.prisma.feedback.findMany({
        where: { createdAt: dateFilter },
        select: {
          id: true,
          type: true,
          subject: true,
          priority: true,
          sentiment: true,
          sentimentScore: true,
          category: true,
        },
      }),
      this.prisma.ticket.count({ where: { createdAt: dateFilter } }),
      this.prisma.ticket.count({ where: { resolvedAt: dateFilter } }),
      this.prisma.ticket.count({ where: { closedAt: dateFilter } }),
      this.prisma.ticket.count({ where: { status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
    ]);

    // Aggregate feedback stats
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const bySentiment: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const criticalItems: DigestStats['highlights']['criticalItems'] = [];
    let sentimentSum = 0;
    let sentimentCount = 0;

    for (const fb of feedbackRows) {
      byType[fb.type] = (byType[fb.type] || 0) + 1;
      byPriority[fb.priority] = (byPriority[fb.priority] || 0) + 1;

      if (fb.sentiment) {
        bySentiment[fb.sentiment] = (bySentiment[fb.sentiment] || 0) + 1;
      }
      if (fb.sentimentScore !== null) {
        sentimentSum += fb.sentimentScore;
        sentimentCount++;
      }
      if (fb.category) {
        categoryCount[fb.category] = (categoryCount[fb.category] || 0) + 1;
      }
      if (fb.priority === 'CRITICAL' || fb.priority === 'HIGH') {
        criticalItems.push({
          id: fb.id,
          subject: fb.subject,
          type: fb.type,
          priority: fb.priority,
        });
      }
    }

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period,
      startDate,
      endDate,
      feedback: {
        total: feedbackRows.length,
        byType,
        byPriority,
        bySentiment,
        topCategories,
      },
      tickets: {
        opened: ticketsOpened,
        resolved: ticketsResolved,
        closedCount: ticketsClosed,
        currentOpen: currentOpenTickets,
        currentInProgress: currentInProgressTickets,
      },
      highlights: {
        criticalItems: criticalItems.slice(0, 10),
        avgSentimentScore: sentimentCount > 0 ? sentimentSum / sentimentCount : null,
      },
    };
  }

  // ---- Private helpers ----

  private getDateRange(period: DigestPeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // start of today

    if (period === 'daily') {
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);
      return { startDate, endDate };
    }

    // weekly: last 7 days
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);
    return { startDate, endDate };
  }

  private async getDigestRecipients(period: DigestPeriod): Promise<string[]> {
    const configKey = `digest.${period}`;

    try {
      const row = await this.prisma.notificationConfig.findUnique({
        where: { key: configKey },
      });

      if (row && row.enabled) {
        return (row.emails as string[]) || [];
      }
    } catch (error) {
      logger.error('Failed to load digest config', error as Error, { configKey });
    }

    // Fallback: ADMIN_EMAIL env variable
    const fallback = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
    return fallback ? [fallback] : [];
  }

  private buildSubject(stats: DigestStats): string {
    const periodLabel = stats.period === 'daily' ? 'Daily' : 'Weekly';
    const dateStr = stats.startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return `${periodLabel} Feedback Digest - ${dateStr} (${stats.feedback.total} items)`;
  }

  private buildDigestHtml(stats: DigestStats): string {
    const periodLabel = stats.period === 'daily' ? 'Daily' : 'Weekly';
    const startStr = stats.startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const endStr = stats.endDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const priorityColors: Record<string, string> = {
      CRITICAL: '#ef4444',
      HIGH: '#f97316',
      MEDIUM: '#eab308',
      LOW: '#22c55e',
    };

    const sentimentEmoji: Record<string, string> = {
      POSITIVE: '&#128578;',
      NEGATIVE: '&#128543;',
      NEUTRAL: '&#128528;',
      MIXED: '&#129300;',
    };

    // Build type breakdown rows
    const typeRows = Object.entries(stats.feedback.byType)
      .map(
        ([type, count]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">${this.escapeHtml(type.replace(/_/g, ' '))}</td><td style="padding:4px 0;color:#6b7280;font-size:13px;font-weight:600">${count}</td></tr>`
      )
      .join('');

    // Build priority breakdown rows
    const priorityRows = Object.entries(stats.feedback.byPriority)
      .sort(([a], [b]) => {
        const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(
        ([priority, count]) =>
          `<tr><td style="padding:4px 12px 4px 0"><span style="display:inline-block;padding:1px 8px;border-radius:12px;background-color:${priorityColors[priority] || '#6b7280'}20;color:${priorityColors[priority] || '#6b7280'};font-size:12px;font-weight:600">${priority}</span></td><td style="padding:4px 0;color:#6b7280;font-size:13px;font-weight:600">${count}</td></tr>`
      )
      .join('');

    // Build sentiment breakdown rows
    const sentimentRows = Object.entries(stats.feedback.bySentiment)
      .map(
        ([sentiment, count]) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">${sentimentEmoji[sentiment] || ''} ${sentiment}</td><td style="padding:4px 0;color:#6b7280;font-size:13px;font-weight:600">${count}</td></tr>`
      )
      .join('');

    // Build top categories
    const categoryRows = stats.feedback.topCategories
      .map(
        ({ category, count }) =>
          `<tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">${this.escapeHtml(category)}</td><td style="padding:4px 0;color:#6b7280;font-size:13px;font-weight:600">${count}</td></tr>`
      )
      .join('');

    // Build critical items list
    const criticalHtml =
      stats.highlights.criticalItems.length > 0
        ? `
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#ef4444;font-size:14px;font-weight:600">Attention Required</h3>
        ${stats.highlights.criticalItems
          .map(
            (item) =>
              `<div style="padding:8px 12px;margin-bottom:6px;background-color:#fef2f2;border-radius:6px;border-left:3px solid ${priorityColors[item.priority] || '#ef4444'}">
                <span style="font-size:13px;color:#374151;font-weight:500">${this.escapeHtml(item.subject)}</span>
                <span style="font-size:11px;color:#6b7280;margin-left:8px">${item.type.replace(/_/g, ' ')} &middot; ${item.priority}</span>
              </div>`
          )
          .join('')}
      </div>`
        : '';

    // Avg sentiment display
    const avgSentiment =
      stats.highlights.avgSentimentScore !== null
        ? `<p style="margin:8px 0 0;font-size:13px;color:#6b7280">Average sentiment score: <strong>${stats.highlights.avgSentimentScore.toFixed(2)}</strong> / 1.0</p>`
        : '';

    const content = `
      <h2 style="margin:0 0 4px;color:#111827;font-size:20px">${periodLabel} Feedback Digest</h2>
      <p style="margin:0 0 24px;color:#9ca3af;font-size:13px">${startStr} &ndash; ${endStr}</p>

      <!-- Summary Cards -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
        <tr>
          <td style="padding:16px;background-color:#eff6ff;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:28px;font-weight:700;color:#2563eb">${stats.feedback.total}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Feedback Items</div>
          </td>
          <td style="width:12px"></td>
          <td style="padding:16px;background-color:#f0fdf4;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:28px;font-weight:700;color:#16a34a">${stats.tickets.resolved}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Tickets Resolved</div>
          </td>
          <td style="width:12px"></td>
          <td style="padding:16px;background-color:#fefce8;border-radius:8px;text-align:center;width:33%">
            <div style="font-size:28px;font-weight:700;color:#ca8a04">${stats.tickets.currentOpen + stats.tickets.currentInProgress}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:4px">Open Tickets</div>
          </td>
        </tr>
      </table>

      ${criticalHtml}

      <!-- Feedback Breakdown -->
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600">Feedback by Type</h3>
        <table role="presentation" cellpadding="0" cellspacing="0">${typeRows || '<tr><td style="color:#9ca3af;font-size:13px">No feedback this period</td></tr>'}</table>
      </div>

      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600">By Priority</h3>
        <table role="presentation" cellpadding="0" cellspacing="0">${priorityRows || '<tr><td style="color:#9ca3af;font-size:13px">N/A</td></tr>'}</table>
      </div>

      ${sentimentRows ? `
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600">Sentiment Distribution</h3>
        <table role="presentation" cellpadding="0" cellspacing="0">${sentimentRows}</table>
        ${avgSentiment}
      </div>` : ''}

      ${categoryRows ? `
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600">Top Categories</h3>
        <table role="presentation" cellpadding="0" cellspacing="0">${categoryRows}</table>
      </div>` : ''}

      <!-- Ticket Activity -->
      <div style="margin-bottom:24px">
        <h3 style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600">Ticket Activity</h3>
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">Opened</td><td style="font-weight:600;color:#6b7280;font-size:13px">${stats.tickets.opened}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">Resolved</td><td style="font-weight:600;color:#22c55e;font-size:13px">${stats.tickets.resolved}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">Closed</td><td style="font-weight:600;color:#6b7280;font-size:13px">${stats.tickets.closedCount}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">Currently Open</td><td style="font-weight:600;color:#f59e0b;font-size:13px">${stats.tickets.currentOpen}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#374151;font-size:13px">In Progress</td><td style="font-weight:600;color:#3b82f6;font-size:13px">${stats.tickets.currentInProgress}</td></tr>
        </table>
      </div>

      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center">
        This is an automated ${periodLabel.toLowerCase()} digest. Manage preferences in Admin &gt; Settings.
      </p>
    `;

    return this.wrapInBaseLayout(content, `${periodLabel} Feedback Digest - ${stats.feedback.total} items`);
  }

  /**
   * Minimal base layout matching the email-templates.ts pattern.
   * Uses the same structure but avoids importing a private function.
   */
  private wrapInBaseLayout(content: string, preheader: string): string {
    const BRAND_COLOR = '#6366f1';
    const APP_NAME = 'Thumbnail Maker';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5">
    <tr>
      <td align="center" style="padding:24px 16px">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
          <tr>
            <td style="background-color:${BRAND_COLOR};padding:24px 32px">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600">${APP_NAME}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px">
              ${content}
            </td>
          </tr>
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

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
