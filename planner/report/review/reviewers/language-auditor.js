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

// FR/EN jargon mix — terms that leak EN engineering vocabulary into FR
// client-facing prose. These are NEVER acceptable in a client deliverable
// and Codex flagged 'meltdown REER' explicitly. Add new entries here as
// review batches surface them.
var FR_EN_JARGON_MIX = [
  '\\bMeltdown\\b',          // EN engineering term in FR copy
  '\\bWhat[- ]If\\b',        // simulator name in FR client prose
  '\\bDrawdown\\b',          // EN finance term in FR copy
  '\\bSequence of returns\\b',
  '\\bSimulator\\b',         // FR should be "simulateur"
  '\\bDashboard\\b'          // FR should be "tableau de bord"
];
// EN/FR jargon mix — same in reverse for EN reports
var EN_FR_JARGON_MIX = [
  '\\bm\\u00e9thodologie\\b',
  '\\bsynth\\u00e8se\\b',
  '\\bd\\u00e9caissement\\b'
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

  // ─── 1.5) FR/EN jargon mix in client prose (BLOCKER) ─────────────────
  // Codex feedback 2026-04-27: 'Stratégie Meltdown REER' must never reach
  // a client. These terms are product-engineering vocabulary that should
  // be translated for client deliverables.
  var jargonList = fr ? FR_EN_JARGON_MIX : EN_FR_JARGON_MIX;
  var jargonHits = [];
  jargonList.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m, c = 0, sample = '';
    while ((m = re.exec(visible)) !== null) {
      c++;
      if (c === 1) {
        var ctx = visible.substring(Math.max(0, m.index - 30), Math.min(visible.length, m.index + 50));
        sample = ctx.trim();
      }
      if (c > 20) break;
    }
    if (c > 0) jargonHits.push({ pattern: pat, count: c, sample: sample });
  });
  if (jargonHits.length > 0) {
    findings.push({
      id: 'lang-jargon-mix',
      reviewer: 'language',
      severity: 'blocker',
      category: 'language_leak',
      section: null,
      message: (fr ? 'EN engineering jargon in FR client report' : 'FR engineering jargon in EN client report') + ': ' + jargonHits.length + ' term(s) matched',
      evidence: jargonHits.map(function(h) { return h.pattern + ' (\u00d7' + h.count + '): "' + h.sample + '"'; }).join(' | '),
      fix_kind: 'localize_label',
      fix_target: 'global'
    });
  }

  // ─── 1.6) Name-variant inconsistency (BLOCKER) ───────────────────────
  // Same client name spelled two different ways in the same report
  // (Francois vs François) is a trust-breaker. Detect by checking known
  // diacritic-stripped pairs against the visible content.
  var clientName = (pack.profile && pack.profile.client && (pack.profile.client.firstName || pack.profile.client.name)) || '';
  if (clientName) {
    // Generic pair detector: if a name contains a diacritic, the bare-ASCII
    // form is a defect when it appears alongside the diacritic form.
    var stripped = clientName
      .replace(/[\u00e0\u00e1\u00e2\u00e4]/g, 'a').replace(/[\u00c0\u00c1\u00c2\u00c4]/g, 'A')
      .replace(/[\u00e7]/g, 'c').replace(/[\u00c7]/g, 'C')
      .replace(/[\u00e8\u00e9\u00ea\u00eb]/g, 'e').replace(/[\u00c8\u00c9\u00ca\u00cb]/g, 'E')
      .replace(/[\u00ee\u00ef]/g, 'i').replace(/[\u00ce\u00cf]/g, 'I')
      .replace(/[\u00f4\u00f6]/g, 'o').replace(/[\u00d4\u00d6]/g, 'O')
      .replace(/[\u00f9\u00fb\u00fc]/g, 'u').replace(/[\u00d9\u00db\u00dc]/g, 'U');
    if (stripped !== clientName) {
      var bareRe = new RegExp('\\b' + stripped.replace(/\s+/g, '\\s+') + '\\b', 'g');
      var bareCount = (visible.match(bareRe) || []).length;
      if (bareCount > 0) {
        findings.push({
          id: 'lang-name-variant',
          reviewer: 'language',
          severity: 'blocker',
          category: 'language_leak',
          section: null,
          message: 'Client name "' + clientName + '" appears as bare-ASCII "' + stripped + '" \u2014 inconsistent spelling.',
          evidence: 'Diacritic form: "' + clientName + '" \u00b7 Bare form: "' + stripped + '" found ' + bareCount + ' time(s)',
          fix_kind: 'localize_label',
          fix_target: 'client.name'
        });
      }
    }
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

  // ─── Currency convention (audit 2026-06-17) ──────────────────────────
  // EN reports must use the prefix form ($200K); the FR suffix form (200K$ /
  // 1.4M$) is a convention leak — it reached EN reports because the prompt DATA
  // block is suffix-form regardless of language and the narration quoted it, and
  // because some chart labels were hardcoded. Flag any visible suffix money in
  // an EN report. (FR suffix is correct, so FR is not checked here.)
  if (!fr) {
    var _curHits = visible.match(/\b\d+(?:\.\d+)?[KM]\$/g) || [];
    if (_curHits.length > 0) {
      var _uniq = Array.from(new Set(_curHits));
      findings.push({
        id: 'lang-en-currency-suffix',
        reviewer: 'language',
        severity: 'major',
        category: 'currency_convention',
        section: null,
        message: 'EN report uses FR suffix currency (' + _curHits.length + 'x, e.g. "' + _uniq[0] + '"). EN convention is the $ prefix.',
        evidence: _uniq.slice(0, 6).join(', '),
        fix_kind: 'manual',
        fix_target: 'currency'
      });
    }
  }

  // Double currency symbol — any language. "$219K$" / "219K$ $": a formatter
  // that already includes the symbol followed by an appended literal "$". Guards
  // against an f$(x) + '$' regression in either FR or EN. (Audit 2026-06-17.)
  var _dbl = visible.match(/\$\d+(?:\.\d+)?[KM]\$|[KM]\$\s?\$/g) || [];
  if (_dbl.length > 0) {
    findings.push({
      id: 'lang-double-currency',
      reviewer: 'language',
      severity: 'major',
      category: 'currency_convention',
      section: null,
      message: 'Double currency symbol detected (' + _dbl.length + 'x, e.g. "' + _dbl[0].trim() + '") — a formatter already includes "$" and a literal "$" was appended.',
      evidence: Array.from(new Set(_dbl)).slice(0, 5).join(', '),
      fix_kind: 'manual',
      fix_target: 'currency'
    });
  }

  return findings;
}

module.exports = { audit: audit };
