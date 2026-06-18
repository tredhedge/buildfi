#!/usr/bin/env node
// gen-engine-from-planner.mjs — 2026-06-18
// ─────────────────────────────────────────────────────────────────────────────
// Engine SSOT consolidation (user decision 2026-06-18): planner_v3.html's inline
// engine is the most up-to-date version (4 decum passes + tax-funding + GIS
// exemption ahead of lib/engine). This generator makes planner_v3 the SOURCE and
// emits the server module so the two can no longer drift.
//
// SAFETY: emits a CANDIDATE file (lib/engine/index.candidate.js) ONLY. It NEVER
// overwrites the live lib/engine/index.js. Promotion happens by hand, after the
// differential validator (scripts/diff-engine-candidate.mjs) proves the candidate
// equivalent-or-better against the current engine + the 505-suite.
//
// v1 (this version): verbatim planner_v3 engine block + browser-global stubs + ES
// exports, KEEPING planner_v3's inline `var C` constants. This lets the differential
// quantify (a) logic parity and (b) the constant delta vs the shim's current values.
// v2 will inject the shim constants over C and reverse-port Bug #12.
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINE_SHIM_2026 } from "../lib/constants/engine-shim.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PLANNER = join(ROOT, "planner", "planner_v3.html");
const OUT = join(ROOT, "lib", "engine", "index.candidate.js");

// Shim export name → planner_v3 C field name where they intentionally differ but
// carry the SAME value (name-only). Mirrors tests/constants-c-shim-drift.test.ts.
const C_NAME_MAP = { OAS_CLAWBACK_THR: "OAS_CLAWBACK_THRESHOLD", TFSA_LIMIT_2026: "TFSA_ANNUAL_LIMIT" };

// The export surface the live lib/engine exposes (candidate must match this set,
// minus any name planner_v3 doesn't define).
const WANT_EXPORTS = [
  "runMC", "optimizeDecum", "calcTax", "calcOAS", "calcGIS", "calcQPP", "getRRIFMin",
  "calcCorpTax", "calcPayroll", "tRn", "pCr", "stochDeath", "blendRet", "chol", "sMul",
  "RRIF", "PROV_TAX", "CRM", "CRM_CRISIS", "CHL", "CHL_CRISIS", "CPM_F", "CPM_M", "STR",
];

const html = readFileSync(PLANNER, "utf8");
// lastIndexOf: planner_v3 REFERENCES these marker strings in code (~line 872), so the
// real markers are the LAST occurrences (same approach as .audit-harness/extract.js).
const s = html.lastIndexOf("/*__ENGINE_START__*/");
const e = html.lastIndexOf("/*__ENGINE_END__*/");
if (s < 0 || e < 0) {
  console.error("ENGINE markers not found in planner_v3.html");
  process.exit(1);
}
let block = html.substring(s + "/*__ENGINE_START__*/".length, e);

// ── v2: splice canonical shim constants over planner_v3's inline `C` (SSOT) ──
// planner_v3 stays the ENGINE-LOGIC source; engine-shim.js is the CONSTANTS source.
// We Object.assign the shim bundle over C *before* the bare-var derivations
// (var FED_BRACKETS = C.FED_BRACKETS; ...) so those pick up canonical values.
// A C-vs-shim drift test (tests/constants-c-shim-drift.test.ts) guards that the two
// agree, so this splice is a verified no-op in steady state and divergence fails loudly.
const SPLICE_ANCHOR = "var FED_BRACKETS = C.FED_BRACKETS;";
if (!block.includes(SPLICE_ANCHOR)) {
  console.error(`[gen-engine] splice anchor not found ("${SPLICE_ANCHOR}") — planner_v3 structure changed; aborting to avoid a silently un-spliced engine.`);
  process.exit(1);
}

