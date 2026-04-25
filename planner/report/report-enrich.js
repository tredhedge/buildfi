// report-enrich.js — Browser-side MC enrichment (port of mc-enrich.mjs).
//
// Why this file exists:
//   `mc-enrich.mjs` is ESM and runs server-side inside gen-real-mc.mjs. The
//   planner.html / planner_v3.html direct-render path never calls it, so
//   mc._enriched is absent and sec-drawOrder / sec-cashflow / estateWaterfall
//   fall back to their "data not generated" stubs in the rendered report.
//
// What it does:
//   Exposes window.BEnrich.enrichMC(mc, params) → adds mc._enriched = {
//     cashflow, drawTrace, estateWaterfall, goalsLedger, allocation
//   }. Pure-function: idempotent, no side effects on `mc` unless caller assigns.
//
// Where it is consumed:
//   report-data.js / buildReportPayload auto-invokes this when mc._enriched is
//   missing AND window.BEnrich is available — so downstream renderers get the
//   same shape of data whether from server pipeline or browser pipeline.

(function() {
  "use strict";

  // Provincial probate rates — rounded 2026 values. Matches mc-enrich.mjs.
  var PROBATE_RATES = {
    QC: { rate: 0,     flat: 0,   note: 'no probate tax; notarized will $0, non-notarized minimal' },
    ON: { rate: 0.015, flat: 0,   note: '$15 per $1000 over $50K (i.e. 1.5%)' },
    BC: { rate: 0.014, flat: 0,   note: '$14 per $1000 over $50K (i.e. 1.4%)' },
    AB: { rate: 0,     flat: 525, note: 'flat max $525 regardless of estate size' },
    SK: { rate: 0.007, flat: 0,   note: '$7 per $1000 (i.e. 0.7%)' },
    MB: { rate: 0.007, flat: 0,   note: '$7 per $1000 (i.e. 0.7%)' },
    NB: { rate: 0.005, flat: 0,   note: '$5 per $1000 over $20K (i.e. 0.5%)' },
    NS: { rate: 0.01695, flat: 0, note: 'tiered, top rate ~1.695%' },
    PE: { rate: 0.004, flat: 50,  note: '$50 up to $10K + 0.4% above' },
    NL: { rate: 0.006, flat: 60,  note: '$60 + 0.6% above $1K' },
    NT: { rate: 0.004, flat: 0,   note: 'minimal' },
    YT: { rate: 0,     flat: 140, note: 'flat $140 if estate > $25K' },
    NU: { rate: 0,     flat: 400, note: 'flat $400 over $25K' }
  };

  var CG_THRESHOLD = 250000;
  var CG_INCL_LOW = 0.5;
  var CG_INCL_HIGH = 2 / 3;

  // 1. CASH FLOW — compact per-year row
  function buildCashflow(medRevData, params) {
    if (!medRevData || !medRevData.length) return [];
    return medRevData.map(function(r) {
      var age = r.age;
      var isRetired = age >= (params.retAge || 65);
      var sal = (r.sal || 0) + (r.cSal || 0);
      var gov = (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0);
      var pen = (r.pen || 0) + (r.pt || 0);
      var corp = (r.corpDiv || 0) + (r.corpSal || 0);
      var draws = r.ret || ((r.wFromRR || 0) + (r.wFromTF || 0) + (r.wFromNR || 0));
      var payroll = (r.payroll || 0) + (r.cPayroll || 0);
      var contrib = (r.penCont || 0);
      var tax = r.tax || 0;
      var spend = r.spend || 0;
      var totalIn = sal + gov + pen + corp + draws;
      var totalOut = payroll + contrib + tax + spend;
      return {
        age: age,
        phase: isRetired ? 'retired' : 'working',
        income: { sal: sal, gov: gov, pen: pen, corp: corp, draws: draws, total: totalIn },
        outflows: { payroll: payroll, contrib: contrib, tax: tax, spend: spend, total: totalOut },
        net: totalIn - totalOut
      };
    });
  }

  // 2. DRAW TRACE — structured withdrawal sources per retirement year
  function buildDrawTrace(medRevData, params) {
    if (!medRevData || !medRevData.length) return [];
    var retAge = params.retAge || 65;
    return medRevData.filter(function(r) { return r.age >= retAge; }).map(function(r) {
      var fromRR = r.wFromRR || 0;
      var fromTF = r.wFromTF || 0;
      var fromNR = r.wFromNR || 0;
      var fromMelt = r.wMelt || 0;
      var fromRrifMin = r.wRrifMin || 0;
      var total = fromRR + fromTF + fromNR + fromMelt + fromRrifMin;
      return {
        age: r.age,
        rrsp: Math.round(fromRR),
        tfsa: Math.round(fromTF),
        nr: Math.round(fromNR),
        melt: Math.round(fromMelt),
        rrifMin: Math.round(fromRrifMin),
        total: Math.round(total),
        shares: total > 0 ? {
          rrsp: fromRR / total, tfsa: fromTF / total, nr: fromNR / total,
          melt: fromMelt / total, rrifMin: fromRrifMin / total
        } : null
      };
    });
  }

  // 3. ESTATE WATERFALL — decompose medEstateTax into sources
  function buildEstateWaterfall(mc, params) {
    if (!mc || mc.medEstateNet == null) return null;
    var prov = params.prov || 'QC';
    var probCfg = PROBATE_RATES[prov] || PROBATE_RATES.QC;
    var grossEstate = (mc.medEstateNet || 0) + (mc.medEstateTax || 0);
    var estateTax = mc.medEstateTax || 0;
    var rrspAtDeath = 0, tfsaAtDeath = 0, nrAtDeath = 0;
    if (mc.medRevData && mc.medRevData.length) {
      var last = mc.medRevData[mc.medRevData.length - 1];
      rrspAtDeath = (last.aRR || 0) + (last.aCRR || 0) + (last.aLIRA || 0) + (last.aCLIRA || 0);
      tfsaAtDeath = (last.aTF || 0) + (last.aCTF || 0);
      nrAtDeath = (last.aNR || 0) + (last.aCNR || 0) + (last.aPE || 0) + (last.aPM || 0) + (last.aRE || 0);
    }
    var probateBase = nrAtDeath + rrspAtDeath * 0.3;
    var probate = probCfg.flat + probateBase * probCfg.rate;
    var totalTax = Math.max(0, estateTax);
    var rrspTaxImplied = rrspAtDeath * 0.48;
    var nrCGTaxImplied = nrAtDeath * CG_INCL_LOW * 0.30;
    var implTotal = rrspTaxImplied + nrCGTaxImplied;
    var rrspTax = implTotal > 0 ? totalTax * (rrspTaxImplied / implTotal) : totalTax;
    var cgTax = implTotal > 0 ? totalTax * (nrCGTaxImplied / implTotal) : 0;
    var net = grossEstate - rrspTax - cgTax - probate;
    return {
      grossEstate: Math.round(grossEstate),
      breakdown: { rrsp: Math.round(rrspAtDeath), tfsa: Math.round(tfsaAtDeath), nr: Math.round(nrAtDeath) },
      deductions: { rrspTax: Math.round(rrspTax), cgTax: Math.round(cgTax), probate: Math.round(probate) },
      probateConfig: probCfg,
      net: Math.round(net),
      p25Net: mc.p25EstateNet != null ? Math.round(mc.p25EstateNet) : null
    };
  }

  // 4. GOALS LEDGER — per-goal feasibility + probability met
  function _percentileOf(target, row) {
    var bands = [
      { p: 5,  v: row.p5 || row.rp5 || 0 },
      { p: 25, v: row.p25 || row.rp25 || 0 },
      { p: 50, v: row.p50 || row.rp50 || 0 },
      { p: 75, v: row.p75 || row.rp75 || 0 },
      { p: 95, v: row.p95 || row.rp95 || 0 }
    ];
    if (target <= bands[0].v) return 5;
    if (target >= bands[4].v) return 95;
    for (var i = 0; i < bands.length - 1; i++) {
      if (target >= bands[i].v && target <= bands[i + 1].v) {
        var range = bands[i + 1].v - bands[i].v;
        var frac = range > 0 ? (target - bands[i].v) / range : 0;
        return bands[i].p + frac * (bands[i + 1].p - bands[i].p);
      }
    }
    return 50;
  }

  function buildGoalsLedger(mc, params) {
    var goals = params.goals || [];
    if (!goals.length || !mc.pD) return [];
    return goals.map(function(g, idx) {
      var targetAge = g.age || g.targetAge || params.retAge || 65;
      var amount = g.amount || 0;
      var row = null;
      for (var i = 0; i < mc.pD.length; i++) {
        if (mc.pD[i].age === targetAge) { row = mc.pD[i]; break; }
      }
      if (!row) row = mc.pD[0];
      var pctBelow = row ? _percentileOf(amount, row) : 50;
      var probMet = Math.round(100 - pctBelow);
      var medianAvailable = row ? Math.round(row.p50 || row.rp50 || 0) : 0;
      return {
        id: 'goal-' + idx,
        desc: g.desc || g.name || ('Objectif ' + (idx + 1)),
        amount: Math.round(amount),
        targetAge: targetAge,
        medianAvailable: medianAvailable,
        probabilityMet: Math.max(0, Math.min(100, probMet)),
        status: probMet >= 80 ? 'on-track' : probMet >= 50 ? 'tight' : 'at-risk',
        cushion: medianAvailable - amount
      };
    });
  }

  // 5. ALLOCATION — current blended equity/bond mix
  function buildAllocation(params) {
    var p = params || {};
    var rrsp = p.rrsp || 0, tfsa = p.tfsa || 0, nr = p.nr || 0;
    var cRRSP = p.cOn ? (p.cRRSP || 0) : 0;
    var cTFSA = p.cOn ? (p.cTFSA || 0) : 0;
    var cNR = p.cOn ? (p.cNR || 0) : 0;
    var total = rrsp + tfsa + nr + cRRSP + cTFSA + cNR;
    if (total <= 0) return null;
    var eqRRSP = (rrsp + cRRSP) * (p.allocR || 0.6);
    var eqTFSA = (tfsa + cTFSA) * (p.allocT || 0.7);
    var eqNR = (nr + cNR) * (p.allocN || 0.5);
    var totalEquity = eqRRSP + eqTFSA + eqNR;
    var equityShare = totalEquity / total;
    return {
      accounts: {
        rrsp: { value: Math.round(rrsp + cRRSP), share: (rrsp + cRRSP) / total, equityPct: p.allocR || 0.6 },
        tfsa: { value: Math.round(tfsa + cTFSA), share: (tfsa + cTFSA) / total, equityPct: p.allocT || 0.7 },
        nr:   { value: Math.round(nr + cNR),    share: (nr + cNR) / total,    equityPct: p.allocN || 0.5 }
      },
      blended: {
        equityPct: Math.round(equityShare * 1000) / 10,
        bondPct: Math.round((1 - equityShare) * 1000) / 10
      },
      totalWealth: Math.round(total)
    };
  }

  // Main dispatcher — idempotent. Call as: mc._enriched = BEnrich.enrichMC(mc, params)._enriched
  // or just: var enriched = BEnrich.enrichMC(mc, params); then consume enriched._enriched.
  function enrichMC(mc, params) {
    if (!mc) return mc;
    var enriched = {
      cashflow: buildCashflow(mc.medRevData, params),
      drawTrace: buildDrawTrace(mc.medRevData, params),
      estateWaterfall: buildEstateWaterfall(mc, params),
      goalsLedger: buildGoalsLedger(mc, params),
      allocation: buildAllocation(params)
    };
    // Return a SHALLOW copy so caller can assign to mc._enriched without mutating engine output.
    var out = {};
    for (var k in mc) { if (Object.prototype.hasOwnProperty.call(mc, k)) out[k] = mc[k]; }
    out._enriched = enriched;
    return out;
  }

  window.BEnrich = Object.freeze({
    enrichMC: enrichMC,
    buildCashflow: buildCashflow,
    buildDrawTrace: buildDrawTrace,
    buildEstateWaterfall: buildEstateWaterfall,
    buildGoalsLedger: buildGoalsLedger,
    buildAllocation: buildAllocation,
    PROBATE_RATES: PROBATE_RATES
  });
})();
