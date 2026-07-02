import type { Metadata } from "next";

// The page itself is a client component ("use client"), so metadata lives here.
// FR-only alternates: the page's EN toggle is component state, not a URL, so
// there is no en-CA address to declare.
const PAGE_URL = "https://www.buildfi.ca/mises-a-jour";

export const metadata: Metadata = {
  title: "Mises à jour réglementaires et fiscales | BuildFi",
  description:
    "Suivi des constantes fiscales 2026 utilisées par les simulations BuildFi : RRQ, PSV, paliers d'imposition, plafonds REER et CELI, seuils de récupération.",
  openGraph: {
    title: "Mises à jour réglementaires et fiscales | BuildFi",
    description:
      "Suivi des constantes fiscales 2026 utilisées par les simulations BuildFi.",
    url: PAGE_URL,
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  alternates: {
    canonical: PAGE_URL,
  },
  robots: { index: true, follow: true },
};

export default function MisesAJourLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
