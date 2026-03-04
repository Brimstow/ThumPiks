/**
 * Smart Guides Component
 * 
 * AI-informed positioning guides based on thumbnail psychology rules.
 * Not just standard grid/thirds - shows optimal positions for faces,
 * text safe zones, and platform-specific danger areas.
 * 
 * NO COMPETITOR HAS THIS - Major differentiator for Thumbnail Maker
 */

import React, { useMemo } from 'react';
import type { 
  Layer, 
  SmartGuide, 
  SmartGuidesState, 
  SmartGuideType,
  PlatformPreview,
} from '../types/editor.types';

// ============================================
// TYPES
// ============================================

interface SmartGuidesProps {
  config: SmartGuidesState;
  canvasWidth: number;
  canvasHeight: number;
  platform: PlatformPreview;
  draggedLayer?: Layer | null;
  snapThreshold?: number;
}

// ============================================
// GUIDE GENERATION
// ============================================

const GUIDE_COLORS = {
  'face-zone': '#10b981',      // Green - optimal face positions
  'text-safe': '#3b82f6',      // Blue - safe for text
  'platform-danger': '#ef4444', // Red - platform UI overlap
  'thirds': '#8b5cf6',         // Purple - rule of thirds
  'golden': '#f59e0b',         // Amber - golden ratio
  'center': '#6b7280',         // Gray - center lines
  'attention': '#ec4899',      // Pink - attention hotspots
};

/**
 * Generate rule of thirds guides
 */
function generateThirdsGuides(width: number, height: number): SmartGuide[] {
  return [
    // Vertical thirds
    {
      id: 'thirds-v1',
      type: 'thirds',
      position: { x1: width / 3, y1: 0, x2: width / 3, y2: height },
      label: 'Left Third',
      priority: 'medium',
      color: GUIDE_COLORS.thirds,
      visible: true,
    },
    {
      id: 'thirds-v2',
      type: 'thirds',
      position: { x1: (width * 2) / 3, y1: 0, x2: (width * 2) / 3, y2: height },
      label: 'Right Third',
      priority: 'medium',
      color: GUIDE_COLORS.thirds,
      visible: true,
    },
    // Horizontal thirds
    {
      id: 'thirds-h1',
      type: 'thirds',
      position: { x1: 0, y1: height / 3, x2: width, y2: height / 3 },
      label: 'Upper Third',
      priority: 'medium',
      color: GUIDE_COLORS.thirds,
      visible: true,
    },
    {
      id: 'thirds-h2',
      type: 'thirds',
      position: { x1: 0, y1: (height * 2) / 3, x2: width, y2: (height * 2) / 3 },
      label: 'Lower Third',
      priority: 'medium',
      color: GUIDE_COLORS.thirds,
      visible: true,
    },
  ];
}

/**
 * Generate golden ratio guides
 */
function generateGoldenGuides(width: number, height: number): SmartGuide[] {
  const phi = 1.618033988749895;
  const goldenWidth = width / phi;
  const goldenHeight = height / phi;
  
  return [
    {
      id: 'golden-v1',
      type: 'golden',
      position: { x1: goldenWidth, y1: 0, x2: goldenWidth, y2: height },
      label: 'Golden Vertical',
      priority: 'low',
      color: GUIDE_COLORS.golden,
      visible: true,
    },
    {
      id: 'golden-v2',
      type: 'golden',
      position: { x1: width - goldenWidth, y1: 0, x2: width - goldenWidth, y2: height },
      label: 'Golden Vertical',
      priority: 'low',
      color: GUIDE_COLORS.golden,
      visible: true,
    },
    {
      id: 'golden-h1',
      type: 'golden',
      position: { x1: 0, y1: goldenHeight, x2: width, y2: goldenHeight },
      label: 'Golden Horizontal',
      priority: 'low',
      color: GUIDE_COLORS.golden,
      visible: true,
    },
    {
      id: 'golden-h2',
      type: 'golden',
      position: { x1: 0, y1: height - goldenHeight, x2: width, y2: height - goldenHeight },
      label: 'Golden Horizontal',
      priority: 'low',
      color: GUIDE_COLORS.golden,
      visible: true,
    },
  ];
}

