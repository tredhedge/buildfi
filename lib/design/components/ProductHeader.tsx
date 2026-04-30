"use client";
/**
 * ProductHeader — sticky top chrome for Product surfaces.
 *
 * For: marketing landing, debt tool, decumulation tool, expert dashboard,
 * wizard, acheter-planner, secondary product surfaces (merci, feedback,
 * not-found, error, acces, simulateur, bilan-annuel).
 *
 * Replaces the inline <Nav> in app/page.tsx and the ad-hoc inline headers
 * across the tool pages. Theme-aware via getProductPalette().
 *
 * Usage:
 *   <ProductHeader
 *     theme={theme}
 *     toggleTheme={toggleTheme}
 *     lang={lang}
 *     setLang={setLang}
 *     links={[
 *       { label: t.navTools, href: "#tools" },
 *       { label: t.navPricing, href: "#pricing" },
 *       { label: t.navFAQ, href: "#faq" },
 *     ]}
 *     cta={{ label: t.navCTA, href: "#pricing" }}
 *   />
 */
import React from "react";
import { getProductPalette, type ProductPalette } from "../product.tokens";
import { BuildFiLogo } from "./Logo";

export interface NavLink {
  label: string;
  href: string;
  /** Open in new tab. */
  external?: boolean;
}

export interface ProductHeaderProps {
  theme: "dark" | "light";
  toggleTheme?: () => void;
  /** If provided, renders a FR/EN toggle on the right side. */
  lang?: "fr" | "en";
  setLang?: (next: "fr" | "en") => void;
  /** Top-row navigation links. Empty array hides the nav row. */
  links?: NavLink[];
  /** Optional gold CTA pill anchored on the far right. */
  cta?: NavLink;
  /** Hide the sticky behavior (defaults to sticky). */
  notSticky?: boolean;
  /** Override max-width of the inner row (defaults 1200). */
  maxWidth?: number;
  /** Forward-pass palette so consumers can avoid double-deriving in render. */
  palette?: ProductPalette;
  /** Optional aria-label for the back-to-home <a> wrapping the logo. */
  homeAriaLabel?: string;
  /** Optional href for the home link wrapping the logo (default "/"). */
  homeHref?: string;
}

export function ProductHeader({
  theme,
  toggleTheme,
  lang,
  setLang,
  links = [],
  cta,
  notSticky,
  maxWidth = 1200,
  palette,
  homeAriaLabel = "BuildFi home",
  homeHref = "/",
}: ProductHeaderProps) {
  const cl = palette ?? getProductPalette(theme);

  return (
    <header
      style={{
        background: cl.card,
        borderBottom: `1px solid ${cl.border}`,
        position: notSticky ? "static" : "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "14px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <a
          href={homeHref}
          aria-label={homeAriaLabel}
          style={{ textDecoration: "none", display: "flex", alignItems: "center" }}
        >
          <BuildFiLogo theme={theme} size="md" accent={cl.accent} />
        </a>

        {links.length > 0 ? (
          <nav style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 13 }}>
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                style={{
                  color: cl.txDim,
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {lang && setLang ? (
            <button
              onClick={() => setLang(lang === "fr" ? "en" : "fr")}
              aria-label={lang === "fr" ? "Switch to English" : "Passer au français"}
              style={{
                background: cl.s2,
                border: `1px solid ${cl.borderLight}`,
                color: cl.tx,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: 700,
                letterSpacing: "0.06em",
                lineHeight: 1,
              }}
            >
              {lang === "fr" ? "EN" : "FR"}
            </button>
          ) : null}

          {toggleTheme ? (
            <button
              onClick={toggleTheme}
              title={lang === "fr" ? "Changer le thème" : "Toggle theme"}
              aria-label={lang === "fr" ? "Changer le thème" : "Toggle theme"}
              style={{
                background: cl.s2,
                border: `1px solid ${cl.borderLight}`,
                color: cl.tx,
                padding: "7px 12px",
                borderRadius: 8,
                fontSize: 15,
                cursor: "pointer",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {theme === "dark" ? "☀" : "☾"}
            </button>
          ) : null}

          {cta ? (
            <a
              href={cta.href}
              target={cta.external ? "_blank" : undefined}
              rel={cta.external ? "noopener noreferrer" : undefined}
              style={{
                background: cl.accent,
                color: "#fff",
                padding: "9px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              {cta.label}
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default ProductHeader;
