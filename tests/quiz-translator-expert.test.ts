// tests/quiz-translator-expert.test.ts
// 5 profile types → verify mcParams, disclosure, and defaults
// Run: npx tsx tests/quiz-translator-expert.test.ts

import assert from "node:assert";
import { translateToMCExpert } from "../lib/quiz-translator-expert";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

// ============================================================
// Profile 1: Young couple, QC, homeowner, balanced risk (Segment A)
// ============================================================
console.log("\nProfile 1: Young couple QC homeowner balanced");
(() => {
  const quiz = {
    age: 32, retAge: 65, sex: "M", prov: "QC",
    income: 85000, couple: "yes",
    cAge: 30, cSex: "F", cIncome: 60000, cRetAge: 65,
    rrsp: 45000, tfsa: 30000, nr: 10000,
    cRrsp: 20000, cTfsa: 15000, cNr: 5000,
    monthlyContrib: 1500, risk: "balanced",
    homeowner: true, homeValue: 450000, mortgage: 320000, mortgageAmort: 22,
    penType: "none", lifestyle: "active",
    sources: ["employed"], employer: "large",
    worries: ["inflation", "market"],
    parttime: "no", decaissement: "minimal",
    sophistication: "rapide",
  };
  const r = translateToMCExpert(quiz);

  test("mcParams.age = 32", () => assert.strictEqual(r.mcParams.age, 32));
  test("mcParams.retAge = 65", () => assert.strictEqual(r.mcParams.retAge, 65));
  test("mcParams.cOn = true", () => assert.strictEqual(r.mcParams.cOn, true));
  test("mcParams.prov = QC", () => assert.strictEqual(r.mcParams.prov, "QC"));
  test("mcParams.allocR ~0.70 (balanced)", () => assert.strictEqual(r.mcParams.allocR, 0.70));
  test("mcParams.rrsp = 45000", () => assert.strictEqual(r.mcParams.rrsp, 45000));
  test("mcParams.homeowner prop exists", () => assert.ok(r.mcParams.props.length >= 1));
  test("mcParams.props[0].pri = true", () => assert.strictEqual(r.mcParams.props[0].pri, true));
  test("mcParams.props[0].mb = 320000", () => assert.strictEqual(r.mcParams.props[0].mb, 320000));
  test("mcParams.penType = cd (employer=large)", () => assert.strictEqual(r.mcParams.penType, "cd"));
  test("mcParams.cAge = 30", () => assert.strictEqual(r.mcParams.cAge, 30));
  test("mcParams.split = true (couple)", () => assert.strictEqual(r.mcParams.split, true));
  test("mcParams.fatT = true (rapide)", () => assert.strictEqual(r.mcParams.fatT, true));
  test("mcParams.stochInf = true (rapide)", () => assert.strictEqual(r.mcParams.stochInf, true));
  test("mcParams.gkOn = true (rapide)", () => assert.strictEqual(r.mcParams.gkOn, true));
  test("disclosure.segment = couple", () => assert.strictEqual(r.disclosure.segment, "couple"));
  test("disclosure.tabs includes couple", () => assert.ok(r.disclosure.tabs.includes("couple")));
  test("disclosure.tabs includes immobilier", () => assert.ok(r.disclosure.tabs.includes("immobilier")));
  test("disclosure.sophistication = rapide", () => assert.strictEqual(r.disclosure.sophistication, "rapide"));
  test("defaults.allocation populated", () => assert.ok(r.defaults.allocation.length > 0));
  test("defaults.engine populated (rapide auto-fills)", () => assert.ok(r.defaults.engine.length > 0));
  test("_quiz.couple = yes", () => assert.strictEqual(r.mcParams._quiz.couple, "yes"));
  test("_report.mortBal = 320000", () => assert.strictEqual(r.mcParams._report.mortBal, 320000));
})();

