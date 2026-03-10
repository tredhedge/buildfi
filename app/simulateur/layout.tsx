import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laboratoire — Simulateur de retraite | BuildFi",
  description: "Simulateur interactif de retraite avec 190+ paramètres, Monte Carlo, analyse de sensibilité et optimisation automatique.",
  openGraph: {
    title: "Laboratoire BuildFi — Simulateur de retraite",
    description: "Testez vos décisions de retraite avant de les prendre. 190+ paramètres, 5 000 scénarios Monte Carlo.",
    url: "https://buildfi.ca/simulateur",
    siteName: "BuildFi",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "https://buildfi.ca/simulateur" },
};

export default function SimulateurLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
