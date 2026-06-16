"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent, EVENTS } from "@/lib/tracking";
import {
  MODE1_QUESTIONS,
  MODE1_DEFAULT,
  filterBlocksForProfile,
  type Mode1Profile,
  type Mode1Question,
  type WizardField,
} from "@/lib/wizard/blocks";

/* Editorial design system — same paper/serif/gold language as the landing
   (buildfi-home v6) and the AI reports. See docs/DESIGN-SYSTEM.md. The wizard
   sits inside the purchase funnel between two editorial surfaces (landing →
   wizard → report), so it must read as the same publication, not an app. */
import { getEditorialPalette, EDITORIAL_FONT } from "@/lib/design/editorial.tokens";
import { useEditorialBody } from "@/lib/design/editorial-components";
import { BuildFiLogo } from "@/lib/design/components";

const F = EDITORIAL_FONT; // F.serif (Playfair) · F.sans (Inter) · F.mono (JetBrains Mono)

/**
 * Editorial palette mapped onto the abbreviated keys this file already used
 * (bg/cd/s2/bd/al/tx/dm/ac/rd). Values are hex so the existing alpha-suffix
 * concatenations (`cl.ac + "18"`) keep producing valid 8-digit hex.
 */
function editorialCL() {
  const ed = getEditorialPalette();
  return {
    bg: ed.bg,      // paper
    cd: ed.card,    // white card surface
    s2: ed.s2,      // recessed cream input surface
    bd: ed.line,    // hairline border
    al: ed.ink,     // strong headings / labels
    tx: ed.text,    // body text
    dm: ed.muted,   // muted / secondary
    ac: ed.gold,    // gold accent
    rd: ed.red,     // validation error
    panel: ed.panel,
    goldBg: ed.goldBg,
    shadow: ed.shadowSoft,
  };
}

// Loi 25 / LPRPDE — must match CURRENT_POLICY_VERSION in /lib/consent.ts.
// If the server bumps the policy, the user is re-prompted at next checkout via the
// `consent_required` 400 response and `requiredPolicyVersion` field.
const CLIENT_POLICY_VERSION = "2026-04-26-v1";

const COPY = {
  fr: {
    mode1Title: "D'abord, aidez-nous à cibler le questionnaire",
    mode1Note: "Ces 8 questions décident quelles sections détaillées nous vous poserons ensuite.",
    mode1Continue: "Continuer →",
    targeting: "Ciblage",
    contactStep: "Vos coordonnées",
    reviewStep: "Vérification",
    mode2Intro: "D'après votre profil : environ {count} questions. Les sections non pertinentes sont masquées.",
    mode2Title: "Vos informations",
    sectionOf: "Section {i} sur {n}",
    back: "← Retour",
    continue: "Continuer →",
    toReview: "Vérifier mes réponses →",
    required: "obligatoire",
    optional: "facultatif",
    emailLabel: "Votre courriel pour recevoir le rapport",
    emailPlaceholder: "vous@exemple.ca",
    emailNote: "Le rapport HTML vous est livré par courriel après paiement.",
    termsLabel: "J'ai lu et j'accepte les",
    termsLink: "Conditions d'utilisation",
    andAvis: "et l'",
    avisLink: "Avis légal",
    consentLabel: "J'autorise BuildFi à traiter mes données financières pour générer mon rapport. Conservation : 90 jours. Suppression sur demande.",
    consentLink: "Politique de confidentialité",
    yes: "Oui",
    no: "Non",
    loading: "Redirection vers le paiement…",
    errorEmail: "Adresse courriel invalide",
    errorTerms: "Vous devez accepter les conditions",
    errorConsent: "Vous devez autoriser le traitement des données pour générer le rapport",
    errorRequired: "Champ obligatoire manquant",
    errorGeneric: "Erreur lors de la création de la session. Réessayez.",
    jump: "(cliquer pour y aller →)",
    trust: [
      "Sans abonnement — paiement unique",
      "Environ 5 minutes",
      "Sans création de compte",
      "13 provinces et territoires",
    ],
  },
  en: {
    mode1Title: "First, help us tailor the questionnaire",
    mode1Note: "These 8 questions decide which detailed sections we'll ask you about next.",
    mode1Continue: "Continue →",
    targeting: "Targeting",
    contactStep: "Your contact details",
    reviewStep: "Review",
    mode2Intro: "Based on your profile: about {count} questions. Sections that don't apply are hidden.",
    mode2Title: "Your information",
    sectionOf: "Section {i} of {n}",
    back: "← Back",
    continue: "Continue →",
    toReview: "Review my answers →",
    required: "required",
    optional: "optional",
    emailLabel: "Your email to receive the report",
    emailPlaceholder: "you@example.com",
    emailNote: "The HTML report is delivered by email after payment.",
    termsLabel: "I have read and accept the",
    termsLink: "Terms of Use",
    andAvis: "and ",
    avisLink: "Legal Notice",
    consentLabel: "I authorize BuildFi to process my financial data to generate my report. Retention: 90 days. Deletion on request.",
    consentLink: "Privacy Policy",
    yes: "Yes",
    no: "No",
    loading: "Redirecting to payment…",
    errorEmail: "Invalid email address",
    errorTerms: "You must accept the terms",
    errorConsent: "You must authorize data processing to generate the report",
    errorRequired: "Required field missing",
    errorGeneric: "Error creating session. Please try again.",
    jump: "(click to jump →)",
    trust: [
      "No subscription — one-time payment",
      "About 5 minutes",
      "No account required",
      "13 provinces & territories",
    ],
  },
};

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Group an integer's thousands for display. Locale-aware separator.
 *  Returns a display string only; the stored answer stays a Number. */
