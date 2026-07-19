import React from 'react';
import { Button } from './ui';
import './ThemeToggle.css';

export interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  isDarkMode,
  onToggle,
  className = ''
}) => {
  return (
    <Button
      variant="ghost"
      size="md"
      onClick={onToggle}
      className={`theme-toggle ${className}`}
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
    >
      <span className="theme-toggle__icon">
        {isDarkMode ? '☀️' : '🌙'}
      </span>
      <span className="theme-toggle__text">
        {isDarkMode ? 'Light' : 'Dark'}
      </span>
    </Button>
  );
};

export default ThemeToggle;