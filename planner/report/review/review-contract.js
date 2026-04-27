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
    // ── A1: Scope-tagged canonical metrics ─────────────────────────
    // Coverage uses TARGET spending (what the plan WANTS to fund) NOT
    // funded spending (what the plan ACHIEVES). Codex finding 3: prior
    // versions divided by funded spending, which made coverage LOOK
    // better precisely when the plan was starving (denominator collapsed
    // to whatever assets could support). A1 fix: every coverage metric
    // reads `r.spend_target` first (engine field added by A1/A2 pass)
    // with `r.spend` as a back-compat fallback ONLY for legacy MC
    // payloads — fresh runs always have spend_target. Renderer SHOULD
    // read these canonical values and never recompute.
    gov_coverage_only: {
      scope: 'household',
      label_fr: 'Couverture publique seulement (RRQ + PSV + SRG, ménage, vs cible)',
      label_en: 'Public benefits coverage only (CPP + OAS + GIS, household, vs target)',
      definition_fr: 'Part des DÉPENSES CIBLES couverte uniquement par RRQ + PSV + SRG du ménage (primaire + conjoint). Exclut pension d\'employeur et retraits du portefeuille. Utilise dépenses cibles, pas dépenses finançables.',
      definition_en: 'Share of TARGET spending covered ONLY by CPP + OAS + GIS for the household (primary + spouse). Excludes employer pension, portfolio withdrawals. Uses target spending, not funded spending.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGov = retYrs.reduce(function(s, r) {
          return s
            + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0)
            + (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || 0);
        }, 0) / retYrs.length;
        // Use spend_target (engine A1+A2). Fallback to spend (= funded,
        // legacy) only when target unavailable, with a small log: this
        // path indicates a stale MC payload.
        var avgSpend = retYrs.reduce(function(s, r) {
          return s + (r.spend_target != null ? r.spend_target : (r.spend || 0));
        }, 0) / retYrs.length;
        return avgSpend > 0 ? avgGov / avgSpend : null;
      }
    },
    guaranteed_income_coverage: {
      scope: 'household',
      label_fr: 'Couverture du revenu garanti (publics + pension, ménage, vs cible)',
      label_en: 'Guaranteed income coverage (public + pension, household, vs target)',
      definition_fr: 'Part des DÉPENSES CIBLES couverte par RRQ + PSV + SRG + pension d\'employeur du ménage. Exclut les retraits du portefeuille. Utilise dépenses cibles.',
      definition_en: 'Share of TARGET spending covered by household CPP + OAS + GIS + employer pension. Excludes portfolio withdrawals. Uses target spending.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGuar = retYrs.reduce(function(s, r) {
          return s
            + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0)
            + (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || 0) + (r.cPen || 0);
        }, 0) / retYrs.length;
        var avgSpend = retYrs.reduce(function(s, r) {
          return s + (r.spend_target != null ? r.spend_target : (r.spend || 0));
        }, 0) / retYrs.length;
        return avgSpend > 0 ? avgGuar / avgSpend : null;
      }
    },
    monthly_gap: {
      scope: 'household',
      label_fr: 'Écart mensuel à combler par le portefeuille (vs cible)',
      label_en: 'Monthly gap funded by the portfolio (vs target)',
      definition_fr: 'Différence mensuelle entre dépenses CIBLES et revenu garanti (publics + pension, ménage). Si > 0, doit être comblé par retraits.',
      definition_en: 'Monthly difference between TARGET spending and household guaranteed income (public + pension). When > 0, funded by withdrawals.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var retYrs = d.revData.filter(function(r) { return r.age >= (d.p.retAge || 65); });
        if (retYrs.length === 0) return null;
        var avgGuar = retYrs.reduce(function(s, r) {
          return s
            + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0)
            + (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || 0) + (r.cPen || 0);
        }, 0) / retYrs.length;
        var avgSpend = retYrs.reduce(function(s, r) {
          return s + (r.spend_target != null ? r.spend_target : (r.spend || 0));
        }, 0) / retYrs.length;
        return Math.max(0, (avgSpend - avgGuar) / 12);
      }
    },
    oas_clawback_years: {
      scope: 'primary',
      label_fr: 'Années de récupération PSV (primaire)',
      label_en: 'OAS clawback years (primary)',
      definition_fr: 'Nombre d\'années où le revenu imposable du déclarant principal dépasse le seuil 2026 (~95 K$). La récupération PSV s\'applique par personne (Ligne 23600), pas sur le revenu du ménage.',
      definition_en: 'Years where the primary filer\'s taxable income exceeds the 2026 threshold (~$95K). OAS clawback applies per person (Line 23600), not on household income.',
      compute: function(d) {
        // Single source of truth: PRIMARY-ONLY filter on revData (Line
        // 23600 per-person rule). Renderer computes the same value in
        // report-data.js, so canonical and renderer are identical by
        // construction. Legacy mc.oasClbkYrs (raw engine emission with
        // household income) is no longer trusted; only fallback when
        // revData is unavailable.
        if (d.revData && d.p && d.revData.length > 0) {
          var inf = d.p.inf || 0.021;
          var age = d.p.age || 0;
          var thr2026 = 95323;
          return d.revData.filter(function(r) {
            var yr = Math.max(0, (r.age || 0) - age);
            var thr = thr2026 * Math.pow(1 + inf, yr);
            var personInc = (r.taxInc_primary != null ? r.taxInc_primary : (r.taxInc || 0));
            return personInc > thr;
          }).length;
        }
        return d.oasClbkYrs != null ? d.oasClbkYrs : null;
      }
    },
    // ── A1: Lifetime tax (household, real $) — single canonical source ─
    // Computed from medRevData household tax rows, deflated to start-year
    // dollars. Replaces ad-hoc per-section tax sums that drifted (Codex
    // finding 11: "avgEffRate" ambiguous label).
    lifetime_tax_real: {
      scope: 'household',
      label_fr: 'Impôt viager (ménage, dollars réels)',
      label_en: 'Lifetime tax (household, real dollars)',
      definition_fr: 'Somme des impôts du ménage payés sur l\'horizon de retraite, déflatée en dollars de l\'année 0.',
      definition_en: 'Sum of household taxes paid over the retirement horizon, deflated to start-year dollars.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var inf = d.p.inf || 0.021;
        var retAge = d.p.retAge || 65;
        var age = d.p.age || 0;
        var total = 0;
        d.revData.forEach(function(r) {
          if (r.age < retAge) return;
          var infY = Math.pow(1 + inf, r.age - age);
          // Prefer tax_household when emitted (engine A1+A2). Legacy `tax`
          // already equals household after engine A1+A2 patch.
          total += ((r.tax_household != null ? r.tax_household : r.tax) || 0) / infY;
        });
        return Math.round(total);
      }
    },
    // ── A1: Lifetime taxable income (household, real $) ─────────────────
    lifetime_taxable_income_real: {
      scope: 'household',
      label_fr: 'Revenu imposable viager (ménage, dollars réels)',
      label_en: 'Lifetime taxable income (household, real dollars)',
      definition_fr: 'Somme du revenu imposable du ménage sur la retraite, déflatée. Dénominateur du taux effectif viager.',
      definition_en: 'Sum of household taxable income over retirement, deflated. Denominator of the lifetime effective tax rate.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var inf = d.p.inf || 0.021;
        var retAge = d.p.retAge || 65;
        var age = d.p.age || 0;
        var total = 0;
        d.revData.forEach(function(r) {
          if (r.age < retAge) return;
          var infY = Math.pow(1 + inf, r.age - age);
          total += ((r.taxInc_household != null ? r.taxInc_household : r.taxInc) || 0) / infY;
        });
        return Math.round(total);
      }
    },
    // ── A1: Lifetime EFFECTIVE tax rate ──────────────────────────────────
    // Codex finding 11: prior "avgEffRate" label was ambiguous (sum-of-
    // tax / sum-of-taxable-income, NOT the everyday "average marginal
    // rate" or "average effective rate" a reader expects). Renamed
    // explicitly. Single canonical source; renderers read this value
    // and quote the label verbatim.
    lifetime_effective_tax_rate: {
      scope: 'household',
      label_fr: 'Taux d\'imposition effectif viager (ménage)',
      label_en: 'Lifetime effective tax rate (household)',
      definition_fr: 'Impôt viager / revenu imposable viager du ménage, en dollars réels. Différent du taux marginal moyen et du taux effectif d\'une année donnée.',
      definition_en: 'Lifetime household tax / lifetime household taxable income, in real dollars. NOT the average marginal rate, NOT a single-year effective rate.',
      compute: function(d) {
        if (!d.revData || !d.p) return null;
        var inf = d.p.inf || 0.021;
        var retAge = d.p.retAge || 65;
        var age = d.p.age || 0;
        var totTax = 0, totInc = 0;
        d.revData.forEach(function(r) {
          if (r.age < retAge) return;
          var infY = Math.pow(1 + inf, r.age - age);
          totTax += ((r.tax_household != null ? r.tax_household : r.tax) || 0) / infY;
          totInc += ((r.taxInc_household != null ? r.taxInc_household : r.taxInc) || 0) / infY;
        });
        return totInc > 0 ? totTax / totInc : null;
      }
    },
    // ── Codex #10 fix: GIS plausibility uses MODELED liquid wealth at
    // age 65, not today's. The user can have $500K today but be drawn
    // down to $30K by 65 (the moment GIS eligibility is tested) ⇒ GIS
    // section was being incorrectly suppressed for late-starters who
    // legitimately qualify after their portfolio depletes. We extract
    // the medRevData row at age 65 (or first row >= 65 if data starts
    // later) and use its at-65 modeled balances as the asset test.
    lifetime_gis: {
      scope: 'household',
      label_fr: 'SRG viager plausible (filtré sur patrimoine modélisé à 65)',
      label_en: 'Plausible lifetime GIS (filtered on modeled liquid wealth at 65)',
      definition_fr: 'Somme des années SRG plausibles. Garde-fou patrimonial évalué sur la trajectoire centrale à 65 ans, pas sur le patrimoine d\'aujourd\'hui.',
      definition_en: 'Sum of plausible GIS years. Asset test evaluated on the median trajectory at age 65, not on today\'s liquid wealth.',
      compute: function(d) {
        if (!d.revData || !d.p) return 0;
        var p = d.p;
        var liquidCeiling = p.cOn ? 400000 : 250000;
        // Find the modeled at-65 row and evaluate liquid wealth there.
        var at65 = d.revData.find(function(r) { return r.age >= 65; });
        var liquidAt65 = at65
          ? ((at65.aRR || 0) + (at65.aTF || 0) + (at65.aNR || 0) + (at65.aLIRA || 0)
             + (at65.aCRR || 0) + (at65.aCTF || 0) + (at65.aCNR || 0) + (at65.aCLIRA || 0))
          : ((p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
             + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0));
        if (liquidAt65 > liquidCeiling) return 0;
        var gisCap = p.cOn ? 30000 : 22000;
        return d.revData.reduce(function(sum, r) {
          var raw = r.srg || r.gis || 0;
          var nonOas = (r.taxInc || 0) - (r.psv || 0);
          if (r.age < 65 || raw <= 0) return sum;
          if (nonOas < 0 || nonOas >= gisCap) return sum;
          return sum + raw;
        }, 0);
      }
    },
    gis_years: {
      scope: 'household',
      label_fr: 'Années SRG plausibles',
      label_en: 'Plausible GIS years',
      definition_fr: 'Nombre d\'années admissibles au SRG après filtre. Patrimoine évalué à 65 ans (médian), pas aujourd\'hui.',
      definition_en: 'Count of GIS-eligible years after filter. Wealth evaluated at age 65 (median path), not today.',
      compute: function(d) {
        if (!d.revData || !d.p) return 0;
        var p = d.p;
        var liquidCeiling = p.cOn ? 400000 : 250000;
        var at65 = d.revData.find(function(r) { return r.age >= 65; });
        var liquidAt65 = at65
          ? ((at65.aRR || 0) + (at65.aTF || 0) + (at65.aNR || 0) + (at65.aLIRA || 0)
             + (at65.aCRR || 0) + (at65.aCTF || 0) + (at65.aCNR || 0) + (at65.aCLIRA || 0))
          : ((p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
             + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0));
        if (liquidAt65 > liquidCeiling) return 0;
        var gisCap = p.cOn ? 30000 : 22000;
        return d.revData.filter(function(r) {
          var raw = r.srg || r.gis || 0;
          var nonOas = (r.taxInc || 0) - (r.psv || 0);
          return r.age >= 65 && raw > 0 && nonOas >= 0 && nonOas < gisCap;
        }).length;
      }
    },
    net_estate: {
      label_fr: 'Héritage net médian',
      label_en: 'Median net estate',
      definition_fr: 'Valeur successorale nette médiane après impôt au décès.',
      definition_en: 'Median estate net of death tax.',
      compute: function(d) { return d.mc && d.mc.medEstateNet != null ? d.mc.medEstateNet : null; }
    },
    // ─── GIS plausibility — gates the entire SRG section ────────────────
    // Codex #10 fix: asset test evaluated on at-65 modeled balances.
    gis_plausibility: {
      scope: 'household',
      label_fr: 'Plausibilité du SRG (test patrimonial à 65, modélisé)',
      label_en: 'GIS plausibility (asset test at-65, modeled)',
      definition_fr: 'Vrai si la trajectoire centrale présente au moins une année où le revenu non-PSV est sous le plafond SRG (~22 K$ seul, ~30 K$ couple) ET le patrimoine liquide MODÉLISÉ à 65 ans n\'est pas excessif.',
      definition_en: 'True if the central trajectory has ≥1 year with non-OAS income under the GIS ceiling (~$22K single, ~$30K couple) AND MODELED liquid wealth at age 65 is not excessive.',
      compute: function(d) {
        if (!d.revData || !d.p) return false;
        var p = d.p;
        var liquidCeiling = p.cOn ? 400000 : 250000;
        var at65 = d.revData.find(function(r) { return r.age >= 65; });
        var liquid = at65
          ? ((at65.aRR || 0) + (at65.aTF || 0) + (at65.aNR || 0) + (at65.aLIRA || 0)
             + (at65.aCRR || 0) + (at65.aCTF || 0) + (at65.aCNR || 0) + (at65.aCLIRA || 0))
          : ((p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
             + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0));
        if (liquid > liquidCeiling) return false;
        var gisCap = p.cOn ? 30000 : 22000;
        return d.revData.some(function(r) {
          var raw = r.srg || r.gis || 0;
          if (r.age < 65 || raw <= 0) return false;
          var nonOas = (r.taxInc || 0) - (r.psv || 0);
          return nonOas >= 0 && nonOas < gisCap;
        });
      }
    },
    // ─── Dispersion metrics — drive Risk + Stress collapse rule (P1.3) ──
    // Both report in PERCENTAGE POINTS of success rate, so they can be
    // compared on the same axis. Used by risk-collapse-auditor.
    dispersion_pts: {
      label_fr: 'Dispersion P25–P75 (en points de succès)',
      label_en: 'P25–P75 dispersion (success points)',
      definition_fr: 'Écart en points de pourcentage entre les taux de succès P25 et P75 de la simulation Monte Carlo principale.',
      definition_en: 'Spread in success-rate percentage points between P25 and P75 in the main Monte Carlo run.',
      compute: function(d) {
        if (!d.mc) return null;
        // Engine reports succP25/succP75 if available; fall back to
        // wealth-based proxy (rP75F / rP25F ratio mapped to 0-100 scale)
        if (d.mc.succP75 != null && d.mc.succP25 != null) {
          return Math.round((d.mc.succP75 - d.mc.succP25) * 100);
        }
        return null;
      }
    },
    stress_pts: {
      label_fr: 'Plage des tests de stress (en points de succès)',
      label_en: 'Stress-test range (success points)',
      definition_fr: 'Différence en points de pourcentage entre le pire et le meilleur scénario de stress.',
      definition_en: 'Difference in success-rate percentage points between worst and best stress scenario.',
      compute: function(d) {
        if (!d.mc || !d.mc._stress) return null;
        var ks = Object.keys(d.mc._stress);
        if (ks.length === 0) return null;
        var succs = ks.map(function(k) {
          var r = d.mc._stress[k];
          return r && r.succ != null ? r.succ : null;
        }).filter(function(x) { return x != null; });
        if (succs.length < 2) return null;
        return Math.round((Math.max.apply(null, succs) - Math.min.apply(null, succs)) * 100);
      }
    },
    // ─── Top sensitivity lever — used by Risk-collapse callout ──────────
    // The dominant driver from the tornado chart (largest absolute swing).
    top_sensitivity_lever: {
      label_fr: 'Levier de sensibilité dominant',
      label_en: 'Dominant sensitivity lever',
      definition_fr: 'Paramètre dont la variation seule produit le plus grand impact sur le patrimoine final médian.',
      definition_en: 'Parameter whose variation alone produces the largest impact on median final wealth.',
      compute: function(d) {
        var sens = d._sensData || (d.mc && d.mc._sensData);
        if (!Array.isArray(sens) || sens.length === 0) return null;
        var ranked = sens.slice().sort(function(a, b) {
          return (Math.abs(b.delta || 0) - Math.abs(a.delta || 0));
        });
        return ranked[0] && ranked[0].label ? ranked[0].label : null;
      }
    },
    // ─── Case driver — surfaces profile.case_driver into the canonical
    // metric block so auditors and renderers read it from the same place.
    // Set by review-pack-builder from profile.case_driver field.
    case_driver: {
      label_fr: 'Levier de cas',
      label_en: 'Case driver',
      definition_fr: 'Le levier le plus déterminant pour ce profil. Le plan d\'action doit l\'aborder en premier.',
      definition_en: 'The single most case-defining lever for this profile. The action plan must address it first.',
      compute: function(d) { return d._caseDriver != null ? d._caseDriver : null; }
    }
  };

  // ─── CASE DRIVER TOKENS — narration-auditor checks these appear in
  //   advisor_letter / overall_assessment slots. Each driver maps to a
  //   regex-OR that must fire at least once in the narration block.
  var CASE_DRIVER_TOKENS = {
    ccpc_extraction:           { fr: ['extraction', 'CCPC', 'soci\u00e9t\u00e9 par actions', 'salaire', 'dividende', 'r\u00e9mun\u00e9ration', 'incorporation', 'corp', 'corpor'],
                                  en: ['extraction', 'CCPC', 'corporation', 'corp', 'salary', 'dividend', 'incorporated', 'compensation'] },
    rental_cashflow:           { fr: ['locatif', 'loyer', 'flux locatif', 'immeuble', 'gestion', 'plex', 'duplex'],
                                  en: ['rental', 'cash flow', 'tenant', 'plex', 'landlord', 'property', 'rent'] },
    gis_trap:                  { fr: ['SRG', 'pi\u00e8ge', 'r\u00e9cup\u00e9ration', 'pourcent par dollar', 'seuil'],
                                  en: ['GIS', 'trap', 'clawback', 'cents per dollar', 'threshold', 'eligibility'] },
    fire_bridge:               { fr: ['pont', 'avant', 'bridge', 'horizon', 'long', 's\u00e9quence', 's\u00e9quentiel'],
                                  en: ['bridge', 'before', 'gap years', 'sequence', 'horizon', 'long horizon', 'pre-RRQ', 'pre-CPP'] },
    db_pension_split:          { fr: ['pension', 'fractionnement', 'PD', 'employeur', 'rente', 'index'],
                                  en: ['pension', 'splitting', 'DB', 'employer', 'indexed', 'split'] },
    meltdown_window:           { fr: ['meltdown', 'fonte', 'FERR', 'avant 72', 'fen\u00eatre', 'd\u00e9caissement acc\u00e9l\u00e9r\u00e9'],
                                  en: ['meltdown', 'melt', 'RRIF', 'before 72', 'window', 'accelerated drawdown'] },
    debt_paydown:              { fr: ['dette', 'remboursement', 'taux', 'pri', 'cr\u00e9dit', 'pr\u00eat'],
                                  en: ['debt', 'paydown', 'pay down', 'rate', 'principal', 'high-interest', 'loan'] },
    gap_savings:               { fr: ['\u00e9pargne', 'cotisation', 'augmenter', 'taux d\'\u00e9pargne'],
                                  en: ['savings rate', 'contribution', 'increase', 'gap'] },
    hnw_estate:                { fr: ['succession', 'h\u00e9ritage', 'imp\u00f4t au d\u00e9c\u00e8s', 'legs', 'estate'],
                                  en: ['estate', 'inheritance', 'tax at death', 'legacy', 'bequest', 'trust'] },
    late_start_savings:        { fr: ['rattrapage', 'd\u00e9part tardif', 'cotisation', 'r\u00e9aliste', 'temps'],
                                  en: ['catch-up', 'late start', 'contribution', 'realistic', 'time horizon'] },
    single_parent_resilience:  { fr: ['monoparental', 'r\u00e9silience', 'r\u00e9serve', 'urgence', 'enfant'],
                                  en: ['single parent', 'resilience', 'reserve', 'emergency', 'child'] }
  };

  // ─── COLLAPSE THRESHOLDS — Risk + Stress merge into callout (P1.3) ───
  // Both expressed in success-rate percentage points.
  var COLLAPSE_THRESHOLDS = {
    dispersion_pts_max: 5,   // P75 - P25 ≤ 5pts → low dispersion
    stress_pts_max: 2        // best stress - worst stress ≤ 2pts → uniform
  };

  // ─── DISCLAIMER BUDGET — F39 enforcement ────────────────────────────
  // Reports emit disclaimers via class="disclaimer". Cap at 4 visible
  // instances; surplus get folded into the dedicated appendix.
  var DISCLAIMER_BUDGET = { max_visible: 4 };

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
  // Categories starting with `narration_` / `action_` / `compliance_` /
  // `depth_` were added in the premium rebuild (P1.7). They are routed to
  // major (re-runnable) findings rather than hard blockers, so a single
  // narration miss can still ship after the correction pass repairs it.
  var SHIP_GATE = {
    blocker_categories: [
      'percentage_contradiction',
      'impossible_gis',
      'empty_section',
      'language_leak',
      'duplicate_section',
      'approximation_visible',
      'missing_income_source',
      'metric_undefined',
      'placeholder_visible',
      'broken_toc',
      'debt_table_invalid',
      'case_driver_missing',
      'depth_required_missing'
    ],
    major_categories: [
      'thin_section',
      'uniform_stress',
      'risk_redundant',
      'narration_repetition',
      'narration_generic',
      'narration_case_driver_absent',
      'action_lever_one_off_driver',
      'action_lever_missing_fields',
      'action_too_few_levers',
      'compliance_disclaimer_excess',
      'compliance_prescriptive',
      'compliance_tense_drift',
      'depth_advisor_unsigned',
      'data_gis_ai_mismatch',
      'language_leak',
      'visual_chart_incomplete',
      'visual_percentile_outliers',
      'visual_label_ambiguous',
      'visual_shallow_mode',
      // Phase B: cross-section integrity. Numbers in any text must
      // trace to a canonical metric; rhetorical posture must match
      // the canonical success-rate band.
      'canonical_quote_drift',
      'thesis_band_drift'
    ],
    max_blockers_for_ship: 0,
    max_majors_for_ship: 0
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
    CASE_DRIVER_TOKENS: CASE_DRIVER_TOKENS,
    COLLAPSE_THRESHOLDS: COLLAPSE_THRESHOLDS,
    DISCLAIMER_BUDGET: DISCLAIMER_BUDGET,
    buildCanonicalMetrics: buildCanonicalMetrics,
    metricLabel: metricLabel,
    metricDefinition: metricDefinition
  };

  if (typeof window !== 'undefined') window.BFReviewContract = EXP;
  if (typeof module !== 'undefined' && module.exports) module.exports = EXP;
})();
