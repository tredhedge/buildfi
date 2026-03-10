import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portail Laboratoire | BuildFi",
  description: "Votre portail Laboratoire BuildFi — exports AI, profils sauvegardés, bilan annuel.",
  robots: { index: false, follow: false },
};

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
