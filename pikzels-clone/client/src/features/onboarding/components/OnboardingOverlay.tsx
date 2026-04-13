/**
 * OnboardingOverlay Component
 * 
 * Full-screen overlay showing Quick Edit options for new users.
 * Provides 3 creation paths: Paste URL, AI Generate, Upload Image.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Sparkles, Upload, X } from 'lucide-react';
import { QuickEditOptionCard } from './QuickEditOptionCard';
import { useOnboarding } from '../hooks/useOnboarding';
import type { QuickEditFlow } from '../types';
import './OnboardingOverlay.css';

interface OnboardingOverlayProps {
  /** Optional callback when overlay is dismissed */
  onDismiss?: () => void;
}

/**
 * Full-screen onboarding overlay for new users.
 * Shows Quick Edit creation options in a centered card.
 * 
 * - Escape key dismisses the overlay
 * - Click outside card dismisses the overlay
 * - "Don't show again" checkbox permanently disables
 */
export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ onDismiss }) => {
  const navigate = useNavigate();
  const { shouldShowQuickEditOverlay, dismissOverlay } = useOnboarding();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isVisible, setIsVisible] = useState(shouldShowQuickEditOverlay);

  // Update visibility when preference changes
  useEffect(() => {
    setIsVisible(shouldShowQuickEditOverlay);
  }, [shouldShowQuickEditOverlay]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    // If "Don't show again" is checked, dismiss permanently via localStorage
    // Otherwise, dismiss for this session only via sessionStorage
    dismissOverlay(dontShowAgain);
    onDismiss?.();
  }, [dontShowAgain, dismissOverlay, onDismiss]);

  const handleOptionClick = useCallback((flow: QuickEditFlow) => {
    setIsVisible(false);
    // If "Don't show again" is checked, dismiss permanently via localStorage
    // Otherwise, dismiss for this session only via sessionStorage
    dismissOverlay(dontShowAgain);
    // Navigate to quick edit with the selected flow
    navigate(`/dashboard/quick-edit?flow=${flow}`);
  }, [dontShowAgain, dismissOverlay, navigate]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  }, [handleDismiss]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <motion.div
          className="onboarding-overlay__card"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          {/* Close button */}
          <button
            className="onboarding-overlay__close"
            onClick={handleDismiss}
            aria-label="Close"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="onboarding-overlay__header">
            <h2 id="onboarding-title" className="onboarding-overlay__title">
              Quick Edit
            </h2>
            <p className="onboarding-overlay__subtitle">
              Choose how you'd like to create your thumbnail
            </p>
          </div>

          {/* Options grid */}
          <div className="onboarding-overlay__options">
            <QuickEditOptionCard
              icon={<Link2 />}
              title="Paste URL"
              subtitle="Extract frames from a YouTube video"
              accentColor="purple"
              onClick={() => handleOptionClick('url-input')}
            />
            <QuickEditOptionCard
              icon={<Sparkles />}
              title="AI Generate"
              subtitle="Create a thumbnail with AI assistance"
              accentColor="amber"
              onClick={() => handleOptionClick('ai-generate')}
            />
            <QuickEditOptionCard
              icon={<Upload />}
              title="Upload Image"
              subtitle="Start with your own image"
              accentColor="emerald"
              onClick={() => handleOptionClick('upload')}
            />
          </div>

          {/* Footer */}
          <div className="onboarding-overlay__footer">
            <label className="onboarding-overlay__checkbox">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
              />
              <span>Don't show this again</span>
            </label>
            <button
              className="onboarding-overlay__skip"
              onClick={handleDismiss}
            >
              Skip to dashboard
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