// ============================================================
// Profile 2: CCPC incorporated, QC, high income (Segment B)
// ============================================================
console.log("\nProfile 2: CCPC incorporated QC high income");
(() => {
  const quiz = {
    age: 45, retAge: 60, sex: "M", prov: "QC",
    income: 150000, couple: "no",
    rrsp: 200000, tfsa: 80000, nr: 100000, lira: 50000,
    monthlyContrib: 3000, risk: "growth",
    homeowner: true, homeValue: 650000, mortgage: 200000, mortgageAmort: 12,
    penType: "none", lifestyle: "premium",
    sources: ["employed", "ccpc"], employer: "",
    bizRevenue: 400000, bizExpenses: 250000, bizBNR: 300000,
    bizRemun: "mix", bizSalaryPct: 40, bizGrowth: 3,
    bizInvAlloc: 50, bizExtractYrs: 15,
    worries: ["tax", "impot"],
    parttime: "no", decaissement: "meltdown",
    sophistication: "avance",
  };
  const r = translateToMCExpert(quiz);

  test("mcParams.bizOn = true", () => assert.strictEqual(r.mcParams.bizOn, true));
  test("mcParams.bizRevenue = 400000", () => assert.strictEqual(r.mcParams.bizRevenue, 400000));
  test("mcParams.bizRetainedEarnings = 300000", () => assert.strictEqual(r.mcParams.bizRetainedEarnings, 300000));
  test("mcParams.bizRemun = mix", () => assert.strictEqual(r.mcParams.bizRemun, "mix"));
  test("mcParams.allocR = 0.85 (growth)", () => assert.strictEqual(r.mcParams.allocR, 0.85));
  test("mcParams.melt = true (meltdown)", () => assert.strictEqual(r.mcParams.melt, true));
  test("mcParams.liraBal = 50000", () => assert.strictEqual(r.mcParams.liraBal, 50000));
  test("disclosure.segment = ccpc", () => assert.strictEqual(r.disclosure.segment, "ccpc"));
  test("disclosure.tabs includes entreprise", () => assert.ok(r.disclosure.tabs.includes("entreprise")));
  test("disclosure.tabs includes fiscalite", () => assert.ok(r.disclosure.tabs.includes("fiscalite")));
  test("disclosure.tabs includes optimiseur (growth)", () => assert.ok(r.disclosure.tabs.includes("optimiseur")));
  test("disclosure.sophistication = avance", () => assert.strictEqual(r.disclosure.sophistication, "avance"));
  test("defaults.engine populated (avance)", () => assert.ok(r.defaults.engine.length > 0));
  test("_quiz.segment = ccpc", () => assert.strictEqual(r.mcParams._quiz.segment, "ccpc"));
  test("_report.bizOn = true", () => assert.strictEqual(r.mcParams._report.bizOn, true));
})();

// ============================================================
// Profile 3: Pre-retiree 58, ON, DB pension, gov employee (Segment C)
// ============================================================
console.log("\nProfile 3: Pre-retiree 58 ON DB pension gov");
(() => {
  const quiz = {
    age: 58, retAge: 63, sex: "F", prov: "ON",
    income: 95000, couple: "yes",
    cAge: 56, cSex: "M", cIncome: 80000, cRetAge: 65,
    cRrsp: 50000, cTfsa: 40000, cNr: 20000,
    rrsp: 300000, tfsa: 100000, nr: 50000,
    monthlyContrib: 2000, risk: "conservative",
    homeowner: true, homeValue: 800000, mortgage: 100000, mortgageAmort: 8,
    penType: "db", penM: 3500, penIdx: true, penYrs: 30,
    employer: "gov",
    lifestyle: "cozy",
    sources: ["employed"],
    worries: ["longevity"],
    parttime: "maybe", parttimeAmount: 1200,
    decaissement: "minimal",
    sophistication: "personnalise",
    toggleMort: true, toggleFatT: true, toggleInf: false, toggleGK: false, toggleGlide: true,
  };
  const r = translateToMCExpert(quiz);

  test("mcParams.age = 58", () => assert.strictEqual(r.mcParams.age, 58));
  test("mcParams.prov = ON", () => assert.strictEqual(r.mcParams.prov, "ON"));
  test("mcParams.penType = db", () => assert.strictEqual(r.mcParams.penType, "db"));
  test("mcParams.penM = 3500 (explicit)", () => assert.strictEqual(r.mcParams.penM, 3500));
  test("mcParams.penIdx = true", () => assert.strictEqual(r.mcParams.penIdx, true));
  test("mcParams.allocR = 0.50 (conservative)", () => assert.strictEqual(r.mcParams.allocR, 0.50));
  test("mcParams.retSpM based on cozy + ON col", () => {
    assert.ok(r.mcParams.retSpM > 3000); // 3000 * 1.15 = 3450
    assert.ok(r.mcParams.retSpM <= 3500);
  });
  test("mcParams.ptM > 0 (parttime=maybe)", () => assert.ok(r.mcParams.ptM > 0));
  test("mcParams.stochInf = false (personnalise toggle)", () => assert.strictEqual(r.mcParams.stochInf, false));
  test("mcParams.gkOn = false (personnalise toggle)", () => assert.strictEqual(r.mcParams.gkOn, false));
  test("mcParams.stochMort = true (personnalise toggle)", () => assert.strictEqual(r.mcParams.stochMort, true));
  test("disclosure.segment = preretiree", () => assert.strictEqual(r.disclosure.segment, "preretiree"));
  test("disclosure.tabs includes couple", () => assert.ok(r.disclosure.tabs.includes("couple")));
  test("disclosure.tabs includes strategie (db pension)", () => assert.ok(r.disclosure.tabs.includes("strategie")));
  test("disclosure.tabs includes immobilier", () => assert.ok(r.disclosure.tabs.includes("immobilier")));
  test("defaults.spending populated", () => assert.ok(r.defaults.spending.length > 0));
  test("_quiz.employer = gov", () => assert.strictEqual(r.mcParams._quiz.employer, "gov"));
})();

