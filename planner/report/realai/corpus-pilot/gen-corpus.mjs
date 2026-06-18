// corpus-pilot/gen-corpus.mjs
// Pilot synthetic corpus for the "≥99% ship error-free" measurement
// (PLAN-100-PERCENT-SHIP.md, Phase B). Turns the shared wizard-answer corpus
// (corpus-data.mjs) into engine-param profiles via the REAL production
// translator (lib/quiz-translator-360.ts) and writes profiles.json for the
// standard realai pipeline (consumed via BF_REALAI_BASE).
//
//   node corpus-pilot/gen-corpus.mjs
//   BF_REALAI_BASE=planner/report/realai/corpus-pilot node ../gen-real-mc.mjs
//   BF_REALAI_BASE=planner/report/realai/corpus-pilot node ../build-realai-reports.js render   # deterministic (no AI)
//   BF_REALAI_BASE=planner/report/realai/corpus-pilot node ./run-corpus-gate.mjs               # lab-renderer gate
//   node_modules/.bin/tsx corpus-pilot/run-prod-parity.mjs                                      # PROD-renderer gate

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateBilan360 } from '../../../../lib/quiz-translator-360.ts';
import { CORPUS } from './corpus-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const d of ['mc', 'prompts', 'responses', 'output']) {
  fs.mkdirSync(path.join(__dirname, d), { recursive: true });
}

const profiles = CORPUS.map((c) => ({
  id: c.id,
  lang: c.lang,
  mode: 'expert', // render all sections (visual auditor requires expert-mode premium reports)
  sku: 'bilan',
  phase: c.phase,
  finLiteracy: c.prefs.finLiteracy,
  stressLevel: c.prefs.stressLevel,
  detailPref: c.prefs.detailPref,
  client: c.client,
  params: translateBilan360(c.answers, c.phase),
}));

fs.writeFileSync(path.join(__dirname, 'profiles.json'), JSON.stringify({ profiles }, null, 2));

console.log(`Wrote profiles.json with ${profiles.length} corpus profiles:`);
const byPhase = {};
for (const pr of profiles) {
  byPhase[pr.phase] = (byPhase[pr.phase] || 0) + 1;
  const m = pr.params;
  console.log('  ' + (pr.id + '_' + pr.lang).padEnd(24) +
    ' ' + pr.phase.padEnd(11) +
    ' age=' + String(m.age).padStart(2) + ' ret=' + String(m.retAge ?? '-').padStart(2) +
    ' couple=' + (m.cOn ? 'y' : 'n') +
    ' prov=' + (m.prov || '?') +
    ' rrsp=' + String(m.rrsp).padStart(8) +
    ' retSpM=' + String(m.retSpM).padStart(6));
}
console.log('\nPhase mix:', JSON.stringify(byPhase));
const langMix = profiles.reduce((a, p) => ((a[p.lang] = (a[p.lang] || 0) + 1), a), {});
console.log('Lang mix:', JSON.stringify(langMix));
