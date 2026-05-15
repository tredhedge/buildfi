#!/usr/bin/env node
// Sync stale numeric metrics in cached AI responses to match the canonical
// engine output (mc.json). Targeted approach: only fixes the SPECIFIC
// known-wrong number pairs identified by the user audit. Refuses to do
// generic regex-replacement (a generic patcher mis-replaced stress-test
// percentages in a prior iteration — the stress-test scenarios mention
// the word "success/succès" too, so context-based replacement is unsafe).
//
// User audit (2026-05-15) listed 6 reports with AI-prose success-rate
// divergence + 2 with coverage divergence. Each PAIR (wrong → right) is
// listed explicitly below. Idempotent: skips when wrong value already
// absent.
//
// Usage: node planner/report/realai/sync-stale-metrics.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const responsesDir = path.join(__dirname, 'responses');

// Targeted swaps from user audit (2026-05-15). Pairs are matched verbatim
// against the AI slot text. Pattern includes the literal token boundary
// chars so we don't catch other percentages by accident (e.g. "18%" inside
// "118%" or a year like "2018").
const SWAPS = {
  'post_divorce_50_fr': [
    [/\b18\s*%/g, '21%'],   // canonical succ = 21%
  ],
  'rental_heavy_couple_fr': [
    [/\b41\s*%/g, '42%'],   // canonical succ = 42%
  ],
  'sandwich_gen_en': [
    [/\b46\s*%/g, '43%'],   // canonical succ = 43%
    [/\b61\s*%/g, '55%'],   // canonical coverage = 55%
  ],
  'mortgage_in_retirement_en': [
    [/\b59\s*%/g, '57%'],   // canonical succ = 57%
    [/\b72\s*%/g, '69%'],   // canonical coverage = 69%
  ],
  'late_starter_bc_fr': [
    [/\b20\s*%/g, '21%'],   // canonical succ = 21%
  ],
};

// Narrative slots only — never touch numeric fields.
const NARRATIVE_SLOTS = [
  'advisor_letter', 'overall_assessment', 'verdict', 'page_zero_verdict',
  'profile_summary', 'trajectory_insight', 'income_insight',
  'taxInsight', 'estateInsight', 'meltdown_insight', 'riskInsight',
  'goals_insight', 'stress_interpretation', 'best_move_explainer'
];

let total = 0;
const log = [];

for (const [slug, swaps] of Object.entries(SWAPS)) {
  const respPath = path.join(responsesDir, `${slug}.json`);
  if (!fs.existsSync(respPath)) {
    log.push(`  skip ${slug} — file not found`);
    continue;
  }
  const resp = JSON.parse(fs.readFileSync(respPath, 'utf8'));
  let touched = 0;
  for (const slot of NARRATIVE_SLOTS) {
    const original = resp[slot];
    if (typeof original !== 'string' || !original) continue;
    let text = original;
    for (const [re, replacement] of swaps) {
      const before = text;
      text = text.replace(re, replacement);
      if (text !== before) touched++;
    }
    if (text !== original) {
      resp[slot] = text;
    }
  }
  if (touched > 0) {
    fs.writeFileSync(respPath, JSON.stringify(resp, null, 2), 'utf8');
    total++;
    log.push(`  ✓ ${slug} — applied ${touched} swap(s)`);
  } else {
    log.push(`  · ${slug} — no swaps applied (already clean)`);
  }
}

console.log(`Patched ${total}/${Object.keys(SWAPS).length} profiles.\n`);
console.log(log.join('\n'));
