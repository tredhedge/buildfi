// data-auditor.js - Deterministic auditor for canonical-metric integrity.
//
// Detects:
//   - percentage_contradiction: same concept appearing with different values
//   - impossible_gis: GIS section present but plausibility gate fails or the
//     rendered GIS values contradict the canonical plausible values
//   - metric_undefined: prose references a percentage with no canonical anchor

'use strict';
var Contract = require('../review-contract.js');

var COVERAGE_GROUPS = [
  { key: 'gov_coverage', patterns: [
    /gov(ernmental|ernment)? (income|coverage|benefits)/i,
    /couverture (gouvernementale|publique)/i,
    /revenus gouvernementaux/i,
    /public benefits/i
  ]},
  { key: 'guaranteed_coverage', patterns: [
    /guaranteed (income|coverage)/i,
    /revenu (garanti|s? garantis?)/i,
    /pension(\s+|s+)+(et|and)\s+gov/i
  ]},
  { key: 'success_rate', patterns: [
    /success rate|taux de succ.s|taux de r.ussite/i,
    /probabilit. de succ.s/i
  ]},
  { key: 'clawback', patterns: [
    /clawback|r.cup.ration PSV|r.cup.ration oas/i
  ]},
  { key: 'tax_efficiency', patterns: [
    /tax (efficiency|rate)|taux d'imposition|efficacit. fiscale/i
  ]}
];

function _classify(ctx) {
  var lower = ctx.toLowerCase();
  for (var i = 0; i < COVERAGE_GROUPS.length; i++) {
    for (var j = 0; j < COVERAGE_GROUPS[i].patterns.length; j++) {
      if (COVERAGE_GROUPS[i].patterns[j].test(lower)) return COVERAGE_GROUPS[i].key;
    }
  }
  return null;
}

function _sectionHtml(pack, id) {
  var sec = pack.sections.find(function(s) { return s.id === id; });
  return sec ? pack.html.slice(sec.offset, sec.offset + sec.bytes) : '';
}

function _parseMoney(raw) {
  if (!raw) return null;
  var txt = String(raw)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!txt) return null;
  var compact = txt.match(/(-?\d+(?:[.,]\d+)?)\s*K\$/i);
  if (compact) return Math.round(parseFloat(compact[1].replace(',', '.')) * 1000);
  var full = txt.match(/(-?\d[\d\s,]*)\s*\$/);
  if (full) return parseInt(full[1].replace(/[^\d-]/g, ''), 10);
  return null;
}

function _extractLabeledMoney(secHtml, labels) {
  for (var i = 0; i < labels.length; i++) {
    var re = new RegExp('<div class="kpi-v"[^>]*>([\\s\\S]*?)<\\/div>\\s*<div class="kpi-l">' + labels[i] + '<\\/div>', 'i');
    var m = secHtml.match(re);
    if (m) {
      var v = _parseMoney(m[1]);
      if (v != null) return v;
    }
  }
  return null;
}

function _extractGisYears(secHtml) {
  var m = secHtml.match(/<div class="kpi-v"[^>]*>[\s\S]*?(\d+)\s*\/\s*(\d+)[\s\S]*?<div class="kpi-l">(Ann.e?s SRG|GIS years)<\/div>/i);
  return m ? { eligible: parseInt(m[1], 10), total: parseInt(m[2], 10) } : null;
}

