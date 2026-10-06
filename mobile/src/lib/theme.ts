/**
 * Playmate design tokens — dark-first "after-dark lounge".
 *
 * Rules of thumb for screen authors:
 * - Backgrounds are plum-black (`colors.bg` → `surface` → `elevated` → `elevated2`).
 * - Rose→violet (`gradients.primary`) is for primary actions and my chat bubbles.
 * - Marigold (`colors.accent*`, `gradients.accent`) is ONLY for credits / money.
 * - Mint (`colors.success` / `colors.online`) is for online + success states.
 * - Never set `fontWeight` with custom fonts — pick a `fonts.*` family instead (or use `<AppText variant>`).
 */
import { Platform, type TextStyle, type ViewStyle } from "react-native";

// ───────────────────────────── palette ─────────────────────────────
export const palette = {
  plum950: "#0F0A12",
  plum900: "#17101B",
  plum850: "#1E1524",
  plum800: "#271C2F",
  plum700: "#33263D",
  plum600: "#4A3A56",
  rose500: "#F43F7F",
  rose600: "#D63478",
  violet600: "#9A2FC0",
  violet500: "#B44BE1",
  marigold400: "#FFC56B",
  marigold500: "#FFB547",
  mint500: "#3DDC97",
  red500: "#FF5C6C",
} as const;

// ───────────────────────────── semantic colors ─────────────────────────────
export const colors = {
  // surfaces
  bg: palette.plum950,
  surface: palette.plum900,
  elevated: palette.plum850,
  elevated2: palette.plum800,
  overlay: "rgba(8,5,10,0.85)",
  // text
  text: "#F7F1F5",
  textSecondary: "#C9BCC6",
  textMuted: "#8E8193",
  textDisabled: "#5E5464",
  textOnPrimary: "#FFFFFF",
  textOnAccent: "#2A1A00",
  // primary (rose)
  primary: palette.rose500,
  primaryPressed: palette.rose600,
  primarySoft: "rgba(244,63,127,0.14)",
  primaryBorder: "rgba(244,63,127,0.45)",
  // accent (marigold) — credits / money only
  accent: palette.marigold500,
  accentText: palette.marigold400,
  accentSoft: "rgba(255,181,71,0.14)",
  accentBorder: "rgba(255,181,71,0.35)",
  // status
  success: palette.mint500,
  online: palette.mint500,
  successSoft: "rgba(61,220,151,0.14)",
  danger: palette.red500,
  dangerSoft: "rgba(255,92,108,0.14)",
  // chat bubbles (my bubble background is `gradients.bubbleMine`)
  bubbleMineText: "#FFFFFF",
  bubbleTheirs: palette.plum850,
  bubbleTheirsText: "#F2EAF0",
  bubbleTheirsBorder: "rgba(255,255,255,0.06)",
  // lines
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.14)",
  divider: "rgba(255,255,255,0.06)",
  transparent: "transparent",
} as const;

/** Any key of `colors` — used by `<AppText color>` and friends. */
export type ColorName = keyof typeof colors;

