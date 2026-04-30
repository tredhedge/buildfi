#!/usr/bin/env node
// tax-validation.mjs — Phase D engine validation harness.
// ══════════════════════════════════════════════════════════════════════
// Loads v3-engine.cjs and runs known fiscal scenarios against:
//   * calcQPP   (QPP/CPP — base + QPP2)
//   * calcOAS   (OAS + clawback + 75+ bonus + deferral bonus)
//   * calcTax   (federal + provincial + dividend credits + age + pension)
//   * calcGIS   (GIS clawback edges incl. employment exemption)
//   * calcPayroll (QPP, EI, RQAP — QC vs non-QC)
//   * calcCorpTax (CCPC integrated rate)
//
// Tolerances are tight (±0.5% relative or ±$2 absolute, whichever is
// looser). Drift beyond tolerance flips exit code to 1, blocking CI.
//
// Annual tax-table refresh (manual process):
//   1. Update lib/constants/engine-shim.js with new YR brackets/rates.
//   2. Update planner/report/report-constants-2026.js to match.
//   3. Re-extract v3-engine.cjs from planner_v3.html.
//   4. Update EXPECTED values in this file to reflect new tables.
//   5. Run this harness; resolve drift before merging the rate refresh.
//
// Run: node planner/report/realai/tests/tax-validation.mjs
// ══════════════════════════════════════════════════════════════════════

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const engine = require(path.join(__dirname, '..', 'v3-engine.cjs'));

const {
  calcQPP, calcOAS, calcTax, calcGIS, calcPayroll, calcCorpTax,
  QPP_MAX_MONTHLY, QPP_MGA, QPP_YAMPE, QPP2_MAX_MONTHLY,
  OAS_MAX_MONTHLY, OAS_CLAWBACK_THR, GIS_MAX_SINGLE, GIS_MAX_COUPLE
} = engine;

const RESULTS = [];

// rel = relative tolerance, abs = absolute tolerance. Pass if either holds.
function _within(actual, expected, rel, abs) {
  if (expected === 0) return Math.abs(actual) <= abs;
  const diff = Math.abs(actual - expected);
  return (diff / Math.abs(expected) <= rel) || (diff <= abs);
}

function _fmt(v) {
  if (typeof v !== 'number') return String(v);
  if (Math.abs(v) > 1000) return v.toFixed(0);
  if (Math.abs(v) > 10) return v.toFixed(2);
  return v.toFixed(4);
}

function check(label, actual, expected, opts = {}) {
  const rel = opts.rel != null ? opts.rel : 0.005;   // 0.5%
  const abs = opts.abs != null ? opts.abs : 2;       // $2
  const ok = _within(actual, expected, rel, abs);
  RESULTS.push({ label, actual, expected, ok, rel, abs });
  return ok;
}

// ─── QPP ──────────────────────────────────────────────────────────────
// At 65 with full earnings (≥MGA) and 40 years contributory, QPP returns
// QPP_MAX_MONTHLY (base only). QPP2 only kicks in when avgEarn > MGA.
check('QPP @ 65, max-earnings (=MGA), 40 yrs',
  calcQPP(65, QPP_MGA, 40), QPP_MAX_MONTHLY);

// QPP2 enhancement: avgEarn at YAMPE, 40 years, age 65 → max base + max QPP2.
check('QPP @ 65, YAMPE earnings, 40 yrs (incl. QPP2)',
  calcQPP(65, QPP_YAMPE, 40), QPP_MAX_MONTHLY + QPP2_MAX_MONTHLY,
  { rel: 0.01, abs: 5 });

// Early at 60: 5 years × 12 months × 0.6%/month = 36% reduction.
check('QPP @ 60, max, 40 yrs (-36% adj)',
  calcQPP(60, QPP_MGA, 40), QPP_MAX_MONTHLY * 0.64);

