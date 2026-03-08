// Generate 10 Intermédiaire reports — two-mode pipeline
// Mode "prompts": translate → MC → strategies → extract → save quiz/mc/prompt JSONs
// Mode "render": load .ai-slots.json → renderReportHTMLInter → save HTML
// Usage: npx tsx tests/generate-reports-inter-full.ts [prompts|render]

// @ts-nocheck
import { runMC } from '../lib/engine/index';
import { extractReportDataInter, renderReportHTMLInter } from '../lib/report-html-inter';
import { translateToMCInter } from '../lib/quiz-translator-inter';
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from '../lib/strategies-inter';
import { buildAIPromptInter } from '../lib/ai-prompt-inter';
import { sanitizeAISlotsInter } from '../lib/ai-constants';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const mode = process.argv[2] || 'prompts';
const reportDir = join(__dirname, 'reports', 'intermediaire');
const refDir = join(__dirname, 'reports', 'reference-mechanics');
mkdirSync(reportDir, { recursive: true });
mkdirSync(refDir, { recursive: true });

const profiles = [
  {
    name: "01-couple-simple-qc",
    desc: "45M+42F QC, $140k combined, no property, balanced, modest savings",
    quiz: {
      age: 45, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "small", income: 80000,
      rrsp: 35000, tfsa: 22000, nr: 5000, lira: 0, dcBal: 0,
      monthlyContrib: 800, tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced", retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false, debts: [],
      couple: "yes", cAge: 42, cSex: "F", cRetAge: 65, cIncome: 60000,
      cRrsp: 18000, cTfsa: 15000, cNr: 3000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["runout", "inflation"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "moderate", psychLiteracy: "medium",
    }
  },
  {
    name: "02-couple-homeowner-on",
    desc: "52M+50F ON, $200k combined, DB pension (gov), home, insured",
    quiz: {
      age: 52, retAge: 63, sex: "M", prov: "ON",
      sources: ["employed"], employer: "gov", income: 120000,
      rrsp: 180000, tfsa: 68000, nr: 45000, lira: 12000, dcBal: 0,
      monthlyContrib: 1500, tfsaC: null, rrspC: null,
      penType: "db", penM: 2800, penIdx: true, penYrs: 25,
      lifestyle: "premium", risk: "balanced", retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: true, homeValue: 720000, mortgage: 180000, mortgageAmort: 8,
      hasRental: false, debts: [],
      couple: "yes", cAge: 50, cSex: "F", cRetAge: 63, cIncome: 80000,
      cRrsp: 95000, cTfsa: 55000, cNr: 20000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["tax", "legacy"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "maximize",
      lifeInsBenefit: 500000, lifeInsPremium: 120,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "03-ccpc-owner-qc",
    desc: "48M QC, CCPC $300k rev, $200k BNR, mix remun, no property",
    quiz: {
      age: 48, retAge: 65, sex: "M", prov: "QC",
      sources: ["ccpc"], source: "ccpc", employer: "",
      income: 90000, rrsp: 55000, tfsa: 40000, nr: 25000, lira: 0, dcBal: 0,
      monthlyContrib: 1200, tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced", retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false, debts: [],
      couple: "no",
      bizRevenue: 300000, bizExpenses: 120000, bizBNR: 200000,
      bizRemun: "mix", bizSalaryPct: 60, bizGrowth: 3,
      bizInvAlloc: 50, bizExtractYrs: 12,
      bizDebt: 0, bizSaleAge: 65, bizSalePrice: 400000, bizACB: 100, bizLCGE: true,
      ippOn: false, ippBal: 0,
      worries: ["tax", "market"],
      objective: "comfortable", confidence: 3,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "mild", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "04-rental-investor-ab",
    desc: "55F+53M AB, primary+rental, HELOC, part-time, growth",
    quiz: {
      age: 55, retAge: 63, sex: "F", prov: "AB",
      sources: ["employed"], employer: "small", income: 95000,
      rrsp: 120000, tfsa: 55000, nr: 80000, lira: 0, dcBal: 0,
      monthlyContrib: 1500, tfsaC: 7000, rrspC: 11000,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "balanced", retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "yes", parttimeAmount: 2500, parttimeYears: 5,
      homeowner: true, homeValue: 580000, mortgage: 120000, mortgageAmort: 6,
      heloc: 40000, helocRate: 6.5,
      hasRental: true, rentalValue: 380000, rentalMortgage: 180000,
      rentalAmort: 18, rentalIncome: 30000, rentalExpenses: 8000,
      rentalDpaAccum: 45000, rentalSaleAge: 70,
      debts: [],
      couple: "yes", cAge: 53, cSex: "M", cRetAge: 65, cIncome: 75000,
      cRrsp: 65000, cTfsa: 40000, cNr: 15000, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["tax", "market"],
      objective: "comfortable", confidence: 4,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "05-heavy-debt-couple-qc",
    desc: "38M+35F QC, $85k combined, $65k debt, cozy, panic",
    quiz: {
      age: 38, retAge: 65, sex: "M", prov: "QC",
      sources: ["employed"], employer: "small", income: 48000,
      rrsp: 5000, tfsa: 3000, nr: 0, lira: 0, dcBal: 0,
      monthlyContrib: 200, tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "cozy", risk: "balanced", retSpM: 0,
      qppAge: 65, oasAge: 65,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false,
      debts: [
        { type: "cc", amount: 18000, rate: 0, minPayment: 0 },
        { type: "car", amount: 25000, rate: 6.9, minPayment: 450 },
        { type: "loc", amount: 12000, rate: 7.5, minPayment: 0 },
        { type: "student", amount: 10000, rate: 4.5, minPayment: 150 },
      ],
      couple: "yes", cAge: 35, cSex: "F", cRetAge: 65, cIncome: 37000,
      cRrsp: 2000, cTfsa: 1500, cNr: 0, cLira: 0,
      cPenType: "none", cPenM: 0, cQppAge: 65, cOasAge: 65,
      worries: ["runout", "health", "inflation"],
      objective: "survive", confidence: 1,
      decaissement: "minimal", succObjective: "neutral",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "high", psychDiscipline: "low", psychLiteracy: "low",
    }
  },
  {
    name: "06-fire-single-bc",
    desc: "30M BC, $110k, FIRE at 45, growth, QPP at 70",
    quiz: {
      age: 30, retAge: 45, sex: "M", prov: "BC",
      sources: ["employed"], employer: "tech", income: 110000,
      rrsp: 45000, tfsa: 35000, nr: 60000, lira: 0, dcBal: 0,
      monthlyContrib: 3500, tfsaC: null, rrspC: null,
      penType: "none", penM: 0,
      lifestyle: "active", risk: "growth", retSpM: 0,
      qppAge: 70, oasAge: 70,
      parttime: "no", parttimeAmount: 0, parttimeYears: 0,
      homeowner: false, homeValue: 0, mortgage: 0, mortgageAmort: 0,
      hasRental: false, debts: [],
      couple: "no",
      worries: ["market", "inflation"],
      objective: "freedom", confidence: 5,
      decaissement: "minimal", succObjective: "consume",
      lifeInsBenefit: 0, lifeInsPremium: 0,
      fhsaBal: 0, fhsaContrib: 0,
      psychAnxiety: "calm", psychDiscipline: "strong", psychLiteracy: "high",
    }
  },
  {
    name: "07-wealthy-couple-ab",
    desc: "50F AB, 200k household, $1M saved, DC pension (large employer)",
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
  console.log(`[Intermédiaire] Mode: ${mode}, ${profiles.length} profiles\n`);

  for (const profile of profiles) {
    const { name, desc, quiz } = profile;
    console.log(`── ${name}: ${desc}`);

    const p = translateToMCInter(quiz);
    const mcParams = { ...p };
    delete mcParams._quiz; delete mcParams._report;

    if (mode === 'prompts') {
      const mc = runMC(p, 5000);
      const stratData = run5Strategies(p as any);
      const costDelay = calcCostOfDelay(p as any);
      const minReturn = calcMinViableReturn(p as any);
      const D = extractReportDataInter(mc, p);
      const prompt = buildAIPromptInter(D, p, true, p._quiz || {}, stratData);

      writeFileSync(join(reportDir, `${name}.quiz.json`), JSON.stringify(quiz, null, 2));
      writeFileSync(join(reportDir, `${name}.mc-params.json`), JSON.stringify(mcParams, null, 2));
      writeFileSync(join(reportDir, `${name}.data.json`), JSON.stringify({
        grade: D.grade, successPct: D.successPct, withdrawalRatePct: D.withdrawalRatePct,
        retBal: D.retBal, rMedF: D.rMedF, rP5F: D.rP5F, rP95F: D.rP95F,
        govMonthly: D.govMonthly, qppMonthly: D.qppMonthly, oasMonthly: D.oasMonthly,
        dbPensionMonthly: D.dbPensionMonthly,
        gapMonthly: D.gapMonthly, coveragePct: D.coveragePct,
        taxCurrentEffective: D.taxCurrentEffective, taxRetirementEffective: D.taxRetirementEffective,
        costDelay, minReturn, avgDeath: mc.avgDeath, medRuin: mc.medRuin,
        obsLabels: prompt.obsLabels,
      }, null, 2));
      writeFileSync(join(reportDir, `${name}.ai-prompt.json`), JSON.stringify({ sys: prompt.sys, usr: prompt.usr, obsLabels: prompt.obsLabels }, null, 2));

      console.log(`  Grade: ${D.grade}, Success: ${D.successPct}%, RetBal: ${D.retBal?.toLocaleString()}, Obs: ${[prompt.obsLabels?.obs_2_topic, prompt.obsLabels?.obs_3_topic].filter(Boolean).join(', ')}`);

      // Also render HTML in same pass (atomic — same MC results)
      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  (no AI slots — using fallbacks)`);
      }

      const html = renderReportHTMLInter(D, mc, stratData, p, 'fr', ai, costDelay, minReturn, null, prompt.obsLabels);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }

    if (mode === 'render') {
      // Render-only mode (uses existing AI slots with fresh MC — legacy mode)
      const mc = runMC(p, 5000);
      const stratData = run5Strategies(p as any);
      const costDelay = calcCostOfDelay(p as any);
      const minReturn = calcMinViableReturn(p as any);
      const D = extractReportDataInter(mc, p);
      const prompt = buildAIPromptInter(D, p, true, p._quiz || {}, stratData);

      const aiPath = join(reportDir, `${name}.ai-slots.json`);
      let ai: Record<string, string> = {};
      if (existsSync(aiPath)) {
        ai = JSON.parse(readFileSync(aiPath, 'utf8'));
        console.log(`  AI loaded: ${Object.keys(ai).filter(k => ai[k]).length} slots`);
      } else {
        console.log(`  WARNING: ${aiPath} not found, using fallbacks`);
      }

      const html = renderReportHTMLInter(D, mc, stratData, p, 'fr', ai, costDelay, minReturn, null, prompt.obsLabels);
      writeFileSync(join(reportDir, `${name}.html`), html, 'utf8');
      console.log(`  Written: ${name}.html (${html.length} chars)`);
    }
  }

  if (mode === 'prompts') {
    const auditCards = profiles.map(p => {
      const params = translateToMCInter(p.quiz);
      const mc = runMC(params, 5000);
      const D = extractReportDataInter(mc, params);
      return {
        name: p.name, desc: p.desc, quiz: p.quiz,
        grade: D.grade, successPct: D.successPct,
        retBal: D.retBal, rMedF: D.rMedF,
        govMonthly: D.govMonthly, coveragePct: D.coveragePct,
      };
    });
    writeFileSync(join(refDir, 'intermediaire-profiles-audit.json'), JSON.stringify(auditCards, null, 2));
    writeFileSync(join(refDir, 'intermediaire-pipeline.md'), `# Intermédiaire Pipeline Reference\nGenerated: ${new Date().toISOString()}\nProfiles: ${profiles.length} × 5,000 MC sims + 5 strategies × 1,000 sims\n\n## Pipeline\nquiz → translateToMCInter → runMC(5000) → run5Strategies → extractReportDataInter → buildAIPromptInter → AI → renderReportHTMLInter\n\n## Slots (17)\nsnapshot_intro, objectif, savings_context, income_mix, tax_context, longevity_risk, sequence_risk, benchmark_context, obs_1, obs_2, obs_3, obs_4, obs_5, priority_actions, strategy_highlight, couple_analysis, ccpc_context\n`);
    console.log(`\nReference docs written to ${refDir}/`);
  }

  console.log(`\nDone (mode: ${mode}).`);
}

main();