// ───────────────────────────── gradients ─────────────────────────────
/** Shape accepted directly by expo-linear-gradient: `<LinearGradient {...gradients.primary} />`. */
export type Gradient = {
  colors: readonly [string, string, ...string[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
const TOP_DOWN = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } };

export const gradients = {
  /** Primary CTA: coral-rose → rose → violet. */
  primary: { colors: ["#FF5C8F", palette.rose500, palette.violet500], ...DIAGONAL },
  /** My chat bubble. */
  bubbleMine: { colors: [palette.rose600, palette.violet600], ...DIAGONAL },
  /** Credits / money CTAs (use `colors.textOnAccent` for text on top). */
  accent: { colors: ["#FFD27A", "#FFA834"], ...DIAGONAL },
  /** Soft rose glow for the top of screens (see `<GlowBackground>`). */
  screenGlow: { colors: ["rgba(244,63,127,0.18)", "rgba(244,63,127,0)"], ...TOP_DOWN },
} satisfies Record<string, Gradient>;

/** A persona's identity gradient, plus a soft tint and a ring color derived from it. */
export type PersonaGradient = Gradient & {
  /** ~16% alpha of the second color — for chips, card washes, header glows. */
  tint: string;
  /** Solid color for avatar rings / accents (the second color). */
  ring: string;
};

const PERSONA_GRADIENTS: Record<string, [string, string]> = {
  priya: ["#FF8A5B", "#FF3D7F"],
  ananya: ["#4FACFE", "#6A5AE0"],
  meera: ["#FFC15E", "#E2483D"],
};

/** Fallback pool for personas without an API accent or built-in entry. */
const GRADIENT_POOL: [string, string][] = [
  ["#FF8A5B", "#FF3D7F"],
  ["#4FACFE", "#6A5AE0"],
  ["#FFC15E", "#E2483D"],
  ["#F857A6", "#9A2FC0"],
  ["#43E1B0", "#2A8BD8"],
  ["#FF6FD8", "#7F5CFF"],
  ["#F6A6B2", "#D63478"],
  ["#7CF0C9", "#3A7BD5"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Converts "#RRGGBB" (or "#RGB") to an rgba() string; passes other formats through unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return hex;
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/**
 * Gradient identity for a persona. Priority: `accent` from the API → built-in map → deterministic pick by id hash.
 * Usage: `const g = personaGradient(p.id, p.accent); <LinearGradient colors={g.colors} start={g.start} end={g.end} />`
 */
export function personaGradient(id: string, accent?: [string, string] | null): PersonaGradient {
  const pair = accent ?? PERSONA_GRADIENTS[id.toLowerCase()] ?? GRADIENT_POOL[hashString(id) % GRADIENT_POOL.length];
  return { colors: [pair[0], pair[1]], ...DIAGONAL, tint: withAlpha(pair[1], 0.16), ring: pair[1] };
}

// ───────────────────────────── typography ─────────────────────────────
/** Font family names — must match the keys loaded in the root layout's `useFonts`. */
export const fonts = {
  displaySemi: "Baloo2_600SemiBold",
  display: "Baloo2_700Bold",
  displayHeavy: "Baloo2_800ExtraBold",
  body: "Mukta_400Regular",
  bodyMedium: "Mukta_500Medium",
  bodySemi: "Mukta_600SemiBold",
  bodyBold: "Mukta_700Bold",
} as const;

const base: TextStyle = { includeFontPadding: false };

/** Type scale. Each entry is a complete TextStyle (family/size/lineHeight). Prefer `<AppText variant>`. */
export const type = {
  hero: { ...base, fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 50 },
  display: { ...base, fontFamily: fonts.display, fontSize: 32, lineHeight: 38 },
  title1: { ...base, fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  title2: { ...base, fontFamily: fonts.display, fontSize: 20, lineHeight: 26 },
  title3: { ...base, fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22 },
  bodyLg: { ...base, fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  body: { ...base, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  bodyStrong: { ...base, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 21 },
  button: { ...base, fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 20 },
  caption: { ...base, fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17 },
  micro: { ...base, fontFamily: fonts.bodyMedium, fontSize: 11, lineHeight: 14 },
  overline: {
    ...base,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    lineHeight: 14,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  number: { ...base, fontFamily: fonts.display, fontSize: 15, lineHeight: 18, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

// ───────────────────────────── layout ─────────────────────────────
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  /** Horizontal screen padding. */
  gutter: 20,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 28,
  pill: 999,
  bubble: 20,
  /** The small corner on the "tail" side of a chat bubble. */
  bubbleTail: 6,
} as const;

/** Spread into a style: `[styles.card, shadows.card]`. Android uses elevation (no colored shadows there). */
export const shadows = {
  card: Platform.select<ViewStyle>({
    ios: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6 },
    default: { shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  }),
  glowPrimary: Platform.select<ViewStyle>({
    ios: { shadowColor: palette.rose500, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 8, shadowColor: palette.rose500 },
    default: { shadowColor: palette.rose500, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  }),
  glowAccent: Platform.select<ViewStyle>({
    ios: { shadowColor: palette.marigold500, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 8, shadowColor: palette.marigold500 },
    default: { shadowColor: palette.marigold500, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } },
  }),
};

/** Animation durations (ms) and the shared press-scale factor. */
export const motion = {
  instant: 90,
  fast: 140,
  base: 200,
  slow: 320,
  hero: 600,
  pressScale: 0.97,
} as const;

export const theme = { palette, colors, gradients, fonts, type, space, radii, shadows, motion } as const;
