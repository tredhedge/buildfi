// diff-engine-candidate.ts — 2026-06-18
// Differential validator for the engine SSOT consolidation. Compares the live
// lib/engine/index.js against the generated lib/engine/index.candidate.js
// (planner_v3 as a module). Quantifies: (a) fiscal-helper deltas (mostly the
// Q1-vs-shim CONSTANT gap), (b) runMC headline parity (LOGIC gap). The candidate
// is NOT promoted to live until this is understood + the constants are injected.
//   Run: npx tsx scripts/diff-engine-candidate.ts
import * as cur from "../lib/engine/index.js";
import * as cand from "../lib/engine/index.candidate.js";

const C: any = cur, D: any = cand;
let helperDiffs = 0, helperSame = 0;
const lines: string[] = [];
function cmp(label: string, a: number, b: number, tol = 0.5) {
  if (a == null || b == null || !isFinite(a) || !isFinite(b)) { lines.push(`  ${label}: non-finite cur=${a} cand=${b}`); helperDiffs++; return; }
  if (Math.abs(a - b) <= tol) helperSame++;
  else { lines.push(`  ${label}: cur=${Math.round(a)} cand=${Math.round(b)} Δ=${Math.round(a - b)}`); helperDiffs++; }
}

console.log("=== FISCAL HELPERS (diffs here are mostly the Q1-C vs shim-Q2 constant gap) ===");
for (const prov of ["QC", "ON", "BC", "AB"]) for (const inc of [20000, 50000, 95000, 150000])
  cmp(`calcTax(${inc},${prov})`, C.calcTax(inc, 0, prov, 0, false).total, D.calcTax(inc, 0, prov, 0, false).total, 1);
for (const sa of [65, 70]) for (const inc of [0, 50000, 95000, 130000])
  cmp(`calcOAS(${sa},${inc})`, C.calcOAS(sa, inc, 0, 0, 70), D.calcOAS(sa, inc, 0, 0, 70), 0.5);
for (const hs of [false, true]) for (const inc of [0, 5000, 15000, 22000])
  cmp(`calcGIS(${inc},sp=${hs})`, C.calcGIS(68, inc, 0, 0, hs), D.calcGIS(68, inc, 0, 0, hs), 0.5);
for (const sa of [60, 65, 70]) for (const ae of [40000, 68500])
  cmp(`calcQPP(${sa},${ae})`, C.calcQPP(sa, ae, 35), D.calcQPP(sa, ae, 35), 0.5);
lines.forEach((l) => console.log(l));
console.log(`helpers: ${helperSame} same, ${helperDiffs} differ`);

console.log("\n=== runMC headline parity (seeded; LOGIC gap — should be small) ===");
const profiles: any[] = [
  { _seed: 12345, age: 45, retAge: 65, sex: "M", prov: "QC", deathAge: 92, rrsp: 300000, tfsa: 80000, nr: 40000, sal: 85000, retSpM: 4500, qppAge: 65, oasAge: 65, inf: 0.021, eqRet: 0.05, bndRet: 0.03, cOn: false, stochMort: false },
  { _seed: 999, age: 60, retAge: 65, sex: "F", prov: "ON", deathAge: 94, rrsp: 700000, tfsa: 150000, nr: 200000, sal: 0, retIncome: 60000, retSpM: 5000, qppAge: 65, oasAge: 65, inf: 0.021, eqRet: 0.05, bndRet: 0.03, cOn: false, stochMort: false },
];
for (let i = 0; i < profiles.length; i++) {
  try {
    const a = C.runMC({ ...profiles[i] }, 2000), b = D.runMC({ ...profiles[i] }, 2000);
    const sa = Math.round((a?.succ ?? NaN) * 1000) / 10, sb = Math.round((b?.succ ?? NaN) * 1000) / 10;
    console.log(`  profile ${i}: cur succ=${sa}%  cand succ=${sb}%  Δ=${(sa - sb).toFixed(1)}pp`);
  } catch (e: any) { console.log(`  profile ${i}: ERROR ${e?.message || e}`); }
}
console.log("\n(Interpretation: helper diffs ≈ constant gap → fixed by injecting shim into the candidate's C.");
console.log(" runMC Δ ≈ logic gap. Large helper diffs + tiny runMC Δ ⇒ generator faithful, just needs shim constants.)");
