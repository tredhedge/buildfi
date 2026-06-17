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

// AMF sanitizer (audit 2026-06-16): the render path previously injected
// responses/*.json verbatim, so any banned stem committed in a stale response
// leaked to the HTML. Every AI slot now passes through softenAISlot +
// FORBIDDEN_TERMS before render, mirroring the production webhook path.
const amfSanitize = require('../amf-sanitize.js');

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
// report-glossary.js is eval'd here (not just inlined) so that
// _renderGlossaryAppendix() can call window.BFGlossary.renderAppendix(lang)
// at SSR time. Without this, the glossary section falls back to the
// "Glossaire indisponible." stub and the runtime hydrator can't fill it
// (it only filters existing terms, doesn't insert).
['report-render-profile.js', 'report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-glossary.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
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
// Data root override (audit 2026-06-16): BF_REALAI_BASE repoints the data dirs
// (profiles.json + mc/prompts/responses/output) to a separate directory while
// the report modules still load relative to __dirname. Used by the separate
// bilan360-personas/ pipeline so customer-questionnaire personas never mix with
// the 20 validation profiles. Defaults to __dirname (the 20-profile set).
const DATA_DIR = process.env.BF_REALAI_BASE ? path.resolve(process.env.BF_REALAI_BASE) : __dirname;
const profilesPath = path.join(DATA_DIR, 'profiles.json');
const PROFILES = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;

// ── Real MC loader: reads payloads produced by gen-real-mc.mjs ────────────
// Numbers/charts/tables come from the validated engine. Do NOT reintroduce
// synthetic generators here — that pattern fed the AI fabricated values.
const mcDir = path.join(DATA_DIR, 'mc');
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
  // tax-alpha comparator: `_naiveMC` is now populated by gen-real-mc.mjs (a real
  // second MC run with wStrat='standard'); report-data.js computes _taxAlpha as a
  // real-dollar delta (_naiveTaxReal - _optTaxReal). The old "× 1.15 fabrication"
  // is gone. taxAlpha surfaces only for wStrat==='optimized' profiles that carry
  // _naiveMC.medRevData; null otherwise (no fabricated KPI).
  // sku → includeSimulator flag. Bilan SKU embeds the live What-If; Planner
  // SKU points readers back to the live Planner tool instead. Default is
  // 'bilan' (includeSimulator=true) when sku is unspecified, since legacy
  // profiles predate the flag.
  const includeSim = prof.includeSimulator !== false;
  // clientExport mode toggle (Phase 2, Codex audit 2026-05-01).
  // Off by default — interactive payload + What-If simulator preserved.
  // Set BUILDFI_CLIENT_EXPORT=1 to dry-run the hardened static export
  // once the renderer's clientExport-aware code paths land. Profile JSON
  // can also opt in per-profile via prof.clientExport === true.
  const clientExport = prof.clientExport === true || process.env.BUILDFI_CLIENT_EXPORT === '1';
  return {
    params: prof.params, mc: mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref,
    sku: prof.sku || 'bilan',
    includeSimulator: includeSim,
    clientExport: clientExport
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
    fs.writeFileSync(path.join(DATA_DIR, 'prompts', fname), JSON.stringify(out, null, 2));
    console.log('  ✓ ' + fname + ' (slots=' + built.prompt.slotKeys.length + ', user=' + built.prompt.user.length + ' chars)');
  });
  console.log('\nNext: write Claude responses to report/realai/responses/{profile}_{lang}.json');
  console.log('  Each response file = a JSON object with one key per slot in slotKeys.');
  console.log('Then re-run with: node report/realai/build-realai-reports.js render');
  process.exit(0);
}

