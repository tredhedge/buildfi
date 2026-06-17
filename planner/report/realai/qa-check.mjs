#!/usr/bin/env node
// qa-check.mjs — Blocking QA on rendered reports + AI responses.
//
// Detects credibility-killing defects that the codex audit identified:
//   1. Empty / null / "Data insufficient" slots in AI responses
//   2. FR/EN language leaks (FR words in EN reports, EN words in FR reports)
//   3. Action plan that lacks sequencing (no numbered to-do detectable)
//   4. Grade label inconsistency (89 % labelled "Fragile" etc.)
//   5. Promised section with empty/placeholder body
//
// Exit code: 0 = all profiles pass, 1 = at least one defect.
// Run: node report/realai/qa-check.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// BF_REALAI_BASE repoints to a separate profile set (e.g. bilan360-personas/).
const DATA_DIR = process.env.BF_REALAI_BASE ? path.resolve(process.env.BF_REALAI_BASE) : __dirname;
const profilesPath = path.join(DATA_DIR, 'profiles.json');
const responsesDir = path.join(DATA_DIR, 'responses');
const outputDir = path.join(DATA_DIR, 'output');

const PROFILES = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;

// Words that should never appear in the wrong-language report (trimmed list,
// chosen for low false-positive rate — they're words that wouldn't naturally
// appear in either language as foreign borrowings).
const FR_LEAK_WORDS = [
  // FR-only words that shouldn't appear in EN reports
  'épargne', 'retraite', 'épuiser', 'épuisée', 'dépense', 'dépenses', 'patrimoine',
  'rentes', 'récupération', 'décaissement', 'fractionnement', 'imposition',
  'pourrait', 'serait', 'devrait', 'l\'épargne', 'l\'horizon', 'l\'étape',
  'votre situation', 'vos dépenses', 'viager', 'ménage', 'fiscalité'
];
const EN_LEAK_WORDS = [
  // EN-only words that shouldn't appear in FR reports.
  // "meltdown" IS banned in FR client copy (Codex: engineering jargon must never
  // reach a client; enforced by review/reviewers/language-auditor.js). The FR
  // template uses "décaissement anticipé" instead (audit 2026-06-16). This entry
  // aligns qa-check with that authoritative rule.
  'retirement', 'savings', 'depleted', 'spending', 'wealth', 'meltdown',
  'pensions', 'clawback', 'drawdown', 'splitting', 'taxation',
  'could', 'would', 'should', 'your situation', 'in-kind', 'on-track', 'household'
];

const defects = [];

function recordDefect(profile, category, detail) {
  defects.push({ profile, category, detail });
}

