// Generate 10 Essentiel reports — two-mode pipeline
// Mode "prompts": translate → MC → extract → save quiz/mc/prompt JSONs
// Mode "render": load .ai-slots.json → renderReportHTML → save HTML
// Usage: npx tsx tests/generate-reports-essentiel-full.ts [prompts|render]

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { extractReportData, renderReportHTML, calcCostOfDelay, calcMinViableReturn, buildAIPrompt } from '../lib/report-html';
import { translateToMC } from '../lib/quiz-translator';
import { sanitizeAISlots } from '../lib/ai-constants';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const mode = process.argv[2] || 'prompts';
const reportDir = join(__dirname, 'reports', 'essentiel');
const refDir = join(__dirname, 'reports', 'reference-mechanics');
mkdirSync(reportDir, { recursive: true });
mkdirSync(refDir, { recursive: true });

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

function main() {
  console.log(`[Essentiel] Mode: ${mode}, ${profiles.length} profiles\n`);

  for (const profile of profiles) {
    const { name, desc, quiz } = profile;
    console.log(`\n── ${name}: ${desc}`);

    // Step 1: Translate
    const p = translateToMC(quiz);
    const mcParams = { ...p };
    delete mcParams._quiz; delete mcParams._report;

    if (mode === 'prompts') {
      // Step 2: MC
      const mc = runMC(p, 5000);
      const D = extractReportData(mc, p);
      const costDelay = calcCostOfDelay(p);
      const minReturn = calcMinViableReturn(p);
      const prompt = buildAIPrompt(D, p, true, quiz);

      // Save quiz
      writeFileSync(join(reportDir, `${name}.quiz.json`), JSON.stringify(quiz, null, 2));
      // Save translated MC params
      writeFileSync(join(reportDir, `${name}.mc-params.json`), JSON.stringify(mcParams, null, 2));
      // Save MC key outputs + derived data
      writeFileSync(join(reportDir, `${name}.data.json`), JSON.stringify({
        grade: D.grade, successPct: D.successPct, withdrawalRatePct: D.withdrawalRatePct,
        retBal: D.retBal, rMedF: D.rMedF, rP5F: D.rP5F, rP95F: D.rP95F,
        govMonthly: D.govMonthly, qppMonthly: D.qppMonthly, oasMonthly: D.oasMonthly,
        dbPensionMonthly: D.dbPensionMonthly,
        gapMonthly: D.gapMonthly, coveragePct: D.coveragePct,
        taxCurrentEffective: D.taxCurrentEffective, taxRetirementEffective: D.taxRetirementEffective,
        taxCurrentMarginal: D.taxCurrentMarginal,
        merWeighted: D.merWeighted, feeCostLifetime: D.feeCostLifetime,
        monthlyContrib: D.monthlyContrib, savingsRate: D.savingsRate,
        costDelay, minReturn,
        avgDeath: mc.avgDeath, medRuin: mc.medRuin,
      }, null, 2));
      // Save AI prompt
      writeFileSync(join(reportDir, `${name}.ai-prompt.json`), JSON.stringify({ sys: prompt.sys, usr: prompt.usr }, null, 2));

      console.log(`  Grade: ${D.grade}, Success: ${D.successPct}%, RetBal: ${D.retBal?.toLocaleString()}, CostDelay: ${costDelay?.toLocaleString()}`);

      // Also render HTML in same pass (atomic — same MC results)
      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  (no AI slots — using fallbacks)`);
      }

      const html = renderReportHTML(D, mc, quiz, "fr", ai, costDelay, minReturn, null);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }

    if (mode === 'render') {
      // Render-only mode (uses existing AI slots with fresh MC — legacy mode)
      const mc = runMC(p, 5000);
      const D = extractReportData(mc, p);
      const costDelay = calcCostOfDelay(p);
      const minReturn = calcMinViableReturn(p);

      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  WARNING: ${aiPath} not found, using fallbacks`);
      }

      const html = renderReportHTML(D, mc, quiz, "fr", ai, costDelay, minReturn, null);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }
  }

  if (mode === 'prompts') {
    // Write reference mechanics
    const auditCards = profiles.map(p => {
      const params = translateToMC(p.quiz);
      const mc = runMC(params, 5000);
      const D = extractReportData(mc, params);
      return {
        name: p.name, desc: p.desc,
        quiz: p.quiz,
        grade: D.grade, successPct: D.successPct,
        retBal: D.retBal, rMedF: D.rMedF,
        govMonthly: D.govMonthly, coveragePct: D.coveragePct,
      };
    });
    writeFileSync(join(refDir, 'essentiel-profiles-audit.json'), JSON.stringify(auditCards, null, 2));
    writeFileSync(join(refDir, 'essentiel-pipeline.md'), `# Essentiel Pipeline Reference\nGenerated: ${new Date().toISOString()}\nProfiles: ${profiles.length} × 5,000 MC sims\n\n## Pipeline\nquiz → translateToMC → runMC(5000) → extractReportData → buildAIPrompt → AI → renderReportHTML\n\n## Slots (13)\nsnapshot_intro, savings_context, debt_impact, gov_explanation, gap_explanation, tax_insight, longevity_good, longevity_watch, obs_1, obs_2, obs_3, upgrade_hook, succession_note\n`);
    console.log(`\nReference docs written to ${refDir}/`);
  }

  console.log(`\nDone (mode: ${mode}).`);
}

main();
