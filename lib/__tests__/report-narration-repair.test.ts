// node_modules/.bin/tsx --test lib/__tests__/report-narration-repair.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoRepairNarration, buildRepairPrompt } from '../report-narration-repair';

const PROMPT_USER = `DATA:
success_rate: 62%
median_ending_wealth: $540K
lifetime_tax_real: $185K
retirement_years: 30`;
const SYS = 'system prompt';

test('clean narration needs no repair (0 attempts)', async () => {
  const r = await autoRepairNarration({
    aiSlots: { assessment: 'A 62% success rate over 30 years, with $540K median wealth.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en', band: 'sound',
    narrate: async () => { throw new Error('should not be called'); },
  });
  assert.equal(r.verdict.ok, true);
  assert.equal(r.attempts, 0);
});

test('a fabricated number is repaired on retry', async () => {
  let calls = 0;
  const r = await autoRepairNarration({
    aiSlots: { tax: 'Lifetime tax could reach $475K.' }, // 475K foreign
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en',
    narrate: async () => { calls++; return { tax: 'Lifetime tax could total about $185K in real dollars.' }; },
  });
  assert.equal(r.verdict.ok, true, JSON.stringify(r.verdict.findings));
  assert.equal(r.attempts, 1);
  assert.equal(calls, 1);
});

test('gives up after maxAttempts and reports not-ok (→ caller falls back)', async () => {
  let calls = 0;
  const r = await autoRepairNarration({
    aiSlots: { tax: 'Lifetime tax could reach $475K.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en', maxAttempts: 2,
    narrate: async () => { calls++; return { tax: 'Still wrong: $999K.' }; }, // never fixes
  });
  assert.equal(r.verdict.ok, false);
  assert.equal(r.attempts, 2);
  assert.equal(calls, 2);
});

test('only the targeted slots are merged (a clean slot is not overwritten)', async () => {
  const r = await autoRepairNarration({
    aiSlots: { good: 'Clean: 62% over 30 years.', bad: 'Wrong $475K.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en',
    // narrator tries to also return a value for 'good' — must be ignored
    narrate: async () => ({ bad: 'Now $185K.', good: 'HALLUCINATED OVERWRITE $1M' }),
  });
  assert.equal(r.verdict.ok, true, JSON.stringify(r.verdict.findings));
  assert.equal(r.ai.good, 'Clean: 62% over 30 years.'); // untouched
  assert.match(String(r.ai.bad ?? ''), /185K/);
});

test('stops if narrator returns nothing usable', async () => {
  let calls = 0;
  const r = await autoRepairNarration({
    aiSlots: { tax: 'Wrong $475K.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en', maxAttempts: 2,
    narrate: async () => { calls++; return {}; }, // empty
  });
  assert.equal(r.verdict.ok, false);
  assert.equal(calls, 1); // bailed after first empty response
});

test('deadline prevents starting a repair attempt when out of budget', async () => {
  let calls = 0;
  const r = await autoRepairNarration({
    aiSlots: { tax: 'Wrong $475K.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en', maxAttempts: 2,
    deadline: 1000,
    now: () => 2000, // already past the deadline
    narrate: async () => { calls++; return { tax: 'Now $185K.' }; },
  });
  assert.equal(calls, 0); // never attempted
  assert.equal(r.verdict.ok, false);
});

test('perAttemptTimeoutMs abandons a hung narrate (→ falls back)', async () => {
  const r = await autoRepairNarration({
    aiSlots: { tax: 'Wrong $475K.' },
    promptSys: SYS, promptUser: PROMPT_USER, lang: 'en', maxAttempts: 2,
    perAttemptTimeoutMs: 20,
    narrate: () => new Promise(() => {}), // never resolves
  });
  assert.equal(r.verdict.ok, false); // timed out → kept original → caller falls back
});

test('buildRepairPrompt lists each slot once with its reason + keeps DATA', () => {
  const p = buildRepairPrompt(
    PROMPT_USER,
    [
      { slot: 'tax', kind: 'foreign_number', detail: '475@K', severity: 'blocker' },
      { slot: 'tax', kind: 'amf_banned_stem', detail: 'optimize', severity: 'blocker' },
      { slot: 'intro', kind: 'fr_jargon_meltdown', detail: 'meltdown', severity: 'blocker' },
    ],
    'en'
  );
  assert.match(p, /DATA:/);
  assert.match(p, /"tax":/);
  assert.match(p, /"intro":/);
  assert.match(p, /not in the DATA/i);
  // tax listed once though it had two findings
  assert.equal((p.match(/"tax":/g) || []).length, 1);
});
