// Post-fix conservation gate (audit 1.1 / 1.3 / 1.4).
// Companion to verify2.js, which DEMONSTRATES the pre-fix bugs with baselines that
// (deliberately, for the demo) ignore government-income inflow and assume tax is
// never funded. Those baselines read as "phantom money" on the FIXED engine. This
// gate asserts the *correct* post-fix conservation identities instead:
//
//   optimizeDecum (tax reported but NOT funded — withdrawal need is spending-only,
//     row.cashWithdraw is a reported field): final = init + Σgov − Σspend
//   runMC (year-end settlement funds tax AND reinvests surplus, engine L~5272):
//     final = init + Σgov − Σspend − Σtax
//
// nrTaxDrag is zeroed so the identity isolates conservation from the (legitimate)
// drag on reinvested NR balances. Usage:
//   python3 extract_engine.py ../planner/planner_v3.html && node conservation_gate.js
const fs = require('fs');
global.html = ''; const store = {};
global.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
if (typeof globalThis.navigator === 'undefined') globalThis.navigator = { userAgent: 'node' };
eval(fs.readFileSync(__dirname + '/sam.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/extras.js', 'utf8'));
eval(fs.readFileSync(__dirname + '/engine.js', 'utf8'));
tRn = function () { return 0; }; // exact zero noise -> deterministic mean returns

let failures = 0;
function gate(name, resid, tol) {
  const ok = Math.abs(resid) <= tol;
  if (!ok) failures++;
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + '  residual=$' + Math.round(resid) + ' (tol $' + tol + ')');
}

// --- 1.3: optimizeDecum surplus reinvested ONCE (no phantom money) ---
(function () {
  const p = { age: 71, retAge: 71, deathAge: 81, prov: 'QC', rrsp: 800000, tfsa: 1e-9, nr: 1e-9, retSpM: 1e-9,
    qppAge: 70, avgE: 1e-12, qppYrs: 1e-12, oasAge: 70, inf: 1e-12, eqRet: 1e-12, bndRet: 1e-12,
    allocR: 1, allocT: 1, allocN: 1, merR: 0, merT: 0, merN: 0, nrTaxDrag: 1e-12, melt: false };
  const r = optimizeDecum(p);
  const L = r.schedule[r.schedule.length - 1];
  let gov = 0, sp = 0, tax = 0;
  r.schedule.forEach(s => { gov += (s.govInc || 0); sp += (s.spending || 0); tax += (s.tax || 0); });
  const tot = L.balRR + L.balTF + L.balNR;
  // Tax is now funded in optimizeDecum too (audit 1.1 deterministic). NR/TFSA hold
  // the reinvested surplus so tax draws add no RRSP income -> exact conservation.
  gate('1.1/1.3 optimizeDecum (final = init + Σgov − Σspend − Σtax)', tot - (800000 + gov - sp - tax), 1);
})();

// --- 1.1 + 1.4: runMC funds tax AND reinvests forced-inflow surplus ---
(function () {
  const p = { age: 75, retAge: 75, deathAge: 85, sex: 'M', prov: 'QC', rrsp: 1000000, tfsa: 0, nr: 0,
    retSpM: 0.0001, qppAge: 76, oasAge: 76, avgE: 1e-12, qppYrs: 0, inf: 1e-12, eqRet: 1e-12, eqVol: 0.010001,
    bndRet: 1e-12, bndVol: 0.010001, allocR: 1, allocT: 1, allocN: 1, merR: 0, merT: 0, merN: 0, nrTaxDrag: 1e-12,
    stochInf: false, stochMort: false, wStrat: 'optimal', melt: false };
  const r = runMC(p, 1);
  let gov = 0, tax = 0, sp = 0;
  r.medPath.forEach(m => { gov += (m.oas || 0) + (m.qpp || 0) + (m.gis || 0) + (m.pen || 0); tax += (m.tax || 0); sp += (m.spend || 0); });
  const f = r.medPath[r.medPath.length - 1];
  // Tolerance: ~0.6% of portfolio absorbs reinvestment/tax-timing rounding (was a
  // $547,627 EVAPORATION pre-fix; an UNfunded-tax run would be ~−$98K here).
  gate('1.1+1.4 runMC (final = init + Σgov − Σspend − Σtax)', f.total - (1000000 + gov - sp - tax), 7000);
})();

console.log(failures === 0 ? '\nALL CONSERVATION GATES PASS' : '\n' + failures + ' GATE(S) FAILED');
process.exit(failures > 0 ? 1 : 0);