// ============================================================
// Profile 4: FIRE 34, QC, aggressive, early retirement (Segment D)
// ============================================================
console.log("\nProfile 4: FIRE 34 QC aggressive early retirement");
(() => {
  const quiz = {
    age: 34, retAge: 45, sex: "M", prov: "QC",
    income: 120000, couple: "no",
    rrsp: 80000, tfsa: 60000, nr: 150000,
    monthlyContrib: 4000, risk: "growth",
    homeowner: false,
    penType: "none",
    lifestyle: "active",
    sources: ["employed"], employer: "tech",
    worries: ["market"],
    parttime: "yes", parttimeAmount: 2000, parttimeYears: 5,
    decaissement: "meltdown",
    sophistication: "rapide",
    fireTarget: true,
  };
  const r = translateToMCExpert(quiz);

  test("mcParams.retAge = 45 (early)", () => assert.strictEqual(r.mcParams.retAge, 45));
  test("mcParams.allocR = 0.85 (growth)", () => assert.strictEqual(r.mcParams.allocR, 0.85));
  test("mcParams.melt = true", () => assert.strictEqual(r.mcParams.melt, true));
  test("mcParams.ptM = 2000", () => assert.strictEqual(r.mcParams.ptM, 2000));
  test("mcParams.ptYrs = 5", () => assert.strictEqual(r.mcParams.ptYrs, 5));
  test("mcParams.props empty (renter)", () => assert.strictEqual(r.mcParams.props.length, 0));
  test("mcParams.penType = cd (employer=tech)", () => assert.strictEqual(r.mcParams.penType, "cd"));
  test("mcParams.dcBal auto-filled (tech employer)", () => assert.ok(r.mcParams.dcBal > 0));
  test("mcParams.nr = 150000", () => assert.strictEqual(r.mcParams.nr, 150000));
  test("disclosure.segment = fire", () => assert.strictEqual(r.disclosure.segment, "fire"));
  test("disclosure.tabs includes optimiseur (fire)", () => assert.ok(r.disclosure.tabs.includes("optimiseur")));
  test("defaults.pension includes dcBal", () => assert.ok(r.defaults.pension.includes("dcBal")));
  test("_quiz.fireTarget = true", () => assert.strictEqual(r.mcParams._quiz.fireTarget, true));
})();

// ============================================================
// Profile 5: Single renter, AB, conservative, no pension (baseline)
// ============================================================
console.log("\nProfile 5: Single renter AB conservative baseline");
(() => {
  const quiz = {
    age: 40, retAge: 65, sex: "F", prov: "AB",
    income: 55000, couple: "no",
    rrsp: 20000, tfsa: 15000, nr: 5000,
    monthlyContrib: 500, risk: "conservative",
    homeowner: false,
    penType: "none",
    lifestyle: "cozy",
    sources: ["employed"], employer: "",
    worries: [],
    parttime: "no",
    decaissement: "minimal",
    sophistication: "rapide",
  };
  const r = translateToMCExpert(quiz);

  test("mcParams.age = 40", () => assert.strictEqual(r.mcParams.age, 40));
  test("mcParams.prov = AB", () => assert.strictEqual(r.mcParams.prov, "AB"));
  test("mcParams.sal = 55000", () => assert.strictEqual(r.mcParams.sal, 55000));
  test("mcParams.allocR = 0.50 (conservative)", () => assert.strictEqual(r.mcParams.allocR, 0.50));
  test("mcParams.cOn = false", () => assert.strictEqual(r.mcParams.cOn, false));
  test("mcParams.penType = none", () => assert.strictEqual(r.mcParams.penType, "none"));
  test("mcParams.props empty", () => assert.strictEqual(r.mcParams.props.length, 0));
  test("mcParams.debts empty", () => assert.strictEqual(r.mcParams.debts.length, 0));
  test("mcParams.ptM = 0", () => assert.strictEqual(r.mcParams.ptM, 0));
  test("mcParams.melt = false", () => assert.strictEqual(r.mcParams.melt, false));
  test("mcParams.split = false (no couple)", () => assert.strictEqual(r.mcParams.split, false));
  test("mcParams.retSpM based on cozy + AB col", () => {
    assert.ok(r.mcParams.retSpM >= 3000); // 3000 * 1.05 = 3150
    assert.ok(r.mcParams.retSpM <= 3200);
  });
  test("disclosure.segment = couple (default)", () => assert.strictEqual(r.disclosure.segment, "couple"));
  test("disclosure.tabs has 5 base tabs", () => assert.ok(r.disclosure.tabs.length >= 5));
  test("disclosure.tabs NOT includes couple", () => assert.ok(!r.disclosure.tabs.includes("couple")));
  test("defaults.savings populated", () => assert.ok(r.defaults.savings.length > 0));
  test("defaults.allocation populated", () => assert.ok(r.defaults.allocation.length > 0));
  test("_quiz.risk = conservative", () => assert.strictEqual(r.mcParams._quiz.risk, "conservative"));
  test("_report.totalLiquidSavings = 40000", () => assert.strictEqual(r.mcParams._report.totalLiquidSavings, 40000));
})();

// ============================================================
// Summary
// ============================================================
console.log(`\n${"═".repeat(50)}`);
console.log(`Quiz Translator Expert: ${passed} passed, ${failed} failed out of ${passed + failed}`);
console.log(`${"═".repeat(50)}`);
if (failed > 0) process.exit(1);
