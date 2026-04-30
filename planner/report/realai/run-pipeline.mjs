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
global.window.BF_CONSTANTS_JS   = _readOpt('report-constants-2026.js');
global.window.BF_ENGINE_JS      = _readOpt('report-engine.js');
global.window.BF_WHATIF_JS      = _readOpt('report-whatif.js');
global.window.BF_GLOSSARY_JS    = _readOpt('report-glossary.js');

// A0 — load the fiscal-constants shim BEFORE report-engine.js so all
// inline `var OAS_CLAWBACK_THR = 95323`-style fallbacks read from the
// canonical source. report-constants-2026.js publishes BFConstants on
// the global + back-compat top-level names.
['report-constants-2026.js', 'report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-glossary.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
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
// Phase B: queue of AI slots that failed cross-section audit. In testing
// mode I (Claude) write the regenerated text into responses/{profile}.json
// using the canonical values listed in this queue. In production the
// Anthropic API consumes this same queue. Either way, the queue captures
// the precise instruction set ("write a new gis_insight that quotes
// lifetime_gis=$350K, gis_years=24, in conditional AMF tone").
const todoDir = path.join(outDir, 'responses-todo');
[draftDir, reviewDir, correctedDir, finalDir, todoDir].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

/*
  Codex rail TOC + Reading/Explore toggle injection (Plan v2.2 followup,
  2026-04-29). The codex view-toggle script transforms the in-document
  .toc into a sticky .bf-pageify-rail with scroll-spy. Inject it into
  every rendered draft + corrected + final output so the rail experience
  ships with every report, not as a manual after-the-fact decoration.

  Reference: design-lab/experiments/report-view-toggle/_codex_view_toggle.js
*/
const codexInjectionPath = path.join(__dirname, '..', '..', '..',
  'design-lab', 'experiments', 'report-view-toggle', '_codex_view_toggle.js');
let _codexScriptCache = null;
function getCodexRailScript() {
  if (_codexScriptCache !== null) return _codexScriptCache;
  try {
    /*
      The realai renderer marks the in-document <div class="toc"> as
      bf-toc-print-only, which has @media screen { display:none !important }.
      The codex script clones that TOC into the rail, so the cloned copy
      inherits the hide rule. Prepend an override that re-shows the cloned
      TOC inside the rail and the source TOC when it's swapped in on mobile.
    */
    const railOverrides = '\n<style data-bf-codex-rail-overrides="1">\n' +
      '.bf-pageify-rail .toc.bf-toc-print-only { display: block !important; }\n' +
      '.bf-pageify-source-toc.bf-toc-print-only { display: block !important; }\n' +
      'body[data-codex-view-toggle="1"] .bf-pageify-source-toc--hidden { display: none !important; }\n' +
      '</style>\n';
    _codexScriptCache = railOverrides + '<script data-bf-codex-rail="1">\n' +
      fs.readFileSync(codexInjectionPath, 'utf8') +
      '\n</script>\n';
  } catch (e) {
    console.warn('[run-pipeline] codex rail script not found at ' +
      codexInjectionPath + ' — reports will render without rail TOC.');
    _codexScriptCache = '';
  }
  return _codexScriptCache;
}
function withCodexRail(html) {
  const script = getCodexRailScript();
  if (!script) return html;
  if (html.indexOf('</body>') === -1) return html;
  return html.replace('</body>', script + '</body>');
}

function preparePayload(prof, ai) {
  const mcPath = path.join(mcDir, prof.id + '_' + prof.lang + '.json');
  const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8'));
  return {
    params: prof.params, mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref,
    sku: prof.sku || 'bilan',
    // Reverted 2026-04-28: I previously defaulted clientExport=true here
    // without asking, which stripped the What-If simulator from all 20
    // shipped reports. Bilan+Planner readers BOTH benefit from the
    // simulator. The PRINT / PDF EXPORT path (report-export-service.js)
    // still defaults clientExport=true via _withExportRenderProfile, so
    // PDFs handed to clients are clean. The canonical realai pipeline now
    // keeps the simulator inlined unless a profile explicitly sets
    // clientExport=true.
    clientExport: prof.clientExport === true,
    includeSimulator: prof.includeSimulator !== false,
    // P1.6 — case_driver flows from profile → renderer → action plan re-ranker
    caseDriver: prof.case_driver || null,
    // T2.6 — advisor identity (parameterizable per profile in future; default
    // applied by report-pdf.js if absent).
    advisor: prof.advisor || null,
    ai: ai || {}
  };
}

const summary = [];

// Optional filter: --only=id1,id2 limits the run to a subset of profiles.
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlyIds = onlyArg ? onlyArg.slice('--only='.length).split(',').map(s => s.trim()).filter(Boolean) : null;
const SELECTED = onlyIds ? PROFILES.filter(p => onlyIds.indexOf(p.id) >= 0) : PROFILES;
if (onlyIds) console.log('[pipeline] --only filter: ' + SELECTED.map(p => p.id + '_' + p.lang).join(', '));

// Encode classifier combo into the filename so reviewers can sort/compare
// reports by reader profile without opening each one. Format: profileTag_lit_stress_det.
function _comboTag(prof) {
  const lit = (prof.finLiteracy || 'intermediate').slice(0, 3);   // beg/int/adv
  const str = (prof.stressLevel || 'moderate').slice(0, 3);       // low/mod/hig
  const det = (prof.detailPref || 'balanced').slice(0, 3);        // con/bal/det
  return lit + '_' + str + '_' + det;
}

SELECTED.forEach(prof => {
  // Inputs (MC, AI responses) are keyed by profile_lang only (combo-independent).
  // Outputs (HTML, review packs) gain a __combo suffix so reviewers can sort
  // and diff multiple combos for the same profile side-by-side.
  const tag = prof.id + '_' + prof.lang;
  const outTag = tag + '__' + _comboTag(prof);
  const respPath = path.join(respDir, tag + '.json');
  const aiResp = fs.existsSync(respPath) ? JSON.parse(fs.readFileSync(respPath, 'utf8')) : {};

  // ─── Pass 1: DRAFT ────────────────────────────────────────────────
  const data1 = preparePayload(prof, aiResp);
  const draftHtml = withCodexRail(buildReport(data1));
  const draftPath = path.join(draftDir, outTag + '.html');
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
  const correctedHtml = withCodexRail(buildReport(data2));
  const correctedPath = path.join(correctedDir, outTag + '.html');
  fs.writeFileSync(correctedPath, correctedHtml, 'utf8');

  // ─── Pass 5: re-audit corrected ──────────────────────────────────
  const pack2 = packBuilder.buildReviewPack(prof, correctedPath, mcPath, respPath, data2);
  const arbResult2 = reviewOrch.runAuditors(pack2);
  fs.writeFileSync(path.join(reviewDir, tag + '.postfix-findings.json'), JSON.stringify(arbResult2, null, 2));

  const postBlockers = arbResult2.blocker_count;
  const postMajors = arbResult2.major_count;

  // ─── Phase B4: write AI-regen queue ───────────────────────────────
  // Every AI slot that failed an audit (canonical-quote drift, thesis-
  // band drift, narration tone paradox, etc.) gets a TODO entry. In
  // testing I (Claude) consume the queue and rewrite responses/{tag}.json
  // with canonical-correct text. In production, an Anthropic API loop
  // consumes the same queue. The pipeline ships the deterministic
  // fallback in the meantime (no blanks rule, B5).
  const aiRegenSlots = {};
  const _consumeFindings = (arr) => (arr || []).forEach(f => {
    if (f.fix_kind === 'rerun_ai_slot' && f.fix_target) {
      const slot = f.fix_target;
      if (!aiRegenSlots[slot]) aiRegenSlots[slot] = [];
      aiRegenSlots[slot].push({ rule: f.id, message: f.message, evidence: f.evidence });
    }
  });
  _consumeFindings(arbResult.findings);
  _consumeFindings(arbResult2.findings);
  if (Object.keys(aiRegenSlots).length > 0) {
    const todoPayload = {
      profile: tag,
      generated_at: new Date().toISOString(),
      canonical: pack2.canonical,
      case_driver: prof.case_driver || null,
      slots: aiRegenSlots,
      instructions: 'For each slot, regenerate the AI text using the canonical values in this file. The new text MUST quote canonical metrics within rounding tolerance, match the success-rate posture band, and route every recommendation through "consult a Pl.Fin." (AMF compliance). After regeneration, save into report/realai/responses/' + tag + '.json and re-run the pipeline.'
    };
    fs.writeFileSync(path.join(todoDir, tag + '.json'), JSON.stringify(todoPayload, null, 2));
  } else {
    // Clean up old queue entry when this profile is back to clean.
    const oldTodo = path.join(todoDir, tag + '.json');
    if (fs.existsSync(oldTodo)) fs.unlinkSync(oldTodo);
  }

  // ─── Pass 6: ship gate ─────────────────────────────────────────────
  const finalPath = path.join(finalDir, outTag + '.html');
  const failPath = path.join(reviewDir, outTag + '.fail.json');
  let shipped = false;
  if (arbResult2.can_ship && !data2._dataBlocked) {
    fs.writeFileSync(finalPath, correctedHtml, 'utf8');
    if (fs.existsSync(failPath)) fs.unlinkSync(failPath);
    shipped = true;
  } else {
    fs.writeFileSync(failPath, JSON.stringify({
      profile: tag,
      shipped: false,
      can_ship: arbResult2.can_ship,
      data_blocked: !!data2._dataBlocked,
      remaining_blockers: arbResult2.blockers,
      remaining_majors: arbResult2.majors,
      ai_regen_required: aiRegenSlots
    }, null, 2));
    if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
  }

  const aiRegenCount = Object.keys(aiRegenSlots).length;
  summary.push({
    profile: tag,
    sku: prof.sku || 'bilan',
    pre: { blockers: preBlockers, majors: preMajors, minors: arbResult.minor_count },
    post: { blockers: postBlockers, majors: postMajors, minors: arbResult2.minor_count },
    shipped: shipped,
    pre_blocker_categories: [...new Set(arbResult.blockers.map(b => b.category))],
    post_blocker_categories: [...new Set(arbResult2.blockers.map(b => b.category))],
    ai_regen_slots: aiRegenCount
  });

  const aiTag = aiRegenCount > 0 ? `  ⚠ ai_regen=${aiRegenCount}` : '';
  console.log(`${shipped ? '✓ SHIPPED' : '✗ FAILED'}  ${tag}  pre: ${preBlockers}B/${preMajors}M  post: ${postBlockers}B/${postMajors}M  [sku=${prof.sku || 'bilan'}]${aiTag}`);
});

fs.writeFileSync(path.join(reviewDir, '_summary.json'), JSON.stringify(summary, null, 2));

const totalShipped = summary.filter(s => s.shipped).length;
const total = summary.length;
const totalRegenNeeded = summary.filter(s => (s.ai_regen_slots || 0) > 0).length;
console.log(`\n=== PIPELINE SUMMARY ===`);
console.log(`Shipped: ${totalShipped}/${total}`);
if (totalRegenNeeded > 0) {
  console.log(`AI regen queue (responses-todo/): ${totalRegenNeeded} profile(s) have AI slots that drift from canonical or band.`);
  console.log(`These profiles ship with deterministic-canonical fallback text. Regenerate AI to lift report from B+ to A.`);
}
const blockerHist = {};
summary.forEach(s => s.post_blocker_categories.forEach(c => { blockerHist[c] = (blockerHist[c] || 0) + 1; }));
if (Object.keys(blockerHist).length > 0) {
  console.log(`Remaining blocker categories:`);
  Object.entries(blockerHist).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => console.log(`  ${cat}: ${n}`));
}
process.exit(totalShipped === total ? 0 : 1);
