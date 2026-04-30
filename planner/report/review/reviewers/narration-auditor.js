// narration-auditor.js — Premium-rebuild auditor (P1.7).
//
// Detects qualitative narration defects that the structural auditors miss.
// Reads AI slots emitted by the prompt pipeline and the visible-text body.
//
// Categories surfaced:
//   - narration_case_driver_absent: profile.case_driver token missing from
//     advisor_letter AND overall_assessment slots → forces narrative to
//     name the dominant case lever explicitly. Without this, we get the
//     "report thesis stronger than report evidence" pattern Codex flagged.
//   - narration_repetition: same KPI number cited >2× across opening
//     slots (advisor_letter, overall_assessment, verdict). Triggered the
//     "2.0M$ + séquence" repetition observed in hnw_couple_fr.
//   - narration_generic: regex-bank of bland fillers ("In your situation",
//     "Plusieurs éléments jouent en votre faveur", "It would be prudent",
//     "Peu de profils") fires >2× in any single slot.
//   - narration_dispersion_driver_missing: when canonical.dispersion_pts
//     is large (>15) the Risk narration must name a dispersion driver
//     (sequence/inflation/longevity/spending). Pure number-citing without
//     a driver is what produced the "$0 to $730K" callout that didn't
//     teach anything in fire_seeker_fr.
//
// Severity model: case_driver_absent = blocker (P1.6 enforces it via the
// action plan, but if the advisor letter never names it, the whole report
// thesis is incoherent). Others = major (rerun_ai_slot).

'use strict';
var Contract = require('../review-contract.js');

var GENERIC_FILLERS_FR = [
  /\bdans votre situation\b/i,
  /\bil serait prudent\b/i,
  /\bil faudrait\b/i,
  /\bplusieurs \u00e9l\u00e9ments jouent en votre faveur\b/i,
  /\bpeu de profils\b/i,
  /\bquelques pistes\b/i,
  /\b\u00e0 ce stade-ci\b/i,
  /\bcomme indiqu\u00e9 (plus haut|pr\u00e9c\u00e9demment)\b/i
];
var GENERIC_FILLERS_EN = [
  /\bin your situation\b/i,
  /\bit would be prudent\b/i,
  /\bone could (consider|argue)\b/i,
  /\bseveral elements (work|are) in your favo[u]?r\b/i,
  /\bfew profiles\b/i,
  /\bat this stage\b/i,
  /\bas (mentioned|noted) (above|earlier)\b/i
];

var DISPERSION_DRIVERS_FR = [
  /s\u00e9quence/i,
  /inflation/i,
  /long\u00e9vit\u00e9/i,
  /d\u00e9penses?/i,
  /allocation/i,
  /march\u00e9s?/i
];
var DISPERSION_DRIVERS_EN = [
  /sequence/i,
  /inflation/i,
  /longevity/i,
  /spending/i,
  /allocation/i,
  /markets?/i
];

function _slotText(ai, key) {
  if (!ai || !ai[key]) return '';
  // AI slots can be string or object {text: ...}
  var v = ai[key];
  return typeof v === 'string' ? v : (v && v.text) || '';
}

