const shared = {
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  borderRadius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 999,
  },
  animation: {
    duration: 300,
    fast: 150,
    slow: 500,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '900' as const, letterSpacing: -0.8, lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.5, lineHeight: 32 },
    h3: { fontSize: 18, fontWeight: '800' as const, letterSpacing: -0.3, lineHeight: 26 },
    body: { fontSize: 15, fontWeight: '500' as const, letterSpacing: 0, lineHeight: 22 },
    bodyBold: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0, lineHeight: 22 },
    caption: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.2, lineHeight: 16 },
    overline: { fontSize: 10, fontWeight: '900' as const, letterSpacing: 1.5, lineHeight: 14 },
    micro: { fontSize: 9, fontWeight: '800' as const, letterSpacing: 1, lineHeight: 12 },
  },
  shadows: {
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    },
    glow: (color: string) => ({
      shadowColor: color,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 10,
    }),
  },
};

const darkColors = {
  primary: '#6366F1',     // Vibrant Indigo-500
  primaryLight: '#818CF8', // Indigo-400
  primaryDark: '#4338CA',  // Indigo-700
  accent: '#22D3EE',      // Cyan-400
  accentLight: '#67E8F9',  // Cyan-300
  accentDark: '#06B6D4',   // Cyan-500
  background: '#030712',   // Slate-950
  surface: '#0F172A',      // Slate-900
  surfaceLight: '#1E293B', // Slate-800
  surfaceElevated: '#1E293B',
  text: '#F1F5F9',         // Slate-100
  textSecondary: '#CBD5E1', // Slate-300
  textMuted: '#94A3B8',    // Slate-400
  white: '#FFFFFF',
  black: '#000000',
  success: '#34D399',      // Emerald-400
  successDark: '#10B981',
  error: '#FB7185',        // Rose-400
  errorDark: '#F43F5E',
  warning: '#FBBF24',      // Amber-400
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  overlay: 'rgba(3, 7, 18, 0.85)',
  gradient: {
    primary: ['#6366F1', '#8B5CF6'],
    accent: ['#06B6D4', '#22D3EE'],
    surface: ['rgba(15, 23, 42, 0.9)', 'rgba(15, 23, 42, 0.6)'],
    card: ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)'],
    analyze: ['#3B82F6', '#6366F1'],
    play: ['#06B6D4', '#14B8A6'],
    setup: ['#F59E0B', '#EF4444'],
    hero: ['#030712', '#0F172A'],
  },
};

const lightColors = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryDark: '#4338CA',
  accent: '#0891B2',       // Cyan-600
  accentLight: '#22D3EE',
  accentDark: '#0E7490',
  background: '#F8FAFC',   // Slate-50
  surface: '#FFFFFF',
  surfaceLight: '#F1F5F9', // Slate-100
  surfaceElevated: '#FFFFFF',
  text: '#0F172A',         // Slate-900
  textSecondary: '#334155', // Slate-700
  textMuted: '#64748B',    // Slate-500
  white: '#FFFFFF',
  black: '#000000',
  success: '#10B981',
  successDark: '#059669',
  error: '#EF4444',
  errorDark: '#DC2626',
  warning: '#F59E0B',
  border: 'rgba(0, 0, 0, 0.06)',
  borderLight: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(248, 250, 252, 0.9)',
  gradient: {
    primary: ['#6366F1', '#818CF8'],
    accent: ['#0891B2', '#22D3EE'],
    surface: ['rgba(255, 255, 255, 0.95)', 'rgba(241, 245, 249, 0.9)'],
    card: ['#FFFFFF', '#F8FAFC'],
    analyze: ['#3B82F6', '#6366F1'],
    play: ['#0891B2', '#14B8A6'],
    setup: ['#F59E0B', '#EF4444'],
    hero: ['#F8FAFC', '#EEF2FF'],
  },
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
export default THEME;
