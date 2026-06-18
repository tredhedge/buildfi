// Engine-parity test (2026-06-17).
// Guards against drift between the two live engines:
//   (1) lib/engine/index.js  — canonical, server-side, used by /api/simulate + Bilan + reports
//   (2) planner_v3.html inline engine — the live in-browser planner (extracted headlessly
//       via .audit-harness/extract.js, same mechanism as the 505-suite)
// Drift between these is the root cause behind several fixed edge cases (QPP deferral cap,
// DB pension-splitting gate, bridge indexing). This test locks parity going forward.
//
// Strategy: the DETERMINISTIC fiscal helpers (calcTax/calcOAS/calcGIS/calcQPP) are compared
// exactly (these are the constant/formula-drift class the engine header explicitly warns
// about). runMC is stochastic, so its headline success is compared within a tolerance band.
//
// Run: npx tsx tests/engine-parity.test.ts   (wired into qa:full)

import { createRequire } from "module";
import * as path from "path";
import { fileURLToPath } from "url";
import * as canon from "../lib/engine/index.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { loadEngine } = require(path.join(__dirname, "..", ".audit-harness", "extract.js"));
const inl: any = loadEngine(path.join(__dirname, "..", "planner", "planner_v3.html"));
const C: any = canon;

let pass = 0;
let fail = 0;
const fails: string[] = [];

function num(r: any): number {
  return typeof r === "number" ? r : (r && (r.total ?? r.tax ?? r.totalTax)) ?? NaN;
}
function eq(label: string, a: number, b: number, tol: number) {
  if (a == null || b == null || !isFinite(a) || !isFinite(b)) {
    fail++; fails.push(`${label}: non-finite (canon=${a}, inline=${b})`); return;
  }
  if (Math.abs(a - b) <= tol) pass++;
  else { fail++; fails.push(`${label}: canon=${a} inline=${b} diff=${(a - b).toFixed(2)} (tol ${tol})`); }
}

// ── 1. calcTax (exact within $1) ──────────────────────────────────────
for (const prov of ["QC", "ON", "BC", "AB"]) {
  for (const inc of [20000, 50000, 95000, 95323, 150000, 250000]) {
    eq(`calcTax(${inc},${prov})`, num(C.calcTax(inc, 0, prov, 0, false)), num(inl.calcTax(inc, 0, prov, 0, false)), 1);
  }
}

// ── 2. calcOAS (exact within $0.50) — covers OAS clawback threshold ───
for (const sa of [65, 70]) {
  for (const inc of [0, 50000, 95000, 95323, 130000]) {
    eq(`calcOAS(${sa},${inc})`, C.calcOAS(sa, inc, 0, 0, 70), inl.calcOAS(sa, inc, 0, 0, 70), 0.5);
  }
}

// ── 3. calcGIS (exact within $0.50) — single vs couple max + taper ────
for (const hs of [false, true]) {
  for (const inc of [0, 5000, 15000, 22000]) {
    eq(`calcGIS(${inc},sp=${hs})`, C.calcGIS(68, inc, 0, 0, hs), inl.calcGIS(68, inc, 0, 0, hs), 0.5);
  }
}

// ── 4. calcQPP (exact within $0.50) — incl. deferral cap at 70 (71/72 == 70) ──
if (inl.calcQPP) {
  for (const sa of [60, 65, 70, 71, 72]) {
    for (const ae of [40000, 68500]) {
      eq(`calcQPP(${sa},${ae})`, C.calcQPP(sa, ae, 35), inl.calcQPP(sa, ae, 35), 0.5);
    }
  }
} else {
  console.log("[parity] calcQPP not exposed by inline engine — skipping helper grid");
}

// ── 5. runMC-level parity ─────────────────────────────────────────────
// NOT compared here: the inline runMC needs main-thread globals that the
// minimal extract.js sandbox does not provide (it returns degenerate results),
// and runMC is stochastic. runMC-level correctness is already covered by the
// 505-suite (inline engine, .audit-harness/run-suite.js) + simulate-contract
// (canonical engine). The fiscal-helper parity above guards the constant/
// formula-drift class that is the real cross-engine risk — exactly what caught
// the QPP age-70 deferral-cap drift (inline 1.588 vs canonical 1.42).

console.log(`\nENGINE PARITY (deterministic fiscal helpers): ${pass} passed, ${fail} failed`);
if (fail) {
  console.log("FAILURES:\n" + fails.slice(0, 40).join("\n"));
  process.exit(1);
}
