// /lib/report-html-360.js
/* eslint-disable */
// @ts-nocheck
import { buildStarRatingBlock } from "./feedback-stars";
import {
  getCanonicalEditorialBundleCSS,
  getEditorialFontBootstrapLink,
} from "./report-canonical-css";
// Number factory (2026-07-02 SSOT consolidation): every client-facing figure is
// computed ONCE in report-facts-360.js. This renderer only formats and lays out.
import { buildReportFacts360, fmtMoney360, fmtPct360 } from "./report-facts-360";

// Backward-compatible export — all callers (webhook, regenerate, export, ship-loop,
// tests) keep importing extractReportData360 from this module.
export const extractReportData360 = buildReportFacts360;

const REPORT_VERSION_360 = "dash-v3";

/*
  Plan v2.2 / Phase 4a (2026-04-29):
  Bilan 360 reports belong to the Editorial system. The previous renderer
  inlined an orphan palette (--bg / --card / --ink / --muted / --line /
  --gold / --blue) plus Avenir Next (Apple-only paid font) — both replaced
  by tokens injected via getCanonicalEditorialBundleCSS().
  Semantic chart palette aligned with EDITORIAL_CHART in editorial.tokens.ts.
*/
const RPT360_COLORS = {
  // Aligned with SEMANTIC.{green,blue,orange,red}Light from product.tokens.ts
  successGreen: "#2f8a4a",
  bandBlue: "#3b79b6",
  watchOrange: "#b5772f",
  dangerRed: "#b93f43",
  // Editorial canonical (matches editorial.tokens.ts)
  goldVar: "var(--bf-gold, #c4944a)",
  paperBg: "#faf7f1",
  panelBg: "#fffdf9",
  ink: "#1f2840",
  muted: "#5d6480",
  line: "#ddd1be",
  // Chart palette (matches EDITORIAL_CHART)
  chartP50: "#2F67A3",
  chartP25P75: "#7CA7D9",
  chartP5P95: "#9FC1E8",
  chartP5P95Bad: "#D78E8E",
  chartGov: "#2A8C46",
  chartWithdraw: "#c4944a",
  chartGridLine: "#ECE7DE",
  chartTickText: "#7B7267",
};

const n = (v, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const escHtml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
const f$ = (v, fr = true) => fmtMoney360(v, fr); // locale-correct (2026-07-02): FR "287 916 $" / EN "$287,916" — single source in report-facts-360.js
const fPct = (v, fr = true) => fmtPct360(v, fr); // FR "9,3 %" / EN "9.3%"

function gradeColor(g) {
  if (g === "A+" || g === "A") return RPT360_COLORS.successGreen;
  if (g === "B+" || g === "B") return RPT360_COLORS.bandBlue;
  if (g === "C+" || g === "C") return RPT360_COLORS.watchOrange;
  return RPT360_COLORS.dangerRed;
}
function gradeLabel(p, fr) {
  if (p >= 90) return fr ? "Très solide" : "Very strong";
  if (p >= 75) return fr ? "Solide" : "Solid";
  if (p >= 60) return fr ? "À surveiller" : "Needs monitoring";
  return fr ? "Fragile" : "Fragile";
}

function cleanAISlot(text, maxLen = 220) {
  if (typeof text !== "string") return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/[ÃÂ]|â[\u0080-\u00BF]/.test(t)) return "";
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1); const sp = cut.lastIndexOf(" "); return (sp > maxLen * 0.5 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

// ship-loop 2026-06-18: the narration uses **bold** for figures; the renderer escaped but never
// parsed it, so literal "**" shipped to clients. Parse after escaping; drop orphan ** from truncation.
function escBold(s) {
  return escHtml(String(s || "")).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*\*/g, "");
}
// Full (untruncated) bolded slot — used by the detailed-analysis section so the ~20 substantive
// narration slots the renderer used to DISCARD now actually reach the client.
function mdSlotFull(text) {
  const t = cleanAISlot(text, 100000);
  return t ? escBold(t) : "";
}

// Assessment fix A (2026-06-18): the narration sometimes points the client to charts/widgets
// the report does not render (only a wealth fan + an income chart exist). Strip any whole
// sentence that references a non-existent visualization so a paid deliverable never tells the
// reader to interact with something that isn't there. Bilingual, lang-agnostic (a phantom
// token is phantom in either language).
const _PHANTOM_CHART = /(tornado|tornade|spending[- ]smile|sourire des? d[ée]penses|graphique du sourire|interactive fee|fee[- ]impact chart|fee chart|graphique (interactif|de comparaison)? ?des frais|cinq niveaux de frais|five (fee|cost|different cost)\b[^.?!]*scenarios|cinq sc[ée]narios de co[uû]ts|interactive pills|pastilles interactives|pills let you|pastilles vous permettent|hover over|survol(er|ez)|toggle between|basculer entre|sensitivity ranking|analyse de sensibilit[ée]|classe les param[èe]tres|the pills\b|les pastilles)/i;
function stripPhantomCharts(text) {
  if (typeof text !== "string" || !text) return text;
  const sentences = text.split(/(?<=[.?!])\s+/);
  const kept = sentences.filter((s) => !_PHANTOM_CHART.test(s));
  const out = kept.join(" ").replace(/\s+/g, " ").trim();
  return out || text; // never blank a slot entirely
}
// Assessment fix F (2026-06-18): AI occasionally leaks a French stock phrase into an EN report.
// Translate the known stubs in-place (EN reports only) so no raw French ships to an EN client.
function fixLocaleStubs(text, fr) {
  if (typeof text !== "string" || !text || fr) return text;
  return text
    .replace(/Cette analyse sugg[èe]re(\s+que)?/gi, (m) => (/que\s*$/i.test(m) ? "This analysis suggests that" : "This analysis suggests"))
    .replace(/Les donn[ée]es indiquent(\s+que)?/gi, (m) => (/que\s*$/i.test(m) ? "The data indicate that" : "The data indicate"));
}
// Assessment fix E (2026-06-18): the couple fact line states the real income split, so any prose
// adjective asserting the incomes are equal/identical directly contradicts the adjacent figures.
// Neutralize the adjective deterministically (keeps "near-equal-age", only kills the income claim).
function neutralizeEqualityClaims(text) {
  if (typeof text !== "string" || !text) return text;
  return text
    .replace(/\b(equal|identical|equivalent)[- ]incomes\b/gi, "two-incomes")
    .replace(/\b(equal|identical|equivalent)[- ]income\b/gi, "two-income")
    .replace(/revenus\s+(identiques|égaux|équivalents|equivalents)/gi, "deux revenus");
}
function sanitizeProseSlots(ai, fr) {
  if (!ai || typeof ai !== "object") return ai;
  const out = {};
  for (const [k, v] of Object.entries(ai)) {
    out[k] = typeof v === "string" ? neutralizeEqualityClaims(fixLocaleStubs(stripPhantomCharts(v), fr)) : v;
  }
  return out;
}

function repairMojibake(s) {
  if (!s) return "";
  let out = String(s);
  const map = [["Ã©", "é"],["Ã¨", "è"],["Ãª", "ê"],["Ã«", "ë"],["Ã ", "à"],["Ã¢", "â"],["Ã®", "î"],["Ã´", "ô"],["Ã»", "û"],["Ã§", "ç"],["Ã‰", "É"],["Ã€", "À"],["Ã‚", "Â"],["â€™", "’"],["â€œ", "“"],["â€", "”"],["â€“", "–"],["â€”", "—"],["Â ", " "],["Â ", " "]];
  for (const [a, b] of map) out = out.split(a).join(b);
  return out.replace(/[\u00A0\u202F]/g, " ");
}

export function determinePhase(age, retAge) {
  const a = Math.round(n(age, 40));
  const r = Math.round(n(retAge, 65));
  if (a >= r) return "DECUM";
  if (r - a <= 7 && a >= 52) return "TRANSITION";
  return "ACCUM";
}

