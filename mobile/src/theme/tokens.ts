/**
 * StudioPilot Design System — Brand Token Layer
 * Ported 1:1 from web `src/index.css` (Charte Graphique v1 · Charcoal × Orange × Teal)
 */

export const BRAND = {
  // ── Brand Core ──────────────────────────────────────────────────────
  charcoal: '#2C3147',      // "Studio" wordmark · primary dark
  charcoal90: '#323751',
  charcoal80: '#3D4460',
  charcoal60: '#5A6180',
  charcoal40: '#7E88A3',
  charcoal20: '#BDC4D4',
  charcoal10: '#DEE2EC',

  orange: '#E8531A',        // "P" in Pilot · CTA
  orange110: '#CC4515',     // pressed
  orange90: '#F06535',      // hover
  orange70: '#F48257',
  orange40: '#F8B090',
  orange15: 'rgba(232, 83, 26, 0.15)',
  orange08: 'rgba(232, 83, 26, 0.08)',

  teal: '#1A8C8C',          // "ilot" + compass · secondary
  teal110: '#147070',       // pressed
  teal90: '#21AAAA',        // hover
  teal70: '#3DBDBD',
  teal40: '#7DD9D9',
  teal15: 'rgba(26, 140, 140, 0.15)',
  teal08: 'rgba(26, 140, 140, 0.08)',

  // ── Semantic ───────────────────────────────────────────────────────
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  rose600: '#DC2626',
} as const;

/** Colors that change between light and dark schemes (the `--sp-*` vars). */
export interface SchemeColors {
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  /** shadow base color (charcoal in light, black in dark) */
  shadow: string;
}

export const LIGHT: SchemeColors = {
  bg: '#F4F6FA',
  surface: '#FFFFFF',
  surface2: '#EEF1F7',
  surface3: '#E4E8F2',
  border: '#D8DDED',
  borderStrong: '#BEC6DC',
  text: '#1A1D2E',
  textSecondary: '#4B5269',
  textMuted: '#7B85A0',
  textDisabled: '#B0B8CC',
  shadow: 'rgba(44,49,71,1)',
};

export const DARK: SchemeColors = {
  bg: '#0F1117',
  surface: '#1A1D2E',
  surface2: '#222638',
  surface3: '#2C3147',
  border: '#323751',
  borderStrong: '#454D6A',
  text: '#E8EBF4',
  textSecondary: '#9AA3BE',
  textMuted: '#6B7494',
  textDisabled: '#454D6A',
  shadow: 'rgba(0,0,0,1)',
};

/** Auth screens / sidebars in the web app use these fixed deep-charcoal values. */
export const FIXED = {
  authBg: '#131620',
  card: '#1C2033',
  cardBorder: '#2E3450',
  surface2: '#252A3D',
  text: '#E8EAF0',
  textMuted: '#8890A8',
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  xxl: 24,
  full: 9999,
} as const;

/** Diffuse brand shadows approximated for React Native elevation. */
export const shadowFor = (colors: SchemeColors, level: 'sm' | 'md' | 'lg') => {
  const op = level === 'sm' ? 0.08 : level === 'md' ? 0.12 : 0.18;
  const h = level === 'sm' ? 2 : level === 'md' ? 6 : 14;
  const r = level === 'sm' ? 4 : level === 'md' ? 10 : 20;
  return {
    shadowColor: colors.shadow,
    shadowOpacity: op,
    shadowRadius: r,
    shadowOffset: { width: 0, height: h },
    elevation: level === 'sm' ? 2 : level === 'md' ? 4 : 8,
  } as const;
};

/** Typography — Inter (UI) + Sora (display headings), exact web pairing. */
export const FONT = {
  // Inter weights (loaded via @expo-google-fonts/inter)
  inter: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extrabold: 'Inter_800ExtraBold',
    black: 'Inter_900Black',
  },
  // Sora (display headings h1/h2/h3)
  sora: {
    regular: 'Sora_400Regular',
    medium: 'Sora_500Medium',
    semibold: 'Sora_600SemiBold',
    bold: 'Sora_700Bold',
    extrabold: 'Sora_800ExtraBold',
  },
  /** default UI family */
  ui: 'Inter_400Regular',
  /** display headings family */
  display: 'Sora_700Bold',
} as const;
