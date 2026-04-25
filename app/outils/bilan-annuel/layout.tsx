import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bilan Annuel — Suivi patrimonial gratuit | BuildFi",
  description: "Calculez votre valeur nette, projetez sur 5 ans et suivez votre progression financière. Gratuit. Privé. Données sur votre appareil seulement.",
  openGraph: {
    title: "Bilan Annuel — BuildFi",
    description: "Votre portrait financier complet en 5 minutes. Gratuit et privé.",
    url: "https://buildfi.ca/outils/bilan-annuel",
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bilan Annuel — BuildFi",
    description: "Votre portrait financier complet en 5 minutes. Gratuit et privé.",
  },
  alternates: {
    canonical: "https://buildfi.ca/outils/bilan-annuel",
  },
};

export default function BilanAnnuelLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
