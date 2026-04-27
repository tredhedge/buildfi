#!/usr/bin/env node
// matrix-render.mjs — Render the SAME profile across the 9 classifier cells
// (3 finLiteracy × 3 detailPref) plus a 9-cell HTML index for side-by-side
// review. Stress level held constant to isolate the literacy × detail axes.
//
// Usage:
//   node planner/report/realai/matrix-render.mjs --profile=hnw_couple [--stress=moderate]
//
// Outputs:
//   planner/report/realai/matrix/{profile_lang}/
//       beg_*_con.html  beg_*_bal.html  beg_*_det.html
//       int_*_con.html  int_*_bal.html  int_*_det.html
//       adv_*_con.html  adv_*_bal.html  adv_*_det.html
//       index.html      ← 9-cell grid with iframes for visual review

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reportDir = path.join(__dirname, '..');
const realai = __dirname;

// Parse args.
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const profileId = args.profile;
const stressLevel = args.stress || 'moderate';
if (!profileId) {
  console.error('Usage: matrix-render.mjs --profile=<id> [--stress=moderate]');
  process.exit(1);
}

// Load profiles + match.
const profiles = JSON.parse(fs.readFileSync(path.join(realai, 'profiles.json'), 'utf8')).profiles;
const prof = profiles.find(p => p.id === profileId);
if (!prof) {
  console.error(`Profile ${profileId} not found in profiles.json`);
  process.exit(1);
}

// Browser-like globals (mirrors run-pipeline.mjs).
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null, activeElement: null, addEventListener: () => {} };
Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, writable: true, configurable: true });
const _readOpt = (n) => { try { return fs.readFileSync(path.join(reportDir, n), 'utf8'); } catch { return ''; } };
global.window.BF_INTERACTIVE_JS = _readOpt('report-interactive.js');
global.window.BF_TOOLTIP_JS     = _readOpt('report-tooltip.js');
global.window.BF_CONSTANTS_JS   = _readOpt('report-constants-2026.js');
global.window.BF_ENGINE_JS      = _readOpt('report-engine.js');
global.window.BF_WHATIF_JS      = _readOpt('report-whatif.js');
global.window.BF_GLOSSARY_JS    = _readOpt('report-glossary.js');
['report-constants-2026.js', 'report-render-profile.js', 'report-formatters.js', 'report-data.js', 'report-charts.js', 'report-actions.js', 'report-glossary.js', 'report-pdf.js', 'report-ai-prompt.js']
  .forEach(f => { try { eval(fs.readFileSync(path.join(reportDir, f), 'utf8')); } catch (e) { console.error(`Failed to load ${f}:`, e.message); process.exit(1); } });
const buildReport = global.window.buildReport;

// Load MC + AI for this profile.
const tag = `${profileId}_${prof.lang}`;
const mc = JSON.parse(fs.readFileSync(path.join(realai, 'mc', `${tag}.json`), 'utf8'));
const respPath = path.join(realai, 'responses', `${tag}.json`);
const ai = fs.existsSync(respPath) ? JSON.parse(fs.readFileSync(respPath, 'utf8')) : {};

// Output dir.
const outDir = path.join(realai, 'matrix', tag);
fs.mkdirSync(outDir, { recursive: true });

const LITS = ['beginner', 'intermediate', 'advanced'];
const DETS = ['concise', 'balanced', 'detailed'];
const SHORT_LIT = { beginner: 'beg', intermediate: 'int', advanced: 'adv' };
const SHORT_DET = { concise: 'con', balanced: 'bal', detailed: 'det' };
const STR3 = stressLevel.slice(0, 3);

const cells = [];
LITS.forEach(lit => {
  DETS.forEach(det => {
    const fname = `${SHORT_LIT[lit]}_${STR3}_${SHORT_DET[det]}.html`;
    const html = buildReport({
      params: prof.params, mc, client: prof.client,
      rptLang: prof.lang, rptMode: prof.mode || 'standard',
      finLiteracy: lit, stressLevel, detailPref: det,
      sku: prof.sku || 'bilan',
      includeSimulator: prof.includeSimulator !== false,
      clientExport: prof.clientExport === true,
      caseDriver: prof.case_driver || null,
      advisor: prof.advisor || null,
      ai
    });
    fs.writeFileSync(path.join(outDir, fname), html, 'utf8');
    // Count distinguishing structural markers for the index page.
    const ids = [...html.matchAll(/<h3 class="sec"[^>]*id="(sec-[\w-]+)"/g)].map(m => m[1]);
    const charts = (html.match(/<svg[^>]*data-bf-chart=/g) || []).length;
    const visibleText = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const wordCount = visibleText.split(/\s+/).length;
    cells.push({ lit, det, fname, ids, sectionCount: ids.length, chartCount: charts, wordCount });
    console.log(`  rendered ${fname}  sections=${ids.length}  charts=${charts}  words=${wordCount}`);
  });
});

