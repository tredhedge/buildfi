"use client";
/**
 * EditorialFooter — minimal publication-style footer for Editorial surfaces.
 *
 * Per Plan v2.2 / Phase 0: deliberately lighter than ProductFooter. Reports,
 * guides, and articles should feel like a publication; the canonical Product
 * footer (with full legal/support nav + AMF compliance line) would push them
 * back into "site wrapper" territory.
 *
 * Default: copyright + 1-2 inline legal pointers + a short AMF/observational
 * line in italic. Surface-specific footers (e.g. AI reports needing the
 * full LDPSF/AMF disclaimer in a methodology appendix) should keep their
 * own appendix and use this only for the page-foot signature.
 */
import React from "react";
import { getEditorialPalette } from "../editorial.tokens";

export interface EditorialFooterProps {
  lang?: "fr" | "en";
  /** Hide the short AMF/observational line. */
  hideObservational?: boolean;
  /** Override max-width of the inner row (defaults 880, matching reading width). */
  maxWidth?: number;
  /** Inline style overrides on the wrapping <footer>. */
  style?: React.CSSProperties;
}

const COPY = {
  fr: {
    copyright: (year: number) => `© ${year} BuildFi`,
    privacy: "Confidentialité",
    legal: "Mentions légales",
    observational:
      "BuildFi fournit des projections informatives et conditionnelles. Ce document n'est pas un conseil financier personnalisé au sens de la LDPSF.",
  },
  en: {
    copyright: (year: number) => `© ${year} BuildFi`,
    privacy: "Privacy",
    legal: "Legal",
    observational:
      "BuildFi provides informational, conditional projections. This document is not personalized financial advice under LDPSF rules.",
  },
} as const;

export function EditorialFooter({
  lang = "fr",
  hideObservational,
  maxWidth = 880,
  style,
}: EditorialFooterProps) {
  const cl = getEditorialPalette();
  const t = COPY[lang];
  const year = new Date().getFullYear();

  return (
    <footer
      style={{
        marginTop: 80,
        paddingTop: 28,
        borderTop: `1px solid ${cl.line}`,
        ...style,
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0 24px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={{ fontSize: 12, color: cl.muted, fontWeight: 600 }}>
            {t.copyright(year)}
          </div>
          <nav style={{ display: "flex", gap: 18, fontSize: 12 }}>
            <a
              href="/confidentialite"
              style={{ color: cl.muted, textDecoration: "none", fontWeight: 600 }}
            >
              {t.privacy}
            </a>
            <a
              href="/confidentialite"
              style={{ color: cl.muted, textDecoration: "none", fontWeight: 600 }}
            >
              {t.legal}
            </a>
          </nav>
        </div>

        {!hideObservational ? (
          <div
            style={{
              fontSize: 11,
              color: cl.muted,
              lineHeight: 1.65,
              fontStyle: "italic",
              opacity: 0.85,
            }}
          >
            {t.observational}
          </div>
        ) : null}
      </div>
    </footer>
  );
}

export default EditorialFooter;
