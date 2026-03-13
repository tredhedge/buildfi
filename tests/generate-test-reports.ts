// Generate 10 test reports with diverse profiles for visual QA
// Usage: npx tsx tests/generate-test-reports.ts
// Set ANTHROPIC_API_KEY env var for real AI narration, otherwise uses mock fallback
// Output: tests/reports/*.html (open in browser)

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { extractReportData, renderReportHTML, calcCostOfDelay, calcMinViableReturn, buildAIPrompt, buildAIPromptOpus, buildWhatIf } from '../lib/report-html';
import { translateToMC } from '../lib/quiz-translator';
import { sanitizeAISlots, sanitizeAISlotsOpus } from '../lib/ai-constants';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const USE_REAL_AI = !!ANTHROPIC_API_KEY;

async function callAnthropic(sys: string, usr: string): Promise<Record<string, string>> {
  if (!ANTHROPIC_API_KEY) return {};
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    const raw = JSON.parse(cleaned);
    return raw;
  } catch (err) {
    console.error(`  [AI ERROR] ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

const reportDir = join(__dirname, 'reports', 'essentiel');
mkdirSync(reportDir, { recursive: true });

// ── 10 diverse profiles (quiz answers → translateToMC → MC params) ──
const profiles = [
  {
    name: "01-young-saver-qc",
    desc: "28M QC, 65k salary, just started saving, RRSP+TFSA small",
    quiz: {
      age: 28, retAge: 65, sex: "M", prov: "QC", income: 65000,
      totalSavings: 20000, savingsDetail: true, rrsp: 12000, tfsa: 8000, nr: 0,
      monthlyContrib: 1083, lifestyle: "active",
      risk: "growth", confidence: 4, worries: ["runout", "inflation"],
      couple: "no", employer: "", debts: [],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "02-broke-minimum-wage",
    desc: "35F QC, 32k salary, zero savings, renting, single mom",
    quiz: {
      age: 35, retAge: 65, sex: "F", prov: "QC", income: 32000,
      totalSavings: 0, lifestyle: "cozy",
      risk: "conservative", confidence: 2, worries: ["runout", "health"],
      couple: "no", employer: "",
      debts: [{ type: "cc", amount: 8500 }],
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
    }
  },
  {
    name: "03-high-earner-on",
    desc: "42M ON, 150k salary, solid savings, DB pension (gov employer)",
    quiz: {
      age: 42, retAge: 60, sex: "M", prov: "ON", income: 150000,
      totalSavings: 290000, savingsDetail: true, rrsp: 180000, tfsa: 65000, nr: 45000,
      monthlyContrib: 2583, lifestyle: "premium",
      risk: "balanced", confidence: 4, worries: ["tax", "market"],
      couple: "yes", employer: "gov",
      homeowner: true, homeValue: 650000, mortgage: 280000, mortgageAmort: 13,
      debts: [],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "04-pre-retraite-qc",
    desc: "58F QC, 90k salary, retiring in 4 years, heavy RRSP",
    quiz: {
      age: 58, retAge: 62, sex: "F", prov: "QC", income: 90000,
      totalSavings: 543000, savingsDetail: true, rrsp: 420000, tfsa: 88000, nr: 35000,
      monthlyContrib: 1583, lifestyle: "active",
      risk: "conservative", confidence: 3, worries: ["runout", "inflation", "health"],
      couple: "no", employer: "",
      homeowner: true, homeValue: 380000, mortgage: 0,
      debts: [],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "05-fire-aggressive",
    desc: "32M BC, 120k salary, FIRE target age 45, very aggressive",
    quiz: {
      age: 32, retAge: 45, sex: "M", prov: "BC", income: 120000,
      totalSavings: 270000, savingsDetail: true, rrsp: 95000, tfsa: 55000, nr: 120000,
      monthlyContrib: 4250, lifestyle: "active",
      risk: "growth", confidence: 5, worries: ["market", "inflation"],
      couple: "no", employer: "",
      qppAge: 70, oasAge: 70,
      debts: [],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "06-heavy-debt",
    desc: "40M QC, 75k salary, $85k debt, minimal savings",
    quiz: {
      age: 40, retAge: 65, sex: "M", prov: "QC", income: 75000,
      totalSavings: 22000, savingsDetail: true, rrsp: 15000, tfsa: 5000, nr: 2000,
      monthlyContrib: 417, lifestyle: "active",
      risk: "balanced", confidence: 2, worries: ["runout", "market"],
      couple: "no", employer: "",
      debts: [
        { type: "mortgage", amount: 45000 },
        { type: "car", amount: 22000 },
        { type: "cc", amount: 12000 },
        { type: "loc", amount: 6000 },
      ],
      psychAnxiety: "high", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },
  {
    name: "07-wealthy-couple-ab",
    desc: "50F AB, 200k household, $1.2M saved, DC pension (large employer)",
    quiz: {
      age: 50, retAge: 60, sex: "F", prov: "AB", income: 200000,
      totalSavings: 1000000, savingsDetail: true, rrsp: 550000, tfsa: 140000, nr: 310000,
      monthlyContrib: 4667, lifestyle: "premium",
      risk: "balanced", confidence: 5, worries: ["tax", "legacy"],
      couple: "yes", employer: "large",
      homeowner: true, homeValue: 850000, mortgage: 150000, mortgageAmort: 5,
      debts: [],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "08-late-starter",
    desc: "50M QC, 70k salary, almost no savings, panic mode",
    quiz: {
      age: 50, retAge: 67, sex: "M", prov: "QC", income: 70000,
      totalSavings: 11000, savingsDetail: true, rrsp: 8000, tfsa: 3000, nr: 0,
      monthlyContrib: 833, lifestyle: "cozy",
      risk: "conservative", confidence: 1, worries: ["runout", "inflation", "health"],
      couple: "no", employer: "",
      debts: [{ type: "loc", amount: 15000 }],
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
    }
  },
  {
    name: "09-teacher-pension-qc",
    desc: "45F QC, 78k salary, strong DB pension (gov employer), conservative",
    quiz: {
      age: 45, retAge: 60, sex: "F", prov: "QC", income: 78000,
      totalSavings: 97000, savingsDetail: true, rrsp: 45000, tfsa: 42000, nr: 10000,
      monthlyContrib: 1083, lifestyle: "active",
      risk: "conservative", confidence: 3, worries: ["inflation", "health"],
      couple: "yes", employer: "gov",
      homeowner: true, homeValue: 450000, mortgage: 120000, mortgageAmort: 11,
      debts: [],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "10-tiny-savings-young",
    desc: "22F QC, 28k salary, $500 total savings, student debt",
    quiz: {
      age: 22, retAge: 65, sex: "F", prov: "QC", income: 28000,
      totalSavings: 500, savingsDetail: true, rrsp: 0, tfsa: 500, nr: 0,
      monthlyContrib: 50, lifestyle: "cozy",
      risk: "growth", confidence: 2, worries: ["runout", "market"],
      couple: "no", employer: "",
      debts: [{ type: "student", amount: 22000 }],
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "low",
    }
  },
];

// ── Generate reports ──────────────────────────────────────────
async function main() {
const maxProfiles = parseInt(process.env.MAX_PROFILES || '10', 10);
console.log(`Generating ${maxProfiles} test reports (AI: ${USE_REAL_AI ? 'Anthropic claude-opus-4-6' : 'MOCK — set ANTHROPIC_API_KEY for real narration'})...\n`);
const summary = [];

for (const profile of profiles.slice(0, maxProfiles)) {
  const t0 = Date.now();
  const quiz = profile.quiz;

  // Step 1: Translate quiz → MC params (same as production pipeline)
  const p = translateToMC(quiz);

  // Log the full translation for audit
  console.log(`\n${"─".repeat(80)}`);
  console.log(`PROFILE: ${profile.name} — ${profile.desc}`);
  console.log(`${"─".repeat(80)}`);
  console.log("QUIZ ANSWERS (user input):");
  console.log(JSON.stringify(quiz, null, 2));
  console.log("\nTRANSLATED MC PARAMS (fed to engine):");
  const mcParams = { ...p };
  delete mcParams._quiz;
  delete mcParams._report;
  console.log(JSON.stringify(mcParams, null, 2));
  console.log("\nQUIZ METADATA (_quiz):", JSON.stringify(p._quiz, null, 2));
  console.log("REPORT METADATA (_report):", JSON.stringify(p._report, null, 2));

  // Step 2: Run MC
  const mc = runMC(p, 5000);
  const mcElapsed = Date.now() - t0;

  // Log key MC outputs
  console.log("\nMC OUTPUTS:");
  console.log(`  succ=${mc.succ.toFixed(3)}, rMedF=${Math.round(mc.rMedF)}, rP5F=${Math.round(mc.rP5F)}, rP95F=${Math.round(mc.rP95F)}`);
  console.log(`  medRuin=${mc.medRuin}, p5Ruin=${mc.p5Ruin}, avgDeath=${mc.avgDeath}`);
  console.log(`  medEstateNet=${Math.round(mc.medEstateNet||0)}, medEstateTax=${Math.round(mc.medEstateTax||0)}`);

  // Step 3: Extract report data
  const D = extractReportData(mc, p);

  // Log derived report data
  console.log("\nDERIVED REPORT DATA (D):");
  console.log(`  grade=${D.grade}, successPct=${D.successPct}, withdrawalRatePct=${D.withdrawalRatePct}`);
  console.log(`  retBal=${D.retBal}, govMonthly=${D.govMonthly} (qpp=${D.qppMonthly}, oas=${D.oasMonthly}, pen=${D.dbPensionMonthly})`);
  console.log(`  gapMonthly=${D.gapMonthly}, coveragePct=${D.coveragePct}`);
  console.log(`  taxCurrEff=${D.taxCurrentEffective}%, taxRetEff=${D.taxRetirementEffective}%, margRate=${D.taxCurrentMarginal}%`);
  console.log(`  merWeighted=${(D.merWeighted*100).toFixed(3)}%, feeCostLifetime=${D.feeCostLifetime}`);
  console.log(`  monthlyContrib=${D.monthlyContrib}, savingsRate=${D.savingsRate}%`);

  // Cost of delay + min viable return
  const costDelay = calcCostOfDelay(p);
  const minReturn = calcMinViableReturn(p);
  console.log(`  costOfDelay=${costDelay}, minViableReturn=${minReturn}%`);

  // Step 4: AI narration — Opus mega-prompt (15 slots) via buildAIPromptOpus()
  const whatIfResults = buildWhatIf(p, mc, D, true);
  const prompt = buildAIPromptOpus(D, p, true, quiz, whatIfResults);
  console.log("\nAI PROMPT (Opus system):", prompt.sys.substring(0, 200) + "...");
  console.log("AI PROMPT (Opus user):", prompt.usr.substring(0, 300) + "...");

  let ai: Record<string, string> = {};
  if (USE_REAL_AI) {
    console.log("  Calling Anthropic API (Opus 4.6)...");
    const aiT0 = Date.now();
    const rawAi = await callAnthropic(prompt.sys, prompt.usr);
    ai = sanitizeAISlotsOpus(rawAi) as Record<string, string>;
    console.log(`  AI: ${Object.keys(ai).length} slots filled (${Date.now() - aiT0}ms)`);
  } else {
    console.log("  [MOCK] No ANTHROPIC_API_KEY — report will use static fallbacks");
  }

  // Generate HTML — pass quiz answers so report can render "Votre profil" section
  // When ai={}, renderReportHTML uses its built-in static fallback strings per slot
  const html = renderReportHTML(D, mc, quiz, "fr", ai, costDelay, minReturn, null);

  // Save
  const outPath = join(reportDir, `${profile.name}.html`);
  writeFileSync(outPath, html, 'utf8');

  const elapsed = Date.now() - t0;
  // Summary
  const row = {
    profile: profile.name,
    desc: profile.desc,
    grade: D.grade,
    successPct: D.successPct,
    withdrawalPct: D.withdrawalRatePct,
    retBal: D.retBal,
    rMedF: D.rMedF,
    rP5F: D.rP5F,
    govMonthly: D.govMonthly,
    gapMonthly: D.gapMonthly,
    coveragePct: D.coveragePct,
    costDelay: costDelay,
    mcTime: mcElapsed + 'ms',
    totalTime: elapsed + 'ms',
    aiSlots: Object.keys(ai).length,
  };
  summary.push(row);
  console.log(`✓ ${profile.name} — ${D.grade} (${D.successPct}%) — MC:${mcElapsed}ms, total:${elapsed}ms, AI:${Object.keys(ai).length} slots`);
}

// ── Print summary table ──────────────────────────────────────
console.log("\n" + "═".repeat(130));
console.log("SUMMARY — MC OUTPUTS vs REPORT DATA");
console.log("═".repeat(130));
console.log(
  "Profile".padEnd(28) +
  "Grade".padEnd(7) +
  "Succ%".padEnd(7) +
  "WdRate%".padEnd(9) +
  "RetBal".padEnd(12) +
  "rMedF".padEnd(12) +
  "rP5F".padEnd(12) +
  "GovMo".padEnd(8) +
  "GapMo".padEnd(8) +
  "Cover%".padEnd(8) +
  "CostDly".padEnd(10) +
  "AI".padEnd(5) +
  "Time"
);
console.log("-".repeat(130));
for (const r of summary) {
  console.log(
    r.profile.padEnd(28) +
    r.grade.padEnd(7) +
    String(r.successPct).padEnd(7) +
    String(r.withdrawalPct).padEnd(9) +
    r.retBal.toLocaleString('en').padEnd(12) +
    r.rMedF.toLocaleString('en').padEnd(12) +
    r.rP5F.toLocaleString('en').padEnd(12) +
    String(r.govMonthly).padEnd(8) +
    String(r.gapMonthly).padEnd(8) +
    String(r.coveragePct).padEnd(8) +
    r.costDelay.toLocaleString('en').padEnd(10) +
    String(r.aiSlots).padEnd(5) +
    r.totalTime
  );
}

// ── Sanity checks ─────────────────────────────────────────────
console.log("\n" + "═".repeat(130));
console.log("SANITY CHECKS");
console.log("═".repeat(130));
let issues = 0;
for (const r of summary) {
  if (r.successPct < 0 || r.successPct > 100) { console.log(`⚠ ${r.profile}: successPct ${r.successPct} out of range`); issues++; }
  if (r.retBal < 0) { console.log(`⚠ ${r.profile}: negative retBal ${r.retBal}`); issues++; }
  if (r.govMonthly < 0) { console.log(`⚠ ${r.profile}: negative govMonthly ${r.govMonthly}`); issues++; }
  if (r.gapMonthly < 0) { console.log(`⚠ ${r.profile}: negative gapMonthly ${r.gapMonthly}`); issues++; }
  if (r.coveragePct < 0 || r.coveragePct > 200) { console.log(`⚠ ${r.profile}: coveragePct ${r.coveragePct} suspicious`); issues++; }
  if (r.withdrawalPct > 100 && r.successPct > 50) { console.log(`⚠ ${r.profile}: high withdrawal ${r.withdrawalPct}% but ${r.successPct}% success — check`); issues++; }
}
if (issues === 0) console.log("✓ All sanity checks passed");

// ── Write audit artifacts for Claude review ──────────────────
// Summary table as JSON
writeFileSync(join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

// Per-profile audit cards (quiz → translated → MC key outputs → derived)
const auditCards: any[] = [];
// Re-run translation for each profile to capture full data
for (const profile of profiles) {
  const p = translateToMC(profile.quiz);
  const mcP = { ...p }; delete mcP._quiz; delete mcP._report;
  auditCards.push({
    name: profile.name,
    desc: profile.desc,
    quiz: profile.quiz,
    translated: {
      sal: p.sal, retSpM: p.retSpM, rrsp: p.rrsp, tfsa: p.tfsa, nr: p.nr,
      rrspC: p.rrspC, tfsaC: p.tfsaC, nrC: p.nrC,
      penType: p.penType, penM: p.penM, dcBal: p.dcBal,
      qppAge: p.qppAge, oasAge: p.oasAge, allocR: p.allocR,
      props: p.props.length, debts: p.debts.length,
    },
    _quiz: p._quiz,
    _report: p._report,
  });
}
writeFileSync(join(reportDir, 'profiles-audit.json'), JSON.stringify(auditCards, null, 2), 'utf8');

// Pipeline reference doc
const pipelineRef = `# Essentiel Pipeline Audit Reference
Generated: ${new Date().toISOString()}
Reports: ${profiles.length} profiles × 5,000 MC sims each

## Pipeline Flow
quiz-essentiel.html → POST /api/checkout → Stripe → webhook
→ translateToMC(quizAnswers) [lib/quiz-translator.ts]
→ runMC(params, 5000) [lib/engine/index.js]
→ extractReportData(mc, params) → D [lib/report-html.js]
→ buildAIPrompt(D, params, fr, quiz) → {sys, usr}
→ callAnthropic() → AI slots (12 slots, or {} fallback)
→ renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn)

## Quiz Fields (quiz-essentiel.html — 8 steps)
Step 1: age, retAge, sex, prov, qppAge (new)
Step 2: employer, couple
Step 3: income, totalSavings, monthlyContrib, [savingsDetail → rrsp/tfsa/nr]
Step 4: debts[{type,amount,minPayment,rate}], hasDebts, homeowner, homeValue, mortgage, mortgageRate, mortgageAmort
Step 5: lifestyle (cozy/active/premium), risk (conservative/balanced/growth), parttime
Step 6: psychAnxiety, psychDiscipline, psychLiteracy
Step 7: worries[], win
Step 8: fix, confidence

## Translator Key Mappings
- monthlyContrib → split: TFSA first (up to $7k), then RRSP (18% of sal, max $33,810), remainder to NR
- lifestyle → retSpM: cozy=$3k×COL, active=$5k×COL, premium=$7.5k×COL
- employer → pension: "gov"=DB (2%×yrs×projSal/12), "large"/"tech"=DC (6%×sal×yrs)
- risk → allocR: conservative=0.5, balanced=0.7, growth=0.85
- homeowner → props[0] with flat fields (homeValue, mortgage, mortgageAmort)
- debts → amortized with default rates (cc=19.99%, student=5.5%, car=6.5%, loc=7.5%)
- qppAge → passthrough if provided, else heuristic from retAge (clamped 60-70)
- oasAge → passthrough if provided, else heuristic from retAge (clamped 65-70)

## Report Sections (new order)
1. Note (grade/donut)
2. Profil (+ single-person callout if couple=yes)
3. Projection + Min Viable Return card
4. Revenus à la retraite
5. Épargne + Cost of Delay card
6. Priorité (CÉLI vs REER ranking)
7. Et si... (what-if cards)
── Upsell CTA (peak engagement) ──
8. Fiscalité & Frais
9. Plan aux 5 ans
10. Hypothèses
11. Méthodologie
── Disclaimer, Resources, Feedback, Referral, Print, Footer ──

## MC Engine Key Outputs
- succ (0-1): success rate
- rMedF, rP5F, rP25F, rP75F, rP95F: real wealth percentiles at end of plan
- medRuin, p5Ruin: age of ruin
- avgDeath: stochastic life expectancy
- medEstateNet, medEstateTax: estate values
- pD[]: per-year data rows

## Grade System
A+ ≥ 95%, A ≥ 90%, A- ≥ 85%, B+ ≥ 80%, B ≥ 70%, C ≥ 50%, D ≥ 30%, F < 30%

## Known Limitations (Essentiel tier)
- Single person only (couple=yes is metadata, not modeled)
- No custom spending input (lifestyle buckets only)
- No qppAge/oasAge override in quiz before this update (now available)
- No stochastic mortality or inflation (fatT/stochMort/stochInf all false)
- No RRSP meltdown, income splitting, or bridging strategies
`;
writeFileSync(join(reportDir, 'PIPELINE-REFERENCE.md'), pipelineRef, 'utf8');

console.log(`\nReports + audit docs written to: ${reportDir}/`);
console.log("Files: 10 HTML reports, summary.json, profiles-audit.json, PIPELINE-REFERENCE.md");
console.log("Open any .html file in your browser to visually inspect.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
