// content-depth-auditor.js — Sprint 8 (content-quality regression auditor).
//
// The 14 structural auditors confirm that sections render and that numbers
// trace back to canonical metrics. They do NOT confirm that a section
// actually discusses what the case requires. This auditor closes that gap.
//
// Two independent checks:
//
//   1. content_shallow (severity=minor): a known section ID exists but its
//      visible text contains < MIN_WORDS words. The section is technically
//      rendered but the AI / deterministic copy is too thin to be useful.
//
//   2. content_missing_beat (severity=major, fix_kind=rerun_ai_slot): the
//      profile's case_driver requires specific beats (see registry at
//      planner/report/realai/content-requirements.json). When a required
//      beat's patterns DO NOT match any visible text in the target section,
//      we flag a major. If the target section is absent, the beat is
//      SKIPPED — the structural auditors handle missing sections.
//
// The registry is the source of truth. To tighten or loosen a beat, edit
// the JSON file, not this auditor.
//
// Notes:
//   - All pattern matching runs against VISIBLE text only. Script and style
//     blocks, HTML comments, and tag attributes are stripped first so that
//     "// RDTOH: ..." inside an embedded simulator JS doesn't satisfy the
//     CDA/RDTOH beat.
//   - Patterns are case-insensitive. Multiple patterns per beat are OR'd —
//     any one match satisfies the beat (e.g. "CDA" OR "compte de
//     dividendes en capital").
//   - Auditor returns [] when the registry is missing or the profile has no
//     case_driver — it never crashes the orchestrator.

'use strict';
var fs = require('fs');
var path = require('path');

var MIN_WORDS = 50;          // shallow-section threshold (visible-word count)
var REGISTRY_PATH = path.join(__dirname, '..', '..', 'realai', 'content-requirements.json');

// ─── Load registry once at module load ──────────────────────────────────
var _registry = null;
var _registryError = null;
try {
  _registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
} catch (e) {
  _registryError = e && e.message;
}

