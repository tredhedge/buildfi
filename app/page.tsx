// /app/page.tsx
// Page d'accueil — redirige vers le quiz Essentiel
// quiz-essentiel.html doit être dans /public/
// Remplacer par landing page en P1.5

import { permanentRedirect } from "next/navigation";

export default function Home() {
  permanentRedirect("/quiz-essentiel.html");
}
