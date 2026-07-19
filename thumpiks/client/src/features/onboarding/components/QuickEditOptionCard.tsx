/**
 * QuickEditOptionCard Component
 * 
 * Reusable card component for Quick Edit creation options.
 * Used in both OnboardingOverlay and QuickEditView for DRY compliance.
 */

import React from 'react';
import type { QuickEditOptionCardProps } from '../types';
import './QuickEditOptionCard.css';

/**
 * A clickable card showing a Quick Edit creation option.
 * Features gradient background and accent color theming.
 */
export const QuickEditOptionCard: React.FC<QuickEditOptionCardProps> = ({
  icon,
  title,
  subtitle,
  accentColor,
  onClick,
}) => {
  return (
    <button
      className={`quick-edit-card quick-edit-card--${accentColor}`}
      onClick={onClick}
      type="button"
    >
      <div className="quick-edit-card__icon">
        {icon}
      </div>
      <div className="quick-edit-card__content">
        <h3 className="quick-edit-card__title">{title}</h3>
        <p className="quick-edit-card__subtitle">{subtitle}</p>
      </div>
    </button>
  );
};

export default QuickEditOptionCard;