function formatThousands(v: number | string, lang: "fr" | "en"): string {
  if (v === "" || v == null) return "";
  const sep = lang === "fr" ? " " : ",";
  const s = String(v);
  const neg = s.startsWith("-");
  const [intPart, decPart] = (neg ? s.slice(1) : s).split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  return (neg ? "-" : "") + grouped + (decPart != null ? "." + decPart : "");
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flex: "none", marginTop: 2 }}>
      <path d="m2.5 8.5 3.5 3.5 7.5-8" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Numeric field (currency / number / age / percent) ──────────────
   Keeps a local raw-string for display (thousands grouping on currency,
   free decimal entry on percent) while pushing a Number to `answers`, so
   the translator/validation always see the same numeric value as before. */
function NumericField({
  f, value, onChange, cl, lang,
}: {
  f: WizardField;
  value: any;
  onChange: (v: any) => void;
  cl: ReturnType<typeof editorialCL>;
  lang: "fr" | "en";
}) {
  const isPercent = f.type === "percent";
  const fmt = (v: any) => (v === "" || v == null ? "" : isPercent ? String(v) : formatThousands(v, lang));
  const [raw, setRaw] = useState<string>(fmt(value));

  // Re-sync display when the answer changes externally (draft load, Back nav).
  useEffect(() => {
    const cleaned = raw === "" ? "" : raw.replace(isPercent ? /[^\d.]/g : /[^\d]/g, "");
    const parsed = cleaned === "" ? "" : Number(cleaned);
    if (parsed !== value) setRaw(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handle = (input: string) => {
    if (input.trim() === "") { setRaw(""); onChange(""); return; }
    if (isPercent) {
      // allow digits + a single dot, keep trailing dot while typing
      let cleaned = input.replace(/[^\d.]/g, "");
      const firstDot = cleaned.indexOf(".");
      if (firstDot !== -1) {
        cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
      }
      setRaw(cleaned);
      const num = Number(cleaned);
      onChange(cleaned === "" || cleaned === "." || !Number.isFinite(num) ? "" : num);
    } else {
      const cleaned = input.replace(/[^\d]/g, "");
      if (cleaned === "") { setRaw(""); onChange(""); return; }
      const num = Number(cleaned);
      setRaw(formatThousands(num, lang));
      onChange(Number.isFinite(num) ? num : "");
    }
  };

  const affix: React.CSSProperties = {
    padding: "10px 11px", background: cl.goldBg, color: cl.ac, fontSize: 12, fontWeight: 700,
    fontFamily: F.mono, display: "flex", alignItems: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "stretch", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, overflow: "hidden" }}>
      {f.type === "currency" && <span style={affix}>$</span>}
      <input
        id={`f-${f.id}`}
        type="text"
        inputMode={isPercent ? "decimal" : "numeric"}
        value={raw}
        onChange={(e) => handle(e.target.value)}
        placeholder={f.placeholder || "0"}
        style={{ flex: 1, padding: "10px 12px", border: "none", background: "transparent", color: cl.tx, outline: "none", fontSize: 14, fontFamily: F.mono, minWidth: 0 }}
      />
      {isPercent && <span style={affix}>%</span>}
    </div>
  );
}

/* Dispatch a single field to its control (choice / bool / numeric). */
function FieldControl({
  f, answers, setAnswers, cl, lang, t,
}: {
  f: WizardField;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
  cl: ReturnType<typeof editorialCL>;
  lang: "fr" | "en";
  t: typeof COPY.fr;
}) {
  const val = answers[f.id] ?? "";
  const update = (v: any) => setAnswers({ ...answers, [f.id]: v });

  if (f.type === "choice" && f.options) {
    return (
      <select
        id={`f-${f.id}`}
        value={val}
        onChange={(e) => update(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, fontSize: 14, color: cl.tx, outline: "none", fontFamily: F.sans }}
      >
        <option value="">—</option>
        {f.options.map((o, i) => (
          <option key={i} value={String(o.value)}>{lang === "fr" ? o.labelFr : o.labelEn}</option>
        ))}
      </select>
    );
  }

  if (f.type === "bool") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {[true, false].map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => update(v)}
            style={{
              flex: 1, padding: "10px 14px",
              background: val === v ? cl.ac : "transparent",
              color: val === v ? "#fff" : cl.tx,
              border: `1px solid ${val === v ? cl.ac : cl.bd}`,
              borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: F.sans,
            }}
          >
            {v ? t.yes : t.no}
          </button>
        ))}
      </div>
    );
  }

  return <NumericField f={f} value={val} onChange={update} cl={cl} lang={lang} />;
}

