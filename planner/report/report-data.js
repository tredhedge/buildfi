// report-data.js — BuildFi Report Data & Engine Helpers
// Depends on: report-formatters.js (window.BFmt)
// Exports: window.BData
(function() {
  "use strict";

  // ══════════════════════════════════════════════════════════════
  // NAMED CONSTANTS (2026 PAG) — mirrors planner_v2.html engine
  // ══════════════════════════════════════════════════════════════

  // ── A0: SINGLE SOURCE OF TRUTH ──────────────────────────────────────
  // Read from window.BFConstants (loaded by report/report-constants-2026.js).
  // No inline literal allowed here. Drift: GIS_MAX_COUPLE was 667.41 vs
  // canon 665.41 — fixed at the shim. To update: edit the shim ONLY.
  var _C = (typeof window !== 'undefined' && window.BFConstants) ? window.BFConstants : (typeof global !== 'undefined' && global.BFConstants ? global.BFConstants : {});
  var TAX_BASE_YEAR = _C.TAX_BASE_YEAR;
  var FED_BRACKETS = _C.FED_BRACKETS;
  var FED_RATES = _C.FED_RATES;
  var FED_PERSONAL = _C.FED_PERSONAL;
  var OAS_CLAWBACK_THR = _C.OAS_CLAWBACK_THR;
  var OAS_MAX_MONTHLY = _C.OAS_MAX_MONTHLY;
  var GIS_MAX_SINGLE = _C.GIS_MAX_SINGLE;
  var GIS_MAX_COUPLE = _C.GIS_MAX_COUPLE;
  var QPP_MAX_MONTHLY = _C.QPP_MAX_MONTHLY;
  var QPP_MGA = _C.QPP_MGA;
  var QPP_YAMPE = _C.QPP_YAMPE;
  var QPP2_MAX_MONTHLY = _C.QPP2_MAX_MONTHLY;
  var PENSION_CREDIT_MAX = _C.PENSION_CREDIT_MAX;
  var TFSA_LIMIT_2026 = _C.TFSA_LIMIT_2026;

  var CFG_SMOOTH = {
    MELT: 0.40, MELT_FLOOR: 5000,
    SPEND: 0.30, SPEND_FLOOR: 10000,
    BACK: 0.40, BACK_FLOOR: 15000,
    NR_OVER: 1.5, MC_BLEND: 0.70
  };

  // Cohort percentile benchmarks for retirement-plan success rate.
  // Indicative bands derived from typical Canadian retirement-readiness
  // patterns by age decade × asset bucket. Use as professional context only
  // ("your 91% is in the X percentile") — not as advice or guarantee.
  // Buckets (savings $): 0=under-100K, 1=100-300K, 2=300-700K, 3=700K-1.5M, 4=1.5M+
  // Each entry: median typical success rate. Linear interp to give percentile feel.
  var COHORT_BENCHMARKS = {
    // age decade key → array indexed by asset bucket
    20: [0.45, 0.62, 0.78, 0.86, 0.92],
    30: [0.42, 0.60, 0.76, 0.85, 0.91],
    40: [0.38, 0.55, 0.72, 0.83, 0.90],
    50: [0.32, 0.50, 0.68, 0.80, 0.88],
    60: [0.28, 0.45, 0.65, 0.78, 0.86],
    70: [0.30, 0.50, 0.70, 0.82, 0.88]
  };

  function cohortBucket(savings) {
    if (savings < 100000) return 0;
    if (savings < 300000) return 1;
    if (savings < 700000) return 2;
    if (savings < 1500000) return 3;
    return 4;
  }

  function cohortPercentile(succRate, age, savings) {
    if (succRate == null) return null;
    var ageDec = Math.max(20, Math.min(70, Math.floor((age || 40) / 10) * 10));
    var bucket = cohortBucket(savings || 0);
    var typical = (COHORT_BENCHMARKS[ageDec] || COHORT_BENCHMARKS[40])[bucket];
    if (typical == null) return null;
    // Map distance to percentile via simple sigmoid: 0.5 → ~50th percentile.
    var diff = succRate - typical;
    // Each 0.05 (5pts) above typical → +20 percentile points; clamped.
    var pct = 50 + Math.round(diff / 0.05 * 20);
    return { typical: typical, percentile: Math.max(5, Math.min(95, pct)) };
  }

  // ══════════════════════════════════════════════════════════════
  // PROVINCIAL TAX BRACKETS (2026)
  // ══════════════════════════════════════════════════════════════

  // PROV_TAX from canonical shim. A0 — single source of truth.
  var PROV_TAX = _C.PROV_TAX;

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
    // Codex audit found rendered coverage diverged from canonical because
    // we previously averaged ONLY over rows where both primary CPP and OAS
    // were firing (skipping early-retirement years). Canonical contract
    // averages over ALL retirement rows. Aligning here so the same number
    // appears in cover, KPI, narrative, and review-pack.
    var _useRows = _retPathRows;
    // P1.1 (data plumbing) — guaranteed income is HOUSEHOLD: primary + spouse
    // public benefits + employer pension. The "Cher reader sees a 41% coverage
    // because the report computed primary-only" bug was caused by ignoring
    // r.cRrq / r.cPsv / r.cSrg / r.cPen here. Fixed.
    var govY, spendY, qppM, oasM;
    // ── A3: govY / spendY now use scope-tagged engine fields ────────
    // spend_target (target spending) is the canonical denominator. The
    // legacy `r.spend` field (= funded) is a back-compat fallback only;
    // when both are present, target wins. Numerator sums household
    // public benefits + employer pension across both spouses.
    if (_useRows.length > 0) {
      govY = _useRows.reduce(function(s, r) {
        return s
          + (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0) + (r.pen || 0)
          + (r.cRrq || 0) + (r.cPsv || 0) + (r.cSrg || 0) + (r.cPen || 0);
      }, 0) / _useRows.length;
      // Codex finding 3: use spend_target (engine A1+A2) so coverage
      // doesn't flatter when plan is starving.
      spendY = _useRows.reduce(function(s, r) {
        return s + (r.spend_target != null ? r.spend_target : (r.sp || r.spending || r.spend || 0));
      }, 0) / _useRows.length;
      qppM = _useRows.reduce(function(s, r) { return s + (r.rrq || 0) + (r.cRrq || 0); }, 0) / _useRows.length / 12;
      oasM = _useRows.reduce(function(s, r) { return s + (r.psv || 0) + (r.cPsv || 0); }, 0) / _useRows.length / 12;
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

    // ── A3: Tax metrics now use scope-tagged household fields ────────
    // _optTax (legacy name, kept for backward compat) = household tax
    // sum on the modeled retirement horizon. avgEffRate denominator now
    // uses taxInc_household (Codex finding 2: previously household-tax
    // / primary-taxable-income gave nonsense ratio).
    var _optTax = revData.reduce(function(s, r) {
      return s + ((r.tax_household != null ? r.tax_household : r.tax) || 0);
    }, 0);
    // Defect 4 cross-section fix: real-dollar deflated household tax,
    // matching review-contract.js lifetime_tax_real exactly. The legacy
    // _optTax is NOMINAL sum (compounds inflation). Sections that quote
    // "lifetime tax" to the reader (closing recap, tax narrative) MUST
    // use _optTaxReal so the value reconciles across the report and
    // matches the canonical metric the auditor enforces.
    var _optTaxReal = revData.reduce(function(s, r) {
      if (r.age < (p.retAge || 65)) return s;
      var infY = Math.pow(1 + (p.inf || 0.021), r.age - (p.age || 0));
      return s + ((r.tax_household != null ? r.tax_household : r.tax) || 0) / infY;
    }, 0);
    var _naiveTax = 0;
    var _hasNaive = p.wStrat === "optimized" && mc._naiveMC && mc._naiveMC.medRevData;
    if (_hasNaive) {
      _naiveTax = (mc._naiveMC.medRevData || []).reduce(function(s, r) {
        return s + ((r.tax_household != null ? r.tax_household : r.tax) || 0);
      }, 0);
    }
    var _taxAlpha = _hasNaive ? _naiveTax - _optTax : null;
    var avgEffRate = _optTax > 0
      ? _optTax / Math.max(1, revData.reduce(function(s, r) {
          return s + ((r.taxInc_household != null ? r.taxInc_household : r.taxInc) || 0);
        }, 0))
      : 0;
    var oasClbkYrs = revData.filter(function(r) {
      var yr = Math.max(0, (r.age || 0) - age);
      // Inflation default 0.021 — must match review-contract.js so the
      // canonical and renderer compute identical OAS clawback counts.
      var thr = OAS_CLAWBACK_THR * Math.pow(1 + (p.inf || 0.021), yr);
      // Use taxInc_primary for OAS clawback (OAS clawback applies per-
      // person on Line 23600, NOT on household-summed income). For
      // couple profiles, household sum overstated clawback. Codex
      // finding 1: same metric had different values across sections.
      var personInc = (r.taxInc_primary != null ? r.taxInc_primary : (r.taxInc || 0));
      return personInc > thr;
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

    // Sensitivity data — Phase 2 pipeline populates `mc._sweeps` with real
    // perturbed MC runs (returns ±1%, inflation ±1%). Each row is {label, lo, hi}
    // where lo/hi are deltas vs baseline medF. The legacy `_sensReturn` et al.
    // fields (closed-form) are never emitted by the v2 engine — we only read sweeps.
    var sensData = [];
    var _baseMedF = (mc && (mc.rMedF != null ? mc.rMedF : mc.medF)) || 0;
    if (mc && mc._sweeps && mc._sweeps.returns && mc._sweeps.returns.up && mc._sweeps.returns.down) {
      sensData.push({
        label: fr ? "Rendements \u00b1 1 %" : "Returns \u00b1 1%",
        lo: (mc._sweeps.returns.down.medF || 0) - _baseMedF,
        hi: (mc._sweeps.returns.up.medF || 0) - _baseMedF
      });
    }
    if (mc && mc._sweeps && mc._sweeps.inflation && mc._sweeps.inflation.up && mc._sweeps.inflation.down) {
      sensData.push({
        label: fr ? "Inflation \u00b1 1 %" : "Inflation \u00b1 1%",
        lo: (mc._sweeps.inflation.down.medF || 0) - _baseMedF,
        hi: (mc._sweeps.inflation.up.medF || 0) - _baseMedF
      });
    }

    // Extract first names for narrative personalization
    var _fn = (client.firstName || (client.name || '').split(/\s+/)[0] || '').trim();
    var _sfn = (client.spouseFirstName || (client.spouseName || p.cSpouseName || '').split(/\s+/)[0] || '').trim();

    // ── Hero Score (composite 0-100) ─────────────────────────────────
    // Formula spec — locked, deterministic, NO Monte Carlo variance.
    // Same profile must always score the same. Each component traces
    // to a canonical metric or directly observable input. Bands are
    // defined by thresholds the thesis-coherence-auditor recognizes.
    //
    // Components (5):
    //   • plan_resilience   (40%) = success_rate × 100
    //   • savings_rate      (20%) = annual contributions / gross income,
    //                                normalized to 25% = 100. Above 25% caps.
    //   • tax_efficiency    (15%) = 100 − (avgEffRate × 200), capped 0-100.
    //                                A 20% effective rate scores 60;
    //                                a 50%+ rate scores 0.
    //   • diversification   (15%) = (1 / Σwᵢ²) / 4 × 100, where wᵢ are
    //                                portfolio shares across {RRSP, TFSA,
    //                                NR, LIRA, corp}. 4 effective buckets
    //                                = 100 (perfectly spread).
    //   • liquidity         (10%) = (TFSA + NR) / annual_spending × 100,
    //                                capped at 100. 12 months coverage
    //                                = 100.
    //
    // Bands (matched to thesis-coherence vocabulary):
    //   ≥85 → surplus  (gold)
    //   ≥65 → solid    (green)
    //   ≥40 → fragile  (amber)
    //   <40 → at-risk  (red)
    //
    // The breakdown panel renders next to the gauge so the score is
    // never a black-box number — every reader can see the math.
    function _scoreOrNull(v) { return v == null || !isFinite(v) ? null : Math.max(0, Math.min(100, v)); }
    var _scComponents = {};
    _scComponents.plan_resilience = succVal != null ? _scoreOrNull(succVal * 100) : null;
    var _scGrossInc = (p.sal || 0) + (p.cOn ? (p.cSal || 0) : 0);
    var _scAnnContrib = (p.rrspC || 0) + (p.tfsaC || 0) + (p.nrC || 0)
                      + (p.cOn ? ((p.cRrspC || 0) + (p.cTfsaC || 0) + (p.cNrC || 0)) : 0);
    _scComponents.savings_rate = _scGrossInc > 0
      ? _scoreOrNull(((_scAnnContrib / _scGrossInc) / 0.25) * 100)
      : null;
    _scComponents.tax_efficiency = avgEffRate != null && _optTax > 0
      ? _scoreOrNull(100 - avgEffRate * 200)
      : null;
    var _scPots = [
      (p.rrsp || 0) + (p.cOn ? (p.cRRSP || 0) : 0),
      (p.tfsa || 0) + (p.cOn ? (p.cTFSA || 0) : 0),
      (p.nr || 0)   + (p.cOn ? (p.cNR || 0) : 0),
      (p.liraBal || 0) + (p.cOn ? (p.cLira || 0) : 0),
      (p.bizRetainedEarnings || 0)
    ];
    var _scTotalPots = _scPots.reduce(function(s, v) { return s + v; }, 0);
    if (_scTotalPots > 0) {
      var _hhi = _scPots.reduce(function(s, v) { var w = v / _scTotalPots; return s + w * w; }, 0);
      var _effBuckets = 1 / _hhi; // 1 = single bucket, 5 = perfectly even
      _scComponents.diversification = _scoreOrNull((_effBuckets / 4) * 100);
    } else {
      _scComponents.diversification = null;
    }
    var _scLiquid = (p.tfsa || 0) + (p.nr || 0) + (p.cOn ? ((p.cTFSA || 0) + (p.cNR || 0)) : 0);
    var _scAnnSpend = spendY > 0 ? spendY : (totalSpM > 0 ? totalSpM * 12 : 0);
    _scComponents.liquidity = _scAnnSpend > 0
      ? _scoreOrNull((_scLiquid / _scAnnSpend) * 100)
      : null;
    var _scWeights = { plan_resilience: 0.40, savings_rate: 0.20, tax_efficiency: 0.15, diversification: 0.15, liquidity: 0.10 };
    var _scTotal = 0, _scWeightSum = 0;
    Object.keys(_scWeights).forEach(function(k) {
      if (_scComponents[k] != null) {
        _scTotal += _scComponents[k] * _scWeights[k];
        _scWeightSum += _scWeights[k];
      }
    });
    var _scValue = _scWeightSum > 0 ? Math.round(_scTotal / _scWeightSum) : null;
    var _scBand = null;
    if (_scValue != null) {
      if (_scValue >= 85) _scBand = 'surplus';
      else if (_scValue >= 65) _scBand = 'solid';
      else if (_scValue >= 40) _scBand = 'fragile';
      else _scBand = 'at-risk';
    }
    var heroScore = {
      value: _scValue,
      band: _scBand,
      components: _scComponents,
      weights: _scWeights
    };

    // ── C0: Single-thesis anchor (document coherence layer) ──────────
    // One deterministic posture for the whole report. Cover, exec
    // summary, advisor-letter fallback, and closing recap all read
    // from this so the document speaks with one voice. Words match the
    // BAND_VOCAB the thesis-coherence-auditor enforces, so deterministic
    // and AI text can never disagree on posture.
    function _thesisBand(s, c) {
      // Thresholds calibrated 2026-04-27: align renderer + thesis-coherence
      // auditor in lockstep. Earlier 0.90/0.75/0.50/0.25 was too generous on
      // the upper end and too strict on the lower end (37% read as
      // "at-risk" felt apocalyptic; 91% with cov<1 read as "solid" undersold
      // a strong plan). New thresholds match user mental model:
      //   ≥85% AND cov≥1.0 → surplus    (genuine head-room)
      //   ≥85% but cov<1   → solid       (high success but tight cashflow)
      //   ≥60%             → solid
      //   ≥30%             → fragile
      //   ≥10%             → at-risk
      //   <10%             → failure
      if (s == null) return null;
      if (s >= 0.85 && c >= 1.0) return 'surplus';
      if (s >= 0.60)             return 'solid';
      if (s >= 0.30)             return 'fragile';
      if (s >= 0.10)             return 'at-risk';
      return 'failure';
    }
    var _band = _thesisBand(succVal, covRatio);
    var _bLabel = {
      surplus:  { fr: 'Plan en surplus',              en: 'Plan in surplus' },
      solid:    { fr: 'Plan solide',                  en: 'Solid plan' },
      fragile:  { fr: 'Plan fragile',                 en: 'Fragile plan' },
      'at-risk':{ fr: 'Plan \u00e0 risque',           en: 'At-risk plan' },
      failure:  { fr: 'Plan non viable en l\'\u00e9tat', en: 'Plan not sustainable as is' }
    };
    var _bandLabel = _band ? _bLabel[_band][fr ? 'fr' : 'en'] : (fr ? 'Plan en analyse' : 'Plan under analysis');
    var _succPct = succVal != null ? Math.round(succVal * 100) : null;
    var _covPct = covRatio > 0 ? Math.round(covRatio * 100) : null;
    var _medF = (mc && (mc.rMedF != null ? mc.rMedF : mc.medF)) || 0;
    var _oneLiner;
    if (_band == null) {
      _oneLiner = fr ? 'Trajectoire en cours d\'analyse.' : 'Trajectory under analysis.';
    } else if (_band === 'surplus' || _band === 'solid') {
      _oneLiner = fr
        ? _bandLabel + ' \u2014 taux de succ\u00e8s ' + _succPct + ' % sur ' + horizon + ' ans, le revenu garanti couvre ' + (_covPct != null ? _covPct + ' %' : '\u2014') + ' des d\u00e9penses cibles.'
        : _bandLabel + ' \u2014 ' + _succPct + '% success over ' + horizon + ' years; guaranteed income covers ' + (_covPct != null ? _covPct + '%' : '\u2014') + ' of target spending.';
    } else if (_band === 'fragile') {
      _oneLiner = fr
        ? _bandLabel + ' \u2014 taux de succ\u00e8s ' + _succPct + ' %\u202f; la marge contre les impr\u00e9vus est mince et des ajustements cibl\u00e9s rendraient la trajectoire plus confortable.'
        : _bandLabel + ' \u2014 ' + _succPct + '% success; margin against the unexpected is thin and targeted adjustments would make the trajectory more comfortable.';
    } else if (_band === 'at-risk') {
      _oneLiner = fr
        ? _bandLabel + ' \u2014 taux de succ\u00e8s ' + _succPct + ' %\u202f; des ajustements structurels (\u00e9pargne, d\u00e9penses, horizon) seraient \u00e0 consid\u00e9rer.'
        : _bandLabel + ' \u2014 ' + _succPct + '% success; structural adjustments (savings, spending, horizon) could shift the trajectory.';
    } else {
      _oneLiner = fr
        ? _bandLabel + ' \u2014 taux de succ\u00e8s ' + _succPct + ' %\u202f; une r\u00e9vision globale serait n\u00e9cessaire pour r\u00e9tablir la trajectoire.'
        : _bandLabel + ' \u2014 ' + _succPct + '% success; a global review would be necessary to restore the trajectory.';
    }
    var thesis = {
      band: _band,
      bandLabel: _bandLabel,
      succPct: _succPct,
      covPct: _covPct,
      medFinalWealth: _medF,
      horizonYears: horizon,
      oneLiner: _oneLiner
    };

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
      // CLASSIFIER-RENDER-PLAN Phase 1: derive renderProfile from the
      // three classifiers so downstream renderer/auditor/AI prompt have
      // a single dispatch object. Phase 1 is purely additive — nothing
      // reads from this yet. Phase 2-6 wire the consumers.
      renderProfile: (function() {
        var fL = data.finLiteracy || p.finLiteracy || "intermediate";
        var sL = data.stressLevel || p.stressLevel || "moderate";
        var dP = data.detailPref || p.detailPref || "balanced";
        var sku = data.sku || p.sku || "bilan";
        var rpMod = (typeof window !== 'undefined' && window.BFRenderProfile)
          ? window.BFRenderProfile
          : (typeof require === 'function' ? (function() { try { return require('./report-render-profile.js'); } catch (e) { return null; } })() : null);
        return rpMod && typeof rpMod.deriveRenderProfile === 'function'
          ? rpMod.deriveRenderProfile(fL, sL, dP, sku)
          : null;
      })(),
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
      _optTaxReal: _optTaxReal,
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
      sensData: sensData,
      thesis: thesis,
      heroScore: heroScore
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
    // Cohort benchmarking
    cohortPercentile: cohortPercentile,
    COHORT_BENCHMARKS: COHORT_BENCHMARKS,
    // Data builder
    buildReportPayload: buildReportPayload
  });

})();