function _stripToVisible(html) {
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

function _wordCount(text) {
  if (!text) return 0;
  // Split on any non-word boundary; filter out tokens of length < 2 to
  // avoid counting stray punctuation/digits as words. Numbers (e.g. "27%",
  // "$1,200") still pass because they include digits.
  var toks = text.split(/\s+/).filter(function(t) {
    return t.length >= 2;
  });
  return toks.length;
}

// Returns the visible-text body of `sectionId` from `html`. Sections are
// emitted as <h3 class="sec" id="sec-..."> ... </h3> followed by content
// until the next sec-h3 OR a <div class="sec-page"> divider. We capture
// from the section's <h3> opening to the start of the NEXT section anchor
// (any kind).
function _sectionBody(html, sectionId) {
  // Build the list of all section anchors so we can find the closing
  // boundary without relying on lookahead regex (faster + simpler).
  var anchors = [];
  var reH3 = /<h3 class="sec"[^>]*id="(sec-[a-z-]+)"[^>]*>/gi;
  var reDiv = /<div class="sec-page"[^>]*id="(sec-[a-z-]+)"[^>]*>/gi;
  var m;
  while ((m = reH3.exec(html)) !== null) {
    anchors.push({ id: m[1], start: m.index });
  }
  while ((m = reDiv.exec(html)) !== null) {
    anchors.push({ id: m[1], start: m.index });
  }
  anchors.sort(function(a, b) { return a.start - b.start; });
  for (var i = 0; i < anchors.length; i++) {
    if (anchors[i].id === sectionId) {
      var start = anchors[i].start;
      var end = (i + 1 < anchors.length) ? anchors[i + 1].start : html.length;
      return html.slice(start, end);
    }
  }
  return null; // section not rendered
}

function _hasAnyMatch(text, patterns) {
  if (!text || !patterns || !patterns.length) return false;
  for (var i = 0; i < patterns.length; i++) {
    var re;
    try { re = new RegExp(patterns[i], 'i'); }
    catch (e) { continue; } // bad regex in registry — skip silently
    if (re.test(text)) return true;
  }
  return false;
}

function audit(pack) {
  var findings = [];
  if (!pack || !pack.html) return findings;

  // If the registry failed to load, surface ONE minor so the operator
  // sees the auditor is degraded — but never crash the run.
  if (!_registry) {
    findings.push({
      id: 'content-depth-registry-missing',
      reviewer: 'content-depth',
      severity: 'minor',
      category: 'auditor_error',
      message: 'content-requirements.json could not be loaded — content-depth auditor is degraded.' + (_registryError ? ' Reason: ' + _registryError : ''),
      fix_kind: 'manual'
    });
    return findings;
  }

  var html = pack.html;
  var sections = pack.sections || [];
  var sectionIds = {};
  sections.forEach(function(s) { sectionIds[s.id] = true; });

  // ─── Check 1: shallow sections ────────────────────────────────────────
  // Iterate the section manifest the pack-builder already produced.
  // A section is shallow when it renders but contains fewer than
  // MIN_WORDS visible words. Skip purely structural pages (signature,
  // glossary, profile cover) — they're mechanical, not narrative.
  var STRUCTURAL_SKIP = {
    'sec-signature': true,
    'sec-glossary': true,
    'sec-profile': true,
    'sec-methodology': true,
    'sec-assumptions': true,
    'sec-closing-recap': true,
    'sec-whatif': true       // simulator: ~all interactive markup, low word count is normal
  };

  sections.forEach(function(sec) {
    if (STRUCTURAL_SKIP[sec.id]) return;
    var body = _sectionBody(html, sec.id);
    if (!body) return;
    var visible = _stripToVisible(body);
    var words = _wordCount(visible);
    if (words < MIN_WORDS) {
      findings.push({
        id: 'content-shallow-' + sec.id,
        reviewer: 'content-depth',
        severity: 'minor',
        category: 'content_shallow',
        section: sec.id,
        message: 'Section ' + sec.id + ' renders but contains only ' + words + ' visible words (threshold ' + MIN_WORDS + '). Either the deterministic copy is too thin or an AI slot returned empty.',
        evidence: 'words=' + words + ' bytes=' + (body.length || 0),
        fix_kind: 'manual',
        fix_target: sec.id
      });
    }
  });

  // ─── Check 2: profile-specific beat coverage ─────────────────────────
  var driver = (pack.profile && pack.profile.case_driver) || null;
  if (!driver) return findings;
  var spec = _registry.drivers && _registry.drivers[driver];
  if (!spec || !spec.required_beats) return findings;

  // Pre-compute visible text for each section we'll actually probe + the
  // full-doc visible text (for beats targeting '*'). Cached so multi-beat
  // drivers don't re-strip the same body N times.
  var fullVisible = null;
  var sectionVisibleCache = {};

  function getFullVisible() {
    if (fullVisible == null) fullVisible = _stripToVisible(html);
    return fullVisible;
  }
  function getSectionVisible(secId) {
    if (sectionVisibleCache[secId] != null) return sectionVisibleCache[secId];
    var body = _sectionBody(html, secId);
    sectionVisibleCache[secId] = body ? _stripToVisible(body) : null;
    return sectionVisibleCache[secId];
  }

  spec.required_beats.forEach(function(beat) {
    var targetSec = beat.section || '*';
    var targetText;
    if (targetSec === '*') {
      targetText = getFullVisible();
    } else {
      // If the section isn't rendered, SKIP — structural auditors handle
      // the missing-section case. We don't want to double-flag.
      if (!sectionIds[targetSec]) return;
      targetText = getSectionVisible(targetSec);
      if (!targetText) return;
    }
    if (_hasAnyMatch(targetText, beat.patterns)) return; // beat satisfied

    findings.push({
      // Severity = MAJOR per Sprint 8 contract: a missing case-driver beat
      // means the report fails to address what the case fundamentally
      // requires. fix_kind=rerun_ai_slot routes the corrector to
      // regenerate the targeted slot rather than ask for manual rework.
      id: 'content-missing-beat-' + beat.id,
      reviewer: 'content-depth',
      severity: 'major',
      category: 'content_missing_beat',
      section: (targetSec === '*') ? null : targetSec,
      message: 'Required content beat "' + (beat.label || beat.id) + '" is missing for case_driver=' + driver + '. ' + (targetSec === '*' ? 'No matching pattern anywhere in visible text.' : 'Section ' + targetSec + ' rendered but does not surface this beat.'),
      evidence: 'driver=' + driver + ' beat=' + beat.id + ' patterns=' + JSON.stringify(beat.patterns),
      fix_kind: 'rerun_ai_slot',
      fix_target: (targetSec === '*') ? 'narrative' : targetSec
    });
  });

  return findings;
}

module.exports = { audit: audit, MIN_WORDS: MIN_WORDS };
