#!/usr/bin/env node
// Fix EN currency convention in cached AI responses.
//
// User audit (2026-05-15) found ALL 10 English reports use the FR suffix-$
// convention in AI narrative prose (`480K$`, `345K$`, `12,500$`) instead of
// the EN prefix-$ convention (`$480K`, `$345K`, `$12,500`). The renderer's
// tables + KPI cards use the correct EN convention, but the cached AI text
// uses the wrong one — the AI was generated against a prompt or formatter
// that didn't differentiate.
//
// Patcher rules (English files only, slug ending in `_en`):
//   - `<num>K$`      -> `$<num>K`        e.g. `480K$`     -> `$480K`
//   - `<num>M$`      -> `$<num>M`        e.g. `1.8M$`     -> `$1.8M`
//   - `<num>,<num>$` -> `$<num>,<num>`   e.g. `12,500$`   -> `$12,500`
//   - `<int>$`       -> `$<int>`         e.g. `5000$`     -> `$5,000` (with thousands sep)
//   - Skip `0$` (rare; leave for readability)
//   - Skip token already preceded by `$` (idempotent)
//
// Idempotent. Run: node planner/report/realai/fix-en-currency.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const responsesDir = path.join(__dirname, 'responses');

const NARRATIVE_SLOTS = [
  'advisor_letter', 'overall_assessment', 'verdict', 'page_zero_verdict',
  'profile_summary', 'trajectory_insight', 'income_insight',
  'taxInsight', 'estateInsight', 'meltdown_insight', 'riskInsight',
  'goals_insight', 'stress_interpretation', 'best_move_explainer'
];

function normalizeEnCurrency(text) {
  if (typeof text !== 'string') return text;
  let out = text;
  // Order matters: longer/more-specific patterns first to avoid double-touching.
  //
  // 1.8M$ -> $1.8M  (decimals OK)
  out = out.replace(/(\b\d+(?:\.\d+)?)M\$/g, '$$$1M');
  // 480K$ -> $480K
  out = out.replace(/(\b\d+(?:\.\d+)?)K\$/g, '$$$1K');
  // 12,500$ or 1,234,567$ -> $12,500
  out = out.replace(/(\b\d{1,3}(?:,\d{3})+)\$/g, '$$$1');
  // 5000$ (no comma, 4+ digits) -> $5,000
  out = out.replace(/(\b\d{4,})\$/g, function(_, n) {
    return '$' + Number(n).toLocaleString('en-CA');
  });
  return out;
}

let totalProfiles = 0;
let totalSlots = 0;
const log = [];

const files = fs.readdirSync(responsesDir).filter(f => /_en\.json$/.test(f));
for (const file of files) {
  const slug = file.replace(/\.json$/, '');
  const respPath = path.join(responsesDir, file);
  const resp = JSON.parse(fs.readFileSync(respPath, 'utf8'));
  let touched = 0;
  for (const slot of NARRATIVE_SLOTS) {
    const original = resp[slot];
    if (typeof original !== 'string' || !original) continue;
    const fixed = normalizeEnCurrency(original);
    if (fixed !== original) {
      resp[slot] = fixed;
      touched++;
    }
  }
  if (touched > 0) {
    fs.writeFileSync(respPath, JSON.stringify(resp, null, 2), 'utf8');
    totalProfiles++;
    totalSlots += touched;
    log.push(`  ✓ ${slug} — patched ${touched} slot(s)`);
  } else {
    log.push(`  · ${slug} — no changes (already EN-style)`);
  }
}

console.log(`Patched ${totalProfiles}/${files.length} EN profiles, ${totalSlots} slots total.\n`);
console.log(log.join('\n'));
