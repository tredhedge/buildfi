"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";
import { getProductPalette, PRODUCT_DARK, THEME_STORAGE_KEY } from "@/lib/design/product.tokens";
import { BuildFiLogo } from "@/lib/design/components";

/* Palette: shared Product system. See docs/DESIGN-SYSTEM.md. */

// Loi 25 / LPRPDE — same constant the server enforces (lib/consent-version.ts).
import { CURRENT_POLICY_VERSION as CLIENT_POLICY_VERSION } from "@/lib/consent-version";

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
    consentLabel: "J'autorise BuildFi à traiter mes données financières pour générer mes rapports. Conservation : tant que votre compte est actif. Suppression sur demande.",
    consentLink: "Politique de confidentialité",
    cta: "Continuer vers le paiement sécurisé Stripe",
    ctaLoading: "Redirection en cours…",
    errorEmail: "Veuillez entrer une adresse courriel valide.",
    errorTerms: "Vous devez accepter les conditions.",
    errorConsent: "Vous devez autoriser le traitement des données pour générer le rapport.",
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
    consentLabel: "I authorize BuildFi to process my financial data to generate my reports. Retained while your account is active. Deletion on request.",
    consentLink: "Privacy Policy",
    cta: "Continue to secure Stripe payment",
    ctaLoading: "Redirecting…",
    errorEmail: "Please enter a valid email address.",
    errorTerms: "You must accept the terms.",
    errorConsent: "You must authorize data processing to generate the report.",
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
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === "dark" || savedTheme === "light") setTheme(savedTheme);
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
    } catch {}
  }, [params]);

  const cl = getProductPalette(mounted && theme === "light" ? "light" : "dark");
  const t = lang === "fr" ? COPY.fr : COPY.en;

  const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && email.length < 254;

  const submit = async () => {
    setError("");
    if (!emailOK) { setError(t.errorEmail); return; }
    if (!terms) { setError(t.errorTerms); return; }
    if (!consent) { setError(t.errorConsent); return; }
    setSubmitting(true);
    trackEvent(EVENTS.PLANNER_CHECKOUT_STARTED, { tier: "planner" });
    try {
      const betaCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("beta") || undefined) : undefined;
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          type: "report",
          tier: "planner",
          lang,
          termsAccepted: true,
          ...(betaCode ? { betaCode } : {}),
          // Loi 25 / LPRPDE — server validates policyVersion + acceptedAt freshness.
          consent: {
            policyVersion: CLIENT_POLICY_VERSION,
            acceptedAt: new Date().toISOString(),
          },
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
    <div style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: 'var(--font-dm-sans),"Segoe UI",Arial,sans-serif' }}>
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "48px 20px" }}>
        <a href={`/${lang === "en" ? "?lang=en" : ""}`} style={{ textDecoration: "none", display: "inline-block", marginBottom: 20 }} aria-label="BuildFi home">
          <BuildFiLogo theme={theme} size="sm" accent={cl.ac} />
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

          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, marginBottom: 10, cursor: "pointer" }}>
            <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
            <span>
              {t.termsLabel}{" "}
              <a href="/conditions" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.termsLink}</a>{" "}
              {t.andAvis}
              <a href="/avis-legal" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.avisLink}</a>.
            </span>
          </label>

          {/* Loi 25 / LPRPDE consent — server validates and stores a versioned consent receipt */}
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
            <span>
              {t.consentLabel}{" "}
              <a href="/confidentialite" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.consentLink}</a>.
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
    <Suspense fallback={<div style={{ minHeight: "100vh", background: PRODUCT_DARK.bg }} />}>
      <PageInner />
    </Suspense>
  );
}
