import type { Metadata } from "next";
import ErrorBoundary from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "Calculateur de dettes — Avalanche, Snowball, Remboursement | BuildFi",
  description: "Comparez avalanche vs snowball, estimez votre date de liberté financière et le coût total de vos dettes. Multi-provinces, bilingue, gratuit. Rembourser ou investir — la réponse en 30 secondes.",
  keywords: [
    "calculateur dettes",
    "avalanche vs snowball",
    "rembourser dettes Canada",
    "consolider mes dettes",
    "calculateur carte de crédit",
    "rembourser ou investir",
    "debt calculator Canada",
    "debt avalanche snowball",
    "credit card payoff calculator",
  ],
  openGraph: {
    title: "Calculateur de dettes interactif — BuildFi",
    description: "Avalanche vs snowball, rembourser ou investir, date de liberté financière. Multi-provinces. Gratuit. Aucun compte requis.",
    url: "https://buildfi.ca/outils/dettes",
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculateur de dettes — BuildFi",
    description: "Avalanche vs snowball. Rembourser ou investir. Date de liberté financière. Gratuit.",
  },
  alternates: {
    canonical: "https://buildfi.ca/outils/dettes",
    languages: {
      "fr-CA": "https://buildfi.ca/outils/dettes",
      "en-CA": "https://buildfi.ca/tools/debt",
    },
  },
  robots: { index: true, follow: true },
};

export default function DettesLayout({ children }: { children: React.ReactNode }) {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "BuildFi — Calculateur de dettes",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: "https://buildfi.ca/outils/dettes",
    inLanguage: ["fr-CA", "en-CA"],
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
    provider: { "@type": "Organization", name: "BuildFi", url: "https://buildfi.ca" },
    featureList: [
      "Avalanche vs Snowball comparison",
      "Repay vs Invest analysis",
      "Multi-province tax brackets",
      "Credit utilization warnings",
      "Snowflake / lump sum modeling",
      "Couple mode",
      "Shareable results URL",
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