function audit(pack) {
  var findings = [];

  // 1) Percentage contradictions
  var byConcept = {};
  pack.percentages.forEach(function(p) {
    var concept = _classify(p.context);
    if (!concept) return;
    if (!byConcept[concept]) byConcept[concept] = [];
    byConcept[concept].push(p);
  });
  Object.keys(byConcept).forEach(function(concept) {
    var values = byConcept[concept];
    if (values.length < 2) return;
    var min = Math.min.apply(null, values.map(function(v) { return v.pct; }));
    var max = Math.max.apply(null, values.map(function(v) { return v.pct; }));
    if (max - min > 5) {
      var samples = values.map(function(v) {
        return v.pct + '% - "' + v.context.slice(0, 60) + '..."';
      }).join(' | ');
      findings.push({
        id: 'data-pct-contradict-' + concept,
        reviewer: 'data',
        severity: 'blocker',
        category: 'percentage_contradiction',
        section: null,
        message: 'Concept "' + concept + '" surfaces with conflicting values (' + min + '% to ' + max + '%, gap=' + (max - min) + 'pts) across ' + values.length + ' occurrences.',
        evidence: samples,
        fix_kind: 'recompute_from_canonical',
        fix_target: concept
      });
    }
  });

  // 2) GIS plausibility
  var hasGisSection = pack.sections.some(function(s) { return s.id === 'sec-gis'; });
  if (hasGisSection && pack.canonical.gis_plausibility === false) {
    findings.push({
      id: 'data-impossible-gis',
      reviewer: 'data',
      severity: 'blocker',
      category: 'impossible_gis',
      section: 'sec-gis',
      message: 'GIS section is present but the plausibility gate failed.',
      evidence: 'gis_plausibility=false',
      fix_kind: 'remove_section',
      fix_target: 'sec-gis'
    });
  }

  // 2.5) Methodology equity-return must match the engine assumption.
  // Audit 2026-06-17: the methodology read a stale param (p.eqRetS||0.07) and
  // showed 7.0% while the engine actually ran 6.5% — an internal contradiction
  // in a delivered report. Compare the methodology's stated equity return to the
  // engine param so the two can never diverge again.
  var _methSec = pack.sections.find(function(s) { return s.id === 'sec-methodology'; });
  if (_methSec && pack.profile && pack.profile.params) {
    var _methHtml = pack.html.slice(_methSec.offset, _methSec.offset + _methSec.bytes);
    var _mEq = _methHtml.match(/(?:Equity return|Rendement actions)\s*([\d]+(?:[.,][\d]+)?)\s*%/i);
    if (_mEq) {
      var _shownEq = parseFloat(_mEq[1].replace(',', '.'));
      var _engEq = Math.round((pack.profile.params.eqRet || pack.profile.params.eqRetS || 0.06) * 1000) / 10;
      if (isFinite(_shownEq) && Math.abs(_shownEq - _engEq) > 0.15) {
        findings.push({
          id: 'data-methodology-return-drift',
          reviewer: 'data',
          severity: 'major',
          category: 'methodology_drift',
          section: 'sec-methodology',
          message: 'Methodology equity return (' + _shownEq + '%) does not match the engine assumption (' + _engEq + '%).',
          evidence: 'methodology=' + _shownEq + '% engine=' + _engEq + '%',
          fix_kind: 'manual',
          fix_target: 'sec-methodology'
        });
      }
    }
  }

  // 3) GIS rendered values must reconcile with canonical values
  if (hasGisSection) {
    var secHtml = _sectionHtml(pack, 'sec-gis');
    var visibleTotal = _extractLabeledMoney(secHtml, ['Lifetime GIS', 'SRG viager']);
    var visibleYears = _extractGisYears(secHtml);
    var canonicalTotal = pack.canonical.lifetime_gis;
    var canonicalYears = pack.canonical.gis_years;
    var gisCap = pack.profile.params.cOn ? 30000 : 22000;
    var maxVisibleTaxable = gisCap + 25000;

    if (visibleTotal != null && canonicalTotal != null) {
      var diff = Math.abs(visibleTotal - canonicalTotal);
      var tol = Math.max(5000, Math.round(Math.max(visibleTotal, canonicalTotal) * 0.1));
      if (diff > tol) {
        findings.push({
          id: 'data-gis-total-mismatch',
          reviewer: 'data',
          severity: 'blocker',
          category: 'impossible_gis',
          section: 'sec-gis',
          message: 'Rendered lifetime GIS does not reconcile with the canonical plausible GIS total.',
          evidence: 'visible=' + visibleTotal + ', canonical=' + canonicalTotal,
          fix_kind: 'remove_section',
          fix_target: 'sec-gis'
        });
      }
    }

    if (visibleYears && canonicalYears != null && Math.abs(visibleYears.eligible - canonicalYears) > 1) {
      findings.push({
        id: 'data-gis-years-mismatch',
        reviewer: 'data',
        severity: 'blocker',
        category: 'impossible_gis',
        section: 'sec-gis',
        message: 'Rendered GIS years do not match the canonical plausible GIS years.',
        evidence: 'visible=' + visibleYears.eligible + ', canonical=' + canonicalYears,
        fix_kind: 'remove_section',
        fix_target: 'sec-gis'
      });
    }

    var rowRe = /<tr><td>\d+<\/td><td[^>]*>[^<]+<\/td><td>[^<]+<\/td><td>([^<]+)<\/td><td>\d+%<\/td><\/tr>/g;
    var rowMatch;
    while ((rowMatch = rowRe.exec(secHtml)) !== null) {
      var taxable = _parseMoney(rowMatch[1]);
      if (taxable != null && taxable > maxVisibleTaxable) {
        findings.push({
          id: 'data-gis-taxable-too-high',
          reviewer: 'data',
          severity: 'blocker',
          category: 'impossible_gis',
          section: 'sec-gis',
          message: 'GIS table shows taxable income levels that are too high for plausible GIS eligibility.',
          evidence: 'taxable_income=' + taxable + ', max_allowed=' + maxVisibleTaxable,
          fix_kind: 'remove_section',
          fix_target: 'sec-gis'
        });
        break;
      }
    }

    var aiText = (pack.ai_slots.gis_insight || '') + ' ' + (pack.ai_slots.best_move_explainer || '');
    var aiAmounts = [];
    var kRe = /(-?\d+(?:[.,]\d+)?)\s*K\$/gi;
    var km;
    while ((km = kRe.exec(aiText)) !== null) aiAmounts.push(Math.round(parseFloat(km[1].replace(',', '.')) * 1000));
    if (visibleTotal != null && aiAmounts.length > 0) {
      var aiClose = aiAmounts.some(function(v) {
        return Math.abs(v - visibleTotal) <= Math.max(5000, Math.round(visibleTotal * 0.15));
      });
      if (!aiClose) {
        findings.push({
          id: 'data-gis-ai-mismatch',
          reviewer: 'data',
          severity: 'major',
          category: 'percentage_contradiction',
          section: 'sec-gis',
          message: 'AI GIS narrative does not appear to match the rendered GIS total.',
          evidence: 'visible=' + visibleTotal + ', ai_amounts=' + aiAmounts.join(','),
          fix_kind: 'rerun_ai_slot',
          fix_target: 'gis_insight'
        });
      }
    }
  }

  return findings;
}

module.exports = { audit: audit };
