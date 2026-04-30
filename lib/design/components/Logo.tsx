/**
 * BuildFiLogo — single canonical wordmark.
 *
 * Decision (Plan v2.2 / Phase 0, 2026-04-29):
 *   The previous inline copy in app/page.tsx used Plus Jakarta Sans, which
 *   is NOT registered in app/layout.tsx. That was a silent system fallback
 *   on every render. Plan v2.2 Option A normalizes the wordmark to DM Sans
 *   (the Product canonical sans) so the brand reads as one identity from
 *   marketing → product chrome → wordmark.
 *
 * Usage:
 *   <BuildFiLogo theme="dark" size="md" />
 *   <BuildFiLogo theme="light" size="lg" accent="#c4944a" />
 *   <BuildFiLogo system="editorial" size="sm" />   // editorial is light-only
 *
 * The inline `style={{ fontFamily: ... }}` on the <text> uses the next/font
 * CSS variable so the SVG inherits the loaded font instead of falling back
 * to system sans.
 */
import React from "react";

export type LogoTheme = "dark" | "light";
export type LogoSystem = "product" | "editorial";
export type LogoSize = "sm" | "md" | "lg";

export interface BuildFiLogoProps {
  /** "dark" / "light" — only meaningful in Product. Editorial is always light. */
  theme?: LogoTheme;
  /** Which system the surface uses; affects default theme + colors. */
  system?: LogoSystem;
  /** Visual size: sm = 154x34, md = 220x48, lg = 308x67. */
  size?: LogoSize;
  /** Override the gold accent (defaults to canonical #c4944a). */
  accent?: string;
  /** Override the text + block fill (defaults derived from theme). */
  textColor?: string;
  /** Inline style overrides on the <svg>. */
  style?: React.CSSProperties;
  /** Accessible label override. */
  ariaLabel?: string;
}

const CANONICAL_GOLD = "#c4944a";

export function BuildFiLogo({
  theme,
  system = "product",
  size = "md",
  accent = CANONICAL_GOLD,
  textColor,
  style,
  ariaLabel = "BuildFi",
}: BuildFiLogoProps) {
  // Editorial is single-mode (cream paper). Force light.
  const resolvedTheme: LogoTheme = system === "editorial" ? "light" : theme ?? "light";
  const isDark = resolvedTheme === "dark";

  // Default colors per theme. The block stack uses the same tone as text so
  // the wordmark reads as one unit; gold remains exclusively on the top
  // block + the "fi" suffix.
  const blockFill = textColor ?? (isDark ? "#faf8f4" : "#1a2744");
  const textFill = textColor ?? (isDark ? "#faf8f4" : "#1a2744");
  const midOpacity = isDark ? 0.4 : 0.5;
  const goldFill = accent;

  const scale = size === "lg" ? 1.4 : size === "md" ? 1.0 : 0.7;
  const w = Math.round(220 * scale);
  const h = Math.round(48 * scale);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 220 48"
      style={{ display: "block", ...style }}
      aria-label={ariaLabel}
      role="img"
    >
      <g>
        <rect x="0" y="32" width="28" height="8" rx="2" fill={blockFill} />
        <rect x="4" y="22" width="26" height="8" rx="2" fill={blockFill} opacity={midOpacity} />
        <rect x="8" y="12" width="24" height="8" rx="2" fill={goldFill} />
      </g>
      <text
        x="40"
        y="38"
        fontSize="34"
        fontWeight={700}
        letterSpacing="-0.5"
        style={{
          fontFamily: 'var(--font-dm-sans), "Segoe UI", Arial, sans-serif',
        }}
      >
        <tspan fill={textFill}>build</tspan>
        <tspan fill={goldFill}>fi</tspan>
      </text>
    </svg>
  );
}

export default BuildFiLogo;
