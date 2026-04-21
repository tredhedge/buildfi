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
['report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
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
  return {
    params: prof.params, mc: mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref
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
  console.log('Rendering reports with real AI responses...');
  let ok = 0, missing = 0;
  PROFILES.forEach(prof => {
    const respPath = path.join(__dirname, 'responses', prof.id + '_' + prof.lang + '.json');
    if (!fs.existsSync(respPath)) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — no response file at ' + respPath);
      missing++;
      return;
    }
    const responseRaw = fs.readFileSync(respPath, 'utf8');
    let responseJson;
    try { responseJson = JSON.parse(responseRaw); } catch (e) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — response JSON parse error: ' + e.message);
      missing++;
      return;
    }
    const data = preparePayload(prof);
    data.ai = responseJson;
    const html = buildReport(data);
    const fname = prof.id + '_' + prof.lang + '.html';
    fs.writeFileSync(path.join(__dirname, 'output', fname), html, 'utf8');
    console.log('  ✓ ' + fname + ' (' + Math.round(html.length / 1024) + ' KB)');
    ok++;
  });
  console.log('\nDone. ' + ok + '/' + PROFILES.length + ' rendered, ' + missing + ' missing responses.');
  process.exit(missing > 0 ? 1 : 0);
}

console.error('Unknown command. Use: dump | render');
process.exit(1);
