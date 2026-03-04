/**
 * GuidedTour Component
 * 
 * Step-by-step guided tour that highlights elements on the page.
 * Shows a floating card with navigation controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useOnboarding } from '../hooks/useOnboarding';
import type { TourStep } from '../types';
import './GuidedTour.css';

interface GuidedTourProps {
  /** Tour identifier ('dashboard' | 'editor') */
  tourId: 'dashboard' | 'editor';
  /** Array of tour steps */
  steps: TourStep[];
  /** Callback when tour completes */
  onComplete?: () => void;
}

/**
 * A guided tour component that walks users through key features.
 * Highlights target elements and shows contextual information.
 */
export const GuidedTour: React.FC<GuidedTourProps> = ({
  tourId,
  steps,
  onComplete,
}) => {
  const { shouldShowTour, markTourSeen, prefs } = useOnboarding();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if tour should show
  useEffect(() => {
    if (shouldShowTour(tourId) && steps.length > 0) {
      // Small delay to let page render
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [shouldShowTour, tourId, steps.length]);

  // Scroll to current step's target
  useEffect(() => {
    if (!isVisible || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const target = document.querySelector(step.targetSelector);
    
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('guided-tour-highlight');
      
      return () => {
        target.classList.remove('guided-tour-highlight');
      };
    }
  }, [isVisible, currentStep, steps]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete tour
      setIsVisible(false);
      markTourSeen(tourId);
      onComplete?.();
    }
  }, [currentStep, steps.length, markTourSeen, tourId, onComplete]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    markTourSeen(tourId);
    onComplete?.();
  }, [markTourSeen, tourId, onComplete]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleNext, handlePrev, handleSkip]);

  if (!isVisible || !prefs.tipsEnabled || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="guided-tour"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.2 }}
      >
        {/* Progress indicator */}
        <div className="guided-tour__progress">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`guided-tour__progress-dot ${index === currentStep ? 'guided-tour__progress-dot--active' : ''} ${index < currentStep ? 'guided-tour__progress-dot--completed' : ''}`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="guided-tour__content">
          <h3 className="guided-tour__title">{step.title}</h3>
          <p className="guided-tour__body">{step.body}</p>
        </div>

        {/* Navigation */}
        <div className="guided-tour__nav">
          <button
            className="guided-tour__skip"
            onClick={handleSkip}
          >
            Skip tour
          </button>
          <div className="guided-tour__buttons">
            {currentStep > 0 && (
              <button className="guided-tour__btn guided-tour__btn--secondary" onClick={handlePrev}>
                <ChevronLeft size={16} />
                Back
              </button>
            )}
            <button className="guided-tour__btn guided-tour__btn--primary" onClick={handleNext}>
              {isLastStep ? 'Done' : 'Next'}
              {!isLastStep && <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {/* Close button */}
        <button className="guided-tour__close" onClick={handleSkip} aria-label="Close tour">
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default GuidedTour;
