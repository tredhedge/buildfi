import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide 201 — Optimiser votre retraite (REER, PSV, RRQ, fiscalité) | BuildFi",
  description:
    "Ordre de retrait, récupération PSV, timing RRQ 60/65/70, fractionnement de revenu, frais de gestion, meltdown REER, CCPC, immobilier. Calculateurs gratuits. Chiffres 2026.",
  keywords: [
    "optimiser retraite",
    "récupération PSV",
    "OAS clawback calculator",
    "RRQ 60 ou 65 ou 70",
    "meltdown REER",
    "fractionnement revenu retraite",
    "frais gestion MER",
    "CCPC retraite",
    "Smith manoeuvre",
    "décaissement REER Québec",
    "retirement optimization Canada",
    "RRSP meltdown strategy",
  ],
  openGraph: {
    title: "Guide 201 — Optimiser votre retraite | BuildFi",
    description:
      "Les leviers qui changent tout : ordre de retrait, protection PSV, timing RRQ, frais, meltdown. Pour portefeuilles établis.",
    url: "https://www.buildfi.ca/guides/201",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guide 201 — Optimiser votre retraite",
    description:
      "Retrait, taxes, frais, meltdown, CCPC. Calculateurs gratuits. 2026.",
  },
  alternates: {
    canonical: "https://www.buildfi.ca/guides/201",
    languages: {
      "fr-CA": "https://www.buildfi.ca/guides/201",
      "en-CA": "https://www.buildfi.ca/guides/201?lang=en",
      "x-default": "https://www.buildfi.ca/guides/201",
    },
  },
  robots: { index: true, follow: true },
};

export default function Guide201Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Guide 201 — Optimiser votre retraite",
    description:
      "Stratégies de retrait, fiscalité, PSV, RRQ, fractionnement, frais, meltdown REER, CCPC, immobilier — avec calculateurs interactifs.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://www.buildfi.ca" },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: "https://www.buildfi.ca",
      logo: { "@type": "ImageObject", url: "https://www.buildfi.ca/icon512.png" },
    },
    inLanguage: "fr-CA",
    datePublished: "2026-04-20",
    dateModified: "2026-04-20",
    mainEntityOfPage: "https://www.buildfi.ca/guides/201",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Quand devrais-je commencer ma RRQ : à 60, 65 ou 70 ans ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "À 60 ans, vous recevez 36 % de moins qu'à 65. À 70 ans, vous recevez 42 % de plus. Le point d'équilibre vs 65 ans se situe autour de 82 ans. Pour un Canadien en bonne santé, l'espérance de vie à 65 ans dépasse souvent 87 ans (hommes) / 89 ans (femmes) — différer peut être avantageux. Exceptions : problèmes de santé, besoin de liquidité immédiat, conjoint survivant à faible revenu.",
        },
      },
      {
        "@type": "Question",
        name: "Qu'est-ce que la récupération de la PSV ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Si votre revenu net dépasse 95 323 $ en 2026, le gouvernement récupère 15 ¢ par dollar excédentaire. À environ 155 000 $, votre PSV tombe à zéro. Sur 20-25 ans, la perte peut dépasser 100 000 $. Les retraits REER/FERR forcés à 72 ans sont la cause la plus fréquente.",
        },
      },
      {
        "@type": "Question",
        name: "Qu'est-ce que le meltdown REER ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Le meltdown REER consiste à retirer volontairement de son REER avant 72 ans pour rester dans un palier d'imposition bas et éviter les retraits FERR obligatoires qui pourraient déclencher la récupération PSV. Optimal pour les REER au-dessus de 500 000 $. Économies potentielles : 40 000 à 120 000 $ sur 25 ans.",
        },
      },
      {
        "@type": "Question",
        name: "Puis-je fractionner mon revenu de pension avec mon conjoint ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Oui, à partir de 65 ans, vous pouvez transférer jusqu'à 50 % de votre revenu de pension admissible (FERR, rente de pension à prestations déterminées) à votre conjoint sur vos déclarations. Si les taux marginaux diffèrent de 15 points, l'économie annuelle peut atteindre 3 000 à 5 000 $. Formulaires T1032 (fédéral) + TP-1012.A (Québec). Ne s'applique pas à la RRQ, PSV, ou retraits REER avant FERR.",
        },
      },
      {
        "@type": "Question",
        name: "Quelle est la différence entre FNB indiciel et fonds commun de placement ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Les FNB indiciels chargent 0,05 à 0,25 % de frais (MER). Les fonds communs canadiens moyens chargent environ 2,2 %. Sur 30 ans, la différence sur un portefeuille de 200 000 $ représente plus de 200 000 $. Les frais sont le facteur le plus prévisible de votre rendement à long terme — et le seul que vous contrôlez entièrement.",
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
