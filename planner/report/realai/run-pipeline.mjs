#!/usr/bin/env node
// run-pipeline.mjs — Production pipeline per REPORT-SHIP-RULES.md.
//
// Pass 1:  build payload + render DRAFT.html
// Pass 2:  build review pack + run all auditors → findings.json + fix-plan.json
// Pass 3:  apply fix plan to data payload (suppress sections, flag rerun, etc.)
// Pass 4:  re-render with corrections → CORRECTED.html
// Pass 5:  re-audit corrected
// Pass 6:  ship gate — only profiles with 0 blockers move to final/
//
// Output:
//   draft/{id}_{lang}.html
//   review/{id}_{lang}.review-pack.json
//   review/{id}_{lang}.findings.json
//   review/{id}_{lang}.fix-plan.json
//   corrected/{id}_{lang}.html
//   review/{id}_{lang}.postfix-findings.json
//   final/{id}_{lang}.html         (only when ship gate passes)
//   review/{id}_{lang}.fail.json   (otherwise)
//   review/_summary.json           (audit table for codex)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const reportDir = path.join(__dirname, '..');

// ── Node browser-like globals (mirrors build-realai-reports.js) ─────────
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, writable: true, configurable: true });

const _readOpt = (n) => { try { return fs.readFileSync(path.join(reportDir, n), 'utf8'); } catch { return ''; } };
global.window.BF_INTERACTIVE_JS = _readOpt('report-interactive.js');
global.window.BF_TOOLTIP_JS     = _readOpt('report-tooltip.js');
global.window.BF_ENGINE_JS      = _readOpt('report-engine.js');
global.window.BF_WHATIF_JS      = _readOpt('report-whatif.js');
global.window.BF_GLOSSARY_JS    = _readOpt('report-glossary.js');

['report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-glossary.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
  const code = fs.readFileSync(path.join(reportDir, f), 'utf8');
  try { eval(code); } catch (e) { console.error(`Failed to load ${f}:`, e.message); process.exit(1); }
});

const buildReport = global.window.buildReport;
const reviewOrch = require(path.join(reportDir, 'review/review-orchestrator.js'));
const corrector = require(path.join(reportDir, 'review/correction-pass.js'));
const packBuilder = require(path.join(reportDir, 'review/review-pack-builder.js'));

