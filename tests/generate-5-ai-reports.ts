// Generate 5 AI-narrated Intermédiaire reports
// Step 1: Save prompts for AI generation
// Step 2: Render HTML from saved .ai.json files
import { translateToMCInter } from '../lib/quiz-translator-inter.ts';
import { runMC } from '../lib/engine/index.js';
import { extractReportDataInter, renderReportHTMLInter } from '../lib/report-html-inter.js';
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from '../lib/strategies-inter.ts';
import { buildAIPromptInter } from '../lib/ai-prompt-inter.ts';
import * as fs from 'fs';

const mode = process.argv[2] || 'prompts'; // 'prompts' or 'render'

// 5 diverse profiles covering different archetypes
const profiles: Array<{ name: string; quiz: Record<string, any> }> = [
  {
    name: 'P01-couple-gov-QC',
    quiz: {
      age: 42, retAge: 65, sex: 'F', prov: 'QC', income: 95000,
      rrsp: 45000, tfsa: 30000, nr: 15000, lira: 8000, dcBal: 0,
      monthlyContrib: 800, penType: 'db', penM: 2200, penIdx: true, penYrs: 18,
      lifestyle: 'active', risk: 'balanced', qppAge: 65, oasAge: 65,
      parttime: 'yes', parttimeAmount: 2000, parttimeYears: 4,
      homeowner: true, homeValue: 520000, mortgage: 280000, mortgageAmort: 18,
      debts: [{ type: 'cc', amount: 8500 }, { type: 'student', amount: 12000, rate: 4.5, minPayment: 200 }],
      couple: 'yes', cAge: 40, cSex: 'M', cRetAge: 65, cIncome: 65000,
      cRrsp: 20000, cTfsa: 15000, cNr: 5000, cPenType: 'none',
      cQppAge: 65, cOasAge: 65, employer: 'gov', source: 'employed',
      sources: ['employed'], worries: ['runout', 'tax', 'inflation'],
      objective: 'comfortable', confidence: 3, decaissement: 'minimal',
      succObjective: 'neutral', lifeInsBenefit: 200000,
    },
  },
  {
    name: 'P02-young-single-ON',
    quiz: {
      age: 28, retAge: 60, sex: 'M', prov: 'ON', income: 72000,
      rrsp: 8000, tfsa: 15000, nr: 3000, lira: 0, dcBal: 0,
      monthlyContrib: 600, penType: 'none',
      lifestyle: 'moderate', risk: 'growth', qppAge: 65, oasAge: 67,
      parttime: 'no',
      homeowner: false,
      debts: [{ type: 'student', amount: 28000, rate: 5.2, minPayment: 350 }],
      couple: 'no',
      employer: 'private', source: 'employed',
      sources: ['employed'], worries: ['inflation', 'runout'],
      objective: 'comfortable', confidence: 4, decaissement: 'balanced',
      succObjective: 'growth', lifeInsBenefit: 0,
    },
  },
  {
    name: 'P03-preretire-AB',
    quiz: {
      age: 58, retAge: 62, sex: 'M', prov: 'AB', income: 130000,
      rrsp: 420000, tfsa: 88000, nr: 65000, lira: 45000, dcBal: 0,
      monthlyContrib: 2000, penType: 'dc', penM: 0, dcBal: 180000,
      lifestyle: 'active', risk: 'conservative', qppAge: 65, oasAge: 67,
      parttime: 'yes', parttimeAmount: 3000, parttimeYears: 3,
      homeowner: true, homeValue: 680000, mortgage: 90000, mortgageAmort: 6,
      debts: [],
      couple: 'yes', cAge: 55, cSex: 'F', cRetAge: 60, cIncome: 45000,
      cRrsp: 110000, cTfsa: 45000, cNr: 20000, cPenType: 'db', cPenM: 1800,
      cQppAge: 65, cOasAge: 65, employer: 'private', source: 'employed',
      sources: ['employed'], worries: ['tax', 'health'],
      objective: 'luxury', confidence: 2, decaissement: 'maxincome',
      succObjective: 'generous', lifeInsBenefit: 500000,
    },
  },
  {
    name: 'P04-struggling-QC',
    quiz: {
      age: 50, retAge: 67, sex: 'F', prov: 'QC', income: 48000,
      rrsp: 12000, tfsa: 5000, nr: 0, lira: 0, dcBal: 0,
      monthlyContrib: 200, penType: 'none',
      lifestyle: 'modest', risk: 'balanced', qppAge: 65, oasAge: 65,
      parttime: 'no',
      homeowner: true, homeValue: 280000, mortgage: 160000, mortgageAmort: 20,
      debts: [{ type: 'cc', amount: 14000 }, { type: 'loc', amount: 22000, rate: 7.5, minPayment: 300 }],
      couple: 'no',
      employer: 'private', source: 'employed',
      sources: ['employed'], worries: ['runout', 'inflation', 'debt'],
      objective: 'modest', confidence: 2, decaissement: 'minimal',
      succObjective: 'neutral', lifeInsBenefit: 50000,
    },
  },
  {
    name: 'P05-fire-BC',
    quiz: {
      age: 35, retAge: 50, sex: 'M', prov: 'BC', income: 165000,
      rrsp: 95000, tfsa: 70000, nr: 120000, lira: 0, dcBal: 0,
      monthlyContrib: 4000, penType: 'none',
      lifestyle: 'modest', risk: 'growth', qppAge: 70, oasAge: 70,
      parttime: 'yes', parttimeAmount: 2500, parttimeYears: 5,
      homeowner: false,
      debts: [],
      couple: 'yes', cAge: 33, cSex: 'F', cRetAge: 50, cIncome: 85000,
      cRrsp: 40000, cTfsa: 35000, cNr: 50000, cPenType: 'none',
      cQppAge: 70, cOasAge: 70, employer: 'tech', source: 'employed',
      sources: ['employed'], worries: ['runout', 'inflation'],
      objective: 'comfortable', confidence: 5, decaissement: 'balanced',
      succObjective: 'neutral', lifeInsBenefit: 0,
    },
  },
];

