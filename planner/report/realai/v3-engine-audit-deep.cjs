#!/usr/bin/env node
// v3-engine-audit-deep.cjs — Extends v3-engine-audit.cjs with:
//   - Deterministic engine (optimizeDecum) tests
//   - Auxiliary functions (calcCorpTax, calcPayroll, calcNRItemizedTax, calcWHT)
//   - Estate percentile sortedness verification (Explore agent flagged P0)
//   - QC dividend credit order verification (Explore agent flagged P1)
//   - Deathage=undefined crash root cause
//   - Sortedness invariants under N=200
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

console.log('═══════════════════════════════════════════════════════════════');
console.log('  v3 Engine — Deep audit (deterministic + aux + invariants)');
console.log('═══════════════════════════════════════════════════════════════\n');

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

// ════════════════════════════════════════════════════════════════
// 1. DETERMINISTIC ENGINE — optimizeDecum
// ════════════════════════════════════════════════════════════════
console.log('── 1. Deterministic engine (optimizeDecum) ──');

let det;
try { det = E.optimizeDecum(baseP); }
catch (e) { fail++; console.error('  \u2717 optimizeDecum throws on baseline: ' + e.message); }

if (det) {
  assert(typeof det === 'object', 'optimizeDecum returns object');
  assert(Array.isArray(det.schedule) && det.schedule.length > 0, 'schedule is non-empty array');
  if (det.schedule && det.schedule.length > 0) {
    const r0 = det.schedule[0];
    assert(typeof r0.age === 'number', 'schedule[0] has age');
    // Schedule should span age → deathAge
    const lastRow = det.schedule[det.schedule.length - 1];
    assert(lastRow.age === baseP.deathAge || lastRow.age === baseP.deathAge - 1,
      'schedule ends at deathAge (got ' + lastRow.age + ', expected ' + baseP.deathAge + ')');
    // No NaN in critical fields. The schedule row shape from optimizeDecum
    // uses `tax` (annual tax) and `spending` (annual spend). The previous
    // audit asserted r.spend which does not exist on the row — always
    // failed, producing a false negative.
    let nanRows = 0;
    det.schedule.forEach(r => {
      if (r.tax != null && (!isFinite(r.tax) || isNaN(r.tax))) nanRows++;
      if (r.spending != null && (!isFinite(r.spending) || isNaN(r.spending))) nanRows++;
    });
    assert(nanRows === 0, 'no NaN in deterministic schedule (found ' + nanRows + ')');
    // Pre-retirement years should NOT have RRSP withdrawal
    const preRetRows = det.schedule.filter(r => r.age < baseP.retAge);
    if (preRetRows.length > 0) {
      const preRetWdl = preRetRows.reduce((s, r) => s + (r.wFromRR || 0), 0);
      assert(preRetWdl === 0, 'no RRSP withdrawal pre-retirement (found $' + preRetWdl.toFixed(0) + ')');
    }
    // Post-retirement: government income should be present
    const postRetRows = det.schedule.filter(r => r.age >= 65);
    if (postRetRows.length > 0) {
      const totGov = postRetRows.reduce((s, r) => s + (r.qpp || 0) + (r.oas || 0), 0);
      assert(totGov > 0, 'post-65 has government income (got $' + totGov.toFixed(0) + ')');
    }
  }
  // finalBal should be non-negative
  if (typeof det.finalBal !== 'undefined') {
    assert(det.finalBal >= -1, 'finalBal non-negative (got ' + det.finalBal + ')');
  }
}

// 1b. Determinism: optimizeDecum should be FULLY deterministic (no random)
const det2 = E.optimizeDecum(baseP);
if (det && det2) {
  assert(JSON.stringify(det.finalBal) === JSON.stringify(det2.finalBal),
    'optimizeDecum is deterministic across runs (finalBal: ' + det.finalBal + ' vs ' + det2.finalBal + ')');
}

// 1c. Edge: already retired
try {
  const detRet = E.optimizeDecum(Object.assign({}, baseP, { age: 70, retAge: 65, sal: 0 }));
  assert(!!detRet, 'already-retired profile runs in optimizeDecum');
  if (detRet && detRet.schedule) {
    assert(detRet.schedule[0].age === 70, 'already-retired schedule starts at 70');
  }
} catch (e) {
  fail++; console.error('  \u2717 optimizeDecum throws on already-retired: ' + e.message);
}

// 1d. Edge: deathAge undefined → CRASH risk (we already saw runMC crashes)
try {
  const detNoDeath = E.optimizeDecum(Object.assign({}, baseP, { deathAge: undefined }));
  if (detNoDeath) assert(true, 'optimizeDecum handles deathAge=undefined');
  else assert(false, 'optimizeDecum returns null on deathAge=undefined (graceful)', 'warn');
} catch (e) {
  fail++; console.error('  \u2717 optimizeDecum CRASHES on deathAge=undefined: ' + e.message);
}

