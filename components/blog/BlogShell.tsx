import Link from "next/link";
import { BLOG_PATH, type BlogLang } from "@/lib/blog";

const BACK: Record<BlogLang, string> = { fr: "Tous les articles", en: "All articles" };

// Common chrome for blog surfaces: brand bar + content column.
export default function BlogShell({
  lang,
  children,
}: {
  lang: BlogLang;
  children: React.ReactNode;
}) {
  return (
    <div className="bf-blog">
      <div className="bf-blog-topbar">
        <div className="bf-blog-topbar-inner">
          <a className="bf-blog-brand" href="/">
            BuildFi
          </a>
          <Link className="bf-blog-back" href={BLOG_PATH[lang]}>
            {BACK[lang]}
          </Link>
        </div>
      </div>
      <main className="bf-blog-wrap">{children}</main>
    </div>
  );
}
