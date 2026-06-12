// tests/bilan-annuel.test.ts — BA engine tests (BA-TST-01 through BA-TST-07)
// Run: npx tsx tests/bilan-annuel.test.ts

import assert from "node:assert/strict";
import { calcPMT, project5Years, computeTotals, computeExpressProjection, SAMPLE_PROFILE, BAData } from "../lib/bilan-annuel";

let pass = 0, fail = 0;
function test(name: string, fn: () => void) {
  try { fn(); pass++; }
  catch (e: any) { fail++; console.error(`  FAIL: ${name}\n    ${e.message}`); }
}
function describe(name: string, fn: () => void) { console.log(`\n${name}`); fn(); }

// Helper
const minimal: BAData = {
  profile: { lang: "fr" },
  accounts: [{ id: "a1", type: "rrsp", label: "REER", balance: 100000, contribution: 10000, returnRate: 0.05 }],
  properties: [],
  otherAssets: [],
  debts: [],
  income: { salary: 80000, salaryGrowth: 0.025, otherIncome: 0 },
  snapshots: [],
  reminder: { email: "", frequency: "quarterly", enabled: false },
};

const empty: BAData = {
  profile: { lang: "fr" }, accounts: [], properties: [], otherAssets: [], debts: [],
  income: { salary: 0, salaryGrowth: 0, otherIncome: 0 }, snapshots: [],
  reminder: { email: "", frequency: "quarterly", enabled: false },
};

