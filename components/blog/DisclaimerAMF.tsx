import type { BlogLang } from "@/lib/blog";

// UNIQUE shared AMF disclaimer, auto-appended to the foot of EVERY article
// (SEO-STRATEGY.md §6 / prompt 2.3). The legal text lives here and only here —
// it is NOT overridable per article. Full legal text, no abbreviated summary
// (golden rule).
//
// [À FOURNIR — Maitre : texte légal complet FR + EN. Doit couvrir : outil
// éducatif ; ne constitue pas un conseil financier, fiscal ou juridique
// personnalisé ; BuildFi Technologies inc. n'est pas inscrite auprès de l'AMF
// à titre de cabinet ; consultez un professionnel autorisé pour votre
// situation ; les résultats simulés ne préjugent pas des résultats futurs.]
const TEXT: Record<BlogLang, string> = {
  fr: "[À FOURNIR — Maitre : texte légal complet du disclaimer AMF, version française]",
  en: "[À FOURNIR — Maitre : texte légal complet du disclaimer AMF, version anglaise]",
};

export default function DisclaimerAMF({ lang }: { lang: BlogLang }) {
  return (
    <footer className="bf-disclaimer">
      <p>{TEXT[lang]}</p>
    </footer>
  );
}
