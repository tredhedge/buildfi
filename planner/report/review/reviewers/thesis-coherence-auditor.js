// thesis-coherence-auditor.js — Phase B2.
// ══════════════════════════════════════════════════════════════════════
// Cross-section RHETORICAL coherence. The cover grade band, the advisor
// letter, the overall_assessment, the deterministic observations list
// and the action-plan lever #1 must all describe the plan in the same
// posture. A 6% success plan can't have a "solid" framing anywhere; a
// 100% plan can't have a "fragile" framing anywhere.
//
// Codex finding 6 made this concrete: hnw_couple cover said "A- solid"
// (89% success) and the deterministic observations list said "⚠ Plan
// fragile". Same report, two postures, contradiction.
//
// Posture bands (driven by the canonical success_rate):
//   * surplus  → succ ≥ 90%  AND covRatio ≥ 1.0
//   * solid    → succ ≥ 75%
//   * fragile  → succ ≥ 50%
//   * at-risk  → succ ≥ 25%
//   * failure  → succ < 25%
//
// Vocabulary banks per band (anything that drifts more than 1 band away
// from the canonical band is flagged). E.g. a "solid" word appearing in
// a "failure" plan is a 4-band drift → blocker. A "fragile" word in a
// "solid" plan is a 1-band drift → minor.
//
// Severity model:
//   2+ bands of drift in any opening slot → major (rerun_ai_slot).
//   1 band of drift in 3+ slots → major (cumulative dissonance).
//   0-1 bands of drift in 1-2 slots → minor (acceptable rhetorical
//   flexibility).
// ══════════════════════════════════════════════════════════════════════

'use strict';

function _stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

function _slotText(ai, key) {
  if (!ai || !ai[key]) return '';
  var v = ai[key];
  return typeof v === 'string' ? v : (v && v.text) || '';
}

function _bandFromSucc(succ, covRatio) {
  if (succ == null) return null;
  if (succ >= 0.90 && (covRatio == null || covRatio >= 1.0)) return 'surplus';
  if (succ >= 0.75) return 'solid';
  if (succ >= 0.50) return 'fragile';
  if (succ >= 0.25) return 'at-risk';
  return 'failure';
}

var BAND_ORDER = ['failure', 'at-risk', 'fragile', 'solid', 'surplus'];

function _bandDistance(a, b) {
  var ia = BAND_ORDER.indexOf(a);
  var ib = BAND_ORDER.indexOf(b);
  if (ia < 0 || ib < 0) return 0;
  return Math.abs(ia - ib);
}

// Vocabulary per band. Anchor words that signal the speaker's posture.
// FR + EN combined — both languages match because reports are bilingual.
var BAND_VOCAB = {
  surplus: [
    'surplus', 'over-funded', 'overfunded', 'sur-financ', 'au-del', 'exc\u00e8de',
    'exceeds spending', 'd\u00e9passe les d\u00e9penses', 'beyond what you need'
  ],
  solid: [
    'solid', 'solide', 'robust', 'robuste', 'strong', 'fort(e|es)?',
    'on track', 'en voie', 'sain', 'healthy', 'reliable', 'fiable',
    'secure', 's\u00e9curitaire', 'stable'
  ],
  fragile: [
    'fragile', 'tight', 'serr\u00e9', 'limited margin', 'marge r\u00e9duite',
    'requires discipline', 'd\u00e9pend de la discipline'
  ],
  'at-risk': [
    'at[- ]risk', '\u00e0 risque', 'requires adjust', 'requires action',
    'n\u00e9cessite des ajustements', 'recovery', 'rattrapage'
  ],
  failure: [
    'unsustainable', 'non viable', 'critical', 'crise', 'crisis',
    'failure', '\u00e9chec', 'rebuild', 'reconstruct', 'reconstruire'
  ]
};

function _detectBand(text) {
  // Returns array of bands matched in this text (a slot can mention
  // multiple — the worst drift wins).
  var lower = text.toLowerCase();
  var matched = [];
  Object.keys(BAND_VOCAB).forEach(function(band) {
    BAND_VOCAB[band].forEach(function(token) {
      var re = new RegExp('\\b' + token + '\\b', 'i');
      if (re.test(lower)) matched.push({ band: band, token: token });
    });
  });
  return matched;
}

function _sectionHtml(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? pack.html.slice(sec.offset, sec.offset + sec.bytes) : '';
}