// GENERATION-TIME DRIFT GUARD: the splice (Object.assign(C, shim)) would silently
// rewrite engine numbers if planner_v3's C and the shim disagree. Refuse to generate
// on divergence — a human must reconcile to the CORRECT value (the shim is NOT
// automatically authoritative; see the 2026-06-18 Yukon find where C was the right side).
try {
  const ci = block.indexOf("var C = {");
  let depth = 0, jj = block.indexOf("{", ci), cend = -1;
  for (let k = jj; k < block.length; k++) { if (block[k] === "{") depth++; else if (block[k] === "}") { depth--; if (depth === 0) { cend = k; break; } } }
  let _C; eval("_C = " + block.slice(jj, cend + 1));
  const drift = [];
  for (const sk of Object.keys(ENGINE_SHIM_2026)) {
    const ck = C_NAME_MAP[sk] || sk;
    if (!(ck in _C)) { drift.push(`shim ${sk} missing in C (→ ${ck})`); continue; }
    if (JSON.stringify(_C[ck]) !== JSON.stringify(ENGINE_SHIM_2026[sk])) drift.push(`${sk}: C=${JSON.stringify(_C[ck])} shim=${JSON.stringify(ENGINE_SHIM_2026[sk])}`);
  }
  if (drift.length) {
    console.error(`[gen-engine] ABORT — C↔shim constant drift (${drift.length}); reconcile to the correct value before generating:\n  ${drift.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[gen-engine] C↔shim drift guard: ${Object.keys(ENGINE_SHIM_2026).length} constants, 0 drift — splice is a verified no-op.`);
} catch (e) {
  console.error(`[gen-engine] ABORT — could not verify C↔shim drift (${e.message}); refusing to splice blind.`);
  process.exit(1);
}
block = block.replace(
  SPLICE_ANCHOR,
  "/* v2 SSOT: canonical shim constants spliced over inline C (see gen-engine-from-planner.mjs) */\n" +
  "Object.assign(C, _BFI_SHIM_CONSTANTS);\n" +
  SPLICE_ANCHOR
);

// Detect which wanted names are actually defined in the block (function/var/const/let).
const defined = WANT_EXPORTS.filter((name) => {
  const re = new RegExp("(^|\\n)\\s*(function|var|const|let)\\s+" + name + "\\b");
  return re.test(block);
});
const missing = WANT_EXPORTS.filter((n) => !defined.includes(n));

const header =
  "// lib/engine — GENERATED from planner_v3.html by scripts/gen-engine-from-planner.mjs.\n" +
  "// DO NOT EDIT BY HAND. Edit the engine block in planner_v3.html (the SSOT source),\n" +
  "// then run `npm run gen-engine` and `npm run promote-engine`.\n" +
  "// tests/engine-ssot-sync.test.ts fails if lib/engine/index.js drifts from a fresh\n" +
  "// regeneration. SSOT consolidation 2026-06-18: planner_v3 = engine source of truth.\n" +
  "/* eslint-disable */\n" +
  "// @ts-nocheck\n" +
  "// Canonical fiscal constants (SSOT): spliced over planner_v3's inline C below.\n" +
  "import { ENGINE_SHIM_2026 as _BFI_SHIM_CONSTANTS } from '../constants/engine-shim.js';\n" +
  "// Browser-global stubs (the engine block defensively references these; server has none).\n" +
  "var self = {}, html = '', SAM_STRATEGIES = [];\n" +
  "var window = (typeof globalThis !== 'undefined' ? globalThis : {});\n";

const footer =
  "\n\n// ─── GENERATED ES EXPORTS ───\n" +
  "export {\n  " + defined.join(",\n  ") + ",\n};\n";

writeFileSync(OUT, header + block + footer, "utf8");

console.log(`[gen-engine] wrote candidate: ${OUT}`);
console.log(`[gen-engine] exported ${defined.length}/${WANT_EXPORTS.length}: ${defined.join(", ")}`);
if (missing.length) console.log(`[gen-engine] NOT found in planner_v3 (investigate): ${missing.join(", ")}`);
