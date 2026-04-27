#!/usr/bin/env node
// scripts/check-fiscal-constants-drift.mjs
// ══════════════════════════════════════════════════════════════════════
// A0 grep-guard: fails if any fiscal-constant LITERAL appears outside
// the two canonical shim files. Run before commit and in CI.
//
// Detected literals (from lib/constants/engine-shim.js):
//   * 95323                — OAS_CLAWBACK_THR
//   * 1105.43              — GIS_MAX_SINGLE
//   * 665.41               — GIS_MAX_COUPLE  (was drift target 667.41)
//   * 742.31               — OAS_MAX_MONTHLY
//   * 1507.65              — QPP_MAX_MONTHLY
//   * 16452                — FED_PERSONAL
//   * 74600                — QPP_MGA
//   * 85000                — QPP_YAMPE
//   * 108730 / 108680      — QC bracket 2 (former drift)
//
// ALLOWED FILES (the canonical shims + comments referring to drift):
//   - lib/constants/engine-shim.js
//   - lib/constants/engine-constants-2026.ts
//   - lib/constants/fiscal-2026.ts
//   - planner/report/report-constants-2026.js
//   - scripts/check-fiscal-constants-drift.mjs (this file)
//
// Test fixtures and audit logs may also contain numeric literals; this
// script only scans .js / .mjs / .ts files in the production tree.
// ══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

// Numeric literals that are SACRED — must come from the shim. Any other
// occurrence in production code is a drift risk.
const SACRED_LITERALS = [
  // [literal, name, must-be-followed-by-non-digit]
  ['95323', 'OAS_CLAWBACK_THR'],
  ['1105.43', 'GIS_MAX_SINGLE'],
  ['665.41', 'GIS_MAX_COUPLE'],
  ['667.41', 'GIS_MAX_COUPLE_LEGACY_DRIFT'],
  ['742.31', 'OAS_MAX_MONTHLY'],
  ['1507.65', 'QPP_MAX_MONTHLY'],
  ['74600', 'QPP_MGA'],
  ['108730', 'QC_BRACKET_2'],
  ['108680', 'QC_BRACKET_2_LEGACY_DRIFT']
];

const ALLOWED = new Set([
  'lib/constants/engine-shim.js',
  'lib/constants/engine-constants-2026.ts',
  'lib/constants/fiscal-2026.ts',
  'lib/constants-registry.ts',                 // CRON drift-detection reference
  'planner/report/report-constants-2026.js',
  'planner/report/test-reports.js',            // legacy test fixture (TODO: migrate)
  'planner/report/report-whatif.js',           // browser-side simulator (next sprint)
  'lib/quiz-translator-360.ts',                // wizard translator (next sprint)
  'scripts/check-fiscal-constants-drift.mjs'
].map(p => path.normalize(p)));

const SCAN_DIRS = [
  'lib',
  'planner/report'
];

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.cache',
  'realai/final', 'realai/draft', 'realai/corrected', 'realai/mc',
  'realai/responses', 'realai/output', 'realai/review', 'realai/prompts'
]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      // Skip realai subdirectories matched by relative path
      const rel = path.relative(repoRoot, full).replace(/\\/g, '/');
      if (SKIP_DIRS.has(rel.split('/').slice(-2).join('/'))) continue;
      yield* walk(full);
    } else if (/\.(js|mjs|ts)$/.test(entry.name)) {
      yield full;
    }
  }
}

const findings = [];
for (const baseDir of SCAN_DIRS) {
  const abs = path.join(repoRoot, baseDir);
  if (!fs.existsSync(abs)) continue;
  for (const file of walk(abs)) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    if (ALLOWED.has(path.normalize(rel))) continue;
    let txt;
    try { txt = fs.readFileSync(file, 'utf8'); } catch { continue; }
    const lines = txt.split('\n');
    let inBlockComment = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const stripped = line.replace(/\s+/g, ' ').trim();
      // Track block-comment state: `/*` opens unless `*/` closes on same line.
      if (inBlockComment) {
        if (line.includes('*/')) inBlockComment = false;
        continue; // any literal inside a block comment is documentation
      }
      const opens = line.indexOf('/*');
      const closes = line.indexOf('*/');
      if (opens >= 0 && (closes < 0 || closes < opens)) {
        inBlockComment = true;
        continue;
      }
      if (stripped.startsWith('//')) continue;
      if (stripped.startsWith('*') && !stripped.startsWith('*/')) continue;
      if (stripped.startsWith('/*') && stripped.endsWith('*/')) continue;
      for (const [literal, name] of SACRED_LITERALS) {
        // Look for the literal as a whole numeric token (not part of a
        // longer number / not inside a comment we already skipped).
        const re = new RegExp('(?<![\\d.])' + literal.replace('.', '\\.') + '(?![\\d.])');
        if (re.test(line)) {
          findings.push({ file: rel, line: i + 1, literal, name, text: line.trim().slice(0, 120) });
        }
      }
    }
  }
}

if (findings.length === 0) {
  console.log('✓ A0 grep-guard PASS — no inline fiscal-constant literals outside the shims.');
  process.exit(0);
}

console.error('✗ A0 grep-guard FAIL — fiscal-constant literals found OUTSIDE the canonical shim files.');
console.error('  Move these values into lib/constants/engine-shim.js (or planner/report/report-constants-2026.js)');
console.error('  and replace each inline occurrence with a read from the shim.\n');
for (const f of findings) {
  console.error('  ' + f.file + ':' + f.line + '  [' + f.name + '=' + f.literal + ']  ' + f.text);
}
console.error('\n  ' + findings.length + ' violation(s) total.');
process.exit(1);
