import React, { useState } from 'react';
import { default as Card, CardHeader, CardBody } from './Card';
import { default as Button } from './Button';
import './Panel.css';

export interface PanelProps {
  /** Panel title */
  title?: string;
  /** Panel content */
  children: React.ReactNode;
  /** Whether the panel is collapsible */
  collapsible?: boolean;
  /** Initial collapsed state */
  defaultCollapsed?: boolean;
  /** Panel size */
  size?: 'sm' | 'md' | 'lg';
  /** Panel variant */
  variant?: 'default' | 'primary' | 'secondary';
  /** Additional actions for the header */
  actions?: React.ReactNode;
  /** Whether to show a border */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Collapse change handler */
  onCollapseChange?: (collapsed: boolean) => void;
}

const Panel: React.FC<PanelProps> = ({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  size = 'md',
  variant = 'default',
  actions,
  bordered = true,
  className = '',
  onCollapseChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapseChange?.(newCollapsed);
  };

  const panelClasses = [
    'panel',
    `panel--${size}`,
    `panel--${variant}`,
    isCollapsed && 'panel--collapsed',
    !bordered && 'panel--borderless',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Card
      variant={bordered ? 'outlined' : 'filled'}
      padding="none"
      className={panelClasses}
    >
      {title && (
        <CardHeader className="panel__header">
          <div className="panel__header-content">
            <h3 className="panel__title">{title}</h3>
            <div className="panel__header-actions">
              {actions}
              {collapsible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleCollapse}
                  className="panel__collapse-toggle"
                  aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
                  aria-expanded={!isCollapsed}
                >
                  <svg
                    className={`panel__collapse-icon ${isCollapsed ? 'panel__collapse-icon--collapsed' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      )}

      {(!collapsible || !isCollapsed) && (
        <CardBody className="panel__body">{children}</CardBody>
      )}
    </Card>
  );
};

// Sub-components for better composition
export interface PanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const PanelSection: React.FC<PanelSectionProps> = ({
  title,
  children,
  className = '',
}) => (
  <div className={`panel__section ${className}`}>
    {title && <h4 className="panel__section-title">{title}</h4>}
    <div className="panel__section-content">{children}</div>
  </div>
);

export interface PanelGroupProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PanelGroup: React.FC<PanelGroupProps> = ({
  children,
  direction = 'vertical',
  gap = 'md',
  className = '',
}) => (
  <div
    className={`panel-group panel-group--${direction} panel-group--gap-${gap} ${className}`}
  >
    {children}
  </div>
);

export default Panel;