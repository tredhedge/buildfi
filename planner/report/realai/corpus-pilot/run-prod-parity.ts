// corpus-pilot/run-prod-parity.mjs
// RENDERER PARITY: render the same corpus profiles through the PRODUCTION
// Bilan 360 renderer (lib/report-html-360.ts) — the exact path the live webhook
// uses — and apply the production ship gate. The lab corpus (run-corpus-gate.mjs)
// renders via the lab renderer (report-pdf.js); this catches divergence between
// the two, which is where real shipping bugs hide (PLAN-100-PERCENT-SHIP §A/§B).
//
//   node corpus-pilot/run-prod-parity.mjs
//
// Deterministic: AI narration is skipped (ai = {}), exactly mirroring the
// webhook's AI-timeout fallback branch, so static fallbacks render. This
// measures the structural/numeric/locale/compliance floor of the PROD renderer.
// Writes prod-parity-report.json + the rendered HTML to output-prod/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Run via tsx (extensionless / directory imports resolved by tsx):
//   node_modules/.bin/tsx corpus-pilot/run-prod-parity.mjs
import { runMC } from '../../../../lib/engine';
import { translateBilan360 } from '../../../../lib/quiz-translator-360';
import { run5Strategies } from '../../../../lib/strategies-inter';
import { extractReportData360, renderReportHTML360 } from '../../../../lib/report-html-360';
import { buildBuildFiData } from '../../../../lib/report-data-360';
import { evaluateReportShip } from '../../../../lib/report-ship-gate';
import { CORPUS } from './corpus-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'output-prod');
fs.mkdirSync(outDir, { recursive: true });

// Reproduce the webhook's Bilan 360 render pipeline for one profile (no AI).
function renderProd(c) {
  const quiz = c.answers;
  const phase = c.phase;
  const params = translateBilan360(quiz, phase);
  params.firstName = c.client.firstName;
  if (c.client.spouseFirstName) params.spouseName = c.client.spouseFirstName;

  const mcBase = runMC(params, 5000);
  if (!mcBase) throw new Error('MC baseline null');

  // Phase-conditional extra runs (mirror webhook, reduced fidelity is fine for a
  // gate test — the renderer must produce clean HTML regardless).
  let stratData = null;
  if (phase === 'ACCUM' || phase === 'TRANSITION') stratData = run5Strategies(params);

  let mcMelt1 = null, mcMelt2 = null;
  if (phase === 'TRANSITION' || phase === 'DECUM') {
    const meltTarget = params._report?.meltTarget ?? 58523;
    const meltIsBase = !!params._report?.meltIsBase;
    if (!meltIsBase) {
      const t2 = Math.round(meltTarget * 0.75);
      mcMelt1 = runMC({ ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) }, 1000);
      mcMelt2 = runMC({ ...params, retIncome: t2, retSpM: Math.round(t2 / 12) }, 1000);
    }
  }

  let mcC60 = null, mcC65 = null, mcC70 = null;
  if (phase === 'TRANSITION' || phase === 'DECUM') {
    const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === 'true';
    if (!alreadyClaiming) {
      mcC60 = runMC(translateBilan360({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false }, phase), 1000);
      mcC65 = runMC(translateBilan360({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false }, phase), 1000);
      mcC70 = runMC(translateBilan360({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false }, phase), 1000);
    }
  }

  const stWhen = phase === 'ACCUM' ? 'ret' : 'now';
  const mcStressCrash08 = runMC({ ...params, strs: 'crash08', stWhen }, 1000);
  const mcStressStagflation = runMC({ ...params, strs: 'stagflation', stWhen }, 1000);
  const mcStressProlonged = runMC({ ...params, strs: 'prolonged', stWhen }, 1000);

  const extraRuns = { stratData, mcMelt1, mcMelt2, mcC60, mcC65, mcC70, mcStressCrash08, mcStressStagflation, mcStressProlonged };

  const D = extractReportData360(mcBase, params, phase, extraRuns);
  const buildfiData = buildBuildFiData(mcBase, params, phase, c.lang, extraRuns);
  const ai = {}; // deterministic — webhook's AI-fallback branch
  const feedbackToken = '00000000-0000-0000-0000-000000000000';
  const html = renderReportHTML360(D, mcBase, params, c.lang, ai, phase, feedbackToken, extraRuns, buildfiData, { clientExport: false });
  const coreInvalid = D?._integrity?.coreInvalid === true;
  return { html, coreInvalid };
}

const results = [];
const classCounts = {};
let pass = 0;

for (const c of CORPUS) {
  let rec;
  try {
    const { html, coreInvalid } = renderProd(c);
    fs.writeFileSync(path.join(outDir, c.id + '_' + c.lang + '.html'), html, 'utf8');
    const verdict = evaluateReportShip(html, c.lang, { coreInvalid });
    rec = { id: c.id, lang: c.lang, phase: c.phase, ok: verdict.ok, reasons: verdict.reasons };
    if (verdict.ok) pass++;
    else for (const r of verdict.reasons) classCounts[r] = (classCounts[r] || 0) + 1;
  } catch (e) {
    rec = { id: c.id, lang: c.lang, phase: c.phase, ok: false, reasons: ['render_threw:' + e.message] };
    classCounts['render_threw'] = (classCounts['render_threw'] || 0) + 1;
  }
  results.push(rec);
  process.stdout.write(rec.ok ? '.' : 'x');
}
process.stdout.write('\n');

const report = {
  gate: 'evaluateReportShip (production)',
  renderer: 'report-html-360.ts (PRODUCTION Bilan 360 renderer)',
  renderMode: 'deterministic-fallback (no AI narration)',
  total: CORPUS.length,
  passed: pass,
  failed: CORPUS.length - pass,
  passPct: Math.round((pass / CORPUS.length) * 1000) / 10,
  failureClasses: Object.fromEntries(Object.entries(classCounts).sort((a, b) => b[1] - a[1])),
  results,
};
fs.writeFileSync(path.join(__dirname, 'prod-parity-report.json'), JSON.stringify(report, null, 2));

console.log('\n══════════════════════════════════════════════════════════════');
console.log('  PROD-RENDERER PARITY — Bilan 360 (report-html-360.ts)');
console.log('  Gate: evaluateReportShip   Render: deterministic (no AI)');
console.log('══════════════════════════════════════════════════════════════');
console.log(`  Profiles: ${report.total}   PASS: ${report.passed}   FAIL: ${report.failed}   (${report.passPct}% ship)\n`);
if (report.failed > 0) {
  console.log('  Failure classes (count):');
  for (const [cls, n] of Object.entries(report.failureClasses)) console.log(`    ${String(n).padStart(3)}  ${cls}`);
  console.log('\n  Failing profiles:');
  for (const r of results.filter((x) => !x.ok)) {
    console.log(`    x ${(r.id + '_' + r.lang).padEnd(24)} [${r.phase || '?'}]  ${r.reasons.join(', ')}`);
  }
} else {
  console.log('  All profiles pass the production ship gate via the PROD renderer.');
}
console.log('\n  Wrote prod-parity-report.json + output-prod/');
