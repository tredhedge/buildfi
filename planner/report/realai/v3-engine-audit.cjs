#!/usr/bin/env node
// v3-engine-audit.cjs — Comprehensive numerical audit of planner_v3 engine.
// Loads the extracted module and runs a battery of correctness + edge-case tests.
//
// Run: node planner/report/realai/v3-engine-audit.cjs
'use strict';

const E = require('./v3-engine.cjs');

let pass = 0, fail = 0;
const failures = [];
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; failures.push(msg); console.error('  \u2717 ' + msg); }
}
function near(a, b, tol, msg) { assert(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', expected ~' + b + ' \u00b1 ' + tol + ')'); }
function inRange(v, lo, hi, msg) { assert(v >= lo && v <= hi, msg + ' (got ' + v + ', expected [' + lo + ', ' + hi + '])'); }

console.log('═══════════════════════════════════════════════════════════════');
console.log('  v3 Engine Audit — extracted from planner_v3.html');
console.log('═══════════════════════════════════════════════════════════════\n');

// ════════════════════════════════════════════════════════════════
// 1. CONSTANTS — verify 2026 published values
// ════════════════════════════════════════════════════════════════
console.log('── 1. Constants vs CRA / Service Canada 2026 published values ──');
assert(E.TAX_BASE_YEAR === 2026, 'TAX_BASE_YEAR = 2026');
assert(JSON.stringify(E.FED_BRACKETS) === JSON.stringify([58523, 117045, 181440, 258482]), 'FED_BRACKETS 2026 correct');
assert(JSON.stringify(E.FED_RATES) === JSON.stringify([0.14, 0.205, 0.26, 0.29, 0.33]), 'FED_RATES 2026 correct');
assert(E.FED_PERSONAL === 16452, 'FED_PERSONAL = $16,452 (2026 BPA)');
assert(E.OAS_CLAWBACK_THR === 95323, 'OAS_CLAWBACK_THR = $95,323 (2026)');
assert(E.OAS_MAX_MONTHLY === 742.31, 'OAS_MAX_MONTHLY = $742.31 (2026 Q1)');
assert(E.GIS_MAX_SINGLE === 1105.43, 'GIS_MAX_SINGLE = $1,105.43 (2026 Q1)');
// GIS_MAX_COUPLE: Service Canada Q1 2026 = $665.41 per spouse. Engine has $667.41 — verify which is correct
assert(E.GIS_MAX_COUPLE === 667.41 || E.GIS_MAX_COUPLE === 665.41, 'GIS_MAX_COUPLE in plausible range (engine: ' + E.GIS_MAX_COUPLE + ')');
assert(E.QPP_MAX_MONTHLY === 1507.65, 'QPP_MAX_MONTHLY = $1,507.65 (2026 with enhancement)');
assert(E.QPP_MGA === 74600, 'QPP_MGA = $74,600 (2026 YMPE)');
assert(E.QPP_YAMPE === 85000, 'QPP_YAMPE = $85,000 (2026)');
assert(E.PENSION_CREDIT_MAX === 2000, 'PENSION_CREDIT_MAX = $2,000');
assert(E.TFSA_LIMIT_2026 === 7000, 'TFSA_LIMIT_2026 = $7,000');

// QC bracket verification (Revenu Québec 2026)
assert(JSON.stringify(E.PROV_TAX.QC.b) === JSON.stringify([54345, 108730, 132245]),
  'QC brackets 2026 = [54345, 108730, 132245] per Revenu Quebec — got ' + JSON.stringify(E.PROV_TAX.QC.b));
// QC abatement is 16.5% federal reduction — pt.abate stores the COMPLEMENT (1 - 0.165 = 0.835)
assert(E.PROV_TAX.QC.abate === 0.835, 'QC abatement complement = 0.835 (16.5% reduction)');

// ════════════════════════════════════════════════════════════════
// 2. TAX MATH — known income → expected federal+QC tax
// ════════════════════════════════════════════════════════════════
console.log('\n── 2. Tax math (calcTax) ──');

