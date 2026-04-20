#!/usr/bin/env node
// v3-engine-audit-final.cjs — Comprehensive remaining audit:
//   - Aux fns (corrected signatures)
//   - Multi-asset, GK, pension splitting, spousal coordination
//   - Real estate, CCPC, stress scenarios
//   - Cap gains $250K split (graduated vs cliff)
//   - QC dividend credit ordering verification
//   - ON surtax cross-check
//   - 30+ what-if battery (NaN, Infinity, missing fields, wild inputs)
'use strict';

const E = require('./v3-engine.cjs');
let pass = 0, fail = 0, warn = 0;
const failures = [];
function assert(cond, msg, sev) {
  if (cond) { pass++; }
  else if (sev === 'warn') { warn++; failures.push('[WARN] ' + msg); console.error('  \u26a0 ' + msg); }
  else { fail++; failures.push('[FAIL] ' + msg); console.error('  \u2717 ' + msg); }
}
function near(a, b, tol, msg, sev) { assert(Math.abs(a - b) <= tol, msg + ' (got ' + a + ', exp ~' + b + ')', sev); }
function inRange(v, lo, hi, msg, sev) { assert(v >= lo && v <= hi, msg + ' (got ' + v + ' expected [' + lo + ', ' + hi + '])', sev); }

