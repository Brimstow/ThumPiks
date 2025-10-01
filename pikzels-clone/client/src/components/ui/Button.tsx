import React, { forwardRef, ButtonHTMLAttributes } from 'react';
import './Button.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Icon to display before text */
  leftIcon?: React.ReactNode;
  /** Icon to display after text */
  rightIcon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  children: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'btn';
    const variantClasses = `btn--${variant}`;
    const sizeClasses = `btn--${size}`;
    const stateClasses = [
      loading && 'btn--loading',
      disabled && 'btn--disabled',
      fullWidth && 'btn--full-width'
    ].filter(Boolean).join(' ');

    const combinedClassName = [
      baseClasses,
      variantClasses,
      sizeClasses,
      stateClasses,
      className
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        className={combinedClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div className="btn__spinner" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="btn__spinner-icon">
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="32"
              />
            </svg>
          </div>
        )}
        
        {!loading && leftIcon && (
          <span className="btn__left-icon" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        
        <span className={`btn__content ${loading ? 'btn__content--loading' : ''}`}>
          {children}
        </span>
        
        {!loading && rightIcon && (
          <span className="btn__right-icon" aria-hidden="true">
            {rightIcon}
          </span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;