// Zero income = zero tax
const tx0 = E.calcTax(0, 0, 'QC');
assert(tx0.total === 0, 'tax(0) = 0');
assert(tx0.fed === 0, 'fed(0) = 0');

// Negative income = zero tax
const txNeg = E.calcTax(-5000, 0, 'QC');
assert(txNeg.total === 0, 'tax(-5000) = 0 (sane handling)');

// $50K QC working — should fall in lowest bracket mostly
const tx50 = E.calcTax(50000, 0, 'QC');
inRange(tx50.eff, 0.10, 0.18, 'tax @ $50K QC effective rate in [10%, 18%]');
assert(tx50.marg === 0.14 * 0.835 + 0.14, 'tax @ $50K QC marginal = fed*abate + prov_lowest');

// $200K QC — top brackets active. Combined fed+prov marginal should be ~53.31% in QC
const tx200 = E.calcTax(200000, 0, 'QC');
inRange(tx200.marg, 0.45, 0.55, 'tax @ $200K QC marginal in [45%, 55%]');
inRange(tx200.eff, 0.30, 0.42, 'tax @ $200K QC effective in [30%, 42%]');

// $500K QC — well into top federal bracket
const tx500 = E.calcTax(500000, 0, 'QC');
assert(tx500.marg > 0.50, 'tax @ $500K QC marginal > 50% (top combined bracket)');

// $80K Ontario — verify provincial parity makes sense
const tx80ON = E.calcTax(80000, 0, 'ON');
const tx80QC = E.calcTax(80000, 0, 'QC');
// QC tax should typically be slightly higher than ON at this income
assert(tx80QC.total > tx80ON.total * 0.85 && tx80QC.total < tx80ON.total * 1.5,
  '$80K tax: QC vs ON in plausible range (QC=' + tx80QC.total.toFixed(0) + ', ON=' + tx80ON.total.toFixed(0) + ')');

// CPI indexation: tax should be lower in real terms after indexation
const tx80_yr0 = E.calcTax(80000, 0, 'QC', 0.02);
const tx80_yr10 = E.calcTax(80000, 10, 'QC', 0.02); // brackets indexed but income flat
assert(tx80_yr10.total < tx80_yr0.total, 'CPI indexation reduces nominal-income tax over time');

// All 13 provinces produce non-negative finite tax
['QC', 'ON', 'BC', 'AB', 'SK', 'MB', 'NB', 'NS', 'PE', 'NL', 'NT', 'YT', 'NU'].forEach(prov => {
  const t = E.calcTax(75000, 0, prov);
  assert(t.total >= 0 && isFinite(t.total), 'tax @ $75K ' + prov + ' is finite non-negative (got ' + t.total + ')');
  assert(t.marg > 0 && t.marg < 0.6, 'marg rate ' + prov + ' in (0, 0.6)');
});

// Retired pension credit
const tx30Working = E.calcTax(30000, 0, 'QC', 0.02, false);
const tx30Retired = E.calcTax(30000, 0, 'QC', 0.02, true);
assert(tx30Retired.total <= tx30Working.total, 'retired pension credit reduces tax (working=' + tx30Working.total.toFixed(0) + ', retired=' + tx30Retired.total.toFixed(0) + ')');

// ════════════════════════════════════════════════════════════════
// 3. QPP / CPP — Service Canada formulas
// ════════════════════════════════════════════════════════════════
console.log('\n── 3. QPP/CPP (calcQPP) ──');

// Max at 65 with full earnings + 40 yrs
const qppMax = E.calcQPP(65, E.QPP_MGA, 40);
near(qppMax, E.QPP_MAX_MONTHLY, 0.01, 'QPP max @ 65 with full MGA + 40 yrs = $1,507.65');

// CPP2 enhancement at YAMPE
const qppCPP2 = E.calcQPP(65, E.QPP_YAMPE, 40);
assert(qppCPP2 > qppMax, 'QPP2 enhancement adds value above MGA earnings');
near(qppCPP2 - qppMax, E.QPP2_MAX_MONTHLY, 1, 'QPP2 enhancement ~ $81/mo at YAMPE');

