import type { Metadata } from "next";

// The page itself is a client component ("use client"), so metadata lives here.
const PAGE_URL = "https://www.buildfi.ca/support";

export const metadata: Metadata = {
  title: "Support et questions fréquentes | BuildFi",
  description:
    "Réponses aux questions fréquentes sur le Bilan 360 et le Planner : paiement, livraison du rapport, données personnelles, remboursement. Contact direct.",
  openGraph: {
    title: "Support et questions fréquentes | BuildFi",
    description:
      "Réponses aux questions fréquentes sur le Bilan 360 et le Planner, et comment nous joindre.",
    url: PAGE_URL,
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: PAGE_URL,
    languages: {
      "fr-CA": PAGE_URL,
      "en-CA": `${PAGE_URL}?lang=en`,
      "x-default": PAGE_URL,
    },
  },
  robots: { index: true, follow: true },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
