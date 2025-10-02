import React from 'react';
import Card, { CardBody } from './Card';
import './StatCard.css';

export interface StatCardProps {
  /** The main statistic value */
  value: string | number;
  /** The label/title for the statistic */
  label: string;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Color variant for the icon background */
  iconColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Trend indicator */
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  /** Additional CSS classes */
  className?: string;
  /** Click handler for interactive stat cards */
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  subtitle,
  icon,
  iconColor = 'primary',
  trend,
  className = '',
  onClick,
}) => {
  return (
    <Card
      variant="default"
      padding="none"
      interactive={!!onClick}
      onClick={onClick}
      className={`stat-card ${className}`}
    >
      <CardBody>
        <div className="stat-card__content">
          <div className="stat-card__header">
            {icon && (
              <div className={`stat-card__icon stat-card__icon--${iconColor}`}>
                {icon}
              </div>
            )}
            <div className="stat-card__info">
              <dt className="stat-card__label">{label}</dt>
              <dd className="stat-card__value">{value}</dd>
              {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
            </div>
          </div>

          {trend && (
            <div className="stat-card__trend">
              <div
                className={`stat-card__trend-indicator stat-card__trend-indicator--${trend.direction}`}
              >
                {trend.direction === 'up' && (
                  <svg
                    className="stat-card__trend-icon"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 17l10-10"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 7v10"
                    />
                  </svg>
                )}
                {trend.direction === 'down' && (
                  <svg
                    className="stat-card__trend-icon"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 17L7 7"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 7v10"
                    />
                  </svg>
                )}
                {trend.direction === 'neutral' && (
                  <svg
                    className="stat-card__trend-icon"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4"
                    />
                  </svg>
                )}
                <span className="stat-card__trend-value">
                  {trend.value > 0 ? '+' : ''}
                  {trend.value}%
                </span>
              </div>
              <span className="stat-card__trend-label">{trend.label}</span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default StatCard;