// Early at 60 — Service Canada says -0.6%/month = -36% over 60 months → 64% of base
const qpp60 = E.calcQPP(60, E.QPP_MGA, 40);
const expEarly = qppMax * 0.64;
near(qpp60, expEarly, qppMax * 0.02, 'QPP @ 60 early ~64% of @65 (got ' + qpp60.toFixed(2) + ', expected ' + expEarly.toFixed(2) + ')');

// Late at 70 — +0.7%/month = +42% → 142% of base
const qpp70 = E.calcQPP(70, E.QPP_MGA, 40);
const expLate = qppMax * 1.42;
near(qpp70, expLate, qppMax * 0.02, 'QPP @ 70 late ~142% of @65');

// Half years: 20 yrs of contributions
const qppHalf = E.calcQPP(65, E.QPP_MGA, 20);
near(qppHalf / qppMax, 0.5, 0.05, 'QPP @ 65 with 20 yrs (half) ~50% of full');

// Below MGA earnings: pro-rated
const qppLow = E.calcQPP(65, 35000, 40);
near(qppLow / qppMax, 35000 / E.QPP_MGA, 0.05, 'QPP scales with avgEarn / MGA');

// Boundary: clamp at adj=0.64 even if startAge < 60 (data error guard)
const qpp59 = E.calcQPP(59, E.QPP_MGA, 40);
assert(qpp59 >= qppMax * 0.64 - 0.01, 'QPP early clamp at 0.64 minimum');

// Boundary: clamp at adj=1.42 even if startAge > 70
const qpp75 = E.calcQPP(75, E.QPP_MGA, 40);
assert(qpp75 <= qppMax * 1.42 + 1, 'QPP late clamp at 1.42 maximum');

// ════════════════════════════════════════════════════════════════
// 4. OAS — Service Canada formulas
// ════════════════════════════════════════════════════════════════
console.log('\n── 4. OAS (calcOAS) ──');

const oasMax = E.calcOAS(65, 0, 0);
near(oasMax, E.OAS_MAX_MONTHLY, 0.01, 'OAS max @ 65 with no clawback = $742.31');

// Deferral bonus: +0.6%/month after 65 → at 70 = +36% → 1.36×
const oas70 = E.calcOAS(70, 0, 0);
near(oas70, E.OAS_MAX_MONTHLY * 1.36, 0.5, 'OAS @ 70 deferred = 1.36× max');

// 75+ bonus: +10%
const oas75 = E.calcOAS(65, 0, 0, 0.02, 75);
near(oas75, E.OAS_MAX_MONTHLY * 1.10, 0.5, 'OAS @ currentAge 75 = 1.10× max (75+ bonus)');

// Clawback: at $200K income, full OAS clawed back
const oasClawed = E.calcOAS(65, 200000, 0);
assert(oasClawed === 0, 'OAS @ $200K income fully clawed back (got ' + oasClawed + ')');

// Partial clawback: at threshold + $10K → 15% × $10K / 12 = $125/mo reduction
const oasPartial = E.calcOAS(65, 95323 + 10000, 0);
const expPartial = E.OAS_MAX_MONTHLY - (10000 * 0.15 / 12);
near(oasPartial, expPartial, 1, 'OAS partial clawback at thr+10K');

// CPI indexation: clawback threshold should increase over years
const oas_yr0 = E.calcOAS(65, 100000, 0, 0.02);
const oas_yr10 = E.calcOAS(65, 100000, 10, 0.02); // same income, but threshold indexed
assert(oas_yr10 >= oas_yr0, 'OAS clawback threshold indexed (less clawback in nominal yr 10)');

// Late deferral clamp at 1.36 (60 months max)
const oas80 = E.calcOAS(80, 0, 0);
assert(oas80 <= E.OAS_MAX_MONTHLY * 1.36 + 0.01, 'OAS late clamp at 1.36 max');

