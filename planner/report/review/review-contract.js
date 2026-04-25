// review-contract.js — Single source of truth for canonical metrics +
// finding schema + severity classification. Every reviewer reads from this.
//
// PURPOSE: stop the percentage-contradiction class of bug. Every section that
// surfaces a percentage MUST resolve it through canonicalMetrics(d) — never
// recompute it locally. Renderers that recompute trigger a cohesion blocker.

(function() {
  "use strict";

  // ─── CANONICAL METRICS — the only authority for KPI values ─────────────
  //
  // Each metric has:
  //   - key:           short name used everywhere
  //   - label_fr/en:   the ONE display label allowed for this metric
  //   - definition_fr/en: a one-line plain-language definition (for tooltip + glossary)
  //   - compute(d):    the canonical formula, called once when payload is built
  //
  // Rule: a percentage is allowed in two sections only if both sections derive
  // it from the same `key` here. If the prose says "government coverage X%"
  // and another section uses a different number, the auditor flags it.
  var METRICS = {
    success_rate: {
      label_fr: 'Taux de succès',
      label_en: 'Success rate',
      definition_fr: '% des simulations Monte Carlo où l\'épargne ne s\'épuise pas avant l\'âge de décès projeté.',
      definition_en: '% of Monte Carlo simulations where savings do not run out before projected death age.',
      compute: function(d) { return d.succVal != null ? d.succVal : null; }
    },
    p25_wealth_real: {
      label_fr: 'Patrimoine prudent (P25, dollars réels)',
      label_en: 'Cautious wealth (P25, real dollars)',
      definition_fr: '25 % des simulations terminent sous ce niveau, en pouvoir d\'achat constant.',
      definition_en: '25% of simulations end below this level, in constant purchasing power.',
      compute: function(d) { return d.mc && (d.mc.rP25F != null ? d.mc.rP25F : d.mc.p25F); }
    },
    p50_wealth_real: {
      label_fr: 'Patrimoine médian (P50, dollars réels)',
      label_en: 'Median wealth (P50, real dollars)',
      definition_fr: 'Trajectoire centrale, en pouvoir d\'achat constant.',
      definition_en: 'Central trajectory, in constant purchasing power.',
      compute: function(d) { return d.mc && (d.mc.rMedF != null ? d.mc.rMedF : d.mc.medF); }
    },
    p75_wealth_real: {
      label_fr: 'Patrimoine favorable (P75, dollars réels)',
      label_en: 'Favourable wealth (P75, real dollars)',
      definition_fr: '25 % des simulations terminent au-dessus de ce niveau.',
      definition_en: '25% of simulations end above this level.',
      compute: function(d) { return d.mc && (d.mc.rP75F != null ? d.mc.rP75F : d.mc.p75F); }
    },
    // ─── Coverage metrics — the one most prone to contradictions ────────
    // Three DIFFERENT definitions, each with its own canonical key. Renderers
    // MUST pick one explicitly; the auditor will flag any prose that mixes
    // them without naming which is which.
    gov_coverage_only: {
      label_fr: 'Couverture publique seulement (RRQ + PSV + SRG)',
      label_en: 'Public benefits coverage only (CPP + OAS + GIS)',
      definition_fr: 'Part des dépenses cibles couverte uniquement par RRQ + PSV + SRG, hors pension d\'employeur et hors retraits du portefeuille.',
      definition_en: 'Share of target spending covered ONLY by CPP + OAS + GIS — excludes employer pension, excludes portfolio withdrawals.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGov = retYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0); }, 0) / retYrs.length;
        var avgSpend = retYrs.reduce(function(s, r) { return s + (r.spend || 0); }, 0) / retYrs.length;
        return avgSpend > 0 ? avgGov / avgSpend : null;
      }
    },
    guaranteed_income_coverage: {
      label_fr: 'Couverture du revenu garanti (publics + pension)',
      label_en: 'Guaranteed income coverage (public + pension)',
      definition_fr: 'Part des dépenses cibles couverte par RRQ + PSV + SRG + pension d\'employeur. Exclut les retraits du portefeuille.',
      definition_en: 'Share of target spending covered by CPP + OAS + GIS + employer pension. Excludes portfolio withdrawals.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGuar = retYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0); }, 0) / retYrs.length;
        var avgSpend = retYrs.reduce(function(s, r) { return s + (r.spend || 0); }, 0) / retYrs.length;
        return avgSpend > 0 ? avgGuar / avgSpend : null;
      }
    },
    monthly_gap: {
      label_fr: 'Écart mensuel à combler par le portefeuille',
      label_en: 'Monthly gap funded by the portfolio',
      definition_fr: 'Différence mensuelle entre les dépenses cibles et le revenu garanti (publics + pension).',
      definition_en: 'Monthly difference between target spending and guaranteed income (public + pension).',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGuar = retYrs.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0); }, 0) / retYrs.length;
        var avgSpend = retYrs.reduce(function(s, r) { return s + (r.spend || 0); }, 0) / retYrs.length;
        return Math.max(0, (avgSpend - avgGuar) / 12);
      }
    },
    oas_clawback_years: {
      label_fr: 'Années de récupération PSV',
      label_en: 'OAS clawback years',
      definition_fr: 'Nombre d\'années où le revenu net imposable dépasse le seuil 2026 (~95 K$).',
      definition_en: 'Years where net taxable income exceeds the 2026 threshold (~$95K).',
      compute: function(d) { return d.oasClbkYrs != null ? d.oasClbkYrs : null; }
    },
    lifetime_tax_real: {
      label_fr: 'Impôt viager (dollars réels)',
      label_en: 'Lifetime tax (real dollars)',
      definition_fr: 'Somme des impôts payés sur l\'horizon de retraite, en pouvoir d\'achat constant.',
      definition_en: 'Sum of taxes paid over the retirement horizon, in constant purchasing power.',
      compute: function(d) { return d._taxAlphaTotal != null ? d._taxAlphaTotal : (d.mc && d.mc._lifetimeTax) || null; }
    },
    // ─── GIS plausibility — gates the entire SRG section ────────────────
    gis_plausibility: {
      label_fr: 'Plausibilité du SRG',
      label_en: 'GIS plausibility',
      definition_fr: 'Vrai si la trajectoire centrale présente au moins une année où le revenu non-PSV est sous le plafond SRG (~22 K$ seul, ~30 K$ couple) ET le patrimoine liquide à 65 ans n\'est pas excessif.',
      definition_en: 'True if the central trajectory has at least one year with non-OAS income under the GIS ceiling (~$22K single, ~$30K couple) AND liquid wealth at 65 is not excessive.',
      compute: function(d) {
        if (!d.revData || !d.p) return false;
        var p = d.p;
        var liquidCeiling = p.cOn ? 400000 : 250000;
        var liquid = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
                   + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0);
        if (liquid > liquidCeiling) return false;
        var gisCap = p.cOn ? 30000 : 22000;
        return d.revData.some(function(r) {
          var raw = r.srg || r.gis || 0;
          if (r.age < 65 || raw <= 0) return false;
          var nonOas = (r.taxInc || 0) - (r.psv || 0);
          return nonOas >= 0 && nonOas < gisCap;
        });
      }
    }
  };

  // ─── SECTION MANIFEST — what the report COULD contain ───────────────────
  // Each section declares what it surfaces; auditors check against this.
  var SECTIONS = [
    { id: 'sec-letter',      mandatory: true,  name: 'Advisor letter' },
    { id: 'sec-assessment',  mandatory: true,  name: 'Overall assessment' },
    { id: 'sec-diagnostic',  mandatory: true,  name: 'Diagnostic' },
    { id: 'sec-profile',     mandatory: true,  name: 'Profile' },
    { id: 'sec-family',      mandatory: false, name: 'Family' },
    { id: 'sec-goals',       mandatory: false, name: 'Goals' },
    { id: 'sec-real-estate', mandatory: false, name: 'Real estate' },
    { id: 'sec-corp',        mandatory: false, name: 'Corporation' },
    { id: 'sec-rsu',         mandatory: false, name: 'RSU' },
    { id: 'sec-debt',        mandatory: false, name: 'Debts' },
    { id: 'sec-projection',  mandatory: true,  name: 'Wealth projection' },
    { id: 'sec-revenue',     mandatory: true,  name: 'Retirement income' },
    { id: 'sec-histogram',   mandatory: false, name: 'Final-wealth distribution', flags: ['banned-if-approximation'] },
    { id: 'sec-sensitivity', mandatory: false, name: 'Sensitivity heatmap',       flags: ['banned-if-approximation'] },
    { id: 'sec-risk',        mandatory: false, name: 'Risk & sensitivity' },
    { id: 'sec-stress',      mandatory: true,  name: 'Stress tests',              flags: ['callout-if-uniform'] },
    { id: 'sec-cashflow',    mandatory: false, name: 'Cashflow detail' },
    { id: 'sec-tax',         mandatory: true,  name: 'Tax strategy' },
    { id: 'sec-draworder',   mandatory: false, name: 'Withdrawal sequencing' },
    { id: 'sec-meltdown',    mandatory: false, name: 'RRSP meltdown' },
    { id: 'sec-gis',         mandatory: false, name: 'GIS analysis',              flags: ['gated-on-plausibility'] },
    { id: 'sec-succession',  mandatory: false, name: 'Estate' },
    { id: 'sec-actions',     mandatory: true,  name: 'Action plan' },
    { id: 'sec-whatif',      mandatory: false, name: 'What-If simulator' },
    { id: 'sec-methodology', mandatory: true,  name: 'Methodology' },
    { id: 'sec-assumptions', mandatory: true,  name: 'Assumptions appendix' },
    { id: 'sec-glossary',    mandatory: true,  name: 'Glossary' },
    { id: 'sec-signature',   mandatory: true,  name: 'Signature' }
  ];

  // ─── FINDING SCHEMA — what every auditor emits ──────────────────────────
  // {
  //   id:        unique within a single audit run
  //   reviewer:  'data' | 'chart' | 'table' | 'narrative' | 'language' | 'cohesion'
  //   severity:  'blocker' | 'major' | 'minor'
  //   category:  'percentage_contradiction' | 'impossible_gis' | 'empty_section'
  //              | 'language_leak' | 'duplicate_section' | 'approximation_visible'
  //              | 'missing_income_source' | 'uniform_stress' | 'redundant_uncertainty'
  //              | 'action_repetition' | 'thin_section' | 'metric_undefined' | ...
  //   section:   section id when applicable
  //   message:   one-line human-readable description
  //   evidence:  short verbatim quote from the HTML or specific value
  //   fix_kind:  'remove_section' | 'rerun_ai_slot' | 'recompute_from_canonical'
  //              | 'block_data' | 'replace_with_callout' | 'localize_label'
  //   fix_target: section id, ai slot key, etc.
  // }
  var FINDING_KINDS = {
    fix_kind: ['remove_section', 'rerun_ai_slot', 'recompute_from_canonical',
               'block_data', 'replace_with_callout', 'localize_label', 'manual'],
    severity: ['blocker', 'major', 'minor'],
    reviewer: ['data', 'chart', 'table', 'narrative', 'language', 'cohesion']
  };

  // ─── SHIP GATE — what blocks delivery ───────────────────────────────────
  var SHIP_GATE = {
    blocker_categories: [
      'percentage_contradiction',
      'impossible_gis',
      'empty_section',
      'language_leak',
      'duplicate_section',
      'approximation_visible',
      'missing_income_source',
      'metric_undefined'
    ],
    max_blockers_for_ship: 0,
    max_majors_for_ship: 5  // some major findings allowed if not blocking; over this, fail.
  };

  // ─── BUILD CANONICAL METRICS BLOCK ──────────────────────────────────────
  function buildCanonicalMetrics(d) {
    var out = {};
    Object.keys(METRICS).forEach(function(k) {
      try { out[k] = METRICS[k].compute(d); } catch (e) { out[k] = null; }
    });
    return out;
  }

  function metricLabel(key, fr) {
    var m = METRICS[key];
    return m ? (fr ? m.label_fr : m.label_en) : key;
  }
  function metricDefinition(key, fr) {
    var m = METRICS[key];
    return m ? (fr ? m.definition_fr : m.definition_en) : '';
  }

  var EXP = {
    METRICS: METRICS,
    SECTIONS: SECTIONS,
    FINDING_KINDS: FINDING_KINDS,
    SHIP_GATE: SHIP_GATE,
    buildCanonicalMetrics: buildCanonicalMetrics,
    metricLabel: metricLabel,
    metricDefinition: metricDefinition
  };

  if (typeof window !== 'undefined') window.BFReviewContract = EXP;
  if (typeof module !== 'undefined' && module.exports) module.exports = EXP;
})();
