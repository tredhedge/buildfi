import "./blog.css";
import { BLOG_PATH, SITE_BASE, formatDate, postUrl, type BlogLang, type Post } from "@/lib/blog";
import BlogShell from "./BlogShell";
import Toc from "./Toc";
import BlogCta from "./BlogCta";
import DisclaimerAMF from "./DisclaimerAMF";

const UPDATED: Record<BlogLang, string> = { fr: "Mis à jour le", en: "Updated" };
const HOME: Record<BlogLang, string> = { fr: "Accueil", en: "Home" };
const BLOG_NAME: Record<BlogLang, string> = { fr: "Blogue", en: "Blog" };

export default function BlogPost({ post }: { post: Post }) {
  const lang = post.lang;
  const url = postUrl(lang, post.slug);

  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    inLanguage: lang === "fr" ? "fr-CA" : "en-CA",
    author: { "@type": "Organization", name: "BuildFi", url: SITE_BASE },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: SITE_BASE,
      logo: { "@type": "ImageObject", url: `${SITE_BASE}/icon512.png` },
    },
    mainEntityOfPage: url,
  };

  const ldBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: HOME[lang], item: `${SITE_BASE}/` },
      { "@type": "ListItem", position: 2, name: BLOG_NAME[lang], item: `${SITE_BASE}${BLOG_PATH[lang]}` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <BlogShell lang={lang}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldBreadcrumb) }} />
      <article>
        <header className="bf-post-header">
          <h1>{post.title}</h1>
          <span className="bf-post-meta">
            <time dateTime={post.date}>{formatDate(post.date, lang)}</time>
            {post.updated && post.updated !== post.date ? (
              <>
                {" · "}
                {UPDATED[lang]} <time dateTime={post.updated}>{formatDate(post.updated, lang)}</time>
              </>
            ) : null}
          </span>
        </header>
        <Toc entries={post.toc} lang={lang} />
        <div className="bf-post-body" dangerouslySetInnerHTML={{ __html: post.html }} />
        <BlogCta lang={lang} />
        <DisclaimerAMF lang={lang} />
      </article>
    </BlogShell>
  );
}