/**
 * Generate face zone guides (optimal positions for faces based on thumbnail psychology)
 */
function generateFaceZoneGuides(width: number, height: number): SmartGuide[] {
  // Research shows faces in upper-left or upper-right third get more engagement
  const zoneWidth = width / 3;
  const zoneHeight = height * 0.6;
  
  return [
    // Upper-left power zone
    {
      id: 'face-zone-ul',
      type: 'face-zone',
      position: { x1: 0, y1: 0, x2: zoneWidth, y2: zoneHeight },
      label: 'Face Power Zone (Left)',
      priority: 'high',
      color: GUIDE_COLORS['face-zone'],
      visible: true,
    },
    // Upper-right power zone
    {
      id: 'face-zone-ur',
      type: 'face-zone',
      position: { x1: width - zoneWidth, y1: 0, x2: width, y2: zoneHeight },
      label: 'Face Power Zone (Right)',
      priority: 'high',
      color: GUIDE_COLORS['face-zone'],
      visible: true,
    },
  ];
}

/**
 * Generate text safe zone guides
 */
function generateTextSafeGuides(width: number, height: number, platform: PlatformPreview): SmartGuide[] {
  const guides: SmartGuide[] = [];
  const padding = 16;
  
  // General text safe zone (avoid edges)
  guides.push({
    id: 'text-safe-inner',
    type: 'text-safe',
    position: { 
      x1: padding, 
      y1: padding, 
      x2: width - padding, 
      y2: height - padding 
    },
    label: 'Text Safe Zone',
    priority: 'medium',
    color: GUIDE_COLORS['text-safe'],
    visible: true,
  });
  
  // Platform-specific text zones
  if (platform === 'youtube') {
    // Avoid bottom-right (duration badge)
    guides.push({
      id: 'text-safe-youtube-br',
      type: 'text-safe',
      position: {
        x1: padding,
        y1: padding,
        x2: width - 60,
        y2: height - 28,
      },
      label: 'YouTube Safe Zone',
      priority: 'high',
      color: GUIDE_COLORS['text-safe'],
      visible: true,
    });
  }
  
  return guides;
}

/**
 * Generate platform danger zone guides
 */
function generatePlatformDangerGuides(width: number, height: number, platform: PlatformPreview): SmartGuide[] {
  const guides: SmartGuide[] = [];
  
  if (platform === 'youtube') {
    // Duration badge area
    guides.push({
      id: 'danger-youtube-duration',
      type: 'platform-danger',
      position: { x1: width - 55, y1: height - 22, x2: width - 4, y2: height - 4 },
      label: 'Duration Badge',
      priority: 'high',
      color: GUIDE_COLORS['platform-danger'],
      visible: true,
    });
  }
  
  if (platform === 'twitch') {
    // LIVE badge area
    guides.push({
      id: 'danger-twitch-live',
      type: 'platform-danger',
      position: { x1: 8, y1: 8, x2: 50, y2: 28 },
      label: 'LIVE Badge',
      priority: 'high',
      color: GUIDE_COLORS['platform-danger'],
      visible: true,
    });
  }
  
  if (platform === 'tiktok') {
    // Right sidebar
    guides.push({
      id: 'danger-tiktok-sidebar',
      type: 'platform-danger',
      position: { x1: width - 60, y1: height * 0.3, x2: width, y2: height * 0.8 },
      label: 'TikTok Sidebar',
      priority: 'high',
      color: GUIDE_COLORS['platform-danger'],
      visible: true,
    });
  }
  
  return guides;
}

// ============================================
// COMPONENT
// ============================================

