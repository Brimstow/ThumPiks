/**
 * UI Components Library
 *
 * Centralized export for all UI components following the design system.
 * This provides a clean API for importing components throughout the application.
 */

// Button Components
export { default as Button } from './Button';
export type { ButtonProps } from './Button';

// Input Components
export { default as Input } from './Input';
export type { InputProps } from './Input';

// Card Components
export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export type {
  CardProps,
  CardHeaderProps,
  CardBodyProps,
  CardFooterProps,
} from './Card';

// Navigation Components
export { default as Navigation } from './Navigation';
export type { NavigationProps, NavigationItem } from './Navigation';

// Stat Card Components
export { default as StatCard } from './StatCard';
export type { StatCardProps } from './StatCard';

// Toolbar Components
export { default as Toolbar } from './Toolbar';
export type { ToolbarProps, ToolbarItem } from './Toolbar';

// Slider Components
export { default as Slider } from './Slider';
export type { SliderProps } from './Slider';

// Panel Components
export { default as Panel, PanelSection, PanelGroup } from './Panel';
export type { PanelProps, PanelSectionProps, PanelGroupProps } from './Panel';

// Image Upload Components
export { default as ImageUploadZone } from './ImageUploadZone';
export type { ImageUploadZoneProps } from './ImageUploadZone';

// Re-export common types
export type {
  // Common size variants
  Size,
  Variant,
} from './types';

// Tooltip Components
export { default as Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';

// Design system utilities (to be created)
// export { useTheme } from './hooks/useTheme';
// export { cn } from './utils/classNames';
