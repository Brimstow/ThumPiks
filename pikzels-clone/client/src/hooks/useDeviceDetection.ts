/**
 * useDeviceDetection Hook
 * Detects device type (mobile/tablet/desktop) and orientation
 * Used for responsive editor routing between MobileEditor and ThumbnailStudio
 */

import { useState, useEffect, useCallback } from 'react';

// Breakpoints aligned with common device sizes
export const BREAKPOINTS = {
  mobile: 768,    // < 768px
  tablet: 1024,   // 768px - 1024px
  desktop: 1024,  // > 1024px
} as const;

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
}

// User agent patterns for mobile detection (fallback for edge cases)
const MOBILE_UA_PATTERNS = [
  /Android/i,
  /webOS/i,
  /iPhone/i,
  /iPad/i,
  /iPod/i,
  /BlackBerry/i,
  /Windows Phone/i,
  /Opera Mini/i,
  /IEMobile/i,
];

function checkUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return MOBILE_UA_PATTERNS.some((pattern) => pattern.test(navigator.userAgent));
}

function checkTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-expect-error - msMaxTouchPoints is IE-specific
    navigator.msMaxTouchPoints > 0
  );
}

export function useDeviceDetection(): DeviceInfo {
  const getDeviceInfo = useCallback((): DeviceInfo => {
    if (typeof window === 'undefined') {
      // SSR fallback
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isPortrait: false,
        isLandscape: true,
        isTouchDevice: false,
        screenWidth: 1920,
        screenHeight: 1080,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouch = checkTouchCapability();
    const isMobileUA = checkUserAgent();
    
    // Primary detection via viewport width
    const isMobileByWidth = width < BREAKPOINTS.mobile;
    const isTabletByWidth = width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet;
    
    // Combine width detection with user agent for better accuracy
    // A touch device with mobile UA at tablet width should still be considered mobile-ish
    const isMobile = isMobileByWidth || (isMobileUA && isTouch && width < BREAKPOINTS.tablet);
    const isTablet = !isMobile && (isTabletByWidth || (isMobileUA && isTouch));
    const isDesktop = !isMobile && !isTablet;

    return {
      isMobile,
      isTablet,
      isDesktop,
      isPortrait: height > width,
      isLandscape: width >= height,
      isTouchDevice: isTouch,
      screenWidth: width,
      screenHeight: height,
    };
  }, []);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    // Update on resize
    const handleResize = () => {
      setDeviceInfo(getDeviceInfo());
    };

    // Update on orientation change
    const handleOrientationChange = () => {
      // Small delay to let the browser complete the orientation change
      setTimeout(() => {
        setDeviceInfo(getDeviceInfo());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Also listen to matchMedia for more reliable breakpoint detection
    const mobileQuery = window.matchMedia(`(max-width: ${BREAKPOINTS.mobile - 1}px)`);
    const tabletQuery = window.matchMedia(
      `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`
    );

    const handleMediaChange = () => {
      setDeviceInfo(getDeviceInfo());
    };

    mobileQuery.addEventListener('change', handleMediaChange);
    tabletQuery.addEventListener('change', handleMediaChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      mobileQuery.removeEventListener('change', handleMediaChange);
      tabletQuery.removeEventListener('change', handleMediaChange);
    };
  }, [getDeviceInfo]);

  return deviceInfo;
}

/**
 * Hook to check if we should use mobile editor
 * Returns true for mobile and tablet devices
 */
export function useShouldUseMobileEditor(): boolean {
  const { isMobile, isTablet } = useDeviceDetection();
  return isMobile || isTablet;
}

export default useDeviceDetection;
