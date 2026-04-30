#!/usr/bin/env node
// ai-judge.mjs — Sprint 8 LLM-as-judge integrated into the report pipeline.
// ══════════════════════════════════════════════════════════════════════════
// For every rendered final report (planner/report/realai/final/{tag}.html),
// builds a Claude prompt asking the model to score the report 1–5 on five
// rubrics:
//
//   (a) profile-specificity   — does it discuss this client, not "a client"?
//   (b) AMF compliance        — conditional tense + observational framing
//   (c) numerical defendability — do quoted figures trace back to a clear basis?
//   (d) absence of false comfort — does it surface real risks, not just upside?
//   (e) coherence across sections — do the same numbers appear consistently?
//
// Output JSON per profile: { a, b, c, d, e, comments }.
// Aggregates a per-profile average. Threshold: ≥ 3.5 / 5.
//
// Real LLM scoring is OPT-IN. When ANTHROPIC_API_KEY is set, the script
// uses the @anthropic-ai/sdk package to call Claude. When the key is
// absent, the script prints the prompt that WOULD have been sent for the
// first profile and emits a stub output where every score is null. This
// keeps the script safe to run in CI without surprise spend.
//
// Output files:
//   planner/report/realai/review/_ai-judge.json   — full per-profile scores
//   planner/report/realai/review/_ai-judge-summary.json
//
// Usage:
//   node tests/ai-judge.mjs                        # all 20 profiles
//   node tests/ai-judge.mjs --profile=ccpc_owner   # single profile
//   node tests/ai-judge.mjs --max=5                # cap to first N
//   node tests/ai-judge.mjs --model=claude-opus-4-7-20251015
//
// Exits 0 always — this is a SCORE TOOL, not a gate. The gate lives in
// planner/report/realai/tests/regression-check.mjs (Sprint 8.4).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');                    // buildfi/
const PROFILES_PATH = path.join(ROOT, 'planner', 'report', 'realai', 'profiles.json');
const FINAL_DIR = path.join(ROOT, 'planner', 'report', 'realai', 'final');
const REVIEW_DIR = path.join(ROOT, 'planner', 'report', 'realai', 'review');