/* ── Mode 1 — classifier ─────────────────────────────────────────── */
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
              type="button"
              onClick={() => setProfile({ ...profile, [q.id]: v })}
              style={{
                flex: 1, padding: "10px 14px",
                background: current === v ? cl.ac : "transparent",
                color: current === v ? "#fff" : cl.tx,
                border: `1px solid ${current === v ? cl.ac : cl.bd}`,
                borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: F.sans,
              }}
            >
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
                type="button"
                onClick={() => setProfile({ ...profile, [q.id]: o.value })}
                style={{
                  textAlign: "left", padding: "11px 14px",
                  background: selected ? cl.ac + "18" : "transparent",
                  color: cl.tx,
                  border: `1px solid ${selected ? cl.ac : cl.bd}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: selected ? 700 : 500, fontFamily: F.sans,
                }}
              >
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
      <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>{t.targeting}</div>
      <h1 style={{ fontFamily: F.serif, fontSize: "clamp(24px, 3.4vw, 34px)", fontWeight: 700, color: cl.al, margin: "0 0 10px", lineHeight: 1.15 }}>{t.mode1Title}</h1>
      <p style={{ fontSize: 15, color: cl.dm, marginBottom: 24, lineHeight: 1.55 }}>{t.mode1Note}</p>
      <div style={{ display: "grid", gap: 14 }}>
        {MODE1_QUESTIONS.map((q, i) => (
          <div key={q.id} style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: "16px 18px", boxShadow: cl.shadow }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: F.mono, fontSize: 12, fontWeight: 700, color: cl.ac }}>Q{i + 1}</span>
              <label style={{ fontSize: 14.5, fontWeight: 700, color: cl.al }}>{lang === "fr" ? q.labelFr : q.labelEn}</label>
            </div>
            {(q.helpFr || q.helpEn) && (
              <div style={{ fontSize: 12.5, color: cl.dm, marginBottom: 10, lineHeight: 1.5 }}>
                {lang === "fr" ? q.helpFr : q.helpEn}
              </div>
            )}
            {renderQuestion(q)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        style={{
          marginTop: 24, width: "100%", padding: "15px 22px",
          background: canContinue ? cl.ac : cl.bd,
          color: "#fff", border: "none", borderRadius: 999,
          fontSize: 15, fontWeight: 700, fontFamily: F.sans, cursor: canContinue ? "pointer" : "not-allowed",
          boxShadow: canContinue ? "0 10px 24px rgba(196,148,74,.24)" : "none",
        }}
      >
        {t.mode1Continue}
      </button>
    </section>
  );
}

/* ── Progress bar — spans the whole journey, total adjusts to profile ─ */
function ProgressBar({ cl, current, total, label, lang }: any) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12 }}>
        <span style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: cl.ac, textTransform: "uppercase" }}>
          {lang === "fr" ? "Étape" : "Step"} {current + 1} / {total}
        </span>
        <span style={{ fontSize: 12.5, color: cl.dm, fontWeight: 600, textAlign: "right" }}>{label}</span>
      </div>
      <div style={{ height: 5, background: cl.s2, borderRadius: 999, overflow: "hidden", border: `1px solid ${cl.bd}` }}>
        <div style={{ height: "100%", width: `${pct}%`, background: cl.ac, transition: "width .35s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  );
}

/* ── Trust strip — carries the landing's reassurances into the funnel.
   Deliberately omits any data-storage claim (the "never stored" vs 90-day
   retention contradiction is an open legal decision — see report). ─────── */
function TrustStrip({ cl, lang }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", margin: "0 0 22px" }}>
      {t.trust.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: cl.tx, lineHeight: 1.4 }}>
          <CheckIcon color={cl.ac} />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Mode 2 — one block (section) per step ───────────────────────── */
function Mode2BlockStep({ cl, lang, block, index, total, answers, setAnswers, intro, onBack, onNext, error, errorFieldId }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const focusField = (fieldId: string) => {
    const el = document.getElementById(`f-${fieldId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 300);
  };

  return (
    <section>
      <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>
        {t.sectionOf.replace("{i}", String(index + 1)).replace("{n}", String(total))}
      </div>
      <h1 style={{ fontFamily: F.serif, fontSize: "clamp(23px, 3.2vw, 31px)", fontWeight: 700, color: cl.al, margin: "0 0 6px", lineHeight: 1.15 }}>
        {lang === "fr" ? block.titleFr : block.titleEn}
      </h1>
      {(block.descFr || block.descEn) && (
        <p style={{ fontSize: 14, color: cl.dm, margin: "0 0 8px", lineHeight: 1.55 }}>{lang === "fr" ? block.descFr : block.descEn}</p>
      )}
      {index === 0 && intro && (
        <div style={{ fontSize: 13, color: cl.tx, background: cl.goldBg, borderLeft: `3px solid ${cl.ac}`, borderRadius: "0 8px 8px 0", padding: "10px 14px", margin: "10px 0 0", lineHeight: 1.5 }}>
          {intro}
        </div>
      )}

      <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: "20px 22px", boxShadow: cl.shadow, marginTop: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {block.fields.map((f: WizardField) => (
            <div key={f.id}>
              <label htmlFor={`f-${f.id}`} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12.5, color: cl.al, marginBottom: 5, fontWeight: 600, flexWrap: "wrap" }}>
                <span>{lang === "fr" ? f.labelFr : f.labelEn}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: cl.dm, opacity: f.required ? 0.95 : 0.7, fontStyle: "italic" }}>
                  {f.required ? t.required : t.optional}
                </span>
              </label>
              <FieldControl f={f} answers={answers} setAnswers={setAnswers} cl={cl} lang={lang} t={t} />
              {(f.helpFr || f.helpEn) && <div style={{ fontSize: 11.5, color: cl.dm, marginTop: 4, lineHeight: 1.45 }}>{lang === "fr" ? f.helpFr : f.helpEn}</div>}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <button
          type="button"
          onClick={() => errorFieldId && focusField(errorFieldId)}
          style={{ display: "block", width: "100%", textAlign: "left", background: cl.rd + "14", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "11px 14px", borderRadius: 8, fontSize: 13, marginTop: 16, cursor: errorFieldId ? "pointer" : "default", fontWeight: 600 }}
        >
          {error}{errorFieldId && <span style={{ color: cl.dm, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{t.jump}</span>}
        </button>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button type="button" onClick={onBack} style={{ padding: "14px 20px", background: "transparent", color: cl.tx, border: `1px solid ${cl.bd}`, borderRadius: 999, fontSize: 14.5, fontWeight: 600, fontFamily: F.sans, cursor: "pointer" }}>
          {t.back}
        </button>
        <button type="button" onClick={onNext} style={{ flex: 1, padding: "14px 22px", background: cl.ac, color: "#fff", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: F.sans, cursor: "pointer", boxShadow: "0 10px 24px rgba(196,148,74,.24)" }}>
          {t.continue}
        </button>
      </div>
    </section>
  );
}

/* ── Mode 2 — final step: email + consents ───────────────────────── */
function Mode2ContactStep({ cl, lang, stepNo, total, answers, setAnswers, onBack, onNext, error, errorFieldId }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const [email, setEmail] = useState(answers.__email || "");
  const [terms, setTerms] = useState(answers.__terms || false);
  const [consent, setConsent] = useState(answers.__consent || false);

  useEffect(() => {
    setAnswers({ ...answers, __email: email, __terms: terms, __consent: consent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, terms, consent]);

  const focusField = (fieldId: string) => {
    const el = document.getElementById(`f-${fieldId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 300);
  };

  return (
    <section>
      <div style={{ fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: cl.ac, textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 8 }}>
        {t.sectionOf.replace("{i}", String(stepNo)).replace("{n}", String(total))}
      </div>
      <h1 style={{ fontFamily: F.serif, fontSize: "clamp(23px, 3.2vw, 31px)", fontWeight: 700, color: cl.al, margin: "0 0 18px", lineHeight: 1.15 }}>{t.contactStep}</h1>

      <div style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 14, padding: "20px 22px", boxShadow: cl.shadow }}>
        <label htmlFor="f-__email" style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12.5, fontWeight: 600, color: cl.al, marginBottom: 6 }}>
          <span>{t.emailLabel}</span>
          <span style={{ fontSize: 11, fontWeight: 500, color: cl.dm, fontStyle: "italic" }}>{t.required}</span>
        </label>
        <input
          id="f-__email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.emailPlaceholder}
          style={{ width: "100%", padding: "11px 13px", background: cl.s2, border: `1px solid ${cl.bd}`, borderRadius: 8, color: cl.tx, outline: "none", fontSize: 14, fontFamily: F.sans }}
        />
        <div style={{ fontSize: 11.5, color: cl.dm, marginTop: 5, marginBottom: 16 }}>{t.emailNote}</div>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, cursor: "pointer" }}>
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
          <span>
            {t.termsLabel} <a href="/conditions" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.termsLink}</a> {t.andAvis}
            <a href="/avis-legal" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.avisLink}</a>.
          </span>
        </label>

        {/* Loi 25 / LPRPDE consent — required for the server to record a versioned consent receipt */}
        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, color: cl.tx, cursor: "pointer", marginTop: 12 }}>
          <input id="f-__consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor: cl.ac }} />
          <span>
            {t.consentLabel}{" "}
            <a href="/confidentialite" target="_blank" rel="noopener" style={{ color: cl.ac }}>{t.consentLink}</a>.
          </span>
        </label>
      </div>

      {error && (
        <button
          type="button"
          onClick={() => errorFieldId && focusField(errorFieldId)}
          style={{ display: "block", width: "100%", textAlign: "left", background: cl.rd + "14", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "11px 14px", borderRadius: 8, fontSize: 13, marginTop: 16, cursor: errorFieldId ? "pointer" : "default", fontWeight: 600 }}
        >
          {error}{errorFieldId && <span style={{ color: cl.dm, fontWeight: 400, fontSize: 12, marginLeft: 6 }}>{t.jump}</span>}
        </button>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button type="button" onClick={onBack} style={{ padding: "14px 20px", background: "transparent", color: cl.tx, border: `1px solid ${cl.bd}`, borderRadius: 999, fontSize: 14.5, fontWeight: 600, fontFamily: F.sans, cursor: "pointer" }}>
          {t.back}
        </button>
        <button type="button" onClick={onNext} style={{ flex: 1, padding: "14px 22px", background: cl.ac, color: "#fff", border: "none", borderRadius: 999, fontSize: 15, fontWeight: 700, fontFamily: F.sans, cursor: "pointer", boxShadow: "0 10px 24px rgba(196,148,74,.24)" }}>
          {t.toReview}
        </button>
      </div>
    </section>
  );
}

/* ── Review ──────────────────────────────────────────────────────── */
function ReviewStep({ cl, lang, answers, blocks, onBack, onSubmit, submitting, error }: any) {
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
      <button type="button" onClick={onBack} style={{ background: "transparent", border: "none", color: cl.dm, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 12 }}>
        {lang === "fr" ? "← Modifier mes réponses" : "← Edit my answers"}
      </button>
      <h1 style={{ fontFamily: F.serif, fontSize: "clamp(24px, 3.4vw, 33px)", fontWeight: 700, color: cl.al, margin: "0 0 8px", lineHeight: 1.15 }}>
        {lang === "fr" ? "Dernière vérification avant le calcul" : "Final review before calculation"}
      </h1>
      <p style={{ fontSize: 14.5, color: cl.dm, marginBottom: 22, lineHeight: 1.55 }}>
        {lang === "fr"
          ? `Vérifiez ces ${totalFields} réponses. Après paiement, votre rapport est généré en 30 secondes et livré par courriel.`
          : `Review these ${totalFields} answers. After payment, your report is generated in 30 seconds and delivered by email.`}
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {blocks.map((b: any) => (
          <details key={b.id} open style={{ background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 12, padding: "14px 18px", boxShadow: cl.shadow }}>
            <summary style={{ fontSize: 14.5, fontWeight: 700, color: cl.al, cursor: "pointer", listStyle: "none", fontFamily: F.serif }}>
              {lang === "fr" ? b.titleFr : b.titleEn}{" "}
              <span style={{ fontSize: 11, color: cl.dm, fontWeight: 400, fontFamily: F.sans }}>({b.fields.length} {lang === "fr" ? "champs" : "fields"})</span>
            </summary>
            <table style={{ width: "100%", marginTop: 12, fontSize: 13, borderCollapse: "collapse" }}>
              <tbody>
                {b.fields.map((f: any) => (
                  <tr key={f.id} style={{ borderBottom: `1px solid ${cl.bd}` }}>
                    <td style={{ padding: "7px 8px 7px 0", color: cl.dm, width: "60%" }}>{lang === "fr" ? f.labelFr : f.labelEn}</td>
                    <td style={{ padding: "7px 0", color: cl.al, fontWeight: 600, textAlign: "right", fontFamily: F.mono }}>{fmt(answers[f.id], f)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </div>
      {error && (
        <div style={{ background: cl.rd + "14", border: `1px solid ${cl.rd}`, color: cl.rd, padding: "11px 14px", borderRadius: 8, fontSize: 13, marginTop: 14 }}>
          {error}
        </div>
      )}
      <div style={{ marginTop: 20, padding: "16px 18px", background: cl.goldBg, border: `1px solid ${cl.ac}`, borderRadius: 10, fontSize: 13, color: cl.tx, lineHeight: 1.55 }}>
        <strong style={{ color: cl.al }}>{lang === "fr" ? "Ce que vous allez recevoir" : "What you'll receive"}</strong>
        <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
          <li>{lang === "fr" ? "1 rapport HTML interactif personnalisé" : "1 interactive personalized HTML report"}</li>
          <li>{lang === "fr" ? "Narration IA Opus (analyse de vos chiffres)" : "Opus AI narration (analysis of your numbers)"}</li>
          <li>{lang === "fr" ? "Plan testé contre krach, inflation, longévité extrême" : "Plan stress-tested against crash, inflation, extreme longevity"}</li>
          <li>{lang === "fr" ? "Livré par courriel après paiement (~30 secondes)" : "Delivered by email after payment (~30 seconds)"}</li>
        </ul>
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        style={{
          marginTop: 18, width: "100%", padding: "16px 24px",
          background: cl.ac, color: "#fff", border: "none", borderRadius: 999,
          fontSize: 15, fontWeight: 700, fontFamily: F.sans, cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.7 : 1, boxShadow: "0 12px 28px rgba(196,148,74,.26)",
        }}
      >
        {submitting
          ? (lang === "fr" ? "Redirection vers le paiement…" : "Redirecting to payment…")
          : (lang === "fr" ? "Confirmer et payer 29,99 $ →" : "Confirm and pay $29.99 →")}
      </button>
    </section>
  );
}

/**
 * Drop internal "__email", "__terms", etc. UI-only keys before persisting
 * to KV. The server-side wizard draft only carries Mode 1/2/3 answers.
 */
function stripInternalKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) if (!k.startsWith("__")) out[k] = obj[k];
  return out;
}

function WizardInner() {
  const params = useSearchParams();
  useEditorialBody(); // opt the document body into the editorial system (paper bg, Inter/Playfair)
  const [lang, setLang] = useState<"fr" | "en">("fr");
  useEffect(() => {
    try {
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
    } catch {}
    trackEvent(EVENTS.WIZARD_STARTED, {});
  }, [params]);
  const cl = editorialCL();
  const t = lang === "fr" ? COPY.fr : COPY.en;

  const [step, setStep] = useState<"mode1" | "mode2" | "review">("mode1");
  const [m2i, setM2i] = useState(0); // sub-index within Mode 2: 0..N-1 = blocks, N = contact step
  const [profile, setProfile] = useState<Mode1Profile>(MODE1_DEFAULT);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [errorFieldId, setErrorFieldId] = useState<string | null>(null);

  // Two-tier persistence (Phase 2.1, 2026-05-01):
  //   localStorage (WIZARD_KEY)   = 5-min working copy for instant offline resilience.
  //   KV via /api/wizard/save     = server-canonical 90-day draft (locked decisions #2 + #4).
  //                                  draftId stored in localStorage as the access token.
  // On mount we prefer the KV draft (newer, auth'd) and fall back to localStorage.
  const WIZARD_KEY = "buildfi_wizard_v2";
  const DRAFT_ID_KEY = "buildfi_wizard_draft_id";
  const WIZARD_TTL_MS = 5 * 60 * 1000;        // localStorage TTL: 5 min only
  const SAVE_DEBOUNCE_MS = 1500;
  const [draftId, setDraftId] = useState<string | null>(null);

  // Load: try KV first via stored draftId, fall back to localStorage.
  useEffect(() => {
    try {
      const storedId = localStorage.getItem(DRAFT_ID_KEY);
      if (storedId) {
        fetch(`/api/wizard/load?draftId=${encodeURIComponent(storedId)}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.ok && data.draft) {
              setDraftId(storedId);
              if (data.draft.mode1) setProfile((p: Mode1Profile) => ({ ...p, ...data.draft.mode1 }));
              if (data.draft.mode2) setAnswers((a: Record<string, unknown>) => ({ ...a, ...data.draft.mode2 }));
            } else {
              // Stale draftId (KV expired). Drop it and fall through to localStorage.
              localStorage.removeItem(DRAFT_ID_KEY);
              loadFromLocalStorage();
            }
          })
          .catch(() => loadFromLocalStorage());
      } else {
        loadFromLocalStorage();
      }
    } catch { loadFromLocalStorage(); }

    function loadFromLocalStorage() {
      try {
        const saved = localStorage.getItem(WIZARD_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.savedAt && Date.now() - parsed.savedAt < WIZARD_TTL_MS) {
            if (parsed.profile) setProfile(parsed.profile);
            if (parsed.answers) setAnswers(parsed.answers);
            if (parsed.step) setStep(parsed.step);
            if (typeof parsed.m2i === "number") setM2i(parsed.m2i);
          } else {
            localStorage.removeItem(WIZARD_KEY);
          }
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // localStorage write (instant, every change).
  useEffect(() => {
    try {
      localStorage.setItem(WIZARD_KEY, JSON.stringify({ profile, answers, step, m2i, savedAt: Date.now() }));
    } catch {}
  }, [profile, answers, step, m2i]);

  // KV save (debounced 1.5 s after last change). Skips empty mode1 to avoid
  // creating drafts before the user actually answers anything.
  useEffect(() => {
    if (!profile.phase) return; // Wait for first real Mode 1 answer.
    const timer = setTimeout(() => {
      const body = {
        v: 1,
        draftId: draftId ?? undefined,
        mode1: profile,
        mode2: stripInternalKeys(answers),
        sku: "bilan360" as const,
        lang,
      };
      fetch("/api/wizard/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.draftId) {
            if (data.draftId !== draftId) {
              setDraftId(data.draftId);
              try { localStorage.setItem(DRAFT_ID_KEY, data.draftId); } catch {}
            }
          }
        })
        .catch(() => { /* silent — localStorage is the fallback */ });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, answers, draftId, lang]);

  const blocks = useMemo(() => filterBlocksForProfile(profile), [profile]);
  const N = blocks.length;
  const safeM2i = Math.min(m2i, N);
  const totalFields = useMemo(() => blocks.reduce((s, b) => s + b.fields.length, 0), [blocks]);
  const totalSteps = N + 3; // mode1 + (N blocks + contact) + review

  // Per-step validation (the current section only). validateAll() below stays
  // as the defensive guard before submit — same field checks as before.
  const isNumeric = (ty: string) => ty === "number" || ty === "age" || ty === "currency" || ty === "percent";
  const validateFields = (fields: WizardField[]): boolean => {
    setError(""); setErrorFieldId(null);
    for (const f of fields) {
      const v = answers[f.id];
      if (f.required && (v === "" || v == null)) {
        setError(`${t.errorRequired} — ${lang === "fr" ? f.labelFr : f.labelEn}`);
        setErrorFieldId(f.id);
        return false;
      }
      if (v !== "" && v != null && isNumeric(f.type)) {
        const n = Number(v);
        if (!Number.isFinite(n)) { setError((lang === "fr" ? "Valeur invalide : " : "Invalid value: ") + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
        if (f.min != null && n < f.min) { setError((lang === "fr" ? `Minimum ${f.min} : ` : `Minimum ${f.min}: `) + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
        if (f.max != null && n > f.max) { setError((lang === "fr" ? `Maximum ${f.max} : ` : `Maximum ${f.max}: `) + (lang === "fr" ? f.labelFr : f.labelEn)); setErrorFieldId(f.id); return false; }
      }
    }
    return true;
  };

  const validateContact = (): boolean => {
    setError(""); setErrorFieldId(null);
    const emailOK = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((answers.__email || "").trim());
    if (!emailOK) { setError(t.errorEmail); setErrorFieldId("__email"); return false; }
    if (!answers.__terms) { setError(t.errorTerms); return false; }
    if (!answers.__consent) { setError(t.errorConsent); setErrorFieldId("__consent"); return false; }
    return true;
  };

  // Full validation — defensive backstop before submit (unchanged semantics).
  const validateAll = (): boolean => {
    if (!validateContact()) return false;
    for (const b of blocks) {
      if (!validateFields(b.fields)) return false;
    }
    return true;
  };

  const submit = async () => {
    // Re-validate defensively (each step already validated before navigating here)
    if (!validateAll()) { setStep("mode2"); return; }
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
      const betaCode = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("beta") || undefined) : undefined;
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
          ...(betaCode ? { betaCode } : {}),
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

  // Progress label + global step index for the bar.
  let current = 0;
  let label = t.targeting;
  if (step === "mode1") { current = 0; label = t.targeting; }
  else if (step === "mode2") {
    current = 1 + safeM2i;
    label = safeM2i < N ? (lang === "fr" ? blocks[safeM2i].titleFr : blocks[safeM2i].titleEn) : t.contactStep;
  } else { current = totalSteps - 1; label = t.reviewStep; }

  const pill = (active: boolean): React.CSSProperties => ({
    fontFamily: F.mono, fontSize: 12, fontWeight: 700, letterSpacing: ".04em",
    padding: "5px 12px", borderRadius: 999, border: "none", cursor: "pointer",
    background: active ? cl.ac : "transparent", color: active ? "#fff" : cl.dm,
  });

  return (
    <div suppressHydrationWarning style={{ background: cl.bg, minHeight: "100vh", color: cl.tx, fontFamily: F.sans }}>
      {/* Editorial chrome — publication-style header with language pill */}
      <header style={{ background: cl.bg, borderBottom: `1px solid ${cl.bd}`, padding: "16px 0" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a href={`/${lang === "en" ? "?lang=en" : ""}`} style={{ textDecoration: "none", display: "inline-flex" }} aria-label="BuildFi">
            <BuildFiLogo system="editorial" size="sm" accent={cl.ac} />
          </a>
          <div style={{ display: "flex", gap: 4, background: cl.cd, border: `1px solid ${cl.bd}`, borderRadius: 999, padding: 3 }}>
            <button type="button" onClick={() => setLang("fr")} style={pill(lang === "fr")}>FR</button>
            <button type="button" onClick={() => setLang("en")} style={pill(lang === "en")}>EN</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>
        <TrustStrip cl={cl} lang={lang} />
        <ProgressBar cl={cl} current={current} total={totalSteps} label={label} lang={lang} />

        {step === "mode1" ? (
          <Mode1Step
            cl={cl}
            lang={lang}
            profile={profile}
            setProfile={setProfile}
            onNext={() => {
              trackEvent(EVENTS.WIZARD_MODE1_COMPLETED, { profile });
              setM2i(0);
              setError("");
              setErrorFieldId(null);
              setStep("mode2");
            }}
          />
        ) : step === "mode2" ? (
          safeM2i < N ? (
            <Mode2BlockStep
              cl={cl}
              lang={lang}
              block={blocks[safeM2i]}
              index={safeM2i}
              total={N}
              answers={answers}
              setAnswers={setAnswers}
              intro={t.mode2Intro.replace("{count}", String(totalFields))}
              error={error}
              errorFieldId={errorFieldId}
              onBack={() => {
                setError(""); setErrorFieldId(null);
                if (safeM2i === 0) setStep("mode1"); else setM2i(safeM2i - 1);
              }}
              onNext={() => {
                if (validateFields(blocks[safeM2i].fields)) {
                  setM2i(safeM2i + 1);
                } else {
                  trackEvent(EVENTS.WIZARD_VALIDATION_ERROR, { fieldId: errorFieldId });
                }
              }}
            />
          ) : (
            <Mode2ContactStep
              cl={cl}
              lang={lang}
              stepNo={N + 1}
              total={N + 1}
              answers={answers}
              setAnswers={setAnswers}
              error={error}
              errorFieldId={errorFieldId}
              onBack={() => { setError(""); setErrorFieldId(null); setM2i(N - 1 < 0 ? 0 : N - 1); }}
              onNext={() => {
                if (validateContact()) {
                  trackEvent(EVENTS.WIZARD_REVIEW_REACHED, { totalFields });
                  setStep("review");
                } else {
                  trackEvent(EVENTS.WIZARD_VALIDATION_ERROR, { fieldId: errorFieldId });
                }
              }}
            />
          )
        ) : (
          <ReviewStep
            cl={cl}
            lang={lang}
            answers={answers}
            blocks={blocks}
            onBack={() => { setError(""); setErrorFieldId(null); setStep("mode2"); setM2i(N); }}
            onSubmit={submit}
            submitting={submitting}
            error={error}
          />
        )}
      </main>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: getEditorialPalette().bg }} />}>
      <WizardInner />
    </Suspense>
  );
}
