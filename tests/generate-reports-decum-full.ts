// Generate 10 Décaissement reports — two-mode pipeline
// Mode "prompts": translate → 6 MC runs → extract → save quiz/mc/prompt JSONs
// Mode "render": load .ai-slots.json → renderReportDecum → save HTML
// Usage: npx tsx tests/generate-reports-decum-full.ts [prompts|render]

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { extractReportDataDecum, renderReportDecum } from '../lib/report-html-decum';
import { translateDecumToMC } from '../lib/quiz-translator-decum';
import { buildAIPromptDecum } from '../lib/ai-prompt-decum';
import { sanitizeAISlotsDecum } from '../lib/ai-constants';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const mode = process.argv[2] || 'prompts';
const reportDir = join(__dirname, 'reports', 'decumulation');
const refDir = join(__dirname, 'reports', 'reference-mechanics');
mkdirSync(reportDir, { recursive: true });
mkdirSync(refDir, { recursive: true });

// ── 10 diverse décaissement profiles ──────────────────────────────────
const profiles = [
  {
    name: "01-recently-retired-qc",
    desc: "65M QC, just retired, $480k savings, moderate spending, QPP at 65",
    quiz: {
      age: 65, sex: "M", prov: "QC", couple: "no",
      retirementStatus: "retired",
      rrsp: 280000, tfsa: 120000, nr: 80000, lira: 0,
      retIncome: 48000,
      spendingFlex: "moderate",
      risk: "balanced",
      qppPlannedAge: 65, qppAlreadyClaiming: true, qppMonthly: 850,
      oasAge: 65, oasMonthly: 727,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 350000, mortgage: 0,
      debts: [],
      worries: ["runout", "inflation"],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "02-couple-pension-on",
    desc: "63M+61F ON, DB pension, $720k combined savings, premium lifestyle",
    quiz: {
      age: 63, sex: "M", prov: "ON", couple: "yes",
      cAge: 61, cSex: "F",
      retirementStatus: "retired",
      rrsp: 320000, tfsa: 140000, nr: 110000, lira: 45000,
      cRrsp: 80000, cTfsa: 25000,
      retIncome: 72000,
      spendingFlex: "moderate",
      risk: "balanced",
      qppPlannedAge: 65, qppAlreadyClaiming: false, qppMonthly: 0,
      oasAge: 65, oasMonthly: 0,
      penType: "db", penM: 3200, penIdx: true,
      homeowner: true, homeValue: 680000, mortgage: 0,
      debts: [],
      worries: ["tax", "health"],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "03-early-retiree-bc",
    desc: "58M BC, retiring next year, aggressive saver, $1.2M, FIRE mindset",
    quiz: {
      age: 58, sex: "M", prov: "BC", couple: "no",
      retirementStatus: "within_1yr",
      rrsp: 520000, tfsa: 95000, nr: 380000, lira: 65000,
      retIncome: 60000,
      spendingFlex: "flexible",
      risk: "growth",
      qppPlannedAge: 70, qppAlreadyClaiming: false, qppMonthly: 0,
      oasAge: 70, oasMonthly: 0,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 920000, mortgage: 80000,
      debts: [],
      worries: ["market", "inflation"],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "04-widow-minimal-qc",
    desc: "72F QC, widow, small savings $180k, QPP+OAS only, rigid spending",
    quiz: {
      age: 72, sex: "F", prov: "QC", couple: "no",
      retirementStatus: "retired",
      rrsp: 95000, tfsa: 45000, nr: 15000, lira: 25000,
      retIncome: 32000,
      spendingFlex: "rigid",
      risk: "conservative",
      qppPlannedAge: 65, qppAlreadyClaiming: true, qppMonthly: 680,
      oasAge: 65, oasMonthly: 727,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 280000, mortgage: 0,
      debts: [],
      worries: ["runout", "health"],
      psychAnxiety: "high", psychDiscipline: "moderate", psychLiteracy: "low",
    }
  },
  {
    name: "05-couple-wealthy-ab",
    desc: "67M+64F AB, $2.1M combined, DB+DC pensions, estate-focused",
    quiz: {
      age: 67, sex: "M", prov: "AB", couple: "yes",
      cAge: 64, cSex: "F",
      retirementStatus: "retired",
      rrsp: 650000, tfsa: 180000, nr: 420000, lira: 120000,
      cRrsp: 380000, cTfsa: 95000,
      retIncome: 96000,
      spendingFlex: "moderate",
      risk: "balanced",
      qppPlannedAge: 65, qppAlreadyClaiming: true, qppMonthly: 1100,
      oasAge: 65, oasMonthly: 727,
      penType: "db", penM: 2800, penIdx: true,
      cPenType: "dc", cPenM: 0, cDcBal: 210000,
      homeowner: true, homeValue: 850000, mortgage: 0,
      debts: [],
      worries: ["tax", "legacy"],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "06-near-retirement-qc",
    desc: "60F QC, retiring at 62, moderate savings $350k, worried",
    quiz: {
      age: 60, sex: "F", prov: "QC", couple: "no",
      retirementStatus: "within_3yr",
      rrsp: 210000, tfsa: 78000, nr: 35000, lira: 27000,
      retIncome: 42000,
      spendingFlex: "moderate",
      risk: "conservative",
      qppPlannedAge: 62, qppAlreadyClaiming: false, qppMonthly: 0,
      oasAge: 65, oasMonthly: 0,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 380000, mortgage: 45000,
      debts: [],
      worries: ["runout", "inflation", "health"],
      psychAnxiety: "high", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "07-long-retired-on",
    desc: "78M ON, retired 13 years, $320k left, DB pension, conservative",
    quiz: {
      age: 78, sex: "M", prov: "ON", couple: "yes",
      cAge: 76, cSex: "F",
      retirementStatus: "retired",
      rrsp: 140000, tfsa: 65000, nr: 45000, lira: 70000,
      cRrsp: 0, cTfsa: 0,
      retIncome: 55000,
      spendingFlex: "rigid",
      risk: "conservative",
      qppPlannedAge: 65, qppAlreadyClaiming: true, qppMonthly: 920,
      oasAge: 65, oasMonthly: 727,
      penType: "db", penM: 1800, penIdx: false,
      homeowner: true, homeValue: 520000, mortgage: 0,
      debts: [],
      worries: ["health", "legacy"],
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "medium",
    }
  },
  {
    name: "08-early-cpp-qc",
    desc: "61M QC, wants CPP at 60, $420k savings, flexible spending",
    quiz: {
      age: 61, sex: "M", prov: "QC", couple: "no",
      retirementStatus: "within_1yr",
      rrsp: 250000, tfsa: 95000, nr: 50000, lira: 25000,
      retIncome: 50000,
      spendingFlex: "flexible",
      risk: "balanced",
      qppPlannedAge: 60, qppAlreadyClaiming: false, qppMonthly: 0,
      oasAge: 65, oasMonthly: 0,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 420000, mortgage: 60000,
      debts: [],
      worries: ["runout", "market"],
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },
  {
    name: "09-couple-modest-mb",
    desc: "66F+68M MB, modest $250k, both claiming QPP, cozy lifestyle",
    quiz: {
      age: 66, sex: "F", prov: "MB", couple: "yes",
      cAge: 68, cSex: "M",
      retirementStatus: "retired",
      rrsp: 110000, tfsa: 55000, nr: 20000, lira: 35000,
      cRrsp: 30000, cTfsa: 0,
      retIncome: 38000,
      spendingFlex: "moderate",
      risk: "conservative",
      qppPlannedAge: 65, qppAlreadyClaiming: true, qppMonthly: 720,
      oasAge: 65, oasMonthly: 727,
      cQppMonthly: 650, cOasMonthly: 727,
      penType: "none", penM: 0,
      homeowner: true, homeValue: 290000, mortgage: 0,
      debts: [{ type: "loc", amount: 12000 }],
      worries: ["runout", "health", "inflation"],
      psychAnxiety: "high", psychDiscipline: "moderate", psychLiteracy: "low",
    }
  },
  {
    name: "10-high-net-worth-qc",
    desc: "70M QC, $1.8M savings, DB pension, estate planning priority",
    quiz: {
      age: 70, sex: "M", prov: "QC", couple: "yes",
      cAge: 67, cSex: "F",
      retirementStatus: "retired",
      rrsp: 750000, tfsa: 180000, nr: 520000, lira: 150000,
      cRrsp: 120000, cTfsa: 80000,
      retIncome: 85000,
      spendingFlex: "flexible",
      risk: "balanced",
      qppPlannedAge: 70, qppAlreadyClaiming: true, qppMonthly: 1364,
      oasAge: 70, oasMonthly: 1036,
      penType: "db", penM: 3500, penIdx: true,
      homeowner: true, homeValue: 750000, mortgage: 0,
      debts: [],
      worries: ["tax", "legacy"],
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
];

// ── Meltdown target (same as webhook) ─────────────────────────────────
const MELT_TARGET_2026 = 58523;

function main() {
  console.log(`[Décaissement] Mode: ${mode}, ${profiles.length} profiles\n`);

  for (const profile of profiles) {
    const { name, desc, quiz } = profile;
    console.log(`── ${name}: ${desc}`);

    const params = translateDecumToMC(quiz);

    if (mode === 'prompts') {
      // ── Run 1: Baseline (5,000 sims) ─────────────────────
      const mcBase = runMC(params, 5000);
      if (!mcBase) { console.error(`  FAILED: MC returned null for ${name}`); continue; }

      // ── Runs 2–3: Meltdown scenarios ─────────────────────
      const meltTarget = (params._report as any)?.meltTarget ?? MELT_TARGET_2026;
      const meltIsBase = !!((params._report as any)?.meltIsBase);
      let mcMelt1 = null, mcMelt2 = null;
      if (!meltIsBase) {
        const melt2Target = Math.round(meltTarget * 0.75);
        const paramsMelt1 = { ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) };
        const paramsMelt2 = { ...params, retIncome: melt2Target, retSpM: Math.round(melt2Target / 12) };
        mcMelt1 = runMC(paramsMelt1, 1000);
        mcMelt2 = runMC(paramsMelt2, 1000);
      }

      // ── Runs 4–6: CPP/QPP timing ────────────────────────
      const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true";
      let mcC60 = null, mcC65 = null, mcC70 = null;
      if (!alreadyClaiming) {
        const pC60 = translateDecumToMC({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false });
        const pC65 = translateDecumToMC({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false });
        const pC70 = translateDecumToMC({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false });
        mcC60 = runMC(pC60, 1000);
        mcC65 = runMC(pC65, 1000);
        mcC70 = runMC(pC70, 1000);
      }

      const extraRuns = { mcMelt1, mcMelt2, mcC60, mcC65, mcC70 };
      const D = extractReportDataDecum(mcBase, params, extraRuns);
      const prompt = buildAIPromptDecum(D, params, true, quiz);

      // Save MC params (without internals)
      const mcParams = { ...params };
      delete mcParams._quiz; delete mcParams._report;

      writeFileSync(join(reportDir, `${name}.quiz.json`), JSON.stringify(quiz, null, 2));
      writeFileSync(join(reportDir, `${name}.mc-params.json`), JSON.stringify(mcParams, null, 2));
      writeFileSync(join(reportDir, `${name}.data.json`), JSON.stringify({
        grade: D.grade, successPct: D.successPct,
        retIncome: D.retIncome, retIncomeMonthly: D.retIncomeMonthly,
        totalWealth: D.totalWealth, medWealth: D.medWealth,
        p10Wealth: D.p10Wealth, p90Wealth: D.p90Wealth,
        govMonthly: D.govMonthly, qppMonthly: D.qppMonthly, oasMonthly: D.oasMonthly,
        penMonthly: D.penMonthly, govCoveragePct: D.govCoveragePct,
        initialRate: D.initialRate, initialWithdrawal: D.initialWithdrawal,
        melt1Succ: D.melt1Succ, melt2Succ: D.melt2Succ,
        mc60Succ: D.mc60Succ, mc65Succ: D.mc65Succ, mc70Succ: D.mc70Succ,
        avgDeath: mcBase.avgDeath, medRuin: mcBase.medRuin,
        runsCompleted: `base + ${meltIsBase ? 0 : 2} melt + ${alreadyClaiming ? 0 : 3} cpp = ${1 + (meltIsBase ? 0 : 2) + (alreadyClaiming ? 0 : 3)} total`,
      }, null, 2));
      writeFileSync(join(reportDir, `${name}.ai-prompt.json`), JSON.stringify({ sys: prompt.sys, usr: prompt.usr }, null, 2));

      console.log(`  Grade: ${D.grade}, Success: ${D.successPct}%, Runs: ${1 + (meltIsBase ? 0 : 2) + (alreadyClaiming ? 0 : 3)}`);

      // Also render HTML in same pass (atomic — same MC results)
      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  (no AI slots — using fallbacks)`);
      }

      const html = renderReportDecum(D, mcBase, params, 'fr', ai, null, extraRuns);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }

    if (mode === 'render') {
      // Render-only mode (uses existing AI slots with fresh MC — legacy mode)
      const mcBase = runMC(params, 5000);
      const meltTarget = (params._report as any)?.meltTarget ?? MELT_TARGET_2026;
      const meltIsBase = !!((params._report as any)?.meltIsBase);
      let mcMelt1 = null, mcMelt2 = null;
      if (!meltIsBase) {
        const melt2Target = Math.round(meltTarget * 0.75);
        mcMelt1 = runMC({ ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) }, 1000);
        mcMelt2 = runMC({ ...params, retIncome: melt2Target, retSpM: Math.round(melt2Target / 12) }, 1000);
      }
      const alreadyClaiming = quiz.qppAlreadyClaiming === true;
      let mcC60 = null, mcC65 = null, mcC70 = null;
      if (!alreadyClaiming) {
        mcC60 = runMC(translateDecumToMC({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false }), 1000);
        mcC65 = runMC(translateDecumToMC({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false }), 1000);
        mcC70 = runMC(translateDecumToMC({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false }), 1000);
      }
      const extraRuns = { mcMelt1, mcMelt2, mcC60, mcC65, mcC70 };
      const D = extractReportDataDecum(mcBase, params, extraRuns);

      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  WARNING: ${aiPath} not found, using fallbacks`);
      }

      const html = renderReportDecum(D, mcBase, params, 'fr', ai, null, extraRuns);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }
  }

  if (mode === 'prompts') {
    const auditCards = profiles.map(p => {
      const params = translateDecumToMC(p.quiz);
      const mc = runMC(params, 5000);
      const D = extractReportDataDecum(mc, params, {});
      return {
        name: p.name, desc: p.desc, quiz: p.quiz,
        grade: D.grade, successPct: D.successPct,
        totalWealth: D.totalWealth, medWealth: D.medWealth,
        govMonthly: D.govMonthly, govCoveragePct: D.govCoveragePct,
      };
    });
    writeFileSync(join(refDir, 'decaissement-profiles-audit.json'), JSON.stringify(auditCards, null, 2));
    writeFileSync(join(refDir, 'decaissement-pipeline.md'), `# Décaissement Pipeline Reference\nGenerated: ${new Date().toISOString()}\nProfiles: ${profiles.length} × 5,000 MC sims (base) + meltdown + CPP timing\n\n## Pipeline\nquiz → translateDecumToMC → runMC(5000) base + 2 meltdown (1000) + 3 CPP timing (1000)\n→ extractReportDataDecum → buildAIPromptDecum → AI → renderReportDecum\n\n## Slots (12)\nsnapshot_intro, longevity_context, spending_flex_obs, income_mix_obs, tax_timing_obs, meltdown_obs, cpp_timing_obs, sequence_obs, estate_obs, obs_1, obs_2, obs_3\n\n## 6 MC Runs\n1. Base: 5000 sims with user params\n2. Meltdown 1: retIncome=58523 (fed bracket ceiling)\n3. Meltdown 2: retIncome=43892 (75% of meltdown 1)\n4. CPP at 60: early claiming\n5. CPP at 65: standard\n6. CPP at 70: deferred\n`);
    console.log(`\nReference docs written to ${refDir}/`);
  }

  console.log(`\nDone (mode: ${mode}).`);
}

main();
