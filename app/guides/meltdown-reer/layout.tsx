import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meltdown REER : calcul, exemples et pièges (2026) | BuildFi",
  description:
    "Retirer du REER entre 60 et 72 ans peut économiser 40 000 $ à 120 000 $ en impôt et PSV récupérée. Guide complet avec calcul, exemples et cas où c'est une mauvaise idée.",
  keywords: [
    "meltdown REER",
    "décaissement REER stratégique",
    "REER avant 72 ans",
    "récupération PSV REER",
    "retirer REER 60 ans",
    "fenêtre dorée meltdown",
    "conversion FERR 72 ans",
  ],
  openGraph: {
    title: "Meltdown REER : calcul, exemples et pièges | BuildFi",
    description:
      "Stratégie qui peut économiser 40 k$ à 120 k$ en impôts + PSV sur 25 ans. Avec étapes, pièges, et cas où ça ne vaut pas.",
    url: "https://www.buildfi.ca/guides/meltdown-reer",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: { canonical: "https://www.buildfi.ca/guides/meltdown-reer" },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Meltdown REER : calcul, exemples et pièges",
    description: "Stratégie de décaissement stratégique du REER entre 60 et 72 ans pour minimiser l'impôt à vie et protéger la PSV.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://www.buildfi.ca" },
    publisher: { "@type": "Organization", name: "BuildFi", url: "https://www.buildfi.ca", logo: { "@type": "ImageObject", url: "https://www.buildfi.ca/icon512.png" } },
    inLanguage: "fr-CA",
    datePublished: "2026-04-24",
    dateModified: "2026-04-24",
    mainEntityOfPage: "https://www.buildfi.ca/guides/meltdown-reer",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Qu'est-ce que le meltdown REER ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Le meltdown REER consiste à retirer volontairement de son REER avant 72 ans (âge de conversion FERR obligatoire) pour rester dans un palier d'imposition bas et éviter que les retraits FERR forcés à 72+ poussent votre revenu au-dessus du seuil de récupération PSV (95 323 $ en 2026).",
        },
      },
      {
        "@type": "Question",
        name: "Quand faire le meltdown ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Idéalement entre la retraite et 65 ans (avant RRQ + PSV), où votre revenu imposable est le plus bas. Certaines personnes commencent à 60 ans si elles ont pris une retraite anticipée. La fenêtre 60-65 est appelée « zone dorée du meltdown ».",
        },
      },
      {
        "@type": "Question",
        name: "Combien peut-on économiser avec un meltdown REER ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Entre 40 000 $ et 120 000 $ sur 25 ans de retraite, selon la taille du REER et le taux marginal. L'économie vient de deux sources : (1) retirer à taux bas (27-32 %) plutôt qu'à taux élevé forcé à 72+ (45 %+), et (2) éviter la récupération PSV (15 ¢/$ additionnel).",
        },
      },
      {
        "@type": "Question",
        name: "Quand le meltdown est-il une mauvaise idée ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Si votre REER est modeste (sous 200 000 $), les retraits FERR obligatoires à 72+ ne dépasseront probablement pas le seuil PSV. Le meltdown ne vaut alors pas la complexité. Aussi, si votre taux marginal actuel est déjà aussi élevé que celui prévu à la retraite, il n'y a rien à gagner.",
        },
      },
      {
        "@type": "Question",
        name: "Où déposer l'argent retiré du REER ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En ordre de priorité : (1) CELI si vous avez de la place (cotisation disponible = ~109 000 $ cumulatif en 2026). Retraits CELI = aucun impôt, aucun impact PSV. (2) Compte non-enregistré (NE). Moins optimal mais préserve des liquidités pour d'autres fins.",
        },
      },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldArticle) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldFAQ) }} />
      {children}
    </>
  );
}
