// ═══════════════════════════════════════════════════════════════════
// BuildFi — Report Validation Script (10 profiles)
// Validates Essentiel pipeline: quiz answers → MC → report HTML
// Run: npx tsx tests/report-validation.js
// ═══════════════════════════════════════════════════════════════════

import { translateToMC } from "../lib/quiz-translator.ts";
import { runMC } from "../lib/engine/index.js";
import { extractReportData, renderReportHTML } from "../lib/report-html.js";

// ── 10 test profiles covering diverse demographics ───────────────
const PROFILES = [
  {
    name: "Young 25 QC",
    quiz: {
      age: 25, retAge: 65, sex: "M", prov: "QC",
      income: 48000, totalSavings: 8000, monthlyContrib: 400,
      employer: "x", lifestyle: "cozy", risk: "growth",
      homeowner: false, debts: [{ type: "student", amount: 18000 }],
      couple: "no", parttime: "no",
    },
  },
  {
    name: "Couple 45 QC",
    quiz: {
      age: 45, retAge: 62, sex: "M", prov: "QC",
      income: 95000, totalSavings: 220000, monthlyContrib: 1200,
      savingsDetail: true, rrsp: 120000, tfsa: 60000, nr: 40000,
      employer: "large", lifestyle: "active", risk: "balanced",
      homeowner: true, homeValue: 420000, mortgage: 180000, mortgageAmort: 18,
      debts: [], couple: "yes", parttime: "maybe",
    },
  },
  {
    name: "Single 55 ON",
    quiz: {
      age: 55, retAge: 63, sex: "F", prov: "ON",
      income: 82000, totalSavings: 380000, monthlyContrib: 800,
      savingsDetail: true, rrsp: 240000, tfsa: 80000, nr: 60000,
      employer: "x", lifestyle: "active", risk: "conservative",
      homeowner: true, homeValue: 650000, mortgage: 120000, mortgageAmort: 10,
      debts: [], couple: "no", parttime: "yes", parttimeAmount: 2000, parttimeYears: 4,
    },
  },
  {
    name: "FIRE 35 BC",
    quiz: {
      age: 35, retAge: 50, sex: "M", prov: "BC",
      income: 140000, totalSavings: 520000, monthlyContrib: 4000,
      savingsDetail: true, rrsp: 200000, tfsa: 95000, nr: 225000,
      employer: "tech", lifestyle: "cozy", risk: "growth",
      homeowner: false, debts: [],
      couple: "no", parttime: "yes", parttimeAmount: 3000, parttimeYears: 8,
    },
  },
  {
    name: "Pre-retraite 60 QC",
    quiz: {
      age: 60, retAge: 63, sex: "M", prov: "QC",
      income: 75000, totalSavings: 450000, monthlyContrib: 500,
      savingsDetail: true, rrsp: 300000, tfsa: 90000, nr: 60000,
      employer: "gov", lifestyle: "active", risk: "conservative",
      homeowner: true, homeValue: 380000, mortgage: 0,
      debts: [], couple: "yes", parttime: "no",
    },
  },
  {
    name: "CCPC 42 ON",
    quiz: {
      age: 42, retAge: 60, sex: "M", prov: "ON",
      income: 160000, totalSavings: 350000, monthlyContrib: 3000,
      savingsDetail: true, rrsp: 180000, tfsa: 85000, nr: 85000,
      employer: "x", lifestyle: "premium", risk: "growth",
      homeowner: true, homeValue: 900000, mortgage: 400000, mortgageAmort: 22,
      debts: [], couple: "yes", parttime: "no",
    },
  },
  {
    name: "Couple with debt AB",
    quiz: {
      age: 38, retAge: 65, sex: "F", prov: "AB",
      income: 62000, totalSavings: 35000, monthlyContrib: 300,
      employer: "x", lifestyle: "cozy", risk: "balanced",
      homeowner: true, homeValue: 380000, mortgage: 280000, mortgageAmort: 25,
      debts: [
        { type: "cc", amount: 12000 },
        { type: "car", amount: 18000 },
        { type: "loc", amount: 8000 },
      ],
      couple: "yes", parttime: "no",
    },
  },
  {
    name: "Femme 40 NS",
    quiz: {
      age: 40, retAge: 63, sex: "F", prov: "NS",
      income: 72000, totalSavings: 110000, monthlyContrib: 600,
      savingsDetail: true, rrsp: 55000, tfsa: 35000, nr: 20000,
      employer: "large", lifestyle: "active", risk: "balanced",
      homeowner: true, homeValue: 320000, mortgage: 160000, mortgageAmort: 20,
      debts: [{ type: "student", amount: 5000 }],
      couple: "no", parttime: "maybe",
    },
  },
  {
    name: "Homme 65 ON",
    quiz: {
      age: 64, retAge: 67, sex: "M", prov: "ON",
      income: 55000, totalSavings: 280000, monthlyContrib: 200,
      savingsDetail: true, rrsp: 180000, tfsa: 60000, nr: 40000,
      employer: "x", lifestyle: "cozy", risk: "conservative",
      homeowner: true, homeValue: 550000, mortgage: 0,
      debts: [], couple: "yes", parttime: "yes", parttimeAmount: 1500, parttimeYears: 3,
    },
  },
  {
    name: "Minimum profile",
    quiz: {
      age: 30, retAge: 65, sex: "M", prov: "QC",
      income: 35000, totalSavings: 0, monthlyContrib: 100,
      employer: "x", lifestyle: "cozy", risk: "balanced",
      homeowner: false, debts: [],
      couple: "no", parttime: "no",
    },
  },
];

