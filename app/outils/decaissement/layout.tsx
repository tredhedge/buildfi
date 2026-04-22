import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Simulateur de décaissement — RRQ, PSV, REER, retraite | BuildFi",
  description:
    "Testez votre plan de décaissement : RRQ/RPC, PSV, portefeuille, durée de vie, couverture garantie, taux de retrait. Estimation déterministe gratuite, bilingue, multi-provinces.",
  keywords: [
    "simulateur décaissement",
    "calculateur retraite Canada",
    "durabilité portefeuille retraite",
    "taux de retrait sécuritaire",
    "RRQ PSV calcul",
    "règle 4%",
    "retirement withdrawal calculator Canada",
    "safe withdrawal rate",
    "portfolio sustainability",
  ],
  openGraph: {
    title: "Simulateur de décaissement — BuildFi",
    description:
      "RRQ/PSV, portefeuille, flexibilité de dépenses, allocation. Calcul instantané, aucune donnée envoyée. Gratuit.",
    url: "https://buildfi.ca/outils/decaissement",
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Simulateur de décaissement — BuildFi",
    description: "Estimation instantanée de la durabilité de votre portefeuille de retraite.",
  },
  alternates: {
    canonical: "https://buildfi.ca/outils/decaissement",
    languages: {
      "fr-CA": "https://buildfi.ca/outils/decaissement",
      "en-CA": "https://buildfi.ca/outils/decaissement?lang=en",
    },
  },
  robots: { index: true, follow: true },
};

export default function DecumLayout({ children }: { children: React.ReactNode }) {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BuildFi — Simulateur de décaissement",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://buildfi.ca/outils/decaissement",
    inLanguage: ["fr-CA", "en-CA"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
    provider: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    featureList: [
      "QPP/CPP + OAS income modeling",
      "Portfolio sustainability estimate",
      "Safe withdrawal rate calculation",
      "Equity/bond allocation toggle",
      "Flexibility adjustment (rigid/moderate/flexible)",
      "Portfolio trajectory chart",
      "Shareable URL",
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      <ErrorBoundary>{children}</ErrorBoundary>
    </>
  );
}
