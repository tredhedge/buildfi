// /app/support/page.tsx
// Bilingual support / help center page — 20 FAQ + contact section
// No auth required. Brand voice: clear, warm, confident, no emoji, grade 10.

"use client";

import { useState, useEffect, FormEvent } from "react";

// ── Colors (BuildFi palette) ───────────────────────────────────────
const MARINE = "#1a2744";
const GOLD = "#b8860b";
const GOLD_LIGHT = "#C4944A";
const BG = "#FEFCF9";
const CARD_BG = "#ffffff";
const BORDER = "#d4cec4";
const GRAY = "#666666";
const DARK = "#1A1208";

// ── Types ───────────────────────────────────────────────────────────
type Lang = "fr" | "en";

interface FAQItem {
  q: { fr: string; en: string };
  a: { fr: string; en: string };
}

interface FAQCategory {
  title: { fr: string; en: string };
  id: string;
  items: FAQItem[];
}

// ── FAQ Data ────────────────────────────────────────────────────────

const FAQ_CATEGORIES: FAQCategory[] = [
  // ── 1. Produit / Product ──────────────────────────────────────────
  {
    title: { fr: "Produit", en: "Product" },
    id: "produit",
    items: [
      {
        q: {
          fr: "C'est quoi BuildFi exactement\u00a0?",
          en: "What exactly is BuildFi?",
        },
        a: {
          fr: "BuildFi est un simulateur de retraite qui g\u00e9n\u00e8re un bilan financier personnalis\u00e9 bas\u00e9 sur 5\u202f000 sc\u00e9narios Monte Carlo. Vous r\u00e9pondez \u00e0 un questionnaire, et le moteur simule des milliers de trajectoires possibles pour votre patrimoine. Le r\u00e9sultat est un bilan clair, en fran\u00e7ais ou en anglais, livr\u00e9 par courriel en quelques minutes.",
          en: "BuildFi is a retirement simulator that generates a personalized financial assessment based on 5,000 Monte Carlo scenarios. You answer a questionnaire, and the engine simulates thousands of possible trajectories for your wealth. The result is a clear assessment, in French or English, delivered by email in a few minutes.",
        },
      },
      {
        q: {
          fr: "Quelle est la diff\u00e9rence entre Essentiel, Interm\u00e9diaire et Expert\u00a0?",
          en: "What's the difference between the tiers?",
        },
        a: {
          fr: "Essentiel (29\u00a0$)\u00a0: un bilan de 8 sections avec narration personnalis\u00e9e par intelligence artificielle. Interm\u00e9diaire (59\u00a0$)\u00a0: un bilan de 16 sections incluant l'analyse de couple, l'immobilier et les strat\u00e9gies fiscales. Expert (129\u00a0$)\u00a0: acc\u00e8s illimit\u00e9 au simulateur, 5 exports avec narration par intelligence artificielle, et la possibilit\u00e9 de tester chaque d\u00e9cision financi\u00e8re avant de la prendre.",
          en: "Essentiel ($29): an 8-section assessment with AI-personalized narration. Intermediaire ($59): a 16-section assessment including couple analysis, real estate, and tax strategies. Expert ($129): unlimited simulator access, 5 AI-narrated exports, and the ability to test every financial decision before making it.",
        },
      },
      {
        q: {
          fr: "Combien de temps pour recevoir mon bilan\u00a0?",
          en: "How long to receive my assessment?",
        },
        a: {
          fr: "Le bilan est g\u00e9n\u00e9r\u00e9 automatiquement apr\u00e8s le paiement. Comptez 2 \u00e0 3 minutes pour la simulation compl\u00e8te et l'envoi par courriel. Si vous ne voyez rien apr\u00e8s 5 minutes, v\u00e9rifiez votre dossier de courrier ind\u00e9sirable (le courriel provient de rapport@buildfi.ca).",
          en: "The assessment is generated automatically after payment. Allow 2 to 3 minutes for the full simulation and email delivery. If you don't see it after 5 minutes, check your spam folder (the email comes from rapport@buildfi.ca).",
        },
      },
      {
        q: {
          fr: "Est-ce que BuildFi remplace un planificateur financier\u00a0?",
          en: "Does BuildFi replace a financial planner?",
        },
        a: {
          fr: "Non. BuildFi est un outil \u00e9ducatif et informatif. Les r\u00e9sultats pr\u00e9sent\u00e9s sont des projections bas\u00e9es sur des mod\u00e8les statistiques\u00a0: ils pourraient diff\u00e9rer de votre situation r\u00e9elle. Pour des d\u00e9cisions financi\u00e8res importantes, il serait pertinent de consulter un professionnel agr\u00e9\u00e9.",
          en: "No. BuildFi is an educational and informational tool. The results presented are projections based on statistical models: they could differ from your actual situation. For important financial decisions, it would be relevant to consult a licensed professional.",
        },
      },
      {
        q: {
          fr: "Les donn\u00e9es sont-elles \u00e0 jour\u00a0?",
          en: "Is the data current?",
        },
        a: {
          fr: "Oui. Le moteur utilise les constantes fiscales 2026 (plafonds du R\u00c9\u00c9R, du C\u00c9LI, tranches d'imposition f\u00e9d\u00e9rales et provinciales, montants de la RRQ/RPC et de la PSV). Ces param\u00e8tres sont mis \u00e0 jour annuellement.",
          en: "Yes. The engine uses 2026 fiscal constants (RRSP and TFSA limits, federal and provincial tax brackets, QPP/CPP and OAS amounts). These parameters are updated annually.",
        },
      },
    ],
  },

  // ── 2. S\u00e9curit\u00e9 & Confidentialit\u00e9 / Security & Privacy ──────────
  {
    title: { fr: "S\u00e9curit\u00e9 et confidentialit\u00e9", en: "Security and privacy" },
    id: "securite",
    items: [
      {
        q: {
          fr: "Mes donn\u00e9es sont-elles en s\u00e9curit\u00e9\u00a0?",
          en: "Is my data secure?",
        },
        a: {
          fr: "Oui. Toutes les donn\u00e9es sont chiffr\u00e9es en transit (TLS) et au repos. L'infrastructure est h\u00e9berg\u00e9e sur Vercel, conforme aux normes SOC\u00a02. Aucune donn\u00e9e n'est partag\u00e9e avec des tiers.",
          en: "Yes. All data is encrypted in transit (TLS) and at rest. The infrastructure is hosted on Vercel, SOC 2 compliant. No data is shared with third parties.",
        },
      },
      {
        q: {
          fr: "O\u00f9 sont stock\u00e9es mes informations\u00a0?",
          en: "Where is my data stored?",
        },
        a: {
          fr: "Les donn\u00e9es sont h\u00e9berg\u00e9es sur l'infrastructure Vercel (centres de donn\u00e9es au Canada et aux \u00c9tats-Unis). Les bilans sont stock\u00e9s sous forme chiffr\u00e9e dans Vercel Blob. Les profils Expert utilisent Vercel KV (Redis chiffr\u00e9).",
          en: "Data is hosted on Vercel infrastructure (data centers in Canada and the United States). Assessments are stored in encrypted form in Vercel Blob. Expert profiles use Vercel KV (encrypted Redis).",
        },
      },
      {
        q: {
          fr: "Puis-je supprimer mes donn\u00e9es\u00a0?",
          en: "Can I delete my data?",
        },
        a: {
          fr: "Oui. Conform\u00e9ment \u00e0 la LPRPD\u00c9 et au RGPD, vous pouvez demander la suppression compl\u00e8te de vos donn\u00e9es en \u00e9crivant \u00e0 support@buildfi.ca. La suppression est effectu\u00e9e dans un d\u00e9lai de 48 heures ouvrables.",
          en: "Yes. In accordance with PIPEDA and GDPR, you can request complete deletion of your data by writing to support@buildfi.ca. Deletion is completed within 48 business hours.",
        },
      },
      {
        q: {
          fr: "BuildFi a-t-il acc\u00e8s \u00e0 mes comptes bancaires\u00a0?",
          en: "Does BuildFi access my bank accounts?",
        },
        a: {
          fr: "Non, jamais. BuildFi ne se connecte \u00e0 aucun compte bancaire, de courtage ou institutionnel. Toutes les donn\u00e9es sont saisies manuellement par vous dans le questionnaire.",
          en: "No, never. BuildFi does not connect to any bank, brokerage, or institutional account. All data is entered manually by you in the questionnaire.",
        },
      },
      {
        q: {
          fr: "Comment fonctionne le lien magique\u00a0?",
          en: "How does the magic link work?",
        },
        a: {
          fr: "Le lien magique est un m\u00e9canisme d'authentification par courriel. Plut\u00f4t que de cr\u00e9er un mot de passe, vous recevez un lien unique et temporaire \u00e0 votre adresse courriel. Ce lien vous donne acc\u00e8s \u00e0 votre simulateur Expert. Si le lien expire, vous pouvez en demander un nouveau \u00e0 la page /acces.",
          en: "The magic link is an email-based authentication mechanism. Instead of creating a password, you receive a unique, temporary link at your email address. This link gives you access to your Expert simulator. If the link expires, you can request a new one at the /acces page.",
        },
      },
    ],
  },

  // ── 3. Paiement / Payment ─────────────────────────────────────────
  {
    title: { fr: "Paiement", en: "Payment" },
    id: "paiement",
    items: [
      {
        q: {
          fr: "Comment fonctionne le paiement\u00a0?",
          en: "How does payment work?",
        },
        a: {
          fr: "Le paiement est un achat unique via Stripe, la plateforme de paiement utilis\u00e9e par des millions d'entreprises. Vos informations de carte ne sont jamais stock\u00e9es sur nos serveurs. Le paiement est s\u00e9curis\u00e9 par chiffrement de bout en bout.",
          en: "Payment is a one-time purchase via Stripe, the payment platform used by millions of businesses. Your card information is never stored on our servers. Payment is secured with end-to-end encryption.",
        },
      },
      {
        q: {
          fr: "Y a-t-il un abonnement\u00a0?",
          en: "Is there a subscription?",
        },
        a: {
          fr: "Non pour les bilans Essentiel et Interm\u00e9diaire\u00a0: c'est un paiement unique. Pour Expert, le simulateur est accessible pendant un an. Le renouvellement (29\u00a0$/an) est optionnel et vous sera propos\u00e9 avant l'expiration. Sans renouvellement, vos bilans existants restent accessibles.",
          en: "No for Essentiel and Intermediaire assessments: it's a one-time payment. For Expert, the simulator is accessible for one year. Renewal ($29/year) is optional and will be offered before expiration. Without renewal, your existing assessments remain accessible.",
        },
      },
      {
        q: {
          fr: "Puis-je obtenir un remboursement\u00a0?",
          en: "Can I get a refund?",
        },
        a: {
          fr: "BuildFi est un produit num\u00e9rique livr\u00e9 imm\u00e9diatement apr\u00e8s l'achat. Les remboursements sont \u00e9valu\u00e9s au cas par cas. Si vous rencontrez un probl\u00e8me technique emp\u00eachant la livraison de votre bilan, \u00e9crivez \u00e0 support@buildfi.ca et nous trouverons une solution.",
          en: "BuildFi is a digital product delivered immediately after purchase. Refunds are evaluated on a case-by-case basis. If you encounter a technical issue preventing delivery of your assessment, write to support@buildfi.ca and we will find a solution.",
        },
      },
      {
        q: {
          fr: "Comment fonctionne le parrainage\u00a0?",
          en: "How does the referral program work?",
        },
        a: {
          fr: "Chaque client Expert re\u00e7oit un lien de parrainage unique. Lorsqu'un filleul effectue un achat via votre lien, vous recevez un export suppl\u00e9mentaire avec narration par intelligence artificielle apr\u00e8s le troisi\u00e8me parrainage converti.",
          en: "Every Expert client receives a unique referral link. When a referred person makes a purchase through your link, you receive an additional AI-narrated export after the third converted referral.",
        },
      },
      {
        q: {
          fr: "Qu'est-ce qu'un export avec narration par intelligence artificielle\u00a0?",
          en: "What is an additional AI export?",
        },
        a: {
          fr: "Un export avec narration par intelligence artificielle (14,99\u00a0$) g\u00e9n\u00e8re un bilan compl\u00e8tement narr\u00e9 par intelligence artificielle \u00e0 partir de vos param\u00e8tres dans le simulateur Expert. C'est un bilan formel avec 5\u202f000 simulations et narration personnalis\u00e9e, livr\u00e9 par courriel.",
          en: "An AI-narrated export ($14.99) generates a fully narrated assessment from your parameters in the Expert simulator. It's a formal assessment with 5,000 simulations and personalized narration, delivered by email.",
        },
      },
    ],
  },

  // ── 4. Technique / Technical ──────────────────────────────────────
  {
    title: { fr: "Technique", en: "Technical" },
    id: "technique",
    items: [
      {
        q: {
          fr: "Le simulateur fonctionne sur mobile\u00a0?",
          en: "Does the simulator work on mobile?",
        },
        a: {
          fr: "Oui. L'ensemble de BuildFi (questionnaires, bilans, simulateur Expert) est con\u00e7u pour fonctionner sur t\u00e9l\u00e9phone, tablette et ordinateur. L'interface s'adapte automatiquement \u00e0 la taille de votre \u00e9cran.",
          en: "Yes. All of BuildFi (questionnaires, assessments, Expert simulator) is designed to work on phone, tablet, and computer. The interface automatically adapts to your screen size.",
        },
      },
      {
        q: {
          fr: "Quelle est la pr\u00e9cision des calculs\u00a0?",
          en: "How accurate are the calculations?",
        },
        a: {
          fr: "Le moteur utilise la m\u00e9thode Monte Carlo avec 5\u202f000 simulations et une distribution t de Student (degr\u00e9s de libert\u00e9\u00a0= 5) qui mod\u00e9lise mieux les \u00e9v\u00e9nements extr\u00eames que la distribution normale. Les constantes fiscales sont calibr\u00e9es sur les donn\u00e9es historiques de 1970 \u00e0 2024. Les r\u00e9sultats repr\u00e9sentent une distribution de sc\u00e9narios possibles, pas une pr\u00e9diction unique.",
          en: "The engine uses the Monte Carlo method with 5,000 simulations and a Student's t-distribution (degrees of freedom = 5) that models extreme events better than the normal distribution. Fiscal constants are calibrated on historical data from 1970 to 2024. Results represent a distribution of possible scenarios, not a single prediction.",
        },
      },
      {
        q: {
          fr: "Que se passe-t-il si la narration par intelligence artificielle ne fonctionne pas\u00a0?",
          en: "What if the AI narration fails?",
        },
        a: {
          fr: "Le bilan fonctionne toujours, m\u00eame sans narration par intelligence artificielle. En cas de probl\u00e8me technique avec le service d'intelligence artificielle, le bilan est livr\u00e9 avec des sections analytiques statiques qui contiennent les m\u00eames donn\u00e9es et graphiques. Aucune information n'est perdue.",
          en: "The assessment always works, even without AI narration. If there is a technical issue with the AI service, the assessment is delivered with static analytical sections that contain the same data and charts. No information is lost.",
        },
      },
      {
        q: {
          fr: "Comment recalculer avec de nouveaux param\u00e8tres\u00a0?",
          en: "How to recalculate with new parameters?",
        },
        a: {
          fr: "Pour les clients Expert\u00a0: le simulateur permet des recalculs illimit\u00e9s. Modifiez n'importe quel param\u00e8tre et relancez la simulation. Pour Essentiel et Interm\u00e9diaire\u00a0: un nouvel achat est n\u00e9cessaire pour g\u00e9n\u00e9rer un bilan avec des param\u00e8tres diff\u00e9rents.",
          en: "For Expert clients: the simulator allows unlimited recalculations. Change any parameter and run the simulation again. For Essentiel and Intermediaire: a new purchase is needed to generate an assessment with different parameters.",
        },
      },
      {
        q: {
          fr: "Mon lien magique ne fonctionne plus",
          en: "My magic link stopped working",
        },
        a: {
          fr: "Les liens magiques expirent apr\u00e8s une p\u00e9riode d\u00e9finie pour des raisons de s\u00e9curit\u00e9. Pour en obtenir un nouveau, rendez-vous \u00e0 buildfi.ca/acces et entrez votre adresse courriel. Un nouveau lien vous sera envoy\u00e9 en quelques secondes.",
          en: "Magic links expire after a set period for security reasons. To get a new one, go to buildfi.ca/acces and enter your email address. A new link will be sent to you in a few seconds.",
        },
      },
    ],
  },
];