function _stripTags(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _tokenizeMoney(text) {
  // Capture every K$ token and every $X,XXX token as normalized integers
  var tokens = [];
  var reK = /([\d.,]+)\s*K\s*\$/gi;
  var reFull = /([\d]{1,3}(?:[, ]\d{3})+)\s*\$/g;
  var rePctK = /(\d{2,3})\s*%/g;
  var m;
  while ((m = reK.exec(text)) !== null) {
    var v = Math.round(parseFloat(m[1].replace(/[, ]/g, '.').replace(/\.\./g, '.')) * 1000);
    if (v >= 1000) tokens.push({ kind: 'money', val: v });
  }
  while ((m = reFull.exec(text)) !== null) {
    var v2 = parseInt(m[1].replace(/[, ]/g, ''), 10);
    if (v2 >= 1000) tokens.push({ kind: 'money', val: v2 });
  }
  while ((m = rePctK.exec(text)) !== null) {
    tokens.push({ kind: 'pct', val: parseInt(m[1], 10) });
  }
  return tokens;
}

function _buckets(value, kind) {
  // Bucket money to nearest 50K for repetition detection (172 ≈ 175 ≈ 170 are
  // "the same number" to a reader). Pct buckets per 5pts.
  if (kind === 'money') return Math.round(value / 50000) * 50000;
  if (kind === 'pct') return Math.round(value / 5) * 5;
  return value;
}

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';
  var driver = pack.profile.case_driver;
  var ai = pack.ai_slots || {};

  // ─── 1) Case-driver token presence in advisor_letter + assessment ────
  // Accept a hit in EITHER the AI slot text OR the visible rendered text of
  // the corresponding sections — the renderer's deterministic case-driver
  // framing (P1.6) emits the token outside the AI block, and that still
  // satisfies the "thesis names the driver" requirement.
  if (driver && Contract.CASE_DRIVER_TOKENS && Contract.CASE_DRIVER_TOKENS[driver]) {
    var tokenSet = Contract.CASE_DRIVER_TOKENS[driver];
    var tokens = (fr ? tokenSet.fr : tokenSet.en) || [];
    var letterTxt = _stripTags(_slotText(ai, 'advisor_letter')).toLowerCase();
    var assessTxt = _stripTags(_slotText(ai, 'overall_assessment')).toLowerCase();
    // Visible rendered text for sec-letter and sec-assessment sections
    var letterSec = pack.sections.find(function(s) { return s.id === 'sec-letter'; });
    var assessSec = pack.sections.find(function(s) { return s.id === 'sec-assessment'; });
    var letterRendered = letterSec ? _stripTags(pack.html.slice(letterSec.offset, letterSec.offset + letterSec.bytes)).toLowerCase() : '';
    var assessRendered = assessSec ? _stripTags(pack.html.slice(assessSec.offset, assessSec.offset + assessSec.bytes)).toLowerCase() : '';
    var inLetter = tokens.some(function(t) {
      var tl = String(t).toLowerCase();
      return letterTxt.indexOf(tl) >= 0 || letterRendered.indexOf(tl) >= 0;
    });
    var inAssess = tokens.some(function(t) {
      var tl = String(t).toLowerCase();
      return assessTxt.indexOf(tl) >= 0 || assessRendered.indexOf(tl) >= 0;
    });
    if (!inLetter && !inAssess) {
      findings.push({
        id: 'narration-case-driver-absent',
        reviewer: 'narrative',
        severity: 'major',
        category: 'narration_case_driver_absent',
        section: 'sec-letter',
        message: 'Case driver "' + driver + '" not named in advisor_letter or overall_assessment. Report thesis lacks case-specific framing.',
        evidence: 'tokens_searched=' + tokens.slice(0, 6).join('|') + ' | letter_ai=' + letterTxt.length + ' | letter_rendered=' + letterRendered.length,
        fix_kind: 'rerun_ai_slot',
        fix_target: 'advisor_letter'
      });
    }
  }

  // ─── 2) Repetition across opening slots ─────────────────────────────
  var openingSlots = ['advisor_letter', 'overall_assessment', 'verdict'];
  var bucketCounts = {};
  openingSlots.forEach(function(slot) {
    var txt = _stripTags(_slotText(ai, slot));
    var toks = _tokenizeMoney(txt);
    var seenInSlot = {};
    toks.forEach(function(t) {
      var key = t.kind + ':' + _buckets(t.val, t.kind);
      if (seenInSlot[key]) return;
      seenInSlot[key] = true;
      bucketCounts[key] = (bucketCounts[key] || 0) + 1;
    });
  });
  Object.keys(bucketCounts).forEach(function(k) {
    if (bucketCounts[k] >= 3) {
      findings.push({
        id: 'narration-repetition-' + k,
        reviewer: 'narrative',
        severity: 'major',
        category: 'narration_repetition',
        section: 'sec-letter',
        message: 'KPI bucket "' + k + '" appears in all three opening slots (advisor_letter + overall_assessment + verdict). Each slot must advance, not restate.',
        evidence: 'bucket=' + k + ' across ' + bucketCounts[k] + ' slots',
        fix_kind: 'rerun_ai_slot',
        fix_target: 'verdict'
      });
    }
  });

  // ─── 3) Generic AI fillers per slot ─────────────────────────────────
  var fillers = fr ? GENERIC_FILLERS_FR : GENERIC_FILLERS_EN;
  var perSlotFillerCount = {};
  Object.keys(ai).forEach(function(slot) {
    var txt = _stripTags(_slotText(ai, slot));
    if (!txt) return;
    var hits = 0;
    fillers.forEach(function(re) {
      var m = txt.match(new RegExp(re.source, re.flags + 'g'));
      if (m) hits += m.length;
    });
    if (hits >= 2) {
      perSlotFillerCount[slot] = hits;
    }
  });
  Object.keys(perSlotFillerCount).forEach(function(slot) {
    findings.push({
      id: 'narration-generic-' + slot,
      reviewer: 'narrative',
      severity: 'major',
      category: 'narration_generic',
      section: null,
      message: 'AI slot "' + slot + '" contains ' + perSlotFillerCount[slot] + ' generic filler phrases. Narration reads as boilerplate.',
      evidence: 'filler_count=' + perSlotFillerCount[slot],
      fix_kind: 'rerun_ai_slot',
      fix_target: slot
    });
  });

  // ─── 4) Tone-vs-success paradox (Codex review pattern) ──────────────
  // When success rate is low, the assessment narration must NOT use words
  // like "solid", "strong", "robust" without qualification. Profiles
  // affected pre-fix: ccpc_owner (1%), debt_young (6%), single_parent (7%).
  var succ = pack.canonical && pack.canonical.success_rate;
  if (succ != null && succ < 0.5) {
    // Codex 10-profile audit: original regex caught "solid/strong/robust"
    // but missed "recovery / rebuild / favourable / favorable / construit /
    // plusieurs éléments en votre faveur / works in your favor / borderline
    // / fragile" — these all read as soft-pedaling on a sub-50% plan.
    // Especially below 25% success, "rebuild" and "recovery" are dishonest
    // (the plan needs new structure, not refurbishment).
    var POSITIVE_FR = /\b(solide|robuste|fort(e|es)?|excellent|fiable|s\u00e9curitaire|stable|saine?|en votre faveur|jouent en votre|reconstruct|construit|favourable|favorable|reprise|en bonne voie|prometteu(r|se)|encourageant)\b/i;
    var POSITIVE_EN = /\b(solid|robust|strong|excellent|reliable|secure|stable|sound|healthy|works? in your favou?r|favou?rable|encouraging|on track|promising|recovery plan|rebuild plan|borderline)\b/i;
    var posRe = fr ? POSITIVE_FR : POSITIVE_EN;
    var letterTxt = _stripTags(_slotText(ai, 'advisor_letter'));
    var assessTxt = _stripTags(_slotText(ai, 'overall_assessment'));
    var verdictTxt = _stripTags(_slotText(ai, 'verdict'));
    var hits = [];
    [['advisor_letter', letterTxt], ['overall_assessment', assessTxt], ['verdict', verdictTxt]].forEach(function(pair) {
      var slot = pair[0], txt = pair[1];
      var m = txt.match(posRe);
      if (m) hits.push({ slot: slot, sample: m[0], context: txt.slice(Math.max(0, txt.indexOf(m[0]) - 30), txt.indexOf(m[0]) + 60) });
    });
    if (hits.length > 0) {
      // Emit ONE finding per hit slot so the fix-pass clears every
      // affected slot in a single iteration (previously only the first
      // slot was blanked, leaving the others to leak through subsequent
      // passes).
      hits.forEach(function(h) {
        findings.push({
          id: 'narration-tone-paradox-' + h.slot,
          reviewer: 'narrative',
          severity: 'major',
          category: 'narration_generic',
          section: 'sec-assessment',
          message: 'Success rate is ' + Math.round(succ * 100) + '% but slot "' + h.slot + '" describes the plan with positive framing ("' + h.sample + '"). Tone must match grade band.',
          evidence: h.slot + ': "' + h.context + '"',
          fix_kind: 'rerun_ai_slot',
          fix_target: h.slot
        });
      });
    }
  }

  // ─── 5) Dispersion-driver naming when dispersion is material ────────
  var disp = pack.canonical.dispersion_pts;
  if (disp != null && Math.abs(disp) >= 15) {
    var riskTxt = _stripTags(
      _slotText(ai, 'risk_plain_language') + ' ' +
      _slotText(ai, 'riskInsight') + ' ' +
      _slotText(ai, 'trajectory_insight')
    );
    var drivers = fr ? DISPERSION_DRIVERS_FR : DISPERSION_DRIVERS_EN;
    var driverHits = drivers.filter(function(re) { return re.test(riskTxt); }).length;
    if (driverHits === 0 && riskTxt.length > 80) {
      findings.push({
        id: 'narration-dispersion-driver-missing',
        reviewer: 'narrative',
        severity: 'major',
        category: 'narration_dispersion_driver_missing',
        section: 'sec-risk',
        message: 'Dispersion is large (' + disp + ' pts) but the risk narration does not name a driver (sequence / inflation / longevity / spending / allocation / markets).',
        evidence: 'dispersion_pts=' + disp + ' driver_hits=0',
        fix_kind: 'rerun_ai_slot',
        fix_target: 'risk_plain_language'
      });
    }
  }

  return findings;
}

module.exports = { audit: audit };
