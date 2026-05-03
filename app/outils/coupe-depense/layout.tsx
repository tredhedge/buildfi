import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Calculateur d'épargne — Combien vaut 5 $/jour à la retraite? | BuildFi",
  description: "Une dépense récurrente coupée aujourd'hui devient combien à la retraite ? Calculez en 30 secondes l'impact d'un café, d'un abonnement ou d'un repas au resto. Multi-fréquence, bilingue, gratuit.",
  keywords: [
    "calculateur épargne",
    "couper dépenses",
    "intérêts composés",
    "valeur future",
    "économiser argent",
    "rembourser ou investir",
    "savings calculator Canada",
    "compound interest calculator",
    "cut expense calculator",
    "future value annuity",
  ],
  openGraph: {
    title: "Calculateur — Combien vaut 5 $/jour à la retraite ? | BuildFi",
    description: "Vois en direct combien une dépense récurrente coupée aujourd'hui pourrait représenter à 65 ans. Gratuit, instantané, aucun compte requis.",
    url: "https://buildfi.ca/outils/coupe-depense",
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculateur d'épargne — BuildFi",
    description: "Combien vaut 5 $/jour à la retraite ? Calcule l'impact d'une dépense coupée. Gratuit.",
  },
  alternates: {
    canonical: "https://buildfi.ca/outils/coupe-depense",
    languages: {
      "fr-CA": "https://buildfi.ca/outils/coupe-depense",
      "en-CA": "https://buildfi.ca/outils/coupe-depense?lang=en",
    },
  },
  robots: { index: true, follow: true },
};

export default function CoupeDepenseLayout({ children }: { children: React.ReactNode }) {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BuildFi — Calculateur d'épargne (couper une dépense)",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://buildfi.ca/outils/coupe-depense",
    inLanguage: ["fr-CA", "en-CA"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
    provider: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    featureList: [
      "Multi-frequency input (daily, weekly, monthly, annual)",
      "Compound interest projection",
      "Real return (net of inflation) modeling",
      "Years-of-retirement-spending equivalence",
      "Instant calculation — no data sent",
      "Bilingual FR/EN",
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
      <ErrorBoundary>{children}</ErrorBoundary>
    </>
  );
}
