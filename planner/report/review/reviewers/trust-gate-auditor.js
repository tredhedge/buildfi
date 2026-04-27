// trust-gate-auditor.js — Hard ship-blocking checks for client-facing trust.
//
// Per Codex feedback (2026-04-27): a report should fail the build (not
// just warn) when any of these client-visible trust-breakers slip through:
//
//   1. Em-dash / blank KPI values in headline metric tiles (looks like
//      missing data even when the value is legitimately zero — the
//      renderer is supposed to substitute "$0 + qualifier").
//   2. Mixed-language classifier labels (e.g. an FR cover banner that
//      reads "intermediate / low / balanced" — caught before but the
//      classifier path can re-introduce it).
//   3. Placeholder copy left over from templating: "TODO", "FIXME",
//      "[insert ...]", literal "{{slot}}", "Lorem ipsum".
//   4. Internal provenance / engineering language in client prose
//      ("Reader profile —", "Sprint", "Phase 2", "renderProfile",
//      "BFConstants", "fix-plan").
//
// Each finding is a BLOCKER — the ship gate stops shipment until the
// renderer is fixed. No corrections applied here; manual fix_kind only.

'use strict';

function _visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

// Headline KPI tile selector. The exec-summary renderer emits each tile
// inside a div with a class and font-family that's distinctive enough to
// scope our "blank value" check to the tiles, not to ratios in prose.
function _kpiTiles(html) {
  // Match the value <div> inside a KPI tile — large monospace digit cell.
  // Tiles look like:
  //   <div ...>LABEL</div>
  //   <div style="...font-size:24px;font-weight:700;...">VALUE</div>
  //   <div ...>SUBLINE</div>
  var tiles = [];
  var re = /<div[^>]*font-size:24px[^>]*font-weight:700[^>]*>([\s\S]*?)<\/div>/g;
  var m;
  while ((m = re.exec(html)) !== null) {
    var inner = m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    tiles.push(inner);
    if (tiles.length > 30) break;
  }
  return tiles;
}

// Classifier labels (FR-only inside FR reports, EN-only inside EN reports).
// Mixed cover banner like "Profil lecteur — Litt. fin.: intermediate ·
// Stress: moderate" is the signature defect.
var FR_CLASSIFIER_TOKENS_EN = [
  '\\bbeginner\\b',
  '\\bintermediate\\b',
  '\\badvanced\\b',
  '\\bmoderate\\b',
  '\\bbalanced\\b',
  '\\bdetailed\\b',
  '\\bconcise\\b'
];
var EN_CLASSIFIER_TOKENS_FR = [
  '\\bd\\u00e9butant\\b',
  '\\binterm\\u00e9diaire\\b',
  '\\bavanc\\u00e9\\b',
  '\\bmod\\u00e9r\\u00e9\\b',
  '\\b\\u00e9quilibr\\u00e9\\b',
  '\\bd\\u00e9taill\\u00e9\\b'
];

// Placeholder copy that should never reach a client.
var PLACEHOLDER_PATTERNS = [
  '\\bTODO\\b',
  '\\bFIXME\\b',
  '\\bXXX\\b',
  '\\[insert [^\\]]+\\]',
  '\\{\\{[a-z_]+\\}\\}',
  '\\blorem ipsum\\b',
  '\\bplaceholder\\b'
];

