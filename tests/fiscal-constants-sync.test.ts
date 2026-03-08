// tests/fiscal-constants-sync.test.ts
// ══════════════════════════════════════════════════════════════════════
// Verification test: engine inline constants MUST match fiscal-2026.ts
// ══════════════════════════════════════════════════════════════════════
// Run: npx tsx tests/fiscal-constants-sync.test.ts
//
// This test ensures the two sources of fiscal truth never diverge.
// If this test fails, either the engine or fiscal-2026.ts was updated
// without updating the other. Fix BOTH before committing.
// ══════════════════════════════════════════════════════════════════════

import assert from "node:assert/strict";
import { FISCAL_2026 } from "../lib/constants/fiscal-2026";
import type { ProvinceCode } from "../lib/constants/fiscal-2026";
import {
  TAX_BASE_YEAR, FED_BRACKETS, FED_RATES, FED_PERSONAL,
  OAS_CLAWBACK_THR, OAS_MAX_MONTHLY, GIS_MAX_SINGLE, GIS_MAX_COUPLE,
  QPP_MAX_MONTHLY, QPP_MGA, QPP_YAMPE, QPP2_MAX_MONTHLY,
  PENSION_CREDIT_MAX, TFSA_LIMIT_2026, PROV_TAX
} from "../lib/engine/index.js";

const f = FISCAL_2026.federal;
const provinces = Object.keys(FISCAL_2026.provincial) as ProvinceCode[];

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, engineVal: unknown, constantVal: unknown) {
  try {
    assert.deepStrictEqual(engineVal, constantVal);
    pass++;
  } catch {
    fail++;
    failures.push(`  FAIL: ${label}\n    engine:   ${JSON.stringify(engineVal)}\n    fiscal:   ${JSON.stringify(constantVal)}`);
  }
}

// ── Federal Constants ────────────────────────────────────────────────

console.log("═══ Federal Constants ═══");
check("TAX_BASE_YEAR", TAX_BASE_YEAR, f.TAX_BASE_YEAR);
check("FED_BRACKETS", FED_BRACKETS, f.FED_BRACKETS);
check("FED_RATES", FED_RATES, f.FED_RATES);
check("FED_PERSONAL", FED_PERSONAL, f.FED_PERSONAL);
check("OAS_CLAWBACK_THR", OAS_CLAWBACK_THR, f.OAS_CLAWBACK_THR);
check("OAS_MAX_MONTHLY", OAS_MAX_MONTHLY, f.OAS_MAX_MONTHLY);
check("GIS_MAX_SINGLE", GIS_MAX_SINGLE, f.GIS_MAX_SINGLE);
check("GIS_MAX_COUPLE", GIS_MAX_COUPLE, f.GIS_MAX_COUPLE);
check("QPP_MAX_MONTHLY", QPP_MAX_MONTHLY, f.QPP_MAX_MONTHLY);
check("QPP_MGA", QPP_MGA, f.QPP_MGA);
check("QPP_YAMPE", QPP_YAMPE, f.QPP_YAMPE);
check("QPP2_MAX_MONTHLY", QPP2_MAX_MONTHLY, f.QPP2_MAX_MONTHLY);
check("PENSION_CREDIT_MAX", PENSION_CREDIT_MAX, f.PENSION_CREDIT_MAX);
check("TFSA_LIMIT (engine: TFSA_LIMIT_2026)", TFSA_LIMIT_2026, f.TFSA_LIMIT);
console.log(`  Federal: ${pass} pass, ${fail} fail`);

// ── Provincial Constants ─────────────────────────────────────────────

console.log("\n═══ Provincial Constants ═══");

// Check same provinces exist
const engineProvs = Object.keys(PROV_TAX).sort();
const constantProvs = provinces.slice().sort();
check("Province list", engineProvs, constantProvs);

// Check each province field by field
for (const prov of provinces) {
  const ep = (PROV_TAX as Record<string, any>)[prov];
  const cp = FISCAL_2026.provincial[prov];
  if (!ep) {
    fail++;
    failures.push(`  FAIL: Province ${prov} missing from engine`);
    continue;
  }
  check(`${prov}.b (brackets)`, ep.b, cp.b);
  check(`${prov}.r (rates)`, ep.r, cp.r);
  check(`${prov}.pd (personal deduction)`, ep.pd, cp.pd);
  check(`${prov}.abate (abatement)`, ep.abate, cp.abate);
  check(`${prov}.eligDivCr`, ep.eligDivCr, cp.eligDivCr);
  check(`${prov}.nonEligDivCr`, ep.nonEligDivCr, cp.nonEligDivCr);
  check(`${prov}.ageAmt`, ep.ageAmt, cp.ageAmt);
  check(`${prov}.ageThresh`, ep.ageThresh, cp.ageThresh);
  check(`${prov}.penAmt`, ep.penAmt, cp.penAmt);
}

// ── Metadata ─────────────────────────────────────────────────────────

console.log("\n═══ Metadata ═══");
check("metadata.year matches TAX_BASE_YEAR", FISCAL_2026.metadata.year, TAX_BASE_YEAR);
assert.ok(FISCAL_2026.metadata.verifiedDate, "metadata.verifiedDate exists");
assert.ok(FISCAL_2026.metadata.sources.length > 0, "metadata.sources not empty");
pass += 2;

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Fiscal constants sync: ${pass} pass, ${fail} fail (${pass + fail} total)`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach(f => console.log(f));
  process.exit(1);
} else {
  console.log("All constants in sync. ✓");
}
