// /lib/report-facts-360.js
/* eslint-disable */
// @ts-nocheck
//
// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH for every client-facing Bilan 360 figure.
// (Engine-SSOT consolidation, 2026-07-02 — docs/REPORT-MODEL-CONSOLIDATION.md)
//
// Every number a Bilan 360 report shows, narrates, or embeds is DEFINED here,
// exactly once, on one explicit basis. The renderer (report-html-360.js), the
// AI DATA block (ai-prompt-360.ts), the canon (report-data-360.ts) and the
// coherence gate (report-coherence-gate.ts) all CONSUME this object — none of
// them re-derives arithmetic. This is what kills the "same KPI computed on two
// bases" defect class (hero withdrawal-rate ÷ today's portfolio vs snapshot
// gap@retirement-start vs synthesis gap@steady-state, 2026-07-02 audit).
//
// Basis conventions (uniform across the report):
//   • All wealth/income figures are REAL (today's dollars), floored at 0.
//   • "gap" = ONE definition: household steady-state target − household
//     steady-state guaranteed income (both from the SAME medRevData row).
//   • "withdrawal rate" = the engine's ACTUAL first-retirement-year median
//     portfolio withdrawal ÷ the retirement-date median portfolio (NOT
//     today's portfolio — the 2026-07-02 fix for "73% rate for a 32-year-old").
//   • "lifetime fee cost" = MER × the median-path AUM integrated year by year
//     (NOT MER × terminal wealth × full horizon, which overstated fees by up
//     to ~10× — 2026-07-02 fix).
// ─────────────────────────────────────────────────────────────────────────────

import { calcTax } from "./engine";

const n = (v, d = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function gradeFromSuccess(p) {
  if (p >= 95) return "A+";
  if (p >= 85) return "A";
  if (p >= 75) return "B+";
  if (p >= 65) return "B";
  if (p >= 55) return "C+";
  if (p >= 45) return "C";
  if (p >= 35) return "D";
  return "F";
}

export function deflator(baseAge, age, inf) {
  return 1 / Math.pow(1 + inf, Math.max(0, age - baseAge));
}
export function nearestByAge(rows, age) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  let best = rows[0], dist = Math.abs(n(best.age) - age);
  for (const r of rows) {
    const d = Math.abs(n(r.age) - age);
    if (d < dist) { best = r; dist = d; }
  }
  return best;
}
export const pdVal = (row, rk, nk) => Number.isFinite(n(row?.[rk], NaN)) ? n(row?.[rk]) : n(row?.[nk], 0);

export function portfolioFromRevRow(row, baseAge, inf) {
  if (!row) return 0;
  const nominal = n(row.aRR) + n(row.aTF) + n(row.aNR) + n(row.aDC) + n(row.aPE) + n(row.aPM) + n(row.aLIRA) + n(row.aCRR) + n(row.aCTF) + n(row.aCNR);
  return Math.round(nominal * deflator(baseAge, n(row.age, baseAge), inf));
}

// ─── Locale-correct formatters (2026-07-02) ─────────────────────────────────
// THE money/percent formatters for every rendered figure. The old renderer f$
// always emitted the FR postfix form ("287,916 $") even for EN, and fPct always
// used a dot + space ("9.3 %") — wrong for EN ("9.3%") AND FR ("9,3 %") at
// once. This produced the 96-occurrence EN currency defect class the prose-only
// normalizeCurrency pass could never reach (it only sees AI narration).
//   FR: "287 916 $"   "9,3 %"
//   EN: "$287,916"    "9.3%"
export function fmtMoney360(v, fr = true) {
  if (!Number.isFinite(Number(v))) return "—";
  const s = Math.round(Number(v)).toLocaleString(fr ? "fr-CA" : "en-CA").replace(/[  ]/g, " ");
  return fr ? `${s} $` : `$${s}`;
}
export function fmtPct360(v, fr = true) {
  if (!Number.isFinite(Number(v))) return "—";
  const x = Math.round(Number(v) * 10) / 10;
  return fr ? `${String(x).replace(".", ",")} %` : `${x}%`;
}

