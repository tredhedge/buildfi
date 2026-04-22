import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acheter le Planner + Rapports — 69,99 $ | BuildFi",
  description:
    "Accès à vie au Planner simulateur (190+ variables) + 5 générations de rapport IA. Paiement unique. Aucun renouvellement.",
  robots: { index: false, follow: false },
};

export default function AcheterPlannerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