// Internal-only language that leaks engineering vocabulary.
var INTERNAL_LEAKS = [
  '\\bReader profile\\b',
  '\\bProfil lecteur\\b',
  '\\bSprint \\d',
  '\\bPhase \\d',
  '\\brenderProfile\\b',
  '\\bBFConstants\\b',
  '\\bfix-plan\\b',
  '\\bcase_driver\\b',
  '\\bomittedBlocks\\b'
];

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var html = pack.html;
  var visible = _visibleText(html);

  // ─── 1) Em-dash / blank KPI values ───────────────────────────────────
  // After 2026-04-26 fix the median-wealth tile should render "$0" not "—"
  // when capital is zero. If "—" reaches a KPI value cell again, the
  // _kpiNum guard regressed.
  var tiles = _kpiTiles(html);
  var blankTiles = tiles.filter(function(t) {
    var stripped = t.replace(/[\s\u00a0]/g, '');
    return stripped === '\u2014' || stripped === '-' || stripped === '' || /^[\u2014\-]+$/.test(stripped);
  });
  if (blankTiles.length > 0) {
    findings.push({
      id: 'trust-blank-kpi',
      reviewer: 'trust-gate',
      severity: 'blocker',
      category: 'trust_gate',
      section: null,
      message: 'Headline KPI tile renders blank / em-dash value (' + blankTiles.length + '). A real number or explanatory placeholder must be shown.',
      evidence: 'Blank tile count: ' + blankTiles.length + ' / ' + tiles.length + ' total tiles',
      fix_kind: 'manual',
      fix_target: 'exec-summary'
    });
  }

  // ─── 2) Mixed-language classifier labels ─────────────────────────────
  var classifierMixList = fr ? FR_CLASSIFIER_TOKENS_EN : EN_CLASSIFIER_TOKENS_FR;
  var mixHits = [];
  classifierMixList.forEach(function(pat) {
    var re = new RegExp(pat, 'g');
    var m, c = 0;
    while ((m = re.exec(visible)) !== null) {
      c++;
      if (c > 5) break;
    }
    if (c > 0) mixHits.push({ pattern: pat, count: c });
  });
  if (mixHits.length > 0) {
    findings.push({
      id: 'trust-classifier-mix',
      reviewer: 'trust-gate',
      severity: 'blocker',
      category: 'trust_gate',
      section: null,
      message: (fr ? 'EN classifier tokens in FR report' : 'FR classifier tokens in EN report') + ' \u2014 cover banner / TOC legend leaks untranslated values.',
      evidence: mixHits.map(function(h) { return h.pattern + '\u00d7' + h.count; }).join(' | '),
      fix_kind: 'localize_label',
      fix_target: 'classifier-labels'
    });
  }

  // ─── 3) Placeholder copy ─────────────────────────────────────────────
  var phHits = [];
  PLACEHOLDER_PATTERNS.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m, c = 0, sample = '';
    while ((m = re.exec(visible)) !== null) {
      c++;
      if (c === 1) sample = visible.substring(Math.max(0, m.index - 20), Math.min(visible.length, m.index + 50)).trim();
      if (c > 5) break;
    }
    if (c > 0) phHits.push({ pattern: pat, count: c, sample: sample });
  });
  if (phHits.length > 0) {
    findings.push({
      id: 'trust-placeholder',
      reviewer: 'trust-gate',
      severity: 'blocker',
      category: 'trust_gate',
      section: null,
      message: 'Placeholder template copy reached client output.',
      evidence: phHits.map(function(h) { return h.pattern + '(\u00d7' + h.count + '): "' + h.sample + '"'; }).join(' | '),
      fix_kind: 'manual',
      fix_target: 'global'
    });
  }

  // ─── 4) Internal-only engineering language ───────────────────────────
  var leakHits = [];
  INTERNAL_LEAKS.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m, c = 0, sample = '';
    while ((m = re.exec(visible)) !== null) {
      c++;
      if (c === 1) sample = visible.substring(Math.max(0, m.index - 20), Math.min(visible.length, m.index + 50)).trim();
      if (c > 5) break;
    }
    if (c > 0) leakHits.push({ pattern: pat, count: c, sample: sample });
  });
  if (leakHits.length > 0) {
    findings.push({
      id: 'trust-internal-leak',
      reviewer: 'trust-gate',
      severity: 'blocker',
      category: 'trust_gate',
      section: null,
      message: 'Internal engineering vocabulary leaked into client deliverable.',
      evidence: leakHits.map(function(h) { return h.pattern + '(\u00d7' + h.count + '): "' + h.sample + '"'; }).join(' | '),
      fix_kind: 'manual',
      fix_target: 'global'
    });
  }

  return findings;
}

module.exports = { audit: audit };
