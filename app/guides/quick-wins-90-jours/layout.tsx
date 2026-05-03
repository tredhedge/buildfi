import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "10 actions concrètes pour libérer 200 $/mois en 90 jours | BuildFi",
  description:
    "Plan 30/60/90 jours avec 10 actions à effort × impact connu pour récupérer 200 $/mois sans changer de mode de vie. Renégocier l'hypothèque, optimiser CELI/REER, abonnements ghost, assurances. Chiffres canadiens 2026.",
  keywords: [
    "économiser argent rapidement",
    "couper dépenses Québec",
    "budget familial Canada",
    "renégocier hypothèque",
    "optimiser CELI REER",
    "réduire abonnements",
    "plan 90 jours finances",
    "quick wins financiers",
  ],
  openGraph: {
    title: "10 actions pour libérer 200 $/mois en 90 jours | BuildFi",
    description:
      "Plan 30/60/90 jours classé par effort × impact. Avec montants moyens libérés et étapes concrètes. Sans yoga financier ni promesses creuses.",
    url: "https://buildfi.ca/guides/quick-wins-90-jours",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: "https://buildfi.ca/guides/quick-wins-90-jours",
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
    headline: "10 actions concrètes pour libérer 200 $/mois en 90 jours",
    description:
      "Plan 30/60/90 jours avec 10 actions à effort connu et impact mensuel chiffré pour récupérer 200 $/mois sans changement majeur de mode de vie.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: "https://buildfi.ca",
      logo: { "@type": "ImageObject", url: "https://buildfi.ca/icon512.png" },
    },
    inLanguage: "fr-CA",
    datePublished: "2026-05-03",
    dateModified: "2026-05-03",
    mainEntityOfPage: "https://buildfi.ca/guides/quick-wins-90-jours",
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }} />
      {children}
    </>
  );
}
