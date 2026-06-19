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
    const gov = Math.round((n(rr?.rrq) + n(rr?.psv) + n(rr?.gis) + n(rr?.pen) + n(rr?.cQpp) + n(rr?.cOas) + n(rr?.cGis)) * d / 12); // household (incl. spouse)
    let wd = Math.max(0, Math.round(n(rr?.ret) * d / 12)); if (p50 <= 0) wd = 0;
    const spend = Math.max(0, Math.round(n(rr?.spend, retSpM * 12) * d / 12));
    return { age: a, p50Portfolio: p50, govMonthly: gov, portWithdrawMonthly: wd, spendMonthly: spend, shortfallMonthly: Math.max(0, spend - gov - wd) };
  });

  // Real estate (2026-06-17, Phase 1 report unification): surface each property so the
  // report covers the full long-form input, including multiple added residences/rentals.
  const properties = (Array.isArray(params?.props) ? params.props : [])
    .filter((pr) => pr && pr.on && n(pr.val) > 0)
    .map((pr) => {
      const val = Math.round(n(pr.val)), mort = Math.round(n(pr.mb));
      return { name: String(pr.name || ""), isPrimary: !!pr.pri, value: val, mortgage: mort,
        equity: Math.max(0, val - mort), rentalAnnual: pr.pri ? 0 : Math.round(n(pr.rm) * 12),
        saleAge: Math.round(n(pr.dsAge)) > 0 ? Math.round(n(pr.dsAge)) : 0 };
    });
  const reEquity = properties.reduce((s, p) => s + p.equity, 0);

  // Debts + insurance (Phase 1 report unification, 2026-06-17) — self-gating in the renderer.
  const debts = (Array.isArray(params?.debts) ? params.debts : [])
    .filter((d) => d && n(d.bal) > 0)
    .map((d) => {
      const bal = Math.round(n(d.bal)), rate = n(d.rate);
      return { type: String(d.type || ""), bal, rate, annualCost: Math.round(n(d.annualCost, bal * rate)) };
    });
  const debtTotal = debts.reduce((s, d) => s + d.bal, 0);
  const debtAnnualCost = debts.reduce((s, d) => s + d.annualCost, 0);
  const lifeInsBenefit = Math.round(n(params?.lifeInsBenefit));
  const lifeInsPremium = Math.round(n(params?.lifeInsPremium));
  const cLifeInsBenefit = Math.round(n(params?.cLifeInsBenefit));
  const hasInsurance = lifeInsBenefit > 0 || cLifeInsBenefit > 0;

  // Corporation (CCPC) + alternatives (Phase 1 report unification, 2026-06-17). RSU is not a
  // structured engine param (maps to income events upstream) — deferred.
  const bizOn = !!params?.bizOn || n(params?.bizRetainedEarnings) > 0;
  const business = bizOn ? {
    retained: Math.round(n(params?.bizRetainedEarnings)),
    extractYrs: Math.round(n(params?.bizExtractYrs)),
    saleAge: Math.round(n(params?.bizSaleAge)) > 0 ? Math.round(n(params?.bizSaleAge)) : 0,
    salePrice: Math.round(n(params?.bizSalePrice)),
    lcge: !!params?.bizLCGE,
    ippBal: Math.round(n(params?.ippBal)),
  } : null;
  const peBal = Math.round(n(params?.peBal));
  const pmBal = Math.round(n(params?.pmBal));
  const hasAlt = peBal > 0 || pmBal > 0;

  // ── Household + STEADY-STATE gov aggregates (2026-06-18 blind-review fix, blockers #1-#4) ──
  // The retRev row samples gov AT retirement start ($0 during a pre-65 bridge), and
  // params.sal/retSpM are INDIVIDUAL. Coverage/replacement/bridge must use HOUSEHOLD income
  // and STEADY-STATE gov (post-CPP/OAS, incl. spouse — now emitted by the engine as
  // cQpp/cOas/cGis in medRevData). We CONSUME the engine output here; we never recompute it.
  const cOn = !!params?.cOn;
  const cRetSpMmo = Math.round(n(params?.cRetSpM, 0));
  const householdIncome = Math.round(n(params?.sal, 0)) + (cOn ? Math.round(n(params?.cSal, 0)) : 0);
  const hhGovAnnual = (rr) => n(rr?.rrq) + n(rr?.psv) + n(rr?.gis) + n(rr?.pen) + n(rr?.cQpp) + n(rr?.cOas) + n(rr?.cGis);
  // STEADY-STATE PLATEAU (not lifetime max): household gov in the FIRST year after all
  // benefits have begun, in real dollars. Also capture the steady-state primary QPP (drives the
  // survivor benefit — must not be the retRev pre-claim $0) in the same pass.
  const govStartAge = Math.max(retAge, n(params?.qppAge, 65), n(params?.oasAge, 65),
    cOn ? Math.max(n(params?.cQppAge, 65), n(params?.cOasAge, 65)) : 0);
  // ROOT-1 single-source: capture gov, primary QPP, AND the MODELED household spend from the
  // SAME steady-state row (first year both partners' benefits flow, post-bridge). Coverage/gap/
  // target/runway then all sit on one consistent phase that matches the chart at that age —
  // instead of comparing steady-state gov to the LOW bridge-year spend (which overstated coverage).
  let retGovMonthly = 0, retQppPrimaryMonthly = 0, retOasPrimaryMonthly = 0, retGisMonthly = 0, retPenMonthly = 0, retSpouseGovMonthly = 0, retSteadySpendMonthly = 0, retSteadyAge = 0;
  const setRet = (rr) => { const a = Math.round(n(rr?.age, age)); const d2 = deflator(age, a, inf);
    retGovMonthly = Math.round(hhGovAnnual(rr) * d2 / 12); // "guaranteed income" floor = CPP+OAS+GIS+DB pension+spouse
    // Component breakdown (real, deflated). MUST sum to retGovMonthly so the narrator can present
    // a verifiable split instead of inventing one. hhGovAnnual = rrq+psv+gis+pen+cQpp+cOas+cGis, so
    // the DB/employer pension (pen) is part of the guaranteed-income total and MUST be a component.
    retQppPrimaryMonthly = Math.round(n(rr?.rrq) * d2 / 12);
    retOasPrimaryMonthly = Math.round(n(rr?.psv) * d2 / 12);
    retGisMonthly = Math.round((n(rr?.gis) + n(rr?.cGis)) * d2 / 12);
    retPenMonthly = Math.round(n(rr?.pen) * d2 / 12); // employer / DB pension (not government)
    retSpouseGovMonthly = Math.round((n(rr?.cQpp) + n(rr?.cOas)) * d2 / 12);
    retSteadySpendMonthly = Math.round(n(rr?.spend) * d2 / 12); retSteadyAge = a; };
  // first year BOTH partners are actually receiving (a younger spouse starts a few years after
  // the primary's claim age; "first year >= max benefit age" wrongly picked a ramp year).
  const bothOn = (rr) => (n(rr?.rrq) + n(rr?.psv)) > 0 && (!cOn || (n(rr?.cQpp) + n(rr?.cOas)) > 0);
  for (const rr of rd) { if (Math.round(n(rr?.age, age)) >= govStartAge && bothOn(rr)) { setRet(rr); break; } }
  if (!retGovMonthly) for (const rr of rd) { if (Math.round(n(rr?.age, age)) >= govStartAge && (n(rr?.rrq) + n(rr?.psv)) > 0) { setRet(rr); break; } } // spouse never receives gov
  if (!retGovMonthly && rd.length) setRet(rd[rd.length - 1]); // benefits begin beyond the data horizon
  // Household retirement target = modeled spend at that steady-state row (NOT the bridge year,
  // NOT params). Falls back to params only if the row carried no spend.
  const householdRetTargetMonthly = retSteadySpendMonthly > 0 ? retSteadySpendMonthly : (retSpM + (cOn ? cRetSpMmo : 0));
  const retGovCoveragePct = householdRetTargetMonthly > 0 ? Math.round((retGovMonthly / householdRetTargetMonthly) * 100) : 0;
  const householdReplacementPct = householdIncome > 0 ? Math.round((householdRetTargetMonthly * 12 / householdIncome) * 100) : 0;
  // Real bridge cost = sum of MODELED household spend net of gov over the pre-gov bridge years.
  const firstGovAge = Math.min(n(params?.qppAge, 65), n(params?.oasAge, 65),
    cOn ? Math.min(n(params?.cQppAge, 65), n(params?.cOasAge, 65)) : 999);
  const bridgeYears = Math.max(0, Math.round(firstGovAge - retAge));
  let bridgeCostReal = 0;
  for (const rr of rd) {
    const a = Math.round(n(rr?.age, age));
    if (a < retAge || a >= firstGovAge) continue;
    const d = deflator(age, a, inf);
    bridgeCostReal += Math.max(0, n(rr?.spend) * d - hhGovAnnual(rr) * d);
  }
  bridgeCostReal = Math.round(bridgeCostReal);

  return {
    properties, reEquity,
    debts, debtTotal, debtAnnualCost, lifeInsBenefit, lifeInsPremium, cLifeInsBenefit, hasInsurance,
    business, peBal, pmBal, hasAlt,
    version: REPORT_VERSION_360, phase, age, retAge, deathAge, prov: params?.prov || "QC", sex: params?.sex || "M", sal: Math.round(n(params?.sal, 0)),
    rrsp, tfsa, nr, liraBal: Math.round(n(params?.liraBal)), dcBal: Math.round(n(params?.dcBal)), totalSavings: rrsp + tfsa + nr + Math.round(n(params?.liraBal)) + Math.round(n(params?.dcBal)),
    qppAge: Math.round(n(params?.qppAge, 65)), oasAge: Math.round(n(params?.oasAge, 65)), qppMonthly, oasMonthly, gisMonthly, dbPensionMonthly: penMonthly, penMonthly, govMonthly,
    // coveragePct/govCoveragePct = STEADY-STATE HOUSEHOLD gov ÷ household target (was: bridge-snapshot
    // gov ÷ individual target, which read as a false "0% coverage" for pre-65 retirees / couples).
    coveragePct: retGovCoveragePct, govCoveragePct: householdRetTargetMonthly > 0 ? retGovMonthly / householdRetTargetMonthly : 0,
    retGovMonthly, retGovCoveragePct, retQppPrimaryMonthly, retOasPrimaryMonthly, retGisMonthly, retPenMonthly, retSpouseGovMonthly, retSteadyAge, householdIncome, householdRetTargetMonthly, householdReplacementPct, bridgeYears, bridgeCostReal,
    retSpM, gapMonthly, withdrawalRatePct, initialRate: withdrawalRatePct, retBal: startPortfolio, retYearBalance: retPortfolio,
    successPct, grade: gradeFromSuccess(successPct),
    biggestRisk: withdrawalRatePct >= 5.5 ? "Taux de retrait élevé; les premières années sont sensibles aux marchés." : successPct < 75 ? "Le plan est fragile dans la zone prudente." : "Le principal risque reste la variabilité des marchés.",
    bestLever: (gapMonthly > 0 && successPct < 85) ? `Réduire les dépenses d'environ ${f$(Math.round(gapMonthly * 0.15), true)}/mois.` : "Le timing RRQ/PSV, l'efficience fiscale et la flexibilité de dépenses sont les meilleurs leviers.",
    // ship-loop (2026-06-18): real wealth is floored at 0 for the client (line ~158
    // already floors rMedF). The percentiles MUST be floored too — the engine emits
    // negative "real" percentiles for failing plans, and an unfloored value leaks a
    // scary nominal-looking "-3.9M$" into both the fan chart and the narration.
    rMedF: finalReal, rP5F: Math.max(0, Math.round(n(mc?.rP5F, n(mc?.p5F, 0)))), rP25F: Math.max(0, Math.round(n(mc?.rP25F, n(mc?.p25F, 0)))), rP75F: Math.max(0, Math.round(n(mc?.rP75F, n(mc?.p75F, 0)))), rP95F: Math.max(0, Math.round(n(mc?.rP95F, n(mc?.p95F, 0)))),
    medRuin: Math.round(n(mc?.medRuin, 999)), p25DepletionAge: firstZeroP25 ? firstZeroP25.age : null, medDepletionAge: firstZeroP50 ? firstZeroP50.age : null,
    // ship-loop 2026-06-18: medEstateNet/p10EstateNet are NOMINAL (≈ mc.medF). Showing a nominal
    // estate next to real-dollar wealth made a $5.5M estate sit above a real portfolio that depletes
    // — incoherent to a planner. Deflate to today's real dollars (same fix class as the wealth floor),
    // so the estate (~real) reconciles with rMedF and the report's "today's real dollars" framing.
    medEstate: Math.max(0, Math.round(n(mc?.medEstateNet, 0) * deflator(age, deathAge, inf))),
    p10Estate: Math.max(0, Math.round(n(mc?.p10EstateNet, 0) * deflator(age, deathAge, inf))),
    taxCurrentEffective, taxRetirementEffective, taxCurrentMarginal, merWeighted, feeCostLifetime: Math.round(merWeighted * Math.max(finalReal, startPortfolio) * Math.max(1, deathAge - retAge)),
    longevityScore: Math.min(100, successPct), taxScore: taxRetirementEffective <= taxCurrentEffective ? 85 : 65, covScore: Math.min(100, retGovCoveragePct), diverScore: 50,
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

// 2026-05-14 Sprint B — per-section standfirst subtitles.
//
// One sentence beneath each section title that answers the section's decision
// question observationally, using real numbers from D. AMF-clean by
// construction: present-tense facts + conditional projections, no FORBIDDEN
// verbs. Caps at ~200 chars (the FT-standfirst sweet spot). When AI synthesis
// (Sprint D) ships, it can override these per section; the static version is
// always the floor.
function sectionHeadlines(D, fr) {
  const yrs = D.deathAge && D.retAge ? Math.max(0, D.deathAge - D.retAge) : 0;

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
    synthesis: fr
      ? `${(D.householdRetTargetMonthly - (D.retGovMonthly||0)) > 0 ? `Au régime permanent, un écart mensuel d'environ ${f$(Math.round(D.householdRetTargetMonthly - (D.retGovMonthly||0)), true)} subsisterait` : `Les dépenses cibles seraient couvertes`}; les revenus garantis du ménage atteindraient ${f$(D.retGovMonthly||0, true)}/mois (les années de pont avant 65 ans en comptent peu).`
      : `${(D.householdRetTargetMonthly - (D.retGovMonthly||0)) > 0 ? `At steady state, a monthly gap of about ${f$(Math.round(D.householdRetTargetMonthly - (D.retGovMonthly||0)), false)} would remain` : `Target spending would be covered`}; household guaranteed income would reach ${f$(D.retGovMonthly||0, false)}/mo (the pre-65 bridge years carry little).`,
    levers: fr
      ? `Trois leviers observables triés par impact attendu sur la trajectoire.`
      : `Three observable levers, sorted by expected impact on the trajectory.`,
  };
}