// Build a 3×3 index.html grid with iframes pointing at each cell.
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Matrix review — ${tag} (stress=${stressLevel})</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; margin: 0; padding: 16px; background: #f4f1ec; }
  h1 { font-family: 'Playfair Display', Georgia, serif; margin: 0 0 8px; color: #1a1610; }
  p.sub { margin: 0 0 16px; color: #706558; font-size: 13px; }
  .matrix-grid { display: grid; grid-template-columns: 80px repeat(3, 1fr); gap: 8px; align-items: stretch; }
  .col-header, .row-header { font-weight: 700; color: #c49a1a; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; padding: 8px; text-align: center; }
  .row-header { writing-mode: vertical-rl; transform: rotate(180deg); padding: 16px 4px; }
  .cell { background: #fff; border: 1px solid #e0d8c8; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; min-height: 600px; }
  .cell-header { background: #1a2640; color: #faf8f4; padding: 8px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; align-items: center; }
  .cell-header strong { letter-spacing: 0.5px; }
  .cell-meta { font-size: 10px; color: #bccbe0; }
  .cell iframe { flex: 1; border: 0; width: 100%; }
  .cell-footer { padding: 6px 12px; background: #fdfbf6; border-top: 1px solid #e8e0d4; font-size: 10px; font-family: 'JetBrains Mono', monospace; display: flex; justify-content: space-between; }
  .open-link { color: #c49a1a; text-decoration: none; font-weight: 700; }
  .open-link:hover { text-decoration: underline; }
  .legend { margin: 16px 0 0; padding: 12px; background: #fff; border-left: 4px solid #c49a1a; font-size: 12px; line-height: 1.6; }
</style>
</head>
<body>
<h1>Matrix review — ${tag} (stress = ${stressLevel})</h1>
<p class="sub">Same profile, MC payload, AI response. Three literacy levels (rows) × three detail levels (columns). The simulator is included; the export-PDF strip happens only on print.</p>
<div class="matrix-grid">
  <div></div>
  ${DETS.map(d => `<div class="col-header">${d.toUpperCase()}<br><span style="font-size:9px;color:#888">${SHORT_DET[d]}</span></div>`).join('')}
  ${LITS.map(lit => `
    <div class="row-header">${lit.toUpperCase()}<br><span style="font-size:9px;color:#888">${SHORT_LIT[lit]}</span></div>
    ${DETS.map(det => {
      const cell = cells.find(c => c.lit === lit && c.det === det);
      const fname = cell.fname;
      return `
      <div class="cell">
        <div class="cell-header">
          <strong>${SHORT_LIT[lit]}/${SHORT_DET[det]}</strong>
          <span class="cell-meta">${cell.sectionCount} sections · ${cell.chartCount} charts · ${cell.wordCount.toLocaleString()} words</span>
        </div>
        <iframe src="${fname}" loading="lazy"></iframe>
        <div class="cell-footer">
          <span>${fname}</span>
          <a class="open-link" href="${fname}" target="_blank">Open ↗</a>
        </div>
      </div>`;
    }).join('')}
  `).join('')}
</div>
<div class="legend">
  <strong>How to read:</strong> The DIAGONAL is the "matched" reader (beginner+concise, intermediate+balanced, advanced+detailed). OFF-DIAGONAL cells are the interesting ones — they show how the renderer behaves when literacy and detail disagree. A beginner who asked for full detail (top-right corner) should see the same SECTION COUNT as advanced+detailed (bottom-right) but with simpler vocabulary.
</div>
</body>
</html>`;
fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml, 'utf8');

// Print structural diff table to console.
console.log('\n═══ Matrix structural diff ═══');
console.log('Cell'.padEnd(8) + 'Sections'.padStart(10) + 'Charts'.padStart(8) + 'Words'.padStart(10));
cells.forEach(c => {
  console.log(`${SHORT_LIT[c.lit]}/${SHORT_DET[c.det]}`.padEnd(8) + String(c.sectionCount).padStart(10) + String(c.chartCount).padStart(8) + String(c.wordCount).padStart(10));
});
console.log(`\nWrote ${cells.length} cells + index.html to ${outDir}`);
console.log(`Open ${path.relative(process.cwd(), path.join(outDir, 'index.html'))}`);
