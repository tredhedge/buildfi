// /lib/report-html-360.js
/* eslint-disable */
// @ts-nocheck
import { calcTax } from "./engine";
import { buildStarRatingBlock } from "./feedback-stars";
import {
  getCanonicalEditorialBundleCSS,
  getEditorialFontBootstrapLink,
} from "./report-canonical-css";

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
const f$ = (v, fr = true) => Number.isFinite(Number(v)) ? `${Math.round(Number(v)).toLocaleString(fr ? "fr-CA" : "en-CA").replace(/[\u00A0\u202F]/g, " ")} $` : "—";
const fPct = (v) => Number.isFinite(Number(v)) ? `${Math.round(Number(v) * 10) / 10} %` : "—";

function gradeFromSuccess(p) {
  if (p >= 95) return "A+";
  if (p >= 85) return "A";
  if (p >= 75) return "B+";
  if (p >= 65) return "B";
  if (p >= 55) return "C+";
  if (p >= 45) return "C";
  if (p >= 35) return "D";
  return "F";
}
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

function deflator(baseAge, age, inf) {
  return 1 / Math.pow(1 + inf, Math.max(0, age - baseAge));
}
function nearestByAge(rows, age) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let best = rows[0], dist = Math.abs(n(best.age) - age);
  for (const r of rows) {
    const d = Math.abs(n(r.age) - age);
    if (d < dist) { best = r; dist = d; }
  }
  return best;
}
const pdVal = (row, rk, nk) => Number.isFinite(n(row?.[rk], NaN)) ? n(row?.[rk]) : n(row?.[nk], 0);

function portfolioFromRevRow(row, baseAge, inf) {
  if (!row) return 0;
  const nominal = n(row.aRR) + n(row.aTF) + n(row.aNR) + n(row.aDC) + n(row.aPE) + n(row.aPM) + n(row.aLIRA) + n(row.aCRR) + n(row.aCTF) + n(row.aCNR);
  return Math.round(nominal * deflator(baseAge, n(row.age, baseAge), inf));
}

function cleanAISlot(text, maxLen = 220) {
  if (typeof text !== "string") return "";
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/[ÃÂ]|â[\u0080-\u00BF]/.test(t)) return "";
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).trimEnd() + "…";
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