if (cmd === 'render') {
  // ── GUARDRAIL (audit 2026-06-16) ─────────────────────────────────────────
  // This branch is the DRAFT renderer: sanitize → buildReport → dedup → write.
  // It runs NO auditors, NO fix-plan, and NO ship gate. Output here is for fast
  // iteration ONLY and must NEVER be delivered to a client. For a deliverable
  // report, use run-pipeline.mjs — only profiles that pass the ship gate land in
  // final/; the rest go to review/*.fail.json. See planner/report/AUDIT.md.
  console.log('\n' +
    '╔══════════════════════════════════════════════════════════════════════╗\n' +
    '║  DRAFT RENDER — NOT ship-gated. Do NOT deliver output/ to clients.    ║\n' +
    '║  No auditors / fix-plan / ship gate run on this path.                 ║\n' +
    '║  Deliverables: node run-pipeline.mjs  →  final/ (gated) | fail.json   ║\n' +
    '╚══════════════════════════════════════════════════════════════════════╝');
  console.log('Rendering DRAFT reports...');
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

  // Optional profile filter: `node build-realai-reports.js render <slug>`
  // renders only matching profiles (id substring match). Used for spot
  // testing one report without re-running the full 20-profile matrix.
  const profileFilter = process.argv[3] || null;
  const filteredProfiles = profileFilter
    ? PROFILES.filter(p => p.id.indexOf(profileFilter) !== -1)
    : PROFILES;
  if (profileFilter) {
    console.log('Filter "' + profileFilter + '" matched ' + filteredProfiles.length + ' profile(s).');
  }

  let ok = 0, fallback = 0, errored = 0;
  filteredProfiles.forEach(prof => {
    let mcExists;
    try { loadRealMC(prof.id, prof.lang); mcExists = true; } catch (e) { mcExists = false; }
    if (!mcExists) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — missing MC payload (run gen-real-mc.mjs)');
      errored++;
      return;
    }
    const respPath = path.join(DATA_DIR, 'responses', prof.id + '_' + prof.lang + '.json');
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
      // AMF sanitize before injecting: soften prescriptive verbs / banned stems,
      // drop any slot that still trips FORBIDDEN_TERMS (renderer then falls back).
      const _san = amfSanitize.sanitizeAiObject(responseJson);
      data.ai = _san.ai;
      if (_san.dropped.length || _san.softened.length) {
        console.log('  · ' + prof.id + '_' + prof.lang + ' — AMF sanitize: softened=[' +
          _san.softened.join(',') + '] dropped=[' + _san.dropped.join(',') + ']');
      }
      let html = buildReport(data);
      // Inject codex rail TOC + Reading/Explore toggle script before </body>.
      // Falls back to no-op if injection content unavailable (logged at start).
      // clientExport gate (Phase 1, Codex audit 2026-05-01): the codex rail
      // injection is itself a <script> block (toggle + scroll-spy). Skip when
      // producing a hardened static deliverable so the report stays inert.
      if (codexScript && !data.clientExport && html.indexOf('</body>') !== -1) {
        html = html.replace('</body>', codexScript + '</body>');
      }
      // Duplicate-id post-process (Codex audit 2026-04-30): the renderer emits
      // some sec-* anchors from multiple code paths (sec-stress×3, sec-cashflow
      // ×2, sec-insurance×2, sec-assumptions×3, sec-glossary×3). Dedup at write
      // time by appending -2/-3/... to subsequent occurrences. Only touches IDs
      // outside <script> blocks (template literals like 'bfwi-' + k + '-out'
      // parse but never become real DOM IDs). Renderer-level dedup is the
      // structural fix; this guarantees rendered artifacts pass the [DUPE IDS]
      // gate immediately.
      html = (function _dedupIds(src) {
        // Skip script bodies.
        const scriptRe = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi;
        const scripts = [];
        const noScripts = src.replace(scriptRe, function (m, open, body, close) {
          scripts.push(open + body + close);
          return ' __SCRIPT_' + (scripts.length - 1) + '__ ';
        });
        const seen = Object.create(null);
        const deduped = noScripts.replace(/(\sid=")([^"]+)(")/g, function (m, pre, id, post) {
          if (seen[id] == null) { seen[id] = 1; return pre + id + post; }
          seen[id]++;
          return pre + id + '-' + seen[id] + post;
        });
        return deduped.replace(/ __SCRIPT_(\d+)__ /g, function (m, i) {
          return scripts[Number(i)];
        });
      })(html);
      const fname = prof.id + '_' + prof.lang + '.html';
      fs.writeFileSync(path.join(DATA_DIR, 'output', fname), html, 'utf8');
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
  console.log('\nDone. ' + ok + '/' + filteredProfiles.length + ' rendered (' + fallback + ' deterministic, ' + (ok - fallback) + ' with AI), ' + errored + ' errors.');
  console.log('⚠ These are DRAFTS (no ship gate). Run run-pipeline.mjs to produce gated, deliverable reports.');
  process.exit(errored > 0 ? 1 : 0);
}

console.error('Unknown command. Use: dump | render');
process.exit(1);
