#!/usr/bin/env node
// build-realai-reports.js — Generate reports using real AI (Claude Opus 4.7)
// driven by real MC payloads from the validated engine (lib/engine/index.js).
//
// Pipeline (three stages, run in order):
//
//   1. node report/realai/gen-real-mc.mjs
//      → runs MC per profile, writes report/realai/mc/{profile}_{lang}.json
//
//   2. node report/realai/build-realai-reports.js dump
//      → writes report/realai/prompts/{profile}_{lang}.json (system+user prompts)
//        Claude Opus 4.7 then reads each prompt and writes
//        report/realai/responses/{profile}_{lang}.json
//        (raw JSON object with one key per requested slot)
//
//   3. node report/realai/build-realai-reports.js render
//      → loads mc payload + AI response, renders
//        report/realai/output/{profile}_{lang}.html
//
// Profiles: read from profiles.json (single source, shared with gen-real-mc.mjs)
//
// Engine note: this script never invokes runMC directly. It consumes the
// payloads that gen-real-mc wrote. All numbers/charts in the final HTML
// trace back to the validated v2 engine.
'use strict';

const fs = require('fs');
const path = require('path');

// ── Node browser-like globals (mirrors report/test-reports.js) ───────────
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, writable: true, configurable: true });

const reportDir = path.join(__dirname, '..');

// Pre-load client-side modules as source strings so report-pdf.js can inline
// them in the generated self-contained HTML. Must be set BEFORE report-pdf.js
// is eval'd (it reads window.BF_*_JS at module scope).
function _readOptional(name) {
  try { return fs.readFileSync(path.join(reportDir, name), 'utf8'); } catch (e) { return ''; }
}
global.window.BF_INTERACTIVE_JS = _readOptional('report-interactive.js');
global.window.BF_TOOLTIP_JS     = _readOptional('report-tooltip.js');
global.window.BF_CONSTANTS_JS   = _readOptional('report-constants-2026.js');
global.window.BF_ENGINE_JS      = _readOptional('report-engine.js');
global.window.BF_WHATIF_JS      = _readOptional('report-whatif.js');
global.window.BF_GLOSSARY_JS    = _readOptional('report-glossary.js');

// CLASSIFIER-RENDER-PLAN Phase 1: report-render-profile.js loaded BEFORE
// report-data.js so that BData.buildReportPayload can read from
// window.BFRenderProfile.deriveRenderProfile when stamping d.renderProfile.
['report-render-profile.js', 'report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
  const code = fs.readFileSync(path.join(reportDir, f), 'utf8');
  try { eval(code); } catch (e) { console.error(`Failed to load ${f}:`, e.message); process.exit(1); }
});

const buildReport = window.buildReport;
const BAiPrompt = window.BAiPrompt;
const BData = window.BData;
if (!buildReport || !BAiPrompt || !BData) {
  console.error('Modules failed to load on window');
  process.exit(1);
}

// ── Load profiles from single source ───────────────────────────────────────
const profilesPath = path.join(__dirname, 'profiles.json');
const PROFILES = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;

// ── Real MC loader: reads payloads produced by gen-real-mc.mjs ────────────
// Numbers/charts/tables come from the validated engine. Do NOT reintroduce
// synthetic generators here — that pattern fed the AI fabricated values.
const mcDir = path.join(__dirname, 'mc');
function loadRealMC(profId, lang) {
  const fp = path.join(mcDir, profId + '_' + lang + '.json');
  if (!fs.existsSync(fp)) {
    throw new Error('Missing real MC payload at ' + fp + ' — run gen-real-mc.mjs first.');
  }
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}

// ── Build payload + prompt for one profile (real-engine MC) ───────────────
function preparePayload(prof) {
  const mc = loadRealMC(prof.id, prof.lang);
  // NOTE: `_naiveMC` (tax-alpha comparator) is intentionally NOT populated here.
  // A prior implementation fabricated it by multiplying tax × 1.15, which fed the
  // AI a number with no engine basis. Real implementation will come from gen-real-mc
  // running a second MC with wStrat='standard' and emitting it on the payload.
  // Until then: no taxAlpha in prompt, no fabricated tax-alpha KPI.
  // sku → includeSimulator flag. Bilan SKU embeds the live What-If; Planner
  // SKU points readers back to the live Planner tool instead. Default is
  // 'bilan' (includeSimulator=true) when sku is unspecified, since legacy
  // profiles predate the flag.
  const includeSim = prof.includeSimulator !== false;
  return {
    params: prof.params, mc: mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref,
    sku: prof.sku || 'bilan',
    includeSimulator: includeSim
  };
}

function buildPromptFor(prof) {
  const data = preparePayload(prof);
  const payload = BData.buildReportPayload(data);
  if (!payload || payload.empty) throw new Error('Empty payload for ' + prof.id);
  const promptObj = BAiPrompt.buildPrompt(payload);
  return { data: data, payload: payload, prompt: promptObj };
}

// ── CLI dispatch ───────────────────────────────────────────────────────────
const cmd = process.argv[2] || 'render';