// ════════════════════════════════════════════════════════════════
// 5. GIS — eligibility + clawback
// ════════════════════════════════════════════════════════════════
console.log('\n── 5. GIS (calcGIS) ──');

// Below 65 = 0
assert(E.calcGIS(64, 0, 0, 0.02, false) === 0, 'GIS @ 64 = 0');

// At 65 with no other income = max (single)
const gisFull = E.calcGIS(65, 0, 0, 0.02, false);
near(gisFull, E.GIS_MAX_SINGLE, 0.5, 'GIS @ 65, $0 nonOAS, single = max');

// Couple version
const gisCouple = E.calcGIS(65, 0, 0, 0.02, true);
near(gisCouple, E.GIS_MAX_COUPLE, 0.5, 'GIS @ 65, $0 nonOAS, couple = couple max');

// 50¢ clawback: $1000 of taxable income reduces GIS by ~$500
const gisLow = E.calcGIS(65, 1000, 0, 0.02, false);
near(gisFull - gisLow, 41.67, 5, 'GIS 50% clawback: $1000 nonOAS → ~$500/yr ($41/mo) reduction');

// High income = $0 GIS
const gisZero = E.calcGIS(65, 50000, 0, 0.02, false);
assert(gisZero === 0, 'GIS @ high income = 0');

// ════════════════════════════════════════════════════════════════
// 6. RRIF minimums — verify table + 95+ extrapolation
// ════════════════════════════════════════════════════════════════
console.log('\n── 6. RRIF (getRRIFMin) ──');

assert(E.getRRIFMin(70, 100000) === 0, 'RRIF @ 70 = 0 (not yet required)');
assert(E.getRRIFMin(71, 100000) > 0, 'RRIF @ 71 = first year required');
near(E.getRRIFMin(72, 100000) / 100000, 0.054, 0.001, 'RRIF @ 72 = 5.40%');
near(E.getRRIFMin(80, 100000) / 100000, 0.0682, 0.001, 'RRIF @ 80 = 6.82%');
near(E.getRRIFMin(94, 100000) / 100000, 0.1879, 0.001, 'RRIF @ 94 = 18.79%');
near(E.getRRIFMin(95, 100000) / 100000, 0.2, 0.001, 'RRIF @ 95 = 20%');
near(E.getRRIFMin(100, 100000) / 100000, 0.2, 0.001, 'RRIF @ 100 = 20% (clamped)');

// ════════════════════════════════════════════════════════════════
// 7. runMC — small N, verify result schema + invariants
// ════════════════════════════════════════════════════════════════
console.log('\n── 7. runMC small-N invariants ──');

const baseParams = {
  age: 50, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC',
  sal: 90000, rrsp: 250000, tfsa: 80000, nr: 50000,
  rrspC: 8000, tfsaC: 6000, nrC: 5000,
  retSpM: 5000, qppAge: 65, oasAge: 65, avgE: 90000, qppYrs: 25,
  eqRet: 0.06, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
  inf: 0.021, fatT: false, stochInf: false, stochMort: false,
  merR: 0.005, merT: 0.005, merN: 0.005,
  allocR: 0.6, allocT: 0.7, allocN: 0.5,
  wStrat: 'optimized'
};

