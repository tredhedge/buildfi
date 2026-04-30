"use client";
/**
 * ProductFooter — full chrome footer for Product surfaces.
 *
 * For: marketing landing, tool pages, expert dashboard, wizard, secondary
 * Product surfaces.
 *
 * Includes copyright, legal links, support pointer, and a small AMF /
 * compliance hint. Theme-aware via getProductPalette().
 *
 * Usage:
 *   <ProductFooter theme={theme} lang={lang} />
 *   <ProductFooter theme={theme} lang={lang} extraLinks={[{ label: "Status", href: "/status" }]} />
 */
import React from "react";
import { getProductPalette, type ProductPalette } from "../product.tokens";

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface ProductFooterProps {
  theme: "dark" | "light";
  lang: "fr" | "en";
  /** Append additional links to the right of the canonical legal/support set. */
  extraLinks?: FooterLink[];
  /** Hide the AMF compliance line (use sparingly). */
  hideCompliance?: boolean;
  /** Override max-width of the inner row (defaults 1200). */
  maxWidth?: number;
  palette?: ProductPalette;
}

const COPY = {
  fr: {
    copyright: (year: number) => `© ${year} BuildFi. Tous droits réservés.`,
    legal: "Mentions légales",
    privacy: "Confidentialité",
    support: "Support",
    updates: "Mises à jour",
    compliance:
      "BuildFi fournit des projections informatives basées sur vos données. Ce ne sont pas des conseils financiers personnalisés au sens de la LDPSF / AMF.",
  },
  en: {
    copyright: (year: number) => `© ${year} BuildFi. All rights reserved.`,
    legal: "Legal",
    privacy: "Privacy",
    support: "Support",
    updates: "Updates",
    compliance:
      "BuildFi provides informational projections based on your data. This is not personalized financial advice under LDPSF / AMF rules.",
  },
} as const;

export function ProductFooter({
  theme,
  lang,
  extraLinks = [],
  hideCompliance,
  maxWidth = 1200,
  palette,
}: ProductFooterProps) {
  const cl = palette ?? getProductPalette(theme);
  const t = COPY[lang];
  const year = new Date().getFullYear();

  const canonicalLinks: FooterLink[] = [
    { label: t.legal, href: "/confidentialite" },
    { label: t.privacy, href: "/confidentialite" },
    { label: t.support, href: "/support" },
    { label: t.updates, href: "/mises-a-jour" },
    ...extraLinks,
  ];

  return (
    <footer
      style={{
        background: cl.card,
        borderTop: `1px solid ${cl.border}`,
        marginTop: 60,
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "28px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div style={{ fontSize: 13, color: cl.txDim, fontWeight: 600 }}>
            {t.copyright(year)}
          </div>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 12 }}>
            {canonicalLinks.map((l) => (
              <a
                key={`${l.label}-${l.href}`}
                href={l.href}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noopener noreferrer" : undefined}
                style={{ color: cl.txDim, textDecoration: "none", fontWeight: 600 }}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {!hideCompliance ? (
          <div
            style={{
              fontSize: 11,
              color: cl.txMuted,
              lineHeight: 1.6,
              maxWidth: 720,
              fontStyle: "italic",
            }}
          >
            {t.compliance}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

export default ProductFooter;
