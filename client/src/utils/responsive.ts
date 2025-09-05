// Responsive Design Utilities for Mobile-First Development

import { useState, useEffect } from 'react';

// Enhanced breakpoint system
export const BREAKPOINTS = {
  xs: 320,   // Small phones
  sm: 480,   // Large phones
  md: 768,   // Tablets
  lg: 1024,  // Small desktops
  xl: 1280,  // Large desktops
  xxl: 1536  // Extra large screens
} as const;

export type BreakpointKey = keyof typeof BREAKPOINTS;

// Device categories for testing
export const DEVICE_CATEGORIES = {
  mobile: { min: 0, max: BREAKPOINTS.md - 1 },
  tablet: { min: BREAKPOINTS.md, max: BREAKPOINTS.lg - 1 },
  desktop: { min: BREAKPOINTS.lg, max: Infinity }
} as const;

// Popular device specifications for testing
export const TEST_DEVICES = {
  // Mobile Phones
  'iPhone SE': { width: 375, height: 667, pixelRatio: 2 },
  'iPhone 12/13/14': { width: 390, height: 844, pixelRatio: 3 },
  'iPhone 14 Plus': { width: 428, height: 926, pixelRatio: 3 },
  'Samsung Galaxy S21': { width: 360, height: 800, pixelRatio: 3 },
  'Google Pixel 5': { width: 393, height: 851, pixelRatio: 2.75 },
  
  // Tablets  
  'iPad': { width: 768, height: 1024, pixelRatio: 2 },
  'iPad Pro 11"': { width: 834, height: 1194, pixelRatio: 2 },
  'iPad Pro 12.9"': { width: 1024, height: 1366, pixelRatio: 2 },
  'Surface Pro': { width: 912, height: 1368, pixelRatio: 2 },
  
  // Desktop
  '1366x768': { width: 1366, height: 768, pixelRatio: 1 },
  '1920x1080': { width: 1920, height: 1080, pixelRatio: 1 },
  '2560x1440': { width: 2560, height: 1440, pixelRatio: 1 }
} as const;

// Browser market share priorities for testing
export const BROWSER_PRIORITY = [
  'Chrome',
  'Safari', 
  'Edge',
  'Firefox',
  'Samsung Internet',
  'Chrome Mobile',
  'Safari Mobile'
] as const;

// Enhanced mobile detection hook
export function useResponsive() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });
  
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setWindowSize({ width, height });
      setOrientation(width > height ? 'landscape' : 'portrait');
    };
    
    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);
  
  const getCurrentBreakpoint = (): BreakpointKey => {
    const { width } = windowSize;
    
    if (width >= BREAKPOINTS.xxl) return 'xxl';
    if (width >= BREAKPOINTS.xl) return 'xl';
    if (width >= BREAKPOINTS.lg) return 'lg';
    if (width >= BREAKPOINTS.md) return 'md';
    if (width >= BREAKPOINTS.sm) return 'sm';
    return 'xs';
  };
  
  const isBreakpoint = (breakpoint: BreakpointKey): boolean => {
    return windowSize.width >= BREAKPOINTS[breakpoint];
  };
  
  const isBetween = (min: BreakpointKey, max: BreakpointKey): boolean => {
    return windowSize.width >= BREAKPOINTS[min] && windowSize.width < BREAKPOINTS[max];
  };
  
  const getDeviceCategory = (): keyof typeof DEVICE_CATEGORIES => {
    const { width } = windowSize;
    
    if (width < BREAKPOINTS.md) return 'mobile';
    if (width < BREAKPOINTS.lg) return 'tablet';
    return 'desktop';
  };
  
  return {
    windowSize,
    orientation,
    breakpoint: getCurrentBreakpoint(),
    deviceCategory: getDeviceCategory(),
    isMobile: windowSize.width < BREAKPOINTS.md,
    isTablet: isBetween('md', 'lg'),
    isDesktop: windowSize.width >= BREAKPOINTS.lg,
    isBreakpoint,
    isBetween,
    // Utility functions
    isPortrait: orientation === 'portrait',
    isLandscape: orientation === 'landscape',
    isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0
  };
}

