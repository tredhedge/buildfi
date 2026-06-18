// Print the real Bilan 360 prompt (DATA block + slot list) for one profile,
// so we can see exactly how numbers are represented before tuning provenance.
//   node_modules/.bin/tsx planner/report/realai/corpus-pilot/dump-prompt.ts [index]
import { runMC } from '../../../../lib/engine';
import { translateBilan360 } from '../../../../lib/quiz-translator-360';
import { run5Strategies } from '../../../../lib/strategies-inter';
import { extractReportData360 } from '../../../../lib/report-html-360';
import { buildAIPrompt360 } from '../../../../lib/ai-prompt-360';
import { CORPUS } from './corpus-data.mjs';

const idx = Number(process.argv[2] || 0);
const c = CORPUS[idx];
const params: any = translateBilan360(c.answers, c.phase);
const mc = runMC(params, 2000);
let strat = null;
if (c.phase === 'ACCUM' || c.phase === 'TRANSITION') strat = run5Strategies(params);
const D = extractReportData360(mc as any, params, c.phase, { stratData: strat });
const p = buildAIPrompt360(D as any, params, c.lang === 'fr', c.answers as any, c.phase, strat || undefined);

console.log(`\n##### PROFILE ${c.id}_${c.lang} (${c.phase}) #####`);
// Isolate the DATA block
const m = p.usr.match(/=== DATA ===\n([\s\S]*?)\n\n=== SLOT INSTRUCTIONS ===/);
const dataBlock = m ? m[1] : '(DATA block not found)';
console.log('\n----- DATA block (JSON) -----');
try {
  console.log(JSON.stringify(JSON.parse(dataBlock), null, 1).slice(0, 4000));
} catch {
  console.log(dataBlock.slice(0, 4000));
}
console.log('\n----- SLOT KEYS the model must return -----');
const slotMatch = p.usr.match(/\{("[\s\S]*")\}/);
const keys = [...p.usr.matchAll(/"([a-z_0-9]+)":"/g)].map((x) => x[1]);
console.log([...new Set(keys)].join(', '));
