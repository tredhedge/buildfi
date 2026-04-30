"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";
import {
  MODE1_QUESTIONS,
  MODE1_DEFAULT,
  filterBlocksForProfile,
  type Mode1Profile,
  type Mode1Question,
  type WizardField,
  type WizardBlock,
} from "@/lib/wizard/blocks";

/* Palette aligned with landing (CL_LIGHT planner_v3) */
const CL_LIGHT = { bg: "#f5f8fc", cd: "#fcfdff", s2: "#eef3f9", bd: "#d6e0ec", tx: "#2a3442", al: "#172332", dm: "#4a5a6e", ac: "#8f6d2f", gn: "#2f8a4a", rd: "#b93f43" };
const CL_DARK = { bg: "#252d39", cd: "#2d3748", s2: "#344155", bd: "#4d5d75", tx: "#d7e2ef", al: "#f2f7fd", dm: "#bccbe0", ac: "#d2a764", gn: "#48a66d", rd: "#cf6060" };

// Loi 25 / LPRPDE — must match CURRENT_POLICY_VERSION in /lib/consent.ts.
// If the server bumps the policy, the user is re-prompted at next checkout via the
// `consent_required` 400 response and `requiredPolicyVersion` field.
const CLIENT_POLICY_VERSION = "2026-04-26-v1";

const COPY = {
  fr: {
    title: "Questionnaire adaptatif",
    subtitle: "Seulement les questions pertinentes à votre situation.",
    mode1Title: "D'abord, aidez-nous à cibler le questionnaire",
    mode1Note: "Ces 8 questions décident quelles sections détaillées nous vous poserons ensuite.",
    mode1Continue: "Continuer →",
    mode1Progress: "Étape 1 sur 3 — Ciblage",
    mode2Title: "Vos informations",
    mode2Sub: "Basé sur vos réponses, voici {count} questions pertinentes à votre situation. Les sections non applicables sont masquées.",
    mode2Back: "← Modifier mes réponses",
    mode2Submit: "Générer mon rapport — 29,99 $",
    mode3Title: "Prêt à générer",
    review: "Vos réponses",
    emailLabel: "Votre courriel pour recevoir le rapport",
    emailPlaceholder: "vous@exemple.ca",
    emailNote: "Le rapport HTML vous est livré par courriel après paiement.",
    termsLabel: "J'ai lu et j'accepte les",
    termsLink: "Conditions d'utilisation",
    andAvis: "et l'",
    avisLink: "Avis légal",
    consentLabel: "J'autorise BuildFi à traiter mes données financières pour générer mon rapport. Conservation : 90 jours. Suppression sur demande.",
    consentLink: "Politique de confidentialité",
    backHome: "← Retour à l'accueil",
    yes: "Oui",
    no: "Non",
    loading: "Redirection vers le paiement…",
    errorEmail: "Adresse courriel invalide",
    errorTerms: "Vous devez accepter les conditions",
    errorConsent: "Vous devez autoriser le traitement des données pour générer le rapport",
    errorRequired: "Champs requis manquants",
    errorGeneric: "Erreur lors de la création de la session. Réessayez.",
  },
  en: {
    title: "Adaptive questionnaire",
    subtitle: "Only the questions relevant to your situation.",
    mode1Title: "First, help us tailor the questionnaire",
    mode1Note: "These 8 questions decide which detailed sections we'll ask you about next.",
    mode1Continue: "Continue →",
    mode1Progress: "Step 1 of 3 — Targeting",
    mode2Title: "Your information",
    mode2Sub: "Based on your answers, here are {count} questions relevant to your situation. Sections that don't apply are hidden.",
    mode2Back: "← Edit my answers",
    mode2Submit: "Generate my report — $29.99",
    mode3Title: "Ready to generate",
    review: "Your answers",
    emailLabel: "Your email to receive the report",
    emailPlaceholder: "you@example.com",
    emailNote: "The HTML report is delivered by email after payment.",
    termsLabel: "I have read and accept the",
    termsLink: "Terms of Use",
    andAvis: "and ",
    avisLink: "Legal Notice",
    consentLabel: "I authorize BuildFi to process my financial data to generate my report. Retention: 90 days. Deletion on request.",
    consentLink: "Privacy Policy",
    backHome: "← Back to home",
    yes: "Yes",
    no: "No",
    loading: "Redirecting to payment…",
    errorEmail: "Invalid email address",
    errorTerms: "You must accept the terms",
    errorConsent: "You must authorize data processing to generate the report",
    errorRequired: "Required fields missing",
    errorGeneric: "Error creating session. Please try again.",
  },
};