export function extractReportData360(mc, params, phase, extraRuns = {}) {
  const inf = n(params?.inf, 0.021);
  const age = Math.round(n(params?.age, 40));
  const retAge = Math.round(n(params?.retAge, 65));
  const deathAge = Math.min(105, Math.round(n(params?.deathAge, 95)));
  const rd = Array.isArray(mc?.medRevData) ? mc.medRevData : [];
  const pD = Array.isArray(mc?.pD) ? mc.pD : [];

  const startPD = nearestByAge(pD, age);
  const retPD = nearestByAge(pD, retAge);
  const startRev = nearestByAge(rd, age);
  const retRev = nearestByAge(rd, Math.max(age, retAge));
  const taxRetRev = nearestByAge(rd, Math.min(deathAge, retAge + 2)) || retRev;

  const qppMonthly = Math.round(n(retRev?.rrq) * deflator(age, n(retRev?.age, age), inf) / 12);
  const oasMonthly = Math.round(n(retRev?.psv) * deflator(age, n(retRev?.age, age), inf) / 12);
  const gisMonthly = Math.round(n(retRev?.gis) * deflator(age, n(retRev?.age, age), inf) / 12);
  const penMonthly = Math.round(n(retRev?.pen) * deflator(age, n(retRev?.age, age), inf) / 12);
  const govMonthly = qppMonthly + oasMonthly + gisMonthly + penMonthly;

  const retSpMFallback = Math.round(n(retRev?.spend) * deflator(age, n(retRev?.age, age), inf) / 12);
  const retSpM = Math.max(0, Math.round(n(params?.retSpM, n(params?.retIncome, 0) / 12 || retSpMFallback || 4000)));
  const gapMonthly = Math.max(0, retSpM - govMonthly);

  const startPortfolio = Math.max(0, Math.round(pdVal(startPD, "rp50", "p50") || portfolioFromRevRow(startRev, age, inf)));
  const retPortfolio = Math.max(0, Math.round(pdVal(retPD, "rp50", "p50") || portfolioFromRevRow(retRev, age, inf)));
  const withdrawalRatePct = startPortfolio > 0 ? Math.round((gapMonthly * 12 / startPortfolio) * 1000) / 10 : 99;
  const successPct = clamp(Math.round(n(mc?.succ) * 100), 0, 100);

  const taxCurrent = calcTax(n(params?.sal, 0), 0, params?.prov || "QC", 0, false);
  const taxCurrentEffective = taxCurrent && n(params?.sal, 0) > 0 ? Math.round(n(taxCurrent.total) / n(params.sal) * 100) : 0;
  const taxRetirementEffective = n(taxRetRev?.taxInc, 0) > 0 ? Math.round(n(taxRetRev?.tax) / n(taxRetRev?.taxInc, 1) * 100) : 0;
  const taxCurrentMarginal = taxCurrent ? Math.round(n(taxCurrent.marg, 0.3) * 100) : 30;

  const rrsp = Math.round(n(params?.rrsp)), tfsa = Math.round(n(params?.tfsa)), nr = Math.round(n(params?.nr));
  const merWeighted = ((n(params?.merR, 0.015) * rrsp) + (n(params?.merT, 0.007) * tfsa) + (n(params?.merN, 0.007) * nr)) / Math.max(1, rrsp + tfsa + nr);
  const finalReal = Math.max(0, Math.round(n(mc?.rMedF, n(mc?.medF, 0))));

  const pdSeries = pD.map((r) => ({ age: Math.round(n(r.age, age)), p5: Math.max(0, Math.round(pdVal(r, "rp5", "p5"))), p25: Math.max(0, Math.round(pdVal(r, "rp25", "p25"))), p50: Math.max(0, Math.round(pdVal(r, "rp50", "p50"))), p75: Math.max(0, Math.round(pdVal(r, "rp75", "p75"))), p95: Math.max(0, Math.round(pdVal(r, "rp95", "p95"))) }));
  const firstZeroP50 = pdSeries.find((r) => r.age > age && r.p50 <= 0);
  const firstZeroP25 = pdSeries.find((r) => r.age > age && r.p25 <= 0);

  const ages = []; for (let a = age; a <= deathAge; a += 5) ages.push(a); if (!ages.includes(deathAge)) ages.push(deathAge);
  const decumTable = ages.map((a) => {
    const pr = nearestByAge(pD, a), rr = nearestByAge(rd, a), d = deflator(age, a, inf);
    const p50 = Math.max(0, Math.round(pdVal(pr, "rp50", "p50") || portfolioFromRevRow(rr, age, inf)));
    const gov = Math.round((n(rr?.rrq) + n(rr?.psv) + n(rr?.gis) + n(rr?.pen)) * d / 12);
    let wd = Math.max(0, Math.round(n(rr?.ret) * d / 12)); if (p50 <= 0) wd = 0;
    const spend = Math.max(0, Math.round(n(rr?.spend, retSpM * 12) * d / 12));
    return { age: a, p50Portfolio: p50, govMonthly: gov, portWithdrawMonthly: wd, spendMonthly: spend, shortfallMonthly: Math.max(0, spend - gov - wd) };
  });

  return {
    version: REPORT_VERSION_360, phase, age, retAge, deathAge, prov: params?.prov || "QC", sex: params?.sex || "M", sal: Math.round(n(params?.sal, 0)),
    rrsp, tfsa, nr, liraBal: Math.round(n(params?.liraBal)), dcBal: Math.round(n(params?.dcBal)), totalSavings: rrsp + tfsa + nr + Math.round(n(params?.liraBal)) + Math.round(n(params?.dcBal)),
    qppAge: Math.round(n(params?.qppAge, 65)), oasAge: Math.round(n(params?.oasAge, 65)), qppMonthly, oasMonthly, gisMonthly, dbPensionMonthly: penMonthly, penMonthly, govMonthly,
    coveragePct: retSpM > 0 ? Math.round((govMonthly / retSpM) * 100) : 0, govCoveragePct: retSpM > 0 ? govMonthly / retSpM : 0,
    retSpM, gapMonthly, withdrawalRatePct, initialRate: withdrawalRatePct, retBal: startPortfolio, retYearBalance: retPortfolio,
    successPct, grade: gradeFromSuccess(successPct),
    biggestRisk: withdrawalRatePct >= 5.5 ? "Taux de retrait élevé; les premières années sont sensibles aux marchés." : successPct < 75 ? "Le plan est fragile dans la zone prudente." : "Le principal risque reste la variabilité des marchés.",
    bestLever: gapMonthly > 0 ? `Réduire les dépenses d'environ ${f$(Math.round(gapMonthly * 0.15), true)}/mois.` : "Le timing RRQ/PSV et la flexibilité de dépenses sont les meilleurs leviers.",
    rMedF: finalReal, rP5F: Math.round(n(mc?.rP5F, n(mc?.p5F, 0))), rP25F: Math.round(n(mc?.rP25F, n(mc?.p25F, 0))), rP75F: Math.round(n(mc?.rP75F, n(mc?.p75F, 0))), rP95F: Math.round(n(mc?.rP95F, n(mc?.p95F, 0))),
    medRuin: Math.round(n(mc?.medRuin, 999)), p25DepletionAge: firstZeroP25 ? firstZeroP25.age : null, medDepletionAge: firstZeroP50 ? firstZeroP50.age : null,
    medEstate: Math.round(n(mc?.medEstateNet, 0)), p10Estate: Math.round(n(mc?.p10EstateNet, 0)),
    taxCurrentEffective, taxRetirementEffective, taxCurrentMarginal, merWeighted, feeCostLifetime: Math.round(merWeighted * Math.max(finalReal, startPortfolio) * Math.max(1, deathAge - retAge)),
    longevityScore: Math.min(100, successPct), taxScore: taxRetirementEffective <= taxCurrentEffective ? 85 : 65, covScore: Math.min(100, retSpM > 0 ? (govMonthly / retSpM) * 100 : 0), diverScore: 50,
    pdSeries, decumTable, avgDeath: Math.round(n(mc?.avgDeath, deathAge)),
    meltTarget: n(params?._report?.meltTarget, n(params?.meltTgt, 58523)), meltIsBase: !!params?._report?.meltIsBase,
    melt1Succ: extraRuns?.mcMelt1 ? clamp(Math.round(n(extraRuns.mcMelt1.succ) * 100), 0, 100) : null,
    melt2Succ: extraRuns?.mcMelt2 ? clamp(Math.round(n(extraRuns.mcMelt2.succ) * 100), 0, 100) : null,
    mc60Succ: extraRuns?.mcC60 ? clamp(Math.round(n(extraRuns.mcC60.succ) * 100), 0, 100) : null,
    mc65Succ: extraRuns?.mcC65 ? clamp(Math.round(n(extraRuns.mcC65.succ) * 100), 0, 100) : null,
    mc70Succ: extraRuns?.mcC70 ? clamp(Math.round(n(extraRuns.mcC70.succ) * 100), 0, 100) : null,
    stressCrashSucc: extraRuns?.mcStressCrash08 ? clamp(Math.round(n(extraRuns.mcStressCrash08.succ) * 100), 0, 100) : null,
    stressStagSucc: extraRuns?.mcStressStagflation ? clamp(Math.round(n(extraRuns.mcStressStagflation.succ) * 100), 0, 100) : null,
    stressProlongedSucc: extraRuns?.mcStressProlonged ? clamp(Math.round(n(extraRuns.mcStressProlonged.succ) * 100), 0, 100) : null,
  };
}

