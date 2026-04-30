"use client";
/**
 * BuildFi Product reusable components.
 *
 * Importable by any tool / planner / marketing surface that has opted into
 * the Product system (see docs/DESIGN-SYSTEM.md). Mirrors the structure of
 * editorial-components.tsx so the two systems stay symmetric.
 *
 * Voice rule (matches the editorial Note treatment):
 *   - Single voice per callout: surface panel + thin colored 2px bar carrying
 *     the meaning. The body text stays neutral. Floods of background color
 *     are reserved for state — semantic gain/loss, not chrome.
 *   - Tones: rule = gold, caution = red, info = neutral surface, check = green.
 */
import React, { useEffect } from "react";
import { getProductPalette, type ProductPalette } from "./product.tokens";

/* ────────────────────────────────────────────────────────────────────
   useProductBody — opt the document body into the Product system.
   ────────────────────────────────────────────────────────────────────
   Sets body[data-bf-system="product"][data-theme="..."] on mount, and
   keeps `data-theme` in sync when the page toggles. Cleans up on unmount
   so subsequent navigation back to an Editorial surface doesn't inherit
   product backgrounds/fonts.
   ──────────────────────────────────────────────────────────────────── */
export function useProductBody(theme: "dark" | "light") {
  useEffect(() => {
    document.body.dataset.bfSystem = "product";
    document.body.dataset.theme = theme;
    return () => {
      delete document.body.dataset.bfSystem;
      delete document.body.dataset.theme;
    };
  }, [theme]);
}

/* ────────────────────────────────────────────────────────────────────
   ProductNote — calm prose callout.
   ────────────────────────────────────────────────────────────────────
   Surface panel + thin 2px colored left bar. Uppercase kicker label
   inherits the bar tone. Theme-aware: takes the current ProductPalette
   so dark and light modes both render correctly without re-tinting.
   ──────────────────────────────────────────────────────────────────── */
export function ProductNote({
  tone = "info",
  kicker,
  cl,
  children,
  style,
}: {
  tone?: "rule" | "caution" | "info" | "check";
  kicker?: string;
  cl: ProductPalette;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const bar =
    tone === "caution" ? cl.red :
    tone === "check"   ? cl.green :
    tone === "rule"    ? cl.accent :
                         cl.borderLight;
  const kickerColor = tone === "caution" ? cl.red : tone === "check" ? cl.green : cl.accent;
  return (
    <div style={{
      background: cl.card,
      borderLeft: `2px solid ${bar}`,
      border: `1px solid ${cl.border}`,
      borderLeftWidth: 2,
      padding: "12px 16px",
      borderRadius: "0 8px 8px 0",
      fontSize: 14,
      color: cl.tx,
      lineHeight: 1.6,
      margin: "12px 0",
      ...style,
    }}>
      {kicker ? (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: kickerColor,
          textTransform: "uppercase",
          letterSpacing: ".18em",
          marginBottom: 6,
        }}>{kicker}</div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

/**
 * Re-export getProductPalette for convenience so consumers only need one
 * import. Token registry stays in product.tokens.ts.
 */
export { getProductPalette };
