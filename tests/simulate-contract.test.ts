/**
 * tests/simulate-contract.test.ts
 *
 * Smoke test for the v1 /api/simulate JSON contract validator + hash.
 * Run with: npx tsx tests/simulate-contract.test.ts
 */

import { validateSimulateRequest, stableHashParams } from "../lib/schemas/engine";

let passed = 0;
let failed = 0;

function expect(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${name}${detail ? "  -- " + detail : ""}`); }
}

// 1. Reject non-object body
{
  const r = validateSimulateRequest("nope" as unknown);
  expect("rejects non-object body", !r.ok && r.error.includes("JSON object"));
}

// 2. Reject missing v
{
  const r = validateSimulateRequest({ params: { age: 50, retAge: 65, sex: "M", prov: "QC" } });
  expect("rejects missing v", !r.ok && r.error.includes("contract version"));
}

// 3. Reject wrong v
{
  const r = validateSimulateRequest({ v: 2, params: { age: 50, retAge: 65, sex: "M", prov: "QC" } });
  expect("rejects v: 2", !r.ok && r.error.includes("v: 1"));
}

// 4. Reject missing params
{
  const r = validateSimulateRequest({ v: 1 });
  expect("rejects missing params", !r.ok && r.error.includes("params"));
}

// 5. Reject bad province
{
  const r = validateSimulateRequest({ v: 1, params: { age: 50, retAge: 65, sex: "M", prov: "USA" } });
  expect("rejects bad prov", !r.ok && r.error.includes("prov"));
}

// 6. Reject bad sex
{
  const r = validateSimulateRequest({ v: 1, params: { age: 50, retAge: 65, sex: "X", prov: "QC" } });
  expect("rejects bad sex", !r.ok && r.error.includes("sex"));
}

// 7. Reject retAge <= age
{
  const r = validateSimulateRequest({ v: 1, params: { age: 60, retAge: 55, sex: "F", prov: "ON" } });
  expect("rejects retAge<=age", !r.ok && r.error.includes("retAge"));
}

// 8. Reject age < 18
{
  const r = validateSimulateRequest({ v: 1, params: { age: 16, retAge: 65, sex: "F", prov: "ON" } });
  expect("rejects age<18", !r.ok && r.error.includes("18"));
}

// 9. Accept minimum-valid request
{
  const r = validateSimulateRequest({ v: 1, params: { age: 50, retAge: 65, sex: "M", prov: "QC" } });
  expect("accepts minimum-valid", r.ok);
  if (r.ok) {
    expect("defaults deathAge to 90", (r.value.params as { deathAge: number }).deathAge === 90);
  }
}

// 10. Accept with options
{
  const r = validateSimulateRequest({
    v: 1,
    params: { age: 35, retAge: 60, sex: "F", prov: "BC", deathAge: 95 },
    options: { paths: 5000, deterministic: true, withAI: false },
  });
  expect("accepts with options", r.ok);
  if (r.ok) {
    expect("preserves options.paths", r.value.options?.paths === 5000);
    expect("preserves options.deterministic", r.value.options?.deterministic === true);
  }
}

// 11. Accept with wizardId
{
  const r = validateSimulateRequest({
    v: 1,
    wizardId: "wiz_abc123",
    params: { age: 40, retAge: 65, sex: "M", prov: "AB" },
  });
  expect("accepts wizardId", r.ok && r.value.wizardId === "wiz_abc123");
}

async function runHashTests() {
  // 12. Hash determinism -- same params + paths -> same hash
  const p1 = { age: 50, retAge: 65, sex: "M" as const, prov: "QC" as const };
  const p2 = { prov: "QC" as const, sex: "M" as const, retAge: 65, age: 50 }; // reordered
  const h1 = await stableHashParams(p1, 1000);
  const h2 = await stableHashParams(p2, 1000);
  expect("hash is key-order stable", h1 === h2, `${h1} vs ${h2}`);
  expect("hash length is 32", h1.length === 32);

  // 13. Hash collision-resistance -- different paths -> different hash
  const p = { age: 50, retAge: 65, sex: "M" as const, prov: "QC" as const };
  const ha = await stableHashParams(p, 1000);
  const hb = await stableHashParams(p, 5000);
  expect("hash includes paths", ha !== hb);
}

runHashTests().then(() => {
  console.log(`\n  RESULTS: ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
});
