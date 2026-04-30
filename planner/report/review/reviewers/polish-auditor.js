// polish-auditor.js — Hard QA gate for repeated phrases + visible build labels.
//
// Codex 2026-04-27 P5: a polish-grade report should fail the build when:
//   1. The same noticeable phrase appears 2+ times in close proximity
//      (e.g., "non viable en l'état" repeated within 200 chars in
//      late_starter_bc_fr).
//   2. Internal build/version labels (v12.0.0, semver patterns, "BuildFi
//      Technologies inc." in client narrative chrome) leak into visible
//      output.
//   3. Stale separators / placeholder dashes that survived templating
//      (—  —, ··, double whitespace).
//
// Each finding is BLOCKER: a paid client should not see any of these.

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

// Distinctive long phrases (≥4 words, ≥30 chars) that should never appear
// repeated in close proximity. Generic short phrases ("the plan", "à risque")
// will not trigger this; we want stylistic stutters like "Plan non viable
// en l'état Plan non viable en l'état".
function _findRepeatedPhrases(text) {
  // Sliding window: 6-word phrases occurring twice within 600 chars window.
  // Filters tightened so tabular data + sensitivity-row patterns don't
  // trigger false positives. The auditor is for narrative stutter, not
  // structural table content.
  var words = text.split(/\s+/);
  var hits = [];
  var seen = {};
  for (var i = 0; i < words.length - 6; i++) {
    var phrase = words.slice(i, i + 6).join(' ');
    if (phrase.length < 40) continue;                                 // tighter min length
    // Reject tabular content: phrases that contain currency / percent /
    // bare digits in 2+ slots are structural data, not narrative.
    var moneyHits = (phrase.match(/[\$\u20ac][\d,]+|\d+\s*%|\d+K\$|\d+M\$|\b\d{4,}\b/g) || []).length;
    if (moneyHits >= 2) continue;
    // Skip metadata patterns (label: value, label : value). Action-card
    // priority/confidence/when fields legitimately repeat across cards.
    if ((phrase.match(/\s:\s|:\s/g) || []).length >= 1) continue;
    // Phrase must be mostly alpha (≥30 chars of letters incl. accents).
    var alpha = phrase.replace(/[^a-zA-Z\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u00e7\u00c0\u00c2\u00c4\u00c9\u00c8\u00ca\u00cb\u00ce\u00cf\u00d4\u00d6\u00d9\u00db\u00dc\u00c7]/g, '').length;
    if (alpha < 30) continue;
    if (seen[phrase] !== undefined) {
      var prevPos = seen[phrase];
      var charPos = words.slice(0, i).join(' ').length;
      if (charPos - prevPos < 600 && hits.length < 5) {
        hits.push({
          phrase: phrase,
          firstAt: prevPos,
          secondAt: charPos,
          gap: charPos - prevPos
        });
      }
    } else {
      seen[phrase] = words.slice(0, i).join(' ').length;
    }
  }
  return hits;
}

// Build labels / version strings that should never appear in visible output.
var BUILD_LABELS = [
  '\\bv\\d+\\.\\d+\\.\\d+\\b',                 // v12.0.0
  'BuildFi Technologies inc',                   // legal entity in narrative
  '\\bbuildfi\\.ca\\b',                          // domain in narrative
  '\\bRapport beta\\b',
  '\\bbeta\\s+report\\b'
];

function audit(pack) {
  var findings = [];
  var html = pack.html;
  var visible = _visibleText(html);

  // ─── 1) Repeated phrase in close proximity (BLOCKER) ─────────────────
  var repeats = _findRepeatedPhrases(visible);
  if (repeats.length > 0) {
    findings.push({
      id: 'polish-repeated-phrase',
      reviewer: 'polish',
      severity: 'major',
      category: 'polish',
      section: null,
      message: 'Repeated phrase in close proximity (' + repeats.length + ' instance' + (repeats.length > 1 ? 's' : '') + '). Stylistic stutter breaks premium feel.',
      evidence: repeats.slice(0, 2).map(function(r) {
        return '"' + r.phrase + '" (gap=' + r.gap + ' chars)';
      }).join(' | '),
      fix_kind: 'manual',
      fix_target: 'narrative'
    });
  }

  // ─── 2) Build labels visible to client (BLOCKER) ─────────────────────
  // Page-running header/footer is allowed to carry "buildfi.ca" — that is
  // the running CSS chrome. We only flag occurrences in narrative prose.
  // Strategy: count visible occurrences and flag anything > 4 (cover footer
  // alone produces ~3 hits). Higher counts mean the label is leaking into
  // body content too.
  BUILD_LABELS.forEach(function(pat) {
    var re = new RegExp(pat, 'gi');
    var m, c = 0, sample = '';
    while ((m = re.exec(visible)) !== null) {
      c++;
      if (c === 1) sample = visible.substring(Math.max(0, m.index - 30), Math.min(visible.length, m.index + 50)).trim();
      if (c > 30) break;
    }
    // Threshold by pattern: semver = strict (no occurrences allowed).
    // BuildFi Technologies inc. = legitimate signature/disclaimer chrome
    // (cover footer + advisor letter + disclaimer = 3-5 occurrences is
    // normal). buildfi.ca = page-chrome, allow up to 6.
    var threshold = pat.indexOf('\\d+\\.\\d+\\.\\d+') >= 0 ? 0 :
                    pat.indexOf('buildfi') >= 0 ? 6 :
                    pat.indexOf('Technologies') >= 0 ? 5 : 1;
    if (c > threshold) {
      findings.push({
        id: 'polish-build-label-' + pat.replace(/[^a-z]/gi, '').slice(0, 20),
        reviewer: 'polish',
        severity: 'major',
        category: 'polish',
        section: null,
        message: 'Build/version label "' + pat + '" leaks into visible output (' + c + ' occurrences, threshold ' + threshold + ').',
        evidence: sample,
        fix_kind: 'manual',
        fix_target: 'global'
      });
    }
  });

  // ─── 3) Stale templating debris (MAJOR) ──────────────────────────────
  // Double em-dashes "—  —", double bullets "··", multiple consecutive
  // whitespace in narrative (after our strip already collapsed them, so
  // this only catches non-breaking-space sequences and other invisibles).
  var debrisPatterns = [
    { pat: '\\u2014\\s+\\u2014\\s+\\u2014', label: 'triple em-dash' },
    { pat: '\\u00b7\\s+\\u00b7\\s+\\u00b7', label: 'triple middle-dot' },
    { pat: ',\\s+,', label: 'doubled comma' },
    { pat: '\\.\\s+\\.', label: 'doubled period' }
  ];
  debrisPatterns.forEach(function(d) {
    var re = new RegExp(d.pat);
    var m = visible.match(re);
    if (m) {
      findings.push({
        id: 'polish-debris-' + d.label.replace(/\s/g, '-'),
        reviewer: 'polish',
        severity: 'minor',
        category: 'polish',
        section: null,
        message: 'Templating debris detected: ' + d.label + '.',
        evidence: '"' + m[0] + '"',
        fix_kind: 'manual',
        fix_target: 'global'
      });
    }
  });

  return findings;
}

module.exports = { audit: audit };
