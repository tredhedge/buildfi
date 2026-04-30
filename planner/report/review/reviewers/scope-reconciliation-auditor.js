// scope-reconciliation-auditor.js — Trust/consistency phase.
// ══════════════════════════════════════════════════════════════════════
// Cross-section RECONCILIATION check. Two metrics live in MULTIPLE
// sections: lifetime tax + OAS clawback years. Each location must read
// from the same canonical source (d._optTax / d.oasClbkYrs). When a
// renderer recomputes locally, the value silently drifts for couple
// profiles where scope (primary / spouse / household) diverges from the
// engine's default emission.
//
// This auditor runs AFTER the per-section auditors and confirms:
//   1. Lifetime tax mentioned in revenue + tax + closing-recap matches
//      pack.canonical.lifetime_tax_real within ±2%.
//   2. OAS clawback years mentioned in cover + tax + risks-list matches
//      pack.canonical.oas_clawback_years exactly.
//
// Severity = major (deterministic-only — no AI rerun helps). Fix kind
// = manual: edit the renderer to read the canonical, not recompute.
// ══════════════════════════════════════════════════════════════════════

'use strict';

function _stripTags(s) {
  return String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function _sectionText(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? _stripTags(pack.html.slice(sec.offset, sec.offset + sec.bytes)) : '';
}

// Extract dollar values from text. Handles K$ / M$ / $-prefix forms.
function _extractDollars(text) {
  var out = [];
  var re = /\$\s*([\d,]+(?:\.\d+)?)\s*(K|M)?|([\d,]+(?:\.\d+)?)\s*(K|M)\$/gi;
  var m;
  while ((m = re.exec(text)) !== null) {
    var raw = (m[1] || m[3] || '').replace(/,/g, '');
    var unit = (m[2] || m[4] || '').toUpperCase();
    var n = parseFloat(raw);
    if (!isFinite(n)) continue;
    if (unit === 'K') n *= 1000;
    if (unit === 'M') n *= 1000000;
    out.push(n);
  }
  return out;
}

// Extract integer "X years" / "X year" / "X année(s)" / "X ans" counts.
function _extractYearCounts(text) {
  var out = [];
  var re = /(\d{1,3})\s*(?:year|years|ann\u00e9e|ann\u00e9es|ans)\b/gi;
  var m;
  while ((m = re.exec(text)) !== null) {
    var n = parseInt(m[1], 10);
    if (isFinite(n)) out.push(n);
  }
  return out;
}

function audit(pack) {
  var findings = [];
  var canon = pack.canonical || {};
  var lifetimeTax = canon.lifetime_tax_real;
  var clawbackYrs = canon.oas_clawback_years;

  // ─── 1. Lifetime tax reconciliation across sections ────────────────
  // Tolerance is 12% — the renderer formats with f$ which rounds to
  // K$ / M$ buckets, introducing up to ~10% representation drift on
  // round numbers. Drift larger than that = real divergence.
  if (lifetimeTax != null && lifetimeTax > 1000) {
    var sectionsToCheck = ['sec-revenue', 'sec-tax', 'sec-closing-recap'];
    var hits = [];
    sectionsToCheck.forEach(function(sid) {
      var text = _sectionText(pack, sid);
      if (!text) return;
      // TIGHT WINDOW: a value referring to lifetime tax appears within
      // ~50 chars of the mention, not anywhere in a 400-char paragraph.
      // Pattern: "lifetime tax ... estimated at $X" or "$X ... lifetime tax".
      var sentRe = /(\$\s*[\d,.]+\s*[KM]?|\b[\d,.]+\s*[KM]\$)\s{0,30}\b(lifetime tax|imp\u00f4t viager|imp\u00f4t \u00e0 vie|total tax)\b|\b(lifetime tax|imp\u00f4t viager|imp\u00f4t \u00e0 vie|total tax)\b\s{0,40}(?:is|est|of|de|estimated at|estim\u00e9 \u00e0|totals?|s'\u00e9l\u00e8ve \u00e0|reaches|atteint|\u2014|-)?\s*(\$\s*[\d,.]+\s*[KM]?|\b[\d,.]+\s*[KM]\$)/gi;
      var sm;
      while ((sm = sentRe.exec(text)) !== null) {
        var dollars = _extractDollars(sm[0]);
        dollars.forEach(function(d) {
          var diff = Math.abs(d - lifetimeTax) / Math.max(1, Math.abs(lifetimeTax));
          if (diff > 0.12 && d >= 1000) {
            hits.push({ section: sid, value: d, diff: diff });
          }
        });
      }
    });
    if (hits.length > 0) {
      // sec-tax + sec-revenue contain AI slots (taxInsight, income_insight)
      // alongside deterministic narrative. Drift sourced from those
      // sections is most plausibly an AI slot — flag for rerun so the
      // corrector strips it and deterministic-canonical takes over.
      var aiSection = hits.find(function(h) { return h.section === 'sec-tax' || h.section === 'sec-revenue'; });
      findings.push({
        id: 'scope-lifetime-tax-drift',
        reviewer: 'scope-reconciliation',
        severity: 'major',
        category: 'canonical_quote_drift',
        section: hits[0].section,
        message: 'Lifetime tax mentioned across ' + hits.length + ' section(s) drifts from canonical (' + Math.round(lifetimeTax) + '). Renderer must read d._optTaxReal (real-dollar canonical), not nominal sums or AI invention.',
        evidence: hits.slice(0, 3).map(function(h) {
          return h.section + '=' + Math.round(h.value) + ' (drift ' + Math.round(h.diff * 100) + '%)';
        }).join(' | '),
        fix_kind: aiSection ? 'rerun_ai_slot' : 'manual',
        fix_target: aiSection ? (aiSection.section === 'sec-tax' ? 'taxInsight' : 'income_insight') : 'sec-revenue | sec-tax | sec-closing-recap'
      });
    }
  }

  // ─── 2. OAS clawback years reconciliation ──────────────────────────
  // Tight pattern: "[N] year(s)" / "[N] ann\u00e9e(s)" must appear
  // IMMEDIATELY adjacent to "clawback" / "r\u00e9cup\u00e9ration" — not
  // anywhere within a 400-char window (which captured "out of [N]
  // retirement years" as false-positives).
  if (clawbackYrs != null) {
    var sectionsToCheckClb = ['sec-tax', 'sec-assessment'];
    var clbHits = [];
    sectionsToCheckClb.forEach(function(sid) {
      var text = _sectionText(pack, sid);
      if (!text) return;
      // Pattern A: "clawback affects N year(s)" — connector verb REQUIRED
      // Pattern B: "N year(s) of clawback" — connector "of/de" REQUIRED
      // Both connectors are mandatory to prevent matches like "X
      // retirement years. OAS clawback ..." which capture an unrelated
      // year count.
      var clbRe = /(?:oas clawback|r\u00e9cup\u00e9ration psv|psv clawback|clawback)\s+(?:affects?|touche|hits|impacts?|over|sur|on|de)\s*(\d{1,3})\s*(?:year|years|ann\u00e9e|ann\u00e9es|ans|yrs?)\b|\b(\d{1,3})\s*(?:year|years|ann\u00e9e|ann\u00e9es|ans|yrs?)\s+(?:of|de|de la)\s+(?:oas clawback|r\u00e9cup\u00e9ration psv|psv clawback|clawback)/gi;
      var sm;
      while ((sm = clbRe.exec(text)) !== null) {
        var n = parseInt(sm[1] || sm[2] || '', 10);
        if (!isFinite(n)) continue;
        if (n > 50) continue; // sanity
        if (Math.abs(n - clawbackYrs) > 1) {
          clbHits.push({ section: sid, value: n });
        }
      }
    });
    if (clbHits.length > 0) {
      // sec-tax includes the AI taxInsight slot (rendered alongside the
      // deterministic narrative). When the drift is in sec-tax, the most
      // likely source is a cached/stale taxInsight quoting an old
      // clawback count. Mark for AI rerun so the corrector strips the
      // offending slot; deterministic-canonical text takes over.
      var inTaxSec = clbHits.some(function(h) { return h.section === 'sec-tax'; });
      findings.push({
        id: 'scope-oas-clawback-drift',
        reviewer: 'scope-reconciliation',
        severity: 'major',
        category: 'canonical_quote_drift',
        section: clbHits[0].section,
        message: 'OAS clawback years mentioned across sections drifts from canonical (' + clawbackYrs + ' yrs). Renderer must read d.oasClbkYrs (single source) and AI slots must not invent their own count.',
        evidence: clbHits.slice(0, 3).map(function(h) {
          return h.section + '=' + h.value;
        }).join(' | '),
        fix_kind: inTaxSec ? 'rerun_ai_slot' : 'manual',
        fix_target: inTaxSec ? 'taxInsight' : 'sec-tax | sec-assessment'
      });
    }
  }

  return findings;
}

module.exports = { audit: audit };
