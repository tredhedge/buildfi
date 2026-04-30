/**
 * BuildFi Editorial System — TypeScript tokens
 *
 * For inline-style consumers (guides, AI report renderer) that build palettes
 * as JS objects. Keep these values in sync with editorial.css.
 *
 * Source of truth: design-lab/experiments/round-2-8-guide-system (2026-04-28).
 */

import { BRAND, SEMANTIC } from "./product.tokens";

/** Editorial is single-mode (cream paper). No dark variant. */
export const EDITORIAL = {
  paper: "#faf7f1",
  paper2: "#f3ede2",
  panel: "#fffdf9",
  ink: "#1f2840",
  text: "#2a2520",
  muted: "#5d6480",
  line: "#ddd1be",
  goldSoft: "#e4d0b2",
  shadow: "0 18px 48px rgba(31,40,64,.10)",
} as const;

export const EDITORIAL_RADIUS = {
  lg: 28,
  md: 18,
  sm: 12,
  pill: 999,
} as const;

export const EDITORIAL_FONT = {
  sans: 'var(--font-inter), "Segoe UI", Arial, sans-serif',
  serif: 'var(--font-playfair), Georgia, serif',
  mono: 'var(--font-jetbrains-mono), "Courier New", monospace',
} as const;

/**
 * Editorial palette for inline consumers.
 *
 * Returns canonical names AND legacy aliases used by the guides being
 * ported in Phase B (`bg`, `card`, `s2`, `line`, `line2`, `ink`, `text`,
 * `dim`, `muted`, `gold`, `goldBg`, `blue`, `blueBg`, ...).
 */
export function getEditorialPalette() {
  const blue = SEMANTIC.blueLight;
  const green = SEMANTIC.greenLight;
  const red = SEMANTIC.redLight;
  const orange = SEMANTIC.orangeLight;

  return {
    /* Canonical names */
    ...EDITORIAL,
    accent: BRAND.gold,
    accentBg: BRAND.goldSoft,
    accentLine: BRAND.goldLine,
    blue, green, red, orange,

    /* Legacy aliases for the guides */
    bg: EDITORIAL.paper,
    card: "#ffffff",
    s2: EDITORIAL.paper2,
    line: EDITORIAL.line,
    line2: "#d4cec4",
    dim: "#6e6458",
    /* `ink`, `text`, `muted` already present on EDITORIAL */
    gold: BRAND.gold,
    goldBg: BRAND.goldSoft,
    blueBg: `rgba(${hexToRgb(blue)},.08)`,
    greenBg: `rgba(${hexToRgb(green)},.08)`,
    redBg: `rgba(${hexToRgb(red)},.08)`,
    orangeBg: `rgba(${hexToRgb(orange)},.08)`,
  };
}

function hexToRgb(hex: string): string {
  const m = hex.replace("#", "").match(/.{1,2}/g);
  if (!m || m.length < 3) return "0,0,0";
  return m.slice(0, 3).map((h) => parseInt(h, 16)).join(",");
}

export type EditorialPalette = ReturnType<typeof getEditorialPalette>;

export { BRAND, SEMANTIC };
