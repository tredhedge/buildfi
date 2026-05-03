import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Le coût réel d'1 $ de dette : ce que les intérêts vous coûtent vraiment | BuildFi",
  description:
    "Une dette de 1 000 $ sur une carte de crédit coûte ~210 $/an. Le même 1 000 $ qui aurait pu rouler en CELI rapporte ~70 $/an. Différence : 28 ¢ par dollar, chaque année. Comparatif chiffré CC, marge, prêt auto, hypothèque, et 3 stratégies de remboursement.",
  keywords: [
    "coût réel carte de crédit",
    "intérêts composés dette",
    "rembourser ou investir",
    "calculateur dette Canada",
    "avalanche vs snowball",
    "consolidation dette",
    "coût d'opportunité dette",
    "dette à taux élevé",
  ],
  openGraph: {
    title: "Le coût réel d'1 $ de dette | BuildFi",
    description:
      "Combien vous coûte vraiment une dette de carte de crédit, vs ce que ce dollar rapporterait s'il était investi. Avec calcul, comparatif et 3 stratégies de remboursement.",
    url: "https://buildfi.ca/guides/cout-reel-dette",
    type: "article",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: "https://buildfi.ca/guides/cout-reel-dette",
    languages: {
      "fr-CA": "https://buildfi.ca/guides/cout-reel-dette",
      "en-CA": "https://buildfi.ca/guides/real-cost-of-debt",
    },
  },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const ldArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Le coût réel d'1 $ de dette : ce que les intérêts vous coûtent vraiment",
    description:
      "Comparatif chiffré du coût d'1 $ de dette selon le type (carte de crédit, marge, prêt auto, hypothèque) et coût d'opportunité vs investissement. Avec 3 stratégies de remboursement.",
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
    mainEntityOfPage: "https://buildfi.ca/guides/cout-reel-dette",
  };
  const ldFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Quel est le vrai coût d'une dette de carte de crédit ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Au taux moyen de 20,99 % APR au Canada (2026), 1 000 $ porté pendant 12 mois coûte environ 210 $ d'intérêts. Si on ajoute le coût d'opportunité (le même 1 000 $ aurait pu rouler en CELI à 6-7 % réel), le coût net est plus proche de 280 $/an par tranche de 1 000 $.",
        },
      },
      {
        "@type": "Question",
        name: "Devrais-je rembourser ma dette ou investir ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Règle simple : si le taux d'intérêt de la dette est supérieur au rendement réel attendu de votre placement (typiquement 5-7 % réel pour un portefeuille équilibré), remboursez d'abord la dette. Pour les dettes à 18-25 % (carte de crédit, marge personnelle), aucun investissement légal ne bat ce rendement net de risque.",
        },
      },
      {
        "@type": "Question",
        name: "Quelle stratégie est la meilleure : avalanche ou snowball ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Avalanche (rembourser le plus haut taux d'abord) est mathématiquement optimale — elle minimise les intérêts payés. Snowball (rembourser le plus petit solde d'abord) est psychologiquement plus motivante car les premières dettes disparaissent rapidement. Si la discipline n'est pas un enjeu, choisir avalanche. Si vous avez besoin de momentum visible, snowball est défendable.",
        },
      },
      {
        "@type": "Question",
        name: "La consolidation vaut-elle la peine ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Souvent oui pour les dettes à très haut taux (cartes de crédit). Une marge personnelle à 10-12 % bat une carte à 21 %. Une hypothèque refinancée à 5 % bat encore mieux, mais transforme une dette non garantie en dette garantie sur la maison — risque réel en cas de défaut. Toujours comparer le taux effectif (avec frais), pas seulement le taux annoncé.",
        },
      },
      {
        "@type": "Question",
        name: "Faut-il garder un fonds d'urgence en remboursant la dette ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Oui, idéalement 1 000 $ à 1 mois de dépenses minimum, même pendant le remboursement agressif. Sans coussin, le moindre imprévu (pneu, électroménager) repart la dette à la hausse — précisément ce qu'on essaie d'éviter. Le coussin évite ce cycle.",
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
