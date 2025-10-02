import React, { forwardRef, InputHTMLAttributes } from 'react';
import './Input.css';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Input variant */
  variant?: 'default' | 'filled' | 'borderless';
  /** Error state */
  error?: boolean;
  /** Success state */
  success?: boolean;
  /** Input label */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  errorMessage?: string;
  /** Icon to display before input */
  leftIcon?: React.ReactNode;
  /** Icon to display after input */
  rightIcon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Container className for wrapper */
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      error = false,
      success = false,
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      className = '',
      containerClassName = '',
      disabled,
      required,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseClasses = 'input';
    const variantClasses = `input--${variant}`;
    const sizeClasses = `input--${size}`;
    const stateClasses = [
      error && 'input--error',
      success && 'input--success',
      disabled && 'input--disabled',
      leftIcon && 'input--has-left-icon',
      rightIcon && 'input--has-right-icon',
    ]
      .filter(Boolean)
      .join(' ');

    const combinedClassName = [
      baseClasses,
      variantClasses,
      sizeClasses,
      stateClasses,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const containerClasses = ['input-container', containerClassName]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClasses}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
            {required && (
              <span className="input-label__required" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        <div className="input-wrapper">
          {leftIcon && (
            <div className="input__left-icon" aria-hidden="true">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={combinedClassName}
            disabled={disabled}
            required={required}
            aria-invalid={error}
            aria-describedby={
              [
                helperText && `${inputId}-helper`,
                errorMessage && `${inputId}-error`,
              ]
                .filter(Boolean)
                .join(' ') || undefined
            }
            {...props}
          />

          {rightIcon && (
            <div className="input__right-icon" aria-hidden="true">
              {rightIcon}
            </div>
          )}
        </div>

        {(helperText || errorMessage) && (
          <div className="input-help">
            {errorMessage && (
              <div
                id={`${inputId}-error`}
                className="input-help__error"
                role="alert"
              >
                {errorMessage}
              </div>
            )}
            {helperText && !errorMessage && (
              <div id={`${inputId}-helper`} className="input-help__text">
                {helperText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
