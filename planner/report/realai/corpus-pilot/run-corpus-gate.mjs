// corpus-pilot/run-corpus-gate.mjs
// Apply the PRODUCTION ship gate (lib/report-ship-gate.ts → evaluateReportShip,
// the exact decision the live webhook/regenerate paths make) to every rendered
// corpus report, and aggregate pass% + failure classes.
//
//   BF_REALAI_BASE=planner/report/realai/corpus-pilot node ./run-corpus-gate.mjs
//
// Writes corpus-report.json (machine-readable backlog) and prints a summary.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateReportShip } from '../../../../lib/report-ship-gate.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.BF_REALAI_BASE ? path.resolve(process.env.BF_REALAI_BASE) : __dirname;
const profiles = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'profiles.json'), 'utf8')).profiles;
const outDir = path.join(DATA_DIR, 'output');

const results = [];
const classCounts = {};
let pass = 0;

for (const prof of profiles) {
  const htmlPath = path.join(outDir, prof.id + '_' + prof.lang + '.html');
  if (!fs.existsSync(htmlPath)) {
    results.push({ id: prof.id, lang: prof.lang, ok: false, reasons: ['render_missing'] });
    classCounts['render_missing'] = (classCounts['render_missing'] || 0) + 1;
    continue;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const verdict = evaluateReportShip(html, prof.lang, { coreInvalid: false });
  results.push({ id: prof.id, lang: prof.lang, phase: prof.phase, ok: verdict.ok, reasons: verdict.reasons });
  if (verdict.ok) pass++;
  else for (const r of verdict.reasons) classCounts[r] = (classCounts[r] || 0) + 1;
}

const report = {
  gate: 'evaluateReportShip (production)',
  renderMode: 'deterministic-fallback (no AI narration)',
  total: profiles.length,
  passed: pass,
  failed: profiles.length - pass,
  passPct: Math.round((pass / profiles.length) * 1000) / 10,
  failureClasses: Object.fromEntries(Object.entries(classCounts).sort((a, b) => b[1] - a[1])),
  results,
};
fs.writeFileSync(path.join(DATA_DIR, 'corpus-report.json'), JSON.stringify(report, null, 2));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  CORPUS PILOT — production ship-gate results');
console.log('  Gate: evaluateReportShip   Render: deterministic fallback (no AI)');
console.log('══════════════════════════════════════════════════════════════');
console.log(`  Profiles: ${report.total}   PASS: ${report.passed}   FAIL: ${report.failed}   (${report.passPct}% ship)\n`);
if (report.failed > 0) {
  console.log('  Failure classes (count):');
  for (const [cls, n] of Object.entries(report.failureClasses)) console.log(`    ${String(n).padStart(3)}  ${cls}`);
  console.log('\n  Failing profiles:');
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`    ✗ ${(r.id + '_' + r.lang).padEnd(24)} [${r.phase || '?'}]  ${r.reasons.join(', ')}`);
  }
} else {
  console.log('  ✓ All profiles pass the production ship gate.');
}
console.log('\n  Wrote corpus-report.json');