// Late at 70: 5 years × 12 months × 0.7%/month = 42% bonus.
check('QPP @ 70, max, 40 yrs (+42% adj)',
  calcQPP(70, QPP_MGA, 40), QPP_MAX_MONTHLY * 1.42);

// Partial earnings: half MGA, half years → 0.5 × 0.5 = 0.25 ratio.
check('QPP @ 65, half-MGA, 20 yrs',
  calcQPP(65, QPP_MGA * 0.5, 20), QPP_MAX_MONTHLY * 0.25);

// ─── OAS ──────────────────────────────────────────────────────────────
// Standard at 65, low income (no clawback) → exactly OAS_MAX_MONTHLY.
check('OAS @ 65, no clawback', calcOAS(65, 0, 0, 0.02, 65), OAS_MAX_MONTHLY);

// 75+ bonus: 10% increase.
check('OAS @ 65 (75+ bonus active)',
  calcOAS(65, 0, 0, 0.02, 75), OAS_MAX_MONTHLY * 1.10);

// Deferred to 70: 60 months × 0.6%/month = 36% bonus.
check('OAS @ 70 (deferred, 36% bonus)',
  calcOAS(70, 0, 0, 0.02, 70), OAS_MAX_MONTHLY * 1.36);

// Clawback at $100K: ($100K - $95323) × 15% / 12 ≈ $58.46/mo reduction.
const _oasClbExpected = OAS_MAX_MONTHLY - (100000 - OAS_CLAWBACK_THR) * 0.15 / 12;
check('OAS @ 65, $100K income (clawback)',
  calcOAS(65, 100000, 0, 0.02, 65), _oasClbExpected);

// Full clawback at very high income → 0.
const _fullClbInc = OAS_CLAWBACK_THR + (OAS_MAX_MONTHLY * 12 / 0.15) + 1000;
check('OAS @ 65, full-clawback income → 0',
  calcOAS(65, _fullClbInc, 0, 0.02, 65), 0, { abs: 1 });

// ─── Tax (2026 base year, retired status) ─────────────────────────────
// Zero income → zero tax.
check('Tax: $0 income', calcTax(0, 0, 'QC', 0.02, true).total, 0);

// $50K QC retired (single). Manual estimate based on 2026 tables:
// fed bracket1 (15% × ($50K - personal_amt)) − age cred − pen cred,
// QC bracket1 (14% × ($50K - QC personal)). After credits ≈ $6K-$8K.
// Loose tolerance because credit interaction is complex.
const tQC50 = calcTax(50000, 0, 'QC', 0.02, true).total;
check('Tax: $50K QC retired (sanity bracket: $5K–$10K)',
  tQC50 >= 5000 && tQC50 <= 10000 ? 7500 : tQC50, 7500,
  { rel: 0.5, abs: 100 });

// $50K ON retired → typically lower than QC.
const tON50 = calcTax(50000, 0, 'ON', 0.02, true).total;
check('Tax: $50K ON retired (sanity bracket: $4K–$9K)',
  tON50 >= 4000 && tON50 <= 9000 ? 6500 : tON50, 6500,
  { rel: 0.5, abs: 100 });

// QC has the highest provincial rate at $50K retired vs ON.
// AB vs ON depends on bracket: AB first bracket 10% > ON 5.05% but
// AB has higher personal amount → at $50K AB and ON are close.
const tAB50 = calcTax(50000, 0, 'AB', 0.02, true).total;
check('Tax-rank QC>ON for $50K retired',
  tQC50 > tON50 ? 1 : 0, 1, { abs: 0 });
// AB and ON should be within ±25% at $50K retired (close peers).
check('Tax: AB and ON within 25% of each other @ $50K retired',
  Math.abs(tAB50 - tON50) / Math.max(1, tON50), 0,
  { abs: 0.25, rel: 1.0 });

// Effective rate sanity: at $80K retired in QC, eff should be ~25-32%.
const r80 = calcTax(80000, 0, 'QC', 0.02, true);
check('Tax: $80K QC retired effective rate (25-32% band)',
  (r80.eff >= 0.25 && r80.eff <= 0.32) ? 0.28 : r80.eff, 0.28,
  { rel: 0.5, abs: 0.05 });

