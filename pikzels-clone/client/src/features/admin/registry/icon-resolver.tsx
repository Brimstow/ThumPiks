/**
 * Admin Icon Resolver
 *
 * Maps icon name strings from module configs to Lucide React components.
 * Centralizes all icon imports so module configs remain plain TS
 * and icon library changes require only this file to update.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Users,
  Shield,
  Image,
  Layout,
  FileText,
  Globe,
  MessageSquare,
  Bell,
  BarChart3,
  Activity,
  Monitor,
  Settings,
  Zap,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Users,
  Shield,
  Image,
  Layout,
  FileText,
  Globe,
  MessageSquare,
  Bell,
  BarChart3,
  Activity,
  Monitor,
  Settings,
  Zap,
};

/**
 * Resolves an icon name string to a React element.
 * Returns null if the icon name is not found in the map.
 */
export function resolveIcon(name: string, size = 20): React.ReactNode {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    console.warn(`[AdminRegistry] Unknown icon name: "${name}"`);
    return null;
  }
  return React.createElement(IconComponent, { size });
}
