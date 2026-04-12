/**
 * FeedbackWidget Component
 *
 * Floating feedback button + slide-up form panel.
 * Rendered at the app level, visible on all authenticated pages.
 *
 * Features:
 * - Three feedback types: Bug, Feature Request, General
 * - Subject + message fields with validation
 * - Screenshot URL (optional)
 * - Success confirmation after submission
 * - Keyboard accessible (Escape to close)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useFeedback } from '../hooks/useFeedback';
import { isFeatureEnabled } from '../../../config/featureFlags';
import type { FeedbackType } from '../types';
import './FeedbackWidget.css';

const MAX_SUBJECT = 200;
const MAX_MESSAGE = 5000;

const TYPE_OPTIONS: { value: FeedbackType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'BUG',
    label: 'Bug',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3.003 3.003 0 116 0v1" />
        <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 014-4h4a4 4 0 014 4v3c0 3.3-2.7 6-6 6" />
        <path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M6 17l-4 1M17.47 9c1.93-.2 3.53-1.9 3.53-4M18 13h4M18 17l4 1" />
      </svg>
    ),
  },
  {
    value: 'FEATURE_REQUEST',
    label: 'Feature',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    value: 'GENERAL',
    label: 'General',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

interface FeedbackWidgetProps {
  /** Set to true to open the widget programmatically from a parent */
  externalOpen?: boolean;
  /** Called after the widget has consumed the externalOpen signal */
  onExternalOpenHandled?: () => void;
}

export function FeedbackWidget({ externalOpen, onExternalOpenHandled }: FeedbackWidgetProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [type, setType] = useState<FeedbackType>('GENERAL');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { submit, isSubmitting, error, reset } = useFeedback();
  const panelRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setShowSuccess(false);
    reset();
    // Focus the subject field after animation
    setTimeout(() => subjectRef.current?.focus(), 200);
  }, [reset]);

  // Allow parent to open the widget programmatically
  useEffect(() => {
    if (externalOpen && !isOpen) {
      handleOpen();
      onExternalOpenHandled?.();
    }
  }, [externalOpen, isOpen, handleOpen, onExternalOpenHandled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset form after close animation
    setTimeout(() => {
      setType('GENERAL');
      setSubject('');
      setMessage('');
      setShowSuccess(false);
      reset();
    }, 200);
  }, [reset]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!subject.trim() || !message.trim()) return;

      try {
        await submit({
          type,
          subject: subject.trim(),
          message: message.trim(),
        });

        setShowSuccess(true);
        setSubject('');
        setMessage('');
        setType('GENERAL');
      } catch {
        // Error is captured in the hook
      }
    },
    [type, subject, message, submit]
  );

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) handleClose();
    },
    [handleClose]
  );

  const canSubmit =
    subject.trim().length > 0 &&
    message.trim().length > 0 &&
    subject.length <= MAX_SUBJECT &&
    message.length <= MAX_MESSAGE &&
    !isSubmitting;

  if (!isFeatureEnabled('feedback', 'sideTab')) return null;

  return (
    <>
      {/* Right-edge Hotjar-style tab */}
      {!isOpen && (
        <button
          className="feedback-trigger"
          onClick={handleOpen}
          aria-label="Open feedback form"
          title="Send feedback"
        >
          Feedback
        </button>
      )}

      {/* Panel overlay */}
      {isOpen && (
        <div className="feedback-overlay" onClick={handleOverlayClick}>
          <div className="feedback-panel" ref={panelRef} role="dialog" aria-label="Feedback form">
            {/* Header */}
            <div className="feedback-header">
              <h3>Send Feedback</h3>
              <button className="feedback-close" onClick={handleClose} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="feedback-body">
              {showSuccess ? (
                <div className="feedback-success">
                  <div className="feedback-success-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h4>Thank you!</h4>
                  <p>Your feedback has been submitted. We'll review it shortly.</p>
                  <button className="feedback-success-btn" onClick={handleClose}>
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Type selector */}
                  <div className="feedback-type-selector">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`feedback-type-btn${type === opt.value ? ' active' : ''}`}
                        onClick={() => setType(opt.value)}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Error banner */}
                  {error && <div className="feedback-error">{error}</div>}

                  {/* Subject */}
                  <div className="feedback-field">
                    <label htmlFor="feedback-subject">Subject</label>
                    <input
                      ref={subjectRef}
                      id="feedback-subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Brief summary..."
                      maxLength={MAX_SUBJECT}
                      required
                    />
                    <div className="char-count">
                      {subject.length}/{MAX_SUBJECT}
                    </div>
                  </div>

                  {/* Message */}
                  <div className="feedback-field">
                    <label htmlFor="feedback-message">Details</label>
                    <textarea
                      id="feedback-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe what happened or what you'd like to see..."
                      maxLength={MAX_MESSAGE}
                      required
                    />
                    <div className="char-count">
                      {message.length}/{MAX_MESSAGE}
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    className="feedback-submit"
                    disabled={!canSubmit}
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
