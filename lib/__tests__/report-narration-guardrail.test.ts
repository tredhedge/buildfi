// Unit tests for the narration guardrail. Run: node --test (via tsx for the .ts import)
//   node_modules/.bin/tsx --test lib/__tests__/report-narration-guardrail.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateNarration } from '../report-narration-guardrail';

// A realistic DATA block (what the model is given). Numbers here are "allowed".
const PROMPT_USER_EN = `
DATA:
success_rate: 62%
median_ending_wealth: $540K
p25_wealth: $210K
p75_wealth: $1.2M
lifetime_tax_real: $185K
net_estate: $620K
guaranteed_income_coverage: 38%
retirement_years: 30
`;
const PROMPT_USER_FR = `
DONNÉES:
taux_succes: 62 %
patrimoine_median: 540 K$
impot_viager_reel: 185 K$
revenu_garanti: 38 %
annees_retraite: 30
`;

test('clean EN narration passes', () => {
  const v = evaluateNarration({
    aiSlots: {
      overall_assessment: 'With a 62% success rate and median ending wealth near $540K, the plan shows margins to monitor over the 30 projected years.',
      tax_insight: 'Lifetime tax could total about $185K in real dollars.',
    },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
    band: 'sound',
    requiredSlots: ['overall_assessment'],
  });
  assert.equal(v.ok, true, JSON.stringify(v.findings));
});

test('clean FR narration passes', () => {
  const v = evaluateNarration({
    aiSlots: {
      overall_assessment: 'Avec un taux de succès de 62 % et un patrimoine médian d’environ 540 K$, le plan présente des marges à surveiller sur les 30 années projetées.',
    },
    promptUser: PROMPT_USER_FR,
    lang: 'fr',
    band: 'sound',
  });
  assert.equal(v.ok, true, JSON.stringify(v.findings));
});

test('fabricated number is caught (accuracy)', () => {
  const v = evaluateNarration({
    aiSlots: {
      tax_insight: 'Lifetime tax could reach $475K, far above the projection.', // 475K not in DATA
    },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'foreign_number' && /475/.test(f.detail)));
});

test('optimistic prose on a fragile band is caught (logic)', () => {
  const v = evaluateNarration({
    aiSlots: {
      overall_assessment: 'Your plan is on track and secure for the 30 projected years.', // no qualifier, fragile
    },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
    band: 'fragile',
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'direction_violation'));
});

test('qualifier rescues an otherwise-optimistic fragile opener', () => {
  const v = evaluateNarration({
    aiSlots: {
      overall_assessment: 'The plan could look solid in good markets, but the 62% success rate leaves little room.',
    },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
    band: 'fragile',
  });
  assert.ok(!v.findings.some((f) => f.kind === 'direction_violation'), JSON.stringify(v.findings));
});

test('AMF banned stem is caught (compliance)', () => {
  const v = evaluateNarration({
    aiSlots: { tax_insight: 'You should optimize your withdrawals to lower tax.' },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'amf_banned_stem'));
});

test('FR meltdown jargon is caught', () => {
  const v = evaluateNarration({
    aiSlots: { strategy: 'La fenêtre de meltdown REER pourrait réduire l’impôt.' },
    promptUser: PROMPT_USER_FR,
    lang: 'fr',
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'fr_jargon_meltdown'));
});

test('placeholder / empty required slot is caught (completeness)', () => {
  const v = evaluateNarration({
    aiSlots: { overall_assessment: 'Dear [[CLIENT_NAME]], your plan...' , greeting: '' },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
    requiredSlots: ['greeting'],
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'unsubstituted_placeholder'));
  assert.ok(v.findings.some((f) => f.kind === 'empty_required_slot' && f.slot === 'greeting'));
});

test('FR currency-format leak ($ prefix) is caught', () => {
  const v = evaluateNarration({
    aiSlots: { note: 'Le patrimoine médian est de $540K selon le scénario.' }, // EN prefix in FR
    promptUser: PROMPT_USER_FR,
    lang: 'fr',
  });
  assert.equal(v.ok, false);
  assert.ok(v.findings.some((f) => f.kind === 'format_leak'));
});

test('repairableSlots lists each offending slot once', () => {
  const v = evaluateNarration({
    aiSlots: {
      a: 'Tax could hit $475K.', // foreign number
      b: 'You should optimize.', // amf
      c: 'A clean sentence with 62% success.',
    },
    promptUser: PROMPT_USER_EN,
    lang: 'en',
  });
  assert.deepEqual(new Set(v.repairableSlots), new Set(['a', 'b']));
});
