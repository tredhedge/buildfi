// report-formatters.js — BuildFi Report Formatting Layer
// Loaded first. No dependencies. Exports: window.BFmt
(function() {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // NUMBER FORMATTERS
  // ══════════════════════════════════════════════════════════════

  // Intl.NumberFormat cache for performance
  var _nfCache = {};
  function _nf(locale, minD, maxD) {
    var k = locale + "|" + minD + "|" + maxD;
    if (!_nfCache[k]) _nfCache[k] = new Intl.NumberFormat(locale, { minimumFractionDigits: minD, maximumFractionDigits: maxD });
    return _nfCache[k];
  }

  // Compact money: 485K$, 1.2M$
  function fmtCompact(v) {
    if (v === void 0 || v === null || isNaN(v)) return "\u2014";
    var a = Math.abs(v);
    if (a >= 1e6) return (v < 0 ? "\u2212" : "") + (a / 1e6).toFixed(1) + "M$";
    if (a >= 1e3) return (v < 0 ? "\u2212" : "") + Math.round(a / 1e3) + "K$";
    return Math.round(v) + "$";
  }

  // Full money with locale: FR "485 000 $" / EN "$485,000"
  function fmtMoney(amount, fr) {
    if (amount === void 0 || amount === null || isNaN(amount)) return "\u2014";
    var abs = Math.abs(Math.round(amount));
    var formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, fr ? "\u00a0" : ",");
    return fr
      ? (amount < 0 ? "\u2212" : "") + formatted + "\u00a0$"
      : (amount < 0 ? "\u2212$" : "$") + formatted;
  }

  // Full currency via Intl (fr-CA only)
  function fmtCurrency(v) {
    if (v === void 0 || v === null || isNaN(v)) return "\u2014";
    return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
  }

  // Integer with locale separators
  function fmtInt(v, lang) {
    var locale = lang === "en" ? "en-CA" : "fr-CA";
    return _nf(locale, 0, 0).format(Math.round(v || 0));
  }

  // Percentage from ratio: 0.85 → "85.0%" or "85,0 %"
  function fmtPct(v, dec, fr) {
    if (v === null || v === undefined || !isFinite(v)) return "\u2014";
    var n = (v * 100).toFixed(dec == null ? 1 : dec);
    return fr ? n.replace(".", ",") + "\u00a0%" : n + "%";
  }

  // Percentage from raw number (already multiplied): 85 → "85.0%"
  function fmtPctRaw(v, dec, fr) {
    if (v === null || v === undefined || !isFinite(v)) return "\u2014";
    var n = v.toFixed(dec == null ? 1 : dec);
    return fr ? n.replace(".", ",") + "\u00a0%" : n + "%";
  }

  // Percentage via Intl locale (used in planner compatibility)
  function fmtPctLocale(v, decimals, lang, isRatio) {
    var locale = lang === "en" ? "en-CA" : "fr-CA";
    var raw = (v == null || !isFinite(v)) ? 0 : v;
    var n = isRatio ? raw * 100 : raw;
    var d = decimals == null ? 1 : decimals;
    return _nf(locale, d, d).format(n) + "%";
  }

  // Shorthand for fmtPctLocale with window.__bfLang
  function pc(v) {
    return fmtPctLocale(v, 1, window.__bfLang || "fr", true);
  }

  // Date formatting: FR "6 avril 2026" / EN "April 6, 2026"
  function fmtDate(date, fr) {
    if (!date) date = new Date();
    if (typeof date === "string") date = new Date(date);
    return date.toLocaleDateString(fr ? "fr-CA" : "en-CA", { year: "numeric", month: "long", day: "numeric" });
  }

  // Short date: "2026-04-14"
  function fmtDateShort(date) {
    if (!date) date = new Date();
    if (typeof date === "string") date = new Date(date);
    return date.toISOString().slice(0, 10);
  }

  // ══════════════════════════════════════════════════════════════
  // GRADE & COLOR SYSTEM
  // ══════════════════════════════════════════════════════════════

  function grade(succVal, fr) {
    if (succVal == null) return { letter: "\u2014", label: fr ? "En attente" : "Pending", color: "#b89830" };
    if (succVal >= 0.95) return { letter: "A+", label: fr ? "Excellent" : "Excellent", color: "#2a8c46" };
    if (succVal >= 0.90) return { letter: "A",  label: fr ? "Tr\u00e8s solide" : "Very solid", color: "#2a8c46" };
    if (succVal >= 0.85) return { letter: "A-", label: fr ? "Solide" : "Solid", color: "#2a8c46" };
    if (succVal >= 0.80) return { letter: "B+", label: fr ? "Acceptable" : "Acceptable", color: "#b89830" };
    if (succVal >= 0.70) return { letter: "B",  label: fr ? "Fragile" : "Fragile", color: "#b89830" };
    if (succVal >= 0.50) return { letter: "C",  label: fr ? "Risqu\u00e9" : "At risk", color: "#cc4444" };
    if (succVal >= 0.30) return { letter: "D",  label: fr ? "Critique" : "Critical", color: "#cc4444" };
    return { letter: "F", label: fr ? "Critique" : "Critical", color: "#cc4444" };
  }

  // Color for a success rate value
  function succColor(succVal) {
    if (succVal == null) return "#b89830";
    if (succVal >= 0.90) return "#2a8c46";
    if (succVal >= 0.75) return "#b89830";
    return "#cc4444";
  }

  // ══════════════════════════════════════════════════════════════
  // BRAND CONSTANTS
  // ══════════════════════════════════════════════════════════════

  var COLORS = {
    gold:     "#c4944a",
    green:    "#2a8c46",
    red:      "#cc4444",
    amber:    "#b89830",
    blue:     "#4680c0",
    purple:   "#7c60b8",
    teal:     "#2aa198",
    text:     "#1a1a1a",
    muted:    "#888",
    border:   "#e8e0d4",
    bg:       "#fefcf9",
    bgAlt:    "#f9f7f2",
    bgWarm:   "#f5f0e8",
    coverDk:  "#1a1610",
    coverMd:  "#2c2418",
    coverLt:  "#3a3020"
  };

  var VERSION = "v12.0.0";

  // ══════════════════════════════════════════════════════════════
  // HTML MARKUP HELPERS
  // ══════════════════════════════════════════════════════════════

  // Table row: label + value
  function R(l, v) {
    return '<tr><td class="rl">' + l + '</td><td class="rv">' + v + '</td></tr>';
  }

  // KPI card with colored top border
  function KPI(v, l, c) {
    return '<div class="kpi" style="border-top:3px solid ' + (c || COLORS.gold) + '">' +
      '<div class="kpi-v" style="color:' + (c || COLORS.gold) + '">' + v + '</div>' +
      '<div class="kpi-l">' + l + '</div></div>';
  }

  // Section header with numbered circle
  function Sec(num, t, id) {
    return '<h3 class="sec"' + (id ? ' id="' + id + '"' : '') + '>' +
      '<span class="sec-n">' + num + '</span>' + t + '</h3>';
  }

  // Card container
  function Card(c) { return '<div class="cd">' + c + '</div>'; }

  // Callout boxes
  function Insight(t) { return '<div class="callout callout-insight">' + t + '</div>'; }
  function Warning(t) { return '<div class="callout callout-warning">' + t + '</div>'; }
  function Alert(t)   { return '<div class="callout callout-alert">' + t + '</div>'; }

  // AI narration block — preserves paragraph breaks from AI text
  function AiBlock(t, fr) {
    if (!t) return "";
    var safe = esc(t).replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>');
    return '<div class="callout callout-ai"><span class="ai-badge">' +
      (fr ? "Analyse assist\u00e9e par IA" : "AI-assisted analysis") +
      '</span><p>' + safe + '</p></div>';
  }

  // Callout with label + value + description (for cost-of-inaction, tipping point, etc.)
  function CalloutKPI(label, value, desc, cls) {
    return '<div class="callout ' + (cls || 'callout-warning') + '">' +
      '<div class="callout-lbl">' + label + '</div>' +
      '<div class="callout-val">' + value + '</div>' +
      (desc ? '<div style="font-size:10px;color:#666;line-height:1.5">' + desc + '</div>' : '') +
      '</div>';
  }

  // Recommendation card (SAM or reco engine)
  function RecoCard(opts) {
    // opts: { priority, title, impact, body, meaning, icon, fr }
    var priCls = opts.priority >= 3 ? "reco-priority-high" :
                 opts.priority >= 2 ? "reco-priority-medium" : "reco-priority-low";
    var _fr = opts.fr !== false;
    var priLbl = opts.priority >= 3 ? (_fr ? "\u26a0 HAUTE" : "\u26a0 HIGH") :
                 opts.priority >= 2 ? (_fr ? "MOYENNE" : "MEDIUM") : (_fr ? "BASSE" : "LOW");
    return '<div class="reco-card">' +
      '<span class="reco-priority ' + priCls + '">' + priLbl + '</span>' +
      (opts.impact ? '<div class="reco-impact">' + esc(opts.impact) + '</div>' : '') +
      '<div class="reco-title">' + esc(opts.icon || '') + ' ' + esc(opts.title) + '</div>' +
      '<div class="reco-body">' + esc(opts.body) + '</div>' +
      (opts.meaning ? '<div class="reco-meaning">' + esc(opts.meaning) + '</div>' : '') +
      '</div>';
  }

  // Skeleton placeholder for loading state
  function Skeleton(h) {
    return '<div class="skeleton" style="height:' + (h || 20) + 'px"></div>';
  }

  // Copy-table button (hidden in print)
  function CopyBtn(tableId) {
    return '<div style="text-align:right;margin-bottom:2px" class="no-print">' +
      '<button class="copy-btn" onclick="copyTbl(\'' + tableId + '\')">\ud83d\udccb</button></div>';
  }

  // Escape HTML
  function esc(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ══════════════════════════════════════════════════════════════
  // PROFILE DETECTION (R object)
  // ══════════════════════════════════════════════════════════════

  function detectProfile(p, mc) {
    var age = p.age || 40, retAge = p.retAge || 65, deathAge = p.deathAge || 90;
    var sal = p.sal || 0, rrsp = p.rrsp || 0, tfsa = p.tfsa || 0, nr = p.nr || 0;
    var totalSavings = rrsp + tfsa + nr + (p.liraBal || 0) + (p.fhsaBal || 0);
    var props = p.props || [], debts = p.debts || [];
    return {
      phase: age >= retAge ? "decum" : (retAge - age <= 7 && age >= 52) ? "transition" : "accum",
      couple: !!p.cOn,
      dualIncome: !!p.cOn && (p.cSal || 0) > 0,
      ccpc: !!p.bizOn,
      realEstate: props.some(function(pr) { return pr && pr.on; }),
      pension: p.penType && p.penType !== "none",
      debt: debts.some(function(d) { return (d.balance || d.bal || 0) > 0; }),
      gisEligible: age >= 60 && sal < 30000 && totalSavings < 200000,
      highNet: totalSavings > 500000,
      hasMC: !!(mc && mc.pD && mc.pD.length > 0 && !mc._placeholder && mc.succ != null),
      atRisk: !!(mc && mc.succ != null && mc.succ < 0.75),
      hasNaive: !!(mc && mc._naiveMC && mc._naiveMC.medRevData),
      hasTornado: !!(mc && (mc._sensReturn || mc._sensInflation || mc._sensSpending || mc._sensMortality)),
      hasMeltdown: !!(p.melt && (rrsp > 50000)),
      hasRSU: !!(p.rsuGrants && p.rsuGrants.length > 0 && p.rsuGrants.some(function(r) { return r.totalShares > 0; })),
      hasGoals: !!(p.goals && p.goals.length >= 1),
      hasFamily: !!(p.family && p.family.length >= 1),
      hasSAM: !!(p.samResults && p.samResults.length > 0),
      hasStress: !!(p.strs && (Array.isArray(p.strs) ? p.strs.length : Object.keys(p.strs).length) > 0)
    };
  }

  // ══════════════════════════════════════════════════════════════
  // BILINGUAL LABEL DICTIONARY
  // ══════════════════════════════════════════════════════════════

  var LABELS = {
    // Section titles
    cover_title:     { fr: "Rapport d\u00e9taill\u00e9", en: "Detailed Report" },
    cover_sub:       { fr: "Plan de retraite", en: "Retirement Plan" },
    toc:             { fr: "Table des mati\u00e8res", en: "Table of Contents" },
    page_zero:       { fr: "Votre plan en 30 secondes", en: "Your plan in 30 seconds" },
    diagnostic:      { fr: "Sommaire ex\u00e9cutif", en: "Executive Summary" },
    profile:         { fr: "Votre profil", en: "Your Profile" },
    family:          { fr: "Votre famille", en: "Your Family" },
    goals:           { fr: "Vos objectifs", en: "Your Goals" },
    projection:      { fr: "Projection du patrimoine", en: "Wealth Projection" },
    revenue:         { fr: "Revenus de retraite", en: "Retirement Income" },
    decum:           { fr: "Strat\u00e9gie de d\u00e9caissement", en: "Withdrawal Strategy" },
    tax:             { fr: "Strat\u00e9gie fiscale", en: "Tax Strategy" },
    gis:             { fr: "Analyse SRG", en: "GIS Analysis" },
    meltdown:        { fr: "Strat\u00e9gie Meltdown REER", en: "RRSP Meltdown Strategy" },
    succession:      { fr: "Succession", en: "Estate" },
    realestate:      { fr: "Immobilier", en: "Real Estate" },
    rsu:             { fr: "Actions RSU", en: "RSU Grants" },
    corp:            { fr: "Corporation (SPCC)", en: "Corporation (CCPC)" },
    debt:            { fr: "Dettes", en: "Debts" },
    risk:            { fr: "Risque & sensibilit\u00e9", en: "Risk & Sensitivity" },
    strategies:      { fr: "Strat\u00e9gies observ\u00e9es", en: "Observed Strategies" },
    methodology:     { fr: "M\u00e9thodologie", en: "Methodology" },
    // Common labels
    age:             { fr: "\u00c2ge", en: "Age" },
    retirement:      { fr: "Retraite", en: "Retirement" },
    horizon:         { fr: "Horizon", en: "Horizon" },
    wealth:          { fr: "Patrimoine", en: "Wealth" },
    income:          { fr: "Revenus", en: "Income" },
    spending:        { fr: "D\u00e9penses", en: "Spending" },
    tax_lbl:         { fr: "Imp\u00f4t", en: "Tax" },
    success:         { fr: "Taux de succ\u00e8s", en: "Success rate" },
    prepared_for:    { fr: "Pr\u00e9par\u00e9 pour", en: "Prepared for" },
    prepared_on:     { fr: "Pr\u00e9par\u00e9 le", en: "Prepared on" },
    disclaimer_lbl:  { fr: "Mise en garde", en: "Disclaimer" },
    never:           { fr: "Jamais", en: "Never" },
    yes:             { fr: "Oui", en: "Yes" },
    no:              { fr: "Non", en: "No" },
    total:           { fr: "Total", en: "Total" },
    average:         { fr: "Moyenne", en: "Average" },
    per_year:        { fr: "/an", en: "/yr" },
    per_month:       { fr: "/m", en: "/mo" },
    years:           { fr: "ans", en: "yrs" },
    // QPP label depends on province
    qpp:             { fr: { QC: "RRQ", other: "RPC" }, en: { QC: "QPP", other: "CPP" } }
  };

  function L(key, fr) {
    var entry = LABELS[key];
    if (!entry) return key;
    return fr ? (entry.fr || key) : (entry.en || key);
  }

  function qppLabel(prov, fr) {
    var isQC = (prov || "QC") === "QC";
    return fr ? (isQC ? "RRQ" : "RPC") : (isQC ? "QPP" : "CPP");
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  window.BFmt = {
    // Number formatters
    fmtCompact: fmtCompact,
    fmtMoney: fmtMoney,
    fmtCurrency: fmtCurrency,
    fmtInt: fmtInt,
    fmtPct: fmtPct,
    fmtPctRaw: fmtPctRaw,
    fmtPctLocale: fmtPctLocale,
    pc: pc,
    fmtDate: fmtDate,
    fmtDateShort: fmtDateShort,
    // Grade
    grade: grade,
    succColor: succColor,
    // Brand
    COLORS: COLORS,
    VERSION: VERSION,
    // Markup
    R: R,
    KPI: KPI,
    Sec: Sec,
    Card: Card,
    Insight: Insight,
    Warning: Warning,
    Alert: Alert,
    AiBlock: AiBlock,
    CalloutKPI: CalloutKPI,
    RecoCard: RecoCard,
    Skeleton: Skeleton,
    CopyBtn: CopyBtn,
    esc: esc,
    // Profile detection
    detectProfile: detectProfile,
    // Labels
    LABELS: LABELS,
    L: L,
    qppLabel: qppLabel
  };

})();