const SmartGuides: React.FC<SmartGuidesProps> = ({
  config,
  canvasWidth,
  canvasHeight,
  platform,
  draggedLayer,
  snapThreshold = 8,
}) => {
  // Generate all guides based on config
  const allGuides = useMemo(() => {
    const guides: SmartGuide[] = [];
    
    if (config.showThirds) {
      guides.push(...generateThirdsGuides(canvasWidth, canvasHeight));
    }
    
    if (config.showGolden) {
      guides.push(...generateGoldenGuides(canvasWidth, canvasHeight));
    }
    
    if (config.showFaceZones) {
      guides.push(...generateFaceZoneGuides(canvasWidth, canvasHeight));
    }
    
    if (config.showTextSafe) {
      guides.push(...generateTextSafeGuides(canvasWidth, canvasHeight, platform));
    }
    
    if (config.showPlatformDanger && platform !== 'none') {
      guides.push(...generatePlatformDangerGuides(canvasWidth, canvasHeight, platform));
    }
    
    return guides;
  }, [config, canvasWidth, canvasHeight, platform]);
  
  // Filter to visible guides
  const visibleGuides = useMemo(() => {
    return allGuides.filter(guide => guide.visible);
  }, [allGuides]);
  
  if (!config.enabled || visibleGuides.length === 0) {
    return null;
  }
  
  return (
    <svg
      className="smart-guides"
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <defs>
        {/* Dash patterns for different guide types */}
        <pattern id="dash-thirds" patternUnits="userSpaceOnUse" width="8" height="1">
          <line x1="0" y1="0" x2="4" y2="0" stroke={GUIDE_COLORS.thirds} strokeWidth="1" />
        </pattern>
        <pattern id="dash-golden" patternUnits="userSpaceOnUse" width="12" height="1">
          <line x1="0" y1="0" x2="6" y2="0" stroke={GUIDE_COLORS.golden} strokeWidth="1" />
        </pattern>
      </defs>
      
      {visibleGuides.map((guide) => {
        const isLine = guide.position.x1 === guide.position.x2 || guide.position.y1 === guide.position.y2;
        const isZone = !isLine;
        
        if (isLine) {
          // Render as line guide
          return (
            <g key={guide.id}>
              <line
                x1={guide.position.x1}
                y1={guide.position.y1}
                x2={guide.position.x2}
                y2={guide.position.y2}
                stroke={guide.color}
                strokeWidth={guide.priority === 'high' ? 2 : 1}
                strokeDasharray={guide.type === 'thirds' ? '8 4' : guide.type === 'golden' ? '12 6' : 'none'}
                opacity={0.6}
              />
              {/* Label */}
              <text
                x={guide.position.x1 + 4}
                y={guide.position.y1 + 12}
                fill={guide.color}
                fontSize={10}
                opacity={0.8}
              >
                {guide.label}
              </text>
            </g>
          );
        } else {
          // Render as zone (rectangle outline)
          const x = Math.min(guide.position.x1, guide.position.x2);
          const y = Math.min(guide.position.y1, guide.position.y2);
          const width = Math.abs(guide.position.x2 - guide.position.x1);
          const height = Math.abs(guide.position.y2 - guide.position.y1);
          
          return (
            <g key={guide.id}>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={guide.type === 'face-zone' ? `${guide.color}15` : 'none'}
                stroke={guide.color}
                strokeWidth={guide.priority === 'high' ? 2 : 1}
                strokeDasharray={guide.type === 'platform-danger' ? '4 2' : '8 4'}
                opacity={0.5}
                rx={4}
              />
              {/* Label */}
              <text
                x={x + 4}
                y={y + 14}
                fill={guide.color}
                fontSize={10}
                fontWeight={guide.priority === 'high' ? 600 : 400}
                opacity={0.9}
              >
                {guide.label}
              </text>
            </g>
          );
        }
      })}
    </svg>
  );
};

export default React.memo(SmartGuides);