function buildActions(D, params, fr) {
  // ship-loop 2026-06-18: bodies are OBSERVATIONAL/CONDITIONAL (AMF) — no imperatives
  // ("Test"/"Sustain"/"Compare"/"Refresh" flagged in review). Titles are noun phrases,
  // not directives. Levers de-duped so the panel never repeats "Annual review".
  const out = [];
  // Only offer a spending-reduction lever when the plan actually needs it. Suggesting cuts on a
  // strong/passing plan (high success, no shortfall) is incoherent against the report's own conclusion.
  if (D.gapMonthly > 0 && D.successPct < 85) out.push({ title: fr ? "Budget cible" : "Target budget", body: fr ? `Une baisse graduelle de ${f$(Math.round(D.gapMonthly * 0.15), true)}/mois pourrait être envisagée.` : `A gradual reduction of ${f$(Math.round(D.gapMonthly * 0.15), false)}/month could be considered.` });
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
    const parts = [`${(d.rate * 100).toFixed(1)}%`];
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
  const title = phaseTitle(phase, fr);
  const now = new Date().toISOString().slice(0, 10);
  const hl = sectionHeadlines(D, fr);
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
    ["mirror_block", "Votre situation", "Your situation"],
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
  const analysisBlocks = ANALYSIS_SLOTS
    .map(([key, frL, enL]) => { const txt = mdSlotFull(ai?.[key]); return txt ? `<div class="anablock"><h3>${fr ? frL : enL}</h3><p>${txt}</p></div>` : ""; })
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
  const _snapMoney = (v) => Math.round(Number(v) || 0).toLocaleString(fr ? "fr-CA" : "en-CA").replace(/[  ]/g, " ") + " $";
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
.ana{display:grid;gap:12px;margin-top:4px}.anablock{border-top:1px solid var(--line);padding-top:8px}.anablock:first-child{border-top:0;padding-top:0}.anablock h3{margin:0 0 4px;font-size:13px;font-weight:800;color:var(--ink);text-transform:uppercase;letter-spacing:.3px}.anablock p{margin:0;font-size:13.5px;line-height:1.6;color:#3a4258}
</style></head><body><div class="wrap">
<header class="top"><div><div class="logo">buildfi</div><div class="meta">${D.age} ${fr ? "ans" : "years"} • ${escHtml(D.prov)} • ${escHtml(title)}</div></div><div style="text-align:right"><div class="tag">${fr ? "Tableau de bord interactif" : "Interactive Dashboard"}</div><div class="meta">${fr ? "Généré le" : "Generated on"} ${now} • ${REPORT_VERSION_360}</div></div></header>
<section class="hero"><div class="grade"><div><div class="g">${escHtml(D.grade)}</div><div style="font-size:12px;color:#6C6258;text-align:center">${D.successPct}% ${fr ? "de réussite" : "success"}</div></div></div><div><h1 style="margin:0 0 6px;font-size:23px">${fr ? "Briefing IA personnalisé" : "Personalized AI briefing"}</h1><p style="margin:0">${escBold(aiBrief)}</p><div class="hero-panels"><div class="panel"><h4>${fr ? "Risque principal" : "Main risk"}</h4><p style="margin:0">${escBold(aiRisk)}</p></div><div class="panel"><h4>${fr ? "Levier principal" : "Main lever"}</h4><p style="margin:0">${escBold(aiLever)}</p></div></div></div></section>
<div class="dashboard"><div style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Votre point de départ" : "Your starting point"}</h2><p class="standfirst">${escHtml(hl.starting_point)}</p><div class="kpi-grid"><div class="kpi kpi-hero"><div class="v" id="kpiSuccess">${D.successPct}%</div><div class="l">${fr ? "Réussite" : "Success"}</div></div><div class="kpi"><div class="v">${f$(D.rMedF, fr)}</div><div class="l">${fr ? "Patrimoine médian final" : "Median ending wealth"}</div></div><div class="kpi kpi-detail"><div class="v">${fPct(D.withdrawalRatePct)}</div><div class="l">${fr ? "Taux de retrait" : "Withdrawal rate"}</div></div><div class="kpi kpi-detail"><div class="v">${f$(D.retGovMonthly ?? D.govMonthly, fr)}${fr ? "/mois" : "/mo"}</div><div class="l">${fr ? "Revenus garantis (rég. perm.)" : "Guaranteed income (steady state)"}</div></div></div><div class="controls"><div class="field"><label for="ageSlider">${fr ? "Âge analysé" : "Age focus"}: <strong id="ageLabel">${Math.max(D.age, D.retAge)}</strong></label><input type="range" id="ageSlider" min="${D.age}" max="${D.deathAge}" value="${Math.max(D.age, D.retAge)}" /></div><div class="field"><label for="scenarioSel">${fr ? "Scénario" : "Scenario"}</label><select id="scenarioSel"><option value="baseline">${fr ? "Base" : "Baseline"}</option><option value="crash08">2008</option><option value="stagflation">${fr ? "Stagflation" : "Stagflation"}</option><option value="prolonged">${fr ? "Baissier prolongé" : "Prolonged bear"}</option></select></div></div></section>
<section class="card"><h2>${fr ? "Tenue du plan dans le temps" : "Plan endurance over time"}</h2><p class="standfirst">${escHtml(hl.endurance)}</p><div class="svgbox"><svg id="fanChart" class="chart" viewBox="0 0 920 320"></svg><div class="legend"><span><i class="dot" style="background:#2F67A3"></i>P50</span><span><i class="dot" style="background:#7CA7D9"></i>P25 / P75</span><span><i class="dot" style="background:#D78E8E"></i>P5 / P95</span></div></div><div class="svgbox" style="margin-top:8px"><svg id="incomeChart" class="chart" viewBox="0 0 920 300"></svg><div class="legend"><span><i class="dot" style="background:#2A8C46"></i>${fr ? "Garantis" : "Guaranteed"}</span><span><i class="dot" style="background:#c4944a"></i>${fr ? "Retraits" : "Withdrawals"}</span><span><i class="dot" style="background:#2F67A3"></i>${fr ? "Dépenses" : "Spending"}</span></div></div></section></div>
<aside style="display:grid;gap:12px"><section class="card"><h2>${fr ? "Repère à l'âge sélectionné" : "Snapshot at selected age"}</h2><div class="readout"><div class="mini"><div class="k">${fr ? "Patrimoine médian" : "Median portfolio"}</div><div class="v" id="agePortfolio">${snap.portfolio}</div></div><div class="mini"><div class="k">${fr ? "Dépenses" : "Spending"}</div><div class="v" id="ageSpend">${snap.spend}</div></div><div class="mini"><div class="k">${fr ? "Garantis" : "Guaranteed"}</div><div class="v" id="ageGov">${snap.gov}</div></div><div class="mini"><div class="k">${fr ? "Retrait" : "Withdrawal"}</div><div class="v" id="ageWd">${snap.wd}</div></div></div></section>
<section class="card"><h2>${fr ? "Réaction du plan aux chocs" : "Plan reaction to shocks"}</h2><p class="standfirst">${escHtml(hl.shocks)}</p><div class="scenario-grid"><div class="scenario"><div class="t">2008</div><div class="n">${D.stressCrashSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Stagflation" : "Stagflation"}</div><div class="n">${D.stressStagSucc ?? "—"}%</div></div><div class="scenario"><div class="t">${fr ? "Baissier prolongé" : "Prolonged bear"}</div><div class="n">${D.stressProlongedSucc ?? "—"}%</div></div></div>${cppGrid}</section>
<section class="card"><h2>${fr ? "Synthèse stratégique" : "Strategic synthesis"}</h2><p class="standfirst">${escHtml(hl.synthesis)}</p><div class="ai"><h4>${fr ? "Narration stratégique" : "Strategic narrative"}</h4><p style="margin:0">${escBold(aiBrief)}</p></div><ul style="margin:10px 0 0;padding-left:18px">${(aiObs.length ? aiObs : [fr ? "Synthèse du risque principal et de son impact réel." : "Synthesis of main risk and practical impact.", fr ? "Priorisation des leviers par impact attendu." : "Levers prioritized by expected impact.", fr ? "Traduction des probabilités en actions." : "Probabilities translated into actions."]).map((x) => `<li>${escBold(x)}</li>`).join("")}</ul></section></aside></div>
${analysisSection}
${realEstateSection360(D, fr)}
${debtsSection360(D, fr)}
${insuranceSection360(D, fr)}
${businessSection360(D, fr)}
${altSection360(D, fr)}
<section class="card"><h2>${fr ? "Leviers à votre portée" : "Levers within reach"}</h2><p class="standfirst">${escHtml(hl.levers)}</p><div class="actions">${actions.map((a) => `<article class="action"><h4>${escHtml(a.title)}</h4><p>${escHtml(a.body)}</p></article>`).join("")}</div></section>
<section class="card"><h2>${fr ? "Méthodologie" : "Methodology"}</h2><p>${fr ? "5 000 simulations: rendements, inflation, longévité, fiscalité. Montants en dollars réels d'aujourd'hui." : "5,000 simulations: returns, inflation, longevity, taxes. Amounts shown in today's real dollars."}</p></section>
${starBlock}<footer class="meta" style="margin-top:16px">buildfi • ${clientExport ? (fr ? "Rapport Bilan 360" : "Bilan 360 report") : (fr ? "Rapport Bilan 360 interactif" : "Interactive Bilan 360 report")} • ${REPORT_VERSION_360}</footer></div>
${clientExport ? "" : `<script>window.__BUILDFI__=${dashJson};window.__SEED__=${seedJson};</script>`}
${clientExport ? "" : `<script>(function(){const DATA=window.__BUILDFI__||{},SEED=window.__SEED__||{},fr=(SEED.lang||"fr")==="fr";const points=(DATA.chart&&Array.isArray(DATA.chart.points))?DATA.chart.points:[];const income=Array.isArray(DATA.incomeByAge)?DATA.incomeByAge:[];if(!points.length)return;const slider=document.getElementById("ageSlider"),ageLabel=document.getElementById("ageLabel"),scenarioSel=document.getElementById("scenarioSel"),kpiSuccess=document.getElementById("kpiSuccess"),outPortfolio=document.getElementById("agePortfolio"),outSpend=document.getElementById("ageSpend"),outGov=document.getElementById("ageGov"),outWd=document.getElementById("ageWd"),fanSvg=document.getElementById("fanChart"),incSvg=document.getElementById("incomeChart");const fmtMoney=(v)=>Math.round(Number(v)||0).toLocaleString(fr?"fr-CA":"en-CA").replace(/[\u00A0\u202F]/g," ")+" $";const nearest=(arr,age)=>{if(!arr.length)return null;let b=arr[0],d=Math.abs((arr[0].age||0)-age);for(const r of arr){const dd=Math.abs((r.age||0)-age);if(dd<d){b=r;d=dd;}}return b;};const xMap=(age,minAge,maxAge,L,R,W)=>L+((age-minAge)/Math.max(1,maxAge-minAge))*(W-L-R);function drawFan(age){if(!fanSvg)return;const W=920,H=320,L=56,R=18,T=16,B=34,minAge=Number(points[0].age||0),maxAge=Number(points[points.length-1].age||minAge+1),maxV=Math.max(1,...points.map(p=>Math.max(p.p95||0,p.p75||0,p.p50||0,p.p25||0,p.p5||0))),yMax=Math.ceil(maxV/50000)*50000,y=(v)=>T+(1-(v/yMax))*(H-T-B),poly=(k)=>points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[k]||0)).toFixed(1)).join(" "),area=(top,bot)=>{const up=points.map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[top]||0)).toFixed(1)).join(" L "),dn=points.slice().reverse().map(p=>xMap(p.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(Number(p[bot]||0)).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},ticks=[0,.25,.5,.75,1].map(t=>({v:yMax*t,yy:y(yMax*t)})),fx=xMap(age,minAge,maxAge,L,R,W);fanSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v/1000)+'k</text>').join("")+'<path d="'+area("p95","p5")+'" fill="rgba(70,128,192,.10)"></path><path d="'+area("p75","p25")+'" fill="rgba(70,128,192,.20)"></path><polyline points="'+poly("p95")+'" fill="none" stroke="#9FC1E8" stroke-width="1.4"></polyline><polyline points="'+poly("p75")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p50")+'" fill="none" stroke="#2F67A3" stroke-width="2.6"></polyline><polyline points="'+poly("p25")+'" fill="none" stroke="#7CA7D9" stroke-width="1.4"></polyline><polyline points="'+poly("p5")+'" fill="none" stroke="#D78E8E" stroke-width="1.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function drawIncome(age){if(!incSvg||!income.length)return;const W=920,H=300,L=56,R=18,T=16,B=34,rows=income.map(r=>({age:Number(r.age||0),gov:Number(r.govMonthly||0),wd:Number(r.portWithdrawMonthly||0),sp:Number(r.spendMonthly||0)})),minAge=rows[0].age,maxAge=rows[rows.length-1].age,maxV=Math.max(1,...rows.map(r=>Math.max(r.sp,r.gov+r.wd)))*1.15,y=(v)=>T+(1-(v/maxV))*(H-T-B),area=(top,bot)=>{const up=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[top]).toFixed(1)).join(" L "),dn=rows.slice().reverse().map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r[bot]).toFixed(1)).join(" L ");return "M "+up+" L "+dn+" Z";},spend=rows.map(r=>xMap(r.age,minAge,maxAge,L,R,W).toFixed(1)+","+y(r.sp).toFixed(1)).join(" "),ticks=[0,.25,.5,.75,1].map(t=>({v:maxV*t,yy:y(maxV*t)})),fx=xMap(age,minAge,maxAge,L,R,W);for(const r of rows){r.total=r.gov+r.wd;r.zero=0;}incSvg.innerHTML=ticks.map(g=>'<line x1="'+L+'" y1="'+g.yy.toFixed(1)+'" x2="'+(W-R)+'" y2="'+g.yy.toFixed(1)+'" stroke="#ECE7DE"/><text x="'+(L-8)+'" y="'+(g.yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7B7267">'+Math.round(g.v)+'$</text>').join("")+'<path d="'+area("gov","zero")+'" fill="rgba(42,140,70,.25)"></path><path d="'+area("total","gov")+'" fill="rgba(199,161,58,.35)"></path><polyline points="'+spend+'" fill="none" stroke="#2F67A3" stroke-width="2.4"></polyline><line x1="'+fx.toFixed(1)+'" y1="'+T+'" x2="'+fx.toFixed(1)+'" y2="'+(H-B)+'" stroke="#1E1A14" stroke-dasharray="4 4"></line>';}
function updateScenario(){if(!scenarioSel||!kpiSuccess)return;const map={baseline:SEED.stress&&SEED.stress.baseline,crash08:SEED.stress&&SEED.stress.crash08,stagflation:SEED.stress&&SEED.stress.stagflation,prolonged:SEED.stress&&SEED.stress.prolonged};const v=map[scenarioSel.value];kpiSuccess.textContent=(v==null?SEED.successPct:v)+"%";}
function updateAge(){const age=Number(slider?slider.value:65);if(ageLabel)ageLabel.textContent=String(age);const p=nearest(points,age)||{},r=nearest(income,age)||{};if(outPortfolio)outPortfolio.textContent=fmtMoney(p.p50||r.portfolio||0);const _mo=fr?"/mois":"/mo";if(outSpend)outSpend.textContent=fmtMoney(r.spendMonthly||0)+_mo;if(outGov)outGov.textContent=fmtMoney(r.govMonthly||0)+_mo;if(outWd)outWd.textContent=fmtMoney(r.portWithdrawMonthly||0)+_mo;drawFan(age);drawIncome(age);}if(slider)slider.addEventListener("input",updateAge);if(scenarioSel)scenarioSel.addEventListener("change",updateScenario);updateScenario();updateAge();})();</script>`}</body></html>`;

  return repairMojibake(html);
}
