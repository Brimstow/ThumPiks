import React, { useState, useRef, useCallback } from 'react';
import './Slider.css';

export interface SliderProps {
  /** Current value */
  value: number;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Slider label */
  label?: string;
  /** Show value display */
  showValue?: boolean;
  /** Value formatter function */
  formatValue?: (value: number) => string;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  /** Change handler */
  onChange: (value: number) => void;
  /** Additional CSS classes */
  className?: string;
  /** Input ID for accessibility */
  id?: string;
}

const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  showValue = true,
  formatValue,
  disabled = false,
  size = 'md',
  variant = 'primary',
  onChange,
  className = '',
  id
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const sliderId = id || `slider-${Math.random().toString(36).substr(2, 9)}`;
  
  const percentage = ((value - min) / (max - min)) * 100;
  
  const handleChange = useCallback((newValue: number) => {
    const clampedValue = Math.min(Math.max(newValue, min), max);
    const steppedValue = Math.round(clampedValue / step) * step;
    onChange(steppedValue);
  }, [min, max, step, onChange]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(parseFloat(e.target.value));
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    
    setIsDragging(true);
    updateValueFromEvent(e);
    
    const handleMouseMove = (e: MouseEvent) => {
      updateValueFromEvent(e);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };
  
  const updateValueFromEvent = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    const newValue = min + (percentage * (max - min));
    
    handleChange(newValue);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    
    let newValue = value;
    
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        newValue = value - step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        newValue = value + step;
        break;
      case 'Home':
        e.preventDefault();
        newValue = min;
        break;
      case 'End':
        e.preventDefault();
        newValue = max;
        break;
      case 'PageDown':
        e.preventDefault();
        newValue = value - (step * 10);
        break;
      case 'PageUp':
        e.preventDefault();
        newValue = value + (step * 10);
        break;
      default:
        return;
    }
    
    handleChange(newValue);
  };
  
  const displayValue = formatValue ? formatValue(value) : value.toString();
  
  const sliderClasses = [
    'slider',
    `slider--${size}`,
    `slider--${variant}`,
    isDragging && 'slider--dragging',
    disabled && 'slider--disabled',
    className
  ].filter(Boolean).join(' ');
  
  return (
    <div className={sliderClasses}>
      {label && (
        <label htmlFor={sliderId} className=\"slider__label\">
          {label}
        </label>
      )}
      
      <div className=\"slider__container\">
        <div 
          ref={sliderRef}
          className=\"slider__track\"
          onMouseDown={handleMouseDown}
        >
          <div 
            className=\"slider__fill\"
            style={{ width: `${percentage}%` }}
          />
          <div 
            className=\"slider__thumb\"
            style={{ left: `${percentage}%` }}
          />
        </div>
        
        <input
          ref={inputRef}
          id={sliderId}
          type=\"range\"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className=\"slider__input\"
          aria-label={label}
        />
      </div>
      
      {showValue && (
        <div className=\"slider__value\">
          {displayValue}
        </div>
      )}
    </div>
  );
};

export default Slider;