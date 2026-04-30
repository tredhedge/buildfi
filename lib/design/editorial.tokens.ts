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
  /** Warmer cream for chapter-cover gradient stops (codex round-3-7). */
  paperWarm: "#ece4d9",
  panel: "#fffdf9",
  ink: "#1f2840",
  text: "#2a2520",
  muted: "#5d6480",
  line: "#ddd1be",
  /** Prose body color — between ink and muted (Plan v2.2 / Phase 3). */
  prose: "#3f4761",
  /** Nav link rest color — slightly cooler than muted (Plan v2.2 / Phase 3). */
  navRest: "#4c5570",
  goldSoft: "#e4d0b2",
  /*
    Warm-tinted shadows (Plan v2.2 / Phase 0, 2026-04-29).
    Replaces previous navy-tinted shadow. Mirrors editorial.css --bfe-shadow.
  */
  shadow: "0 14px 34px rgba(56,42,19,0.09)",
  shadowSoft: "0 8px 18px rgba(53,40,20,0.05)",
  /** Scroll-margin for #sec-N anchors so they don't land flush at top. */
  scrollMargin: 28,
} as const;

/**
 * Editorial chart palette — used by AI report renderers for percentile
 * fans, income waterfalls, and stress-test charts. Promoted from the
 * inline hex values that were scattered across report-html-360.js so
 * a single source defines what each line/area means.
 *
 * Naming follows the chart semantics, not the color:
 *   p50         — median trajectory line
 *   p25p75      — interquartile band
 *   p5p95       — outer band (5th / 95th percentile)
 *   gov         — government-guaranteed income (CPP/QPP/OAS)
 *   withdraw    — portfolio withdrawals
 *   spend       — target spending line
 *
 * If you need to extend, add semantic names — never raw hex usage.
 */
export const EDITORIAL_CHART = {
  p50: "#2F67A3",      // median — strong blue
  p25p75: "#7CA7D9",   // interquartile — softer blue
  p5p95: "#9FC1E8",    // outer band — pale blue
  p5p95Bad: "#D78E8E", // outer band — pale red (for downside emphasis)
  gov: "#2A8C46",      // government income — green
  withdraw: "#c4944a", // withdrawals — canonical gold
  spend: "#2F67A3",    // spending line — same as p50 by convention
  /* Soft fills (rgba) for area shading */
  p25p75Fill: "rgba(70,128,192,.20)",
  p5p95Fill: "rgba(70,128,192,.10)",
  govFill: "rgba(42,140,70,.25)",
  withdrawFill: "rgba(196,148,74,.35)",
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

export type EditorialChartPalette = typeof EDITORIAL_CHART;

export { BRAND, SEMANTIC };
