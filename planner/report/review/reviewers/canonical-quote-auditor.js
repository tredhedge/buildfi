// canonical-quote-auditor.js — Phase B1.
// ══════════════════════════════════════════════════════════════════════
// Cross-section consistency check. Every percentage, dollar figure, or
// "X years" count quoted ANYWHERE in the report must match a canonical
// metric in pack.canonical (within rounding tolerance) or be a numeric
// constant the engine emitted directly (succ rate, P25/P50/P75 wealth,
// estate, etc.).
//
// What this catches that section-level auditors miss:
//   * cover says "39% success", AI letter says "40% success" — same
//     metric, two different numbers across sections.
//   * tax narrative says "29.9% effective rate", but canonical
//     lifetime_effective_tax_rate is 22.5%.
//   * action plan rationale says "OAS clawback 5 years", but canonical
//     oas_clawback_years is 13.
//
// Algorithm:
//   1. Build a "canonical bag" of values from pack.canonical with a
//      tolerance per metric (succ ±1pt, dollars ±5%, years exact).
//   2. Scan AI slots + deterministic narrative text in each section for
//      numbers (dollars, percentages, year counts).
//   3. For each number, attempt to match against the canonical bag
//      using context cues ("coverage", "success", "tax", "clawback", etc.).
//   4. Mismatches → major findings, fix_kind=rerun_ai_slot when the
//      number lives in an AI slot, else manual.
//
// Severity = major. The fix-pass clears the offending AI slot and
// re-renders with the deterministic canonical value.
// ══════════════════════════════════════════════════════════════════════

'use strict';

function _stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function _slotText(ai, key) {
  if (!ai || !ai[key]) return '';
  var v = ai[key];
  return typeof v === 'string' ? v : (v && v.text) || '';
}