PROFILES.forEach(prof => {
  const tag = prof.id + '_' + prof.lang;

  // ── Check 1: AI response file presence + slot completeness ────────────
  const respPath = path.join(responsesDir, prof.id + '_' + prof.lang + '.json');
  if (!fs.existsSync(respPath)) {
    recordDefect(tag, 'missing_response', 'No AI response file at ' + respPath);
    return;
  }
  let resp;
  try { resp = JSON.parse(fs.readFileSync(respPath, 'utf8')); }
  catch (e) {
    recordDefect(tag, 'response_parse_error', e.message);
    return;
  }
  // Required slots — overall_assessment is the keystone; if it's missing, the
  // report's first impression breaks.
  const required = ['advisor_letter', 'overall_assessment', 'verdict'];
  required.forEach(k => {
    const v = resp[k];
    if (!v || typeof v !== 'string' || v.trim().length < 40) {
      recordDefect(tag, 'empty_required_slot', k + ' is missing or under 40 chars');
    }
    if (typeof v === 'string' && /Data insufficient for analysis/i.test(v)) {
      recordDefect(tag, 'placeholder_slot', k + ' contains "Data insufficient" placeholder');
    }
  });
  // Other slots: warn if present but under 30 chars (likely truncated)
  Object.keys(resp).forEach(k => {
    const v = resp[k];
    if (typeof v === 'string' && v.trim().length > 0 && v.trim().length < 30) {
      recordDefect(tag, 'thin_slot', k + ' under 30 chars: ' + JSON.stringify(v.slice(0, 40)));
    }
  });

  // ── Check 2: FR/EN language leaks ──────────────────────────────────────
  const allText = Object.values(resp).filter(v => typeof v === 'string').join(' ').toLowerCase();
  const leakList = prof.lang === 'fr' ? EN_LEAK_WORDS : FR_LEAK_WORDS;
  const leakLabel = prof.lang === 'fr' ? 'EN words in FR report' : 'FR words in EN report';
  const leaks = leakList.filter(w => {
    // Match whole word with word boundary
    const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    return re.test(allText);
  });
  if (leaks.length > 0) {
    recordDefect(tag, 'language_leak', leakLabel + ': ' + leaks.slice(0, 5).join(', '));
  }

  // ── Check 3: Action sequencing — for low-grade profiles, the AI should
  // produce a numbered/sequenced recovery path. Detect "phase 1", "phase 2"
  // OR "first / d'abord", "then / ensuite", or stress_interpretation has the
  // sequence pattern.
  const stressText = (resp.stress_interpretation || '').toLowerCase();
  const bestMove = (resp.best_move_explainer || '').toLowerCase();
  const combinedAction = stressText + ' ' + bestMove;
  // Look up the MC payload to determine the success rate (so we know if a
  // recovery path is required).
  const mcPath = path.join(DATA_DIR, 'mc', prof.id + '_' + prof.lang + '.json');
  // ── Check 6: FRESHNESS — the AI response must not predate its MC payload.
  // Root cause of the worst audit defects (audit 2026-06-16): MC was regenerated
  // but prompts/responses were never re-narrated, so the narrative quoted numbers
  // from a stale simulation (fabricated values into now-null fields, 41%→100%
  // contradictions). A response older than its mc/*.json is presumed stale and
  // must be re-dumped + re-narrated before it can ship.
  if (fs.existsSync(mcPath) && fs.existsSync(respPath)) {
    const mcM = fs.statSync(mcPath).mtimeMs;
    const respM = fs.statSync(respPath).mtimeMs;
    if (respM < mcM) {
      recordDefect(tag, 'stale_response', 'Response predates its MC payload (re-dump prompt + re-narrate). resp=' +
        new Date(respM).toISOString().slice(0, 10) + ' < mc=' + new Date(mcM).toISOString().slice(0, 10));
    }
  }
  if (fs.existsSync(mcPath)) {
    try {
      const mc = JSON.parse(fs.readFileSync(mcPath, 'utf8'));
      const succ = mc.succ;
      if (succ != null && succ < 0.45) {
        // Plan is fragile/critical — recovery path required
        // Recognize a numbered/sequenced recovery path in any common form:
        // "phase 1" / "étape 1", "first, … then,", "d'abord … ensuite", OR an
        // explicit numeric enumeration "(1) … (2)", "1. … 2.", "1) … 2)".
        // (audit 2026-06-16: the parenthetical/numeric forms were previously
        // unrecognized, flagging legitimate sequences like fire_seeker's "(1)…(2)").
        const hasSequence =
          /phase 1|phase 2|phase 3|étape 1|étape 2|first[,]|second[ly]?|then[,]|d'abord|ensuite|en premier|premièrement/i.test(combinedAction) ||
          /\(1\)[\s\S]*\(2\)|\b1[.)]\s[\s\S]*\b2[.)]\s/.test(combinedAction);
        if (!hasSequence) {
          recordDefect(tag, 'missing_recovery_path', 'Low-grade plan (succ=' + Math.round(succ*100) + '%) but stress_interpretation/best_move lack a numbered recovery sequence');
        }
      }
    } catch (e) { /* ignore mc parse errors here */ }
  }

  // ── Check 4: Rendered HTML present + non-trivial size ─────────────────
  const htmlPath = path.join(outputDir, prof.id + '_' + prof.lang + '.html');
  if (!fs.existsSync(htmlPath)) {
    recordDefect(tag, 'missing_html', 'No rendered HTML at ' + htmlPath);
  } else {
    const stat = fs.statSync(htmlPath);
    if (stat.size < 100 * 1024) {
      recordDefect(tag, 'thin_html', 'Rendered HTML is only ' + Math.round(stat.size / 1024) + ' KB (expected 200KB+)');
    }
    // Check 5: Action plan section must be present + have at least 1 lever.
    const html = fs.readFileSync(htmlPath, 'utf8');
    if (!/id="sec-actions"/.test(html)) {
      recordDefect(tag, 'empty_action_plan', 'Action plan section is missing (BActions returned no levers)');
    } else {
      const actStart = html.indexOf('id="sec-actions"');
      const actEnd = html.indexOf('id="sec-methodology"', actStart);
      const actSection = html.slice(actStart, actEnd > 0 ? actEnd : actStart + 8000);
      const leverCount = (actSection.match(/class="reco-card/g) || []).length;
      if (leverCount === 0) {
        recordDefect(tag, 'thin_action_plan', 'Action plan section has 0 levers');
      } else if (leverCount < 2) {
        recordDefect(tag, 'thin_action_plan', 'Action plan section has only ' + leverCount + ' lever (expected 2+)');
      }
    }
  }
});

// ── Report ──────────────────────────────────────────────────────────────
console.log('QA scan complete.');
console.log('Profiles checked: ' + PROFILES.length);
console.log('Defects found: ' + defects.length);
console.log('');

if (defects.length === 0) {
  console.log('  ✓ All profiles pass QA.');
  process.exit(0);
}

// Group by profile for clean reporting
const byProfile = {};
defects.forEach(d => {
  if (!byProfile[d.profile]) byProfile[d.profile] = [];
  byProfile[d.profile].push(d);
});
Object.keys(byProfile).sort().forEach(prof => {
  console.log('  ⨯ ' + prof);
  byProfile[prof].forEach(d => {
    console.log('      [' + d.category + '] ' + d.detail);
  });
});
console.log('');
console.log('Failed: ' + Object.keys(byProfile).length + '/' + PROFILES.length + ' profiles.');
process.exit(1);
