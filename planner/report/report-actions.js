// report-actions.js — BuildFi Action Plan Generator
//
// Rule-based engine that turns engine output + params into a prioritized list
// of observational actions the client could discuss with a planner.
//
// AMF-COMPLIANCE PRINCIPLE
//   Every action is OBSERVATIONAL ("The plan could benefit from reviewing X").
//   NEVER prescriptive ("You should do Y" / "You must Z").
//   Each action ends with an implicit invitation: the client will see the
//   recommendation to consult a certified planner at the page footer.
//
// IMPACT QUANTIFICATION
//   `dollarImpact` is computed from engine data when possible. Where the exact
//   dollar effect would require re-running MC (which we do in Phase 2 via
//   _sweeps / _stress but not per-action), impact is labeled qualitatively
//   (e.g. "high double-digit thousands") rather than invented.
//
// Exports: window.BActions.generateActions(d) → Action[]

(function() {
  "use strict";

  // Priority rank used for sorting (lower = shown first)
  var PRIORITY = { high: 1, medium: 2, low: 3 };

  // Timeline buckets — 4-tier life-stage framing per codex recommendation.
  // Each timeline maps to a phase the reader can act on:
  //   immediate → "Maintenant" (next 30-90 days, no preconditions)
  //   short     → "12 mois" (the calendar year ahead)
  //   medium    → "Préretraite" (build-up phase before retirement)
  //   long      → "Retraite active" (after retirement begins)
  // The renderActionPlan groups actions under these labels so the reader sees
  // a sequenced trajectory rather than a flat catalog of levers.
  var TL = {
    immediate: { fr: 'Maintenant',     en: 'Now',              order: 1 },
    short:     { fr: '12 mois',        en: 'Next 12 months',   order: 2 },
    medium:    { fr: 'Pr\u00e9retraite', en: 'Pre-retirement', order: 3 },
    long:      { fr: 'Retraite active', en: 'In retirement',   order: 4 }
  };

  function _f$(v) { return window.BFmt.fmtCompact(v); }
  function _fM(v, fr) { return window.BFmt.fmtMoney(v, fr); }

  // Produce one action. Normalizes structure.
  function mk(id, title, rationale, opts) {
    opts = opts || {};
    return {
      id: id,
      title: title,
      rationale: rationale,
      dollarImpact: opts.dollarImpact != null ? opts.dollarImpact : null,
      timeline: opts.timeline || 'medium',
      confidence: opts.confidence || 'medium',  // high / medium / low
      priority: opts.priority || 'medium',      // high / medium / low
      kind: opts.kind || 'general',             // fees / tax / debt / gis / allocation / estate / income / corp
      compliance: opts.compliance || 'review'   // 'review' = planner should review; never 'do'
    };
  }

  function generateActions(d) {
    if (!d || !d.p || !d.mc) return [];
    var fr = d.fr;
    var p = d.p;
    var mc = d.mc;
    var enr = mc._enriched || {};
    var actions = [];

    // ─────────────────────────────────────────────────────────────────────
    // RULE 1: High-rate debt present — remboursement comme "rendement garanti"
    // ─────────────────────────────────────────────────────────────────────
    if (p.debts && p.debts.length) {
      var highRate = p.debts.filter(function(dt) { return (dt.rate || dt.r || 0) > 0.08; });
      if (highRate.length > 0) {
        var totalHigh = highRate.reduce(function(s, dt) { return s + (dt.balance || dt.bal || 0); }, 0);
        var worstRate = highRate.reduce(function(r, dt) { return Math.max(r, dt.rate || dt.r || 0); }, 0);
        actions.push(mk('debt-high-rate',
          fr ? 'R\u00e9duction prioritaire des dettes \u00e0 taux \u00e9lev\u00e9' : 'Prioritize high-rate debt reduction',
          fr
            ? totalHigh >= 1000
              ? 'Le plan comporte ' + highRate.length + ' dette(s) \u00e0 taux \u00e9lev\u00e9 pour un total de ' + _f$(totalHigh) + ', dont un taux maximum de ' + Math.round(worstRate * 100) + ' %. Chaque dollar rembours\u00e9 \u00e0 ce taux \u00e9quivaut \u00e0 un rendement garanti sup\u00e9rieur \u00e0 celui attendu des placements imposables.'
              : 'Une dette \u00e0 taux \u00e9lev\u00e9 est pr\u00e9sente dans le plan.'
            : totalHigh >= 1000
              ? 'The plan carries ' + highRate.length + ' high-rate debt(s) totalling ' + _f$(totalHigh) + ', with a maximum rate of ' + Math.round(worstRate * 100) + '%. Each dollar repaid at this rate equals a guaranteed return higher than most taxable investments could deliver.'
              : 'High-rate debt is present in the plan.',
          { dollarImpact: Math.round(totalHigh * worstRate), timeline: 'immediate', confidence: 'high', priority: 'high', kind: 'debt' }
        ));
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 2: High MER (weighted > 1%) — impact fees over lifetime
    // ─────────────────────────────────────────────────────────────────────
    if ((d.merWt || 0) > 0.01 && d.feeCost > 10000) {
      var potentialSaving = Math.round((d.merWt - 0.005) * d.totalBal * (d.horizon || 30) * 0.6);
      actions.push(mk('fees-reduce',
        fr ? 'R\u00e9vision des frais de gestion' : 'Review investment management fees',
        fr
          ? 'Les frais pond\u00e9r\u00e9s sont de <strong>' + (d.merWt * 100).toFixed(2) + ' %</strong>, compound\u00e9s sur l\'horizon \u00e0 un co\u00fbt viager estim\u00e9 de <strong>' + _f$(d.feeCost) + '</strong>. Passer \u00e0 une structure \u00e0 **0,50 %** pourrait lib\u00e9rer environ <strong>' + _f$(potentialSaving) + '</strong> de patrimoine final.'
          : 'Weighted fees are <strong>' + (d.merWt * 100).toFixed(2) + '%</strong>, compounding over the horizon to an estimated lifetime cost of <strong>' + _f$(d.feeCost) + '</strong>. Moving to a <strong>0.50%</strong> structure could free approximately <strong>' + _f$(potentialSaving) + '</strong> of final wealth.',
        { dollarImpact: potentialSaving, timeline: 'short', confidence: 'high', priority: 'high', kind: 'fees' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 3: OAS clawback years > 5 — pension splitting (couple) / meltdown
    // ─────────────────────────────────────────────────────────────────────
    if ((d.oasClbkYrs || 0) > 5) {
      actions.push(mk('oas-clawback',
        fr ? 'Coordination des retraits pour limiter la r\u00e9cup\u00e9ration PSV' : 'Coordinate withdrawals to limit OAS clawback',
        fr
          ? 'Le plan projette <strong>' + d.oasClbkYrs + ' ann\u00e9es</strong> de r\u00e9cup\u00e9ration PSV, pendant lesquelles chaque dollar de revenu au-del\u00e0 du seuil est taxable \u00e0 15 % additionnels. ' + (p.cOn ? 'Le fractionnement de pension entre conjoints pourrait r\u00e9partir le fardeau et r\u00e9duire la r\u00e9cup\u00e9ration.' : 'L\'\u00e9talement des retraits REER (meltdown) avant 72 ans pourrait niveler le revenu imposable et r\u00e9duire la r\u00e9cup\u00e9ration.')
          : 'The plan projects <strong>' + d.oasClbkYrs + ' years</strong> of OAS clawback, during which each dollar of income above the threshold is taxed at an additional 15%. ' + (p.cOn ? 'Pension splitting between spouses could distribute the burden and reduce clawback.' : 'Smoothing RRSP withdrawals (meltdown) before age 72 could level taxable income and reduce clawback.'),
        { dollarImpact: null, timeline: 'medium', confidence: 'high', priority: 'high', kind: 'tax' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 4: Real tax alpha (optimized vs naive delta) is meaningful
    // ─────────────────────────────────────────────────────────────────────
    if (d._hasNaive && d._taxAlpha != null && d._taxAlpha > 50000) {
      actions.push(mk('tax-alpha-preserve',
        fr ? 'Pr\u00e9servation de la coordination de retraits actuelle' : 'Preserve the current withdrawal coordination',
        fr
          ? 'La strat\u00e9gie actuelle d\u00e9gage un alpha fiscal de <strong>' + _f$(d._taxAlpha) + '</strong> sur l\'horizon du plan, soit environ <strong>' + Math.round((d._taxAlpha / Math.max(1, d._optTax)) * 100) + ' %</strong> de l\'imp\u00f4t viager. Cette valeur pourrait \u00eatre pr\u00e9serv\u00e9e en maintenant l\'ordre de retraits observ\u00e9.'
          : 'The current strategy realizes a tax alpha of <strong>' + _f$(d._taxAlpha) + '</strong> over the plan horizon, roughly <strong>' + Math.round((d._taxAlpha / Math.max(1, d._optTax)) * 100) + '%</strong> of lifetime tax. This value could be preserved by maintaining the observed withdrawal order.',
        { dollarImpact: Math.round(d._taxAlpha), timeline: 'medium', confidence: 'high', priority: 'medium', kind: 'tax' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 5: GIS eligible + RRSP balance — preserve GIS via withdrawal timing
    // ─────────────────────────────────────────────────────────────────────
    var gisEligible = (d.revData || []).some(function(r) { return r.age >= 65 && (r.srg || r.gis || 0) > 0; });
    if (gisEligible && ((p.rrsp || 0) + (p.cOn ? p.cRRSP || 0 : 0)) > 5000) {
      var gisTotal = (d.revData || []).reduce(function(s, r) { return s + (r.srg || r.gis || 0); }, 0);
      actions.push(mk('gis-preservation',
        fr ? 'Pr\u00e9servation de l\'\u00e9ligibilit\u00e9 au SRG' : 'Preserve GIS eligibility',
        fr
          ? 'Le plan projette un SRG viager de <strong>' + _f$(gisTotal) + '</strong>. Chaque dollar retir\u00e9 du REER post-65 ans peut r\u00e9duire ce SRG d\'environ 50 ¢ — coordination fine du calendrier des retraits serait \u00e0 \u00e9valuer.'
          : 'The plan projects a lifetime GIS of <strong>' + _f$(gisTotal) + '</strong>. Each dollar withdrawn from RRSP post-65 may reduce GIS by roughly 50¢ — fine coordination of withdrawal timing would be worth evaluating.',
        { dollarImpact: Math.round(gisTotal * 0.3), timeline: 'medium', confidence: 'high', priority: 'high', kind: 'gis' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 6: Meltdown active but RRSP barely reduces — review target
    // ─────────────────────────────────────────────────────────────────────
    if (p.melt && (p.meltTgt || 0) > 0 && d.R.hasMeltdown) {
      var pd72 = (mc.pD || []).find(function(r) { return r.age === 72; });
      if (pd72) {
        var rrspAt72 = pd72.mp_rr || 0;
        var rrspNow = p.rrsp || 0;
        var deltaPct = rrspNow > 0 ? ((rrspAt72 - rrspNow) / rrspNow) * 100 : 0;
        if (deltaPct > -10) { // RRSP did not shrink meaningfully (less than 10% reduction)
          actions.push(mk('meltdown-weak',
            fr ? 'R\u00e9vision de la cible de meltdown REER' : 'Review RRSP meltdown target',
            fr
              ? 'La strat\u00e9gie meltdown actuelle avec cible de <strong>' + _fM(p.meltTgt, fr) + '/an</strong> n\'a pas d\'effet structurel sur le solde REER \u00e0 72 ans (' + (deltaPct >= 0 ? 'hausse de ' + deltaPct.toFixed(1) + ' %' : 'baisse de seulement ' + Math.abs(deltaPct).toFixed(1) + ' %') + '). Un retrait annuel plus agressif pourrait \u00eatre \u00e9valu\u00e9.'
              : 'The current meltdown strategy with a target of <strong>' + _fM(p.meltTgt, fr) + '/yr</strong> has no structural effect on the RRSP balance at 72 (' + (deltaPct >= 0 ? 'up ' + deltaPct.toFixed(1) + '%' : 'down only ' + Math.abs(deltaPct).toFixed(1) + '%') + '). A more aggressive annual withdrawal could be evaluated.',
            { dollarImpact: null, timeline: 'short', confidence: 'medium', priority: 'medium', kind: 'tax' }
          ));
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 7: Low coverage ratio (< 40%) — delay retirement or reduce spending
    // ─────────────────────────────────────────────────────────────────────
    if ((d.covRatio || 0) < 0.4 && (d.covRatio || 0) > 0 && !d.R.ccpc) {
      actions.push(mk('coverage-low',
        fr ? '\u00c9valuer le report de la retraite ou l\'ajustement des d\u00e9penses' : 'Evaluate delaying retirement or adjusting spending',
        fr
          ? 'La couverture gouvernementale projet\u00e9e est de <strong>' + Math.round(d.covRatio * 100) + ' %</strong>, laissant un \u00e9cart mensuel de <strong>' + _fM(Math.round(d.gapM), fr) + '</strong> \u00e0 combler par l\'\u00e9pargne. Retarder la retraite de quelques ann\u00e9es ou r\u00e9duire l\'objectif de d\u00e9penses augmenterait nettement la probabilit\u00e9 de succ\u00e8s.'
          : 'Projected government coverage is <strong>' + Math.round(d.covRatio * 100) + '%</strong>, leaving a monthly gap of <strong>' + _fM(Math.round(d.gapM), fr) + '</strong> to fund from savings. Delaying retirement a few years or lowering the spending target would materially increase success probability.',
        { dollarImpact: null, timeline: 'medium', confidence: 'high', priority: 'medium', kind: 'income' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 8: CCPC with retained earnings — extraction strategy
    // ─────────────────────────────────────────────────────────────────────
    if (d.R.ccpc && (p.bizRetainedEarnings || 0) > 100000) {
      actions.push(mk('corp-extraction',
        fr ? 'Planification du rythme d\'extraction corporative' : 'Plan the corporate extraction cadence',
        fr
          ? 'La SPCC d\u00e9tient <strong>' + _f$(p.bizRetainedEarnings) + '</strong> de b\u00e9n\u00e9fices non r\u00e9partis. Le rythme d\'extraction post-vente (dividendes \u00e9tal\u00e9s vs. encaiss\u00e9s rapidement) est le levier fiscal le plus puissant restant \u2014 \u00e0 revoir avec un planificateur connaissant la fiscalit\u00e9 int\u00e9gr\u00e9e.'
          : 'The CCPC holds <strong>' + _f$(p.bizRetainedEarnings) + '</strong> in retained earnings. The post-sale extraction cadence (smoothed dividends vs. accelerated) is the most powerful remaining tax lever — worth reviewing with a planner familiar with integrated taxation.',
        { dollarImpact: null, timeline: 'medium', confidence: 'medium', priority: 'medium', kind: 'corp' }
      ));
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 9: RRSP contribution room unused (pre-retirement only)
    // ─────────────────────────────────────────────────────────────────────
    if (p.age < p.retAge && (p.sal || 0) > 60000) {
      var maxContrib = Math.min((p.sal || 0) * 0.18, 32490); // 2026 RRSP dollar limit
      var actualContrib = p.rrspC || 0;
      if (maxContrib - actualContrib > 5000) {
        var unusedRoom = maxContrib - actualContrib;
        actions.push(mk('rrsp-contribution',
          fr ? '\u00c9valuer l\'augmentation des cotisations REER' : 'Evaluate increased RRSP contributions',
          fr
            ? 'Environ <strong>' + _fM(Math.round(unusedRoom), fr) + '</strong> de droit de cotisation REER annuel ne semble pas utilis\u00e9. Sur l\'horizon pr\u00e9-retraite, chaque dollar cotis\u00e9 aujourd\'hui b\u00e9n\u00e9ficie de l\'effet de composition maximal.'
            : 'Approximately <strong>' + _fM(Math.round(unusedRoom), fr) + '</strong> of annual RRSP contribution room appears unused. Over the pre-retirement horizon, each dollar contributed today benefits from maximum compounding.',
          { dollarImpact: Math.round(unusedRoom * Math.max(1, p.retAge - p.age) * 2), timeline: 'short', confidence: 'medium', priority: 'medium', kind: 'tax' }
        ));
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // RULE 10: Goal at-risk (<50% probability) in ledger
    // ─────────────────────────────────────────────────────────────────────
    if (enr.goalsLedger && enr.goalsLedger.length) {
      var atRisk = enr.goalsLedger.filter(function(g) { return g.probabilityMet < 50; });
      if (atRisk.length > 0) {
        var worstGoal = atRisk.sort(function(a, b) { return a.probabilityMet - b.probabilityMet; })[0];
        actions.push(mk('goals-at-risk',
          fr ? 'Objectifs d\u00e9clar\u00e9s \u00e0 risque' : 'Declared goals at risk',
          fr
            ? '<strong>' + atRisk.length + ' objectif(s)</strong> affiche(nt) une probabilit\u00e9 de r\u00e9alisation inf\u00e9rieure \u00e0 50 %. Le plus critique est "<strong>' + window.BFmt.esc(worstGoal.desc) + '</strong>" \u00e0 <strong>' + worstGoal.probabilityMet + ' %</strong>. Un ajustement (montant, \u00e2ge cible ou sources de financement) m\u00e9riterait une r\u00e9vision avec un planificateur.'
            : '<strong>' + atRisk.length + ' declared goal(s)</strong> have a probability of achievement below 50%. The most critical is "<strong>' + window.BFmt.esc(worstGoal.desc) + '</strong>" at <strong>' + worstGoal.probabilityMet + '%</strong>. Adjusting the amount, target age, or funding source would be worth reviewing with a planner.',
          { dollarImpact: worstGoal.amount, timeline: 'medium', confidence: 'high', priority: 'high', kind: 'income' }
        ));
      }
    }

    // Baseline planning-positive levers — top up to a minimum of 3 actions
    // when no real defects (or only 1-2) were detected. Prevents the action
    // plan section from being empty or too thin for profiles that are working
    // well (e.g., a retired couple with DB pension). These are observational
    // and fit the "next-best-step" category: things any well-running plan can
    // refine over time. Only added if not already present (kind dedup).
    var existingKinds = {};
    actions.forEach(function(a) { existingKinds[a.kind] = true; });
    if (actions.length < 3) {
      var phase = d.R && d.R.phase;
      var fr = !!d.fr;

      // Estate planning review — universal for plans with meaningful capital
      var totalCap = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.lira || 0)
                   + (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0);
      if (totalCap > 100000 && !existingKinds.estate) {
        actions.push(mk(
          'estate-review',
          fr ? 'Revue p\u00e9riodique de la planification successorale' : 'Periodic estate planning review',
          fr ? 'Le patrimoine combin\u00e9 d\u00e9passe 100 K$. Une revue p\u00e9riodique des testaments, des d\u00e9signations de b\u00e9n\u00e9ficiaires (REER, CELI, FERR, polices) et de la fiducie testamentaire \u00e9ventuelle pourrait pr\u00e9server l\u2019alignement avec les volont\u00e9s actuelles.'
              : 'Combined household wealth exceeds $100K. A periodic review of wills, beneficiary designations (RRSP, TFSA, RRIF, policies) and any testamentary trust could preserve alignment with current wishes.',
          { dollarImpact: null, timeline: 'short', confidence: 'high', priority: 'medium', kind: 'estate' }
        ));
      }

      // Decumulation order optimization (decum / transition phases)
      if ((phase === 'decum' || phase === 'transition') && !existingKinds.tax) {
        actions.push(mk(
          'withdrawal-order-review',
          fr ? 'Revue annuelle de l\u2019ordre de retrait' : 'Annual review of withdrawal sequencing',
          fr ? 'Pour les plans en phase de d\u00e9caissement, une revue annuelle de l\u2019ordre des retraits (REER/FERR, CELI, non-enregistr\u00e9) en regard du revenu imposable et du seuil de r\u00e9cup\u00e9ration PSV peut continuer \u00e0 lisser l\u2019imp\u00f4t viager m\u00eame quand le plan tient bien.'
              : 'For plans in drawdown, an annual review of the withdrawal order (RRSP/RRIF, TFSA, non-registered) against taxable income and the OAS clawback threshold can continue to smooth lifetime tax even when the plan is well on track.',
          { dollarImpact: null, timeline: 'short', confidence: 'high', priority: 'medium', kind: 'tax' }
        ));
      }

      // Allocation rebalancing review — universal (skip if fees already present)
      if (!existingKinds.fees) actions.push(mk(
        'allocation-rebalance',
        fr ? 'Vigilance sur l\u2019allocation et les frais courants' : 'Allocation and fee vigilance',
        fr ? 'M\u00eame quand le plan tient, un suivi annuel de l\u2019allocation actions/obligations et des frais courants reste pertinent. La d\u00e9rive d\u2019allocation et l\u2019\u00e9rosion par les frais sont des facteurs lents qui se voient peu d\u2019une ann\u00e9e \u00e0 l\u2019autre mais comptent sur la dur\u00e9e.'
            : 'Even when the plan holds, annual monitoring of equity/bond allocation and ongoing fees remains relevant. Allocation drift and fee erosion are slow factors that are barely visible year-to-year but matter over time.',
        { dollarImpact: null, timeline: 'short', confidence: 'medium', priority: 'low', kind: 'fees' }
      ));

      // Goal documentation — for plans without explicit goals
      if (!p.goals || p.goals.length === 0) {
        actions.push(mk(
          'document-goals',
          fr ? 'Formalisation d\u2019objectifs personnels' : 'Document personal goals',
          fr ? 'Aucun objectif explicite n\u2019est document\u00e9 pour ce plan. La formalisation d\u2019objectifs concrets (voyages, transmission, contributions familiales, projets) am\u00e9liorerait la lisibilit\u00e9 des arbitrages futurs.'
              : 'No explicit goals are documented for this plan. Formalizing concrete goals (travel, legacy, family contributions, projects) would improve clarity of future trade-offs.',
          { dollarImpact: null, timeline: 'immediate', confidence: 'medium', priority: 'low', kind: 'goals' }
        ));
      }

      // Long-term care anticipation — for older clients
      if ((p.age || 0) >= 60 || phase === 'decum' || phase === 'transition') {
        actions.push(mk(
          'ltc-anticipation',
          fr ? 'Anticipation des soins prolong\u00e9s' : 'Long-term care anticipation',
          fr ? 'Sur l\u2019horizon projet\u00e9, une r\u00e9flexion sur les sc\u00e9narios de soins prolong\u00e9s (h\u00e9bergement, soins \u00e0 domicile, assurance) pourrait pr\u00e9venir un choc fiscal et de tr\u00e9sorerie tardif.'
              : 'Over the projected horizon, considering long-term care scenarios (residence, home care, insurance) could prevent a late-stage tax and cash-flow shock.',
          { dollarImpact: null, timeline: 'long', confidence: 'medium', priority: 'low', kind: 'income' }
        ));
      }
    }

    // Sort by priority, then by confidence (high first)
    actions.sort(function(a, b) {
      var pa = PRIORITY[a.priority] || 2;
      var pb = PRIORITY[b.priority] || 2;
      if (pa !== pb) return pa - pb;
      var ca = PRIORITY[a.confidence] || 2;
      var cb = PRIORITY[b.confidence] || 2;
      return ca - cb;
    });

    return actions;
  }

  window.BActions = Object.freeze({
    generateActions: generateActions,
    PRIORITY: PRIORITY,
    TL: TL
  });
})();
