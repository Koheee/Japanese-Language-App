export const colors = {
  ink: '#24302A',
  inkMuted: '#65716B',
  paper: '#F7F3EA',
  surface: '#FFFCF6',
  surfaceStrong: '#EFE8DA',
  line: '#DED6C7',
  forest: '#315B4A',
  forestSoft: '#DCE9E1',
  coral: '#DF6A4E',
  coralSoft: '#F9E2D9',
  gold: '#D6A746',
  goldSoft: '#F5EACB',
  white: '#FFFFFF',
  success: '#2F7D59',
  error: '#B7473A',
  overlay: 'rgba(36, 48, 42, 0.08)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const typography = {
  display: 34,
  title: 24,
  heading: 18,
  body: 16,
  small: 13,
  micro: 11,
} as const;

export const shadows = {
  card: {
    shadowColor: '#24302A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
} as const;