function buildActions(D, params, fr) {
  const out = [];
  if (D.gapMonthly > 0) out.push({ title: fr ? "Ajuster le budget cible" : "Adjust target budget", body: fr ? `Tester une baisse graduelle de ${f$(Math.round(D.gapMonthly * 0.15), true)}/mois.` : `Test a gradual reduction of ${f$(Math.round(D.gapMonthly * 0.15), false)}/month.` });
  if ((D.phase === "TRANSITION" || D.phase === "DECUM") && (D.mc60Succ != null || D.mc65Succ != null || D.mc70Succ != null)) out.push({ title: fr ? "Valider le timing RRQ/PSV" : "Validate CPP/OAS timing", body: fr ? `Comparatif 60/65/70: ${D.mc60Succ ?? "—"}% / ${D.mc65Succ ?? "—"}% / ${D.mc70Succ ?? "—"}%.` : `Compare 60/65/70: ${D.mc60Succ ?? "—"}% / ${D.mc65Succ ?? "—"}% / ${D.mc70Succ ?? "—"}%.` });
  while (out.length < 3) out.push({ title: fr ? "Revue annuelle du plan" : "Annual plan review", body: fr ? "Mettre à jour le plan chaque année." : "Refresh the plan every year." });
  return out.slice(0, 3);
}

