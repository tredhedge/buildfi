/**
 * tests/wizard-contract.test.ts
 *
 * Smoke test for the Adaptive Wizard v1 contract:
 *   - validateClassifyRequest, validateSaveRequest
 *   - mapWizardPhaseToEngine
 *   - filterBlocksForProfile + countFieldsFor (sanity on the registry)
 *
 * Run: npx tsx tests/wizard-contract.test.ts
 */

import {
  validateClassifyRequest,
  validateSaveRequest,
  mapWizardPhaseToEngine,
  WIZARD_DRAFT_TTL_SECONDS,
} from "../lib/schemas/wizard";
import {
  MODE1_DEFAULT,
  filterBlocksForProfile,
  countFieldsFor,
} from "../lib/wizard/blocks";

let passed = 0;
let failed = 0;

function expect(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${name}${detail ? "  -- " + detail : ""}`); }
}

// ── Phase mapping ──────────────────────────────────────────────────────
expect("phase: pre-retire -> accum", mapWizardPhaseToEngine("pre-retire") === "accum");
expect("phase: transition -> transition", mapWizardPhaseToEngine("transition") === "transition");
expect("phase: retired -> decum", mapWizardPhaseToEngine("retired") === "decum");

// ── validateClassifyRequest ────────────────────────────────────────────
{
  const r = validateClassifyRequest({ v: 1, mode1: {} });
  expect("classify accepts empty mode1", r.ok);
}
{
  const r = validateClassifyRequest({ v: 1 });
  expect("classify accepts missing mode1 (defaulted to {})", r.ok);
}
{
  const r = validateClassifyRequest({ v: 2, mode1: {} });
  expect("classify rejects v: 2", !r.ok && r.error.includes("v: 1"));
}
{
  const r = validateClassifyRequest({ v: 1, mode1: { phase: "weird" } });
  expect("classify rejects bad phase", !r.ok && r.error.includes("phase"));
}
{
  const r = validateClassifyRequest({ v: 1, mode1: { rentalCount: 99 } });
  expect("classify rejects rentalCount > 3", !r.ok && r.error.includes("rentalCount"));
}
{
  const r = validateClassifyRequest({
    v: 1,
    mode1: { phase: "transition", hasSpouse: true, hasCCPC: true },
  });
  expect("classify accepts coherent partial", r.ok);
}

// ── validateSaveRequest ────────────────────────────────────────────────
{
  const r = validateSaveRequest({ v: 1, sku: "bilan360", lang: "fr" });
  expect("save accepts minimum-valid", r.ok);
}
{
  const r = validateSaveRequest({ v: 1, sku: "expert", lang: "fr" });
  expect("save rejects bad sku", !r.ok && r.error.includes("sku"));
}
{
  const r = validateSaveRequest({ v: 1, sku: "planner", lang: "es" });
  expect("save rejects bad lang", !r.ok && r.error.includes("lang"));
}
{
  const r = validateSaveRequest({
    v: 1,
    draftId: "wd_abc",
    sku: "planner",
    lang: "en",
    mode1: { hasSpouse: true },
    mode2: { age: 50, prov: "QC" },
    mode3: { taxOverride: 0.45 },
  });
  expect("save accepts full draft", r.ok);
  if (r.ok) {
    expect("save preserves draftId", r.value.draftId === "wd_abc");
    expect("save preserves mode2", r.value.mode2?.age === 50);
    expect("save preserves mode3", r.value.mode3?.taxOverride === 0.45);
  }
}
{
  const r = validateSaveRequest({ v: 1, sku: "bilan360", lang: "fr", mode2: "not-an-object" });
  expect("save rejects mode2 non-object", !r.ok && r.error.includes("mode2"));
}

// ── Classifier semantics (registry sanity) ─────────────────────────────
{
  // Default profile: only "always-shown" blocks visible.
  const blocks = filterBlocksForProfile(MODE1_DEFAULT);
  const ids = blocks.map((b) => b.id);
  expect("default profile shows core-you", ids.includes("core-you"));
  expect("default profile shows core-money", ids.includes("core-money"));
  expect("default profile shows core-retirement", ids.includes("core-retirement"));
  expect("default profile shows goals", ids.includes("goals"));
  expect("default profile hides spouse", !ids.includes("spouse"));
  expect("default profile hides ccpc", !ids.includes("ccpc"));
  expect("default profile hides rentals", !ids.includes("rentals"));
}

{
  const profile = { ...MODE1_DEFAULT, hasSpouse: true, hasCCPC: true, rentalCount: 2 as const };
  const ids = filterBlocksForProfile(profile).map((b) => b.id);
  expect("complex profile shows spouse", ids.includes("spouse"));
  expect("complex profile shows ccpc", ids.includes("ccpc"));
  expect("complex profile shows rentals", ids.includes("rentals"));
  expect("complex profile shows rentals-2", ids.includes("rentals-2"));
  expect("complex profile hides rentals-3", !ids.includes("rentals-3"));
}

{
  const baseline = countFieldsFor(MODE1_DEFAULT);
  const couple = countFieldsFor({ ...MODE1_DEFAULT, hasSpouse: true });
  expect("countFieldsFor: couple > baseline", couple > baseline,
    `baseline=${baseline} couple=${couple}`);
}

// ── TTL constant matches locked decision #4 (90 days) ──────────────────
expect("WIZARD_DRAFT_TTL_SECONDS = 90 days", WIZARD_DRAFT_TTL_SECONDS === 90 * 86400);

console.log(`\n  RESULTS: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
