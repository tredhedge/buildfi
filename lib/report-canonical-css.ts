/**
 * Canonical Editorial CSS bundle for server-side report renderers.
 *
 * AI reports are emitted as standalone HTML — they don't have access to the
 * Next.js layout's font registration or the imported globals.css chain. Each
 * generated report must therefore inline:
 *   1. A Google Fonts <link> for Inter + Playfair Display + JetBrains Mono
 *   2. The tokens.css contents (so --bf-gold, --bf-radius-*, --font-* are defined)
 *   3. The editorial.css contents (so .bfe-* classes work)
 *
 * Per Plan v2.2 / Phase 4a (codex Patch 4): inlining editorial.css alone is
 * NOT enough — editorial.css depends on variables defined in tokens.css.
 *
 * Read at module init, cached. If the read fails (very rare; might happen
 * in unusual bundling scenarios), the renderer falls back to a minimal
 * hardcoded subset so reports still render — just without the full token
 * chain. The fallback is intentionally short so the failure mode is loud
 * (visibly missing some chrome) rather than silent.
 */

import fs from "node:fs";
import path from "node:path";

const FONT_BOOTSTRAP_LINK = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">',
].join("");

/**
 * Minimal fallback subset of tokens.css — only used if filesystem read fails.
 * Keep this in sync with lib/design/tokens.css — but expect it to be out of
 * date during normal operation since it's only consulted when the canonical
 * read fails.
 */
const FALLBACK_TOKENS_CSS = `
:root {
  --bf-gold: #c4944a;
  --bf-gold-soft: rgba(196, 148, 74, 0.12);
  --bf-gold-line: rgba(196, 148, 74, 0.18);
  --bf-blue: #5090c8;
  --bf-green: #69be81;
  --bf-red: #d87373;
  --bf-orange: #d88a42;
  --bf-radius-lg: 28px;
  --bf-radius-md: 18px;
  --bf-radius-sm: 12px;
  --bf-radius-pill: 999px;
  --bf-font-sans-product: "DM Sans", "Segoe UI", Arial, sans-serif;
  --bf-font-sans-editorial: "Inter", "Segoe UI", Arial, sans-serif;
  --bf-font-serif-editorial: "Playfair Display", Georgia, serif;
  --bf-font-mono: "JetBrains Mono", "Courier New", monospace;
  /* Standalone-only resolution of the next/font CSS vars used by tokens.css */
  --font-inter: "Inter", "Segoe UI", Arial, sans-serif;
  --font-playfair: "Playfair Display", Georgia, serif;
  --font-jetbrains-mono: "JetBrains Mono", "Courier New", monospace;
  --font-dm-sans: "DM Sans", "Segoe UI", Arial, sans-serif;
  --bf-eyebrow-size: 12px;
  --bf-eyebrow-tracking: 0.20em;
  --bf-eyebrow-weight: 700;
}
`;

/**
 * Standalone reports do NOT have access to next/font's --font-* variables
 * (those are defined in app/layout.tsx and only present in the Next.js
 * runtime). So when we inject tokens.css verbatim, we ALSO need to define
 * --font-inter, --font-playfair, --font-jetbrains-mono, --font-dm-sans
 * directly so tokens.css's `var(--font-*)` references resolve.
 */
const STANDALONE_FONT_VARS = `
/*
  Standalone-report font variable bootstrap.
  These vars are normally defined by next/font in app/layout.tsx; emitted
  HTML reports run outside Next.js so we declare them here directly using
  the Google Fonts loaded above.
*/
:root {
  --font-inter: "Inter", "Segoe UI", Arial, sans-serif;
  --font-playfair: "Playfair Display", Georgia, serif;
  --font-jetbrains-mono: "JetBrains Mono", "Courier New", monospace;
  --font-dm-sans: "DM Sans", "Segoe UI", Arial, sans-serif;
}
`;

let _bundleCSS: string | null = null;

function loadCSSFile(relativePath: string): string | null {
  try {
    const absolutePath = path.join(process.cwd(), relativePath);
    return fs.readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

function buildBundleCSS(): string {
  const tokensCSS = loadCSSFile("lib/design/tokens.css");
  const editorialCSS = loadCSSFile("lib/design/editorial.css");

  if (tokensCSS && editorialCSS) {
    return [
      "/* === BuildFi canonical Editorial bundle (tokens + editorial) === */",
      STANDALONE_FONT_VARS,
      tokensCSS,
      editorialCSS,
    ].join("\n");
  }

  // Fallback: log loudly so the failure mode is visible during dev/CI.
  console.warn(
    "[report-canonical-css] tokens.css or editorial.css read failed — " +
      "using minimal fallback. Verify deployment includes lib/design/."
  );
  return [
    "/* === BuildFi canonical Editorial bundle (FALLBACK MODE) === */",
    FALLBACK_TOKENS_CSS,
  ].join("\n");
}

/**
 * Returns the concatenated tokens.css + editorial.css string, ready to be
 * injected into a `<style>` tag in a server-rendered standalone HTML report.
 *
 * Cached at first call.
 */
export function getCanonicalEditorialBundleCSS(): string {
  if (_bundleCSS === null) _bundleCSS = buildBundleCSS();
  return _bundleCSS;
}

/**
 * Returns the <link> tags that load Inter + Playfair Display + JetBrains
 * Mono from Google Fonts. Insert in the <head> BEFORE the inlined bundle
 * so font-face declarations are picked up before any styled content
 * renders.
 */
export function getEditorialFontBootstrapLink(): string {
  return FONT_BOOTSTRAP_LINK;
}

/**
 * Convenience: returns a complete `<head>`-injectable string with the
 * Google Fonts links followed by a `<style>` block containing the
 * tokens + editorial CSS.
 *
 * Call sites that already manage their own `<style>` block can use the
 * two functions above directly to avoid double-wrapping.
 */
export function getEditorialCanonicalHeadInjection(): string {
  return (
    FONT_BOOTSTRAP_LINK +
    "<style data-bf-canonical=\"editorial\">" +
    getCanonicalEditorialBundleCSS() +
    "</style>"
  );
}
