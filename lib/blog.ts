// lib/blog.ts — Blog content pipeline (SEO-STRATEGY.md §5, prompt Phase 2).
//
// Content lives in markdown files with YAML frontmatter:
//   content/blogue/<slug>.md  (FR — served at /blogue/<slug>)
//   content/blog/<slug>.md    (EN — served at /blog/<slug>)
//
// Everything here runs at BUILD TIME only (SSG): fs reads + markdown → HTML.
// Never import this module from a client component.

import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Marked } from "marked";

export type BlogLang = "fr" | "en";

export interface PostFrontmatter {
  title: string;
  description: string; // meta description, ≤155 chars for published posts
  date: string; // YYYY-MM-DD — publication date
  updated?: string; // YYYY-MM-DD — last material update
  lang: BlogLang;
  pairSlug?: string; // slug of the same article in the other language (hreflang pair)
  keywords: string[];
  draft: boolean; // true = excluded from prod build, sitemap and RSS (renders in dev only)
}

export interface PostSummary extends PostFrontmatter {
  slug: string;
}

export interface TocEntry {
  id: string;
  text: string;
  depth: 2 | 3;
}

export interface Post extends PostSummary {
  html: string;
  toc: TocEntry[];
}

export const SITE_BASE = "https://www.buildfi.ca";

export const BLOG_PATH: Record<BlogLang, string> = { fr: "/blogue", en: "/blog" };

export const OTHER_LANG: Record<BlogLang, BlogLang> = { fr: "en", en: "fr" };

const CONTENT_DIR: Record<BlogLang, string> = {
  fr: path.join(process.cwd(), "content", "blogue"),
  en: path.join(process.cwd(), "content", "blog"),
};

// Drafts render in `next dev` so the pipeline can be previewed end-to-end,
// but never in a production build, the sitemap, or the RSS feeds (spec 2.2).
const IS_DEV = process.env.NODE_ENV === "development";

export function postUrl(lang: BlogLang, slug: string): string {
  return `${SITE_BASE}${BLOG_PATH[lang]}/${slug}`;
}

// ---------------------------------------------------------------------------
// Frontmatter reading + validation (fail the build loudly, no silent slots)
// ---------------------------------------------------------------------------

function readSummary(lang: BlogLang, file: string): PostSummary {
  const slug = file.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR[lang], file), "utf8");
  const { data } = matter(raw);
  return validateFrontmatter(data, lang, file, slug);
}

function validateFrontmatter(
  data: Record<string, unknown>,
  lang: BlogLang,
  file: string,
  slug: string,
): PostSummary {
  const fail = (msg: string): never => {
    throw new Error(`[blog] content/${lang === "fr" ? "blogue" : "blog"}/${file}: ${msg}`);
  };
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const date =
    typeof data.date === "string"
      ? data.date
      : data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : "";
  const updated =
    typeof data.updated === "string"
      ? data.updated
      : data.updated instanceof Date
        ? data.updated.toISOString().slice(0, 10)
        : undefined;
  const draft = data.draft === true;

  if (!title) fail("frontmatter `title` manquant");
  if (!description) fail("frontmatter `description` manquant");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail("frontmatter `date` manquant ou pas au format YYYY-MM-DD");
  if (data.lang !== lang)
    fail(`frontmatter \`lang\` = "${String(data.lang)}" mais le fichier est dans le répertoire ${lang.toUpperCase()}`);
  if (!Array.isArray(data.keywords) || data.keywords.length === 0) fail("frontmatter `keywords` manquant ou vide");
  // Published posts must ship a real, length-compliant meta description.
  if (!draft && description.length > 155) fail(`description de ${description.length} caractères (max 155)`);
  if (!draft && description.includes("À FOURNIR")) fail("description encore en placeholder — interdit hors draft");

  return {
    slug,
    title,
    description,
    date,
    updated,
    lang,
    pairSlug: typeof data.pairSlug === "string" && data.pairSlug.trim() ? data.pairSlug.trim() : undefined,
    keywords: (data.keywords as unknown[]).map(String),
    draft,
  };
}