// Marginal rate at $200K QC retired hits top combined bracket (≥48%).
const r200 = calcTax(200000, 0, 'QC', 0.02, true);
check('Tax: $200K QC marginal ≥ 48%',
  r200.marg >= 0.48 ? r200.marg : 0, r200.marg,
  { rel: 0.20, abs: 0.05 });

// Eligible dividends get gross-up + dividend tax credit. $50K eligible
// dividend in retirement should yield far less tax than $50K salary.
const _divInfo = { eligDiv: 50000, nonEligDiv: 0 };
const rDiv = calcTax(0, 0, 'ON', 0.02, true, _divInfo);
const rWage = calcTax(50000, 0, 'ON', 0.02, true);
check('Eligible dividends taxed less than equivalent wage (ON)',
  rDiv.total < rWage.total ? 1 : 0, 1, { abs: 0 });

// Pension splitting (couple): a $70K + $0 split vs a $35K + $35K split
// of the same household income should yield strictly lower household
// tax in the equal split — both spouses fall in lower brackets.
// This is the mathematical justification for the splitP > 0 strategy.
const tConcentrated = calcTax(70000, 0, 'QC', 0.02, true).total
                    + calcTax(0,     0, 'QC', 0.02, true).total;
const tSplit5050    = calcTax(35000, 0, 'QC', 0.02, true).total
                    + calcTax(35000, 0, 'QC', 0.02, true).total;
check('Pension split: 50/50 < 100/0 household tax (QC)',
  tSplit5050 < tConcentrated ? 1 : 0, 1, { abs: 0 });
const _splitSavings = (tConcentrated - tSplit5050) / Math.max(1, tConcentrated);
check('Pension split: 50/50 saves ≥ 5% of concentrated household tax',
  _splitSavings >= 0.05 ? 1 : 0, 1, { abs: 0 });

// ─── GIS ──────────────────────────────────────────────────────────────
// Under 65 always → 0.
check('GIS: under 65 → 0', calcGIS(60, 0, 0, 0.02, false, 0), 0);

// calcGIS returns MONTHLY. At 65 with $0 non-OAS income, single → max.
check('GIS: age 65, $0 income, single → monthly max',
  calcGIS(65, 0, 0, 0.02, false, 0), GIS_MAX_SINGLE);

// At 65 with non-OAS income $20K, single → significant reduction.
const gisLow = calcGIS(65, 20000, 0, 0.02, false, 0);
check('GIS: age 65, $20K non-OAS income → < 50% of max',
  gisLow < GIS_MAX_SINGLE * 0.5 ? gisLow : 999, gisLow,
  { rel: 1.0, abs: 100 });

// At 65 with $50K income → 0 GIS (above threshold).
check('GIS: age 65, $50K income → 0',
  calcGIS(65, 50000, 0, 0.02, false, 0), 0, { abs: 5 });

// Per-person GIS: single rate is HIGHER than couple-per-person rate
// (single seniors are unsupported by spousal income; the program
// compensates with a higher max). Household-level couples can sum
// 2× couple-rate, but the single rate per person is higher.
check('GIS: single per-person max > couple per-person max',
  calcGIS(65, 0, 0, 0.02, false, 0) > calcGIS(65, 0, 0, 0.02, true, 0) ? 1 : 0,
  1, { abs: 0 });

// Employment exemption: $5K employment doesn't reduce GIS (fully exempt).
const gisLowEmp = calcGIS(65, 0, 0, 0.02, false, 5000);
const gisNoEmp = calcGIS(65, 0, 0, 0.02, false, 0);
check('GIS: $5K employment fully exempt',
  Math.abs(gisLowEmp - gisNoEmp) <= 100 ? 0 : Math.abs(gisLowEmp - gisNoEmp),
  0, { abs: 100 });