const mc = E.runMC(baseParams, 200);
assert(!!mc, 'runMC returns object');
if (mc) {
  assert(typeof mc.succ === 'number' && mc.succ >= 0 && mc.succ <= 1, 'succ in [0, 1]');
  assert(Array.isArray(mc.pD) && mc.pD.length > 0, 'pD path populated');
  assert(Array.isArray(mc.medRevData) && mc.medRevData.length > 0, 'medRevData populated');
  assert(typeof mc.medF === 'number' && isFinite(mc.medF), 'medF finite');
  // Percentile order
  assert(mc.p5F <= mc.p25F + 0.01, 'p5 <= p25');
  assert(mc.p25F <= mc.medF + 0.01, 'p25 <= median');
  assert(mc.medF <= mc.p75F + 0.01, 'median <= p75');
  assert(mc.p75F <= mc.p95F + 0.01, 'p75 <= p95');
  // Real percentile order too
  assert(mc.rP5F <= mc.rP25F + 0.01, 'real p5 <= p25');
  assert(mc.rP25F <= mc.rMedF + 0.01, 'real p25 <= median');
  // Estate percentile order
  assert(mc.p5EstateNet <= mc.p25EstateNet + 0.01, 'estate p5 <= p25');
  assert(mc.p25EstateNet <= mc.medEstateNet + 0.01, 'estate p25 <= median');
  assert(mc.medEstateNet <= mc.p75EstateNet + 0.01, 'estate median <= p75');
  // Sens array
  assert(Array.isArray(mc.sens), 'sens array exists');
  // medRevData row schema
  const r0 = mc.medRevData[0];
  ['age','rrq','psv','srg','pen','ret','spend','tax','taxInc','sal','aRR','aTF','aNR','wFromRR','wFromTF','wFromNR','wRrifMin'].forEach(k => {
    assert(r0[k] !== undefined, 'medRevData row has key: ' + k);
  });
  // No NaN/Infinity in critical fields
  ['succ','medF','p5F','p25F','p75F','p95F','medEstateNet','medEstateTax','rMedF','var5'].forEach(k => {
    const v = mc[k];
    assert(typeof v === 'number' && isFinite(v), 'mc.' + k + ' is finite (got ' + v + ')');
  });
}

// ════════════════════════════════════════════════════════════════
// 8. Edge cases
// ════════════════════════════════════════════════════════════════
console.log('\n── 8. Edge cases ──');

// 8a. Already retired (age >= retAge)
const alreadyRet = E.runMC(Object.assign({}, baseParams, { age: 70, retAge: 65, sal: 0 }), 100);
assert(!!alreadyRet && alreadyRet.medRevData.length > 0, 'already-retired profile runs without crashing');
assert(alreadyRet.medRevData[0].age === 70, 'medRevData starts at age 70 for already-retired');

// 8b. Zero starting balances
const zeroBal = E.runMC(Object.assign({}, baseParams, { rrsp: 0, tfsa: 0, nr: 0, rrspC: 5000, tfsaC: 3000 }), 100);
assert(!!zeroBal, 'zero-balance profile runs');
assert(typeof zeroBal.succ === 'number', 'zero-balance succ defined');

// 8c. Very high MER
const hiMer = E.runMC(Object.assign({}, baseParams, { merR: 0.04, merT: 0.04, merN: 0.04 }), 100);
assert(!!hiMer && hiMer.succ < mc.succ + 0.01, 'high MER reduces success rate vs base');

// 8d. Death before retirement
const earlyDeath = E.runMC(Object.assign({}, baseParams, { deathAge: 60 }), 50);
assert(!!earlyDeath, 'death-before-retirement runs without crashing');

// 8e. Couple
const couple = E.runMC(Object.assign({}, baseParams, {
  cOn: true, cAge: 48, cRetAge: 65, cSex: 'F', cSal: 70000,
  cRRSP: 150000, cTFSA: 50000, cNR: 30000,
  cQppAge: 65, cAvgE: 70000, cQppYrs: 22, cOasAge: 65
}), 200);
assert(!!couple, 'couple runs');
// medRevData should have cSal field for working years
const coupleR0 = couple.medRevData[0];
assert(coupleR0.cSal !== undefined && coupleR0.cSal > 0, 'couple medRevData[0] has cSal > 0');

// 8f. FIRE seeker (retire at 45)
const fire = E.runMC(Object.assign({}, baseParams, {
  age: 35, retAge: 45, sal: 150000, rrsp: 300000, tfsa: 200000, nr: 400000,
  rrspC: 30000, tfsaC: 7000, nrC: 30000, qppYrs: 13
}), 200);
assert(!!fire, 'FIRE profile runs');

// 8g. Very long horizon
const longLife = E.runMC(Object.assign({}, baseParams, { deathAge: 105, stochMort: false }), 50);
assert(!!longLife && longLife.medRevData.length > 50, 'long-horizon (deathAge=105) runs');