if (cmd === 'dump') {
  console.log('Dumping prompts for ' + PROFILES.length + ' profiles...');
  PROFILES.forEach(prof => {
    const built = buildPromptFor(prof);
    const fname = prof.id + '_' + prof.lang + '.json';
    const out = {
      profile: prof.id,
      lang: prof.lang,
      slotKeys: built.prompt.slotKeys,
      system: built.prompt.system,
      user: built.prompt.user
    };
    fs.writeFileSync(path.join(__dirname, 'prompts', fname), JSON.stringify(out, null, 2));
    console.log('  ✓ ' + fname + ' (slots=' + built.prompt.slotKeys.length + ', user=' + built.prompt.user.length + ' chars)');
  });
  console.log('\nNext: write Claude responses to report/realai/responses/{profile}_{lang}.json');
  console.log('  Each response file = a JSON object with one key per slot in slotKeys.');
  console.log('Then re-run with: node report/realai/build-realai-reports.js render');
  process.exit(0);
}

if (cmd === 'render') {
  console.log('Rendering reports...');
  /*
    Codex rail TOC + Reading/Explore toggle (Plan v2.2 followup, 2026-04-29).
    The codex view-toggle script (design-lab/experiments/report-view-toggle/
    _codex_view_toggle.js) was authored against rendered realai reports —
    it transforms the in-document .toc into a sticky .bf-pageify-rail with
    scroll-spy and adds a Reading/Explore mode toggle. Injecting it into
    every rendered report so the rail experience travels with the build,
    not as a manual after-the-fact decoration.
  */
  const codexInjectionPath = path.join(__dirname, '..', '..', '..',
    'design-lab', 'experiments', 'report-view-toggle', '_codex_view_toggle.js');
  let codexScript = '';
  try {
    /*
      The realai renderer marks the in-document <div class="toc"> as
      bf-toc-print-only, which has @media screen { display:none !important }
      (set in report-interactive.js). The codex script CLONES that TOC
      into the rail, so the cloned copy inherits the hide rule and the
      rail comes up empty. We prepend a small CSS override that re-shows
      the cloned TOC when it's inside the rail or the source-toc swap-in.
    */
    const codexRailOverrides = '\n<style data-bf-codex-rail-overrides="1">\n' +
      '.bf-pageify-rail .toc.bf-toc-print-only { display: block !important; }\n' +
      '.bf-pageify-source-toc.bf-toc-print-only { display: block !important; }\n' +
      'body[data-codex-view-toggle="1"] .bf-pageify-source-toc--hidden { display: none !important; }\n' +
      '</style>\n';
    codexScript = codexRailOverrides + '<script data-bf-codex-rail="1">\n' +
      fs.readFileSync(codexInjectionPath, 'utf8') +
      '\n</script>\n';
  } catch (e) {
    console.log('  ⚠ codex rail script not found at ' + codexInjectionPath +
      ' — reports will render without the rail TOC.');
  }

  let ok = 0, fallback = 0, errored = 0;
  PROFILES.forEach(prof => {
    let mcExists;
    try { loadRealMC(prof.id, prof.lang); mcExists = true; } catch (e) { mcExists = false; }
    if (!mcExists) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — missing MC payload (run gen-real-mc.mjs)');
      errored++;
      return;
    }
    const respPath = path.join(__dirname, 'responses', prof.id + '_' + prof.lang + '.json');
    let responseJson = {};
    let usedFallback = false;
    if (fs.existsSync(respPath)) {
      try { responseJson = JSON.parse(fs.readFileSync(respPath, 'utf8')); }
      catch (e) {
        console.log('  ⚠ ' + prof.id + '_' + prof.lang + ' — response JSON parse error, using deterministic fallback');
        responseJson = {};
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }
    try {
      const data = preparePayload(prof);
      data.ai = responseJson;
      let html = buildReport(data);
      // Inject codex rail TOC + Reading/Explore toggle script before </body>.
      // Falls back to no-op if injection content unavailable (logged at start).
      if (codexScript && html.indexOf('</body>') !== -1) {
        html = html.replace('</body>', codexScript + '</body>');
      }
      const fname = prof.id + '_' + prof.lang + '.html';
      fs.writeFileSync(path.join(__dirname, 'output', fname), html, 'utf8');
      const tag = usedFallback ? ' (deterministic fallback)' : '';
      console.log('  ✓ ' + fname + ' (' + Math.round(html.length / 1024) + ' KB)' + tag + ' [sku=' + (prof.sku || 'bilan') + ']');
      if (usedFallback) fallback++;
      ok++;
    } catch (e) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — render error: ' + e.message);
      if (process.env.BF_TRACE) console.log(e.stack);
      errored++;
    }
  });
  console.log('\nDone. ' + ok + '/' + PROFILES.length + ' rendered (' + fallback + ' deterministic, ' + (ok - fallback) + ' with AI), ' + errored + ' errors.');
  process.exit(errored > 0 ? 1 : 0);
}

console.error('Unknown command. Use: dump | render');
process.exit(1);
