// S3 API route tests — direct function testing (no HTTP server needed)
// Tests: simulate, optimize, compare logic using 5 profiles
// Run: npx tsx tests/s3-api.test.ts

import { runMC } from "../lib/engine";
import { translateToMCExpert } from "../lib/quiz-translator-expert";
import {
  gradeFromSuccess,
  formatMCResults,
  formatMCCompact,
  validateBaseParams,
} from "../lib/api-helpers";

// ── 5 test profiles (same as translator-expert-test.ts) ──────

const profiles: Record<string, Record<string, any>> = {
  youngPro: {
    age: 34, retAge: 45, sex: "M", prov: "QC", income: 110000,
    couple: "no", sources: ["employed"], employer: "tech",
    rrsp: 80000, tfsa: 95000, nr: 40000, monthlyContrib: 3000,
    lifestyle: "cozy", risk: "growth", allocCustom: 90,
    parttime: "no", worries: ["runout", "market"],
    objective: "early", confidence: 5, decaissement: "meltdown",
    homeowner: false, hasRental: false, debts: [],
    sophistication: "avance", fireTarget: true,
  },
  coupleDB: {
    age: 48, retAge: 63, sex: "M", prov: "QC", income: 80000,
    couple: "yes", cAge: 46, cSex: "F", cIncome: 65000,
    cRetAge: 63, cPenType: "none", cQppAge: 65, cOasAge: 65,
    sources: ["employed"], employer: "large",
    rrsp: 60000, tfsa: 40000, nr: 10000, monthlyContrib: 800,
    cRrsp: 50000, cTfsa: 30000, cNr: 0,
    lifestyle: "active", risk: "balanced",
    parttime: "maybe", worries: ["tax", "health", "runout"],
    objective: "enjoy", confidence: 3, decaissement: "minimal",
    homeowner: true, homeValue: 450000, mortgage: 180000, mortgageAmort: 15,
    hasRental: false, debts: [],
    penType: "none", sophistication: "rapide",
    lifeInsBenefit: 200000, lifeInsPremium: 80,
  },
  ccpcOptim: {
    age: 42, retAge: 60, sex: "M", prov: "QC", income: 80000,
    couple: "no", sources: ["employed", "ccpc"],
    rrsp: 30000, tfsa: 50000, nr: 20000, monthlyContrib: 500,
    bizRevenue: 200000, bizExpenses: 50000, bizBNR: 350000,
    bizRemun: "mix", bizSalaryPct: 50, bizGrowth: 3,
    lifestyle: "active", risk: "balanced",
    parttime: "no", worries: ["tax"],
    objective: "optimize", confidence: 4, decaissement: "meltdown",
    homeowner: true, homeValue: 550000, mortgage: 200000, mortgageAmort: 18,
    hasRental: true, rentalValue: 300000, rentalMortgage: 150000,
    rentalIncome: 24000, rentalExpenses: 8000, rentalVacancy: 5,
    debts: [{ type: "loc", amount: 15000, rate: 7.5, minPayment: 200 }],
    sophistication: "personnalise",
    toggleMort: true, toggleFatT: true, toggleInf: true, toggleGK: false, toggleGlide: true,
    inheritAmt: 100000, inheritAge: 65,
  },
  preretireeDB: {
    age: 58, retAge: 63, sex: "M", prov: "ON", income: 95000,
    couple: "yes", cAge: 56, cSex: "F", cIncome: 50000,
    cRetAge: 63, cPenType: "db", cPenM: 1500, cQppAge: 65, cOasAge: 65,
    sources: ["employed"], employer: "gov",
    rrsp: 280000, tfsa: 95000, nr: 30000, monthlyContrib: 1200,
    cRrsp: 120000, cTfsa: 60000, cNr: 10000,
    lifestyle: "active", risk: "conservative",
    parttime: "no", worries: ["inflation", "health", "legacy"],
    objective: "protect", confidence: 3, decaissement: "needs",
    penType: "db", penM: 3500, penYrs: 30, penIdx: true, penBridge: true,
    homeowner: true, homeValue: 600000, mortgage: 0, mortgageAmort: 0,
    hasRental: false, debts: [],
    qppAge: 65, oasAge: 67,
    sophistication: "rapide",
    lifeInsBenefit: 500000, lifeInsPremium: 200, lifeInsType: "term", lifeInsDuration: 10,
    succObjective: "maximize",
    respKids: 2, respKidAges: "14, 17", respBal: 45000, respC: 5000,
  },
  standard: {
    age: 40, retAge: 65, sex: "F", prov: "BC", income: 75000,
    couple: "no", sources: ["employed"], employer: "small",
    rrsp: 35000, tfsa: 25000, nr: 5000, monthlyContrib: 500,
    lifestyle: "active", risk: "balanced",
    parttime: "no", worries: ["runout"],
    objective: "enjoy", confidence: 3, decaissement: "minimal",
    homeowner: true, homeValue: 750000, mortgage: 400000, mortgageAmort: 22,
    hasRental: false, debts: [{ type: "cc", amount: 3000, rate: 19.99, minPayment: 60 }],
    sophistication: "rapide",
  },
};

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean) {
  if (ok) {
    pass++;
  } else {
    console.error(`  FAIL ${label}`);
    fail++;
  }
}

// ── Test 1: Helper functions ─────────────────────────────────

console.log("--- Helper functions ---");
check("grade A+", gradeFromSuccess(0.97) === "A+");
check("grade A", gradeFromSuccess(0.92) === "A");
check("grade A-", gradeFromSuccess(0.87) === "A-");
check("grade B+", gradeFromSuccess(0.82) === "B+");
check("grade B", gradeFromSuccess(0.72) === "B");
check("grade C", gradeFromSuccess(0.55) === "C");
check("grade D", gradeFromSuccess(0.40) === "D");
check("grade F", gradeFromSuccess(0.25) === "F");

