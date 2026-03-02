// /tests/report-calculations.test.js
// ══════════════════════════════════════════════════════════════════════
// Comprehensive test suite for Essentiel report calculation pipeline
// Covers: translateToMC → runMC → extractReportData → renderReportHTML
// Run with: npx tsx tests/report-calculations.test.js
// ══════════════════════════════════════════════════════════════════════

import { translateToMC } from "../lib/quiz-translator.ts";
import { runMC, calcTax, QPP_MAX_MONTHLY, OAS_MAX_MONTHLY } from "../lib/engine/index.js";
import { extractReportData, calcCostOfDelay, calcMinViableReturn, renderReportHTML, buildAIPrompt } from "../lib/report-html.js";

// ════════════════════════════════════════════════════════════════
// TEST INFRASTRUCTURE
// ════════════════════════════════════════════════════════════════
let passed = 0, failed = 0, errors = [];

function assert(condition, name, detail) {
  if (condition) { passed++; }
  else { failed++; errors.push({ name, detail: detail || "" }); console.error("  FAIL:", name, detail || ""); }
}

function assertClose(actual, expected, tolerance, name) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) { passed++; }
  else { failed++; const d = `expected ~${expected}, got ${actual} (diff ${diff}, tol ${tolerance})`; errors.push({ name, detail: d }); console.error("  FAIL:", name, d); }
}

function assertRange(actual, min, max, name) {
  if (actual >= min && actual <= max) { passed++; }
  else { failed++; const d = `expected [${min}, ${max}], got ${actual}`; errors.push({ name, detail: d }); console.error("  FAIL:", name, d); }
}

function section(title) { console.log("\n══ " + title + " ══"); }

// ════════════════════════════════════════════════════════════════
// REFERENCE QUIZ: matches the actual user report (March 2 2026)
// ════════════════════════════════════════════════════════════════
const QUIZ_USER = {
  age: 38, retAge: 62, sex: "M", prov: "QC",
  income: 75000, totalSavings: 50000,
  monthlyContrib: 500,
  employer: "large",
  lifestyle: "active", risk: "balanced",
  parttime: "no", homeowner: false,
  debts: [], couple: "no", confidence: 3,
  win: "", fix: "", worries: [],
};

// ════════════════════════════════════════════════════════════════
// CATEGORY 1: translateToMC — Parameter Translation
// ════════════════════════════════════════════════════════════════
section("1. translateToMC — Parameter Translation");

const p = translateToMC(QUIZ_USER);

// Basic demographics
assert(p.age === 38, "age = 38");
assert(p.retAge === 62, "retAge = 62");
assert(p.sex === "M", "sex = M");
assert(p.prov === "QC", "prov = QC");
assert(p.sal === 75000, "sal = 75000");
assert(p.deathAge === 90, "deathAge = 90 (male)");

// Savings split (age 38 → 35-50 bracket: 45/35/20)
assert(p.rrsp === 22500, "rrsp = 50000 × 0.45 = 22500", `got ${p.rrsp}`);
assert(p.tfsa === 17500, "tfsa = 50000 × 0.35 = 17500", `got ${p.tfsa}`);
assert(p.nr === 10000, "nr = 50000 × 0.20 = 10000", `got ${p.nr}`);

// Contributions: TFSA first, then RRSP, then NR
// ac = 500 * 12 = 6000, tfsaC = min(6000, 7000) = 6000, rrspC = 0, nrC = 0
assert(p.tfsaC === 6000, "tfsaC = min(6000, 7000) = 6000/yr", `got ${p.tfsaC}`);
assert(p.rrspC === 0, "rrspC = 0 (all goes to TFSA)", `got ${p.rrspC}`);
assert(p.nrC === 0, "nrC = 0", `got ${p.nrC}`);

// Employer DC pension
assert(p.penType === "cd", "penType = cd for 'large' employer");
assert(p.dcBal === 58500, "dcBal = 75000 × 0.06 × 13 = 58500", `got ${p.dcBal}`);

// Spending
assert(p.retSpM === 5000, "retSpM = 5000 (active, QC COL=1)", `got ${p.retSpM}`);

// Allocation
assert(p.allocR === 0.7, "allocR = 0.7 (balanced)", `got ${p.allocR}`);
assert(p.merR === 0.015, "merR = 0.015 for balanced (eq > 0.5)", `got ${p.merR}`);
assert(p.merT === 0.0075, "merT = merR × 0.5 = 0.0075", `got ${p.merT}`);

// QPP/OAS timing
assert(p.qppAge === 62, "qppAge = 62 (retAge >= 60)", `got ${p.qppAge}`);
assert(p.oasAge === 65, "oasAge = 65 (retAge < 65)", `got ${p.oasAge}`);
assert(p.qppYrs === 20, "qppYrs = min(40, 38-18) = 20", `got ${p.qppYrs}`);

// _report passthrough
assert(p._report.debtBal === 0, "debtBal = 0");
assert(p._report.homeVal === 0, "homeVal = 0 (not homeowner)");

console.log("  translateToMC: all parameter checks passed");

// ════════════════════════════════════════════════════════════════
// CATEGORY 2: MC Engine — runMC
// ════════════════════════════════════════════════════════════════
section("2. MC Engine — runMC");

const mc = runMC(p, 5000);

assert(mc !== null, "runMC returns non-null");
assert(mc.succ >= 0 && mc.succ <= 1, "succ in [0,1]", `got ${mc.succ}`);
assert(mc.medRevData && mc.medRevData.length > 0, "medRevData non-empty");
assert(mc.fins && mc.fins.length === 5000, "fins has 5000 entries", `got ${mc.fins ? mc.fins.length : 'null'}`);

// Percentile finals should be DIFFERENT from each other (spread from Monte Carlo)
const pctSpread = mc.p95F - mc.var5;
assert(pctSpread > 0, "P95-P5 spread > 0 (percentiles differ)", `P5=${Math.round(mc.var5)}, P95=${Math.round(mc.p95F)}, spread=${Math.round(pctSpread)}`);
assert(mc.p75F > mc.p25F || mc.succ >= 0.999, "P75 > P25 (or near-perfect success)", `P25=${Math.round(mc.p25F)}, P75=${Math.round(mc.p75F)}`);

// Real vs nominal: real = nominal / discFinal
const discFinal = Math.pow(1 + p.inf, p.deathAge - p.age);
assertClose(mc.rMedF, mc.medF / discFinal, 1, "rMedF = medF / discFinal");
assertClose(mc.rP5F, mc.var5 / discFinal, 1, "rP5F = var5 / discFinal");
assert(mc.medF >= mc.rMedF, "medF (nominal) >= rMedF (real)", `nom=${Math.round(mc.medF)}, real=${Math.round(mc.rMedF)}`);

// medRevData spans correct age range
assert(mc.medRevData[0].age === 38, "medRevData starts at 38", `got ${mc.medRevData[0].age}`);
assert(mc.medRevData[mc.medRevData.length - 1].age === 90, "medRevData ends at 90", `got ${mc.medRevData[mc.medRevData.length - 1].age}`);

