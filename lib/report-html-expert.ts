// /lib/report-html-expert.ts
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Rapport Expert ($129) — HTML Renderer (SERVER-SIDE)
// ══════════════════════════════════════════════════════════════════════
// Section-based: 9 base + up to 10 conditional + 5 exclusive sections
// Uses ExpertAINarration from ai-constants.ts (section keys → paragraph text)
// Each section has a static fallback if AI slot is missing
//
// Exports:
//   extractReportDataExpert()  — MC results → report-ready object D
//   renderReportHTMLExpert()   — D + AI + sections → complete HTML string
//
// Used by: /api/export (on-demand), /api/webhook (initial report)
// ══════════════════════════════════════════════════════════════════════

import { calcTax } from "./engine";
import type { ExpertSectionKey, ExpertAINarration } from "./ai-constants";
import { buildStarRatingBlock } from "./feedback-stars";
import {
  getCanonicalEditorialBundleCSS,
  getEditorialFontBootstrapLink,
} from "./report-canonical-css";

const REPORT_VERSION_EXPERT = "v2";

/*
  Report renderer color tokens (Plan v2.2 / Phase 4a, 2026-04-29).
  AI reports belong to the Editorial system. The hardcoded gold var(--bf-gold)
  variant has been retired across the renderer in favor of the canonical
  --bf-gold (#c4944a) defined in lib/design/tokens.css. Semantic state
  colors mirror SEMANTIC.{green,red}Light from product.tokens.ts so the
  same green/red appears across guides, reports, and product surfaces.
*/
const RPT_COLORS = {
  goldVar: "var(--bf-gold, #c4944a)",
  goldLighter: "#dab47a", // top of the gold gradient pair (was #d4a85a)
  inkLegacy: "#1a2744",   // BuildFi navy — preserved as report ink
  paperLegacy: "#faf8f4", // matches editorial paper but slightly off — TODO converge
  textBody: "#1a1208",
  textMuted: "#666",
  textDim: "#999",
  borderSoft: "#e8e4db",
  borderMid: "#d4cec4",
  successGreen: "#2f8a4a",  // matches SEMANTIC.greenLight
  dangerRed: "#b93f43",     // matches SEMANTIC.redLight
} as const;

// ── Format helpers ──────────────────────────────────────────────────

function f$(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "\u2014";
  return (n < 0 ? "-" : "") + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0$";
}
function fPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "\u2014";
  return Math.round(n) + "\u00a0%";
}
function gCol(s: number): string {
  return s >= 0.9 ? RPT_COLORS.successGreen : s >= 0.75 ? RPT_COLORS.goldVar : RPT_COLORS.dangerRed;
}

// ── extractReportDataExpert ─────────────────────────────────────────

export function extractReportDataExpert(
  mc: Record<string, any>,
  params: Record<string, any>
): Record<string, any> {
  const p = params;
  const rd: any[] = mc.medRevData || [];
  const retRow = rd.find((r: any) => r.age >= p.retAge) || {};
  const qppRow = rd.find((r: any) => r.age >= (p.qppAge || p.retAge)) || retRow;
  const oasRow = rd.find((r: any) => r.age >= (p.oasAge || p.retAge)) || retRow;
  const qppM = Math.round((qppRow.rrq || 0) / 12);
  const oasM = Math.round((oasRow.psv || 0) / 12);
  const penMo = Math.round((retRow.pen || 0) / 12);
  const govM = qppM + oasM + penMo;
  const coverPct = p.retSpM > 0 ? Math.round(govM / p.retSpM * 100) : 0;
  const gapM = Math.max(0, p.retSpM - govM);
  // Deflate retBal to real dollars (same as Essentiel extractor)
  const retDefl = 1 / Math.pow(1 + (p.inf || 0.021), Math.max(0, (retRow.age || p.retAge) - p.age));
  const retBal = retRow ? Math.round(((retRow.aRR || 0) + (retRow.aTF || 0) + (retRow.aNR || 0) + (retRow.aDC || 0)) * retDefl) : 0;
  const annualW = gapM * 12;
  const wdPct = retBal > 0 ? Math.round(annualW / retBal * 1000) / 10 : 99;
  const workRow = rd.find((r: any) => r.age === p.age) || {};
  const taxCurrEff = workRow.taxInc > 0 ? Math.round((workRow.tax || 0) / workRow.taxInc * 100) : 0;
  const taxRetRow = rd.find((r: any) => r.age === p.retAge + 2) || retRow;
  const taxRetEff = taxRetRow && taxRetRow.taxInc > 0 ? Math.round((taxRetRow.tax || 0) / taxRetRow.taxInc * 100) : 0;
  const taxInfo = calcTax(p.sal, 0, p.prov, 0) as any;
  const margRate = taxInfo ? taxInfo.marg : 0.30; // calcTax returns decimal (e.g. 0.47), not percentage
  const merW = ((p.merR || 0.015) * (p.rrsp || 0) + (p.merT || 0.007) * (p.tfsa || 0) + (p.merN || 0.007) * (p.nr || 0))
    / Math.max(1, (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0));
  const feeCost = Math.round(merW * retBal * (p.deathAge - p.retAge));
  const succPct = Math.round(mc.succ * 100);

  // Grade (Expert scale)
  let grade: string;
  if (succPct >= 95) grade = "A+";
  else if (succPct >= 85) grade = "A";
  else if (succPct >= 75) grade = "B+";
  else if (succPct >= 65) grade = "B";
  else if (succPct >= 55) grade = "C+";
  else if (succPct >= 45) grade = "C";
  else if (succPct >= 35) grade = "D";
  else grade = "F";

  // 5-yr projection table
  const projTable: any[] = [];
  const finalP25 = mc.rP25F || mc.p25F || 0, finalP50 = mc.rMedF || mc.medF || 0, finalP75 = mc.rP75F || mc.p75F || 0;
  const horizYrs = Math.max(1, p.deathAge - p.retAge);
  for (let tAge = p.retAge; tAge <= p.deathAge; tAge += 5) {
    if (tAge > p.deathAge) break;
    const mr5 = rd.find((r: any) => r.age === tAge) || rd[rd.length - 1] || {};
    const netInc = Math.round((mr5.rrq || 0) + (mr5.psv || 0) + (mr5.pen || 0) + (mr5.ret || 0));
    const tax5 = Math.round(mr5.tax || 0);
    const tRatio = Math.max(0, Math.min(1, (tAge - p.retAge) / horizYrs));
    const smooth = tRatio * tRatio * (3 - 2 * tRatio);
    projTable.push({
      age: tAge, netIncome: netInc, tax: tax5, netAfterTax: Math.max(0, netInc - tax5),
      p25: Math.max(0, Math.round(retBal + (finalP25 - retBal) * smooth)),
      p50: Math.max(0, Math.round(retBal + (finalP50 - retBal) * smooth)),
      p75: Math.max(0, Math.round(retBal + (finalP75 - retBal) * smooth)),
    });
  }

  const rp = p._report || {};
  const q = p._quiz || {};

  return {
    age: p.age, retAge: p.retAge, sex: p.sex, prov: p.prov, sal: p.sal,
    deathAge: p.deathAge, avgDeath: mc.avgDeath || (p.sex === "F" ? 87 : 84),
    totalSavings: (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0),
    rrsp: p.rrsp || 0, tfsa: p.tfsa || 0, nr: p.nr || 0,
    liraBal: p.liraBal || 0, dcBal: p.dcBal || 0,
    retYearBalance: retBal, retBal,
    qppMonthly: qppM, oasMonthly: oasM, dbPensionMonthly: penMo,
    govMonthly: govM, coveragePct: coverPct, gapMonthly: gapM,
    retSpM: p.retSpM, withdrawalRatePct: wdPct,
    successPct: succPct, succ: mc.succ, grade,
    rMedF: Math.round(mc.rMedF || mc.medF || 0),
    rP5F: Math.round(mc.rP5F || mc.p5F || mc.var5 || 0),
    rP25F: Math.round(mc.rP25F || mc.p25F || 0),
    rP75F: Math.round(mc.rP75F || mc.p75F || 0),
    rP95F: Math.round(mc.rP95F || mc.p95F || 0),
    medRuin: mc.medRuin || 999, p5Ruin: mc.p5Ruin || 999,
    medEstateTax: Math.round(mc.medEstateTax || 0),
    medEstateNet: Math.round(mc.medEstateNet || 0),
    p25EstateNet: Math.round(mc.p25EstateNet || 0),
    p75EstateNet: Math.round(mc.p75EstateNet || 0),
    taxCurrentEffective: taxCurrEff, taxRetirementEffective: taxRetEff,
    taxCurrentMarginal: Math.round(margRate * 100), margRate,
    merWeighted: merW, feeCostLifetime: feeCost,
    penType: p.penType, hasPension: p.penType !== "none",
    ptM: p.ptM, ptYrs: p.ptYrs,
    qppAge: p.qppAge, oasAge: p.oasAge, inf: p.inf,
    medRevData: rd, pD: mc.pD || [], fins: mc.fins || [],
    expReturn: p.allocR * 0.07 + (1 - p.allocR) * 0.035,
    afterTaxReturn: (p.allocR * 0.07 + (1 - p.allocR) * 0.035) * (1 - margRate * 0.5),
    projTable,
    nSim: mc.fins ? mc.fins.length : 5000,
    // Expert-specific
    debtBal: rp.debtBal || 0, debtAnnualCost: rp.debtAnnualCost || 0,
    homeVal: rp.homeVal || 0, mortBal: rp.mortBal || 0, equity: rp.equity || 0,
    bizOn: rp.bizOn || false, cOn: !!p.cOn,
    couple: !!p.cOn, sophistication: q.sophistication || "rapide",
    hasInsurance: (p.lifeInsBenefit || 0) > 0,
    lifeInsBenefit: p.lifeInsBenefit || 0, lifeInsPremium: p.lifeInsPremium || 0,
    hasRESP: (p.respKids || 0) > 0, respKids: p.respKids || 0, respBal: p.respBal || 0,
    // Couple fields
    cAge: p.cAge, cRetAge: p.cRetAge, cSal: p.cSal,
    cRRSP: p.cRRSP || 0, cTFSA: p.cTFSA || 0, cNR: p.cNR || 0,
    // MC results
    histogram: mc.histogram, deathVsRuin: mc.deathVsRuin,
    sensitivity: mc.sens, medPath: mc.medPath,
    ruinPct: mc.ruinPct || 0,
  };
}

