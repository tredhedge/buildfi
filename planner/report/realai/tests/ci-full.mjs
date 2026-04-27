#!/usr/bin/env node
// ci-full.mjs — Phase F production CI gate.
// ══════════════════════════════════════════════════════════════════════
// Runs the full quality stack in order:
//
//   1. tax-validation.mjs       (engine math correctness)
//   2. run-pipeline.mjs         (audit all 10 profiles end-to-end)
//   3. regression-check.mjs     (verify ship gates passed)
//
// Exit 0 only when all three succeed. Exit 1 on first failure.
//
// Run: node planner/report/realai/tests/ci-full.mjs
// ══════════════════════════════════════════════════════════════════════

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const realaiDir = path.join(__dirname, '..');

const STEPS = [
  { label: '1/3 tax-validation',   cmd: 'node', args: [path.join(__dirname, 'tax-validation.mjs')] },
  { label: '2/3 run-pipeline',     cmd: 'node', args: [path.join(realaiDir, 'run-pipeline.mjs')] },
  { label: '3/3 regression-check', cmd: 'node', args: [path.join(__dirname, 'regression-check.mjs')] }
];

let firstFail = null;
const t0 = Date.now();

for (const step of STEPS) {
  const stepStart = Date.now();
  console.log(`\n══ ${step.label} ══`);
  const r = spawnSync(step.cmd, step.args, { stdio: 'inherit' });
  const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
  if (r.status !== 0) {
    console.log(`\n✗ ${step.label} FAILED (exit ${r.status}, ${elapsed}s)`);
    firstFail = step.label;
    break;
  }
  console.log(`✓ ${step.label} OK (${elapsed}s)`);
}

const totalElapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log('\n══════ CI SUMMARY ══════');
if (firstFail) {
  console.log(`✗ Stopped at: ${firstFail}`);
  console.log(`  Total elapsed: ${totalElapsed}s`);
  process.exit(1);
}
console.log(`✓ All ${STEPS.length} gates passed in ${totalElapsed}s. Pipeline ready to ship.`);
process.exit(0);