// 2026-05-14 Sprint B — per-section standfirst subtitles.
//
// One sentence beneath each section title that answers the section's decision
// question observationally, using real numbers from D. AMF-clean by
// construction: present-tense facts + conditional projections, no FORBIDDEN
// verbs. Caps at ~200 chars (the FT-standfirst sweet spot). When AI synthesis
// (Sprint D) ships, it can override these per section; the static version is
// always the floor.
function sectionHeadlines(D, fr, cpl = false) {
  const yrs = D.deathAge && D.retAge ? Math.max(0, D.deathAge - D.retAge) : 0;
  // "household" wording only for couples; a single person is not a "household".
  const govWho = cpl ? (fr ? "les revenus garantis du ménage" : "household guaranteed income") : (fr ? "vos revenus garantis" : "your guaranteed income");

  // Grade-anchored qualifier used in synthesis. Observational only — describes
  // the plan's POSITION, never directs an action.
  const robust = D.successPct >= 85
    ? (fr ? "une marge confortable" : "a comfortable margin")
    : D.successPct >= 70
    ? (fr ? "une trajectoire favorable mais sensible" : "a favorable but sensitive trajectory")
    : D.successPct >= 50
    ? (fr ? "des marges à surveiller" : "margins to monitor")
    : (fr ? "une fragilité structurelle" : "structural fragility");

  return {
    starting_point: fr
      ? `Grade ${D.grade} avec ${D.successPct}% de réussite — ${robust} compte tenu de vos ${yrs || "—"} années de retraite projetées.`
      : `Grade ${D.grade} with ${D.successPct}% success — ${robust} given your ${yrs || "—"} projected retirement years.`,
    endurance: fr
      ? `Sur les ${yrs || "—"} ans projetés, le patrimoine médian atteindrait ${f$(D.rMedF, true)}, en dollars réels d'aujourd'hui.`
      : `Over the ${yrs || "—"} projected years, median wealth would reach ${f$(D.rMedF, false)}, in today's real dollars.`,
    shocks: fr
      ? `Un scénario type 2008 ramènerait la réussite à ${D.stressCrashSucc ?? "—"}%, contre ${D.successPct}% en base.`
      : `A 2008-style scenario would bring success to ${D.stressCrashSucc ?? "—"}%, versus ${D.successPct}% baseline.`,
    // Assessment fix A (2026-06-19): never claim "target covered" on a failing plan (the gap reads
    // 0 only because spending was pinned to gov income), and only mention the pre-65 bridge when one
    // actually exists (retAge < 65) — an already-retired 67-year-old has no bridge.
    synthesis: (function () {
      const fails = (D.successPct || 0) < 25;
      const gap = (D.householdRetTargetMonthly || 0) - (D.retGovMonthly || 0);
      const hasBridge = (D.retAge || 65) < 65;
      const hasPen = Number(D.retPenMonthly) > 0; // DB pension flows pre-65 → it carries part of the bridge
      const bridgeFR = !hasBridge ? "" : (hasPen
        ? " (la rente d'employeur couvre une partie des années de pont avant 65 ans, le portefeuille comblant le reste)"
        : " (les années de pont avant 65 ans restent à financer par le portefeuille)");
      const bridgeEN = !hasBridge ? "" : (hasPen
        ? " (the employer pension covers part of the pre-65 bridge, with savings covering the remainder)"
        : " (the pre-65 bridge years must be funded from the portfolio)");
      if (fails) return fr
        ? `Le plan ne tient pas sur la durée : le capital s'épuiserait avant la fin de l'horizon${hasBridge ? " et la période avant 65 ans n'est pas entièrement financée" : ""}.`
        : `The plan does not hold over time: the capital would deplete before the end of the horizon${hasBridge ? ", and the pre-65 years are not fully funded" : ""}.`;
      if (gap > 0) return fr
        ? `Au régime permanent, un écart mensuel d'environ ${f$(Math.round(gap), true)} subsisterait; ${govWho} atteindraient ${f$(D.retGovMonthly || 0, true)}/mois${bridgeFR}.`
        : `At steady state, a monthly gap of about ${f$(Math.round(gap), false)} would remain; ${govWho} would reach ${f$(D.retGovMonthly || 0, false)}/mo${bridgeEN}.`;
      return fr
        ? `Au régime permanent, ${govWho} (environ ${f$(D.retGovMonthly || 0, true)}/mois) couvriraient l'essentiel de la cible${bridgeFR}.`
        : `At steady state, ${govWho} (about ${f$(D.retGovMonthly || 0, false)}/mo) would cover most of the target${bridgeEN}.`;
    })(),
    // Assessment fix D: drop the hard-coded "Three/Trois" count — the rendered card count varies
    // by phase (a spend-cut lever is suppressed for accumulators), so a fixed count mismatches.
    levers: fr
      ? `Leviers observables, triés par impact attendu sur la trajectoire.`
      : `Observable levers, sorted by expected impact on the trajectory.`,
  };
}

function buildActions(D, params, fr) {
  // ship-loop 2026-06-18: bodies are OBSERVATIONAL/CONDITIONAL (AMF) — no imperatives
  // ("Test"/"Sustain"/"Compare"/"Refresh" flagged in review). Titles are noun phrases,
  // not directives. Levers de-duped so the panel never repeats "Annual review".
  const out = [];
  // Only offer a spending-reduction lever when the plan actually needs it. Suggesting cuts on a
  // strong/passing plan (high success, no shortfall) is incoherent against the report's own conclusion.
  // Spending-reduction lever ONLY where spending is actually the lever — at/near retirement
  // (TRANSITION/DECUM). For accumulators the lever is contributions ("Savings cadence" below),
  // so offering a spend cut as a top lever contradicts the report's own thesis. Body is
  // qualitative: the old "15% of the gap" $/mo was an untraceable heuristic (flagged in review).
  if (D.gapMonthly > 0 && D.successPct < 85 && (D.phase === "TRANSITION" || D.phase === "DECUM"))
    out.push({ title: fr ? "Budget cible" : "Target budget", body: fr ? "Une baisse graduelle des dépenses prévues à la retraite pourrait être envisagée." : "A gradual reduction in planned retirement spending could be considered." });
  if ((D.phase === "TRANSITION" || D.phase === "DECUM") && (D.mc60Succ != null || D.mc65Succ != null || D.mc70Succ != null)) out.push({ title: fr ? "Timing RRQ/PSV" : "CPP/OAS timing", body: fr ? `Les taux de réussite à 60/65/70 seraient de ${D.mc60Succ ?? "—"}% / ${D.mc65Succ ?? "—"}% / ${D.mc70Succ ?? "—"}%.` : `Success rates at 60/65/70 would be ${D.mc60Succ ?? "—"}% / ${D.mc65Succ ?? "—"}% / ${D.mc70Succ ?? "—"}%.` });
  if (D.phase === "ACCUM" || D.phase === "TRANSITION") out.push({ title: fr ? "Cadence d'épargne" : "Savings cadence", body: fr ? "Une épargne soutenue ou accrue d'ici la retraite pourrait améliorer la trajectoire." : "Sustained or increased saving up to retirement could improve the trajectory." });
  if ((D.merWeighted ?? 0) > 0.005) out.push({ title: fr ? "Structure de frais" : "Fee structure", body: fr ? "Les frais de gestion pourraient être comparés sur la durée du plan." : "Management fees could be compared over the plan horizon." });
  const seen = new Set();
  const uniq = out.filter((a) => (seen.has(a.title) ? false : seen.add(a.title)));
  if (uniq.length < 3) uniq.push({ title: fr ? "Révision annuelle" : "Annual review", body: fr ? "Le plan pourrait être révisé chaque année." : "The plan could be reviewed each year." });
  return uniq.slice(0, 3);
}

function phaseTitle(phase, fr) {
  if (!fr) return phase === "DECUM" ? "Bilan 360 - Retirement Income" : phase === "TRANSITION" ? "Bilan 360 - Transition" : "Bilan 360 - Accumulation";
  if (phase === "DECUM") return "Bilan 360 - Décaissement";
  if (phase === "TRANSITION") return "Bilan 360 - Transition";
  return "Bilan 360 - Accumulation";
}