function phaseTitle(phase, fr) {
  if (!fr) return phase === "DECUM" ? "Bilan 360 - Retirement Income" : phase === "TRANSITION" ? "Bilan 360 - Transition" : "Bilan 360 - Accumulation";
  if (phase === "DECUM") return "Bilan 360 - Décaissement";
  if (phase === "TRANSITION") return "Bilan 360 - Transition";
  return "Bilan 360 - Accumulation";
}

export function renderReportHTML360(D, mc, params, lang = "fr", ai = {}, phase = "ACCUM", feedbackToken = "", extraRuns = {}, buildfiData = {}) {
  const fr = lang !== "en";
  const title = phaseTitle(phase, fr);
  const now = new Date().toISOString().slice(0, 10);
  const gColor = gradeColor(D.grade);
  const actions = buildActions(D, params, fr);
  const aiBrief = cleanAISlot(ai?.snapshot_intro, 220) || (fr ? `Plan ${D.grade} avec ${D.successPct}% de réussite. Patrimoine médian final: ${f$(D.rMedF, true)}.` : `Plan ${D.grade} with ${D.successPct}% success. Median ending wealth: ${f$(D.rMedF, false)}.`);
  const aiRisk = cleanAISlot(ai?.biggest_risk, 220) || D.biggestRisk || "";
  const aiLever = cleanAISlot(ai?.best_lever, 220) || D.bestLever || "";
  const aiObs = [ai?.obs_1, ai?.obs_2, ai?.obs_3].map((x) => cleanAISlot(x, 170)).filter(Boolean).slice(0, 3);

  const fallbackData = { meta: { lang: fr ? "fr" : "en", phase }, profile: { age: D.age, retAge: D.retAge, deathAge: D.deathAge, prov: D.prov }, chart: { points: D.pdSeries || [] }, incomeByAge: (D.decumTable || []).map((r) => ({ age: r.age, govMonthly: r.govMonthly, portWithdrawMonthly: r.portWithdrawMonthly, spendMonthly: r.spendMonthly, portfolio: r.p50Portfolio })), stress: { baseline: D.successPct, crash08: D.stressCrashSucc, stagflation: D.stressStagSucc, prolonged: D.stressProlongedSucc } };
  const dash = buildfiData && buildfiData.chart && Array.isArray(buildfiData.chart.points) ? buildfiData : fallbackData;
  const seed = { lang: fr ? "fr" : "en", successPct: D.successPct, stress: dash.stress || fallbackData.stress };

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
.dashboard{margin-top:14px;display:grid;grid-template-columns:2fr 1fr;gap:12px}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px}.card h2{margin:0 0 8px;font-size:16px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.kpi{border:1px solid var(--line);border-radius:10px;padding:8px}.kpi .v{font-size:24px;font-weight:850}.kpi .l{font-size:11px;color:var(--muted);text-transform:uppercase}
.controls{display:grid;grid-template-columns:1fr 180px;gap:8px;margin-top:8px}.field label{display:block;font-size:12px;color:var(--muted)}input[type=range]{width:100%}select{width:100%;padding:8px;border:1px solid var(--line);border-radius:8px;background:#fff}
.svgbox{border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff}svg.chart{width:100%;height:auto;display:block}.legend{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin-top:6px}.dot{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:5px}
.readout{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.mini{border:1px solid var(--line);border-radius:8px;padding:8px}.mini .k{font-size:11px;color:var(--muted);text-transform:uppercase}.mini .v{font-size:18px;font-weight:800}
.scenario-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.scenario{border:1px solid var(--line);border-radius:9px;padding:8px}.scenario .t{font-size:11px;color:var(--muted)}.scenario .n{font-size:22px;font-weight:800;color:var(--blue)}
.ai{border:1px solid #DCD0BC;background:linear-gradient(180deg,#FFF9EF,#FFF);border-radius:10px;padding:9px}.ai h4{margin:0 0 5px;font-size:12px;text-transform:uppercase;color:#6A5122}.actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.action{border:1px solid var(--line);border-radius:9px;padding:8px}.action h4{margin:0 0 4px;font-size:13px}.action p{margin:0;font-size:13px}
@media (max-width:1060px){.dashboard{grid-template-columns:1fr}.hero{grid-template-columns:1fr}}@media (max-width:860px){.kpi-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.controls,.hero-panels,.scenario-grid,.actions{grid-template-columns:1fr}}
</style></head><body><div class="wrap">
<header class="top"><div><div class="logo">buildfi</div><div class="meta">${D.age} ${fr ? "ans" : "years"} • ${escHtml(D.prov)} • ${escHtml(title)}</div></div><div style="text-align:right"><div class="tag">${fr ? "Dashboard Interactif" : "Interactive Dashboard"}</div><div class="meta">${fr ? "Généré le" : "Generated on"} ${now} • ${REPORT_VERSION_360}</div></div></header>
<section class="hero"><div class="grade"><div><div class="g">${escHtml(D.grade)}</div><div style="font-size:12px;color:#6C6258;text-align:center">${D.successPct}% ${fr ? "de réussite" : "success"}</div></div></div><div><h1 style="margin:0 0 6px;font-size:23px">${fr ? "Briefing IA personnalisé" : "Personalized AI briefing"}</h1><p style="margin:0">${escHtml(aiBrief)}</p><div class="hero-panels"><div class="panel"><h4>${fr ? "Risque principal" : "Main risk"}</h4><p style="margin:0">${escHtml(aiRisk)}</p></div><div class="panel"><h4>${fr ? "Levier principal" : "Main lever"}</h4><p style="margin:0">${escHtml(aiLever)}</p></div></div></div></section>
<div class="dashboard"><div style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Vue d'ensemble" : "Overview"}</h2><div class="kpi-grid"><div class="kpi"><div class="v" id="kpiSuccess">${D.successPct}%</div><div class="l">${fr ? "Réussite" : "Success"}</div></div><div class="kpi"><div class="v">${f$(D.rMedF, fr)}</div><div class="l">${fr ? "Patrimoine médian final" : "Median ending wealth"}</div></div><div class="kpi"><div class="v">${fPct(D.withdrawalRatePct)}</div><div class="l">${fr ? "Taux de retrait" : "Withdrawal rate"}</div></div><div class="kpi"><div class="v">${f$(D.govMonthly, fr)}/mois</div><div class="l">${fr ? "Revenus garantis" : "Guaranteed income"}</div></div></div><div class="controls"><div class="field"><label for="ageSlider">${fr ? "Âge analysé" : "Age focus"}: <strong id="ageLabel">${Math.max(D.age, D.retAge)}</strong></label><input type="range" id="ageSlider" min="${D.age}" max="${D.deathAge}" value="${Math.max(D.age, D.retAge)}" /></div><div class="field"><label for="scenarioSel">${fr ? "Scénario" : "Scenario"}</label><select id="scenarioSel"><option value="baseline">${fr ? "Base" : "Baseline"}</option><option value="crash08">2008</option><option value="stagflation">${fr ? "Stagflation" : "Stagflation"}</option><option value="prolonged">${fr ? "Baissier prolongé" : "Prolonged bear"}</option></select></div></div></section>
<section class="card"><h2>${fr ? "Projection Monte Carlo" : "Monte Carlo projection"}</h2><div class="svgbox"><svg id="fanChart" class="chart" viewBox="0 0 920 320"></svg><div class="legend"><span><i class="dot" style="background:#2F67A3"></i>P50</span><span><i class="dot" style="background:#7CA7D9"></i>P25 / P75</span><span><i class="dot" style="background:#D78E8E"></i>P5 / P95</span></div></div><div class="svgbox" style="margin-top:8px"><svg id="incomeChart" class="chart" viewBox="0 0 920 300"></svg><div class="legend"><span><i class="dot" style="background:#2A8C46"></i>${fr ? "Garantis" : "Guaranteed"}</span><span><i class="dot" style="background:#c4944a"></i>${fr ? "Retraits" : "Withdrawals"}</span><span><i class="dot" style="background:#2F67A3"></i>${fr ? "Dépenses" : "Spending"}</span></div></div></section></div>
<aside style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Lecture à l'âge sélectionné" : "Readout at selected age"}</h2><div class="readout"><div class="mini"><div class="k">${fr ? "Patrimoine médian" : "Median portfolio"}</div><div class="v" id="agePortfolio">—</div></div><div class="mini"><div class="k">${fr ? "Dépenses" : "Spending"}</div><div class="v" id="ageSpend">—</div></div><div class="mini"><div class="k">${fr ? "Garantis" : "Guaranteed"}</div><div class="v" id="ageGov">—</div></div><div class="mini"><div class="k">${fr ? "Retrait" : "Withdrawal"}</div><div class="v" id="ageWd">—</div></div></div></section>
<section class="card"><h2>${fr ? "Laboratoire de scénarios" : "Scenario lab"}</h2><div class="scenario-grid"><div class="scenario"><div class="t">2008</div><div class="n">${D.stressCrashSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Stagflation" : "Stagflation"}</div><div class="n">${D.stressStagSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Baissier prolongé" : "Prolonged bear"}</div><div class="n">${D.stressProlongedSucc ?? "—"}%</div></div></div><div class="scenario-grid" style="margin-top:8px"><div class="scenario"><div class="t">${fr ? "RRQ 60" : "CPP 60"}</div><div class="n">${D.mc60Succ ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "RRQ 65" : "CPP 65"}</div><div class="n">${D.mc65Succ ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "RRQ 70" : "CPP 70"}</div><div class="n">${D.mc70Succ ?? "—"}%</div></div></div></section>
<section class="card"><h2>${fr ? "Valeur IA" : "AI value"}</h2><div class="ai"><h4>${fr ? "Narration stratégique" : "Strategic narrative"}</h4><p style="margin:0">${escHtml(aiBrief)}</p></div><ul style="margin:10px 0 0;padding-left:18px">${(aiObs.length ? aiObs : [fr ? "Synthèse du risque principal et de son impact réel." : "Synthesis of main risk and practical impact.", fr ? "Priorisation des leviers par impact attendu." : "Levers prioritized by expected impact.", fr ? "Traduction des probabilités en actions." : "Probabilities translated into actions."]).map((x) => `<li>${escHtml(x)}</li>`).join("")}</ul></section></aside></div>
<section class="card"><h2>${fr ? "Plan d'exécution (30 jours)" : "Execution plan (30 days)"}</h2><div class="actions">${actions.map((a) => `<article class="action"><h4>${escHtml(a.title)}</h4><p>${escHtml(a.body)}</p></article>`).join("")}</div></section>
<section class="card"><h2>${fr ? "Méthodologie" : "Methodology"}</h2><p>${fr ? "5 000 simulations: rendements, inflation, longévité, fiscalité. Montants en dollars réels d'aujourd'hui." : "5,000 simulations: returns, inflation, longevity, taxes. Amounts shown in today's real dollars."}</p></section>
${starBlock}<footer class="meta" style="margin-top:16px">buildfi • ${fr ? "Rapport Bilan 360 interactif" : "Interactive Bilan 360 report"} • ${REPORT_VERSION_360}</footer></div>
<script>window.__BUILDFI__=${dashJson};window.__SEED__=${seedJson};</script>
<script>(function(){const DATA=window.__BUILDFI__||{},SEED=window.__SEED__||{},fr=(SEED.lang||"fr")==="fr";const points=(DATA.chart&&Array.isArray(DATA.chart.points))?DATA.chart.points:[];const income=Array.isArray(DATA.incomeByAge)?DATA.incomeByAge:[];if(!points.length)return;const slider=document.getElementById("ageSlider"),ageLabel=document.getElementById("ageLabel"),scenarioSel=document.getElementById("scenarioSel"),kpiSuccess=document.getElementById("kpiSuccess"),outPortfolio=document.getElementById("agePortfolio"),outSpend=document.getElementById("ageSpend"),outGov=document.getElementById("ageGov"),outWd=document.getElementById("ageWd"),fanSvg=document.getElementById("fanChart"),incSvg=document.getElementById("incomeChart");const fmtMoney=(v)=>Math.round(Number(v)||0).toLocaleString(fr?"fr-CA":"en-CA").replace(/[\u00A0\u202F]/g," ")+" $";const nearest=(arr,age)=>{if(!arr.length)return null;let b=arr[0],d=Math.abs((arr[0].age||0)-age);for(const r of arr){const dd=Math.abs((r.age||0)-age);if(dd<d){b=r;d=dd;}}return b;};const xMap=(age,minAge,maxAge,L,R,W)=>L+((age-minAge)/Math.max(1,maxAge-minAge))*(W-L-R);function drawFan(age){if(!fanSvg)return;const W=920,H=320,L=56,R=18,T=16,B=34,minAge=Number(points[0].age||0),maxAge=Number(points[points.length-1].age||minAge+1),maxV=Math.max(1,...points.map(p=>Math.max(p.p95||0,p.p75||0,p.p50||0,p.p25||0,p.p5||0))),yMax=Math.ceil(maxV/50000)*50000,y=(v)=>T+(1-(v/yMax))*(H-T-B),poly=(k)=>points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[k]||0)).toFixed(1)).join(" "),area=(top,bot)=>{const up=points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[top]||0)).toFixed(1)).join(" L "),dn=points.slice().reverse().map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[bot]||0)).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},ticks=[0,.25,.5,.75,1].map(t=>({v:yMax*t,yy:y(yMax*t)})),fx=xMap(age,minAge,maxAge,L,R,W);fanSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v/1000)+'k</text>').join("")+'<path d="'+area("p95","p5")+'" fill="rgba(70,128,192,.10)"></path><path d="'+area("p75","p25")+'" fill="rgba(70,128,192,.20)"></path><polyline points="'+poly("p95")+'" fill="none" stroke="#9FC1E8" stroke-width="1.4"></polyline><polyline points="'+poly("p75")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p50")+'" fill="none" stroke="#2F67A3" stroke-width="2.6"></polyline><polyline points="'+poly("p25")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p5")+'" fill="none" stroke="#D78E8E" stroke-width="1.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function drawIncome(age){if(!incSvg||!income.length)return;const W=920,H=300,L=56,R=18,T=16,B=34,rows=income.map(r=>({age:Number(r.age||0),gov:Number(r.govMonthly||0),wd:Number(r.portWithdrawMonthly||0),sp:Number(r.spendMonthly||0)})),minAge=rows[0].age,maxAge=rows[rows.length-1].age,maxV=Math.max(1,...rows.map(r=>Math.max(r.sp,r.gov+r.wd)))*1.15,y=(v)=>T+(1-(v/maxV))*(H-T-B),area=(top,bot)=>{const up=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[top]).toFixed(1)).join(" L "),dn=rows.slice().reverse().map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[bot]).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},spend=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r.sp).toFixed(1)).join(" "),ticks=[0,.25,.5,.75,1].map(t=>({v:maxV*t,yy:y(maxV*t)})),fx=xMap(age,minAge,maxAge,L,R,W);for(const r of rows){r.total=r.gov+r.wd;r.zero=0;}incSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v)+'$</text>').join("")+'<path d="'+area("gov","zero")+'" fill="rgba(42,140,70,.25)"></path><path d="'+area("total","gov")+'" fill="rgba(199,161,58,.35)"></path><polyline points="'+spend+'" fill="none" stroke="#2F67A3" stroke-width="2.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function updateScenario(){if(!scenarioSel||!kpiSuccess)return;const map={baseline:SEED.stress&&SEED.stress.baseline,crash08:SEED.stress&&SEED.stress.crash08,stagflation:SEED.stress&&SEED.stress.stagflation,prolonged:SEED.stress&&SEED.stress.prolonged};const v=map[scenarioSel.value];kpiSuccess.textContent=(v==null?SEED.successPct:v)+"%";}
function updateAge(){const age=Number(slider?slider.value:65);if(ageLabel)ageLabel.textContent=String(age);const p=nearest(points,age)||{},r=nearest(income,age)||{};if(outPortfolio)outPortfolio.textContent=fmtMoney(p.p50||r.portfolio||0);if(outSpend)outSpend.textContent=fmtMoney(r.spendMonthly||0)+"/mo";if(outGov)outGov.textContent=fmtMoney(r.govMonthly||0)+"/mo";if(outWd)outWd.textContent=fmtMoney(r.portWithdrawMonthly||0)+"/mo";drawFan(age);drawIncome(age);}if(slider)slider.addEventListener("input",updateAge);if(scenarioSel)scenarioSel.addEventListener("change",updateScenario);updateScenario();updateAge();})();</script></body></html>`;

  return repairMojibake(html);
}
