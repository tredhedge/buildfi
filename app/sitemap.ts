import type { MetadataRoute } from "next";
import { BLOG_PATH, getPair, getPublishedPosts, postUrl, type BlogLang } from "@/lib/blog";

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
// - /expert, /simulateur, /admin, /merci, /acces, /feedback, /old-landing:
//   private, parked, or legacy (robots.txt Disallow).

// Blog: published posts only (drafts excluded by getPublishedPosts). The
// /blogue and /blog indexes are listed only once at least one post is live —
// indexing empty listing pages helps nobody.
function blogEntries(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const lang of ["fr", "en"] as BlogLang[]) {
    const posts = getPublishedPosts(lang);
    if (posts.length > 0) {
      out.push({ url: `${BASE}${BLOG_PATH[lang]}`, lastModified: posts[0].updated ?? posts[0].date });
    }
    for (const p of posts) {
      const url = postUrl(lang, p.slug);
      const pair = getPair(p);
      out.push({
        url,
        lastModified: p.updated ?? p.date,
        ...(pair && !pair.draft
          ? {
              alternates: {
                languages: {
                  "fr-CA": lang === "fr" ? url : postUrl("fr", pair.slug),
                  "en-CA": lang === "en" ? url : postUrl("en", pair.slug),
                  "x-default": lang === "fr" ? url : postUrl("fr", pair.slug),
                },
              },
            }
          : {}),
      });
    }
  }
  return out;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = PAGES.map((p) => {
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
  return [...staticEntries, ...blogEntries()];
}