fs.mkdirSync('tests/reports/intermediaire', { recursive: true });

for (const [i, profile] of profiles.entries()) {
  const { name, quiz } = profile;
  console.log(`\n[${i + 1}/5] ${name}`);

  const p = translateToMCInter(quiz);
  const mc = runMC(p, 5000);
  const stratData = run5Strategies(p as any);
  const costDelay = calcCostOfDelay(p as any);
  const minReturn = calcMinViableReturn(p as any);
  const D = extractReportDataInter(mc, p);
  const prompt = buildAIPromptInter(D, p, true, p._quiz || {}, stratData);

  console.log(`  Grade: ${D.grade}, Success: ${D.successPct}%, MinReturn: ${minReturn}%`);
  console.log(`  Obs topics: ${[prompt.obsLabels.obs_2_topic, prompt.obsLabels.obs_3_topic, prompt.obsLabels.obs_4_topic, prompt.obsLabels.obs_5_topic].join(', ')}`);

  if (mode === 'prompts') {
    // Save prompt for external AI generation
    fs.writeFileSync(`tests/reports/intermediaire/${name}.prompt.json`, JSON.stringify({ sys: prompt.sys, usr: prompt.usr, obsLabels: prompt.obsLabels }, null, 2));
    console.log(`  Prompt saved: ${name}.prompt.json`);
  }

  if (mode === 'render') {
    // Load AI JSON and render
    const aiPath = `tests/reports/intermediaire/${name}.ai.json`;
    let ai: Record<string, string> = {};
    if (fs.existsSync(aiPath)) {
      ai = JSON.parse(fs.readFileSync(aiPath, 'utf8'));
      console.log(`  AI loaded: ${Object.keys(ai).filter(k => (ai as any)[k]).length} slots`);
    } else {
      console.log(`  WARNING: ${aiPath} not found, using fallbacks`);
    }
    const html = renderReportHTMLInter(D, mc, stratData, p, 'fr', ai, costDelay, minReturn, null, prompt.obsLabels);
    fs.writeFileSync(`tests/reports/intermediaire/${name}.html`, html);
    console.log(`  Written: ${name}.html (${html.length} chars)`);
  }

  // Save MC data summary for reference
  fs.writeFileSync(`tests/reports/intermediaire/${name}.data.json`, JSON.stringify({
    grade: D.grade, successPct: D.successPct, minReturn, costDelay,
    retBal: D.retBal, rMedF: D.rMedF, coveragePct: D.coveragePct,
    withdrawalRatePct: D.withdrawalRatePct, avgDeath: D.avgDeath,
    obsLabels: prompt.obsLabels,
  }, null, 2));
}

console.log(`\nDone (mode: ${mode}).`);
