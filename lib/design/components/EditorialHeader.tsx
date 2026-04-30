"use client";
/**
 * EditorialHeader — minimal chrome for Editorial surfaces.
 *
 * Per Plan v2.2 / Phase 0: editorial surfaces (guides, AI reports, articles,
 * legal long-form) get a publication-style header — logo block + a small
 * back-to-home link, NOT the full Product nav chrome. Reports especially
 * should feel like a publication, not a wrapped app surface.
 *
 * Usage:
 *   <EditorialHeader lang="fr" />
 *   <EditorialHeader lang="en" backHref="/guides" backLabel="Back to guides" />
 */
import React from "react";
import { getEditorialPalette } from "../editorial.tokens";
import { BuildFiLogo } from "./Logo";

export interface EditorialHeaderProps {
  lang?: "fr" | "en";
  /** Override the back-link target (default "/"). */
  backHref?: string;
  /** Override the back-link label (default localized "← BuildFi"). */
  backLabel?: string;
  /** Hide the back-link entirely. */
  hideBack?: boolean;
  /** Optional eyebrow above the logo (e.g. "Guide avancé · 10 min"). */
  eyebrow?: string;
  /** Inline style overrides on the wrapping <header>. */
  style?: React.CSSProperties;
  /** Override max-width of the inner row (defaults 880 — narrower than Product). */
  maxWidth?: number;
}

export function EditorialHeader({
  lang = "fr",
  backHref = "/",
  backLabel,
  hideBack,
  eyebrow,
  style,
  maxWidth = 880,
}: EditorialHeaderProps) {
  const cl = getEditorialPalette();
  const resolvedBack = backLabel ?? (lang === "fr" ? "← BuildFi" : "← BuildFi");

  return (
    <header
      style={{
        padding: "18px 0 14px",
        marginBottom: 22,
        ...style,
      }}
    >
      <div
        style={{
          maxWidth,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {!hideBack ? (
          <a
            href={backHref}
            className="bfe-kicker"
            style={{
              textDecoration: "none",
              color: cl.gold,
              alignSelf: "start",
            }}
          >
            {resolvedBack}
          </a>
        ) : null}

        {eyebrow ? (
          <div className="bfe-kicker" style={{ color: cl.muted }}>
            {eyebrow}
          </div>
        ) : null}

        <a
          href={backHref}
          aria-label="BuildFi home"
          style={{ textDecoration: "none", display: "inline-flex" }}
        >
          <BuildFiLogo system="editorial" size="sm" accent={cl.gold} />
        </a>
      </div>
    </header>
  );
}

export default EditorialHeader;