const PROFILES = JSON.parse(fs.readFileSync(path.join(__dirname, 'profiles.json'), 'utf8')).profiles;
const mcDir = path.join(__dirname, 'mc');
const respDir = path.join(__dirname, 'responses');
const outDir = __dirname;
const draftDir = path.join(outDir, 'draft');
const reviewDir = path.join(outDir, 'review');
const correctedDir = path.join(outDir, 'corrected');
const finalDir = path.join(outDir, 'final');
[draftDir, reviewDir, correctedDir, finalDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

function preparePayload(prof, ai) {
  const mcPath = path.join(mcDir, prof.id + '_' + prof.lang + '.json');
  const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8'));
  return {
    params: prof.params, mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref,
    sku: prof.sku || 'bilan',
    includeSimulator: (prof.sku || 'bilan') === 'bilan',
    ai: ai || {}
  };
}

const summary = [];

PROFILES.forEach(prof => {
  const tag = prof.id + '_' + prof.lang;
  const respPath = path.join(respDir, tag + '.json');
  const aiResp = fs.existsSync(respPath) ? JSON.parse(fs.readFileSync(respPath, 'utf8')) : {};

  // ─── Pass 1: DRAFT ────────────────────────────────────────────────
  const data1 = preparePayload(prof, aiResp);
  const draftHtml = buildReport(data1);
  const draftPath = path.join(draftDir, tag + '.html');
  fs.writeFileSync(draftPath, draftHtml, 'utf8');

  // ─── Pass 2: review pack + auditors ───────────────────────────────
  const mcPath = path.join(mcDir, tag + '.json');
  const pack = packBuilder.buildReviewPack(prof, draftPath, mcPath, respPath, data1);
  fs.writeFileSync(path.join(reviewDir, tag + '.review-pack.json'),
    JSON.stringify({ profile: pack.profile, canonical: pack.canonical, sections: pack.sections, charts: pack.charts, percentages: pack.percentages.slice(0, 50) }, null, 2));
  const arbResult = reviewOrch.runAuditors(pack);
  fs.writeFileSync(path.join(reviewDir, tag + '.findings.json'), JSON.stringify(arbResult, null, 2));
  fs.writeFileSync(path.join(reviewDir, tag + '.fix-plan.json'), JSON.stringify(arbResult.fix_plan, null, 2));

  const preBlockers = arbResult.blocker_count;
  const preMajors = arbResult.major_count;

  // ─── Pass 3: apply fix plan to data payload ───────────────────────
  const data2 = preparePayload(prof, aiResp);
  corrector.applyFixPlan(data2, arbResult.fix_plan);

  // ─── Pass 4: CORRECTED render ─────────────────────────────────────
  const correctedHtml = buildReport(data2);
  const correctedPath = path.join(correctedDir, tag + '.html');
  fs.writeFileSync(correctedPath, correctedHtml, 'utf8');

  // ─── Pass 5: re-audit corrected ──────────────────────────────────
  const pack2 = packBuilder.buildReviewPack(prof, correctedPath, mcPath, respPath, data2);
  const arbResult2 = reviewOrch.runAuditors(pack2);
  fs.writeFileSync(path.join(reviewDir, tag + '.postfix-findings.json'), JSON.stringify(arbResult2, null, 2));

  const postBlockers = arbResult2.blocker_count;
  const postMajors = arbResult2.major_count;

  // ─── Pass 6: ship gate ─────────────────────────────────────────────
  const finalPath = path.join(finalDir, tag + '.html');
  const failPath = path.join(reviewDir, tag + '.fail.json');
  let shipped = false;
  if (postBlockers === 0) {
    fs.writeFileSync(finalPath, correctedHtml, 'utf8');
    if (fs.existsSync(failPath)) fs.unlinkSync(failPath);
    shipped = true;
  } else {
    fs.writeFileSync(failPath, JSON.stringify({
      profile: tag,
      shipped: false,
      remaining_blockers: arbResult2.blockers,
      remaining_majors: arbResult2.majors
    }, null, 2));
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
  }

  summary.push({
    profile: tag,
    sku: prof.sku || 'bilan',
    pre: { blockers: preBlockers, majors: preMajors, minors: arbResult.minor_count },
    post: { blockers: postBlockers, majors: postMajors, minors: arbResult2.minor_count },
    shipped: shipped,
    pre_blocker_categories: [...new Set(arbResult.blockers.map(b => b.category))],
    post_blocker_categories: [...new Set(arbResult2.blockers.map(b => b.category))]
  });

  console.log(`${shipped ? '✓ SHIPPED' : '✗ FAILED'}  ${tag}  pre: ${preBlockers}B/${preMajors}M  post: ${postBlockers}B/${postMajors}M  [sku=${prof.sku || 'bilan'}]`);
});

fs.writeFileSync(path.join(reviewDir, '_summary.json'), JSON.stringify(summary, null, 2));

const totalShipped = summary.filter(s => s.shipped).length;
const total = summary.length;
console.log(`\n=== PIPELINE SUMMARY ===`);
console.log(`Shipped: ${totalShipped}/${total}`);
const blockerHist = {};
summary.forEach(s => s.post_blocker_categories.forEach(c => { blockerHist[c] = (blockerHist[c] || 0) + 1; }));
if (Object.keys(blockerHist).length > 0) {
  console.log(`Remaining blocker categories:`);
  Object.entries(blockerHist).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => console.log(`  ${cat}: ${n}`));
}
process.exit(totalShipped === total ? 0 : 1);
