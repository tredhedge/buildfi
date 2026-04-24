"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";

/* Palette aligned with landing + planner_v3 */
const CL_DARK = { bg: "#252d39", cd: "#2d3748", s2: "#344155", bd: "#4d5d75", tx: "#d7e2ef", al: "#f2f7fd", dm: "#bccbe0", ac: "#d2a764", gn: "#48a66d", rd: "#cf6060" };
const CL_LIGHT = { bg: "#f5f8fc", cd: "#fcfdff", s2: "#eef3f9", bd: "#d6e0ec", tx: "#2a3442", al: "#172332", dm: "#4a5a6e", ac: "#8f6d2f", gn: "#2f8a4a", rd: "#b93f43" };

const COPY = {
  fr: {
    title: "Finaliser votre achat — Planner + Rapports",
    price: "69,99 $",
    includes: "Ce que vous obtenez",
    features: [
      "Accès à vie au simulateur (190+ variables)",
      "Wizard adaptatif intégré",
      "5 générations de rapport IA incluses",
      "Monte Carlo interactif + tests de stress",
      "Sauvegarde de scénarios illimitée",
      "Export Excel + PDF",
    ],
    emailLabel: "Votre adresse courriel",
    emailPlaceholder: "vous@exemple.ca",
    emailNote: "Un lien d'accès sera envoyé à cette adresse après le paiement.",
    termsLabel: "J'ai lu et j'accepte les",
    termsLink: "Conditions d'utilisation",
    andAvis: "et l'",
    avisLink: "Avis légal",
    cta: "Continuer vers le paiement sécurisé Stripe",
    ctaLoading: "Redirection en cours…",
    errorEmail: "Veuillez entrer une adresse courriel valide.",
    errorTerms: "Vous devez accepter les conditions.",
    errorGeneric: "Erreur lors de la création de la session. Réessayez.",
    secure: "Paiement sécurisé · Stripe · Aucun abonnement",
    backHome: "← Retour à l'accueil",
  },
  en: {
    title: "Complete your purchase — Planner + Reports",
    price: "$69.99",
    includes: "What you get",
    features: [
      "Lifetime simulator access (190+ variables)",
      "Built-in adaptive Wizard",
      "5 AI report generations included",
      "Interactive Monte Carlo + stress tests",
      "Unlimited scenario save",
      "Excel + PDF export",
    ],
    emailLabel: "Your email address",
    emailPlaceholder: "you@example.com",
    emailNote: "An access link will be sent to this address after payment.",
    termsLabel: "I have read and accept the",
    termsLink: "Terms of Service",
    andAvis: "and ",
    avisLink: "Legal Notice",
    cta: "Continue to secure Stripe payment",
    ctaLoading: "Redirecting…",
    errorEmail: "Please enter a valid email address.",
    errorTerms: "You must accept the terms.",
    errorGeneric: "Error creating session. Please try again.",
    secure: "Secure payment · Stripe · No subscription",
    backHome: "← Back to home",
  },
};

function PageInner() {
  const params = useSearchParams();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem("buildfi_theme");
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
    } catch {}
  }, [params]);

  const cl = mounted && theme === "light" ? CL_LIGHT : CL_DARK;
  const t = lang === "fr" ? COPY.fr : COPY.en;

  const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length < 254;

  const submit = async () => {
    setError("");
    if (!emailOK) { setError(t.errorEmail); return; }
    if (!terms) { setError(t.errorTerms); return; }
    setSubmitting(true);
    trackEvent(EVENTS.PLANNER_CHECKOUT_STARTED, { tier: "planner" });
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          type: "report",
          tier: "planner",
          lang,
          termsAccepted: true,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        setError(data.error || t.errorGeneric);
        setSubmitting(false);
        return;
      }
      window.location.href = data.url;
    } catch (e) {
      setError(t.errorGeneric);
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: '"Avenir Next","Segoe UI",Arial,sans-serif' }}>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
        <a href={`/${lang === "en" ? "?lang=en" : ""}`} style={{ textDecoration: "none", display: "inline-block", marginBottom: 20 }} aria-label="BuildFi home">
          <svg width={154} height={34} viewBox="0 0 220 48" style={{ display: "block" }}>
            <g>
              <rect x="0" y="32" width="28" height="8" rx="2" fill={theme === "dark" ? "#faf8f4" : "#1a2744"} />
              <rect x="4" y="22" width="26" height="8" rx="2" fill={theme === "dark" ? "#faf8f4" : "#1a2744"} opacity={theme === "dark" ? 0.4 : 0.5} />
              <rect x="8" y="12" width="24" height="8" rx="2" fill={cl.ac} />
            </g>
            <text x="40" y="38" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="34" fontWeight={700} letterSpacing="-0.5">
              <tspan fill={theme === "dark" ? "#faf8f4" : "#1a2744"}>build</tspan>
              <tspan fill={cl.ac}>fi</tspan>
            </text>
          </svg>
        </a>
        <div style={{ color: cl.dm, fontSize: 13, marginBottom: 20 }}>{t.backHome}</div>

        <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 16, padding: "28px 28px 24px", boxShadow: theme === "dark" ? "0 8px 24px rgba(0,0,0,0.2)" : "0 2px 10px rgba(15,30,60,0.06)" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>BuildFi · Planner</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: cl.al, margin: "0 0 10px", lineHeight: 1.25 }}>{t.title}</h1>
          <div style={{ fontSize: 36, fontWeight: 900, color: cl.ac, letterSpacing: -1, marginBottom: 22 }}>{t.price}</div>

          <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{t.includes}</div>
          <ul style={{ padding: 0, margin: "0 0 24px", listStyle: "none" }}>
            {t.features.map((f, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: cl.tx, marginBottom: 8, lineHeight: 1.5 }}>
                <span style={{ color: cl.gn, fontWeight: 800 }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <label htmlFor="pl-email" style={{ display: "block", fontSize: 12, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{t.emailLabel}</label>
          <input
            id="pl-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
            style={{ width: "100%", padding: "11px 13px", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, fontSize: 14, color: cl.tx, outline: "none", marginBottom: 6 }}
          />
          <div style={{ fontSize: 11, color: cl.dm, marginBottom: 16 }}>{t.emailNote}</div>

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
            <span>
              {t.termsLabel}{" "}
              <a href="/conditions" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.termsLink}</a>{" "}
              {t.andAvis}
              <a href="/avis-legal" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.avisLink}</a>.
            </span>
          </label>

          {error ? <div style={{ background: cl.rd + "18", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "9px 13px", borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div> : null}

          <button
            onClick={submit}
            disabled={submitting}
            style={{ width: "100%", background: cl.ac, color: theme === "dark" ? cl.bg : "#fff", border: "none", padding: "14px 18px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 14px ${cl.ac}35` }}
          >
            {submitting ? t.ctaLoading : t.cta + " →"}
          </button>

          <div style={{ fontSize: 11, color: cl.dm, textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
            🔒 {t.secure}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AcheterPlannerPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: CL_DARK.bg }} />}>
      <PageInner />
    </Suspense>
  );
}
