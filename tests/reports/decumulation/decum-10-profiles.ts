// tests/decum-10-profiles.ts
// Comprehensive décaissement pipeline test — 10 diverse profiles
// Run: npx tsx tests/reports/decumulation/decum-10-profiles.ts

const { runMC } = require("../../../lib/engine/index.js");
import { translateDecumToMC } from "../../../lib/quiz-translator-decum";
import { extractReportDataDecum, renderReportDecum } from "../../../lib/report-html-decum.js";
import { FORBIDDEN_TERMS } from "../../../lib/ai-constants";

// ═══════════════════════════════════════════════════════════════════
// 10 DIVERSE QUIZ ANSWER PROFILES
// ═══════════════════════════════════════════════════════════════════

const profiles: { name: string; lang: "fr" | "en"; quiz: Record<string, any> }[] = [
  {
    name: "P1: 65M QC retired, 500k, rigid, QPP@65",
    lang: "fr",
    quiz: {
      age: 65, sex: "M", prov: "QC",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 300000, tfsaBal: 120000, nrBal: 80000,
      retIncome: 50000,
      spendingFlex: "rigid",
      allocR: 0.50,
      estatePref: "balanced",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 65,
      oasAlreadyClaiming: false, oasPlannedAge: 65,
      hasPension: false,
      eqRet: 5.0, inf: 2.1,
      homeValue: 0, homeMortgage: 0, totalDebt: 0,
      confidence: 3,
    },
  },
  {
    name: "P2: 60F ON pre-retired, 1.2M, flexible, QPP@70",
    lang: "en",
    quiz: {
      age: 60, sex: "F", prov: "ON",
      retirementStatus: "within_2yr",
      retAge: 62,
      couple: "no",
      rrspBal: 700000, tfsaBal: 200000, nrBal: 300000,
      retIncome: 75000,
      spendingFlex: "flexible",
      allocR: 0.65,
      estatePref: "spenddown",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 70,
      oasAlreadyClaiming: false, oasPlannedAge: 70,
      hasPension: false,
      eqRet: 6.0, inf: 2.5,
      homeValue: 600000, homeMortgage: 50000, totalDebt: 0,
      confidence: 4,
    },
  },
  {
    name: "P3: 72M BC already retired, 200k, moderate, QPP claiming",
    lang: "fr",
    quiz: {
      age: 72, sex: "M", prov: "BC",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 120000, tfsaBal: 50000, nrBal: 30000,
      retIncome: 35000,
      spendingFlex: "moderate",
      allocR: 0.40,
      estatePref: "balanced",
      meltdownPref: null, // "je ne sais pas"
      qppAlreadyClaiming: true, qppMonthly: 900,
      oasAlreadyClaiming: true, oasMonthly: 700,
      hasPension: false,
      eqRet: 5.0, inf: 2.1,
      homeValue: 450000, homeMortgage: 0, totalDebt: 5000,
      confidence: 2,
    },
  },
  {
    name: "P4: 58F AB couple, 800k, planning ret@63, DB pension",
    lang: "en",
    quiz: {
      age: 58, sex: "F", prov: "AB",
      retirementStatus: "within_2yr",
      retAge: 63,
      couple: "yes", cAge: 61, cSex: "M",
      rrspBal: 400000, tfsaBal: 150000, nrBal: 250000,
      cRrspBal: 200000, cTfsaBal: 80000, cNrBal: 70000,
      retIncome: 90000,
      spendingFlex: "moderate",
      allocR: 0.55,
      estatePref: "maximize",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 65,
      oasAlreadyClaiming: false, oasPlannedAge: 65,
      hasPension: true, penMonthly: 2500, penIndexed: "partial",
      cHasPension: false,
      eqRet: 5.5, inf: 2.3,
      homeValue: 500000, homeMortgage: 100000, totalDebt: 15000,
      confidence: 3,
    },
  },
  {
    name: "P5: 68M QC, $2M, aggressive 70%, FIRE-like",
    lang: "fr",
    quiz: {
      age: 68, sex: "M", prov: "QC",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 800000, tfsaBal: 400000, nrBal: 800000,
      retIncome: 100000,
      spendingFlex: "flexible",
      allocR: 0.70,
      estatePref: "spenddown",
      meltdownPref: true,
      qppAlreadyClaiming: true, qppMonthly: 1200,
      oasAlreadyClaiming: false, oasPlannedAge: 70,
      hasPension: false,
      eqRet: 7.0, inf: 2.0,
      homeValue: 0, homeMortgage: 0, totalDebt: 0,
      confidence: 5,
    },
  },
  {
    name: "P6: 62F ON, 400k, couple +5yr younger, OAS@70",
    lang: "fr",
    quiz: {
      age: 62, sex: "F", prov: "ON",
      retirementStatus: "within_1yr",
      couple: "yes", cAge: 57, cSex: "M",
      rrspBal: 200000, tfsaBal: 100000, nrBal: 100000,
      cRrspBal: 150000, cTfsaBal: 60000, cNrBal: 30000,
      retIncome: 55000,
      spendingFlex: "moderate",
      allocR: 0.50,
      estatePref: "balanced",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 65,
      oasAlreadyClaiming: false, oasPlannedAge: 70,
      hasPension: false,
      cHasPension: true, cPenMonthly: 1800, cPenIndexed: "yes",
      eqRet: 5.0, inf: 2.1,
      homeValue: 350000, homeMortgage: 80000, totalDebt: 0,
      confidence: 3,
    },
  },
  {
    name: "P7: 70M QC, $150k, minimal pension, rigid (stress test)",
    lang: "fr",
    quiz: {
      age: 70, sex: "M", prov: "QC",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 80000, tfsaBal: 40000, nrBal: 30000,
      retIncome: 40000,
      spendingFlex: "rigid",
      allocR: 0.35,
      estatePref: "balanced",
      meltdownPref: false,
      qppAlreadyClaiming: true, qppMonthly: 600,
      oasAlreadyClaiming: true, oasMonthly: 650,
      hasPension: false,
      eqRet: 4.5, inf: 2.5,
      homeValue: 200000, homeMortgage: 0, totalDebt: 10000,
      confidence: 1,
    },
  },
  {
    name: "P8: 55F BC, ret@65, 900k, moderate, couple",
    lang: "en",
    quiz: {
      age: 55, sex: "F", prov: "BC",
      retirementStatus: "within_2yr",
      retAge: 65,
      couple: "yes", cAge: 58, cSex: "M",
      rrspBal: 450000, tfsaBal: 180000, nrBal: 270000,
      cRrspBal: 300000, cTfsaBal: 100000, cNrBal: 100000,
      retIncome: 80000,
      spendingFlex: "moderate",
      allocR: 0.60,
      estatePref: "balanced",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 65,
      oasAlreadyClaiming: false, oasPlannedAge: 65,
      hasPension: true, penMonthly: 1500, penIndexed: "yes",
      cHasPension: true, cPenMonthly: 1000, cPenIndexed: "no",
      eqRet: 5.5, inf: 2.2,
      homeValue: 800000, homeMortgage: 200000, totalDebt: 0,
      confidence: 4,
    },
  },
  {
    name: "P9: 67M AB, 600k, recently retired, high target 80k, EN",
    lang: "en",
    quiz: {
      age: 67, sex: "M", prov: "AB",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 350000, tfsaBal: 130000, nrBal: 120000,
      retIncome: 80000,
      spendingFlex: "moderate",
      allocR: 0.55,
      estatePref: "balanced",
      meltdownPref: true,
      qppAlreadyClaiming: false, qppPlannedAge: 67,
      oasAlreadyClaiming: false, oasPlannedAge: 67,
      hasPension: true, penMonthly: 1800, penIndexed: "partial",
      eqRet: 5.5, inf: 2.0,
      homeValue: 400000, homeMortgage: 0, totalDebt: 0,
      confidence: 3,
    },
  },
  {
    name: "P10: 75F QC, 300k, all benefits claiming, conservative, FR",
    lang: "fr",
    quiz: {
      age: 75, sex: "F", prov: "QC",
      retirementStatus: "retired",
      couple: "no",
      rrspBal: 180000, tfsaBal: 70000, nrBal: 50000,
      retIncome: 38000,
      spendingFlex: "moderate",
      allocR: 0.30,
      estatePref: "maximize",
      meltdownPref: null,
      qppAlreadyClaiming: true, qppMonthly: 1100,
      oasAlreadyClaiming: true, oasMonthly: 720,
      hasPension: false,
      eqRet: 4.0, inf: 2.1,
      homeValue: 280000, homeMortgage: 0, totalDebt: 0,
      confidence: 2,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════════════

interface TestResult {
  name: string;
  age: number;
  prov: string;
  savings: number;
  grade: string;
  successPct: number;
  medWealth: number;
  initialRate: number;
  htmlLen: number;
  sectionCount: number;
  fails: string[];
  pass: boolean;
}

const VALID_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D", "F"];

function runProfileTest(profile: typeof profiles[0]): TestResult {
  const fails: string[] = [];
  const { name, lang, quiz } = profile;

  // ── Step A: Translate quiz → MC params ──────────────────────
  let params: Record<string, any>;
  try {
    params = translateDecumToMC(quiz);
  } catch (e: any) {
    return { name, age: quiz.age, prov: quiz.prov, savings: 0, grade: "?", successPct: -1, medWealth: 0, initialRate: 0, htmlLen: 0, sectionCount: 0, fails: [`translateDecumToMC THREW: ${e.message}`], pass: false };
  }

  // ── Step B: Run base MC (1000 sims for speed) ──────────────
  let mcBase: any;
  try {
    mcBase = runMC(params, 1000);
  } catch (e: any) {
    return { name, age: quiz.age, prov: quiz.prov, savings: 0, grade: "?", successPct: -1, medWealth: 0, initialRate: 0, htmlLen: 0, sectionCount: 0, fails: [`runMC THREW: ${e.message}`], pass: false };
  }

  // ── Step C: Extra runs (meltdown + CPP timing) ─────────────
  const extraRuns: Record<string, any> = {};

  // Meltdown runs: with melt=true and melt=false for comparison
  if (params.melt) {
    try {
      const meltParams1 = { ...params, melt: true };
      extraRuns.mcMelt1 = runMC(meltParams1, 500);
    } catch (e: any) {
      fails.push(`melt1 runMC THREW: ${e.message}`);
    }
    try {
      const meltParams2 = { ...params, melt: false };
      extraRuns.mcMelt2 = runMC(meltParams2, 500);
    } catch (e: any) {
      fails.push(`melt2 runMC THREW: ${e.message}`);
    }
  }

  // CPP timing runs (only if not already claiming)
  if (!quiz.qppAlreadyClaiming) {
    try {
      extraRuns.mcC60 = runMC({ ...params, qppAge: 60 }, 500);
    } catch (e: any) {
      fails.push(`cpp60 runMC THREW: ${e.message}`);
    }
    try {
      extraRuns.mcC65 = runMC({ ...params, qppAge: 65 }, 500);
    } catch (e: any) {
      fails.push(`cpp65 runMC THREW: ${e.message}`);
    }
    try {
      extraRuns.mcC70 = runMC({ ...params, qppAge: 70 }, 500);
    } catch (e: any) {
      fails.push(`cpp70 runMC THREW: ${e.message}`);
    }
  }

  // ── Step D: Extract report data ────────────────────────────
  let D: any;
  try {
    D = extractReportDataDecum(mcBase, params, extraRuns);
  } catch (e: any) {
    return { name, age: quiz.age, prov: quiz.prov, savings: 0, grade: "?", successPct: -1, medWealth: 0, initialRate: 0, htmlLen: 0, sectionCount: 0, fails: [...fails, `extractReportDataDecum THREW: ${e.message}`], pass: false };
  }

  // ── Step E: Render HTML ────────────────────────────────────
  let html: string;
  try {
    html = renderReportDecum(D, mcBase, params, lang, {}, "test-token-" + quiz.age, extraRuns);
  } catch (e: any) {
    return { name, age: quiz.age, prov: quiz.prov, savings: D.totalWealth || 0, grade: D.grade || "?", successPct: D.successPct ?? -1, medWealth: D.medWealth || 0, initialRate: D.initialRate || 0, htmlLen: 0, sectionCount: 0, fails: [...fails, `renderReportDecum THREW: ${e.message}`], pass: false };
  }

  // ═══════════════════════════════════════════════════════════
  // MC RESULT CHECKS
  // ═══════════════════════════════════════════════════════════

  // successPct is 0-100
  if (D.successPct < 0 || D.successPct > 100) fails.push(`successPct out of range: ${D.successPct}`);

  // medWealth is a number
  if (typeof D.medWealth !== "number" || isNaN(D.medWealth)) fails.push(`medWealth not a number: ${D.medWealth}`);

  // p10 <= med <= p90 (with 0-clamp tolerance — all clamped to 0 in extract)
  if (D.p10Wealth > D.medWealth + 1) fails.push(`p10Wealth (${D.p10Wealth}) > medWealth (${D.medWealth})`);
  if (D.medWealth > D.p90Wealth + 1) fails.push(`medWealth (${D.medWealth}) > p90Wealth (${D.p90Wealth})`);

  // grade is valid
  if (!VALID_GRADES.includes(D.grade)) fails.push(`Invalid grade: ${D.grade}`);

  // initialRate > 0 (withdrawal rate)
  if (D.initialRate <= 0 && D.retIncome > 0 && D.retBal > 0) fails.push(`initialRate should be > 0: ${D.initialRate}`);

  // retIncome > 0
  if (D.retIncome <= 0) fails.push(`retIncome should be > 0: ${D.retIncome}`);

  // Couple checks
  if (quiz.couple === "yes") {
    if (!D.couple) fails.push("couple should be true");
    if (!D.cAge) fails.push("cAge should be populated for couple");
    if (!D.cSex) fails.push("cSex should be populated for couple");
  }

  // Meltdown results
  if (params.melt && extraRuns.mcMelt1 && extraRuns.mcMelt2) {
    if (D.melt1Succ === null || typeof D.melt1Succ !== "number") fails.push(`melt1Succ not a number: ${D.melt1Succ}`);
    if (D.melt2Succ === null || typeof D.melt2Succ !== "number") fails.push(`melt2Succ not a number: ${D.melt2Succ}`);
  }

  // CPP timing results
  if (!quiz.qppAlreadyClaiming && extraRuns.mcC60 && extraRuns.mcC65 && extraRuns.mcC70) {
    if (D.mc60Succ === null || typeof D.mc60Succ !== "number") fails.push(`mc60Succ not a number: ${D.mc60Succ}`);
    if (D.mc65Succ === null || typeof D.mc65Succ !== "number") fails.push(`mc65Succ not a number: ${D.mc65Succ}`);
    if (D.mc70Succ === null || typeof D.mc70Succ !== "number") fails.push(`mc70Succ not a number: ${D.mc70Succ}`);
  }

  // ═══════════════════════════════════════════════════════════
  // HTML UX CHECKS
  // ═══════════════════════════════════════════════════════════

  const fr = lang === "fr";

  // Non-empty, > 5000 chars
  if (typeof html !== "string") fails.push("HTML is not a string");
  if (html.length < 5000) fails.push(`HTML too short: ${html.length} chars`);

  // Section count (looking for sec-header class)
  const sectionMatches = html.match(/sec-header/g);
  const sectionCount = sectionMatches ? sectionMatches.length : 0;
  if (sectionCount < 6) fails.push(`Too few sections: ${sectionCount} (expected >= 6)`);

  // Grade badge with color
  if (!html.includes(D.grade)) fails.push("Grade badge not found in HTML");
  // Grade color class
  const gradeColorMap: Record<string, string> = { "A+": "#2A8C46", A: "#2A8C46", "B+": "#4A7FC1", B: "#4A7FC1", "C+": "#E0882A", C: "#E0882A", D: "#CC4444", F: "#CC4444" };
  const expectedColor = gradeColorMap[D.grade];
  if (expectedColor && !html.includes(expectedColor)) fails.push(`Grade color ${expectedColor} not found`);

  // Simulation methodology mention (report uses "simulations" not "Monte Carlo")
  if (!html.toLowerCase().includes("simulation")) fails.push("Missing 'simulation(s)' mention in HTML");

  // Projection table (data-table class)
  if (!html.includes("data-table")) fails.push("Missing projection table (data-table class)");

  // Methodology section
  if (fr) {
    if (!html.includes("thodolog") && !html.includes("Hypoth")) fails.push("Missing methodology/hypothèses section (FR)");
  } else {
    if (!html.includes("ethodolog") && !html.includes("ssumptions") && !html.includes("ypothes")) fails.push("Missing methodology section (EN)");
  }

  // Language-specific section titles
  if (fr) {
    // Check for French section titles (report uses accented chars: Hypothèses, Résultats, etc.)
    const frTerms = ["Hypoth", "thodolog", "sultat", "Patrimoine", "Revenus", "Fiscal"];
    let foundFr = 0;
    for (const t of frTerms) {
      if (html.includes(t)) foundFr++;
    }
    if (foundFr < 2) fails.push(`Insufficient FR section titles found (${foundFr}/6)`);
  } else {
    // EN profiles: should contain assessment-style header, NOT "Decumulation"
    if (html.includes("Decumulation Assessment")) fails.push("Should NOT contain 'Decumulation Assessment' — use 'Drawdown' or other term");
  }

  // Couple section — report shows couple data inline (pension conjoint, fractionnement)
  if (quiz.couple === "yes") {
    const coupleTerms = fr
      ? ["onjoint", "artenaire", "ouple", "Fractionnement", "plit"]
      : ["partner", "ouple", "pouse", "plit", "Splitting"];
    const foundCouple = coupleTerms.some(t => html.includes(t));
    if (!foundCouple) fails.push("Missing couple/partner content for couple profile");
  }

  // GK spending flexibility section
  if (params.gkOn) {
    const gkTerms = fr ? ["lexibilit", "Guyton", "uyton"] : ["lexibilit", "Guyton", "uyton", "spending"];
    const foundGK = gkTerms.some(t => html.includes(t));
    if (!foundGK) fails.push("Missing GK/spending flexibility section for gkOn profile");
  }

  // Meltdown comparison (if meltdown runs were done)
  if (params.melt && extraRuns.mcMelt1) {
    if (!html.toLowerCase().includes("meltdown") && !html.toLowerCase().includes("fonte") && !html.toLowerCase().includes("ferr"))
      fails.push("Missing meltdown/FERR comparison section");
  }

  // Fan chart or chart wrapper
  if (!html.includes("chart-wrap") && !html.includes("<svg") && !html.includes("fan-chart"))
    fails.push("Missing chart visualization (SVG or chart-wrap)");

  // NO "undefined", "NaN", or "null" as text (not in HTML attributes)
  // Strip attributes first to avoid false positives
  const textContent = html.replace(/<[^>]*>/g, " ");
  if (/\bundefined\b/.test(textContent)) fails.push("Found 'undefined' in report text content");
  if (/\bNaN\b/.test(textContent)) fails.push("Found 'NaN' in report text content");
  // "null" check — exclude known OK patterns
  const nullMatches = textContent.match(/\bnull\b/gi);
  if (nullMatches && nullMatches.length > 0) fails.push(`Found 'null' in report text content (${nullMatches.length} occurrences)`);

  // AMF forbidden terms in static text
  if (FORBIDDEN_TERMS.test(textContent)) {
    const match = textContent.match(FORBIDDEN_TERMS);
    fails.push(`AMF forbidden term found: "${match?.[0]}"`);
  }

  const totalSavings = (quiz.rrspBal || 0) + (quiz.tfsaBal || 0) + (quiz.nrBal || 0) +
    (quiz.cRrspBal || 0) + (quiz.cTfsaBal || 0) + (quiz.cNrBal || 0);

  return {
    name,
    age: quiz.age,
    prov: quiz.prov,
    savings: totalSavings,
    grade: D.grade,
    successPct: D.successPct,
    medWealth: D.medWealth,
    initialRate: D.initialRate,
    htmlLen: html.length,
    sectionCount,
    fails,
    pass: fails.length === 0,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log("  DECAISSEMENT PIPELINE TEST — 10 PROFILES");
console.log("  MC: 1000 base + 500 extra runs | Engine + Translator + Report");
console.log("═══════════════════════════════════════════════════════════════\n");

const results: TestResult[] = [];
let totalPass = 0;
let totalFail = 0;

for (const profile of profiles) {
  const t0 = Date.now();
  const result = runProfileTest(profile);
  const elapsed = Date.now() - t0;
  results.push(result);

  const status = result.pass ? "PASS" : "FAIL";
  if (result.pass) totalPass++; else totalFail++;

  console.log(`───────────────────────────────────────────────────────────────`);
  console.log(`${status === "PASS" ? "[PASS]" : "[FAIL]"} ${result.name}`);
  console.log(`  Age: ${result.age} | Prov: ${result.prov} | Savings: $${result.savings.toLocaleString()}`);
  console.log(`  Grade: ${result.grade} | Success: ${result.successPct}% | Med Wealth: $${result.medWealth.toLocaleString()}`);
  console.log(`  Withdrawal Rate: ${result.initialRate}% | HTML: ${result.htmlLen.toLocaleString()} chars | Sections: ${result.sectionCount}`);
  console.log(`  Time: ${elapsed}ms`);

  if (result.fails.length > 0) {
    console.log(`  FAILURES (${result.fails.length}):`);
    for (const f of result.fails) {
      console.log(`    - ${f}`);
    }
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════

console.log("═══════════════════════════════════════════════════════════════");
console.log(`  OVERALL: ${totalPass} PASS / ${totalFail} FAIL out of ${profiles.length} profiles`);
console.log("═══════════════════════════════════════════════════════════════");

if (totalFail > 0) {
  console.log("\n  FAILED PROFILES:");
  for (const r of results) {
    if (!r.pass) {
      console.log(`    ${r.name} — ${r.fails.length} failure(s)`);
      for (const f of r.fails) console.log(`      - ${f}`);
    }
  }
}

console.log("\n  GRADE DISTRIBUTION:");
const gradeDist: Record<string, number> = {};
for (const r of results) {
  gradeDist[r.grade] = (gradeDist[r.grade] || 0) + 1;
}
for (const g of VALID_GRADES) {
  if (gradeDist[g]) console.log(`    ${g}: ${gradeDist[g]}`);
}

console.log("\n  SUCCESS RATE RANGE:");
const succRates = results.filter(r => r.successPct >= 0).map(r => r.successPct);
if (succRates.length > 0) {
  console.log(`    Min: ${Math.min(...succRates)}%  Max: ${Math.max(...succRates)}%  Avg: ${Math.round(succRates.reduce((a, b) => a + b, 0) / succRates.length)}%`);
}

console.log();
process.exit(totalFail > 0 ? 1 : 0);