check("validate: missing age", validateBaseParams({ retAge: 65, sex: "M", prov: "QC" }) !== null);
check("validate: bad prov", validateBaseParams({ age: 40, retAge: 65, sex: "M", prov: "XX" }) !== null);
check("validate: ok", validateBaseParams({ age: 40, retAge: 65, sex: "M", prov: "QC" }) === null);
check("validate: retAge <= age", validateBaseParams({ age: 65, retAge: 60, sex: "M", prov: "QC" }) !== null);

// ── Test 2: Simulate — full MC for each profile ─────────────

console.log("\n--- Simulate (5 profiles × 1000 sims) ---");

for (const [name, quiz] of Object.entries(profiles)) {
  try {
    const { mcParams } = translateToMCExpert(quiz);
    const start = Date.now();
    const mc = runMC(mcParams, 1000);
    const dur = Date.now() - start;

    check(`[${name}] MC returned`, !!mc);
    if (!mc) continue;

    check(`[${name}] succ 0-1`, mc.succ >= 0 && mc.succ <= 1);
    check(`[${name}] medF defined`, typeof mc.medF === "number");

    const formatted = formatMCResults(mc as any);
    check(`[${name}] formatted.successRate`, typeof formatted.successRate === "number");
    check(`[${name}] formatted.grade`, typeof formatted.grade === "string" && formatted.grade.length > 0);
    check(`[${name}] formatted.percentiles`, typeof formatted.percentiles === "object");
    check(`[${name}] formatted.estate`, typeof formatted.estate === "object");

    const compact = formatMCCompact(mc as any);
    check(`[${name}] compact.successRate`, compact.successRate === mc.succ);
    check(`[${name}] compact.grade`, typeof compact.grade === "string");

    console.log(`  OK   [${name}] succ=${(mc.succ * 100).toFixed(1)}% medF=${Math.round(mc.rMedF || mc.medF)} ${dur}ms`);
  } catch (err) {
    console.error(`  CRASH [${name}]`, err);
    fail++;
  }
}

// ── Test 3: Compare — 2 variants for each profile ───────────

console.log("\n--- Compare (5 profiles × 2 variants) ---");

for (const [name, quiz] of Object.entries(profiles)) {
  try {
    const { mcParams } = translateToMCExpert(quiz);

    // Variant A: delay QPP to 70, Variant B: early QPP at 60
    const variantA = Object.assign({}, mcParams, { qppAge: 70, oasAge: 70 });
    const variantB = Object.assign({}, mcParams, { qppAge: 60 });

    const mcA = runMC(variantA, 1000);
    const mcB = runMC(variantB, 1000);

    check(`[${name}] varA returned`, !!mcA);
    check(`[${name}] varB returned`, !!mcB);

    if (mcA && mcB) {
      const compA = formatMCCompact(mcA as any);
      const compB = formatMCCompact(mcB as any);
      check(`[${name}] both have grades`, !!compA.grade && !!compB.grade);
      console.log(`  OK   [${name}] QPP70=${(compA.successRate * 100).toFixed(1)}% QPP60=${(compB.successRate * 100).toFixed(1)}%`);
    }
  } catch (err) {
    console.error(`  CRASH [${name}]`, err);
    fail++;
  }
}

// ── Test 4: Optimizer — single profile (coupleDB) ────────────

console.log("\n--- Optimizer (coupleDB — mini version) ---");

try {
  const { mcParams } = translateToMCExpert(profiles.coupleDB);

  // Mini optimizer: test 3 axes × 3 values = ~27 combos
  const baseMC = runMC(mcParams, 1000) as Record<string, any>;
  check("optimizer baseline", !!baseMC);

  if (baseMC) {
    const baseSc = baseMC.succ;
    const results: { label: string; succ: number }[] = [];

    // Axis 1: retAge
    for (const rA of [61, 63, 65]) {
      const pp = Object.assign({}, mcParams, { retAge: rA });
      const mc = runMC(pp, 1000) as Record<string, any> | null;
      if (mc) results.push({ label: `retAge=${rA}`, succ: mc.succ });
    }

    // Axis 2: qppAge
    for (const qA of [60, 65, 70]) {
      const pp = Object.assign({}, mcParams, { qppAge: qA });
      const mc = runMC(pp, 1000) as Record<string, any> | null;
      if (mc) results.push({ label: `qppAge=${qA}`, succ: mc.succ });
    }

    // Axis 3: meltdown
    for (const melt of [false, true]) {
      const pp = Object.assign({}, mcParams, { melt, meltTgt: melt ? 58523 : 0 });
      const mc = runMC(pp, 1000) as Record<string, any> | null;
      if (mc) results.push({ label: `melt=${melt}`, succ: mc.succ });
    }

    check("optimizer results", results.length >= 6);
    results.sort((a, b) => b.succ - a.succ);

    console.log(`  OK   baseline=${(baseSc * 100).toFixed(1)}% best=${results[0].label} at ${(results[0].succ * 100).toFixed(1)}%`);
    for (const r of results.slice(0, 5)) {
      const delta = Math.round((r.succ - baseSc) * 100);
      console.log(`       ${r.label}: ${(r.succ * 100).toFixed(1)}% (${delta >= 0 ? "+" : ""}${delta} pp)`);
    }
  }
} catch (err) {
  console.error("  CRASH [optimizer]", err);
  fail++;
}

// ── Summary ──────────────────────────────────────────────────

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
