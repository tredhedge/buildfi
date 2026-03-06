// Generate a single test report for visual audit
import { translateToMCInter } from '../lib/quiz-translator-inter.ts';
import { runMC } from '../lib/engine/index.js';
import { extractReportDataInter, renderReportHTMLInter } from '../lib/report-html-inter.js';
import { run5Strategies, calcCostOfDelay, calcMinViableReturn } from '../lib/strategies-inter.ts';
import { buildAIPromptInter } from '../lib/ai-prompt-inter.ts';
import * as fs from 'fs';

const quiz: Record<string, any> = {
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
};

try {
  const p = translateToMCInter(quiz);
  console.log('Translator OK');
  const mc = runMC(p, 1000);
  console.log('MC OK, succ:', mc.succ.toFixed(3));
  const strat = run5Strategies(p as any);
  console.log('Strategies OK, count:', strat.length);
  const costDelay = calcCostOfDelay(p as any);
  const minReturn = calcMinViableReturn(p as any);
  console.log('costDelay:', costDelay, 'minReturn:', minReturn);
  const D = extractReportDataInter(mc, p);
  console.log('Extract OK, grade:', D.grade, 'successPct:', D.successPct);
  const prompt = buildAIPromptInter(D, p, true, p._quiz || {}, strat);
  console.log('Prompt OK, obsLabels:', JSON.stringify(prompt.obsLabels));
  const html = renderReportHTMLInter(D, mc, strat, p, 'fr', {}, costDelay, minReturn, null, prompt.obsLabels);
  console.log('Render OK, length:', html.length);
  fs.mkdirSync('tests/reports/intermediaire', { recursive: true });
  fs.writeFileSync('tests/reports/intermediaire/audit-check.html', html);
  console.log('Written to tests/reports/intermediaire/audit-check.html');

  // Section presence check
  ['sec-1','sec-2','sec-3','sec-4','sec-5','sec-6','sec-7','sec-8','sec-9','sec-10','sec-11a','sec-12','sec-13','sec-14','sec-15','sec-16'].forEach(s => {
    console.log('  ' + s + ':', html.includes('id="' + s + '"') ? 'YES' : 'NO');
  });
} catch(e: any) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}
