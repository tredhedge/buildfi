/**
 * BuildFi Product System — TypeScript tokens
 *
 * For inline-style consumers (debt tool, decum tool, marketing landing) that
 * build palettes as JS objects. Keep these values in sync with product.css.
 *
 * Source of truth: design-lab/experiments/round-3-3-tools-approved (2026-04-28).
 */

export const PRODUCT_DARK = {
  bg: "#0f1520",
  bg2: "#151c28",
  surface: "#181f2d",
  surface2: "#20293a",
  surface3: "#283246",
  line: "#364259",
  lineLight: "#4d5d75",
  text: "#edf2fb",
  muted: "#98a6c2",
  mutedDim: "#5f6b87",
} as const;

export const PRODUCT_LIGHT = {
  bg: "#f5f6fa",
  bg2: "#edf1f8",
  surface: "#ffffff",
  surface2: "#f3f6fb",
  surface3: "#e9eef6",
  line: "#d7deeb",
  lineLight: "#c2cfde",
  text: "#182236",
  muted: "#5f6b87",
  mutedDim: "#7d889e",
} as const;

/** Shared brand accent — same hex across the portfolio. */
export const BRAND = {
  gold: "#c4944a",
  goldSoft: "rgba(196,148,74,.12)",
  goldLine: "rgba(196,148,74,.18)",
} as const;

/** Semantic state colors (shared with editorial system). */
export const SEMANTIC = {
  blue: "#5090c8",
  green: "#69be81",
  red: "#d87373",
  orange: "#d88a42",
  /* Light-mode variants (slightly darker for AA contrast on cream/white) */
  blueLight: "#3b79b6",
  greenLight: "#2f8a4a",
  redLight: "#b93f43",
  orangeLight: "#b5772f",
} as const;

export const RADIUS = {
  lg: 28,
  md: 18,
  sm: 12,
  pill: 999,
} as const;

export const FONT = {
  sans: 'var(--font-dm-sans), "Segoe UI", Arial, sans-serif',
  mono: 'var(--font-jetbrains-mono), "Courier New", monospace',
} as const;

/**
 * Compose a full palette for a given theme.
 *
 * Returns canonical names (`bg`, `surface`, `text`, `muted`, `line`, ...)
 * AND legacy aliases used by the tools that are being ported in Phase B
 * (`card`, `s2`, `tx`, `txDim`, `txMuted`, `border`, `borderLight`,
 * `redBg`, `greenBg`, `blueBg`, `orangeBg`). The aliases map to the
 * canonical surfaces; do not rely on them for new work.
 */
export function getProductPalette(theme: "dark" | "light") {
  const s = theme === "dark" ? PRODUCT_DARK : PRODUCT_LIGHT;
  const blue = theme === "dark" ? SEMANTIC.blue : SEMANTIC.blueLight;
  const green = theme === "dark" ? SEMANTIC.green : SEMANTIC.greenLight;
  const red = theme === "dark" ? SEMANTIC.red : SEMANTIC.redLight;
  const orange = theme === "dark" ? SEMANTIC.orange : SEMANTIC.orangeLight;
  const stateBgAlpha = theme === "dark" ? 0.10 : 0.08;

  return {
    /* Canonical names */
    ...s,
    accent: BRAND.gold,
    accentBg: BRAND.goldSoft,
    accentLine: BRAND.goldLine,
    blue, green, red, orange,

    /* Legacy aliases for inline-style consumers (debt, decum, landing) */
    card: s.surface,
    s2: s.surface2,
    border: s.line,
    borderLight: s.lineLight,
    tx: s.text,
    txDim: s.muted,
    txMuted: s.mutedDim,
    al: theme === "dark" ? "#f2f7fd" : "#172332",  // brightest-text alias used by decum
    dm: s.muted,                                    // muted-text alias used by decum
    ac: BRAND.gold,                                 // accent alias used by decum
    bl: blue, gn: green, rd: red, or: orange,       // short aliases used by decum
    cd: s.surface,                                  // card alias used by decum
    bd: s.line, bd2: s.lineLight,                   // border aliases used by decum

    /* State color soft backgrounds (used by debt) */
    redBg: `rgba(${theme === "dark" ? "207,96,96" : "185,63,67"},${stateBgAlpha})`,
    greenBg: `rgba(${theme === "dark" ? "72,166,109" : "47,138,74"},${stateBgAlpha})`,
    blueBg: `rgba(${theme === "dark" ? "106,166,222" : "59,121,182"},${stateBgAlpha})`,
    orangeBg: `rgba(${theme === "dark" ? "207,152,80" : "181,119,47"},${stateBgAlpha})`,
  };
}

export type ProductPalette = ReturnType<typeof getProductPalette>;

/** Theme persistence — single canonical localStorage key for the portfolio. */
export const THEME_STORAGE_KEY = "buildfi_theme";