// ── Accordion component ─────────────────────────────────────────────

function AccordionItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          padding: "18px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: DARK,
            lineHeight: 1.5,
            flex: 1,
          }}
        >
          {question}
        </span>
        <span
          style={{
            fontSize: 18,
            color: GOLD_LIGHT,
            fontWeight: 700,
            flexShrink: 0,
            lineHeight: 1,
            marginTop: 2,
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
          }}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: "0 20px 18px",
            fontSize: 13,
            color: GRAY,
            lineHeight: 1.75,
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

// ── Contact category options ────────────────────────────────────────

const CONTACT_CATEGORIES = [
  { value: "produit", fr: "Produit", en: "Product" },
  { value: "securite", fr: "S\u00e9curit\u00e9 et confidentialit\u00e9", en: "Security and privacy" },
  { value: "paiement", fr: "Paiement", en: "Payment" },
  { value: "technique", fr: "Technique", en: "Technical" },
];

// ── Main page component ─────────────────────────────────────────────

export default function SupportPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  // Contact form state
  const [contactEmail, setContactEmail] = useState("");
  const [contactCategory, setContactCategory] = useState("produit");
  const [contactMessage, setContactMessage] = useState("");

  const fr = lang === "fr";

  // Read lang from URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlLang = params.get("lang");
      if (urlLang === "en") setLang("en");
    }
  }, []);

  function toggleItem(key: string) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleContactSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(
      fr
        ? `[BuildFi Support] ${CONTACT_CATEGORIES.find((c) => c.value === contactCategory)?.fr || "Question"}`
        : `[BuildFi Support] ${CONTACT_CATEGORIES.find((c) => c.value === contactCategory)?.en || "Question"}`
    );
    const body = encodeURIComponent(contactMessage);
    window.location.href = `mailto:support@buildfi.ca?subject=${subject}&body=${body}`;
  }

  // ── Translations ──────────────────────────────────────────────────
  const t = {
    title: fr ? "Centre d'aide" : "Help Center",
    subtitle: fr
      ? "R\u00e9ponse en moins de 48 heures ouvrables"
      : "Response within 48 business hours",
    searchPlaceholder: fr ? "Rechercher une question..." : "Search a question...",
    contactTitle: fr ? "Nous \u00e9crire" : "Write to us",
    contactSubtitle: fr
      ? "Vous n'avez pas trouv\u00e9 votre r\u00e9ponse\u00a0? \u00c9crivez-nous directement."
      : "Didn't find your answer? Write to us directly.",
    emailLabel: fr ? "Votre courriel" : "Your email",
    emailPlaceholder: fr ? "votre@courriel.com" : "your@email.com",
    categoryLabel: fr ? "Cat\u00e9gorie" : "Category",
    messageLabel: fr ? "Votre message" : "Your message",
    messagePlaceholder: fr
      ? "D\u00e9crivez votre question ou probl\u00e8me..."
      : "Describe your question or issue...",
    submitButton: fr ? "Envoyer le message" : "Send message",
    submitNote: fr
      ? "Ce bouton ouvrira votre client de messagerie avec les informations pr\u00e9-remplies."
      : "This button will open your email client with pre-filled information.",
    responseTime: fr
      ? "R\u00e9ponse en moins de 48 heures ouvrables."
      : "Response within 48 business hours.",
    orEmail: fr ? "Ou \u00e9crivez directement \u00e0" : "Or write directly to",
    disclaimer: fr
      ? "BuildFi est un outil \u00e9ducatif et informatif. Les projections pr\u00e9sent\u00e9es sont bas\u00e9es sur des mod\u00e8les statistiques et pourraient diff\u00e9rer de votre situation r\u00e9elle. BuildFi n'est pas un conseiller financier et ne fournit aucun avis financier personnalis\u00e9."
      : "BuildFi is an educational and informational tool. The projections presented are based on statistical models and could differ from your actual situation. BuildFi is not a financial advisor and does not provide personalized financial recommendations.",
    back: fr ? "Retour \u00e0 buildfi.ca" : "Back to buildfi.ca",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BG,
        fontFamily:
          "'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Newsreader:wght@400;600;700&display=swap');
      `}</style>

      {/* ── Header bar ───────────────────────────────────────────── */}
      <header
        style={{
          background: MARINE,
          padding: "18px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <a href="/" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800,
              fontSize: 18,
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
          >
            buildfi<span style={{ color: GOLD }}>.ca</span>
          </span>
        </a>
        <button
          onClick={() => setLang(fr ? "en" : "fr")}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: 6,
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 600,
            padding: "5px 12px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          {fr ? "EN" : "FR"}
        </button>
      </header>

      {/* ── Hero section ─────────────────────────────────────────── */}
      <section
        style={{
          textAlign: "center",
          padding: "56px 24px 40px",
          maxWidth: 680,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontFamily: "Newsreader, Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            color: MARINE,
            marginBottom: 12,
          }}
        >
          {t.title}
        </h1>
        <p
          style={{
            fontSize: 15,
            color: GRAY,
            lineHeight: 1.7,
          }}
        >
          {t.subtitle}
        </p>
      </section>

      {/* ── FAQ sections ─────────────────────────────────────────── */}
      <main
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 24px 60px",
        }}
      >
        {FAQ_CATEGORIES.map((category) => (
          <section key={category.id} style={{ marginBottom: 40 }}>
            {/* Category heading */}
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: MARINE,
                marginBottom: 2,
                paddingBottom: 10,
                borderBottom: `2px solid ${GOLD}`,
              }}
            >
              {fr ? category.title.fr : category.title.en}
            </h2>

            {/* Accordion card */}
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                overflow: "hidden",
                marginTop: 12,
              }}
            >
              {category.items.map((item, idx) => {
                const key = `${category.id}-${idx}`;
                return (
                  <AccordionItem
                    key={key}
                    question={fr ? item.q.fr : item.q.en}
                    answer={fr ? item.a.fr : item.a.en}
                    isOpen={openItems.has(key)}
                    onToggle={() => toggleItem(key)}
                  />
                );
              })}
            </div>
          </section>
        ))}

        {/* ── Contact section ──────────────────────────────────── */}
        <section
          style={{
            marginTop: 48,
            marginBottom: 40,
          }}
        >
          <h2
            style={{
              fontFamily: "Newsreader, Georgia, serif",
              fontSize: 24,
              fontWeight: 700,
              color: MARINE,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {t.contactTitle}
          </h2>
          <p
            style={{
              fontSize: 14,
              color: GRAY,
              textAlign: "center",
              marginBottom: 28,
              lineHeight: 1.7,
            }}
          >
            {t.contactSubtitle}
          </p>

          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: "28px 24px",
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            <form onSubmit={handleContactSubmit}>
              {/* Email */}
              <label
                htmlFor="support-email"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: MARINE,
                  marginBottom: 6,
                }}
              >
                {t.emailLabel}
              </label>
              <input
                id="support-email"
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  fontFamily: "inherit",
                  boxSizing: "border-box" as const,
                  background: "#FEFCF9",
                }}
              />

              {/* Category */}
              <label
                htmlFor="support-category"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: MARINE,
                  marginBottom: 6,
                }}
              >
                {t.categoryLabel}
              </label>
              <select
                id="support-category"
                value={contactCategory}
                onChange={(e) => setContactCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  fontFamily: "inherit",
                  boxSizing: "border-box" as const,
                  background: "#FEFCF9",
                  cursor: "pointer",
                  appearance: "auto" as const,
                }}
              >
                {CONTACT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {fr ? cat.fr : cat.en}
                  </option>
                ))}
              </select>

              {/* Message */}
              <label
                htmlFor="support-message"
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: MARINE,
                  marginBottom: 6,
                }}
              >
                {t.messageLabel}
              </label>
              <textarea
                id="support-message"
                required
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder={t.messagePlaceholder}
                rows={5}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  outline: "none",
                  marginBottom: 16,
                  fontFamily: "inherit",
                  boxSizing: "border-box" as const,
                  background: "#FEFCF9",
                  resize: "vertical" as const,
                  lineHeight: 1.6,
                }}
              />

              {/* Submit */}
              <button
                type="submit"
                style={{
                  width: "100%",
                  background: GOLD,
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "14px 24px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {t.submitButton}
              </button>

              <p
                style={{
                  fontSize: 11,
                  color: "#999",
                  textAlign: "center",
                  marginTop: 12,
                  lineHeight: 1.5,
                }}
              >
                {t.submitNote}
              </p>
            </form>

            {/* Response time badge */}
            <div
              style={{
                marginTop: 20,
                padding: "12px 16px",
                background: "#F5F1EA",
                borderRadius: 8,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: DARK,
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                {t.responseTime}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: GRAY,
                  margin: 0,
                }}
              >
                {t.orEmail}{" "}
                <a
                  href="mailto:support@buildfi.ca"
                  style={{
                    color: GOLD_LIGHT,
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  support@buildfi.ca
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer
          style={{
            borderTop: `1px solid ${BORDER}`,
            paddingTop: 32,
            textAlign: "center",
          }}
        >
          {/* AMF disclaimer */}
          <p
            style={{
              fontSize: 11,
              color: "#999",
              lineHeight: 1.7,
              maxWidth: 560,
              margin: "0 auto 20px",
            }}
          >
            {t.disclaimer}
          </p>

          {/* Legal links */}
          <div
            style={{
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            <a
              href="/conditions.html"
              style={{
                color: GOLD_LIGHT,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {fr ? "Conditions" : "Terms"}
            </a>
            <span style={{ color: "#ccc", margin: "0 10px" }}>{"\u00b7"}</span>
            <a
              href="/confidentialite.html"
              style={{
                color: GOLD_LIGHT,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {fr ? "Confidentialit\u00e9" : "Privacy"}
            </a>
            <span style={{ color: "#ccc", margin: "0 10px" }}>{"\u00b7"}</span>
            <a
              href="/avis-legal.html"
              style={{
                color: GOLD_LIGHT,
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {fr ? "Avis l\u00e9gal" : "Legal"}
            </a>
          </div>

          {/* Back link */}
          <a
            href="/"
            style={{
              fontSize: 13,
              color: GOLD_LIGHT,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            {t.back}
          </a>
        </footer>
      </main>
    </div>
  );
}