// Concept classifier — assigns a candidate sentence/value to one of the
// canonical metrics so the comparator knows what to compare against.
var CONCEPT_PATTERNS = [
  { metric: 'guaranteed_income_coverage', re: /\b(guaranteed income|revenu garanti)\b[^.]{0,80}\b(cover|couvre)/i, kind: 'pct' },
  { metric: 'gov_coverage_only', re: /\b(public benefits|prestations? publiques?|public coverage|couverture publique)\b[^.]{0,80}\b(cover|couvre)/i, kind: 'pct' },
  { metric: 'success_rate', re: /\b(success|r\u00e9ussite|succ\u00e8s)\b[^.]{0,40}\b(rate|taux)/i, kind: 'pct' },
  { metric: 'oas_clawback_years', re: /\b(clawback|r\u00e9cup\u00e9ration)\b[^.]{0,80}\b(year|ann\u00e9e)/i, kind: 'years' },
  { metric: 'lifetime_effective_tax_rate', re: /\b(lifetime effective tax|effective tax rate|taux (?:effectif|d'imposition) (?:moyen|viager))\b/i, kind: 'pct' },
  { metric: 'lifetime_tax_real', re: /\b(lifetime tax|imp\u00f4t viager)\b/i, kind: 'dollar' },
  { metric: 'monthly_gap', re: /\b(monthly gap|\u00e9cart mensuel)\b/i, kind: 'dollar' },
  { metric: 'p50_wealth_real', re: /\b(median (final )?wealth|patrimoine m\u00e9dian)\b/i, kind: 'dollar' },
  // ship-loop 2026-06-18: P25/P75 concepts removed from canonical-quote. They almost
  // always appear together in a "range from X (P25) to Y (P75)" sentence, where a
  // proximity matcher can't tell which number is which \u2192 false positives. These
  // percentile values are ALREADY grounded by value+unit in the narration guardrail,
  // so dropping them here loses no real protection while removing the FP source.
  { metric: 'net_estate', re: /\b(net estate|h\u00e9ritage net)\b/i, kind: 'dollar' },
  { metric: 'lifetime_gis', re: /\b(lifetime gis|srg viager)\b/i, kind: 'dollar' },
  { metric: 'gis_years', re: /\b(gis years|ann\u00e9es srg|years? of gis)\b/i, kind: 'years' }
];

function _extractNumbers(text) {
  // Returns array of {value, kind, indexInText, context}.
  var out = [];
  var re = /(\d{1,3}(?:[,.\s]\d{3})*(?:[.,]\d+)?)\s*(%|K\$|M\$|\$|ans|years?|ann\u00e9es?)/gi;
  var m;
  while ((m = re.exec(text)) !== null) {
    var raw = m[1].replace(/[\s,]/g, '');
    var num = parseFloat(raw.replace(',', '.'));
    if (!isFinite(num)) continue;
    var unit = m[2].toLowerCase();
    var kind, value;
    if (unit === '%') { kind = 'pct'; value = num; }
    else if (unit === 'k$' || unit === 'k\u200b$') { kind = 'dollar'; value = num * 1000; }
    else if (unit === 'm$' || unit === 'm\u200b$') { kind = 'dollar'; value = num * 1000000; }
    else if (unit === '$') { kind = 'dollar'; value = num; }
    else if (/year|ann\u00e9e|ans/.test(unit)) { kind = 'years'; value = num; }
    else continue;
    // ship-loop 2026-06-18: tightened from (100,50) to (45,20) so a concept keyword
    // far from the number (e.g. "héritage net" ~55 chars before an unrelated monthly
    // figure) no longer binds — kills the proximity false positives.
    var contextStart = Math.max(0, m.index - 45);
    var contextEnd = Math.min(text.length, m.index + 20);
    out.push({ value: value, kind: kind, index: m.index, context: text.slice(contextStart, contextEnd) });
  }
  return out;
}

function _matchConcept(context) {
  for (var i = 0; i < CONCEPT_PATTERNS.length; i++) {
    if (CONCEPT_PATTERNS[i].re.test(context)) return CONCEPT_PATTERNS[i];
  }
  return null;
}

function _canonicalValueFor(metric, canon) {
  if (!canon) return null;
  var v = canon[metric];
  if (v == null) return null;
  // Normalize to comparable units. Coverage / success / eff-rate are 0..1
  // in canonical → display %; dollars stay dollars; years stay years.
  switch (metric) {
    case 'success_rate':
    case 'gov_coverage_only':
    case 'guaranteed_income_coverage':
    case 'lifetime_effective_tax_rate':
      return v * 100;
    default:
      return v;
  }
}

function _toleranceFor(metric, kind) {
  // Absolute tolerance per metric kind.
  if (kind === 'pct') return 1.5;       // ±1.5 percentage points
  if (kind === 'years') return 0.5;     // exact within rounding
  if (kind === 'dollar') return 0;      // use proportional (5%) below
  return 1;
}

function audit(pack) {
  var findings = [];
  var canon = pack.canonical || {};
  var ai = pack.ai_slots || {};
  var seen = {}; // dedup by metric+slot

  // Slot scan: every AI slot the prompt builder can produce.
  var slotKeys = Object.keys(ai);
  slotKeys.forEach(function(slot) {
    var text = _stripTags(_slotText(ai, slot));
    if (!text || text.length < 30) return;
    var nums = _extractNumbers(text);
    nums.forEach(function(n) {
      var concept = _matchConcept(n.context);
      if (!concept) return;             // can't classify → can't compare
      if (concept.kind !== n.kind) return; // unit mismatch (e.g. pct concept but $ number)
      var canonVal = _canonicalValueFor(concept.metric, canon);
      if (canonVal == null) return;     // no canonical value to compare
      var diff;
      if (n.kind === 'dollar') {
        var denom = Math.max(Math.abs(canonVal), 1);
        diff = Math.abs(n.value - canonVal) / denom;
        if (diff <= 0.05) return;       // within 5% — accept
      } else {
        diff = Math.abs(n.value - canonVal);
        if (diff <= _toleranceFor(concept.metric, n.kind)) return;
      }
      var key = concept.metric + ':' + slot;
      if (seen[key]) return;
      seen[key] = true;
      findings.push({
        id: 'canonical-quote-' + concept.metric + '-' + slot,
        reviewer: 'canonical',
        severity: 'major',
        category: 'canonical_quote_drift',
        section: 'sec-' + slot.replace(/_/g, '-'),
        message: 'AI slot "' + slot + '" quotes ' + n.kind + ' value ' + n.value + ' for "' + concept.metric + '" but canonical is ' + Math.round(canonVal * 100) / 100 + '. Slot must be regenerated to match canonical.',
        evidence: '"…' + n.context.trim().slice(-90) + '"  (canon=' + canonVal + ', quoted=' + n.value + ')',
        fix_kind: 'rerun_ai_slot',
        fix_target: slot
      });
    });
  });

  return findings;
}

module.exports = { audit: audit };
