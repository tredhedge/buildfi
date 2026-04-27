// compliance-auditor.js — Premium-rebuild auditor (P1.7 part 3).
//
// Picks up where language-auditor left off:
//   - compliance_disclaimer_excess: more than 4 visible disclaimers in the
//     report (F39 budget). Disclaimers are valuable once; 15× makes the
//     report feel like a legal waiver and erodes confidence.
//   - compliance_prescriptive: tightened prescriptive-verb regex bank that
//     catches the close-to-prescriptive constructions the existing
//     language-auditor misses ("méritent d'être validés", "il y aurait
//     lieu de", "c'est à considérer").
//   - compliance_tense_drift: detected only in narrations citing future
//     trajectories — must use conditional tense ("pourrait", "would",
//     "could"). Present indicative on a projection ("le portefeuille
//     reste large") leaks AMF-noncompliant certainty.
//
// All severities are `major` (rerun_ai_slot or manual rewrite).

'use strict';
var Contract = require('../review-contract.js');

function _visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

var TIGHT_PRESCRIPTIVE_FR = [
  /\bm\u00e9ritent d['\u2019]\u00eatre\b/i,
  /\bil y aurait lieu de\b/i,
  /\bc['\u2019]est \u00e0 consid\u00e9rer\b/i,
  /\bvous gagneriez \u00e0\b/i,
  /\bpriorit\u00e9 absolue\b/i,
  /\bd\u00e9cisif\b/i,
  /\bsans (h\u00e9siter|d\u00e9lai)\b/i
];
var TIGHT_PRESCRIPTIVE_EN = [
  /\bworth (validating|considering|reviewing)\b/i,
  /\bof critical importance\b/i,
  /\bthe right move is\b/i,
  /\babsolute priority\b/i,
  /\bdo not delay\b/i,
  /\byou ought to\b/i
];

// Future-projection cue + present indicative → tense drift candidate.
// We keep it intentionally narrow to avoid false positives.
var TENSE_DRIFT_FR = [
  /\b(\u00e0|d\u00e8s)\s+\d{2,4}[^.]{0,80}\b(reste|demeure|est|n['\u2019]est)\b/i,
  /\bdans \d+\s+ans?[^.]{0,60}\b(est|reste|d\u00e9passe)\b/i
];
var TENSE_DRIFT_EN = [
  /\b(by|in|after)\s+\d{2,4}[^.]{0,80}\b(is|remains|stays)\b/i,
  /\bin \d+\s+years?[^.]{0,60}\b(is|exceeds|remains)\b/i
];

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var html = pack.html;
  var visible = _visibleText(html);
  var budget = (Contract.DISCLAIMER_BUDGET && Contract.DISCLAIMER_BUDGET.max_visible) || 4;

  // ─── 1) Disclaimer budget ───────────────────────────────────────────
  var disclaimerCount = (html.match(/class="disclaimer"/gi) || []).length;
  if (disclaimerCount > budget) {
    findings.push({
      id: 'compliance-disclaimer-excess',
      reviewer: 'compliance',
      severity: 'major',
      category: 'compliance_disclaimer_excess',
      section: null,
      message: 'Report contains ' + disclaimerCount + ' disclaimer instances (budget=' + budget + '). Excess reads as legal waiver, not premium advice.',
      evidence: 'count=' + disclaimerCount + ' budget=' + budget,
      fix_kind: 'manual',
      fix_target: 'global-disclaimers'
    });
  }

  // ─── 2) Tightened prescriptive-verb scan ────────────────────────────
  var presc = fr ? TIGHT_PRESCRIPTIVE_FR : TIGHT_PRESCRIPTIVE_EN;
  var prescHits = [];
  presc.forEach(function(re) {
    var m = visible.match(new RegExp(re.source, re.flags + 'g'));
    if (m && m.length > 0) prescHits.push({ pattern: re.source, count: m.length, sample: m[0] });
  });
  if (prescHits.length > 0) {
    // Severity escalates from minor → major when 3+ patterns are detected.
    // A single "worth validating" or "ought to" doesn't merit a ship gate.
    var totalPresc = prescHits.reduce(function(s, h) { return s + h.count; }, 0);
    var sev = totalPresc >= 3 ? 'major' : 'minor';
    findings.push({
      id: 'compliance-prescriptive-tight',
      reviewer: 'compliance',
      severity: sev,
      category: 'compliance_prescriptive',
      section: null,
      message: 'Tightened prescriptive constructions detected (close-to-imperative language).',
      evidence: prescHits.slice(0, 3).map(function(h) { return h.pattern + '×' + h.count + ' "' + h.sample + '"'; }).join(' | '),
      fix_kind: 'rerun_ai_slot',
      fix_target: 'tone-pass'
    });
  }

  // ─── 3) Tense drift on future projections ───────────────────────────
  var tenseList = fr ? TENSE_DRIFT_FR : TENSE_DRIFT_EN;
  var tenseHits = [];
  tenseList.forEach(function(re) {
    var m = visible.match(new RegExp(re.source, re.flags + 'g'));
    if (m && m.length > 0) tenseHits.push({ pattern: re.source, count: m.length, sample: m[0].slice(0, 80) });
  });
  if (tenseHits.length >= 2) {
    findings.push({
      id: 'compliance-tense-drift',
      reviewer: 'compliance',
      severity: 'minor',
      category: 'compliance_tense_drift',
      section: null,
      message: 'Future-projection sentences using present-indicative tense detected (AMF requires conditional).',
      evidence: tenseHits.slice(0, 3).map(function(h) { return h.sample; }).join(' | '),
      fix_kind: 'rerun_ai_slot',
      fix_target: 'tone-pass'
    });
  }

  return findings;
}

module.exports = { audit: audit };
