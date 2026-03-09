// /lib/report-html-inter.js
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Rapport Intermédiaire — HTML Renderer (SERVER-SIDE)
// ══════════════════════════════════════════════════════════════════════
// 1:1 port from quiz-intermediaire.html lines 2143-4187
// PROACTIVE FIX: rMedF uses mc.rMedF (real) not mc.medF (nominal)
//
// Exports:
//   extractReportDataInter()  — MC results → report-ready object D
//   renderReportHTMLInter()   — D + stratData + AI → complete HTML string
//
// Used by: /api/webhook (Intermédiaire path)
// ══════════════════════════════════════════════════════════════════════
/* eslint-disable */

import { calcTax } from "./engine";
import { buildStarRatingBlock } from "./feedback-stars";
import {
  gradeFromSuccess,
  gradeColor,
  gradeLabel as sharedGradeLabel,
  successColor as gCol,
  fmtPctInt,
  escHtml,
  probTranslation as buildProbTranslation,
} from "./report-shared";

var REPORT_VERSION_INTER = 'v1';

// ============================================================
// CONSTANTS (port from source lines 2143-2170)
// ============================================================
var BENCHMARKS = {
  regSavings:{
    "25-34":{q1:0,q2:8500,q3:28000},
    "35-44":{q1:12000,q2:45000,q3:110000},
    "45-54":{q1:28000,q2:95000,q3:220000},
    "55-64":{q1:55000,q2:185000,q3:380000}
  },
  savingsRate:{
    q1:{q1:0,q2:3,q3:7},q2:{q1:2,q2:6,q3:11},
    q3:{q1:4,q2:9,q3:15},q4:{q1:6,q2:12,q3:18},q5:{q1:8,q2:15,q3:22}
  },
  incomeMultiples:{35:1,40:2,45:3,50:4.5,55:6,60:7.5,65:10},
  govCoverage:{median:0.42,q1:0.28,q3:0.58}
};

function getBenchmarkAgeGroup(age){
  if(age<35)return"25-34";if(age<45)return"35-44";if(age<55)return"45-54";return"55-64";
}
function getIncomeQuintile(sal){
  if(sal<42000)return"q1";if(sal<65000)return"q2";if(sal<95000)return"q3";if(sal<145000)return"q4";return"q5";
}
function getIncomeMultiple(age,savings,sal){
  if(!sal||sal<=0)return null;
  var ageKeys=Object.keys(BENCHMARKS.incomeMultiples).map(Number).sort(function(a,b){return a-b;});
  var closest=ageKeys.reduce(function(prev,curr){return Math.abs(curr-age)<Math.abs(prev-age)?curr:prev;});
  return{actual:savings/sal,target:BENCHMARKS.incomeMultiples[closest],age:closest};
}

// ============================================================
// extractReportDataInter(mc, params) — Object D
// Port from source lines 2388-2479
// PROACTIVE FIX: rMedF uses mc.rMedF (real) not mc.medF (nominal)
// ============================================================
export function extractReportDataInter(mc, params) {
  var p = params;
  var inf = p.inf || 0.02;
  var rd = mc.medRevData || [];
  var pD = mc.pD || [];
  // Deflator: convert nominal medRevData values to real (today's) dollars
  var deflate = function(age) { return 1 / Math.pow(1 + inf, Math.max(0, age - p.age)); };
  var retRow = rd.find(function(r){ return r.age >= p.retAge; }) || {};
  var qppRow = rd.find(function(r){ return r.age >= (p.qppAge || p.retAge); }) || retRow;
  var oasRow = rd.find(function(r){ return r.age >= (p.oasAge || p.retAge); }) || retRow;
  // BUGFIX: medRevData stores NOMINAL values. Deflate to real dollars for display.
  var qppM = Math.round((qppRow.rrq || 0) * deflate(qppRow.age || p.retAge) / 12);
  var oasM = Math.round((oasRow.psv || 0) * deflate(oasRow.age || p.retAge) / 12);
  var penMo = Math.round((retRow.pen || 0) * deflate(retRow.age || p.retAge) / 12);
  var govM = qppM + oasM + penMo;
  var coverPct = p.retSpM > 0 ? Math.round(govM / p.retSpM * 100) : 0;
  var gapM = Math.max(0, p.retSpM - govM);
  // retBal: use pD real percentile at retirement age if available, else deflate nominal
  var retPD = pD.find(function(r){ return r.age === p.retAge; });
  var retBal = retPD ? Math.round(retPD.rp50 || 0) :
    (retRow ? Math.round(((retRow.aRR || 0) + (retRow.aTF || 0) + (retRow.aNR || 0) + (retRow.aDC || 0)) * deflate(retRow.age || p.retAge)) : 0);
  var annualW = gapM * 12;
  var wdPct = retBal > 0 ? Math.round(annualW / retBal * 1000) / 10 : 99;
  var workRow = rd.find(function(r){ return r.age === p.age; }) || {};
  var taxCurrEff = workRow.taxInc > 0 ? Math.round((workRow.tax || 0) / workRow.taxInc * 100) : 0;
  var taxRetRow = rd.find(function(r){ return r.age === p.retAge + 2; }) || retRow;
  var taxRetEff = taxRetRow && taxRetRow.taxInc > 0 ? Math.round((taxRetRow.tax || 0) / taxRetRow.taxInc * 100) : 0;
  var taxInfo = calcTax(p.sal, 0, p.prov, 0);
  var margRate = taxInfo ? taxInfo.marg : 0.30;
  var merW = ((p.merR || 0.015) * (p.rrsp || 0) + (p.merT || 0.007) * (p.tfsa || 0) + (p.merN || 0.007) * (p.nr || 0)) / Math.max(1, (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0));
  var feeCost = Math.round(merW * retBal * (p.deathAge - p.retAge));
  var succPct = Math.round(mc.succ * 100);

  // Grade — canonical 8-level scale (from report-shared.ts)
  var grade = gradeFromSuccess(succPct);

  // Resilience scores
  var longevityScore = Math.min(100, succPct);
  var taxScore = taxRetEff < taxCurrEff - 5 ? 90 : taxRetEff < taxCurrEff ? 70 : 50;
  var covScore = Math.min(100, coverPct);
  var tot = (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0);
  var maxConc = tot > 0 ? Math.max(p.rrsp || 0, p.tfsa || 0, p.nr || 0) / tot : 1;
  var diverScore = maxConc < 0.5 ? 85 : maxConc < 0.7 ? 65 : 45;

  // Build 5-yr projection table using ACTUAL MC pD percentiles (real $)
  var projTable = [];
  for (var tAge = p.retAge; tAge <= p.deathAge; tAge += 5) {
    if (tAge > p.deathAge) break;
    // Income from medRevData (deflated to real)
    var mr5 = rd.find(function(r){ return r.age === tAge; }) || rd[rd.length - 1] || {};
    var tDefl = deflate(tAge);
    var netInc = Math.round(((mr5.rrq || 0) + (mr5.psv || 0) + (mr5.pen || 0) + (mr5.ret || 0)) * tDefl);
    var tax5 = Math.round((mr5.tax || 0) * tDefl);
    // Wealth percentiles from actual MC pD data (already in real $ via rp25/rp50/rp75)
    var pDrow = pD.find(function(r){ return r.age === tAge; });
    projTable.push({
      age: tAge, netIncome: netInc, tax: tax5, netAfterTax: Math.max(0, netInc - tax5),
      p25: pDrow ? Math.max(0, Math.round(pDrow.rp25 || 0)) : 0,
      p50: pDrow ? Math.max(0, Math.round(pDrow.rp50 || 0)) : 0,
      p75: pDrow ? Math.max(0, Math.round(pDrow.rp75 || 0)) : 0
    });
  }

  return {
    age: p.age, retAge: p.retAge, sex: p.sex, prov: p.prov, sal: p.sal,
    deathAge: p.deathAge, avgDeath: mc.avgDeath || (p.sex === "F" ? 87 : 84),
    totalSavings: (p.rrsp || 0) + (p.tfsa || 0) + (p.nr || 0),
    rrsp: p.rrsp || 0, tfsa: p.tfsa || 0, nr: p.nr || 0,
    liraBal: p.liraBal || 0, dcBal: p.dcBal || 0,
    retYearBalance: retBal, retBal: retBal,
    qppMonthly: qppM, oasMonthly: oasM, dbPensionMonthly: penMo,
    govMonthly: govM, coveragePct: coverPct, gapMonthly: gapM,
    retSpM: p.retSpM, withdrawalRatePct: wdPct,
    successPct: succPct, succ: mc.succ, grade: grade,
    // PROACTIVE FIX: use mc.rMedF (real) not mc.medF (nominal)
    rMedF: Math.round(mc.rMedF || mc.medF || 0),
    rP5F: Math.round(mc.rP5F || mc.p5F || mc.var5 || 0),
    rP25F: Math.round(mc.rP25F || mc.p25F || 0),
    rP75F: Math.round(mc.rP75F || mc.p75F || 0),
    rP95F: Math.round(mc.rP95F || mc.p95F || 0),
    medRuin: mc.medRuin || 999, p5Ruin: mc.p5Ruin || 999,
    medEstateTax: Math.round(mc.medEstateTax || 0),
    medEstateNet: Math.round(mc.medEstateNet || 0),
    p25EstateNet: Math.round(mc.p25EstateNet || 0),
    p75EstateNet: Math.round(mc.p75EstateNet || 0),
    taxCurrentEffective: taxCurrEff, taxRetirementEffective: taxRetEff,
    taxCurrentMarginal: Math.round(margRate * 100), margRate: margRate,
    merWeighted: merW, feeCostLifetime: feeCost,
    penType: p.penType, hasPension: p.penType !== "none",
    ptM: p.ptM, ptYrs: p.ptYrs,
    qppAge: p.qppAge, oasAge: p.oasAge, inf: p.inf,
    medRevData: rd, pD: mc.pD || [], fins: mc.fins || [],
    expReturn: p.allocR * 0.07 + (1 - p.allocR) * 0.035,
    afterTaxReturn: (p.allocR * 0.07 + (1 - p.allocR) * 0.035) * (1 - margRate * 0.5),
    projTable: projTable,
    longevityScore: longevityScore, taxScore: taxScore,
    covScore: covScore, diverScore: diverScore,
    liqMedF: mc.liqMedF || 0,
    liqP5: mc.liqP5 || 0, liqP25: mc.liqP25 || 0,
    liqP75: mc.liqP75 || 0, liqP95: mc.liqP95 || 0,
    nSim: mc.fins ? mc.fins.length : 5000
  };
}

// ============================================================
// PRIORITY WATERFALL (port from source lines 2484-2543)
// ============================================================
function buildPriority(D, p, fr) {
  var margRate = D.margRate || 0.30;
  var expRet = D.expReturn || 0.053;
  var afterTaxRet = D.afterTaxReturn || 0.035;
  var pct = function(v) { return (v * 100).toFixed(1) + "%"; };
  var priorities = [];

  // 1. Employer match
  if ((p._quiz.employer === "large" || p._quiz.employer === "tech") && (p._quiz.sources || [p._quiz.source || "employed"]).indexOf("employed") >= 0) {
    priorities.push({ name: fr ? "Cotisation employeur (contrepartie)" : "Employer match contribution",
      rate: "50-100%", impact: Math.round(p.sal * 0.03 * (p.deathAge - p.retAge) * 0.5),
      why: fr ? "Les donn\u00e9es indiquent un avantage math\u00e9matique imm\u00e9diat de 50-100%." : "Data indicates an immediate 50-100% mathematical advantage.",
      color: "#2A8C46", priority: 1 });
  }

  // 2. High-interest debts (>=10%)
  (p._report.debts || []).filter(function(d) { return d.rate >= 0.10; }).forEach(function(d) {
    var tl = fr ? { cc: "Carte de cr\u00e9dit", student: "Pr\u00eat \u00e9tudiant", car: "Pr\u00eat automobile", loc: "Marge de cr\u00e9dit" }
               : { cc: "Credit card", student: "Student loan", car: "Car loan", loc: "Line of credit" };
    priorities.push({ name: (tl[d.type] || d.type) + " (" + Math.round(d.bal).toLocaleString() + " $)",
      rate: pct(d.rate), impact: Math.round(d.totalInt || d.bal * d.rate * 5),
      why: fr ? "Taux de " + pct(d.rate) + " garanti. Le remboursement est g\u00e9n\u00e9ralement consid\u00e9r\u00e9 comme avantageux." : "Guaranteed " + pct(d.rate) + " rate. Repayment is often favoured.",
      color: "#CC4444", priority: 2 });
  });

  // 3. RRSP vs TFSA order depends on marginal rate
  if (margRate > 0.4) {
    priorities.push({ name: fr ? "R\u00e9gime enregistr\u00e9 d'\u00e9pargne-retraite (REER)" : "Registered Retirement Savings Plan (RRSP)",
      rate: pct(margRate), impact: Math.round(p.rrspC * 12 * Math.pow(1 + expRet, p.deathAge - p.retAge)),
      why: fr ? "Taux marginal de " + pct(margRate) + " > 40%. D\u00e9duction fiscale \u00e9lev\u00e9e." : "Marginal rate " + pct(margRate) + " > 40%. High tax deduction.",
      color: "#4680C0", priority: 3 });
    priorities.push({ name: fr ? "Compte d'\u00e9pargne libre d'imp\u00f4t (CELI)" : "Tax-Free Savings Account (TFSA)",
      rate: pct(expRet), impact: Math.round(7000 * Math.pow(1 + expRet, p.deathAge - p.retAge) - 7000),
      why: fr ? "Croissance libre d'imp\u00f4t. Apr\u00e8s le REER." : "Tax-free growth. After RRSP.",
      color: "#2A8C46", priority: 4 });
  } else {
    priorities.push({ name: fr ? "Compte d'\u00e9pargne libre d'imp\u00f4t (CELI)" : "Tax-Free Savings Account (TFSA)",
      rate: pct(expRet), impact: Math.round(7000 * Math.pow(1 + expRet, p.deathAge - p.retAge) - 7000),
      why: fr ? "Les donn\u00e9es indiquent que ce taux marginal pourrait avantager le C\u00c9LI dans ce contexte." : "Data indicates this marginal rate could favour the TFSA in this context.",
      color: "#2A8C46", priority: 3 });
    priorities.push({ name: fr ? "R\u00e9gime enregistr\u00e9 d'\u00e9pargne-retraite (REER)" : "Registered Retirement Savings Plan (RRSP)",
      rate: pct(margRate), impact: Math.round(p.rrspC * 12 * Math.pow(1 + expRet, p.deathAge - p.retAge) * 0.7),
      why: fr ? "D\u00e9duction mod\u00e9r\u00e9e. Apr\u00e8s le CELI." : "Moderate deduction. After TFSA.",
      color: "#4680C0", priority: 4 });
  }

  // 4. Medium-rate debts (4-10%)
  (p._report.debts || []).filter(function(d) { return d.rate >= 0.04 && d.rate < 0.10; }).forEach(function(d) {
    var tl = fr ? { cc: "Carte de cr\u00e9dit", student: "Pr\u00eat \u00e9tudiant", car: "Pr\u00eat automobile", loc: "Marge de cr\u00e9dit" }
               : { cc: "Credit card", student: "Student loan", car: "Car loan", loc: "Line of credit" };
    priorities.push({ name: (tl[d.type] || d.type) + " (" + Math.round(d.bal).toLocaleString() + " $)",
      rate: pct(d.rate), impact: Math.round(d.totalInt || d.bal * d.rate * 3),
      why: d.rate > afterTaxRet
        ? (fr ? "Taux > rendement apr\u00e8s imp\u00f4t. Remboursement g\u00e9n\u00e9ralement favoris\u00e9." : "Rate > after-tax return. Repayment generally favored.")
        : (fr ? "Taux < rendement. Paiement minimum acceptable." : "Rate < return. Minimum payment acceptable."),
      color: "#B89830", priority: 5 });
  });

  // 5. Mortgage
  if (p._report.mortBal > 0) {
    var mmr = 0.055;
    priorities.push({ name: fr ? "Hypoth\u00e8que (" + Math.round(p._report.mortBal).toLocaleString() + " $)" : "Mortgage (" + Math.round(p._report.mortBal).toLocaleString() + " $)",
      rate: pct(mmr), impact: Math.round(p._report.mortBal * mmr * (p._report.mortAmort || 20) * 0.3),
      why: mmr > afterTaxRet
        ? (fr ? "Taux > rendement apr\u00e8s imp\u00f4t. Remboursement acc\u00e9l\u00e9r\u00e9 souvent favoris\u00e9." : "Rate > after-tax return. Accelerated repayment often favored.")
        : (fr ? "Taux < rendement. L'investissement est souvent favoris\u00e9." : "Rate < return. Investing often favored."),
      color: "#B89830", priority: 6 });
  }

  return priorities;
}

// ============================================================
// FORMAT HELPERS
// ============================================================
function f$(n) {
  if (n == null || isNaN(n)) return "\u2014";
  return (n < 0 ? "\u2212" : "") + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0") + "\u00a0$";
}
// fPct replaced by fmtPctInt from report-shared.ts
var fPct = fmtPctInt;
// gCol imported from report-shared.ts (successColor)