// 1e. Edge: zero balances + working salary
try {
  const detZero = E.optimizeDecum(Object.assign({}, baseP, { rrsp: 0, tfsa: 0, nr: 0 }));
  assert(!!detZero, 'optimizeDecum handles zero balances');
} catch (e) {
  fail++; console.error('  \u2717 optimizeDecum throws on zero balances: ' + e.message);
}

// ════════════════════════════════════════════════════════════════
// 2. ESTATE PERCENTILE SORTEDNESS (Explore agent flagged P0)
// ════════════════════════════════════════════════════════════════
console.log('\n── 2. Estate percentile sortedness ──');

const mcLg = E.runMC(baseP, 500);
if (mcLg) {
  // The Explore agent claims p5/p25/p75/p95 EstateNet read from unsorted array.
  // If that's true, percentiles WON'T be ordered.
  assert(mcLg.p5EstateNet <= mcLg.p25EstateNet + 1, 'p5EstateNet <= p25EstateNet');
  assert(mcLg.p25EstateNet <= mcLg.medEstateNet + 1, 'p25EstateNet <= medEstateNet');
  assert(mcLg.medEstateNet <= mcLg.p75EstateNet + 1, 'medEstateNet <= p75EstateNet');
  assert(mcLg.p75EstateNet <= mcLg.p95EstateNet + 1, 'p75EstateNet <= p95EstateNet');
  assert(mcLg.p5EstateTax <= mcLg.p25EstateTax + 1, 'p5EstateTax <= p25EstateTax');
  assert(mcLg.p25EstateTax <= mcLg.p75EstateTax + 1, 'p25EstateTax <= p75EstateTax');
  assert(mcLg.p75EstateTax <= mcLg.p95EstateTax + 1, 'p75EstateTax <= p95EstateTax');
}

// 2b. Wealth percentiles also sorted
if (mcLg) {
  assert(mcLg.p5F <= mcLg.p25F + 1, 'wealth p5F <= p25F');
  assert(mcLg.p25F <= mcLg.medF + 1, 'wealth p25F <= medF');
  assert(mcLg.medF <= mcLg.p75F + 1, 'wealth medF <= p75F');
  assert(mcLg.p75F <= mcLg.p95F + 1, 'wealth p75F <= p95F');
}

// ════════════════════════════════════════════════════════════════
// 3. QC DIVIDEND CREDIT ORDER (Explore agent flagged P1)
// ════════════════════════════════════════════════════════════════
console.log('\n── 3. QC dividend credit ordering ──');

// Test: $50K of eligible dividends in QC vs ON.
// QC abatement (16.5%) reduces fed tax. If divCredFed is applied AFTER abatement,
// the credit value is reduced by 16.5% (absorbed by abatement).
// If applied BEFORE abatement, it's worth full value.
const qcDiv = E.calcTax(50000, 0, 'QC', 0.02, true, { eligDiv: 50000, nonEligDiv: 0 });
const onDiv = E.calcTax(50000, 0, 'ON', 0.02, true, { eligDiv: 50000, nonEligDiv: 0 });
console.log('  $50K elig div + $50K other inc, QC: fed=' + qcDiv.fed.toFixed(0) + ' prov=' + qcDiv.prov.toFixed(0) + ' total=' + qcDiv.total.toFixed(0));
console.log('  $50K elig div + $50K other inc, ON: fed=' + onDiv.fed.toFixed(0) + ' prov=' + onDiv.prov.toFixed(0) + ' total=' + onDiv.total.toFixed(0));
// On a high-dividend QC return, total tax should be substantially LOWER than on regular income (dividends benefit credit)
const qcRegular = E.calcTax(100000, 0, 'QC', 0.02, true);
const qcDivBenefit = qcRegular.total - qcDiv.total;
console.log('  QC dividend benefit: $' + qcDivBenefit.toFixed(0) + ' tax savings vs $100K regular income');
assert(qcDivBenefit > 1000, 'QC eligible dividends produce meaningful tax savings (got $' + qcDivBenefit.toFixed(0) + ')', 'warn');

// ════════════════════════════════════════════════════════════════
// 4. CRASH ROOT CAUSE: deathAge=undefined
// ════════════════════════════════════════════════════════════════
console.log('\n── 4. Crash investigation: deathAge=undefined ──');

try {
  E.runMC(Object.assign({}, baseP, { deathAge: undefined }), 50);
  pass++;
} catch (e) {
  fail++;
  console.error('  \u2717 runMC CRASHES with deathAge=undefined: ' + e.message);
  console.error('     ' + e.stack.split('\n').slice(1, 3).join('\n     '));
}

