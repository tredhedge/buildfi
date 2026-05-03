import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "10 actions to free up $200/month in 90 days | BuildFi",
  description:
    "30/60/90-day plan with 10 actions ranked by effort × impact to recover $200/month without changing your lifestyle. Renegotiate mortgage, optimize TFSA/RRSP, ghost subscriptions, insurance. Canadian numbers, 2026.",
  keywords: [
    "save money fast Canada",
    "cut household expenses",
    "Canadian family budget",
    "renegotiate mortgage",
    "TFSA RRSP optimization",
    "reduce subscriptions",
    "90 day money plan",
    "financial quick wins",
  ],
  openGraph: {
    title: "10 actions to free up $200/month in 90 days | BuildFi",
    description:
      "30/60/90-day plan ranked by effort × impact. With average dollar amounts and concrete steps. No financial yoga, no empty promises.",
    url: "https://buildfi.ca/guides/quick-wins-90-days",
    type: "article",
    locale: "en_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: "https://buildfi.ca/guides/quick-wins-90-days",
    languages: {
      "fr-CA": "https://buildfi.ca/guides/quick-wins-90-jours",
      "en-CA": "https://buildfi.ca/guides/quick-wins-90-days",
    },
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "10 actions to free up $200/month in 90 days",
    description:
      "30/60/90-day plan with 10 actions at known effort and quantified monthly impact, designed to recover $200/month without major lifestyle change.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: "https://buildfi.ca",
      logo: { "@type": "ImageObject", url: "https://buildfi.ca/icon512.png" },
    },
    inLanguage: "en-CA",
    datePublished: "2026-05-03",
    dateModified: "2026-05-03",
    mainEntityOfPage: "https://buildfi.ca/guides/quick-wins-90-days",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }} />
      {children}
    </>
  );
}