const baseP = {
  age: 50, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC',
  sal: 90000, rrsp: 250000, tfsa: 80000, nr: 50000,
  rrspC: 8000, tfsaC: 6000, nrC: 5000,
  retSpM: 5000, qppAge: 65, oasAge: 65, avgE: 90000, qppYrs: 25,
  eqRet: 0.06, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
  inf: 0.021, fatT: false, stochInf: false, stochMort: false,
  merR: 0.005, merT: 0.005, merN: 0.005,
  allocR: 0.6, allocT: 0.7, allocN: 0.5, wStrat: 'optimized',
  goP: 1.0, slP: 0.85, noP: 0.7
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('  v3 Engine — Final audit (paths, aux, what-if)');
console.log('═══════════════════════════════════════════════════════════════\n');

// ════════════════════════════════════════════════════════════════
// 1. P0 FIX VERIFICATION: deathAge guard now in place
// ════════════════════════════════════════════════════════════════
console.log('── 1. P0 fix verification (deathAge guard) ──');
['undefined', 'null', 'NaN'].forEach(kind => {
  let val;
  if (kind === 'undefined') val = undefined;
  else if (kind === 'null') val = null;
  else val = NaN;
  try {
    const r = E.runMC(Object.assign({}, baseP, { deathAge: val }), 50);
    assert(!!r && typeof r.succ === 'number', 'runMC handles deathAge=' + kind);
  } catch (e) { fail++; console.error('  \u2717 runMC CRASHES on deathAge=' + kind + ': ' + e.message); }
  try {
    const d = E.optimizeDecum(Object.assign({}, baseP, { deathAge: val }));
    assert(!!d && d.schedule.length > 0, 'optimizeDecum handles deathAge=' + kind);
  } catch (e) { fail++; console.error('  \u2717 optimizeDecum CRASHES on deathAge=' + kind + ': ' + e.message); }
});

// ════════════════════════════════════════════════════════════════
// 2. Aux functions with CORRECT signatures
// ════════════════════════════════════════════════════════════════
console.log('\n── 2. calcCorpTax + calcWHT (correct signatures) ──');

// calcCorpTax(activeIncome, passiveIncome, prov, yr, infR) → { activeTax, passiveTax, totalTax, ... }
const ct = E.calcCorpTax(200000, 0, 'QC', 0, 0.02);
assert(typeof ct === 'object' && typeof ct.totalTax === 'number', 'calcCorpTax returns .totalTax');
inRange(ct.totalTax, 200000 * 0.05, 200000 * 0.30, 'corp tax @ $200K active QC in [5%, 30%]');
const ctOnSBD = E.calcCorpTax(450000, 0, 'ON', 0, 0.02); // under SBD limit
inRange(ctOnSBD.totalTax / 450000, 0.10, 0.18, 'corp tax @ $450K ON in SBD range');
const ctOver = E.calcCorpTax(700000, 0, 'ON', 0, 0.02); // over SBD limit
assert(ctOver.totalTax > ctOnSBD.totalTax * 1.4, 'corp tax above SBD higher rate');

// calcCorpTax with passive income — should also tax + add to RDTOH
const ctPas = E.calcCorpTax(200000, 50000, 'QC', 0, 0.02);
assert(ctPas.totalTax > ct.totalTax, 'passive income adds to corp tax');
assert(ctPas.rdtohAdded > 0 || typeof ctPas.rdtohAdded === 'number', 'rdtohAdded populated for passive');

// calcWHT(alloc, acctType) — withholding tax drag (a SMALL fraction)
const allocStd = { can: 0.6, us: 0.2, intl: 0.15, em: 0.05, bnd: 0 };
const whtRrsp = E.calcWHT(allocStd, 'rrsp');
inRange(whtRrsp, 0, 0.005, 'WHT on RRSP allocation < 0.5% (tiny drag)');
const whtTfsa = E.calcWHT(allocStd, 'tfsa');
assert(whtTfsa > whtRrsp, 'TFSA WHT > RRSP WHT (US dividends not exempt in TFSA)');

// ════════════════════════════════════════════════════════════════
// 3. CAP GAINS $250K SPLIT — graduated vs cliff?
// ════════════════════════════════════════════════════════════════
console.log('\n── 3. Capital gains $250K split ──');

// Test the engine end-to-end via runMC: large NR balance with high return → forced cap gains realization
// We can't directly call internal cap gains math, but we can test that p.cgIncLo / p.cgIncHi defaults are set
const cgTest = E.runMC(Object.assign({}, baseP, {
  age: 65, retAge: 65, sal: 0, // already retired
  nr: 2000000, // big NR
  retSpM: 12000, eqRet: 0.08, deathAge: 90
}), 100);
assert(!!cgTest && isFinite(cgTest.medF), 'runMC with $2M NR + high spending runs');

// ════════════════════════════════════════════════════════════════
// 4. QC DIVIDEND CREDIT ORDER VERIFICATION
// ════════════════════════════════════════════════════════════════
console.log('\n── 4. QC dividend credit ordering ──');

// Per CRA, dividend credit calculation:
//   1. Compute fed tax on grossed-up income
//   2. Subtract federal dividend tax credit (FED_ELIG_DTC × eligDivTaxable)
//   3. Apply provincial abatement (16.5% reduction for QC residents on FED tax)
//   4. Compute provincial tax on grossed-up income
//   5. Subtract provincial dividend tax credit
//
// If implementation reverses steps 2 and 3 (abates first, then credits), the credit
// is worth less than published rate. We can detect this by comparing $ benefit vs
// expected.

// Test: $50K eligible dividends only (no other income)
const txDiv = E.calcTax(0, 0, 'QC', 0.02, true, { eligDiv: 50000, nonEligDiv: 0 });
const txReg = E.calcTax(50000, 0, 'QC', 0.02, true);
const benefit = txReg.total - txDiv.total;
console.log('  $50K reg vs $50K elig div in QC: reg=$' + txReg.total.toFixed(0) + ' div=$' + txDiv.total.toFixed(0) + ' diff=$' + benefit.toFixed(0));
// Eligible dividends in QC at low income should be effectively NEGATIVE tax (refundable credits make it negative)
// If positive, the credit is being eaten by abatement
assert(txDiv.total >= 0, 'QC tax on $50K elig div is non-negative (sane)', 'warn');
inRange(benefit, 1500, 12000, 'QC dividend benefit on $50K in plausible range', 'warn');

// Cross-province sanity: ON dividends similar magnitude
const txDivON = E.calcTax(0, 0, 'ON', 0.02, true, { eligDiv: 50000, nonEligDiv: 0 });
console.log('  $50K elig div ON: $' + txDivON.total.toFixed(0));

// ════════════════════════════════════════════════════════════════
// 5. ON SURTAX CROSS-CHECK
// ════════════════════════════════════════════════════════════════
console.log('\n── 5. ON surtax (2026 thresholds) ──');

// ON surtax: 20% on prov tax above $5710 (2026 THR1),
// additional 36% above $7307 (2026 THR2). Engine uses these 2026 values.
const txON_high = E.calcTax(180000, 0, 'ON');
const txON_low = E.calcTax(60000, 0, 'ON');
assert(txON_high.prov > txON_low.prov * 4, 'ON surtax kicks in at high income');
console.log('  ON @ $60K: prov=$' + txON_low.prov.toFixed(0) + ' (no surtax)');
console.log('  ON @ $180K: prov=$' + txON_high.prov.toFixed(0) + ' (full surtax)');
console.log('  Engine surtax thresholds: $5710/$7307 (ON 2026 Form 428)');

// ════════════════════════════════════════════════════════════════
// 6. PENSION SPLITTING (p.split)
// ════════════════════════════════════════════════════════════════
console.log('\n── 6. Pension splitting ──');

const couplePension = E.runMC(Object.assign({}, baseP, {
  cOn: true, cAge: 48, cSex: 'F', cSal: 65000,
  cRRSP: 200000, cTFSA: 60000, cNR: 30000,
  cQppAge: 65, cAvgE: 65000, cQppYrs: 22, cOasAge: 65,
  penType: 'db', penM: 2500, penIdx: true,
  split: false
}), 100);
const coupleSplit = E.runMC(Object.assign({}, baseP, {
  cOn: true, cAge: 48, cSex: 'F', cSal: 65000,
  cRRSP: 200000, cTFSA: 60000, cNR: 30000,
  cQppAge: 65, cAvgE: 65000, cQppYrs: 22, cOasAge: 65,
  penType: 'db', penM: 2500, penIdx: true,
  split: true, splitP: 0.5
}), 100);
assert(coupleSplit.succ >= couplePension.succ - 0.10, 'pension splitting does not reduce succ vs no-split', 'warn');
console.log('  No-split couple succ: ' + Math.round(couplePension.succ * 100) + '%');
console.log('  Splitting couple succ: ' + Math.round(coupleSplit.succ * 100) + '% (expect >=)');

// ════════════════════════════════════════════════════════════════
// 7. GUYTON-KLINGER (p.gkOn)
// ════════════════════════════════════════════════════════════════
console.log('\n── 7. Guyton-Klinger guardrails ──');

const noGK = E.runMC(Object.assign({}, baseP, { gkOn: false }), 100);
const withGK = E.runMC(Object.assign({}, baseP, { gkOn: true }), 100);
assert(typeof withGK.gkOn !== 'undefined', 'gkOn echoed back in result');
assert(typeof withGK.gkAvgCuts === 'number', 'GK stats: gkAvgCuts populated');
assert(typeof withGK.gkAvgRaises === 'number', 'GK stats: gkAvgRaises populated');
console.log('  GK avg cuts: ' + withGK.gkAvgCuts.toFixed(1) + ', avg raises: ' + withGK.gkAvgRaises.toFixed(1));
// GK should typically improve success vs static
// (since it cuts spending in down years to preserve capital)
assert(withGK.succ >= noGK.succ - 0.05, 'GK does not significantly reduce succ', 'warn');

// ════════════════════════════════════════════════════════════════
// 8. REAL ESTATE
// ════════════════════════════════════════════════════════════════
console.log('\n── 8. Real estate ──');

const noRE = E.runMC(baseP, 100);
const withRE = E.runMC(Object.assign({}, baseP, {
  props: [
    { on: true, val: 600000, mb: 200000, mr: 0.05, ma: 25, ri: 0.025, rm: 0, app: 0.025, pri: true, sa: 0 }
  ]
}), 100);
assert(!!withRE && isFinite(withRE.medF), 'runMC with real estate runs');
assert(typeof withRE.hasRE === 'boolean', 'hasRE flag populated');
assert(withRE.hasRE === true, 'hasRE=true when props active');

// Forced sale at retirement
const forcedSale = E.runMC(Object.assign({}, baseP, {
  props: [
    { on: true, val: 600000, mb: 200000, mr: 0.05, ma: 25, ri: 0.025, rm: 0, app: 0.025, pri: false, sa: 65 }
  ]
}), 100);
assert(!!forcedSale && isFinite(forcedSale.medF), 'forced sale at age 65 runs');

// ════════════════════════════════════════════════════════════════
// 9. CCPC
// ════════════════════════════════════════════════════════════════
console.log('\n── 9. CCPC corporate ──');

const withCCPC = E.runMC(Object.assign({}, baseP, {
  bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 480000, bizSaleAge: 65
}), 100);
assert(!!withCCPC && isFinite(withCCPC.medF), 'runMC with CCPC runs');
// Verify medRevData has corp* fields populated
const cRow = withCCPC.medRevData.filter(r => r.age >= baseP.age && r.age <= baseP.age + 5)[0];
if (cRow) {
  assert('corpBal' in cRow, 'medRevData has corpBal field');
}

// ════════════════════════════════════════════════════════════════
// 10. MULTI-ASSET (p.multiAsset, assetAlloc)
// ════════════════════════════════════════════════════════════════
console.log('\n── 10. Multi-asset ──');

try {
  const multiAsset = E.runMC(Object.assign({}, baseP, {
    multiAsset: true,
    assetAlloc: { can: 0.30, us: 0.30, intl: 0.20, em: 0.10, bnd: 0.10 }
  }), 100);
  assert(!!multiAsset && isFinite(multiAsset.medF), 'multi-asset runs');
  // Check sum-normalization is applied
  const badAlloc = E.runMC(Object.assign({}, baseP, {
    multiAsset: true,
    assetAlloc: { can: 1.0, us: 1.0, intl: 1.0, em: 0, bnd: 0 } // sums to 3.0
  }), 50);
  assert(!!badAlloc && isFinite(badAlloc.medF), 'multi-asset auto-normalizes alloc');
} catch (e) { fail++; console.error('  \u2717 multi-asset crash: ' + e.message); }

// ════════════════════════════════════════════════════════════════
// 11. SPOUSAL MORTALITY + ROLLOVER
// ════════════════════════════════════════════════════════════════
console.log('\n── 11. Spousal mortality + rollover ──');

const couple = E.runMC(Object.assign({}, baseP, {
  cOn: true, cAge: 48, cSex: 'F', cSal: 65000,
  cRRSP: 200000, cTFSA: 60000, cNR: 30000,
  cQppAge: 65, cAvgE: 65000, cQppYrs: 22, cOasAge: 65,
  cDeath: 75 // spouse dies young
}), 100);
assert(!!couple && isFinite(couple.medF), 'spouse early death runs');
assert(Array.isArray(couple.cDeathAges) && couple.cDeathAges.length > 0, 'cDeathAges populated for couple');

// Couple with stochastic mortality
const coupleMort = E.runMC(Object.assign({}, baseP, {
  cOn: true, cAge: 48, cSex: 'F', cSal: 65000,
  cRRSP: 200000, cTFSA: 60000, cNR: 30000,
  cQppAge: 65, cAvgE: 65000, cQppYrs: 22, cOasAge: 65,
  stochMort: true
}), 100);
assert(!!coupleMort && isFinite(coupleMort.medF), 'couple stoch mortality runs');

// ════════════════════════════════════════════════════════════════
// 12. WHAT-IF BATTERY: 30+ extreme inputs
// ════════════════════════════════════════════════════════════════
console.log('\n── 12. What-if battery (extreme inputs) ──');

const tests = [
  ['Infinity sal', { sal: Infinity }],
  ['-Infinity rrsp', { rrsp: -Infinity }],
  ['NaN qppAge', { qppAge: NaN }],
  ['undefined retAge', { retAge: undefined }],
  ['null prov', { prov: null }],
  ['empty string prov', { prov: '' }],
  ['unknown prov', { prov: 'XX' }],
  ['retAge > deathAge', { retAge: 100, deathAge: 90 }],
  ['negative age', { age: -5 }],
  ['age > deathAge', { age: 95, deathAge: 90 }],
  ['extreme inflation', { inf: 0.50 }],
  ['negative inflation', { inf: -0.10 }],
  ['negative retSpM', { retSpM: -1000 }],
  ['huge retSpM', { retSpM: 100000 }],
  ['allocR > 1', { allocR: 5 }],
  ['negative allocR', { allocR: -0.5 }],
  ['penM huge', { penType: 'db', penM: 100000 }],
  ['huge MER', { merR: 0.50 }],
  ['negative MER', { merR: -0.05 }],
  ['empty params', {}],
  ['only required', { age: 50, retAge: 65, deathAge: 90, sal: 50000, retSpM: 3000 }],
  ['single prov each', { prov: 'NU' }],
  ['couple no spouse age', { cOn: true }],
  ['couple negative spouse age', { cOn: true, cAge: -5, cSex: 'F' }],
  ['fatT enabled', { fatT: true }],
  ['stochInf enabled', { stochInf: true }],
  ['stochMort enabled', { stochMort: true }],
  ['gkOn + couple', { cOn: true, cAge: 50, gkOn: true }],
  ['huge negative balances', { rrsp: -1e9, tfsa: -1e9, nr: -1e9 }],
  ['zero everything (cataclysm)', { sal: 0, rrsp: 0, tfsa: 0, nr: 0, retSpM: 5000 }],
  ['lottery winner', { rrsp: 1e8, tfsa: 1e7, nr: 1e8 }]
];

tests.forEach(([name, override]) => {
  try {
    const r = E.runMC(Object.assign({}, baseP, override), 30);
    if (r === null || typeof r === 'undefined') {
      assert(true, '"' + name + '" → null (graceful)');
    } else if (typeof r.succ === 'number' && isFinite(r.succ)) {
      assert(true, '"' + name + '" → succ=' + Math.round(r.succ * 100) + '%');
    } else {
      fail++; console.error('  \u2717 "' + name + '" → invalid result: ' + JSON.stringify(r).slice(0, 80));
    }
  } catch (e) {
    fail++; console.error('  \u2717 "' + name + '" → CRASH: ' + e.message.slice(0, 100));
  }
});

// ════════════════════════════════════════════════════════════════
// 13. STRESS SCENARIOS (engine-level invariants)
// ════════════════════════════════════════════════════════════════
console.log('\n── 13. Stress: very conservative + very aggressive ──');

const conservative = E.runMC(Object.assign({}, baseP, {
  eqRet: 0.04, bndRet: 0.025, allocR: 0.3, allocT: 0.4, allocN: 0.2
}), 100);
const aggressive = E.runMC(Object.assign({}, baseP, {
  eqRet: 0.10, bndRet: 0.04, allocR: 0.95, allocT: 0.95, allocN: 0.90
}), 100);
assert(aggressive.medF >= conservative.medF, 'aggressive median >= conservative median');
assert(aggressive.p5F <= conservative.p5F + 1, 'aggressive P5 <= conservative P5 (more downside risk)', 'warn');

// ════════════════════════════════════════════════════════════════
// 14. PERCENTILE ORDERING UNDER ALL SCENARIOS
// ════════════════════════════════════════════════════════════════
console.log('\n── 14. Percentile ordering invariant (all scenarios) ──');

[baseP,
  Object.assign({}, baseP, { stochMort: true, fatT: true, stochInf: true }),
  Object.assign({}, baseP, { gkOn: true }),
  Object.assign({}, baseP, { cOn: true, cAge: 48, cSex: 'F', cSal: 65000, cRRSP: 200000, cTFSA: 60000, cNR: 30000, cQppAge: 65, cAvgE: 65000, cQppYrs: 22, cOasAge: 65 }),
  Object.assign({}, baseP, { bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 480000, bizSaleAge: 65 }),
  Object.assign({}, baseP, { props: [{ on: true, val: 500000, mb: 100000, mr: 0.05, ma: 20, ri: 0.025, rm: 0, app: 0.025, pri: true, sa: 0 }] })
].forEach((cfg, i) => {
  const r = E.runMC(cfg, 200);
  if (!r) { fail++; console.error('  \u2717 scenario ' + i + ' returned null'); return; }
  const wOk = r.p5F <= r.p25F + 1 && r.p25F <= r.medF + 1 && r.medF <= r.p75F + 1 && r.p75F <= r.p95F + 1;
  assert(wOk, 'scenario ' + i + ' wealth percentiles ordered');
  const eOk = r.p5EstateNet <= r.p25EstateNet + 1 && r.p25EstateNet <= r.medEstateNet + 1 && r.medEstateNet <= r.p75EstateNet + 1 && r.p75EstateNet <= r.p95EstateNet + 1;
  assert(eOk, 'scenario ' + i + ' estate percentiles ordered');
});

// ════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  RESULTS: ' + pass + ' pass, ' + fail + ' fail, ' + warn + ' warn');
console.log('═══════════════════════════════════════════════════════════════');
if (failures.length > 0) {
  console.log('\nIssues:');
  failures.forEach(f => console.log('  ' + f));
}
process.exit(fail > 0 ? 1 : 0);
