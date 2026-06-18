// tests/constants-c-shim-drift.test.ts — 2026-06-18
// ─────────────────────────────────────────────────────────────────────────────
// SSOT GUARD: planner_v3.html's inline `var C` (the engine-logic source) must
// agree with lib/constants/engine-shim.js (the canonical CONSTANTS source) on
// every fiscal constant the shim owns. The engine generator
// (scripts/gen-engine-from-planner.mjs) splices the shim over C, so this test
// makes that splice a *verified no-op*: if the two ever diverge, generation
// would silently change engine numbers — this fails loudly instead, forcing a
// human to reconcile to the genuinely-correct value (lesson from the 2026-06-18
// Yukon find, where the shim — not C — was the stale side).
//   Run: npx tsx tests/constants-c-shim-drift.test.ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINE_SHIM_2026 } from "../lib/constants/engine-shim.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLANNER = join(__dirname, "..", "planner", "planner_v3.html");

// Extract the LAST `var C = { ... };` inside the engine markers (same marker
// convention as the generator and .audit-harness/extract.js).
const html = readFileSync(PLANNER, "utf8");
const s = html.lastIndexOf("/*__ENGINE_START__*/");
const e = html.lastIndexOf("/*__ENGINE_END__*/");
const block = html.substring(s, e);
const ci = block.indexOf("var C = {");
let depth = 0, j = block.indexOf("{", ci), end = -1;
for (let k = j; k < block.length; k++) {
  if (block[k] === "{") depth++;
  else if (block[k] === "}") { depth--; if (depth === 0) { end = k; break; } }
}
let C: any;
// eslint-disable-next-line no-eval
eval("C = " + block.slice(j, end + 1));

// Shim export name → C field name, where they intentionally differ but carry the
// SAME value (verified 2026-06-18). Keeps name-only mismatches from false-failing.
const NAME_MAP: Record<string, string> = {
  OAS_CLAWBACK_THR: "OAS_CLAWBACK_THRESHOLD",
  TFSA_LIMIT_2026: "TFSA_ANNUAL_LIMIT",
};

const mismatches: string[] = [];
let checked = 0;
for (const shimKey of Object.keys(ENGINE_SHIM_2026)) {
  const cKey = NAME_MAP[shimKey] || shimKey;
  if (!(cKey in C)) { mismatches.push(`MISSING in C: shim ${shimKey} (→ ${cKey})`); continue; }
  const a = JSON.stringify(C[cKey]);
  const b = JSON.stringify((ENGINE_SHIM_2026 as any)[shimKey]);
  checked++;
  if (a !== b) mismatches.push(`DRIFT ${shimKey}${cKey !== shimKey ? ` (C.${cKey})` : ""}: C=${a} shim=${b}`);
}

console.log("══════════════════════════════════════════════════════════════");
if (mismatches.length === 0) {
  console.log(`  C ↔ shim DRIFT: ${checked} constants checked, 0 drift — SSOT splice is a verified no-op.`);
  console.log("══════════════════════════════════════════════════════════════");
} else {
  console.log(`  C ↔ shim DRIFT DETECTED (${mismatches.length}) — reconcile to the CORRECT value (don't auto-pick a side):`);
  for (const m of mismatches) console.log("    ✗ " + m);
  console.log("══════════════════════════════════════════════════════════════");
  process.exit(1);
}