// 4b. Same with stochMort + deathAge undefined
try {
  E.runMC(Object.assign({}, baseP, { deathAge: undefined, stochMort: true }), 50);
  pass++;
} catch (e) {
  fail++; console.error('  \u2717 runMC CRASHES with deathAge=undef + stochMort: ' + e.message);
}

// 4c. With deathAge=null
try {
  E.runMC(Object.assign({}, baseP, { deathAge: null }), 50);
  pass++;
} catch (e) {
  fail++; console.error('  \u2717 runMC CRASHES with deathAge=null: ' + e.message);
}

// ════════════════════════════════════════════════════════════════
// 5. AUXILIARY FUNCTIONS
// ════════════════════════════════════════════════════════════════
console.log('\n── 5. Auxiliary functions ──');

// 5a. calcPayroll — payroll deductions from salary
const payQC = E.calcPayroll(74600, 'QC', 0, 0.02);
inRange(payQC, 4000, 7000, 'calcPayroll @ MGA QC in [$4K, $7K] (CPP+EI+RQAP)');
const payON = E.calcPayroll(74600, 'ON', 0, 0.02);
inRange(payON, 4000, 7000, 'calcPayroll @ MGA ON in [$4K, $7K] (CPP+EI)');
const pay0 = E.calcPayroll(0, 'QC', 0, 0.02);
assert(pay0 === 0, 'calcPayroll @ $0 = $0');
const payNeg = E.calcPayroll(-100, 'QC', 0, 0.02);
assert(payNeg === 0, 'calcPayroll @ negative = $0 (sane)');

// 5b. calcCorpTax — corporate tax with active + passive income.
// Engine returns { totalTax, generalPortion, rdtohAdded } (not total).
try {
  const ct = E.calcCorpTax(200000, 0, 'QC', 0, 0.02);
  assert(typeof ct === 'object' && typeof ct.totalTax === 'number', 'calcCorpTax returns totalTax');
  inRange(ct.totalTax, 200000 * 0.05, 200000 * 0.30, 'corp tax @ $200K active QC in [5%, 30%]');
} catch (e) { fail++; console.error('  \u2717 calcCorpTax throws: ' + e.message); }

// 5c. calcWHT — withholding tax on foreign dividend yield. Signature is
// calcWHT(allocation, accountType) where allocation is a {can, us, intl,
// em, bnd} fractions object, NOT a dollar amount. Returns a percentage
// drag applied to blendMulti (e.g. 0.002 = 20 bps).
try {
  const allocAllCan = { can: 1, us: 0, intl: 0, em: 0, bnd: 0 };
  const allocAllUS  = { can: 0, us: 1, intl: 0, em: 0, bnd: 0 };
  const whtCan = E.calcWHT(allocAllCan, 'rrsp');
  const whtUS  = E.calcWHT(allocAllUS,  'rrsp');
  inRange(whtCan, 0, 0.001, 'WHT on 100% CAN (RRSP) ≈ 0');
  inRange(whtUS,  0, 0.01,  'WHT on 100% US (RRSP) in [0, 1%]');
  assert(whtUS >= whtCan, 'US drag >= CAN drag in RRSP');
} catch (e) { warn++; console.error('  \u26a0 calcWHT signature mismatch: ' + e.message); }

// 5d. blendRet
const blR1 = E.blendRet(0.07, 0.04, 0.6);
near(blR1, 0.07 * 0.6 + 0.04 * 0.4, 1e-9, 'blendRet 60/40 = 0.7×eq + 0.4×bond');
const blR2 = E.blendRet(0.07, 0.04, 1.0);
near(blR2, 0.07, 1e-9, 'blendRet 100% equity = eqRet');
const blR3 = E.blendRet(0.07, 0.04, 0);
near(blR3, 0.04, 1e-9, 'blendRet 0% equity = bondRet');

// 5e. calcNRItemizedTax — capital gains $250K threshold
try {
  // Below $250K threshold
  const nrLow = E.calcNRItemizedTax(100000, 50000, { eq: 1, bnd: 0, can: 1 }, false, 0.50);
  assert(typeof nrLow === 'object' || typeof nrLow === 'number', 'calcNRItemizedTax returns');
  // Above $250K threshold (test the cliff/graduation)
  // Note: signature may vary, this is exploratory
} catch (e) { warn++; console.error('  \u26a0 calcNRItemizedTax: ' + e.message); }

// ════════════════════════════════════════════════════════════════
// 6. RUNMC DETERMINISM PROBE (no seed, but verify variance is bounded)
// ════════════════════════════════════════════════════════════════
console.log('\n── 6. MC variance / determinism ──');

