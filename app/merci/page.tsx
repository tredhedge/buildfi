"use client";
// /app/merci/page.tsx — Post-purchase "wow moment" page
// Shows report building in real-time with visible steps
// Tier-aware: Expert gets magic link info, Ess/Inter get report-is-coming

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";

const GOLD = "#C4944A";
const GREEN = "#2A8C46";
const MARINE = "#1a2744";

interface Step {
  fr: string;
  en: string;
  durationMs: number;
}

const STEPS_REPORT: Step[] = [
  { fr: "5 000 scénarios en cours...", en: "Running 5,000 scenarios...", durationMs: 3000 },
  { fr: "Analyse fiscale...", en: "Tax analysis...", durationMs: 2000 },
  { fr: "Projection du patrimoine...", en: "Wealth projection...", durationMs: 2000 },
  { fr: "Narration personnalisée...", en: "Personalized narration...", durationMs: 4000 },
  { fr: "Mise en page du bilan...", en: "Assessment layout...", durationMs: 1500 },
  { fr: "Envoi par courriel...", en: "Sending by email...", durationMs: 2000 },
];

const STEPS_EXPERT: Step[] = [
  { fr: "Profil Laboratoire créé", en: "Lab profile created", durationMs: 2000 },
  { fr: "5 000 scénarios en cours...", en: "Running 5,000 scenarios...", durationMs: 3000 },
  { fr: "Narration Laboratoire (4 lots parallèles)...", en: "Lab narration (4 parallel batches)...", durationMs: 5000 },
  { fr: "Bilan initial généré", en: "Initial assessment generated", durationMs: 2000 },
  { fr: "Lien magique envoyé", en: "Magic link sent", durationMs: 1500 },
];

const STEPS_DECUM: Step[] = [
  { fr: "5 000 scénarios de base...", en: "Running 5,000 base scenarios...", durationMs: 3000 },
  { fr: "Scénarios de crise (marché baissier)...", en: "Crisis scenarios (bear market)...", durationMs: 2500 },
  { fr: "Comparaison du moment optimal RPC/RRQ...", en: "Comparing optimal CPP/QPP timing...", durationMs: 2500 },
  { fr: "Analyse fiscale de décaissement...", en: "Decumulation tax analysis...", durationMs: 2000 },
  { fr: "Narration personnalisée...", en: "Personalized narration...", durationMs: 4000 },
  { fr: "Mise en page du bilan...", en: "Assessment layout...", durationMs: 1500 },
  { fr: "Envoi par courriel...", en: "Sending by email...", durationMs: 2000 },
];