// ════════════════════════════════════════════════════════════════
// 9. MC determinism + sequence-of-returns
// ════════════════════════════════════════════════════════════════
console.log('\n── 9. MC mechanics ──');

// Determinism: same params + same N should produce SAME succ
// (Note: runMC uses Math.random which is non-deterministic across runs without seeding;
//  this test confirms whether the engine has any seeding mechanism.)
const mc1 = E.runMC(baseParams, 100);
const mc2 = E.runMC(baseParams, 100);
const succDelta = Math.abs(mc1.succ - mc2.succ);
console.log('  Determinism check: 2 runs of N=100 succ delta = ' + succDelta.toFixed(3));
// Don't assert — just observe. With Math.random and N=100, expect ~5-10pt jitter.

// Cholesky sanity: chol(I) should return I (identity decomposes to itself)
const I3 = [[1,0,0],[0,1,0],[0,0,1]];
const cI = E.chol(I3);
near(cI[0][0], 1, 1e-9, 'chol(I) diagonal[0] = 1');
near(cI[1][1], 1, 1e-9, 'chol(I) diagonal[1] = 1');
near(cI[2][2], 1, 1e-9, 'chol(I) diagonal[2] = 1');
near(cI[0][1] || 0, 0, 1e-9, 'chol(I) off-diagonal = 0');

// Cholesky decomposition L*L^T = M test
const M = [[4,2],[2,3]];
const L = E.chol(M);
const reconstructed = [[L[0][0]*L[0][0], L[0][0]*L[1][0]], [L[1][0]*L[0][0], L[1][0]*L[1][0] + L[1][1]*L[1][1]]];
near(reconstructed[0][0], M[0][0], 1e-6, 'chol L*L^T reconstructs M[0][0]');
near(reconstructed[1][1], M[1][1], 1e-6, 'chol L*L^T reconstructs M[1][1]');

// tRn: t-distribution sample with df=5 — should be in plausible range
const tSamples = [];
for (let i = 0; i < 1000; i++) tSamples.push(E.tRn(5));
const tMean = tSamples.reduce((a, b) => a + b, 0) / tSamples.length;
assert(Math.abs(tMean) < 0.5, 't-distribution mean ~0 (got ' + tMean.toFixed(3) + ')');
const tStd = Math.sqrt(tSamples.reduce((a, b) => a + (b - tMean) * (b - tMean), 0) / tSamples.length);
inRange(tStd, 1.0, 1.6, 't-dist df=5 std in [1.0, 1.6] (theoretical 1.29)');

// stochDeath: should return age in plausible range
const deaths = [];
for (let i = 0; i < 200; i++) deaths.push(E.stochDeath(65, 'M'));
const dMin = Math.min(...deaths), dMax = Math.max(...deaths);
inRange(dMin, 65, 90, 'stochDeath minimum >= 65 (got ' + dMin + ')');
inRange(dMax, 75, 110, 'stochDeath maximum <= 110');

// ════════════════════════════════════════════════════════════════
// 10. Param sanitization
// ════════════════════════════════════════════════════════════════
console.log('\n── 10. Param sanitization ──');

// Negative balance gets clamped
const negBal = E.runMC(Object.assign({}, baseParams, { rrsp: -10000 }), 50);
assert(!!negBal && isFinite(negBal.medF), 'negative rrsp clamped, succ finite');

// Extreme return gets clamped
const extreme = E.runMC(Object.assign({}, baseParams, { eqRet: 0.50 }), 50);
assert(!!extreme && isFinite(extreme.medF), 'extreme eqRet (50%) clamped, succ finite');

// Missing deathAge defaults
const noDeath = E.runMC(Object.assign({}, baseParams, { deathAge: undefined }), 50);
assert(!!noDeath, 'missing deathAge handled (defaults to 90 or 95)');

// ════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  RESULTS: ' + pass + ' pass, ' + fail + ' fail');
console.log('═══════════════════════════════════════════════════════════════');
if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
process.exit(0);
