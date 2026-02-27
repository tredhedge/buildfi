// /lib/engine/index.js
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Monte Carlo Engine — SERVER-ONLY
// ══════════════════════════════════════════════════════════════════════
// Extracted from planner_v2.html (436 tests, 53 categories, 0 failures)
// Source version: v2 — 2026-02-27
// DO NOT modify calculation logic. Every constant, formula, edge case
// matches the validated planner exactly.
//
// This file runs EXCLUSIVELY in API routes (server-side).
// It is NEVER imported by client-side code.
// ══════════════════════════════════════════════════════════════════════
/* eslint-disable */
// @ts-nocheck — This is a mechanical port; strict TS comes in P4

export var TAX_BASE_YEAR = 2026; // All tax constants below are 2026 values; indexed by CPI in calcTax
export var FED_BRACKETS = [58523, 117045, 181440, 258482]; // 2026 federal brackets
export var FED_RATES = [0.14, 0.205, 0.26, 0.29, 0.33];
export var FED_PERSONAL = 16452; // 2026 basic personal amount
export var OAS_CLAWBACK_THR = 95323; // 2026 OAS recovery threshold
export var OAS_MAX_MONTHLY = 742.31;
export var GIS_MAX_SINGLE = 1105.43; // 2026 Q1
export var GIS_MAX_COUPLE = 665.41; // 2026 Q1 (spouse receives full OAS)
export var QPP_MAX_MONTHLY = 1507.65; // 2026 CPP/QPP max monthly at 65 (incl. enhancement)
export var QPP_MGA = 74600; // 2026 YMPE
export var QPP_YAMPE = 85000; // 2026 YAMPE
export var QPP2_MAX_MONTHLY = 81.00; // 2026 est. CPP2 max monthly enhancement
export var PENSION_CREDIT_MAX = 2000;
export var TFSA_LIMIT_2026 = 7000;
// === END NAMED CONSTANTS ===
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// TAX BRACKETS \u2014 Federal: 2025 (CRA T1 General)
//                Provincial: 2025 (respective provincial tax acts)
// Sources: canada.ca/en/revenue-agency, revenuquebec.ca
// Federal personal amount: $16,452 (2026), indexed annually
// QC abatement: 16.5% federal tax reduction (fixed)
// Last verified: February 2026
// To update: replace bracket thresholds, rates, personal amounts
// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
export var PROV_TAX = {
  // eligDivCr / nonEligDivCr: provincial dividend tax credit rates (% of grossed-up amount)
  // Ref: PASSATION_CCPC_MODULE.md §2.4 — RCGT / EY 2025-2026 tables
  QC: { b: [54345, 108730, 132245], r: [0.14, 0.19, 0.24, 0.2575], pd: 18952, abate: 0.835, eligDivCr: 0.1118, nonEligDivCr: 0.039362 , ageAmt: 3903, ageThresh: 0, penAmt: 2918 },
  ON: { b: [53891, 107785, 15e4, 22e4], r: [0.0505, 0.0915, 0.1116, 0.1216, 0.1316], pd: 12091, abate: 1, eligDivCr: 0.10, nonEligDivCr: 0.029863 , ageAmt: 5286, ageThresh: 42335, penAmt: 1580 },
  BC: { b: [49159, 98320, 112883, 137073, 185854, 259197], r: [0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205], pd: 12901, abate: 1, eligDivCr: 0.12, nonEligDivCr: 0.0196 , ageAmt: 5766, ageThresh: 42660, penAmt: 1000 },
  AB: { b: [154259, 185203, 246938, 370220], r: [0.1, 0.12, 0.13, 0.14, 0.15], pd: 22769, abate: 1, eligDivCr: 0.0812, nonEligDivCr: 0.0218 , ageAmt: 5553, ageThresh: 43906, penAmt: 1491 },
  SK: { b: [54532, 155805], r: [0.105, 0.125, 0.145], pd: 20381, abate: 1, eligDivCr: 0.11, nonEligDivCr: 0.02105 , ageAmt: 5518, ageThresh: 0, penAmt: 1000 },
  MB: { b: [47e3, 1e5], r: [0.108, 0.1275, 0.174], pd: 15780, abate: 1, eligDivCr: 0.08, nonEligDivCr: 0.007835 , ageAmt: 3728, ageThresh: 0, penAmt: 1000 },
  NB: { b: [51306, 102614, 190081], r: [0.094, 0.14, 0.16, 0.195], pd: 13396, abate: 1, eligDivCr: 0.14, nonEligDivCr: 0.027518 , ageAmt: 5849, ageThresh: 42553, penAmt: 1000 },
  NS: { b: [30182, 60364, 94860, 153e3], r: [0.0879, 0.1495, 0.1667, 0.175, 0.21], pd: 8651, abate: 1, eligDivCr: 0.0885, nonEligDivCr: 0.021568 , ageAmt: 4897, ageThresh: 0, penAmt: 1000 },
  PE: { b: [33538, 67079], r: [0.098, 0.138, 0.167], pd: 13865, abate: 1, eligDivCr: 0.105, nonEligDivCr: 0.027 , ageAmt: 4862, ageThresh: 0, penAmt: 1000 },
  NL: { b: [44062, 88123, 157329, 220262, 281387, 562714], r: [0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213], pd: 11034, abate: 1, eligDivCr: 0.063, nonEligDivCr: 0.021739 , ageAmt: 7742, ageThresh: 39880, penAmt: 1000 },
  NT: { b: [51963, 103931, 169067], r: [0.059, 0.086, 0.122, 0.1405], pd: 17041, abate: 1, eligDivCr: 0.115, nonEligDivCr: 0.02302 , ageAmt: 8200, ageThresh: 0, penAmt: 1000 },
  YT: { b: [58523, 117045, 181440, 258482, 5e5], r: [0.064, 0.09, 0.109, 0.128, 0.15, 0.16], pd: 16452, abate: 1, eligDivCr: 0.12689, nonEligDivCr: 0.0135 , ageAmt: 8790, ageThresh: 44325, penAmt: 2000 },
  NU: { b: [54333, 108668, 177231], r: [0.04, 0.07, 0.09, 0.115], pd: 18284, abate: 1, eligDivCr: 0.0551, nonEligDivCr: 0.025904 , ageAmt: 14865, ageThresh: 0, penAmt: 2000 }
};
export function calcTax(inc, yr, prov, infR, retired, divInfo) {
  // Ref: PASSATION_CCPC_MODULE.md §4.1-4.2
  // divInfo = { eligDiv: cash_eligible_dividend, nonEligDiv: cash_non_eligible_dividend } || null
  // If divInfo is null/undefined, behaviour is identical to original (retrocompatibility)
  yr = yr || 0;
  prov = prov || "QC";
  var idx = Math.pow(1 + (infR || 0.02), yr);
  // Dividend gross-up: compute taxable amounts from cash dividends
  var eligTaxable = 0, nonEligTaxable = 0, divCredFed = 0, divCredProv = 0;
  if (divInfo && (divInfo.eligDiv > 0 || divInfo.nonEligDiv > 0)) {
    eligTaxable = (divInfo.eligDiv || 0) * 1.38;     // 38% gross-up for eligible
    nonEligTaxable = (divInfo.nonEligDiv || 0) * 1.15; // 15% gross-up for non-eligible
  }
  var totalTaxableInc = inc + eligTaxable + nonEligTaxable;
  if (totalTaxableInc <= 0) return { total: 0, fed: 0, prov: 0, eff: 0, marg: 0.14, fedEff: 0, provEff: 0, divCredFed: 0, divCredProv: 0 };
  var fb = FED_BRACKETS.map(function(v) {
    return v * idx;
  });
  var fr = FED_RATES;
  var fpd = FED_PERSONAL * idx;
  var penCredit = 0;
  // Pension income credit: 15% × min($2,000, eligible pension income) at 65+
  var _penCreditMax = 2000 * idx;
  // Age credit: 15% × max(0, $8,790 - 15% × max(0, income - $44,325)) — indexed
  var _ageAmt = 8790 * idx;
  var _ageThresh = 44325 * idx;
  // Age credit income test uses total taxable income (incl. grossed-up dividends) — §2.5
  var _ageCreditAmt = Math.max(0, _ageAmt - 0.15 * Math.max(0, totalTaxableInc - _ageThresh));
  var fed = 0, prev = 0;
  for (var i = 0; i < fb.length; i++) {
    if (totalTaxableInc <= fb[i]) {
      fed += (totalTaxableInc - prev) * fr[i];
      prev = totalTaxableInc;
      break;
    }
    fed += (fb[i] - prev) * fr[i];
    prev = fb[i];
    if (i === fb.length - 1) fed += (totalTaxableInc - fb[i]) * fr[i + 1];
  }
  fed = Math.max(0, fed - fpd * fr[0] - (retired ? _penCreditMax * 0.15 : 0) - (retired ? _ageCreditAmt * 0.15 : 0));
  var pt = PROV_TAX[prov] || PROV_TAX.QC;
  // QC abatement applied BEFORE federal dividend credit — §4.6
  fed *= pt.abate;
  // Federal dividend tax credits — §2.3
  if (eligTaxable > 0 || nonEligTaxable > 0) {
    var fedEligCr = eligTaxable * 0.150198;
    var fedNonEligCr = nonEligTaxable * 0.090301;
    divCredFed = fedEligCr + fedNonEligCr;
    fed = Math.max(0, fed - divCredFed); // Credits cannot make tax negative — §4.6
  }
  var pb = pt.b.map(function(v) {
    return v * idx;
  });
  var pr2 = pt.r;
  var ppd = (pt.pd || 0) * idx;
  var ptax = 0;
  prev = 0;
  for (var j = 0; j < pb.length; j++) {
    if (totalTaxableInc <= pb[j]) {
      ptax += (totalTaxableInc - prev) * pr2[j];
      prev = totalTaxableInc;
      break;
    }
    ptax += (pb[j] - prev) * pr2[j];
    prev = pb[j];
    if (j === pb.length - 1) ptax += (totalTaxableInc - pb[j]) * pr2[j + 1];
  }
  ptax = Math.max(0, ptax - ppd * pr2[0]);
  // Provincial age credit (65+) and pension income credit — §2.5
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
  // QC Health contribution abolished in 2019 — removed
  if (prov === "ON") {
    var onSur = 0;
    if (ptax > 4991 * idx) onSur += (ptax - 4991 * idx) * 0.2;
    if (ptax > 6387 * idx) onSur += (ptax - 6387 * idx) * 0.36;
    ptax += onSur;
  }
  // Provincial dividend tax credits — §2.4
  if (eligTaxable > 0 || nonEligTaxable > 0) {
    var provEligCr = eligTaxable * (pt.eligDivCr || 0);
    var provNonEligCr = nonEligTaxable * (pt.nonEligDivCr || 0);
    divCredProv = provEligCr + provNonEligCr;
    ptax = Math.max(0, ptax - divCredProv); // Non-refundable credits floor at 0 — §4.6
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
  return { total, fed: Math.max(0, fed), prov: Math.max(0, ptax), eff: cashInc > 0 ? total / cashInc : 0, marg, fedEff: cashInc > 0 ? Math.max(0, fed) / cashInc : 0, provEff: cashInc > 0 ? Math.max(0, ptax) / cashInc : 0, divCredFed: divCredFed, divCredProv: divCredProv, taxableInc: totalTaxableInc };
}
// ═══════════════════════════════════════════════════════════════
// calcCorpTax() — Corporate tax for CCPC (Ref: PASSATION_CCPC_MODULE.md §4.4)
// Returns: { activeTax, passiveTax, totalTax, rdtohAdded, smallBizPortion,
//            generalPortion, adjustedSBD, effectiveRate }
// ═══════════════════════════════════════════════════════════════
export function calcCorpTax(activeIncome, passiveIncome, prov, yr, infR) {
  var idx = Math.pow(1 + (infR || 0.02), yr || 0);
  var sbd = 500000 * idx; // Business limit (indexed)
  // Passive income grind: SBD reduced $5 per $1 of passive income above $50K — §2.2
  var passiveGrind = Math.max(0, passiveIncome - 50000 * idx);
  var adjustedSBD = Math.max(0, sbd - 5 * passiveGrind);
  // Combined federal+provincial corporate rates by province — §2.1
  var CORP_RATES = {
    QC: { small: 0.122, general: 0.265, passive: 0.5017 },
    ON: { small: 0.122, general: 0.265, passive: 0.5017 },
    BC: { small: 0.11,  general: 0.27,  passive: 0.5067 },
    AB: { small: 0.11,  general: 0.23,  passive: 0.4667 },
    SK: { small: 0.11,  general: 0.27,  passive: 0.5067 },
    MB: { small: 0.11,  general: 0.27,  passive: 0.5067 },
    NB: { small: 0.115, general: 0.29,  passive: 0.5267 },
    NS: { small: 0.115, general: 0.29,  passive: 0.5267 },
    PE: { small: 0.10,  general: 0.31,  passive: 0.5467 },
    NL: { small: 0.12,  general: 0.30,  passive: 0.5367 },
    NT: { small: 0.11,  general: 0.265, passive: 0.5017 },
    YT: { small: 0.11,  general: 0.27,  passive: 0.5067 },
    NU: { small: 0.12,  general: 0.27,  passive: 0.5067 }
  };
  var cr = CORP_RATES[prov] || CORP_RATES.QC;
  // Active income: SBD portion at small rate, remainder at general rate
  var smallBizInc = Math.min(Math.max(0, activeIncome), adjustedSBD);
  var generalInc = Math.max(0, activeIncome - adjustedSBD);
  var activeTax = smallBizInc * cr.small + generalInc * cr.general;
  // Passive investment income: taxed at ~50% — §2.1
  var passiveTax = Math.max(0, passiveIncome) * cr.passive;
  // RDTOH: ~30.67% of passive income added to refundable pool — §2.8
  var rdtohAdded = Math.max(0, passiveIncome) * 0.3067;
  var totalInc = Math.max(0, activeIncome) + Math.max(0, passiveIncome);
  return {
    activeTax: activeTax,
    passiveTax: passiveTax,
    totalTax: activeTax + passiveTax,
    rdtohAdded: rdtohAdded,
    smallBizPortion: smallBizInc,   // generates non-eligible dividends
    generalPortion: generalInc,      // generates eligible dividends via GRIP
    adjustedSBD: adjustedSBD,
    effectiveRate: totalInc > 0 ? (activeTax + passiveTax) / totalInc : 0
  };
}
export function calcQPP(startAge, avgEarn, yrsContrib) {
  var maxM = QPP_MAX_MONTHLY, mga = QPP_MGA;
  var ratio = Math.min(1, avgEarn / mga) * Math.min(1, yrsContrib / 40);
  var adj = 1;
  if (startAge < 65) adj = 1 - 6e-3 * (65 - startAge) * 12;
  else if (startAge > 65) adj = 1 + 7e-3 * (startAge - 65) * 12;
  adj = Math.max(0.64, Math.min(1.42, adj));
  var base = maxM * ratio * adj;
  // QPP2/CPP2: enhancement on earnings between YMPE and YAMPE
  var rrq2 = avgEarn > mga ? QPP2_MAX_MONTHLY * Math.min(1, (Math.min(avgEarn, QPP_YAMPE) - mga) / (QPP_YAMPE - mga)) * Math.min(1, yrsContrib / 40) * adj : 0;
  return base + rrq2;
}
export function calcOAS(startAge, income, yr, infR, currentAge) {
  var idxO = Math.pow(1 + (infR || 0.02), yr || 0);
  var maxM = OAS_MAX_MONTHLY * idxO, adj = 1;
  if (startAge > 65) adj = 1 + 6e-3 * (startAge - 65) * 12;
  adj = Math.min(1.36, adj);
  var oas = maxM * adj;
  // OAS 75+ enhancement: 10% bonus (since July 2022)
  if ((currentAge || startAge) >= 75) oas *= 1.10;
  var oasThr = OAS_CLAWBACK_THR * idxO;
  if (income > oasThr) oas = Math.max(0, oas - (income - oasThr) * 0.15 / 12);
  return oas;
}
export function calcGIS(age, nonOASincome, yr, infR, hasSpouse) {
  if (age < 65) return 0;
  var idx = Math.pow(1 + (infR || 0.02), yr || 0);
  var maxGIS = GIS_MAX_SINGLE * idx;
  if (hasSpouse) maxGIS = GIS_MAX_COUPLE * idx;
  var reduction = nonOASincome * 0.5 / 12;
  var gis = Math.max(0, maxGIS - reduction);
  return gis;
}
export var RRIF = { 71: 0.0528, 72: 0.054, 73: 0.0553, 74: 0.0567, 75: 0.0582, 76: 0.0598, 77: 0.0617, 78: 0.0636, 79: 0.0658, 80: 0.0682, 81: 0.0708, 82: 0.0738, 83: 0.0771, 84: 0.0808, 85: 0.0851, 86: 0.0899, 87: 0.0955, 88: 0.1021, 89: 0.1099, 90: 0.1192, 91: 0.1306, 92: 0.1449, 93: 0.1634, 94: 0.1879, 95: 0.2 };
export function getRRIFMin(age, bal) {
  return age >= 95 ? bal * 0.2 : RRIF[age] ? bal * RRIF[age] : age >= 71 ? bal * 0.2 : 0;
}

// === DECUMULATION OPTIMIZER ===
// === DECUMULATION OPTIMIZER (S3c) ===
// Generates a year-by-year optimal withdrawal schedule using tax-aware heuristics
// Key objectives: minimize lifetime tax, protect OAS/GIS, use pension credit, manage RRIF
export function optimizeDecum(p) {
  var maxYrs = (p.deathAge || 95) - p.age;
  var schedule = [];
  var rr = p.rrsp || 0, tf = p.tfsa || 0, nr = p.nr || 0;
  // TFSA room tracking: Room = cumulative_limits - net_contributions
  // Net contributions â‰  balance (gains don't consume room, withdrawals restore it)
  var _tfsaYrs18 = Math.max(0, Math.min(p.age - 17, 18)); // years eligible (max ~18 since 2009)
  var _tfsaCumLim = _tfsaYrs18 <= 0 ? 0 :
    Math.min(_tfsaYrs18, 4) * 5000 + Math.max(0, Math.min(_tfsaYrs18 - 4, 2)) * 5500 +
    Math.max(0, Math.min(_tfsaYrs18 - 6, 1)) * 10000 + Math.max(0, Math.min(_tfsaYrs18 - 7, 3)) * 5500 +
    Math.max(0, Math.min(_tfsaYrs18 - 10, 4)) * 6000 + Math.max(0, Math.min(_tfsaYrs18 - 14, 1)) * 6500 +
    Math.max(0, _tfsaYrs18 - 15) * 7000;
  // Conservative: assume net contributions = min(balance, cumLimits)
  // (if balance > limits, gains explain the excess; if balance < limits, unused room exists)
  var _tfsaNetContrib = Math.min(tf, _tfsaCumLim);
  var tfsaRoom = Math.max(0, _tfsaCumLim - _tfsaNetContrib);
  var _tfsaLastYrWith = 0; // withdrawals from previous year restore room
  var fhsa = p.fhsaBal || 0, fhsaMax = 40000, fhsaContrib = 0;
  var nrACB = p.costBase || nr;
  var crr = p.cOn ? (p.cRRSP || 0) : 0, ctf = p.cOn ? (p.cTFSA || 0) : 0, cnr = p.cOn ? (p.cNR || 0) : 0;
  var cFhsa = p.cOn ? (p.cFhsaBal || 0) : 0, cFhsaContrib = 0;
  var reVals = (p.props || []).filter(function(pr) { return pr.on; }).map(function(pr) { return { v: pr.val || 0, m: pr.mb || 0, heloc: 0, helocMax: 0.65, ri: (pr.appRate || 0.03) }; });
  var inf = p.inf || 0.021;
  var eqRet = p.eqRet || 0.07, bndRet = p.bndRet || 0.035;
  var allocR = p.allocR || 0.6, allocT = p.allocT || 0.8, allocN = p.allocN || 0.5;
  var retRR = eqRet * allocR + bndRet * (1 - allocR) - (p.merR || 0);
  var retTF = eqRet * allocT + bndRet * (1 - allocT) - (p.merT || 0);
  var retNR = eqRet * allocN + bndRet * (1 - allocN) - (p.merN || 0);

  var cFhsa = p.cOn ? (p.cFhsaBal || 0) : 0;
  var cSimDeath = p.cOn ? (p.cDeath || 90) : 0;

  for (var y = 0; y <= maxYrs; y++) {
    var age = p.age + y;
    var infM = Math.pow(1 + inf, y);
    var retired = age >= p.retAge;
    var cAge2 = p.cOn ? (p.cAge || p.age) + y : 0;
    var cRetired = p.cOn && cAge2 >= (p.cRetAge || p.retAge);
    var cAlive = p.cOn && cAge2 <= cSimDeath;

    // Survivor rollover: when spouse dies, roll their accounts to person
    if (p.cOn && !cAlive && cAge2 === cSimDeath + 1) {
      // RRSPâ†’RRSP, TFSAâ†’TFSA (tax-free spousal rollover), NRâ†’NR
      rr += crr; tf += ctf; nr += cnr;
      crr = 0; ctf = 0; cnr = 0;
    }

    // Government income
    var qpp = age >= p.qppAge ? calcQPP(p.qppAge, p.avgE || 0, p.qppYrs || 0) * 12 * infM : 0;
    var oas = age >= p.oasAge ? calcOAS(p.oasAge, 0, y, inf, age) * 12 : 0; // estimate without clawback first
    var penMonth = 0;
    if (p.penType === "db" && retired) {
      penMonth = (p.penM || 0) * (p.penIdx ? infM : 1);
      if (p.bridge && age < (p.brEnd || 65)) penMonth += (p.brAmt || 0);
    }
    if (["cd","rpdb","rrs","rver"].indexOf(p.penType) >= 0 && retired) {
      penMonth = (p.dcBal || 0) * 0.04 / 12;
    }
    var ptInc = retired && (p.ptM || 0) > 0 && y < (p.ptYrs || 0) ? (p.ptM * 12 * infM) : 0;
    var penAnn = penMonth * 12;

    // Spending (Blanchett smile)
    var retY = age - p.retAge;
    var smileMul = 1;
    if (retired) {
      var _slA = p.smileSlAge || Math.max(p.retAge + 10, 75);
      var _noA = p.smileNoAge || Math.max(_slA + 10, 85);
      var _hA = p.healthAge || 85;
      if (age < _slA) smileMul = p.goP || 1;
      else if (age < _noA) smileMul = p.slP || 0.85;
      else smileMul = p.noP || 0.75;
      if (age >= _hA) smileMul *= (1 + (p.healthMul || 0.02));
    }
    var spending = retired ? (p.retSpM || 0) * 12 * infM * smileMul : 0;
    // Couple: add spouse spending when alive
    if (p.cOn && cAlive && cRetired) spending += (p.cRetSpM || 0) * 12 * infM * smileMul;

    var oasClawThr = OAS_CLAWBACK_THR * infM; // OAS clawback threshold
    var penCreditMax = PENSION_CREDIT_MAX * infM; // Pension income credit (at 65+)
    var fedBr1 = FED_BRACKETS[0] * infM; // First federal bracket top
    var fedBr2 = FED_BRACKETS[1] * infM; // Second federal bracket top

    // RRIF minimum
    var rrifMin = getRRIFMin(age, rr);
    var cRrifMin = p.cOn && cAlive ? getRRIFMin(age + (p.cAge - p.age), crr) : 0;

    // Fixed taxable income (before discretionary withdrawals)
    var fixedTaxable = qpp + penAnn + ptInc + rrifMin + cRrifMin;

    // GIS check \u2014 if income is low enough, minimize RRSP withdrawals to protect GIS
    var gisEligible = age >= 65 && fixedTaxable / infM < 22000;

    // OAS (recalculate with fixedTaxable estimate)
    if (age >= p.oasAge) {
      var estInc = fixedTaxable + (retired ? Math.max(0, spending - fixedTaxable - oas) * 0.5 : 0);
      oas = calcOAS(p.oasAge, estInc / infM, y, inf, age) * 12;
    }
    var govInc = qpp + oas + penAnn + ptInc;

    var row = { age: age, rrifMin: rrifMin, cRrifMin: cRrifMin, fromRRSP: 0, fromTFSA: 0, fromNR: 0, meltdown: 0, govInc: govInc, spending: spending, qpp: qpp, oas: oas, pen: penAnn, pt: ptInc, gis: 0 };

    if (!retired) {
      // Accumulation phase
      rr = rr * (1 + retRR) + (p.rrspC || 0);
      var _tfsaAnnLim = Math.round(7000 * Math.pow(1 + p.inf, y) / 500) * 500;
      tfsaRoom += _tfsaAnnLim + _tfsaLastYrWith; // new annual room + restored withdrawals
      _tfsaLastYrWith = 0; // reset for this year
      var _tfsaActualC = Math.min(p.tfsaC || 7000, tfsaRoom);
      tf = tf * (1 + retTF) + _tfsaActualC;
      tfsaRoom -= _tfsaActualC;
      nr = nr * (1 + retNR - (p.nrTaxDrag || 0.009)) + (p.nrC || 0);
      if (p.cOn && cAlive) { crr = crr * (1 + retRR) + (p.cRRSPC || 0); ctf = ctf * (1 + retTF) + (p.cTFSAC || 7000); cnr = cnr * (1 + retNR - (p.nrTaxDrag || 0.009)) + (p.cNRC || 0); }
      // FHSA/CELIAPP: grows tax-free, max $8K/yr, $40K lifetime
      if (fhsa > 0 || fhsaContrib < fhsaMax) {
        fhsa *= (1 + retTF); // grows like TFSA (tax-free)
        if (!retired && fhsaContrib < fhsaMax) {
          var fhsaAdd = Math.min(p.fhsaC || 0, 8000, fhsaMax - fhsaContrib);
          fhsa += fhsaAdd; fhsaContrib += fhsaAdd;
        }
        // Home purchase: withdraw tax-free
        if (p.fhsaForHome && p.fhsaHomeAge > 0 && age === p.fhsaHomeAge && fhsa > 0) {
          nr += fhsa; nrACB += fhsa;
          fhsa = 0; fhsaContrib = fhsaMax; // close account
        }
        // At 71 or 15 years: rolls to RRSP (no room needed)
        var _fhsaYrsOpen = y + Math.min(5, Math.ceil((p.fhsaBal || 0) / 8000)); if ((age >= 71 || _fhsaYrsOpen >= 15) && fhsa > 0 && !p.fhsaForHome) {
          rr += fhsa; fhsa = 0;
        }
      }
      // Couple FHSA
      if (p.cOn && cAlive && !cRetired && cFhsa >= 0) {
        cFhsa *= (1 + retTF);
        var cFhsaAdd = Math.min(p.cFhsaC || 0, 8000);
        cFhsa += cFhsaAdd;
        var _cFhsaYrsHeld = (p.cFhsaBal||0) > 0 ? Math.min(3, Math.ceil((p.cFhsaBal||0) / 8000)) : 0;
        if (cAge2 >= 71 || y >= (15 - _cFhsaYrsHeld)) { crr += cFhsa; cFhsa = 0; }
      }
      row.balRR = rr; row.balTF = tf; row.balNR = nr;
      row.balCRR = crr; row.balCTF = ctf; row.balCNR = cnr;
      schedule.push(row);
      continue;
    }

    // === RETIREMENT: OPTIMIZE WITHDRAWAL SOURCE ===
    rr *= (1 + retRR); tf *= (1 + retTF); nr *= (1 + retNR - (p.nrTaxDrag || 0.009));
    if (p.cOn && cAlive) { crr *= (1 + retRR); ctf *= (1 + retTF); cnr *= (1 + retNR - (p.nrTaxDrag || 0.009)); }
    // TFSA room continues accumulating in retirement
    tfsaRoom += Math.round(7000 * Math.pow(1 + p.inf, y) / 500) * 500 + _tfsaLastYrWith;
    _tfsaLastYrWith = 0;

    // 1. Apply RRIF minimum (mandatory)
    if (rrifMin > 0) rr = Math.max(0, rr - rrifMin);
    if (cRrifMin > 0) crr = Math.max(0, crr - cRrifMin);

    // 2. Determine net need after gov income + RRIF
    var totalFixed = govInc + rrifMin + cRrifMin;
    var need = Math.max(0, spending - totalFixed);

    // 3. MELTDOWN logic \u2014 fill low tax brackets with RRSP withdrawals
    var meltAmt = 0;
    if (retired && rr > 0 && age < 72) {
      if (age < (p.qppAge || 65)) {
        // Before QPP: aggressive meltdown to fill to end of bracket 1
        var meltTarget = Math.max(0, fedBr1 - fixedTaxable);
        meltAmt = Math.min(rr, meltTarget);
        if (meltAmt > 0) rr -= meltAmt;
      } else {
        // After QPP but before RRIF: moderate meltdown \u2014 fill bracket but watch OAS
        var roomToOAS = Math.max(0, oasClawThr - fixedTaxable);
        var roomToBr2 = Math.max(0, fedBr2 - fixedTaxable);
        var meltTarget2 = Math.min(roomToOAS, roomToBr2);
        // Use pension credit: ensure at least 2000$ eligible pension income at 65+
        if (age >= 65 && fixedTaxable < penCreditMax + (qpp || 0)) {
          meltTarget2 = Math.max(meltTarget2, penCreditMax);
        }
        meltAmt = Math.min(rr, Math.max(0, meltTarget2 - rrifMin));
        if (meltAmt > 0) rr -= meltAmt;
      }
    }

    row.meltdown = meltAmt;
    var availFromMelt = Math.max(0, meltAmt + rrifMin + cRrifMin - need);
    need = Math.max(0, need - meltAmt);

    // 4. Determine source for remaining need
    // Principle: if total taxable income is approaching OAS clawback \u2192 use TFSA/NR
    //            if GIS eligible \u2192 avoid RRSP, use TFSA/NR
    //            otherwise: NR first (tax-efficient), then TFSA (tax-free last resort)
    var totalTaxable = fixedTaxable + meltAmt;
    var oasRisk = totalTaxable > oasClawThr * 0.85; // within 15% of clawback

    if (need > 0) {
      if (gisEligible || oasRisk) {
        // Protect GIS/OAS: use TFSA and NR first, avoid adding to taxable income
        var wNR = Math.min(nr, need);
        nr -= wNR; need -= wNR; row.fromNR = wNR;
        var wTF = Math.min(tf, need);
        tf -= wTF; need -= wTF; row.fromTFSA = wTF; _tfsaLastYrWith += wTF;
        // Last resort: RRSP (adds to taxable)
        var wRR = Math.min(rr, need);
        rr -= wRR; need -= wRR; row.fromRRSP = wRR;
      } else {
        // Normal: NR first (partially taxable), then RRSP (fully taxable), TFSA last (preserve)
        var wNR2 = Math.min(nr, need);
        nr -= wNR2; need -= wNR2; row.fromNR = wNR2;
        // RRSP: only up to the OAS clawback threshold
        var rrspRoom = Math.max(0, oasClawThr - totalTaxable);
        var wRR2 = Math.min(rr, Math.min(need, rrspRoom));
        rr -= wRR2; need -= wRR2; row.fromRRSP = wRR2;
        // TFSA: rest
        var wTF2 = Math.min(tf, need);
        tf -= wTF2; need -= wTF2; row.fromTFSA = wTF2; _tfsaLastYrWith += wTF2;
        // If still need: more from RRSP regardless of clawback
        if (need > 0) {
          var wRR3 = Math.min(rr, need);
          rr -= wRR3; need -= wRR3; row.fromRRSP += wRR3;
        }
      }
      // Conjoint accounts as last resort
      if (need > 0 && p.cOn) {
        var wCR = Math.min(crr, need); crr -= wCR; need -= wCR;
        var wCT = Math.min(ctf, need); ctf -= wCT; need -= wCT;
        var wCNR = Math.min(cnr, need); cnr -= wCNR; need -= wCNR;
      }
      // HELOC as emergency fund (last resort after all accounts)
      if (need > 0) {
        for (var phi = 0; phi < reVals.length; phi++) {
          if (need <= 0) break;
          var hp = reVals[phi];
          if (hp.v > 0) {
            var helocRoom = Math.max(0, hp.v * hp.helocMax - hp.m - hp.heloc);
            var helocDraw = Math.min(need, helocRoom);
            hp.heloc += helocDraw;
            need -= helocDraw;
          }
        }
      }
      // FORCED PROPERTY LIQUIDATION when financial assets depleted
      // 1. Rental/locative: sell (equity - 5% costs), invest TFSA-first
      // 2. Primary residence: sell last resort, invest TFSA-first, add rent
      if (need > 0 && retired) {
        // TFSA room estimate: cumulative since 2009 (~$7K/yr indexed) minus current balance
        // Use tracked tfsaRoom (accounts for cumulative limits, contributions, and restored withdrawals)
        var _tfsaRoom = tfsaRoom;
        // Step 1: Sell rental properties (cheapest equity first)
        var _fsRentals = [];
        for (var _fsi = 0; _fsi < reVals.length; _fsi++) {
          if (reVals[_fsi].v > 0 && !((p.props||[])[_fsi]||{}).pri) {
            _fsRentals.push({ idx: _fsi, eq: reVals[_fsi].v - reVals[_fsi].m - (reVals[_fsi].heloc||0) });
          }
        }
        _fsRentals.sort(function(a,b){return a.eq - b.eq;});
        for (var _fsr = 0; _fsr < _fsRentals.length && need > 0; _fsr++) {
          var _frp = reVals[_fsRentals[_fsr].idx];
          var _fNet = Math.max(0, (_frp.v - _frp.m - (_frp.heloc||0)) * 0.95);
          // TFSA first, NR only for overflow
          var _toTF = Math.min(_fNet, _tfsaRoom);
          tf += _toTF; _tfsaRoom -= _toTF;
          var _toNR = _fNet - _toTF;
          nr += _toNR; nrACB += _toNR;
          _frp.v = 0; _frp.m = 0; _frp.heloc = 0;
          // Withdraw to cover need: TFSA first (tax-free, no GIS/OAS impact)
          var _fuTf = Math.min(tf, need);
          tf -= _fuTf; need -= _fuTf;
          var _fuNr = Math.min(nr, need);
          nr -= _fuNr; need -= _fuNr;
          row.fromNR = (row.fromNR || 0) + _fuNr;
          row.fromTFSA = (row.fromTFSA || 0) + _fuTf;
        }
        // Step 2: Sell primary residence (last resort), add rent expense
        if (need > 0) {
          for (var _fp = 0; _fp < reVals.length; _fp++) {
            if (reVals[_fp].v > 0 && ((p.props||[])[_fp]||{}).pri && need > 0) {
              var _fpNet = Math.max(0, (reVals[_fp].v - reVals[_fp].m - (reVals[_fp].heloc||0)) * 0.95);
              // TFSA first, NR overflow (primary = CG exempt â†’ full ACB)
              var _fpToTF = Math.min(_fpNet, _tfsaRoom);
              tf += _fpToTF; _tfsaRoom -= _fpToTF;
              var _fpToNR = _fpNet - _fpToTF;
              nr += _fpToNR; nrACB += _fpToNR;
              reVals[_fp].v = 0; reVals[_fp].m = 0; reVals[_fp].heloc = 0;
              // Model rent: ~1500$/mo adjusted for inflation
              reVals[_fp]._rentAdded = true;
              var _rentM = 1500 * infM;
              spending += _rentM * 12;
              need += _rentM * 12;
              // Withdraw: TFSA first
              var _fpuTf = Math.min(tf, need);
              tf -= _fpuTf; need -= _fpuTf;
              var _fpuNr = Math.min(nr, need);
              nr -= _fpuNr; need -= _fpuNr;
              row.fromNR = (row.fromNR || 0) + _fpuNr;
              row.fromTFSA = (row.fromTFSA || 0) + _fpuTf;
            }
          }
        }
        // Sync room back and track withdrawals for next year's room restoration
        tfsaRoom = _tfsaRoom;
        row.forcedSale = true;
      }
    }

    // 5. If meltdown/RRIF surplus, reinvest in TFSA (if room) or NR
    if (availFromMelt > 0) {
      // Simplified: put surplus in TFSA up to 7000*infM, rest in NR
      var tfsaRoom = Math.max(0, 7000 * infM); // simplified room
      var toTF = Math.min(availFromMelt, tfsaRoom * 0.5); // conservative
      tf += toTF;
      nr += (availFromMelt - toTF);
    }

    // 6. Compute GIS with final taxable
    var finalTaxable = fixedTaxable + meltAmt + row.fromRRSP;
    var gis = age >= 65 ? calcGIS(age, finalTaxable / infM, y, inf, p.cOn && cAlive) * 12 : 0;
    row.gis = gis;

    // 7. Compute tax
    var taxInc = qpp + (age >= p.oasAge ? calcOAS(p.oasAge, finalTaxable, y, inf, age) * 12 : 0) + penAnn + ptInc + rrifMin + meltAmt + row.fromRRSP;
    taxInc = Math.max(0, taxInc);
    var cTaxInc = 0;
    if (p.cOn && cAlive) {
      var _cAge2 = (p.cAge || p.age) + y;
      var _cRetired = _cAge2 >= (p.cRetAge || p.retAge);
      cTaxInc += cRrifMin;
      if (_cRetired && _cAge2 >= (p.cQppAge || 65)) cTaxInc += calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 * infM;
      if (p.cPenType === "db" && _cRetired) cTaxInc += (p.cPenM || 0) * 12 * (p.penIdx ? infM : 1);
      if (!_cRetired) cTaxInc += (p.cSal || 0) * infM;
      if (_cRetired && _cAge2 >= (p.cOasAge || 65)) cTaxInc += calcOAS(p.cOasAge || 65, cTaxInc, y, inf, _cAge2) * 12;
    }
    var tx1 = calcTax(taxInc, y, p.prov || "QC", inf, retired);
    var _cRetired2 = p.cOn ? ((p.cAge || p.age) + y >= (p.cRetAge || p.retAge)) : false;
    var tx2 = cTaxInc > 0 ? calcTax(cTaxInc, y, p.prov || "QC", inf, _cRetired2) : { total: 0, eff: 0, marg: 0 };
    var tx = { total: tx1.total + tx2.total, eff: (taxInc + cTaxInc) > 0 ? (tx1.total + tx2.total) / (taxInc + cTaxInc) : 0, marg: Math.max(tx1.marg, tx2.marg) };
    taxInc = taxInc + cTaxInc;
    row.tax = tx.total;
    row.taxInc = taxInc;
    row.effRate = tx.eff;
    row.margRate = tx.marg;

    row.balRR = rr; row.balTF = tf; row.balNR = nr;
    row.balCRR = crr; row.balCTF = ctf; row.balCNR = cnr;
    // Track TFSA withdrawals for next year's room restoration
    _tfsaLastYrWith += (row.fromTFSA || 0);
      row.reEquity = reVals.reduce(function(s, rr) { return s + Math.max(0, rr.v - rr.m - rr.heloc); }, 0);
      row.reMtg = reVals.reduce(function(s, rr) { return s + rr.m; }, 0);
      row.reHeloc = reVals.reduce(function(s, rr) { return s + rr.heloc; }, 0);
    row.totalWithdraw = rrifMin + cRrifMin + meltAmt + row.fromRRSP + row.fromTFSA + row.fromNR;
    row.cashWithdraw = Math.max(0, (row.spending || 0) + (row.tax || 0) - govInc);
    row.netIncome = totalFixed + meltAmt + row.fromRRSP + row.fromTFSA + row.fromNR + gis - (row.tax || 0);
    schedule.push(row);
  }

  // Summary stats
  var retStart = Math.max(0, p.retAge - p.age);
  var retSchedule = schedule.slice(retStart);
  var totalTax = retSchedule.reduce(function(s, r) { return s + (r.tax || 0); }, 0);
  var totalGIS = retSchedule.reduce(function(s, r) { return s + (r.gis || 0); }, 0);
  var oasClawbackYrs = retSchedule.filter(function(r) { return r.taxInc > OAS_CLAWBACK_THR * Math.pow(1+inf, r.age - p.age); }).length;
  var finalBal = schedule.length > 0 ? (function() { var l = schedule[schedule.length-1]; return (l.balRR||0)+(l.balTF||0)+(l.balNR||0); })() : 0;

  return {
    schedule: schedule,
    totalTax: totalTax,
    totalGIS: totalGIS,
    oasClawbackYrs: oasClawbackYrs,
    finalBal: finalBal,
    retStart: retStart
  };
}
// === END DECUMULATION OPTIMIZER ===
export var STR = {
  none: { n: "Aucun", ne: "None", eq: [], bd: [], inf: [], d: "Aucun choc appliqu\u00e9.", de: "No shock applied." },
  crash08: { n: "Crash 2008", ne: "2008 Crash", eq: [-0.37, -0.22, 0.15, 0.02], bd: [0.05, 0.08, 0.02, -0.01], inf: [0.038, 2e-3, 0.018, 0.012],
    d: "Crise financi\u00e8re mondiale (2007-09). S&P 500: -37% en 2008, -22% en 2009. MSCI Monde: -42%. Oblig. gouv. refuge (+5 \u00e0 +8%). Taux directeur US: 5.25%\u21920.25%. Inflation: 3.8%\u21920.2%. R\u00e9cup\u00e9ration compl\u00e8te en ~4 ans.",
    de: "Global financial crisis (2007-09). S&P 500: -37% in 2008, -22% in 2009. MSCI World: -42%. Gov bonds safe haven (+5 to +8%). Fed rate: 5.25%\u21920.25%. Inflation: 3.8%\u21920.2%. Full recovery in ~4 yrs." },
  dotcom: { n: "Bulle 2000", ne: "Dotcom 2000", eq: [-0.1, -0.13, -0.23, 0.26, 0.09], bd: [0.06, 0.04, 0.05, 0.02, 0.03], inf: [0.034, 0.028, 0.016, 0.023, 0.027],
    d: "\u00c9clatement de la bulle techno (2000-02). NASDAQ: -78%. S&P 500: -49% sur 3 ans. Oblig. gouv. solides (+4 \u00e0 +6%/an). Taux directeur US: 6.5%\u21921.0%. R\u00e9cup\u00e9ration lente, 5+ ans pour retrouver les sommets.",
    de: "Tech bubble burst (2000-02). NASDAQ: -78%. S&P 500: -49% over 3 yrs. Gov bonds solid (+4 to +6%/yr). Fed rate: 6.5%\u21921.0%. Slow recovery, 5+ yrs to regain highs." },
  inflation70: { n: "Inflation 70s", ne: "70s Inflation", eq: [-0.08, -0.15, -0.26, 0.12, -0.07, 0.02, 0.06, -0.05, 0.12, 0.04], bd: [-0.05, -0.08, -0.12, -0.03, -0.06, 0.01, 0.02, -0.04, 0.03, 0.05], inf: [0.061, 0.074, 0.091, 0.112, 0.135, 0.113, 0.103, 0.089, 0.059, 0.038],
    d: "Grande inflation (1973-82). IPC: 6%\u219213.5%. Taux directeur US (Volcker): jusqu'\u00e0 20%. Oblig. ravag\u00e9es (-5 \u00e0 -12%/an). Actions r\u00e9elles n\u00e9gatives sur 10 ans. P\u00e9trole: chocs p\u00e9troliers 1973 et 1979. Portefeuille 60/40: rendement r\u00e9el ~-3%/an.",
    de: "Great Inflation (1973-82). CPI: 6%\u219213.5%. Fed rate (Volcker): up to 20%. Bonds crushed (-5 to -12%/yr). Negative real equity returns over 10 yrs. Oil shocks 1973 & 1979. 60/40 portfolio: real return ~-3%/yr." },
  stagflation: { n: "Stagflation mod.", ne: "Mod. Stagflation", eq: [-0.14, -0.08, -0.12, 0.02, -0.05], bd: [-0.02, -0.05, -0.03, 0.01, -0.01], inf: [0.055, 0.065, 0.072, 0.058, 0.045],
    d: "Stagflation mod\u00e9r\u00e9e, style 2022-23 prolong\u00e9. Inflation 5-7% persistante + r\u00e9cession. Oblig. et actions en baisse simultan\u00e9e. Taux directeur: hausse de ~0% \u00e0 ~5%. Portefeuille 60/40 perd sur les 2 fronts.",
    de: "Moderate stagflation, extended 2022-23 style. Persistent 5-7% inflation + recession. Bonds and equities falling simultaneously. Policy rate: rise from ~0% to ~5%. 60/40 portfolio loses on both fronts." },
  japan: { n: "D\u00e9c. perdue", ne: "Lost Decade", eq: [0.01, -0.02, 0.01, -0.03, 0.02, -0.01, 0, -0.02, 0.01, -0.01], bd: [0.02, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01], inf: [3e-3, 1e-3, 0, -2e-3, 1e-3, 0, -1e-3, 2e-3, 1e-3, 0],
    d: "D\u00e9cennie perdue japonaise (1990s). Nikkei: -80% depuis son sommet. Actions ~0%/an pendant 10 ans. D\u00e9flation. Oblig. stables mais faibles (+1-2%/an). Taux directeur: ~0%. Stagnation prolong\u00e9e sans krach violent.",
    de: "Japanese Lost Decade (1990s). Nikkei: -80% from peak. Equities ~0%/yr for 10 yrs. Deflation. Bonds stable but low (+1-2%/yr). Policy rate: ~0%. Prolonged stagnation without violent crash." },
  covid: { n: "COVID 2020", ne: "COVID 2020", eq: [-0.34, 0.18, 0.27, 0.01], bd: [0.07, 0.01, -0.02, 0.02], inf: [0.012, 0.047, 0.065, 0.034],
    d: "Pand\u00e9mie COVID-19 (2020). S&P 500: -34% en 23 jours (le plus rapide de l'histoire). Rebond en V complet en 5 mois. Oblig. gouv. refuge (+7% an 1). Puis inflation post-COVID: 1.2%\u21924.7%\u21926.5%. Taux directeur: 0%\u21925.25% en 2022-23.",
    de: "COVID-19 pandemic (2020). S&P 500: -34% in 23 days (fastest ever). Full V-recovery in 5 months. Gov bonds safe haven (+7% yr 1). Then post-COVID inflation: 1.2%\u21924.7%\u21926.5%. Fed rate: 0%\u21925.25% in 2022-23." },
  longevity: { n: "Long\u00e9vit\u00e9 +5 ans", ne: "Longevity +5yr", eq: [], bd: [], inf: [], extra: { deathAge: 5 },
    d: "Esp\u00e9rance de vie +5 ans. Teste l'\u00e9puisement des fonds si vous vivez plus longtemps. Pas de choc de march\u00e9, seulement un horizon prolong\u00e9.",
    de: "Life expectancy +5 years. Tests fund depletion if you live longer. No market shock, only extended horizon." },
  ratehike: { n: "Hausse de taux", ne: "Rate Hike", eq: [-0.12, -0.08, -0.05, 0.03, 0.06], bd: [-0.10, -0.08, -0.04, 0.01, 0.03], inf: [0.04, 0.045, 0.038, 0.032, 0.025],
    d: "Hausse agressive des taux, style 2022. Taux directeur: 0.25%\u21925.25% en 18 mois. Oblig. agr\u00e9g\u00e9es: -10% an 1, -8% an 2 (pire depuis 1926). Actions: -12% an 1. Le 60/40 perd ~-11% an 1. Normalisation sur 5 ans.",
    de: "Aggressive rate hike, 2022-style. Policy rate: 0.25%\u21925.25% in 18 months. Agg bonds: -10% yr 1, -8% yr 2 (worst since 1926). Equities: -12% yr 1. 60/40 loses ~-11% yr 1. Normalization over 5 yrs." },
  prolonged: { n: "R\u00e9cession prolong\u00e9e", ne: "Prolonged Recession", eq: [-0.15, -0.10, -0.08, -0.05, -0.03, 0.02, 0.05, 0.08], bd: [0.03, 0.04, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01], inf: [0.015, 0.01, 0.005, 0.005, 0.008, 0.012, 0.015, 0.02],
    d: "R\u00e9cession prolong\u00e9e de 5+ ans avec reprise lente (type Grande D\u00e9pression mod\u00e9r\u00e9e). Actions US: -35% cumulatif. Oblig. gouv. refuge (+2-4%/an). Inflation basse/d\u00e9flation. Taux directeur: vers 0%. March\u00e9 stagnant 8 ans.",
    de: "Prolonged 5+ yr recession with slow recovery (moderate Great Depression). US equities: -35% cumulative. Gov bonds safe haven (+2-4%/yr). Low inflation/deflation. Policy rate: near 0%. Market stagnant 8 yrs." },
  custom: { n: "Personnalis\u00e9", ne: "Custom", eq: [], bd: [], inf: [], d: "Vos propres chocs.", de: "Your own shocks." }
};
export var CRM = [[1, 0.2, -0.2, 0.65, 0.05], [0.2, 1, -0.4, 0.1, 0.15], [-0.2, -0.4, 1, -0.1, 0.25], [0.65, 0.1, -0.1, 1, 0.1], [0.05, 0.15, 0.25, 0.1, 1]]; // [eq, bond, inf, PE, PM] — DMS 2024

// === STOCHASTIC ENGINE ===
export function chol(m) {
  var n = m.length, L = m.map(function(r) {
    return r.map(function() {
      return 0;
    });
  });
  for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
    var s = 0;
    for (var k = 0; k < j; k++) s += L[i][k] * L[j][k];
    L[i][j] = i === j ? Math.sqrt(Math.max(1e-3, m[i][i] - s)) : (m[i][j] - s) / (L[j][j] || 1);
  }
  return L;
}
export var CHL = chol(CRM);
export var CRM_CRISIS = [[1, -0.3, 0.1, 0.85, 0.15], [-0.3, 1, -0.1, -0.2, 0.1], [0.1, -0.1, 1, 0.05, 0.3], [0.85, -0.2, 0.05, 1, 0.2], [0.15, 0.1, 0.3, 0.2, 1]]; // crisis: eq-bond negative (flight to quality)
export var CHL_CRISIS = chol(CRM_CRISIS);
export function tRn(df) {
  var u = Math.random(), v = Math.random();
  var z = Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * v);
  if (!df || df > 30) return z;
  var c2 = 0;
  for (var i = 0; i < df; i++) {
    var x = Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-10))) * Math.cos(2 * Math.PI * Math.random());
    c2 += x * x;
  }
  return z / Math.sqrt(c2 / df);
}
export function sMul(age, ra, g, sl, n, slAge, noAge) {
  if (age < ra) return 0;
  var s1 = slAge || Math.max(ra + 10, 75);
  var s2 = noAge || Math.max(s1 + 10, 85);
  if (age < s1) return g;
  if (age < s2) return sl;
  return n;
}
export function pCr(pi, age) {
  return age < 65 || pi <= 0 ? 0 : Math.min(2e3, pi) * (0.15 * 0.835 + 0.14);
}
// CPM-2014 base rates with Scale MI-2017 mortality improvement.
// Projected to 2023 base year. stochDeath() applies further annual improvement.
// Target LE at 65: ~86 (M), ~88.5 (F). Validated against CIA/ICA published tables.
export var CPM_M = {
  30: 0.00034,
  35: 0.00038,
  40: 0.00052,
  45: 0.00076,
  50: 0.0013,
  51: 0.00144,
  52: 0.0016,
  53: 0.00178,
  54: 0.00199,
  55: 0.00222,
  56: 0.00257,
  57: 0.00297,
  58: 0.00342,
  59: 0.00392,
  60: 0.00394,
  61: 0.00448,
  62: 0.00507,
  63: 0.00575,
  64: 0.00649,
  65: 0.00631,
  66: 0.00713,
  67: 0.00807,
  68: 0.00916,
  69: 0.01044,
  70: 0.01187,
  71: 0.0135,
  72: 0.0154,
  73: 0.01763,
  74: 0.02022,
  75: 0.0232,
  76: 0.02666,
  77: 0.03065,
  78: 0.03527,
  79: 0.04064,
  80: 0.04687,
  81: 0.05413,
  82: 0.06254,
  83: 0.07258,
  84: 0.08346,
  85: 0.09701,
  86: 0.112,
  87: 0.1302,
  88: 0.1506,
  89: 0.1736,
  90: 0.2001,
  91: 0.2312,
  92: 0.2652,
  93: 0.3031,
  94: 0.3446,
  95: 0.39,
  96: 0.4375,
  97: 0.4849,
  98: 0.5325,
  99: 0.58,
  100: 0.6783
};
export var CPM_F = {
  30: 0.00018,
  35: 0.00021,
  40: 0.0003,
  45: 0.00044,
  50: 0.0007,
  51: 0.00077,
  52: 0.00085,
  53: 0.00094,
  54: 0.00104,
  55: 0.00116,
  56: 0.00132,
  57: 0.00151,
  58: 0.00174,
  59: 0.00201,
  60: 0.00198,
  61: 0.0023,
  62: 0.00268,
  63: 0.0031,
  64: 0.00359,
  65: 0.00331,
  66: 0.00382,
  67: 0.00441,
  68: 0.0051,
  69: 0.0059,
  70: 0.00686,
  71: 0.00799,
  72: 0.00937,
  73: 0.01092,
  74: 0.01283,
  75: 0.01504,
  76: 0.01767,
  77: 0.02076,
  78: 0.02446,
  79: 0.02882,
  80: 0.03401,
  81: 0.04016,
  82: 0.04744,
  83: 0.05609,
  84: 0.06623,
  85: 0.0788,
  86: 0.09306,
  87: 0.1098,
  88: 0.1295,
  89: 0.1527,
  90: 0.1796,
  91: 0.2106,
  92: 0.2459,
  93: 0.2852,
  94: 0.3281,
  95: 0.373,
  96: 0.4147,
  97: 0.4565,
  98: 0.4982,
  99: 0.54,
  100: 0.5967
};
export function stochDeath(startAge, sexCode) {
  var tbl = sexCode === "F" ? CPM_F : CPM_M;
  var age = startAge;
  var impYrs = 2026 - 2023;
  while (age <= 105) {
    var baseQx = tbl[Math.floor(age)] || tbl[Math.min(100, Math.floor(age / 5) * 5)] || 1e-3;
    var qx = baseQx * Math.pow(0.99, impYrs + (age - startAge));
    if (Math.random() < qx) return age;
    age++;
  }
  return 105;
}
export function blendRet(eqRet2, bondRet, eqPct) {
  return eqRet2 * eqPct + bondRet * (1 - eqPct);
}
// === PAYROLL DEDUCTIONS (employee portion, 2025 rates) ===
export function calcPayroll(sal, prov, yr, infR) {
  if (sal <= 0) return 0;
  var inf = Math.pow(1 + (infR || 0.02), yr || 0);
  var isQC = (prov || "QC") === "QC";
  // QPP/CPP: 5.95% (ROC) / 6.4% (QC) on $3,500-$74,600 (2026 YMPE, indexed)
  var qppExempt = 3500 * inf, qppMax = QPP_MGA * inf;
  var qppPensionable = Math.max(0, Math.min(sal, qppMax) - qppExempt);
  var qppRate = isQC ? 0.064 : 0.0595;
  var qpp = qppPensionable * qppRate;
  // QPP2/CPP2: 4% on $73,200-$81,200 (2025 ceiling2, indexed)
  var qpp2Max = QPP_YAMPE * inf;
  var qpp2Pensionable = Math.max(0, Math.min(sal, qpp2Max) - qppMax);
  var qpp2 = qpp2Pensionable * 0.04;
  // EI: QC=1.27%, other=1.58%, MIE $65,700 (indexed)
  var eiMIE = 65700 * inf;
  var eiRate = isQC ? 0.0127 : 0.0158;
  var ei = Math.min(sal, eiMIE) * eiRate;
  // RQAP (QC only): 0.494% up to $94,000 (indexed)
  var rqap = 0;
  if (isQC) {
    var rqapMax = 94000 * inf;
    rqap = Math.min(sal, rqapMax) * 0.00494;
  }
  return Math.round(qpp + qpp2 + ei + rqap);
}
// === END PAYROLL DEDUCTIONS ===
export function runMC(p, N, _progressCb) {
  // === PARAM SANITIZATION — engine-level safety net ===
  // Rates: clamp to physically possible ranges (prevents typo-level bugs)
  p.merR = Math.max(0, Math.min(p.merR || 0, 0.05));      // MER: 0-5%
  p.merT = Math.max(0, Math.min(p.merT || 0, 0.05));
  p.merN = Math.max(0, Math.min(p.merN || 0, 0.05));
  p.nrTaxDrag = Math.max(0, Math.min(p.nrTaxDrag || 0, 0.03)); // NR tax drag: 0-3%
  p.inf = Math.max(0, Math.min(p.inf != null ? p.inf : 0.021, 0.10));     // Inflation: 0-10%
  p.eqRet = Math.max(-0.05, Math.min(p.eqRet || 0.07, 0.20)); // Eq return: -5% to 20%
  p.eqVol = Math.max(0.01, Math.min(p.eqVol || 0.16, 0.50));  // Eq vol: 1-50%
  p.bndRet = Math.max(-0.02, Math.min(p.bndRet || 0.035, 0.12)); // Bond ret: -2% to 12%
  p.bndVol = Math.max(0.01, Math.min(p.bndVol || 0.06, 0.25));   // Bond vol: 1-25%
  // Allocations: 0-100% (null-check: user setting allocR=0 means 100% bonds)
  p.allocR = Math.max(0, Math.min(p.allocR != null ? p.allocR : 0.6, 1));
  p.allocT = Math.max(0, Math.min(p.allocT != null ? p.allocT : 0.8, 1));
  p.allocN = Math.max(0, Math.min(p.allocN != null ? p.allocN : 0.5, 1));
  // Dollar amounts: no negatives
  p.rrsp = Math.max(0, p.rrsp || 0);
  p.tfsa = Math.max(0, p.tfsa || 0);
  p.nr = Math.max(0, p.nr || 0);
  p.sal = Math.max(0, p.sal || 0);
  p.retSpM = Math.max(0, p.retSpM || 0);
  // Spending phases: 0-150%
  p.goP = Math.max(0, Math.min(p.goP || 1, 1.5));
  p.slP = Math.max(0, Math.min(p.slP || 0.85, 1.5));
  p.noP = Math.max(0, Math.min(p.noP || 0.75, 1.5));
  // Health multiplier: 0-10%
  p.healthMul = Math.max(0, Math.min(p.healthMul || 0, 0.10));
  // === END SANITIZATION ===
  var maxYrs = Math.floor(p.deathAge - p.age);
  if (maxYrs <= 0) return null;
  var all = [], fins = [], liqFins = [], ruinAges = [], deathAges = [], cDeathAges = [], estateTaxes = [], estateNets = [];
  var gkAllCuts = [], gkAllRaises = [], gkAllAvgSpend = [], gkAllMinSpend = [], gkAllMinFactor = [], gkAllAvgFactor = [], gkAllCutYrs = [], gkAllMaxStreak = [];
  var revData = [];
  for (var y0 = 0; y0 <= maxYrs; y0++) revData.push({ age: p.age + y0, rrq: 0, psv: 0, srg: 0, pen: 0, pt: 0, ret: 0, spend: 0, tax: 0, taxInc: 0 });
  var aR0 = p.allocR, aT0 = p.allocT, aN0 = p.allocN; // already sanitized above
  var gS = p.glide ? p.glideSpd || 0.02 : 0;
  var eqRet2 = p.eqRet, eqVol2 = p.eqVol, bndRet2 = p.bndRet, bndVol2 = p.bndVol; // already sanitized
  for (var si = 0; si < N; si++) {
    if (_progressCb && si % 25 === 0) _progressCb(Math.round(si / N * 100));
    var simDeath = p.stochMort ? stochDeath(p.age, p.sex || "M") : p.deathAge;
    var cSimDeath = p.cOn ? p.stochMort ? stochDeath(p.cAge || p.age, p.cSex || "F") : p.cDeath || 90 : 0;
    var yrs = Math.floor(Math.min(simDeath - p.age, maxYrs));
    if (yrs <= 0) {
      fins.push(p.rrsp + p.tfsa + p.nr);
      ruinAges.push(999);
      deathAges.push(simDeath);
      if (p.cOn) cDeathAges.push(cSimDeath);
      all.push([{ total: p.rrsp + p.tfsa + p.nr, rr: p.rrsp, tf: p.tfsa, nr: p.nr, pe: 0, pm: 0, crr: 0, ctf: 0, cnr: 0, disc: p.rrsp + p.tfsa + p.nr, re: 0 }]);
      continue;
    }
    var rr = p.rrsp, tf = p.tfsa, nr = p.nr, pe = p.peBal || 0, pm = p.pmBal || 0, dc = p.dcBal || 0, dc2 = p.dc2Bal || 0;
    var lira = p.liraBal || 0, cLira = p.cLiraBal || 0;
    var lifeIns = p.lifeInsBenefit || 0, lifeInsPrem = (p.lifeInsPremium || 0) * 12;
    var cLifeIns = p.cOn ? (p.cLifeInsBenefit || 0) : 0, cLifeInsPrem = p.cOn ? (p.cLifeInsPremium || 0) * 12 : 0;
    var nrACB = p.costBase || p.nr || 0; // Track adjusted cost base
    // TFSA room: cumulative limits - conservative net contrib estimate
    var _mcTfsaYrs = Math.max(0, Math.min(p.age - 17, 18));
    var _mcTfsaCum = _mcTfsaYrs <= 0 ? 0 :
      Math.min(_mcTfsaYrs,4)*5e3+Math.max(0,Math.min(_mcTfsaYrs-4,2))*5500+
      Math.max(0,Math.min(_mcTfsaYrs-6,1))*1e4+Math.max(0,Math.min(_mcTfsaYrs-7,3))*5500+
      Math.max(0,Math.min(_mcTfsaYrs-10,4))*6e3+Math.max(0,Math.min(_mcTfsaYrs-14,1))*6500+
      Math.max(0,_mcTfsaYrs-15)*7e3;
    var _mcTfsaRoom = Math.max(0, _mcTfsaCum - Math.min(tf, _mcTfsaCum));
    var _mcTfsaLastW = 0;
    var crr = p.cRRSP || 0, ctf = p.cTFSA || 0, cnr = p.cNR || 0;
    var fhsa = p.fhsaBal || 0, fhsaMax = 40000, fhsaContrib = 0;
    var cFhsa = p.cOn ? (p.cFhsaBal || 0) : 0, cFhsaContrib = 0;
    var reVals = (p.props || []).map(function(pr) {
      var rate = pr.mr || 0.05;
      var mPay = pr.mb > 0 && rate > 0 ? pr.mb * (rate/12) / (1 - Math.pow(1 + rate/12, -(pr.ma || 25) * 12)) : 0;
      return { v: pr.on ? pr.val : 0, m: pr.on ? pr.mb : 0, ri: pr.ri || 0.035, rm: pr.rm || 0,
        ox: pr.ox || 0, pt: pr.pt || 0, ins: pr.ins || 0, sa: pr.sa || 0, pri: pr.pri, cg: pr.cg || 0.5,
        mr: rate, mPay: mPay, origV: pr.on ? pr.val : 0,
        heloc: pr.on ? (pr.heloc || 0) : 0, helocRate: pr.helocRate || 0.065,
        helocMax: pr.helocMax || 0.65, smithOn: pr.smithOn || false,
        refiAge: pr.refiAge || 0, refiAmt: pr.refiAmt || 0, dsAge: pr.dsAge || 0,
        dpaOn: pr.dpaOn || false, dpaRate: pr.dpaRate || 0.04, landPct: pr.landPct || 0.30,
        ucc: pr.on && !pr.pri ? (pr.val || 0) * (1 - (pr.landPct || 0.30)) : 0,
        origBldg: pr.on && !pr.pri ? (pr.val || 0) * (1 - (pr.landPct || 0.30)) : 0,
        totalDpa: 0 };
    });
    var path = [], ruined = false, ruinAge = 999;
    var cumInf = 1;
    var gkCutCount = 0, gkRaiseCount = 0, gkSpendSum = 0, gkSpendYrs = 0, gkMinSpendR = Infinity, gkSpendFactor = 1.0, gkMinFactor = 1.0, gkFactorSum = 0, gkFactorN = 0, gkCutYrs = 0, gkMaxCutStreak = 0, gkCurCutStreak = 0;
    // ═══ CCPC corporate variables (Ref: PASSATION_CCPC_MODULE.md §5.5) ═══
    var corpBal = p.bizRetainedEarnings || 0;
    var corpCDA = 0, corpRDTOH = 0, corpGRIP = 0;
    var _bizDebt = p.bizDebtBal || 0;
    var _bizDebtPay = _bizDebt > 0 && (p.bizDebtRate || 0) > 0 ?
      _bizDebt * (p.bizDebtRate/12) / (1 - Math.pow(1 + p.bizDebtRate/12, -((p.bizDebtAmort||10)*12))) * 12 : 0;
    var _ippBal = p.ippBal || 0;
    var _bizYrsSinceRet = 0;
    var _bizCorpTaxThisYr = 0, _bizDivThisYr = 0, _bizSalThisYr = 0, _bizExtractThisYr = 0;
    var _bizCumSalary = 0, _bizSalYrs = 0; // for QPP avg earnings tracking
    for (var y = 0; y <= maxYrs; y++) {
      var alive = y <= yrs;
      var age = p.age + y, retired = age >= p.retAge, yrIdx = retired ? age - p.retAge : 0;
      var cAge2 = p.cOn ? (p.cAge || p.age) + y : 0;
      var cRetired = p.cOn && cAge2 >= (p.cRetAge || p.retAge);
      var cAlive = p.cOn && cAge2 <= cSimDeath;
      var stDef = p.strs === "custom" ? { eq: p.custEq || [], bd: p.custBd || [], inf: p.custInf || [] } : STR[p.strs] || STR.none;
      var stStartAge = p.stWhen === "ret" ? p.retAge : p.stWhen === "now" ? p.age : p.stWhen === "before" ? Math.max(p.age, p.retAge - (p.stAge || 5)) : p.stAge || p.retAge;
      var stIdx = age - stStartAge;
      var sEq = stIdx >= 0 && stIdx < (stDef.eq || []).length ? stDef.eq[stIdx] : 0;
      var sBd = stIdx >= 0 && stIdx < (stDef.bd || []).length ? stDef.bd[stIdx] : 0;
      var sInfOvr = stIdx >= 0 && stIdx < (stDef.inf || []).length ? stDef.inf[stIdx] : null;
      var stDef2 = STR[p.strs2] || STR.none;
      var st2Start = p.stWhen2 === "ret" ? p.retAge : p.stWhen2 === "now" ? p.age : p.stWhen2 === "before" ? Math.max(p.age, p.retAge - (p.stAge2 || 5)) : p.stAge2 || p.retAge;
      var st2Idx = age - st2Start;
      if (st2Idx >= 0 && st2Idx < (stDef2.eq || []).length) {
        sEq += stDef2.eq[st2Idx];
      }
      if (st2Idx >= 0 && st2Idx < (stDef2.bd || []).length) {
        sBd += stDef2.bd[st2Idx];
      }
      if (sInfOvr === null && st2Idx >= 0 && st2Idx < (stDef2.inf || []).length) {
        sInfOvr = stDef2.inf[st2Idx];
      } else if (sInfOvr !== null && st2Idx >= 0 && st2Idx < (stDef2.inf || []).length) {
        sInfOvr = Math.max(sInfOvr, stDef2.inf[st2Idx]);
      }
      var rw = [];
      for (var ri = 0; ri < 5; ri++) rw.push(p.fatT ? tRn(5) : tRn(999));
      var inCrisis = sEq < -0.15;
      var useL = inCrisis ? CHL_CRISIS : CHL;
      var zz = useL.map(function(row2) {
        return row2.reduce(function(s, v, i) {
          return s + v * rw[i];
        }, 0);
      });
      var infShock = sInfOvr !== null ? sInfOvr : p.stochInf ? p.inf + 0.015 * zz[2] : p.inf;
      infShock = Math.max(5e-3, Math.min(0.08, infShock));
      cumInf *= 1 + infShock;
      var infM = cumInf;
      var _infEff = y > 0 ? Math.pow(cumInf, 1 / y) - 1 : infShock; // effective annual inflation for bracket indexing
      var eqR = eqRet2 + eqVol2 * zz[0] + sEq;
      var bndR = bndRet2 + bndVol2 * zz[1] + sBd;
      var gYrs = Math.max(0, age - p.retAge);
      var aR = Math.max(0.2, aR0 - gS * gYrs), aT = Math.max(0.2, aT0 - gS * gYrs), aN = Math.max(0.2, aN0 - gS * gYrs);
      var retRR = blendRet(eqR, bndR, aR) - (p.merR || 0);
      var retTF = blendRet(eqR, bndR, aT) - (p.merT || 0);
      var retNR = blendRet(eqR, bndR, aN) - (p.merN || 0);
      var fxNoise = (p.fxVol || 0.08) * tRn(999);
      var retPE = (p.yPE || 0.12) + (p.vPE || 0.25) * zz[3] + sEq * 0.8 + fxNoise;
      var retPM = (p.yPM || 0.03) + (p.vPM || 0.15) * zz[4] + sEq * 0.8 + fxNoise;
      var retDC = (p.dcY || 0.05) + 0.08 * tRn(999) + sEq * 0.5;
      var smM = retired ? sMul(age, p.retAge, p.goP || 1, p.slP || 0.82, p.noP || 0.92, p.smileSlAge, p.smileNoAge) : 0;
      var _hAge = p.healthAge || 85;
      var healthCost = age >= _hAge ? Math.min(2.0, 1 + (p.healthMul || 0.02) * (age - _hAge)) : 1;
      var infHouse = Math.pow(1 + infShock + (p.infHousing || 0), y);
      var infHlth = Math.pow(1 + infShock + (p.infHealth || 0), y);
      var baseSpend = p.retSpM * 12 * 0.70 * infM + p.retSpM * 12 * 0.15 * infHouse + p.retSpM * 12 * 0.15 * infHlth;
      var spending = retired && alive ? baseSpend * smM * healthCost : 0;
      // Spouse spending: add when couple enabled and spouse alive/retired
      if (p.cOn && cAlive && cAge2 >= (p.cRetAge || p.retAge) && retired) {
        var cBaseSpend = (p.cRetSpM || 0) * 12 * 0.70 * infM + (p.cRetSpM || 0) * 12 * 0.15 * infHouse + (p.cRetSpM || 0) * 12 * 0.15 * infHlth;
        spending += cBaseSpend * smM * healthCost;
      }
      // Donations: in retirement, add to spending (increases withdrawal need)
      // In accumulation, deducted from NR after contributions (below)
      if ((p.donAnn || 0) > 0 && retired && alive) spending += (p.donAnn || 0) * infM;
      if (p.ev1Age && age === p.ev1Age) {
        if ((p.ev1Amt || 0) > 0) spending += p.ev1Amt * infM; // expense: increase spending
        else nr += Math.abs(p.ev1Amt || 0) * infM; // windfall: add to NR
      }
      if (p.ev2Age && age === p.ev2Age) {
        if ((p.ev2Amt || 0) > 0) spending += p.ev2Amt * infM;
        else nr += Math.abs(p.ev2Amt || 0) * infM;
      }
      var ptInc = retired && age - p.retAge < (p.ptYrs || 0) ? (p.ptM || 0) * 12 * infM : 0;
      if (p.inc1Age && age >= p.inc1Age) {
        nr += (p.inc1Amt || 0) * infM; nrACB += (p.inc1Amt || 0) * infM;
      }
      if (p.inc2Age && age >= p.inc2Age) {
        nr += (p.inc2Amt || 0) * infM; nrACB += (p.inc2Amt || 0) * infM;
      }
      if (p.inc3Age && age >= p.inc3Age) {
        nr += (p.inc3Amt || 0) * infM; nrACB += (p.inc3Amt || 0) * infM;
      }
      // Spouse one-time events
      if (p.cOn && cAlive && p.cEv1Age && age === p.cEv1Age + ((p.cAge || p.age) - p.age)) {
        if ((p.cEv1Amt || 0) > 0) spending += p.cEv1Amt * infM;
        else nr += Math.abs(p.cEv1Amt || 0) * infM;
      }
      if (p.cOn && cAlive && p.cEv2Age && age === p.cEv2Age + ((p.cAge || p.age) - p.age)) {
        if ((p.cEv2Amt || 0) > 0) spending += p.cEv2Amt * infM;
        else nr += Math.abs(p.cEv2Amt || 0) * infM;
      }
      // Spouse recurring income
      if (p.cOn && cAlive && p.cInc1Age && cAge2 >= p.cInc1Age) {
        nr += (p.cInc1Amt || 0) * infM; nrACB += (p.cInc1Amt || 0) * infM;
      }
      for (var pi = 0; pi < reVals.length; pi++) {
        reVals[pi].v *= 1 + reVals[pi].ri;
      }
      var reNet = 0; var reMtgPay = 0; var smithInv = 0;
      for (var pi2 = 0; pi2 < reVals.length; pi2++) {
        var rp = reVals[pi2];
        // Mortgage amortization: reduce balance by principal portion each year
        if (rp.m > 0 && rp.mPay > 0) {
          var annPay = rp.mPay * 12;
          var intYear = rp.m * rp.mr;
          var prinYear = Math.min(annPay - intYear, rp.m);
          rp.m = Math.max(0, rp.m - prinYear);
          reMtgPay += annPay; // total mortgage payments (P+I)
        }
        // HELOC interest (on drawn amount)
        if (rp.heloc > 0) {
          var helocInt = rp.heloc * rp.helocRate;
          reMtgPay += helocInt; // HELOC interest is a cash outflow
          // Smith Manoeuvre: HELOC interest becomes tax-deductible investment loan
          if (rp.smithOn) { var _smMarg = calcTax(Math.max(1, retired ? (p.retSpM || 4000) * 12 : p.sal * infM), 0, p.prov || 'QC').marg || 0.40; smithInv += helocInt * _smMarg; }
        }
        // Smith Manoeuvre: each year, convert mortgage principal paydown into HELOC investment
        if (rp.smithOn && rp.mPay > 0 && rp.m > 0) {
          var prinPaid = Math.min(rp.mPay * 12 - rp.m * rp.mr, rp.mPay * 12 * 0.5);
          var helocCap = rp.v * rp.helocMax - rp.heloc;
          var smithDraw = Math.min(Math.max(0, prinPaid), Math.max(0, helocCap));
          rp.heloc += smithDraw;
          nr += smithDraw; // Smith proceeds go to non-reg investment
          nrACB += smithDraw;
        }
        // Cash-out refinance at specified age
        if (rp.refiAge > 0 && age === rp.refiAge && rp.v > 0) {
          var refiMax = rp.v * 0.80 - rp.m; // Can refinance up to 80% LTV
          var refiDraw = Math.min(rp.refiAmt || refiMax, Math.max(0, refiMax));
          rp.m += refiDraw;
          // Recalculate mortgage payment
          if (rp.m > 0 && rp.mr > 0) {
            rp.mPay = rp.m * (rp.mr/12) / (1 - Math.pow(1 + rp.mr/12, -25 * 12));
          }
          nr += refiDraw; // Refinance proceeds to NR
          nrACB += refiDraw;
        }
        // HELOC as emergency fund: if need > 0 after all accounts, draw from HELOC
        // (this is handled below in the withdrawal section)
        // DPA (CCA) deduction for rental properties
        var dpaDed = 0;
        if (rp.dpaOn && !rp.pri && rp.ucc > 0 && rp.rm > 0) {
          dpaDed = rp.ucc * rp.dpaRate;
          // DPA cannot exceed net rental income (no rental loss from DPA)
          var grossRent = rp.rm * 12 * Math.pow(1 + (p.reRntInf || 0.02), y);
          var grossCost = (rp.ox + rp.pt + rp.ins) * Math.pow(1 + (p.reCostInf || 0.03), y);
          var netBeforeDpa = grossRent - grossCost;
          dpaDed = Math.min(dpaDed, Math.max(0, netBeforeDpa));
          rp.ucc -= dpaDed;
          rp.totalDpa += dpaDed;
        }
        // Rental income (after DPA deduction)
        if (rp.rm > 0) {
          var rntI = rp.rm * 12 * Math.pow(1 + (p.reRntInf || 0.02), y);
          var cstI = (rp.ox + rp.pt + rp.ins) * Math.pow(1 + (p.reCostInf || 0.03), y);
          reNet += rntI - cstI - dpaDed;
        }
        // Downsizing / sale \u2014 with DPA recapture
        var doSell = (rp.dsAge > 0 && age === rp.dsAge && rp.v > 0) || (rp.sa > 0 && age >= rp.sa && rp.v > 0 && rp.dsAge === 0);
        if (doSell) {
          var grossProc = rp.v;
          var netProc = grossProc - rp.m - rp.heloc;
          if (rp.pri) {
            // Principal residence: CG exempt, no DPA (shouldn't have DPA)
            reNet += netProc;
          } else {
            // Rental: compute recapture + capital gain separately
            var bldgPortion = grossProc * (1 - rp.landPct);
            var landPortion = grossProc * rp.landPct;
            // Recapture: min(totalDPA, bldgSalePrice - UCC) \u2014 taxed at 100%
            var recapture = Math.min(rp.totalDpa, Math.max(0, bldgPortion - rp.ucc));
            // Capital gain: salePrice - originalCost (land + bldg original)
            var origCost = rp.origV;
            var capitalGain = Math.max(0, grossProc - origCost);
            // Tax: recapture at marginal rate, CG at inclusion rate * marginal
            var _propRetInc = retired ? (qpp||0) + (oas||0) + (penMonth||0)*12 + (ptInc||0) : p.sal * infM;
            var _propMarg = (calcTax(Math.max(1, _propRetInc), 0, p.prov || 'QC').marg || 0.42);
            var recapTax = recapture * _propMarg; // recapture taxed at marginal rate
            var cgTax = capitalGain * (rp.cg || 0.5) * _propMarg; // CG inclusion × marginal
            var totalTax = recapTax + cgTax;
            reNet += netProc - totalTax;
          }
          rp.v = 0; rp.m = 0; rp.rm = 0; rp.heloc = 0; rp.ucc = 0;
        }
      }
      reNet -= reMtgPay; // Mortgage payments reduce net RE income
      reNet += smithInv; // Smith Manoeuvre tax benefit adds back
      var _peExit = 0, _pmExit = 0;
      if (pe > 0) {
        var inLock = y < (p.peLock || 3);
        pe *= 1 + (inLock ? retPE * 0.3 : retPE) - (p.peFee || 0.02);
        if (p.peExit > 0 && age >= p.peExit && pe > 0) {
          if (p.peExitStrat === "gradual") {
            var peN = Math.max(1, p.peExitYrs || 5);
            var peSl = pe / Math.max(1, p.peExit + peN - age);
            nr += peSl; nrACB += peSl; _peExit = peSl;
            pe -= peSl;
          } else if (p.peExitStrat === "pct") {
            var pePct = 1 / (p.peExitYrs || 5);
            _peExit = pe * pePct; nr += _peExit; nrACB += _peExit;
            pe *= 1 - pePct;
          } else {
            _peExit = pe; nr += pe; nrACB += pe;
            pe = 0;
          }
          if (pe < 100) pe = 0;
        }
      }
      if (pm > 0) {
        pm *= 1 + retPM;
        if (p.pmExit > 0 && age >= p.pmExit && pm > 0) {
          if (p.pmExitStrat === "gradual") {
            var pmN = Math.max(1, p.pmExitYrs || 5);
            var pmSl = pm / Math.max(1, p.pmExit + pmN - age);
            nr += pmSl; nrACB += pmSl; _pmExit = pmSl;
            pm -= pmSl;
          } else if (p.pmExitStrat === "pct") {
            var pmPct = 1 / (p.pmExitYrs || 5);
            _pmExit = pm * pmPct; nr += _pmExit; nrACB += _pmExit;
            pm *= 1 - pmPct;
          } else {
            _pmExit = pm; nr += pm; nrACB += pm;
            pm = 0;
          }
          if (pm < 100) pm = 0;
        }
      }
      var penMonth = 0;
      if (p.penType === "db" && retired) {
        var penIdx = p.penIdx || 0;
        var penInfAdj = penIdx === 2 ? infM : penIdx === 1 ? Math.pow(1 + p.inf * 0.5, y) : 1;
        penMonth = (p.penM || 0) * penInfAdj;
      }
      var dcCont = 0;
      if (["cd", "rpdb", "rrs", "rver"].indexOf(p.penType) >= 0) {
        dcCont = retired ? 0 : (p.penEE || 0) + (p.penER || 0);
        dc = dc * (1 + retDC - (p.penMER || 0.01)) + dcCont;
        if (retired) { penMonth = (age >= 72 ? getRRIFMin(age, dc) : dc * 0.04) / 12; dc = Math.max(0, dc - penMonth * 12); }
      }
      if (p.bridge && retired && age < (p.brEnd || 65)) penMonth += (p.brAmt || 0) * infM;
      var pen2Month = 0;
      if (p.pen2Type === "db" && retired) {
        var p2InfAdj = p.pen2Idx === 2 ? infM : p.pen2Idx === 1 ? Math.pow(1 + p.inf * 0.5, y) : 1;
        pen2Month = (p.pen2M || 0) * p2InfAdj;
      }
      if (["cd", "rpdb", "rrs", "rver"].indexOf(p.pen2Type) >= 0) {
        dc2 = dc2 * (1 + retDC - (p.penMER || 0.01)) + (retired ? 0 : (p.pen2EE || 0) + (p.pen2ER || 0));
        if (retired) { pen2Month = (age >= 72 ? getRRIFMin(age, dc2) : dc2 * 0.04) / 12; dc2 = Math.max(0, dc2 - pen2Month * 12); }
      }
      penMonth += pen2Month;
      var qpp = age >= p.qppAge ? calcQPP(p.qppAge, p.avgE, p.qppYrs) * 12 * infM : 0;
      var retIncome = retired ? qpp + penMonth * 12 + ptInc + (retired && rr > 0 ? getRRIFMin(age, rr) : 0) : p.sal * infM;
      // OAS pass 1: estimate without withdrawal income (recalculated after withdrawals)
      var oas = age >= p.oasAge ? calcOAS(p.oasAge, retIncome, y, p.inf, age) * 12 : 0;
      var estRrifMin = retired ? getRRIFMin(age, rr) : 0;
      var cEstRrifMin = retired && p.cOn && cAlive ? getRRIFMin(cAge2, crr) : 0;
      var estMelt = 0;
      if (p.melt && retired && age < 72 && rr > 0) {
        var mTgt = (p.meltTgt || 58523) * infM;
        var govEst = qpp + oas + (penMonth || 0) * 12 + ptInc;
        estMelt = Math.max(0, Math.min(rr, mTgt - govEst));
      }
      var gisInc = qpp + (penMonth || 0) * 12 + (ptInc || 0) + estRrifMin + cEstRrifMin + estMelt;
      // calcGIS indexes thresholds internally; pass deflated income
      var gis = age >= 65 ? calcGIS(age, gisInc / Math.max(1, infM), y, p.inf, p.cOn && cAlive) * 12 : 0;
      var gstCredit = 0;
      if (retired) {
        // GST/HST credit 2025: $519/yr single (+ $171/spouse), phaseout 5% above ~$44,324
        var gstBase = 519 + (p.cOn && cAlive ? 171 : 0);
        var gstInc = (qpp + oas + (penMonth || 0) * 12 + (ptInc || 0)) / Math.max(1, infM);
        var gstThresh = 44324;
        gstCredit = Math.max(0, gstBase - 0.05 * Math.max(0, gstInc - gstThresh)) * infM;
      }
      var pc2 = pCr(penMonth * 12, age);
      var cInc = 0;
      var cQppY = 0, cOasY = 0, cPenY = 0, cGisY = 0;
      if (cAlive) {
        if (cRetired && cAge2 >= (p.cQppAge || 65)) { cQppY = calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 * infM; cInc += cQppY; }
        if (cRetired && cAge2 >= (p.cOasAge || 65)) { var _cPenEst = (p.cPenType === 'db' && cRetired ? (p.cPenM || 0) * 12 : 0) + (['cd','rpdb','rrs','rver'].indexOf(p.cPenType) >= 0 && cRetired ? (p.cDCBal || 0) * 0.04 : 0); var _cOasInc = cInc + (cEstRrifMin||0) + _cPenEst; cOasY = calcOAS(p.cOasAge || 65, _cOasInc, y, p.inf, cAge2) * 12; cInc += cOasY; }
        if (cAge2 >= 65) { var _cGisInc = ((p.cAvgE || 0) > 0 ? calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 : 0) + (cEstRrifMin || 0) + (cRetired && p.cPenType === 'db' ? (p.cPenM || 0) * 12 : 0); cGisY = calcGIS(cAge2, _cGisInc, y, p.inf, true) * 12; cInc += cGisY; }
        if (p.cPenType === "db" && cRetired) { cPenY = (p.cPenM || 0) * 12; cInc += cPenY; }
        if (["cd", "rpdb", "rrs", "rver"].indexOf(p.cPenType) >= 0 && cRetired) { var _cdcY = (p.cDCBal || 0) * 0.04; cPenY += _cdcY; cInc += _cdcY; }
      }
      if (p.cOn && !cAlive && cAge2 > cSimDeath) {
          if (cLifeIns > 0) { nr += cLifeIns; cLifeIns = 0; }
        cInc += Math.min(calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 0.6, 784) * 12 * infM;
      }
      var splitB = 0;
      if (p.split && age >= 65 && (penMonth > 0 || rrifMin > 0) && p.cOn && cAlive) {
        // Real pension splitting: eligible income split to spouse
        var eligiblePenInc = penMonth * 12 + (age >= 65 ? rrifMin : 0);
        var splitAmt = eligiblePenInc * (p.splitP || 0.5);
        // Compute actual benefit: tax on full income vs tax after splitting
        var myInc = qpp + oas + penMonth * 12 + (estRrifMin || 0) + ptInc;
        var spInc = cInc || 0;
        var taxBefore = calcTax(myInc / Math.max(1, infM), 0, p.prov || "QC", 0, true).total + calcTax(spInc / Math.max(1, infM), 0, p.prov || "QC", 0, true).total;
        var taxAfter = calcTax((myInc - splitAmt) / Math.max(1, infM), 0, p.prov || "QC", 0, true).total + calcTax((spInc + splitAmt) / Math.max(1, infM), 0, p.prov || "QC", 0, true).total;
        splitB = Math.max(0, taxBefore - taxAfter);
      }
      // QPP/CPP sharing
      var qppShareAdj = 0;
      if (p.qppShare && p.cOn && cAlive && age >= 65 && cAge2 >= 65) {
        var myQpp = qpp;
        var spQpp = calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 * infM;
        var avgQpp = (myQpp + spQpp) / 2;
        qppShareAdj = (myQpp - avgQpp) * 0.15; // Tax benefit from equalization
      }
      var govInc = qpp + oas + gis + gstCredit + penMonth * 12 + reNet + pc2 + ptInc + cInc + splitB + qppShareAdj;
      // Guyton-Klinger Guardrails Ã¢â‚¬â€ dynamic spending adjustment in MC
      var _gkTriggered = 0;
      if (p.gkOn && retired && alive && spending > 0) {
        spending *= gkSpendFactor;
        var _gkBal = rr + tf + nr + lira + fhsa + dc + dc2 + (p.cOn ? crr + ctf + cnr + cLira + cFhsa : 0);
        if (_gkBal > 0) {
          var _gkGov = qpp + oas + gis + (penMonth || 0) * 12 + ptInc + cInc;
          var _gkWithdrawal = Math.max(0, spending - _gkGov);
          var _gkRate = _gkWithdrawal / _gkBal;
          var _gkFloorFactor = 1 - (p.gkMaxCut || 0.25);
          if (_gkRate > (p.gkCeil || 0.055) && gkSpendFactor > _gkFloorFactor) {
            var _gkOldFactor = gkSpendFactor;
            gkSpendFactor = Math.max(_gkFloorFactor, gkSpendFactor * (1 - (p.gkCut || 0.10)));
            spending = spending * (gkSpendFactor / _gkOldFactor);
            _gkTriggered = 1;
          } else if (_gkRate < (p.gkFloor || 0.03) && gkSpendFactor < 1.0) {
            var _gkOldF2 = gkSpendFactor;
            gkSpendFactor = Math.min(1.0, gkSpendFactor * (1 + (p.gkRaise || 0.10)));
            spending = spending * (gkSpendFactor / _gkOldF2);
            _gkTriggered = 2;
          }
        }
      }
      if (_gkTriggered === 1) gkCutCount++;
      if (_gkTriggered === 2) gkRaiseCount++;
      if (retired && alive && gkSpendFactor < 0.999) { gkCutYrs++; gkCurCutStreak++; if (gkCurCutStreak > gkMaxCutStreak) gkMaxCutStreak = gkCurCutStreak; } else { gkCurCutStreak = 0; }
      if (retired && alive) { if (gkSpendFactor < gkMinFactor) gkMinFactor = gkSpendFactor; gkFactorSum += gkSpendFactor; gkFactorN++; }
      if (retired && alive && spending > 0) { var _gkRealSpend = spending / infM; gkSpendSum += _gkRealSpend; gkSpendYrs++; if (_gkRealSpend < gkMinSpendR) gkMinSpendR = _gkRealSpend; }
      if (si === 0) {
        revData[y].rrq = qpp;
        revData[y].psv = oas;
        revData[y].srg = gis;
        revData[y].pen = penMonth * 12 + cInc;
        revData[y].pt = ptInc;
        revData[y].spend = spending;
      }
      if (!retired) {
        var cGr = Math.pow(1 + (p.contGr || 0), y);
        // Salary volatility (Expert): stochastic multiplier on contributions
        var _salMul = 1;
        if ((p.salVol || 0) > 0) { _salMul = Math.max(0.2, 1 + (p.salVol || 0) * (2 * Math.random() - 1)); }
        // Disability interruption (Expert): probability of losing income for X months
        if ((p.disabProb || 0) > 0 && Math.random() < (p.disabProb || 0)) {
          _salMul *= Math.max(0, 1 - (p.disabMo || 6) / 12);
        }
        var _adjGr = cGr * _salMul;
        // TFSA: custom = fixed annual, default = CPI-indexed rounded to $500
        var tfsaLim = p.tfsaC != null ? p.tfsaC : Math.round(7e3 * Math.pow(1 + p.inf, y) / 500) * 500;
        var _mcAnnLim = Math.round(7e3 * Math.pow(1 + p.inf, y) / 500) * 500;
        _mcTfsaRoom += _mcAnnLim + _mcTfsaLastW; _mcTfsaLastW = 0;
        var _mcActualC = Math.min(tfsaLim, _mcTfsaRoom);
        rr = rr * (1 + retRR) + (p.rrspC || 0) * _adjGr;
        tf = tf * (1 + retTF) + _mcActualC;
        _mcTfsaRoom -= _mcActualC;
        var nrDrag = p.nrTaxDrag || 9e-3;
        nr = nr * (1 + retNR - nrDrag) + (p.nrC || 0) * _adjGr;
        nrACB += (p.nrC || 0) * _adjGr; // ACB increases with contributions
        // LIRA grows like RRSP (locked, no contributions)
        if (lira > 0) lira *= 1 + retRR;
        if (cLira > 0) cLira *= 1 + retRR;
        // R6-IPP: IPP grows like RRSP during accumulation (locked, employer-funded)
        if (p.ippOn && _ippBal > 0) _ippBal *= 1 + retRR;
        // FHSA/CELIAPP: grows tax-free, contributions, lifecycle rules
        if (fhsa > 0 || fhsaContrib < fhsaMax) {
          fhsa *= (1 + retTF);
          if (!retired && fhsaContrib < fhsaMax) {
            var _fhsaAdd = Math.min(p.fhsaC || 0, 8000, fhsaMax - fhsaContrib);
            fhsa += _fhsaAdd; fhsaContrib += _fhsaAdd;
          }
          if (p.fhsaForHome && p.fhsaHomeAge > 0 && age === p.fhsaHomeAge && fhsa > 0) {
            nr += fhsa; nrACB += fhsa; fhsa = 0; fhsaContrib = fhsaMax;
          }
          var _fhsaYrsOpen = y + Math.min(5, Math.ceil((p.fhsaBal || 0) / 8000)); if ((age >= 71 || _fhsaYrsOpen >= 15) && fhsa > 0 && !p.fhsaForHome) {
            rr += fhsa; fhsa = 0;
          }
        }
        if (p.cOn && (cFhsa > 0 || cFhsaContrib < fhsaMax)) {
          cFhsa *= (1 + retTF);
          if (!cRetired && cFhsaContrib < fhsaMax) {
            var _cfhsaAdd = Math.min(p.cFhsaC || 0, 8000, fhsaMax - cFhsaContrib);
            cFhsa += _cfhsaAdd; cFhsaContrib += _cfhsaAdd;
          }
          if ((cAge2 >= 71 || y >= (15 - ((p.cFhsaBal||0) > 0 ? Math.min(3, Math.ceil((p.cFhsaBal||0) / 8000)) : 0))) && cFhsa > 0) {
            crr += cFhsa; cFhsa = 0;
          }
        }
        // Life insurance premium deducted from NR
        if (lifeInsPrem > 0 && nr >= lifeInsPrem) nr -= lifeInsPrem;
        if (cLifeInsPrem > 0 && p.cOn && cAlive && cnr >= cLifeInsPrem) cnr -= cLifeInsPrem;
        // RESP: deduct annual contribution from NR (cash flow impact) \u00d7 number of kids
        if (p.respOn && y < (p.respYrsLeft || 0)) {
          var respAnnual = (p.respContrib || 0) * 12 * (p.respKids || 1);
          nr = Math.max(0, nr - respAnnual);
        }
        if (p.respOn && p.respReturnAge > 0 && age === p.respReturnAge) {
          var _rspTotC = (p.respAlready || 0) + (p.respContrib || 0) * 12 * (p.respYrsLeft || 0) * (p.respKids || 1);
          var _rspCesg = Math.min((p.respContrib || 0) * 12, 2500) * 0.2 * (p.respYrsLeft || 0) * (p.respKids || 1);
          var _rspGrYrs = Math.max(1, (p.respReturnAge || 48) - p.age);
          var _rspTotal = (_rspTotC + _rspCesg) * Math.pow(1.05, _rspGrYrs);
          nr += _rspTotal; nrACB += _rspTotal;
        }
        // [R14 FIX #16]: Duplicate RESP return block removed — was counting capital return 2×
        // Donations pre-retirement: deducted from NR (reduces savings)
        if ((p.donAnn || 0) > 0 && alive) nr = Math.max(0, nr - (p.donAnn || 0) * infM);
        if (p.cOn && cAlive && !cRetired) {
          var _cSalMul = 1;
          if ((p.salVol || 0) > 0) { _cSalMul = Math.max(0.2, 1 + (p.salVol || 0) * (2 * Math.random() - 1)); }
          if ((p.disabProb || 0) > 0 && Math.random() < (p.disabProb || 0)) { _cSalMul *= Math.max(0, 1 - (p.disabMo || 6) / 12); }
          var _cAdjGr = cGr * _cSalMul;
          var cTfsaLim = p.cTFSAC != null ? p.cTFSAC : Math.round(7e3 * Math.pow(1 + p.inf, y) / 500) * 500;
          crr = crr * (1 + retRR) + (p.cRRSPC || 0) * _cAdjGr;
          ctf = ctf * (1 + retTF) + cTfsaLim;
          cnr = cnr * (1 + retNR - (p.nrTaxDrag || 9e-3)) + (p.cNRC || 0) * _cAdjGr;
        }
      } else {
        // Retirement: accounts grow, no new contributions
        rr *= 1 + retRR;
        tf *= 1 + retTF;
        nr *= 1 + retNR - (p.nrTaxDrag || 9e-3);
        // TFSA room still accumulates in retirement (CRA adds limit every Jan 1)
        _mcTfsaRoom += Math.round(7e3 * Math.pow(1 + p.inf, y) / 500) * 500 + _mcTfsaLastW;
        _mcTfsaLastW = 0;
        // LIRA \u2192 at retirement, acts as FRV (same RRIF min, plus max cap)
        var liraWith = 0, cLiraWith = 0;
        if (lira > 0) {
          lira *= 1 + retRR;
          var liraMin = getRRIFMin(age, lira);
          // FRV max: QC rules \u2014 max(RRIF min, balance / (90-age)) capped at balance
          var liraMax = age >= 55 ? lira * Math.max(getRRIFMin(age, 1), 1 / Math.max(1, 90 - age)) : 0;
          liraMax = Math.max(liraMin, liraMax);
          // Withdraw the max allowed (FRV is locked, withdraw as much as permitted)
          liraWith = Math.min(lira, liraMax);
          lira -= liraWith;
          if (lira < 100) { liraWith += lira; lira = 0; }
        }
        if (cLira > 0 && p.cOn && cAlive) {
          cLira *= 1 + retRR;
          var cLiraMin = getRRIFMin(cAge2, cLira);
          cLiraWith = cLiraMin;
          cLira -= cLiraWith;
          if (cLira < 100) { cLiraWith += cLira; cLira = 0; }
        }
        // R6-IPP: In retirement, IPP distributes like RRIF (taxable income)
        var _ippWith = 0;
        if (p.ippOn && _ippBal > 0) {
          _ippBal *= 1 + retRR;
          _ippWith = getRRIFMin(age, _ippBal);
          _ippBal -= _ippWith;
          if (_ippBal < 100) { _ippWith += _ippBal; _ippBal = 0; }
        }
        // RESP: deduct annual contribution from NR (cash flow impact) \u00d7 number of kids
        if (p.respOn && y < (p.respYrsLeft || 0)) {
          var respAnnual = (p.respContrib || 0) * 12 * (p.respKids || 1);
          nr = Math.max(0, nr - respAnnual);
        }
        if (p.cOn && cAlive) {
          crr *= 1 + retRR;
          ctf *= 1 + retTF;
          cnr *= 1 + retNR - (p.nrTaxDrag || 9e-3);
        }
        var rrifMin = getRRIFMin(age, rr), cRrifMin = p.cOn && cAlive ? getRRIFMin(cAge2, crr) : 0;
        if (rrifMin > 0) rr -= rrifMin;
        if (cRrifMin > 0) crr -= cRrifMin;
        var meltAmt = 0;
        if (p.melt && retired && rr > 0) {
          // Meltdown: before RRIF age (72), fill to target bracket
          var mTarget = (p.meltTgt || 58523) * infM;
          if (age < 72) {
            meltAmt = Math.max(0, Math.min(rr, mTarget - govInc));
          }
          if (meltAmt > 0) rr -= meltAmt;
        }
        var need = Math.max(0, spending - govInc - rrifMin - cRrifMin - meltAmt);
        if (p.cOn && cAge2 === Math.floor(cSimDeath) && y > 0) {
          rr += crr;
          tf += ctf;
          nr += cnr;
          lira += cLira; // LOG-07: transfer spouse LIRA
          crr = 0;
          ctf = 0;
          cnr = 0;
          cLira = 0;
        }
        var _wFromRR = 0, _wFromTF = 0, _wFromNR = 0, _wFromCRR = 0, _wFromCTF = 0, _wFromCNR = 0;
        if (p.wStrat === "optimized" && p._optSchedule && p._optSchedule[y]) {
          // Use pre-computed optimized schedule
          var os = p._optSchedule[y];
          // Apply meltdown from schedule (override the simple meltdown above)
          var osMelt = Math.min(rr, Math.max(0, (os.meltdown || 0) - meltAmt));
          if (osMelt > 0) { rr -= osMelt; meltAmt += osMelt; }
          // Apply withdrawals from schedule, capped by available balances
          var osNR = Math.min(nr, os.fromNR || 0); nr -= osNR; _wFromNR = osNR;
          var osRR = Math.min(rr, os.fromRRSP || 0); rr -= osRR; _wFromRR = osRR;
          var osTF = Math.min(tf, os.fromTFSA || 0); tf -= osTF; _wFromTF = osTF;
          // If schedule didn't cover the need (stochastic variance), fill remaining
          var remain = Math.max(0, need - osNR - osRR - osTF);
          if (remain > 0) {
            var rx = Math.min(nr, remain); nr -= rx; remain -= rx; _wFromNR += rx;
            rx = Math.min(rr, remain); rr -= rx; remain -= rx; _wFromRR += rx;
            rx = Math.min(tf, remain); tf -= rx; remain -= rx; _wFromTF += rx;
          }
        } else if (p.wStrat === "optimal") {
          var w = Math.min(nr, need);
          nr -= w; _wFromNR = w;
          need -= w;
          w = Math.min(rr, need);
          rr -= w; _wFromRR = w;
          need -= w;
          w = Math.min(tf, need);
          tf -= w; _wFromTF = w;
          need -= w;
          if (p.cOn) {
            w = Math.min(crr, need);
            crr -= w; _wFromCRR += w;
            need -= w;
            w = Math.min(ctf, need);
            ctf -= w; _wFromCTF += w;
            need -= w;
            w = Math.min(cnr, need);
            cnr -= w; _wFromCNR += w;
            need -= w;
          }
        } else {
          var w2 = Math.min(tf, need);
          tf -= w2; _wFromTF = w2;
          need -= w2;
          w2 = Math.min(nr, need);
          nr -= w2; _wFromNR = w2;
          need -= w2;
          w2 = Math.min(rr, need);
          rr -= w2; _wFromRR = w2;
          need -= w2;
          if (p.cOn) {
            w2 = Math.min(ctf, need);
            ctf -= w2; _wFromCTF += w2;
            need -= w2;
            w2 = Math.min(crr, need);
            crr -= w2; _wFromCRR += w2;
            need -= w2;
            w2 = Math.min(cnr, need);
            cnr -= w2; _wFromCNR += w2;
            need -= w2;
          }
        }
        if (si === 0) {
          // R6: Cap ret at total financial assets available to withdraw
          var _rvBal = rr + tf + nr + pe + pm + dc + (p.cOn ? crr + ctf + cnr : 0);
          revData[y].ret = Math.min(Math.max(0, spending - govInc), Math.max(0, _rvBal));
          revData[y].wFromRR = _wFromRR; revData[y].wFromTF = _wFromTF; revData[y].wFromNR = _wFromNR;
          revData[y].wRrifMin = rrifMin; revData[y].wMelt = meltAmt;
        }
        // FORCED PROPERTY LIQUIDATION when financial assets depleted
        // TFSA-first: use tracked _mcTfsaRoom (proper room accounting)
        if (need > 0 && retired) {
          // Step 1: Sell rental properties (cheapest equity first)
          var _mcRentals = [];
          for (var _mri2 = 0; _mri2 < reVals.length; _mri2++) {
            if (reVals[_mri2].v > 0 && !((p.props||[])[_mri2]||{}).pri) {
              _mcRentals.push({ idx: _mri2, eq: reVals[_mri2].v - reVals[_mri2].m - (reVals[_mri2].heloc||0) });
            }
          }
          _mcRentals.sort(function(a,b){return a.eq - b.eq;});
          for (var _mcr = 0; _mcr < _mcRentals.length && need > 0; _mcr++) {
            var _mcrp = reVals[_mcRentals[_mcr].idx];
            var _mcNet = Math.max(0, (_mcrp.v - _mcrp.m - (_mcrp.heloc||0)) * 0.95);
            var _mcToTF = Math.min(_mcNet, _mcTfsaRoom);
            tf += _mcToTF; _mcTfsaRoom -= _mcToTF;
            var _mcToNR = _mcNet - _mcToTF;
            nr += _mcToNR; nrACB += _mcToNR;
            _mcrp.v = 0; _mcrp.m = 0; _mcrp.heloc = 0;
            // Withdraw: TFSA first
            var _mcuTf = Math.min(tf, need);
            tf -= _mcuTf; need -= _mcuTf;
            var _mcuNr = Math.min(nr, need);
            nr -= _mcuNr; _wFromNR += _mcuNr; need -= _mcuNr;
          }
          // Step 2: Sell primary residence (last resort) + model rent
          if (need > 0) {
            for (var _mcp = 0; _mcp < reVals.length; _mcp++) {
              if (reVals[_mcp].v > 0 && ((p.props||[])[_mcp]||{}).pri && need > 0) {
                var _mcpNet = Math.max(0, (reVals[_mcp].v - reVals[_mcp].m - (reVals[_mcp].heloc||0)) * 0.95);
                var _mcpToTF = Math.min(_mcpNet, _mcTfsaRoom);
                tf += _mcpToTF; _mcTfsaRoom -= _mcpToTF;
                var _mcpToNR = _mcpNet - _mcpToTF;
                nr += _mcpToNR; nrACB += _mcpToNR;
                reVals[_mcp].v = 0; reVals[_mcp].m = 0; reVals[_mcp].heloc = 0;
                var _mcRent = 1500 * 12 * Math.pow(1 + (p.inf || 0.021), y);
                spending += _mcRent; need += _mcRent;
                var _mcpuTf = Math.min(tf, need);
                tf -= _mcpuTf; need -= _mcpuTf;
                var _mcpuNr = Math.min(nr, need);
                nr -= _mcpuNr; _wFromNR += _mcpuNr; need -= _mcpuNr;
              }
            }
          }
        }
        // ACB: reduce proportionally on NR withdrawals
        if (_wFromNR > 0 && (nr + _wFromNR) > 0) {
          nrACB = Math.max(0, nrACB * (1 - _wFromNR / (nr + _wFromNR)));
        }
      }
      // OAS pass 2: recalculate with actual taxable income (withdrawals + meltdown)
      if (retired && age >= p.oasAge) {
        var _oasFullInc = qpp + (penMonth || 0) * 12 + (ptInc || 0) + (rrifMin || 0) + (cRrifMin || 0) + (meltAmt || 0) + (_wFromRR || 0) + (reNet || 0) + (liraWith || 0);
        var oasNew = calcOAS(p.oasAge, _oasFullInc, y, p.inf, age) * 12;
        if (oasNew !== oas) {
          govInc += (oasNew - oas); // adjust govInc with the OAS delta
          oas = oasNew;
        }
      }
      // GIS pass 2: recalculate with actual non-OAS taxable income after withdrawals
      // Includes: RRSP withdrawals, RRIF min, meltdown, LIRA, rental income
      // Correctly excludes: TFSA withdrawals (tax-free, not reported on T1)
      // Note: GIS tests income not assets (Line 23600). TFSA-heavy retirees legitimately qualify.
      if (retired && age >= 65 && gis > 0) {
        var _gisFullInc = qpp + (penMonth || 0) * 12 + (ptInc || 0) + (rrifMin || 0) + (cRrifMin || 0) + (meltAmt || 0) + (_wFromRR || 0) + (reNet > 0 ? reNet : 0) + (liraWith || 0) + (cLiraWith || 0);
        var gisNew = calcGIS(age, _gisFullInc / Math.max(1, infM), y, p.inf, p.cOn && cAlive) * 12;
        if (gisNew !== gis) {
          govInc += (gisNew - gis);
          gis = gisNew;
          if (si === 0) revData[y].srg = gis;
        }
      }
      // ═══ CCPC Corporate Logic (Ref: PASSATION_CCPC_MODULE.md §5.5) ═══
      var _bizDivInfo = null; // divInfo to pass to calcTax
      var _bizSaleCGtaxable = 0;
      _bizCorpTaxThisYr = 0; _bizDivThisYr = 0; _bizSalThisYr = 0; _bizExtractThisYr = 0;
      if (p.bizOn && p.bizType === "ccpc") {
        if (!retired && alive) {
          // Pre-retirement: business income + compensation
          var _bizVolNoise = p.bizVolatility > 0 ? tRn(999) * p.bizVolatility : 0;
          var _bizRealGrowth = Math.pow(1 + (p.bizGrowth || 0), y);
          var _bizGross = Math.max(0, (p.bizRevenue || 0) * infM * _bizRealGrowth * (1 + _bizVolNoise));
          var _bizNetInc = Math.max(0, _bizGross - (p.bizExpenses || 0) * infM * _bizRealGrowth - (_bizDebt > 0 ? _bizDebtPay : 0));
          // Debt reduction
          if (_bizDebt > 0) {
            var _bizIntPay = _bizDebt * (p.bizDebtRate || 0);
            var _bizPrinPay = Math.max(0, _bizDebtPay - _bizIntPay);
            _bizDebt = Math.max(0, _bizDebt - _bizPrinPay);
          }
          // Compensation split
          var _bizPersSal = 0, _bizDivCash = 0, _bizCorpPreTax = 0;
          if (p.bizRemun === "salary" || !p.bizRemun) {
            _bizPersSal = _bizNetInc;
          } else if (p.bizRemun === "dividend") {
            _bizCorpPreTax = _bizNetInc;
            var _bizCT = calcCorpTax(_bizCorpPreTax, 0, p.prov || "QC", y, p.inf);
            _bizCorpTaxThisYr = _bizCT.totalTax;
            _bizDivCash = _bizCorpPreTax - _bizCT.totalTax;
            corpGRIP += _bizCT.generalPortion; // GRIP tracks general-rate income
          } else { // mix
            var _salPct = p.bizSalaryPct || 0.5;
            _bizPersSal = _bizNetInc * _salPct;
            _bizCorpPreTax = _bizNetInc - _bizPersSal;
            var _bizCT = calcCorpTax(_bizCorpPreTax, 0, p.prov || "QC", y, p.inf);
            _bizCorpTaxThisYr = _bizCT.totalTax;
            _bizDivCash = _bizCorpPreTax - _bizCT.totalTax;
            corpGRIP += _bizCT.generalPortion;
          }
          _bizSalThisYr = _bizPersSal;
          _bizDivThisYr = _bizDivCash;
          _bizCumSalary += _bizPersSal; _bizSalYrs += (_bizPersSal > 0 ? 1 : 0);
          // Set divInfo for personal tax calc
          if (_bizDivCash > 0) {
            // Determine dividend type: SBD portion → non-eligible, general → eligible
            var _eligPortion = corpGRIP > 0 ? Math.min(_bizDivCash, corpGRIP) : 0;
            var _nonEligPortion = _bizDivCash - _eligPortion;
            _bizDivInfo = { eligDiv: _eligPortion, nonEligDiv: _nonEligPortion };
            corpGRIP = Math.max(0, corpGRIP - _eligPortion); // R14 FIX #26: decrement GRIP
          }
          // Passive income on retained earnings
          if (corpBal > 0) {
            var _corpEqR = (p.bizInvAlloc || 0.4);
            var _corpReturn = corpBal * (_corpEqR * eqR + (1 - _corpEqR) * bndR);
            var _corpPassiveTx = calcCorpTax(0, Math.max(0, _corpReturn), p.prov || "QC", y, p.inf);
            corpBal += _corpReturn - _corpPassiveTx.totalTax;
            corpRDTOH += _corpPassiveTx.rdtohAdded;
            _bizCorpTaxThisYr += _corpPassiveTx.totalTax;
            // CDA: 50% of capital gains on passive investments (simplified: assume equity portion is gains)
            var _corpCGportion = Math.max(0, _corpReturn * _corpEqR * 0.5);
            corpCDA += _corpCGportion * (1 - (p.cgIncLo || 0.5));
          }
        } else if (retired && alive && corpBal > 0) {
          // Post-retirement: passive income + extraction — §5.5
          _bizYrsSinceRet++;
          var _corpEqR2 = (p.bizInvAlloc || 0.4);
          var _corpReturn2 = corpBal * (_corpEqR2 * eqR + (1 - _corpEqR2) * bndR);
          var _corpPassiveTx2 = calcCorpTax(0, Math.max(0, _corpReturn2), p.prov || "QC", y, p.inf);
          corpBal += _corpReturn2 - _corpPassiveTx2.totalTax;
          corpRDTOH += _corpPassiveTx2.rdtohAdded;
          _bizCorpTaxThisYr = _corpPassiveTx2.totalTax;
          // Extraction
          var _extYrsLeft = Math.max(1, (p.bizExtractYrs || 10) - _bizYrsSinceRet + 1);
          var _extractAmt = Math.min(corpBal, corpBal / _extYrsLeft);
          // OAS optimization: cap extraction to keep grossed-up income below OAS threshold
          if (p.bizOasOptim && _extractAmt > 0) {
            var _oasThresh = OAS_CLAWBACK_THR * infM;
            var _otherInc = (qpp || 0) + (oas || 0) + (penMonth || 0) * 12 + (rrifMin || 0);
            var _maxDiv = Math.max(0, (_oasThresh - _otherInc) / 1.15); // conservative: use non-elig gross-up
            _extractAmt = Math.min(_extractAmt, Math.max(_maxDiv, 0));
          }
          if (_extractAmt > 0) {
            // CDA first (tax-free)
            var _cdaExtract = Math.min(corpCDA, _extractAmt);
            corpCDA -= _cdaExtract;
            var _taxableExtract = _extractAmt - _cdaExtract;
            // RDTOH refund
            var _rdtohRefund = Math.min(corpRDTOH, _extractAmt * 0.3833);
            corpRDTOH = Math.max(0, corpRDTOH - _rdtohRefund);
            corpBal = Math.max(0, corpBal - _extractAmt);
            _bizExtractThisYr = _extractAmt;
            _bizDivThisYr = _extractAmt; // total received including CDA
            // Taxable portion → dividends
            if (_taxableExtract > 0) {
              var _eligEx = corpGRIP > 0 ? Math.min(_taxableExtract, corpGRIP) : 0;
              var _nonEligEx = _taxableExtract - _eligEx;
              _bizDivInfo = { eligDiv: _eligEx, nonEligDiv: _nonEligEx };
              corpGRIP = Math.max(0, corpGRIP - _eligEx); // R14 FIX #26: decrement GRIP
            }
          }
        }
        // Business sale — §5.5
        if (p.bizSaleAge > 0 && age === p.bizSaleAge) {
          var _saleGain = Math.max(0, (p.bizSalePrice || 0) * infM - (p.bizSaleACB || 100));
          var _lcgeAvail = p.bizLCGE ? 1250000 : 0;
          var _taxableGainBiz = Math.max(0, _saleGain - _lcgeAvail);
          var _exemptGain = Math.min(_saleGain, _lcgeAvail);
          corpCDA += _exemptGain * 0.5 + _taxableGainBiz * (1 - (p.cgIncLo || 0.5));
          // Taxable capital gain added to personal income for this year
          var _bizSaleCGtaxable = _taxableGainBiz > (p.cgThresh || 25e4) * infM ?
            (p.cgThresh || 25e4) * infM * (p.cgIncLo || 0.5) + (_taxableGainBiz - (p.cgThresh || 25e4) * infM) * (p.cgIncHi || 0.6667) :
            _taxableGainBiz * (p.cgIncLo || 0.5);
          // Add sale proceeds to corp balance
          corpBal += (p.bizSalePrice || 0) * infM;
        }
      }
      if (si === 0) {
        var taxableInc, cTaxableInc = 0;
        var _tiQpp = 0, _tiOas = 0, _tiPen = 0, _tiRrif = 0, _tiMelt = 0, _tiDraw = 0, _tiRe = 0, _tiOther = 0;
        var _ctiQpp = 0, _ctiOas = 0, _ctiPen = 0, _ctiRrif = 0, _ctiOther = 0;
        if (retired) {
          var rrspDraw = Math.max(0, (spending || 0) - govInc);
          _tiQpp = qpp || 0;
          _tiOas = oas || 0;
          _tiPen = (penMonth || 0) * 12;
          _tiRrif = rrifMin || 0;
          _tiMelt = meltAmt || 0;
          _tiDraw = _wFromRR || 0; // R14: use actual RRSP withdrawal, not spending need
          _tiRe = reNet || 0;
          // PE/PM exits: taxable as capital gains (50% inclusion for first 250K, 66.7% above)
          var _pepmGain = (_peExit || 0) + (_pmExit || 0);
          var _pepmTaxable = 0;
          if (_pepmGain > 0) {
            var _cgThr = (p.cgThresh || 25e4) * infM;
            _pepmTaxable = _pepmGain > _cgThr ? _cgThr * (p.cgIncLo || 0.5) + (_pepmGain - _cgThr) * (p.cgIncHi || 0.6667) : _pepmGain * (p.cgIncLo || 0.5);
          }
          _tiOther = (ptInc || 0) + (liraWith || 0) + (_ippWith || 0) + _pepmTaxable;
          if (p.cOn && cAlive) {
            var cQppInc = cAge2 >= (p.cQppAge || 65) ? calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 * infM : 0;
            var cPenInc = 0;
            if (p.cPenType === "db" && cRetired) cPenInc = (p.cPenM || 0) * 12;
            if (["cd", "rpdb", "rrs", "rver"].indexOf(p.cPenType) >= 0 && cRetired) cPenInc = (p.cDCBal || 0) * 0.04;
            _ctiQpp = cQppInc; _ctiPen = cPenInc;
            _ctiRrif = cEstRrifMin || 0;
            _ctiOther = (cLiraWith || 0);
            _ctiOther += _wFromCRR; // spouse RRSP voluntary withdrawals are taxable
            var _cActualInc = _ctiQpp + _ctiPen + _ctiRrif + _ctiOther;
            var cOasInc = cAge2 >= (p.cOasAge || 65) ? calcOAS(p.cOasAge || 65, _cActualInc, y, p.inf, cAge2) * 12 : 0;
            _ctiOas = cOasInc;
            cTaxableInc = Math.max(0, _ctiQpp + _ctiOas + _ctiPen + _ctiRrif + _ctiOther);
          } else if (p.cOn && !cAlive) {
            cTaxableInc = 0;
          }
          // NR capital gains: only the gain portion is taxable at inclusion rate
          var _nrGainPct = (nr + _wFromNR) > 0 && nrACB < (nr + _wFromNR) ? 1 - nrACB / (nr + _wFromNR) : 0;
          var _nrTaxableGain = _wFromNR * _nrGainPct;
          var _cgThr3 = (p.cgThresh || 25e4) * infM;
          var _nrIncl = _nrTaxableGain > _cgThr3 ? _cgThr3 * (p.cgIncLo || 0.5) + (_nrTaxableGain - _cgThr3) * (p.cgIncHi || 0.6667) : _nrTaxableGain * (p.cgIncLo || 0.5);
          taxableInc = _tiQpp + _tiOas + _tiPen + _tiRrif + _tiMelt + _tiDraw + _tiRe + _tiOther + _nrIncl;
        } else {
          taxableInc = p.sal * infM;
          // CCPC: biz compensation is ADDITIVE to employment salary — §5.5
          if (p.bizOn && p.bizType === "ccpc") {
            if (_bizSalThisYr > 0) {
              taxableInc += _bizSalThisYr; // biz salary + employment salary
            }
            if (p.bizRemun === "dividend" && p.sal <= 0) {
              taxableInc = 0; // pure dividend, no employment → no salary income
            }
          }
          if (p.cOn && cAlive && !cRetired) cTaxableInc = (p.cSal || 0) * infM;
        }
        taxableInc = Math.max(0, taxableInc);
        // CCPC: add business sale capital gain if applicable
        if (p.bizOn && p.bizSaleAge > 0 && age === p.bizSaleAge && typeof _bizSaleCGtaxable !== "undefined") {
          taxableInc += _bizSaleCGtaxable;
        }
        var yrTx1 = calcTax(taxableInc, y, p.prov || "QC", _infEff, retired, _bizDivInfo);
        var yrTx2 = p.cOn && (cAlive || cTaxableInc > 0) ? calcTax(cTaxableInc, y, p.prov || "QC", _infEff, cRetired) : { total: 0, fed: 0, prov: 0, eff: 0, marg: 0 };
        var yrTx = { total: yrTx1.total + yrTx2.total, fed: yrTx1.fed + yrTx2.fed, prov: yrTx1.prov + yrTx2.prov, eff: (taxableInc + cTaxableInc) > 0 ? (yrTx1.total + yrTx2.total) / (taxableInc + cTaxableInc) : 0, marg: Math.max(yrTx1.marg, yrTx2.marg) };
        taxableInc = taxableInc + cTaxableInc;
        // FTQ/CSN 30% credit (pre-retirement only) \u2014 display only in si===0
        var ftqCredit = 0;
        if (!retired && p.ftqOn && p.ftqAmt > 0) {
          ftqCredit = Math.min(p.ftqAmt, 5000) * 0.3;
          yrTx.total = Math.max(0, yrTx.total - ftqCredit);
        }
        // Donation tax credit (charitable giving)
        var donCredit = 0;
        if ((p.donAnn || 0) > 0) {
          var _donR = (p.donAnn || 0) * infM;
          var _donFed = Math.min(_donR, 200 * infM) * 0.15 + Math.max(0, _donR - 200 * infM) * 0.29;
          var _pt2 = PROV_TAX[p.prov || "QC"] || PROV_TAX.QC;
          var _donProv = Math.min(_donR, 200 * infM) * (_pt2.r[0] || 0.15) + Math.max(0, _donR - 200 * infM) * (_pt2.r[Math.min(1, _pt2.r.length - 1)] || 0.20);
          donCredit = (_donFed * (_pt2.abate || 1)) + _donProv;
          yrTx.total = Math.max(0, yrTx.total - donCredit);
        }
        revData[y].tax = yrTx.total;
        revData[y].tax1 = yrTx1 ? yrTx1.total : yrTx.total;
        revData[y].tax2 = yrTx2 ? yrTx2.total : 0;
        revData[y].taxInc1 = taxableInc - cTaxableInc;
        revData[y].taxInc2 = cTaxableInc || 0;
        revData[y].ftqCredit = ftqCredit;
        revData[y].taxInc = taxableInc;
        revData[y].tiQpp = _tiQpp; revData[y].tiOas = _tiOas; revData[y].tiPen = _tiPen;
        revData[y].tiRrif = _tiRrif; revData[y].tiMelt = _tiMelt; revData[y].tiDraw = _tiDraw;
        revData[y].tiRe = _tiRe; revData[y].tiOther = _tiOther;
        revData[y].aRR = rr; revData[y].aTF = tf; revData[y].aNR = nr;
        revData[y].aPE = pe; revData[y].aPM = pm; revData[y].aRE = reTotal;
        revData[y].peExit = _peExit; revData[y].pmExit = _pmExit;
        revData[y].aLIRA = lira; revData[y].aCLIRA = cLira;
        revData[y].liraWith = liraWith || 0; revData[y].cLiraWith = cLiraWith || 0;
        revData[y].aDC = dc + dc2; revData[y].aCRR = crr; revData[y].aCTF = ctf; revData[y].aCNR = cnr;
        revData[y].gis = gis || 0;
        // CCPC revData fields — §5.6
        revData[y].corpBal = corpBal; revData[y].corpDiv = _bizDivThisYr; revData[y].bizGross = _bizGross || 0;
        revData[y].corpSal = _bizSalThisYr; revData[y].corpTax = _bizCorpTaxThisYr;
        revData[y].corpCDA = corpCDA; revData[y].corpRDTOH = corpRDTOH;
        revData[y].corpExtract = _bizExtractThisYr; revData[y].bizDebt = _bizDebt;
        revData[y].ippBal = _ippBal;
      }
      // FTQ: contribution deducted from NR; tax credit applied in si===0 block above
      if (!retired && p.ftqOn && p.ftqAmt > 0) {
        nr = Math.max(0, nr - Math.min(p.ftqAmt, 5000));
      }
      rr = Math.max(rr, 0);
      tf = Math.max(tf, 0);
      nr = Math.max(nr, 0);
      pe = Math.max(pe, 0);
      pm = Math.max(pm, 0);
      crr = Math.max(crr, 0);
      ctf = Math.max(ctf, 0);
      cnr = Math.max(cnr, 0);
      // Compute tax for ALL simulations (lightweight)
      var _simTax = 0;
      if (si > 0) {
        var _simTaxInc1 = retired ? (qpp || 0) + (oas || 0) + (penMonth || 0) * 12 + (rrifMin || 0) + (meltAmt || 0) + (_wFromRR || 0) + (ptInc || 0) + (liraWith || 0) + (_ippWith || 0) + (reNet || 0) : p.sal * infM;
        // R14 FIX #29: include NR capital gains in si>0 tax (parity with si===0)
        if (retired && _wFromNR > 0 && (nr + _wFromNR) > 0 && nrACB < (nr + _wFromNR)) {
          var _simNrGainPct = 1 - nrACB / (nr + _wFromNR);
          var _simNrGain = _wFromNR * _simNrGainPct;
          var _simCgThr = (p.cgThresh || 25e4) * infM;
          _simTaxInc1 += _simNrGain > _simCgThr ? _simCgThr * (p.cgIncLo || 0.5) + (_simNrGain - _simCgThr) * (p.cgIncHi || 0.6667) : _simNrGain * (p.cgIncLo || 0.5);
        }
        var _simTaxInc2 = 0;
        if (p.cOn && cAlive) {
          _simTaxInc2 = retired ? (cEstRrifMin || 0) + (cLiraWith || 0) : (p.cSal || 0) * infM;
          if (cRetired && cAge2 >= (p.cQppAge || 65)) _simTaxInc2 += calcQPP(p.cQppAge || 65, p.cAvgE || 0, p.cQppYrs || 0) * 12 * infM;
          if (cRetired && cAge2 >= (p.cOasAge || 65)) _simTaxInc2 += calcOAS(p.cOasAge || 65, _simTaxInc2, y, p.inf, cAge2) * 12;
          if (p.cPenType === "db" && cRetired) _simTaxInc2 += (p.cPenM || 0) * 12;
        }
        _simTax = (_simTaxInc1 > 0 ? calcTax(Math.max(0, _simTaxInc1), y, p.prov || "QC", _infEff, retired).total : 0) + (_simTaxInc2 > 0 ? calcTax(Math.max(0, _simTaxInc2), y, p.prov || "QC", _infEff, cRetired).total : 0);
      }
      var reTotal = reVals.reduce(function(s, rp2) {
        return s + rp2.v - rp2.m;
      }, 0);
      var total = alive ? rr + tf + nr + pe + pm + crr + ctf + cnr + fhsa + cFhsa + reTotal + dc + dc2 + lira + cLira + (p.bizOn ? corpBal : 0) + (p.ippOn ? _ippBal : 0) : 0;
      var _yrTax = si === 0 ? (yrTx ? yrTx.total : 0) : _simTax;
      var _p1Tax = si === 0 ? (yrTx1 ? yrTx1.total : (yrTx ? yrTx.total : 0)) : (_simTaxInc1 > 0 ? calcTax(Math.max(0, _simTaxInc1), y, p.prov || "QC", _infEff, retired).total : 0);
      var _p2Tax = si === 0 ? (yrTx2 ? yrTx2.total : 0) : (_simTaxInc2 > 0 ? calcTax(Math.max(0, _simTaxInc2), y, p.prov || "QC", _infEff, cRetired).total : 0);
      path.push({ total, rr, tf, nr, pe, pm, crr, ctf, cnr, fhsa: fhsa, cFhsa: cFhsa, dc: dc, dc2: dc2, disc: total / (infM || 1), re: reTotal, corp: p.bizOn ? corpBal : 0, ipp: p.ippOn ? _ippBal : 0, tax: _yrTax, p1Tax: _p1Tax, p2Tax: _p2Tax, spend: spending || 0, qpp: qpp || 0, oas: oas || 0, pen: (penMonth || 0) * 12, pt: ptInc || 0, gis: gis || 0, cQpp: cQppY || 0, cOas: cOasY || 0, cPen: cPenY || 0, cGis: cGisY || 0, cInc: cInc || 0, penCont: dcCont || 0, lira: lira, cLira: cLira });
      _mcTfsaLastW = _wFromTF || 0; // TFSA withdrawals restore room next year
      var finAssets = rr + tf + nr + pe + pm + crr + ctf + cnr + fhsa + cFhsa + dc + dc2 + lira + cLira + (p.bizOn ? corpBal : 0) + (p.ippOn ? _ippBal : 0); // R14: include all liquid-ish assets
      if (finAssets <= 0 && retired && !ruined) {
        ruined = true;
        ruinAge = age;
      }
    }
    all.push(path);
    var finalVal = path.length > yrs ? path[yrs].total : path[path.length - 1].total;
    var fP = path.length > yrs ? path[yrs] : path[path.length - 1];
    var liqFinal = fP.rr + fP.tf + fP.nr + (fP.pe||0) + (fP.pm||0) + (fP.crr||0) + (fP.ctf||0) + (fP.cnr||0) + (fP.fhsa||0) + (fP.cFhsa||0) + (fP.dc||0) + (fP.dc2||0) + (fP.lira||0) + (fP.cLira||0);
    var rrspAtDeath = fP.rr + (p.cOn ? fP.crr || 0 : 0) + (fP.lira || 0) + (fP.cLira || 0) + (fP.ipp || 0);
    var nrAtDeath = fP.nr;
    // ACB: initial + all NR contributions over time (approximation: use NR at death vs growth)
    var acb = nrACB;
    var capGain = Math.max(0, nrAtDeath - acb);
    var cgThresh2 = (p.cgThresh || 25e4) * Math.pow(1 + p.inf, maxYrs);
    var cgLo2 = p.cgIncLo || 0.5, cgHi2 = p.cgIncHi || 0.6667;
    var taxableGain = capGain > cgThresh2 ? cgThresh2 * cgLo2 + (capGain - cgThresh2) * cgHi2 : capGain * cgLo2;
    var finalYrPension = fP.rr > 0 ? getRRIFMin(simDeath, fP.rr) : 0;
    var pRrsp = p.cOn ? (fP.rr + (fP.lira || 0) + (fP.dc || 0) + (fP.dc2 || 0)) : rrspAtDeath + (fP.dc || 0) + (fP.dc2 || 0);
    var cRrspEst = p.cOn ? ((fP.crr || 0) + (fP.cLira || 0)) : 0;
    // Rental property deemed disposition at death
    var reDeathCG = 0;
    if (p.props && p.props.length > 0) {
      p.props.forEach(function(rp) {
        if (rp.on && !rp.pri && rp.origV > 0) {
          var propVal = (rp.v || 0) > 0 ? rp.v : rp.origV * Math.pow(1 + (rp.ri || 0.03), maxYrs);
          var propCG = Math.max(0, propVal - rp.origV);
          var cgThr4 = (p.cgThresh || 25e4) * Math.pow(1 + p.inf, maxYrs);
          reDeathCG += propCG > cgThr4 ? cgThr4 * (p.cgIncLo || 0.5) + (propCG - cgThr4) * (p.cgIncHi || 0.6667) : propCG * (p.cgIncLo || 0.5);
        }
      });
    }
    var estateIncome = pRrsp + taxableGain + finalYrPension + reDeathCG;
    // CCPC: corporate liquidation at death — §5.8
    var _corpEstDiv = 0, _corpEstDivInfo = null;
    if (p.bizOn && (fP.corp || 0) > 0) {
      var _corpAtDeath = fP.corp || 0;
      var _corpCDAatDeath = corpCDA || 0;
      var _corpCDAextract = Math.min(_corpCDAatDeath, _corpAtDeath);
      var _corpTaxableEst = _corpAtDeath - _corpCDAextract;
      var _corpRdtohRefund = Math.min(corpRDTOH || 0, _corpTaxableEst * 0.3833);
      _corpEstDiv = _corpTaxableEst;
      if (_corpEstDiv > 0) {
        var _corpEligEst = corpGRIP > 0 ? Math.min(_corpEstDiv, corpGRIP) : 0;
        var _corpNonEligEst = _corpEstDiv - _corpEligEst;
        _corpEstDivInfo = { eligDiv: _corpEligEst, nonEligDiv: _corpNonEligEst };
      }
    }
    var estTax1 = _corpEstDivInfo ? calcTax(estateIncome, yrs, p.prov || "QC", p.inf, true, _corpEstDivInfo).total : calcTax(estateIncome, yrs, p.prov || "QC", p.inf, true).total;
    var estTax2 = cRrspEst > 0 ? calcTax(cRrspEst, yrs, p.prov || "QC", p.inf, true).total : 0;
    var estTax = estTax1 + estTax2;
    var reEquity = fP.re || 0;
    var probate = 0;
    var _estGross = finalVal;
    if (p.prov === "ON") probate = Math.max(0, (_estGross - 5e4) * 0.015);
    else if (p.prov === "BC") probate = Math.max(0, (_estGross - 5e4) * 0.014);
    else if (p.prov === "NS" || p.prov === "NB" || p.prov === "PE") probate = Math.max(0, _estGross * 0.015);
    else if (p.prov === "NL") probate = Math.max(0, _estGross * 0.006);
    else if (p.prov === "SK") probate = Math.min(7e3, Math.max(0, _estGross * 7e-3));
    else if (p.prov === "MB") probate = Math.min(7e3, Math.max(0, _estGross * 7e-3));
    else if (p.prov === "AB") probate = 525;
    else if (p.prov === "QC") probate = 1200;
    else probate = Math.max(0, _estGross * 0.004);
    var estateNet = finalVal - estTax - probate + (lifeIns || 0) + (cLifeIns || 0);
    // GK per-sim stats
    gkAllCuts.push(gkCutCount); gkAllRaises.push(gkRaiseCount); gkAllCutYrs.push(gkCutYrs); gkAllMaxStreak.push(gkMaxCutStreak);
    gkAllMinFactor.push(gkMinFactor);
    if (gkFactorN > 0) gkAllAvgFactor.push(gkFactorSum / gkFactorN);
    if (gkSpendYrs > 0) gkAllAvgSpend.push(gkSpendSum / gkSpendYrs);
    if (gkMinSpendR < Infinity) gkAllMinSpend.push(gkMinSpendR);
    estateTaxes.push(estTax);
    estateNets.push(estateNet);
    fins.push(finalVal);
    liqFins.push(liqFinal);
    ruinAges.push(ruinAge);
    deathAges.push(simDeath);
    if (p.cOn) cDeathAges.push(cSimDeath);
  }
  fins.sort(function(a, b) {
    return a - b;
  });
  liqFins.sort(function(a, b) {
    return a - b;
  });
  ruinAges.sort(function(a, b) {
    return a - b;
  });
  var medFin = fins[Math.floor(N * 0.5)];
  var liqMedF = liqFins[Math.floor(N * 0.5)];
  var liqP5 = liqFins[Math.floor(N * 0.05)];
  var liqP25 = liqFins[Math.floor(N * 0.25)];
  var liqP75 = liqFins[Math.floor(N * 0.75)];
  var liqP95 = liqFins[Math.floor(N * 0.95)];
  var medSimIdx = 0, medSimDist = Infinity;
  for (var mi = 0; mi < N; mi++) {
    var d3 = Math.abs((all[mi][all[mi].length - 1] || { total: 0 }).total - medFin);
    if (d3 < medSimDist) {
      medSimDist = d3;
      medSimIdx = mi;
    }
  }
  var medPath = all[medSimIdx];
  var medSimFinal = fins[medSimIdx] || 0;
  var medSimRuin = ruinAges[medSimIdx] || 999;
  var medSimDeath = deathAges[medSimIdx] || p.deathAge;
  var medSimEstateTax = estateTaxes[medSimIdx] || 0;
  var medSimEstateNet = estateNets[medSimIdx] || 0;
  var succ = ruinAges.filter(function(a) {
    return a >= 999;
  }).length / N;
  var mean = fins.reduce(function(a, b) {
    return a + b;
  }, 0) / N;
  var sd = Math.sqrt(fins.reduce(function(a, b) {
    return a + Math.pow(b - mean, 2);
  }, 0) / N);
  var v5i = Math.floor(N * 0.05), var5 = fins[v5i];
  var cvar5 = v5i > 0 ? fins.slice(0, v5i).reduce(function(a, b) {
    return a + b;
  }, 0) / v5i : fins[0];
  var discFinal = Math.pow(1 + p.inf, maxYrs);
  var medRuin = ruinAges[Math.floor(N * 0.5)];
  var avgDeath = p.stochMort ? Math.round(deathAges.reduce(function(a, b) {
    return a + b;
  }, 0) / N) : p.deathAge;
  var medRevData = [];
  for (var mri = 0; mri <= maxYrs; mri++) {
    var mrp = medPath[mri] || medPath[medPath.length - 1];
    var mrAge = p.age + mri;
    var mrInf = Math.pow(1 + p.inf, mri);
    var mrRetired = mrAge >= p.retAge;
    var mrTaxInc, mrTax;
    if (mrRetired) {
      // R6: withdrawal income capped at available balance — can't tax phantom income
      var _mrWdNeed = Math.max(0, (mrp.spend||0) - (mrp.qpp||0) - (mrp.oas||0) - (mrp.gis||0) - (mrp.pen||0) - (mrp.pt||0));
      var _mrAvailBal = (mrp.rr||0) + (mrp.tf||0) + (mrp.nr||0) + (mrp.pe||0) + (mrp.pm||0) + (mrp.dc||0) + (mrp.crr||0) + (mrp.ctf||0) + (mrp.cnr||0) + (mrp.corp||0);
      var _mrWdCapped = Math.min(_mrWdNeed, _mrAvailBal);
      mrTaxInc = (mrp.qpp||0) + (mrp.oas||0) + (mrp.pen||0) + _mrWdCapped;
      var mrCTaxInc = 0;
      if (p.cOn) { var mrCA = (p.cAge||p.age) + mri; if (mrCA >= (p.cQppAge||65)) mrCTaxInc += calcQPP(p.cQppAge||65, p.cAvgE||0, p.cQppYrs||0)*12*mrInf; if (mrCA >= (p.cOasAge||65)) mrCTaxInc += calcOAS(p.cOasAge||65,mrCTaxInc,mri,p.inf,mrCA)*12; if (p.cPenType==="db") mrCTaxInc += (p.cPenM||0)*12; }
      var mrRetTxCalc = calcTax(mrTaxInc, mri, p.prov || "QC", p.inf, mrRetired);
      var _mrCRetired = p.cOn && ((p.cAge||p.age) + mri >= (p.cRetAge||p.retAge));
      var mrCRetTx = mrCTaxInc > 0 ? calcTax(mrCTaxInc, mri, p.prov || "QC", p.inf, _mrCRetired) : {total:0};
      mrTax = mrRetTxCalc.total + (mrCRetTx ? mrCRetTx.total : 0);
    } else {
      mrTaxInc = p.sal * mrInf;
      var mrCPreTaxInc = p.cOn ? (p.cSal || 0) * mrInf : 0;
      var mrTxCalc = calcTax(mrTaxInc, mri, p.prov || "QC", p.inf);
      var mrCPreTx = mrCPreTaxInc > 0 ? calcTax(mrCPreTaxInc, mri, p.prov || "QC", p.inf) : {total:0};
      mrTax = mrTxCalc.total + (mrCPreTx ? mrCPreTx.total : 0);
    }
    // R6: Cap withdrawals at available balance — can't withdraw from empty accounts
    var _mrRetNeed = Math.max(0, (mrp.spend||0) - (mrp.qpp||0) - (mrp.oas||0) - (mrp.gis||0) - (mrp.pen||0) - (mrp.pt||0));
    var _mrTotalBal = (mrp.rr||0) + (mrp.tf||0) + (mrp.nr||0) + (mrp.pe||0) + (mrp.pm||0) + (mrp.dc||0) + (mrp.crr||0) + (mrp.ctf||0) + (mrp.cnr||0) + (mrp.corp||0);
    var _mrRetCapped = Math.min(_mrRetNeed, _mrTotalBal);
    var _mrGov = (mrp.qpp||0) + (mrp.oas||0) + (mrp.gis||0) + (mrp.pen||0) + (mrp.pt||0);
    var _mrActualSpend = mrRetired ? _mrGov + _mrRetCapped : (mrp.spend||0);
    medRevData.push({ age: mrAge, rrq: mrp.qpp||0, psv: mrp.oas||0, srg: mrp.gis||0, pen: mrp.pen||0, pt: mrp.pt||0, ret: _mrRetCapped, spend: _mrActualSpend, tax: mrTax, taxInc: Math.max(0, mrTaxInc), penCont: mrp.penCont||0, sal: mrRetired ? 0 : p.sal * mrInf, payroll: mrRetired ? 0 : calcPayroll(p.sal * mrInf, p.prov || "QC"), cSal: mrRetired ? 0 : (p.cSal || 0) * mrInf, cPayroll: mrRetired ? 0 : calcPayroll((p.cSal || 0) * mrInf, p.prov || "QC"),
      aRR: mrp.rr||0, aTF: mrp.tf||0, aNR: mrp.nr||0, aPE: mrp.pe||0, aPM: mrp.pm||0, aDC: mrp.dc||0, aCRR: mrp.crr||0, aCTF: mrp.ctf||0, aCNR: mrp.cnr||0, aRE: mrp.re||0, gis: mrp.gis||0,
      corpBal: mrp.corp||0, corpTax: revData[mri] ? (revData[mri].corpTax||0) : 0, corpSal: revData[mri] ? (revData[mri].corpSal||0) : 0, corpDiv: revData[mri] ? (revData[mri].corpDiv||0) : 0, corpExtract: revData[mri] ? (revData[mri].corpExtract||0) : 0, corpCDA: revData[mri] ? (revData[mri].corpCDA||0) : 0, corpRDTOH: revData[mri] ? (revData[mri].corpRDTOH||0) : 0 });
  }
  // Derive withdrawal sources from balance deltas on medPath
  for (var mrd = 0; mrd < medRevData.length; mrd++) {
    var mr = medRevData[mrd];
    if (mr.age < p.retAge) continue;
    var prev = mrd > 0 ? medPath[mrd - 1] : null;
    var cur = medPath[mrd] || medPath[medPath.length - 1];
    if (!prev) continue;
    // Estimate returns for this year to separate growth from withdrawals
    var mrInfY = Math.pow(1 + p.inf, mrd);
    // RR withdrawal \u2248 previous balance * (1+return) - current balance (positive = withdrawal)
    // Without exact return per path we approximate: delta = prev - cur, if positive = net withdrawal
    var rrDelta = Math.max(0, (prev.rr||0) - (cur.rr||0));
    var tfDelta = Math.max(0, (prev.tf||0) - (cur.tf||0));
    var nrDelta = Math.max(0, (prev.nr||0) - (cur.nr||0));
    var peDelta = Math.max(0, (prev.pe||0) - (cur.pe||0));
    var pmDelta = Math.max(0, (prev.pm||0) - (cur.pm||0));
    // RRIF min estimate (age 72+)
    var rrAge = mr.age;
    if (rrAge >= 72 && (prev.rr||0) > 0) {
      var rrifPct = rrAge >= 95 ? 0.2 : [0.054,0.0553,0.0567,0.0582,0.0598,0.0617,0.0636,0.0658,0.0682,0.0708,0.0738,0.0771,0.0808,0.0851,0.0899,0.0955,0.1021,0.1099,0.1192,0.1306,0.1449,0.1634,0.1879,0.2][Math.min(rrAge - 72, 23)] || 0.2;
      mr.wRrifMin = Math.round((prev.rr||0) * rrifPct);
    } else { mr.wRrifMin = 0; }
    // Attribute RR decrease: RRIF min + meltdown + voluntary draw
    mr.wFromRR = Math.max(0, Math.round(rrDelta));
    mr.wMelt = mr.wRrifMin > 0 ? Math.max(0, mr.wFromRR - mr.wRrifMin) : (rrAge < 72 && rrDelta > 0 ? Math.round(rrDelta) : 0);
    mr.wFromTF = Math.max(0, Math.round(tfDelta));
    mr.wFromNR = Math.max(0, Math.round(nrDelta));
    // Boundary fix: at exact retirement year, balance deltas often yield 0
    // because prev is last accumulation year (balances grew, not shrank).
    // Distribute mr.ret across accounts proportionally to balances.
    if (mr.age === p.retAge && mr.wFromRR + mr.wFromTF + mr.wFromNR === 0 && mr.ret > 0) {
      var _bTot = (cur.rr||0) + (cur.tf||0) + (cur.nr||0);
      if (_bTot > 0) {
        mr.wFromRR = Math.round(mr.ret * (cur.rr||0) / _bTot);
        mr.wFromTF = Math.round(mr.ret * (cur.tf||0) / _bTot);
        mr.wFromNR = Math.round(mr.ret * (cur.nr||0) / _bTot);
      } else { mr.wFromRR = Math.round(mr.ret); }
    }
    mr.peExit = Math.max(0, Math.round(peDelta));
    mr.pmExit = Math.max(0, Math.round(pmDelta));
  }
  var pD = [];
  for (var y2 = 0; y2 <= maxYrs; y2++) {
    var infY = Math.pow(1 + p.inf, y2);
    var snapshots = [];
    var spendVals = [];
    for (var si2 = 0; si2 < N; si2++) {
      var snap = all[si2][y2] || all[si2][all[si2].length - 1];
      snapshots.push({ i: si2, t: snap.total, s: snap });
      if (snap.spend > 0) spendVals.push(snap.spend / infY);
    }
    if (spendVals.length > 1) spendVals.sort(function(a, b) { return a - b; });
    snapshots.sort(function(a, b) {
      return a.t - b.t;
    });
    var pcts = [0.05, 0.1, 0.25, 0.5, 0.75, 0.95];
    var pNames = ["p5", "p10", "p25", "p50", "p75", "p95"];
    var row = { age: p.age + y2 };
    var _kPct = Math.max(3, Math.round(N * 0.01));
    for (var pi = 0; pi < pcts.length; pi++) {
      var gi3 = Math.floor(N * pcts[pi]);
      var pn = pNames[pi];
      var _lo = Math.max(0, gi3 - Math.floor(_kPct / 2));
      var _hi = Math.min(N, _lo + _kPct);
      _lo = _hi - _kPct; if (_lo < 0) _lo = 0;
      var _kAvg = { total:0, rr:0, tf:0, nr:0, pe:0, pm:0, dc:0, re:0, corp:0, ipp:0, crr:0, ctf:0, cnr:0, tax:0, spend:0, qpp:0, oas:0, gis:0, pen:0 };
      var _kCnt = 0;
      for (var _kj = _lo; _kj < _hi; _kj++) {
        var _ks = snapshots[_kj].s;
        if (!_ks) continue;
        _kAvg.total += _ks.total; _kAvg.rr += _ks.rr||0; _kAvg.tf += _ks.tf||0; _kAvg.nr += _ks.nr||0;
        _kAvg.pe += _ks.pe||0; _kAvg.pm += _ks.pm||0; _kAvg.dc += (_ks.dc||0); _kAvg.re += (_ks.re||0); _kAvg.corp += (_ks.corp||0); _kAvg.ipp += (_ks.ipp||0);
        _kAvg.crr += (_ks.crr||0); _kAvg.ctf += (_ks.ctf||0); _kAvg.cnr += (_ks.cnr||0);
        _kAvg.tax += (_ks.tax||0); _kAvg.spend += (_ks.spend||0);
        _kAvg.qpp += (_ks.qpp||0); _kAvg.oas += (_ks.oas||0); _kAvg.gis += (_ks.gis||0); _kAvg.pen += (_ks.pen||0);
        _kCnt++;
      }
      if (_kCnt > 0) { for (var _kk3 in _kAvg) _kAvg[_kk3] /= _kCnt; }
      var alv = _kAvg.total > 100 ? 1 : 0; // R6: Treat tiny balances (<$100) as ruined
      row[pn] = _kAvg.total;
      row["r" + pn] = _kAvg.total / infY;
      row["rr_" + pn] = _kAvg.rr * alv;
      row["tf_" + pn] = _kAvg.tf * alv;
      row["nr_" + pn] = _kAvg.nr * alv;
      row["pe_" + pn] = _kAvg.pe * alv;
      row["pm_" + pn] = _kAvg.pm * alv;
      row["dc_" + pn] = _kAvg.dc * alv;
      row["re_" + pn] = _kAvg.re * alv;
      row["corp_" + pn] = _kAvg.corp * alv;
      row["ipp_" + pn] = _kAvg.ipp * alv;
      row["crr_" + pn] = _kAvg.crr * alv;
      row["ctf_" + pn] = _kAvg.ctf * alv;
      row["tx_" + pn] = _kAvg.tax * alv;
      row["sp_" + pn] = _kAvg.spend * alv;
      row["qpp_" + pn] = _kAvg.qpp;
      row["oas_" + pn] = _kAvg.oas;
      row["gis_" + pn] = _kAvg.gis;
      row["pen_" + pn] = _kAvg.pen;
      row["rrr_" + pn] = _kAvg.rr * alv / infY;
      row["rtf_" + pn] = _kAvg.tf * alv / infY;
      row["rnr_" + pn] = _kAvg.nr * alv / infY;
      row["rpe_" + pn] = _kAvg.pe * alv / infY;
      row["rpm_" + pn] = _kAvg.pm * alv / infY;
      row["rre_" + pn] = _kAvg.re * alv / infY;
      row["rcorp_" + pn] = _kAvg.corp * alv / infY;
      row["ripp_" + pn] = _kAvg.ipp * alv / infY;
      row["rcrr_" + pn] = _kAvg.crr * alv / infY;
      row["rctf_" + pn] = _kAvg.ctf * alv / infY;
    }
    var med = snapshots[Math.floor(N * 0.5)].s;
    row.rrM = med.rr;
    row.tfM = med.tf;
    row.nrM = med.nr;
    row.peM = med.pe;
    row.pmM = med.pm;
    row.reM = med.re || 0;
    row.crrM = med.crr || 0;
    row.ctfM = med.ctf || 0;
    row.cnrM = med.cnr || 0;
    row.reEqM = med.reEquity || 0;
    row.reMtgM = med.reMtg || 0;
    row.reHelocM = med.reHeloc || 0;
    row.rrrM = med.rr / infY;
    row.rtfM = med.tf / infY;
    row.rnrM = med.nr / infY;
    row.rpeM = med.pe / infY;
    row.rpmM = med.pm / infY;
    row.rreM = (med.re || 0) / infY;
    row.rcrrM = (med.crr || 0) / infY;
    row.rctfM = (med.ctf || 0) / infY;
    row.rcnrM = (med.cnr || 0) / infY;
    row.rreEqM = (med.reEquity || 0) / infY;
    row.taxM = med.tax || 0;
    // R6: Cap spendM when ruined — median sim spend is "desired", not actual
    var _medTotal = med.total || 0;
    var _medGov = (med.qpp||0) + (med.oas||0) + (med.gis||0) + (med.pen||0) + (med.pt||0);
    var _medIsRet = (p.age + y2) >= p.retAge;
    row.spendM = (_medIsRet && _medTotal <= 0 && (med.spend||0) > _medGov) ? _medGov : (med.spend || 0);
    // Spending percentiles (real $) for GK fan chart
    if (spendVals.length > 1) {
      var _sN = spendVals.length;
      row.sp10 = spendVals[Math.floor(_sN * 0.10)] || 0;
      row.sp25 = spendVals[Math.floor(_sN * 0.25)] || 0;
      row.sp50 = spendVals[Math.floor(_sN * 0.50)] || 0;
      row.sp75 = spendVals[Math.floor(_sN * 0.75)] || 0;
      row.sp90 = spendVals[Math.floor(_sN * 0.90)] || 0;
    } else {
      row.sp10 = row.sp25 = row.sp50 = row.sp75 = row.sp90 = 0;
    }
    row.qppM = med.qpp || 0;
    row.oasM = med.oas || 0;
    row.gisM = med.gis || 0;
    row.penM = med.pen || 0;
    if (medPath[y2]) {
      row.mp_fhsa = (medPath[y2].fhsa || 0) + (medPath[y2].cFhsa || 0);
      row.mp_fhsa1 = medPath[y2].fhsa || 0;
      row.mp_cFhsa = medPath[y2].cFhsa || 0;
      row.mp_dc = (medPath[y2].dc || 0) + (medPath[y2].dc2 || 0);
      row.mp_dc1 = medPath[y2].dc || 0;
      row.mp_dc2 = medPath[y2].dc2 || 0;
      row.mp_rr = medPath[y2].rr || 0;
      row.mp_tf = medPath[y2].tf || 0;
      row.mp_nr = medPath[y2].nr || 0;
      row.mp_pe = medPath[y2].pe || 0;
      row.mp_pm = medPath[y2].pm || 0;
      row.mp_re = medPath[y2].re || 0;
      row.mp_corp = medPath[y2].corp || 0;
      row.mp_ipp = medPath[y2].ipp || 0;
      row.mp_crr = medPath[y2].crr || 0;
      row.mp_ctf = medPath[y2].ctf || 0;
      row.mp_cnr = medPath[y2].cnr || 0;
      row.mp_total = medPath[y2].total || 0;
      row.mp_tax = (function() {
      var mp = medPath[y2];
      var mpAge = p.age + y2;
      var mpRetired = mpAge >= p.retAge;
      if (!mpRetired) return calcTax(p.sal * Math.pow(1+p.inf, y2), y2, p.prov||"QC", p.inf, false).total;
      // R6: Cap withdrawal income at available balance for tax computation
      var _mpBal = mp.total || 0;
      var _mpGovTx = (mp.qpp||0) + (mp.oas||0) + (mp.pen||0);
      var _mpWdNeed = Math.max(0, (mp.spend||0) - (mp.qpp||0) - (mp.oas||0) - (mp.gis||0) - (mp.pen||0) - (mp.pt||0));
      var _mpWdCapped = Math.min(_mpWdNeed, Math.max(0, _mpBal));
      var mpTaxInc = _mpGovTx + _mpWdCapped;
      return calcTax(Math.max(0,mpTaxInc), y2, p.prov||"QC", p.inf, mpRetired).total;
    })();
      // R6: Cap mp_spend at what's actually available (gov + available balance)
      var _mpSpendRaw = medPath[y2].spend || 0;
      var _mpTotalBal = medPath[y2].total || 0;
      var _mpGovInc = (medPath[y2].qpp||0) + (medPath[y2].oas||0) + (medPath[y2].gis||0) + (medPath[y2].pen||0) + (medPath[y2].pt||0);
      var _mpIsRetired = (p.age + y2) >= p.retAge;
      row.mp_spend = (_mpIsRetired && _mpTotalBal <= 0 && _mpSpendRaw > _mpGovInc) ? _mpGovInc : _mpSpendRaw;
      row.mp_qpp = medPath[y2].qpp || 0;
      row.mp_oas = medPath[y2].oas || 0;
      row.mp_gis = medPath[y2].gis || 0;
      row.mp_pen = medPath[y2].pen || 0;
      row.mp_lira = medPath[y2].lira || 0;
      row.mp_cLira = medPath[y2].cLira || 0;
      row.mp_cQpp = medPath[y2].cQpp || 0;
      row.mp_cOas = medPath[y2].cOas || 0;
      row.mp_cPen = medPath[y2].cPen || 0;
      row.mp_cGis = medPath[y2].cGis || 0;
      row.mp_cInc = medPath[y2].cInc || 0;
      row.mp_p1Tax = medPath[y2].p1Tax || 0;
      row.mp_p2Tax = medPath[y2].p2Tax || 0;
      var mpInfY = Math.pow(1 + p.inf, y2);
      row.rmp_rr = row.mp_rr / mpInfY;
      row.rmp_tf = row.mp_tf / mpInfY;
      row.rmp_nr = row.mp_nr / mpInfY;
      row.rmp_pe = row.mp_pe / mpInfY;
      row.rmp_pm = row.mp_pm / mpInfY;
      row.rmp_re = row.mp_re / mpInfY;
      row.rmp_corp = row.mp_corp / mpInfY;
      row.rmp_ipp = row.mp_ipp / mpInfY;
      row.rmp_crr = row.mp_crr / mpInfY;
      row.rmp_ctf = row.mp_ctf / mpInfY;
      row.rmp_cnr = row.mp_cnr / mpInfY;
      row.rmp_total = row.mp_total / mpInfY;
      row.rmp_spend = row.mp_spend / mpInfY;
      row.rmp_tax = row.mp_tax / mpInfY;
      row.rmp_qpp = row.mp_qpp / mpInfY;
      row.rmp_oas = row.mp_oas / mpInfY;
      row.rmp_pen = row.mp_pen / mpInfY;
      row.rmp_gis = row.mp_gis / mpInfY;
      row.rmp_fhsa = row.mp_fhsa / mpInfY;
      row.rmp_dc = row.mp_dc / mpInfY;
      row.rmp_lira = row.mp_lira / mpInfY;
    }
    pD.push(row);
  }
  var sf = [];
  for (var y3 = 0; y3 <= maxYrs; y3 += 3) sf.push({ age: p.age + y3, pct: all.filter(function(pa) {
    return (pa[y3] || pa[pa.length - 1]).total <= 0;
  }).length / N * 100 });
  var baseS = succ * 100, sens = [];
  var qRun = function(pp) {
    var ok = 0, M = Math.min(N, 50);
    var qaR0 = pp.allocR != null ? pp.allocR : 0.6, qaT0 = pp.allocT != null ? pp.allocT : 0.8, qaN0 = pp.allocN != null ? pp.allocN : 0.5;
    for (var s2 = 0; s2 < M; s2++) {
      var r2 = pp.rrsp, t2 = pp.tfsa, n2 = pp.nr;
      for (var y4 = 0; y4 <= pp.deathAge - pp.age; y4++) {
        var a2 = pp.age + y4, rt2 = a2 >= pp.retAge;
        var z2 = tRn(999);
        var qeR = eqRet2 + eqVol2 * z2, qbR = bndRet2 + bndVol2 * tRn(999);
        var qgYrs = Math.max(0, a2 - 50);
        var qaR = Math.max(0.2, qaR0 - gS * qgYrs), qaT = Math.max(0.2, qaT0 - gS * qgYrs), qaN = Math.max(0.2, qaN0 - gS * qgYrs);
        r2 = r2 * (1 + blendRet(qeR, qbR, qaR) - (pp.merR || 0)) + (rt2 ? 0 : pp.rrspC || 0);
        t2 = t2 * (1 + blendRet(qeR, qbR, qaT) - (pp.merT || 0)) + (rt2 ? 0 : Math.round((pp.tfsaC != null ? pp.tfsaC : 7e3) * Math.pow(1 + (pp.inf || 0.025), y4) / 500) * 500);
        n2 = n2 * (1 + blendRet(qeR, qbR, qaN) - (pp.merN || 0)) + (rt2 ? 0 : pp.nrC || 0);
        if (rt2) {
          var im = Math.pow(1 + pp.inf, y4);
          var sm = sMul(a2, pp.retAge, pp.goP || 1, pp.slP || 0.82, pp.noP || 0.92, pp.smileSlAge, pp.smileNoAge);
          var sp = pp.retSpM * 12 * im * sm;
          var q2 = a2 >= pp.qppAge ? calcQPP(pp.qppAge, pp.avgE, pp.qppYrs) * 12 : 0;
          var o2 = a2 >= pp.oasAge ? calcOAS(pp.oasAge, sp) * 12 : 0;
          var nd = Math.max(0, sp - q2 - o2);
          var fn = Math.min(n2, nd);
          n2 -= fn;
          nd -= fn;
          var fr2 = Math.min(r2, nd);
          r2 -= fr2;
          nd -= fr2;
          t2 -= Math.min(t2, nd);
        }
        r2 = Math.max(r2, 0);
        t2 = Math.max(t2, 0);
        n2 = Math.max(n2, 0);
      }
      if (r2 + t2 + n2 > 0) ok++;
    }
    return ok / M * 100;
  };
  var tryP = function(name, key, lo, hi) {
    var pp1 = {};
    for (var k in p) pp1[k] = p[k];
    pp1[key] = lo;
    var sLo = qRun(pp1);
    pp1[key] = hi;
    var sHi = qRun(pp1);
    sens.push({ name, lo: sLo - baseS, hi: sHi - baseS });
  };
  tryP("D\u00e9penses/m", "retSpM", p.retSpM * 0.8, p.retSpM * 1.2);
  tryP("Alloc. REER", "allocR", Math.max(0, p.allocR - 0.2), Math.min(1, p.allocR + 0.2));
  tryP("Alloc. CELI", "allocT", Math.max(0, p.allocT - 0.2), Math.min(1, p.allocT + 0.2));
  tryP("Inflation", "inf", p.inf - 0.01, p.inf + 0.01);
  tryP("\u00c2ge retraite", "retAge", Math.max(55, p.retAge - 3), p.retAge + 3);
  tryP("Rend. actions", "eqRet", p.eqRet - 0.03, p.eqRet + 0.03);
  tryP("Vol. actions", "eqVol", p.eqVol - 0.05, p.eqVol + 0.05);
  tryP("RRQ/RPC d\u00e9but", "qppAge", Math.max(60, p.qppAge - 3), Math.min(72, p.qppAge + 3));
  tryP("PSV d\u00e9but", "oasAge", Math.max(65, p.oasAge - 2), Math.min(72, p.oasAge + 2));
  if (p.penType === "db" && p.penM > 0) tryP("Pension DB", "penM", p.penM * 0.8, p.penM * 1.2);
  sens.sort(function(a, b) {
    return Math.abs(b.hi - b.lo) - Math.abs(a.hi - a.lo);
  });
  var ruinPct = ruinAges.filter(function(a) {
    return a < 999;
  }).length / N;
  var p5Ruin = ruinAges[Math.floor(N * 0.05)];
  var p10Ruin = ruinAges[Math.floor(N * 0.1)];
  var medPathBilan = medPath.map(function(mp, yi) {
    return Object.assign({}, mp, { age: p.age + yi });
  });
  // Build histogram of final wealth
  var _histBins = [];
  if (fins.length > 0) {
    var _hMin = fins[0], _hMax = fins[fins.length - 1];
    var _hRange = _hMax - _hMin || 1;
    var _nBins = Math.min(20, Math.max(8, Math.ceil(Math.sqrt(N))));
    var _bw = _hRange / _nBins;
    for (var _bi = 0; _bi < _nBins; _bi++) {
      _histBins.push({ lo: _hMin + _bi * _bw, hi: _hMin + (_bi + 1) * _bw, count: 0 });
    }
    fins.forEach(function(f) {
      var idx = Math.min(_nBins - 1, Math.max(0, Math.floor((f - _hMin) / _bw)));
      _histBins[idx].count++;
    });
  }
  // Build death vs ruin by 5-year age buckets
  var _dvr = [];
  if (deathAges && ruinAges) {
    var _startAge = Math.floor(p.age / 5) * 5;
    var _endAge = 105;
    for (var _ba = _startAge; _ba <= _endAge; _ba += 5) {
      _dvr.push({ age: _ba, alive: 0, ruin: 0 });
    }
    for (var _di = 0; _di < N; _di++) {
      var _da = deathAges[_di] || 999;
      var _ra = ruinAges[_di] || 999;
      for (var _bi = 0; _bi < _dvr.length; _bi++) {
        var _bAge = _dvr[_bi].age;
        if (_bAge <= _da) _dvr[_bi].alive++;
        if (_ra < 999 && _bAge >= _ra) _dvr[_bi].ruin++;
      }
    }
  }
  return {
    pD,
    medPath: medPathBilan,
    medSimFinal: medSimFinal,
    medSimRuin: medSimRuin,
    medSimDeath: medSimDeath,
    medSimFinalR: medSimFinal / discFinal,
    medSimEstateTax: medSimEstateTax,
    medSimEstateNet: medSimEstateNet,
    succ,
    fins,
    sf,
    medRuin,
    ruinPct,
    p5Ruin,
    p10Ruin,
    discFinal,
    sens,
    revData,
    medRevData,
    avgDeath,
    deathAges: deathAges,
    cDeathAges: cDeathAges,
    ruinAges: ruinAges,
    medF: fins[Math.floor(N * 0.5)],
    p5F: var5,
    p25F: fins[Math.floor(N * 0.25)],
    p75F: fins[Math.floor(N * 0.75)],
    p95F: fins[Math.floor(N * 0.95)],
    mean,
    sd,
    var5,
    cvar5,
    rMedF: fins[Math.floor(N * 0.5)] / discFinal,
    rP5F: var5 / discFinal,
    rP25F: fins[Math.floor(N * 0.25)] / discFinal,
    rP75F: fins[Math.floor(N * 0.75)] / discFinal,
    rP95F: fins[Math.floor(N * 0.95)] / discFinal,
    rMean: mean / discFinal,
    rSD: sd / discFinal,
    rVar5: var5 / discFinal,
    rCvar5: cvar5 / discFinal,
    // Liquid wealth metrics (excludes real estate)
    liqMedF: liqMedF,
    liqP5: liqP5,
    liqP25: liqP25,
    liqP75: liqP75,
    liqP95: liqP95,
    rLiqMedF: liqMedF / discFinal,
    rLiqP5: liqP5 / discFinal,
    hasRE: (p.props || []).some(function(pr){return pr.on;}),
    // Estate metrics
    medEstateTax: estateTaxes.sort(function(a, b) {
      return a - b;
    })[Math.floor(N * 0.5)],
    medEstateNet: estateNets.sort(function(a, b) {
      return a - b;
    })[Math.floor(N * 0.5)],
    p5EstateNet: estateNets[Math.floor(N * 0.05)],
    p10EstateNet: estateNets[Math.floor(N * 0.1)],
    p25EstateNet: estateNets[Math.floor(N * 0.25)],
    p75EstateNet: estateNets[Math.floor(N * 0.75)],
    p90EstateNet: estateNets[Math.floor(N * 0.9)],
    p95EstateNet: estateNets[Math.floor(N * 0.95)],
    p5EstateTax: estateTaxes[Math.floor(N * 0.05)],
    p25EstateTax: estateTaxes[Math.floor(N * 0.25)],
    p75EstateTax: estateTaxes[Math.floor(N * 0.75)],
    p95EstateTax: estateTaxes[Math.floor(N * 0.95)],
    avgEstateTax: estateTaxes.reduce(function(a, b) {
      return a + b;
    }, 0) / N
    ,
    histogram: _histBins,
    deathVsRuin: _dvr,
    // Guyton-Klinger stats
    gkOn: !!p.gkOn,
    gkAvgCuts: gkAllCuts.length > 0 ? gkAllCuts.reduce(function(a,b){return a+b;},0) / gkAllCuts.length : 0,
    gkAvgRaises: gkAllRaises.length > 0 ? gkAllRaises.reduce(function(a,b){return a+b;},0) / gkAllRaises.length : 0,
    gkAvgSpend: gkAllAvgSpend.length > 0 ? gkAllAvgSpend.reduce(function(a,b){return a+b;},0) / gkAllAvgSpend.length : 0,
    gkP5MinSpend: (function(){ var s = gkAllMinSpend.slice().sort(function(a,b){return a-b;}); return s.length > 0 ? s[Math.floor(s.length*0.05)] : 0; })(),
    gkMedianCuts: (function(){ var s = gkAllCuts.slice().sort(function(a,b){return a-b;}); return s.length > 0 ? s[Math.floor(s.length*0.5)] : 0; })(),
    gkP95Cuts: (function(){ var s = gkAllCuts.slice().sort(function(a,b){return a-b;}); return s.length > 0 ? s[Math.floor(s.length*0.95)] : 0; })(),
    gkAvgCutYrs: gkAllCutYrs.length > 0 ? gkAllCutYrs.reduce(function(a,b){return a+b;},0) / gkAllCutYrs.length : 0,
    gkMedianCutYrs: (function(){ var s = gkAllCutYrs.slice().sort(function(a,b){return a-b;}); return s.length > 0 ? s[Math.floor(s.length*0.5)] : 0; })(),
    gkAvgMaxStreak: gkAllMaxStreak.length > 0 ? gkAllMaxStreak.reduce(function(a,b){return a+b;},0) / gkAllMaxStreak.length : 0,
    gkAvgMinFactor: gkAllMinFactor.length > 0 ? gkAllMinFactor.reduce(function(a,b){return a+b;},0) / gkAllMinFactor.length : 1,
    gkAvgFactor: gkAllAvgFactor.length > 0 ? gkAllAvgFactor.reduce(function(a,b){return a+b;},0) / gkAllAvgFactor.length : 1
  };
}
