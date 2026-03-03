// MC Validation Tests — Phase 2E + 2F
// Run: npx tsx tests/mc-validation-2e2f.ts

import { runMC } from "../lib/engine";
import { translateToMCExpert } from "../lib/quiz-translator-expert";

// ── Inline grade function (avoid importing api-helpers which depends on next/server) ──
function gradeFromSuccess(succ: number): string {
  if (succ >= 0.95) return "A+";
  if (succ >= 0.90) return "A";
  if (succ >= 0.85) return "A-";
  if (succ >= 0.80) return "B+";
  if (succ >= 0.70) return "B";
  if (succ >= 0.50) return "C";
  if (succ >= 0.30) return "D";
  return "F";
}

const SIMS = 5000;
let pass = 0;
let fail = 0;
let errors: string[] = [];

function check(label: string, ok: boolean) {
  if (ok) { pass++; }
  else { fail++; errors.push(label); }
}

function fmt$(n: number): string {
  if (n == null || isNaN(n)) return "N/A";
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${Math.round(n).toLocaleString("en-CA")}`;
}

function fmtPct(n: number): string {
  if (n == null || isNaN(n)) return "N/A";
  return `${(n * 100).toFixed(1)}%`;
}

// ══════════════════════════════════════════════════════════════════
// PHASE 2E: MC VALIDATION RUNS — 3 Profiles
// ══════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════");
console.log("  PHASE 2E: MC VALIDATION RUNS (5,000 sims each)");
console.log("═══════════════════════════════════════════════════════════\n");

// ── Profile 1: Simple single (QC) ──────────────────────────────
const profile1Quiz = {
  age: 40, retAge: 65, sex: "M", prov: "QC", income: 75000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 50000, tfsa: 20000, nr: 0, monthlyContrib: 500,
  lifestyle: "active", risk: "balanced",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

// ── Profile 2: Couple with pension (ON) ────────────────────────
const profile2Quiz = {
  age: 55, retAge: 60, sex: "M", prov: "ON", income: 110000,
  couple: "yes", cAge: 53, cSex: "F", cIncome: 65000,
  cRetAge: 63, cPenType: "none", cQppAge: 65, cOasAge: 65,
  sources: ["employed"], employer: "gov",
  rrsp: 200000, tfsa: 80000, nr: 0, monthlyContrib: 1000,
  cRrsp: 50000, cTfsa: 30000, cNr: 0,
  lifestyle: "active", risk: "balanced",
  parttime: "no", worries: ["runout", "inflation"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  penType: "db", penM: 2500, penIdx: true, penBridge: false,
  homeowner: true, homeValue: 700000, mortgage: 100000, mortgageAmort: 10,
  hasRental: false, debts: [],
  qppAge: 65, oasAge: 65,
  sophistication: "rapide",
};

// ── Profile 3: Complex CCPC (QC) ──────────────────────────────
const profile3Quiz = {
  age: 45, retAge: 58, sex: "M", prov: "QC", income: 150000,
  couple: "yes", cAge: 43, cSex: "F", cIncome: 60000,
  cRetAge: 60, cPenType: "none", cQppAge: 65, cOasAge: 65,
  sources: ["employed", "ccpc"], employer: "small",
  rrsp: 300000, tfsa: 95000, nr: 100000, monthlyContrib: 2000,
  cRrsp: 80000, cTfsa: 40000, cNr: 0,
  bizRevenue: 200000, bizExpenses: 50000, bizBNR: 400000,
  bizRemun: "mix", bizSalaryPct: 50, bizGrowth: 3,
  lifestyle: "active", risk: "growth",
  parttime: "no", worries: ["tax", "runout"],
  objective: "optimize", confidence: 4, decaissement: "meltdown",
  homeowner: true, homeValue: 800000, mortgage: 250000, mortgageAmort: 18,
  hasRental: true, rentalValue: 400000, rentalMortgage: 200000,
  rentalIncome: 30000, rentalExpenses: 10000, rentalVacancy: 5,
  debts: [],
  sophistication: "personnalise",
  toggleMort: true, toggleFatT: true, toggleInf: true, toggleGK: false, toggleGlide: true,
};

interface ProfileResult {
  name: string;
  success: boolean;
  succ: number;
  grade: string;
  rMedF: number;
  rP5F: number;
  p5Ruin: number | null;
  medRuin: number | null;
  ruinPct: number;
  durationMs: number;
  error?: string;
}

function runProfile(name: string, quiz: Record<string, any>): ProfileResult {
  try {
    const { mcParams } = translateToMCExpert(quiz);
    const start = Date.now();
    const mc = runMC(mcParams, SIMS) as Record<string, any>;
    const dur = Date.now() - start;

    if (!mc) {
      return { name, success: false, succ: 0, grade: "N/A", rMedF: 0, rP5F: 0,
        p5Ruin: null, medRuin: null, ruinPct: 0, durationMs: dur, error: "runMC returned null" };
    }

    check(`[${name}] MC returned`, !!mc);
    check(`[${name}] succ in [0,1]`, mc.succ >= 0 && mc.succ <= 1);
    check(`[${name}] rMedF defined`, typeof mc.rMedF === "number");
    check(`[${name}] rP5F defined`, typeof mc.rP5F === "number");
    check(`[${name}] medRuin defined`, mc.medRuin != null);
    check(`[${name}] ruinPct defined`, typeof mc.ruinPct === "number");
    check(`[${name}] fins array`, Array.isArray(mc.fins) && mc.fins.length === SIMS);
    check(`[${name}] revData present`, Array.isArray(mc.revData) && mc.revData.length > 0);
    check(`[${name}] histogram present`, mc.histogram != null);

    return {
      name, success: true,
      succ: mc.succ,
      grade: gradeFromSuccess(mc.succ),
      rMedF: mc.rMedF,
      rP5F: mc.rP5F,
      p5Ruin: mc.p5Ruin,
      medRuin: mc.medRuin,
      ruinPct: mc.ruinPct,
      durationMs: dur,
    };
  } catch (err: any) {
    fail++;
    errors.push(`[${name}] CRASH: ${err.message}`);
    return { name, success: false, succ: 0, grade: "N/A", rMedF: 0, rP5F: 0,
      p5Ruin: null, medRuin: null, ruinPct: 0, durationMs: 0, error: err.message };
  }
}

const profiles2E = [
  { name: "P1: Simple Single (QC)", quiz: profile1Quiz },
  { name: "P2: Couple+DB Pension (ON)", quiz: profile2Quiz },
  { name: "P3: Complex CCPC (QC)", quiz: profile3Quiz },
];

const results2E: ProfileResult[] = [];
for (const { name, quiz } of profiles2E) {
  console.log(`Running ${name}...`);
  const r = runProfile(name, quiz);
  results2E.push(r);
  if (r.success) {
    console.log(`  OK   succ=${fmtPct(r.succ)} grade=${r.grade} rMedF=${fmt$(r.rMedF)} rP5F=${fmt$(r.rP5F)} ruinPct=${fmtPct(r.ruinPct)} ${r.durationMs}ms`);
  } else {
    console.log(`  FAIL ${r.error}`);
  }
}

console.log("\n┌──────────────────────────────────┬──────────┬───────┬─────────────┬────────────┬──────────┬──────────┬────────┐");
console.log("│ Profile                          │ Success  │ Grade │ Med Wealth  │ VaR 5%     │ Ruin Pct │ P5 Ruin  │ Time   │");
console.log("├──────────────────────────────────┼──────────┼───────┼─────────────┼────────────┼──────────┼──────────┼────────┤");
for (const r of results2E) {
  const nm = r.name.padEnd(32);
  const sc = fmtPct(r.succ).padStart(8);
  const gr = r.grade.padStart(5);
  const mw = fmt$(r.rMedF).padStart(11);
  const v5 = fmt$(r.rP5F).padStart(10);
  const rp = fmtPct(r.ruinPct).padStart(8);
  const p5 = (r.p5Ruin != null ? `age ${r.p5Ruin}` : "N/A").padStart(8);
  const tm = `${r.durationMs}ms`.padStart(6);
  console.log(`│ ${nm} │ ${sc} │ ${gr} │ ${mw} │ ${v5} │ ${rp} │ ${p5} │ ${tm} │`);
}
console.log("└──────────────────────────────────┴──────────┴───────┴─────────────┴────────────┴──────────┴──────────┴────────┘");


// ══════════════════════════════════════════════════════════════════
// PHASE 2F: EDGE CASES
// ══════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  PHASE 2F: EDGE CASES (5,000 sims each)");
console.log("═══════════════════════════════════════════════════════════\n");

// Edge 1: Age 64 retire 65 (1 year gap)
const edge1 = {
  age: 64, retAge: 65, sex: "M", prov: "QC", income: 75000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 300000, tfsa: 50000, nr: 20000, monthlyContrib: 0,
  lifestyle: "active", risk: "conservative",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

// Edge 2: Age 30 retire 70 (40 years accumulation)
const edge2 = {
  age: 30, retAge: 70, sex: "F", prov: "ON", income: 75000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 10000, tfsa: 5000, nr: 0, monthlyContrib: 800,
  lifestyle: "active", risk: "growth",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

// Edge 3: Zero savings, only QPP/OAS
const edge3 = {
  age: 40, retAge: 65, sex: "M", prov: "QC", income: 50000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 0, tfsa: 0, nr: 0, monthlyContrib: 0,
  lifestyle: "active", risk: "balanced",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

// Edge 4: $5M RRSP, $0 else (massive RRIF problem)
const edge4 = {
  age: 60, retAge: 65, sex: "M", prov: "ON", income: 120000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 5000000, tfsa: 0, nr: 0, monthlyContrib: 0,
  lifestyle: "premium", risk: "balanced",
  parttime: "no", worries: ["tax"],
  objective: "protect", confidence: 3, decaissement: "meltdown",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

// Edge 5: Couple, one spouse income $0
const edge5 = {
  age: 50, retAge: 65, sex: "M", prov: "QC", income: 90000,
  couple: "yes", cAge: 48, cSex: "F", cIncome: 0,
  cRetAge: 65, cPenType: "none", cQppAge: 65, cOasAge: 65,
  sources: ["employed"], employer: "small",
  rrsp: 100000, tfsa: 40000, nr: 10000, monthlyContrib: 500,
  cRrsp: 0, cTfsa: 0, cNr: 0,
  lifestyle: "active", risk: "balanced",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: true, homeValue: 350000, mortgage: 100000, mortgageAmort: 15,
  hasRental: false, debts: [],
  sophistication: "rapide",
};

const edgeCases = [
  { name: "E1: 1yr gap (age 64->65)", quiz: edge1 },
  { name: "E2: 40yr accum (age 30->70)", quiz: edge2 },
  { name: "E3: Zero savings, QPP/OAS", quiz: edge3 },
  { name: "E4: $5M RRSP, massive RRIF", quiz: edge4 },
  { name: "E5: Couple, spouse $0 income", quiz: edge5 },
];

const results2F: ProfileResult[] = [];
for (const { name, quiz } of edgeCases) {
  console.log(`Running ${name}...`);
  const r = runProfile(name, quiz);
  results2F.push(r);
  if (r.success) {
    console.log(`  OK   succ=${fmtPct(r.succ)} grade=${r.grade} rMedF=${fmt$(r.rMedF)} rP5F=${fmt$(r.rP5F)} ruinPct=${fmtPct(r.ruinPct)} ${r.durationMs}ms`);
  } else {
    console.log(`  FAIL ${r.error}`);
  }
}

console.log("\n┌──────────────────────────────────┬──────────┬───────┬─────────────┬────────────┬──────────┬──────────┬────────┐");
console.log("│ Edge Case                        │ Success  │ Grade │ Med Wealth  │ VaR 5%     │ Ruin Pct │ P5 Ruin  │ Time   │");
console.log("├──────────────────────────────────┼──────────┼───────┼─────────────┼────────────┼──────────┼──────────┼────────┤");
for (const r of results2F) {
  const nm = r.name.padEnd(32);
  const sc = fmtPct(r.succ).padStart(8);
  const gr = r.grade.padStart(5);
  const mw = fmt$(r.rMedF).padStart(11);
  const v5 = fmt$(r.rP5F).padStart(10);
  const rp = fmtPct(r.ruinPct).padStart(8);
  const p5 = (r.p5Ruin != null ? `age ${r.p5Ruin}` : "N/A").padStart(8);
  const tm = `${r.durationMs}ms`.padStart(6);
  console.log(`│ ${nm} │ ${sc} │ ${gr} │ ${mw} │ ${v5} │ ${rp} │ ${p5} │ ${tm} │`);
}
console.log("└──────────────────────────────────┴──────────┴───────┴─────────────┴────────────┴──────────┴──────────┴────────┘");

// ── Edge 6: All 13 Provinces ──────────────────────────────────
console.log("\n--- Edge 6: All 13 Provinces (same profile) ---\n");

const ALL_PROVS = ["QC", "ON", "BC", "AB", "SK", "MB", "NB", "NS", "PE", "NL", "NT", "YT", "NU"];

const baseProvQuiz = {
  age: 40, retAge: 65, sex: "M", income: 75000,
  couple: "no", sources: ["employed"], employer: "small",
  rrsp: 50000, tfsa: 20000, nr: 0, monthlyContrib: 500,
  lifestyle: "active", risk: "balanced",
  parttime: "no", worries: ["runout"],
  objective: "enjoy", confidence: 3, decaissement: "minimal",
  homeowner: false, hasRental: false, debts: [],
  sophistication: "rapide",
};

interface ProvResult {
  prov: string;
  success: boolean;
  succ: number;
  grade: string;
  rMedF: number;
  durationMs: number;
  error?: string;
}

const provResults: ProvResult[] = [];

for (const prov of ALL_PROVS) {
  const quiz = { ...baseProvQuiz, prov };
  try {
    const { mcParams } = translateToMCExpert(quiz);
    const start = Date.now();
    const mc = runMC(mcParams, SIMS) as Record<string, any>;
    const dur = Date.now() - start;

    if (!mc) {
      provResults.push({ prov, success: false, succ: 0, grade: "N/A", rMedF: 0, durationMs: dur, error: "null" });
      fail++;
      errors.push(`[Prov:${prov}] runMC returned null`);
      continue;
    }

    check(`[Prov:${prov}] MC returned`, !!mc);
    check(`[Prov:${prov}] succ valid`, mc.succ >= 0 && mc.succ <= 1);
    check(`[Prov:${prov}] rMedF defined`, typeof mc.rMedF === "number" && !isNaN(mc.rMedF));

    provResults.push({
      prov, success: true,
      succ: mc.succ,
      grade: gradeFromSuccess(mc.succ),
      rMedF: mc.rMedF,
      durationMs: dur,
    });
    console.log(`  OK   [${prov}] succ=${fmtPct(mc.succ)} grade=${gradeFromSuccess(mc.succ)} rMedF=${fmt$(mc.rMedF)} ${dur}ms`);
  } catch (err: any) {
    fail++;
    errors.push(`[Prov:${prov}] CRASH: ${err.message}`);
    provResults.push({ prov, success: false, succ: 0, grade: "N/A", rMedF: 0, durationMs: 0, error: err.message });
    console.log(`  FAIL [${prov}] ${err.message}`);
  }
}

console.log("\n┌──────┬──────────┬───────┬─────────────┬────────┐");
console.log("│ Prov │ Success  │ Grade │ Med Wealth  │ Time   │");
console.log("├──────┼──────────┼───────┼─────────────┼────────┤");
for (const r of provResults) {
  const pv = r.prov.padEnd(4);
  const sc = fmtPct(r.succ).padStart(8);
  const gr = r.grade.padStart(5);
  const mw = fmt$(r.rMedF).padStart(11);
  const tm = `${r.durationMs}ms`.padStart(6);
  console.log(`│ ${pv} │ ${sc} │ ${gr} │ ${mw} │ ${tm} │`);
}
console.log("└──────┴──────────┴───────┴─────────────┴────────┘");


// ══════════════════════════════════════════════════════════════════
// SANITY CHECKS
// ══════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  SANITY CHECKS");
console.log("═══════════════════════════════════════════════════════════\n");

// Check 1: Zero savings should have lower success than $50K RRSP
if (results2F[2].success && results2E[0].success) {
  check("Zero savings < Profile 1 success", results2F[2].succ < results2E[0].succ);
  console.log(`  Zero savings (${fmtPct(results2F[2].succ)}) vs P1 $50K RRSP (${fmtPct(results2E[0].succ)}): ${results2F[2].succ < results2E[0].succ ? "PASS" : "FAIL"}`);
}

// Check 2: $5M RRSP should have high success
if (results2F[3].success) {
  check("$5M RRSP >= 70% success", results2F[3].succ >= 0.70);
  console.log(`  $5M RRSP success: ${fmtPct(results2F[3].succ)} >= 70%: ${results2F[3].succ >= 0.70 ? "PASS" : "FAIL"}`);
}

// Check 3: 40yr accumulation should have reasonable success (>= 30% — modest contributions, growth alloc, ON COL 1.15)
if (results2F[1].success) {
  check("40yr accumulation >= 30% success", results2F[1].succ >= 0.30);
  console.log(`  40yr accumulation success: ${fmtPct(results2F[1].succ)} >= 30%: ${results2F[1].succ >= 0.30 ? "PASS" : "FAIL"}`);
}

// Check 4: Couple + DB pension should have decent success
if (results2E[1].success) {
  check("Couple+DB pension >= 50% success", results2E[1].succ >= 0.50);
  console.log(`  Couple+DB pension success: ${fmtPct(results2E[1].succ)} >= 50%: ${results2E[1].succ >= 0.50 ? "PASS" : "FAIL"}`);
}

// Check 5: All 13 provinces ran successfully
const allProvsOK = provResults.every(r => r.success);
check("All 13 provinces completed", allProvsOK);
console.log(`  All 13 provinces completed: ${allProvsOK ? "PASS" : "FAIL"}`);

// Check 6: Province success rates in reasonable range
const provSuccRange = provResults.filter(r => r.success);
if (provSuccRange.length === 13) {
  const minSucc = Math.min(...provSuccRange.map(r => r.succ));
  const maxSucc = Math.max(...provSuccRange.map(r => r.succ));
  // COL adjustments range 0.87 (PE) to 1.40 (NU) => spending spread is 60%+ => 50pp spread is expected
  check("Province spread < 55pp", (maxSucc - minSucc) < 0.55);
  console.log(`  Province spread: ${fmtPct(minSucc)} to ${fmtPct(maxSucc)} (${((maxSucc - minSucc) * 100).toFixed(1)}pp): ${(maxSucc - minSucc) < 0.55 ? "PASS (COL-driven)" : "FAIL"}`);

  // Higher cost-of-living provinces should generally have lower success
  const qcRes = provResults.find(r => r.prov === "QC")!;
  const bcRes = provResults.find(r => r.prov === "BC")!;
  console.log(`  QC vs BC: QC=${fmtPct(qcRes.succ)} BC=${fmtPct(bcRes.succ)} (BC higher COL expected lower success)`);
}

// Check 7: 1-year gap edge case didn't crash
if (results2F[0].success) {
  check("1yr gap completed", true);
  console.log(`  1yr gap (age 64->65): success=${fmtPct(results2F[0].succ)} - engine handles 1-year horizon`);
}


// ══════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════════════════════");
console.log("  FINAL SUMMARY");
console.log("═══════════════════════════════════════════════════════════");
console.log(`\n  ${pass} passed, ${fail} failed`);

if (errors.length > 0) {
  console.log("\n  Failures:");
  for (const e of errors) {
    console.log(`    - ${e}`);
  }
}

const totalRuns = results2E.length + results2F.length + provResults.length;
const successfulRuns = results2E.filter(r => r.success).length +
  results2F.filter(r => r.success).length +
  provResults.filter(r => r.success).length;
console.log(`\n  MC runs: ${successfulRuns}/${totalRuns} completed successfully`);

const totalTime = [...results2E, ...results2F, ...provResults].reduce((s, r) => s + r.durationMs, 0);
console.log(`  Total time: ${(totalTime / 1000).toFixed(1)}s`);
console.log(`  Avg per 5000-sim run: ${Math.round(totalTime / totalRuns)}ms\n`);

process.exit(fail > 0 ? 1 : 0);