function audit(pack) {
  var findings = [];
  var canon = pack.canonical || {};
  var succ = canon.success_rate;
  var covRatio = canon.guaranteed_income_coverage;
  var truthBand = _bandFromSucc(succ, covRatio);
  if (!truthBand) return findings;

  var ai = pack.ai_slots || {};
  // Slots that set the rhetorical posture (opening + assessment).
  var openingSlots = ['advisor_letter', 'overall_assessment', 'verdict', 'page_zero_verdict', 'profile_summary'];

  // Also scan the deterministic observations list, the cover sub-text,
  // and the closing-recap (Phase C document coherence section).
  var deterministicTexts = [];
  var assessmentSec = pack.sections.find(function(s) { return s.id === 'sec-assessment'; });
  if (assessmentSec) deterministicTexts.push({ slot: 'sec-assessment-deterministic', text: _stripTags(_sectionHtml(pack, 'sec-assessment')) });
  var letterSec = pack.sections.find(function(s) { return s.id === 'sec-letter'; });
  if (letterSec) deterministicTexts.push({ slot: 'sec-letter-deterministic', text: _stripTags(_sectionHtml(pack, 'sec-letter')) });
  var recapSec = pack.sections.find(function(s) { return s.id === 'sec-closing-recap'; });
  if (recapSec) deterministicTexts.push({ slot: 'sec-closing-recap-deterministic', text: _stripTags(_sectionHtml(pack, 'sec-closing-recap')) });

  var maxDrift = 0;
  var driftSlots = [];

  function _evaluate(slotName, text) {
    if (!text || text.length < 60) return;
    var matched = _detectBand(text);
    if (matched.length === 0) return;
    // Worst drift wins (the band most distant from the truth band).
    var worst = matched.reduce(function(acc, m) {
      var d = _bandDistance(m.band, truthBand);
      return d > acc.dist ? { dist: d, hit: m } : acc;
    }, { dist: 0, hit: null });
    if (worst.dist >= 2) {
      driftSlots.push({ slot: slotName, hit: worst.hit, dist: worst.dist });
      if (worst.dist > maxDrift) maxDrift = worst.dist;
    } else if (worst.dist === 1) {
      driftSlots.push({ slot: slotName, hit: worst.hit, dist: 1 });
    }
  }

  openingSlots.forEach(function(slot) {
    var text = _stripTags(_slotText(ai, slot));
    _evaluate(slot, text);
  });
  deterministicTexts.forEach(function(d) { _evaluate(d.slot, d.text); });

  // Catastrophic drift (≥2 bands in any one slot)
  driftSlots.filter(function(d) { return d.dist >= 2; }).forEach(function(d) {
    findings.push({
      id: 'thesis-drift-' + d.slot + '-' + d.hit.band,
      reviewer: 'narrative',
      severity: 'major',
      category: 'thesis_band_drift',
      section: d.slot.indexOf('sec-') === 0 ? d.slot : 'sec-' + d.slot.replace(/_/g, '-'),
      message: 'Plan posture is "' + truthBand + '" (succ=' + (succ * 100).toFixed(0) + '%) but slot "' + d.slot + '" uses "' + d.hit.token + '" (band="' + d.hit.band + '", ' + d.dist + ' bands away). Posture must match.',
      evidence: 'truth_band=' + truthBand + '  found_token="' + d.hit.token + '"  drift=' + d.dist,
      fix_kind: d.slot.indexOf('sec-') === 0 ? 'manual' : 'rerun_ai_slot',
      fix_target: d.slot
    });
  });

  // Cumulative single-band dissonance across many slots
  var oneBandDrifts = driftSlots.filter(function(d) { return d.dist === 1; });
  if (oneBandDrifts.length >= 3) {
    findings.push({
      id: 'thesis-cumulative-drift',
      reviewer: 'narrative',
      severity: 'major',
      category: 'thesis_band_drift',
      section: null,
      message: oneBandDrifts.length + ' slots use vocabulary 1 band away from the truth band ("' + truthBand + '"). Cumulatively the report swings posture; consolidate tone.',
      evidence: oneBandDrifts.map(function(d) { return d.slot + '=' + d.hit.band; }).join(', '),
      fix_kind: 'rerun_ai_slot',
      fix_target: oneBandDrifts[0].slot
    });
  }

  return findings;
}

module.exports = { audit: audit };
