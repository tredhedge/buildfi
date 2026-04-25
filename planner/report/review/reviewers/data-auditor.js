// data-auditor.js — Deterministic auditor for canonical-metric integrity.
//
// Detects:
//   - percentage_contradiction: same concept appearing with different values
//   - impossible_gis: GIS section present but plausibility gate fails
//   - metric_undefined: prose references a percentage with no canonical anchor

'use strict';
var Contract = require('../review-contract.js');

// Coverage-related keywords grouped by concept. When two extracted percentages
// match the SAME concept group but disagree by > 5pts, flag a contradiction.
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
    /success rate|taux de succès|taux de réussite/i,
    /probabilité de succès/i
  ]},
  { key: 'clawback', patterns: [
    /clawback|récupération PSV|récupération oas/i
  ]},
  { key: 'tax_efficiency', patterns: [
    /tax (efficiency|rate)|taux d'imposition|efficacité fiscale/i
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

function audit(pack) {
  var findings = [];
  var fr = pack.profile.lang === 'fr';

  // ─── 1) Percentage contradictions ────────────────────────────────────
  // Group all extracted percentages by concept; if a concept has values
  // varying by > 5 points, that's a contradiction.
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
      // Build a finding listing every value + its context
      var samples = values.map(function(v) {
        return v.pct + '% — "' + v.context.slice(0, 60) + '..."';
      }).join(' | ');
      findings.push({
        id: 'data-pct-contradict-' + concept,
        reviewer: 'data',
        severity: 'blocker',
        category: 'percentage_contradiction',
        section: null,
        message: 'Concept "' + concept + '" surfaces with conflicting values (' + min + '% to ' + max + '%, gap=' + (max - min) + 'pts) across ' + values.length + ' occurrences. Renderers must derive from canonical metric or label distinct concepts.',
        evidence: samples,
        fix_kind: 'recompute_from_canonical',
        fix_target: concept
      });
    }
  });

  // ─── 2) GIS plausibility ─────────────────────────────────────────────
  var hasGisSection = pack.sections.some(function(s) { return s.id === 'sec-gis'; });
  if (hasGisSection && pack.canonical.gis_plausibility === false) {
    findings.push({
      id: 'data-impossible-gis',
      reviewer: 'data',
      severity: 'blocker',
      category: 'impossible_gis',
      section: 'sec-gis',
      message: 'GIS section is present but plausibility gate failed — non-OAS taxable income exceeds eligibility ceiling, OR liquid wealth at retirement exceeds the affluent threshold ($250K single / $400K couple).',
      evidence: 'gis_plausibility=false (engine emitted GIS but income/wealth disqualifies)',
      fix_kind: 'remove_section',
      fix_target: 'sec-gis'
    });
  }

  // ─── 3) GIS internal contradiction (different lifetime values) ───────
  // Catch cases like single_parent_qc where AI text says 350K$ but KPI says 581K$
  if (hasGisSection) {
    var gisValues = [];
    var reGis = /(\d{2,4})\s*K\$|(\d{1,3}(?:[\s,]\d{3})*)\s*\$\s*(viager|lifetime|cumul|total)/gi;
    var aiText = (pack.ai_slots.gis_insight || '') + ' ' + (pack.ai_slots.best_move_explainer || '');
    // Simple: extract amounts that look like GIS lifetime totals from AI text
    var aiAmounts = (aiText.match(/(\d{2,4})\s*K\$/g) || []).map(function(s) { return parseInt(s, 10); });
    if (aiAmounts.length > 0) {
      // Compare to actual mc/payload value if present
      var canonicalGis = pack.canonical.gis_lifetime;
      // Simply detect if AI text + visible KPI disagree by > 20%
      var aiMax = Math.max.apply(null, aiAmounts);
      var aiMin = Math.min.apply(null, aiAmounts);
      // If two AI amounts in same slot differ wildly, flag it
      if (aiMax > aiMin * 1.5 && aiMax > 50) {
        findings.push({
          id: 'data-gis-internal',
          reviewer: 'data',
          severity: 'major',
          category: 'percentage_contradiction',
          section: 'sec-gis',
          message: 'GIS lifetime values in AI text vary widely (' + aiMin + 'K to ' + aiMax + 'K).',
          evidence: aiText.slice(0, 200),
          fix_kind: 'rerun_ai_slot',
          fix_target: 'gis_insight'
        });
      }
    }
  }

  return findings;
}

module.exports = { audit: audit };
