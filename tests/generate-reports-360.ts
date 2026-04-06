// Generate 9 Bilan 360 test reports: 3 ACCUM, 3 TRANSITION, 3 DECUM
// Usage: npx tsx tests/generate-reports-360.ts
// Set ANTHROPIC_API_KEY env var for real AI narration (Opus 4.6)
// Output: tests/reports/bilan360/*.html

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { translateBilan360 } from '../lib/quiz-translator-360';
import { determinePhase, extractReportData360, renderReportHTML360 } from '../lib/report-html-360';
import { buildAIPrompt360 } from '../lib/ai-prompt-360';
import { buildBuildFiData } from '../lib/report-data-360';
import { sanitizeAISlots360 } from '../lib/ai-constants';
import { run5Strategies } from '../lib/strategies-inter';
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
      max_tokens: 8000,
      system: sys,
      messages: [{ role: "user", content: usr }],
    });
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error(`  [AI ERROR] ${err instanceof Error ? err.message : err}`);
    return {};
  }
}

const reportDir = join(__dirname, 'reports', 'bilan360');
mkdirSync(reportDir, { recursive: true });

// ═══════════════════════════════════════════════════════════════════
// 9 PROFILES — 3 ACCUM, 3 TRANSITION, 3 DECUM
// ═══════════════════════════════════════════════════════════════════