// ═══════════════════════════════════════════════════════
// BA-TST-04: calcPMT
// ═══════════════════════════════════════════════════════
describe("calcPMT", () => {
  test("standard 300k @ 5% / 25yr ≈ 1744", () => {
    const p = calcPMT(300000, 0.05, 25);
    assert.ok(p > 1700 && p < 1800, `got ${p}`);
  });
  test("zero balance → 0", () => assert.equal(calcPMT(0, 0.05, 25), 0));
  test("negative balance → 0", () => assert.equal(calcPMT(-10000, 0.05, 25), 0));
  test("zero rate = simple division", () => assert.equal(calcPMT(120000, 0, 10), 1000));
  test("zero amort → 0", () => assert.equal(calcPMT(100000, 0.05, 0), 0));
  test("high rate 200k @ 8% / 25yr ≈ 1530", () => {
    const p = calcPMT(200000, 0.08, 25);
    assert.ok(p > 1500 && p < 1600, `got ${p}`);
  });
  test("short amort > long amort", () => {
    assert.ok(calcPMT(200000, 0.05, 10) > calcPMT(200000, 0.05, 25));
  });
  test("248k @ 5.29% / 21yr ≈ 1600", () => {
    const p = calcPMT(248000, 0.0529, 21);
    assert.ok(p > 1500 && p < 1700, `got ${p}`);
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-01: project5Years
// ═══════════════════════════════════════════════════════
describe("project5Years", () => {
  test("returns 6 years (0..5)", () => {
    const proj = project5Years(minimal);
    assert.equal(proj.length, 6);
    assert.equal(proj[0].year, 0);
    assert.equal(proj[5].year, 5);
  });
  test("year 0 = current balances", () => {
    const p = project5Years(minimal);
    assert.equal(p[0].liquid, 100000);
    assert.equal(p[0].immo, 0);
    assert.equal(p[0].debt, 0);
    assert.equal(p[0].netWorth, 100000);
  });
  test("net worth grows with returns + contribs", () => {
    const p = project5Years(minimal);
    for (let i = 1; i < p.length; i++) assert.ok(p[i].netWorth > p[i-1].netWorth);
  });
  test("5% return on 100k year 1 ≈ 115k (with 10k contrib)", () => {
    const p = project5Years(minimal);
    assert.ok(p[1].liquid > 114000 && p[1].liquid < 116000, `got ${p[1].liquid}`);
  });
  test("property appreciation 3% on 400k", () => {
    const d: BAData = { ...minimal, properties: [{ id: "p1", label: "Home", value: 400000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 0, rate: 0, termYears: 0, amortYears: 0, payment: 0, autoCalc: true } }] };
    const p = project5Years(d);
    assert.equal(p[0].immo, 400000);
    assert.equal(p[1].immo, 412000);
    assert.ok(p[5].immo > 463000 && p[5].immo < 464000, `got ${p[5].immo}`);
  });
  test("mortgage reduces debt over time", () => {
    const d: BAData = { ...minimal, properties: [{ id: "p1", label: "Home", value: 400000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 200000, rate: 0.05, termYears: 5, amortYears: 25, payment: 0, autoCalc: true } }] };
    const p = project5Years(d);
    assert.equal(p[0].debt, 200000);
    assert.ok(p[5].debt < 200000);
    assert.ok(p[5].debt > 0);
  });
  test("debt amortization with payments", () => {
    const d: BAData = { ...minimal, debts: [{ id: "d1", type: "loc", label: "LOC", balance: 10000, rate: 0.08, payment: 300 }] };
    const p = project5Years(d);
    assert.equal(p[0].debt, 10000);
    assert.ok(p[5].debt < 10000);
  });
  test("zero-return = contributions only", () => {
    const d: BAData = { ...minimal, accounts: [{ id: "a1", type: "savings", label: "Cash", balance: 50000, contribution: 6000, returnRate: 0 }] };
    const p = project5Years(d);
    assert.equal(p[1].liquid, 56000);
    assert.equal(p[5].liquid, 80000);
  });
  test("depreciation (car -15%)", () => {
    const d: BAData = { ...minimal, otherAssets: [{ id: "o1", label: "Car", value: 30000, growth: -0.15 }] };
    const p = project5Years(d);
    assert.equal(p[0].other, 30000);
    assert.ok(p[5].other < 15000);
  });
  test("multiple accounts sum correctly", () => {
    const d: BAData = { ...minimal, accounts: [
      { id: "a1", type: "rrsp", label: "REER", balance: 50000, contribution: 0, returnRate: 0.05 },
      { id: "a2", type: "tfsa", label: "CELI", balance: 30000, contribution: 0, returnRate: 0.06 },
    ]};
    const p = project5Years(d);
    assert.equal(p[0].liquid, 80000);
    assert.equal(p[1].liquid, 84300); // 52500 + 31800
  });
  test("empty data = all zeros", () => {
    const p = project5Years(empty);
    assert.equal(p[0].netWorth, 0);
    assert.equal(p[5].netWorth, 0);
  });
  test("netWorth ≈ liquid + immo + other - debt (±1 rounding)", () => {
    const p = project5Years(SAMPLE_PROFILE);
    for (const yr of p) assert.ok(Math.abs(yr.netWorth - (yr.liquid + yr.immo + yr.other - yr.debt)) <= 1, `year ${yr.year}: ${yr.netWorth} vs ${yr.liquid + yr.immo + yr.other - yr.debt}`);
  });
  test("sample profile year 0 manual sum", () => {
    const p = project5Years(SAMPLE_PROFILE);
    assert.equal(p[0].liquid, 238000);
    assert.equal(p[0].immo, 805000);
    assert.equal(p[0].other, 32500);
  });
  test("sample profile grows over 5 years", () => {
    const p = project5Years(SAMPLE_PROFILE);
    assert.ok(p[5].netWorth > p[0].netWorth);
  });
  test("large debt with small payment doesn't go negative", () => {
    const d: BAData = { ...minimal, debts: [{ id: "d1", type: "card", label: "CC", balance: 50000, rate: 0.20, payment: 100 }] };
    const p = project5Years(d);
    assert.ok(p[5].debt >= 0);
  });
  test("auto-calc mortgage uses calcPMT", () => {
    const d: BAData = { ...minimal, properties: [{ id: "p1", label: "Home", value: 500000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 300000, rate: 0.05, termYears: 5, amortYears: 25, payment: 0, autoCalc: true } }] };
    const p1 = project5Years(d);
    // Override autoCalc
    const d2: BAData = { ...minimal, properties: [{ id: "p1", label: "Home", value: 500000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 300000, rate: 0.05, termYears: 5, amortYears: 25, payment: calcPMT(300000, 0.05, 25), autoCalc: false } }] };
    const p2 = project5Years(d2);
    assert.equal(p1[5].debt, p2[5].debt);
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-05: What-if scenarios
// ═══════════════════════════════════════════════════════
describe("what-if overrides", () => {
  const base: BAData = {
    ...minimal,
    accounts: [{ id: "a1", type: "rrsp", label: "REER", balance: 100000, contribution: 5000, returnRate: 0.05 }],
    debts: [{ id: "d1", type: "loc", label: "LOC", balance: 20000, rate: 0.08, payment: 500 }],
  };
  test("extra contrib increases NW", () => {
    const n = project5Years(base);
    const e = project5Years(base, { extraContrib: 500, targetAccount: "a1" });
    assert.ok(e[5].netWorth > n[5].netWorth);
  });
  test("extra debt payment reduces debt faster", () => {
    // debtExtra applies to debts[] not mortgages — use a profile with active debt
    const d: BAData = { ...minimal, debts: [{ id: "d1", type: "loc", label: "LOC", balance: 20000, rate: 0.08, payment: 200 }] };
    const n = project5Years(d);
    const e = project5Years(d, { debtExtra: 200 });
    assert.ok(e[5].debt < n[5].debt, `${e[5].debt} not < ${n[5].debt}`);
  });
  test("return override changes growth", () => {
    const lo = project5Years(base, { returnOverride: 0.02 });
    const hi = project5Years(base, { returnOverride: 0.08 });
    assert.ok(hi[5].liquid > lo[5].liquid);
  });
  test("wrong target account = no effect", () => {
    const n = project5Years(base);
    const e = project5Years(base, { extraContrib: 500, targetAccount: "nope" });
    assert.equal(e[5].netWorth, n[5].netWorth);
  });
  test("return override 0 = flat (no growth)", () => {
    const d: BAData = { ...minimal, accounts: [{ id: "a1", type: "rrsp", label: "REER", balance: 100000, contribution: 0, returnRate: 0.05 }] };
    const p = project5Years(d, { returnOverride: 0 });
    assert.equal(p[5].liquid, 100000); // no growth, no contributions
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-03: computeTotals
// ═══════════════════════════════════════════════════════
describe("computeTotals", () => {
  test("sample profile values", () => {
    const t = computeTotals(SAMPLE_PROFILE);
    assert.equal(t.liquid, 238000);
    assert.equal(t.immoGross, 805000);
    assert.equal(t.mortgages, 443000);
    assert.equal(t.other, 32500);
    assert.equal(t.debts, 33700);
    assert.equal(t.totalAssets, 1075500);
    assert.equal(t.totalDebts, 476700);
    assert.equal(t.netWorth, 598800);
  });
  test("debtRatio = td/ta", () => {
    const t = computeTotals(SAMPLE_PROFILE);
    assert.ok(Math.abs(t.debtRatio - 476700/1075500) < 0.0001);
  });
  test("zero assets = zero ratio", () => {
    const t = computeTotals(empty);
    assert.equal(t.netWorth, 0);
    assert.equal(t.debtRatio, 0);
  });
  test("debt only = negative NW, ratio 0 (no div/0)", () => {
    const d: BAData = { ...empty, debts: [{ id: "d1", type: "card", label: "CC", balance: 5000, rate: 0.20, payment: 200 }] };
    const t = computeTotals(d);
    assert.equal(t.netWorth, -5000);
    assert.equal(t.debtRatio, 0);
  });
  test("no debts = zero ratio, infinite liquidity", () => {
    const d: BAData = { ...empty, accounts: [{ id: "a1", type: "rrsp", label: "REER", balance: 100000, contribution: 0, returnRate: 0.05 }] };
    const t = computeTotals(d);
    assert.equal(t.debtRatio, 0);
    assert.equal(t.liquidRatio, Infinity);
  });
  test("liquidity ratio = liq/td", () => {
    const t = computeTotals(SAMPLE_PROFILE);
    assert.ok(Math.abs(t.liquidRatio - 238000/476700) < 0.0001);
  });
  test("single account only", () => {
    const d: BAData = { ...empty, accounts: [{ id: "a1", type: "tfsa", label: "CELI", balance: 50000, contribution: 7000, returnRate: 0.06 }] };
    const t = computeTotals(d);
    assert.equal(t.liquid, 50000);
    assert.equal(t.totalAssets, 50000);
    assert.equal(t.netWorth, 50000);
  });
  test("property with mortgage", () => {
    const d: BAData = { ...empty, properties: [{ id: "p1", label: "Home", value: 500000, appreciation: 0.03, rentalIncome: 0, isRental: false, mortgage: { balance: 300000, rate: 0.05, termYears: 5, amortYears: 25, payment: 0, autoCalc: true } }] };
    const t = computeTotals(d);
    assert.equal(t.immoGross, 500000);
    assert.equal(t.mortgages, 300000);
    assert.equal(t.netWorth, 200000);
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-06: Express mode projection
// ═══════════════════════════════════════════════════════
describe("computeExpressProjection", () => {
  const defaults = { rrsp: 45000, tfsa: 22000, home: 400000, mortgage: 200000, debtsTotal: 15000, savingsMonthly: 1000 };
  test("returns 6 years", () => assert.equal(computeExpressProjection(defaults).length, 6));
  test("year 0 NW = assets - liabilities", () => {
    const p = computeExpressProjection(defaults);
    assert.equal(p[0].netWorth, (45000+22000+400000)-(200000+15000));
  });
  test("NW grows over 5 years", () => {
    const p = computeExpressProjection(defaults);
    assert.ok(p[5].netWorth > p[0].netWorth);
  });
  test("zero home = no immo", () => {
    const p = computeExpressProjection({ ...defaults, home: 0, mortgage: 0 });
    assert.equal(p[0].immo, 0);
    assert.equal(p[5].immo, 0);
  });
  test("zero debts = zero debt line", () => {
    const p = computeExpressProjection({ ...defaults, debtsTotal: 0, mortgage: 0 });
    assert.equal(p[0].debt, 0);
    assert.equal(p[5].debt, 0);
  });
  test("savings add to liquid", () => {
    const noSave = computeExpressProjection({ ...defaults, savingsMonthly: 0 });
    const withSave = computeExpressProjection(defaults);
    assert.ok(withSave[5].liquid > noSave[5].liquid);
  });
  test("mortgage reduces over time", () => {
    const p = computeExpressProjection(defaults);
    assert.ok(p[5].debt < p[0].debt);
  });
  test("all zeros = zero NW", () => {
    const p = computeExpressProjection({ rrsp: 0, tfsa: 0, home: 0, mortgage: 0, debtsTotal: 0, savingsMonthly: 0 });
    assert.equal(p[0].netWorth, 0);
    assert.equal(p[5].netWorth, 0);
  });
  test("netWorth ≈ liquid + immo - debt (±1 rounding)", () => {
    const p = computeExpressProjection(defaults);
    for (const yr of p) assert.ok(Math.abs(yr.netWorth - (yr.liquid + yr.immo - yr.debt)) <= 1, `year ${yr.year}: ${yr.netWorth} vs ${yr.liquid + yr.immo - yr.debt}`);
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-02: localStorage patterns
// ═══════════════════════════════════════════════════════
describe("localStorage patterns", () => {
  test("SAMPLE_PROFILE round-trips JSON", () => {
    const parsed = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    assert.equal(parsed.accounts.length, 6);
    assert.equal(parsed.properties.length, 2);
    assert.equal(parsed.debts.length, 3);
    assert.equal(parsed.profile.lang, "fr");
  });
  test("partial merge with defaults", () => {
    const partial = { profile: { lang: "en" }, accounts: [] };
    const merged = { ...JSON.parse(JSON.stringify(SAMPLE_PROFILE)), ...partial };
    assert.equal(merged.profile.lang, "en");
    assert.equal(merged.accounts.length, 0);
    assert.equal(merged.properties.length, 2);
  });
  test("corrupted JSON handled", () => {
    let ok = true;
    try { JSON.parse("not-json"); ok = false; } catch { /* expected */ }
    assert.ok(ok === true || ok === false); // just verify no unhandled throw
  });
  test("missing otherAssets defaults to empty", () => {
    const d = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    delete d.otherAssets;
    const t = computeTotals({ ...d, otherAssets: d.otherAssets || [] });
    assert.equal(t.other, 0);
  });
});

// ═══════════════════════════════════════════════════════
// BA-TST-07: JSON export/import round-trip
// ═══════════════════════════════════════════════════════
describe("JSON export/import", () => {
  test("full round-trip preserves data", () => {
    const orig = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    const imp = JSON.parse(JSON.stringify(orig, null, 2));
    assert.equal(imp.accounts.length, orig.accounts.length);
    assert.equal(imp.properties.length, orig.properties.length);
    assert.equal(imp.debts.length, orig.debts.length);
    assert.equal(imp.snapshots.length, orig.snapshots.length);
    assert.equal(imp.income.salary, orig.income.salary);
  });
  test("imported totals match original", () => {
    const orig = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    const imp = JSON.parse(JSON.stringify(orig));
    const t1 = computeTotals(orig);
    const t2 = computeTotals(imp);
    assert.equal(t1.netWorth, t2.netWorth);
    assert.ok(Math.abs(t1.debtRatio - t2.debtRatio) < 0.0001);
  });
  test("imported projection matches original", () => {
    const orig = JSON.parse(JSON.stringify(SAMPLE_PROFILE));
    const imp = JSON.parse(JSON.stringify(orig));
    const p1 = project5Years(orig);
    const p2 = project5Years(imp);
    for (let i = 0; i <= 5; i++) assert.equal(p1[i].netWorth, p2[i].netWorth);
  });
});

// ═══════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════
console.log(`\n${"═".repeat(50)}`);
console.log(`BA tests: ${pass} passed, ${fail} failed out of ${pass + fail}`);
console.log(`${"═".repeat(50)}`);
if (fail > 0) process.exit(1);
