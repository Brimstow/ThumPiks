/**
 * Platform Preview Overlay
 * 
 * Shows how thumbnail will appear on different platforms
 * (YouTube, Twitch, TikTok, Instagram) with their UI chrome overlaid.
 * 
 * NO COMPETITOR HAS THIS - Major differentiator for Thumbnail Maker
 */

import React, { useMemo } from 'react';
import type { PlatformPreview, DevicePreview, PlatformPreviewConfig } from '../types/editor.types';

// ============================================
// TYPES
// ============================================

interface PlatformPreviewOverlayProps {
  config: PlatformPreviewConfig;
  canvasWidth: number;
  canvasHeight: number;
  onConfigChange?: (config: Partial<PlatformPreviewConfig>) => void;
}

// ============================================
// PLATFORM CONFIGS
// ============================================

// YouTube duration badge position (bottom right)
const YOUTUBE_DURATION_BADGE = {
  position: { bottom: 4, right: 4 },
  padding: { x: 4, y: 2 },
  fontSize: 12,
  fontWeight: 500,
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
  borderRadius: 2,
};

// YouTube play button overlay
const YOUTUBE_PLAY_BUTTON = {
  size: 68,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  iconColor: '#ffffff',
};

// YouTube title preview dimensions
const YOUTUBE_TITLE_PREVIEW = {
  height: 40,
  fontSize: 14,
  lineHeight: 1.3,
  color: '#0f0f0f',
  maxLines: 2,
};

// Twitch LIVE badge
const TWITCH_LIVE_BADGE = {
  position: { top: 10, left: 10 },
  padding: { x: 6, y: 3 },
  fontSize: 11,
  fontWeight: 700,
  backgroundColor: '#eb0400',
  borderRadius: 4,
  text: 'LIVE',
};

// TikTok overlay zones
const TIKTOK_ZONES = {
  topBar: { height: 44 },
  bottomBar: { height: 150 },
  rightSidebar: { width: 60 },
};

// ============================================
// DANGER ZONES
// ============================================

interface DangerZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  severity: 'high' | 'medium' | 'low';
}

function getYouTubeDangerZones(width: number, height: number): DangerZone[] {
  return [
    // Duration badge zone (bottom right)
    {
      x: width - 50,
      y: height - 20,
      width: 50,
      height: 20,
      label: 'Duration Badge',
      severity: 'high',
    },
    // Watch later icon zone (top right on hover)
    {
      x: width - 30,
      y: 4,
      width: 26,
      height: 26,
      label: 'Watch Later',
      severity: 'low',
    },
    // Add to queue icon zone (top right on hover)
    {
      x: width - 60,
      y: 4,
      width: 26,
      height: 26,
      label: 'Queue',
      severity: 'low',
    },
  ];
}

function getTwitchDangerZones(width: number, height: number): DangerZone[] {
  return [
    // LIVE badge zone (top left)
    {
      x: 8,
      y: 8,
      width: 42,
      height: 20,
      label: 'LIVE Badge',
      severity: 'high',
    },
    // Viewer count zone (bottom left)
    {
      x: 8,
      y: height - 24,
      width: 80,
      height: 18,
      label: 'Viewers',
      severity: 'medium',
    },
  ];
}

function getTikTokDangerZones(width: number, height: number): DangerZone[] {
  return [
    // Right sidebar (interaction buttons)
    {
      x: width - TIKTOK_ZONES.rightSidebar.width,
      y: height * 0.3,
      width: TIKTOK_ZONES.rightSidebar.width,
      height: height * 0.5,
      label: 'Action Buttons',
      severity: 'high',
    },
    // Bottom bar (description, music)
    {
      x: 0,
      y: height - TIKTOK_ZONES.bottomBar.height,
      width: width - TIKTOK_ZONES.rightSidebar.width,
      height: TIKTOK_ZONES.bottomBar.height,
      label: 'Description',
      severity: 'medium',
    },
  ];
}

// ============================================
// COMPONENT
// ============================================

