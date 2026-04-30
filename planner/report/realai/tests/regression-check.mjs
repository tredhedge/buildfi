#!/usr/bin/env node
// regression-check.mjs — Phase F production hardening.
// ══════════════════════════════════════════════════════════════════════
// Reads review/_summary.json (written by run-pipeline.mjs on the last
// run) and asserts the pipeline meets shipping standards:
//
//   1. ALL 10 profiles ship (no FAILED status).
//   2. Post-fix blockers across all profiles = 0.
//   3. Post-fix majors across all profiles = 0.
//   4. AI regen queue ≤ 50 slots (cost/quality budget).
//
// Run AFTER pipeline:
//   node planner/report/realai/run-pipeline.mjs
//   node planner/report/realai/tests/regression-check.mjs
//
// Exit 0 = ready to ship, exit 1 = regression detected.
// ══════════════════════════════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const summaryPath = path.join(__dirname, '..', 'review', '_summary.json');

if (!fs.existsSync(summaryPath)) {
  console.error('ERROR: review/_summary.json missing. Run run-pipeline.mjs first.');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

// Budget thresholds. Adjust as the pipeline matures.
// 20-profile baseline (10 original + 10 edge-case). Each profile averages
// ~4 AI slots in the regen queue, so 100 is a reasonable upper bound.
const BUDGET = {
  expectedProfiles: 20,
  maxPostBlockers: 0,
  maxPostMajors: 0,            // ZERO majors post-fix is the ship gate
  maxPostMajorsPerProfile: 0,
  maxAiRegenSlots: 100,        // 20 profiles × ~5 stale slots before regen
  maxFailedShips: 0
};

const fails = [];

// ─── 1. Profile count ─────────────────────────────────────────────────
if (summary.length !== BUDGET.expectedProfiles) {
  fails.push(`Profile count: ${summary.length}, expected ${BUDGET.expectedProfiles}.`);
}

// ─── 2. Ship rate ─────────────────────────────────────────────────────
const failed = summary.filter(s => !s.shipped);
if (failed.length > BUDGET.maxFailedShips) {
  fails.push(`${failed.length} profile(s) FAILED to ship: ${failed.map(s => s.profile).join(', ')}`);
}

// ─── 3. Post-fix blocker / major aggregates ───────────────────────────
const totalPostBlockers = summary.reduce((s, p) => s + (p.post?.blockers || 0), 0);
const totalPostMajors = summary.reduce((s, p) => s + (p.post?.majors || 0), 0);

if (totalPostBlockers > BUDGET.maxPostBlockers) {
  fails.push(`Post-fix blockers total = ${totalPostBlockers} (max ${BUDGET.maxPostBlockers}).`);
}
if (totalPostMajors > BUDGET.maxPostMajors) {
  fails.push(`Post-fix majors total = ${totalPostMajors} (max ${BUDGET.maxPostMajors}).`);
}

// ─── 4. Per-profile post-fix major budget ─────────────────────────────
summary.forEach(p => {
  const m = p.post?.majors || 0;
  if (m > BUDGET.maxPostMajorsPerProfile) {
    fails.push(`${p.profile}: ${m} post-fix majors (max ${BUDGET.maxPostMajorsPerProfile}).`);
  }
  const b = p.post?.blockers || 0;
  if (b > BUDGET.maxPostBlockers) {
    fails.push(`${p.profile}: ${b} post-fix blockers (max ${BUDGET.maxPostBlockers}).`);
  }
});

// ─── 5. AI regen queue budget ─────────────────────────────────────────
const totalRegen = summary.reduce((s, p) => s + (p.ai_regen_slots || 0), 0);
if (totalRegen > BUDGET.maxAiRegenSlots) {
  fails.push(`AI regen queue total = ${totalRegen} slots (max ${BUDGET.maxAiRegenSlots}). Each costs API tokens.`);
}

// ─── 5c. Cost / latency budget tracking (Sprint 7) ────────────────────
// When summary entries carry .duration_ms or .ai_tokens, track aggregate
// cost/latency. Soft fail (warning only) when over budget — these are
// observability metrics, not ship gates. Hard cap when materially over.
const COST_BUDGET = {
  perProfileLatencyMsP95: 60000,     // 60s P95 per-profile pipeline pass
  perProfileTokensP95:    8000,      // 8K tokens per profile (system + user + response)
  totalRunLatencyMsMax:   600000,    // 10 min total CI gate
  totalRunTokensMax:      200000     // 200K tokens for the full 20-profile run
};
const durations = summary.map(s => s.duration_ms || 0).filter(d => d > 0).sort((a, b) => a - b);
const tokens = summary.map(s => s.ai_tokens || 0).filter(t => t > 0).sort((a, b) => a - b);
if (durations.length > 0) {
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const total = durations.reduce((s, d) => s + d, 0);
  if (p95 > COST_BUDGET.perProfileLatencyMsP95 * 1.5) {
    fails.push(`Per-profile latency P95 = ${p95}ms (max ${COST_BUDGET.perProfileLatencyMsP95}ms — hard fail at 1.5x).`);
  } else if (p95 > COST_BUDGET.perProfileLatencyMsP95) {
    console.log(`(warn) per-profile latency P95 = ${p95}ms exceeds soft target ${COST_BUDGET.perProfileLatencyMsP95}ms`);
  }
  if (total > COST_BUDGET.totalRunLatencyMsMax) {
    fails.push(`Total run latency = ${total}ms (max ${COST_BUDGET.totalRunLatencyMsMax}ms).`);
  }
}
if (tokens.length > 0) {
  const tP95 = tokens[Math.floor(tokens.length * 0.95)] || 0;
  const tTotal = tokens.reduce((s, t) => s + t, 0);
  if (tP95 > COST_BUDGET.perProfileTokensP95 * 1.5) {
    fails.push(`Per-profile tokens P95 = ${tP95} (max ${COST_BUDGET.perProfileTokensP95} — hard fail at 1.5x).`);
  }
  if (tTotal > COST_BUDGET.totalRunTokensMax) {
    fails.push(`Total run tokens = ${tTotal} (max ${COST_BUDGET.totalRunTokensMax}).`);
  }
}

// ─── 5b. AI-judge content-quality gate (Sprint 8.4) ───────────────────
// Optional: when tests/ai-judge.mjs has been run, its output sits at
// review/_ai-judge-summary.json. Fail CI if more than 2 of 20 reports
// score below 3.5 (out of 5) on the LLM-rubric average.
//
// If the judge has never run, OR ran in stub mode (every score=null),
// this gate is skipped silently — we don't want to block CI on an
// optional opt-in tool.
const judgeSummaryPath = path.join(__dirname, '..', 'review', '_ai-judge-summary.json');
const MAX_JUDGE_FAILURES = 2;
const JUDGE_THRESHOLD = 3.5;
if (fs.existsSync(judgeSummaryPath)) {
  try {
    const judge = JSON.parse(fs.readFileSync(judgeSummaryPath, 'utf8'));
    if (judge && typeof judge.profiles_scored === 'number' && judge.profiles_scored > 0) {
      const below = judge.profiles_below_threshold || 0;
      if (below > MAX_JUDGE_FAILURES) {
        const failingList = (judge.failing_profiles || [])
          .map(p => p.profile + ' (avg=' + (typeof p.score === 'number' ? p.score.toFixed(2) : '?') + ')')
          .join(', ');
        fails.push(
          `AI-judge: ${below}/${judge.profiles_scored} profiles below score ${JUDGE_THRESHOLD} ` +
          `(max ${MAX_JUDGE_FAILURES}). Failing: ${failingList}`
        );
      }
    }
    // judge ran but produced 0 scores → stub mode → skip silently.
  } catch (e) {
    // Malformed judge output: surface a warning but don't block CI.
    console.log(`(warning: could not parse _ai-judge-summary.json: ${e.message})`);
  }
}

// ─── 6. Category drift detection ──────────────────────────────────────
// Any post-fix blocker_category indicates a finding the corrector cannot
// resolve — must be triaged (pipeline regression or new defect class).
const lingeringCategories = new Set();
summary.forEach(p => {
  (p.post_blocker_categories || []).forEach(c => lingeringCategories.add(c));
});
if (lingeringCategories.size > 0) {
  fails.push(`Post-fix blocker categories present: ${[...lingeringCategories].join(', ')}`);
}

// ═════ REPORT ═════════════════════════════════════════════════════════
console.log('\n══════ PIPELINE REGRESSION CHECK ══════\n');
console.log(`Profiles audited:   ${summary.length}`);
console.log(`Shipped:            ${summary.filter(s => s.shipped).length}/${summary.length}`);
console.log(`Post-fix blockers:  ${totalPostBlockers}`);
console.log(`Post-fix majors:    ${totalPostMajors}`);
console.log(`AI regen slots:     ${totalRegen}`);
console.log('');

if (fails.length === 0) {
  console.log('✓ All gates pass. Pipeline ready to ship.\n');
  process.exit(0);
}

console.log('✗ Regression detected:');
fails.forEach(f => console.log('  ✗ ' + f));
console.log('');
process.exit(1);