// ---------------------------------------------------------------------------
// Listing
// ---------------------------------------------------------------------------

function listAll(lang: BlogLang): PostSummary[] {
  const dir = CONTENT_DIR[lang];
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readSummary(lang, f))
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // reverse chronological
}

/** Published posts only — the ONLY listing the sitemap and RSS may use. */
export function getPublishedPosts(lang: BlogLang): PostSummary[] {
  return listAll(lang).filter((p) => !p.draft);
}

/** Posts visible on pages: published everywhere, drafts included in dev. */
export function getVisiblePosts(lang: BlogLang): PostSummary[] {
  return IS_DEV ? listAll(lang) : getPublishedPosts(lang);
}

// ---------------------------------------------------------------------------
// Markdown → HTML (heading ids + table of contents + "signifie" boxes)
// ---------------------------------------------------------------------------

function slugifyHeading(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SIGNIFIE_LABEL: Record<BlogLang, string> = {
  fr: "Ce que cela signifie",
  en: "What this means",
};

type Segment = { kind: "md" | "signifie"; body: string };

// `::: signifie` … `:::` fenced blocks become the standard house callout
// (spec 2.3 — composant CeQueCelaSignifie). Headings inside are not allowed
// (they would not reach the table of contents).
function splitSegments(src: string): Segment[] {
  const out: Segment[] = [];
  let buf: string[] = [];
  let kind: Segment["kind"] = "md";
  for (const line of src.split(/\r?\n/)) {
    const t = line.trim();
    if (kind === "md" && /^:::\s*signifie$/.test(t)) {
      out.push({ kind, body: buf.join("\n") });
      buf = [];
      kind = "signifie";
    } else if (kind === "signifie" && t === ":::") {
      out.push({ kind, body: buf.join("\n") });
      buf = [];
      kind = "md";
    } else {
      buf.push(line);
    }
  }
  out.push({ kind, body: buf.join("\n") });
  return out.filter((s) => s.body.trim().length > 0);
}

function renderMarkdown(src: string, lang: BlogLang): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const marked = new Marked({
    renderer: {
      heading({ tokens, depth }) {
        const inline = this.parser.parseInline(tokens);
        const plain = inline.replace(/<[^>]*>/g, "").trim();
        const id = slugifyHeading(plain);
        if (depth === 2 || depth === 3) toc.push({ id, text: plain, depth: depth as 2 | 3 });
        return `<h${depth} id="${id}">${inline}</h${depth}>\n`;
      },
    },
  });

  const html = splitSegments(src)
    .map((seg) => {
      const inner = marked.parse(seg.body, { async: false }) as string;
      if (seg.kind === "signifie") {
        return `<aside class="bf-signifie"><p class="bf-signifie-label">${SIGNIFIE_LABEL[lang]}</p>${inner}</aside>`;
      }
      return inner;
    })
    .join("\n");

  return { html, toc };
}

// ---------------------------------------------------------------------------
// Full post
// ---------------------------------------------------------------------------

export function getPost(lang: BlogLang, slug: string): Post | null {
  const file = path.join(CONTENT_DIR[lang], `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const summary = validateFrontmatter(data, lang, `${slug}.md`, slug);
  if (summary.draft && !IS_DEV) return null;
  const { html, toc } = renderMarkdown(content, lang);
  return { ...summary, html, toc };
}

/** The counterpart of a post in the other language, if it exists. */
export function getPair(post: PostSummary): PostSummary | null {
  if (!post.pairSlug) return null;
  const other = OTHER_LANG[post.lang];
  const pair = getVisiblePosts(other).find((p) => p.slug === post.pairSlug);
  return pair ?? null;
}

export function formatDate(date: string, lang: BlogLang): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