const argv = process.argv.slice(2);
const argMap = Object.fromEntries(argv.map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const ONLY_PROFILE = argMap.profile || null;
const MAX = argMap.max ? Number(argMap.max) : Infinity;
const MODEL = argMap.model || 'claude-opus-4-5-20251015';
const API_KEY = process.env.ANTHROPIC_API_KEY || null;

const SCORE_THRESHOLD = 3.5;     // per-profile average must beat this

// ─── Visible-text extractor (mirrors content-depth-auditor) ─────────────
function visibleText(html) {
  return String(html || '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cap report excerpt at ~14k chars to stay within sane prompt budgets.
// Reports are 30–50k visible chars; we sample evenly: head + middle + tail.
function excerpt(text, budget = 14000) {
  if (!text || text.length <= budget) return text;
  const slice = Math.floor(budget / 3);
  const head = text.slice(0, slice);
  const mid = text.slice(Math.floor((text.length - slice) / 2), Math.floor((text.length + slice) / 2));
  const tail = text.slice(text.length - slice);
  return head + '\n\n[…elision…]\n\n' + mid + '\n\n[…elision…]\n\n' + tail;
}

function buildPrompt(profile, body) {
  const lang = profile.lang === 'fr' ? 'French' : 'English';
  return [
    'You are a senior Canadian retirement-planning reviewer auditing an AI-generated retirement report from BuildFi.',
    '',
    'Score the report 1–5 (5=excellent, 1=fail) on EACH of these five rubrics:',
    '  a) profile_specificity   — Does the narrative discuss THIS client (case_driver=' + (profile.case_driver || 'n/a') + ', age=' + (profile.params?.age ?? '?') + ', province=' + (profile.params?.prov ?? '?') + '), or could it be reused verbatim for any other client?',
    '  b) amf_compliance        — Are projections framed in conditional tense ("could", "would", "pourrait") and observational, NOT prescriptive ("should", "il faut", "we recommend")?',
    '  c) numerical_defendability — When the report quotes a figure, is the basis clear (parameter, percentile, real vs nominal $)? Or do numbers appear without anchor?',
    '  d) absence_of_false_comfort — Does the report surface the actual risks for this profile (sequence-of-returns, OAS clawback, GIS trap, longevity, dispersion), or does it lean reassuring?',
    '  e) coherence_across_sections — Do the same metrics (success rate, P50 wealth, lifetime tax) match across the executive, projection, risk, and assessment sections?',
    '',
    'Profile context:',
    '  case_driver: ' + (profile.case_driver || 'n/a'),
    '  language: ' + lang,
    '  SKU: ' + (profile.sku || 'bilan'),
    '  literacy: ' + (profile.finLiteracy || 'unknown'),
    '  stress: ' + (profile.stressLevel || 'unknown'),
    '',
    'Output STRICTLY valid JSON, no surrounding prose, with this schema:',
    '{ "a": <int 1-5>, "b": <int 1-5>, "c": <int 1-5>, "d": <int 1-5>, "e": <int 1-5>, "comments": "<≤300 chars summarising the single biggest weakness>" }',
    '',
    '────── REPORT BEGIN ──────',
    body,
    '────── REPORT END ──────'
  ].join('\n');
}

function safeParseJson(text) {
  if (!text) return null;
  // Tolerate markdown fences / leading prose by extracting the first {…}.
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); }
  catch (e) { return null; }
}

function avgScore(s) {
  if (!s) return null;
  const vals = ['a', 'b', 'c', 'd', 'e'].map(k => s[k]).filter(v => typeof v === 'number');
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

async function callClaude(prompt) {
  // Lazy import — only when we actually have a key. Keeps the script
  // runnable in environments without the SDK installed.
  let SDK;
  try {
    SDK = await import('@anthropic-ai/sdk');
  } catch (e) {
    return { error: '@anthropic-ai/sdk not installed: ' + (e.message || e) };
  }
  const client = new SDK.default({ apiKey: API_KEY });
  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = (resp.content || []).map(b => b.text || '').join('\n').trim();
    const parsed = safeParseJson(text);
    if (!parsed) return { error: 'unparseable LLM response', raw: text.slice(0, 600) };
    return { json: parsed, raw: text };
  } catch (e) {
    return { error: 'API call failed: ' + (e.message || e) };
  }
}

async function main() {
  if (!fs.existsSync(PROFILES_PATH)) {
    console.error('ERROR: profiles.json missing at ' + PROFILES_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(REVIEW_DIR)) fs.mkdirSync(REVIEW_DIR, { recursive: true });

  const profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8')).profiles;
  const target = profiles.filter(p => !ONLY_PROFILE || p.id === ONLY_PROFILE).slice(0, MAX);

  console.log('━━━━━━━ ai-judge ━━━━━━━');
  console.log('  profiles to score:  ' + target.length);
  console.log('  model:              ' + MODEL);
  console.log('  api key present:    ' + (API_KEY ? 'YES' : 'NO (stub mode)'));
  console.log('  threshold (avg≥):   ' + SCORE_THRESHOLD);
  console.log('');

  if (!API_KEY) {
    console.log('No ANTHROPIC_API_KEY in env — running in stub mode.');
    console.log('To enable real LLM scoring:');
    console.log('  1. export ANTHROPIC_API_KEY=sk-ant-...');
    console.log('  2. npm install @anthropic-ai/sdk    (if not already installed)');
    console.log('  3. node tests/ai-judge.mjs');
    console.log('');
    // Print the prompt we WOULD have sent for the first available profile,
    // so the operator can sanity-check it before paying for tokens.
    const sample = target.find(p => fs.existsSync(path.join(FINAL_DIR, p.id + '_' + p.lang + '.html')));
    if (sample) {
      const html = fs.readFileSync(path.join(FINAL_DIR, sample.id + '_' + sample.lang + '.html'), 'utf8');
      const body = excerpt(visibleText(html));
      const prompt = buildPrompt(sample, body);
      console.log('━━ Sample prompt for ' + sample.id + '_' + sample.lang + ' (truncated to 1.5KB) ━━');
      console.log(prompt.slice(0, 1500) + (prompt.length > 1500 ? '\n[…' + (prompt.length - 1500) + ' more chars…]' : ''));
      console.log('');
    }
  }

  const results = [];
  for (const profile of target) {
    const tag = profile.id + '_' + profile.lang;
    const htmlPath = path.join(FINAL_DIR, tag + '.html');
    if (!fs.existsSync(htmlPath)) {
      results.push({ profile: tag, score: null, comments: 'final HTML missing', skipped: true });
      console.log('  ' + tag.padEnd(36) + '  SKIP (no final report)');
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const body = excerpt(visibleText(html));
    const prompt = buildPrompt(profile, body);

    if (!API_KEY) {
      results.push({
        profile: tag, case_driver: profile.case_driver || null,
        a: null, b: null, c: null, d: null, e: null, score: null,
        comments: 'stub (no API key)', stub: true
      });
      console.log('  ' + tag.padEnd(36) + '  stub  (no API key)');
      continue;
    }

    const out = await callClaude(prompt);
    if (out.error) {
      results.push({ profile: tag, case_driver: profile.case_driver || null, score: null, error: out.error });
      console.log('  ' + tag.padEnd(36) + '  ERROR: ' + out.error);
      continue;
    }
    const j = out.json || {};
    const score = avgScore(j);
    results.push({
      profile: tag,
      case_driver: profile.case_driver || null,
      a: j.a ?? null, b: j.b ?? null, c: j.c ?? null, d: j.d ?? null, e: j.e ?? null,
      score: score,
      comments: (j.comments || '').slice(0, 600)
    });
    const flag = score == null ? '?' : (score >= SCORE_THRESHOLD ? '✓' : '✗');
    console.log('  ' + tag.padEnd(36) + '  ' + flag + ' avg=' + (score == null ? '—' : score.toFixed(2)));
  }

  // Aggregate
  const scored = results.filter(r => typeof r.score === 'number');
  const failing = scored.filter(r => r.score < SCORE_THRESHOLD);
  const summary = {
    generated_at: new Date().toISOString(),
    model: MODEL,
    threshold: SCORE_THRESHOLD,
    profiles_total: results.length,
    profiles_scored: scored.length,
    profiles_below_threshold: failing.length,
    overall_avg: scored.length ? (scored.reduce((s, r) => s + r.score, 0) / scored.length) : null,
    failing_profiles: failing.map(r => ({ profile: r.profile, score: r.score, comments: r.comments }))
  };

  fs.writeFileSync(path.join(REVIEW_DIR, '_ai-judge.json'),
    JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(REVIEW_DIR, '_ai-judge-summary.json'),
    JSON.stringify(summary, null, 2));

  console.log('');
  console.log('━━━━━━━ summary ━━━━━━━');
  console.log('  scored:               ' + summary.profiles_scored + ' / ' + summary.profiles_total);
  console.log('  below threshold:      ' + summary.profiles_below_threshold);
  console.log('  overall avg:          ' + (summary.overall_avg == null ? '—' : summary.overall_avg.toFixed(2)));
  console.log('  written: planner/report/realai/review/_ai-judge.json');
  console.log('  written: planner/report/realai/review/_ai-judge-summary.json');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