function ShareSection({ fr, refCode }: { fr: boolean; refCode: string | null }) {
  const [copied, setCopied] = useState(false);
  const base = "https://www.buildfi.ca";
  const shareUrl = refCode ? `${base}?ref=${refCode}` : base;

  function handleCopy() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      trackEvent("referral_link_copied");
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid #E8E0D4", borderRadius: 12,
      padding: "16px 22px", marginBottom: 20, textAlign: "left",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1208", marginBottom: 8 }}>
        {fr ? "Partagez BuildFi avec un proche" : "Share BuildFi with someone you care about"}
      </div>
      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 10 }}>
        {fr
          ? "Votre proche reçoit 15 % de rabais automatiquement via votre lien."
          : "Your friend gets 15% off automatically through your link."}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{
          flex: 1, background: "#F5F1EA", borderRadius: 6, padding: "8px 12px",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#555",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {shareUrl}
        </div>
        <button
          onClick={handleCopy}
          style={{
            background: copied ? GREEN : GOLD, color: "#fff", border: "none",
            borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          {copied ? (fr ? "Copié!" : "Copied!") : (fr ? "Copier" : "Copy")}
        </button>
      </div>
    </div>
  );
}

const ATTRIBUTION_OPTIONS = [
  { value: "google", fr: "Recherche Google", en: "Google search" },
  { value: "reddit", fr: "Reddit", en: "Reddit" },
  { value: "linkedin", fr: "LinkedIn", en: "LinkedIn" },
  { value: "friend", fr: "Ami ou famille", en: "Friend or family" },
  { value: "other", fr: "Autre", en: "Other" },
];

function AttributionDropdown({ fr, tier }: { fr: boolean; tier: string }) {
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleChange(value: string) {
    setSelected(value);
    setSubmitted(true);
    trackEvent("attribution_source", { source: value, tier });
  }

  if (submitted) {
    return (
      <div style={{ fontSize: 13, color: "#999", textAlign: "center", marginTop: 16 }}>
        {fr ? "Merci pour votre réponse!" : "Thanks for your answer!"}
      </div>
    );
  }

  return (
    <div style={{
      background: "#fff", border: "1px solid #E8E0D4", borderRadius: 12,
      padding: "16px 22px", textAlign: "left",
    }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#1A1208", marginBottom: 10 }}>
        {fr ? "Comment avez-vous entendu parler de BuildFi?" : "How did you hear about BuildFi?"}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {ATTRIBUTION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            style={{
              background: selected === opt.value ? GOLD : "#F5F1EA",
              color: selected === opt.value ? "#fff" : "#555",
              border: "none", borderRadius: 6, padding: "7px 14px",
              fontSize: 13, cursor: "pointer", fontWeight: 500,
              transition: "all 0.15s",
            }}
          >
            {fr ? opt.fr : opt.en}
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "essentiel";
  const rawLang = searchParams.get("lang") || "fr";
  const lang = rawLang === "en" ? "en" : "fr";
  const fr = lang === "fr";
  const refCode = searchParams.get("ref");

  const steps = tier === "expert" ? STEPS_EXPERT : tier === "decaissement" ? STEPS_DECUM : STEPS_REPORT;
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  // Animate through steps
  useEffect(() => {
    if (currentStep >= steps.length) {
      setDone(true);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, steps[currentStep].durationMs);
    return () => clearTimeout(timer);
  }, [currentStep, steps]);

  const isExpert = tier === "expert";

  return (
    <div style={{
      minHeight: "100vh", background: "#FEFCF9",
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "48px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&family=Newsreader:wght@400;600;700&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>

      <div style={{ maxWidth: 540, width: "100%", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ fontSize: 28, fontWeight: 800, color: "#1A1208", marginBottom: 4 }}>buildfi.ca</div>
        <div style={{ fontSize: 11, color: GOLD, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, marginBottom: 40 }}>
          {fr ? "Planification financière accessible" : "Accessible financial planning"}
        </div>

        {/* Success icon or spinner */}
        <div style={{
          width: 80, height: 80, borderRadius: "50%",
          background: done ? GREEN : "transparent",
          border: done ? "none" : `3px solid #E8E0D4`,
          borderTopColor: done ? GREEN : GOLD,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 28px",
          animation: done ? "fadeIn 0.3s ease-out" : "spin 1s linear infinite",
        }}>
          {done && (
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#1A1208", marginBottom: 8, fontFamily: "Newsreader, Georgia, serif" }}>
          {done
            ? (fr ? "Merci pour votre achat!" : "Thank you for your purchase!")
            : (fr ? "Préparation en cours..." : "Preparing your assessment...")}
        </h1>
        <p style={{ fontSize: 15, color: "#555", lineHeight: 1.7, marginBottom: 32 }}>
          {done
            ? (isExpert
              ? (fr ? "Votre bilan Laboratoire est prêt. Un lien magique a été envoyé à votre courriel pour accéder au simulateur."
                    : "Your Lab assessment is ready. A magic link has been sent to your email to access the simulator.")
              : tier === "decaissement"
              ? (fr ? "Votre bilan de décaissement est en route — 6 scénarios analysés. Vérifiez votre boîte de réception dans les prochaines minutes."
                    : "Your decumulation assessment is on its way — 6 scenarios analyzed. Check your inbox in the next few minutes.")
              : (fr ? "Votre bilan personnalisé est en route. Vérifiez votre boîte de réception dans les prochaines minutes."
                    : "Your personalized assessment is on its way. Check your inbox in the next few minutes."))
            : (fr ? "Nous préparons votre analyse personnalisée. Chaque étape prend quelques secondes."
                  : "We're preparing your personalized analysis. Each step takes a few seconds.")}
        </p>

        {/* Progress steps */}
        <div style={{
          background: "#fff", border: "1px solid #E8E0D4", borderRadius: 12,
          padding: "20px 24px", marginBottom: 28, textAlign: "left",
        }}>
          {steps.map((step, i) => {
            const isActive = i === currentStep && !done;
            const isComplete = i < currentStep || done;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: i < steps.length - 1 ? "1px solid #F0ECE4" : "none",
                opacity: i > currentStep && !done ? 0.3 : 1,
                transition: "opacity 0.3s",
              }}>
                {/* Status indicator */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                  background: isComplete ? GREEN : isActive ? "transparent" : "#E8E0D4",
                  border: isActive ? `2px solid ${GOLD}` : "none",
                  borderTopColor: isActive ? GOLD : undefined,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: isActive ? "spin 1s linear infinite" : "none",
                }}>
                  {isComplete && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M20 6L9 17l-5-5" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                {/* Step text */}
                <span style={{
                  fontSize: 13, color: isActive ? "#1A1208" : isComplete ? "#555" : "#999",
                  fontWeight: isActive ? 600 : 400,
                  animation: isActive ? "pulse 2s ease-in-out infinite" : "none",
                }}>
                  {fr ? step.fr : step.en}
                </span>
              </div>
            );
          })}
        </div>

        {/* Post-done content */}
        {done && (
          <div style={{ animation: "fadeIn 0.5s ease-out" }}>
            {/* Email reminder */}
            <div style={{
              background: "#FDF8F0", border: "1px solid #E8E0D4",
              borderRadius: 12, padding: "18px 22px", marginBottom: 20, textAlign: "left",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1A1208", marginBottom: 6 }}>
                {fr ? "Vérifiez votre boîte de réception" : "Check your inbox"}
              </div>
              <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7 }}>
                {isExpert
                  ? (fr
                    ? "Vous recevrez un lien magique et votre bilan initial par courriel (rapport@buildfi.ca). Le lien magique vous donne accès au Laboratoire illimité."
                    : "You'll receive a magic link and your initial assessment by email (rapport@buildfi.ca). The magic link gives you access to the unlimited Lab.")
                  : (fr
                    ? "Si vous ne voyez pas le courriel dans 5 minutes, vérifiez votre dossier indésirables (spam). Le bilan est envoyé par rapport@buildfi.ca."
                    : "If you don't see the email within 5 minutes, check your spam folder. The assessment is sent from rapport@buildfi.ca.")}
              </div>
            </div>

            {/* Tier-specific upsell */}
            {(tier === "essentiel" || tier === "intermediaire") && (
              <div style={{
                background: "linear-gradient(135deg, #1a2744 0%, #2a3a5c 100%)",
                borderRadius: 12, padding: "22px 22px", marginBottom: 20, textAlign: "left", color: "#fff",
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                  {tier === "essentiel"
                    ? (fr ? "Allez plus loin avec le Bilan 360" : "Go further with Snapshot 360")
                    : (fr ? "Passez au Laboratoire" : "Upgrade to the Lab")}
                </div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 14 }}>
                  {tier === "essentiel"
                    ? (fr
                      ? "Analyse de couple, immobilier, stratégies fiscales et 16 sections détaillées — tout ce qui manque au Bilan."
                      : "Couple analysis, real estate, tax strategies, and 16 detailed sections — everything the Snapshot doesn't cover.")
                    : (fr
                      ? "Simulateur illimité, 5 exports IA, et la capacité de tester chaque décision financière avant de la prendre."
                      : "Unlimited simulator, 5 AI exports, and the ability to test every financial decision before making it.")}
                </div>
                <a
                  href={tier === "essentiel"
                    ? `/quiz-intermediaire.html?lang=${lang}`
                    : `/expert-landing.html?lang=${lang}`}
                  onClick={() => trackEvent(EVENTS.UPGRADE_CLICKED, { from: tier, to: tier === "essentiel" ? "intermediaire" : "expert" })}
                  style={{
                    display: "inline-block", background: GOLD, color: "#fff",
                    padding: "10px 22px", borderRadius: 8, textDecoration: "none",
                    fontSize: 14, fontWeight: 700,
                  }}
                >
                  {tier === "essentiel"
                    ? (fr ? "Bilan 360 — 59 $" : "Snapshot 360 — $59")
                    : (fr ? "Laboratoire — 129 $" : "Lab — $129")}
                </a>
              </div>
            )}

            {/* Bonus tools section */}
            {(tier === "essentiel" || tier === "intermediaire" || tier === "decaissement") && (
              <div style={{ marginBottom: 20, textAlign: "left" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1A1208", marginBottom: 6 }}>
                  {tier === "decaissement"
                    ? (fr ? "Votre simulateur interactif inclus" : "Your included interactive simulator")
                    : tier === "intermediaire"
                    ? (fr ? "Vos deux outils inclus" : "Your two included tools")
                    : (fr ? "Votre outil interactif — à vous de choisir" : "Your interactive tool — your choice")}
                </div>
                <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 14 }}>
                  {tier === "decaissement"
                    ? (fr ? "Testez différents scénarios de retrait, d'allocation et de moment optimal pour vos rentes." : "Test different withdrawal scenarios, allocations, and optimal timing for your pensions.")
                    : tier === "intermediaire"
                    ? (fr ? "Utilisez celui qui correspond à votre situation en ce moment — ou les deux." : "Use the one that fits your situation right now — or both.")
                    : (fr ? "Un outil inclus avec votre rapport. Choisissez celui qui correspond à votre situation en ce moment." : "One tool included with your report. Choose the one that fits your situation right now.")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {tier === "decaissement" ? (
                    <a
                      href={`/outils/decaissement-simulateur.html?lang=${lang}`}
                      style={{
                        flex: "1 1 200px", minWidth: 200, background: "#fff",
                        border: "1.5px solid #E8E0D4", borderRadius: 12,
                        padding: "18px 18px", textDecoration: "none", display: "block",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 700, color: MARINE, marginBottom: 6 }}>
                        {fr ? "Simulateur de décaissement" : "Drawdown Simulator"}
                      </div>
                      <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>
                        {fr ? "Vos données de bilan sont pré-remplies. Ajustez revenus, allocation et moment de vos rentes." : "Your assessment data is pre-filled. Adjust income, allocation, and pension timing."}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                        {fr ? "Ouvrir le simulateur \u2192" : "Open simulator \u2192"}
                      </span>
                    </a>
                  ) : (
                    <>
                      {/* Card A */}
                      <a
                        href={tier === "intermediaire" ? "/outils/allocation-epargne.html" : "/outils/dettes"}
                        style={{
                          flex: "1 1 200px", minWidth: 200, background: "#fff",
                          border: "1.5px solid #E8E0D4", borderRadius: 12,
                          padding: "18px 18px", textDecoration: "none", display: "block",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: MARINE, marginBottom: 6 }}>
                          {tier === "intermediaire"
                            ? (fr ? "Allocation REER/CÉLI" : "RRSP/TFSA Allocation Tool")
                            : (fr ? "Outil de gestion de dettes" : "Debt Management Tool")}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>
                          {tier === "intermediaire"
                            ? (fr ? "Vos données de rapport sont pré-remplies" : "Your report data is pre-filled")
                            : (fr ? "Pour analyser et accélérer votre remboursement" : "To analyze and accelerate your repayment")}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                          {fr ? "Ouvrir l\u2019outil \u2192" : "Open tool \u2192"}
                        </span>
                      </a>
                      {/* Card B */}
                      <a
                        href={tier === "intermediaire" ? "/outils/dettes" : "/outils/allocation-epargne.html"}
                        style={{
                          flex: "1 1 200px", minWidth: 200, background: "#fff",
                          border: "1.5px solid #E8E0D4", borderRadius: 12,
                          padding: "18px 18px", textDecoration: "none", display: "block",
                        }}
                      >
                        <div style={{ fontSize: 14, fontWeight: 700, color: MARINE, marginBottom: 6 }}>
                          {tier === "intermediaire"
                            ? (fr ? "Outil de gestion de dettes" : "Debt Management Tool")
                            : (fr ? "Allocation REER/CÉLI" : "RRSP/TFSA Allocation Tool")}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6, marginBottom: 12 }}>
                          {tier === "intermediaire"
                            ? (fr ? "Analysez vos dettes et vos options de remboursement" : "Analyze your debts and repayment options")
                            : (fr ? "Pour savoir où placer votre prochain dollar" : "To know where to put your next dollar")}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                          {fr ? "Ouvrir l\u2019outil \u2192" : "Open tool \u2192"}
                        </span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Referral + second report */}
            <div style={{
              background: MARINE, borderRadius: 12, padding: "20px 22px",
              marginBottom: 20, textAlign: "left", color: "#fff",
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
                {fr ? "Obtenez un 2e bilan à 50 %" : "Get a 2nd assessment at 50% off"}
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, marginBottom: 14 }}>
                {fr
                  ? "Votre 2e bilan est automatiquement à 50 % de rabais."
                  : "Your 2nd assessment is automatically 50% off."}
              </div>
              <a
                href={tier === "intermediaire" || tier === "decaissement"
                  ? `/quiz-essentiel.html?lang=${fr ? "fr" : "en"}&second=1`
                  : `/quiz-intermediaire.html?lang=${fr ? "fr" : "en"}&second=1`}
                style={{
                  display: "inline-block", background: GOLD, color: "#fff",
                  padding: "9px 20px", borderRadius: 8, textDecoration: "none",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {fr ? "Commencer mon 2e bilan →" : "Start my 2nd assessment →"}
              </a>
            </div>

            {/* Share / referral */}
            <ShareSection fr={fr} refCode={refCode} />

            {/* Attribution dropdown */}
            <AttributionDropdown fr={fr} tier={tier} />

            {/* Support */}
            <div style={{ fontSize: 13, color: "#999", marginTop: 20 }}>
              {fr ? "Besoin d'aide? Écrivez à " : "Need help? Write to "}
              <a href="mailto:support@buildfi.ca" style={{ color: GOLD, textDecoration: "none", fontWeight: 600 }}>
                support@buildfi.ca
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MerciPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FEFCF9" }}>
        <div style={{ fontSize: 16, color: "#888" }}>Chargement...</div>
      </div>
    }>
      <ConfirmationContent />
    </Suspense>
  );
}
