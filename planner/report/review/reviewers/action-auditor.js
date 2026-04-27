// action-auditor.js — Premium-rebuild auditor (P1.6).
//
// Enforces that the action plan is case-specific, sequenced, and concrete.
// The renderer emits each lever as <div class="reco-card"> with these
// optional metadata divs:
//   <div class="reco-priority reco-priority-high|medium|low">
//   <div class="reco-impact">~ $XXk</div>            (dollar quantification)
//   <div class="reco-when">2026-2028</div>           (age/year window)
//   <div class="reco-driver" data-driver="ccpc_extraction">  (case_driver tag)
//
// Categories:
//   - action_too_few_levers: <2 P0+P1 levers (high+medium priority).
//   - action_lever_one_off_driver: lever #1 in section does not carry the
//     profile.case_driver tag NOR contain a case-driver token in title/body.
//   - action_lever_missing_fields: any lever lacks priority OR has no
//     dollar magnitude AND no age/year window. Vague levers are blocked.
//
// Design note: this auditor reads the rendered HTML, not raw action data,
// because the renderer is the source of truth for what the client sees.

'use strict';
var Contract = require('../review-contract.js');

function _sectionHtml(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? pack.html.slice(sec.offset, sec.offset + sec.bytes) : '';
}

function _matchAll(re, str) {
  var out = [];
  var m;
  var clone = new RegExp(re.source, re.flags.indexOf('g') >= 0 ? re.flags : re.flags + 'g');
  while ((m = clone.exec(str)) !== null) {
    out.push(m);
    if (out.length > 200) break;
  }
  return out;
}

function _extractLevers(secHtml) {
  // Each lever is <div class="reco-card"> ... </div> at top level inside
  // the section. Use a balanced-counter approach to capture the full block.
  var levers = [];
  var idx = 0;
  while (idx < secHtml.length) {
    var openIdx = secHtml.indexOf('class="reco-card', idx);
    if (openIdx < 0) break;
    var divStart = secHtml.lastIndexOf('<div', openIdx);
    if (divStart < 0) { idx = openIdx + 1; continue; }
    // Walk forward counting open/close <div> until balance returns to 0
    var depth = 0;
    var p = divStart;
    var end = -1;
    while (p < secHtml.length) {
      if (secHtml.charAt(p) === '<') {
        if (secHtml.substr(p, 4) === '<div') { depth++; p += 4; continue; }
        if (secHtml.substr(p, 6) === '</div>') {
          depth--;
          p += 6;
          if (depth === 0) { end = p; break; }
          continue;
        }
      }
      p++;
    }
    if (end < 0) break;
    levers.push({ html: secHtml.slice(divStart, end), start: divStart, end: end });
    idx = end;
  }
  return levers;
}

