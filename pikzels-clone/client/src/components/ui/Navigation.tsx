import React from 'react';
import { default as Button } from './Button';
import './Navigation.css';

export interface NavigationProps {
  /** Current active tab */
  activeTab: string;
  /** Function to handle tab changes */
  onTabChange: (tab: string) => void;
  /** User information */
  user?: {
    id: string;
    email: string;
    name?: string;
  };
  /** Theme toggle function */
  onThemeToggle?: () => void;
  /** Logout function */
  onLogout?: () => void;
  /** Current theme */
  theme?: 'light' | 'dark';
  /** Additional navigation items */
  additionalItems?: NavigationItem[];
  className?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  user,
  onThemeToggle,
  onLogout,
  theme = 'light',
  additionalItems = [],
  className = '',
}) => {
  const defaultNavItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: (
        <svg
          className="nav-item__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 5a2 2 0 012-2h4a2 2 0 012 2v1H8V5z"
          />
        </svg>
      ),
    },
    {
      id: 'thumbnails',
      label: 'My Thumbnails',
      icon: (
        <svg
          className="nav-item__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: (
        <svg
          className="nav-item__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: (
        <svg
          className="nav-item__icon"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  const allNavItems = [...defaultNavItems, ...additionalItems];

  return (
    <nav
      className={`navigation ${theme === 'dark' ? 'navigation--dark' : ''} ${className}`}
    >
      <div className="navigation__container">
        <div className="navigation__brand">
          <div className="navigation__logo">
            <span className="navigation__logo-icon">📸</span>
            <h1 className="navigation__logo-text">ThumPiks Studio</h1>
          </div>
        </div>

        <div className="navigation__tabs">
          {allNavItems.map(item => (
            <button
              key={item.id}
              onClick={() =>
                item.onClick ? item.onClick() : onTabChange(item.id)
              }
              className={`navigation__tab ${
                (
                  item.active !== undefined
                    ? item.active
                    : activeTab === item.id
                )
                  ? 'navigation__tab--active'
                  : ''
              }`}
              aria-current={
                (
                  item.active !== undefined
                    ? item.active
                    : activeTab === item.id
                )
                  ? 'page'
                  : undefined
              }
            >
              {item.icon}
              <span className="navigation__tab-text">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="navigation__actions">
          {onThemeToggle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onThemeToggle}
              className="navigation__theme-toggle"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg
                  className="navigation__theme-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="navigation__theme-icon"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </Button>
          )}

          {user && (
            <div className="navigation__user">
              <span className="navigation__user-greeting">
                Welcome, {user.name || user.email.split('@')[0]}
              </span>
            </div>
          )}

          {onLogout && (
            <Button
              variant="danger"
              size="sm"
              onClick={onLogout}
              className="navigation__logout"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;