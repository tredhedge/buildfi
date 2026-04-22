import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portail Planner | BuildFi",
  description:
    "Votre portail Planner BuildFi — accès simulateur, générations de rapport IA, scénarios sauvegardés.",
  robots: { index: false, follow: false },
};

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