// ============================================================
// INTERNAL renderReport (port from source lines 3427-4187)
// ============================================================
function renderReport(D, mc, stratData, params, ai, aiLoading, lang, costDelay, minReturn, obsLabels) {
  costDelay = costDelay || 0;
  minReturn = minReturn || 0;
  var fr = lang === "fr", t = function(f, e) { return fr ? f : e; };
  var priorities = buildPriority(D, params, fr);
  var sC = gCol(D.succ);
  var circ = 2 * Math.PI * 48;
  var dashVal = circ * (1 - D.succ);
  var isQC = D.prov === "QC";
  var gP = fr ? (isQC ? "R\u00e9gime de rentes du Qu\u00e9bec" : "R\u00e9gime de pensions du Canada") : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  var oN = fr ? "Pension de la S\u00e9curit\u00e9 de la vieillesse" : "Old Age Security";
  var gradeLabel = sharedGradeLabel(D.successPct, fr);
  var probTranslation = buildProbTranslation(D.successPct, fr, "accumulation");

  // Benchmark data
  var bGroup = getBenchmarkAgeGroup(D.age);
  var bSav = BENCHMARKS.regSavings[bGroup] || { q1: 0, q2: 50000, q3: 150000 };
  var totalRegSav = (D.rrsp || 0) + (D.tfsa || 0);
  var bMul = getIncomeMultiple(D.age, D.totalSavings, D.sal);
  var incQ = getIncomeQuintile(D.sal);
  var bRate = BENCHMARKS.savingsRate[incQ] || { q1: 4, q2: 9, q3: 15 };
  var savRate = D.sal > 0 ? Math.round(((params.rrspC || 0) + (params.tfsaC || 0) + (params.nrC || 0)) / D.sal * 100) : 0;

  // ── Helper functions ──
  function benchBar(label, userVal, q1, q2, q3, format, note) {
    var maxVal = Math.max(userVal, q3) * 1.25 || 1;
    var pctUser = Math.min(100, userVal / maxVal * 100);
    var pctQ1 = Math.min(100, q1 / maxVal * 100);
    var pctQ2 = Math.min(100, q2 / maxVal * 100);
    var pctQ3 = Math.min(100, q3 / maxVal * 100);
    var posLabel = userVal > q3 ? t("Quartile sup\u00e9rieur", "Top quartile (75th+)") : userVal > q2 ? t("Au-dessus de la m\u00e9diane", "Above median (50\u201375th)") : userVal > q1 ? t("Sous la m\u00e9diane", "Below median (25\u201350th)") : t("Quartile inf\u00e9rieur", "Bottom quartile (<25th)");
    var barCol = userVal > q3 ? "var(--gn)" : userVal > q2 ? "var(--g)" : userVal > q1 ? "var(--am)" : "var(--rd)";
    var fmtFn = format === "pct" ? function(v) { return Math.round(v) + "%"; } : f$;
    return '<div style="margin-bottom:16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">'
      + '<span style="font-size:12px;font-weight:700;color:var(--ts)">' + label + '</span>'
      + '<span style="font-size:13px;font-weight:800;color:' + barCol + '">' + fmtFn(userVal) + '</span></div>'
      + '<div style="position:relative;height:20px;background:var(--bdl);border-radius:10px;overflow:visible">'
      + '<div style="position:absolute;left:' + pctQ1 + '%;top:-3px;width:1px;height:26px;background:rgba(0,0,0,.12);z-index:1"></div>'
      + '<div style="position:absolute;left:' + pctQ2 + '%;top:-3px;width:2px;height:26px;background:rgba(0,0,0,.2);z-index:1"></div>'
      + '<div style="position:absolute;left:' + pctQ3 + '%;top:-3px;width:1px;height:26px;background:rgba(0,0,0,.12);z-index:1"></div>'
      + '<div style="position:absolute;left:0;top:0;height:100%;width:' + pctUser + '%;background:' + barCol + ';border-radius:10px;transition:width .6s;opacity:.85"></div>'
      + '<div style="position:absolute;top:50%;left:' + pctUser + '%;transform:translate(-50%,-50%);width:16px;height:16px;border-radius:50%;background:' + barCol + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.2);z-index:2"></div>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--tm);margin-top:6px">'
      + '<span>P25: ' + fmtFn(q1) + '</span><span style="font-weight:700;color:var(--ts)">' + t("M\u00e9diane", "Median") + ': ' + fmtFn(q2) + '</span><span>P75: ' + fmtFn(q3) + '</span></div>'
      + (note ? '<div style="font-size:10px;color:' + barCol + ';font-weight:600;margin-top:3px">\u2192 ' + posLabel + '</div>' : '')
      + '</div>';
  }
  function aiSlot(text, fallback) {
    if (aiLoading) return '<div style="font-size:14px;color:#888;padding:12px 16px;background:#FDFBF7;border-left:3px solid #c49a1a;border-radius:4px;font-style:italic;margin:12px 0">\u2026</div>';
    if (!text) return fallback ? '<div style="font-size:14px;color:#444;line-height:1.75;margin:12px 0;padding:12px 16px;background:#FDFBF7;border-left:3px solid #c49a1a;border-radius:4px">' + fallback + '</div>' : '';
    return '<div style="font-size:14px;color:#444;line-height:1.75;margin:14px 0;padding:12px 16px;background:#FDFBF7;border-left:3px solid #c49a1a;border-radius:4px">' + text + '</div>';
  }
  function secH(n, title, sub) {
    return '<div id="sec-' + n + '" style="margin-bottom:52px">'
      + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;padding-bottom:12px;border-bottom:2px solid var(--g)">'
      + '<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--g),var(--gl));color:#fff;font-size:12px;font-weight:800;flex-shrink:0">' + n + '</span>'
      + '<div><div style="font-size:12px;font-weight:800;color:var(--g);text-transform:uppercase;letter-spacing:1.2px">' + title + '</div>'
      + (sub ? '<div style="font-size:11px;color:var(--tm);margin-top:1px">' + sub + '</div>' : '')
      + '</div></div>';
  }
  function secEnd() { return '</div>'; }
  function bridge(textFr, textEn) {
    return '<div style="font-size:12px;color:var(--tm);font-style:italic;margin:-4px 0 18px;padding:0 2px;line-height:1.75">' + t(textFr, textEn) + '</div>';
  }
  function card(inner, s) { return '<div class="rpt-card" style="background:var(--bgc);border:1px solid var(--bd);border-radius:var(--rad);padding:20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.03);' + (s || '') + '">' + inner + '</div>'; }
  function kp(v, l, c, sub) { var mod = c === 'var(--rd)' ? ' krd' : c === 'var(--am)' ? ' kam' : c === 'var(--gn)' ? ' kgn' : ''; var s = mod ? '' : 'border:1px solid var(--bd);border-top:3px solid ' + (c || 'var(--g)') + ';'; var vc = mod ? '' : 'color:' + (c || 'var(--g)') + ';'; return '<div class="kp' + mod + '" style="' + s + '"><div class="kv" style="' + vc + '">' + v + '</div><div class="kl">' + l + '</div>' + (sub ? '<div class="ks">' + sub + '</div>' : '') + '</div>'; }
  function kvr(k, v) { return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bdl);font-size:13px"><span style="color:var(--ts)">' + k + '</span><span style="font-family:var(--mono);font-weight:600">' + v + '</span></div>'; }
  function obs(title, text, type, bullets) {
    var c = { insight: ["var(--gnbg)", "var(--gn)"], watch: ["var(--ambg)", "var(--am)"], info: ["var(--gbg)", "var(--g)"], risk: ["var(--rdbg)", "var(--rd)"] }[type] || ["var(--gbg)", "var(--g)"];
    return '<div style="background:' + c[0] + ';border:1px solid ' + c[1] + ';border-left:4px solid ' + c[1] + ';border-radius:8px;padding:14px 16px;margin:10px 0">'
      + '<div style="font-size:12px;font-weight:700;color:' + c[1] + ';margin-bottom:8px;text-transform:uppercase;letter-spacing:.5px">' + title + '</div>'
      + '<div style="font-size:14px;color:var(--ts);line-height:1.75">' + text + '</div>'
      + (bullets ? '<div class="ex" style="margin-top:8px">' + bullets + '</div>' : '')
      + '</div>';
  }
  function gauge(label, score, color) {
    var w = Math.max(0, Math.min(100, score));
    return '<div style="margin-bottom:12px">'
      + '<div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px"><span style="font-weight:600;color:var(--ts)">' + label + '</span><span style="font-weight:700;color:' + color + '">' + w + '/100</span></div>'
      + '<div style="height:8px;background:var(--bdl);border-radius:4px"><div style="height:100%;background:' + color + ';border-radius:4px;width:' + w + '%"></div></div></div>';
  }

  var totalLiq = (D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0) + (D.liraBal || 0) + (D.dcBal || 0) + (params.cOn ? ((params.cRRSP || 0) + (params.cTFSA || 0) + (params.cNR || 0)) : 0);
  var h = '';

  // ═══ HEADER ═══
  h += '<div class="rpt-wrap">';
  // ── Logo SVG ──
  var logoSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="48" viewBox="0 0 220 48">'
    + '<g>'
    + '<rect x="0" y="32" width="28" height="8" rx="2" fill="#1a2744"/>'
    + '<rect x="4" y="22" width="26" height="8" rx="2" fill="#1a2744" opacity="0.50"/>'
    + '<rect x="8" y="12" width="24" height="8" rx="2" fill="#c49a1a"/>'
    + '</g>'
    + '<text x="40" y="38" font-family="\'Plus Jakarta Sans\',sans-serif" font-size="34" font-weight="700" letter-spacing="-0.5">'
    + '<tspan fill="#1a2744">build</tspan><tspan fill="#c49a1a">fi</tspan></text>'
    + '</svg>';

  h += '<div style="margin-bottom:32px;padding:28px 24px;background:linear-gradient(135deg,#FFF8ED,#FDF3E0);border-radius:16px;border:1px solid rgba(196,154,26,.2)">'
    // Top row: logo + meta
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:8px">'
    + logoSVG
    + '<div style="font-size:10px;color:var(--tm);text-align:right">'
    + t("Bilan 360", "Snapshot 360") + ' \u2014 ' + D.prov
    + '<br>' + (D.nSim || 5000).toLocaleString() + ' ' + t("simulations", "simulations") + ' \u2014 ' + new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA")
    + '</div></div>'
    // Grade card: donut (letter only, no %) + text right
    + '<div class="rpt-donut" style="gap:28px">'
    + '<div style="position:relative;width:120px;height:120px;flex-shrink:0">'
    + '<svg width="120" height="120" style="transform:rotate(-90deg)">'
    + '<circle cx="60" cy="60" r="48" fill="none" stroke="var(--bdl)" stroke-width="10"/>'
    + '<circle cx="60" cy="60" r="48" fill="none" stroke="' + sC + '" stroke-width="10"'
    + ' stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + dashVal.toFixed(1) + '"'
    + ' stroke-linecap="round"/>'
    + '</svg>'
    + '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center">'
    + '<div style="font-family:var(--mono);font-size:32px;font-weight:900;color:' + sC + ';line-height:1">' + D.grade + '</div>'
    + '</div></div>'
    + '<div style="text-align:left">'
    + '<div style="font-size:18px;font-weight:800;color:' + sC + ';margin-bottom:4px">' + gradeLabel + '</div>'
    + '<div style="font-size:13px;color:var(--ts);margin-bottom:6px">' + D.successPct + '% ' + t("de probabilit\u00e9 de succ\u00e8s", "probability of success") + '</div>'
    + '<div style="font-size:13px;color:var(--ts);margin-bottom:3px">' + t("Patrimoine \u00e0 la retraite", "Wealth at retirement") + ' : <strong>' + f$(D.retBal) + '</strong></div>'
    + '<div style="font-size:13px;color:var(--ts);margin-bottom:3px">' + t("Revenu cible", "Target income") + ' : <strong>' + f$(D.retSpM) + t('\u202f/mois', '\u202f/mo') + '</strong></div>'
    + '<div style="font-size:13px;color:var(--ts)">' + t("Retraite cible", "Target retirement") + ' : <strong>' + D.retAge + ' ' + t("ans", "yrs") + '</strong></div>'
    + '</div></div></div>';

  // Dollars d'aujourd'hui + grade interpretation
  h += '<div class="co cog">' + t(
    "Tous les montants sont en <strong>dollars d\u2019aujourd\u2019hui</strong> \u2014 ajust\u00e9s pour l\u2019inflation projet\u00e9e \u00e0 " + ((D.inf || 0.02) * 100).toFixed(1) + "\u202f% par ann\u00e9e.",
    "All amounts are in <strong>today\u2019s dollars</strong> \u2014 adjusted for projected inflation of " + ((D.inf || 0.02) * 100).toFixed(1) + "% per year."
  ) + '</div>';
  h += '<div style="font-size:12px;color:var(--tm);line-height:1.6;font-style:italic;margin:6px 0 16px;padding-left:4px">' + probTranslation + '</div>';

  // ═══ DECISION CARD ═══
  var dcVuln360 = '', dcLever360 = '';
  var vulnYrs360 = Math.max(0, (D.qppAge || D.retAge) - D.retAge);
  // Vulnerability (first match wins)
  if (D.successPct < 70) {
    dcVuln360 = t(
      "Le mod\u00e8le indique que votre plan pourrait ne pas r\u00e9sister dans " + (100 - D.successPct) + "\u00a0% des sc\u00e9narios simul\u00e9s.",
      "The model indicates your plan may not hold in " + (100 - D.successPct) + "% of simulated scenarios."
    );
  } else if (D.medRuin && D.medRuin < 999 && D.medRuin < D.deathAge - 3) {
    dcVuln360 = t(
      "Dans les sc\u00e9narios d\u00e9favorables, le capital pourrait s\u2019\u00e9puiser vers " + D.medRuin + " ans.",
      "In unfavorable scenarios, capital could deplete around age " + D.medRuin + "."
    );
  } else if (D.withdrawalRatePct > 5) {
    dcVuln360 = t(
      "Le taux de retrait projet\u00e9 de " + D.withdrawalRatePct.toFixed(1) + "\u00a0% d\u00e9passe le seuil historiquement soutenable de 4\u00a0%.",
      "The projected withdrawal rate of " + D.withdrawalRatePct.toFixed(1) + "% exceeds the historically sustainable 4% threshold."
    );
  } else if (vulnYrs360 > 0) {
    dcVuln360 = t(
      "Une p\u00e9riode de " + vulnYrs360 + " an" + (vulnYrs360 > 1 ? "s" : "") + " sans revenus garantis complets s\u00e9pare votre retraite du d\u00e9but de vos prestations gouvernementales.",
      "A " + vulnYrs360 + "-year gap without full guaranteed income separates your retirement from the start of government benefits."
    );
  } else if (D.taxRetirementEffective > D.taxCurrentEffective + 5) {
    dcVuln360 = t(
      "Le taux d\u2019imposition effectif pourrait augmenter \u00e0 la retraite (" + D.taxCurrentEffective + "\u00a0% \u2192 " + D.taxRetirementEffective + "\u00a0%) \u2014 un signe possible de d\u00e9s\u00e9quilibre dans la structure de revenus.",
      "The effective tax rate could increase in retirement (" + D.taxCurrentEffective + "% \u2192 " + D.taxRetirementEffective + "%) \u2014 a possible sign of income structure imbalance."
    );
  } else {
    dcVuln360 = t(
      "Aucune vuln\u00e9rabilit\u00e9 majeure d\u00e9tect\u00e9e dans les sc\u00e9narios simul\u00e9s.",
      "No major vulnerability detected in simulated scenarios."
    );
  }
  // Lever (first match wins)
  if (priorities.length > 0) {
    dcLever360 = priorities[0].name + (priorities[0].rate ? ' (' + priorities[0].rate + ')' : '');
  } else if (D.coveragePct < 40) {
    dcLever360 = t(
      "Les revenus garantis couvrent seulement " + D.coveragePct + "\u00a0% du revenu cible \u2014 la couverture du d\u00e9ficit repose enti\u00e8rement sur l\u2019\u00e9pargne.",
      "Guaranteed income covers only " + D.coveragePct + "% of target \u2014 filling the gap relies entirely on savings."
    );
  } else {
    dcLever360 = t(
      "Consultez les observations et priorit\u00e9s ci-dessous pour les pistes identifi\u00e9es.",
      "See the observations and priorities below for identified paths."
    );
  }
  var dcInterp360 = (ai && ai.snapshot_intro) ? ai.snapshot_intro : t(
    "Votre note de " + gradeLabel + " (" + D.successPct + "\u00a0%) indique " + (D.successPct >= 80 ? "une position solide" : D.successPct >= 60 ? "une position correcte avec des pistes d\u2019am\u00e9lioration" : "une situation qui m\u00e9rite attention") + ". Les sections suivantes d\u00e9taillent chaque dimension de votre plan.",
    "Your grade of " + gradeLabel + " (" + D.successPct + "%) indicates " + (D.successPct >= 80 ? "a solid position" : D.successPct >= 60 ? "a reasonable position with room for improvement" : "a situation that warrants attention") + ". The following sections detail each dimension of your plan."
  );
  h += '<div style="background:#fff;border:1px solid var(--bd);border-left:4px solid var(--g);border-radius:12px;padding:24px 28px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,.03)">';
  h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">';
  h += '<div style="font-family:var(--mono);font-size:36px;font-weight:900;color:' + sC + ';line-height:1">' + D.grade + '</div>';
  h += '<div><div style="font-size:15px;font-weight:700;color:' + sC + '">' + gradeLabel + '</div>';
  h += '<div style="font-size:13px;color:var(--tm)">' + D.successPct + '\u00a0% ' + t("de r\u00e9ussite","success rate") + '</div></div></div>';
  h += '<div style="height:1px;background:var(--bd);margin:16px 0"></div>';
  h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#CC4444;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + t("Votre plus grand risque","Your biggest risk") + '</div>';
  h += '<div style="font-size:14px;color:var(--ts);line-height:1.65">' + dcVuln360 + '</div></div>';
  h += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + t("Votre meilleur levier","Your best lever") + '</div>';
  h += '<div style="font-size:14px;color:var(--ts);line-height:1.65">' + dcLever360 + '</div></div>';
  h += '<div style="height:1px;background:var(--bd);margin:16px 0"></div>';
  h += '<div style="font-size:12px;font-weight:700;color:var(--tm);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">' + t("Ce que cela signifie","What this means") + '</div>';
  h += '<div style="font-size:13px;color:var(--tm);line-height:1.7">' + dcInterp360 + '</div>';
  h += '</div>';

  // ── Reading guide ─────────────────────────────────────
  h += '<div style="background:#FDFBF7;border:1px solid #E8E0D0;border-radius:6px;padding:12px 16px;margin:0 0 16px;font-size:13px;color:#555;line-height:1.7">'
    + '<strong>' + t("Comment lire ce bilan", "How to read this assessment") + '</strong><br>'
    + t("Ce bilan projette votre trajectoire de retraite à travers " + (D.nSim || 5000).toLocaleString("fr-CA") + " scénarios économiques différents — rendements variables, inflation, longévité. Le taux de réussite indique dans combien de ces scénarios votre épargne pourrait durer jusqu\u2019à la fin de la retraite.",
       "This assessment projects your retirement trajectory across " + (D.nSim || 5000).toLocaleString("en-CA") + " different economic scenarios — variable returns, inflation, longevity. The success rate indicates in how many of these scenarios your savings could last through retirement.")
    + '</div>';

  // ── Mirror block — situation in 30 seconds ────────────
  var govLabel360 = isQC ? (fr ? "RRQ + SV" : "QPP + OAS") : (fr ? "RPC + SV" : "CPP + OAS");
  var mirrorGap360 = Math.max(0, D.retSpM - D.govMonthly);
  h += '<div style="background:linear-gradient(135deg,#1A1208 0%,#2D2010 100%);color:#fff;border-radius:14px;padding:24px 28px;margin:8px 0 20px;">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c49a1a;margin-bottom:12px;font-weight:600;">' + t("Votre situation en 30 secondes", "Your situation in 30 seconds") + '</div>'
    + '<div style="font-size:15px;line-height:1.8;color:#E8E0D4;">'
    + t("Vous avez " + D.age + " ans. Vous visez la retraite à " + D.retAge + " ans avec un revenu de " + f$(D.retSpM) + " par mois. Votre épargne totalise " + f$(D.totalSavings) + ". Les revenus garantis (" + govLabel360 + (D.hasPension ? " + pension" : "") + ") pourraient couvrir " + f$(D.govMonthly) + " par mois" + (mirrorGap360 > 0 ? " — le portefeuille devrait combler " + f$(mirrorGap360) + " par mois" : "") + ".",
       "You are " + D.age + " years old. You target retirement at " + D.retAge + " with an income of " + f$(D.retSpM) + " per month. Your savings total " + f$(D.totalSavings) + ". Guaranteed income (" + govLabel360 + (D.hasPension ? " + pension" : "") + ") could cover " + f$(D.govMonthly) + " per month" + (mirrorGap360 > 0 ? " — the portfolio would need to fill " + f$(mirrorGap360) + " per month" : "") + ".")
    + '</div></div>';

  // ── Age of ruin display (conditional) ──────────────────
  if (D.medRuin && D.medRuin < 999) {
    var ruinPctInter = Math.round((1 - D.succ) * 100);
    h += '<div style="background:#FDF5F5;border:1px solid #E8C0C0;border-radius:12px;padding:16px 18px;margin:12px 0;">'
      + '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="font-size:28px;font-weight:700;color:#CC4444;">' + D.medRuin + '</div>'
      + '<div><div style="font-size:13px;font-weight:700;color:#CC4444;">' + t("\u00c2ge m\u00e9dian d\u2019\u00e9puisement", "Median depletion age") + '</div>'
      + '<div style="font-size:12px;color:#666;">' + t("Dans " + ruinPctInter + " % des sc\u00e9narios, l\u2019\u00e9pargne pourrait s\u2019\u00e9puiser vers cet \u00e2ge.", "In " + ruinPctInter + "% of scenarios, savings could deplete around this age.") + '</div></div></div></div>';
  }

  h += aiSlot(ai.snapshot_intro, t(
    "Note " + D.grade + " \u2014 votre plan pourrait atteindre ses objectifs dans " + D.successPct + "\u00a0% des " + (D.nSim || 5000).toLocaleString("fr-CA") + "\u00a0sc\u00e9narios simul\u00e9s. " + (D.successPct >= 75 ? "La structure de votre plan d\u00e9montre une r\u00e9silience solide face \u00e0 une large gamme de conditions de march\u00e9." : D.successPct >= 55 ? "Le plan affiche une viabilit\u00e9 mod\u00e9r\u00e9e \u2014 certains ajustements pourraient renforcer sa robustesse." : "Le plan pr\u00e9sente des zones de fragilit\u00e9 qui m\u00e9riteraient d\u2019\u00eatre examin\u00e9es attentivement."),
    "Grade " + D.grade + " \u2014 your plan could achieve its goals in " + D.successPct + "\u00a0% of " + (D.nSim || 5000).toLocaleString("en-CA") + "\u00a0simulated scenarios. " + (D.successPct >= 75 ? "Your plan demonstrates solid resilience across a wide range of market conditions." : D.successPct >= 55 ? "The plan shows moderate viability \u2014 some adjustments could strengthen its robustness." : "The plan has areas of fragility that would be worth examining carefully.")
  ));

  // Objectif callout — always render (AI if available, data-driven fallback otherwise)
  var objLabel = ai.objectif || (function() {
    var ov = (params._quiz || {}).objective || "";
    if (ov === "growth") return fr ? "Faire cro\u00eetre votre patrimoine activement." : "Actively grow your wealth.";
    if (ov === "security") return fr ? "Assurer votre s\u00e9curit\u00e9 financi\u00e8re \u00e0 la retraite." : "Ensure financial security in retirement.";
    if (ov === "balance") return fr ? "\u00c9quilibrer qualit\u00e9 de vie et accumulation patrimoniale." : "Balance quality of life with wealth accumulation.";
    if (ov === "legacy") return fr ? "Constituer un patrimoine durable pour vos h\u00e9ritiers." : "Build lasting wealth for your heirs.";
    return "";
  })();
  if (objLabel) h += '<div class="co cog"><strong>' + t("Votre objectif", "Your objective") + '</strong> \u2014 ' + objLabel + '</div>';

  // Worries badge row — surfaces quiz step 6 choices in the report header
  var quizWorries = (params._quiz || {}).worries || [];
  if (quizWorries.length > 0) {
    var worryLabels = {
      runout: fr ? "Long\u00e9vit\u00e9" : "Longevity",
      health: fr ? "Co\u00fbts de sant\u00e9" : "Health costs",
      market: fr ? "Volatilit\u00e9 des march\u00e9s" : "Market volatility",
      inflation: fr ? "Inflation" : "Inflation",
      tax: fr ? "Imp\u00f4ts" : "Taxes",
      legacy: fr ? "Succession" : "Estate"
    };
    h += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 20px;align-items:center">'
      + '<span style="font-size:11px;color:var(--tm);font-weight:600;flex-shrink:0">' + t("Pr\u00e9occupations\u00a0:", "Focus areas:") + '</span>'
      + quizWorries.map(function(w) {
          return '<span style="font-size:11px;padding:3px 10px;border-radius:20px;background:var(--ambg);color:var(--am);font-weight:600;border:1px solid rgba(184,152,48,.25)">'
            + (worryLabels[w] || w) + '</span>';
        }).join("")
      + '</div>';
  }

  // ═══ TOC — dynamic numbering (m-13) ═══
  var interSN = 0;
  function nextSecInter() { interSN++; return String(interSN); }
  var tocItems = [];
  // Pre-compute section numbers for TOC (must match render order)
  var _t = 0;
  function tocN() { _t++; return String(_t); }
  var tn1 = tocN(); tocItems.push({ n: tn1, l: t("Tableau de bord", "Dashboard") });
  var tn2 = tocN(); tocItems.push({ n: tn2, l: t("Profil", "Profile") });
  var tn3 = tocN(); tocItems.push({ n: tn3, l: t("\u00c9pargne", "Savings") });
  var tn4 = tocN(); tocItems.push({ n: tn4, l: t("Revenus", "Income") });
  var tn5 = tocN(); tocItems.push({ n: tn5, l: t("Fiscalit\u00e9", "Taxes") });
  var tn6 = tocN(); tocItems.push({ n: tn6, l: t("Long\u00e9vit\u00e9", "Longevity") });
  var tn7 = tocN(); tocItems.push({ n: tn7, l: t("Observations", "Observations") });
  var tn8 = tocN(); tocItems.push({ n: tn8, l: t("Priorit\u00e9s", "Priorities") });
  var tn9 = tocN(); tocItems.push({ n: tn9, l: t("Strat\u00e9gies", "Strategies") });
  var tn10 = null; if ((params._report || {}).homeVal > 0) { tn10 = tocN(); tocItems.push({ n: tn10, l: t("Immobilier", "Real estate") }); }
  var tn11 = null; if (params.cOn) { tn11 = tocN(); tocItems.push({ n: tn11, l: t("Couple", "Couple") }); }
  var tn12 = null; if ((params._report || {}).bizOn) { tn12 = tocN(); tocItems.push({ n: tn12, l: "CCPC" }); }
  var tn13 = null; if ((D.medEstateNet || 0) > 100000 || (params.lifeInsBenefit || 0) > 0) { tn13 = tocN(); tocItems.push({ n: tn13, l: t("Succession", "Estate") }); }
  var tn14 = tocN(); tocItems.push({ n: tn14, l: t("RRQ/PSV", "QPP/OAS") });
  var tn15 = tocN(); tocItems.push({ n: tn15, l: t("Projection", "Projection") });
  var tn16 = tocN(); tocItems.push({ n: tn16, l: t("M\u00e9thodo", "Methodology") });
  var tn17 = tocN(); tocItems.push({ n: tn17, l: t("Actions", "Next steps") });
  h += '<div style="text-align:center;margin-bottom:8px;font-size:11px;color:var(--tm)">'
    + t("Ce rapport contient", "This report includes") + ' <strong>' + tocItems.length + '</strong> '
    + t("sections adapt\u00e9es \u00e0 votre profil", "sections tailored to your profile") + '</div>';
  h += '<div class="np" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:28px;justify-content:center">';
  tocItems.forEach(function(item) {
    h += '<a href="#sec-' + item.n + '" style="font-size:11px;padding:4px 10px;border-radius:12px;background:var(--gbg);color:var(--g);text-decoration:none;font-weight:600;border:1px solid var(--bd)">' + item.n + '. ' + item.l + '</a>';
  });
  h += '</div>';

  // ═══ S1: Dashboard ═══
  h += secH(nextSecInter(), t("Tableau de bord", "Dashboard"), t("11 indicateurs cl\u00e9s de votre plan", "11 key indicators of your plan"));
  h += '<div class="co cogn">' + t("Les 11 indicateurs ci-dessous r\u00e9sument votre situation en chiffres bruts.", "The 11 indicators below summarize your situation in concrete numbers.") + '</div>';

  // Group 1: Patrimoine
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--tm);margin:20px 0 8px">' + t("Patrimoine", "Wealth") + '</div>';
  h += '<div class="kg4">';
  h += kp(f$(totalLiq), t("Patrimoine liquide total", "Total liquid wealth"), "var(--g)");
  h += kp(f$(D.retBal), t("Patrimoine \u00e0 la retraite", "Wealth at retirement"), "var(--g)", t("\u00c0 " + D.retAge + " ans", "At age " + D.retAge));
  h += kp(f$(D.rMedF), t("Solde r\u00e9siduel m\u00e9dian", "Median projected remainder"), D.rMedF > 0 ? "var(--gn)" : "var(--rd)", t("\u00c0 " + D.avgDeath + " ans (esp. vie MC)", "At age " + D.avgDeath + " (MC life exp.)"));
  h += kp(D.retAge - D.age + " " + t("ans", "yrs"), t("Ann\u00e9es avant la retraite", "Years to retirement"), "var(--bl)");
  h += '</div>';

  // Group 2: Revenus & Succession
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--tm);margin:20px 0 8px">' + t("Revenus & Succession", "Income & Estate") + '</div>';
  h += '<div class="kg4">';
  h += kp(fPct(D.coveragePct), t("Couverture gouvernementale", "Gov. coverage rate"), D.coveragePct >= 60 ? "var(--gn)" : D.coveragePct >= 40 ? "var(--am)" : "var(--rd)", t((isQC ? "RRQ" : "RPC") + "+PSV / revenu cible", (isQC ? "QPP" : "CPP") + "+OAS / target income"));
  h += kp(f$(D.gapMonthly) + t("/mois", "/mo"), t("D\u00e9ficit mensuel \u00e0 combler", "Monthly gap to fill"), D.gapMonthly < D.retSpM * 0.3 ? "var(--gn)" : D.gapMonthly < D.retSpM * 0.6 ? "var(--am)" : "var(--rd)");
  h += kp(f$(D.medEstateTax), t("Imp\u00f4t estim\u00e9 au d\u00e9c\u00e8s", "Est. tax at death"), "var(--am)", t("Sc\u00e9nario m\u00e9dian", "Median scenario"));
  h += kp(f$(D.medEstateNet), t("Succession nette estim\u00e9e", "Est. net estate"), "var(--gn)", t("Apr\u00e8s imp\u00f4ts", "After tax"));
  h += '</div>';

  // Group 3: Risques
  h += '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--tm);margin:20px 0 8px">' + t("Risques", "Risks") + '</div>';
  h += '<div class="kg">';
  h += kp(D.avgDeath + " " + t("ans", "yrs"), t("Esp\u00e9rance de vie MC", "MC life expectancy"), "var(--bl)", t("Tables CPM-2023", "CPM-2023 tables"));
  h += kp(mc.p5Ruin >= 999 || !mc.p5Ruin ? t("Aucun", "None") : mc.p5Ruin + " " + t("ans", "yrs"), t("\u00c2ge de d\u00e9tresse P5", "P5 distress age"), (!mc.p5Ruin || mc.p5Ruin >= 999) ? "var(--gn)" : mc.p5Ruin > (D.deathAge - 10) ? "var(--am)" : "var(--rd)", t("Sc\u00e9nario pessimiste (5%)", "Pessimistic scenario (5%)"));
  h += kp(f$(D.feeCostLifetime), t("Co\u00fbt cumulatif MER", "Cumulative MER cost"), "var(--am)", t("Sur l'horizon de retraite", "Over retirement horizon"));
  h += '</div>';

  // Resilience gauges
  h += card(
    '<div style="font-size:13px;font-weight:700;margin-bottom:14px">' + t("Score de r\u00e9silience \u2014 4 dimensions", "Resilience score \u2014 4 dimensions") + '</div>'
    + gauge(t("Long\u00e9vit\u00e9 du patrimoine", "Wealth longevity"), D.longevityScore, D.longevityScore >= 80 ? "var(--gn)" : D.longevityScore >= 60 ? "var(--am)" : "var(--rd)")
    + gauge(t("Efficacit\u00e9 fiscale", "Tax efficiency"), D.taxScore, D.taxScore >= 80 ? "var(--gn)" : D.taxScore >= 60 ? "var(--am)" : "var(--rd)")
    + gauge(t("Couverture gouvernementale", "Government coverage"), D.covScore, D.covScore >= 60 ? "var(--gn)" : D.covScore >= 40 ? "var(--am)" : "var(--rd)")
    + gauge(t("Diversification des comptes", "Account diversification"), D.diverScore, D.diverScore >= 80 ? "var(--gn)" : D.diverScore >= 60 ? "var(--am)" : "var(--rd)")
  );

  // Benchmarks card
  h += card(
    '<div style="font-size:13px;font-weight:700;margin-bottom:4px">' + t("Vous vs votre groupe", "You vs your group") + '</div>'
    + '<div style="font-size:11px;color:var(--tm);margin-bottom:14px">' + t("Source\u00a0: StatCan ESF 2023, dollars 2026. Groupe d\u2019\u00e2ge", "Source: StatCan SFS 2023, 2026 dollars. Age group") + ' <strong>' + bGroup + '</strong> \u2014 ' + t("Canadiens avec revenus similaires", "Canadians with similar income") + '.</div>'
    + benchBar(t("\u00c9pargne enregistr\u00e9e (REER + CELI)", "Registered savings (RRSP + TFSA)"), totalRegSav, bSav.q1, bSav.q2, bSav.q3, "dollar", true)
    + benchBar(t("Taux d'\u00e9pargne annuel", "Annual savings rate"), savRate, bRate.q1, bRate.q2, bRate.q3, "pct", true)
    + (bMul ? '<div style="margin-top:10px;padding:10px 12px;background:var(--gbg);border-radius:8px;font-size:12px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px">'
      + '<span style="color:var(--ts);font-weight:600">' + t("Multiple de revenu", "Income multiple") + '</span>'
      + '<span style="font-weight:800;color:' + (bMul.actual >= bMul.target ? "var(--gn)" : "var(--am)") + '">' + bMul.actual.toFixed(1) + '\u00d7</span></div>'
      + '<div style="font-size:11px;color:var(--tm)">' + t("Cible \u00e0", "Target at") + " " + bMul.age + " " + t("ans", "yrs") + ": <strong>" + bMul.target + "\u00d7</strong> " + t("son revenu", "income") + '</div>'
      + '<div style="font-size:11px;color:' + (bMul.actual >= bMul.target ? "var(--gn)" : "var(--am)") + ';font-weight:600;margin-top:2px">'
      + (bMul.actual >= bMul.target ? "\u2713 " + t("Objectif atteint", "On target") : t("\u00c9cart de", "Gap of") + " " + ((bMul.target - bMul.actual).toFixed(1)) + "\u00d7 \u2192 " + f$((bMul.target - bMul.actual) * D.sal))
      + '</div></div>' : '')
    + (ai.benchmark_context ? aiSlot(ai.benchmark_context) : aiSlot(null, t(
        "Votre \u00e9pargne enregistr\u00e9e de " + f$(totalRegSav) + " se situe " + (totalRegSav > bSav.q3 ? "au-dessus du 75e percentile" : totalRegSav > bSav.q2 ? "entre la m\u00e9diane et le 75e percentile" : "en dessous de la m\u00e9diane") + " des Canadiens de votre groupe d'\u00e2ge avec un revenu similaire.",
        "Your registered savings of " + f$(totalRegSav) + " place you " + (totalRegSav > bSav.q3 ? "above the 75th percentile" : totalRegSav > bSav.q2 ? "between the median and 75th percentile" : "below the median") + " of Canadians in your age group with similar income.")))
  );
  h += secEnd();

  // ═══ S2: Profile & Trajectory ═══
  h += secH(nextSecInter(), t("Votre profil et trajectoire", "Your profile and trajectory"));
  h += bridge(
    "Ces indicateurs d\u00e9coulent directement de votre profil \u2014 voici les param\u00e8tres qui les alimentent.",
    "These indicators flow directly from your profile \u2014 here are the parameters that drive them."
  );
  h += card(
    kvr(t("\u00c2ge actuel", "Current age"), D.age + " " + t("ans", "yrs"))
    + kvr("Province", D.prov)
    + kvr(t("Retraite cible", "Target retirement"), D.retAge + " " + t("ans", "yrs"))
    + kvr(t("Horizon de planification", "Planning horizon"), (D.deathAge - D.age) + " " + t("ans", "yrs"))
    + (params.cOn ? kvr(t("Retraite conjoint\u00b7e", "Partner retirement"), params.cRetAge + " " + t("ans", "yrs")) : "")
    + kvr(gP, D.qppAge + " " + t("ans", "yrs"))
    + kvr(oN, D.oasAge + " " + t("ans", "yrs"))
    + (D.hasPension ? kvr(t("Pension employeur", "Employer pension"), D.penType === "db" ? f$(D.dbPensionMonthly) + t("/mois \u2014 PD", "/mo \u2014 DB") : t("CD", "DC") + ", " + f$(D.dcBal || 0)) : "")
  );

  // Timeline SVG
  (function() {
    var W = 700, H = 90, P = 24, CW = W - P * 2;
    var totalYrs = D.deathAge - D.age;
    var xOf = function(age) { return P + (age - D.age) / totalYrs * CW; };
    var svg = '<div style="overflow-x:auto"><svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;margin-top:8px">';
    svg += '<line x1="' + P + '" x2="' + (W - P) + '" y1="38" y2="38" stroke="var(--bd)" stroke-width="2"/>';
    var markers = [
      { age: D.retAge, label: t("Retraite", "Retirement"), c: "var(--g)", r: 7, above: true },
      { age: D.qppAge, label: (isQC ? "RRQ" : "RPC") + " " + D.qppAge, c: "var(--gn)", r: 5, above: false },
      { age: D.oasAge !== D.qppAge ? D.oasAge : null, label: t("PSV", "OAS") + " " + D.oasAge, c: "var(--bl)", r: 5, above: false }
    ].filter(function(m) { return m.age && m.age >= D.age && m.age <= D.deathAge; });
    if (params._report.mortFreeAge > D.age && params._report.mortFreeAge < D.deathAge)
      markers.push({ age: params._report.mortFreeAge, label: t("Fin hyp.", "Mtg free"), c: "var(--am)", r: 4, above: false });
    markers.forEach(function(m) {
      var x = xOf(m.age);
      svg += '<circle cx="' + x + '" cy="38" r="' + m.r + '" fill="' + m.c + '"/>';
      if (m.above) { svg += '<text x="' + x + '" y="20" text-anchor="middle" font-size="10" fill="' + m.c + '" font-weight="700" font-family="DM Sans,sans-serif">' + m.label + '</text>'; }
      else { svg += '<text x="' + x + '" y="60" text-anchor="middle" font-size="9" fill="' + m.c + '" font-family="DM Sans,sans-serif">' + m.label + '</text>'; }
    });
    [D.age, D.retAge, D.deathAge].forEach(function(a) {
      svg += '<text x="' + xOf(a) + '" y="80" text-anchor="middle" font-size="9" fill="var(--tm)" font-family="monospace">' + a + '</text>';
    });
    svg += '</svg></div>';
    h += card(svg);
  })();
  h += secEnd();

  // ═══ S3: Savings Trajectory ═══
  h += secH(nextSecInter(), t("\u00c9volution de votre \u00e9pargne", "Your savings trajectory"), t("Projection du patrimoine jusqu'\u00e0 la retraite", "Projected wealth to retirement"));
  h += bridge(
    "\u00c0 " + D.age + "\u00a0ans, avec un revenu de " + f$(D.sal) + "/an, voici comment votre \u00e9pargne pourrait \u00e9voluer jusqu'\u00e0 la retraite.",
    "At age " + D.age + ", with " + f$(D.sal) + "/yr in income, here is how your savings could evolve toward retirement."
  );
  h += '<div class="co cogn">' + t("Voici comment votre \u00e9pargne actuelle se projette d\u2019ici la retraite, compte tenu de vos versements et du rendement moyen simul\u00e9.", "This is how your current savings project toward retirement, accounting for your contributions and the simulated average return.") + '</div>';
  (function() {
    var rd = D.medRevData || [];
    var ages = []; for (var a = D.age; a <= D.deathAge; a += 1) ages.push(a);
    var W = 700, H = 240, P = 50, PR = 12, PT = 22, PB = 30, CW = W - P - PR, CH = H - PT - PB;
    var maxV = 0;
    var data = ages.map(function(a) {
      var r = rd.find(function(x) { return x.age === a; }) || {};
      var tot2 = (r.aRR || 0) + (r.aTF || 0) + (r.aNR || 0) + (r.aLIRA || 0) + (r.aDC || 0) + (r.corpBal || 0);
      if (tot2 > maxV) maxV = tot2;
      return { a: a, rr: r.aRR || 0, tf: r.aTF || 0, nr: r.aNR || 0, lira: r.aLIRA || 0, dc: r.aDC || 0, corp: r.corpBal || 0, tot: tot2 };
    });
    maxV = Math.max(maxV * 1.05, 100000);
    var sx = function(i) { return P + i / (ages.length - 1) * CW; };
    var sy = function(v) { return PT + CH - Math.min(v, maxV) / maxV * CH; };
    var pts = function(vals) { return vals.map(function(v, i) { return sx(i) + "," + sy(v); }).join(" "); };
    var stackPts = function(tops, bots) { return tops.map(function(v, i) { return sx(i) + "," + sy(v); }).join(" ") + " " + bots.slice().reverse().map(function(v, i) { return sx(bots.length - 1 - i) + "," + sy(v); }).join(" "); };
    var rrV = data.map(function(d) { return d.rr; });
    var rrTfV = data.map(function(d) { return d.rr + d.tf; });
    var rrTfNrV = data.map(function(d) { return d.rr + d.tf + d.nr; });
    var rrTfNrLV = data.map(function(d) { return d.rr + d.tf + d.nr + d.lira; });
    var totV = data.map(function(d) { return d.tot; });
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) { var yy = PT + CH - CH * g / 4; svg += '<line x1="' + P + '" x2="' + (W - PR) + '" y1="' + yy + '" y2="' + yy + '" stroke="#E8E0D4" stroke-width="0.5"/><text x="' + (P - 5) + '" y="' + (yy + 3) + '" text-anchor="end" font-size="9" fill="#aaa" font-family="monospace">' + Math.round(maxV * g / 4 / 1000) + 'K</text>'; }
    svg += '<polygon points="' + stackPts(totV, rrTfNrLV) + '" fill="rgba(70,128,192,0.3)"/>';
    svg += '<polygon points="' + stackPts(rrTfNrLV, rrTfNrV) + '" fill="rgba(70,128,192,0.3)"/>';
    svg += '<polygon points="' + stackPts(rrTfNrV, rrTfV) + '" fill="rgba(184,152,48,0.38)"/>';
    svg += '<polygon points="' + stackPts(rrTfV, rrV) + '" fill="rgba(42,140,70,0.38)"/>';
    svg += '<polygon points="' + pts(rrV) + ' ' + P + ',' + (PT + CH) + '" fill="rgba(196,154,26,0.45)"/>';
    svg += '<polyline points="' + pts(totV) + '" fill="none" stroke="var(--g)" stroke-width="2" stroke-linejoin="round"/>';
    var ri = ages.indexOf(D.retAge);
    if (ri >= 0) svg += '<line x1="' + sx(ri) + '" x2="' + sx(ri) + '" y1="' + PT + '" y2="' + (PT + CH) + '" stroke="var(--g)" stroke-dasharray="4,3" stroke-width="1.5"/><text x="' + (sx(ri) + 4) + '" y="' + (PT + 11) + '" font-size="9" fill="var(--g)" font-weight="700" font-family="DM Sans,sans-serif">' + t("Retraite", "Ret.") + '</text>';
    ages.forEach(function(a, i) { if (i % 10 === 0 || a === D.retAge || a === D.deathAge) svg += '<text x="' + sx(i) + '" y="' + (H - 4) + '" text-anchor="middle" font-size="8" fill="#aaa" font-family="monospace">' + a + '</text>'; });
    var legX = P + 4, legItems = [{ c: "rgba(196,154,26,0.55)", l: t("REER", "RRSP") }, { c: "rgba(42,140,70,0.45)", l: t("CELI", "TFSA") }, { c: "rgba(184,152,48,0.45)", l: t("NR", "NR") }, { c: "rgba(70,128,192,0.4)", l: t("CRI", "LIRA") }, { c: "rgba(70,128,192,0.4)", l: "DC/Corp" }];
    legItems.forEach(function(li) { svg += '<rect x="' + legX + '" y="5" width="10" height="10" fill="' + li.c + '" rx="2"/><text x="' + (legX + 13) + '" y="14" font-size="9" fill="#666" font-family="DM Sans,sans-serif">' + li.l + '</text>'; legX += li.l.length * 6 + 20; });
    svg += '</svg>';
    h += card(svg);
  })();
  h += aiSlot(ai.savings_context, t(
    "\u00c0 " + D.retAge + "\u00a0ans, votre portefeuille liquide m\u00e9dian serait de " + f$(D.rMedF) + " en dollars d\u2019aujourd\u2019hui. Votre taux d\u2019\u00e9pargne actuel de " + D.savingsRate + "\u00a0% alimente cette trajectoire. " + (D.autonomyYears > 0 ? "Ce capital pourrait couvrir environ " + D.autonomyYears + "\u00a0ann\u00e9es de d\u00e9caissement avant l\u2019arr\u00eat complet des retraits." : ""),
    "At " + D.retAge + ", your median liquid portfolio in today\u2019s dollars would be " + f$(D.rMedF) + ". Your current savings rate of " + D.savingsRate + "\u00a0% supports this trajectory. " + (D.autonomyYears > 0 ? "This capital could cover approximately " + D.autonomyYears + "\u00a0years of withdrawals before full depletion." : "")
  ));
  h += obs(t("Votre position relative (StatCan ESF 2023)", "Your relative position (StatCan SFS 2023)"),
    (totalRegSav > bSav.q3 ? t("\u00c9pargne enregistr\u00e9e au-dessus du 75e percentile", "Registered savings above 75th percentile") :
     totalRegSav > bSav.q2 ? t("\u00c9pargne enregistr\u00e9e au-dessus de la m\u00e9diane", "Registered savings above median") :
     t("\u00c9pargne enregistr\u00e9e sous la m\u00e9diane \u2014 m\u00e9diane de r\u00e9f\u00e9rence", "Registered savings below median \u2014 reference median") + ": " + f$(bSav.q2))
    + " \u00b7 " + t("Taux d'\u00e9pargne", "Savings rate") + ": " + savRate + "% ("
    + (savRate > bRate.q3 ? t("quartile sup\u00e9rieur", "top quartile") : savRate > bRate.q2 ? t("au-dessus m\u00e9diane", "above median") : t("\u00e0 renforcer", "needs strengthening")) + ")"
    + (bMul ? " \u00b7 " + t("Multiple de revenu", "Income multiple") + ": " + bMul.actual.toFixed(1) + "\u00d7 " + t("vs cible", "vs target") + " " + bMul.target + "\u00d7" : ""),
    "info");
  h += secEnd();

  // ═══ S4: Retirement Income ═══
  h += secH(nextSecInter(), t("Revenus \u00e0 la retraite", "Retirement income"), t("Sources et couverture", "Sources and coverage"));
  h += bridge(
    "Ce patrimoine projet\u00e9 de " + f$(D.retBal) + " devra couvrir l'\u00e9cart entre vos revenus gouvernementaux et votre cible de " + f$(D.retSpM) + "/mois.",
    "This projected wealth of " + f$(D.retBal) + " will need to cover the gap between government income and your target of " + f$(D.retSpM) + "/mo."
  );
  (function() {
    var qppMo = D.qppMonthly, oasMo = D.oasMonthly, penM = D.dbPensionMonthly, savM = D.gapMonthly;
    var total = Math.max(1, qppMo + oasMo + penM + savM);
    var items = [{ v: qppMo, c: "#2A8C46", l: isQC ? "RRQ" : t("RPC", "CPP") }, { v: oasMo, c: "#4680C0", l: t("PSV", "OAS") }, { v: penM, c: "#4680C0", l: t("Pension PD", "DB Pension") }, { v: savM, c: "#c49a1a", l: t("\u00c9pargne", "Savings") }].filter(function(i) { return i.v > 0; });
    var W2 = 180, H2 = 180, R = 72, cx = W2 / 2, cy = H2 / 2;
    var svg = '<svg viewBox="0 0 ' + W2 + ' ' + H2 + '" style="width:150px;height:150px;flex-shrink:0">';
    var sa = -Math.PI / 2;
    items.forEach(function(item) {
      var sw = item.v / total * 2 * Math.PI;
      var x1 = cx + R * Math.cos(sa), y1 = cy + R * Math.sin(sa), x2 = cx + R * Math.cos(sa + sw), y2 = cy + R * Math.sin(sa + sw);
      svg += '<path d="M' + cx + ',' + cy + ' L' + x1 + ',' + y1 + ' A' + R + ',' + R + ' 0 ' + (sw > Math.PI ? 1 : 0) + ',1 ' + x2 + ',' + y2 + ' Z" fill="' + item.c + '"/>';
      sa += sw;
    });
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="44" fill="#FEFCF9"/>';
    svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="9" fill="var(--ts)" font-family="DM Sans,sans-serif">Total</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 8) + '" text-anchor="middle" font-size="13" font-weight="800" fill="var(--g)" font-family="DM Sans,sans-serif">' + f$(D.retSpM) + '</text>';
    svg += '<text x="' + cx + '" y="' + (cy + 20) + '" text-anchor="middle" font-size="8" fill="var(--tm)" font-family="DM Sans,sans-serif">' + t("/mois", "/mo") + '</text>';
    svg += '</svg>';
    h += card('<div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap" class="rpt-donut">'
      + svg
      + '<div style="flex:1;min-width:160px">'
      + (items.length === 0 ? '<div style="font-size:12px;color:var(--tm);padding:10px 0;font-style:italic">' + t("Aucune source de revenu projet\u00e9e \u00e0 cet \u00e2ge", "No projected income sources at this age") + '</div>'
        : items.map(function(item) { return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--bdl)">'
        + '<div style="width:12px;height:12px;border-radius:3px;background:' + item.c + ';flex-shrink:0"></div>'
        + '<span style="font-size:12px;flex:1;color:var(--ts)">' + item.l + '</span>'
        + '<span style="font-family:var(--mono);font-size:13px;font-weight:700">' + f$(item.v) + t("/mois", "/mo") + '</span>'
        + '<span style="font-size:11px;color:var(--tm)">(' + Math.round(item.v / total * 100) + '%)</span></div>'; }).join(""))
      + (D.gapMonthly > 0 ? '<div style="margin-top:10px;padding:10px 12px;background:var(--ambg);border-radius:7px;font-size:12px;color:var(--am)"><strong>' + t("D\u00e9ficit \u00e0 financer :", "Gap to fund:") + '</strong> ' + f$(D.gapMonthly) + t("/mois", "/mo") + ' \u2014 ' + D.withdrawalRatePct + '% ' + t("du portefeuille", "of portfolio") + '</div>' : '')
      + '</div></div>');
  })();
  // PSV clawback context note (P2-1)
  if (D.oasMonthly > 0 && D.oasMonthly < 668) {
    h += '<div style="margin-top:8px;padding:10px 12px;background:var(--ambg);border-radius:8px;font-size:12px;color:var(--am);line-height:1.6">'
      + t("PSV partielle \u2014 les revenus de retraite projet\u00e9s pourraient d\u00e9passer le seuil de r\u00e9cup\u00e9ration (~95 323 $/an en 2026), r\u00e9duisant la prestation de base.", "Partial OAS \u2014 projected retirement income may exceed the clawback threshold (~$95,323/yr in 2026), reducing the base benefit.")
      + '</div>';
  }
  h += aiSlot(ai.income_mix, t(
    "Vos revenus gouvernementaux (" + (isQC ? "RRQ" : "RPC") + " + " + t("PSV", "OAS") + ") pourraient couvrir " + D.coveragePct + "\u00a0% de votre budget de retraite cible de " + f$(D.retSpM) + "/mois. " + (D.gapMonthly > 0 ? "Un d\u00e9ficit mensuel de " + f$(D.gapMonthly) + " serait \u00e0 couvrir par votre \u00e9pargne personnelle." : "Vos revenus gouvernementaux couvrent l\u2019ensemble de votre budget cible."),
    "Your government income (" + (isQC ? "QPP" : "CPP") + " + OAS) could cover " + D.coveragePct + "\u00a0% of your target retirement budget of " + f$(D.retSpM) + "/mo. " + (D.gapMonthly > 0 ? "A monthly gap of " + f$(D.gapMonthly) + " would need to be funded from your personal savings." : "Your government income covers your full target budget.")
  ));
  h += secEnd();

  // ═══ S5: Tax Anatomy ═══
  h += secH(nextSecInter(), t("Anatomie fiscale", "Tax anatomy"), t("Taux effectifs et strat\u00e9gie", "Effective rates and strategy"));
  h += bridge(
    "La composition de vos revenus \u00e0 la retraite d\u00e9termine votre taux effectif futur \u2014 l'\u00e9cart avec aujourd'hui repr\u00e9sente un levier potentiel.",
    "The composition of your retirement income determines your future effective rate \u2014 the gap with today represents a potential lever."
  );
  h += '<div class="co cogn">' + t("L\u2019\u00e9cart entre votre taux actuel et votre taux pr\u00e9vu \u00e0 la retraite d\u00e9termine vos leviers d\u2019optimisation fiscale.", "The gap between your current rate and your projected rate at retirement determines your tax optimization levers.") + '</div>';
  h += card(
    kvr(t("Taux effectif actuel (travail)", "Current effective rate (work)"), fPct(D.taxCurrentEffective))
    + kvr(t("Taux effectif estim\u00e9 (retraite)", "Est. effective rate (retirement)"), fPct(D.taxRetirementEffective))
    + kvr(t("Taux marginal actuel", "Current marginal rate"), fPct(D.taxCurrentMarginal))
    + kvr(t("\u00c9conomie fiscale estim\u00e9e \u00e0 la retraite", "Est. tax savings at retirement"), f$(Math.round(D.retSpM * 12 * Math.max(0, (D.taxCurrentEffective - D.taxRetirementEffective) / 100))))
    + kvr(t("Co\u00fbt cumulatif MER estim\u00e9", "Est. cumulative MER cost"), f$(D.feeCostLifetime))
  );
  h += aiSlot(ai.tax_context, t(
    "Votre taux effectif actuel de " + Math.round(D.taxCurrentEffective) + "\u00a0% pourrait changer \u00e0 " + Math.round(D.taxRetirementEffective) + "\u00a0% \u00e0 la retraite, soit une \u00e9conomie annuelle estim\u00e9e de " + f$(D.taxDiffPerYear) + ". " + (D.taxCurrentMarginal > 40 ? "Votre taux marginal actuel sugg\u00e8re un avantage potentiel \u00e0 maximiser le REER pendant les ann\u00e9es actives." : "Le contexte fiscal de votre retraite serait proche de votre situation actuelle."),
    "Your current effective rate of " + Math.round(D.taxCurrentEffective) + "\u00a0% could shift to " + Math.round(D.taxRetirementEffective) + "\u00a0% in retirement, for an estimated annual saving of " + f$(D.taxDiffPerYear) + ". " + (D.taxCurrentMarginal > 40 ? "Your current marginal rate suggests a potential advantage to maximizing RRSP during working years." : "Your retirement tax context would be close to your current situation.")
  ));
  h += secEnd();

  // ═══ S6: Wealth Longevity ═══
  var nS = (D.nSim || 5000).toLocaleString(fr ? "fr-CA" : "en-CA");
  h += secH(nextSecInter(), t("Long\u00e9vit\u00e9 du patrimoine", "Wealth longevity"), t("Distribution des " + nS + " sc\u00e9narios", "Distribution of " + nS + " scenarios"));
  h += bridge(
    "Au-del\u00e0 des taux effectifs, la dur\u00e9e de la retraite est le facteur qui teste le plus s\u00e9v\u00e8rement la robustesse du plan \u2014 voici les " + nS + "\u00a0sc\u00e9narios.",
    "Beyond effective rates, the length of retirement most severely tests plan robustness \u2014 here are the " + nS + "\u00a0scenarios."
  );
  h += '<div class="co cogn">' + t("Chaque courbe repr\u00e9sente un percentile de l\u2019ensemble des sc\u00e9narios simul\u00e9s pour votre profil. La zone ombrée couvre l\u2019\u00e9ventail entre les sc\u00e9narios pessimistes (P5) et optimistes (P95).", "Each curve represents a percentile of all simulated scenarios for your profile. The shaded area covers the range from pessimistic (P5) to optimistic (P95) outcomes.") + '</div>';
  (function() {
    // Full-life fan chart using mc.pD rows (age D.age → D.deathAge)
    var pData = (D.pD && D.pD.length > 1) ? D.pD : (function() {
      var a2s = []; for (var a2 = D.retAge; a2 <= D.deathAge; a2++) a2s.push(a2);
      var n2 = a2s.length, s2 = D.retBal || 0;
      var cv = function(ev) { return a2s.map(function(_, i) { var tt = i / Math.max(1, n2-1), k = tt*tt*(3-2*tt); return Math.max(0, s2 + (ev - s2) * k); }); };
      var r95=cv(D.rP95F), r75=cv(D.rP75F), r50=cv(D.rMedF), r25=cv(D.rP25F), r5=cv(D.rP5F);
      return a2s.map(function(a, i) { return { age: a, rp5: r5[i], rp25: r25[i], rp50: r50[i], rp75: r75[i], rp95: r95[i] }; });
    })();
    var W = 740, H = 370, ml = 58, mr = 42, mt = 22, mb = 52;
    var cw = W - ml - mr, ch = H - mt - mb;
    var yMax = 0;
    pData.forEach(function(d) { yMax = Math.max(yMax, d.rp95 || 0, d.rp75 || 0); });
    yMax = Math.ceil(yMax * 1.08 / 100000) * 100000 || 100000;
    function xP(i) { return ml + i / Math.max(1, pData.length - 1) * cw; }
    function yP(v) { return mt + ch - Math.max(0, Math.min(v, yMax)) / yMax * ch; }
    function mkLine(k) { return pData.map(function(d, i) { return (i === 0 ? "M" : "L") + xP(i).toFixed(1) + "," + yP(d[k] || 0).toFixed(1); }).join(""); }
    function mkArea(k) { return mkLine(k) + "L" + xP(pData.length-1).toFixed(1) + "," + yP(0).toFixed(1) + "L" + xP(0).toFixed(1) + "," + yP(0).toFixed(1) + "Z"; }
    var svg3 = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto;display:block">';
    for (var g = 0; g <= 5; g++) {
      var gy = mt + g/5*ch, gv = yMax * (1 - g/5);
      svg3 += '<line x1="' + ml + '" y1="' + gy + '" x2="' + (W-mr) + '" y2="' + gy + '" stroke="#555" stroke-dasharray="3,3" opacity="0.15"/>';
      svg3 += '<text x="' + (ml-8) + '" y="' + (gy+4) + '" text-anchor="end" font-size="11" fill="#888" font-family="monospace">' + (gv >= 1000000 ? (gv/1000000).toFixed(1)+'M' : Math.round(gv/1000)+'K') + '</text>';
    }
    svg3 += '<path d="' + mkArea("rp95") + '" fill="var(--bl)" fill-opacity="0.06"/>';
    svg3 += '<path d="' + mkArea("rp75") + '" fill="var(--bl)" fill-opacity="0.08"/>';
    svg3 += '<path d="' + mkArea("rp50") + '" fill="var(--bl)" fill-opacity="0.10"/>';
    svg3 += '<path d="' + mkArea("rp25") + '" fill="var(--am)" fill-opacity="0.08"/>';
    svg3 += '<path d="' + mkArea("rp5")  + '" fill="var(--rd)" fill-opacity="0.07"/>';
    svg3 += '<path d="' + mkLine("rp95") + '" fill="none" stroke="var(--bl)" stroke-width="1" opacity="0.35"/>';
    svg3 += '<path d="' + mkLine("rp75") + '" fill="none" stroke="var(--bl)" stroke-width="1" opacity="0.45"/>';
    svg3 += '<path d="' + mkLine("rp25") + '" fill="none" stroke="var(--am)" stroke-width="1" opacity="0.5"/>';
    svg3 += '<path d="' + mkLine("rp5")  + '" fill="none" stroke="var(--rd)" stroke-width="1" opacity="0.5"/>';
    svg3 += '<path d="' + mkLine("rp50") + '" fill="none" stroke="var(--bl)" stroke-width="2.5"/>';
    var retIdx2 = -1;
    for (var ri2 = 0; ri2 < pData.length; ri2++) { if (pData[ri2].age >= D.retAge) { retIdx2 = ri2; break; } }
    if (retIdx2 >= 0) {
      var rx2 = xP(retIdx2);
      svg3 += '<line x1="' + rx2 + '" y1="' + mt + '" x2="' + rx2 + '" y2="' + (mt+ch) + '" stroke="var(--gd)" stroke-dasharray="6,3" stroke-width="1.5"/>';
      svg3 += '<circle cx="' + rx2 + '" cy="' + yP(pData[retIdx2].rp50||0) + '" r="4" fill="var(--bl)" stroke="#fff" stroke-width="1.5"/>';
      svg3 += '<text x="' + rx2 + '" y="' + (mt-6) + '" text-anchor="middle" font-size="10" font-weight="700" fill="var(--gd)">' + t("Retraite", "Retirement") + '</text>';
    }
    var li2 = pData.length - 1, lx2 = xP(li2) + 5, prevY2 = -999;
    [["rp95","P95","var(--bl)"],["rp75","P75","var(--bl)"],["rp50","P50","var(--bl)"],["rp25","P25","var(--am)"],["rp5","P5","var(--rd)"]].forEach(function(lb) {
      var ly2 = yP(pData[li2][lb[0]] || 0);
      if (Math.abs(ly2 - prevY2) < 12) ly2 = prevY2 + 12;
      svg3 += '<text x="' + lx2 + '" y="' + (ly2+3) + '" font-size="9" font-weight="600" fill="' + lb[2] + '" opacity="0.7">' + lb[1] + '</text>';
      prevY2 = ly2;
    });
    svg3 += '<line x1="' + ml + '" x2="' + (W-mr) + '" y1="' + (mt+ch) + '" y2="' + (mt+ch) + '" stroke="var(--tm)" opacity="0.3"/>';
    var step2 = Math.max(1, Math.round(pData.length / 9));
    for (var xi2 = 0; xi2 < pData.length; xi2 += step2)
      svg3 += '<text x="' + xP(xi2) + '" y="' + (mt+ch+18) + '" text-anchor="middle" font-size="11" fill="#888" font-family="monospace">' + pData[xi2].age + '</text>';
    if ((pData.length-1) % step2 > 1)
      svg3 += '<text x="' + xP(pData.length-1) + '" y="' + (mt+ch+18) + '" text-anchor="middle" font-size="11" fill="#888" font-family="monospace">' + pData[pData.length-1].age + '</text>';
    var lyLeg = H - 8;
    svg3 += '<line x1="' + ml + '" x2="' + (ml+18) + '" y1="' + lyLeg + '" y2="' + lyLeg + '" stroke="var(--bl)" stroke-width="2.5"/>';
    svg3 += '<text x="' + (ml+22) + '" y="' + (lyLeg+3) + '" font-size="10" fill="#888" font-family="monospace">' + t("M\u00e9diane (P50)", "Median (P50)") + '</text>';
    svg3 += '<text x="' + (ml+130) + '" y="' + (lyLeg+3) + '" font-size="10" fill="var(--bl)" opacity="0.7" font-family="monospace">P75/P95</text>';
    svg3 += '<text x="' + (ml+200) + '" y="' + (lyLeg+3) + '" font-size="10" fill="var(--am)" opacity="0.7" font-family="monospace">P25</text>';
    svg3 += '<text x="' + (ml+240) + '" y="' + (lyLeg+3) + '" font-size="10" fill="var(--rd)" opacity="0.7" font-family="monospace">P5</text>';
    svg3 += '</svg>';
    h += card(svg3);

    // Stress cards
    var stress = [
      { icon: "\ud83d\udcc9", t2: t("Krach 2008", "2008 Crash"), d2: t("\u221238% actions, reprise 5 ans", "\u221238% equity, 5yr recovery"), delta: -Math.round(D.successPct * 0.10) },
      { icon: "\ud83d\udcc8", t2: t("Inflation 70s", "70s Inflation"), d2: t("+3% inflation pendant 7 ans", "+3% inflation for 7 years"), delta: -Math.round(D.successPct * 0.12) },
      { icon: "\ud83c\udf82", t2: t("Long\u00e9vit\u00e9 +5 ans", "Longevity +5 yrs"), d2: t("Esp\u00e9rance de vie +5 ans vs CPM", "Life expectancy +5 yrs vs CPM"), delta: -Math.round(D.successPct * 0.09) }
    ];
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px" class="rpt-grid3">';
    stress.forEach(function(s) {
      h += '<div style="background:var(--rdbg);border:1px solid rgba(204,68,68,.15);border-radius:10px;padding:14px">'
        + '<div style="font-size:18px;margin-bottom:6px">' + s.icon + '</div>'
        + '<div style="font-size:12px;font-weight:700;margin-bottom:4px">' + s.t2 + '</div>'
        + '<div style="font-size:11px;color:var(--ts);line-height:1.5;margin-bottom:8px">' + s.d2 + '</div>'
        + '<div style="font-family:var(--mono);font-size:16px;font-weight:800;color:var(--rd)">' + s.delta + '%</div></div>';
    });
    h += '</div>';
    h += '<div style="font-size:10px;color:var(--tm);font-style:italic;margin:-8px 0 12px;padding-left:2px">' + t("Estimations basées sur des coefficients historiques, pas des simulations additionnelles.", "Estimates based on historical coefficients, not additional simulations.") + '</div>';
  })();
  h += aiSlot(ai.longevity_risk, t(
    "Dans le sc\u00e9nario m\u00e9dian (P50), votre portefeuille atteindrait " + f$(D.rMedF) + " \u00e0 la retraite. L\u2019\u00e9cart entre le P25 (" + f$(D.rP25F) + ") et le P75 (" + f$(D.rP75F) + ") illustre la variabilit\u00e9 inh\u00e9rente aux marchés sur " + (D.retAge - D.age) + "\u00a0ans d\u2019accumulation. Dans " + Math.round((1 - (D.successPct / 100)) * 100) + "\u00a0% des sc\u00e9narios, l\u2019\u00e9pargne pourrait s\u2019\u00e9puiser avant la fin de la retraite.",
    "In the median scenario (P50), your portfolio could reach " + f$(D.rMedF) + " at retirement. The spread between P25 (" + f$(D.rP25F) + ") and P75 (" + f$(D.rP75F) + ") reflects inherent market variability over " + (D.retAge - D.age) + "\u00a0years of accumulation. In " + Math.round((1 - (D.successPct / 100)) * 100) + "\u00a0% of scenarios, savings could be depleted before the end of retirement."
  ));

  // SoR Thermometer
  (function() {
    var wdPct2 = D.withdrawalRatePct || 0;
    var eqPct2 = (params.allocR || 0.7) * 100;
    var yrsToRet2 = Math.max(1, D.retAge - D.age);
    var wdRisk = Math.min(100, wdPct2 / 8 * 100);
    var eqRisk = Math.min(100, (eqPct2 - 30) / 70 * 100);
    var timeRisk = Math.min(100, (1 - Math.min(yrsToRet2, 30) / 30) * 100);
    var seqScore = Math.round(wdRisk * 0.45 + eqRisk * 0.30 + timeRisk * 0.25);
    // Override: extreme withdrawal rate always = Élevé
    if (wdPct2 > 20) seqScore = Math.max(seqScore, 70);
    var seqLevel = seqScore >= 70 ? { l: t("\u00c9lev\u00e9", "High"), c: "var(--rd)", bg: "var(--rdbg)" }
      : seqScore >= 40 ? { l: t("Mod\u00e9r\u00e9", "Moderate"), c: "var(--am)", bg: "var(--ambg)" }
      : { l: t("Faible", "Low"), c: "var(--gn)", bg: "var(--gnbg)" };
    var thermH = 180, thermW = 60, bulbR = 22, stemW = 14, stemH = 130;
    var fillPct = seqScore / 100;
    var stemFillH = Math.round(stemH * fillPct);
    var stemTop = thermH - bulbR * 2 - stemFillH - 6;
    var thermoSvg = '<svg viewBox="0 0 ' + thermW + ' ' + thermH + '" style="width:52px;height:auto;flex-shrink:0">'
      + '<rect x="' + (thermW / 2 - stemW / 2) + '" y="6" width="' + stemW + '" height="' + (stemH - 4) + '" rx="' + (stemW / 2) + '" fill="#EEE8E0"/>'
      + '<rect x="' + (thermW / 2 - stemW / 2) + '" y="' + stemTop + '" width="' + stemW + '" height="' + stemFillH + '" rx="0" fill="' + seqLevel.c + '"/>'
      + '<circle cx="' + (thermW / 2) + '" cy="' + (thermH - bulbR - 2) + '" r="' + bulbR + '" fill="#EEE8E0"/>'
      + '<circle cx="' + (thermW / 2) + '" cy="' + (thermH - bulbR - 2) + '" r="' + (bulbR - 4) + '" fill="' + seqLevel.c + '"/>'
      + [0, 25, 50, 75, 100].map(function(tick) {
        var ty = 6 + (1 - tick / 100) * (stemH - 4);
        return '<line x1="' + (thermW / 2 + stemW / 2 - 1) + '" x2="' + (thermW / 2 + stemW / 2 + 5) + '" y1="' + ty + '" y2="' + ty + '" stroke="#AAA" stroke-width="0.8"/>'
          + '<text x="' + (thermW / 2 + stemW / 2 + 7) + '" y="' + (ty + 3) + '" font-size="7" fill="#AAA" font-family="monospace">' + tick + '</text>';
      }).join("")
      + '</svg>';
    h += card(
      '<div style="font-size:13px;font-weight:700;margin-bottom:14px">' + t("Thermom\u00e8tre \u2014 Risque de s\u00e9quence de rendements", "Thermometer \u2014 Sequence-of-returns risk") + '</div>'
      + '<div style="display:flex;gap:20px;align-items:center">'
      + thermoSvg
      + '<div style="flex:1">'
      + '<div style="font-size:32px;font-weight:900;color:' + seqLevel.c + ';font-family:var(--mono);margin-bottom:4px">' + seqScore + '<span style="font-size:14px">/100</span></div>'
      + '<div style="display:inline-block;padding:3px 12px;border-radius:20px;background:' + seqLevel.bg + ';color:' + seqLevel.c + ';font-size:12px;font-weight:700;margin-bottom:12px">' + seqLevel.l + '</div>'
      + '<div style="font-size:12px;color:var(--ts);line-height:1.7;margin-bottom:12px">'
      + t("Le risque de s\u00e9quence survient quand de mauvais rendements tombent en d\u00e9but de retraite, for\u00e7ant des retraits sur un capital en baisse. L'impact est asym\u00e9trique \u2014 les premi\u00e8res ann\u00e9es comptent davantage.", "Sequence-of-returns risk occurs when poor returns hit early in retirement, forcing withdrawals from a declining portfolio. The impact is asymmetric \u2014 early years matter most.")
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px" class="rpt-grid3">'
      + [
        { l: t("Taux de retrait", "Withdrawal rate"), v: fPct(wdPct2), sub: t("Cible < 4%", "Target < 4%"), c: wdPct2 < 4 ? "var(--gn)" : wdPct2 < 6 ? "var(--am)" : "var(--rd)" },
        { l: t("Part en actions", "Equity exposure"), v: Math.round(eqPct2) + "%", sub: t("\u00c0 la retraite", "At retirement"), c: eqPct2 < 70 ? "var(--gn)" : eqPct2 < 85 ? "var(--am)" : "var(--rd)" },
        { l: t("Ans avant retraite", "Years to retirement"), v: yrsToRet2, sub: t("Temps de r\u00e9cup\u00e9ration", "Recovery time"), c: yrsToRet2 >= 15 ? "var(--gn)" : yrsToRet2 >= 8 ? "var(--am)" : "var(--rd)" }
      ].map(function(cc) {
        return '<div style="background:var(--bgc);border:1px solid var(--bd);border-radius:8px;padding:10px;text-align:center">'
          + '<div style="font-size:11px;color:var(--tm);margin-bottom:4px">' + cc.l + '</div>'
          + '<div style="font-size:18px;font-weight:800;color:' + cc.c + ';font-family:var(--mono)">' + cc.v + '</div>'
          + '<div style="font-size:10px;color:var(--tm);margin-top:2px">' + cc.sub + '</div></div>';
      }).join("")
      + '</div>'
      + (seqScore >= 40 ? (function() {
        var bufferStrats = [];
        if (wdPct2 > 6) bufferStrats.push(t("r\u00e9duire le taux de retrait initial", "reduce initial withdrawal rate"));
        if (eqPct2 > 70) bufferStrats.push(t("glide path vers " + Math.round(Math.max(50, eqPct2 - 20)) + "% actions \u00e0 la retraite", "glide path to " + Math.round(Math.max(50, eqPct2 - 20)) + "% equity at retirement"));
        else bufferStrats.push(t("maintenir la r\u00e9partition actuelle de " + Math.round(eqPct2) + "% actions", "maintain current " + Math.round(eqPct2) + "% equity allocation"));
        bufferStrats.push(t("constituer un coussin de 2 ans en liquidit\u00e9s", "build a 2-year cash buffer"));
        return '<div style="margin-top:12px;padding:10px 12px;background:var(--ambg);border-radius:8px;font-size:12px;color:var(--am);font-weight:600">'
          + t("Strat\u00e9gies : ", "Strategies: ") + bufferStrats.join(", ") + '.</div>';
      })() : '')
      + (ai.sequence_risk ? aiSlot(ai.sequence_risk) : "")
      + '</div></div>'
    );
    // SoR high + strong grade context note (P2-4)
    if (seqScore > 60 && D.successPct >= 85) {
      h += '<div style="padding:10px 12px;background:var(--gbg);border-radius:8px;font-size:12px;color:var(--g);line-height:1.6;margin-top:12px">'
        + t("Malgr\u00e9 un risque de s\u00e9quence \u00e9lev\u00e9, votre horizon et vos revenus diversifi\u00e9s offrent une r\u00e9silience suffisante dans la majorit\u00e9 des sc\u00e9narios.", "Despite elevated sequence risk, your time horizon and diversified income provide sufficient resilience in the majority of scenarios.")
        + '</div>';
    }
  })();
  // Withdrawal rate vs grade context note (P2-3)
  if (D.withdrawalRatePct > 4 && D.successPct >= 65) {
    h += '<div style="padding:10px 12px;background:var(--ambg);border-radius:8px;font-size:12px;color:var(--am);line-height:1.6;margin-bottom:12px">'
      + t("Le taux de retrait initial est \u00e9lev\u00e9 (" + fPct(D.withdrawalRatePct) + "), mais la croissance projet\u00e9e du portefeuille et les revenus gouvernementaux compensent ce risque dans la majorit\u00e9 des sc\u00e9narios.", "The initial withdrawal rate is elevated (" + fPct(D.withdrawalRatePct) + "), but projected portfolio growth and government income offset this risk in the majority of scenarios.")
      + '</div>';
  }
  h += secEnd();

  // ═══ S7: Observations ═══
  h += secH(nextSecInter(), t("Observations personnalis\u00e9es", "Personalized observations"), t("5 analyses adapt\u00e9es \u00e0 votre profil", "5 analyses adapted to your profile"));
  (function() {
    var wL = (params._quiz || {}).worries || [];
    var worryNamesMap = {
      runout: fr ? "la long\u00e9vit\u00e9" : "longevity",
      health: fr ? "les co\u00fbts de sant\u00e9" : "health costs",
      market: fr ? "la volatilit\u00e9 des march\u00e9s" : "market volatility",
      inflation: fr ? "l'inflation" : "inflation",
      tax: fr ? "les imp\u00f4ts" : "taxes",
      legacy: fr ? "la succession" : "estate"
    };
    var worryPhrase = wL.length > 0
      ? (fr ? " et de vos pr\u00e9occupations (\u00a0" + wL.map(function(w) { return worryNamesMap[w] || w; }).join(", ") + "\u00a0)"
            : " and your focus areas (\u00a0" + wL.map(function(w) { return worryNamesMap[w] || w; }).join(", ") + "\u00a0)")
      : "";
    h += '<div class="co cogn">'
      + t(
          "Ces observations ont \u00e9t\u00e9 s\u00e9lectionn\u00e9es en fonction de votre profil sp\u00e9cifique" + worryPhrase + ". La premi\u00e8re repr\u00e9sente votre levier principal, class\u00e9 par impact financier estim\u00e9.",
          "These observations were selected based on your specific profile" + worryPhrase + ". The first represents your primary lever, ranked by estimated financial impact."
        )
      + '</div>';
  })();
  var oL = obsLabels || {};
  var nSimFmt = (D.nSim || 5000).toLocaleString(fr ? "fr-CA" : "en-CA");
  var obsMap = [{ k: "obs_1", ty: "insight", tl: t("Levier principal", "Primary lever") }, { k: "obs_2", ty: "info", tl: oL.obs_2 || t("Couverture gouvernementale", "Government coverage") }, { k: "obs_3", ty: "watch", tl: oL.obs_3 || t("Impact des frais", "Fee impact") }, { k: "obs_4", ty: "info", tl: oL.obs_4 || t("Analyse contextuelle", "Contextual analysis") }, { k: "obs_5", ty: "watch", tl: oL.obs_5 || t("Risque et long\u00e9vit\u00e9", "Risk & longevity") }];
  // Topic-keyed fallback bodies — match dynamically routed obs labels (B1 fix)
  var topicFall = {
    "gov-coverage": fr ? "" + gP + " et " + oN + " couvrent " + D.coveragePct + "% de votre revenu cible." : gP + " and " + oN + " cover " + D.coveragePct + "% of your target income.",
    "fee-impact": fr ? "Les frais de gestion estim\u00e9s repr\u00e9sentent " + f$(D.feeCostLifetime) + " sur votre horizon." : "Estimated management fees represent " + f$(D.feeCostLifetime) + " over your horizon.",
    "debt-drag": fr ? "Le co\u00fbt annuel de vos dettes r\u00e9duit votre capacit\u00e9 d'\u00e9pargne et retarde l'accumulation patrimoniale." : "The annual cost of your debts reduces your savings capacity and delays wealth accumulation.",
    "bridge-period": fr ? "La p\u00e9riode entre votre retraite et le d\u00e9but des revenus gouvernementaux n\u00e9cessite une autosuffisance financi\u00e8re." : "The period between retirement and government income start requires financial self-sufficiency.",
    "couple-asymmetry": fr ? "L'\u00e9cart de revenus et d'\u00e2ge de retraite entre les conjoints influence la transition vers la retraite." : "The income and retirement age gap between partners affects the retirement transition.",
    "withdrawal-stress": fr ? "Le taux de retrait initial (" + fPct(D.withdrawalRatePct) + ") d\u00e9passe le rendement esp\u00e9r\u00e9 du portefeuille." : "The initial withdrawal rate (" + fPct(D.withdrawalRatePct) + ") exceeds the expected portfolio return.",
    "mortgage-retirement": fr ? "L'hypoth\u00e8que se prolonge au-del\u00e0 de la retraite, ajoutant une charge fixe au budget." : "The mortgage extends past retirement, adding a fixed charge to the budget.",
    "biz-extract": fr ? "La fen\u00eatre d'extraction corporative influence le choix entre dividendes et salaire." : "The corporate extraction window affects the dividend vs salary decision.",
    "estate-structure": fr ? "La r\u00e9partition entre comptes enregistr\u00e9s et non enregistr\u00e9s d\u00e9termine l'impact fiscal au d\u00e9c\u00e8s." : "The split between registered and non-registered accounts determines the tax impact at death.",
    "tax-bracket-shift": fr ? "Le taux d'imposition effectif change entre la p\u00e9riode de travail et la retraite." : "The effective tax rate changes between working years and retirement.",
    "risk-mismatch": fr ? "Le profil de risque choisi et les besoins de croissance du plan pr\u00e9sentent une tension." : "The chosen risk profile and the plan's growth needs present a tension.",
    "time-leverage": fr ? "L'horizon de " + (D.retAge - D.age) + " ans permet \u00e0 la capitalisation de multiplier chaque dollar \u00e9pargn\u00e9." : "The " + (D.retAge - D.age) + "-year horizon allows compounding to multiply each dollar saved.",
    "unique-insight": fr ? "Votre profil pr\u00e9sente une caract\u00e9ristique unique qui m\u00e9rite attention." : "Your profile presents a unique characteristic worth attention."
  };
  var obsFallByPos = {
    obs_1: fr ? "L'analyse identifie le levier le plus impactant pour am\u00e9liorer votre taux de succ\u00e8s." : "Analysis identifies the highest-impact lever for improving your success rate.",
    obs_2: topicFall["gov-coverage"],
    obs_3: topicFall["fee-impact"],
    obs_4: fr ? "Votre profil a \u00e9t\u00e9 int\u00e9gr\u00e9 dans les " + nSimFmt + " simulations Monte Carlo." : "Your profile was integrated into the " + nSimFmt + " Monte Carlo simulations.",
    obs_5: fr ? "Dans le sc\u00e9nario pessimiste (P5), le patrimoine estim\u00e9 serait de " + f$(D.rP5F) + " \u00e0 la retraite." : "In the pessimistic scenario (P5), estimated wealth would be " + f$(D.rP5F) + " at retirement."
  };
  obsMap.forEach(function(o) {
    var topic = oL[o.k + "_topic"];
    var body = ai[o.k] || (topic ? (topicFall[topic] || obsFallByPos[o.k]) : obsFallByPos[o.k]);
    // Build topic-keyed metric bullets
    var bullets = '';
    if (o.k === 'obs_1') {
      bullets = t("Taux de succ\u00e8s\u00a0: ", "Success rate: ") + '<strong>' + D.successPct + '%</strong>'
        + ' \u00a0\u00b7\u00a0 ' + t("Rendement minimum requis\u00a0: ", "Minimum required return: ") + '<strong>' + (D.minReturn || minReturn || 0) + '%</strong>';
    } else if (topic === 'gov-coverage') {
      bullets = t("Couverture\u00a0: ", "Coverage: ") + '<strong>' + fPct(D.coveragePct) + '</strong> ' + t("du revenu cible", "of target income")
        + ' \u00a0\u00b7\u00a0 ' + (isQC ? "RRQ" : "RPC") + '+PSV\u00a0: <strong>' + f$(D.govMonthly) + t('/mois', '/mo') + '</strong>';
    } else if (topic === 'fee-impact') {
      bullets = t("Co\u00fbt cumulatif estim\u00e9\u00a0: ", "Estimated cumulative cost: ") + '<strong>' + f$(D.feeCostLifetime) + '</strong>'
        + ' \u00a0\u00b7\u00a0 MER pond.\u00a0: <strong>' + (D.merWeighted * 100).toFixed(2) + '%</strong>';
    } else if (topic === 'withdrawal-stress') {
      bullets = t("Taux de retrait\u00a0: ", "Withdrawal rate: ") + '<strong>' + fPct(D.withdrawalRatePct) + '</strong>'
        + ' \u00a0\u00b7\u00a0 ' + t("Patrimoine \u00e0 la retraite\u00a0: ", "Wealth at retirement: ") + '<strong>' + f$(D.retBal) + '</strong>';
    } else if (topic === 'bridge-period') {
      var bridgeYrs = Math.max(0, Math.max(D.qppAge, D.oasAge) - D.retAge);
      if (bridgeYrs > 0) bullets = t("P\u00e9riode d\u2019autosuffisance\u00a0: ", "Self-reliance period: ") + '<strong>' + bridgeYrs + '\u00a0' + t('ans', 'yrs') + '</strong>';
    } else if (topic === 'mortgage-retirement') {
      var mortFreeAge = params._report && params._report.mortFreeAge;
      if (mortFreeAge && mortFreeAge > D.retAge) bullets = t("Hypoth\u00e8que active jusqu\u2019\u00e0\u00a0: ", "Mortgage active until: ") + '<strong>' + mortFreeAge + '\u00a0' + t('ans', 'yrs') + '</strong>'
        + ' \u00a0\u00b7\u00a0 ' + '<strong>' + (mortFreeAge - D.retAge) + '\u00a0' + t('ans', 'yrs') + '</strong> ' + t("apr\u00e8s la retraite", "after retirement");
    }
    h += obs(o.tl, body, o.ty, bullets || null);
  });
  h += secEnd();

  // ═══ S8: Priority Cascade ═══
  h += secH(nextSecInter(), t("Cascade de priorit\u00e9s", "Priority cascade"), t("Class\u00e9 par impact financier estim\u00e9", "Ranked by estimated financial impact"));
  h += bridge(
    "Ces observations alimentent la cascade suivante \u2014 les leviers sont class\u00e9s par impact potentiel sur votre taux de succ\u00e8s de\u00a0" + D.successPct + "\u00a0%.",
    "These observations feed the cascade below \u2014 levers ranked by potential impact on your " + D.successPct + "\u00a0% success rate."
  );
  h += '<div class="co cogn">' + t("La priorit\u00e9 est d\u00e9termin\u00e9e par le gain de points de succ\u00e8s le plus \u00e9lev\u00e9 par dollar d\u2019effort. Les leviers en haut de la liste auraient l\u2019impact le plus important sur votre taux de succ\u00e8s.", "Priority is determined by the highest success-rate gain per dollar of effort. The levers at the top of the list would have the greatest impact on your success rate.") + '</div>';

  // Cost of delay — hide when near retirement with high gov coverage (meaningless)
  if (costDelay > 0 && D.successPct < 85 && !(D.retAge - D.age <= 5 && D.coveragePct >= 90)) {
    var cdColor = costDelay > 50000 ? "var(--rd)" : costDelay > 20000 ? "var(--am)" : "var(--ts)";
    h += card(
      '<div style="display:flex;align-items:flex-start;gap:16px">'
      + '<div style="font-size:28px;flex-shrink:0">\u23f3</div>'
      + '<div style="flex:1">'
      + '<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">' + t("Co\u00fbt de l'inaction (1 an)", "Cost of waiting (1 year)") + '</div>'
      + '<div style="font-size:30px;font-weight:900;font-family:var(--mono);color:' + cdColor + ';margin-bottom:8px">' + f$(costDelay) + '</div>'
      + '<div style="font-size:13px;color:var(--ts);line-height:1.75;margin-bottom:10px">' + t(
        "Si vous attendez un an de plus avant de commencer \u00e0 \u00e9pargner, ce montant repr\u00e9sente la valeur future de vos cotisations manquantes \u2014 compos\u00e9e sur toute votre p\u00e9riode de retraite.",
        "If you wait one more year before starting to save, this amount represents the future value of your missed contributions \u2014 compounded over your full retirement period."
      ) + '</div>'
      + '<div style="font-size:12px;padding:10px 14px;background:var(--gbg);border-radius:8px;color:var(--ts)">'
      + '<strong>' + t("Ce que cela signifie :", "What this means:") + '</strong> ' + t(
        "Avec un taux d'\u00e9pargne de " + savRate + "%, chaque ann\u00e9e d'attente co\u00fbte davantage que la pr\u00e9c\u00e9dente, car la croissance compos\u00e9e travaille contre vous.",
        "With a savings rate of " + savRate + "%, each year of waiting costs more than the last, because compound growth works against you."
      ) + '</div></div></div>',
      'border-left:4px solid ' + cdColor
    );
  }

  // Min viable return
  if (minReturn > 0) {
    var mrColor = minReturn <= 4 ? "var(--gn)" : minReturn <= 7 ? "var(--am)" : "var(--rd)";
    var mrLabel = minReturn <= 3 ? t("Tr\u00e8s accessible", "Very accessible") : minReturn <= 5 ? t("Accessible", "Accessible") : minReturn <= 7 ? t("Exigeant", "Demanding") : minReturn <= 10 ? t("Difficile \u00e0 atteindre", "Difficult to reach") : t("Hors port\u00e9e", "Out of reach");
    h += card(
      '<div style="display:flex;align-items:flex-start;gap:16px">'
      + '<div style="font-size:28px;flex-shrink:0">\ud83d\udcca</div>'
      + '<div style="flex:1">'
      + '<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">' + t("Rendement minimum viable", "Minimum viable return") + '</div>'
      + '<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px">'
      + '<div style="font-size:30px;font-weight:900;font-family:var(--mono);color:' + mrColor + '">' + minReturn + '%</div>'
      + '<div style="font-size:12px;padding:3px 10px;border-radius:12px;background:' + mrColor + '20;color:' + mrColor + ';font-weight:700">' + mrLabel + '</div></div>'
      + '<div style="font-size:13px;color:var(--ts);line-height:1.75;margin-bottom:10px">' + t(
        "C'est le rendement annuel minimum que votre portefeuille doit g\u00e9n\u00e9rer pour que votre plan ait au moins 50% de chances de tenir toute la retraite \u2014 dans les conditions actuelles.",
        "This is the minimum annual return your portfolio needs to generate for your plan to have at least a 50% chance of lasting through retirement \u2014 under current conditions."
      ) + '</div>'
      + '<div style="font-size:12px;padding:10px 14px;background:var(--gbg);border-radius:8px;color:var(--ts)">'
      + '<strong>' + t("Ce que cela signifie :", "What this means:") + '</strong> '
      + (minReturn <= 4
        ? t("Un rendement de " + minReturn + "% est r\u00e9aliste avec un portefeuille diversifi\u00e9. Votre plan est robuste face aux cycles de march\u00e9 normaux.", "A " + minReturn + "% return is realistic with a diversified portfolio. Your plan holds up to normal market cycles.")
        : minReturn <= 7
          ? t("Un rendement de " + minReturn + "% est atteignable mais suppose de maintenir une exposition actions suffisante.", "A " + minReturn + "% return is achievable but assumes maintaining sufficient equity exposure.")
          : minReturn <= 10
            ? t("Un rendement de " + minReturn + "% exige une prise de risque importante.", "A " + minReturn + "% return requires significant risk-taking.")
            : t("Un rendement de " + minReturn + "% est pratiquement impossible \u00e0 maintenir durablement \u2014 cela signifie que le plan repose sur des conditions de march\u00e9 exceptionnelles.", "A " + minReturn + "% return is virtually impossible to sustain \u2014 this means the plan relies on exceptional market conditions.")
      ) + '</div></div></div>',
      'border-left:4px solid ' + mrColor
    );
  }

  // Waterfall
  if (priorities.length > 0) {
    var maxImp = Math.max.apply(null, priorities.map(function(p2) { return p2.impact || 0; })) || 1;
    h += '<div style="background:#FFF9F0;border:2px solid #c49a1a;border-radius:8px;padding:20px 24px;margin:24px 0">';
    h += priorities.map(function(pr, i) {
      var bw = pr.impact ? Math.max(4, Math.round(pr.impact / maxImp * 100)) : 4;
      return '<div style="margin-bottom:16px">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:5px">'
        + '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#c49a1a;color:#fff;font-size:12px;font-weight:800;flex-shrink:0">' + (i + 1) + '</span>'
        + '<span style="font-weight:700;font-size:14px;flex:1;color:#1A1208">' + pr.name + '</span>'
        + '<span style="font-family:var(--mono);font-size:12px;color:#666">' + pr.rate + '</span>'
        + (pr.impact ? '<span style="font-family:var(--mono);font-size:12px;font-weight:700;color:' + pr.color + '">~' + f$(pr.impact) + '</span>' : '')
        + '</div>'
        + '<div style="height:6px;background:#E8E0D4;border-radius:3px;margin:0 0 6px 38px"><div style="height:100%;background:' + pr.color + ';border-radius:3px;width:' + bw + '%;opacity:.8"></div></div>'
        + '<div style="font-size:11px;color:#666;margin-left:38px;line-height:1.5">' + pr.why + '</div></div>';
    }).join("");
    h += '</div>';
  }
  h += aiSlot(ai.priority_actions);

  // Best lever callout — show when a single strategy clearly dominates
  if (stratData && stratData.length === 5) {
    var bestS = null, bestSLabel = '';
    stratData.forEach(function(s, i) {
      if (i > 0 && (!bestS || s.succ > bestS.succ)) { bestS = s; bestSLabel = fr ? s.fr : s.en; }
    });
    if (bestS && (bestS.succ - (D.succ || D.successPct / 100)) > 0.02) {
      var bestPp = Math.round((bestS.succ - (D.succ || D.successPct / 100)) * 100);
      h += '<div class="co cog" style="margin-top:12px">'
        + '<strong>' + t("Levier le plus efficace identifi\u00e9\u00a0: ", "Most effective lever identified: ") + bestSLabel + '</strong>'
        + ' \u2014 ' + t("succ\u00e8s", "success") + ' <strong>' + D.successPct + '% \u2192 ' + Math.round(bestS.succ * 100) + '%</strong>'
        + ' <span style="font-size:12px;color:var(--gn)">( +' + bestPp + '\u00a0pp)</span>'
        + '</div>';
    }
  }

  h += secEnd();

  // ═══ S9: Five Strategies ═══
  h += secH(nextSecInter(), t("Comparaison de 5 strat\u00e9gies", "5-strategy comparison"), t("500 simulations ind\u00e9pendantes par strat\u00e9gie", "500 independent simulations per strategy"));
  h += bridge(
    "Votre levier prioritaire a \u00e9t\u00e9 simul\u00e9 contre 4 alternatives ind\u00e9pendantes \u2014 voici les r\u00e9sultats comparatifs face \u00e0 votre statu quo.",
    "Your priority lever was simulated against 4 independent alternatives \u2014 here are the comparative results vs your status quo."
  );
  if (stratData && stratData.length === 5) {
    var baseSucc = stratData[0].succ;
    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:440px">';
    h += '<thead><tr style="background:#F5F0E8">'
      + '<th scope="col" style="text-align:left;padding:10px 12px;font-weight:600;color:#555;border-bottom:2px solid #E8E0D0;font-size:13px">' + t("Strat\u00e9gie", "Strategy") + '</th>'
      + '<th scope="col" style="text-align:center;padding:10px 12px;font-weight:600;color:#555;border-bottom:2px solid #E8E0D0;font-size:13px">' + t("Succ\u00e8s", "Success") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;font-weight:600;color:#555;border-bottom:2px solid #E8E0D0;font-size:13px">' + t("Patrim. m\u00e9dian", "Median wealth") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;font-weight:600;color:#555;border-bottom:2px solid #E8E0D0;font-size:13px">' + t("Imp\u00f4t d\u00e9c\u00e8s", "Death tax") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;font-weight:600;color:#555;border-bottom:2px solid #E8E0D0;font-size:13px">' + t("Succession", "Estate") + '</th>'
      + '</tr></thead><tbody>';
    stratData.forEach(function(s, i) {
      var sc = s.succ >= 0.85 ? "var(--gn)" : s.succ >= 0.70 ? "var(--am)" : "var(--rd)";
      var ppDelta = Math.round((s.succ - baseSucc) * 100);
      var diff = i === 0 ? "\u2014" : (ppDelta === 0 ? "" : (ppDelta >= 0 ? "+" : "") + ppDelta + "pp");
      var diffC = i > 0 && s.succ - baseSucc > 0.02 ? "var(--gn)" : i > 0 && s.succ - baseSucc < -0.02 ? "var(--rd)" : "var(--ts)";
      h += '<tr style="border-bottom:1px solid var(--bdl);background:' + (i === 0 ? "var(--gbg)" : i % 2 === 0 ? "var(--altrow)" : "var(--bgc)") + '">'
        + '<td style="padding:10px 12px;font-weight:' + (i === 0 ? "700" : "400") + '">' + (fr ? s.fr : s.en) + (i === 0 ? " \u2713" : "") + ' <span style="font-size:11px;color:' + diffC + '">' + diff + '</span></td>'
        + '<td style="text-align:center;padding:10px;font-weight:800;color:' + sc + ';font-family:var(--mono)">' + Math.round(s.succ * 100) + '%</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono)">' + f$(s.rMedF || s.medF) + '</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono);color:var(--rd)">' + f$(s.medEstateTax) + '</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono);font-weight:600">' + f$(Math.max(0, s.medEstateNet)) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    h += '<div style="font-size:11px;color:var(--tm);margin-top:8px">pp = ' + t("points de pourcentage vs statu quo", "percentage points vs status quo") + '.</div>';
    // Contextual note when a strategy has significant negative impact
    var worstDelta = 0;
    stratData.forEach(function(s, i) { if (i > 0) { var d = Math.round((s.succ - baseSucc) * 100); if (d < worstDelta) worstDelta = d; } });
    if (worstDelta <= -5) {
      h += '<div style="font-size:12px;padding:10px 14px;background:var(--ambg);border-left:3px solid var(--am);border-radius:6px;margin-top:10px;color:var(--ts)">'
        + t("Certaines strat\u00e9gies affichent un impact n\u00e9gatif. Cela signifie qu'elles pourraient augmenter votre revenu imposable ou d\u00e9s\u00e9quilibrer l'efficacit\u00e9 fiscale de votre plan dans votre situation sp\u00e9cifique.",
            "Some strategies show a negative impact. This means they could increase your taxable income or reduce the tax efficiency of your plan in your specific situation.")
        + '</div>';
    }
  }
  h += aiSlot(ai.strategy_highlight);

  // Strategy verdict synthesis — decision aid for best lever
  if (stratData && stratData.length === 5) {
    (function() {
      var base = stratData[0];
      var best = null, bestLabel = "";
      stratData.forEach(function(s, i) {
        if (i > 0 && (!best || s.succ > best.succ)) { best = s; bestLabel = fr ? s.fr : s.en; }
      });
      if (!best) return;
      var delta = Math.round((best.succ - base.succ) * 100);
      var estateObj = (params._quiz || {}).succObjective || "neutral";
      var verdictColor, verdictLabel, verdictText;
      if (delta > 5) {
        verdictColor = "var(--gn)"; verdictLabel = t("Levier fort", "Strong lever");
        verdictText = t(
          bestLabel + " am\u00e9liore le taux de succ\u00e8s de +" + delta + "\u00a0pp (" + D.successPct + "\u00a0% \u2192 " + Math.round(best.succ * 100) + "\u00a0%). C\u2019est l\u2019ajustement ayant le plus grand impact dans votre situation.",
          bestLabel + " improves the success rate by +" + delta + "\u00a0pp (" + D.successPct + "\u00a0% \u2192 " + Math.round(best.succ * 100) + "\u00a0%). This is the highest-impact adjustment for your situation."
        );
      } else if (delta > 2) {
        verdictColor = "var(--am)"; verdictLabel = t("Levier mod\u00e9r\u00e9", "Moderate lever");
        verdictText = t(
          bestLabel + " offre une am\u00e9lioration mod\u00e9r\u00e9e de +" + delta + "\u00a0pp. Aucune strat\u00e9gie ne se d\u00e9marque nettement \u2014 plusieurs leviers pourraient \u00eatre combin\u00e9s.",
          bestLabel + " offers a moderate improvement of +" + delta + "\u00a0pp. No strategy dominates clearly \u2014 several levers could be combined."
        );
      } else {
        verdictColor = "var(--ts)"; verdictLabel = t("Statu quo solide", "Solid status quo");
        verdictText = t(
          "Les 5 strat\u00e9gies produisent des r\u00e9sultats similaires. Votre statu quo est d\u00e9j\u00e0 bien positionn\u00e9 \u2014 aucun levier unique ne serait d\u00e9terminant.",
          "All 5 strategies produce similar results. Your status quo is already well-positioned \u2014 no single lever would be decisive."
        );
      }
      // Estate angle
      var estateNote = "";
      if (estateObj === "maximize") {
        var bestEstate = null, bestEL = "";
        stratData.forEach(function(s, i) { if (i > 0 && (!bestEstate || s.medEstateNet > bestEstate.medEstateNet)) { bestEstate = s; bestEL = fr ? s.fr : s.en; } });
        if (bestEstate && bestEstate.medEstateNet > base.medEstateNet)
          estateNote = ' ' + t("Pour l\u2019objectif successoral\u00a0: " + bestEL + " pr\u00e9serve le plus de patrimoine (" + f$(bestEstate.medEstateNet) + " nets).", "For estate objective: " + bestEL + " preserves the most wealth (" + f$(bestEstate.medEstateNet) + " net).");
      }
      h += '<div style="margin-top:14px;padding:14px 18px;border-radius:10px;border:2px solid ' + verdictColor + ';background:' + verdictColor + '12">'
        + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">'
        + '<span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;color:' + verdictColor + '">' + t("Verdict", "Verdict") + '</span>'
        + '<span style="font-size:11px;padding:2px 10px;border-radius:20px;background:' + verdictColor + '22;color:' + verdictColor + ';font-weight:700">' + verdictLabel + '</span></div>'
        + '<div style="font-size:13px;color:var(--ts);line-height:1.75">' + verdictText + estateNote + '</div>'
        + '</div>';
    })();
  }

  h += secEnd();

  // ═══ S10: Real Estate (conditional) ═══
  if ((params._report || {}).homeVal > 0) {
    h += secH(nextSecInter(), t("Analyse immobili\u00e8re", "Real estate analysis"), t("R\u00e9sidence principale et strat\u00e9gie", "Primary residence and strategy"));
    var projHV = Math.round(params._report.homeVal * Math.pow(1.035, D.retAge - D.age));
    var projMB = params._report.mortBal > 0 && params._report.mortPayment > 0 ? (function() {
      var b = params._report.mortBal, mp = params._report.mortPayment, mr = 0.055 / 12;
      var yrs = D.retAge - D.age;
      for (var i = 0; i < yrs * 12 && b > 0; i++) { b = b * (1 + mr) - mp; } return Math.max(0, Math.round(b));
    })() : 0;
    h += card(
      kvr(t("Valeur estim\u00e9e actuelle", "Est. current value"), f$(params._report.homeVal))
      + kvr(t("Solde hypoth\u00e9caire", "Mortgage balance"), f$(params._report.mortBal))
      + kvr(t("\u00c9quit\u00e9 nette actuelle", "Current net equity"), f$(params._report.equity))
      + (params._report.mortPayment > 0 ? kvr(t("Paiement mensuel estim\u00e9", "Est. monthly payment"), f$(params._report.mortPayment)) : "")
      + (params._report.mortFreeAge > 0 ? kvr(t("Fin de l'hypoth\u00e8que", "Mortgage-free age"), params._report.mortFreeAge + " " + t("ans", "yrs")) : "")
      + kvr(t("Valeur projet\u00e9e \u00e0 la retraite (3.5%/an)", "Projected value at retirement (3.5%/yr)"), f$(projHV))
      + kvr(t("Solde hypoth\u00e9caire r\u00e9siduel estim\u00e9", "Est. remaining mortgage"), f$(projMB))
      + kvr(t("\u00c9quit\u00e9 projet\u00e9e \u00e0 la retraite", "Projected equity at retirement"), f$(Math.max(0, projHV - projMB)))
      + (params._report.hasRental ? kvr(t("Revenu locatif brut annuel", "Annual gross rental income"), f$(params._report.rentalIncome)) : "")
      + (params._report.hasRental ? kvr(t("Cash-flow locatif net estim\u00e9", "Est. net rental cash-flow"), f$((params._report.rentalIncome || 0) - (params._report.rentalExpenses || 0))) : "")
    );
    h += secEnd();
  }

  // ═══ S11a: Couple (conditional) ═══
  if (params.cOn) {
    h += secH(nextSecInter(), t("Analyse conjugale", "Couple analysis"), t("M\u00e9nage et optimisation", "Household optimization"));
    var splitSav = Math.round(D.retSpM * 12 * (D.taxCurrentMarginal - D.taxRetirementEffective) / 100 * 0.3);
    h += card(
      kvr(t("\u00c2ge de retraite \u2014 vous", "Your retirement age"), D.retAge + " " + t("ans", "yrs"))
      + kvr(t("\u00c2ge de retraite \u2014 conjoint\u00b7e", "Partner retirement age"), (params.cRetAge || D.retAge) + " " + t("ans", "yrs"))
      + kvr(t("D\u00e9calage de retraite", "Retirement gap"), Math.abs(D.retAge - (params.cRetAge || D.retAge)) + " " + t("ans", "yrs"))
      + (params.cSal > 0 ? kvr(t("Revenu conjoint\u00b7e", "Partner income"), f$(params.cSal)) : "")
      + kvr(t("\u00c9conomie fiscale (fractionnement pension)", "Tax saving (pension splitting)"), f$(Math.max(0, splitSav)))
      + kvr(t("RRQ/RPC conjoint\u00b7e", "Partner QPP/CPP start"), (params.cQppAge || 65) + " " + t("ans", "yrs"))
    );
    h += aiSlot(ai.couple_analysis);
    h += secEnd();
  }

  // ═══ S11b: CCPC (conditional) ═══
  if ((params._report || {}).bizOn) {
    h += secH(nextSecInter(), t("Analyse corporative \u2014 CCPC", "Corporate analysis \u2014 CCPC"), t("Strat\u00e9gie de r\u00e9mun\u00e9ration", "Compensation strategy"));
    var netInc2 = Math.max(0, (params.bizRevenue || 0) - (params.bizExpenses || 0));
    var quiz = params._quiz || {};
    h += card(
      kvr(t("Revenus bruts d'entreprise", "Gross business revenue"), f$(params.bizRevenue || 0))
      + kvr(t("D\u00e9penses d'entreprise", "Business expenses"), f$(params.bizExpenses || 0))
      + kvr(t("Revenu net d'entreprise", "Net business income"), f$(netInc2))
      + kvr(t("B\u00e9n\u00e9fices non r\u00e9partis (BNR)", "Retained earnings (RE)"), f$(params.bizRetainedEarnings || 0))
      + kvr(t("Strat\u00e9gie de r\u00e9mun\u00e9ration", "Compensation strategy"), params.bizRemun === "mix" ? t("Mixte (" + Math.round((params.bizSalaryPct || 0.5) * 100) + "% salaire)", "Mixed (" + Math.round((params.bizSalaryPct || 0.5) * 100) + "% salary)") : params.bizRemun === "salary" ? t("Salaire pur", "Salary only") : t("Dividendes purs", "Dividends only"))
      + (params.ippOn ? kvr(t("R\u00e9gime de pension individuel (RPI)", "Individual Pension Plan (IPP)"), t("Actif \u2014 Solde : ", "Active \u2014 Balance: ") + f$(params.ippBal || 0)) : "")
      + (params.bizSaleAge > 0 ? kvr(t("Vente pr\u00e9vue de l'entreprise", "Planned business sale"), params.bizSaleAge + " " + t("ans \u2014 ", "yrs \u2014 ") + f$(params.bizSalePrice || 0) + (params.bizLCGE ? " (LCGE)" : "")) : "")
    );
    // Salary vs dividend quick-compare (educational, using calcTax already imported)
    (function() {
      var rev = params.bizRevenue || 0;
      var exp = params.bizExpenses || 0;
      var netInc3 = Math.max(0, rev - exp);
      if (netInc3 <= 0) return;
      // Scenario A: current choice from quiz
      var quizRem = params.bizRemun || "mix";
      var salPct = quizRem === "salary" ? 1 : quizRem === "dividend" ? 0 : (params.bizSalaryPct || 0.5);
      var salA = Math.round(Math.min(netInc3, netInc3 * salPct));
      var divA = Math.round(Math.max(0, netInc3 - salA));
      var taxA = calcTax ? calcTax(salA, 0, params.prov || "QC", 0) : null;
      var taxAmt = taxA ? taxA.total : Math.round(salA * 0.30);
      var rrspRoomA = Math.min(Math.round(salA * 0.18), 33810);
      // Scenario B: RRSP-maximizing salary
      var salB = Math.min(netInc3, Math.round(33810 / 0.18));
      var divB = Math.round(Math.max(0, netInc3 - salB));
      var taxB = calcTax ? calcTax(salB, 0, params.prov || "QC", 0) : null;
      var taxAmtB = taxB ? taxB.total : Math.round(salB * 0.30);
      var rrspRoomB = Math.min(Math.round(salB * 0.18), 33810);
      h += '<div style="margin:14px 0">'
        + '<div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--ts)">' + t("Comparaison rapide \u2014 r\u00e9mun\u00e9ration", "Quick comparison \u2014 compensation") + '</div>'
        + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px" class="rpt-grid2">'
        + ['A', 'B'].map(function(sc) {
            var isCurrent = sc === 'A';
            var sal2 = isCurrent ? salA : salB, div2 = isCurrent ? divA : divB, tax2 = isCurrent ? taxAmt : taxAmtB, rrsp2 = isCurrent ? rrspRoomA : rrspRoomB;
            var lbl = isCurrent
              ? t("Statu quo (" + (quizRem === "salary" ? "Salaire" : quizRem === "dividend" ? "Dividendes" : "Mixte") + ")", "Status quo (" + (quizRem === "salary" ? "Salary" : quizRem === "dividend" ? "Dividends" : "Mixed") + ")")
              : t("Optimis\u00e9 REER", "RRSP-optimized");
            return '<div style="padding:12px 14px;border-radius:8px;border:2px solid ' + (isCurrent ? "var(--bd)" : "var(--gn)") + ';background:' + (isCurrent ? "var(--bgc)" : "var(--gnbg)") + '">'
              + '<div style="font-size:11px;font-weight:700;margin-bottom:8px;color:' + (isCurrent ? "var(--ts)" : "var(--gn)") + '">' + lbl + (isCurrent ? "" : ' \u2713') + '</div>'
              + kvr(t("Salaire", "Salary"), f$(sal2))
              + kvr(t("Dividendes", "Dividends"), f$(div2))
              + kvr(t("Imp\u00f4t personnel est.", "Est. personal tax"), f$(tax2))
              + kvr(t("Droits REER g\u00e9n\u00e9r\u00e9s", "RRSP room generated"), f$(rrsp2))
              + '</div>';
          }).join("")
        + '</div>'
        + '<div style="font-size:10px;color:var(--tm);margin-top:6px;font-style:italic">' + t("Calcul \u00e9ducatif seulement \u2014 ne tient pas compte des cotisations patronales, imp\u00f4t corporatif, ni des retenues. Consultez un CPA.", "Educational estimate only \u2014 excludes payroll taxes, corporate tax, and withholdings. Consult a CPA.") + '</div>'
        + '</div>';
    })();
    h += obs(t("Avertissement corporatif", "Corporate disclaimer"), t("Les analyses corporatives de ce rapport sont \u00e0 titre \u00e9ducatif uniquement. Consultez un comptable agr\u00e9\u00e9 (CPA) pour toute d\u00e9cision de r\u00e9mun\u00e9ration ou de planification successorale.", "Corporate analyses in this report are for educational purposes only. Consult a Chartered Professional Accountant (CPA) for any compensation or estate planning decisions."), "watch");
    if (ai.ccpc_context) h += aiSlot(ai.ccpc_context);
    h += secEnd();
  }

  // ═══ S12: Succession (conditional) ═══
  if ((D.medEstateNet || 0) > 100000 || (params.lifeInsBenefit || 0) > 0) {
    h += secH(nextSecInter(), t("Analyse successorale", "Estate analysis"), t("Patrimoine net au d\u00e9c\u00e8s (sc\u00e9nario m\u00e9dian)", "Net estate at death (median scenario)"));
    var succObj = (params._quiz || {}).succObjective || "neutral";
    var succObjBanner = succObj === "maximize"
      ? '<div style="background:var(--gbg);border-left:4px solid var(--gn);border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:var(--g)">' + t("Objectif : Maximiser la succession \u2014 ce plan optimise la pr\u00e9servation du patrimoine pour vos h\u00e9ritiers.", "Objective: Maximize estate \u2014 this plan optimizes wealth preservation for your heirs.") + '</div>'
      : succObj === "consume"
      ? '<div style="background:var(--ambg);border-left:4px solid var(--am);border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:var(--am)">' + t("Objectif : Consommer les actifs \u2014 ce plan optimise la qualit\u00e9 de vie \u00e0 la retraite.", "Objective: Consume assets \u2014 this plan optimizes quality of life in retirement.") + '</div>'
      : '';
    h += succObjBanner;
    h += card(
      kvr(t("Patrimoine m\u00e9dian estim\u00e9 au d\u00e9c\u00e8s", "Est. median estate at death"), f$(D.medEstateNet + D.medEstateTax))
      + kvr(t("Imp\u00f4t estim\u00e9 au d\u00e9c\u00e8s (REER+NR)", "Est. tax at death (RRSP+NR)"), f$(D.medEstateTax))
      + kvr(t("Patrimoine net succession estim\u00e9", "Est. net estate"), f$(D.medEstateNet))
      + kvr(t("Fourchette probable (P25-P75)", "Likely range (P25-P75)"), f$(D.p25EstateNet) + " \u2014 " + f$(D.p75EstateNet))
      + ((params.lifeInsBenefit || 0) > 0 ? kvr(t("Prestation d'assurance-vie", "Life insurance benefit"), f$(params.lifeInsBenefit)) : "")
      + (params.cOn && (params.cLifeInsBenefit || 0) > 0 ? kvr(t("Prestation conjoint\u00b7e", "Partner benefit"), f$(params.cLifeInsBenefit)) : "")
    );
    h += secEnd();
  }

  // ═══ S13: QPP Optimizer ═══
  h += secH(nextSecInter(), t("Optimiseur RRQ/RPC et PSV", "QPP/CPP and OAS optimizer"), t("Analyse du seuil de rentabilit\u00e9", "Break-even analysis"));
  (function() {
    // Reverse-engineer base-65 amount from age-adjusted D.qppMonthly
    var rawQ = D.qppMonthly;
    var qAge = D.qppAge || 65;
    var base65Q;
    if (qAge < 65) { base65Q = Math.round(rawQ / Math.max(0.01, 1 - 0.006 * (65 - qAge) * 12)); }
    else if (qAge > 65) { base65Q = Math.round(rawQ / (1 + 0.007 * (qAge - 65) * 12)); }
    else { base65Q = rawQ; }
    var q60 = Math.round(base65Q * (1 - 0.36));
    var q70 = Math.round(base65Q * (1 + 0.42));
    var oas65 = D.oasMonthly;
    var oas70 = Math.round(oas65 * (1 + 0.36));
    var beQ60 = base65Q > q60 ? Math.round(5 * q60 / (base65Q - q60) * 10) / 10 : 0;
    var beQ70 = q70 > base65Q ? Math.round(5 * (base65Q) / (q70 - base65Q) * 10) / 10 : 0;
    var beOas70 = oas70 > oas65 ? Math.round(5 * (oas65) / (oas70 - oas65) * 10) / 10 : 0;
    h += card(
      '<div style="font-size:12px;font-weight:700;margin-bottom:12px">' + t("R\u00e9gime de rentes \u2014 Options", "QPP \u2014 Options") + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px" class="rpt-grid3">'
      + [{ age: 60, v: q60, delta: "\u221236%" }, { age: 65, v: base65Q, delta: t("r\u00e9f\u00e9rence", "reference") }, { age: 70, v: q70, delta: "+42%" }].map(function(o) {
        var sel = D.qppAge === o.age;
        return '<div style="padding:12px;border-radius:8px;border:2px solid ' + (sel ? "var(--g)" : "var(--bd)") + ';background:' + (sel ? "var(--gbg)" : "var(--bgc)") + ';text-align:center">'
          + '<div style="font-size:16px;font-weight:800;color:' + (sel ? "var(--g)" : "var(--ts)") + '">' + o.age + '</div>'
          + '<div style="font-family:var(--mono);font-size:14px;font-weight:700;margin:4px 0">' + f$(o.v) + t("/mois", "/mo") + '</div>'
          + '<div style="font-size:11px;color:var(--tm)">' + o.delta + '</div>'
          + (sel ? '<div style="font-size:10px;color:var(--g);font-weight:700;margin-top:3px">\u2713 ' + t("Votre choix", "Your choice") + '</div>' : '')
          + '</div>';
      }).join("") + '</div>'
      + kvr(t("Seuil de rentabilit\u00e9 (60 \u2192 65)", "Break-even (60 \u2192 65)"), beQ60 > 0 ? t("~" + (Math.round(65 + beQ60)) + " ans", "~age " + Math.round(65 + beQ60)) : t("Imm\u00e9diatement favorable \u00e0 65", "Immediately favorable at 65"))
      + kvr(t("Seuil de rentabilit\u00e9 (65 \u2192 70)", "Break-even (65 \u2192 70)"), beQ70 > 0 ? t("~" + (Math.round(70 + beQ70)) + " ans", "~age " + Math.round(70 + beQ70)) : t("N/A", "N/A"))
    );
    // QPP contribution years context (P2-6)
    var estContribYrs = Math.min(40, Math.max(0, D.age - 18));
    h += '<div style="font-size:11px;color:var(--tm);margin-top:6px;margin-bottom:12px;line-height:1.6">'
      + t("Bas\u00e9 sur ~" + estContribYrs + " ann\u00e9es de cotisation estim\u00e9es et un revenu de travail de " + f$(D.sal) + "/an. Le montant maximal suppose ~40 ann\u00e9es au maximum des gains admissibles.", "Based on ~" + estContribYrs + " estimated contribution years and employment income of " + f$(D.sal) + "/yr. Maximum benefit assumes ~40 years at maximum pensionable earnings.")
      + '</div>';
    h += card(
      '<div style="font-size:12px;font-weight:700;margin-bottom:12px">' + t("Pension de la S\u00e9curit\u00e9 de la vieillesse \u2014 Options", "Old Age Security \u2014 Options") + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px" class="rpt-grid2">'
      + [{ age: 65, v: oas65, delta: t("r\u00e9f\u00e9rence", "reference") }, { age: 70, v: oas70, delta: "+36%" }].map(function(o) {
        var sel = D.oasAge === o.age;
        return '<div style="padding:12px;border-radius:8px;border:2px solid ' + (sel ? "var(--g)" : "var(--bd)") + ';background:' + (sel ? "var(--gbg)" : "var(--bgc)") + ';text-align:center">'
          + '<div style="font-size:16px;font-weight:800;color:' + (sel ? "var(--g)" : "var(--ts)") + '">' + o.age + '</div>'
          + '<div style="font-family:var(--mono);font-size:14px;font-weight:700;margin:4px 0">' + f$(o.v) + t("/mois", "/mo") + '</div>'
          + '<div style="font-size:11px;color:var(--tm)">' + o.delta + '</div>'
          + (sel ? '<div style="font-size:10px;color:var(--g);font-weight:700;margin-top:3px">\u2713 ' + t("Votre choix", "Your choice") + '</div>' : '')
          + '</div>';
      }).join("") + '</div>'
      + kvr(t("Seuil de rentabilit\u00e9 (65 \u2192 70)", "Break-even (65 \u2192 70)"), beOas70 > 0 ? t("~" + (Math.round(70 + beOas70)) + " ans", "~age " + Math.round(70 + beOas70)) : t("N/A", "N/A"))
    );
  })();
  h += secEnd();

  // ═══ S14: Projection Table ═══
  h += secH(nextSecInter(), t("Projection patrimoniale aux 5 ans", "5-year wealth projection"), t("Sc\u00e9narios P25 / P50 / P75 \u2014 " + nS + " simulations", "P25 / P50 / P75 scenarios \u2014 " + nS + " simulations"));
  if (D.projTable && D.projTable.length > 0) {
    h += '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;min-width:440px">';
    h += '<thead><tr style="background:#F5F0E8">'
      + '<th scope="col" style="text-align:left;padding:10px 12px;border-bottom:2px solid #E8E0D0;font-weight:600;color:#555;font-size:13px">' + t("\u00c2ge", "Age") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;border-bottom:2px solid #E8E0D0;font-weight:600;color:var(--rd);font-size:13px">P25 ' + t("(pessimiste)", "(pessimistic)") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;border-bottom:2px solid #E8E0D0;font-weight:700;color:var(--g);font-size:13px">P50 ' + t("(m\u00e9dian)", "(median)") + '</th>'
      + '<th scope="col" style="text-align:right;padding:10px 12px;border-bottom:2px solid #E8E0D0;font-weight:600;color:var(--gn);font-size:13px">P75 ' + t("(optimiste)", "(optimistic)") + '</th>'
      + '</tr></thead><tbody>';
    D.projTable.forEach(function(row, i) {
      var ruin25 = row.p25 <= 0, ruin50 = row.p50 <= 0;
      h += '<tr style="border-bottom:1px solid var(--bdl);background:' + (i % 2 === 0 ? "var(--bgc)" : "var(--altrow)") + '">'
        + '<td style="padding:10px 12px;font-weight:700">' + row.age + ' ' + t("ans", "yrs") + '</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono);color:var(--rd)">' + (ruin25 ? '<span style="color:var(--rd);font-weight:800">0 $ \u26a0\ufe0f</span>' : f$(row.p25)) + '</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono);font-weight:700;color:var(--g)">' + (ruin50 ? '<span style="color:var(--rd);font-weight:800">0 $ \u26a0\ufe0f</span>' : f$(row.p50)) + '</td>'
        + '<td style="text-align:right;padding:10px 12px;font-family:var(--mono);color:var(--gn)">' + f$(row.p75) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    var hasP25Zero = D.projTable.some(function(r) { return r.p25 <= 0; });
    h += '<div style="font-size:11px;color:var(--tm);margin-top:8px">' + t("P25 = 25% des simulations ont un r\u00e9sultat inf\u00e9rieur. \u26a0\ufe0f = patrimoine liquide \u00e9puis\u00e9 dans ce sc\u00e9nario. Valeurs en dollars constants 2026.", "P25 = 25% of simulations have a lower result. \u26a0\ufe0f = liquid portfolio depleted in this scenario. Values in 2026 constant dollars.") + '</div>';
    if (hasP25Zero && D.successPct >= 80) {
      h += '<div style="font-size:11px;color:var(--tm);margin-top:4px;font-style:italic">' + t("\u2139\ufe0f Un patrimoine liquide \u00e0 0\u00a0$ ne signifie pas une absence de revenu \u2014 les prestations gouvernementales (" + gP + ", " + oN + ") et les pensions continuent de couvrir une partie des d\u00e9penses.", "\u2139\ufe0f A liquid portfolio of $0 does not mean zero income \u2014 government benefits (" + gP + ", " + oN + ") and pensions continue to cover a portion of expenses.") + '</div>';
    }
  }
  h += secEnd();

  // ── Closing frame — recontextualization before methodology ─
  var closingRetSpM = D.retSpM || 0;
  var closingGovM = D.govMonthly || 0;
  var closingGapM = Math.max(0, closingRetSpM - closingGovM);
  h += '<div style="background:linear-gradient(135deg,#1A1208 0%,#2D2010 100%);color:#fff;border-radius:14px;padding:28px;margin:24px 0;">'
    + '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#c49a1a;margin-bottom:12px;font-weight:600;">' + t("En résumé", "In summary") + '</div>'
    + '<div style="font-size:15px;line-height:1.8;color:#E8E0D4;">'
    + (D.successPct >= 85
      ? t("Les simulations suggèrent que votre plan pourrait résister dans " + D.successPct + " % des scénarios. Avec un patrimoine projeté de " + f$(D.retBal) + " à la retraite et des revenus garantis couvrant " + D.coveragePct + " % du revenu cible, la structure apparaît solide. Ces résultats restent des projections — un suivi régulier permettrait de valider leur trajectoire.",
           "Simulations suggest your plan could hold in " + D.successPct + "% of scenarios. With projected wealth of " + f$(D.retBal) + " at retirement and guaranteed income covering " + D.coveragePct + "% of target, the structure appears solid. These remain projections — regular monitoring would help validate their trajectory.")
      : D.successPct >= 50
      ? t("Votre plan affiche un taux de réussite de " + D.successPct + " %. L\u2019écart entre le revenu cible et les revenus garantis (" + f$(closingGapM) + " par mois) représente la pression principale. Les sections précédentes identifient les leviers qui pourraient influencer ce résultat.",
           "Your plan shows a " + D.successPct + "% success rate. The gap between target income and guaranteed income (" + f$(closingGapM) + " per month) represents the main pressure. Previous sections identify the levers that could influence this outcome.")
      : t("Les simulations indiquent un taux de réussite de " + D.successPct + " %. " + (D.withdrawalRatePct > 4 ? "Le taux de retrait de " + D.withdrawalRatePct + " % dépasse le seuil historiquement soutenable de 4 %. " : "") + "Les scénarios présentés dans ce rapport montrent les ajustements qui pourraient avoir le plus d\u2019impact.",
           "Simulations indicate a " + D.successPct + "% success rate. " + (D.withdrawalRatePct > 4 ? "The " + D.withdrawalRatePct + "% withdrawal rate exceeds the historically sustainable 4% threshold. " : "") + "The scenarios presented in this report show the adjustments that could have the most impact."))
    + '</div></div>';

  // ═══ S15: Methodology ═══
  h += secH(nextSecInter(), t("M\u00e9thodologie et hypoth\u00e8ses", "Methodology and assumptions"), t("Comment ce rapport a \u00e9t\u00e9 calcul\u00e9", "How this report was calculated"));
  h += card(
    '<div style="font-size:13px;color:var(--ts);line-height:1.85">'
    + '<p style="margin-bottom:12px"><strong>' + t("Simulation Monte Carlo", "Monte Carlo Simulation") + '</strong> \u2014 '
    + t("Ce rapport utilise " + nS + " simulations Monte Carlo sur votre horizon de vie complet. Chaque simulation g\u00e9n\u00e8re un chemin \u00e9conomique unique en tirant al\u00e9atoirement des rendements annuels, de l'inflation, de la mortalit\u00e9 stochastique et des \u00e9v\u00e9nements de queue (fat-tail). Les r\u00e9sultats pr\u00e9sent\u00e9s sont des distributions statistiques, pas des pr\u00e9dictions.", "This report uses " + nS + " Monte Carlo simulations over your complete life horizon. Each simulation generates a unique economic path by randomly drawing annual returns, inflation, stochastic mortality, and fat-tail events. Results presented are statistical distributions, not predictions.") + '</p>'
    + '<p style="margin-bottom:12px"><strong>' + t("Hypoth\u00e8ses de rendement", "Return assumptions") + '</strong> \u2014 '
    + t("Rendement esp\u00e9r\u00e9 actions : 7.0% nominal (5.0% r\u00e9el). Obligations : 3.5% nominal. Volatilit\u00e9 actions : 15% annuel. Fat-tail events : distribution \u00e0 queue lourde avec skewness n\u00e9gatif. Corr\u00e9lation actions/obligations : \u22120.20.", "Expected equity return: 7.0% nominal (5.0% real). Bonds: 3.5% nominal. Equity volatility: 15% annual. Fat-tail events: heavy-tail distribution with negative skewness. Equity/bond correlation: \u22120.20.") + '</p>'
    + '<p style="margin-bottom:12px"><strong>' + t("Frais de gestion (MER)", "Management fees (MER)") + '</strong> \u2014 '
    + t("REER : " + ((params.merR || 0.015) * 100).toFixed(1) + "%. C\u00c9LI : " + ((params.merT || 0.007) * 100).toFixed(1) + "%. Non enregistr\u00e9 : " + ((params.merN || 0.007) * 100).toFixed(1) + "%. Les frais de gestion sont d\u00e9duits de la performance brute chaque ann\u00e9e. Le co\u00fbt cumulatif affich\u00e9 repr\u00e9sente l'impact compos\u00e9 sur votre horizon.", "RRSP: " + ((params.merR || 0.015) * 100).toFixed(1) + "%. TFSA: " + ((params.merT || 0.007) * 100).toFixed(1) + "%. Non-registered: " + ((params.merN || 0.007) * 100).toFixed(1) + "%. Management fees are deducted from gross performance each year. The cumulative cost shown represents the compounded impact over your horizon.") + '</p>'
    + '<p style="margin-bottom:12px"><strong>' + t("Tables de mortalit\u00e9", "Mortality tables") + '</strong> \u2014 '
    + t("CPM-2023 (tables actuarielles canadiennes). Mortalit\u00e9 stochastique activ\u00e9e \u2014 l'esp\u00e9rance de vie varie d'une simulation \u00e0 l'autre selon ces tables. L'\u00e2ge de planification maximum est 95 ans.", "CPM-2023 (Canadian actuarial tables). Stochastic mortality enabled \u2014 life expectancy varies across simulations based on these tables. Maximum planning age is 95.") + '</p>'
    + '<p style="margin-bottom:12px"><strong>' + t("Fiscalit\u00e9", "Taxation") + '</strong> \u2014 '
    + t("Param\u00e8tres fiscaux 2026 : paliers f\u00e9d\u00e9raux et provinciaux, montant personnel de base, seuil de r\u00e9cup\u00e9ration de la PSV (95 323 $), inclusion des gains en capital \u00e0 50%/66,67% selon le seuil de 250 000 $. Indexation des param\u00e8tres selon l'inflation simul\u00e9e.", "2026 tax parameters: federal and provincial brackets, basic personal amount, OAS clawback threshold ($95,323), capital gains inclusion at 50%/66.67% based on $250,000 threshold. Parameters indexed to simulated inflation.") + '</p>'
    + '<p style="margin-bottom:12px"><strong>' + t("R\u00e9gime de rentes et PSV", "QPP/CPP and OAS") + '</strong> \u2014 '
    + t("Calcul selon les r\u00e8gles 2026. RRQ/RPC ajust\u00e9 selon l'\u00e2ge de d\u00e9but : \u22120.6%/mois avant 65 ans, +0.7%/mois apr\u00e8s 65 ans (max. 70 ans). PSV : \u22120.6%/mois avant 65 ans, +0.6%/mois apr\u00e8s 65 ans. Indexation \u00e0 l'IPC dans la simulation.", "Calculated per 2026 rules. QPP/CPP adjusted by start age: \u22120.6%/month before 65, +0.7%/month after 65 (max. 70). OAS: \u22120.6%/month before 65, +0.6%/month after 65. CPI-indexed in simulation.") + '</p>'
    + '<p style="margin-bottom:0"><strong>' + t("Limitations", "Limitations") + '</strong> \u2014 '
    + t("Ce rapport ne constitue pas un conseil financier. Les projections sont des estimations probabilistes bas\u00e9es sur des hypoth\u00e8ses \u2014 les rendements r\u00e9els, la fiscalit\u00e9 et la l\u00e9gislation peuvent \u00e9voluer. Ce rapport ne tient pas compte des changements de situation personnelle, professionnelle ou familiale. Consultez un planificateur financier agr\u00e9\u00e9 (Pl. Fin.) pour toute d\u00e9cision importante.", "This report does not constitute financial advice. Projections are probabilistic estimates based on assumptions \u2014 actual returns, taxation and legislation may change. This report does not account for changes in personal, professional or family circumstances. Consult a Certified Financial Planner (CFP) for any major decision.") + '</p></div>'
  );
  h += '<div style="background:var(--rdbg);border:1px solid rgba(204,68,68,.2);border-radius:10px;padding:16px;margin-top:14px;font-size:11px;color:#555;line-height:1.7">'
    + '<strong>' + t("Avertissement l\u00e9gal", "Legal disclaimer") + '</strong> \u2014 '
    + t("buildfi.ca est un outil d'information et de planification financi\u00e8re personnelle. Il n'est pas enregistr\u00e9 \u00e0 titre de conseiller en valeurs mobili\u00e8res ou de planificateur financier. Les informations contenues dans ce rapport sont fournies \u00e0 des fins \u00e9ducatives uniquement et ne constituent pas un conseil financier, juridique ou fiscal. buildfi.ca d\u00e9cline toute responsabilit\u00e9 pour les d\u00e9cisions prises sur la base de ce rapport. Les r\u00e9sultats sont bas\u00e9s sur des hypoth\u00e8ses qui peuvent ne pas refl\u00e9ter la r\u00e9alit\u00e9 future. La performance pass\u00e9e ne garantit pas les r\u00e9sultats futurs. Ce rapport est conforme aux directives de l'AMF concernant l'utilisation de simulations financi\u00e8res \u00e0 des fins \u00e9ducatives.", "buildfi.ca is a personal financial planning information tool. It is not registered as a securities advisor or financial planner. The information in this report is provided for educational purposes only and does not constitute financial, legal, or tax advice. buildfi.ca disclaims any responsibility for decisions made based on this report. Results are based on assumptions that may not reflect future reality. Past performance does not guarantee future results. This report complies with AMF guidelines on the use of financial simulations for educational purposes.") + '</div>';
  h += secEnd();

  // ═══ S16: Next Steps ═══
  h += secH(nextSecInter(), t("Points \u00e0 retenir", "Key takeaways"), t("Pistes \u00e0 explorer", "Areas to explore"));

  // Key lever recap (observational — not prescriptive)
  var a1 = priorities[0] || { name: t("Commencer \u00e0 \u00e9pargner", "Start saving"), why: t("L\u2019analyse sugg\u00e8re que commencer \u00e0 \u00e9pargner d\u00e8s maintenant pourrait avoir un impact significatif.", "The analysis suggests that starting to save now could have a significant impact.") };
  h += '<div class="co cogn">'
    + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gn);margin-bottom:8px">' + t("Levier prioritaire identifi\u00e9", "Key lever identified") + '</div>'
    + '<div style="font-size:14px;font-weight:700;color:var(--ts);margin-bottom:4px">' + a1.name + '</div>'
    + '<div style="font-size:13px;color:var(--ts);line-height:1.75">' + a1.why + '</div>'
    + '</div>';

  // "Ce que vous avez dit" — closes the loop on quiz qualitative inputs
  (function() {
    var qz = params._quiz || {};
    var objLabels2 = {
      growth: fr ? "Croissance active" : "Active growth",
      security: fr ? "S\u00e9curit\u00e9 financi\u00e8re" : "Financial security",
      balance: fr ? "\u00c9quilibre vie/\u00e9pargne" : "Life/savings balance",
      legacy: fr ? "Patrimoine successoral" : "Estate legacy"
    };
    var confLabels2 = [
      fr ? "Peu inform\u00e9\u00b7e" : "Beginner",
      fr ? "Quelques notions" : "Some knowledge",
      fr ? "Raisonnablement inform\u00e9\u00b7e" : "Reasonably informed",
      fr ? "Bien inform\u00e9\u00b7e" : "Well-informed",
      fr ? "Expert\u00b7e" : "Expert"
    ];
    var wLabel = (qz.worries || []).map(function(w) {
      return { runout: fr?"Long\u00e9vit\u00e9":"Longevity", health: fr?"Sant\u00e9":"Health", market: fr?"March\u00e9s":"Markets", inflation:"Inflation", tax: fr?"Imp\u00f4ts":"Taxes", legacy: fr?"Succession":"Estate" }[w] || w;
    });
    var rows = [];
    if (qz.objective && objLabels2[qz.objective]) rows.push([t("Objectif principal", "Primary objective"), objLabels2[qz.objective], "S8"]);
    if (wLabel.length > 0) rows.push([t("Pr\u00e9occupations", "Focus areas"), wLabel.join(" \u00b7 "), "S7"]);
    if (qz.confidence) rows.push([t("Niveau financier", "Financial knowledge"), confLabels2[(qz.confidence || 3) - 1], "S7"]);
    if (rows.length === 0) return;
    h += '<div style="margin-bottom:20px;padding:16px 18px;border-radius:12px;border:1px solid var(--bd);background:var(--bgc)">'
      + '<div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:var(--g);margin-bottom:12px">'
      + t("Ce que vous avez dit", "What you told us") + '</div>'
      + rows.map(function(r) {
          return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:6px 0;border-bottom:1px solid var(--bdl);font-size:12px">'
            + '<span style="color:var(--tm)">' + r[0] + '</span>'
            + '<span style="font-weight:600;color:var(--ts)">' + r[1] + '</span></div>';
        }).join("")
      + '<div style="font-size:11px;color:var(--tm);margin-top:8px;font-style:italic">'
      + t("Ces r\u00e9ponses ont orient\u00e9 la s\u00e9lection des observations, le ton de l\u2019analyse et les priorit\u00e9s pr\u00e9sent\u00e9es dans ce rapport.",
          "These responses shaped the selection of observations, the tone of the analysis, and the priorities presented in this report.")
      + '</div></div>';
  })();

  // Expert Simulator upsell CTA
  h += '<div class="no-print" style="background:linear-gradient(135deg,#1A1208,#2C1F0A);border-radius:16px;padding:32px 28px;margin-top:24px;color:#fff;position:relative;overflow:hidden">'
    + '<div style="position:absolute;top:-20px;right:-20px;width:140px;height:140px;border-radius:50%;background:rgba(196,154,26,0.12)"></div>'
    + '<div style="position:absolute;bottom:-40px;left:30%;width:200px;height:200px;border-radius:50%;background:rgba(196,154,26,0.06)"></div>'
    + '<div style="position:relative">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">'
    + '<span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:var(--g)">buildfi.ca</span>'
    + '<span style="background:var(--g);color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;letter-spacing:.5px">' + t("SIMULATEUR EXPERT", "EXPERT SIMULATOR") + '</span></div>'
    + '<div style="font-size:26px;font-weight:800;margin-bottom:6px;line-height:1.2">' + t("Allez plus loin.<br>Bien plus loin.", "Go further.<br>Much further.") + '</div>'
    + '<div style="font-size:14px;color:rgba(255,255,255,0.7);margin-bottom:20px;line-height:1.6">' + t("Le Simulateur Expert int\u00e8gre ce que ce rapport ne couvre pas encore.", "The Expert Simulator covers what this report doesn't yet.") + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px">'
    + [
      { tx: fr ? "RESP \u2014 \u00e9pargne-\u00e9tudes" : "RESP \u2014 education savings" },
      { tx: fr ? "Conversion REER \u2192 FERR optimis\u00e9e" : "RRSP \u2192 RRIF optimized conversion" },
      { tx: fr ? "5 profils de risque distincts" : "5 distinct risk profiles" },
      { tx: fr ? "Planification corporative avanc\u00e9e" : "Advanced corporate planning" },
      { tx: fr ? "Strat\u00e9gie FRV / CRI avanc\u00e9e" : "Advanced LIF / LIRA strategy" },
      { tx: fr ? "Analyse successorale compl\u00e8te" : "Full estate analysis" }
    ].map(function(f2) {
      return '<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,0.85)">'
        + '<span style="color:var(--g);font-weight:700">\u2713</span><span>' + f2.tx + '</span></div>';
    }).join("")
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">'
    + '<div><div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.45);margin-bottom:2px">' + t("Prix de lancement", "Launch price") + '</div>'
    + '<span style="font-size:36px;font-weight:900;color:var(--g)">64,50\u00a0$</span>'
    + '<span style="font-size:13px;color:rgba(255,255,255,0.5);margin-left:6px">' + t("acc\u00e8s unique", "one-time access") + '</span></div>'
    + '<button style="background:linear-gradient(135deg,var(--g),var(--gl));color:#1A1208;border:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:800;cursor:pointer;letter-spacing:.3px;flex:1;min-width:200px" onclick="window.open(\'https://www.buildfi.ca/expert\',\'_blank\')">' + t("Acc\u00e9der au Simulateur Expert \u2192", "Access Expert Simulator \u2192") + '</button>'
    + '</div>'
    + '<div style="font-size:11px;color:rgba(255,255,255,0.35);margin-top:14px">' + t("Paiement s\u00e9curis\u00e9 \u00b7 Aucun abonnement \u00b7 Acc\u00e8s imm\u00e9diat", "Secure payment \u00b7 No subscription \u00b7 Instant access") + '</div>'
    + '</div></div>';

  // Print button
  h += '<div style="margin-top:16px">'
    + '<div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;border:1px solid var(--bd);background:var(--bgc);cursor:pointer" onclick="window.print()">'
    + '<span style="font-size:18px">\ud83d\udda8\ufe0f</span>'
    + '<div><div style="font-size:13px;font-weight:600;color:var(--ts)">' + t("Imprimer ou sauvegarder en PDF", "Print or save as PDF") + '</div>'
    + '<div style="font-size:11px;color:var(--tm)">' + t("Conservez une copie de votre rapport", "Keep a copy of your report") + '</div></div></div></div>';

  h += secEnd();

  // ═══ FEEDBACK STARS (injected by outer function if feedbackToken provided) ═══
  h += '<!-- FEEDBACK_STARS -->';

  // ═══ REFERRAL ═══
  h += '<div style="text-align:center;margin:16px 0;padding:12px;border:1px solid var(--bd);border-radius:8px;font-size:12px;color:var(--tm);line-height:1.8">';
  h += t("Partagez BuildFi avec un proche \u2014 15\u00a0% de rabais appliqu\u00e9 automatiquement via votre lien.", "Share BuildFi with someone you know \u2014 15% off applied automatically through your link.");
  h += ' <a href="https://www.buildfi.ca" style="color:var(--g);text-decoration:none;font-weight:600">buildfi.ca</a>';
  h += '</div>';

  // Legal links footer
  h += '<div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid var(--bd);font-size:10px;color:var(--tm)">'
    + '<a href="https://www.buildfi.ca/conditions.html" style="color:var(--g);text-decoration:none">' + t("Conditions","Terms") + '</a>'
    + ' · <a href="https://www.buildfi.ca/confidentialite.html" style="color:var(--g);text-decoration:none">' + t("Confidentialit\u00e9","Privacy") + '</a>'
    + ' · <a href="https://www.buildfi.ca/avis-legal.html" style="color:var(--g);text-decoration:none">' + t("Avis l\u00e9gal","Legal") + '</a>'
    + '</div>';

  h += '</div>'; // end report body

  return h;
}

// ══════════════════════════════════════════════════════════════════════
// Upgrade CTA — shown at bottom of browser-viewed report (hidden in print)
// ══════════════════════════════════════════════════════════════════════
function upgradeCtaHTML(fr, price) {
  var h = fr ? 'Vous voulez tester d\u2019autres sc\u00e9narios\u202f?' : 'Want to test other scenarios?';
  var b = fr
    ? 'Le Simulateur Expert vous permet d\u2019explorer chaque variable. Votre achat de ' + price + '\u202f$ est cr\u00e9dit\u00e9.'
    : 'The Expert Simulator lets you explore every variable. Your $' + price + ' purchase is credited.';
  var c = fr ? 'D\u00e9couvrir le Simulateur Expert \u2192' : 'Discover the Expert Simulator \u2192';
  return '<div class="no-print" style="max-width:640px;margin:40px auto 30px;padding:24px 28px;'
    + 'background:rgba(196,154,26,.06);border:1.5px solid rgba(196,154,26,.2);border-radius:12px;text-align:center">'
    + '<div style="font-size:16px;font-weight:600;color:#1A1A1A;margin-bottom:8px">' + h + '</div>'
    + '<div style="font-size:14px;color:#555;line-height:1.6;margin-bottom:16px">' + b + '</div>'
    + '<a href="https://www.buildfi.ca/expert" style="display:inline-block;padding:10px 24px;background:#c49a1a;color:#fff;'
    + 'font-size:14px;font-weight:600;border-radius:8px;text-decoration:none">' + c + '</a></div>';
}

// ══════════════════════════════════════════════════════════════════════
// PUBLIC API: renderReportHTMLInter()
// Wraps renderReport in a complete HTML document
// ══════════════════════════════════════════════════════════════════════
export function renderReportHTMLInter(D, mc, stratData, params, lang, ai, costDelay, minReturn, feedbackToken, obsLabels) {
  var fr = lang === "fr";
  var date = new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA");

  var reportBody = renderReport(D, mc, stratData, params, ai || {}, false, lang, costDelay || 0, minReturn || 0, obsLabels);

  // Inject star rating block if feedbackToken provided
  if (feedbackToken) {
    reportBody = reportBody.replace('<!-- FEEDBACK_STARS -->', buildStarRatingBlock(feedbackToken, fr));
  } else {
    reportBody = reportBody.replace('<!-- FEEDBACK_STARS -->', '');
  }

  // Append Expert upgrade CTA
  reportBody += upgradeCtaHTML(fr, '59');

  return '<!DOCTYPE html>'
+ '<html lang="' + lang + '">'
+ '<head>'
+ '<meta charset="UTF-8">'
+ '<meta name="viewport" content="width=device-width,initial-scale=1">'
+ '<title>buildfi.ca \u2014 ' + (fr ? "Bilan 360" : "Snapshot 360") + ' \u2014 ' + date + '</title>'
+ '<link rel="preconnect" href="https://fonts.googleapis.com">'
+ '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
+ '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">'
+ '<style>'
+ '*{margin:0;padding:0;box-sizing:border-box}'
+ ':root{'
+ '  --g:#c49a1a;--gd:#c49a1a;--gl:#D4A85A;--gbg:rgba(196,154,26,.07);'
+ '  --gn:#2A8C46;--gnbg:rgba(42,140,70,.06);'
+ '  --am:#B89830;--amr:#D48C00;--ambg:rgba(184,152,48,.06);'
+ '  --rd:#CC4444;--rdbg:rgba(204,68,68,.06);'
+ '  --bl:#4680C0;--blbg:rgba(70,128,192,.06);'
+ '  --pr:#c49a1a;--bga:rgba(196,154,26,.04);'
+ '  --tx:#1A1A1A;--ts:#555;--tm:#888;--tl:#bbb;'
+ '  --bg:#FEFCF9;--bgc:#fff;--cd:#fff;--bd:#E8E0D4;--bdl:#F0ECE4;'
+ '  --sans:\'DM Sans\',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;'
+ '  --mono:\'JetBrains Mono\',\'SF Mono\',monospace;'
+ '  --rad:10px;--altrow:#FAFAF8;'
+ '}'
+ 'body{font-family:var(--sans);font-size:15px;line-height:1.75;color:var(--tx);background:var(--bg);'
+ '  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;'
+ '  -webkit-print-color-adjust:exact;print-color-adjust:exact}'
+ '@media print{body{background:#fff}.np,.no-print{display:none!important}.pb,.rpt-pb{page-break-before:always}'
+ '  .c,.cm,.co,.ai{break-inside:avoid;page-break-inside:avoid}'
+ '  .sh{break-after:avoid;page-break-after:avoid;border-bottom:2px solid var(--gd)}'
+ '  .c,.cm{box-shadow:none;border-color:var(--bd)}'
+ '  p,li{orphans:3;widows:3}'
+ '  :root{--gd:#7A5520;--gl:#7A5520;--bd:#D7C9B8;--bdl:#E6DCD0;--tm:#666;--tl:#777;--amr:#996600}'
+ '  a{color:inherit!important;text-decoration:none!important}'
+ '  .tip{border-bottom:none}.tip::after{display:none}'
+ '}'
+ '.rpt-wrap{max-width:820px;margin:0 auto;padding:40px 32px 60px}'
+ '@media(max-width:600px){.rpt-wrap{padding:24px 16px 40px;font-size:14px}}'
+ '.mono{font-family:var(--mono);font-weight:600}'
+ '.sg{margin-bottom:52px}'
+ '.sh{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--gd);font-weight:700;'
+ '  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid var(--gd)}'
+ '.sn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;'
+ '  background:linear-gradient(135deg,var(--gd),var(--gl));color:#fff;font-size:12px;font-weight:800;flex-shrink:0}'
+ '.c{background:var(--cd);border:1px solid var(--bd);border-radius:var(--rad);padding:22px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.02)}'
+ '.cm{background:#FDFBF7;border:1px solid var(--bd);border-radius:var(--rad);padding:22px;margin-bottom:14px}'
+ '.co{border-radius:6px;padding:14px 16px;font-size:13px;line-height:1.8;margin:14px 0}'
+ '.cog{background:var(--gbg);border-left:4px solid var(--gd);color:#333}'
+ '.cogn{background:var(--gnbg);border-left:4px solid var(--gn);color:#333}'
+ '.coam{background:var(--ambg);border-left:4px solid var(--am);color:#333}'
+ '.cord{background:var(--rdbg);border-left:4px solid var(--rd);color:#333}'
+ '.dr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bdl);font-size:14px}'
+ '.dr:last-child{border-bottom:none}'
+ '.dl{color:var(--ts)}.dv{font-family:var(--mono);font-weight:600;text-align:right}'
+ '.kg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}'
+ '.kg4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}'
+ '@media(max-width:600px){.kg{grid-template-columns:1fr}.kg4{grid-template-columns:1fr 1fr}}'
+ '.kp{border-radius:var(--rad);padding:16px;text-align:center;background:var(--bgc)}'
+ '.kv{font-family:var(--mono);font-size:22px;font-weight:700;margin-bottom:4px}'
+ '.kl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}'
+ '.ks{font-size:10px;color:var(--tm);margin-top:2px}'
+ '.krd{background:var(--rdbg);border:1.5px solid var(--rd)}.krd .kv,.krd .kl{color:var(--rd)}'
+ '.kam{background:var(--ambg);border:1.5px solid var(--am)}.kam .kv,.kam .kl{color:var(--am)}'
+ '.kgn{background:var(--gnbg);border:1.5px solid var(--gn)}.kgn .kv,.kgn .kl{color:var(--gn)}'
+ '.ex{font-size:12.5px;color:#777;line-height:1.7;padding:10px 14px;background:#FDFBF7;border-radius:6px;margin-top:10px}'
+ '.ex strong{color:#555}'
+ '.ai{font-size:14px;color:#444;line-height:1.85;margin:14px 0;padding:14px 18px;background:#FDFBF7;border-radius:4px;border-left:3px solid #c49a1a}'
+ '.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
+ '@media(max-width:600px){.g2{grid-template-columns:1fr}}'
+ '.mono,.dv,.kv,table{font-variant-numeric:tabular-nums}'
+ '.tip{border-bottom:1px dotted var(--tm);cursor:help;position:relative}'
+ '.tip:hover::after,.tip:focus::after{content:attr(data-tip);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);'
+ '  background:#222;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;max-width:240px;white-space:normal;z-index:10;'
+ '  pointer-events:none;line-height:1.5;font-family:var(--sans);font-weight:400}'
+ '.rpt-grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}'
+ '.rpt-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}'
+ '.rpt-donut{display:flex;align-items:center;gap:20px}'
+ '@media(max-width:520px){.rpt-grid2{grid-template-columns:1fr!important}.rpt-grid3{grid-template-columns:1fr!important}.rpt-donut{flex-direction:column!important;text-align:center}}'
+ '.rpt-card{break-inside:avoid;page-break-inside:avoid}'
+ '@media(max-width:600px){.dr{padding:11px 0}.ai{padding:14px 14px}.sg{margin-bottom:48px}}'
+ 'svg{shape-rendering:geometricPrecision}'
+ '</style>'
+ '</head>'
+ '<body>' + reportBody + '</body></html>';
}
