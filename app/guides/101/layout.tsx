import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guide 101 — Les bases de vos finances | BuildFi",
  description:
    "Budget 50/30/20, dette, épargne, REER vs CELI vs CELIAPP, RRQ, PSV, SRG — expliqué en français clair avec calculateurs gratuits. Chiffres 2026. Adapté au Canada et au Québec.",
  keywords: [
    "guide finances personnelles",
    "budget 50 30 20",
    "calculateur valeur nette",
    "avalanche snowball dette",
    "REER vs CELI",
    "RRQ 60 65 70",
    "PSV récupération",
    "SRG revenu",
    "financial basics Canada",
    "personal finance guide Quebec",
  ],
  openGraph: {
    title: "Guide 101 — Les bases de vos finances | BuildFi",
    description:
      "Tout ce qu'un Canadien devrait savoir, en langage simple. Budget, dette, épargne, retraite — en ordre, avec calculateurs interactifs.",
    url: "https://www.buildfi.ca/guides/101",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Guide 101 — Les bases de vos finances",
    description:
      "Budget, dette, épargne, REER vs CELI, RRQ, PSV. Calculateurs gratuits. 2026.",
  },
  alternates: {
    canonical: "https://www.buildfi.ca/guides/101",
    languages: {
      "fr-CA": "https://www.buildfi.ca/guides/101",
      "en-CA": "https://www.buildfi.ca/guides/101?lang=en",
      "x-default": "https://www.buildfi.ca/guides/101",
    },
  },
  robots: { index: true, follow: true },
};

export default function Guide101Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Guide 101 — Les bases de vos finances",
    description:
      "Budget, dette, crédit, épargne, REER vs CELI vs CELIAPP, RRQ, PSV, SRG, assurances — expliqués avec calculateurs interactifs.",
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
    mainEntityOfPage: "https://www.buildfi.ca/guides/101",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "REER ou CELI en premier ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "La réponse dépend d'une seule variable : votre taux d'imposition aujourd'hui vs à la retraite. Si vous gagnez plus de 55 000 $/an, le REER est généralement avantageux. Sous ce seuil, le CELI est souvent préférable. En cas de doute, le CELI offre plus de flexibilité.",
        },
      },
      {
        "@type": "Question",
        name: "Quelle est la règle des 7 % pour la dette ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "En règle générale, toute dette au-dessus de 7 % devrait être remboursée avant d'épargner pour la retraite. Rembourser une dette à 20 % équivaut à un rendement garanti de 20 % sans risque de marché. Exception : la contribution équivalente de votre employeur au REER (rendement instantané de 50-100 %).",
        },
      },
      {
        "@type": "Question",
        name: "Quand devrais-je commencer ma RRQ ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "À 60 ans, vous recevez 36 % de moins qu'à 65. À 70 ans, vous recevez 42 % de plus. Le point d'équilibre par rapport à 65 ans se situe autour de 82 ans. Pour un Canadien de 65 ans en bonne santé, l'espérance de vie dépasse souvent ce seuil — différer peut être avantageux.",
        },
      },
      {
        "@type": "Question",
        name: "Avalanche ou snowball pour rembourser mes dettes ?",
        acceptedAnswer: {
          "@type": "Answer",
          text:
            "Avalanche (taux le plus élevé d'abord) minimise le coût total en intérêts. Snowball (plus petit solde d'abord) crée une dynamique psychologique avec des victoires rapides. Mathématiquement, avalanche gagne. Humainement, snowball aide beaucoup à rester motivé.",
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