// Real-estate section (Phase 1 report unification, 2026-06-17). Self-gating: renders one
// card per property (primary + each rental), so a profile with multiple added residences
// is fully reflected. Returns "" when no properties — keeps a savings-only report compact.
function realEstateSection360(D, fr) {
  const ps = (D && Array.isArray(D.properties)) ? D.properties : [];
  if (!ps.length) return "";
  const sub = fr
    ? `${ps.length} propriété${ps.length > 1 ? "s" : ""} · équité totale ${f$(D.reEquity, true)}.`
    : `${ps.length} propert${ps.length > 1 ? "ies" : "y"} · total equity ${f$(D.reEquity, false)}.`;
  // Localize the property label at the renderer. Rentals carry an upstream default
  // name from the translator ("Propriete a revenus N") that is French + accent-broken
  // regardless of report language — a real locale leak the lab language-auditor caught
  // (ship-loop 2026-06-18). The wizard collects no rental name, so we drop that default
  // and use the localized label here. Root: lib/quiz-translator-360.ts:187 (protected).
  const rentalTotal = ps.filter((p) => !p.isPrimary).length;
  let rIdx = 0;
  const cards = ps.map((pr) => {
    let label;
    if (pr.isPrimary) {
      label = fr ? "Résidence principale" : "Principal residence"; // localized; ignore the FR translator default name
    } else {
      rIdx++;
      label = (fr ? "Locatif" : "Rental") + (rentalTotal > 1 ? " " + rIdx : "");
    }
    const parts = [`${fr ? "valeur" : "value"} ${f$(pr.value, fr)}`];
    if (pr.mortgage > 0) parts.push(`${fr ? "hyp." : "mort."} ${f$(pr.mortgage, fr)}`);
    if (pr.rentalAnnual > 0) parts.push(`${f$(pr.rentalAnnual, fr)}/${fr ? "an" : "yr"}`);
    if (pr.saleAge > 0) parts.push(`${fr ? "vente à" : "sale at"} ${pr.saleAge}`);
    return `<div class="kpi"><div class="v">${f$(pr.equity, fr)}</div><div class="l">${escHtml(label)} · ${fr ? "équité" : "equity"}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${escHtml(parts.join(" · "))}</div></div>`;
  }).join("");
  return `<section class="card"><h2>${fr ? "Votre immobilier" : "Your real estate"}</h2><p class="standfirst">${escHtml(sub)}</p><div class="kpi-grid">${cards}</div></section>`;
}

// Debts section (Phase 1, 2026-06-17). Self-gating: one card per debt + the household total.
function debtsSection360(D, fr) {
  const ds = (D && Array.isArray(D.debts)) ? D.debts : [];
  if (!ds.length) return "";
  const TYPE = { cc: fr ? "Carte de crédit" : "Credit card", loc: fr ? "Marge de crédit" : "Line of credit", car: fr ? "Prêt auto" : "Auto loan", student: fr ? "Prêt étudiant" : "Student loan", other: fr ? "Autre dette" : "Other debt" };
  const sub = fr ? `Dette totale ${f$(D.debtTotal, true)} · intérêts ~${f$(D.debtAnnualCost, true)}/an.` : `Total debt ${f$(D.debtTotal, false)} · interest ~${f$(D.debtAnnualCost, false)}/yr.`;
  const cards = ds.map((d) => {
    const label = TYPE[d.type] || d.type || (fr ? "Dette" : "Debt");
    const parts = [fPct(d.rate * 100, fr)];
    if (d.annualCost > 0) parts.push(`${f$(d.annualCost, fr)}/${fr ? "an" : "yr"}`);
    return `<div class="kpi"><div class="v">${f$(d.bal, fr)}</div><div class="l">${escHtml(label)}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${escHtml(parts.join(" · "))}</div></div>`;
  }).join("");
  return `<section class="card"><h2>${fr ? "Vos dettes" : "Your debts"}</h2><p class="standfirst">${escHtml(sub)}</p><div class="kpi-grid">${cards}</div></section>`;
}

// Insurance section (Phase 1, 2026-06-17). Self-gating on life coverage (incl. spouse).
function insuranceSection360(D, fr) {
  if (!D || !D.hasInsurance) return "";
  const cards = [];
  if (D.lifeInsBenefit > 0) cards.push(`<div class="kpi"><div class="v">${f$(D.lifeInsBenefit, fr)}</div><div class="l">${fr ? "Assurance vie" : "Life insurance"}</div>${D.lifeInsPremium > 0 ? `<div style="font-size:11px;color:var(--muted);margin-top:3px">${f$(D.lifeInsPremium, fr)}/${fr ? "mois" : "mo"}</div>` : ""}</div>`);
  if (D.cLifeInsBenefit > 0) cards.push(`<div class="kpi"><div class="v">${f$(D.cLifeInsBenefit, fr)}</div><div class="l">${fr ? "Assurance vie (conjoint)" : "Life insurance (spouse)"}</div></div>`);
  if (!cards.length) return "";
  return `<section class="card"><h2>${fr ? "Vos assurances" : "Your insurance"}</h2><p class="standfirst">${fr ? "Couverture vie reflétée dans le plan successoral." : "Life coverage reflected in the estate plan."}</p><div class="kpi-grid">${cards.join("")}</div></section>`;
}

// Corporation (CCPC) section (Phase 1, 2026-06-17). Self-gating on a corporate structure.
function businessSection360(D, fr) {
  const b = D && D.business;
  if (!b) return "";
  const cards = [`<div class="kpi"><div class="v">${f$(b.retained, fr)}</div><div class="l">${fr ? "Bénéfices non répartis" : "Retained earnings"}</div>${b.extractYrs > 0 ? `<div style="font-size:11px;color:var(--muted);margin-top:3px">${fr ? "extraction sur" : "extraction over"} ${b.extractYrs} ${fr ? "ans" : "yrs"}</div>` : ""}</div>`];
  if (b.saleAge > 0) cards.push(`<div class="kpi"><div class="v">${f$(b.salePrice, fr)}</div><div class="l">${fr ? "Vente prévue" : "Planned sale"}</div><div style="font-size:11px;color:var(--muted);margin-top:3px">${fr ? "à" : "at"} ${b.saleAge}${b.lcge ? ` · ${fr ? "EDÉ activée" : "LCGE on"}` : ""}</div></div>`);
  if (b.ippBal > 0) cards.push(`<div class="kpi"><div class="v">${f$(b.ippBal, fr)}</div><div class="l">${fr ? "RRI / IPP" : "IPP"}</div></div>`);
  return `<section class="card"><h2>${fr ? "Votre société (SPCC)" : "Your corporation (CCPC)"}</h2><p class="standfirst">${fr ? "Structure corporative intégrée aux projections." : "Corporate structure integrated into the projections."}</p><div class="kpi-grid">${cards.join("")}</div></section>`;
}

// Alternative investments section (Phase 1, 2026-06-17). Self-gating on PE/precious metals.
function altSection360(D, fr) {
  if (!D || !D.hasAlt) return "";
  const cards = [];
  if (D.peBal > 0) cards.push(`<div class="kpi"><div class="v">${f$(D.peBal, fr)}</div><div class="l">${fr ? "Capital-investissement" : "Private equity"}</div></div>`);
  if (D.pmBal > 0) cards.push(`<div class="kpi"><div class="v">${f$(D.pmBal, fr)}</div><div class="l">${fr ? "Métaux précieux" : "Precious metals"}</div></div>`);
  if (!cards.length) return "";
  return `<section class="card"><h2>${fr ? "Placements alternatifs" : "Alternative investments"}</h2><p class="standfirst">${fr ? "Actifs alternatifs inclus dans le patrimoine total." : "Alternative assets included in total wealth."}</p><div class="kpi-grid">${cards.join("")}</div></section>`;
}

