import type { MetadataRoute } from "next";

// Sitemap for www.buildfi.ca — generated at build (T2, SEO-STRATEGY.md).
//
// lastModified is maintained BY HAND: bump a page's date when its content
// changes materially. (Stamping new Date() at build time would claim every
// page changed on every deploy, which teaches crawlers to ignore <lastmod>.)
//
// `bilingual: true` = the page swaps language client-side via ?lang=en, so it
// declares fr-CA / en-CA / x-default alternates on the same URL (x-default →
// FR, primary market). FR-only pages declare no alternates.

const BASE = "https://www.buildfi.ca";

type PublicPage = {
  path: string;
  lastModified: string; // YYYY-MM-DD
  bilingual?: boolean;
};

const PAGES: PublicPage[] = [
  { path: "/", lastModified: "2026-07-02", bilingual: true },
  { path: "/guides/101", lastModified: "2026-04-20", bilingual: true },
  { path: "/guides/201", lastModified: "2026-04-20", bilingual: true },
  { path: "/guides/rrq-60-65-70", lastModified: "2026-04-24" },
  { path: "/guides/meltdown-reer", lastModified: "2026-04-24" },
  { path: "/outils/dettes", lastModified: "2026-07-02", bilingual: true },
  { path: "/outils/decaissement", lastModified: "2026-07-02", bilingual: true },
  { path: "/support", lastModified: "2026-07-02", bilingual: true },
  { path: "/mises-a-jour", lastModified: "2026-07-02" },
];

// Intentionally absent (do not add without checking the reason still holds):
// - /wizard, /acheter-planner: meta noindex until launch — add both here the
//   day their robots meta flips to index.
// - /conditions, /confidentialite, /avis-legal: legal pages are the P0.7
//   chantier (currently noindex) — that chantier owns their indexation.
// - /guides/protection: redirects to /guides/101#protection.
// - /blogue/*, /blog/*: added by the blog infrastructure phase.
// - /expert, /simulateur, /admin, /merci, /acces, /feedback, /old-landing:
//   private, parked, or legacy (robots.txt Disallow).

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => {
    const url = `${BASE}${p.path}`;
    return {
      url,
      lastModified: p.lastModified,
      ...(p.bilingual
        ? {
            alternates: {
              languages: {
                "fr-CA": url,
                "en-CA": `${url}?lang=en`,
                "x-default": url,
              },
            },
          }
        : {}),
    };
  });
}
