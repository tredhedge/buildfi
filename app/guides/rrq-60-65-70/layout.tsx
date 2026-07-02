import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RRQ à 60, 65 ou 70 ans : l'analyse complète (2026) | BuildFi",
  description:
    "Point d'équilibre, impact sur la succession, cas où prendre la RRQ à 60 ans a du sens. Avec calculateur gratuit. Bonifiée 2019 incluse. Adapté au Québec.",
  keywords: [
    "RRQ 60 ans ou 65 ans",
    "quand prendre la RRQ",
    "différer RRQ 70 ans",
    "point d'équilibre RRQ",
    "RRQ Québec 2026",
    "bonification RRQ 2019",
    "break-even CPP 60 65 70",
  ],
  openGraph: {
    title: "RRQ à 60, 65 ou 70 ans — L'analyse complète | BuildFi",
    description:
      "36 % de moins à 60 ans, 42 % de plus à 70 ans. Point d'équilibre ≈ 82 ans. Calcul complet + outil interactif.",
    url: "https://www.buildfi.ca/guides/rrq-60-65-70",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: "https://www.buildfi.ca/guides/rrq-60-65-70",
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "RRQ à 60, 65 ou 70 ans : l'analyse complète",
    description:
      "Guide complet sur le choix de l'âge de début de la RRQ : point d'équilibre, exceptions, impact successoral, et quand les règles normales ne s'appliquent pas.",
    author: { "@type": "Organization", name: "BuildFi", url: "https://www.buildfi.ca" },
    publisher: {
      "@type": "Organization",
      name: "BuildFi",
      url: "https://www.buildfi.ca",
      logo: { "@type": "ImageObject", url: "https://www.buildfi.ca/icon512.png" },
    },
    inLanguage: "fr-CA",
    datePublished: "2026-04-24",
    dateModified: "2026-04-24",
    mainEntityOfPage: "https://www.buildfi.ca/guides/rrq-60-65-70",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "À quel âge est le point d'équilibre de la RRQ entre 65 et 70 ans ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Environ 82 ans. Si vous vivez au-delà de 82 ans, différer à 70 ans vous donne plus de revenu cumulé à vie. Sous 82 ans, prendre à 65 ans est mathématiquement gagnant. Pour un Canadien de 65 ans en bonne santé, l'espérance de vie moyenne dépasse 87 ans (hommes) / 89 ans (femmes) — différer est souvent avantageux.",
        },
      },
      {
        "@type": "Question",
        name: "Quelle est la réduction exacte de la RRQ à 60 ans ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "36 % de moins qu'à 65 ans, calculé comme 0,6 %/mois × 60 mois = 36 %. Cette réduction est permanente et s'applique pour le reste de la vie.",
        },
      },
      {
        "@type": "Question",
        name: "Quand faut-il prendre la RRQ à 60 ans malgré la réduction ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Trois cas principaux : (1) Problèmes de santé qui réduisent l'espérance de vie sous 80 ans. (2) Besoin immédiat de liquidités et aucune autre source de revenu. (3) Conjoint survivant à faible revenu où la rente de survivant serait augmentée en commençant tôt. Dans ces cas, recevoir moins mais sooner a plus de valeur.",
        },
      },
      {
        "@type": "Question",
        name: "La bonification de la RRQ depuis 2019 change-t-elle la décision ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Non pour la décision 60/65/70 elle-même, les pourcentages restent identiques. La bonification 2019 augmente la rente maximale (on atteint maintenant un plafond supérieur sur les années contribuées après 2019). Les générations plus jeunes auront donc une rente plus élevée, mais la logique de différer reste la même.",
        },
      },
      {
        "@type": "Question",
        name: "Mon conjoint à faible revenu reçoit-il plus si je prends la RRQ à 70 ans ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui et non. La rente de survivant au Québec est de 37,5 % de votre rente pour un conjoint de moins de 65 ans, ou 60 % pour un conjoint de 65+. Donc différer augmente votre rente, ce qui augmente aussi celle du survivant. Toutefois, la rente de survivant est capée à un certain plafond combiné — à vérifier avec un pro pour les cas à haut revenu.",
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
