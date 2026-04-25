// language-auditor.js — Deterministic FR/EN purity + AMF tone scan.
//
// Detects:
//   - language_leak: FR words in EN report (or vice-versa) WITHIN visible
//     content (not script blocks, not comments).
//   - prescriptive_language: AMF-banned imperatives.
//
// Strategy: scan only the visible text. We strip <script> / <style> blocks
// and tags before applying word-boundary regex.

'use strict';

// Strip script/style/comments + tags to get visible text
function _visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

// FR-only tokens that wouldn't naturally appear as borrowings in EN reports
var FR_LEAK = [
  ' ans\\b',           // "@ 64 ans"
  '\\bretraite\\b',
  '\\bépargne\\b',
  '\\bdépenses?\\b',
  '\\bpatrimoine\\b',
  '\\brevenus?\\b',
  '\\brécupération\\b',
  '\\bdécaissement\\b',
  '\\bfractionnement\\b',
  '\\bpourrait\\b',
  '\\bserait\\b',
  '\\bdevrait\\b',
  "\\bl'épargne\\b",
  "\\bl'horizon\\b",
  "Plan de retraite",
  "Annexe",
  "Hypothèses",
  "Glossaire",
  "Méthodologie",
  "indexée à vie",
  "Régime de pensions",
  "ann?ée\\b"
];

// EN-only tokens unlikely in FR reports
var EN_LEAK = [
  '\\byrs?\\b',
  '\\bretirement\\b',
  '\\bsavings\\b',
  '\\bspending\\b',
  '\\bwealth\\b',
  '\\bclawback\\b',
  '\\bdrawdown\\b',
  '\\bsplitting\\b',
  '\\bcould\\b',
  '\\bwould\\b',
  '\\bshould\\b',
  '\\bRetirement Plan\\b',
  '\\bAssumptions\\b',
  '\\bGlossary\\b',
  '\\bMethodology\\b'
];

// Tightened patterns — catch directives addressed to the client, not generic
// uses of "should/must/recommend" in passive or educational text. Earlier
// version flagged "income should flow" and "not a recommendation" as defects.
var PRESCRIPTIVE_FR = [
  '\\bvous devez\\b',
  '\\bvous devriez\\b',
  '\\bil faut que vous\\b',
  '\\bnous (vous )?recommandons\\b',
  '\\bnous conseillons\\b'
];
var PRESCRIPTIVE_EN = [
  '\\byou must\\b',
  '\\byou should\\b',
  '\\byou are required to\\b',
  '\\bwe recommend (that )?you\\b',
  '\\bwe advise (that )?you\\b'
];

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var visible = _visibleText(pack.html);
  // We only check the BODY content, not boilerplate strings printed by the
  // pipeline (page header CSS strings still leak FR labels regardless of
  // language — we tackle those via dedicated localization, not by scanning).
  // Strip the running-header / footer phrases too:
  visible = visible
    .replace(/BuildFi\s*[—–-]\s*Plan de retraite/g, ' ')
    .replace(/BuildFi\s*[—–-]\s*Retirement Plan/g, ' ');

  // ─── 1) Language leaks ───────────────────────────────────────────────
  var leakList = fr ? EN_LEAK : FR_LEAK;
  var leakLabel = fr ? 'EN tokens in FR report' : 'FR tokens in EN report';
  var leaks = [];
  leakList.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m;
    var count = 0;
    while ((m = re.exec(visible)) !== null) {
      count++;
      if (count > 50) break;  // sanity
    }
    if (count > 0) {
      // Collect a short context sample for evidence
      var sampleRe = new RegExp('.{0,30}' + pat + '.{0,30}', 'i');
      var sampleMatch = visible.match(sampleRe);
      leaks.push({ pattern: pat, count: count, sample: sampleMatch ? sampleMatch[0].trim() : '' });
    }
  });
  if (leaks.length > 0) {
    // Major if just glossary boilerplate, blocker if it appears in client-facing prose
    var totalCount = leaks.reduce(function(s, l) { return s + l.count; }, 0);
    findings.push({
      id: 'lang-leak',
      reviewer: 'language',
      severity: totalCount > 5 ? 'blocker' : 'major',
      category: 'language_leak',
      section: null,
      message: leakLabel + ': ' + leaks.length + ' patterns matched, ' + totalCount + ' total occurrences',
      evidence: leaks.slice(0, 3).map(function(l) { return l.pattern + ' (×' + l.count + '): "' + l.sample + '"'; }).join(' | '),
      fix_kind: 'localize_label',
      fix_target: 'global'
    });
  }

  // ─── 2) Prescriptive language (AMF) ──────────────────────────────────
  var prescList = fr ? PRESCRIPTIVE_FR : PRESCRIPTIVE_EN;
  var prescHits = [];
  prescList.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m;
    var c = 0;
    while ((m = re.exec(visible)) !== null) { c++; if (c > 10) break; }
    if (c > 0) prescHits.push({ pattern: pat, count: c });
  });
  if (prescHits.length > 0) {
    findings.push({
      id: 'lang-prescriptive',
      reviewer: 'language',
      severity: 'major',
      category: 'language_leak',
      section: null,
      message: 'Prescriptive language detected (AMF-banned imperatives).',
      evidence: prescHits.map(function(h) { return h.pattern + '×' + h.count; }).join(' | '),
      fix_kind: 'rerun_ai_slot',
      fix_target: 'tone-pass'
    });
  }

  return findings;
}

module.exports = { audit: audit };