// ── Internal render ─────────────────────────────────────────────────

function renderExpertReport(
  D: Record<string, any>,
  mc: Record<string, any>,
  params: Record<string, any>,
  ai: ExpertAINarration,
  activeSections: ExpertSectionKey[],
  lang: "fr" | "en",
  comparisonData?: { label: string; successPct: number; wealthDelta: number }[]
): string {
  const fr = lang === "fr";
  const t = (f: string, e: string) => fr ? f : e;
  const isQC = D.prov === "QC";
  const gP = fr
    ? (isQC ? "R\u00e9gime de rentes du Qu\u00e9bec" : "R\u00e9gime de pensions du Canada")
    : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la S\u00e9curit\u00e9 de la vieillesse" : "Old Age Security";
  const sC = gCol(D.succ);
  const circ = 2 * Math.PI * 48;
  const dashVal = circ * (1 - D.succ);

  // HTML helpers
  const aiSlot = (key: ExpertSectionKey, fallback?: string): string => {
    const text = ai[key];
    if (text) return '<div style="font-size:14px;color:#1a1208;line-height:1.85;margin:14px 0;padding:16px 20px;background:#faf8f4;border-radius:10px;border-left:3px solid var(--bf-gold)">' + text + '</div>';
    if (fallback) return '<div style="font-size:13px;color:#666;line-height:1.7;margin:10px 0;font-style:italic">' + fallback + '</div>';
    return '';
  };
  /*
    Plan v2.2 / Phase 4b (2026-04-29): chapter sheet structure.
    secH() now emits <section class="bfe-chapter" id="sec-N"> with the
    editorial chapter-header pattern (kicker + Playfair title + sub).
    The id="sec-N" anchor enables Phase 4c rail-TOC scroll-spy.
    Callers unchanged — the inline-style version is replaced 1:1 with
    the editorial class equivalent. The gold "#N" badge stays as a
    small JetBrainsMono pill inside the kicker line.
  */
  const secH = (n: number, title: string, sub?: string): string =>
    '<section class="bfe-chapter" id="sec-' + n + '" style="page-break-inside:avoid">'
    + '<div class="bfe-chapter-header">'
    + '<div>'
    + '<div class="bfe-kicker" style="display:flex;align-items:center;gap:10px">'
    + '<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:var(--bf-gold);color:#fff;font-size:11px;font-weight:800;font-family:var(--font-jetbrains-mono),monospace">' + n + '</span>'
    + '<span>' + (fr ? "Chapitre " : "Chapter ") + n + '</span>'
    + '</div>'
    + '<h2 class="bfe-title-chapter" style="font-size:32px;margin-top:10px">' + title + '</h2>'
    + (sub ? '<div style="font-size:14px;color:var(--bfe-muted);margin-top:6px;font-style:italic;font-family:var(--font-playfair)">' + sub + '</div>' : '')
    + '</div>'
    + '</div>';
  const secEnd = () => '</section>';
  const card = (inner: string, s?: string): string =>
    '<div style="background:#ffffff;border:1px solid #d4cec4;border-radius:12px;padding:22px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.03);' + (s || '') + '">' + inner + '</div>';
  const kp = (v: string, l: string, c?: string, sub?: string): string =>
    '<div style="text-align:center;padding:18px 14px 14px;border:1px solid #d4cec4;border-radius:12px;background:#ffffff;border-top:3px solid ' + (c || 'var(--bf-gold)') + '">'
    + '<div style="font-family:var(--font-jetbrains-mono),monospace;font-size:20px;font-weight:800;color:' + (c || 'var(--bf-gold)') + '">' + v + '</div>'
    + '<div style="font-family:var(--font-inter);font-size:11px;color:#666;margin-top:5px;font-weight:600;line-height:1.3">' + l + '</div>'
    + (sub ? '<div style="font-size:10px;color:#999;margin-top:2px">' + sub + '</div>' : '')
    + '</div>';
  const kvr = (k: string, v: string): string =>
    '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e8e4db;font-size:13px">'
    + '<span style="color:#666">' + k + '</span>'
    + '<span style="font-family:var(--font-jetbrains-mono),monospace;font-weight:600">' + v + '</span></div>';
  const obs = (title: string, text: string, type: "insight" | "watch" | "info" | "risk"): string => {
    const c: Record<string, [string, string]> = {
      insight: ["rgba(26,122,76,0.06)", "#2f8a4a"],
      watch: ["rgba(196,154,26,0.06)", "var(--bf-gold)"],
      info: ["rgba(26,39,68,0.04)", "#1a2744"],
      risk: ["rgba(185,28,28,0.06)", "#b93f43"],
    };
    const [bg, fg] = c[type] || c.info;
    return '<div style="background:' + bg + ';border:1px solid ' + fg + ';border-left:4px solid ' + fg + ';border-radius:8px;padding:14px 16px;margin:12px 0">'
      + '<div style="font-size:12px;font-weight:700;color:' + fg + ';margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">' + title + '</div>'
      + '<div style="font-size:13px;color:#1a1208;line-height:1.75">' + text + '</div></div>';
  };

  // ── AMF compliance badges ──────────────────────────────────────────
  const amfBadgeLabels = {
    scenario:   { fr: "Sc\u00e9nario explor\u00e9",                en: "Scenario explored",            bg: "#e8f4fd", color: "#1a5276", border: "#85c1e9" },
    estimation: { fr: "Estimation",                       en: "Estimate",                     bg: "#fef9e7", color: "#7d6608", border: "#f9e79f" },
    validation: { fr: "\u00c0 valider avec un professionnel",  en: "Verify with a professional",   bg: "#f2f3f4", color: "#5d6d7e", border: "#aeb6bf" },
  };
  const amfBadge = (type: "scenario" | "estimation" | "validation"): string => {
    const l = amfBadgeLabels[type];
    return '<span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;'
      + 'background:' + l.bg + ';color:' + l.color + ';border:1px solid ' + l.border + ';margin-bottom:8px">'
      + (fr ? l.fr : l.en) + '</span>';
  };
  const badgeScenario = () => amfBadge("scenario");
  const badgeEstimation = () => amfBadge("estimation");
  const badgeValidate = () => amfBadge("validation");

  const has = (s: ExpertSectionKey) => activeSections.includes(s);
  let secN = 0;
  let h = '';

  /*
    Plan v2.2 / Phase 4b + 4c: hybrid sheet shell with sticky rail TOC.
    .bfe-shell--guide is the 2-col editorial grid (300px rail + main).
    Mobile collapses to single-column via editorial.css media query.
    The rail content is built below from activeSections; it lives BEFORE
    <main> in DOM order so the editorial.css grid places it on the left.
  */

  // Build TOC entries from activeSections — needed for both the rail and
  // the inline (post-cover) TOC card. Computed up here so the rail can
  // be emitted before <main> in DOM order.
  const sectionLabels: Record<string, { fr: string; en: string }> = {
    sommaire_executif: { fr: "Sommaire exécutif", en: "Executive summary" },
    diagnostic_robustesse: { fr: "Diagnostic de robustesse", en: "Robustness diagnostic" },
    revenus_retraite: { fr: "Revenus à la retraite", en: "Retirement income" },
    projection_patrimoine: { fr: "Projection du patrimoine", en: "Wealth projection" },
    analyse_fiscale: { fr: "Analyse fiscale", en: "Tax analysis" },
    couple: { fr: "Analyse du ménage", en: "Household analysis" },
    immobilier: { fr: "Analyse immobilière", en: "Real estate analysis" },
    pension_db: { fr: "Pension à prestations déterminées", en: "Defined benefit pension" },
    corporatif: { fr: "Planification corporative", en: "Corporate planning" },
    remuneration: { fr: "Stratégie de rémunération", en: "Compensation strategy" },
    dettes: { fr: "Impact des dettes", en: "Debt impact" },
    decaissement: { fr: "Séquence de décaissement", en: "Withdrawal sequencing" },
    stress_tests: { fr: "Tests de résistance", en: "Stress tests" },
    assurance: { fr: "Analyse d'assurance", en: "Insurance analysis" },
    resp: { fr: "Régime enregistré d'épargne-études", en: "Registered Education Savings Plan" },
    priorites_action: { fr: "Leviers identifiés", en: "Identified levers" },
    observations_detaillees: { fr: "Observations détaillées", en: "Detailed observations" },
    comparaison_scenarios: { fr: "Comparaison de scénarios", en: "Scenario comparison" },
    driver_attribution: { fr: "Attribution des facteurs", en: "Driver attribution" },
    pour_professionnel: { fr: "Pour votre professionnel", en: "For your professional" },
    questions_fiscaliste: { fr: "Questions pour votre fiscaliste", en: "Questions for your tax advisor" },
    historique_modifications: { fr: "Historique des modifications", en: "Change history" },
    hypotheses_methodo: { fr: "Hypothèses et méthodologie", en: "Assumptions and methodology" },
    disclaimers: { fr: "Avertissements légaux", en: "Legal disclaimers" },
  };
  const tocSections: { key: ExpertSectionKey; label: string }[] = [];
  for (const s of activeSections) {
    const lbl = sectionLabels[s];
    if (lbl) tocSections.push({ key: s, label: fr ? lbl.fr : lbl.en });
  }

  h += '<div class="bfe-shell bfe-shell--guide" style="max-width:1380px;padding:28px 24px 80px">';

  // ── Sticky rail TOC (Plan v2.2 / Phase 4c) ─────────────────────────
  h += '<aside class="bfe-rail" data-bf-print-hide="1">'
    + '<div class="bfe-kicker" style="margin-bottom:14px">' + t("Plan du rapport", "Report outline") + '</div>'
    + '<nav class="bfe-nav" aria-label="' + t("Table des matières", "Table of contents") + '">';
  tocSections.forEach((s, i) => {
    h += '<a href="#sec-' + (i + 1) + '" data-bf-rail-link="' + (i + 1) + '">'
      + '<span style="font-family:var(--font-jetbrains-mono);font-size:11px;color:var(--bf-gold);font-weight:700;margin-right:8px;letter-spacing:0.04em">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<span style="font-size:13px;line-height:1.4">' + s.label + '</span>'
      + '</a>';
  });
  h += '</nav>'
    + '</aside>';

  h += '<main style="min-width:0">';

  // ═══ HEADER ═══
  h += '<section class="bfe-cover" style="text-align:left;display:grid;gap:18px">'
    + '<div class="bfe-kicker">buildfi.ca \u00b7 ' + REPORT_VERSION_EXPERT + ' \u00b7 ' + (D.nSim || 5000).toLocaleString() + ' simulations \u00b7 ' + D.prov + ' \u00b7 ' + new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA") + '</div>'
    + '<h1 class="bfe-title-cover" style="font-size:clamp(36px,5vw,54px);max-width:780px">'
    + t("Bilan Expert", "Expert Assessment") + '</h1>'
    + '<p class="bfe-chapter-frame" style="margin:0;color:var(--bfe-muted);max-width:760px">'
    + t(
        "Une analyse personnalis\u00e9e de votre plan de retraite, test\u00e9e contre des milliers de trajectoires de march\u00e9.",
        "A personalized analysis of your retirement plan, stress-tested against thousands of market trajectories."
      )
    + '</p>'
    + '<div style="display:flex;gap:36px;align-items:center;flex-wrap:wrap;margin-top:6px">'
    + '<svg width="120" height="120" viewBox="0 0 120 120">'
    + '<circle cx="60" cy="60" r="48" fill="none" stroke="var(--bfe-line)" stroke-width="10"/>'
    + '<circle cx="60" cy="60" r="48" fill="none" stroke="' + sC + '" stroke-width="10" stroke-dasharray="' + Math.round(circ) + '" stroke-dashoffset="' + Math.round(dashVal) + '" stroke-linecap="round" transform="rotate(-90 60 60)"/>'
    + '<text x="60" y="55" text-anchor="middle" font-size="32" font-weight="800" fill="var(--bfe-ink)" font-family="var(--font-playfair)">' + D.grade + '</text>'
    + '<text x="60" y="74" text-anchor="middle" font-size="13" fill="var(--bfe-muted)" font-family="var(--font-jetbrains-mono),monospace">' + D.successPct + '%</text></svg>'
    + '<div style="text-align:left;display:grid;gap:8px">'
    + '<div style="font-size:14px;color:var(--bfe-muted)">'
    + t("Probabilit\u00e9 de succ\u00e8s", "Success probability") + ': <span style="color:var(--bfe-ink);font-size:22px;font-family:var(--font-jetbrains-mono),monospace;font-weight:700">' + D.successPct + '%</span></div>'
    + '<div style="font-size:13px;color:var(--bfe-muted)">'
    + t("Patrimoine m\u00e9dian estim\u00e9", "Est. median wealth") + ': <strong style="color:var(--bfe-ink);font-family:var(--font-jetbrains-mono),monospace">' + f$(D.rMedF) + '</strong></div>'
    + '<div style="font-size:13px;color:var(--bfe-muted)">'
    + t("Revenu cible", "Target income") + ': <strong style="color:var(--bfe-ink);font-family:var(--font-jetbrains-mono),monospace">' + f$(D.retSpM) + t("/mois", "/mo") + '</strong></div>'
    + '<div style="font-size:13px;color:var(--bfe-muted)">'
    + t("Retraite cible", "Target retirement") + ': <strong style="color:var(--bfe-ink);font-family:var(--font-jetbrains-mono),monospace">' + D.retAge + '</strong></div>'
    + '</div></div>'
    + '</section>';

  // ═══ INLINE TOC (collapsed by default; mobile + print fallback) ═══
  // Sticky .bfe-rail above is canonical TOC on desktop. This <details>
  // is collapsed; user expands for outline overview below cover. Mobile
  // gets it as the only TOC since the rail collapses to a static block.
  h += '<details class="bf-inline-toc" style="margin-bottom:32px;border:1px solid var(--bfe-line);border-radius:var(--bf-radius-md);background:var(--bfe-panel);padding:18px 22px">'
    + '<summary style="cursor:pointer;font-family:var(--font-playfair);font-size:16px;font-weight:700;color:var(--bfe-ink);list-style:none">'
    + t("Table des matières", "Table of contents") + '</summary>'
    + '<div style="margin-top:14px;columns:2;column-gap:24px">';
  tocSections.forEach((s, i) => {
    h += '<div style="font-size:12px;padding:4px 0;break-inside:avoid;color:var(--bfe-muted)">'
      + '<a href="#sec-' + (i + 1) + '" style="text-decoration:none;color:inherit;display:flex;gap:8px;align-items:baseline">'
      + '<span style="font-family:var(--font-jetbrains-mono);color:var(--bf-gold);font-weight:700">' + String(i + 1).padStart(2, '0') + '</span>'
      + '<span>' + s.label + '</span>'
      + '</a></div>';
  });
  h += '</div></details>';
  // ═══ SECTIONS ═══

  // S1: Sommaire executif
  if (has("sommaire_executif")) {
    secN++;
    h += secH(secN, t("Sommaire ex\u00e9cutif", "Executive summary"), t("Les constats cl\u00e9s de cette analyse", "Key findings from this analysis"));
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:18px" class="rpt-grid3">';
    h += kp(D.successPct + '%', t("Probabilit\u00e9 de succ\u00e8s", "Success probability"), sC);
    h += kp(f$(D.rMedF), t("Patrimoine m\u00e9dian (r\u00e9el)", "Median wealth (real)"), "#1a2744");
    h += kp(D.grade, t("Note globale", "Overall grade"), sC);
    h += '</div>';
    h += aiSlot("sommaire_executif", t(
      "Cette analyse repose sur " + (D.nSim || 5000).toLocaleString() + " simulations Monte Carlo. "
      + "Le taux de succ\u00e8s de " + D.successPct + "% correspondrait \u00e0 une note de " + D.grade + ".",
      "This analysis is based on " + (D.nSim || 5000).toLocaleString() + " Monte Carlo simulations. "
      + "The " + D.successPct + "% success rate would correspond to a grade of " + D.grade + "."
    ));
    h += secEnd();
  }

  // S2: Diagnostic robustesse
  if (has("diagnostic_robustesse")) {
    secN++;
    h += secH(secN, t("Diagnostic de robustesse", "Robustness diagnostic"), t("Distribution des " + (D.nSim || 5000).toLocaleString() + " sc\u00e9narios", "Distribution of " + (D.nSim || 5000).toLocaleString() + " scenarios"));
    h += badgeScenario();

    // Fan chart
    const pD: any[] = D.pD || [];
    if (pD.length > 2) {
      const ages: number[] = pD.map((r: any) => r.age);
      const W = 720, H = 260, PL = 54, PR = 12, PT = 20, PB = 32;
      const CW = W - PL - PR, CH = H - PT - PB;
      let mx = 0;
      pD.forEach((r: any) => { mx = Math.max(mx, r.rp95 || r.p95 || 0); });
      mx = Math.max(mx * 1.05, 100000);
      const sx = (i: number) => PL + i / (ages.length - 1) * CW;
      const sy = (v: number) => PT + CH - Math.min(v, mx) / mx * CH;
      const pts = (key: string) => pD.map((r: any, i: number) => sx(i) + "," + sy(r[key] || 0)).join(" ");
      const ptsRev = (key: string) => pD.slice().reverse().map((r: any, i: number) => sx(pD.length - 1 - i) + "," + sy(r[key] || 0)).join(" ");

      let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
      // Grid
      for (let g = 0; g <= 4; g++) {
        const yy = PT + CH - CH * g / 4;
        svg += '<line x1="' + PL + '" x2="' + (W - PR) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e8e4db" stroke-width="0.5"/>';
        svg += '<text x="' + (PL - 6) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="9" fill="#999" font-family="var(--font-jetbrains-mono),monospace">' + Math.round(mx * g / 4 / 1000) + 'K</text>';
      }
      // P5-P95 band
      svg += '<polygon points="' + pts("rp95") + ' ' + ptsRev("rp5") + '" fill="rgba(196,154,26,0.08)"/>';
      // P25-P75 band
      svg += '<polygon points="' + pts("rp75") + ' ' + ptsRev("rp25") + '" fill="rgba(196,154,26,0.2)"/>';
      // Median line
      svg += '<polyline points="' + pts("rp50") + '" fill="none" stroke="var(--bf-gold)" stroke-width="2.5" stroke-linejoin="round"/>';
      // Retirement marker
      const retIdx = ages.indexOf(D.retAge);
      if (retIdx >= 0) {
        svg += '<line x1="' + sx(retIdx) + '" x2="' + sx(retIdx) + '" y1="' + PT + '" y2="' + (PT + CH) + '" stroke="#1a2744" stroke-dasharray="4,3" stroke-width="1"/>';
        svg += '<text x="' + (sx(retIdx) + 4) + '" y="' + (PT + 12) + '" font-size="9" fill="#1a2744" font-weight="700" font-family="var(--font-inter)">' + t("Retraite", "Ret.") + '</text>';
      }
      // Age labels
      ages.forEach((a: number, i: number) => {
        if (i % Math.ceil(ages.length / 8) === 0 || i === ages.length - 1)
          svg += '<text x="' + sx(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="8" fill="#999" font-family="var(--font-jetbrains-mono),monospace">' + a + '</text>';
      });
      // Legend
      svg += '<rect x="' + PL + '" y="3" width="10" height="10" fill="rgba(196,154,26,0.08)" rx="2"/><text x="' + (PL + 13) + '" y="12" font-size="9" fill="#666" font-family="var(--font-inter)">P5\u2013P95</text>';
      svg += '<rect x="' + (PL + 65) + '" y="3" width="10" height="10" fill="rgba(196,154,26,0.2)" rx="2"/><text x="' + (PL + 78) + '" y="12" font-size="9" fill="#666" font-family="var(--font-inter)">P25\u2013P75</text>';
      svg += '<line x1="' + (PL + 140) + '" x2="' + (PL + 155) + '" y1="8" y2="8" stroke="var(--bf-gold)" stroke-width="2.5"/><text x="' + (PL + 158) + '" y="12" font-size="9" fill="#666" font-family="var(--font-inter)">' + t("M\u00e9diane", "Median") + '</text>';
      svg += '</svg>';
      h += card(svg);
    }

    // KPI row
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:10px;margin-bottom:14px" class="rpt-grid2">';
    h += kp(f$(D.rP5F), "P5", "#b93f43", t("Sc\u00e9nario pessimiste", "Pessimistic scenario"));
    h += kp(f$(D.rP25F), "P25", "var(--bf-gold)");
    h += kp(f$(D.rP75F), "P75", "#2f8a4a");
    h += kp(f$(D.rP95F), "P95", "#2f8a4a", t("Sc\u00e9nario optimiste", "Optimistic scenario"));
    h += '</div>';

    // Ruin risk
    if (D.ruinPct > 0 || D.medRuin < 999) {
      h += obs(t("Risque d'\u00e9puisement", "Ruin risk"),
        t("Dans " + Math.round(D.ruinPct * 100) + "% des sc\u00e9narios, le patrimoine pourrait s'\u00e9puiser avant le d\u00e9c\u00e8s.",
          "In " + Math.round(D.ruinPct * 100) + "% of scenarios, wealth could be depleted before death."),
        D.ruinPct > 0.15 ? "risk" : "watch");
    }

    h += aiSlot("diagnostic_robustesse");
    h += secEnd();
  }

  // S3: Revenus retraite
  if (has("revenus_retraite")) {
    secN++;
    h += secH(secN, t("Revenus \u00e0 la retraite", "Retirement income"), t("Sources et couverture", "Sources and coverage"));
    h += badgeEstimation();
    const items = [
      { v: D.qppMonthly, c: "#2f8a4a", l: gP },
      { v: D.oasMonthly, c: "#4680C0", l: oN },
      { v: D.dbPensionMonthly, c: "#4680C0", l: t("Pension employeur", "Employer pension") },
      { v: D.gapMonthly, c: "var(--bf-gold)", l: t("\u00c9pargne personnelle", "Personal savings") },
    ].filter(i => i.v > 0);
    const total = Math.max(1, items.reduce((s, i) => s + i.v, 0));

    h += card(
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px" class="rpt-grid2">'
      + kvr(gP, f$(D.qppMonthly) + t("/mois", "/mo"))
      + kvr(oN, f$(D.oasMonthly) + t("/mois", "/mo"))
      + (D.dbPensionMonthly > 0 ? kvr(t("Pension employeur", "Employer pension"), f$(D.dbPensionMonthly) + t("/mois", "/mo")) : '')
      + kvr(t("Total gouvernemental", "Total government"), f$(D.govMonthly) + t("/mois", "/mo"))
      + kvr(t("Couverture gouvernementale", "Government coverage"), fPct(D.coveragePct))
      + kvr(t("D\u00e9ficit mensuel", "Monthly gap"), f$(D.gapMonthly) + t("/mois", "/mo"))
      + kvr(t("Taux de retrait", "Withdrawal rate"), D.withdrawalRatePct + '%')
      + '</div>'
    );
    if (D.withdrawalRatePct > 5) {
      h += obs(t("Taux de retrait \u00e9lev\u00e9", "High withdrawal rate"),
        t("Le taux de retrait de " + D.withdrawalRatePct + "% d\u00e9passerait le seuil de 4% g\u00e9n\u00e9ralement observ\u00e9. Les donn\u00e9es sugg\u00e8rent un risque accru d'\u00e9puisement pr\u00e9matur\u00e9.",
          "The " + D.withdrawalRatePct + "% withdrawal rate would exceed the commonly observed 4% threshold. Data suggests increased risk of premature depletion."),
        "watch");
    }
    h += aiSlot("revenus_retraite");
    h += secEnd();
  }

  // S4: Projection patrimoine
  if (has("projection_patrimoine")) {
    secN++;
    h += secH(secN, t("Projection du patrimoine", "Wealth projection"), t("Accumulation et d\u00e9caissement", "Accumulation and decumulation"));
    h += badgeEstimation();

    // Stacked area chart
    const rd = D.medRevData || [];
    if (rd.length > 2) {
      const ages: number[] = [];
      for (let a = D.age; a <= D.deathAge; a++) ages.push(a);
      const W = 720, H = 240, PL = 54, PR2 = 12, PT2 = 20, PB2 = 30;
      const CW2 = W - PL - PR2, CH2 = H - PT2 - PB2;
      let maxV = 0;
      const data = ages.map(a => {
        const r = rd.find((x: any) => x.age === a) || {};
        const tot = (r.aRR || 0) + (r.aTF || 0) + (r.aNR || 0) + (r.aLIRA || 0) + (r.aDC || 0) + (r.corpBal || 0);
        if (tot > maxV) maxV = tot;
        return { a, rr: r.aRR || 0, tf: r.aTF || 0, nr: r.aNR || 0, tot };
      });
      maxV = Math.max(maxV * 1.05, 100000);
      const sx2 = (i: number) => PL + i / (ages.length - 1) * CW2;
      const sy2 = (v: number) => PT2 + CH2 - Math.min(v, maxV) / maxV * CH2;

      let svg2 = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
      for (let g = 0; g <= 4; g++) {
        const yy = PT2 + CH2 - CH2 * g / 4;
        svg2 += '<line x1="' + PL + '" x2="' + (W - PR2) + '" y1="' + yy + '" y2="' + yy + '" stroke="#e8e4db" stroke-width="0.5"/>';
        svg2 += '<text x="' + (PL - 6) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="9" fill="#999" font-family="var(--font-jetbrains-mono),monospace">' + Math.round(maxV * g / 4 / 1000) + 'K</text>';
      }
      // Total line
      const ptsStr = data.map((d, i) => sx2(i) + "," + sy2(d.tot)).join(" ");
      svg2 += '<polygon points="' + ptsStr + ' ' + sx2(data.length - 1) + ',' + (PT2 + CH2) + ' ' + PL + ',' + (PT2 + CH2) + '" fill="rgba(196,154,26,0.12)"/>';
      svg2 += '<polyline points="' + ptsStr + '" fill="none" stroke="var(--bf-gold)" stroke-width="2" stroke-linejoin="round"/>';
      // Retirement marker
      const ri = ages.indexOf(D.retAge);
      if (ri >= 0) {
        svg2 += '<line x1="' + sx2(ri) + '" x2="' + sx2(ri) + '" y1="' + PT2 + '" y2="' + (PT2 + CH2) + '" stroke="#1a2744" stroke-dasharray="4,3" stroke-width="1"/>';
      }
      ages.forEach((a, i) => {
        if (i % 10 === 0 || a === D.retAge || a === D.deathAge)
          svg2 += '<text x="' + sx2(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="8" fill="#999" font-family="var(--font-jetbrains-mono),monospace">' + a + '</text>';
      });
      svg2 += '</svg>';
      h += card(svg2);
    }

    // Projection table
    if (D.projTable && D.projTable.length > 0) {
      h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:14px">'
        + '<thead><tr style="background:#faf8f4;border-bottom:2px solid #d4cec4">'
        + '<th style="padding:10px 8px;text-align:left;font-weight:700;color:#1a2744">' + t("\u00c2ge", "Age") + '</th>'
        + '<th style="padding:10px 8px;text-align:right;font-weight:700;color:#1a2744">P25</th>'
        + '<th style="padding:10px 8px;text-align:right;font-weight:700;color:#1a2744">P50</th>'
        + '<th style="padding:10px 8px;text-align:right;font-weight:700;color:#1a2744">P75</th>'
        + '</tr></thead><tbody>';
      D.projTable.forEach((row: any) => {
        h += '<tr style="border-bottom:1px solid #e8e4db">'
          + '<td style="padding:8px;font-family:var(--font-jetbrains-mono),monospace;font-weight:600">' + row.age + '</td>'
          + '<td style="padding:8px;text-align:right;font-family:var(--font-jetbrains-mono),monospace;color:#b93f43">' + f$(row.p25) + '</td>'
          + '<td style="padding:8px;text-align:right;font-family:var(--font-jetbrains-mono),monospace;color:var(--bf-gold)">' + f$(row.p50) + '</td>'
          + '<td style="padding:8px;text-align:right;font-family:var(--font-jetbrains-mono),monospace;color:#2f8a4a">' + f$(row.p75) + '</td>'
          + '</tr>';
      });
      h += '</tbody></table></div>';
    }

    h += aiSlot("projection_patrimoine");
    h += secEnd();
  }

  // S5: Analyse fiscale
  if (has("analyse_fiscale")) {
    secN++;
    h += secH(secN, t("Analyse fiscale", "Tax analysis"), t("Taux effectifs et opportunit\u00e9s", "Effective rates and opportunities"));
    h += badgeEstimation();
    h += card(
      kvr(t("Taux effectif actuel (travail)", "Current effective rate (work)"), fPct(D.taxCurrentEffective))
      + kvr(t("Taux effectif estim\u00e9 (retraite)", "Est. effective rate (retirement)"), fPct(D.taxRetirementEffective))
      + kvr(t("Taux marginal actuel", "Current marginal rate"), fPct(D.taxCurrentMarginal))
      + kvr(t("Co\u00fbt cumulatif MER estim\u00e9", "Est. cumulative MER cost"), f$(D.feeCostLifetime))
      + kvr(t("Imp\u00f4t estim\u00e9 au d\u00e9c\u00e8s (m\u00e9dian)", "Est. tax at death (median)"), f$(D.medEstateTax))
    );
    if (D.taxRetirementEffective < D.taxCurrentEffective - 5) {
      h += obs(t("Potentiel fiscal", "Tax potential"),
        t("Le taux effectif pourrait diminuer de " + D.taxCurrentEffective + "% \u00e0 " + D.taxRetirementEffective + "% \u00e0 la retraite.",
          "The effective rate could decrease from " + D.taxCurrentEffective + "% to " + D.taxRetirementEffective + "% in retirement."),
        "insight");
    }
    h += aiSlot("analyse_fiscale");
    h += secEnd();
  }

  // ── Conditional sections ────────────────────────────────────────

  // Couple
  if (has("couple")) {
    secN++;
    h += secH(secN, t("Analyse du m\u00e9nage", "Household analysis"), t("Impact du conjoint sur le plan", "Partner impact on the plan"));
    h += card(
      kvr(t("\u00c2ge du conjoint", "Partner age"), (D.cAge || "\u2014") + " " + t("ans", "yrs"))
      + kvr(t("Retraite du conjoint", "Partner retirement"), (D.cRetAge || "\u2014") + " " + t("ans", "yrs"))
      + kvr(t("Revenu du conjoint", "Partner income"), f$(D.cSal || 0))
      + kvr(t("\u00c9pargne du conjoint", "Partner savings"), f$((D.cRRSP || 0) + (D.cTFSA || 0) + (D.cNR || 0)))
    );
    h += aiSlot("couple", t(
      "L'analyse int\u00e8gre les revenus et l'\u00e9pargne des deux conjoints dans les projections.",
      "The analysis integrates both partners' income and savings into projections."
    ));
    h += secEnd();
  }

  // Immobilier
  if (has("immobilier")) {
    secN++;
    h += secH(secN, t("Analyse immobili\u00e8re", "Real estate analysis"));
    h += card(
      kvr(t("Valeur de la propri\u00e9t\u00e9", "Property value"), f$(D.homeVal))
      + kvr(t("Solde hypoth\u00e9caire", "Mortgage balance"), f$(D.mortBal))
      + kvr(t("\u00c9quit\u00e9", "Equity"), f$(D.equity))
    );
    h += aiSlot("immobilier");
    h += secEnd();
  }

  // Pension DB
  if (has("pension_db")) {
    secN++;
    h += secH(secN, t("Pension \u00e0 prestations d\u00e9termin\u00e9es", "Defined benefit pension"));
    h += card(
      kvr(t("Revenu mensuel PD", "Monthly DB income"), f$(D.dbPensionMonthly) + t("/mois", "/mo"))
      + kvr(t("Couverture", "Coverage"), fPct(D.dbPensionMonthly > 0 && D.retSpM > 0 ? Math.round(D.dbPensionMonthly / D.retSpM * 100) : 0))
    );
    h += aiSlot("pension_db");
    h += secEnd();
  }

  // Corporatif
  if (has("corporatif")) {
    secN++;
    h += secH(secN, t("Planification corporative", "Corporate planning"));
    h += aiSlot("corporatif", t(
      "La structure corporative est int\u00e9gr\u00e9e dans les projections. Les b\u00e9n\u00e9fices non r\u00e9partis sont mod\u00e9lis\u00e9s selon le taux d'extraction d\u00e9fini.",
      "The corporate structure is integrated into projections. Retained earnings are modeled based on the defined extraction rate."
    ));
    h += secEnd();
  }

  // Remuneration
  if (has("remuneration")) {
    secN++;
    h += secH(secN, t("Strat\u00e9gie de r\u00e9mun\u00e9ration", "Compensation strategy"));
    h += aiSlot("remuneration", t(
      "Le choix entre salaire et dividendes d\u00e9pendrait du taux marginal et des cotisations au " + gP + ".",
      "The salary vs dividends choice would depend on the marginal rate and " + gP + " contributions."
    ));
    h += secEnd();
  }

  // Dettes
  if (has("dettes")) {
    secN++;
    h += secH(secN, t("Impact des dettes", "Debt impact"));
    h += card(
      kvr(t("Solde total des dettes", "Total debt balance"), f$(D.debtBal))
      + kvr(t("Co\u00fbt annuel estim\u00e9", "Est. annual cost"), f$(D.debtAnnualCost))
    );
    h += aiSlot("dettes", t(
      "Le co\u00fbt math\u00e9matique des dettes est de " + f$(D.debtAnnualCost) + " par ann\u00e9e.",
      "The mathematical cost of debt is " + f$(D.debtAnnualCost) + " per year."
    ));
    h += secEnd();
  }

  // Decaissement
  if (has("decaissement")) {
    secN++;
    h += secH(secN, t("S\u00e9quence de d\u00e9caissement", "Withdrawal sequencing"));
    h += badgeEstimation();
    h += aiSlot("decaissement", t(
      "Les donn\u00e9es sugg\u00e8rent que l'ordre de d\u00e9caissement des comptes pourrait avoir un impact significatif sur la long\u00e9vit\u00e9 du patrimoine.",
      "Data suggests the account withdrawal order could significantly impact wealth longevity."
    ));
    h += secEnd();
  }

  // Stress tests
  if (has("stress_tests")) {
    secN++;
    h += secH(secN, t("Tests de r\u00e9sistance", "Stress tests"), t("Sc\u00e9narios adverses", "Adverse scenarios"));
    h += badgeScenario();
    const stress = [
      { t2: t("Krach 2008", "2008 Crash"), d2: t("\u221238% actions, reprise 5 ans", "\u221238% equity, 5yr recovery"), delta: -Math.round(D.successPct * 0.10) },
      { t2: t("Inflation 70s", "70s Inflation"), d2: t("+3% inflation pendant 7 ans", "+3% inflation for 7 years"), delta: -Math.round(D.successPct * 0.12) },
      { t2: t("Long\u00e9vit\u00e9 +5 ans", "Longevity +5 yrs"), d2: t("Esp\u00e9rance de vie +5 ans", "Life expectancy +5 yrs"), delta: -Math.round(D.successPct * 0.09) },
    ];
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px" class="rpt-grid3">';
    stress.forEach(s => {
      h += '<div style="background:rgba(185,28,28,0.04);border:1px solid rgba(185,28,28,.15);border-radius:10px;padding:16px">'
        + '<div style="font-size:13px;font-weight:700;color:#1a2744;margin-bottom:6px">' + s.t2 + '</div>'
        + '<div style="font-size:11px;color:#666;line-height:1.5;margin-bottom:10px">' + s.d2 + '</div>'
        + '<div style="font-family:var(--font-jetbrains-mono),monospace;font-size:18px;font-weight:800;color:#b93f43">' + s.delta + '%</div></div>';
    });
    h += '</div>';
    h += '<div style="font-size:10px;color:#888;font-style:italic;margin:-6px 0 12px;padding-left:2px">' + t("Estimations basées sur des coefficients historiques, pas des simulations additionnelles.", "Estimates based on historical coefficients, not additional simulations.") + '</div>';
    h += aiSlot("stress_tests");
    h += secEnd();
  }

  // Assurance
  if (has("assurance")) {
    secN++;
    h += secH(secN, t("Analyse d'assurance", "Insurance analysis"));
    h += card(
      kvr(t("Prestation d'assurance vie", "Life insurance benefit"), f$(D.lifeInsBenefit))
      + kvr(t("Prime annuelle", "Annual premium"), f$(D.lifeInsPremium * 12))
    );
    h += aiSlot("assurance");
    h += secEnd();
  }

  // RESP
  if (has("resp")) {
    secN++;
    h += secH(secN, t("R\u00e9gime enregistr\u00e9 d'\u00e9pargne-\u00e9tudes", "Registered Education Savings Plan"));
    h += card(
      kvr(t("Nombre d'enfants", "Number of children"), String(D.respKids || 0))
      + kvr(t("Solde REEE", "RESP balance"), f$(D.respBal))
    );
    h += aiSlot("resp");
    h += secEnd();
  }

  // ── Analysis sections ───────────────────────────────────────────

  // Priorites action
  if (has("priorites_action")) {
    secN++;
    h += secH(secN, t("Leviers identifi\u00e9s", "Identified levers"), t("Observations sur les axes d'am\u00e9lioration possibles", "Observations on possible improvement areas"));
    h += aiSlot("priorites_action", t(
      "Les leviers les plus significatifs identifi\u00e9s par l'analyse incluraient l'\u00e2ge de retraite, le taux de retrait et la strat\u00e9gie de d\u00e9caissement.",
      "The most significant levers identified by the analysis would include retirement age, withdrawal rate, and decumulation strategy."
    ));
    h += badgeValidate();
    h += secEnd();
  }

  // Observations detaillees
  if (has("observations_detaillees")) {
    secN++;
    h += secH(secN, t("Observations d\u00e9taill\u00e9es", "Detailed observations"));
    h += badgeEstimation();
    h += aiSlot("observations_detaillees", t(
      "Les donn\u00e9es de la simulation sugg\u00e8rent plusieurs constats. Le taux de succ\u00e8s de " + D.successPct + "% correspondrait \u00e0 une note de " + D.grade + ". "
      + "Le patrimoine m\u00e9dian estim\u00e9 \u00e0 la fin de l'horizon serait de " + f$(D.rMedF) + " en dollars r\u00e9els.",
      "Simulation data suggests several findings. The " + D.successPct + "% success rate would correspond to a grade of " + D.grade + ". "
      + "The estimated median wealth at the end of the horizon would be " + f$(D.rMedF) + " in real dollars."
    ));
    h += secEnd();
  }

  // ── Exclusive Expert sections ───────────────────────────────────

  // Comparaison scenarios
  if (has("comparaison_scenarios")) {
    secN++;
    h += secH(secN, t("Comparaison de sc\u00e9narios", "Scenario comparison"));
    h += badgeScenario();
    h += aiSlot("comparaison_scenarios");
    // Data-driven fallback table when comparisonData is provided (even without AI narration)
    if (comparisonData && comparisonData.length > 0) {
      h += '<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px">';
      h += '<thead><tr style="background:#1a2744;color:#ffffff">'
        + '<th style="padding:10px 14px;text-align:left;border-radius:8px 0 0 0">' + t("Variante", "Variant") + '</th>'
        + '<th style="padding:10px 14px;text-align:center">' + t("Taux de succ\u00e8s", "Success rate") + '</th>'
        + '<th style="padding:10px 14px;text-align:right;border-radius:0 8px 0 0">' + t("Delta patrimoine", "Wealth delta") + '</th>'
        + '</tr></thead><tbody>';
      comparisonData.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#ffffff' : '#faf8f4';
        const deltaColor = row.wealthDelta >= 0 ? '#2f8a4a' : '#b93f43';
        const deltaSign = row.wealthDelta >= 0 ? '+' : '';
        h += '<tr style="background:' + bg + '">'
          + '<td style="padding:10px 14px;border-bottom:1px solid #e8e4db;font-weight:600;color:#1a2744">' + row.label + '</td>'
          + '<td style="padding:10px 14px;border-bottom:1px solid #e8e4db;text-align:center;font-family:var(--font-jetbrains-mono),monospace;font-weight:600;color:' + gCol(row.successPct / 100) + '">' + row.successPct + '\u00a0%</td>'
          + '<td style="padding:10px 14px;border-bottom:1px solid #e8e4db;text-align:right;font-family:var(--font-jetbrains-mono),monospace;font-weight:600;color:' + deltaColor + '">' + deltaSign + f$(row.wealthDelta) + '</td>'
          + '</tr>';
      });
      h += '</tbody></table>';
    } else if (!ai["comparaison_scenarios"]) {
      // No AI and no comparisonData — show instructional fallback
      h += '<div style="font-size:13px;color:#666;line-height:1.7;margin:10px 0;font-style:italic">'
        + t(
          "Utilisez le simulateur pour comparer différents scénarios, puis régénérez le bilan pour inclure la comparaison.",
          "Use the simulator to compare different scenarios, then regenerate the assessment to include the comparison."
        )
        + '</div>';
    }
    h += secEnd();
  }

  // Driver attribution
  if (has("driver_attribution")) {
    secN++;
    h += secH(secN, t("Attribution des facteurs", "Driver attribution"), t("Pourquoi chaque indicateur se situe \u00e0 ce niveau", "Why each indicator is at this level"));
    h += badgeEstimation();
    h += aiSlot("driver_attribution", t(
      "Le taux de succ\u00e8s de " + D.successPct + "% serait principalement influenc\u00e9 par le taux de retrait ("
      + D.withdrawalRatePct + "%), la couverture gouvernementale (" + D.coveragePct + "%), et l'horizon d'accumulation restant ("
      + (D.retAge - D.age) + " ans).",
      "The " + D.successPct + "% success rate would be primarily influenced by the withdrawal rate ("
      + D.withdrawalRatePct + "%), government coverage (" + D.coveragePct + "%), and remaining accumulation horizon ("
      + (D.retAge - D.age) + " years)."
    ));
    h += secEnd();
  }

  // Pour professionnel
  if (has("pour_professionnel")) {
    secN++;
    h += secH(secN, t("Pour votre professionnel", "For your professional"), t("Param\u00e8tres cl\u00e9s et hypoth\u00e8ses", "Key parameters and assumptions"));
    h += card(
      kvr(t("Simulations", "Simulations"), String(D.nSim || 5000))
      + kvr(t("Rendement esp\u00e9r\u00e9", "Expected return"), (D.expReturn * 100).toFixed(1) + '%')
      + kvr(t("Inflation", "Inflation"), ((D.inf || 0.02) * 100).toFixed(1) + '%')
      + kvr(t("Allocation actions", "Equity allocation"), ((params.allocR || 0.7) * 100).toFixed(0) + '%')
      + kvr(t("MER pond\u00e9r\u00e9", "Weighted MER"), (D.merWeighted * 100).toFixed(2) + '%')
      + kvr(t("Esp\u00e9rance de vie", "Life expectancy"), D.avgDeath + " " + t("ans", "yrs"))
    );
    h += aiSlot("pour_professionnel");
    h += badgeValidate();
    h += secEnd();
  }

  // Questions fiscaliste
  if (has("questions_fiscaliste")) {
    secN++;
    h += secH(secN, t("Questions pour votre fiscaliste", "Questions for your tax advisor"));
    h += badgeValidate();
    h += aiSlot("questions_fiscaliste", t(
      "1. Quelle serait la strat\u00e9gie optimale de d\u00e9caissement entre le REER et le CELI?\n"
      + "2. Le meltdown REER serait-il avantageux dans ma situation?\n"
      + "3. Comment optimiser le fractionnement des revenus de retraite?\n"
      + "4. Quel serait l'impact fiscal de reporter le " + gP + " \u00e0 " + D.qppAge + " ans?\n"
      + "5. Comment minimiser l'imp\u00f4t au d\u00e9c\u00e8s sur le REER r\u00e9siduel?",
      "1. What would be the optimal withdrawal strategy between RRSP and TFSA?\n"
      + "2. Would RRSP meltdown be advantageous in my situation?\n"
      + "3. How to optimize retirement income splitting?\n"
      + "4. What would be the tax impact of deferring " + gP + " to age " + D.qppAge + "?\n"
      + "5. How to minimize tax at death on residual RRSP?"
    ));
    h += secEnd();
  }

  // Historique modifications
  if (has("historique_modifications")) {
    secN++;
    h += secH(secN, t("Historique des modifications", "Change history"));
    h += aiSlot("historique_modifications");
    h += secEnd();
  }

  // Hypotheses methodo
  if (has("hypotheses_methodo")) {
    secN++;
    h += secH(secN, t("Hypoth\u00e8ses et m\u00e9thodologie", "Assumptions and methodology"));
    h += card(
      '<div style="font-size:12px;color:#666;line-height:1.8">'
      + t("Cette analyse utilise une simulation Monte Carlo avec ", "This analysis uses a Monte Carlo simulation with ")
      + (D.nSim || 5000).toLocaleString()
      + t(" sc\u00e9narios al\u00e9atoires. ", " random scenarios. ")
      + t("Les rendements suivent une distribution t de Student (df=5) pour mieux capturer les \u00e9v\u00e9nements extr\u00eames. ", "Returns follow a Student t-distribution (df=5) to better capture tail events. ")
      + t("Les constantes fiscales sont celles de 2026. ", "Tax constants are from 2026. ")
      + t("L'inflation de base est de " + ((D.inf || 0.02) * 100).toFixed(1) + "%. ", "Base inflation is " + ((D.inf || 0.02) * 100).toFixed(1) + "%. ")
      + t("La mortalit\u00e9 suit les tables CPM-2023.", "Mortality follows CPM-2023 tables.")
      + '</div>'
    );
    h += aiSlot("hypotheses_methodo");
    h += secEnd();
  }

  // Disclaimers (always last)
  if (has("disclaimers")) {
    secN++;
    h += secH(secN, t("Avertissements l\u00e9gaux", "Legal disclaimers"));
    h += '<div style="background:#faf8f4;border:1px solid #d4cec4;border-radius:10px;padding:20px;font-size:12px;color:#666;line-height:1.8">'
      + t(
        "Ce bilan est un outil \u00e9ducatif. Il ne constitue pas un conseil financier, fiscal ou juridique. "
        + "Les projections reposent sur des hypoth\u00e8ses simplifi\u00e9es et des al\u00e9as mod\u00e9lis\u00e9s. "
        + "Les r\u00e9sultats pass\u00e9s ne garantissent pas les r\u00e9sultats futurs. "
        + "Consultez un professionnel certifi\u00e9 (planificateur financier, fiscaliste, notaire) avant de prendre toute d\u00e9cision financi\u00e8re. "
        + "buildfi.ca n'est pas un courtier, un conseiller en placement ni un cabinet de services financiers au sens de la Loi sur la distribution de produits et services financiers.",
        "This assessment is an educational tool. It does not constitute financial, tax, or legal advice. "
        + "Projections are based on simplified assumptions and modeled uncertainties. "
        + "Past results do not guarantee future outcomes. "
        + "Consult a certified professional (financial planner, tax advisor, notary) before making any financial decision. "
        + "buildfi.ca is not a broker, investment advisor, or financial services firm."
      )
      + '</div>';
    h += aiSlot("disclaimers");
    h += secEnd();
  }

  // ── Estate summary ──────────────────────────────────────────────
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px" class="rpt-grid2">';
  h += kp(f$(D.medEstateNet), t("Succession nette estim\u00e9e", "Est. net estate"), "#2f8a4a", t("Sc\u00e9nario m\u00e9dian", "Median scenario"));
  h += kp(f$(D.medEstateTax), t("Imp\u00f4t estim\u00e9 au d\u00e9c\u00e8s", "Est. tax at death"), "#b93f43", t("Sc\u00e9nario m\u00e9dian", "Median scenario"));
  h += '</div>';

  // ── Print button ────────────────────────────────────────────────
  h += '<div style="margin-top:16px" class="no-print">'
    + '<div style="display:flex;align-items:center;gap:12px;padding:16px;border-radius:10px;border:1px solid #d4cec4;background:#ffffff;cursor:pointer" onclick="window.print()">'
    + '<span style="font-size:18px;color:#1a2744">&#128424;</span>'
    + '<div><div style="font-size:13px;font-weight:600;color:#1a2744">' + t("Imprimer ou sauvegarder en PDF", "Print or save as PDF") + '</div>'
    + '<div style="font-size:11px;color:#666">' + t("Conservez une copie de votre bilan", "Keep a copy of your assessment") + '</div></div></div></div>';

  // ═══ FEEDBACK STARS (injected by outer function if feedbackToken provided) ═══
  h += '<!-- FEEDBACK_STARS -->';

  // ═══ REFERRAL ═══
  h += '<div style="text-align:center;margin:16px 0;padding:12px;border:1px solid #e8e4db;border-radius:8px;font-size:12px;color:#999;line-height:1.8">';
  h += t("Partagez BuildFi avec un proche \u2014 15\u00a0% de rabais appliqu\u00e9 automatiquement via votre lien.", "Share BuildFi with someone you know \u2014 15% off applied automatically through your link.");
  h += ' <a href="https://www.buildfi.ca" style="color:var(--bf-gold);text-decoration:none;font-weight:600">buildfi.ca</a>';
  h += '</div>';

  // ── Footer ──────────────────────────────────────────────────────
  h += '<div style="text-align:center;margin-top:40px;padding-top:20px;border-top:1px solid #e8e4db;font-size:11px;color:#999">'
    + 'buildfi.ca \u2014 ' + t("\u00c0 titre informatif seulement", "For informational purposes only")
    + ' \u2014 ' + REPORT_VERSION_EXPERT
    + '<div style="margin-top:6px;font-size:10px">'
    + '<a href="https://www.buildfi.ca/conditions" style="color:var(--bf-gold);text-decoration:none">' + t("Conditions","Terms") + '</a>'
    + ' · <a href="https://www.buildfi.ca/confidentialite" style="color:var(--bf-gold);text-decoration:none">' + t("Confidentialit\u00e9","Privacy") + '</a>'
    + ' · <a href="https://www.buildfi.ca/avis-legal" style="color:var(--bf-gold);text-decoration:none">' + t("Avis l\u00e9gal","Legal") + '</a>'
    + '</div></div>';

  h += '</main>'; // close .bfe-shell main column (Plan v2.2 / Phase 4b)
  h += '</div>'; // close .bfe-shell wrapper
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API: renderReportHTMLExpert()
// Wraps renderExpertReport in a complete HTML document
// ══════════════════════════════════════════════════════════════════════
export function renderReportHTMLExpert(
  D: Record<string, any>,
  mc: Record<string, any>,
  params: Record<string, any>,
  ai: ExpertAINarration,
  activeSections: ExpertSectionKey[],
  lang: "fr" | "en",
  feedbackToken?: string,
  comparisonData?: { label: string; successPct: number; wealthDelta: number }[]
): string {
  const fr = lang === "fr";
  const date = new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA");

  let reportBody = renderExpertReport(D, mc, params, ai, activeSections, lang, comparisonData);

  // Inject star rating block if feedbackToken provided
  if (feedbackToken) {
    reportBody = reportBody.replace('<!-- FEEDBACK_STARS -->', buildStarRatingBlock(feedbackToken, fr));
  } else {
    reportBody = reportBody.replace('<!-- FEEDBACK_STARS -->', '');
  }

  /*
    Plan v2.2 / Phase 4a (2026-04-29): Standalone reports inject the
    canonical Editorial bundle (tokens.css + editorial.css) plus the
    Google-Fonts <link> for Inter + Playfair Display + JetBrains Mono.
    The previous DM Sans + Newsreader font stack was a Product/legacy
    pairing \u2014 reports belong to the Editorial system.
  */
  return '<!DOCTYPE html>'
    + '<html lang="' + lang + '" data-bf-system="editorial">'
    + '<head>'
    + '<meta charset="UTF-8">'
    + '<meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<title>buildfi.ca \u2014 ' + t("Bilan Expert", "Expert Assessment") + ' \u2014 ' + date + '</title>'
    + getEditorialFontBootstrapLink()
    + '<style data-bf-canonical="editorial">'
    + getCanonicalEditorialBundleCSS()
    + '</style>'
    + '<style data-bf-report-overrides="expert">'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:var(--font-inter);color:#1a1208;background:#faf8f4;'
    + '  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;'
    + '  -webkit-print-color-adjust:exact;print-color-adjust:exact}'
    + '@media print{body{background:#fff !important}.no-print{display:none!important}'
    + '  .section,div[style*="page-break-inside"]{break-inside:avoid;page-break-inside:avoid}'
    + '  .page-break{break-before:page;page-break-before:always}'
    + '  a{color:inherit !important;text-decoration:none !important}'
    + '  p,li{orphans:3;widows:3}'
    + '}'
    + '@media screen and (max-width:520px){'
    + '  .rpt-grid3{grid-template-columns:1fr!important}'
    + '  .rpt-grid2{grid-template-columns:1fr!important}'
    + '}'
    + 'svg{shape-rendering:geometricPrecision}'
    /* Phase 4c: hide rail in print, ensure inline TOC is visible. */
    + '@media print{.bfe-rail{display:none !important}.bf-inline-toc{break-inside:avoid}.bf-inline-toc[open]>summary{margin-bottom:8px}}'
    + '</style>'
    + '</head>'
    + '<body data-bf-system="editorial">' + reportBody
    /*
      Plan v2.2 / Phase 4c: rail TOC scroll-spy.
      Vanilla JS (no framework). Highlights the rail link for the section
      currently visible at 28% from the top of the viewport. Updates URL
      hash via replaceState so refresh keeps the user in place. Click on
      a rail link activates immediately so the bold doesn't lag the
      smooth-scroll animation.
    */
    + '<script>(function(){var rail=document.querySelector(".bfe-rail");if(!rail)return;var links=Array.prototype.slice.call(rail.querySelectorAll(\'a[href^="#"]\'));var records=[];for(var i=0;i<links.length;i++){var a=links[i];var id=a.getAttribute("href").slice(1);var t=document.getElementById(id);if(t)records.push({id:id,target:t,link:a})}if(!records.length)return;var current="";var ticking=false;function activate(id){for(var j=0;j<records.length;j++){records[j].link.classList.toggle("is-active",records[j].id===id)}}function compute(){var line=window.innerHeight*0.28;var chosen=records[0];for(var k=0;k<records.length;k++){var rect=records[k].target.getBoundingClientRect();if(rect.top<=line)chosen=records[k]}return chosen.id}function sync(){if(ticking)return;ticking=true;requestAnimationFrame(function(){ticking=false;var next=compute();if(next===current)return;current=next;activate(next);try{history.replaceState(null,"","#"+next)}catch(e){}})}function onClick(e){var href=this.getAttribute("href");if(!href||href.charAt(0)!=="#")return;current=href.slice(1);activate(current)}for(var m=0;m<records.length;m++){records[m].link.addEventListener("click",onClick)}activate(records[0].id);sync();window.addEventListener("scroll",sync,{passive:true});window.addEventListener("resize",sync)})();</script>'
    + '</body></html>';

  function t(f: string, e: string) { return fr ? f : e; }
}
