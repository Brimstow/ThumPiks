import React, { useState, useEffect } from 'react';
import { Check, X, AlertCircle, Info, Loader2 } from 'lucide-react';

// Toast Notification System
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastComponent: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Entrance animation
    setTimeout(() => setIsVisible(true), 50);
    
    // Auto close
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const getToastStyles = () => {
    const base = 'p-4 rounded-2xl shadow-2xl backdrop-blur-xl border';
    switch (toast.type) {
      case 'success':
        return `${base} bg-green-50/90 border-green-200 text-green-800`;
      case 'error':
        return `${base} bg-red-50/90 border-red-200 text-red-800`;
      case 'warning':
        return `${base} bg-yellow-50/90 border-yellow-200 text-yellow-800`;
      case 'info':
        return `${base} bg-blue-50/90 border-blue-200 text-blue-800`;
      default:
        return `${base} bg-white/90 border-gray-200 text-gray-800`;
    }
  };

  const getIcon = () => {
    const iconClass = "w-5 h-5";
    switch (toast.type) {
      case 'success':
        return <Check className={`${iconClass} text-green-600`} />;
      case 'error':
        return <X className={`${iconClass} text-red-600`} />;
      case 'warning':
        return <AlertCircle className={`${iconClass} text-yellow-600`} />;
      case 'info':
        return <Info className={`${iconClass} text-blue-600`} />;
      default:
        return <Info className={`${iconClass} text-gray-600`} />;
    }
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible && !isExiting 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={getToastStyles()}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold">{toast.title}</h4>
            {toast.message && (
              <p className="text-sm opacity-90 mt-1">{toast.message}</p>
            )}
          </div>

          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className="text-sm font-semibold hover:opacity-75 transition-opacity"
            >
              {toast.action.label}
            </button>
          )}

          <button
            onClick={handleClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar for auto-close */}
        {toast.duration !== 0 && (
          <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-current rounded-full animate-shrink"
              style={{
                animationDuration: `${toast.duration || 5000}ms`,
                animationTimingFunction: 'linear'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Toast Container
interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {toasts.map(toast => (
        <ToastComponent key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
};

// Loading Button Component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText = "Loading...",
  variant = 'primary',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    const base = 'px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
    switch (variant) {
      case 'primary':
        return `${base} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-xl`;
      case 'secondary':
        return `${base} bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200`;
      case 'success':
        return `${base} bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg hover:shadow-xl`;
      case 'danger':
        return `${base} bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg hover:shadow-xl`;
      default:
        return base;
    }
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${getVariantStyles()} ${loading ? 'cursor-wait' : ''} ${className}`}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin" />
        )}
        <span>{loading ? loadingText : children}</span>
      </div>
    </button>
  );
};

// Ripple Effect Component
interface RippleProps {
  color?: string;
  duration?: number;
}

export const useRipple = ({ color = 'rgba(255, 255, 255, 0.6)', duration = 600 }: RippleProps = {}) => {
  const [ripples, setRipples] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
  }>>([]);

  const addRipple = (event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const newRipple = {
      id: Date.now(),
      x,
      y,
      size
    };

    setRipples(prev => [...prev, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  };

  const RippleContainer = () => (
    <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`
          }}
        />
      ))}
    </div>
  );

  return { addRipple, RippleContainer };
};

// Ripple Button Component
interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  children: React.ReactNode;
}

export const RippleButton: React.FC<RippleButtonProps> = ({
  rippleColor,
  children,
  className = '',
  onClick,
  ...props
}) => {
  const { addRipple, RippleContainer } = useRipple({ color: rippleColor });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(event);
    onClick?.(event);
  };

  return (
    <button
      {...props}
      onClick={handleClick}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <RippleContainer />
    </button>
  );
};

// Skeleton Loading Component
interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = ''
}) => {
  return (
    <div
      className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%] ${className}`}
      style={{
        width,
        height,
        borderRadius
      }}
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC = () => (
  <div className="p-6 bg-white rounded-2xl border border-gray-100 space-y-4">
    <div className="flex items-center space-x-3">
      <Skeleton width="3rem" height="3rem" borderRadius="50%" />
      <div className="space-y-2 flex-1">
        <Skeleton height="1rem" width="60%" />
        <Skeleton height="0.75rem" width="40%" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton height="0.75rem" />
      <Skeleton height="0.75rem" width="80%" />
      <Skeleton height="0.75rem" width="60%" />
    </div>
  </div>
);

// Floating Action Button with micro-interactions
interface FloatingActionButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip?: string;
  variant?: 'primary' | 'secondary';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onClick,
  tooltip,
  variant = 'primary'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addRipple, RippleContainer } = useRipple({ color: 'rgba(255, 255, 255, 0.4)' });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    addRipple(event);
    onClick();
    
    // Add a little bounce animation
    const button = event.currentTarget;
    button.classList.add('animate-bounce-in');
    setTimeout(() => {
      button.classList.remove('animate-bounce-in');
    }, 600);
  };

  return (
    <div className="relative group">
      <button
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`relative overflow-hidden w-14 h-14 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 active:scale-95 ${
          variant === 'primary'
            ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500'
            : 'bg-white hover:bg-gray-50 border border-gray-200'
        } ${isHovered ? 'shadow-3xl' : ''}`}
        title={tooltip}
      >
        <div className={`flex items-center justify-center ${
          variant === 'primary' ? 'text-white' : 'text-gray-600'
        }`}>
          {icon}
        </div>
        <RippleContainer />
        
        {/* Glow effect */}
        {isHovered && variant === 'primary' && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-75 animate-ping" />
        )}
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div 
          className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg transition-all duration-200 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

// Progress Indicator
interface ProgressIndicatorProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  showValue?: boolean;
  animated?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  size = 'md',
  color = '#3b82f6',
  showValue = false,
  animated = true
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2';
      case 'lg':
        return 'h-4';
      default:
        return 'h-3';
    }
  };

  return (
    <div className="space-y-2">
      {showValue && (
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${getSizeClasses()}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color}, ${color}dd)`,
            transition: animated ? 'width 1s ease-out' : 'none'
          }}
        />
      </div>
    </div>
  );
};