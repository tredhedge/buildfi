#!/usr/bin/env node
// two-pass-regression.mjs — Sprint 7 production hardening.
// ══════════════════════════════════════════════════════════════════════
// Asserts the pipeline is DETERMINISTIC: identical inputs → identical
// outputs. Two consecutive runs with the SAME seed should produce
// byte-identical (or content-identical modulo timestamps) corrected HTML.
//
// What this catches:
//   • Hidden randomness in the renderer (shouldn't exist — engine has
//     its own seeded RNG, but defensive)
//   • Cache-busting changes that produce drift between runs
//   • Anthropic API non-determinism if the AI fixture changes
//
// Approach:
//   1. Snapshot all 20 corrected HTML files
//   2. Re-run the pipeline (NOT regenerating MC — that has fresh RNG)
//   3. Diff each file (modulo `<span class="advisor-signature-date">`
//      and similar timestamp-bearing elements)
//   4. Fail if any byte-diff outside the timestamp allowlist
//
// Run AFTER pipeline:
//   node planner/report/realai/run-pipeline.mjs
//   node planner/report/realai/tests/two-pass-regression.mjs
//
// Note: this script does NOT re-run gen-real-mc.mjs — that step uses
// stochastic MC and would produce different outputs by design.
// ══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const correctedDir = path.join(__dirname, '..', 'corrected');
const reviewDir = path.join(__dirname, '..', 'review');

// Strip volatile content (timestamps, magic-link tokens, etc.) so two
// renders of the same payload compare equal.
function normalize(html) {
  return html
    .replace(/<span class="advisor-signature-date">[^<]+<\/span>/g, '<TS/>')
    .replace(/Pr\u00e9par\u00e9 le \d{1,2} \w+ \d{4}/g, 'Pr\u00e9par\u00e9 le DATE')
    .replace(/Prepared on \w+ \d{1,2}, \d{4}/g, 'Prepared on DATE')
    .replace(/Date : \d{4}-\d{2}-\d{2}/g, 'Date : DATE')
    .replace(/data-bf-token="[^"]+"/g, 'data-bf-token="TOK"');
}

function hashFile(p) {
  if (!fs.existsSync(p)) return null;
  const html = fs.readFileSync(p, 'utf8');
  return crypto.createHash('sha256').update(normalize(html)).digest('hex');
}

// Step 1: snapshot all 20 corrected HTMLs by hash
console.log('Snapshotting first-pass output...');
const files = fs.readdirSync(correctedDir).filter(f => f.endsWith('.html'));
if (files.length === 0) {
  console.error('ERROR: corrected/ is empty. Run pipeline first.');
  process.exit(1);
}
const before = {};
files.forEach(f => { before[f] = hashFile(path.join(correctedDir, f)); });

// Step 2: re-render WITHOUT re-running gen-real-mc (skips stochastic MC)
console.log('Re-rendering 20 reports (using cached MC)...');
try {
  execSync('node planner/report/realai/run-pipeline.mjs', {
    cwd: path.join(__dirname, '..', '..', '..', '..'),
    stdio: 'pipe'
  });
} catch (e) {
  console.error('Pipeline re-run failed:', e.message);
  process.exit(1);
}

// Step 3: hash again, diff
console.log('Comparing second-pass output...');
const after = {};
const diffs = [];
files.forEach(f => {
  after[f] = hashFile(path.join(correctedDir, f));
  if (before[f] !== after[f]) diffs.push(f);
});

console.log('\n══════ TWO-PASS REGRESSION ══════');
console.log(`Files compared: ${files.length}`);
console.log(`Diffs (after timestamp normalization): ${diffs.length}`);
if (diffs.length === 0) {
  console.log('\u2713 Pipeline is deterministic (modulo timestamps).');
  process.exit(0);
}
console.log('\nNon-deterministic outputs detected:');
diffs.forEach(d => console.log('  \u2717 ' + d));
console.log('\nInvestigation: compare normalized diffs of one of these files.');
process.exit(1);