// CSS-in-JS responsive utilities
export const mediaQueries = {
  xs: `@media (min-width: ${BREAKPOINTS.xs}px)`,
  sm: `@media (min-width: ${BREAKPOINTS.sm}px)`,
  md: `@media (min-width: ${BREAKPOINTS.md}px)`,
  lg: `@media (min-width: ${BREAKPOINTS.lg}px)`,
  xl: `@media (min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `@media (min-width: ${BREAKPOINTS.xxl}px)`,
  
  // Max-width queries
  maxXs: `@media (max-width: ${BREAKPOINTS.xs - 1}px)`,
  maxSm: `@media (max-width: ${BREAKPOINTS.sm - 1}px)`,
  maxMd: `@media (max-width: ${BREAKPOINTS.md - 1}px)`,
  maxLg: `@media (max-width: ${BREAKPOINTS.lg - 1}px)`,
  maxXl: `@media (max-width: ${BREAKPOINTS.xl - 1}px)`,
  
  // Between queries
  smToMd: `@media (min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.md - 1}px)`,
  mdToLg: `@media (min-width: ${BREAKPOINTS.md}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`,
  lgToXl: `@media (min-width: ${BREAKPOINTS.lg}px) and (max-width: ${BREAKPOINTS.xl - 1}px)`,
  
  // Touch and hover support
  touch: '@media (hover: none) and (pointer: coarse)',
  hover: '@media (hover: hover) and (pointer: fine)',
  
  // Orientation queries
  portrait: '@media (orientation: portrait)',
  landscape: '@media (orientation: landscape)',
  
  // High DPI displays
  retina: '@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi)',
  
  // Reduced motion preference
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // Dark mode preference
  darkMode: '@media (prefers-color-scheme: dark)',
  
  // High contrast preference
  highContrast: '@media (prefers-contrast: high)'
};

// Responsive spacing utilities
export const spacing = {
  // Mobile-first spacing scale
  responsive: {
    xs: { base: 4, sm: 4, md: 6, lg: 8 },
    sm: { base: 8, sm: 8, md: 12, lg: 16 },
    md: { base: 12, sm: 16, md: 20, lg: 24 },
    lg: { base: 16, sm: 20, md: 24, lg: 32 },
    xl: { base: 20, sm: 24, md: 32, lg: 40 },
    xxl: { base: 24, sm: 32, md: 40, lg: 48 }
  },
  
  // Container max-widths
  container: {
    xs: '100%',
    sm: '540px',
    md: '720px', 
    lg: '960px',
    xl: '1140px',
    xxl: '1320px'
  }
};

// Touch-friendly sizing utilities
export const touchTargets = {
  minimum: '44px', // WCAG minimum
  comfortable: '48px', // Apple/Android recommended
  generous: '56px', // Material Design
  
  // Responsive touch target sizes
  responsive: {
    mobile: '48px',
    tablet: '44px',
    desktop: '40px'
  }
};

// Typography scaling for responsive design
export const typography = {
  // Fluid typography scale
  fluidScale: {
    xs: 'clamp(0.75rem, 0.69rem + 0.31vw, 0.875rem)',
    sm: 'clamp(0.875rem, 0.81rem + 0.31vw, 1rem)',
    base: 'clamp(1rem, 0.93rem + 0.31vw, 1.125rem)',
    lg: 'clamp(1.125rem, 1.05rem + 0.38vw, 1.25rem)',
    xl: 'clamp(1.25rem, 1.16rem + 0.44vw, 1.5rem)',
    '2xl': 'clamp(1.5rem, 1.37rem + 0.63vw, 1.875rem)',
    '3xl': 'clamp(1.875rem, 1.69rem + 0.94vw, 2.25rem)',
    '4xl': 'clamp(2.25rem, 2.01rem + 1.19vw, 3rem)'
  },
  
  // Line height adjustments for mobile
  lineHeight: {
    mobile: { tight: 1.2, normal: 1.4, relaxed: 1.6 },
    desktop: { tight: 1.25, normal: 1.5, relaxed: 1.75 }
  }
};

// Cross-browser testing matrix
export const TESTING_MATRIX = {
  // Priority combinations for comprehensive testing
  essential: [
    { device: 'iPhone 12/13/14', browser: 'Safari Mobile' },
    { device: 'Samsung Galaxy S21', browser: 'Chrome Mobile' },
    { device: 'iPad', browser: 'Safari' },
    { device: '1920x1080', browser: 'Chrome' }
  ],
  
  comprehensive: [
    // Mobile
    { device: 'iPhone SE', browser: 'Safari Mobile' },
    { device: 'iPhone 12/13/14', browser: 'Safari Mobile' },
    { device: 'iPhone 14 Plus', browser: 'Safari Mobile' },
    { device: 'Samsung Galaxy S21', browser: 'Chrome Mobile' },
    { device: 'Samsung Galaxy S21', browser: 'Samsung Internet' },
    { device: 'Google Pixel 5', browser: 'Chrome Mobile' },
    
    // Tablet
    { device: 'iPad', browser: 'Safari' },
    { device: 'iPad Pro 11"', browser: 'Safari' },
    { device: 'Surface Pro', browser: 'Edge' },
    
    // Desktop
    { device: '1366x768', browser: 'Chrome' },
    { device: '1366x768', browser: 'Edge' },
    { device: '1920x1080', browser: 'Chrome' },
    { device: '1920x1080', browser: 'Safari' },
    { device: '1920x1080', browser: 'Firefox' },
    { device: '2560x1440', browser: 'Chrome' }
  ]
};

// Utility functions for responsive design
export const ResponsiveUtils = {
  // Calculate optimal image sizes for different breakpoints
  getResponsiveImageSizes: (aspectRatio: number = 16/9) => {
    return Object.entries(BREAKPOINTS).map(([key, width]) => ({
      breakpoint: key as BreakpointKey,
      width,
      height: Math.round(width / aspectRatio)
    }));
  },
  
  // Generate srcSet for responsive images
  generateSrcSet: (baseUrl: string, sizes: number[]) => {
    return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
  },
  
  // Get optimal container width for content
  getOptimalContainerWidth: (breakpoint: BreakpointKey): string => {
    return spacing.container[breakpoint];
  },
  
  // Calculate responsive font size
  getResponsiveFontSize: (baseSize: number, scale: number = 1.2) => {
    return {
      mobile: `${baseSize}rem`,
      tablet: `${baseSize * scale}rem`, 
      desktop: `${baseSize * scale * scale}rem`
    };
  }
};

// All utilities are already exported above