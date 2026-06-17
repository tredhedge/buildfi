// bilan360-personas/build-profiles.mjs
// Turn the 5 customer wizard-answer personas into engine-param profiles using
// the REAL production translator (lib/quiz-translator-360.ts), then write a
// profiles.json the standard realai pipeline consumes via BF_REALAI_BASE.
//
//   node build-profiles.mjs
//   BF_REALAI_BASE=planner/report/realai/bilan360-personas node ../gen-real-mc.mjs
//   BF_REALAI_BASE=planner/report/realai/bilan360-personas node ../build-realai-reports.js dump
//   (narrate → responses/)
//   BF_REALAI_BASE=planner/report/realai/bilan360-personas node ../build-realai-reports.js render

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { translateBilan360 } from '../../../../lib/quiz-translator-360.ts';
import { PERSONAS } from './personas.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const d of ['mc', 'prompts', 'responses', 'output']) {
  fs.mkdirSync(path.join(__dirname, d), { recursive: true });
}

const profiles = PERSONAS.map((p) => {
  const params = translateBilan360(p.answers, p.phase);
  return {
    id: p.id,
    lang: p.lang,
    // expert mode so the Risk & sensitivity section renders (the visual auditor
    // requires premium reports to be expert mode; audit 2026-06-16 decision).
    mode: 'expert',
    sku: 'bilan',
    phase: p.phase,
    finLiteracy: p.prefs.finLiteracy,
    stressLevel: p.prefs.stressLevel,
    detailPref: p.prefs.detailPref,
    client: p.client,
    params,
  };
});

fs.writeFileSync(path.join(__dirname, 'profiles.json'), JSON.stringify({ profiles }, null, 2));

console.log('Wrote profiles.json with ' + profiles.length + ' customer-questionnaire personas:');
for (const pr of profiles) {
  const m = pr.params;
  console.log('  ' + (pr.id + '_' + pr.lang).padEnd(26) +
    ' phase=' + pr.phase.padEnd(11) +
    ' age=' + m.age + ' ret=' + m.retAge +
    ' couple=' + (m.cOn ? 'y' : 'n') +
    ' sal=' + m.sal +
    ' rrsp=' + m.rrsp + ' tfsa=' + m.tfsa +
    ' retSpM=' + m.retSpM +
    ' gov$/mo=' + (m._report ? m._report.govTotalMonthly : '?'));
}
