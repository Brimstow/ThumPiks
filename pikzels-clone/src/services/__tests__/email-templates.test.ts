// ── Tests ────────────────────────────────────────────────────────────

import {
  feedbackSubmittedEmail,
  ticketStatusEmail,
  contactAutoResponseEmail,
  contactAdminNotificationEmail,
} from '../email-templates';

describe('Email Templates', () => {
  describe('feedbackSubmittedEmail', () => {
    const baseData = {
      feedbackId: 'fb-123',
      userName: 'John Doe',
      userEmail: 'john@test.com',
      type: 'BUG',
      subject: 'Save button broken',
      message: 'The save button does not work when clicked',
      sentiment: 'NEGATIVE',
      category: 'ui',
      priority: 'HIGH',
    };

    it('returns valid HTML string', () => {
      const html = feedbackSubmittedEmail(baseData);

      expect(typeof html).toBe('string');
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('</html>');
    });

    it('includes feedback details', () => {
      const html = feedbackSubmittedEmail(baseData);

      expect(html).toContain('John Doe');
      expect(html).toContain('john@test.com');
      expect(html).toContain('Save button broken');
      expect(html).toContain('HIGH');
      expect(html).toContain('fb-123');
    });

    it('includes AI summary when provided', () => {
      const html = feedbackSubmittedEmail({
        ...baseData,
        aiSummary: 'User reports a broken save button in the editor',
      });

      expect(html).toContain('AI Summary');
      expect(html).toContain('User reports a broken save button');
    });

    it('excludes AI summary section when not provided', () => {
      const html = feedbackSubmittedEmail(baseData);

      expect(html).not.toContain('AI Summary');
    });

    it('includes screenshot when provided', () => {
      const html = feedbackSubmittedEmail({
        ...baseData,
        screenshotUrl: 'https://img.test/screenshot.png',
      });

      expect(html).toContain('screenshot.png');
      expect(html).toContain('Screenshot');
    });

    it('escapes HTML in user input', () => {
      const html = feedbackSubmittedEmail({
        ...baseData,
        subject: '<script>alert("xss")</script>',
      });

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('ticketStatusEmail', () => {
    const baseData = {
      ticketId: 'tk-456',
      status: 'RESOLVED',
      subject: 'Bug fix applied',
    };

    it('returns valid HTML string', () => {
      const html = ticketStatusEmail(baseData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Ticket Status Updated');
    });

    it('includes ticket details', () => {
      const html = ticketStatusEmail(baseData);

      expect(html).toContain('tk-456');
      expect(html).toContain('RESOLVED');
      expect(html).toContain('Bug fix applied');
    });

    it('includes resolution when provided', () => {
      const html = ticketStatusEmail({
        ...baseData,
        resolution: 'Fixed the save button handler',
      });

      expect(html).toContain('Resolution');
      expect(html).toContain('Fixed the save button handler');
    });

    it('includes assignee when provided', () => {
      const html = ticketStatusEmail({
        ...baseData,
        assignee: 'admin@company.com',
      });

      expect(html).toContain('admin@company.com');
    });
  });

  describe('contactAutoResponseEmail', () => {
    it('returns valid HTML with user name and subject', () => {
      const html = contactAutoResponseEmail({
        name: 'Jane',
        subject: 'Billing question',
        originalMessage: 'How do I upgrade?',
        ticketCreated: false,
      });

      expect(html).toContain('Jane');
      expect(html).toContain('Billing question');
      expect(html).toContain('How do I upgrade?');
    });

    it('includes AI response when provided', () => {
      const html = contactAutoResponseEmail({
        name: 'Jane',
        subject: 'Billing',
        originalMessage: 'Question',
        aiResponse: 'You can upgrade from Settings > Billing',
        ticketCreated: false,
      });

      expect(html).toContain('Quick Response');
      expect(html).toContain('You can upgrade from Settings');
    });

    it('includes ticket reference when created', () => {
      const html = contactAutoResponseEmail({
        name: 'Jane',
        subject: 'Issue',
        originalMessage: 'Help',
        ticketCreated: true,
        ticketId: 'tk-abc-12345678',
      });

      expect(html).toContain('support ticket');
      expect(html).toContain('tk-abc-1');
    });
  });

  describe('contactAdminNotificationEmail', () => {
    it('returns valid HTML with submission details', () => {
      const html = contactAdminNotificationEmail({
        submissionId: 'sub-789',
        name: 'User',
        email: 'user@test.com',
        subject: 'Help needed',
        message: 'I need assistance',
        status: 'NEW',
      });

      expect(html).toContain('Contact Form Submission');
      expect(html).toContain('user@test.com');
      expect(html).toContain('Help needed');
      expect(html).toContain('sub-789');
    });

    it('includes triage result when provided', () => {
      const html = contactAdminNotificationEmail({
        submissionId: 'sub-789',
        name: 'User',
        email: 'user@test.com',
        subject: 'Help',
        message: 'Msg',
        status: 'TRIAGED',
        triageResult: {
          intent: 'billing_inquiry',
          sentiment: 'NEUTRAL',
          confidence: 0.95,
          isSpam: false,
          suggestedAction: 'Route to billing team',
        },
      });

      expect(html).toContain('AI Triage Result');
      expect(html).toContain('billing_inquiry');
      expect(html).toContain('95%');
      expect(html).toContain('Route to billing team');
    });

    it('flags spam when detected', () => {
      const html = contactAdminNotificationEmail({
        submissionId: 'sub-789',
        name: 'Spammer',
        email: 'spam@test.com',
        subject: 'Buy now',
        message: 'Click here',
        status: 'SPAM',
        triageResult: { isSpam: true },
      });

      expect(html).toContain('potential spam');
    });
  });
});