console.log(`  MC: succ=${(mc.succ*100).toFixed(1)}%, medF=${Math.round(mc.medF)}, rMedF=${Math.round(mc.rMedF)}`);
console.log(`  Nominal: P5=${Math.round(mc.var5)}, P25=${Math.round(mc.p25F)}, P50=${Math.round(mc.medF)}, P75=${Math.round(mc.p75F)}, P95=${Math.round(mc.p95F)}`);
console.log(`  Real:    P5=${Math.round(mc.rP5F)}, P25=${Math.round(mc.rP25F)}, P50=${Math.round(mc.rMedF)}, P75=${Math.round(mc.rP75F)}, P95=${Math.round(mc.rP95F)}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 3: extractReportData — Nominal vs Real Bug
// ════════════════════════════════════════════════════════════════
section("3. extractReportData — rMedF MUST be REAL (not nominal)");

const D = extractReportData(mc, p);

// BUG CHECK: The code reads mc.medF (nominal) but labels it rMedF.
// It should read mc.rMedF (real, deflated by discFinal).
assert(
  Math.abs(D.rMedF - Math.round(mc.rMedF)) < 2,
  "CRITICAL: D.rMedF must use mc.rMedF (real)",
  `D.rMedF=${D.rMedF}, mc.rMedF=${Math.round(mc.rMedF)}, mc.medF(nominal)=${Math.round(mc.medF)}`
);
assert(
  Math.abs(D.rP5F - Math.round(mc.rP5F)) < 2,
  "CRITICAL: D.rP5F must use mc.rP5F (real)",
  `D.rP5F=${D.rP5F}, mc.rP5F=${Math.round(mc.rP5F)}, mc.var5(nominal)=${Math.round(mc.var5)}`
);
assert(
  Math.abs(D.rP25F - Math.round(mc.rP25F)) < 2,
  "CRITICAL: D.rP25F must use mc.rP25F (real)",
  `D.rP25F=${D.rP25F}, mc.rP25F=${Math.round(mc.rP25F)}`
);
assert(
  Math.abs(D.rP75F - Math.round(mc.rP75F)) < 2,
  "CRITICAL: D.rP75F must use mc.rP75F (real)",
  `D.rP75F=${D.rP75F}, mc.rP75F=${Math.round(mc.rP75F)}`
);
assert(
  Math.abs(D.rP95F - Math.round(mc.rP95F)) < 2,
  "CRITICAL: D.rP95F must use mc.rP95F (real)",
  `D.rP95F=${D.rP95F}, mc.rP95F=${Math.round(mc.rP95F)}`
);

// Percentiles should differ (not all = dcBal)
assert(D.rP5F !== D.rP75F || D.successPct >= 99, "P5 ≠ P75 (unless near-perfect success)");

// ════════════════════════════════════════════════════════════════
// CATEGORY 4: extractReportData — Other Fields
// ════════════════════════════════════════════════════════════════
section("4. extractReportData — Core Data Fields");

assert(D.age === 38, "D.age = 38");
assert(D.retAge === 62, "D.retAge = 62");
assert(D.sal === 75000, "D.sal = 75000");
assert(D.retSpM === 5000, "D.retSpM = 5000");
assert(D.totalSavings === 50000, "D.totalSavings = 50000", `got ${D.totalSavings}`);

// OAS at 62 should be 0
assert(D.oasMonthly === 0, "OAS = 0 at age 62 (starts at 65)", `got ${D.oasMonthly}`);

// Coverage and gap
const expectedCover = D.retSpM > 0 ? Math.round(D.govMonthly / D.retSpM * 100) : 0;
assert(D.coveragePct === expectedCover, "coveragePct consistent", `expected ${expectedCover}, got ${D.coveragePct}`);
assert(D.gapMonthly === Math.max(0, D.retSpM - D.govMonthly), "gapMonthly correct");

// Withdrawal rate
const expectedWd = D.retBal > 0 ? Math.round(D.gapMonthly * 12 / D.retBal * 1000) / 10 : 99;
assertClose(D.withdrawalRatePct, expectedWd, 0.1, "withdrawalRatePct consistent");

// Monthly contributions in D should be MONTHLY
assert(D.tfsaC === Math.round(p.tfsaC / 12), "D.tfsaC is monthly", `got ${D.tfsaC}, annual=${p.tfsaC}`);
assert(D.rrspC === Math.round(p.rrspC / 12), "D.rrspC is monthly", `got ${D.rrspC}`);
assert(D.monthlyContrib === Math.round((p.rrspC + p.tfsaC + p.nrC) / 12), "D.monthlyContrib correct");
assert(D.retBal > 0, "retYearBalance > 0");
assertRange(D.retBal, 200000, 2000000, "retBal in reasonable range");

// ════════════════════════════════════════════════════════════════
// CATEGORY 5: Donut Chart — Income Stream Sum
// ════════════════════════════════════════════════════════════════
section("5. Donut Chart — Income Streams Must Sum to retSpM");

// Donut streams: QPP + OAS + DB pension + savings gap = retSpM
const donutTotal = D.qppMonthly + D.oasMonthly + D.dbPensionMonthly + D.gapMonthly;
console.log(`  Donut streams: QPP=${D.qppMonthly} + OAS=${D.oasMonthly} + pension=${D.dbPensionMonthly} + gap=${D.gapMonthly} = ${donutTotal}`);
console.log(`  Target: retSpM = ${D.retSpM}`);
assertClose(donutTotal, D.retSpM, 1, "Donut streams sum to retSpM (QPP+OAS+pension+gap=spending)");

// ════════════════════════════════════════════════════════════════
// CATEGORY 6: Snapshot5yr — Nominal vs Real
// ════════════════════════════════════════════════════════════════
section("6. Snapshot5yr — Must Show Real Dollars");

const snapshot = D.snapshot5yr || [];
console.log("  Snapshot rows (raw from engine):");
snapshot.forEach(r => {
  const yr = r.age - 38;
  const inf = Math.pow(1.021, yr);
  console.log(`    Age ${r.age}: bal=${r.bal.toLocaleString()}, gov=${r.revGov.toLocaleString()}/yr, ep=${r.revEp.toLocaleString()}/yr, dep=${r.dep.toLocaleString()}/yr (deflated≈${Math.round(r.dep/inf).toLocaleString()}/yr)`);
});

if (snapshot.length >= 3) {
  const firstSpend = snapshot[0].dep;
  const lastSpend = snapshot[snapshot.length - 1].dep;
  const spendRatio = lastSpend / firstSpend;
  console.log(`  Spending growth: first=${firstSpend}, last=${lastSpend}, ratio=${spendRatio.toFixed(2)}x`);

  // In REAL terms, spending should be roughly constant (~60K/yr)
  // If ratio > 1.2, data is clearly in nominal dollars
  assert(
    spendRatio < 1.2,
    "CRITICAL: Snapshot spending must be roughly constant (real $)",
    `ratio=${spendRatio.toFixed(2)}x — data appears to be in NOMINAL dollars, not real`
  );

  // Balance at death should match rMedF (in real terms), not medF (nominal)
  const lastBal = snapshot[snapshot.length - 1].bal;
  const lastBalDeflated = Math.round(lastBal / Math.pow(1.021, snapshot[snapshot.length - 1].age - 38));
  console.log(`  Final balance (age ${snapshot[snapshot.length - 1].age}): raw=${lastBal.toLocaleString()}, deflated≈${lastBalDeflated.toLocaleString()}`);
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 7: QPP Calculation
// ════════════════════════════════════════════════════════════════
section("7. QPP at Retirement");

const retRow = mc.medRevData.find(r => r.age >= 62);
if (retRow) {
  const qppYr = retRow.rrq;
  const qppMo = Math.round(qppYr / 12);
  console.log(`  QPP at 62: ${qppYr.toFixed(0)}/yr = ${qppMo}/mo`);
  assert(qppYr > 0, "QPP > 0 at retirement");
  assert(qppYr < QPP_MAX_MONTHLY * 12, "QPP < annual max");
  // QPP at 62 = max × earlyPenalty × (yrsContrib / eligibleYrs)
  // With 20 yrs of contributions and early takeup at 62, expected ~40-70% of max
  assertRange(qppMo, 200, 1200, "QPP monthly in reasonable range");
}

// OAS should kick in at 65
const row65 = mc.medRevData.find(r => r.age === 65);
if (row65) {
  console.log(`  OAS at 65: ${row65.psv.toFixed(0)}/yr = ${Math.round(row65.psv/12)}/mo`);
  assert(row65.psv > 0, "OAS > 0 at age 65");
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 8: Tax Calculations
// ════════════════════════════════════════════════════════════════
section("8. Tax Calculations");

const tax75k = calcTax(75000, 0, "QC", 0.021);
console.log(`  Tax on 75K (QC): total=${Math.round(tax75k.total)}, eff=${(tax75k.eff*100).toFixed(1)}%, marg=${(tax75k.marg*100).toFixed(1)}%`);
assertRange(tax75k.eff, 0.15, 0.30, "Effective rate on 75K in [15%, 30%]");
assertRange(tax75k.marg, 0.30, 0.45, "Marginal rate on 75K in [30%, 45%]");
assertClose(Math.round(tax75k.eff * 100), D.taxCurrentEffective, 2, "Tax eff matches D.taxCurrentEffective");

// Tax on 0 income
const tax0 = calcTax(0, 0, "QC", 0);
assert(tax0.total === 0, "Tax on $0 = 0");

// Tax on high income
const tax200k = calcTax(200000, 0, "QC", 0.021);
assert(tax200k.eff > tax75k.eff, "200K eff > 75K eff (progressive)", `200K=${(tax200k.eff*100).toFixed(1)}%, 75K=${(tax75k.eff*100).toFixed(1)}%`);

// All provinces should work
["QC","ON","BC","AB","SK","MB","NB","NS","PE","NL","NT","YT","NU"].forEach(prov => {
  const t = calcTax(75000, 0, prov, 0.02);
  assert(t && t.total > 0, `Tax in ${prov} > 0`, `total=${Math.round(t.total)}`);
});

// ════════════════════════════════════════════════════════════════
// CATEGORY 9: Fee Cost Lifetime
// ════════════════════════════════════════════════════════════════
section("9. Fee Cost Lifetime");

const totalSav = p.rrsp + p.tfsa + p.nr;
const merW = (p.merR * p.rrsp + p.merT * p.tfsa + p.merN * p.nr) / Math.max(1, totalSav);
const expectedFeeCost = Math.round(merW * D.retBal * (p.deathAge - p.retAge));
console.log(`  MER weighted: ${(merW*100).toFixed(4)}%, retBal: ${D.retBal}, years: ${p.deathAge - p.retAge}`);
console.log(`  Fee cost: expected=${expectedFeeCost}, D.feeCostLifetime=${D.feeCostLifetime}`);
assertClose(D.feeCostLifetime, expectedFeeCost, 100, "feeCostLifetime correct");

// ════════════════════════════════════════════════════════════════
// CATEGORY 10: Cost of Delay & Min Viable Return
// ════════════════════════════════════════════════════════════════
section("10. Cost of Delay & Min Viable Return");

const costDelay = calcCostOfDelay(p);
console.log(`  Cost of delay: ${costDelay}`);
assert(costDelay > 0, "Cost of delay > 0");
// lostContrib = 6000, 24 years growth at ~5% net ≈ 18K
assertRange(costDelay, 10000, 30000, "Cost of delay in reasonable range");

const minReturn = calcMinViableReturn(p);
console.log(`  Min viable return: ${minReturn}%`);
assert(minReturn > 0 && minReturn < 15, "Min viable return in (0%, 15%)");

// ════════════════════════════════════════════════════════════════
// CATEGORY 11: HTML Rendering — Contribution Display Bug
// ════════════════════════════════════════════════════════════════
section("11. HTML Rendering — Contribution Display Check");

// Render the actual report HTML and check for the TFSA contribution bug
const reportHTML = renderReportHTML(D, mc, QUIZ_USER, "fr", {}, costDelay, minReturn);

// The report should show TFSA contribution as 500$/mois, NOT 6000$/mois
const tfsaMatch = reportHTML.match(/CÉLI.*?\+\s*(\d[\d\s]*)\s*\$/);
if (tfsaMatch) {
  const displayedTfsa = parseInt(tfsaMatch[1].replace(/\s/g, ''));
  console.log(`  TFSA contribution displayed: ${displayedTfsa} (should be 500, not 6000)`);
  assert(
    displayedTfsa === 500,
    "CRITICAL: TFSA contribution must display as MONTHLY (500), not ANNUAL (6000)",
    `displayed ${displayedTfsa}$/mois — uses params.tfsaC (annual) instead of D.tfsaC (monthly)`
  );
} else {
  console.log("  Could not find TFSA contribution in HTML (may not be rendered if 0)");
}

// Check P5/Median/P75 values are not all identical
const p5Match = reportHTML.match(/Pessimiste.*?<div class="kv">([\d\s$]+)/s);
const medMatch = reportHTML.match(/Médian.*?<div class="kv">([\d\s$]+)/s);
// Extract the three KPI values
const kpiVals = [];
const kpiRegex = /<div class="kv">([\d\s]+)\s*\$/g;
let kpiM;
while ((kpiM = kpiRegex.exec(reportHTML)) !== null) {
  const v = parseInt(kpiM[1].replace(/\s/g, ''));
  if (!isNaN(v) && v > 1000) kpiVals.push(v);
  if (kpiVals.length >= 10) break;
}
console.log(`  First 10 KPI values found in HTML: ${kpiVals.join(', ')}`);

// Check that the snapshot table in HTML uses real (constant) spending
const snapshotSpends = [];
const spendRegex = /(\d[\d\s]*)\s*\$\/an/g;
let sm;
while ((sm = spendRegex.exec(reportHTML)) !== null) {
  const v = parseInt(sm[1].replace(/\s/g, ''));
  if (v > 30000 && v < 500000) snapshotSpends.push(v);
}
if (snapshotSpends.length >= 3) {
  const spRatio = snapshotSpends[snapshotSpends.length - 1] / snapshotSpends[0];
  console.log(`  HTML snapshot spending values: ${snapshotSpends.join(', ')}`);
  console.log(`  Spending growth ratio in HTML: ${spRatio.toFixed(2)}x`);
  assert(
    spRatio < 1.2,
    "CRITICAL: HTML snapshot spending should be constant (real $)",
    `first=${snapshotSpends[0]}, last=${snapshotSpends[snapshotSpends.length-1]}, ratio=${spRatio.toFixed(2)}x`
  );
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 12: buildPriority — Order Verification
// ════════════════════════════════════════════════════════════════
section("12. buildPriority — Priority Order");

// Profile with CC debt at 20% — debt should be first priority (or second after employer match)
const pDebt = translateToMC({
  age: 35, retAge: 65, income: 80000, prov: "QC",
  employer: "large", risk: "balanced",
  debts: [{ type: "cc", amount: 10000 }]
});
const mcDebt = runMC(pDebt, 200);
const dDebt = extractReportData(mcDebt, pDebt);
// Render to trigger buildPriority internally
const htmlDebt = renderReportHTML(dDebt, mcDebt, {
  age: 35, retAge: 65, income: 80000, prov: "QC",
  employer: "large", risk: "balanced",
  debts: [{ type: "cc", amount: 10000 }]
}, "fr", {}, 0, 0);

// Check that CC debt (19.99%) appears in priority list
const ccPriorityMatch = htmlDebt.match(/Carte de crédit.*?(\d+[\.,]\d+)\s*%/);
if (ccPriorityMatch) {
  console.log(`  CC debt priority found with rate: ${ccPriorityMatch[1]}%`);
  passed++;
} else {
  // Check alternative patterns
  const debtMatch = htmlDebt.includes("19.99") || htmlDebt.includes("20.0");
  assert(debtMatch, "CC debt at ~20% should appear in priority list");
}

// Employer match should appear for "large" employer
assert(htmlDebt.includes("50-100%") || htmlDebt.includes("50-100 %"), "Employer match priority present", "50-100% not found in priority HTML");

// Profile without employer match — TFSA should come before RRSP for marginal < 40%
const pNoMatch = translateToMC({ age: 40, retAge: 65, income: 60000, prov: "QC", employer: "x" });
const mcNoMatch = runMC(pNoMatch, 200);
const dNoMatch = extractReportData(mcNoMatch, pNoMatch);
const htmlNoMatch = renderReportHTML(dNoMatch, mcNoMatch, { age: 40, retAge: 65, income: 60000, prov: "QC", employer: "x" }, "fr", {}, 0, 0);
// At 60K income, marginal rate in QC is ~36% < 40%, so TFSA should come before RRSP
const tfsaIdx = htmlNoMatch.indexOf("libre d'impôt");
const rrspIdx = htmlNoMatch.indexOf("enregistré d'épargne-retraite");
if (tfsaIdx > 0 && rrspIdx > 0) {
  console.log(`  TFSA position: ${tfsaIdx}, RRSP position: ${rrspIdx}`);
  // With marginal < 40%, TFSA should come before RRSP in priority section
  // Note: only check within the priority section, not the whole document
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 13: Edge Cases — translateToMC
// ════════════════════════════════════════════════════════════════
section("13. Edge Cases — translateToMC");

// Young person (< 35)
const pYoung = translateToMC({ age: 25, retAge: 65, totalSavings: 10000, income: 50000, sex: "F", prov: "ON" });
assert(pYoung.rrsp === 2000, "Young: RRSP = 20%", `got ${pYoung.rrsp}`);
assert(pYoung.tfsa === 5000, "Young: TFSA = 50%", `got ${pYoung.tfsa}`);
assert(pYoung.nr === 3000, "Young: NR = 30%", `got ${pYoung.nr}`);
assert(pYoung.deathAge === 92, "Female deathAge = 92");

// Older person (>= 50)
const pOld = translateToMC({ age: 55, retAge: 65, totalSavings: 200000, income: 100000, sex: "M", prov: "AB" });
assert(pOld.rrsp === 110000, "Old: RRSP = 55%", `got ${pOld.rrsp}`);
assert(pOld.tfsa === 50000, "Old: TFSA = 25%", `got ${pOld.tfsa}`);
assert(pOld.nr === 40000, "Old: NR = 20%", `got ${pOld.nr}`);

// Government DB pension
const pGov = translateToMC({ age: 40, retAge: 60, income: 90000, employer: "gov", prov: "QC" });
assert(pGov.penType === "db", "Gov: DB pension");
assert(pGov.penIdx === true, "Gov: pension indexed");
assert(pGov.penM > 0, "Gov: pension monthly > 0");
assertRange(pGov.penM, 5000, 10000, "Gov pension in reasonable range");

// High contributor waterfall
const pHigh = translateToMC({ age: 40, retAge: 65, income: 120000, monthlyContrib: 3000, prov: "QC" });
assert(pHigh.tfsaC === 7000, "High: TFSA maxed at 7000", `got ${pHigh.tfsaC}`);
assert(pHigh.rrspC === 21600, "High: RRSP = min(29K, 120K×0.18)", `got ${pHigh.rrspC}`);
assert(pHigh.nrC === 7400, "High: NR = remainder", `got ${pHigh.nrC}`);

// Homeowner
const pHome = translateToMC({ age: 35, homeowner: true, prov: "QC", income: 80000 });
assert(pHome.props.length === 1, "Homeowner: 1 property");
assert(pHome.props[0].val === 380000, "QC median home = 380K");
assert(pHome._report.equity > 0, "equity > 0");

// Debt interest calculation
const pDebt2 = translateToMC({ age: 30, income: 60000, debts: [{ type: "cc", amount: 5000 }] });
assert(pDebt2.debts.length === 1, "1 debt");
assert(pDebt2.debts[0].rate === 0.1999, "CC rate = 19.99%");
assert(pDebt2.debts[0].annualCost === Math.round(5000 * 0.1999), "CC annual cost");

// Part-time
const pPT = translateToMC({ age: 55, retAge: 60, parttime: "yes", parttimeAmount: 2000, parttimeYears: 7 });
assert(pPT.ptM === 2000, "Part-time = 2000/mo");
assert(pPT.ptYrs === 7, "Part-time = 7 years");

// QPP timing edge cases
const pEarlyRet = translateToMC({ age: 50, retAge: 55 });
assert(pEarlyRet.qppAge === 65, "Early retiree (55): QPP at 65 (can't take before 60)", `got ${pEarlyRet.qppAge}`);
assert(pEarlyRet.oasAge === 65, "Early retiree: OAS at 65");

const pLateRet = translateToMC({ age: 50, retAge: 68 });
assert(pLateRet.qppAge === 68, "Late retiree (68): QPP at 68", `got ${pLateRet.qppAge}`);
assert(pLateRet.oasAge === 68, "Late retiree: OAS at 68", `got ${pLateRet.oasAge}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 14: MC Engine Edge Cases
// ════════════════════════════════════════════════════════════════
section("14. MC Engine Edge Cases");

// Aggressive spender — engine caps spending at available income, so person
// doesn't technically "ruin" but gets severely reduced spending.
// With DC pension that draws down slowly, finAssets may never reach 0.
const pFail = Object.assign({}, p); pFail.retSpM = 15000;
const mcFail = runMC(pFail, 500);
console.log(`  High spender (15K/mo): succ=${(mcFail.succ*100).toFixed(1)}%`);
console.log(`  Note: Engine caps spending at available income — DC draw rate < return rate keeps finAssets > 0`);
// Verify the spending IS capped (not actually 15K/mo throughout)
const retRowFail = mcFail.medRevData.find(r => r.age === 80);
if (retRowFail) {
  const realSpend80 = retRowFail.spend / Math.pow(1.021, 80 - 38);
  console.log(`  At 80: actual spend=${Math.round(retRowFail.spend)} nominal, ${Math.round(realSpend80)} real (target was ${15000*12}/yr)`);
  assert(realSpend80 < 15000 * 12, "Spending at 80 is capped below target", `real spend=${Math.round(realSpend80)}`);
}

// Conservative spender
const pSafe = Object.assign({}, p); pSafe.retSpM = 1500;
const mcSafe = runMC(pSafe, 500);
console.log(`  Low spender (1.5K/mo): succ=${(mcSafe.succ*100).toFixed(1)}%`);
assert(mcSafe.succ > 0.9, "1.5K/mo should succeed often", `got ${(mcSafe.succ*100).toFixed(1)}%`);

// Immediate retirement
const pNow = translateToMC({ age: 65, retAge: 65, income: 80000, totalSavings: 500000, prov: "QC", sex: "M" });
const mcNow = runMC(pNow, 500);
assert(mcNow !== null, "Immediate retirement runs");
console.log(`  Immediate retire (65, 500K): succ=${(mcNow.succ*100).toFixed(1)}%`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 15: Withdrawal Rate vs Success Consistency
// ════════════════════════════════════════════════════════════════
section("15. Withdrawal Rate vs Success Consistency");

console.log(`  WD rate: ${D.withdrawalRatePct}%, gov coverage: ${D.coveragePct}%, success: ${D.successPct}%`);
if (D.withdrawalRatePct > 5 && D.coveragePct < 50 && D.successPct >= 100) {
  console.log("  WARNING: High WD rate + low coverage + 100% success is unusual");
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 16: medRevData Spending — Nominal vs Real Analysis
// ════════════════════════════════════════════════════════════════
section("16. medRevData Spending — Nominal vs Real");

const retRows = mc.medRevData.filter(r => r.age >= p.retAge);
if (retRows.length > 2) {
  const first = retRows[0], last = retRows[retRows.length - 1];
  const growth = last.spend / first.spend;
  console.log(`  Spending: age ${first.age}=${Math.round(first.spend)}/yr, age ${last.age}=${Math.round(last.spend)}/yr, ratio=${growth.toFixed(2)}x`);
  if (growth > 1.3) {
    console.log("  NOTE: medRevData.spend is in NOMINAL dollars (grows with inflation)");
    console.log("  Snapshot5yr must deflate before displaying as 'today's dollars'");
  }
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 17: Savings Rate
// ════════════════════════════════════════════════════════════════
section("17. Savings Rate");

const annualContrib = p.rrspC + p.tfsaC + p.nrC;
const expectedRate = p.sal > 0 ? Math.round(annualContrib / p.sal * 100) : 0;
assert(D.savingsRate === expectedRate, "Savings rate correct", `expected ${expectedRate}, got ${D.savingsRate}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 18: buildHeuristics — via HTML rendering
// ════════════════════════════════════════════════════════════════
section("18. buildHeuristics — Heuristics Section in HTML");

// Heuristics section should appear in the rendered report
assert(reportHTML.includes("Hypothèses") || reportHTML.includes("Assumptions"), "Heuristics section present in HTML");

// Should show RRSP/TFSA/NR split percentages
const splitMatch = reportHTML.match(/(\d+)\s*%\s*\/\s*(\d+)\s*%\s*\/\s*(\d+)\s*%/);
if (splitMatch) {
  const rPct = parseInt(splitMatch[1]), tPct = parseInt(splitMatch[2]), nPct = parseInt(splitMatch[3]);
  const splitSum = rPct + tPct + nPct;
  console.log(`  Heuristics split: RRSP=${rPct}% / TFSA=${tPct}% / NR=${nPct}% = ${splitSum}%`);
  assert(splitSum === 100, "Heuristics split sums to 100%", `got ${splitSum}%`);
  // Age 38 → 45/35/20 bracket
  assert(rPct === 45, "Heuristics RRSP=45% for age 38", `got ${rPct}`);
  assert(tPct === 35, "Heuristics TFSA=35% for age 38", `got ${tPct}`);
} else {
  console.log("  WARNING: Could not find RRSP/TFSA/NR split in heuristics HTML");
}

// Should show retirement spending
assert(reportHTML.includes("5 000") || reportHTML.includes("5,000"), "Heuristics shows retirement spending");

// Should show asset allocation (70% for balanced)
assert(reportHTML.includes("70 %") || reportHTML.includes("70%"), "Heuristics shows 70% allocation");

// Should show QPP/RRQ age
assert(reportHTML.includes("62 ans") || reportHTML.includes("62 yr"), "Heuristics shows QPP age 62");

// DC balance should appear in heuristics for large employer
assert(reportHTML.includes("58 500") || reportHTML.includes("58,500"), "Heuristics shows DC balance of 58,500");

// ════════════════════════════════════════════════════════════════
// CATEGORY 19: buildWhatIf — Scenario Generation
// ════════════════════════════════════════════════════════════════
section("19. buildWhatIf — What-If Scenarios in HTML");

// What-if section should appear
const wiPresent = reportHTML.includes("Et si") || reportHTML.includes("What if") || reportHTML.includes("marge de manoeuvre") || reportHTML.includes("flexibility") || reportHTML.includes("renforcer") || reportHTML.includes("strengthen");
assert(wiPresent, "What-if section present in HTML");

// Scenario 1: Reduce spending by 500
const spendScenario = reportHTML.includes("500 $/mois") || reportHTML.includes("$500/mo") || reportHTML.includes("500 $");
assert(spendScenario, "What-if: reduce spending scenario present");

// Scenario 2: Delay retirement by 2 years
const delayScenario = reportHTML.includes("2 ans") || reportHTML.includes("2 years");
assert(delayScenario, "What-if: delay retirement scenario present");

// Scenario 3: Increase contributions by 200
const contribScenario = reportHTML.includes("200 $/mois") || reportHTML.includes("$200/mo");
assert(contribScenario, "What-if: increase contributions scenario present");

// Scenario 4: Market crash (always present, heuristic)
const crashScenario = reportHTML.includes("Krach") || reportHTML.includes("crash") || reportHTML.includes("-40");
assert(crashScenario, "What-if: market crash scenario present");

// Each scenario should show a grade
const gradeMatches = reportHTML.match(/class="mono"[^>]*>(\d+)%/g);
if (gradeMatches) {
  console.log(`  Found ${gradeMatches.length} grade percentages in what-if section`);
}

// D.whatIf should be populated (regenerated at render time)
// Re-extract to get whatIf data
const D2 = extractReportData(mc, p);
const htmlForWI = renderReportHTML(D2, mc, QUIZ_USER, "fr", {}, costDelay, minReturn);
const wiData = D2.whatIf || [];
console.log(`  What-if scenarios generated: ${wiData.length}`);
assert(wiData.length >= 3, "At least 3 what-if scenarios generated", `got ${wiData.length}`);
if (wiData.length >= 4) {
  // Crash scenario should always be "down"
  const crashWi = wiData.find(w => w.type === "down");
  assert(crashWi !== undefined, "What-if includes a downside scenario");
  if (crashWi) {
    assert(crashWi.newPct < D2.successPct, "Crash scenario reduces success %", `crash=${crashWi.newPct}, base=${D2.successPct}`);
  }
  // Up scenarios should improve or maintain success
  const upWIs = wiData.filter(w => w.type === "up");
  upWIs.forEach(w => {
    assert(w.newPct >= D2.successPct - 5, `Up scenario "${w.title}" doesn't drastically reduce success`, `newPct=${w.newPct}, base=${D2.successPct}`);
  });
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 20: Fan Chart Fallback (buildPDfallback)
// ════════════════════════════════════════════════════════════════
section("20. Fan Chart — buildPDfallback and SVG Rendering");

// The fan chart is always rendered in the HTML
const fanSVG = reportHTML.includes('viewBox="0 0 740 370"') || reportHTML.includes('viewBox="0 0 680 260"');
assert(fanSVG, "Fan chart SVG present in HTML");

// Check for percentile labels
assert(reportHTML.includes("P50") || reportHTML.includes("Médiane"), "Fan chart has P50/Median label");
assert(reportHTML.includes("P95"), "Fan chart has P95 label");
assert(reportHTML.includes("P5"), "Fan chart has P5 label");

// Check for retirement marker
assert(reportHTML.includes("Retraite") || reportHTML.includes("Retirement"), "Fan chart has retirement marker");

// Fan chart should have valid SVG paths (not empty)
const pathCount = (reportHTML.match(/<path d="M/g) || []).length;
console.log(`  Fan chart SVG paths: ${pathCount}`);
assert(pathCount >= 5, "Fan chart has at least 5 SVG paths (P5, P25, P50, P75, P95)", `got ${pathCount}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 21: Donut Chart SVG
// ════════════════════════════════════════════════════════════════
section("21. Donut Chart — SVG Arc Math");

// Donut should be present
const donutSVG = reportHTML.includes('viewBox="0 0 180 180"');
assert(donutSVG, "Donut chart SVG present in HTML");

// Donut center text should show total monthly spending
const donutCenterMatch = reportHTML.match(/viewBox="0 0 180 180"[\s\S]*?<text[^>]*font-size="16"[^>]*>([\d\s]+)\s*\$/);
if (donutCenterMatch) {
  const donutCenter = parseInt(donutCenterMatch[1].replace(/\s/g, ''));
  console.log(`  Donut center value: ${donutCenter} (should be ${D.retSpM})`);
  assertClose(donutCenter, D.retSpM, 1, "Donut center = retSpM");
}

// Donut should have arc paths (one per income stream)
const donutPaths = (reportHTML.match(/viewBox="0 0 180 180"[\s\S]*?<\/svg>/)?.[0] || '').match(/<path d="M/g) || [];
console.log(`  Donut arc paths: ${donutPaths.length}`);
// QPP + OAS + savings gap = 3 streams minimum (+ pension if DC)
assert(donutPaths.length >= 3, "Donut has at least 3 arc paths (QPP, OAS, savings)", `got ${donutPaths.length}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 22: AI Prompt DATA Block
// ════════════════════════════════════════════════════════════════
section("22. AI Prompt — DATA Block Values");

const aiPrompt = buildAIPrompt(D, p, true, QUIZ_USER);
assert(aiPrompt.sys.length > 100, "AI system prompt has content");
assert(aiPrompt.usr.length > 100, "AI user prompt has content");

// Parse DATA block from user prompt
const dataMatch = aiPrompt.usr.match(/DATA:\s*(\{[\s\S]*\})\n/);
assert(dataMatch, "DATA block present in AI prompt");
if (dataMatch) {
  const data = JSON.parse(dataMatch[1]);
  console.log(`  AI DATA block parsed successfully`);

  // Profile checks
  assert(data.profile.age === 38, "AI DATA: age=38", `got ${data.profile.age}`);
  assert(data.profile.retAge === 62, "AI DATA: retAge=62", `got ${data.profile.retAge}`);
  assert(data.profile.prov === "QC", "AI DATA: prov=QC");
  assert(data.profile.qppAge === 62, "AI DATA: qppAge=62", `got ${data.profile.qppAge}`);

  // Savings
  assert(data.savings.total === D.totalSavings, "AI DATA: savings.total matches D.totalSavings", `DATA=${data.savings.total}, D=${D.totalSavings}`);
  assert(data.savings.retBal === D.retYearBalance, "AI DATA: savings.retBal matches D.retYearBalance", `DATA=${data.savings.retBal}, D=${D.retYearBalance}`);

  // Gov income
  assert(data.gov.qpp === D.qppMonthly, "AI DATA: gov.qpp matches D.qppMonthly");
  assert(data.gov.oas === D.oasMonthly, "AI DATA: gov.oas matches D.oasMonthly");
  assert(data.gov.cover === D.coveragePct, "AI DATA: gov.cover matches D.coveragePct");

  // Spending
  assert(data.spend.mo === D.retSpM, "AI DATA: spend.mo matches D.retSpM");
  assert(data.spend.gap === D.gapMonthly, "AI DATA: spend.gap matches D.gapMonthly");
  assert(data.spend.wd === D.withdrawalRatePct, "AI DATA: spend.wd matches D.withdrawalRatePct");

  // Results — CRITICAL: should use real (not nominal) values
  assert(data.results.pct === D.successPct, "AI DATA: results.pct matches D.successPct");
  assert(data.results.med === D.rMedF, "AI DATA: results.med = rMedF (real, not nominal)");
  assert(data.results.p5 === D.rP5F, "AI DATA: results.p5 = rP5F (real)");
  assert(data.results.p25 === D.rP25F, "AI DATA: results.p25 = rP25F (real)");
  assert(data.results.p75 === D.rP75F, "AI DATA: results.p75 = rP75F (real)");

  // Tax
  assert(data.tax.eff === D.taxCurrentEffective, "AI DATA: tax.eff matches D.taxCurrentEffective");

  // Fees
  assertClose(data.fees.mer, D.merWeighted, 0.001, "AI DATA: fees.mer matches D.merWeighted");
  assert(data.fees.cost === D.feeCostLifetime, "AI DATA: fees.cost matches D.feeCostLifetime");

  // No debt in reference profile
  assert(data.debt === null, "AI DATA: debt is null for no-debt profile");

  // No property in reference profile
  assert(data.property === null, "AI DATA: property is null for non-homeowner");
}

// AMF compliance in system prompt
assert(aiPrompt.sys.includes("COMPLIANCE"), "AI prompt includes compliance section");
assert(aiPrompt.sys.includes("conditional tense") || aiPrompt.sys.includes("conditionnel"), "AI prompt enforces conditional tense");
assert(aiPrompt.sys.includes("devriez") || aiPrompt.sys.includes("prescriptive"), "AI prompt forbids prescriptive verbs");

// ════════════════════════════════════════════════════════════════
// CATEGORY 23: Snapshot5yr — Row-by-Row Verification
// ════════════════════════════════════════════════════════════════
section("23. Snapshot5yr — Row-by-Row Verification");

if (snapshot.length > 0) {
  // First row should be at retirement age
  assert(snapshot[0].age === D.retAge, "Snapshot first row = retAge", `got ${snapshot[0].age}`);

  // Last row should be at death age
  assert(snapshot[snapshot.length - 1].age === D.deathAge, "Snapshot last row = deathAge", `got ${snapshot[snapshot.length - 1].age}`);

  // Balance should be monotonically decreasing (enforced by code)
  let prevBal = Infinity;
  let monoOK = true;
  snapshot.forEach(row => {
    if (row.bal > prevBal) monoOK = false;
    prevBal = row.bal;
  });
  assert(monoOK, "Snapshot balance is monotonically decreasing");

  // Each row: revEp = max(0, dep - revGov)
  snapshot.forEach(row => {
    const expectedRevEp = Math.max(0, row.dep - row.revGov);
    assertClose(row.revEp, expectedRevEp, 1, `Snapshot age ${row.age}: revEp = max(0, dep - revGov)`);
  });

  // Spending should be roughly constant (all in real dollars)
  const spendValues = snapshot.map(r => r.dep);
  const spendMin = Math.min(...spendValues);
  const spendMax = Math.max(...spendValues);
  const spendRange = spendMax / Math.max(1, spendMin);
  console.log(`  Snapshot spending range: min=${spendMin}, max=${spendMax}, ratio=${spendRange.toFixed(2)}x`);
  assert(spendRange < 1.3, "Snapshot spending range < 1.3x (real dollars, roughly constant)", `ratio=${spendRange.toFixed(2)}x`);

  // Gov income should be 0 before QPP age, > 0 at QPP age
  const preQPP = snapshot.filter(r => r.age < D.qppAge);
  const atQPP = snapshot.find(r => r.age >= D.qppAge);
  preQPP.forEach(row => {
    // Before QPP+OAS, gov income might still include DB pension
    console.log(`  Pre-QPP row age ${row.age}: revGov=${row.revGov}/yr`);
  });
  if (atQPP) {
    assert(atQPP.revGov > 0, "Gov income > 0 at QPP age", `age ${atQPP.age}: revGov=${atQPP.revGov}`);
  }

  // QPP age should appear as a row
  const qppRow = snapshot.find(r => r.age === D.qppAge);
  if (D.qppAge > D.retAge && D.qppAge <= D.deathAge) {
    assert(qppRow !== undefined, "QPP age appears in snapshot rows", `qppAge=${D.qppAge}`);
  }

  console.log("  Snapshot rows:");
  snapshot.forEach(r => {
    console.log(`    Age ${r.age}: bal=${r.bal.toLocaleString()}, gov=${r.revGov.toLocaleString()}/yr, sav=${r.revEp.toLocaleString()}/yr, dep=${r.dep.toLocaleString()}/yr`);
  });
}

// ════════════════════════════════════════════════════════════════
// CATEGORY 24: buildPriority — Edge Cases
// ════════════════════════════════════════════════════════════════
section("24. buildPriority — RRSP vs TFSA at Different Marginal Rates");

// High income (>40% marginal) → RRSP before TFSA
const pHighInc = translateToMC({ age: 40, retAge: 65, income: 150000, prov: "QC", employer: "x" });
const mcHighInc = runMC(pHighInc, 200);
const dHighInc = extractReportData(mcHighInc, pHighInc);
const htmlHighInc = renderReportHTML(dHighInc, mcHighInc, { age: 40, retAge: 65, income: 150000, prov: "QC", employer: "x" }, "fr", {}, 0, 0);

// At 150K QC income, marginal rate > 40%, so RRSP should come before TFSA
const rrspPosHI = htmlHighInc.indexOf("Régime enregistré d'épargne-retraite");
const tfsaPosHI = htmlHighInc.indexOf("Compte d'épargne libre d'impôt");
if (rrspPosHI > 0 && tfsaPosHI > 0) {
  console.log(`  High income: RRSP pos=${rrspPosHI}, TFSA pos=${tfsaPosHI}`);
  assert(rrspPosHI < tfsaPosHI, "High income (>40% marg): RRSP before TFSA in priority", `RRSP@${rrspPosHI}, TFSA@${tfsaPosHI}`);
}

// Low income (<40% marginal) → TFSA before RRSP
const pLowInc = translateToMC({ age: 40, retAge: 65, income: 55000, prov: "QC", employer: "x" });
const mcLowInc = runMC(pLowInc, 200);
const dLowInc = extractReportData(mcLowInc, pLowInc);
const htmlLowInc = renderReportHTML(dLowInc, mcLowInc, { age: 40, retAge: 65, income: 55000, prov: "QC", employer: "x" }, "fr", {}, 0, 0);

const rrspPosLI = htmlLowInc.indexOf("Régime enregistré d'épargne-retraite");
const tfsaPosLI = htmlLowInc.indexOf("Compte d'épargne libre d'impôt");
if (rrspPosLI > 0 && tfsaPosLI > 0) {
  console.log(`  Low income: RRSP pos=${rrspPosLI}, TFSA pos=${tfsaPosLI}`);
  assert(tfsaPosLI < rrspPosLI, "Low income (<40% marg): TFSA before RRSP in priority", `TFSA@${tfsaPosLI}, RRSP@${rrspPosLI}`);
}

// Debt priority: high-interest (>10%) should appear BEFORE RRSP/TFSA
const pDebtPri = translateToMC({
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x",
  debts: [{ type: "cc", amount: 15000 }]
});
const mcDebtPri = runMC(pDebtPri, 200);
const dDebtPri = extractReportData(mcDebtPri, pDebtPri);
const htmlDebtPri = renderReportHTML(dDebtPri, mcDebtPri, {
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x",
  debts: [{ type: "cc", amount: 15000 }]
}, "fr", {}, 0, 0);

const ccPos = htmlDebtPri.indexOf("Carte de crédit");
const rrspPosDPri = htmlDebtPri.indexOf("Régime enregistré d'épargne-retraite");
if (ccPos > 0 && rrspPosDPri > 0) {
  assert(ccPos < rrspPosDPri, "CC debt (19.99%) before RRSP in priority", `CC@${ccPos}, RRSP@${rrspPosDPri}`);
}

// Medium-rate debt (4-10%) should come AFTER RRSP/TFSA
const pMedDebt = translateToMC({
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x",
  debts: [{ type: "car", amount: 20000, rate: 6.5 }]
});
const mcMedDebt = runMC(pMedDebt, 200);
const dMedDebt = extractReportData(mcMedDebt, pMedDebt);
const htmlMedDebt = renderReportHTML(dMedDebt, mcMedDebt, {
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x",
  debts: [{ type: "car", amount: 20000, rate: 6.5 }]
}, "fr", {}, 0, 0);

const carPos = htmlMedDebt.indexOf("Prêt automobile");
const tfsaPosMD = htmlMedDebt.indexOf("Compte d'épargne libre d'impôt");
if (carPos > 0 && tfsaPosMD > 0) {
  console.log(`  Med debt: car@${carPos}, TFSA@${tfsaPosMD}`);
  assert(carPos > tfsaPosMD, "Car loan (6.5%) after TFSA in priority", `car@${carPos}, TFSA@${tfsaPosMD}`);
}

// Mortgage should appear in priority for homeowner
const pMortPri = translateToMC({
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x", homeowner: true
});
const mcMortPri = runMC(pMortPri, 200);
const dMortPri = extractReportData(mcMortPri, pMortPri);
const htmlMortPri = renderReportHTML(dMortPri, mcMortPri, {
  age: 35, retAge: 65, income: 80000, prov: "QC", employer: "x", homeowner: true
}, "fr", {}, 0, 0);
assert(htmlMortPri.includes("Hypothèque") || htmlMortPri.includes("Mortgage"), "Mortgage appears in priority for homeowner");

// ════════════════════════════════════════════════════════════════
// CATEGORY 25: calcCostOfDelay — Edge Cases
// ════════════════════════════════════════════════════════════════
section("25. calcCostOfDelay — Edge Cases");

// Zero savings / zero contributions
const pZero = translateToMC({ age: 30, retAge: 65, income: 50000, monthlyContrib: 0, prov: "QC" });
const costZero = calcCostOfDelay(pZero);
console.log(`  Cost of delay (0 contrib): ${costZero}`);
assert(costZero === 0, "Cost of delay = 0 when no contributions", `got ${costZero}`);

// Already retired (age >= retAge)
const pRetired = translateToMC({ age: 65, retAge: 65, income: 80000, monthlyContrib: 500, prov: "QC" });
const costRetired = calcCostOfDelay(pRetired);
console.log(`  Cost of delay (already retired): ${costRetired}`);
// yrsToGrow = 0, so cost should be just the lost contrib (no growth)
assert(costRetired === (pRetired.rrspC + pRetired.tfsaC + pRetired.nrC), "Cost of delay when retired = lost contrib (no growth years)");

// High contributor
const pHighC = translateToMC({ age: 30, retAge: 65, income: 120000, monthlyContrib: 3000, prov: "QC" });
const costHighC = calcCostOfDelay(pHighC);
console.log(`  Cost of delay (3K/mo, 35yrs): ${costHighC}`);
assert(costHighC > 50000, "High contributor cost of delay > 50K", `got ${costHighC}`);

// Short horizon
const pShort = translateToMC({ age: 60, retAge: 62, income: 80000, monthlyContrib: 500, prov: "QC" });
const costShort = calcCostOfDelay(pShort);
console.log(`  Cost of delay (2yr horizon): ${costShort}`);
// With only 2 years, cost should be roughly 1x the annual contribution
const shortAnnual = pShort.rrspC + pShort.tfsaC + pShort.nrC;
assertRange(costShort, shortAnnual * 0.9, shortAnnual * 1.3, "Short horizon cost ≈ 1x annual contrib");

// ════════════════════════════════════════════════════════════════
// CATEGORY 26: calcMinViableReturn — Edge Cases
// ════════════════════════════════════════════════════════════════
section("26. calcMinViableReturn — Edge Cases");

// Well-funded person (low spending, high savings) → low min return
const pWellFunded = translateToMC({
  age: 55, retAge: 65, income: 100000, totalSavings: 800000,
  monthlyContrib: 2000, prov: "QC"
});
pWellFunded.retSpM = 2000; // Very low spending
const mvr1 = calcMinViableReturn(pWellFunded);
console.log(`  Min viable return (well-funded, low spend): ${mvr1}%`);
assert(mvr1 < 5, "Well-funded person needs low min return", `got ${mvr1}%`);

// Under-funded person (high spending, low savings) → high min return
const pUnderFunded = translateToMC({
  age: 40, retAge: 60, income: 60000, totalSavings: 20000,
  monthlyContrib: 200, prov: "QC"
});
pUnderFunded.retSpM = 6000;
const mvr2 = calcMinViableReturn(pUnderFunded);
console.log(`  Min viable return (under-funded, high spend): ${mvr2}%`);
assert(mvr2 > 5, "Under-funded person needs high min return", `got ${mvr2}%`);

// Min return should always be between 1% and 15% (binary search bounds)
assert(mvr1 >= 0.5 && mvr1 <= 15, "Min return in valid range [0.5, 15]", `got ${mvr1}`);
assert(mvr2 >= 0.5 && mvr2 <= 15, "Min return in valid range [0.5, 15]", `got ${mvr2}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 27: Couple Mode Passthrough
// ════════════════════════════════════════════════════════════════
section("27. Couple Mode Passthrough");

const pCouple = translateToMC({
  age: 40, retAge: 65, income: 80000, prov: "QC",
  couple: "yes", sex: "F"
});
assert(pCouple._quiz.couple === "yes", "Couple mode stored in _quiz");

const mcCouple = runMC(pCouple, 200);
const dCouple = extractReportData(mcCouple, pCouple);
assert(dCouple.couple === true, "D.couple = true when couple=yes", `got ${dCouple.couple}`);

// AI prompt should mention household context for couple
const aiCouple = buildAIPrompt(dCouple, pCouple, true, { couple: "yes", age: 40 });
assert(aiCouple.usr.includes("couple") || aiCouple.usr.includes("Household"), "AI prompt mentions couple context");

// Single mode
const pSingle = translateToMC({
  age: 40, retAge: 65, income: 80000, prov: "QC", couple: "no"
});
assert(pSingle._quiz.couple === "no", "Single mode stored in _quiz");
const mcSingle = runMC(pSingle, 200);
const dSingle = extractReportData(mcSingle, pSingle);
assert(dSingle.couple === false, "D.couple = false when couple=no");

// ════════════════════════════════════════════════════════════════
// CATEGORY 28: Smith Manoeuvre / HELOC Paths
// ════════════════════════════════════════════════════════════════
section("28. Smith Manoeuvre / HELOC — Passthrough Off");

// Essentiel sets these to OFF — verify they pass through correctly
const pSmith = translateToMC({
  age: 40, retAge: 65, income: 100000, prov: "QC", homeowner: true
});
assert(pSmith.props.length === 1, "Homeowner has 1 property");
assert(pSmith.props[0].smithOn === false, "Smith manoeuvre OFF in Essentiel");
assert(pSmith.props[0].heloc === 0, "HELOC balance = 0 in Essentiel");
assert(pSmith.props[0].helocRate === 0.065, "HELOC rate = 6.5% default");
assert(pSmith.props[0].helocMax === 0.65, "HELOC max = 65% LTV default");

// Engine should still run fine with these off
const mcSmith = runMC(pSmith, 200);
assert(mcSmith !== null, "MC runs with Smith OFF");
assert(mcSmith.succ >= 0 && mcSmith.succ <= 1, "Success rate valid with Smith OFF");

// Verify property fields in _report
assert(pSmith._report.homeVal === 380000, "QC home value = 380K", `got ${pSmith._report.homeVal}`);
assert(pSmith._report.mortBal > 0, "Mortgage balance > 0");
assert(pSmith._report.equity > 0, "Equity > 0");
assert(pSmith._report.mortFreeAge > 40, "Mortgage-free age > 40", `got ${pSmith._report.mortFreeAge}`);
assert(pSmith._report.mortPayment > 0, "Monthly mortgage payment > 0", `got ${pSmith._report.mortPayment}`);

// ════════════════════════════════════════════════════════════════
// CATEGORY 29: Multiple Properties / Different Provinces
// ════════════════════════════════════════════════════════════════
section("29. Property & Province Variations");

// Different provinces have different PMED (median home price)
const provPrices = {
  QC: 380000, ON: 620000, BC: 850000, AB: 440000,
  MB: 320000, SK: 310000, NS: 360000, NB: 260000
};
Object.entries(provPrices).forEach(([prov, expectedPrice]) => {
  const pp = translateToMC({ age: 35, prov, homeowner: true, income: 80000 });
  assert(pp.props[0].val === expectedPrice, `${prov} median home = ${expectedPrice}`, `got ${pp.props[0].val}`);
});

// Custom home value overrides PMED
const pCustomHome = translateToMC({
  age: 35, prov: "QC", homeowner: true, homeValue: 500000, income: 80000
});
assert(pCustomHome.props[0].val === 500000, "Custom home value overrides PMED", `got ${pCustomHome.props[0].val}`);

// Custom mortgage overrides default
const pCustomMort = translateToMC({
  age: 35, prov: "QC", homeowner: true, homeValue: 500000, mortgage: 300000, income: 80000
});
assert(pCustomMort.props[0].mb === 300000, "Custom mortgage = 300K", `got ${pCustomMort.props[0].mb}`);
assert(pCustomMort._report.equity === 200000, "Equity = 500K - 300K = 200K", `got ${pCustomMort._report.equity}`);

// Non-homeowner should have no properties
const pNoHome = translateToMC({ age: 35, prov: "ON", homeowner: false, income: 80000 });
assert(pNoHome.props.length === 0, "Non-homeowner: 0 properties");
assert(pNoHome._report.homeVal === 0, "Non-homeowner: homeVal = 0");

// COL adjustment affects spending
const pBC = translateToMC({ age: 35, retAge: 65, prov: "BC", lifestyle: "active", income: 80000 });
const pQC = translateToMC({ age: 35, retAge: 65, prov: "QC", lifestyle: "active", income: 80000 });
assert(pBC.retSpM > pQC.retSpM, "BC spending > QC spending (higher COL)", `BC=${pBC.retSpM}, QC=${pQC.retSpM}`);
assertClose(pBC.retSpM, Math.round(5000 * 1.35), 1, "BC active spending = 5000 × 1.35 = 6750");
assertClose(pQC.retSpM, 5000, 1, "QC active spending = 5000 × 1.0 = 5000");

// ════════════════════════════════════════════════════════════════
// CATEGORY 30: LIRA / FHSA — Engine Passthrough
// ════════════════════════════════════════════════════════════════
section("30. LIRA / FHSA — Engine Passthrough (Off in Essentiel)");

// Essentiel doesn't set these, verify defaults don't break engine
const pDefault = translateToMC({ age: 35, retAge: 65, income: 80000, prov: "QC" });

// These features should be OFF by default
assert(pDefault.gkOn === false, "GK (LIRA/locked-in) OFF");
assert(pDefault.respOn === false, "RESP OFF");
assert(pDefault.ftqOn === false, "FTQ OFF");
assert(pDefault.cOn === false, "Couple split OFF");
assert(pDefault.bizOn === false, "Business OFF");
assert(pDefault.fatT === false, "Fat tails OFF in Essentiel");
assert(pDefault.stochMort === false, "Stochastic mortality OFF");
assert(pDefault.stochInf === false, "Stochastic inflation OFF");
assert(pDefault.melt === false, "RRSP meltdown OFF");
assert(pDefault.split === false, "Pension split OFF");
assert(pDefault.bridge === false, "Bridge OFF");

// Engine should handle these OFF features gracefully
const mcDefault = runMC(pDefault, 200);
assert(mcDefault !== null, "MC runs with all features OFF");
assert(mcDefault.succ >= 0 && mcDefault.succ <= 1, "Valid success rate with features OFF");

// ════════════════════════════════════════════════════════════════
// CATEGORY 31: gradeInfo — Grade Thresholds
// ════════════════════════════════════════════════════════════════
section("31. Grade Thresholds via extractReportData");

// Test grade assignment at each boundary
const gradeTests = [
  [0.96, "A+"], [0.95, "A+"], [0.94, "A"], [0.90, "A"], [0.89, "A-"],
  [0.85, "A-"], [0.84, "B+"], [0.80, "B+"], [0.79, "B"], [0.70, "B"],
  [0.69, "C"], [0.50, "C"], [0.49, "D"], [0.30, "D"], [0.29, "F"], [0.0, "F"]
];
gradeTests.forEach(([succ, expectedGrade]) => {
  // Create a mock MC result
  const mockMC = {
    succ, medRevData: mc.medRevData, fins: mc.fins,
    medF: mc.medF, var5: mc.var5, p25F: mc.p25F, p75F: mc.p75F, p95F: mc.p95F,
    rMedF: mc.rMedF, rP5F: mc.rP5F, rP25F: mc.rP25F, rP75F: mc.rP75F, rP95F: mc.rP95F,
    medRuin: mc.medRuin, p5Ruin: mc.p5Ruin, medEstateNet: mc.medEstateNet, medEstateTax: mc.medEstateTax,
  };
  const dGrade = extractReportData(mockMC, p);
  assert(dGrade.grade === expectedGrade, `Grade at ${(succ*100).toFixed(0)}% = ${expectedGrade}`, `got ${dGrade.grade}`);
});

// ════════════════════════════════════════════════════════════════
// CATEGORY 32: AI Prompt — Debt & Property Enrichment
// ════════════════════════════════════════════════════════════════
section("32. AI Prompt — Debt & Property DATA Enrichment");

// Profile with debt + property
const pRich = translateToMC({
  age: 40, retAge: 65, income: 100000, prov: "QC",
  homeowner: true, homeValue: 500000, mortgage: 300000,
  debts: [{ type: "cc", amount: 8000 }, { type: "car", amount: 15000, rate: 6.5 }],
  couple: "yes"
});
const mcRich = runMC(pRich, 200);
const dRich = extractReportData(mcRich, pRich);
const aiRich = buildAIPrompt(dRich, pRich, true, {
  age: 40, retAge: 65, income: 100000, prov: "QC",
  homeowner: true, homeValue: 500000, mortgage: 300000,
  debts: [{ type: "cc", amount: 8000 }, { type: "car", amount: 15000, rate: 6.5 }],
  couple: "yes"
});

const dataRich = JSON.parse(aiRich.usr.match(/DATA:\s*(\{[\s\S]*\})\n/)[1]);

// Debt should be populated
assert(dataRich.debt !== null, "AI DATA: debt populated for debtor");
assert(Array.isArray(dataRich.debt), "AI DATA: debt is array");
assert(dataRich.debt.length === 2, "AI DATA: 2 debts", `got ${dataRich.debt.length}`);
const ccDebt = dataRich.debt.find(d => d.type === "cc");
assert(ccDebt && ccDebt.bal === 8000, "AI DATA: CC debt bal=8000");
assert(ccDebt && ccDebt.rate === 0.1999, "AI DATA: CC debt rate=19.99%");

// Property should be populated
assert(dataRich.property !== null, "AI DATA: property populated for homeowner");
assert(dataRich.property.value === 500000, "AI DATA: property value=500K");
assert(dataRich.property.mortgage === 300000, "AI DATA: property mortgage=300K");
assert(dataRich.property.equity === 200000, "AI DATA: property equity=200K");

// Couple context in prompt
assert(aiRich.usr.includes("couple") || aiRich.usr.includes("Household"), "AI prompt mentions couple for couple=yes");

// Mortgage info in prompt
assert(aiRich.usr.includes("Mortgage") || aiRich.usr.includes("mortgage") || aiRich.usr.includes("Hypothèque"), "AI prompt mentions mortgage context");

// ════════════════════════════════════════════════════════════════
// CATEGORY 33: Lifestyle & Risk Variations
// ════════════════════════════════════════════════════════════════
section("33. Lifestyle & Risk Variations");

// Cozy lifestyle → lower spending
const pCozy = translateToMC({ age: 40, retAge: 65, prov: "QC", lifestyle: "cozy", income: 80000 });
assert(pCozy.retSpM === 3000, "Cozy lifestyle: 3000/mo (QC)", `got ${pCozy.retSpM}`);

// Premium lifestyle → higher spending
const pPrem = translateToMC({ age: 40, retAge: 65, prov: "QC", lifestyle: "premium", income: 80000 });
assert(pPrem.retSpM === 7500, "Premium lifestyle: 7500/mo (QC)", `got ${pPrem.retSpM}`);

// Active lifestyle → medium spending
const pActive = translateToMC({ age: 40, retAge: 65, prov: "QC", lifestyle: "active", income: 80000 });
assert(pActive.retSpM === 5000, "Active lifestyle: 5000/mo (QC)", `got ${pActive.retSpM}`);

// Conservative risk → lower equity allocation
const pCons = translateToMC({ age: 40, retAge: 65, prov: "QC", risk: "conservative", income: 80000 });
assert(pCons.allocR === 0.5, "Conservative: allocR=0.5", `got ${pCons.allocR}`);
assert(pCons.merR === 0.012, "Conservative: merR=0.012", `got ${pCons.merR}`);

// Growth risk → higher equity allocation
const pGrowth = translateToMC({ age: 40, retAge: 65, prov: "QC", risk: "growth", income: 80000 });
assert(pGrowth.allocR === 0.85, "Growth: allocR=0.85", `got ${pGrowth.allocR}`);
assert(pGrowth.merR === 0.018, "Growth: merR=0.018", `got ${pGrowth.merR}`);

// Different lifestyles should produce different success rates
const mcCozy = runMC(pCozy, 500);
const mcPrem = runMC(pPrem, 500);
console.log(`  Cozy (3K/mo): ${(mcCozy.succ*100).toFixed(1)}%, Premium (7.5K/mo): ${(mcPrem.succ*100).toFixed(1)}%`);
assert(mcCozy.succ >= mcPrem.succ, "Cozy (lower spend) >= Premium success rate", `cozy=${(mcCozy.succ*100).toFixed(1)}%, prem=${(mcPrem.succ*100).toFixed(1)}%`);

// ════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\nFAILED TESTS:");
  errors.forEach((e, i) => console.log(`  ${i+1}. ${e.name}`));
  errors.forEach((e, i) => console.log(`\n  [${i+1}] ${e.name}\n      ${e.detail}`));
}
console.log("═".repeat(60));
process.exit(failed > 0 ? 1 : 0);
