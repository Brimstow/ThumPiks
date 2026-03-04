/**
 * SpotlightTooltip Component
 * 
 * Wraps Radix UI Tooltip to provide contextual help on first encounter.
 * Tracks seen count to auto-hide after user has seen the tip.
 */

import React, { useState, useEffect } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { X } from 'lucide-react';
import { useOnboarding } from '../hooks/useOnboarding';
import './SpotlightTooltip.css';

interface SpotlightTooltipProps {
  /** Unique ID for tracking seen state */
  id: string;
  /** Tooltip title */
  title: string;
  /** Tooltip body text */
  body: string;
  /** Tooltip placement */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Max times to show (default: 3) */
  maxShows?: number;
  /** Child element to wrap */
  children: React.ReactNode;
}

/**
 * A spotlight tooltip that shows contextual help for new users.
 * Auto-shows on first render if user hasn't seen it enough times.
 * 
 * @example
 * <SpotlightTooltip id="create-button" title="Create Thumbnail" body="Click here to start creating">
 *   <Button>Create</Button>
 * </SpotlightTooltip>
 */
export const SpotlightTooltip: React.FC<SpotlightTooltipProps> = ({
  id,
  title,
  body,
  placement = 'bottom',
  maxShows = 3,
  children,
}) => {
  const { prefs, getSpotlightSeenCount, incrementSpotlightSeen, dismissSpotlight } = useOnboarding();
  const seenCount = getSpotlightSeenCount(id);
  const shouldShow = prefs.tipsEnabled && seenCount < maxShows;
  
  const [open, setOpen] = useState(false);

  // Auto-show on mount if should show
  useEffect(() => {
    if (shouldShow && seenCount === 0) {
      // Small delay to let the UI settle
      const timer = setTimeout(() => setOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShow, seenCount]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && seenCount < maxShows) {
      incrementSpotlightSeen(id);
    }
  };

  const handleDismiss = () => {
    setOpen(false);
    dismissSpotlight(id);
  };

  const handleGotIt = () => {
    setOpen(false);
    incrementSpotlightSeen(id);
  };

  if (!prefs.tipsEnabled) {
    return <>{children}</>;
  }

  return (
    <Tooltip.Provider delayDuration={0}>
      <Tooltip.Root open={open} onOpenChange={handleOpenChange}>
        <Tooltip.Trigger asChild>
          {children}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="spotlight-tooltip"
            side={placement}
            sideOffset={8}
            align="center"
          >
            <div className="spotlight-tooltip__header">
              <span className="spotlight-tooltip__title">{title}</span>
              <button 
                className="spotlight-tooltip__close"
                onClick={handleDismiss}
                aria-label="Don't show again"
              >
                <X size={14} />
              </button>
            </div>
            <p className="spotlight-tooltip__body">{body}</p>
            <button className="spotlight-tooltip__action" onClick={handleGotIt}>
              Got it
            </button>
            <Tooltip.Arrow className="spotlight-tooltip__arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

export default SpotlightTooltip;
