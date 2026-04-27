#!/usr/bin/env node
// ai-regen.mjs — Consume the responses-todo/ queue by calling the Anthropic
// API for each profile that has drifted AI slots, write the regenerated
// slots into responses/{profile}.json, and re-run the pipeline.
//
// Usage:
//   ANTHROPIC_API_KEY=sk-ant-... node planner/report/realai/ai-regen.mjs [--only=profile1,profile2] [--dry]
//
// Behavior:
//   - Reads responses-todo/{profile}.json (the audit-generated regeneration
//     queue with canonical numbers + slot violation list).
//   - Loads the matching prompt from prompts/{profile}.json (rebuilt by the
//     pipeline; carries the system + user prompt with the full canonical
//     pinning block).
//   - For each todo entry, calls the Anthropic API with the prompt and the
//     specific slot keys to regenerate.
//   - Parses the JSON response and merges the new slot text into
//     responses/{profile}.json (preserving any slots that weren't requested).
//   - --dry: print what would be regenerated without making API calls.
//
// IMPORTANT: This script MAKES PAID API CALLS. It only runs when the user
// explicitly invokes it. The realai pipeline never calls this — it ships
// deterministic fallbacks for drifted slots and writes the todo queue for
// the operator to process here.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const realai = __dirname;
const reportDir = path.join(__dirname, '..');

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const onlyIds = args.only ? args.only.split(',').map(s => s.trim()).filter(Boolean) : null;
const dryRun = !!args.dry;

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!dryRun && !apiKey) {
  console.error('ANTHROPIC_API_KEY env var is required (or use --dry to preview).');
  process.exit(1);
}

const todoDir = path.join(realai, 'responses-todo');
const respDir = path.join(realai, 'responses');
const promptDir = path.join(realai, 'prompts');

if (!fs.existsSync(todoDir)) {
  console.error('No responses-todo/ directory found.');
  process.exit(1);
}

const todoFiles = fs.readdirSync(todoDir).filter(f => f.endsWith('.json'));
const queue = todoFiles
  .map(f => {
    const tag = f.replace('.json', '');
    if (onlyIds && !onlyIds.some(id => tag.startsWith(id))) return null;
    const todo = JSON.parse(fs.readFileSync(path.join(todoDir, f), 'utf8'));
    return { tag, todo };
  })
  .filter(Boolean);

if (queue.length === 0) {
  console.log('Queue empty (or all filtered out by --only).');
  process.exit(0);
}

console.log('=== AI REGEN QUEUE ===');
console.log(`Profiles to process: ${queue.length}`);
queue.forEach(q => {
  const slotCount = Object.keys(q.todo.slots || {}).length;
  console.log(`  ${q.tag.padEnd(45)} ${slotCount} slots flagged`);
});

if (dryRun) {
  console.log('\n--dry: no API calls made. Re-run without --dry to regenerate.');
  process.exit(0);
}

// ── Anthropic API call helper ───────────────────────────────────────────
async function callAnthropic(systemPrompt, userPrompt, slotKeys) {
  const body = {
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }]
  };
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText}`);
  }
  const json = await res.json();
  const text = (json.content || []).map(c => c.text).join('');
  // Parse JSON from response.
  let parsed = null;
  try {
    const cleaned = text.replace(/^```json?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { parsed = JSON.parse(match[0]); } catch (e2) { /* ignore */ }
    }
  }
  if (!parsed) {
    throw new Error('Failed to parse JSON from response: ' + text.substring(0, 200));
  }
  // Filter to requested slot keys + ensure all are strings.
  const out = {};
  slotKeys.forEach(k => {
    if (typeof parsed[k] === 'string') out[k] = parsed[k];
  });
  return out;
}

// ── Process queue serially (avoid rate-limit spike) ────────────────────
let totalSlotsFixed = 0;
let totalProfilesProcessed = 0;

for (const { tag, todo } of queue) {
  const promptPath = path.join(promptDir, tag + '.json');
  if (!fs.existsSync(promptPath)) {
    console.log(`[skip] ${tag}: no prompt file at ${promptPath}`);
    continue;
  }
  const prompt = JSON.parse(fs.readFileSync(promptPath, 'utf8'));
  const slotKeys = Object.keys(todo.slots || {});
  if (slotKeys.length === 0) continue;

  console.log(`\n[regen] ${tag} — ${slotKeys.length} slots`);
  try {
    const newSlots = await callAnthropic(prompt.system, prompt.user, slotKeys);
    const respPath = path.join(respDir, tag + '.json');
    const existing = fs.existsSync(respPath) ? JSON.parse(fs.readFileSync(respPath, 'utf8')) : {};
    const merged = Object.assign({}, existing, newSlots);
    fs.writeFileSync(respPath, JSON.stringify(merged, null, 2), 'utf8');
    const fixedKeys = Object.keys(newSlots);
    console.log(`  fixed ${fixedKeys.length}/${slotKeys.length}: ${fixedKeys.join(', ')}`);
    totalSlotsFixed += fixedKeys.length;
    totalProfilesProcessed++;
  } catch (e) {
    console.error(`  ERROR: ${e.message}`);
  }
}

console.log(`\n═══ DONE ═══`);
console.log(`Profiles processed: ${totalProfilesProcessed}/${queue.length}`);
console.log(`Slots regenerated: ${totalSlotsFixed}`);
console.log(`\nNext step: re-run the pipeline to verify the regen cleared the audit findings.`);
console.log(`  node planner/report/realai/run-pipeline.mjs`);