const profiles = [
  // ── ACCUMULATION (retAge - age > 7 OR age < 52) ──────────────────
  {
    name: "01-accum-young-couple-qc",
    desc: "32M QC, 85k sal, couple, homeowner, RRSP+TFSA growing, retAge 63",
    phase: "ACCUM",
    quiz: {
      age: 32, retAge: 63, sex: "M", prov: "QC", income: 85000,
      totalSavings: 48000, savingsDetail: true, rrsp: 28000, tfsa: 15000, nr: 5000,
      monthlyContrib: 1200, lifestyle: "active",
      risk: "growth", investStyle: "low_fee_etf", confidence: 4, worries: ["runout", "inflation"],
      couple: "yes", cAge: 30, cSex: "F", cRetAge: 63, cIncome: 55000,
      cRrsp: 12000, cTfsa: 8000, cNr: 0,
      employer: "", homeowner: true, homeValue: 420000, mortgage: 310000,
      mortgageRate: 5.2, mortgageAmort: 22,
      debts: [{ type: "car", amount: 18000 }],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
      win: "saving", fix: "save_more",
    }
  },
  {
    name: "02-accum-fire-single-bc",
    desc: "29F BC, 130k tech salary, FIRE target 42, aggressive saver, renter",
    phase: "ACCUM",
    quiz: {
      age: 29, retAge: 42, sex: "F", prov: "BC", income: 130000,
      totalSavings: 195000, savingsDetail: true, rrsp: 72000, tfsa: 48000, nr: 75000,
      monthlyContrib: 4500, lifestyle: "cozy",
      risk: "growth", investStyle: "diy_stocks", confidence: 5, worries: ["market", "inflation"],
      couple: "no", employer: "tech",
      homeowner: false, debts: [],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
      win: "investing", fix: "retire_early",
    }
  },
  {
    name: "03-accum-late-starter-debt-on",
    desc: "44M ON, 72k sal, $12k saved, $62k debt, single, no home, catching up",
    phase: "ACCUM",
    quiz: {
      age: 44, retAge: 67, sex: "M", prov: "ON", income: 72000,
      totalSavings: 12000, savingsDetail: true, rrsp: 8000, tfsa: 4000, nr: 0,
      monthlyContrib: 500, lifestyle: "cozy",
      risk: "balanced", investStyle: "mutual_funds", confidence: 2, worries: ["runout", "health"],
      couple: "no", employer: "",
      homeowner: false,
      debts: [
        { type: "cc", amount: 14000 },
        { type: "loc", amount: 25000 },
        { type: "student", amount: 23000 },
      ],
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
      win: "none", fix: "debt",
    }
  },

  // ── TRANSITION (retAge - age <= 7 AND age >= 52) ─────────────────
  {
    name: "04-trans-couple-pension-qc",
    desc: "57F QC, 95k gov salary, DB pension, couple, homeowner paid off, retiring at 60",
    phase: "TRANSITION",
    quiz: {
      age: 57, retAge: 60, sex: "F", prov: "QC", income: 95000,
      totalSavings: 380000, savingsDetail: true, rrsp: 245000, tfsa: 88000, nr: 47000,
      monthlyContrib: 1800, lifestyle: "active",
      risk: "conservative", investStyle: "high_fee_etf", confidence: 4, worries: ["tax", "inflation"],
      couple: "yes", cAge: 59, cSex: "M", cRetAge: 62, cIncome: 68000,
      cRrsp: 120000, cTfsa: 55000, cNr: 15000,
      employer: "gov", homeowner: true, homeValue: 520000, mortgage: 0,
      debts: [],
      qppPlannedAge: 65, oasPlannedAge: 65,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "medium",
      win: "home", fix: "tax",
    }
  },
  {
    name: "05-trans-heavy-rrsp-single-ab",
    desc: "55M AB, 110k sal, $620k RRSP-heavy, single, home with small mortgage, retAge 60",
    phase: "TRANSITION",
    quiz: {
      age: 55, retAge: 60, sex: "M", prov: "AB", income: 110000,
      totalSavings: 620000, savingsDetail: true, rrsp: 480000, tfsa: 90000, nr: 50000,
      monthlyContrib: 2000, lifestyle: "premium",
      risk: "balanced", investStyle: "low_fee_etf", confidence: 3, worries: ["tax", "market", "legacy"],
      couple: "no", employer: "large",
      homeowner: true, homeValue: 580000, mortgage: 85000, mortgageRate: 4.8, mortgageAmort: 6,
      debts: [],
      qppPlannedAge: 65, oasPlannedAge: 65,
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "high",
      win: "investing", fix: "tax",
    }
  },
  {
    name: "06-trans-catching-up-rental-qc",
    desc: "53F QC, 78k sal, couple, 1 rental, moderate savings, retAge 60, playing catch-up",
    phase: "TRANSITION",
    quiz: {
      age: 53, retAge: 60, sex: "F", prov: "QC", income: 78000,
      totalSavings: 145000, savingsDetail: true, rrsp: 85000, tfsa: 42000, nr: 18000,
      monthlyContrib: 1100, lifestyle: "active",
      risk: "balanced", investStyle: "mutual_funds", confidence: 2, worries: ["runout", "inflation", "health"],
      couple: "yes", cAge: 56, cSex: "M", cRetAge: 63, cIncome: 45000,
      cRrsp: 35000, cTfsa: 20000, cNr: 0,
      employer: "",
      homeowner: true, homeValue: 380000, mortgage: 140000, mortgageRate: 5.5, mortgageAmort: 14,
      hasRental: true,
      rental1Value: 280000, rental1Mortgage: 180000, rental1MortgageRate: 5.8,
      rental1MortgageAmort: 18, rental1RentalIncome: 1800, rental1Expenses: 400,
      debts: [{ type: "loc", amount: 12000 }],
      qppPlannedAge: 62, oasPlannedAge: 65,
      psychAnxiety: "high", psychDiscipline: "moderate", psychLiteracy: "medium",
      win: "home", fix: "save_more",
    }
  },

  // ── DECUMULATION (retAge - age <= 0, i.e. already retired) ───────
  {
    name: "07-decum-recently-retired-qc",
    desc: "66M QC, $72k/yr spending, recently retired, CPP at 65, moderate savings",
    phase: "DECUM",
    quiz: {
      age: 66, retAge: 65, sex: "M", prov: "QC",
      retirementStatus: "retired",
      retIncome: 72000,
      totalSavings: 520000, savingsDetail: true, rrsp: 340000, tfsa: 110000, nr: 70000,
      couple: "no",
      homeowner: true, homeValue: 390000, mortgage: 0,
      debts: [],
      qppAlreadyClaiming: true, qppMonthly: 980,
      oasAlreadyClaiming: true, oasMonthly: 720,
      spendingFlex: "moderate",
      risk: "balanced", investStyle: "high_fee_etf", confidence: 3, worries: ["runout", "health"],
      estatePref: "balanced",
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "08-decum-couple-wealthy-on",
    desc: "68F ON, couple, $1.1M savings, DB pension, $95k/yr spending, early CPP at 60",
    phase: "DECUM",
    quiz: {
      age: 68, retAge: 63, sex: "F", prov: "ON",
      retirementStatus: "retired",
      retIncome: 95000,
      totalSavings: 1100000, savingsDetail: true, rrsp: 620000, tfsa: 180000, nr: 300000,
      couple: "yes", cAge: 70, cSex: "M",
      cRrsp: 280000, cTfsa: 95000, cNr: 60000,
      cPenM: 1800, cPenType: "db",
      homeowner: true, homeValue: 780000, mortgage: 0,
      debts: [],
      qppAlreadyClaiming: true, qppMonthly: 850,
      oasAlreadyClaiming: true, oasMonthly: 710,
      pension: 2200,
      spendingFlex: "low",
      risk: "conservative", investStyle: "low_fee_etf", confidence: 4, worries: ["tax", "legacy"],
      estatePref: "maximize",
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "09-decum-early-retiree-gk-bc",
    desc: "58M BC, early retired at 55, $45k/yr spending, GK flex, no CPP yet, modest savings",
    phase: "DECUM",
    quiz: {
      age: 58, retAge: 55, sex: "M", prov: "BC",
      retirementStatus: "retired",
      retIncome: 45000,
      totalSavings: 310000, savingsDetail: true, rrsp: 180000, tfsa: 85000, nr: 45000,
      couple: "no",
      homeowner: true, homeValue: 650000, mortgage: 120000, mortgageRate: 5.1, mortgageAmort: 10,
      debts: [],
      qppAlreadyClaiming: false, qppPlannedAge: 65,
      oasAlreadyClaiming: false, oasPlannedAge: 65,
      spendingFlex: "high",
      risk: "balanced", investStyle: "unsure", confidence: 2, worries: ["runout", "market"],
      estatePref: "spenddown",
      psychAnxiety: "high", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },
];

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  console.log(`Generating 9 Bilan 360 test reports (AI: ${USE_REAL_AI ? 'Opus 4.6' : 'MOCK — set ANTHROPIC_API_KEY'})...\n`);
  const summary: any[] = [];

  for (const profile of profiles) {
    const t0 = Date.now();
    const quiz = profile.quiz as Record<string, any>;

    // 1. Determine phase
    const phase = determinePhase(quiz.age, quiz.retAge);
    console.log(`\n${"═".repeat(90)}`);
    console.log(`${profile.name} — ${profile.desc}`);
    console.log(`Phase: ${phase} (expected: ${profile.phase})`);
    console.log(`${"═".repeat(90)}`);

    if (phase !== profile.phase) {
      console.warn(`  ⚠ Phase mismatch: determinePhase=${phase}, expected=${profile.phase}`);
    }

    // 2. Translate quiz → MC params
    const params = translateBilan360(quiz, phase);
    const mcClean = { ...params }; delete mcClean._quiz; delete mcClean._report;
    console.log("  MC params (key fields):");
    console.log(`    age=${params.age}, retAge=${params.retAge}, sal=${params.sal}, retSpM=${params.retSpM}`);
    console.log(`    rrsp=${params.rrsp}, tfsa=${params.tfsa}, nr=${params.nr}, allocR=${params.allocR}`);
    console.log(`    cOn=${!!params.cOn}, props=${(params.props||[]).length}, debts=${(params.debts||[]).length}`);

    // 3. Run MC baseline (5000 sims)
    const mcStart = Date.now();
    const mcBase = runMC(params, 5000);
    if (!mcBase) {
      console.error(`  ✗ MC returned null for ${profile.name} — SKIPPING`);
      continue;
    }
    console.log(`  MC baseline: succ=${mcBase.succ?.toFixed(3)}, rMedF=${Math.round(mcBase.rMedF||0)}, ${Date.now()-mcStart}ms`);

    // 4. Phase-conditional extra runs
    let stratData: any[] | null = null;
    let mcMelt1: any = null, mcMelt2: any = null;
    let mcC60: any = null, mcC65: any = null, mcC70: any = null;

    if (phase === "ACCUM" || phase === "TRANSITION") {
      stratData = run5Strategies(params as any);
      console.log(`  Strategies: ${stratData.map(s => s.key + "=" + Math.round(s.succ*100) + "%").join(", ")}`);
    }

    if (phase === "TRANSITION" || phase === "DECUM") {
      const meltTarget = (params._report as any)?.meltTarget ?? 58523;
      const meltIsBase = !!((params._report as any)?.meltIsBase);
      if (!meltIsBase) {
        const melt2Target = Math.round(meltTarget * 0.75);
        mcMelt1 = runMC({ ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) }, 1000);
        mcMelt2 = runMC({ ...params, retIncome: melt2Target, retSpM: Math.round(melt2Target / 12) }, 1000);
        console.log(`  Meltdown: target=${meltTarget}, melt1Succ=${mcMelt1?.succ?.toFixed(3)}, melt2Succ=${mcMelt2?.succ?.toFixed(3)}`);
      } else {
        console.log(`  Meltdown: meltIsBase=true (income at/below target), skipping extra runs`);
      }

      const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true";
      if (!alreadyClaiming) {
        const pC60 = translateBilan360({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false }, phase);
        const pC65 = translateBilan360({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false }, phase);
        const pC70 = translateBilan360({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false }, phase);
        mcC60 = runMC(pC60, 1000);
        mcC65 = runMC(pC65, 1000);
        mcC70 = runMC(pC70, 1000);
        console.log(`  CPP timing: 60=${mcC60?.succ?.toFixed(3)}, 65=${mcC65?.succ?.toFixed(3)}, 70=${mcC70?.succ?.toFixed(3)}`);
      } else {
        console.log(`  CPP timing: already claiming, skipping`);
      }
    }

    // 4b. Stress test MC runs (3 scenarios × 1K sims)
    let mcStressCrash08: any = null, mcStressStagflation: any = null, mcStressProlonged: any = null;
    {
      const stWhen = phase === "ACCUM" ? "ret" : "now";
      mcStressCrash08 = runMC({ ...params, strs: "crash08", stWhen }, 1000);
      mcStressStagflation = runMC({ ...params, strs: "stagflation", stWhen }, 1000);
      mcStressProlonged = runMC({ ...params, strs: "prolonged", stWhen }, 1000);
      console.log(`  Stress: crash08=${mcStressCrash08?.succ?.toFixed(3)}, stagflation=${mcStressStagflation?.succ?.toFixed(3)}, prolonged=${mcStressProlonged?.succ?.toFixed(3)}`);
    }

    const extraRuns = { stratData, mcMelt1, mcMelt2, mcC60, mcC65, mcC70, mcStressCrash08, mcStressStagflation, mcStressProlonged };
    const mcElapsed = Date.now() - mcStart;
    console.log(`  All MC runs: ${mcElapsed}ms`);

    // 5. Extract report data
    const D = extractReportData360(mcBase, params, phase, extraRuns);
    console.log(`  D: grade=${D.grade}, successPct=${D.successPct}, govMonthly=${D.govMonthly}`);

    // 6. AI narration
    const fr = true;
    const prompt = buildAIPrompt360(D, params, fr, quiz, phase, stratData || undefined);
    let ai: Record<string, string> = {};

    // Check for pre-generated AI slots file first
    const aiSlotsPath = join(reportDir, `${profile.name}.ai-slots.json`);
    let aiFromFile = false;
    try {
      const existing = require(aiSlotsPath);
      if (existing && Object.keys(existing).length > 0) {
        ai = existing;
        aiFromFile = true;
        console.log(`  AI: loaded ${Object.keys(ai).length} pre-generated slots from file`);
      }
    } catch (_) { /* no pre-generated file */ }

    if (!aiFromFile && USE_REAL_AI) {
      console.log(`  Calling Opus 4.6 (${prompt.usr.length} chars user prompt)...`);
      const aiT0 = Date.now();
      const rawAi = await callAnthropic(prompt.sys, prompt.usr);
      ai = sanitizeAISlots360(rawAi) as Record<string, string>;
      const aiElapsed = Date.now() - aiT0;
      console.log(`  AI: ${Object.keys(ai).length} slots filled (${aiElapsed}ms)`);

      // Save AI slots for inspection
      writeFileSync(aiSlotsPath, JSON.stringify(ai, null, 2), 'utf8');
    } else if (!aiFromFile) {
      console.log(`  [MOCK] No AI — using static fallbacks`);
    }

    // Save full DATA + prompt for offline AI generation
    writeFileSync(
      join(reportDir, `${profile.name}.data.json`),
      JSON.stringify({ D, params: { age: params.age, retAge: params.retAge, sal: params.sal, retSpM: params.retSpM, rrsp: params.rrsp, tfsa: params.tfsa, nr: params.nr, allocR: params.allocR, cOn: !!params.cOn, prov: params.prov, _quiz: params._quiz, _report: params._report }, phase, quiz }, null, 2), 'utf8'
    );

    // 7. Build interactive data layer + render report
    const lang = "fr";
    const buildfiData = buildBuildFiData(mcBase as Record<string, any>, params, phase, lang, extraRuns);
    console.log(`  __BUILDFI__ payload: ${JSON.stringify(buildfiData).length} bytes`);
    const feedbackToken = "test-" + profile.name;
    const html = renderReportHTML360(D, mcBase, params, lang, ai, phase, feedbackToken, extraRuns, buildfiData);

    // 8. Save HTML
    const outPath = join(reportDir, `${profile.name}.html`);
    writeFileSync(outPath, html, 'utf8');

    // Save prompt for inspection
    writeFileSync(
      join(reportDir, `${profile.name}.ai-prompt.json`),
      JSON.stringify({ sys: prompt.sys, usr: prompt.usr }, null, 2), 'utf8'
    );

    const elapsed = Date.now() - t0;
    const row = {
      profile: profile.name,
      phase,
      grade: D.grade,
      successPct: D.successPct,
      govMonthly: D.govMonthly || 0,
      retBal: D.retBal || 0,
      aiSlots: Object.keys(ai).length,
      mcTime: mcElapsed + 'ms',
      totalTime: elapsed + 'ms',
    };
    summary.push(row);
    console.log(`  ✓ ${profile.name} — ${phase} ${D.grade} (${D.successPct}%) — ${elapsed}ms, ${Object.keys(ai).length} AI slots`);
  }

  // ── Summary table ──────────────────────────────────────────
  console.log("\n" + "═".repeat(110));
  console.log("SUMMARY — BILAN 360 TEST REPORTS");
  console.log("═".repeat(110));
  console.log(
    "Profile".padEnd(35) +
    "Phase".padEnd(12) +
    "Grade".padEnd(7) +
    "Succ%".padEnd(7) +
    "GovMo".padEnd(8) +
    "RetBal".padEnd(12) +
    "AI".padEnd(5) +
    "MC".padEnd(10) +
    "Total"
  );
  console.log("-".repeat(110));
  for (const r of summary) {
    console.log(
      r.profile.padEnd(35) +
      r.phase.padEnd(12) +
      String(r.grade).padEnd(7) +
      String(r.successPct).padEnd(7) +
      String(r.govMonthly).padEnd(8) +
      Math.round(r.retBal).toLocaleString('en').padEnd(12) +
      String(r.aiSlots).padEnd(5) +
      r.mcTime.padEnd(10) +
      r.totalTime
    );
  }

  // Save summary
  writeFileSync(join(reportDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log(`\nReports written to: ${reportDir}/`);
  console.log("Open any .html file in your browser to inspect.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
