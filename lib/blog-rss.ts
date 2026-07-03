// RSS feeds for the blog (spec 2.5): /blogue/rss.xml (FR), /blog/rss.xml (EN).
// Published posts only — drafts never appear. Static output at build time.

import { BLOG_PATH, SITE_BASE, getPublishedPosts, postUrl, type BlogLang } from "./blog";

const CHANNEL: Record<BlogLang, { title: string; description: string }> = {
  fr: {
    title: "BuildFi — Blogue",
    description:
      "Articles sur la planification de la retraite au Canada, appuyés sur des simulations.",
  },
  en: {
    title: "BuildFi — Blog",
    description: "Articles on retirement planning in Canada, backed by simulations.",
  },
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function rfc822(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

export function buildRssXml(lang: BlogLang): string {
  const posts = getPublishedPosts(lang);
  const channelUrl = `${SITE_BASE}${BLOG_PATH[lang]}`;
  const selfUrl = `${channelUrl}/rss.xml`;
  const c = CHANNEL[lang];
  // Deterministic lastBuildDate: the newest post, not the build clock.
  const lastBuild = posts.length > 0 ? rfc822(posts[0].updated ?? posts[0].date) : undefined;

  const items = posts
    .map((p) => {
      const url = postUrl(lang, p.slug);
      return [
        "    <item>",
        `      <title>${esc(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(p.date)}</pubDate>`,
        `      <description>${esc(p.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
    `  <channel>`,
    `    <title>${esc(c.title)}</title>`,
    `    <link>${channelUrl}</link>`,
    `    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>`,
    `    <description>${esc(c.description)}</description>`,
    `    <language>${lang === "fr" ? "fr-ca" : "en-ca"}</language>`,
    ...(lastBuild ? [`    <lastBuildDate>${lastBuild}</lastBuildDate>`] : []),
    items,
    `  </channel>`,
    `</rss>`,
    ``,
  ].join("\n");
}

export function rssResponse(lang: BlogLang): Response {
  return new Response(buildRssXml(lang), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