function Mode1Step({ cl, lang, profile, setProfile, onNext }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const canContinue = profile.phase !== undefined;

  const renderQuestion = (q: Mode1Question) => {
    const current = profile[q.id];
    if (q.type === "bool") {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => setProfile({ ...profile, [q.id]: v })}
              style={{
                flex: 1, padding: "10px 14px",
                background: current === v ? cl.ac : "transparent",
                color: current === v ? "#fff" : cl.tx,
                border: `1px solid ${current === v ? cl.ac : cl.bd}`,
                borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
              }}>
              {v ? t.yes : t.no}
            </button>
          ))}
        </div>
      );
    }
    if (q.type === "choice" && q.options) {
      return (
        <div style={{ display: "grid", gap: 6 }}>
          {q.options.map((o, i) => {
            const selected = current === o.value;
            return (
              <button
                key={i}
                onClick={() => setProfile({ ...profile, [q.id]: o.value })}
                style={{
                  textAlign: "left", padding: "10px 14px",
                  background: selected ? cl.ac + "18" : "transparent",
                  color: cl.tx,
                  border: `1px solid ${selected ? cl.ac : cl.bd}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: selected ? 700 : 500,
                }}>
                {lang === "fr" ? o.labelFr : o.labelEn}
              </button>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <section>
      <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{t.mode1Progress}</div>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: cl.al, margin: "0 0 10px" }}>{t.mode1Title}</h1>
      <p style={{ fontSize: 14, color: cl.dm, marginBottom: 22, lineHeight: 1.5 }}>{t.mode1Note}</p>
      <div style={{ display: "grid", gap: 16 }}>
        {MODE1_QUESTIONS.map((q, i) => (
          <div key={q.id} style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: cl.ac }}>Q{i + 1}.</span>
              <label style={{ fontSize: 14, fontWeight: 700, color: cl.al }}>{lang === "fr" ? q.labelFr : q.labelEn}</label>
            </div>
            {(q.helpFr || q.helpEn) && (
              <div style={{ fontSize: 12, color: cl.dm, marginBottom: 10, lineHeight: 1.5 }}>
                {lang === "fr" ? q.helpFr : q.helpEn}
              </div>
            )}
            {renderQuestion(q)}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!canContinue}
        style={{
          marginTop: 22, width: "100%", padding: "14px 22px",
          background: canContinue ? cl.ac : cl.bd,
          color: "#fff", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 800, cursor: canContinue ? "pointer" : "not-allowed",
          boxShadow: canContinue ? `0 4px 14px ${cl.ac}40` : "none",
        }}>
        {t.mode1Continue}
      </button>
    </section>
  );
}

function ProgressBar({ cl, step, lang }: any) {
  const steps = [
    { id: "mode1", labelFr: "Ciblage", labelEn: "Target" },
    { id: "mode2", labelFr: "Vos réponses", labelEn: "Your answers" },
    { id: "review", labelFr: "Vérifier", labelEn: "Review" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  const pct = ((idx + 1) / steps.length) * 100;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {steps.map((s, i) => (
          <span key={s.id} style={{ color: i <= idx ? cl.ac : cl.dm }}>
            {i + 1}. {lang === "fr" ? s.labelFr : s.labelEn}
          </span>
        ))}
      </div>
      <div style={{ height: 6, background: cl.bd, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: cl.ac, transition: "width .3s ease" }} />
      </div>
    </div>
  );
}

function ReviewStep({ cl, lang, theme, profile, answers, blocks, onBack, onSubmit, submitting, error }: any) {
  const fmt = (v: any, f: any) => {
    if (v == null || v === "") return "—";
    if (f.type === "currency") return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
    if (f.type === "percent") return `${v} %`;
    if (f.type === "bool") return v ? (lang === "fr" ? "Oui" : "Yes") : (lang === "fr" ? "Non" : "No");
    if (f.type === "choice") {
      const opt = f.options?.find((o: any) => String(o.value) === String(v));
      return opt ? (lang === "fr" ? opt.labelFr : opt.labelEn) : String(v);
    }
    return String(v);
  };
  const totalFields = blocks.reduce((s: number, b: any) => s + b.fields.length, 0);
  return (
    <section>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: cl.dm, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        {lang === "fr" ? "← Modifier mes réponses" : "← Edit my answers"}
      </button>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: cl.al, margin: "0 0 8px" }}>
        {lang === "fr" ? "Dernière vérification avant le calcul" : "Final review before calculation"}
      </h1>
      <p style={{ fontSize: 14, color: cl.dm, marginBottom: 22 }}>
        {lang === "fr"
          ? `Vérifiez ces ${totalFields} réponses. Après paiement, votre rapport est généré en 30 secondes et livré par courriel.`
          : `Review these ${totalFields} answers. After payment, your report is generated in 30 seconds and delivered by email.`}
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {blocks.map((b: any) => (
          <details key={b.id} open style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 10, padding: "12px 16px" }}>
            <summary style={{ fontSize: 14, fontWeight: 700, color: cl.al, cursor: "pointer", listStyle: "none" }}>
              {lang === "fr" ? b.titleFr : b.titleEn}{" "}
              <span style={{ fontSize: 11, color: cl.dm, fontWeight: 400 }}>({b.fields.length} {lang === "fr" ? "champs" : "fields"})</span>
            </summary>
            <table style={{ width: "100%", marginTop: 10, fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                {b.fields.map((f: any) => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${cl.bd}` }}>
                    <td style={{ padding: "6px 8px 6px 0", color: cl.dm, width: "60%" }}>{lang === "fr" ? f.labelFr : f.labelEn}</td>
                    <td style={{ padding: "6px 0", color: cl.tx, fontWeight: 600, textAlign: "right" }}>{fmt(answers[f.id], f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
      {error && (
        <div style={{ background: cl.rd + "18", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 14 }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 20, padding: "16px 18px", background: cl.ac + "10", border: `1px solid ${cl.ac}`, borderRadius: 10, fontSize: 13, color: cl.tx, lineHeight: 1.5 }}>
        <strong style={{ color: cl.al }}>{lang === "fr" ? "Ce que vous allez recevoir" : "What you'll receive"}</strong>
        <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
          <li>{lang === "fr" ? "1 rapport HTML interactif personnalisé" : "1 interactive personalized HTML report"}</li>
          <li>{lang === "fr" ? "Narration IA Opus (analyse de vos chiffres)" : "Opus AI narration (analysis of your numbers)"}</li>
          <li>{lang === "fr" ? "Plan testé contre krach, inflation, longévité extrême" : "Plan stress-tested against crash, inflation, extreme longevity"}</li>
          <li>{lang === "fr" ? "Livré par courriel après paiement (~30 secondes)" : "Delivered by email after payment (~30 seconds)"}</li>
        </ul>
      </div>
      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: 18, width: "100%", padding: "15px 24px",
          background: cl.ac, color: "#fff", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 800, cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 14px ${cl.ac}40`,
        }}>
        {submitting
          ? (lang === "fr" ? "Redirection vers le paiement…" : "Redirecting to payment…")
          : (lang === "fr" ? "Confirmer et payer 29,99 $ →" : "Confirm and pay $29.99 →")}
      </button>
    </section>
  );
}

function Mode2Step({ cl, lang, profile, answers, setAnswers, blocks, onBack, onSubmit, submitting, error, errorFieldId, submitLabel }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const focusField = (fieldId: string) => {
    const el = document.getElementById(`f-${fieldId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 300);
  };
  const totalFields = blocks.reduce((s: number, b: WizardBlock) => s + b.fields.length, 0);
  const [email, setEmail] = useState(answers.__email || "");
  const [terms, setTerms] = useState(answers.__terms || false);
  const [consent, setConsent] = useState(answers.__consent || false);

  useEffect(() => {
    setAnswers({ ...answers, __email: email, __terms: terms, __consent: consent });
  }, [email, terms, consent]); // eslint-disable-line

  const renderField = (f: WizardField) => {
    const val = answers[f.id] ?? "";
    const update = (v: any) => setAnswers({ ...answers, [f.id]: v });
    const inputBase: React.CSSProperties = {
      width: "100%", padding: "9px 12px", background: cl.s2,
      border: `1px solid ${cl.bd}`, borderRadius: 8, fontSize: 14, color: cl.tx, outline: "none",
    };
    if (f.type === "choice" && f.options) {
      return (
        <select value={val} onChange={(e) => update(e.target.value)} style={inputBase}>
          <option value="">—</option>
          {f.options.map((o, i) => (
            <option key={i} value={String(o.value)}>{lang === "fr" ? o.labelFr : o.labelEn}</option>
          ))}
        </select>
      );
    }
    if (f.type === "bool") {
      return (
        <div style={{ display: "flex", gap: 6 }}>
          {[true, false].map((v) => (
            <button key={String(v)} onClick={() => update(v)}
              style={{
                flex: 1, padding: "8px 12px",
                background: val === v ? cl.ac : "transparent",
                color: val === v ? "#fff" : cl.tx,
                border: `1px solid ${val === v ? cl.ac : cl.bd}`,
                borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}>{v ? t.yes : t.no}</button>
          ))}
        </div>
      );
    }
    // currency, percent, number, age — smart default step so arrow-up/down makes sense
    // Currency fields usually carry $1K-$1M balances → step 1000 (override via f.step)
    // Percent fields → step 0.25 (default)
    // Age/number → step 1
    const smartStep = f.step ?? (
      f.type === "currency" ? 1000 :
      f.type === "percent" ? 0.25 :
      1
    );
    return (
      <div style={{ display: "flex", alignItems: "stretch", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, overflow: "hidden" }}>
        {f.type === "currency" && <span style={{ padding: "9px 10px", background: cl.bg, color: cl.dm, fontSize: 12, fontWeight: 700 }}>$</span>}
        <input
          id={`f-${f.id}`}
          type="number"
          step={smartStep}
          min={f.min}
          max={f.max}
          value={val === "" ? "" : val}
          onChange={(e) => update(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={f.placeholder || "0"}
          style={{ flex: 1, padding: "9px 10px", border: "none", background: "transparent", color: cl.tx, outline: "none", fontSize: 14 }}
        />
        {f.type === "percent" && <span style={{ padding: "9px 10px", background: cl.bg, color: cl.dm, fontSize: 12, fontWeight: 700 }}>%</span>}
      </div>
    );
  };

  return (
    <section>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: cl.dm, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        {t.mode2Back}
      </button>
      <div style={{ fontSize: 11, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {lang === "fr" ? `Étape 2 sur 3 — ${totalFields} questions` : `Step 2 of 3 — ${totalFields} questions`}
      </div>
      <h1 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 800, color: cl.al, margin: "0 0 10px" }}>{t.mode2Title}</h1>
      <p style={{ fontSize: 14, color: cl.dm, marginBottom: 22, lineHeight: 1.5 }}>{t.mode2Sub.replace("{count}", String(totalFields))}</p>

      <div style={{ display: "grid", gap: 18 }}>
        {blocks.map((b: WizardBlock) => (
          <div key={b.id} style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "18px 20px" }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: cl.al, margin: "0 0 4px" }}>{lang === "fr" ? b.titleFr : b.titleEn}</h2>
            {(b.descFr || b.descEn) && <div style={{ fontSize: 12, color: cl.dm, marginBottom: 12 }}>{lang === "fr" ? b.descFr : b.descEn}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 10 }}>
              {b.fields.map((f: WizardField) => (
                <div key={f.id}>
                  <label htmlFor={`f-${f.id}`} style={{ display: "block", fontSize: 12, color: cl.dm, marginBottom: 4, fontWeight: 600 }}>
                    {lang === "fr" ? f.labelFr : f.labelEn} {f.required && <span style={{ color: cl.rd }}>*</span>}
                  </label>
                  {renderField(f)}
                  {(f.helpFr || f.helpEn) && <div style={{ fontSize: 11, color: cl.dm, marginTop: 3 }}>{lang === "fr" ? f.helpFr : f.helpEn}</div>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Email + Terms */}
      <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "18px 20px", marginTop: 18 }}>
        <label htmlFor="f-__email" style={{ display: "block", fontSize: 12, fontWeight: 700, color: cl.dm, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
          {t.emailLabel} <span style={{ color: cl.rd }}>*</span>
        </label>
        <input id="f-__email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.emailPlaceholder}
          style={{ width: "100%", padding: "11px 13px", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, color: cl.tx, outline: "none", fontSize: 14 }} />
        <div style={{ fontSize: 11, color: cl.dm, marginTop: 4, marginBottom: 14 }}>{t.emailNote}</div>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, cursor: "pointer" }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
          <span>
            {t.termsLabel} <a href="/conditions" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.termsLink}</a> {t.andAvis}
            <a href="/avis-legal" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.avisLink}</a>.
          </span>
        </label>

        {/* Loi 25 / LPRPDE consent — required for the server to record a versioned consent receipt */}
        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, cursor: "pointer", marginTop: 10 }}>
          <input
            id="f-__consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, accentColor: cl.ac }}
          />
          <span>
            {t.consentLabel}{" "}
            <a href="/confidentialite" target="_blank" rel="noopener" style={{ color: cl.ac }}>
              {t.consentLink}
            </a>
            .
          </span>
        </label>
      </div>

      {error && (
        errorFieldId ? (
          <button
            type="button"
            onClick={() => focusField(errorFieldId)}
            style={{ display: "block", width: "100%", textAlign: "left", background: cl.rd + "18", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 14, cursor: "pointer", fontWeight: 600 }}
            title={lang === "fr" ? "Cliquez pour aller au champ" : "Click to jump to the field"}
          >
            ⚠️ {error} <span style={{ color: cl.dm, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>
              {lang === "fr" ? "(cliquer pour y aller →)" : "(click to jump →)"}
            </span>
          </button>
        ) : (
          <div style={{ background: cl.rd + "18", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginTop: 14 }}>
            {error}
          </div>
        )
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: 18, width: "100%", padding: "15px 24px",
          background: cl.ac, color: "#fff", border: "none", borderRadius: 10,
          fontSize: 15, fontWeight: 800, cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1, boxShadow: `0 4px 14px ${cl.ac}40`,
        }}>
        {submitting ? t.loading : (submitLabel || t.mode2Submit + " →")}
      </button>
    </section>
  );
}

function WizardInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("buildfi_theme");
      if (saved === "dark" || saved === "light") setTheme(saved);
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
    } catch {}
    trackEvent(EVENTS.WIZARD_STARTED, {});
  }, [params]);
  const cl = mounted && theme === "dark" ? CL_DARK : CL_LIGHT;
  const t = lang === "fr" ? COPY.fr : COPY.en;

  const [step, setStep] = useState<"mode1" | "mode2" | "review">("mode1");
  const [profile, setProfile] = useState<Mode1Profile>(MODE1_DEFAULT);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorFieldId, setErrorFieldId] = useState<string | null>(null);

  // Save progress to localStorage with 30-day TTL (user can resume up to 30 days later)
  const WIZARD_KEY = "buildfi_wizard_v2";
  const WIZARD_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WIZARD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.savedAt && Date.now() - parsed.savedAt < WIZARD_TTL_MS) {
          if (parsed.profile) setProfile(parsed.profile);
          if (parsed.answers) setAnswers(parsed.answers);
          if (parsed.step) setStep(parsed.step);
        } else {
          // Expired — clear
          localStorage.removeItem(WIZARD_KEY);
        }
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_KEY, JSON.stringify({ profile, answers, step, savedAt: Date.now() }));
    } catch {}
  }, [profile, answers, step]);

  const blocks = useMemo(() => filterBlocksForProfile(profile), [profile]);

  const validateMode2 = (): boolean => {
    setError("");
    setErrorFieldId(null);
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((answers.__email || "").trim());
    if (!emailOK) { setError(t.errorEmail); setErrorFieldId("__email"); return false; }
    if (!answers.__terms) { setError(t.errorTerms); return false; }
    if (!answers.__consent) { setError(t.errorConsent); setErrorFieldId("__consent"); return false; }
    for (const b of blocks) {
      for (const f of b.fields) {
        const v = answers[f.id];
        if (f.required && (v === "" || v == null)) {
          setError(`${t.errorRequired} (${lang === "fr" ? b.titleFr : b.titleEn}: ${lang === "fr" ? f.labelFr : f.labelEn})`);
          setErrorFieldId(f.id);
          return false;
        }
        if (v !== "" && v != null && (f.type === "number" || f.type === "age" || f.type === "currency" || f.type === "percent")) {
          const n = Number(v);
          if (!Number.isFinite(n)) { setError((lang === "fr" ? "Valeur invalide : " : "Invalid value: ") + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
          if (f.min != null && n < f.min) { setError((lang === "fr" ? `Minimum ${f.min} : ` : `Minimum ${f.min}: `) + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
          if (f.max != null && n > f.max) { setError((lang === "fr" ? `Maximum ${f.max} : ` : `Maximum ${f.max}: `) + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
        }
      }
    }
    return true;
  };

  const submit = async () => {
    // Re-validate defensively (Mode2 already validated before navigating to Review)
    if (!validateMode2()) return;
    const activeIds = new Set<string>();
    for (const b of blocks) for (const f of b.fields) activeIds.add(f.id);
    trackEvent(EVENTS.CHECKOUT_INITIATED, { tier: "bilan360", fieldCount: activeIds.size });
    setSubmitting(true);
    try {
      // Only keep values for fields present in the current set of active blocks,
      // plus the classifier profile. Prevents leaking stale answers from hidden blocks.
      const wizardAnswers: Record<string, unknown> = { __profile: profile };
      for (const key of Object.keys(answers)) {
        if (key.startsWith("__")) continue; // internal (email, terms)
        if (activeIds.has(key)) wizardAnswers[key] = answers[key];
      }
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: answers.__email.trim(),
          type: "report",
          tier: "bilan360",
          quizAnswers: wizardAnswers,
          lang,
          termsAccepted: true,
          // Loi 25 / LPRPDE — server validates policyVersion + acceptedAt freshness.
          // The server gate is the authority; this client gate is UX-only.
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
      localStorage.removeItem(WIZARD_KEY);
      window.location.href = data.url;
    } catch (e) {
      setError(t.errorGeneric);
      setSubmitting(false);
    }
  };

  return (
    <div suppressHydrationWarning style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: '"Avenir Next","Segoe UI",Arial,sans-serif' }}>
      {/* Top bar */}
      <header style={{ background: cl.cd, borderBottom: `1px solid ${cl.bd}`, padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <a href={`/${lang === "en" ? "?lang=en" : ""}`} style={{ textDecoration: "none", display: "flex", alignItems: "center" }} aria-label="BuildFi home">
          <svg width={140} height={31} viewBox="0 0 220 48">
            <g>
              <rect x="0" y="32" width="28" height="8" rx="2" fill={cl.al} />
              <rect x="4" y="22" width="26" height="8" rx="2" fill={cl.al} opacity={0.5} />
              <rect x="8" y="12" width="24" height="8" rx="2" fill={cl.ac} />
            </g>
            <text x="40" y="38" fontFamily="'Plus Jakarta Sans',sans-serif" fontSize="34" fontWeight={700} letterSpacing="-0.5">
              <tspan fill={cl.al}>build</tspan><tspan fill={cl.ac}>fi</tspan>
            </text>
          </svg>
        </a>
        <div style={{ display: "flex", gap: 4, background: cl.s2, borderRadius: 8, padding: 3 }}>
          <button onClick={() => setLang("fr")} style={{ fontSize: 12, fontWeight: 700, color: lang === "fr" ? cl.al : cl.dm, background: lang === "fr" ? cl.ac + "18" : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>FR</button>
          <button onClick={() => setLang("en")} style={{ fontSize: 12, fontWeight: 700, color: lang === "en" ? cl.al : cl.dm, background: lang === "en" ? cl.ac + "18" : "transparent", border: "none", padding: "5px 12px", borderRadius: 6, cursor: "pointer" }}>EN</button>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Visual progress bar */}
        <ProgressBar cl={cl} step={step} lang={lang} />

        {step === "mode1" ? (
          <Mode1Step cl={cl} lang={lang} profile={profile} setProfile={setProfile} onNext={() => {
            trackEvent(EVENTS.WIZARD_MODE1_COMPLETED, { profile });
            setStep("mode2");
          }} />
        ) : step === "mode2" ? (
          <Mode2Step cl={cl} lang={lang} profile={profile} answers={answers} setAnswers={setAnswers} blocks={blocks} onBack={() => setStep("mode1")} onSubmit={() => {
            if (validateMode2()) {
              trackEvent(EVENTS.WIZARD_REVIEW_REACHED, { totalFields: blocks.reduce((s: number, b: WizardBlock) => s + b.fields.length, 0) });
              setStep("review");
            } else {
              trackEvent(EVENTS.WIZARD_VALIDATION_ERROR, { fieldId: errorFieldId });
            }
          }} submitting={false} error={error} errorFieldId={errorFieldId} submitLabel={lang === "fr" ? "Vérifier mes réponses →" : "Review my answers →"} />
        ) : (
          <ReviewStep cl={cl} lang={lang} theme={theme} profile={profile} answers={answers} blocks={blocks} onBack={() => setStep("mode2")} onSubmit={submit} submitting={submitting} error={error} />
        )}
      </main>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: CL_LIGHT.bg }} />}>
      <WizardInner />
    </Suspense>
  );
}