const PlatformPreviewOverlay: React.FC<PlatformPreviewOverlayProps> = ({
  config,
  canvasWidth,
  canvasHeight,
  onConfigChange,
}) => {
  // Get danger zones based on platform
  const dangerZones = useMemo(() => {
    switch (config.platform) {
      case 'youtube':
      case 'youtube-shorts':
        return getYouTubeDangerZones(canvasWidth, canvasHeight);
      case 'twitch':
        return getTwitchDangerZones(canvasWidth, canvasHeight);
      case 'tiktok':
        return getTikTokDangerZones(canvasWidth, canvasHeight);
      default:
        return [];
    }
  }, [config.platform, canvasWidth, canvasHeight]);
  
  // Scale factor for mobile preview
  const scaleFactor = config.device === 'mobile' ? 0.6 : 1;
  
  if (config.platform === 'none') {
    return null;
  }
  
  return (
    <div className="platform-preview-overlay" style={{ pointerEvents: 'none' }}>
      {/* Danger Zones (areas where platform UI will obscure content) */}
      {dangerZones.map((zone, index) => (
        <div
          key={index}
          className={`platform-preview-overlay__danger-zone platform-preview-overlay__danger-zone--${zone.severity}`}
          style={{
            position: 'absolute',
            left: zone.x,
            top: zone.y,
            width: zone.width,
            height: zone.height,
            backgroundColor: zone.severity === 'high' 
              ? 'rgba(255, 0, 0, 0.3)' 
              : zone.severity === 'medium'
                ? 'rgba(255, 165, 0, 0.3)'
                : 'rgba(255, 255, 0, 0.2)',
            border: `2px dashed ${zone.severity === 'high' ? '#ff0000' : zone.severity === 'medium' ? '#ffa500' : '#ffff00'}`,
            borderRadius: 2,
          }}
          title={`${zone.label} - Content may be obscured`}
        >
          <span
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              fontSize: 10,
              color: zone.severity === 'high' ? '#ff0000' : zone.severity === 'medium' ? '#ffa500' : '#ffff00',
              whiteSpace: 'nowrap',
              textShadow: '0 0 3px rgba(0,0,0,0.8)',
            }}
          >
            {zone.label}
          </span>
        </div>
      ))}
      
      {/* YouTube-specific overlays */}
      {(config.platform === 'youtube' || config.platform === 'youtube-shorts') && (
        <>
          {/* Duration badge */}
          {config.showDuration && (
            <div
              className="platform-preview-overlay__youtube-duration"
              style={{
                position: 'absolute',
                bottom: YOUTUBE_DURATION_BADGE.position.bottom,
                right: YOUTUBE_DURATION_BADGE.position.right,
                padding: `${YOUTUBE_DURATION_BADGE.padding.y}px ${YOUTUBE_DURATION_BADGE.padding.x}px`,
                fontSize: YOUTUBE_DURATION_BADGE.fontSize,
                fontWeight: YOUTUBE_DURATION_BADGE.fontWeight,
                backgroundColor: YOUTUBE_DURATION_BADGE.backgroundColor,
                borderRadius: YOUTUBE_DURATION_BADGE.borderRadius,
                color: '#ffffff',
                fontFamily: 'Roboto, Arial, sans-serif',
              }}
            >
              {config.durationText}
            </div>
          )}
          
          {/* Play button (shown on hover simulation) */}
          {config.showPlayButton && (
            <div
              className="platform-preview-overlay__youtube-play"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: YOUTUBE_PLAY_BUTTON.size,
                height: YOUTUBE_PLAY_BUTTON.size,
                backgroundColor: YOUTUBE_PLAY_BUTTON.backgroundColor,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill={YOUTUBE_PLAY_BUTTON.iconColor}
                width={28}
                height={28}
                style={{ marginLeft: 4 }}
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
        </>
      )}
      
      {/* Twitch-specific overlays */}
      {config.platform === 'twitch' && (
        <div
          className="platform-preview-overlay__twitch-live"
          style={{
            position: 'absolute',
            top: TWITCH_LIVE_BADGE.position.top,
            left: TWITCH_LIVE_BADGE.position.left,
            padding: `${TWITCH_LIVE_BADGE.padding.y}px ${TWITCH_LIVE_BADGE.padding.x}px`,
            fontSize: TWITCH_LIVE_BADGE.fontSize,
            fontWeight: TWITCH_LIVE_BADGE.fontWeight,
            backgroundColor: TWITCH_LIVE_BADGE.backgroundColor,
            borderRadius: TWITCH_LIVE_BADGE.borderRadius,
            color: '#ffffff',
            fontFamily: 'Inter, Roobert, "Helvetica Neue", sans-serif',
            textTransform: 'uppercase',
          }}
        >
          {TWITCH_LIVE_BADGE.text}
        </div>
      )}
      
      {/* TikTok-specific overlays */}
      {config.platform === 'tiktok' && (
        <>
          {/* Right sidebar indicator */}
          <div
            className="platform-preview-overlay__tiktok-sidebar"
            style={{
              position: 'absolute',
              right: 0,
              top: '30%',
              width: TIKTOK_ZONES.rightSidebar.width,
              height: '50%',
              background: 'linear-gradient(to left, rgba(0,0,0,0.3) 0%, transparent 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '10px 0',
            }}
          >
            {/* Placeholder icons */}
            {['♥', '💬', '↗', '🎵'].map((icon, i) => (
              <div 
                key={i}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                }}
              >
                {icon}
              </div>
            ))}
          </div>
          
          {/* Bottom bar indicator */}
          <div
            className="platform-preview-overlay__tiktok-bottom"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: TIKTOK_ZONES.rightSidebar.width,
              height: TIKTOK_ZONES.bottomBar.height,
              background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 100%)',
            }}
          />
        </>
      )}
      
      {/* Title preview below thumbnail (YouTube) */}
      {config.platform === 'youtube' && config.showTitle && (
        <div
          className="platform-preview-overlay__title"
          style={{
            position: 'absolute',
            bottom: -YOUTUBE_TITLE_PREVIEW.height - 8,
            left: 0,
            right: 0,
            height: YOUTUBE_TITLE_PREVIEW.height,
            padding: '8px 0',
          }}
        >
          <div
            style={{
              fontSize: YOUTUBE_TITLE_PREVIEW.fontSize,
              lineHeight: YOUTUBE_TITLE_PREVIEW.lineHeight,
              color: YOUTUBE_TITLE_PREVIEW.color,
              fontFamily: 'Roboto, Arial, sans-serif',
              fontWeight: 500,
              display: '-webkit-box',
              WebkitLineClamp: YOUTUBE_TITLE_PREVIEW.maxLines,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {config.titleText}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(PlatformPreviewOverlay);
