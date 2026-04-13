const shared = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 24,
    xl: 32,
    full: 999,
  },
  animation: {
    duration: 300,
  }
};

const darkColors = {
  primary: '#9333ea', // Vibrant Purple
  primaryLight: '#a855f7',
  primaryDark: '#7e22ce',
  accent: '#06b6d4', // Electric Cyan
  accentLight: '#22d3ee',
  background: '#0c0a09', // Deep Charcoal
  surface: '#1c1917',   // Dark Slate
  surfaceLight: '#292524',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  white: '#ffffff',
  black: '#000000',
  success: '#22c55e',
  error: '#ef4444',
  border: 'rgba(147, 51, 234, 0.1)',
};

const lightColors = {
  primary: '#7e22ce', // Slightly deeper Purple for better contrast
  primaryLight: '#9333ea',
  primaryDark: '#581c87',
  accent: '#0891b2', // Deeper Cyan for Light Mode
  accentLight: '#06b6d4',
  background: '#ffffff', // Pure White
  surface: '#f1f5f9',   // Very Light Slate
  surfaceLight: '#e2e8f0',
  text: '#0f172a',      // Dark Slate text
  textMuted: '#64748b', // Muted Slate
  white: '#ffffff',
  black: '#000000',
  success: '#16a34a',
  error: '#dc2626',
  border: 'rgba(0, 0, 0, 0.05)',
};

export const COLORS = {
  dark: darkColors,
  light: lightColors,
};

export const THEME = {
  ...shared,
  colors: darkColors, // Default for non-context usages
};

export type ThemeType = typeof THEME;
export type ColorThemeType = typeof darkColors;
