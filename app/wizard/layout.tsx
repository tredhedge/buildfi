import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questionnaire adaptatif — BuildFi Bilan 360",
  description:
    "10 minutes. Seulement les questions pertinentes à votre situation. Votre rapport personnalisé livré par courriel en quelques minutes.",
  robots: { index: false, follow: false },
};

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
