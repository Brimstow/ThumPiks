/**
 * Tooltip component — custom styled tooltip matching app design theme.
 * Built on @radix-ui/react-tooltip, requires TooltipProvider in App.tsx.
 *
 * Usage:
 *   <Tooltip content="Download">
 *     <button>...</button>
 *   </Tooltip>
 */

import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import './Tooltip.css';

export interface TooltipProps {
  /** The text/content shown inside the tooltip bubble */
  content: React.ReactNode;
  /** Which side the tooltip appears on (default: 'top') */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /** Alignment along the side axis (default: 'center') */
  align?: 'start' | 'center' | 'end';
  /** Offset from the trigger element in px (default: 6) */
  sideOffset?: number;
  /** Override the delay before showing (ms) — uses provider default if omitted */
  delayDuration?: number;
  /** The element that triggers the tooltip */
  children: React.ReactNode;
}

/**
 * A sleek, theme-aware tooltip that wraps any trigger element.
 * The TooltipProvider must be rendered above this in the tree (done in App.tsx).
 */
const Tooltip: React.FC<TooltipProps> = ({
  content,
  side = 'top',
  align = 'center',
  sideOffset = 6,
  delayDuration,
  children,
}) => {
  if (!content) return <>{children}</>;

  return (
    <TooltipPrimitive.Root delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="ui-tooltip-content"
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          {content}
          <TooltipPrimitive.Arrow className="ui-tooltip-arrow" width={10} height={5} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};

export default Tooltip;
