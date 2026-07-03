import type { BlogLang, TocEntry } from "@/lib/blog";

const LABEL: Record<BlogLang, string> = {
  fr: "Table des matières",
  en: "Contents",
};

export default function Toc({ entries, lang }: { entries: TocEntry[]; lang: BlogLang }) {
  if (entries.length < 2) return null;
  return (
    <nav className="bf-toc" aria-label={LABEL[lang]}>
      <p className="bf-toc-label">{LABEL[lang]}</p>
      <ol>
        {entries.map((e) => (
          <li key={e.id} className={e.depth === 3 ? "bf-toc-d3" : undefined}>
            <a href={`#${e.id}`}>{e.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