export function buildReportFacts360(mc, params, phase, extraRuns = {}) {
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

  const startPortfolio = Math.max(0, Math.round(pdVal(startPD, "rp50", "p50") || portfolioFromRevRow(startRev, age, inf)));
  const retPortfolio = Math.max(0, Math.round(pdVal(retPD, "rp50", "p50") || portfolioFromRevRow(retRev, age, inf)));
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

  // ── THE gap (2026-07-02 single-basis fix) ─────────────────────────────────
  // ONE definition, used by the hero KPI fallbacks, the levers, the synthesis
  // AND the narration: household steady-state target − household steady-state
  // guaranteed income, both from the SAME row. The old renderer carried THREE
  // gap bases (individual@ret-start, household@ret-start, household@steady) —
  // the direct cause of the snapshot-vs-synthesis contradiction (hnw 8598 vs
  // 5028; midcouple 7824 vs 3594). The bridge-year gap is kept as an explicit,
  // separately-named fact so bridge analysis never masquerades as the gap.
  const gapMonthly = Math.max(0, householdRetTargetMonthly - retGovMonthly);
  const gapMonthlyBridge = Math.max(0, retSpM - govMonthly); // individual, at retirement start (bridge year)

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

  // ── Withdrawal rate (2026-07-02 basis fix) ────────────────────────────────
  // = the engine's ACTUAL median first-retirement-year portfolio withdrawal ÷
  // the RETIREMENT-DATE median portfolio. The old formula divided the
  // spending gap by TODAY's portfolio — for a 32-year-old with $41K today and
  // $237K at retirement that printed a meaningless "73.1%". Engine-actual
  // numerator also makes the KPI 0% by construction when guaranteed income
  // carries the spending (nothing is withdrawn).
  const wdAnnualRealAtRet = Math.max(0, n(retRev?.ret) * deflator(age, n(retRev?.age, age), inf));
  const withdrawalRatePct = retPortfolio > 0 ? Math.round((wdAnnualRealAtRet / retPortfolio) * 1000) / 10 : null;
  // Forced RRIF minimum at retirement start (real) — the coherence gate's C4
  // allowance: a gov-covered profile may still show withdrawals up to this.
  const rrifMinAnnualAtRet = Math.max(0, (n(retRev?.wRrifMin) + n(retRev?.cWRrifMin)) * deflator(age, n(retRev?.age, age), inf));
  // Total funding need withdrawals must cover at retirement start: spending +
  // taxes − household guaranteed income (same row, real). Withdrawals beyond
  // need + forced RRIF minimums are unexplainable by the report's own data —
  // the gate's C4 reconciliation bound.
  const wdFundingNeedAnnualAtRet = Math.max(0,
    (n(retRev?.spend) + n(retRev?.tax) + n(retRev?.cTax) - hhGovAnnual(retRev)) * deflator(age, n(retRev?.age, age), inf));

  // ── Lifetime fee cost (2026-07-02 formula fix) ────────────────────────────
  // MER × the median-path real AUM, integrated year by year over the plan
  // horizon (today → deathAge). The old formula was MER × max(TERMINAL wealth,
  // today's portfolio) × the full retirement span — as if the portfolio sat at
  // its largest value for 38 years (gis: $123,393 of "fees" on a $21K
  // portfolio, 6× the assets). This is the honest time-weighted equivalent
  // computable from data the report already ships (the fan-chart series).
  let feeCostLifetime = 0;
  if (pdSeries.length > 0) {
    for (let a = age; a <= deathAge; a++) {
      feeCostLifetime += merWeighted * Math.max(0, n(nearestByAge(pdSeries, a)?.p50));
    }
    feeCostLifetime = Math.round(feeCostLifetime);
  } else {
    feeCostLifetime = Math.round(merWeighted * startPortfolio * Math.max(1, deathAge - age));
  }

  // ── Guaranteed-income surplus (keep-and-disclose, 2026-07-02) ─────────────
  // When modeled guaranteed income EXCEEDS modeled spending, the engine
  // reinvests the difference (TFSA first) — lawful, but it makes ending wealth
  // grow from benefits, which reads as impossible unless DISCLOSED. Integrate
  // the median-path surplus (real) so the renderer can carry a mandatory
  // disclosure line and the coherence gate can bound ending wealth with the
  // surplus counted as an inflow.
  // Engine-actual reinvestment (r.reinvest, additive field 2026-07-02) is
  // preferred: the displayed `spend` is gov-pinned when withdrawals are 0, so
  // the gov−spend approximation reads 0 exactly where the surplus is largest.
  // Fall back to the approximation for MC payloads predating the field.
  const hasReinvest = rd.some((rr) => rr && rr.reinvest != null);
  let surplusLifetimeReal = 0, surplusMaxMonthly = 0;
  for (const rr of rd) {
    const a = Math.round(n(rr?.age, age));
    if (a < retAge) continue;
    const d = deflator(age, a, inf);
    const s = hasReinvest
      ? Math.max(0, n(rr?.reinvest) * d)
      : Math.max(0, (hhGovAnnual(rr) - n(rr?.spend)) * d);
    surplusLifetimeReal += s;
    surplusMaxMonthly = Math.max(surplusMaxMonthly, Math.round(s / 12));
  }
  surplusLifetimeReal = Math.round(surplusLifetimeReal);
  const surplusMonthlySteady = Math.max(0, retGovMonthly - householdRetTargetMonthly);
  const surplusReinvested = surplusLifetimeReal >= 10000 || surplusMonthlySteady >= 100;

  return {
    properties, reEquity,
    debts, debtTotal, debtAnnualCost, lifeInsBenefit, lifeInsPremium, cLifeInsBenefit, hasInsurance,
    business, peBal, pmBal, hasAlt,
    version: "dash-v3", phase, age, retAge, deathAge, prov: params?.prov || "QC", sex: params?.sex || "M", sal: Math.round(n(params?.sal, 0)),
    rrsp, tfsa, nr, liraBal: Math.round(n(params?.liraBal)), dcBal: Math.round(n(params?.dcBal)), totalSavings: rrsp + tfsa + nr + Math.round(n(params?.liraBal)) + Math.round(n(params?.dcBal)),
    qppAge: Math.round(n(params?.qppAge, 65)), oasAge: Math.round(n(params?.oasAge, 65)), qppMonthly, oasMonthly, gisMonthly, dbPensionMonthly: penMonthly, penMonthly, govMonthly,
    // coveragePct/govCoveragePct = STEADY-STATE HOUSEHOLD gov ÷ household target (was: bridge-snapshot
    // gov ÷ individual target, which read as a false "0% coverage" for pre-65 retirees / couples).
    coveragePct: retGovCoveragePct, govCoveragePct: householdRetTargetMonthly > 0 ? retGovMonthly / householdRetTargetMonthly : 0,
    retGovMonthly, retGovCoveragePct, retQppPrimaryMonthly, retOasPrimaryMonthly, retGisMonthly, retPenMonthly, retSpouseGovMonthly, retSteadyAge, householdIncome, householdRetTargetMonthly, householdReplacementPct, bridgeYears, bridgeCostReal,
    retSpM, gapMonthly, gapMonthlyBridge, withdrawalRatePct, initialRate: withdrawalRatePct,
    rrifMinAnnualAtRet: Math.round(rrifMinAnnualAtRet), wdAnnualRealAtRet: Math.round(wdAnnualRealAtRet), wdFundingNeedAnnualAtRet: Math.round(wdFundingNeedAnnualAtRet),
    retBal: startPortfolio, retYearBalance: retPortfolio,
    surplusLifetimeReal, surplusMaxMonthly, surplusMonthlySteady, surplusReinvested,
    successPct, grade: gradeFromSuccess(successPct),
    biggestRisk: withdrawalRatePct >= 5.5 ? "Taux de retrait élevé; les premières années sont sensibles aux marchés." : successPct < 75 ? "Le plan est fragile dans la zone prudente." : "Le principal risque reste la variabilité des marchés.",
    bestLever: (gapMonthly > 0 && successPct < 85) ? `Réduire les dépenses d'environ ${fmtMoney360(Math.round(gapMonthly * 0.15), true)}/mois.` : "Le timing RRQ/PSV, l'efficience fiscale et la flexibilité de dépenses sont les meilleurs leviers.",
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
    taxCurrentEffective, taxRetirementEffective, taxCurrentMarginal, merWeighted, feeCostLifetime,
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
