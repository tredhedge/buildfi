// report-data.js — BuildFi Report Data & Engine Helpers
// Depends on: report-formatters.js (window.BFmt)
// Exports: window.BData
(function() {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // NAMED CONSTANTS (2026 PAG) — mirrors planner_v2.html engine
  // ══════════════════════════════════════════════════════════════

  var TAX_BASE_YEAR = 2026;
  var FED_BRACKETS = [58523, 117045, 181440, 258482];
  var FED_RATES = [0.14, 0.205, 0.26, 0.29, 0.33];
  var FED_PERSONAL = 16452;
  var OAS_CLAWBACK_THR = 95323;
  var OAS_MAX_MONTHLY = 742.31;
  var GIS_MAX_SINGLE = 1105.43;
  var GIS_MAX_COUPLE = 667.41;
  var QPP_MAX_MONTHLY = 1507.65;
  var QPP_MGA = 74600;
  var QPP_YAMPE = 85000;
  var QPP2_MAX_MONTHLY = 81.00;
  var PENSION_CREDIT_MAX = 2000;
  var TFSA_LIMIT_2026 = 7000;

  var CFG_SMOOTH = {
    MELT: 0.40, MELT_FLOOR: 5000,
    SPEND: 0.30, SPEND_FLOOR: 10000,
    BACK: 0.40, BACK_FLOOR: 15000,
    NR_OVER: 1.5, MC_BLEND: 0.70
  };

  // ══════════════════════════════════════════════════════════════
  // PROVINCIAL TAX BRACKETS (2026)
  // ══════════════════════════════════════════════════════════════

  var PROV_TAX = {
    QC: { b: [54345, 108730, 132245], r: [0.14, 0.19, 0.24, 0.2575], pd: 18952, abate: 0.835, eligDivCr: 0.1118, nonEligDivCr: 0.039362, ageAmt: 3903, ageThresh: 0, penAmt: 2918 },
    ON: { b: [53891, 107785, 15e4, 22e4], r: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], pd: 12091, abate: 1, eligDivCr: 0.10, nonEligDivCr: 0.029863, ageAmt: 5286, ageThresh: 42335, penAmt: 1580 },
    BC: { b: [49159, 98320, 112883, 137073, 185854, 259197], r: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], pd: 12901, abate: 1, eligDivCr: 0.12, nonEligDivCr: 0.0196, ageAmt: 5766, ageThresh: 42660, penAmt: 1000 },
    AB: { b: [154259, 185203, 246938, 370220], r: [0.1, 0.12, 0.13, 0.14, 0.15], pd: 22769, abate: 1, eligDivCr: 0.0812, nonEligDivCr: 0.0218, ageAmt: 5553, ageThresh: 43906, penAmt: 1491 },
    SK: { b: [54532, 155805], r: [0.105, 0.125, 0.145], pd: 20381, abate: 1, eligDivCr: 0.11, nonEligDivCr: 0.02105, ageAmt: 5518, ageThresh: 0, penAmt: 1000 },
    MB: { b: [47e3, 1e5], r: [0.108, 0.1275, 0.174], pd: 15780, abate: 1, eligDivCr: 0.08, nonEligDivCr: 0.007835, ageAmt: 3728, ageThresh: 0, penAmt: 1000 },
    NB: { b: [51306, 102614, 190081], r: [0.094, 0.14, 0.16, 0.195], pd: 13396, abate: 1, eligDivCr: 0.14, nonEligDivCr: 0.027518, ageAmt: 5849, ageThresh: 42553, penAmt: 1000 },
    NS: { b: [30182, 60364, 94860, 153000], r: [0.0879, 0.1495, 0.1667, 0.175, 0.21], pd: 8651, abate: 1, eligDivCr: 0.0885, nonEligDivCr: 0.015, ageAmt: 4897, ageThresh: 0, penAmt: 1000 },
    PE: { b: [33538, 67079], r: [0.098, 0.138, 0.167], pd: 13865, abate: 1, eligDivCr: 0.105, nonEligDivCr: 0.013, ageAmt: 4862, ageThresh: 0, penAmt: 1000 },
    NL: { b: [44062, 88123, 157329, 220262, 281387, 562714], r: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], pd: 11034, abate: 1, eligDivCr: 0.063, nonEligDivCr: 0.032, ageAmt: 7742, ageThresh: 39880, penAmt: 1000 },
    NT: { b: [51963, 103931, 169067], r: [0.059, 0.086, 0.122, 0.1405], pd: 17041, abate: 1, eligDivCr: 0.115, nonEligDivCr: 0.06, ageAmt: 8200, ageThresh: 0, penAmt: 1000 },
    YT: { b: [58523, 117045, 181440, 258482, 500000], r: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], pd: 16452, abate: 1, eligDivCr: 0.1202, nonEligDivCr: 0.0067, ageAmt: 8790, ageThresh: 44325, penAmt: 2000 },
    NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904, ageAmt: 14865, ageThresh: 0, penAmt: 2000 }
  };

  // ══════════════════════════════════════════════════════════════
  // calcTax — Federal + provincial tax with dividend credits
  // ══════════════════════════════════════════════════════════════

  function calcTax(inc, yr, prov, infR, retired, divInfo) {
    yr = yr || 0;
    prov = prov || "QC";
    var idx = Math.pow(1 + (infR || 0.02), yr);
    var eligTaxable = 0, nonEligTaxable = 0, divCredFed = 0, divCredProv = 0;
    if (divInfo && (divInfo.eligDiv > 0 || divInfo.nonEligDiv > 0)) {
      eligTaxable = (divInfo.eligDiv || 0) * 1.38;
      nonEligTaxable = (divInfo.nonEligDiv || 0) * 1.15;
    }
    var totalTaxableInc = inc + eligTaxable + nonEligTaxable;
    if (totalTaxableInc <= 0) return { total: 0, fed: 0, prov: 0, eff: 0, marg: 0.14, fedEff: 0, provEff: 0, divCredFed: 0, divCredProv: 0 };
    var fb = FED_BRACKETS.map(function(v) { return v * idx; });
    var fr = FED_RATES;
    var fpd = FED_PERSONAL * idx;
    var _penCreditMax = 2000 * idx;
    var _ageAmt = 8790 * idx;
    var _ageThresh = 44325 * idx;
    var _ageCreditAmt = Math.max(0, _ageAmt - 0.15 * Math.max(0, totalTaxableInc - _ageThresh));
    var fed = 0, prev = 0;
    for (var i = 0; i < fb.length; i++) {
      if (totalTaxableInc <= fb[i]) { fed += (totalTaxableInc - prev) * fr[i]; prev = totalTaxableInc; break; }
      fed += (fb[i] - prev) * fr[i];
      prev = fb[i];
      if (i === fb.length - 1) fed += (totalTaxableInc - fb[i]) * fr[i + 1];
    }
    fed = Math.max(0, fed - fpd * fr[0] - (retired ? _penCreditMax * 0.15 : 0) - (retired ? _ageCreditAmt * 0.15 : 0));
    var pt = PROV_TAX[prov] || PROV_TAX.QC;
    fed *= pt.abate;
    if (eligTaxable > 0 || nonEligTaxable > 0) {
      var fedEligCr = eligTaxable * 0.150198;
      var fedNonEligCr = nonEligTaxable * 0.090301;
      divCredFed = fedEligCr + fedNonEligCr;
      fed = Math.max(0, fed - divCredFed);
    }
    var pb = pt.b.map(function(v) { return v * idx; });
    var pr2 = pt.r;
    var ppd = (pt.pd || 0) * idx;
    var ptax = 0;
    prev = 0;
    for (var j = 0; j < pb.length; j++) {
      if (totalTaxableInc <= pb[j]) { ptax += (totalTaxableInc - prev) * pr2[j]; prev = totalTaxableInc; break; }
      ptax += (pb[j] - prev) * pr2[j];
      prev = pb[j];
      if (j === pb.length - 1) ptax += (totalTaxableInc - pb[j]) * pr2[j + 1];
    }
    ptax = Math.max(0, ptax - ppd * pr2[0]);
    if (retired) {
      var _provAgeAmt = (pt.ageAmt || 0) * idx;
      if (_provAgeAmt > 0) {
        var _provAgeThresh = (pt.ageThresh || 0) * idx;
        var _provAgeCreditAmt = _provAgeThresh > 0 ? Math.max(0, _provAgeAmt - 0.15 * Math.max(0, totalTaxableInc - _provAgeThresh)) : _provAgeAmt;
        ptax = Math.max(0, ptax - _provAgeCreditAmt * pr2[0]);
      }
      var _provPenAmt = (pt.penAmt || 0) * idx;
      if (_provPenAmt > 0) ptax = Math.max(0, ptax - _provPenAmt * pr2[0]);
    }
    if (prov === "ON") {
      var onSur = 0;
      if (ptax > 4991 * idx) onSur += (ptax - 4991 * idx) * 0.2;
      if (ptax > 6387 * idx) onSur += (ptax - 6387 * idx) * 0.36;
      ptax += onSur;
    }
    if (eligTaxable > 0 || nonEligTaxable > 0) {
      var provEligCr = eligTaxable * (pt.eligDivCr || 0);
      var provNonEligCr = nonEligTaxable * (pt.nonEligDivCr || 0);
      divCredProv = provEligCr + provNonEligCr;
      ptax = Math.max(0, ptax - divCredProv);
    }
    var total = Math.max(0, fed) + Math.max(0, ptax);
    var _fedMarg = fr[0];
    for (var k = 0; k < fb.length; k++) {
      if (totalTaxableInc <= fb[k]) { _fedMarg = fr[k]; break; }
      if (k === fb.length - 1) _fedMarg = fr[fr.length - 1];
    }
    var _provMarg = pr2[0];
    for (var k2 = 0; k2 < pb.length; k2++) {
      if (totalTaxableInc <= pb[k2]) { _provMarg = pr2[k2]; break; }
      if (k2 === pb.length - 1) _provMarg = pr2[pr2.length - 1];
    }
    var marg = _fedMarg * pt.abate + _provMarg;
    var cashInc = inc + (divInfo ? ((divInfo.eligDiv || 0) + (divInfo.nonEligDiv || 0)) : 0);
    return { total: total, fed: Math.max(0, fed), prov: Math.max(0, ptax), eff: cashInc > 0 ? total / cashInc : 0, marg: marg, fedEff: cashInc > 0 ? Math.max(0, fed) / cashInc : 0, provEff: cashInc > 0 ? Math.max(0, ptax) / cashInc : 0, divCredFed: divCredFed, divCredProv: divCredProv, taxableInc: totalTaxableInc };
  }

  // ══════════════════════════════════════════════════════════════
  // calcQPP — QPP/CPP benefit calculation
  // ══════════════════════════════════════════════════════════════

  function calcQPP(startAge, avgEarn, yrsContrib) {
    var maxM = QPP_MAX_MONTHLY, mga = QPP_MGA;
    var ratio = Math.min(1, avgEarn / mga) * Math.min(1, yrsContrib / 40);
    var adj = 1;
    if (startAge < 65) adj = 1 - 6e-3 * (65 - startAge) * 12;
    else if (startAge > 65) adj = 1 + 7e-3 * (startAge - 65) * 12;
    adj = Math.max(0.64, Math.min(1.42, adj));
    var base = maxM * ratio * adj;
    var rrq2 = avgEarn > mga ? QPP2_MAX_MONTHLY * Math.min(1, (Math.min(avgEarn, QPP_YAMPE) - mga) / (QPP_YAMPE - mga)) * Math.min(1, yrsContrib / 40) * adj : 0;
    return base + rrq2;
  }

  // ══════════════════════════════════════════════════════════════
  // calcOAS — OAS benefit with clawback and 75+ bonus
  // ══════════════════════════════════════════════════════════════

  function calcOAS(startAge, income, yr, infR, currentAge) {
    var idxO = Math.pow(1 + (infR || 0.02), yr || 0);
    var maxM = OAS_MAX_MONTHLY * idxO, adj = 1;
    if (startAge > 65) adj = 1 + 6e-3 * (startAge - 65) * 12;
    adj = Math.min(1.36, adj);
    var oas = maxM * adj;
    if ((currentAge || startAge) >= 75) oas *= 1.10;
    var oasThr = OAS_CLAWBACK_THR * idxO;
    if (income > oasThr) oas = Math.max(0, oas - (income - oasThr) * 0.15 / 12);
    return oas;
  }

  // ══════════════════════════════════════════════════════════════
  // calcPayroll — Employee payroll deductions
  // ══════════════════════════════════════════════════════════════

  function calcPayroll(sal, prov, yr, infR) {
    if (sal <= 0) return 0;
    var inf = Math.pow(1 + (infR || 0.02), yr || 0);
    var isQC = (prov || "QC") === "QC";
    var qppExempt = 3500 * inf, qppMax = QPP_MGA * inf;
    var qppPensionable = Math.max(0, Math.min(sal, qppMax) - qppExempt);
    var qppRate = isQC ? 0.064 : 0.0595;
    var qpp = qppPensionable * qppRate;
    var qpp2Max = QPP_YAMPE * inf;
    var qpp2Pensionable = Math.max(0, Math.min(sal, qpp2Max) - qppMax);
    var qpp2 = qpp2Pensionable * 0.04;
    var eiMIE = 65700 * inf;
    var eiRate = isQC ? 0.0127 : 0.0158;
    var ei = Math.min(sal, eiMIE) * eiRate;
    var rqap = 0;
    if (isQC) {
      var rqapMax = 94000 * inf;
      rqap = Math.min(sal, rqapMax) * 0.00494;
    }
    return Math.round(qpp + qpp2 + ei + rqap);
  }

  // ══════════════════════════════════════════════════════════════
  // buildReportPayload — Prepares computed data for the renderer
  // ══════════════════════════════════════════════════════════════

  function buildReportPayload(data) {
    data = data || {};
    var mc = data.mc;
    var detRun = data.detRun || data.detResult || data.det || window._detResult || null;
    var mcComputing = !!data.mcComputing;
    var p = data.params || {};
    var client = data.client || {};
    var _rawAi = data.aiReport || data.ai || {};
    // Normalize AI slot names: accept both camelCase (planner inline) and snake_case (server-side)
    var ai = {};
    Object.keys(_rawAi).forEach(function(k) { ai[k] = _rawAi[k]; });
    // Map planner camelCase → renderer snake_case
    if (!ai.income_insight && ai.incomeInsight) ai.income_insight = ai.incomeInsight;
    if (!ai.trajectory_insight && ai.wealthInsight) ai.trajectory_insight = ai.wealthInsight;
    if (!ai.risk_plain_language && ai.riskInsight) ai.risk_plain_language = ai.riskInsight;
    // Map server-side 360 slots → renderer slots
    if (!ai.verdict && ai.snapshot_intro) ai.verdict = ai.snapshot_intro;
    if (!ai.page_zero_verdict && ai.mirror_block) ai.page_zero_verdict = ai.mirror_block;
    if (!ai.trajectory_insight && ai.savings_analysis) ai.trajectory_insight = ai.savings_analysis;
    if (!ai.income_insight && ai.revenue_analysis) ai.income_insight = ai.revenue_analysis;
    if (!ai.taxInsight && ai.tax_analysis) ai.taxInsight = ai.tax_analysis;
    if (!ai.estateInsight && ai.estate_analysis) ai.estateInsight = ai.estate_analysis;
    if (!ai.meltdown_insight && ai.meltdown_analysis) ai.meltdown_insight = ai.meltdown_analysis;
    if (!ai.real_estate_insight && ai.property_analysis) ai.real_estate_insight = ai.property_analysis;
    if (!ai.best_move_explainer && ai.priority_actions) ai.best_move_explainer = ai.priority_actions;
    if (!ai.profile_summary && ai.efficiency_gap) ai.profile_summary = ai.efficiency_gap;
    // Map strengths_risks → strengths/vulnerabilities arrays
    if (!ai.strengths && ai.strengths_risks && typeof ai.strengths_risks === 'string') {
      var _parts = ai.strengths_risks.split(/\n/).filter(function(s) { return s.trim(); });
      if (_parts.length > 0 && !ai.strengths) ai.strengths = _parts.slice(0, Math.ceil(_parts.length / 2));
      if (_parts.length > 1 && !ai.vulnerabilities) ai.vulnerabilities = _parts.slice(Math.ceil(_parts.length / 2));
    }
    // Map expert sections → renderer slots
    if (!ai.verdict && ai.sommaire_executif) ai.verdict = ai.sommaire_executif;
    if (!ai.trajectory_insight && ai.projection_patrimoine) ai.trajectory_insight = ai.projection_patrimoine;
    if (!ai.income_insight && ai.revenus_retraite) ai.income_insight = ai.revenus_retraite;
    if (!ai.taxInsight && ai.analyse_fiscale) ai.taxInsight = ai.analyse_fiscale;
    if (!ai.riskInsight && ai.diagnostic_robustesse) ai.riskInsight = ai.diagnostic_robustesse;
    if (!ai.corp_insight && ai.corporatif) ai.corp_insight = ai.corporatif;
    if (!ai.debt_insight && ai.dettes) ai.debt_insight = ai.dettes;
    if (!ai.real_estate_insight && ai.immobilier) ai.real_estate_insight = ai.immobilier;
    // Map overall assessment slot
    if (!ai.overall_assessment && ai.overallAssessment) ai.overall_assessment = ai.overallAssessment;
    if (!ai.overall_assessment && ai.executive_summary) ai.overall_assessment = ai.executive_summary;
    // Map new distinct slots (family, GIS, RSU)
    if (!ai.family_insight && ai.familyInsight) ai.family_insight = ai.familyInsight;
    if (!ai.family_insight && ai.famille) ai.family_insight = ai.famille;
    if (!ai.gis_insight && ai.gisInsight) ai.gis_insight = ai.gisInsight;
    if (!ai.gis_insight && ai.srg_analysis) ai.gis_insight = ai.srg_analysis;
    if (!ai.rsu_insight && ai.rsuInsight) ai.rsu_insight = ai.rsuInsight;
    if (!ai.rsu_insight && ai.actions_rsu) ai.rsu_insight = ai.actions_rsu;
    var rm = data.rptMode || p.mode || "standard";
    if (rm === "essentiel") rm = "standard";
    var rl = data.rptLang || p.lang || "fr";
    var fr = rl === "fr";

    // Fallback MC from deterministic
    var _hasMCBase = mc && mc.pD && mc.pD.length > 0;
    if (!_hasMCBase && detRun && detRun.schedule && detRun.schedule.length > 0) {
      var _detP = detRun.schedule.map(function(r) {
        var rr = r.balRR || 0, tf = r.balTF || 0, nrV = r.balNR || 0;
        var other = (r.balCRR || 0) + (r.balCTF || 0) + (r.balCNR || 0);
        var total = rr + tf + nrV + other;
        return { age: r.age, mp_total: total, mp_rr: rr, mp_tf: tf, mp_nr: nrV, mp_tax: r.tax || 0, mp_withdraw: r.ret || 0, rmp_total: total, rmp_rr: rr, rmp_tf: tf, rmp_nr: nrV };
      });
      mc = { _placeholder: true, pD: _detP, revData: detRun.schedule, medRevData: detRun.schedule, rMedF: detRun.finalBal || 0, medF: detRun.finalBal || 0, succ: null };
    }

    // Guard: no data at all
    if (!mc || !mc.pD || mc.pD.length === 0) {
      return { empty: true, mcComputing: mcComputing, fr: fr, rm: rm };
    }

    // Param extraction
    var age = p.age, retAge = p.retAge, deathAge = p.deathAge;
    var prov = p.prov || "QC";
    var hasMC = mc && mc.pD && mc.pD.length > 0 && !mc._placeholder && mc.succ != null;
    var succVal = hasMC ? mc.succ : null;
    var exp = rm === "expert";
    var std = rm === "standard";
    var _isQC = prov === "QC";

    // Revenue data
    var revData = mc.medRevData || mc.revData || [];
    var totalBal = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0) + (p.liraBal || 0) + (p.fhsaBal || 0) + (p.cOn ? (p.cRRSP || 0) + (p.cTFSA || 0) + (p.cNR || 0) : 0);

    // Government benefits — static snapshot used as fallback only.
    // Real numbers come from revData (path-derived) so KPIs stay consistent with charts.
    var _qppSnap = calcQPP(p.qppAge || 65, p.avgE || 0, p.qppYrs || 0);
    var _oasSnap = calcOAS(p.oasAge || 65, (p.retSpM || 0) * 12);
    var cQppM = p.cOn ? calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) : 0;
    var cOasM = p.cOn ? calcOAS(p.cOasAge || 65, (p.cRetSpM || 0) * 12) : 0;
    var totalSpM = (p.retSpM || 0) + (p.cOn ? (p.cRetSpM || 0) : 0);

    // Path-derived steady state: average across retirement years where both QPP and OAS are flowing.
    // This keeps the KPI band, snapshot text, and revenue chart numerically aligned.
    var _retPathRows = revData.filter(function(r) { return (r.age || 0) >= (retAge || 65); });
    var _bothOnRows = _retPathRows.filter(function(r) { return (r.rrq || 0) > 0 && (r.psv || 0) > 0; });
    var _useRows = _bothOnRows.length > 0 ? _bothOnRows : _retPathRows;
    var govY, spendY, qppM, oasM;
    if (_useRows.length > 0) {
      govY = _useRows.reduce(function(s, r) { return s + (r.rrq || 0) + (r.psv || 0) + (r.pen || 0); }, 0) / _useRows.length;
      spendY = _useRows.reduce(function(s, r) { return s + (r.sp || r.spending || r.spend || 0); }, 0) / _useRows.length;
      qppM = _useRows.reduce(function(s, r) { return s + (r.rrq || 0); }, 0) / _useRows.length / 12;
      oasM = _useRows.reduce(function(s, r) { return s + (r.psv || 0); }, 0) / _useRows.length / 12;
    } else {
      govY = (_qppSnap + _oasSnap + (p.cOn ? cQppM + cOasM : 0)) * 12;
      spendY = totalSpM * 12;
      qppM = _qppSnap;
      oasM = _oasSnap;
    }
    var govM = govY / 12;
    var covRatio = spendY > 0 ? govY / spendY : 0;
    var gapM = Math.max(0, (spendY / 12) - govM);

    // MER weighted
    var merWt = totalBal > 0 ? ((p.merR || 0) * (p.rrsp || 0) + (p.merT || 0) * (p.tfsa || 0) + (p.merN || 0) * (p.nr || 0)) / Math.max(1, (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0)) : 0;

    // Tax alpha
    var _optTax = revData.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var _naiveTax = 0;
    var _hasNaive = p.wStrat === "optimized" && mc._naiveMC && mc._naiveMC.medRevData;
    if (_hasNaive) _naiveTax = (mc._naiveMC.medRevData || []).reduce(function(s, r) { return s + (r.tax || 0); }, 0);
    var _taxAlpha = _hasNaive ? _naiveTax - _optTax : null;
    var avgEffRate = _optTax > 0 ? _optTax / Math.max(1, revData.reduce(function(s, r) { return s + (r.taxInc || 0); }, 0)) : 0;
    var oasClbkYrs = revData.filter(function(r) {
      var yr = Math.max(0, (r.age || 0) - age);
      var thr = OAS_CLAWBACK_THR * Math.pow(1 + (p.inf || 0.02), yr);
      return (r.taxInc || 0) > thr;
    }).length;

    // Fee impact
    var horizon = Math.max(10, (deathAge || 90) - age);
    var feeCost = 0, bG = totalBal;
    for (var fi = 0; fi < horizon; fi++) { bG *= (1 + 0.06); feeCost += bG * merWt; }

    // Retirement row — portfolio balance at retirement for withdrawal rate
    var _retRow = revData.filter(function(r) { return r.age === retAge; })[0];
    var _retPD = mc.pD ? mc.pD.find(function(r) { return r.age === retAge; }) : null;
    var _retBal = 0;
    if (_retRow && (_retRow.balRR != null || _retRow.balTF != null || _retRow.balNR != null)) {
      _retBal = (_retRow.balRR || 0) + (_retRow.balTF || 0) + (_retRow.balNR || 0) + (_retRow.balCRR || 0) + (_retRow.balCTF || 0) + (_retRow.balCNR || 0) + (_retRow.balLIRA || 0);
    } else if (_retPD) {
      _retBal = _retPD.mp_total || _retPD.rmp_total || 0;
    } else {
      _retBal = totalBal;
    }
    var _wdPct = _retRow && _retBal > 1000 ? ((_retRow.ret || 0) / _retBal * 100).toFixed(1) : null;

    // Profile detection
    var R = window.BFmt.detectProfile(p, mc);

    // Sensitivity data
    var sensData = [];
    if (mc._sensReturn) sensData.push({ label: fr ? "Rendements" : "Returns", lo: mc._sensReturn.lo || 0, hi: mc._sensReturn.hi || 0 });
    if (mc._sensInflation) sensData.push({ label: "Inflation", lo: mc._sensInflation.lo || 0, hi: mc._sensInflation.hi || 0 });
    if (mc._sensSpending) sensData.push({ label: fr ? "D\u00e9penses" : "Spending", lo: mc._sensSpending.lo || 0, hi: mc._sensSpending.hi || 0 });
    if (mc._sensMortality) sensData.push({ label: fr ? "Long\u00e9vit\u00e9" : "Longevity", lo: mc._sensMortality.lo || 0, hi: mc._sensMortality.hi || 0 });

    // Extract first names for narrative personalization
    var _fn = (client.firstName || (client.name || '').split(/\s+/)[0] || '').trim();
    var _sfn = (client.spouseFirstName || (client.spouseName || p.cSpouseName || '').split(/\s+/)[0] || '').trim();

    return {
      empty: false,
      mc: mc,
      detRun: detRun,
      mcComputing: mcComputing,
      p: p,
      client: client,
      ai: ai,
      finLiteracy: data.finLiteracy || p.finLiteracy || "intermediate",
      stressLevel: data.stressLevel || p.stressLevel || "moderate",
      detailPref: data.detailPref || p.detailPref || "balanced",
      fn: _fn,
      sfn: _sfn,
      rm: rm,
      rl: rl,
      fr: fr,
      exp: exp,
      std: std,
      hasMC: hasMC,
      succVal: succVal,
      R: R,
      _isQC: _isQC,
      revData: revData,
      totalBal: totalBal,
      qppM: qppM,
      oasM: oasM,
      cQppM: cQppM,
      cOasM: cOasM,
      govM: govM,
      govY: govY,
      totalSpM: totalSpM,
      spendY: spendY,
      covRatio: covRatio,
      gapM: gapM,
      merWt: merWt,
      _optTax: _optTax,
      _naiveTax: _naiveTax,
      _hasNaive: _hasNaive,
      _taxAlpha: _taxAlpha,
      avgEffRate: avgEffRate,
      oasClbkYrs: oasClbkYrs,
      horizon: horizon,
      feeCost: feeCost,
      _retRow: _retRow,
      _retBal: _retBal,
      _wdPct: _wdPct,
      sensData: sensData
    };
  }

  // ══════════════════════════════════════════════════════════════
  // EXPORT
  // ══════════════════════════════════════════════════════════════

  window.BData = Object.freeze({
    // Constants
    TAX_BASE_YEAR: TAX_BASE_YEAR,
    FED_BRACKETS: FED_BRACKETS,
    FED_RATES: FED_RATES,
    FED_PERSONAL: FED_PERSONAL,
    OAS_CLAWBACK_THR: OAS_CLAWBACK_THR,
    OAS_MAX_MONTHLY: OAS_MAX_MONTHLY,
    GIS_MAX_SINGLE: GIS_MAX_SINGLE,
    GIS_MAX_COUPLE: GIS_MAX_COUPLE,
    QPP_MAX_MONTHLY: QPP_MAX_MONTHLY,
    QPP_MGA: QPP_MGA,
    QPP_YAMPE: QPP_YAMPE,
    CFG_SMOOTH: CFG_SMOOTH,
    PROV_TAX: PROV_TAX,
    // Engine functions
    calcTax: calcTax,
    calcQPP: calcQPP,
    calcOAS: calcOAS,
    calcPayroll: calcPayroll,
    // Data builder
    buildReportPayload: buildReportPayload
  });

})();
