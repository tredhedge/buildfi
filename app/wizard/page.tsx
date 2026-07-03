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
import { THEME_STORAGE_KEY } from "@/lib/design/product.tokens";
import "./wizard.css";

/* Bilan 360 wizard — ported onto the Planner longform design (navy + gold,
   Plus Jakarta Sans). All visual styling lives in ./wizard.css scoped under
   `.bf-wiz`. The state machine, validation, KV persistence, and checkout
   submit are unchanged — only the presentation moved off the editorial system.
   The wizard keeps its Mode 1 classifier → one-section-per-screen Mode 2 flow. */

// Loi 25 / LPRPDE — same constant the server enforces (lib/consent-version.ts).
import { CURRENT_POLICY_VERSION as CLIENT_POLICY_VERSION } from "@/lib/consent-version";

const COPY = {
  fr: {
    mode1Title: "D'abord, aidez-nous à cibler le questionnaire",
    mode1Note: "Ces questions décident quelles sections détaillées nous vous poserons ensuite — vous ne verrez que ce qui s'applique à vous.",
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
    consentLabel: "J'autorise BuildFi à traiter mes données financières pour générer mon rapport. Conservation : 30 jours après la livraison. Suppression sur demande.",
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
    plannerNote: "Société par actions (CCPC), capital-investissement et métaux précieux sont modélisés dans le Planner.",
    trust: [
      "Sans abonnement — paiement unique",
      "Environ 5 minutes",
      "Sans création de compte",
      "13 provinces et territoires",
    ],
  },
  en: {
    mode1Title: "First, help us tailor the questionnaire",
    mode1Note: "These questions decide which detailed sections we'll ask you next — you only see what applies to you.",
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
    consentLabel: "I authorize BuildFi to process my financial data to generate my report. Retention: 30 days after delivery. Deletion on request.",
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
    plannerNote: "Incorporated business (CCPC), private equity and precious metals are modeled in the Planner.",
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

function CheckIcon() {
  return (
    <svg className="i" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m2.5 8.5 3.5 3.5 7.5-8" />
    </svg>
  );
}

/* ── Numeric field (currency / number / age / percent) ──────────────
   Keeps a local raw-string for display (thousands grouping on currency,
   free decimal entry on percent) while pushing a Number to `answers`. */
function NumericField({
  f, value, onChange, lang,
}: {
  f: WizardField;
  value: any;
  onChange: (v: any) => void;
  lang: "fr" | "en";
}) {
  const isPercent = f.type === "percent";
  const isCurrency = f.type === "currency";
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

  // Plain number / age — no affix.
  if (!isCurrency && !isPercent) {
    return (
      <input
        id={`f-${f.id}`}
        type="text"
        inputMode="numeric"
        className="field-input"
        value={raw}
        onChange={(e) => handle(e.target.value)}
        placeholder={f.placeholder || (f.type === "age" ? "" : "0")}
      />
    );
  }

  // Currency ($ leading) / percent (% trailing) — affix group.
  return (
    <div className="num-group">
      {isCurrency && <span className="affix">$</span>}
      <input
        id={`f-${f.id}`}
        type="text"
        inputMode={isPercent ? "decimal" : "numeric"}
        value={raw}
        onChange={(e) => handle(e.target.value)}
        placeholder={f.placeholder || (f.type === "age" ? "" : "0")}
      />
      {isPercent && <span className="affix">%</span>}
    </div>
  );
}

/* Dispatch a single field to its control (choice / bool / numeric). */
function FieldControl({
  f, answers, setAnswers, lang, t,
}: {
  f: WizardField;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
  lang: "fr" | "en";
  t: typeof COPY.fr;
}) {
  const val = answers[f.id] ?? "";
  const update = (v: any) => setAnswers({ ...answers, [f.id]: v });

  if (f.type === "choice" && f.options) {
    // ≤4 options → pills (longform look); more → select.
    if (f.options.length <= 4) {
      return (
        <div className="pill-group stack">
          {f.options.map((o, i) => {
            const selected = String(val) === String(o.value);
            return (
              <button
                key={i}
                type="button"
                id={i === 0 ? `f-${f.id}` : undefined}
                className={`pill${selected ? " on" : ""}`}
                onClick={() => update(o.value)}
              >
                {lang === "fr" ? o.labelFr : o.labelEn}
              </button>
            );
          })}
        </div>
      );
    }
    return (
      <select
        id={`f-${f.id}`}
        className="field-input"
        value={val}
        onChange={(e) => update(e.target.value)}
      >
        <option value="">—</option>
        {f.options.map((o, i) => (
          <option key={i} value={String(o.value)}>{lang === "fr" ? o.labelFr : o.labelEn}</option>
        ))}
      </select>
    );
  }

  if (f.type === "multi" && f.options) {
    const arr: any[] = Array.isArray(val) ? val : [];
    const toggle = (v: any) => {
      const has = arr.some((x) => String(x) === String(v));
      update(has ? arr.filter((x) => String(x) !== String(v)) : [...arr, v]);
    };
    return (
      <div className="pill-group stack">
        {f.options.map((o, i) => {
          const on = arr.some((x) => String(x) === String(o.value));
          return (
            <button
              key={i}
              type="button"
              id={i === 0 ? `f-${f.id}` : undefined}
              className={`pill${on ? " on" : ""}`}
              onClick={() => toggle(o.value)}
            >
              {lang === "fr" ? o.labelFr : o.labelEn}
            </button>
          );
        })}
      </div>
    );
  }

  if (f.type === "bool") {
    return (
      <div className="pill-group">
        {[true, false].map((v, i) => (
          <button
            key={String(v)}
            type="button"
            id={i === 0 ? `f-${f.id}` : undefined}
            className={`pill${val === v ? " on" : ""}`}
            onClick={() => update(v)}
          >
            {v ? t.yes : t.no}
          </button>
        ))}
      </div>
    );
  }

  return <NumericField f={f} value={val} onChange={update} lang={lang} />;
}

/* Field label row (label + required/optional + optional tooltip). */
function FieldLabel({ f, lang, t }: { f: WizardField; lang: "fr" | "en"; t: typeof COPY.fr }) {
  const help = lang === "fr" ? f.helpFr : f.helpEn;
  return (
    <div className="field-head">
      <label className="field-label" htmlFor={`f-${f.id}`}>{lang === "fr" ? f.labelFr : f.labelEn}</label>
      {f.required && <span className="field-req">{t.required}</span>}
      {help && (
        <span className="tip-wrap">
          <span className="tip-trigger" tabIndex={0}>i</span>
          <span className="tip-body">{help}</span>
        </span>
      )}
    </div>
  );
}

/* ── Mode 1 — classifier ─────────────────────────────────────────── */
function Mode1Step({ lang, profile, setProfile, onNext }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const canContinue = profile.phase !== undefined;

  const renderQuestion = (q: Mode1Question) => {
    const current = profile[q.id];
    if (q.type === "bool") {
      return (
        <div className="pill-group">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" className={`pill${current === v ? " on" : ""}`} onClick={() => setProfile({ ...profile, [q.id]: v })}>
              {v ? t.yes : t.no}
            </button>
          ))}
        </div>
      );
    }
    if (q.type === "choice" && q.options) {
      return (
        <div className="pill-group stack">
          {q.options.map((o, i) => (
            <button key={i} type="button" className={`pill${current === o.value ? " on" : ""}`} onClick={() => setProfile({ ...profile, [q.id]: o.value })}>
              {lang === "fr" ? o.labelFr : o.labelEn}
            </button>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <section>
      <div className="eyebrow">{t.targeting}</div>
      <h1 className="wiz-title">{t.mode1Title}</h1>
      <p className="wiz-sub">{t.mode1Note}</p>
      <div style={{ display: "grid", gap: 12 }}>
        {MODE1_QUESTIONS.map((q, i) => (
          <div key={q.id} className="wiz-card" style={{ marginTop: 0, padding: "16px 18px" }}>
            <div className="field-head" style={{ marginBottom: 10 }}>
              <span className="eyebrow" style={{ margin: 0 }}>Q{i + 1}</span>
              <label className="field-label" style={{ fontSize: "var(--fs-lg)" }}>{lang === "fr" ? q.labelFr : q.labelEn}</label>
            </div>
            {(q.helpFr || q.helpEn) && (
              <div className="field-help" style={{ marginBottom: 10 }}>{lang === "fr" ? q.helpFr : q.helpEn}</div>
            )}
            {renderQuestion(q)}
          </div>
        ))}
      </div>
      <div className="callout tip" style={{ marginTop: 16 }}>
        <CheckIcon />
        <span>{t.plannerNote}</span>
      </div>
      <div className="wiz-nav">
        <button type="button" className="wiz-cta" onClick={onNext} disabled={!canContinue}>{t.mode1Continue}</button>
      </div>
    </section>
  );
}

/* ── Progress bar — spans the whole journey, total adjusts to profile ─ */
function ProgressBar({ current, total }: any) {
  const pct = Math.round(((current + 1) / total) * 100);
  return (
    <div className="wiz-prog">
      <div className="pr-bar"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/* ── Trust strip — carries the landing's reassurances into the funnel.
   Deliberately omits any data-storage claim (open legal decision). ────── */
function TrustStrip({ lang }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  return (
    <div className="wiz-trust">
      {t.trust.map((item, i) => (
        <div key={i} className="trust-item"><CheckIcon /><span>{item}</span></div>
      ))}
    </div>
  );
}

/* ── Error chip ──────────────────────────────────────────────────── */
function ErrorChip({ error, errorFieldId, onJump, t }: any) {
  if (!error) return null;
  return (
    <button type="button" className="wiz-error" onClick={() => errorFieldId && onJump(errorFieldId)}>
      {error}{errorFieldId && <span className="jump">{t.jump}</span>}
    </button>
  );
}

function focusField(fieldId: string) {
  const el = document.getElementById(`f-${fieldId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => (el as HTMLElement).focus({ preventScroll: true }), 300);
}

/* ── Mode 2 — one block (section) per step ───────────────────────── */
function Mode2BlockStep({ lang, block, index, total, answers, setAnswers, intro, onBack, onNext, error, errorFieldId }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  return (
    <section>
      <div className="eyebrow">{t.sectionOf.replace("{i}", String(index + 1)).replace("{n}", String(total))}</div>
      <h1 className="wiz-title">{lang === "fr" ? block.titleFr : block.titleEn}</h1>
      {(block.descFr || block.descEn) && (
        <p className="wiz-sub" style={{ fontSize: "var(--fs-md)", marginBottom: 0 }}>{lang === "fr" ? block.descFr : block.descEn}</p>
      )}
      {index === 0 && intro && (
        <div className="callout gold" style={{ marginTop: 12 }}><span>{intro}</span></div>
      )}

      <div className="wiz-card">
        <div className="field-grid">
          {block.fields.map((f: WizardField) => (
            <div className="field" key={f.id}>
              <FieldLabel f={f} lang={lang} t={t} />
              <FieldControl f={f} answers={answers} setAnswers={setAnswers} lang={lang} t={t} />
            </div>
          ))}
        </div>
      </div>

      <ErrorChip error={error} errorFieldId={errorFieldId} onJump={focusField} t={t} />

      <div className="wiz-nav">
        <button type="button" className="btn btn-ghost" onClick={onBack}>{t.back}</button>
        <button type="button" className="wiz-cta" onClick={onNext}>{t.continue}</button>
      </div>
    </section>
  );
}

/* ── Mode 2 — final step: email + consents ───────────────────────── */
function Mode2ContactStep({ lang, stepNo, total, answers, setAnswers, onBack, onNext, error, errorFieldId }: any) {
  const t = lang === "fr" ? COPY.fr : COPY.en;
  const [email, setEmail] = useState(answers.__email || "");
  const [terms, setTerms] = useState(answers.__terms || false);
  const [consent, setConsent] = useState(answers.__consent || false);

  useEffect(() => {
    setAnswers({ ...answers, __email: email, __terms: terms, __consent: consent });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, terms, consent]);

  return (
    <section>
      <div className="eyebrow">{t.sectionOf.replace("{i}", String(stepNo)).replace("{n}", String(total))}</div>
      <h1 className="wiz-title">{t.contactStep}</h1>

      <div className="wiz-card">
        <div className="field">
          <div className="field-head">
            <label className="field-label" htmlFor="f-__email">{t.emailLabel}</label>
            <span className="field-req">{t.required}</span>
          </div>
          <input
            id="f-__email"
            type="email"
            className="field-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t.emailPlaceholder}
          />
          <div className="field-help">{t.emailNote}</div>
        </div>

        <div style={{ height: 14 }} />

        <label className="check-row">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span className="check-label">
            {t.termsLabel} <a href="/conditions" target="_blank" rel="noopener">{t.termsLink}</a> {t.andAvis}
            <a href="/avis-legal" target="_blank" rel="noopener">{t.avisLink}</a>.
          </span>
        </label>

        <div style={{ height: 10 }} />

        {/* Loi 25 / LPRPDE consent — required for the server to record a versioned consent receipt */}
        <label className="check-row">
          <input id="f-__consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span className="check-label">
            {t.consentLabel}{" "}
            <a href="/confidentialite" target="_blank" rel="noopener">{t.consentLink}</a>.
          </span>
        </label>
      </div>

      <ErrorChip error={error} errorFieldId={errorFieldId} onJump={focusField} t={t} />

      <div className="wiz-nav">
        <button type="button" className="btn btn-ghost" onClick={onBack}>{t.back}</button>
        <button type="button" className="wiz-cta" onClick={onNext}>{t.toReview}</button>
      </div>
    </section>
  );
}

/* ── Review ──────────────────────────────────────────────────────── */
function ReviewStep({ lang, answers, setAnswers, blocks, onBack, onSubmit, submitting, error, t }: any) {
  return (
    <section>
      <button type="button" className="btn-link" onClick={onBack} style={{ marginBottom: 12 }}>
        {lang === "fr" ? "← Retour" : "← Back"}
      </button>
      <h1 className="wiz-title">{lang === "fr" ? "Vérifiez et ajustez vos réponses" : "Review and adjust your answers"}</h1>
      <p className="wiz-sub" style={{ fontSize: "var(--fs-md)" }}>
        {lang === "fr"
          ? "Modifiez n'importe quelle réponse directement ici. Après paiement, votre rapport est généré et livré par courriel en quelques minutes."
          : "Edit any answer directly here. After payment, your report is generated and delivered by email within a few minutes."}
      </p>
      <div>
        {blocks.map((b: any) => (
          <details key={b.id} className="rev-card" open>
            <summary>
              {lang === "fr" ? b.titleFr : b.titleEn}{" "}
              <span className="rev-count">({b.fields.length} {lang === "fr" ? "champs" : "fields"})</span>
            </summary>
            <div className="field-grid" style={{ marginTop: 14 }}>
              {b.fields.map((f: WizardField) => (
                <div className="field" key={f.id}>
                  <FieldLabel f={f} lang={lang} t={t} />
                  <FieldControl f={f} answers={answers} setAnswers={setAnswers} lang={lang} t={t} />
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      {error && (
        <div className="wiz-error" style={{ cursor: "default" }}>{error}</div>
      )}

      <div className="callout gold" style={{ marginTop: 18 }}>
        <div>
          <strong>{lang === "fr" ? "Ce que vous allez recevoir" : "What you'll receive"}</strong>
          <ul>
            <li>{lang === "fr" ? "1 rapport HTML interactif personnalisé" : "1 interactive personalized HTML report"}</li>
            <li>{lang === "fr" ? "Narration IA Opus (analyse de vos chiffres)" : "Opus AI narration (analysis of your numbers)"}</li>
            <li>{lang === "fr" ? "Plan testé contre krach, inflation, longévité extrême" : "Plan stress-tested against crash, inflation, extreme longevity"}</li>
            <li>{lang === "fr" ? "Livré par courriel après paiement (quelques minutes)" : "Delivered by email after payment (a few minutes)"}</li>
          </ul>
        </div>
      </div>

      <div className="wiz-nav">
        <button type="button" className="wiz-cta" onClick={onSubmit} disabled={submitting}>
          {submitting
            ? (lang === "fr" ? "Redirection vers le paiement…" : "Redirecting to payment…")
            : (lang === "fr" ? "Confirmer et payer 29,99 $ →" : "Confirm and pay $29.99 →")}
        </button>
      </div>
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
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Portfolio-wide theme persistence (same key as landing + tools).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "dark" || saved === "light") setTheme(saved);
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem(THEME_STORAGE_KEY, theme); } catch {} }, [theme]);

  // Match the page background to the themed shell (avoids white flash / overscroll edge).
  useEffect(() => {
    const prevBg = document.body.style.background;
    const prevColor = document.body.style.color;
    document.body.style.background = theme === "light" ? "#f5f6fa" : "#0f1520";
    document.body.style.color = theme === "light" ? "#182236" : "#edf2fb";
    return () => { document.body.style.background = prevBg; document.body.style.color = prevColor; };
  }, [theme]);

  useEffect(() => {
    try {
      const p = params?.get("lang");
      if (p === "en" || p === "fr") setLang(p);
      const th = params?.get("theme");
      if (th === "light" || th === "dark") setTheme(th);
    } catch {}
    trackEvent(EVENTS.WIZARD_STARTED, {});
  }, [params]);
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

  // KV save (debounced 1.5 s after last change). Skips empty mode1.
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
    if (!validateAll()) { setStep("mode2"); return; }
    const activeIds = new Set<string>();
    for (const b of blocks) for (const f of b.fields) activeIds.add(f.id);
    trackEvent(EVENTS.CHECKOUT_INITIATED, { tier: "bilan360", fieldCount: activeIds.size });
    setSubmitting(true);
    try {
      const wizardAnswers: Record<string, unknown> = { __profile: profile };
      for (const key of Object.keys(answers)) {
        if (key.startsWith("__")) continue; // internal (email, terms)
        if (activeIds.has(key)) wizardAnswers[key] = answers[key];
      }
      const qs = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const betaCode = qs?.get("beta") || undefined;
      // Second Bilan 360 at 50% off (SECOND50): merci/feedback pages link here with
      // ?second=1. The discount is a distinct checkout type gated server-side on the
      // customer having rated their first report (couponUnlocked). Replaces the retired
      // quiz-360.html path, which ignored ?second=1 and silently charged full price.
      const isSecond = qs?.get("second") === "1";
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: answers.__email.trim(),
          ...(isSecond
            ? { type: "second", originalTier: "bilan360" }
            : { type: "report", tier: "bilan360" }),
          quizAnswers: wizardAnswers,
          lang,
          termsAccepted: true,
          ...(betaCode ? { betaCode } : {}),
          consent: {
            policyVersion: CLIENT_POLICY_VERSION,
            acceptedAt: new Date().toISOString(),
          },
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.url) {
        // Second-report discount not yet unlocked → the customer must rate their
        // first report. Surface the bilingual server message and route to feedback.
        if (data.error === "second_report_not_unlocked") {
          setError(data.message || t.errorGeneric);
          if (data.feedbackToken) {
            window.location.href = `/feedback/${data.feedbackToken}`;
            return;
          }
        } else {
          setError(data.error || t.errorGeneric);
        }
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

  return (
    <div className="bf-wiz" data-theme={theme} suppressHydrationWarning>
      <div className="wiz-shell">
        <header className="wiz-hdr">
          <a className="brand-logo" href={`/${lang === "en" ? "?lang=en" : ""}`} aria-label="BuildFi">BuildFi</a>
          <div className="hdr-tools">
            <button
              type="button"
              className="theme-btn"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark"
                ? (lang === "fr" ? "Passer au thème clair" : "Switch to light theme")
                : (lang === "fr" ? "Passer au thème sombre" : "Switch to dark theme")}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
                </svg>
              )}
            </button>
            <div className="seg">
              <button type="button" className={lang === "fr" ? "on" : ""} onClick={() => setLang("fr")}>FR</button>
              <button type="button" className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
            </div>
          </div>
        </header>

        <main>
          <TrustStrip lang={lang} />
          <ProgressBar current={current} total={totalSteps} label={label} lang={lang} />

          {step === "mode1" ? (
            <Mode1Step
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
              lang={lang}
              answers={answers}
              setAnswers={setAnswers}
              blocks={blocks}
              t={t}
              onBack={() => { setError(""); setErrorFieldId(null); setStep("mode2"); setM2i(N); }}
              onSubmit={submit}
              submitting={submitting}
              error={error}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={<div className="bf-wiz" style={{ minHeight: "100vh" }} />}>
      <WizardInner />
    </Suspense>
  );
}