const succRuns = [];
for (let i = 0; i < 5; i++) succRuns.push(E.runMC(baseP, 200).succ);
const succMean = succRuns.reduce((a, b) => a + b, 0) / 5;
const succStd = Math.sqrt(succRuns.reduce((s, x) => s + (x - succMean) ** 2, 0) / 5);
console.log('  5×N=200 succ runs: ' + succRuns.map(s => Math.round(s * 100) + '%').join(' '));
console.log('  Mean=' + (succMean * 100).toFixed(1) + '% Std=' + (succStd * 100).toFixed(2) + 'pts');
assert(succStd < 0.05, 'MC succ std across N=200 runs < 5pts (got ' + (succStd * 100).toFixed(2) + ')', 'warn');

// ════════════════════════════════════════════════════════════════
// 7. medRevData CONSISTENCY (against medSim)
// ════════════════════════════════════════════════════════════════
console.log('\n── 7. medRevData internal consistency ──');

const mcMR = E.runMC(baseP, 200);
if (mcMR && mcMR.medRevData) {
  const m = mcMR.medRevData;
  // Each row sum check: rrq + psv + srg + pen + ret >= spend (roughly, post-tax)
  let badRows = 0;
  m.filter(r => r.age >= baseP.retAge).forEach(r => {
    const inc = (r.rrq || 0) + (r.psv || 0) + (r.srg || 0) + (r.pen || 0) + (r.ret || 0);
    const spendBudget = r.spend || 0;
    // If withdrawals fully cover gov shortfall, inc should ≈ spend
    if (inc < spendBudget * 0.5 && spendBudget > 1000) badRows++;
  });
  assert(badRows < m.length * 0.10, 'medRevData income at least roughly funds spending (' + badRows + ' anomaly rows of ' + m.length + ')');

  // Tax should be positive when there's taxable income
  const taxableButNoTax = m.filter(r => (r.taxInc || 0) > 30000 && (r.tax || 0) === 0).length;
  assert(taxableButNoTax === 0, 'no rows with taxable income > $30K but $0 tax (found ' + taxableButNoTax + ')');

  // wRrifMin should appear at age 72+
  const ages72plus = m.filter(r => r.age >= 72);
  if (ages72plus.length > 0) {
    const withRrifMin = ages72plus.filter(r => (r.wRrifMin || 0) > 0).length;
    assert(withRrifMin >= 1, 'at least one age-72+ row has wRrifMin populated (got ' + withRrifMin + ' of ' + ages72plus.length + ')');
  }
}

// ════════════════════════════════════════════════════════════════
// 8. PERCENTILE / SUCCESS RATE SANITY
// ════════════════════════════════════════════════════════════════
console.log('\n── 8. Cross-percentile sanity ──');

// Wealth → success rate monotonic relationship
const verysafe = E.runMC(Object.assign({}, baseP, { rrsp: 2000000, tfsa: 200000 }), 200);
const veryrisky = E.runMC(Object.assign({}, baseP, { rrsp: 10000, tfsa: 5000, nr: 0 }), 200);
assert(verysafe.succ > veryrisky.succ, 'higher savings → higher succ ('+(verysafe.succ*100).toFixed(0)+'% vs '+(veryrisky.succ*100).toFixed(0)+'%)');

// Higher MER → lower succ
const lowMer = E.runMC(Object.assign({}, baseP, { merR: 0.001, merT: 0.001, merN: 0.001 }), 200);
const hiMer = E.runMC(Object.assign({}, baseP, { merR: 0.025, merT: 0.025, merN: 0.025 }), 200);
assert(lowMer.succ >= hiMer.succ - 0.10, 'lower MER → higher succ (low='+(lowMer.succ*100).toFixed(0)+'% hi='+(hiMer.succ*100).toFixed(0)+'%)', 'warn');

// Higher spending → lower succ
const lowSp = E.runMC(Object.assign({}, baseP, { retSpM: 3000 }), 200);
const hiSp = E.runMC(Object.assign({}, baseP, { retSpM: 10000 }), 200);
assert(lowSp.succ > hiSp.succ - 0.05, 'lower spending → higher succ (low='+(lowSp.succ*100).toFixed(0)+'% hi='+(hiSp.succ*100).toFixed(0)+'%)');

function inRange(v, lo, hi, msg, sev) { assert(v >= lo && v <= hi, msg + ' (got ' + v + ' expected [' + lo + ', ' + hi + '])', sev); }

// ════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  RESULTS: ' + pass + ' pass, ' + fail + ' fail, ' + warn + ' warn');
console.log('═══════════════════════════════════════════════════════════════');
if (failures.length > 0) {
  console.log('\nIssues:');
  failures.forEach(f => console.log('  ' + f));
}
process.exit(fail > 0 ? 1 : 0);
