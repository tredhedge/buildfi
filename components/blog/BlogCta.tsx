import type { BlogLang } from "@/lib/blog";

// The single CTA every article ends with (SEO-STRATEGY.md §3 — one CTA, no
// dilution). The target lives in ONE constant: today it points at the Bilan
// 360 wizard; switch it to the public sample-report page (T9) in one line
// when that page ships — decision logged 2026-07-02.
export const BLOG_CTA_HREF = "/wizard";

const COPY: Record<BlogLang, { text: string; button: string }> = {
  fr: {
    text: "[À FOURNIR — Maitre : phrase d'accroche CTA, ton observationnel AMF]",
    button: "[À FOURNIR — Maitre : libellé bouton]",
  },
  en: {
    text: "[À FOURNIR — Maitre : phrase d'accroche CTA EN]",
    button: "[À FOURNIR — Maitre : libellé bouton EN]",
  },
};

export default function BlogCta({ lang }: { lang: BlogLang }) {
  const c = COPY[lang];
  return (
    <div className="bf-cta">
      <p>{c.text}</p>
      <a href={BLOG_CTA_HREF}>{c.button}</a>
    </div>
  );
}