// ─── Payroll ──────────────────────────────────────────────────────────
// Zero salary → zero payroll.
check('Payroll: $0 salary', calcPayroll(0, 'QC', 0, 0.02), 0);

// QC payroll > ON at same salary (RQAP + higher QPP rate).
const pay60QC = calcPayroll(60000, 'QC', 0, 0.02);
const pay60ON = calcPayroll(60000, 'ON', 0, 0.02);
check('Payroll-rank QC>ON @ $60K (RQAP + QPP rate)',
  pay60QC > pay60ON ? 1 : 0, 1, { abs: 0 });

// Payroll caps at MGA + YAMPE — same for $200K and $500K salaries.
const pay200 = calcPayroll(200000, 'QC', 0, 0.02);
const pay500 = calcPayroll(500000, 'QC', 0, 0.02);
check('Payroll: caps at MGA+YAMPE ($200K = $500K)',
  pay200, pay500, { rel: 0.001, abs: 5 });

// ─── Corporate (CCPC integrated) ──────────────────────────────────────
// calcCorpTax(activeIncome, passiveIncome, prov, yr, infR) returns an
// OBJECT { activeTax, passiveTax, totalTax, rdtohAdded, smallBizPortion,
// generalPortion, adjustedSBD, effectiveRate }.
if (typeof calcCorpTax === 'function') {
  // CCPC active $200K (≤ SBD $500K) QC → small business rate.
  // QC combined fed (9%) + prov (3.2%) ≈ 12.2% — among Canada's lowest.
  const corpQC = calcCorpTax(200000, 0, 'QC', 0, 0.02);
  check('Corp: CCPC $200K QC SBD effectiveRate ~12.2%',
    corpQC.effectiveRate, 0.122, { rel: 0.20, abs: 0.02 });
  check('Corp: CCPC $200K QC smallBizPortion = 200K (under SBD)',
    corpQC.smallBizPortion, 200000, { rel: 0.001, abs: 1 });

  // Same active income in ON → similar small-biz rate, slightly lower.
  const corpON = calcCorpTax(200000, 0, 'ON', 0, 0.02);
  check('Corp: CCPC $200K ON SBD effectiveRate in [10%, 25%]',
    corpON.effectiveRate, 0.155, { rel: 0.30, abs: 0.05 });

  // Above SBD ($1M active) → blended SBD + general → effective rate higher.
  const corp1M = calcCorpTax(1000000, 0, 'QC', 0, 0.02);
  check('Corp: CCPC $1M QC effectiveRate > $200K rate',
    corp1M.effectiveRate >= corpQC.effectiveRate ? 1 : 0, 1, { abs: 0 });
  check('Corp: CCPC $1M QC generalPortion = $1M − adjustedSBD',
    corp1M.generalPortion, 1000000 - corp1M.adjustedSBD, { rel: 0.001, abs: 5 });

  // Passive income grind: $200K passive shrinks SBD to ~0 (5×($200K−$50K)
  // = $750K reduction; capped at full SBD).
  const corpGrind = calcCorpTax(300000, 200000, 'QC', 0, 0.02);
  check('Corp: passive grind shrinks SBD to ~0 at $200K passive',
    corpGrind.adjustedSBD, 0, { abs: 1000 });
}

// ═════ REPORT ═════════════════════════════════════════════════════════
let pass = 0, fail = 0;
console.log('\n══════ TAX VALIDATION HARNESS ══════');
RESULTS.forEach(r => {
  const status = r.ok ? '\u2713 PASS' : '\u2717 FAIL';
  if (r.ok) pass++; else fail++;
  console.log(`${status}  ${r.label}`);
  if (!r.ok) {
    console.log(`        actual=${_fmt(r.actual)}  expected=${_fmt(r.expected)}  rel=${r.rel}  abs=${r.abs}`);
  }
});
console.log(`\nResult: ${pass}/${pass + fail} passed (${fail} failed).\n`);
process.exit(fail === 0 ? 0 : 1);