// ── Grade helper (must match report-html.js extractReportData) ───
function gradeFor(pct) {
  if (pct >= 95) return "A+";
  if (pct >= 90) return "A";
  if (pct >= 85) return "A-";
  if (pct >= 80) return "B+";
  if (pct >= 70) return "B";
  if (pct >= 50) return "C";
  if (pct >= 30) return "D";
  return "F";
}

// ── Validation checks ────────────────────────────────────────────
function validate(name, html, mc, params) {
  const errors = [];

  // 1. No NaN in output
  const nanMatches = html.match(/NaN/g);
  if (nanMatches) errors.push(`NaN found (${nanMatches.length} occurrences)`);

  // 2. No literal "$0" amounts (except in legitimate $0 contexts like debt = $0)
  // Check for "$0 " or "$0<" patterns that suggest a missing value
  const zeroPattern = /\$0[\s<]/g;
  const zeroMatches = html.match(zeroPattern);
  // Allow some $0 (e.g., debt = $0 is valid), but flag if excessive
  if (zeroMatches && zeroMatches.length > 10) {
    errors.push(`Excessive $0 values (${zeroMatches.length} occurrences)`);
  }

  // 3. Grade matches successRate
  const succPct = Math.round(mc.succ * 100);
  const expectedGrade = gradeFor(succPct);
  // The grade appears as large text: font-size:42px...>A+</div>
  const gradeRegex = /font-size:42px[^>]*>([A-F][+-]?)</;
  const gradeMatch = html.match(gradeRegex);
  if (gradeMatch) {
    if (gradeMatch[1] !== expectedGrade) {
      errors.push(`Grade mismatch: HTML="${gradeMatch[1]}", expected="${expectedGrade}" (succ=${succPct}%)`);
    }
  }

  // 4. Check key sections exist (look for section headers/content)
  const requiredPatterns = [
    { label: "Profile section", re: /Votre profil|Your [Pp]rofile/ },
    { label: "Grade section", re: /Votre note|Your Grade/ },
    { label: "Wealth/patrimoine", re: /patrimoine|Wealth|Portfolio|Portefeuille/i },
    { label: "Revenu section", re: /Revenu|Income|revenue/i },
  ];
  for (const { label, re } of requiredPatterns) {
    if (!re.test(html)) {
      errors.push(`Missing section: ${label}`);
    }
  }

  // 5. No undefined values
  const undefMatches = html.match(/undefined/g);
  if (undefMatches) errors.push(`"undefined" found (${undefMatches.length} occurrences)`);

  // 6. HTML not empty / too short
  if (html.length < 5000) errors.push(`HTML suspiciously short: ${html.length} chars`);

  // 7. MC sanity
  if (mc.succ == null || isNaN(mc.succ)) errors.push("MC succ is null/NaN");
  if (!mc.medRevData || mc.medRevData.length === 0) errors.push("MC medRevData empty");
  if (mc.medF == null || isNaN(mc.medF)) errors.push("MC medF is null/NaN");

  return errors;
}

// ── Main ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

console.log("═══════════════════════════════════════════════════════════");
console.log("  BuildFi Report Validation — 10 Profiles");
console.log("═══════════════════════════════════════════════════════════\n");

for (const profile of PROFILES) {
  const label = profile.name;
  try {
    // Step 1: Translate quiz → MC params
    const params = translateToMC(profile.quiz);

    // Step 2: Run MC (5000 sims)
    const mc = runMC(params, 5000);

    // Step 3: Extract report data
    const D = extractReportData(mc, params);

    // Step 4: Render report HTML (no AI narration, no feedback token)
    const html = renderReportHTML(D, mc, params, "fr", {}, 0, 0);

    // Step 5: Validate
    const errors = validate(label, html, mc, params);

    if (errors.length === 0) {
      console.log(`  ✓ ${label}  (succ=${Math.round(mc.succ * 100)}%, grade=${gradeFor(Math.round(mc.succ * 100))}, ${html.length} chars)`);
      passed++;
    } else {
      console.log(`  ✗ ${label}`);
      for (const e of errors) console.log(`    → ${e}`);
      failed++;
      failures.push({ name: label, errors });
    }
  } catch (err) {
    console.log(`  ✗ ${label}  CRASH: ${err.message}`);
    failed++;
    failures.push({ name: label, errors: [`CRASH: ${err.message}`] });
  }
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed out of ${PROFILES.length}`);
console.log("═══════════════════════════════════════════════════════════");

if (failures.length > 0) {
  console.log("\nFailures:");
  for (const f of failures) {
    console.log(`  ${f.name}: ${f.errors.join("; ")}`);
  }
  process.exit(1);
}

process.exit(0);