function _hasPriority(leverHtml) {
  return /reco-priority(-high|-medium|-low)?/i.test(leverHtml);
}
function _priorityRank(leverHtml) {
  if (/reco-priority-high/.test(leverHtml)) return 0;
  if (/reco-priority-medium/.test(leverHtml)) return 1;
  if (/reco-priority-low/.test(leverHtml)) return 2;
  return 9;
}
function _hasDollarOrWhen(leverHtml) {
  if (/class="reco-impact"/.test(leverHtml)) return true;
  if (/class="reco-when"/.test(leverHtml)) return true;
  // Inline dollar magnitudes in the body. Cover common BuildFi formats:
  //   "100 K$", "5K$/an", "$12,000", "~$5k", "1,2 M$", "1.2M$".
  // Word-boundary anchors on `K$` break because `$` is non-word; drop them.
  if (/\d+\s*[KMkm]\$/.test(leverHtml)) return true;
  if (/\$\s?\d/.test(leverHtml)) return true;
  // Age windows in the body: "à 65 ans", "at 65", "by 2030", "ages 60-65",
  // "from age 60", "65–72", "dès 60 ans", "65+", "starting at 50".
  if (/\b(à|at|by|from|d\u00e8s|jusqu'\u00e0|starting at|until|d'ici|d['\u2019]ici)\s+\d{2,4}\b/i.test(leverHtml)) return true;
  if (/\bages?\s+\d{2}\b/i.test(leverHtml)) return true;
  if (/\b\d{2}\s*(–|—|-|\u2013)\s*\d{2}\b/.test(leverHtml)) return true;
  if (/\b\d{2}\+/.test(leverHtml)) return true;
  // "12 mois" / "12 months" / "5 years" / "10 ans" — short windows
  if (/\b\d{1,2}\s*(mois|months|years|ans|month|year)\b/i.test(leverHtml)) return true;
  return false;
}

function audit(pack) {
  var findings = [];
  var driver = pack.profile.case_driver;
  var fr = pack.profile.lang === 'fr';
  var actionsHtml = _sectionHtml(pack, 'sec-actions');
  if (!actionsHtml) return findings;

  var levers = _extractLevers(actionsHtml);
  if (levers.length === 0) return findings; // table-auditor already flags 0 levers

  // ─── 1) ≥2 levers at high or medium priority ─────────────────────────
  var p0p1 = levers.filter(function(l) {
    var r = _priorityRank(l.html);
    return r === 0 || r === 1;
  });
  if (p0p1.length < 2) {
    findings.push({
      id: 'action-too-few-p0p1',
      reviewer: 'narrative',
      severity: 'major',
      category: 'action_too_few_levers',
      section: 'sec-actions',
      message: 'Action plan has only ' + p0p1.length + ' lever(s) at high/medium priority. Premium reports require 2+ case-defining levers.',
      evidence: 'p0p1_count=' + p0p1.length + ' total=' + levers.length,
      fix_kind: 'rerun_ai_slot',
      fix_target: 'sec-actions'
    });
  }

  // ─── 2) Lever #1 must address the case_driver ───────────────────────
  if (driver && Contract.CASE_DRIVER_TOKENS && Contract.CASE_DRIVER_TOKENS[driver]) {
    // Find the FIRST lever in render order (already sorted by bucket then priority).
    var firstLever = levers[0];
    var tokens = (fr ? Contract.CASE_DRIVER_TOKENS[driver].fr : Contract.CASE_DRIVER_TOKENS[driver].en) || [];
    var hay = firstLever.html.toLowerCase();
    var hit = tokens.some(function(t) { return hay.indexOf(String(t).toLowerCase()) >= 0; });
    var taggedDriver = new RegExp('data-driver="' + driver + '"').test(firstLever.html);
    if (!hit && !taggedDriver) {
      findings.push({
        id: 'action-lever-one-off-driver',
        reviewer: 'narrative',
        severity: 'major',
        category: 'action_lever_one_off_driver',
        section: 'sec-actions',
        message: 'First action-plan lever does not address the case driver "' + driver + '". Premium plan must lead with the case-defining move.',
        evidence: 'driver=' + driver + ' tokens=' + tokens.slice(0, 4).join('|'),
        fix_kind: 'rerun_ai_slot',
        fix_target: 'sec-actions-lead'
      });
    }
  }

  // ─── 3) Each lever needs priority + (dollar OR age window) ───────────
  var missingFields = 0;
  levers.forEach(function(l, i) {
    if (!_hasPriority(l.html)) missingFields++;
    if (!_hasDollarOrWhen(l.html)) missingFields++;
  });
  if (missingFields > 0) {
    findings.push({
      id: 'action-lever-missing-fields',
      reviewer: 'narrative',
      severity: 'major',
      category: 'action_lever_missing_fields',
      section: 'sec-actions',
      message: missingFields + ' missing-field instances across ' + levers.length + ' levers (needs priority + dollar magnitude or age/year window).',
      evidence: 'missing_count=' + missingFields,
      fix_kind: 'rerun_ai_slot',
      fix_target: 'sec-actions'
    });
  }

  return findings;
}

module.exports = { audit: audit };