export function renderReportHTML360(D, mc, params, lang = "fr", ai = {}, phase = "ACCUM", feedbackToken = "", extraRuns = {}, buildfiData = {}, opts = {}) {
  // clientExport (Codex audit 2026-05-01): when true, strip all <script>
  // blocks and the inline window.__BUILDFI__ payload. The rendered file
  // becomes a static deliverable safe to email/print/forward — no runtime
  // hydration, no profile data embedded as JSON. Default OFF preserves the
  // current interactive experience (slider, scenario picker, age scrub).
  const clientExport = opts.clientExport === true;
  const fr = lang !== "en";
  // Assessment fixes A + F (2026-06-18): strip references to non-existent charts and translate
  // any leaked French stubs before any slot is rendered. Deterministic, no re-narration needed.
  ai = sanitizeProseSlots(ai, fr);
  const title = phaseTitle(phase, fr);
  const now = new Date().toISOString().slice(0, 10);
  const hl = sectionHeadlines(D, fr, !!params?.cOn);
  const gColor = gradeColor(D.grade);
  const actions = buildActions(D, params, fr);
  const aiBrief = cleanAISlot(ai?.snapshot_intro, 100000) || (fr ? `Plan ${D.grade} avec ${D.successPct}% de réussite. Patrimoine médian final: ${f$(D.rMedF, true)}.` : `Plan ${D.grade} with ${D.successPct}% success. Median ending wealth: ${f$(D.rMedF, false)}.`);
  // ship-loop (2026-06-18): D.biggestRisk / D.bestLever are French-only (extractReportData360
  // has no lang). Localize the deterministic FALLBACK at render — otherwise an EN report whose
  // AI slot is empty (e.g. AI timeout) shows French text. Caught by the corpus structural sweep.
  const fbRisk = fr ? D.biggestRisk
    : (D.withdrawalRatePct >= 5.5 ? "The withdrawal rate is high; the early retirement years are sensitive to markets."
      : D.successPct < 75 ? "The plan is fragile in the cautious range."
      : "The main risk remains market variability.");
  const fbLever = fr ? D.bestLever
    : ((D.gapMonthly > 0 && D.successPct < 85) ? `Reducing spending by about ${f$(Math.round(D.gapMonthly * 0.15), false)}/month.`
      : "Government-benefit timing, tax efficiency, and spending flexibility are the strongest levers.");
  const aiRisk = cleanAISlot(ai?.biggest_risk, 100000) || fbRisk || "";
  const aiLever = cleanAISlot(ai?.best_lever, 100000) || fbLever || "";
  const aiObs = [ai?.obs_1, ai?.obs_2, ai?.obs_3].map((x) => cleanAISlot(x, 100000)).filter(Boolean).slice(0, 3);
  // ship-loop 2026-06-18: the renderer used to surface only ~6 of the 33 generated narration slots,
  // discarding ~80% of the analysis (the reason reports read shallow). Render the substantive slots,
  // full-length, markdown-parsed, as a Detailed-analysis section. Uses data we already generate+validate.
  const ANALYSIS_SLOTS = [
    ["revenue_analysis", "Revenus de retraite", "Retirement income"],
    ["savings_analysis", "Épargne et trajectoire", "Savings & trajectory"],
    ["gov_explanation", "Revenus garantis", "Guaranteed income"],
    ["cpp_timing", "Moment des rentes", "Benefit timing"],
    ["tax_analysis", "Fiscalité", "Tax"],
    ["fees_analysis", "Frais", "Fees"],
    ["longevity_analysis", "Longévité", "Longevity"],
    ["sequence_risk", "Risque de séquence", "Sequence risk"],
    ["spending_flex", "Flexibilité des dépenses", "Spending flexibility"],
    ["what_if_analysis", "Scénarios", "What-if scenarios"],
    ["strategy_comparison", "Comparaison des stratégies", "Strategy comparison"],
    ["meltdown_analysis", "Test de tension", "Stress test"],
    ["couple_analysis", "Dynamique de couple", "Couple dynamics"],
    ["property_analysis", "Immobilier", "Real estate"],
    ["estate_analysis", "Succession", "Estate"],
    ["strengths_risks", "Forces et points de vigilance", "Strengths & watch-points"],
    ["priority_actions", "Pistes prioritaires", "Priority levers"],
    ["efficiency_gap", "Marge d'efficacité", "Efficiency margin"],
    ["next_horizon", "Prochaine étape", "Next horizon"],
    ["model_blind_spots", "Limites du modèle", "Model limits"],
  ];
  // TEMPLATED FACTS (2026-06-18): the number-bearing claims that the free-form narrator
  // reliably mis-stated (today-vs-retirement capital, coverage, replacement, gov split) are
  // generated DETERMINISTICALLY from the verified data and rendered verbatim. The LLM slot
  // (qualitative prose) follows. This removes the wrong-field-selection surface entirely.
  const _f = (v) => f$(Math.round(Number(v) || 0), fr);
  const _cpl = !!params?.cOn;
  // "Current savings" = the household's actual account balances TODAY (self + spouse),
  // not D.retBal (a projected/grown portfolio median) — using retBal overstated it ~2x and
  // could not be reconciled with the itemized accounts the client knows.
  const _n0 = (v) => Number(v) || 0;
  // Include CCPC retained earnings (bizRetainedEarnings) — a Planner client's incorporated savings
  // are part of their current assets; omitting them understated "current savings". 2026-06-19.
  const _capToday =
    (_n0(params?.rrsp) + _n0(params?.tfsa) + _n0(params?.nr) + _n0(params?.liraBal) + _n0(params?.dcBal) + _n0(params?.bizRetainedEarnings)) +
    (params?.cOn ? (_n0(params?.cRRSP) + _n0(params?.cTFSA) + _n0(params?.cNR) + _n0(params?.cLiraBal)) : 0)
    || D.retBal || ((D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0)) || 0;
  // Fix B (2026-06-18): use the retirement-age median even when it is 0 (a failing plan).
  // The old `D.retYearBalance || D.retBal` let a legitimate 0 fall through to today's median,
  // so a 0%-success plan was told its capital AT retirement equalled today's balance.
  const _capRet = Number.isFinite(Number(D.retYearBalance)) ? Number(D.retYearBalance) : (Number(D.retBal) || 0);
  const _hhTgtMo = D.householdRetTargetMonthly || D.retSpM || 0;
  const _hhTgtYr = _hhTgtMo * 12;
  // Runway = years the portfolio funds ITS share of spending (target net of guaranteed income),
  // not the full target — government covers part, so dividing by the full target understates it.
  const _gapYr = Math.max(0, Math.round((_hhTgtMo - (D.retGovMonthly || 0)) * 12));
  const _runwayRaw = _gapYr > 0 ? Math.round(_capRet / _gapYr * 10) / 10 : null; // null => guaranteed income covers the target
  // Fix C3 (2026-06-19): the naive runway (capital ÷ steady-state gap) ignores median depletion —
  // a plan whose median final wealth is ~0 does NOT "cover beyond the horizon", it draws down to
  // near-zero. Detect depletion via median final real wealth and suppress the reassuring branch.
  const _depletesByEnd = (Number(D.rMedF) || 0) < Math.max(1000, _hhTgtMo);
  // Fix C2 (2026-06-19): a runway far beyond the horizon (e.g. 418 yrs) is absurd to print.
  const _runwayHuge = _runwayRaw != null && _runwayRaw > 40 && !_depletesByEnd;
  const _runway = (_runwayHuge || _depletesByEnd) ? null : _runwayRaw;
  // Derived numbers the AI used to (mis)compute — now produced once, deterministically, here.
  const _feeLife = Number(D.feeCostLifetime) || 0;
  const _feeMonths = (_feeLife > 0 && _hhTgtMo > 0) ? Math.round(_feeLife / _hhTgtMo * 10) / 10 : null;
  const _primInc = Number(params?.sal) || 0;
  const _spInc = Number(params?.cSal ?? params?.cIncome) || 0;
  const _taxNow = Number(D.taxCurrentEffective) || 0;
  const _taxRet = Number(D.taxRetirementEffective) || 0;
  const _estMed = Number(D.medEstate) || 0;
  const _estP10 = Number(D.p10Estate) || 0;
  // Fix C (2026-06-18): a low-success plan must not be framed as "covered". When the plan fails,
  // the steady-state coverage % can read 100% only because spending was pinned to guaranteed
  // income — the real failure is the unfunded pre-65 bridge. Surface that instead of reassurance.
  const _succ = Number(D.successPct) || 0;
  const _fails = _succ < 25;
  const _capRetDepleted = _fails && _capRet < Math.max(1000, _capToday * 0.1);
  // Fix G (2026-06-18): when an employer pension is in the floor, it starts AT retirement, so
  // "government income is little or none before 65" is misleading — distinguish public pensions
  // (CPP/OAS, deferred) from the employer pension (already flowing in the bridge).
  const _hasPen = Number(D.retPenMonthly) > 0;
  // Fix B2 (2026-06-19): only mention the pre-65 period when the client retires BEFORE 65. An
  // already-retired 67-year-old has no pre-65 phase, so "before 65, government income is nil" is
  // nonsensical and was flagged. retAge >= 65 => no bridge clause.
  const _hasBridge = (Number(params?.retAge ?? D.retAge) || 65) < 65;
  const _bridgeFR = !_hasBridge ? "" : (_hasPen
    ? `Avant 65 ans, les rentes publiques (RRQ/PSV) sont faibles ou nulles, mais la rente d'employeur contribue déjà au revenu.`
    : `Avant 65 ans, le revenu gouvernemental est faible ou nul.`);
  const _bridgeEN = !_hasBridge ? "" : (_hasPen
    ? `Before 65, public pensions (CPP/OAS) are little or none, though the employer pension already contributes.`
    : `Before 65, government income is little or none.`);
  const _failNoteFR = _fails ? ` Toutefois, le plan ne tient pas sur la durée (réussite ${_succ}%) : la période avant 65 ans n'est pas entièrement financée.` : "";
  const _failNoteEN = _fails ? ` However, the plan does not hold over time (${_succ}% success): the pre-65 bridge is not fully funded.` : "";
  // Gov total = SUM OF THE ROUNDED COMPONENTS shown in the parenthetical, so "X (a + b + c)" always
  // adds up exactly (was off by $1 from independently rounding the total). 2026-06-19.
  const _rn = (v) => Math.round(Number(v) || 0);
  const _govSum = _rn(D.retQppPrimaryMonthly) + _rn(D.retOasPrimaryMonthly) + _rn(D.retGisMonthly) + _rn(D.retPenMonthly) + _rn(D.retSpouseGovMonthly);
  // Surplus disclosure (keep-and-disclose, 2026-07-02): when modeled guaranteed income
  // exceeds modeled spending, the projection reinvests the difference — so ending wealth
  // can GROW from benefits. Without this sentence a small portfolio with a large ending
  // balance reads as an arithmetic impossibility (the gis-class trust killer).
  const _surplusNoteFR = D.surplusReinvested
    ? ` À noter : les revenus garantis dépasseraient les dépenses modélisées sur une partie de l'horizon; la projection réinvestit cet excédent, ce qui explique la croissance de l'épargne.`
    : "";
  const _surplusNoteEN = D.surplusReinvested
    ? ` Note: guaranteed income would exceed modeled spending over part of the horizon; the projection reinvests that surplus, which is why savings grow.`
    : "";
  const FACTS = {
    savings_analysis: fr
      ? `Épargne actuelle d'environ ${_f(_capToday)}; ${_capRetDepleted ? "le portefeuille serait en grande partie épuisé d'ici la retraite" : `capital médian projeté à la retraite d'environ ${_f(_capRet)}${_depletesByEnd ? ", qui se réduirait toutefois jusqu'à approcher l'épuisement d'ici la fin de l'horizon" : _runway ? `, soit environ ${_runway} années pour financer la part des dépenses non couverte par les revenus garantis` : _runwayHuge ? ", couvrant la part non garantie des dépenses bien au-delà de l'horizon projeté" : (_fails ? "" : ", les revenus garantis couvrant la cible")}`}.${_surplusNoteFR}`
      : `Current savings about ${_f(_capToday)}; ${_capRetDepleted ? "the portfolio would be largely depleted by retirement" : `projected median capital at retirement about ${_f(_capRet)}${_depletesByEnd ? ", though it would draw down toward depletion by the end of the horizon" : _runway ? `, roughly ${_runway} years to fund the portion of spending not covered by guaranteed income` : _runwayHuge ? ", covering the uncovered portion of spending well beyond the projection horizon" : (_fails ? "" : ", with guaranteed income covering the target")}`}.${_surplusNoteEN}`,
    gov_explanation: fr
      ? `Au régime permanent (vers ${D.retSteadyAge || 65} ans), revenu garanti d'environ ${_f(_govSum)}/mois (RRQ ${_f(D.retQppPrimaryMonthly)} + PSV ${_f(D.retOasPrimaryMonthly)}${D.retGisMonthly ? ` + SRG ${_f(D.retGisMonthly)}` : ""}${D.retPenMonthly ? ` + rente d'employeur ${_f(D.retPenMonthly)}` : ""}${D.retSpouseGovMonthly ? ` + conjoint ${_f(D.retSpouseGovMonthly)}` : ""}), couvrant environ ${D.retGovCoveragePct || 0}% de la cible de ${_f(_hhTgtMo)}/mois. ${_bridgeFR}${_failNoteFR}`
      : `At steady state (around age ${D.retSteadyAge || 65}), guaranteed income about ${_f(_govSum)}/mo (CPP ${_f(D.retQppPrimaryMonthly)} + OAS ${_f(D.retOasPrimaryMonthly)}${D.retGisMonthly ? ` + GIS ${_f(D.retGisMonthly)}` : ""}${D.retPenMonthly ? ` + employer pension ${_f(D.retPenMonthly)}` : ""}${D.retSpouseGovMonthly ? ` + spouse ${_f(D.retSpouseGovMonthly)}` : ""}), covering about ${D.retGovCoveragePct || 0}% of the ${_f(_hhTgtMo)}/mo target. ${_bridgeEN}${_failNoteEN}`,
    // For already-retired profiles there is no pre-retirement employment income (income=0),
    // so omit the income/replacement clause entirely rather than print "0 $/yr, 0% replacement".
    revenue_analysis: ((D.householdIncome || D.sal || 0) > 0)
      ? (fr
        ? `Revenu ${_cpl ? "du ménage " : ""}d'environ ${_f(D.householdIncome || D.sal)}/an; cible de dépenses à la retraite d'environ ${_f(_hhTgtYr)}/an, soit un taux de remplacement d'environ ${D.householdReplacementPct || 0}%.`
        : `${_cpl ? "Household income" : "Income"} about ${_f(D.householdIncome || D.sal)}/yr; retirement spending target about ${_f(_hhTgtYr)}/yr, a replacement ratio of about ${D.householdReplacementPct || 0}%.`)
      : (fr
        ? `Cible de dépenses à la retraite d'environ ${_f(_hhTgtYr)}/an.`
        : `Retirement spending target about ${_f(_hhTgtYr)}/yr.`),
    fees_analysis: _feeLife > 0
      ? (fr
        ? `Coût des frais sur la durée du plan d'environ ${_f(_feeLife)}${_feeMonths ? `, soit l'équivalent d'environ ${_feeMonths} mois de revenu de retraite` : ""}.`
        : `Lifetime fee cost about ${_f(_feeLife)}${_feeMonths ? `, roughly ${_feeMonths} months of retirement income` : ""}.`)
      : null,
    tax_analysis: (_taxNow > 0 || _taxRet > 0)
      ? (fr
        ? `Taux d'imposition effectif d'environ ${_taxNow} % aujourd'hui, qui passerait à environ ${_taxRet} % à la retraite.`
        : `Effective tax rate about ${_taxNow}% today, ${_taxRet < _taxNow ? "easing" : (_taxRet > _taxNow ? "rising" : "holding near")} to about ${_taxRet}% in retirement.`)
      : null,
    couple_analysis: (_cpl && (_primInc > 0 || _spInc > 0))
      ? (fr
        ? `Revenu du ménage d'environ ${_f(D.householdIncome || (_primInc + _spInc))} (vous environ ${_f(_primInc)}, votre conjoint environ ${_f(_spInc)}).`
        : `Household income about ${_f(D.householdIncome || (_primInc + _spInc))} (you about ${_f(_primInc)}, your partner about ${_f(_spInc)}).`)
      : null,
    estate_analysis: _estMed > 0
      ? (fr
        ? `Succession médiane d'environ ${_f(_estMed)}${_estP10 <= 0 ? `; dans les scénarios défavorables, le patrimoine pourrait approcher l'épuisement` : `, environ ${_f(_estP10)} dans un scénario prudent`}.`
        : `Median estate about ${_f(_estMed)}${_estP10 <= 0 ? `; in adverse scenarios wealth could approach exhaustion` : `, about ${_f(_estP10)} in a conservative scenario`}.`)
      : null,
  };
  const analysisBlocks = ANALYSIS_SLOTS
    .map(([key, frL, enL]) => {
      const fact = FACTS[key];
      const txt = mdSlotFull(ai?.[key]);
      if (!fact && !txt) return "";
      const inner = (fact ? `<p class="fact">${escHtml(fact)}</p>` : "") + (txt ? `<p>${txt}</p>` : "");
      return `<div class="anablock"><h3>${fr ? frL : enL}</h3>${inner}</div>`;
    })
    .filter(Boolean).join("");
  const analysisSection = analysisBlocks
    ? `<section class="card"><h2>${fr ? "Analyse détaillée" : "Detailed analysis"}</h2><div class="ana">${analysisBlocks}</div></section>`
    : "";
  // ship-loop 2026-06-18: only render the CPP/QPP-timing pills when those scenarios exist (ACCUM has
  // none) — previously they showed dead "—%" cells to the client.
  const cppGrid = (D.mc60Succ != null || D.mc65Succ != null || D.mc70Succ != null)
    ? `<div class="scenario-grid" style="margin-top:8px"><div class="scenario"><div class="t">${fr ? "RRQ 60" : "CPP 60"}</div><div class="n">${D.mc60Succ ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "RRQ 65" : "CPP 65"}</div><div class="n">${D.mc65Succ ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "RRQ 70" : "CPP 70"}</div><div class="n">${D.mc70Succ ?? "—"}%</div></div></div>`
    : "";

  const fallbackData = { meta: { lang: fr ? "fr" : "en", phase }, profile: { age: D.age, retAge: D.retAge, deathAge: D.deathAge, prov: D.prov }, chart: { points: D.pdSeries || [] }, incomeByAge: (D.decumTable || []).map((r) => ({ age: r.age, govMonthly: r.govMonthly, portWithdrawMonthly: r.portWithdrawMonthly, spendMonthly: r.spendMonthly, portfolio: r.p50Portfolio })), stress: { baseline: D.successPct, crash08: D.stressCrashSucc, stagflation: D.stressStagSucc, prolonged: D.stressProlongedSucc } };
  const dash = buildfiData && buildfiData.chart && Array.isArray(buildfiData.chart.points) ? buildfiData : fallbackData;
  // ROOT-2 (2026-06-18): mirror EVERY figure the narration may cite into the embed, so the
  // shipped report is independently verifiable — a planner/auditor reading window.__BUILDFI__
  // can trace every number. D is the single source (no recompute → no drift). This closes the
  // "narrator cites a figure absent from the embed → reads as fabricated" gap.
  dash.derived = {
    householdIncome: D.householdIncome, householdRetTargetMonthly: D.householdRetTargetMonthly,
    householdReplacementPct: D.householdReplacementPct, retSteadyAge: D.retSteadyAge,
    retGovMonthly: D.retGovMonthly, retGovCoveragePct: D.retGovCoveragePct,
    govComponentsMonthly: { qpp: D.retQppPrimaryMonthly, oas: D.retOasPrimaryMonthly, gis: D.retGisMonthly, dbPension: D.retPenMonthly, spouse: D.retSpouseGovMonthly, total: D.retGovMonthly },
    bridgeYears: D.bridgeYears, bridgeCostReal: D.bridgeCostReal, withdrawalRatePct: D.withdrawalRatePct,
    incomeIndividual: Math.round(n(params?.sal, 0)),
    balancesToday: { rrsp: D.rrsp, tfsa: D.tfsa, nr: D.nr, lira: D.liraBal, dc: D.dcBal, total: D.totalSavings,
      spouseTotal: params?.cOn ? (Math.round(n(params?.cRRSP, 0)) + Math.round(n(params?.cTFSA, 0)) + Math.round(n(params?.cNR, 0))) : 0 },
    fees: { merWeightedPct: Math.round((D.merWeighted || 0) * 10000) / 100, lifetimeCost: D.feeCostLifetime },
    estate: { median: D.medEstate, p10: D.p10Estate },
    realPercentiles: { p5: D.rP5F, p25: D.rP25F, p50: D.rMedF, p75: D.rP75F, p95: D.rP95F },
    taxEffectivePct: { current: D.taxCurrentEffective, retirement: D.taxRetirementEffective },
  };
  const seed = { lang: fr ? "fr" : "en", successPct: D.successPct, stress: dash.stress || fallbackData.stress };

  // ship-loop 2026-06-18: pre-fill the "Snapshot at selected age" cells SERVER-SIDE at the
  // default age. The client export / email / PDF omits the interactive <script>, so the
  // cells were stuck at "—" for the very state most clients see. The slider JS (when
  // present) overwrites these on interaction; the values mirror updateAge() exactly.
  const _snapAge = Math.max(D.age, D.retAge);
  const _snapPts = dash.chart && Array.isArray(dash.chart.points) ? dash.chart.points : [];
  const _snapInc = Array.isArray(dash.incomeByAge) ? dash.incomeByAge : [];
  const _snapNearest = (arr) => {
    if (!arr.length) return {};
    let b = arr[0], dist = Math.abs((arr[0].age || 0) - _snapAge);
    for (const r of arr) { const dd = Math.abs((r.age || 0) - _snapAge); if (dd < dist) { b = r; dist = dd; } }
    return b;
  };
  const _snapMoney = (v) => fmtMoney360(v, fr);
  const _snapMo = fr ? "/mois" : "/mo";
  const _snapP = _snapNearest(_snapPts), _snapR = _snapNearest(_snapInc);
  const snap = {
    portfolio: _snapMoney(_snapP.p50 != null ? _snapP.p50 : (_snapR.portfolio || 0)),
    spend: _snapMoney(_snapR.spendMonthly || 0) + _snapMo,
    gov: _snapMoney(_snapR.govMonthly || 0) + _snapMo,
    wd: _snapMoney(_snapR.portWithdrawMonthly || 0) + _snapMo,
  };

  const starBlock = feedbackToken ? buildStarRatingBlock(feedbackToken, fr) : "";
  const dashJson = JSON.stringify(dash).replace(/</g, "\\u003c");
  const seedJson = JSON.stringify(seed).replace(/</g, "\\u003c");

  const html = `<!doctype html><html lang="${fr ? "fr" : "en"}" data-bf-system="editorial"><head><meta charset="utf-8" /><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escHtml(title)}</title>
${getEditorialFontBootstrapLink()}
<style data-bf-canonical="editorial">${getCanonicalEditorialBundleCSS()}</style>
<style data-bf-report-overrides="bilan360">
:root{--bg:var(--bfe-paper, #faf7f1);--card:var(--bfe-panel, #fffdf9);--ink:var(--bfe-ink, #1f2840);--muted:var(--bfe-muted, #5d6480);--line:var(--bfe-line, #ddd1be);--gold:var(--bf-gold, #c4944a);--blue:#3b79b6}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font-inter);line-height:1.45}
.wrap{max-width:1180px;margin:0 auto;padding:22px 18px 40px}.top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding-bottom:12px;border-bottom:1px solid var(--line)}
.logo{font-size:34px;font-weight:900}.tag{display:inline-flex;background:#1E1208;color:#fff;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:800;text-transform:uppercase}.meta{margin-top:8px;color:var(--muted);font-size:14px}
.hero{margin-top:14px;display:grid;grid-template-columns:170px 1fr;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}.grade{display:grid;place-items:center;border:2px solid ${gColor};border-radius:12px;min-height:120px}.grade .g{font-size:58px;font-weight:900;color:${gColor}}
.hero-panels{margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:8px}.panel{border:1px solid var(--line);border-radius:10px;padding:8px 10px}.panel h4{margin:0 0 5px;font-size:11px;color:var(--muted);text-transform:uppercase}
.dashboard{margin-top:14px;display:grid;grid-template-columns:2fr 1fr;gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}.card h2{margin:0 0 4px;font-size:16px}.standfirst{margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:14px;line-height:1.5;color:var(--muted)}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.kpi{border:1px solid var(--line);border-radius:10px;padding:8px}.kpi .v{font-size:22px;font-weight:850}.kpi .l{font-size:11px;color:var(--muted);text-transform:uppercase}
/* 2026-05-14 Sprint C — KPI visual hierarchy. .kpi-hero is the section's
   single primary metric (answers the section's decision question).
   .kpi-support is secondary context. .kpi-detail is supporting evidence at
   lower visual weight. Hero gets full-width emphasis (larger v, accent
   border-left), support stays default, detail gets muted opacity. */
.kpi.kpi-hero{border-left:3px solid var(--gold);background:linear-gradient(180deg,#fffaf0,var(--card))}.kpi.kpi-hero .v{font-size:30px}.kpi.kpi-hero .l{color:var(--ink)}
.kpi.kpi-detail{opacity:.78}.kpi.kpi-detail .v{font-size:18px}
.controls{display:grid;grid-template-columns:1fr 180px;gap:8px;margin-top:8px}.field label{display:block;font-size:12px;color:var(--muted)}input[type=range]{width:100%}select{width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff}
.svgbox{border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff}svg.chart{width:100%;height:auto;display:block}.legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:6px}.dot{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:5px}
.readout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mini{border:1px solid var(--line);border-radius:8px;padding:8px}.mini .k{font-size:11px;color:var(--muted);text-transform:uppercase}.mini .v{font-size:18px;font-weight:800}
.scenario-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.scenario{border:1px solid var(--line);border-radius:9px;padding:8px}.scenario .t{font-size:11px;color:var(--muted)}.scenario .n{font-size:22px;font-weight:800;color:var(--blue)}
.ai{border:1px solid #DCD0BC;background:linear-gradient(180deg,#FFF9EF,#FFF);border-radius:10px;padding:9px}.ai h4{margin:0 0 5px;font-size:12px;text-transform:uppercase;color:#6A5122}.actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.action{border:1px solid var(--line);border-radius:9px;padding:8px}.action h4{margin:0 0 4px;font-size:13px}.action p{margin:0;font-size:13px}
@media (max-width:1060px){.dashboard{grid-template-columns:1fr}.hero{grid-template-columns:1fr}}@media (max-width:860px){.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.controls,.hero-panels,.scenario-grid,.actions{grid-template-columns:1fr}}
.ana{display:grid;gap:12px;margin-top:4px}.anablock{border-top:1px solid var(--line);padding-top:8px}.anablock:first-child{border-top:0;padding-top:0}.anablock h3{margin:0 0 4px;font-size:13px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.3px}.anablock p{margin:0;font-size:13.5px;line-height:1.6;color:#3a4258}.anablock p.fact{font-weight:600;color:var(--ink);margin-bottom:4px}.anablock p.fact+p{color:#5a6478}
</style></head><body><div class="wrap">
<header class="top"><div><div class="logo">buildfi</div><div class="meta">${D.age} ${fr ? "ans" : "years"} • ${escHtml(D.prov)} • ${escHtml(title)}</div></div><div style="text-align:right"><div class="tag">${fr ? "Tableau de bord interactif" : "Interactive Dashboard"}</div><div class="meta">${fr ? "Généré le" : "Generated on"} ${now} • ${REPORT_VERSION_360}</div></div></header>
<section class="hero"><div class="grade"><div><div class="g">${escHtml(D.grade)}</div><div style="font-size:12px;color:#6C6258;text-align:center">${D.successPct}% ${fr ? "de réussite" : "success"}</div></div></div><div><h1 style="margin:0 0 6px;font-size:23px">${fr ? "Briefing IA personnalisé" : "Personalized AI briefing"}</h1><p style="margin:0">${escBold(aiBrief)}</p><div class="hero-panels"><div class="panel"><h4>${fr ? "Risque principal" : "Main risk"}</h4><p style="margin:0">${escBold(aiRisk)}</p></div><div class="panel"><h4>${fr ? "Levier principal" : "Main lever"}</h4><p style="margin:0">${escBold(aiLever)}</p></div></div></div></section>
<div class="dashboard"><div style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Votre point de départ" : "Your starting point"}</h2><p class="standfirst">${escHtml(hl.starting_point)}</p><div class="kpi-grid"><div class="kpi kpi-hero"><div class="v" id="kpiSuccess">${D.successPct}%</div><div class="l">${fr ? "Réussite" : "Success"}</div></div><div class="kpi"><div class="v">${f$(D.rMedF, fr)}</div><div class="l">${fr ? "Patrimoine médian final" : "Median ending wealth"}</div></div><div class="kpi kpi-detail"><div class="v">${D.withdrawalRatePct == null ? "—" : fPct(D.withdrawalRatePct, fr)}</div><div class="l">${fr ? "Taux de retrait initial" : "Initial withdrawal rate"}</div></div><div class="kpi kpi-detail"><div class="v">${f$(D.retGovMonthly ?? D.govMonthly, fr)}${fr ? "/mois" : "/mo"}</div><div class="l">${fr ? "Revenus garantis (rég. perm.)" : "Guaranteed income (steady state)"}</div></div></div><div class="controls"><div class="field"><label for="ageSlider">${fr ? "Âge analysé" : "Age focus"}: <strong id="ageLabel">${Math.max(D.age, D.retAge)}</strong></label><input type="range" id="ageSlider" min="${D.age}" max="${D.deathAge}" value="${Math.max(D.age, D.retAge)}" /></div><div class="field"><label for="scenarioSel">${fr ? "Scénario" : "Scenario"}</label><select id="scenarioSel"><option value="baseline">${fr ? "Base" : "Baseline"}</option><option value="crash08">2008</option><option value="stagflation">${fr ? "Stagflation" : "Stagflation"}</option><option value="prolonged">${fr ? "Baissier prolongé" : "Prolonged bear"}</option></select></div></div></section>
<section class="card"><h2>${fr ? "Tenue du plan dans le temps" : "Plan endurance over time"}</h2><p class="standfirst">${escHtml(hl.endurance)}</p><div class="svgbox"><svg id="fanChart" class="chart" viewBox="0 0 920 320"></svg><div class="legend"><span><i class="dot" style="background:#2F67A3"></i>P50</span><span><i class="dot" style="background:#7CA7D9"></i>P25 / P75</span><span><i class="dot" style="background:#D78E8E"></i>P5 / P95</span></div></div><div class="svgbox" style="margin-top:8px"><svg id="incomeChart" class="chart" viewBox="0 0 920 300"></svg><div class="legend"><span><i class="dot" style="background:#2A8C46"></i>${fr ? "Garantis" : "Guaranteed"}</span><span><i class="dot" style="background:#c4944a"></i>${fr ? "Retraits" : "Withdrawals"}</span><span><i class="dot" style="background:#2F67A3"></i>${fr ? "Dépenses" : "Spending"}</span></div></div></section></div>
<aside style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Repère à l'âge sélectionné" : "Snapshot at selected age"}</h2><div class="readout"><div class="mini"><div class="k">${fr ? "Patrimoine médian" : "Median portfolio"}</div><div class="v" id="agePortfolio">${snap.portfolio}</div></div><div class="mini"><div class="k">${fr ? "Dépenses" : "Spending"}</div><div class="v" id="ageSpend">${snap.spend}</div></div><div class="mini"><div class="k">${fr ? "Garantis" : "Guaranteed"}</div><div class="v" id="ageGov">${snap.gov}</div></div><div class="mini"><div class="k">${fr ? "Retrait" : "Withdrawal"}</div><div class="v" id="ageWd">${snap.wd}</div></div></div></section>
<section class="card"><h2>${fr ? "Réaction du plan aux chocs" : "Plan reaction to shocks"}</h2><p class="standfirst">${escHtml(hl.shocks)}</p><div class="scenario-grid"><div class="scenario"><div class="t">2008</div><div class="n">${D.stressCrashSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Stagflation" : "Stagflation"}</div><div class="n">${D.stressStagSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Baissier prolongé" : "Prolonged bear"}</div><div class="n">${D.stressProlongedSucc ?? "—"}%</div></div></div>${cppGrid}</section>
<section class="card"><h2>${fr ? "Synthèse stratégique" : "Strategic synthesis"}</h2><p class="standfirst">${escHtml(hl.synthesis)}</p><div class="ai"><h4>${fr ? "Narration stratégique" : "Strategic narrative"}</h4><p style="margin:0">${escBold(mdSlotFull(ai?.mirror_block) || aiBrief)}</p></div><ul style="margin:10px 0 0;padding-left:18px">${(aiObs.length ? aiObs : [fr ? "Synthèse du risque principal et de son impact réel." : "Synthesis of main risk and practical impact.", fr ? "Priorisation des leviers par impact attendu." : "Levers prioritized by expected impact.", fr ? "Traduction des probabilités en actions." : "Probabilities translated into actions."]).map((x) => `<li>${escBold(x)}</li>`).join("")}</ul></section></aside></div>
${analysisSection}
${realEstateSection360(D, fr)}
${debtsSection360(D, fr)}
${insuranceSection360(D, fr)}
${businessSection360(D, fr)}
${altSection360(D, fr)}
<section class="card"><h2>${fr ? "Leviers à votre portée" : "Levers within reach"}</h2><p class="standfirst">${escHtml(hl.levers)}</p><div class="actions">${actions.map((a) => `<article class="action"><h4>${escHtml(a.title)}</h4><p>${escHtml(a.body)}</p></article>`).join("")}</div></section>
<section class="card" id="sec-methodology"><h2>${fr ? "Méthodologie et hypothèses" : "Methodology & assumptions"}</h2><p>${fr ? "5 000 simulations: rendements, inflation, longévité, fiscalité. Montants en dollars réels d'aujourd'hui." : "5,000 simulations: returns, inflation, longevity, taxes. Amounts shown in today's real dollars."}</p><table class="assumptions" style="width:100%;border-collapse:collapse;font-size:12.5px;margin-top:8px"><tbody>${[
  [fr ? "Rendement actions (nominal)" : "Equity return (nominal)", fPct(n(params?.eqRet, 0.065) * 100, fr)],
  [fr ? "Rendement obligations (nominal)" : "Bond return (nominal)", fPct(n(params?.bndRet, 0.03) * 100, fr)],
  [fr ? "Inflation" : "Inflation", fPct(n(params?.inf, 0.021) * 100, fr)],
  [fr ? "Répartition actions" : "Equity allocation", fPct(n(params?.allocR, 0.5) * 100, fr)],
  [fr ? "Frais de gestion pondérés (RFG)" : "Weighted management fees (MER)", fPct((D.merWeighted || 0) * 100, fr)],
  [fr ? "Horizon de projection" : "Projection horizon", fr ? `jusqu'à ${D.deathAge} ans` : `to age ${D.deathAge}`],
  [fr ? "Scénarios simulés" : "Simulated scenarios", fr ? "5 000" : "5,000"],
].map(([k, v]) => `<tr><td style="padding:3px 8px 3px 0;color:var(--muted);border-bottom:1px solid var(--line)">${escHtml(k)}</td><td style="padding:3px 0;font-weight:600;border-bottom:1px solid var(--line)">${escHtml(v)}</td></tr>`).join("")}</tbody></table>${D.surplusReinvested ? `<p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">${fr ? "Lorsque les revenus garantis modélisés dépassent les dépenses modélisées, la projection réinvestit l'excédent (CELI d'abord). La croissance de l'épargne peut donc provenir des prestations, pas seulement des rendements." : "When modeled guaranteed income exceeds modeled spending, the projection reinvests the surplus (TFSA first). Savings growth can therefore come from benefits, not only from returns."}</p>` : ""}</section>
<section class="card" id="sec-disclaimer" data-bf-disclaimer="1"><h2>${fr ? "Avis important" : "Important notice"}</h2><p style="font-size:12.5px;color:var(--muted);line-height:1.6;margin:0">${fr
  ? "Ce rapport est un outil éducatif et informatif. Il ne constitue pas un conseil financier, fiscal ou juridique, ni une recommandation personnalisée au sens de la réglementation. Les projections reposent sur des simulations statistiques et des hypothèses simplificatrices; les résultats réels pourraient différer sensiblement. Certains passages narratifs sont générés par intelligence artificielle (Anthropic Claude), puis validés par des contrôles automatisés; ils décrivent les données sans prescrire d'action. Pour toute décision, un planificateur financier (Pl. Fin.) ou un conseiller autorisé pourrait être consulté."
  : "This report is an educational and informational tool. It does not constitute financial, tax, or legal advice, nor a personalized recommendation within the meaning of applicable regulation. Projections rely on statistical simulations and simplifying assumptions; actual results could differ materially. Some narrative passages are generated by artificial intelligence (Anthropic Claude) and validated by automated checks; they describe the data without prescribing action. For any decision, a licensed financial planner or advisor could be consulted."}</p></section>
