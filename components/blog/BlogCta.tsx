import type { BlogLang } from "@/lib/blog";

// The single CTA every article ends with (SEO-STRATEGY.md §3 — one CTA, no
// dilution). The target lives in ONE constant: today it points at the Bilan
// 360 wizard; switch it to the public sample-report page (T9) in one line
// when that page ships — decision logged 2026-07-02.
export const BLOG_CTA_HREF = "/wizard";

// Copy reuses the landing's validated labels (hero-cta-primary) and the
// observational register of the landing hero — no new marketing claims.
const COPY: Record<BlogLang, { text: string; button: string }> = {
  fr: {
    text: "BuildFi modélise votre situation exacte contre des milliers de trajectoires de marché — en couple ou seul, avec ou sans société.",
    button: "Commencer mon Bilan",
  },
  en: {
    text: "BuildFi models your exact situation against thousands of market paths — as a couple or single, with or without a corporation.",
    button: "Start my Bilan",
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
