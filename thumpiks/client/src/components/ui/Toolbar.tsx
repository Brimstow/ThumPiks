import React from 'react';
import { default as Button } from './Button';
import './Toolbar.css';

export interface ToolbarItem {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  tooltip?: string;
  separator?: boolean;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  activeTool?: string;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface ToolbarSeparatorProps {
  orientation?: 'horizontal' | 'vertical';
}

const ToolbarSeparator: React.FC<ToolbarSeparatorProps> = ({
  orientation = 'horizontal',
}) => (
  <div
    className={`toolbar__separator toolbar__separator--${orientation}`}
    aria-hidden="true"
  />
);

const Toolbar: React.FC<ToolbarProps> = ({
  items,
  activeTool,
  orientation = 'horizontal',
  size = 'md',
  className = '',
}) => {
  const toolbarClasses = [
    'toolbar',
    `toolbar--${orientation}`,
    `toolbar--${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={toolbarClasses} role="toolbar" aria-label="Editor tools">
      {items.map((item, index) => {
        if (item.separator) {
          return (
            <ToolbarSeparator
              key={`separator-${index}`}
              orientation={orientation}
            />
          );
        }

        const isActive =
          item.active !== undefined ? item.active : activeTool === item.id;

        return (
          <Button
            key={item.id}
            variant={isActive ? 'primary' : item.variant || 'ghost'}
            size={size}
            onClick={item.onClick}
            disabled={item.disabled}
            className={`toolbar__item ${isActive ? 'toolbar__item--active' : ''}`}
            title={item.tooltip || item.label}
            aria-label={item.label}
            aria-pressed={isActive}
          >
            {item.icon && (
              <span className="toolbar__item-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            {item.label && (
              <span className="toolbar__item-label">{item.label}</span>
            )}
          </Button>
        );
      })}
    </div>
  );
};

export default Toolbar;