${starBlock}<footer class="meta" style="margin-top:16px">buildfi • ${clientExport ? (fr ? "Rapport Bilan 360" : "Bilan 360 report") : (fr ? "Rapport Bilan 360 interactif" : "Interactive Bilan 360 report")} • ${REPORT_VERSION_360}</footer></div>
${clientExport ? "" : `<script>window.__BUILDFI__=${dashJson};window.__SEED__=${seedJson};</script>`}
${clientExport ? "" : `<script>(function(){const DATA=window.__BUILDFI__||{},SEED=window.__SEED__||{},fr=(SEED.lang||"fr")==="fr";const points=(DATA.chart&&Array.isArray(DATA.chart.points))?DATA.chart.points:[];const income=Array.isArray(DATA.incomeByAge)?DATA.incomeByAge:[];if(!points.length)return;const slider=document.getElementById("ageSlider"),ageLabel=document.getElementById("ageLabel"),scenarioSel=document.getElementById("scenarioSel"),kpiSuccess=document.getElementById("kpiSuccess"),outPortfolio=document.getElementById("agePortfolio"),outSpend=document.getElementById("ageSpend"),outGov=document.getElementById("ageGov"),outWd=document.getElementById("ageWd"),fanSvg=document.getElementById("fanChart"),incSvg=document.getElementById("incomeChart");const fmtMoney=(v)=>{const t=Math.round(Number(v)||0).toLocaleString(fr?"fr-CA":"en-CA").replace(/[\u00A0\u202F]/g," ");return fr?t+" $":"$"+t;};const nearest=(arr,age)=>{if(!arr.length)return null;let b=arr[0],d=Math.abs((arr[0].age||0)-age);for(const r of arr){const dd=Math.abs((r.age||0)-age);if(dd<d){b=r;d=dd;}}return b;};const xMap=(age,minAge,maxAge,L,R,W)=>L+((age-minAge)/Math.max(1,maxAge-minAge))*(W-L-R);function drawFan(age){if(!fanSvg)return;const W=920,H=320,L=56,R=18,T=16,B=34,minAge=Number(points[0].age||0),maxAge=Number(points[points.length-1].age||minAge+1),maxV=Math.max(1,...points.map(p=>Math.max(p.p95||0,p.p75||0,p.p50||0,p.p25||0,p.p5||0))),yMax=Math.ceil(maxV/50000)*50000,y=(v)=>T+(1-(v/yMax))*(H-T-B),poly=(k)=>points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[k]||0)).toFixed(1)).join(" "),area=(top,bot)=>{const up=points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[top]||0)).toFixed(1)).join(" L "),dn=points.slice().reverse().map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[bot]||0)).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},ticks=[0,.25,.5,.75,1].map(t=>({v:yMax*t,yy:y(yMax*t)})),fx=xMap(age,minAge,maxAge,L,R,W);fanSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v/1000)+'k</text>').join("")+'<path d="'+area("p95","p5")+'" fill="rgba(70,128,192,.10)"></path><path d="'+area("p75","p25")+'" fill="rgba(70,128,192,.20)"></path><polyline points="'+poly("p95")+'" fill="none" stroke="#9FC1E8" stroke-width="1.4"></polyline><polyline points="'+poly("p75")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p50")+'" fill="none" stroke="#2F67A3" stroke-width="2.6"></polyline><polyline points="'+poly("p25")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p5")+'" fill="none" stroke="#D78E8E" stroke-width="1.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function drawIncome(age){if(!incSvg||!income.length)return;const W=920,H=300,L=56,R=18,T=16,B=34,rows=income.map(r=>({age:Number(r.age||0),gov:Number(r.govMonthly||0),wd:Number(r.portWithdrawMonthly||0),sp:Number(r.spendMonthly||0)})),minAge=rows[0].age,maxAge=rows[rows.length-1].age,maxV=Math.max(1,...rows.map(r=>Math.max(r.sp,r.gov+r.wd)))*1.15,y=(v)=>T+(1-(v/maxV))*(H-T-B),area=(top,bot)=>{const up=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[top]).toFixed(1)).join(" L "),dn=rows.slice().reverse().map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[bot]).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},spend=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r.sp).toFixed(1)).join(" "),ticks=[0,.25,.5,.75,1].map(t=>({v:maxV*t,yy:y(maxV*t)})),fx=xMap(age,minAge,maxAge,L,R,W);for(const r of rows){r.total=r.gov+r.wd;r.zero=0;}incSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v)+'$</text>').join("")+'<path d="'+area("gov","zero")+'" fill="rgba(42,140,70,.25)"></path><path d="'+area("total","gov")+'" fill="rgba(199,161,58,.35)"></path><polyline points="'+spend+'" fill="none" stroke="#2F67A3" stroke-width="2.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function updateScenario(){if(!scenarioSel||!kpiSuccess)return;const map={baseline:SEED.stress&&SEED.stress.baseline,crash08:SEED.stress&&SEED.stress.crash08,stagflation:SEED.stress&&SEED.stress.stagflation,prolonged:SEED.stress&&SEED.stress.prolonged};const v=map[scenarioSel.value];kpiSuccess.textContent=(v==null?SEED.successPct:v)+"%";}
function updateAge(){const age=Number(slider?slider.value:65);if(ageLabel)ageLabel.textContent=String(age);const p=nearest(points,age)||{},r=nearest(income,age)||{};if(outPortfolio)outPortfolio.textContent=fmtMoney(p.p50||r.portfolio||0);const _mo=fr?"/mois":"/mo";if(outSpend)outSpend.textContent=fmtMoney(r.spendMonthly||0)+_mo;if(outGov)outGov.textContent=fmtMoney(r.govMonthly||0)+_mo;if(outWd)outWd.textContent=fmtMoney(r.portWithdrawMonthly||0)+_mo;drawFan(age);drawIncome(age);}if(slider)slider.addEventListener("input",updateAge);if(scenarioSel)scenarioSel.addEventListener("change",updateScenario);updateScenario();updateAge();})();</script>`}</body></html>`;

  return repairMojibake(html);
}
