import Link from "next/link";
import "./blog.css";
import { BLOG_PATH, formatDate, getVisiblePosts, type BlogLang } from "@/lib/blog";
import BlogShell from "./BlogShell";

export const PAGE_SIZE = 10;

const H1: Record<BlogLang, string> = { fr: "Blogue", en: "Blog" };
const EMPTY: Record<BlogLang, string> = {
  fr: "Aucun article publié pour le moment.",
  en: "No articles published yet.",
};
const NEWER: Record<BlogLang, string> = { fr: "Articles plus récents", en: "Newer articles" };
const OLDER: Record<BlogLang, string> = { fr: "Articles plus anciens", en: "Older articles" };

export function pageCount(lang: BlogLang): number {
  return Math.ceil(getVisiblePosts(lang).length / PAGE_SIZE);
}

export default function BlogIndex({ lang, page }: { lang: BlogLang; page: number }) {
  const base = BLOG_PATH[lang];
  const posts = getVisiblePosts(lang);
  const total = Math.ceil(posts.length / PAGE_SIZE);
  const slice = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <BlogShell lang={lang}>
      <header className="bf-blog-header">
        <h1>{H1[lang]}</h1>
      </header>
      {slice.length === 0 ? (
        <p className="bf-blog-empty">{EMPTY[lang]}</p>
      ) : (
        <div className="bf-cards">
          {slice.map((p) => (
            <Link key={p.slug} href={`${base}/${p.slug}`} className="bf-card">
              <h2>
                {p.title}
                {p.draft ? <span className="bf-card-draft">draft</span> : null}
              </h2>
              <p>{p.description}</p>
              <time dateTime={p.date}>{formatDate(p.date, lang)}</time>
            </Link>
          ))}
        </div>
      )}
      {total > 1 ? (
        <nav className="bf-pagination">
          {page > 1 ? (
            <Link href={page === 2 ? base : `${base}/p/${page - 1}`}>{NEWER[lang]}</Link>
          ) : (
            <span />
          )}
          {page < total ? <Link href={`${base}/p/${page + 1}`}>{OLDER[lang]}</Link> : <span />}
        </nav>
      ) : null}
    </BlogShell>
  );
}
