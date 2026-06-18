// Measure the real Bilan 360 AI prompt size per profile, to estimate per-report cost.
//   node_modules/.bin/tsx planner/report/realai/corpus-pilot/measure-prompt-cost.ts
import { runMC } from '../../../../lib/engine';
import { translateBilan360 } from '../../../../lib/quiz-translator-360';
import { run5Strategies } from '../../../../lib/strategies-inter';
import { extractReportData360 } from '../../../../lib/report-html-360';
import { buildAIPrompt360 } from '../../../../lib/ai-prompt-360';
import { CORPUS } from './corpus-data.mjs';

// ~chars→tokens. English/French prose ≈ 4 chars/token; JSON/numbers a bit denser.
const estTokens = (s: string) => Math.round((s || '').length / 4);

const rows: any[] = [];
for (const c of CORPUS.slice(0, 6)) {
  const params: any = translateBilan360(c.answers, c.phase);
  const mc = runMC(params, 2000);
  let strat = null;
  if (c.phase === 'ACCUM' || c.phase === 'TRANSITION') strat = run5Strategies(params);
  const D = extractReportData360(mc as any, params, c.phase, { stratData: strat });
  const p = buildAIPrompt360(D as any, params, c.lang === 'fr', c.answers as any, c.phase, strat || undefined);
  const sysT = estTokens(p.sys), usrT = estTokens(p.usr);
  rows.push({ id: c.id, lang: c.lang, phase: c.phase, sysT, usrT, inT: sysT + usrT });
  console.log(`${(c.id + '_' + c.lang).padEnd(22)} ${c.phase.padEnd(11)} sys≈${String(sysT).padStart(5)}t  usr≈${String(usrT).padStart(5)}t  input≈${String(sysT + usrT).padStart(5)}t`);
}
const avgIn = Math.round(rows.reduce((a, r) => a + r.inT, 0) / rows.length);
console.log(`\nAvg input ≈ ${avgIn} tokens/call.  Output cap = 8000 tokens (maxTokens); typical narration ≈ 2500–3500.`);
