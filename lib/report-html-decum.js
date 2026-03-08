// /lib/report-html-decum.js
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Rapport Décaissement — HTML Renderer (SERVER-SIDE)
// ══════════════════════════════════════════════════════════════════════
//
// Exports:
//   extractReportDataDecum(mc, params, extraRuns) — MC results → D
//   renderReportDecum(D, mc, params, lang, ai, feedbackToken, extraRuns) → HTML
//
// extraRuns: { mcMelt1, mcMelt2, mcC60, mcC65, mcC70 }
// All objects may be null if run was skipped.
//
// Used by: /api/webhook (Décaissement path)
// ══════════════════════════════════════════════════════════════════════
/* eslint-disable */

import {
  gradeFromSuccess as gradeFromSucc,
  gradeColor,
  gradeLabel as sharedGradeLabel,
  fmtNumber as fmtN,
  fmtPct,
  fmtPctRaw,
  escHtml,
  probTranslation as buildProbTranslation,
} from "./report-shared";

var REPORT_VERSION_DECUM = 'v1';

// ============================================================
// extractReportDataDecum(mc, params, extraRuns)
// ============================================================
export function extractReportDataDecum(mc, params, extraRuns) {
  var p = params;
  var rpt = p._report || {};
  var quiz = p._quiz || {};
  var inf = p.inf || 0.02;
  var pD = mc.pD || [];
  var fins = mc.fins || [];

  var succPct = Math.round((mc.succ || 0) * 100);
  var grade = gradeFromSucc(succPct);

  // Deflator helper (real $ at today's value)
  var deflate = function(age) { return 1 / Math.pow(1 + inf, Math.max(0, age - (p.age || 65))); };

  // Wealth at death percentiles (real $)
  var deathAge = p.deathAge || (p.sex === "F" ? 95 : 93);
  var finalRow = pD.find(function(r){ return r.age === deathAge; }) || pD[pD.length - 1] || {};
  var medWealth = Math.max(0, Math.round(mc.rMedF || mc.medF || finalRow.rp50 || 0));
  var p10Wealth = Math.max(0, Math.round(mc.rP5F || mc.rP10F || finalRow.rp10 || 0));
  var p25Wealth = Math.max(0, Math.round(mc.rP25F || finalRow.rp25 || 0));
  var p75Wealth = Math.max(0, Math.round(mc.rP75F || finalRow.rp75 || 0));
  var p90Wealth = Math.max(0, Math.round(mc.rP90F || mc.rP95F || finalRow.rp90 || finalRow.rp75 || 0));

  // Wealth at retirement start (real $)
  var retAge = p.age || 65; // already retired
  var retRow = pD.find(function(r){ return r.age === retAge || r.age === retAge + 1; }) || pD[0] || {};
  var retBal = Math.round(retRow.rp50 || 0);

  // Income breakdown (from medRevData at current age)
  var rd = mc.medRevData || [];
  var curRow = rd.find(function(r){ return r.age === retAge; }) || rd[0] || {};
  var qppMonthly = Math.round((curRow.rrq || 0) * deflate(curRow.age || retAge) / 12);
  var oasMonthly = Math.round((curRow.psv || 0) * deflate(curRow.age || retAge) / 12);
  var penMonthly = Math.round((curRow.pen || 0) * deflate(curRow.age || retAge) / 12);
  var retIncome = p.retIncome || 0;
  var retIncomeMonthly = Math.round(retIncome / 12);

  // Use _report values if richer (set by translator)
  if (rpt.govQppMonthly) qppMonthly = rpt.govQppMonthly;
  else if (rpt.qppMonthly) qppMonthly = rpt.qppMonthly;
  if (rpt.govOasMonthly) oasMonthly = rpt.govOasMonthly;
  else if (rpt.oasMonthly) oasMonthly = rpt.oasMonthly;
  if (rpt.govPenMonthly) penMonthly = rpt.govPenMonthly;
  else if (rpt.penMonthly) penMonthly = rpt.penMonthly;
  var govMonthly = qppMonthly + oasMonthly + penMonthly;
  var govCoveragePct = retIncomeMonthly > 0 ? govMonthly / retIncomeMonthly : 0;
  var govTotalMonthly = rpt.govTotalMonthly || govMonthly;

  // GK stats from MC
  var gkCutFreq = mc.gkCutFreq !== undefined ? mc.gkCutFreq : null;
  var gkAvgCut = mc.gkAvgCut !== undefined ? mc.gkAvgCut : null;
  var gkActive = !!p.gkOn;

  // Stochastic mortality
  var avgDeath = mc.avgDeath || (p.sex === "F" ? 87 : 84);
  var medDeath = mc.medDeath || avgDeath;

  // Ruin statistics
  var medRuin = mc.medRuin || 999;
  var ruinPct = Math.round((1 - (mc.succ || 0)) * 100);

  // Estate (at deterministic death age)
  var medEstate = medWealth;
  var p10Estate = p10Wealth;
  var p25Estate = p25Wealth;

  // Extra runs
  var ex = extraRuns || {};
  var melt1Succ = ex.mcMelt1 ? Math.round((ex.mcMelt1.succ || 0) * 100) : null;
  var melt2Succ = ex.mcMelt2 ? Math.round((ex.mcMelt2.succ || 0) * 100) : null;
  var mc60Succ = ex.mcC60 ? Math.round((ex.mcC60.succ || 0) * 100) : null;
  var mc65Succ = ex.mcC65 ? Math.round((ex.mcC65.succ || 0) * 100) : null;
  var mc70Succ = ex.mcC70 ? Math.round((ex.mcC70.succ || 0) * 100) : null;

  // Withdrawal rate at inception
  var initialWithdrawal = Math.max(0, retIncome - govMonthly * 12);
  var initialRate = retBal > 0 ? Math.round(initialWithdrawal / retBal * 1000) / 10 : 0;

  // 5-year projection table (real $)
  var projTable = [];
  for (var tAge = retAge; tAge <= deathAge; tAge += 5) {
    if (tAge > deathAge) break;
    var mr = rd.find(function(r){ return r.age === tAge; }) || rd[rd.length - 1] || {};
    var tDefl = deflate(tAge);
    var netInc = Math.round(((mr.rrq || 0) + (mr.psv || 0) + (mr.pen || 0) + (mr.ret || 0)) * tDefl);
    var tax5 = Math.round((mr.tax || 0) * tDefl);
    var pdRow = pD.find(function(r){ return r.age === tAge; });
    projTable.push({
      age: tAge,
      income: netInc,
      tax: tax5,
      afterTaxIncome: Math.max(0, netInc - tax5),
      p25: pdRow ? Math.max(0, Math.round(pdRow.rp25 || 0)) : 0,
      p50: pdRow ? Math.max(0, Math.round(pdRow.rp50 || 0)) : 0,
      p75: pdRow ? Math.max(0, Math.round(pdRow.rp75 || 0)) : 0
    });
  }

  // Glide path: starting allocR and ending allocR
  var startAllocR = p.allocR || 0.5;
  var yearsInRetirement = deathAge - retAge;
  var endAllocR = Math.max(0.20, startAllocR - (p.glideSpd || 0) * yearsInRetirement);

  // Spending smile: relative spending at key ages
  var goP = p.goP || 1.0; // go-go phase multiplier (before smileSlAge)
  var slP = p.slP || 0.88; // slow-go phase (smileSlAge to smileNoAge)
  var noP = p.noP || 0.75; // no-go phase (after smileNoAge)
  var smileSlAge = p.smileSlAge || 75;
  var smileNoAge = p.smileNoAge || 85;

  return {
    // Core
    age: p.age || 65, retAge: retAge, sex: p.sex || "M", prov: p.prov || "QC",
    couple: !!p.cOn, cAge: p.cAge, cSex: p.cSex,
    deathAge: deathAge, avgDeath: avgDeath, medDeath: medDeath,
    successPct: succPct, grade: grade,
    // Wealth
    totalWealth: (p.rrspBal || p.rrsp || 0) + (p.tfsaBal || p.tfsa || 0) + (p.nrBal || p.nr || 0) +
      (p.cRRSP || p.cRrspBal || 0) + (p.cTFSA || p.cTfsaBal || 0) + (p.cNR || p.cNrBal || 0),
    retBal: retBal,
    medWealth: medWealth, p10Wealth: p10Wealth, p25Wealth: p25Wealth,
    p75Wealth: p75Wealth, p90Wealth: p90Wealth,
    medEstate: medEstate, p10Estate: p10Estate, p25Estate: p25Estate,
    // Income
    retIncome: retIncome, retIncomeMonthly: retIncomeMonthly,
    qppMonthly: qppMonthly, oasMonthly: oasMonthly, penMonthly: penMonthly,
    govMonthly: govMonthly, govCoveragePct: govCoveragePct,
    initialWithdrawal: initialWithdrawal, initialRate: initialRate,
    cPenMonthly: rpt.cPenMonthly || (p.cPenM || 0),
    // GK
    gkActive: gkActive, gkCutFreq: gkCutFreq, gkAvgCut: gkAvgCut,
    gkCeil: p.gkCeil || 0.055, gkFloor: p.gkFloor || 0.03,
    gkMaxCut: p.gkMaxCut || 0.20,
    // Meltdown
    meltTarget: rpt.meltTarget || 58523, meltIsBase: !!rpt.meltIsBase,
    melt1Succ: melt1Succ, melt2Succ: melt2Succ,
    meltGap: Math.max(0, retIncome - (rpt.meltTarget || 58523)),
    // CPP timing
    mc60Succ: mc60Succ, mc65Succ: mc65Succ, mc70Succ: mc70Succ,
    alreadyClaiming: quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true",
    oasAlreadyClaiming: quiz.oasAlreadyClaiming === true || quiz.oasAlreadyClaiming === "true",
    qppAge: p.qppAge || 65, oasAge: p.oasAge || 65,
    // Ruin
    ruinPct: ruinPct, medRuin: medRuin,
    // Allocation
    allocR: startAllocR, endAllocR: endAllocR,
    glideSpd: p.glideSpd || 0,
    eqRet: p.eqRet || 0.065, bndRet: p.bndRet || 0.03,
    // Spending smile
    goP: goP, slP: slP, noP: noP,
    smileSlAge: smileSlAge, smileNoAge: smileNoAge,
    // Tables
    projTable: projTable, pD: mc.pD || [], fins: fins,
    medRevData: rd,
    // Quiz passthrough
    spendingFlex: quiz.spendingFlex || "moderate",
    estatePref: quiz.estatePref || "balanced",
    meltdownPref: quiz.meltdownPref || "moderate",
    inf: p.inf || 0.02,
    nSim: fins.length || 5000,
    // Debts
    debtBal: rpt.debtBal || 0,
    // Province
    isQC: (p.prov || "QC") === "QC",
  };
}

// ============================================================
// renderReportDecum — complete HTML string
// ============================================================
export function renderReportDecum(D, mc, params, lang, ai, feedbackToken, extraRuns) {
  var fr = lang === "fr";
  var s = strings(fr, D);

  // Validate MC data before rendering
  if (!D || D.successPct === undefined || !D.pD || D.pD.length === 0) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Error</title></head><body style="font-family:sans-serif;max-width:600px;margin:60px auto;padding:24px;"><h1>Report Generation Error</h1><p>' +
      (fr ? 'Les données de simulation sont incomplètes. Veuillez contacter support@buildfi.ca.' : 'Simulation data is incomplete. Please contact support@buildfi.ca.') +
      '</p></body></html>';
  }

  // ── Section helpers ──────────────────────────────────────
  function secH(num, title, icon) {
    return '<div class="sec-header"><span class="sec-num">' + num + '</span>' +
      (icon ? '<span class="sec-icon">' + icon + '</span>' : '') +
      '<h2 class="sec-title">' + title + '</h2></div>';
  }
  function aiSlot(key, fallback) {
    var v = ai && ai[key];
    if (!v || !v.trim()) return fallback || "";
    return '<p class="ai-narration">' + escHtml(v) + '</p>';
  }
  // escHtml imported from report-shared.ts
  function statBox(label, value, sub) {
    return '<div class="stat-box"><div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      (sub ? '<div class="stat-sub">' + sub + '</div>' : '') + '</div>';
  }
  function progBar(pct, color) {
    var w = Math.max(0, Math.min(100, pct));
    return '<div class="prog-bg"><div class="prog-fill" style="width:' + w + '%;background:' + (color || "#C4944A") + ';"></div></div>';
  }

  // ── Grade + success ──────────────────────────────────────
  var grade = D.grade;
  var gColor = gradeColor(grade);
  var succPct = D.successPct;
  var fr_govLabel = D.isQC ? (fr ? "RRQ + SV" : "QPP + OAS") : (fr ? "RPC + SV" : "CPP + OAS");
  var fr_govSingle = D.isQC ? (fr ? "RRQ" : "QPP") : (fr ? "RPC" : "CPP");

  // ── Fan chart SVG (portfolio trajectory p10/p50/p90) ────
  function buildFanChart() {
    var pD = D.pD || [];
    if (!pD.length) return "";
    var chartPts = pD.filter(function(r){ return r.age % 2 === 0 || r.age === D.age || r.age === D.deathAge; });
    if (chartPts.length < 2) return "";
    var ages = chartPts.map(function(r){ return r.age; });
    var maxW = 0;
    chartPts.forEach(function(r){
      maxW = Math.max(maxW, r.rp90 || r.rp75 || r.rp50 || 0);
    });
    if (maxW <= 0) return "";
    var W = 600, H = 200, PAD_L = 50, PAD_B = 30, PAD_T = 10, PAD_R = 10;
    var chartW = W - PAD_L - PAD_R;
    var chartH = H - PAD_B - PAD_T;
    var ageMin = ages[0], ageMax = ages[ages.length - 1];
    function xp(age) { return PAD_L + (age - ageMin) / (ageMax - ageMin) * chartW; }
    function yp(val) { return PAD_T + chartH - (val / maxW) * chartH; }
    // P90 band top
    var p90pts = chartPts.map(function(r){ return xp(r.age) + "," + yp(r.rp90 || r.rp75 || r.rp50 || 0); }).join(" ");
    var p10pts = chartPts.slice().reverse().map(function(r){ return xp(r.age) + "," + yp(Math.max(0, r.rp10 || 0)); }).join(" ");
    var p50line = chartPts.map(function(r){ return xp(r.age) + "," + yp(r.rp50 || 0); }).join(" L ");
    // Axis labels
    var axisLabels = "";
    var step = Math.ceil((ageMax - ageMin) / 6);
    for (var a = ageMin; a <= ageMax; a += step) {
      axisLabels += '<text x="' + xp(a) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#999">' + a + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px;">' +
      '<polygon points="' + p90pts + ' ' + p10pts + '" fill="#C4944A" fill-opacity="0.15"/>' +
      '<polyline points="' + p50line + '" fill="none" stroke="#C4944A" stroke-width="2.5"/>' +
      axisLabels +
      '<text x="' + PAD_L + '" y="' + (PAD_T + 6) + '" font-size="9" fill="#999">' + fmtN(maxW, fr) + ' $</text>' +
      '<text x="' + PAD_L + '" y="' + (PAD_T + chartH) + '" font-size="9" fill="#999">0 $</text>' +
      '</svg>';
  }

  // ── Spending smile chart ─────────────────────────────────
  function buildSmileChart() {
    var pts = [
      { age: D.age, mult: D.goP },
      { age: D.smileSlAge, mult: D.goP },
      { age: D.smileSlAge + 0.1, mult: D.slP },
      { age: D.smileNoAge, mult: D.slP },
      { age: D.smileNoAge + 0.1, mult: D.noP },
      { age: D.deathAge, mult: D.noP }
    ].filter(function(p){ return p.age >= D.age && p.age <= D.deathAge; });
    var W = 600, H = 150, PAD_L = 40, PAD_B = 25, PAD_T = 10, PAD_R = 10;
    var chartW = W - PAD_L - PAD_R, chartH = H - PAD_B - PAD_T;
    var ageMin = D.age, ageMax = D.deathAge;
    function xp(age) { return PAD_L + (age - ageMin) / (ageMax - ageMin) * chartW; }
    function yp(mult) { return PAD_T + chartH - (mult - 0.6) / (1.2 - 0.6) * chartH; }
    var linePts = pts.map(function(p){ return xp(p.age) + "," + yp(p.mult); }).join(" L ");
    var labels = [
      { age: Math.min(D.smileSlAge - 2, D.age + 2), label: fr ? "Actif (" + Math.round(D.goP * 100) + " %)" : "Active (" + Math.round(D.goP * 100) + "%)" },
      { age: (D.smileSlAge + D.smileNoAge) / 2, label: fr ? "Modéré (" + Math.round(D.slP * 100) + " %)" : "Moderate (" + Math.round(D.slP * 100) + "%)" },
      { age: Math.min(D.deathAge - 2, D.smileNoAge + 4), label: fr ? "Calme (" + Math.round(D.noP * 100) + " %)" : "Quiet (" + Math.round(D.noP * 100) + "%)" }
    ];
    var labelsSVG = labels.map(function(l){
      return '<text x="' + xp(l.age) + '" y="' + (PAD_T - 2) + '" font-size="9" fill="#C4944A" text-anchor="middle">' + l.label + '</text>';
    }).join("");
    // Reference line at 100%
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px;">' +
      '<line x1="' + PAD_L + '" y1="' + yp(1) + '" x2="' + (PAD_L + chartW) + '" y2="' + yp(1) + '" stroke="#E8E0D4" stroke-dasharray="4,3" stroke-width="1"/>' +
      '<polyline points="' + linePts + '" fill="none" stroke="#C4944A" stroke-width="2.5"/>' +
      labelsSVG +
      '<text x="' + PAD_L + '" y="' + (H - 8) + '" font-size="9" fill="#999">' + D.age + '</text>' +
      '<text x="' + (PAD_L + chartW) + '" y="' + (H - 8) + '" font-size="9" fill="#999" text-anchor="end">' + D.deathAge + '</text>' +
      '</svg>';
  }

  // ── Glide path chart ─────────────────────────────────────
  function buildGlideChart() {
    var W = 600, H = 120, PAD_L = 40, PAD_B = 25, PAD_T = 10, PAD_R = 10;
    var chartW = W - PAD_L - PAD_R, chartH = H - PAD_B - PAD_T;
    var ageMin = D.age, ageMax = D.deathAge;
    var startR = D.allocR, endR = D.endAllocR;
    function xp(age) { return PAD_L + (age - ageMin) / (ageMax - ageMin) * chartW; }
    function yp(r) { return PAD_T + chartH - r * chartH; }
    var eqPts = [[ageMin, startR], [ageMax, endR]].map(function(p){ return xp(p[0]) + "," + yp(p[1]); }).join(" L ");
    var bndPts = [[ageMin, 1 - startR], [ageMax, 1 - endR]].map(function(p){ return xp(p[0]) + "," + yp(p[1]); }).join(" L ");
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" style="max-width:' + W + 'px;">' +
      '<polyline points="' + eqPts + '" fill="none" stroke="#2A8C46" stroke-width="2.5"/>' +
      '<polyline points="' + bndPts + '" fill="none" stroke="#4680C0" stroke-width="2.5" stroke-dasharray="5,3"/>' +
      '<text x="' + (PAD_L + chartW + 4) + '" y="' + yp(endR) + '" font-size="9" fill="#2A8C46" dominant-baseline="middle">' + Math.round(endR * 100) + '%</text>' +
      '<text x="' + (PAD_L + chartW + 4) + '" y="' + yp(1 - endR) + '" font-size="9" fill="#4680C0" dominant-baseline="middle">' + Math.round((1 - endR) * 100) + '%</text>' +
      '<text x="' + PAD_L + '" y="' + (H - 8) + '" font-size="9" fill="#999">' + D.age + '</text>' +
      '<text x="' + (PAD_L + chartW) + '" y="' + (H - 8) + '" font-size="9" fill="#999" text-anchor="end">' + D.deathAge + '</text>' +
      '</svg>';
  }

  // ── CPP timing comparison bars ───────────────────────────
  function buildCPPTimingBlock() {
    if (D.alreadyClaiming || D.mc60Succ === null) return "";
    var rows = [
      { label: fr ? "Demande à 60 ans" : "Claim at age 60", pct: D.mc60Succ || 0, note: fr ? "Réduction de 36 %" : "36% reduction" },
      { label: fr ? "Demande à 65 ans" : "Claim at age 65", pct: D.mc65Succ || 0, note: fr ? "Montant de base" : "Base amount" },
      { label: fr ? "Demande à 70 ans" : "Claim at age 70", pct: D.mc70Succ || 0, note: fr ? "Bonification de 42 %" : "42% bonus" }
    ];
    var best = rows.reduce(function(a, b){ return b.pct > a.pct ? b : a; });
    return '<table class="data-table" style="width:100%;">' +
      '<thead><tr><th>' + (fr ? "Scénario" : "Scenario") + '</th><th>' + (fr ? "Taux de réussite" : "Success rate") + '</th><th>' + (fr ? "Détail" : "Detail") + '</th></tr></thead><tbody>' +
      rows.map(function(r){
        var isB = r.label === best.label;
        return '<tr' + (isB ? ' class="best-row"' : '') + '><td>' + r.label + (isB ? ' <span class="badge-best">' + (fr ? "meilleur" : "best") + '</span>' : '') + '</td>' +
          '<td><strong>' + r.pct + ' %</strong> ' + progBar(r.pct, r.pct === best.pct ? "#2A8C46" : "#C4944A") + '</td>' +
          '<td style="color:#666;font-size:0.9em;">' + r.note + '</td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  // ── Meltdown analysis ────────────────────────────────────
  function buildMeltdownBlock() {
    var meltTarget = D.meltTarget;
    var melt1 = D.melt1Succ;
    var melt2 = D.melt2Succ;
    var melt2Target = Math.round(meltTarget * 0.75);
    if (D.meltIsBase) {
      return '<p class="note-box">' + (fr
        ? "Le revenu désiré (" + fmtN(D.retIncome, fr) + " $) est déjà au niveau ou sous le premier palier fédéral. L\u2019analyse de réduction supplémentaire n\u2019est pas applicable."
        : "The desired income ($" + fmtN(D.retIncome, fr) + ") is already at or below the first federal bracket. Additional reduction analysis is not applicable.")
        + '</p>';
    }
    var rows = [
      { label: fr ? "Revenu actuel désiré" : "Current desired income", val: D.retIncome, pct: D.successPct, color: gradeColor(D.grade) },
      { label: fr ? ("Réduction au premier palier (" + fmtN(meltTarget, fr) + " $)") : ("Reduction to first bracket (" + fmtN(meltTarget, fr) + ")"), val: meltTarget, pct: melt1, color: melt1 !== null && melt1 >= 75 ? "#2A8C46" : "#C4944A" },
      { label: fr ? ("Réduction sévère (" + fmtN(melt2Target, fr) + " $)") : ("Severe reduction (" + fmtN(melt2Target, fr) + ")"), val: melt2Target, pct: melt2, color: melt2 !== null && melt2 >= 75 ? "#2A8C46" : "#C4944A" }
    ];
    return '<table class="data-table" style="width:100%;">' +
      '<thead><tr><th>' + (fr ? "Scénario de dépenses" : "Spending scenario") + '</th><th>' + (fr ? "Revenu annuel" : "Annual income") + '</th><th>' + (fr ? "Taux de réussite" : "Success rate") + '</th></tr></thead><tbody>' +
      rows.map(function(r){
        return '<tr><td>' + r.label + '</td><td>' + fmtN(r.val, fr) + ' $</td>' +
          '<td>' + (r.pct !== null ? ('<strong>' + r.pct + ' %</strong> ' + progBar(r.pct, r.color)) : (fr ? "N/A" : "N/A")) + '</td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  // ── Projection table ─────────────────────────────────────
  function buildProjTable() {
    return '<table class="data-table"><thead><tr>' +
      '<th>' + (fr ? "Âge" : "Age") + '</th>' +
      '<th>' + (fr ? "Revenu total" : "Total income") + '</th>' +
      '<th>' + (fr ? "Impôts estimés" : "Est. taxes") + '</th>' +
      '<th>' + (fr ? "Patrimoine médian" : "Median wealth") + '</th>' +
      '<th>' + (fr ? "P25" : "P25") + '</th>' +
      '<th>' + (fr ? "P75" : "P75") + '</th>' +
      '</tr></thead><tbody>' +
      D.projTable.map(function(r){
        return '<tr><td>' + r.age + '</td><td>' + fmtN(r.income, fr) + ' $</td><td>' +
          fmtN(r.tax, fr) + ' $</td><td>' + fmtN(r.p50, fr) + ' $</td><td>' +
          fmtN(r.p25, fr) + ' $</td><td>' + fmtN(r.p75, fr) + ' $</td></tr>';
      }).join("") +
      '</tbody></table>';
  }

  // ── Succession table ─────────────────────────────────────
  function buildSuccessionTable() {
    var prefLabel = {
      maximize: fr ? "Maximiser la transmission" : "Maximize estate",
      balanced: fr ? "Équilibré" : "Balanced",
      spenddown: fr ? "Consommer le capital" : "Spend down"
    }[D.estatePref] || (fr ? "Équilibré" : "Balanced");
    return '<table class="data-table"><thead><tr>' +
      '<th>' + (fr ? "Scénario" : "Scenario") + '</th>' +
      '<th>' + (fr ? "Patrimoine à " + D.deathAge + " ans" : "Estate at age " + D.deathAge) + '</th>' +
      '</tr></thead><tbody>' +
      '<tr><td>' + (fr ? "Médiane (50 % des simulations)" : "Median (50% of scenarios)") + '</td><td><strong>' + fmtN(D.medEstate, fr) + ' $</strong></td></tr>' +
      '<tr><td>' + (fr ? "Scénario pessimiste (10 %)" : "Pessimistic scenario (10%)") + '</td><td>' + fmtN(D.p10Estate, fr) + ' $</td></tr>' +
      '<tr><td>' + (fr ? "Scénario optimiste (75 %)" : "Optimistic scenario (75%)") + '</td><td>' + fmtN(D.p75Wealth || D.medEstate, fr) + ' $</td></tr>' +
      '<tr style="background:#F8F4EE;"><td><strong>' + (fr ? "Préférence déclarée" : "Declared preference") + '</strong></td><td><strong>' + prefLabel + '</strong></td></tr>' +
      '</tbody></table>';
  }

  // ── CSS ──────────────────────────────────────────────────
  var css = `
:root{--gold:#C4944A;--dark:#1A1208;--bg:#FEFCF9;--card:#F8F4EE;--border:#E8E0D4;--green:#2A8C46;--blue:#4680C0;--red:#CC4444;--gray:#666;}
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--dark);line-height:1.7;font-size:16px;}
.container{max-width:860px;margin:0 auto;padding:24px 20px 60px;}
.report-header{text-align:center;padding:40px 0 32px;border-bottom:2px solid var(--border);margin-bottom:36px;}
.logo{font-size:28px;font-weight:700;letter-spacing:-0.5px;}.logo span{color:var(--gold);}
.tier-badge{display:inline-block;background:var(--dark);color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;padding:4px 14px;border-radius:20px;margin-top:8px;}
.grade-card{display:inline-flex;flex-direction:column;align-items:center;background:var(--card);border:2px solid var(--gold);border-radius:20px;padding:32px 48px;margin:24px auto;gap:6px;}
.grade-letter{font-size:72px;font-weight:700;line-height:1;}
.grade-label{font-size:12px;color:var(--gold);text-transform:uppercase;letter-spacing:2px;font-weight:600;}
.grade-sub{font-size:14px;color:var(--gray);}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin:24px 0;}
.stat-box{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:18px 16px;text-align:center;}
.stat-label{font-size:11px;color:var(--gray);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;}
.stat-value{font-size:22px;font-weight:700;color:var(--dark);}
.stat-sub{font-size:11px;color:var(--gray);margin-top:4px;}
section{margin-bottom:36px;background:#fff;border:1px solid var(--border);border-radius:16px;padding:28px 28px 24px;box-shadow:0 1px 4px rgba(0,0,0,0.04);}
.sec-header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid var(--border);}
.sec-num{width:32px;height:32px;border-radius:50%;background:var(--dark);color:#fff;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.sec-icon{font-size:20px;flex-shrink:0;}
.sec-title{font-size:18px;font-weight:700;color:var(--dark);}
.ai-narration{background:#FDFBF7;border-left:3px solid #C4944A;padding:12px 16px;border-radius:4px;font-size:14px;color:#444;line-height:1.75;margin:12px 0;font-style:normal;}
p{margin-bottom:12px;font-size:15px;color:#333;}
.prog-bg{background:#eee;border-radius:4px;height:6px;margin-top:4px;}
.prog-fill{height:6px;border-radius:4px;transition:width 0.3s;}
.data-table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;}
.data-table th{background:#F5F0E8;color:#555;font-weight:600;padding:10px 12px;text-align:left;font-size:13px;border-bottom:2px solid #E8E0D0;}
.data-table td{padding:10px 12px;border-bottom:1px solid #F0EBE0;color:#444;}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:nth-child(even) td{background:#FAFAF8;}
.data-table tr.key-row td{font-weight:600;background:#FDFBF7;}
.best-row td{background:#EBF5EE !important;font-weight:600;}
.badge-best{background:var(--green);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;vertical-align:middle;}
.note-box{background:var(--card);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:14px;color:var(--gray);}
.income-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:16px 0;}
.income-item{text-align:center;padding:14px;background:var(--card);border-radius:10px;border:1px solid var(--border);}
.income-item .amt{font-size:20px;font-weight:700;}
.income-item .lbl{font-size:11px;color:var(--gray);margin-top:4px;}
.income-item .note{font-size:10px;color:var(--gray);}
.coverage-bar-wrap{margin:20px 0;}
.coverage-label{display:flex;justify-content:space-between;font-size:13px;color:var(--gray);margin-bottom:6px;}
.highlight-block{background:linear-gradient(135deg,#1A1208 0%,#2D2010 100%);color:#fff;border-radius:14px;padding:24px;margin:16px 0;}
.highlight-block .h-title{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:var(--gold);margin-bottom:8px;}
.highlight-block .h-val{font-size:28px;font-weight:700;}
.highlight-block .h-sub{font-size:13px;color:#ccc;margin-top:4px;}
.chart-wrap{margin:16px 0;overflow:hidden;}
.legend{display:flex;gap:20px;flex-wrap:wrap;font-size:12px;color:var(--gray);margin-top:8px;}
.legend-item{display:flex;align-items:center;gap:6px;}
.legend-dot{width:12px;height:4px;border-radius:2px;}
.withdrawal-order{display:flex;flex-direction:column;gap:8px;margin:16px 0;}
.wd-step{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--card);border-radius:8px;border:1px solid var(--border);}
.wd-num{width:28px;height:28px;border-radius:50%;background:var(--gold);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.wd-text{font-size:14px;}
.disclaimer-section{background:var(--card);border-top:2px solid var(--border);margin-top:36px;padding:28px;border-radius:0 0 16px 16px;font-size:13px;color:var(--gray);line-height:1.7;}
.disclaimer-section h3{font-size:14px;font-weight:700;color:var(--dark);margin-bottom:8px;}
@media(max-width:600px){.stats-grid{grid-template-columns:1fr 1fr;}.grade-card{padding:24px 32px;}.grade-letter{font-size:56px;}}
@media print{section{break-inside:avoid;}.disclaimer-section{display:block;}}
`;

  // ── Dynamic section counter ────────────────────────────
  var sn = 0;
  function nextSec() { sn++; return sn; }

  // ── Grade label (from shared) ────────────────────────
  var gradeLabel = sharedGradeLabel(succPct, fr);

  // ── probTranslation (from shared — decumulation tier) ──
  var probTranslation = buildProbTranslation(succPct, fr, "decumulation");

  // ── Mirror block — situation in 30 seconds ────────────
  var mirrorAge = D.age + (fr ? " ans" : " years old");
  var mirrorWealth = fmtN(D.totalWealth, fr) + " $";
  var mirrorTarget = fmtN(D.retIncome, fr) + (fr ? " $/an" : " $/yr");
  var mirrorGov = fmtN(D.govMonthly * 12, fr) + (fr ? " $/an" : " $/yr");
  var mirrorGap = fmtN(Math.max(0, D.retIncome - D.govMonthly * 12), fr) + (fr ? " $/an" : " $/yr");
  var mirrorBlock = '<div style="background:linear-gradient(135deg,#1A1208 0%,#2D2010 100%);color:#fff;border-radius:14px;padding:24px 28px;margin:20px 0;">' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C4944A;margin-bottom:12px;font-weight:600;">' +
    (fr ? "Votre situation en 30 secondes" : "Your situation in 30 seconds") + '</div>' +
    '<div style="font-size:15px;line-height:1.8;color:#E8E0D4;">' +
    (fr
      ? "Vous avez " + mirrorAge + ". Votre portefeuille totalise " + mirrorWealth + ". Vous visez un revenu de " + mirrorTarget + ", dont " + mirrorGov + " proviendraient de sources garanties (" + fr_govLabel + (D.penMonthly > 0 ? " + pension" : "") + "). Le portefeuille doit combler un écart de " + mirrorGap + " par année."
      : "You are " + mirrorAge + ". Your portfolio totals " + mirrorWealth + ". You target an income of " + mirrorTarget + ", of which " + mirrorGov + " would come from guaranteed sources (" + fr_govLabel + (D.penMonthly > 0 ? " + pension" : "") + "). The portfolio must fill a gap of " + mirrorGap + " per year.")
    + '</div></div>';

  // ── Age of ruin display ───────────────────────────────
  var ageOfRuinBlock = '';
  if (D.ruinPct > 0 && D.medRuin < 999) {
    ageOfRuinBlock = '<div style="background:#FDF5F5;border:1px solid #E8C0C0;border-radius:12px;padding:18px 20px;margin:16px 0;">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
      '<div style="font-size:32px;font-weight:700;color:#CC4444;">' + D.medRuin + '</div>' +
      '<div><div style="font-size:13px;font-weight:700;color:#CC4444;">' +
      (fr ? "Âge médian d\u2019épuisement" : "Median depletion age") + '</div>' +
      '<div style="font-size:12px;color:#666;">' +
      (fr ? "Dans " + D.ruinPct + " % des scénarios, le capital pourrait s\u2019épuiser vers cet âge." : "In " + D.ruinPct + "% of scenarios, capital could deplete around this age.") +
      '</div></div></div></div>';
  }

  // ── Section 1: Tableau de bord global ───────────────────
  var sec1 = '<section>' + secH(nextSec(), fr ? "Tableau de bord global" : "Global Dashboard", "") +
    '<div style="text-align:center;">' +
    '<div class="grade-card" style="position:relative;">' +
    '<svg width="140" height="140" viewBox="0 0 140 140" style="margin-bottom:12px;">' +
    '<circle cx="70" cy="70" r="58" fill="none" stroke="#E8E0D4" stroke-width="10"/>' +
    '<circle cx="70" cy="70" r="58" fill="none" stroke="' + gColor + '" stroke-width="10" ' +
    'stroke-dasharray="' + Math.round(364.4 * succPct / 100) + ' 364.4" ' +
    'stroke-linecap="round" transform="rotate(-90 70 70)" style="transition:stroke-dasharray 1s ease-out;"/>' +
    '<text x="70" y="62" text-anchor="middle" font-size="36" font-weight="700" fill="' + gColor + '">' + grade + '</text>' +
    '<text x="70" y="82" text-anchor="middle" font-size="13" fill="#666">' + succPct + ' %</text>' +
    '</svg>' +
    '<div class="grade-label">' + (fr ? "Note de durabilité" : "Sustainability Grade") + '</div>' +
    '<div style="font-size:13px;color:#666;margin-top:4px;">' + gradeLabel + '</div>' +
    '</div></div>' +
    mirrorBlock +
    '<div class="stats-grid">' +
    statBox(fr ? "Patrimoine total" : "Total wealth", fmtN(D.totalWealth, fr) + " $", fr ? "Au départ" : "At start") +
    statBox(fr ? "Patrimoine médian" : "Median wealth", fmtN(D.medWealth, fr) + " $", fr ? "À " + D.deathAge + " ans (réel)" : "At age " + D.deathAge + " (real)") +
    statBox(fr ? "Revenu garanti" : "Guaranteed income", fmtN(D.govMonthly, fr) + (fr ? " $/mois" : " $/mo"), fr ? Math.round(D.govCoveragePct * 100) + " % de couverture" : Math.round(D.govCoveragePct * 100) + "% coverage") +
    statBox(fr ? "Retrait initial" : "Initial withdrawal", fmtPctRaw(D.initialRate) + " %", fr ? "Taux d'utilisation du portefeuille" : "Portfolio draw rate") +
    '</div>' +
    ageOfRuinBlock +
    '<div style="font-size:12px;color:#666;line-height:1.6;font-style:italic;margin:6px 0 16px;padding-left:4px;">' + probTranslation + '</div>' +
    '<div style="font-size:12px;color:#999;line-height:1.6;margin:0 0 12px;padding:10px 14px;background:#F8F4EE;border-radius:8px;">' +
    (fr ? "Tous les montants sont en <strong>dollars d\u2019aujourd\u2019hui</strong> — ajustés pour l\u2019inflation projetée à " + (D.inf * 100).toFixed(1) + " % par année."
       : "All amounts are in <strong>today\u2019s dollars</strong> — adjusted for projected inflation of " + (D.inf * 100).toFixed(1) + "% per year.") +
    '</div>' +
    aiSlot("snapshot_intro", fr
      ? "Ce bilan analyse la durabilité de votre portefeuille en décaissement sur la base de " + D.nSim + " scénarios."
      : "This assessment analyzes your portfolio's sustainability in drawdown based on " + D.nSim + " scenarios.")
    + '</section>';

  // ── Section 2: Revenus garantis ─────────────────────────
  var govCovPct = Math.round(D.govCoveragePct * 100);
  var portfolioCovPct = Math.max(0, 100 - govCovPct);
  var sec2 = '<section>' + secH(nextSec(), fr ? "Mes revenus garantis" : "My Guaranteed Income", "") +
    '<div class="income-grid">' +
    '<div class="income-item"><div class="amt" style="color:var(--green);">' + fmtN(D.qppMonthly, fr) + ' $</div><div class="lbl">' + fr_govSingle + '</div><div class="note">' + (D.alreadyClaiming ? (fr ? "En cours" : "Active") : (fr ? "Prévu à " + D.qppAge + " ans" : "Planned at " + D.qppAge)) + '</div></div>' +
    '<div class="income-item"><div class="amt" style="color:var(--green);">' + fmtN(D.oasMonthly, fr) + ' $</div><div class="lbl">' + (fr ? "Sécurité de la vieillesse" : "Old Age Security") + '</div><div class="note">' + (D.oasAlreadyClaiming ? (fr ? "En cours" : "Active") : (fr ? "Prévu à " + D.oasAge + " ans" : "Planned at " + D.oasAge)) + '</div></div>' +
    (D.penMonthly > 0 ? '<div class="income-item"><div class="amt" style="color:var(--blue);">' + fmtN(D.penMonthly, fr) + ' $</div><div class="lbl">' + (fr ? "Pension à prestations définies" : "Defined Benefit Pension") + '</div></div>' : '') +
    (D.cPenMonthly > 0 ? '<div class="income-item"><div class="amt" style="color:var(--blue);">' + fmtN(D.cPenMonthly, fr) + ' $</div><div class="lbl">' + (fr ? "Pension conjoint·e" : "Partner pension") + '</div></div>' : '') +
    '<div class="income-item" style="border-color:var(--gold);"><div class="amt" style="color:var(--gold);">' + fmtN(D.govMonthly, fr) + ' $</div><div class="lbl">' + (fr ? "Total garanti / mois" : "Total guaranteed / mo") + '</div></div>' +
    '</div>' +
    '<div class="coverage-bar-wrap">' +
    '<div class="coverage-label"><span>' + (fr ? "Revenus garantis" : "Guaranteed income") + ' — ' + govCovPct + ' %</span><span>' + (fr ? "Portefeuille" : "Portfolio") + ' — ' + portfolioCovPct + ' %</span></div>' +
    '<div class="prog-bg" style="height:12px;"><div class="prog-fill" style="width:' + govCovPct + '%;background:var(--green);height:12px;"></div></div>' +
    '<p style="font-size:13px;color:var(--gray);margin-top:8px;">' +
    (fr ? "Vos revenus garantis couvrent " + govCovPct + " % de votre revenu cible de " + fmtN(D.retIncome, fr) + " $/an."
       : "Your guaranteed income covers " + govCovPct + "% of your target income of $" + fmtN(D.retIncome, fr) + " per year.") +
    '</p></div>' +
    aiSlot("income_mix_obs", fr ? "Vos revenus garantis couvrent " + Math.round(D.govCoveragePct * 100) + " % de votre revenu cible. Le portefeuille comble l'écart de " + fmtN(Math.max(0, D.retIncomeMonthly - D.govMonthly), fr) + " $ par mois." : "Your guaranteed income covers " + Math.round(D.govCoveragePct * 100) + "% of your target. The portfolio fills the " + fmtN(Math.max(0, D.retIncomeMonthly - D.govMonthly), fr) + " per month gap.") + '</section>';

  // ── Section 3: Durabilité du portefeuille ───────────────
  var fanChartSVG = buildFanChart();
  var sec3 = '<section>' + secH(nextSec(), fr ? "Durabilité du portefeuille" : "Portfolio Sustainability", "") +
    '<div class="highlight-block">' +
    '<div class="h-title">' + (fr ? "Patrimoine médian à " + D.deathAge + " ans (dollars d'aujourd'hui)" : "Median wealth at age " + D.deathAge + " (today's dollars)") + '</div>' +
    '<div class="h-val">' + fmtN(D.medWealth, fr) + ' $</div>' +
    '<div class="h-sub">' + (fr ? "Scénario pessimiste (10 %) : " + fmtN(D.p10Wealth, fr) + " $ | Scénario optimiste (90 %) : " + fmtN(D.p90Wealth, fr) + " $" : "Pessimistic scenario (10%): $" + fmtN(D.p10Wealth, fr) + " | Optimistic scenario (90%): $" + fmtN(D.p90Wealth, fr)) + '</div>' +
    '</div>' +
    (fanChartSVG ? '<div class="chart-wrap">' + fanChartSVG +
    '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:var(--gold);height:3px;"></div> ' + (fr ? "Médiane" : "Median") + '</div>' +
    '<div class="legend-item"><div class="legend-dot" style="background:rgba(196,148,74,0.3);width:20px;height:12px;border-radius:3px;"></div> ' + (fr ? "Fourchette P10–P90" : "P10–P90 range") + '</div></div></div>' : '') +
    '<h3 style="font-size:15px;font-weight:700;margin:20px 0 12px;">' + (fr ? "Projections quinquennales" : "Five-year projections") + '</h3>' +
    buildProjTable() +
    aiSlot("sequence_obs", fr ? "L'écart entre les scénarios pessimiste et optimiste — " + fmtN(D.p90Wealth - D.p10Wealth, fr) + " $ — reflète l'impact de l'ordre dans lequel les rendements arrivent durant les premières années de retrait." : "The spread between pessimistic and optimistic scenarios — " + fmtN(D.p90Wealth - D.p10Wealth, fr) + " — reflects the impact of return sequence during the early withdrawal years.") + '</section>';

  // ── Section 4: Stratégie de décaissement ────────────────
  var wdOrder = [];
  if (D.isQC) {
    wdOrder = [
      { name: fr ? "Non enregistré" : "Non-registered", why: fr ? "Impôt sur les gains en capital seulement (50 % d'inclusion)" : "Capital gains tax only (50% inclusion)" },
      { name: fr ? "REER / FERR" : "RRSP / RRIF", why: fr ? "Imposable en totalité — report des retraits modélisé dans les simulations" : "Fully taxable — withdrawal deferral modelled in simulations" },
      { name: fr ? "CÉLI" : "TFSA", why: fr ? "Croissance et retraits libres d'impôt — utilisé en dernier dans les simulations" : "Tax-free growth and withdrawals — used last in simulations" }
    ];
  } else {
    wdOrder = [
      { name: fr ? "Non enregistré" : "Non-registered", why: fr ? "Impôt sur les gains en capital seulement" : "Capital gains tax only" },
      { name: "RRSP / RRIF", why: fr ? "Entièrement imposable — report modélisé dans les simulations" : "Fully taxable — deferral modelled in simulations" },
      { name: "TFSA", why: fr ? "Retraits sans impôt — utilisé en dernier dans les simulations" : "Tax-free withdrawals — used last in simulations" }
    ];
  }
  var sec4 = '<section>' + secH(nextSec(), fr ? "Stratégie de décaissement" : "Drawdown Strategy", "") +
    '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">' + (fr ? "Ordre de décaissement modélisé" : "Modelled withdrawal order") + '</h3>' +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
    (fr ? "La stratégie optimale sélectionne dynamiquement le compte à privilégier chaque année selon votre tranche marginale. L'ordre général suivant émerge dans la majorité des simulations :"
       : "The optimal strategy dynamically selects which account to draw from each year based on your marginal tax bracket. The following general order emerges in the majority of simulations:")
    + '</p>' +
    '<div class="withdrawal-order">' +
    wdOrder.map(function(w, i){ return '<div class="wd-step"><div class="wd-num">' + (i+1) + '</div><div class="wd-text"><strong>' + w.name + '</strong><br><span style="color:var(--gray);font-size:13px;">' + w.why + '</span></div></div>'; }).join("") +
    '</div>' +
    (D.gkActive ? '<div style="margin-top:20px;">' +
      '<h3 style="font-size:15px;font-weight:700;margin-bottom:10px;">' + (fr ? "Règles de flexibilité des dépenses" : "Spending flexibility rules") + '</h3>' +
      '<p style="font-size:14px;color:#333;margin-bottom:12px;">' +
      (fr ? "Le portefeuille applique automatiquement des ajustements annuels selon l'évolution du capital :"
         : "The portfolio automatically applies annual adjustments based on capital performance:") + '</p>' +
      '<table class="data-table" style="width:100%;"><tbody>' +
      '<tr><td>' + (fr ? "Hausse possible si rendement &gt; " : "Increase possible if return &gt; ") + Math.round(D.gkCeil * 100) + " %</td><td>" + (fr ? "Maximum +10 %/an" : "Max +10%/yr") + '</td></tr>' +
      '<tr><td>' + (fr ? "Réduction si rendement &lt; " : "Reduction if return &lt; ") + Math.round(D.gkFloor * 100) + " %</td><td>" + (fr ? "Maximum −10 %/an" : "Max −10%/yr") + '</td></tr>' +
      '<tr><td>' + (fr ? "Réduction cumulée maximale" : "Maximum cumulative cut") + '</td><td>' + Math.round(D.gkMaxCut * 100) + " %</td></tr>" +
      (D.gkCutFreq !== null ? '<tr><td>' + (fr ? "Années avec réduction (observées)" : "Years with reductions (observed)") + '</td><td>' + fmtPct(D.gkCutFreq) + '</td></tr>' : '') +
      '</tbody></table></div>' : '') +
    aiSlot("spending_flex_obs", D.gkActive ? (fr ? "Les règles de flexibilité sont actives. En cas de baisse des marchés, les retraits pourraient diminuer jusqu'à " + Math.round(D.gkMaxCut * 100) + " % pour protéger la durabilité du portefeuille." : "Spending flexibility rules are active. In a market downturn, withdrawals could decrease by up to " + Math.round(D.gkMaxCut * 100) + "% to protect portfolio sustainability.") : (fr ? "Les dépenses sont fixes dans ces simulations. Le portefeuille absorbe la totalité du risque de marché sans ajustement des retraits." : "Spending is fixed in these simulations. The portfolio absorbs all market risk without withdrawal adjustments.")) + '</section>';

  // ── Section 5: Efficacité fiscale du décaissement ─────────
  var rrspPct = D.totalWealth > 0 ? Math.round((params.rrsp || 0) / D.totalWealth * 100) : 0;
  var oasThreshold = 95323;
  var aboveOAS = D.retIncome > oasThreshold;
  var sec4b = '<section>' + secH(nextSec(), fr ? "Efficacité fiscale du décaissement" : "Tax Efficiency of Drawdown", "") +
    '<div class="stats-grid">' +
    statBox(fr ? "Concentration REER/FERR" : "RRSP/RRIF concentration", rrspPct + " %", fr ? "De l'épargne totale" : "Of total savings") +
    statBox(fr ? "Seuil de récupération PSV" : "OAS recovery threshold", fmtN(oasThreshold, fr) + " $", fr ? (aboveOAS ? "Revenu au-dessus" : "Revenu en dessous") : (aboveOAS ? "Income above" : "Income below")) +
    statBox(fr ? "Fractionnement de pension" : "Pension splitting", D.couple ? (fr ? "Disponible" : "Available") : (fr ? "N/A (seul)" : "N/A (single)"), "") +
    '</div>' +
    (rrspPct > 50 ? '<p style="font-size:14px;color:#333;margin:12px 0;">' +
    (fr ? "Les retraits minimaux du FERR augmentent avec l'âge : 5,28 % à 72 ans, 6,82 % à 80 ans, 8,51 % à 85 ans, 16,34 % à 93 ans. Ces retraits forcés s'ajoutent au revenu imposable."
       : "RRIF minimum withdrawals increase with age: 5.28% at 72, 6.82% at 80, 8.51% at 85, 16.34% at 93. These forced withdrawals add to taxable income.")
    + '</p>' : '') +
    aiSlot("tax_timing_obs", fr
      ? "La répartition entre comptes enregistrés (" + rrspPct + " %) et non enregistrés influence l'efficacité fiscale des retraits à long terme." + (aboveOAS ? " Le revenu cible dépasse le seuil de récupération de la Sécurité de la vieillesse." : "")
      : "The split between registered (" + rrspPct + "%) and non-registered accounts influences the long-term tax efficiency of withdrawals." + (aboveOAS ? " Target income exceeds the Old Age Security recovery threshold." : ""))
    + '</section>';

  // ── Section 6: Timing CPP/QPP ────────────────────────────
  var sec5 = "";
  if (!D.alreadyClaiming && D.mc60Succ !== null) {
    sec5 = '<section>' + secH(nextSec(), fr ? ("Timing " + fr_govSingle + " : 60, 65 ou 70 ans") : ("Timing " + fr_govSingle + ": 60, 65 or 70"), "") +
      '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
      (fr ? "Chaque scénario ci-dessous correspond à une demande au même âge, toutes autres variables égales. Les simulations ont été recalculées indépendamment (1 000 scénarios chacune)."
         : "Each scenario below corresponds to claiming at that age, all other variables equal. Simulations were recalculated independently (1,000 scenarios each).")
      + '</p>' +
      buildCPPTimingBlock() +
      aiSlot("cpp_timing_obs", "") + '</section>';
  }

  // ── Section 7: Analyse meltdown ─────────────────────────
  var sec6 = '<section>' + secH(nextSec(), fr ? "Analyse de robustesse : scénarios de réduction" : "Robustness Analysis: Reduction Scenarios", "") +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
    (fr ? "Cette section montre l'impact d'une réduction des dépenses sur le taux de réussite. Chaque scénario a été simulé indépendamment (1 000 scénarios)."
       : "This section shows the impact of spending reductions on the success rate. Each scenario was simulated independently (1,000 scenarios).")
    + '</p>' +
    buildMeltdownBlock() +
    aiSlot("meltdown_obs", fr ? "Cette analyse compare votre revenu cible actuel avec des scénarios de réduction. " + (D.meltIsBase ? "Votre revenu est déjà au niveau du premier palier fédéral." : "Une réduction à " + fmtN(D.meltTarget, fr) + " $ par an pourrait " + (D.melt1Succ !== null && D.melt1Succ > D.successPct ? "améliorer" : "modifier") + " le taux de réussite.") : "This analysis compares your current target income with reduction scenarios. " + (D.meltIsBase ? "Your income is already at the first federal bracket level." : "A reduction to " + fmtN(D.meltTarget, fr) + " per year could " + (D.melt1Succ !== null && D.melt1Succ > D.successPct ? "improve" : "change") + " the success rate.")) + '</section>';

  // ── Section 8: Répartition et glissement ────────────────
  var sec7 = '<section>' + secH(nextSec(), fr ? "Répartition d'actifs et glissement" : "Asset Allocation & Glide Path", "") +
    '<div class="stats-grid">' +
    statBox(fr ? "Actions (départ)" : "Equities (start)", Math.round(D.allocR * 100) + " %", "") +
    statBox(fr ? "Obligations (départ)" : "Bonds (start)", Math.round((1 - D.allocR) * 100) + " %", "") +
    statBox(fr ? "Actions (fin)" : "Equities (end)", Math.round(D.endAllocR * 100) + " %", fr ? "À " + D.deathAge + " ans" : "At age " + D.deathAge) +
    statBox(fr ? "Glissement annuel" : "Annual glide", (D.glideSpd > 0 ? "−" + Math.round(D.glideSpd * 100) + " %" : fr ? "Non actif" : "Not active"), "") +
    '</div>' +
    '<div class="chart-wrap">' + buildGlideChart() +
    '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:var(--green);"></div> ' + (fr ? "Actions" : "Equities") + '</div><div class="legend-item"><div class="legend-dot" style="background:var(--blue);"></div> ' + (fr ? "Obligations" : "Bonds") + '</div></div></div>' +
    '</section>';

  // ── Section 9: Profil de dépenses ───────────────────────
  var sec8 = '<section>' + secH(nextSec(), fr ? "Profil de dépenses — courbe naturelle" : "Spending Profile — Natural Curve", "") +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:12px;">' +
    (fr ? "Les projections intègrent une évolution naturelle des dépenses : phase active, phase modérée, phase calme. Cette modélisation reflète les données de consommation réelle des retraités canadiens."
       : "Projections incorporate a natural spending evolution: active phase, moderate phase, quiet phase. This modeling reflects actual Canadian retiree consumption data.")
    + '</p>' +
    '<div class="chart-wrap">' + buildSmileChart() + '</div>' +
    '<table class="data-table"><tbody>' +
    '<tr><td><strong>' + (fr ? "Phase active (jusqu'à " + D.smileSlAge + " ans)" : "Active phase (to age " + D.smileSlAge + ")") + '</strong></td><td>' + Math.round(D.goP * 100) + ' % du revenu cible</td></tr>' +
    '<tr><td><strong>' + (fr ? "Phase modérée (" + D.smileSlAge + "–" + D.smileNoAge + " ans)" : "Moderate phase (" + D.smileSlAge + "–" + D.smileNoAge + ")") + '</strong></td><td>' + Math.round(D.slP * 100) + ' % du revenu cible</td></tr>' +
    '<tr><td><strong>' + (fr ? "Phase calme (après " + D.smileNoAge + " ans)" : "Quiet phase (after " + D.smileNoAge + ")") + '</strong></td><td>' + Math.round(D.noP * 100) + ' % du revenu cible</td></tr>' +
    '</tbody></table>' +
    '</section>';

  // ── Section 10: Distribution de longévité ───────────────
  var sec9 = '<section>' + secH(nextSec(), fr ? "Distribution de longévité" : "Longevity Distribution", "") +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
    (fr ? "La durée de vie simulée varie selon les probabilités de survie tirées des tables de mortalité CPM-2023 (Institut canadien des actuaires). Chaque simulation utilise une durée de vie différente, reflétant l'incertitude réelle."
       : "Simulated lifespan varies according to survival probabilities from CPM-2023 mortality tables (Canadian Institute of Actuaries). Each simulation uses a different lifespan, reflecting real uncertainty.")
    + '</p>' +
    '<div class="stats-grid">' +
    statBox(fr ? "Espérance médiane" : "Median life expectancy", D.medDeath + (fr ? " ans" : " yrs"), D.sex === "F" ? (fr ? "Femme" : "Female") : (fr ? "Homme" : "Male")) +
    statBox(fr ? "Borne déterministe" : "Deterministic ceiling", D.deathAge + (fr ? " ans" : " yrs"), fr ? "Scénario de prudence" : "Prudent scenario") +
    statBox(fr ? "Taux d'épuisement" : "Depletion rate", D.ruinPct + " %", fr ? "Simulations où le capital s'épuise" : "Scenarios where capital depletes") +
    (D.medRuin < 999 ? statBox(fr ? "Âge médian d'épuisement" : "Median depletion age", D.medRuin + (fr ? " ans" : " yrs"), fr ? "Si épuisement survient" : "When depletion occurs") : "") +
    '</div>' +
    aiSlot("longevity_context", fr ? "La durée de vie simulée varie d'un scénario à l'autre selon les tables de mortalité canadiennes CPM-2023. L'espérance médiane est de " + D.medDeath + " ans" + (D.sex === "F" ? " pour une femme" : " pour un homme") + " de " + D.age + " ans." : "Simulated lifespan varies across scenarios based on Canadian CPM-2023 mortality tables. Median life expectancy is " + D.medDeath + " years for a " + D.age + "-year-old " + (D.sex === "F" ? "woman" : "man") + ".") + '</section>';

  // ── Section 11: Succession ───────────────────────────────
  var sec10 = '<section>' + secH(nextSec(), fr ? "Portrait successoral" : "Estate Overview", "") +
    buildSuccessionTable() +
    aiSlot("estate_obs", fr ? "Le patrimoine médian projeté à " + D.deathAge + " ans est de " + fmtN(D.medEstate, fr) + " $. Dans le scénario pessimiste (10 % des simulations), il serait de " + fmtN(D.p10Estate, fr) + " $." : "Median projected estate at age " + D.deathAge + " is " + fmtN(D.medEstate, fr) + ". In the pessimistic scenario (10% of simulations), it would be " + fmtN(D.p10Estate, fr) + ".") + '</section>';

  // ── Priorities / Leviers identifiés ────────────────────
  var levers = [];
  // 1. Spending reduction (if success < 85 and meltdown shows improvement)
  if (succPct < 85 && D.melt1Succ !== null && D.melt1Succ > succPct) {
    var delta1 = D.melt1Succ - succPct;
    levers.push({ name: fr ? "Réduire le revenu cible" : "Reduce target income",
      detail: fr ? fmtN(D.retIncome, fr) + " $ → " + fmtN(D.meltTarget, fr) + " $ (+" + delta1 + " pts)" : fmtN(D.retIncome, fr) + " → " + fmtN(D.meltTarget, fr) + " (+" + delta1 + " pts)",
      impact: delta1, color: "#2A8C46",
      why: fr ? "La réduction au premier palier fédéral pourrait améliorer le taux de réussite de " + delta1 + " points." : "Reducing to the first federal bracket could improve the success rate by " + delta1 + " points." });
  }
  // 2. CPP/QPP timing (if not already claiming and one option is better)
  if (!D.alreadyClaiming && D.mc60Succ !== null) {
    var cppOptions = [{age:60,pct:D.mc60Succ},{age:65,pct:D.mc65Succ},{age:70,pct:D.mc70Succ}].filter(function(o){return o.pct !== null;});
    var bestCPP = cppOptions.reduce(function(a,b){return b.pct > a.pct ? b : a;});
    var currentCPP = cppOptions.find(function(o){return o.age === D.qppAge;});
    if (bestCPP && currentCPP && bestCPP.pct > currentCPP.pct) {
      var deltaCPP = bestCPP.pct - currentCPP.pct;
      levers.push({ name: fr ? "Reporter " + fr_govSingle + " à " + bestCPP.age + " ans" : "Defer " + fr_govSingle + " to age " + bestCPP.age,
        detail: fr ? currentCPP.pct + " % → " + bestCPP.pct + " % (+" + deltaCPP + " pts)" : currentCPP.pct + "% → " + bestCPP.pct + "% (+" + deltaCPP + " pts)",
        impact: deltaCPP, color: "#4680C0",
        why: fr ? "Reporter la demande à " + bestCPP.age + " ans pourrait bonifier les prestations et améliorer la durabilité." : "Deferring to age " + bestCPP.age + " could increase benefits and improve sustainability." });
    }
  }
  // 3. Spending flexibility (if not active)
  if (!D.gkActive) {
    levers.push({ name: fr ? "Activer la flexibilité des dépenses" : "Enable spending flexibility",
      detail: fr ? "Ajustements automatiques selon les marchés" : "Automatic adjustments based on markets",
      impact: 5, color: "#C4944A",
      why: fr ? "Les règles de flexibilité permettent au portefeuille de s\u2019adapter aux baisses de marché en réduisant temporairement les retraits." : "Spending flexibility rules allow the portfolio to adapt to market downturns by temporarily reducing withdrawals." });
  }
  // 4. Allocation shift (if equity allocation very high or very low)
  if (D.allocR > 0.65) {
    levers.push({ name: fr ? "Réduire l\u2019exposition aux actions" : "Reduce equity exposure",
      detail: Math.round(D.allocR * 100) + " % → " + Math.max(50, Math.round(D.allocR * 100) - 15) + " %",
      impact: 3, color: "#4680C0",
      why: fr ? "Une allocation de " + Math.round(D.allocR * 100) + " % en actions expose le portefeuille au risque de séquence dans les premières années de retrait." : "A " + Math.round(D.allocR * 100) + "% equity allocation exposes the portfolio to sequence-of-returns risk in early withdrawal years." });
  } else if (D.allocR < 0.35) {
    levers.push({ name: fr ? "Augmenter l\u2019exposition aux actions" : "Increase equity exposure",
      detail: Math.round(D.allocR * 100) + " % → " + Math.min(50, Math.round(D.allocR * 100) + 15) + " %",
      impact: 3, color: "#2A8C46",
      why: fr ? "Une allocation de " + Math.round(D.allocR * 100) + " % en actions pourrait limiter la croissance nécessaire pour un horizon de " + (D.deathAge - D.age) + " ans." : "A " + Math.round(D.allocR * 100) + "% equity allocation may limit the growth needed for a " + (D.deathAge - D.age) + "-year horizon." });
  }
  // 5. Debt payoff (if debts exist)
  if (D.debtBal > 0) {
    levers.push({ name: fr ? "Rembourser les dettes" : "Pay off debts",
      detail: fmtN(D.debtBal, fr) + " $",
      impact: 4, color: "#CC4444",
      why: fr ? "Le remboursement libérerait " + fmtN(D.debtBal, fr) + " $ de capital et réduirait la pression sur les retraits." : "Paying off debts would free " + fmtN(D.debtBal, fr) + " of capital and reduce withdrawal pressure." });
  }
  // Sort by impact descending, crown the king
  levers.sort(function(a,b){ return b.impact - a.impact; });
  var secLeviers = '';
  if (levers.length > 0) {
    secLeviers = '<section>' + secH(nextSec(), fr ? "Leviers identifiés" : "Identified Levers", "") +
      '<p style="color:#666;font-size:14px;margin-bottom:16px;">' +
      (fr ? "Ces leviers sont classés par impact estimé sur le taux de réussite. Ils ne constituent pas des recommandations — ils illustrent les variables qui pourraient avoir le plus d\u2019effet selon les simulations."
         : "These levers are ranked by estimated impact on the success rate. They are not recommendations — they illustrate the variables that could have the most effect according to simulations.") + '</p>' +
      '<div style="background:#FFF9F0;border:2px solid #C4944A;border-radius:8px;padding:20px 24px;margin:24px 0">' +
      levers.map(function(lev, i){
        var isCrown = i === 0;
        return '<div style="display:flex;gap:14px;align-items:flex-start;padding:16px 18px;margin-bottom:10px;background:' + (isCrown ? 'linear-gradient(135deg,#1A1208 0%,#2D2010 100%)' : '#FDFBF7') + ';border-radius:12px;border:1px solid ' + (isCrown ? '#C4944A' : '#E8E0D4') + ';">' +
          '<div style="width:32px;height:32px;border-radius:50%;background:' + (isCrown ? '#C4944A' : lev.color) + ';color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">' + (i + 1) + '</div>' +
          '<div style="flex:1;">' +
          '<div style="font-size:15px;font-weight:700;color:' + (isCrown ? '#C4944A' : '#1A1208') + ';">' + lev.name + (isCrown ? ' <span style="font-size:11px;background:#C4944A;color:#fff;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600;">' + (fr ? "impact principal" : "primary impact") + '</span>' : '') + '</div>' +
          '<div style="font-size:13px;color:' + (isCrown ? '#E8E0D4' : '#666') + ';margin-top:4px;">' + lev.detail + '</div>' +
          '<div style="font-size:13px;color:' + (isCrown ? '#ccc' : '#888') + ';margin-top:4px;font-style:italic;">' + lev.why + '</div>' +
          '</div></div>';
      }).join("") +
      '</div>' +
      '<p style="font-size:12px;color:#999;margin-top:12px;font-style:italic;">' +
      (fr ? "Ces scénarios ne sont pas des recommandations. Ils illustrent l\u2019effet mathématique de chaque variable selon les simulations."
         : "These scenarios are not recommendations. They illustrate the mathematical effect of each variable according to simulations.") + '</p>' +
      '</section>';
  }

  // ── Strengths & Risks (rendered BEFORE observations in output) ─
  var strengths = [];
  var risks = [];
  // Build strengths
  if (succPct >= 75) strengths.push(fr ? "Taux de réussite élevé (" + succPct + " %) — le plan pourrait résister dans la majorité des scénarios." : "High success rate (" + succPct + "%) — the plan could hold in the majority of scenarios.");
  if (D.govCoveragePct >= 0.50) strengths.push(fr ? "Les revenus garantis couvrent " + Math.round(D.govCoveragePct * 100) + " % du revenu cible — forte base de revenus stables." : "Guaranteed income covers " + Math.round(D.govCoveragePct * 100) + "% of target — strong stable income base.");
  if (D.initialRate <= 4) strengths.push(fr ? "Taux de retrait initial de " + fmtPctRaw(D.initialRate) + " % — historiquement soutenable." : "Initial withdrawal rate of " + fmtPctRaw(D.initialRate) + "% — historically sustainable.");
  if (D.gkActive) strengths.push(fr ? "Règles de flexibilité actives — le portefeuille peut s\u2019adapter aux marchés." : "Spending flexibility rules active — portfolio can adapt to markets.");
  if (D.medWealth > 0) strengths.push(fr ? "Patrimoine médian positif à " + D.deathAge + " ans (" + fmtN(D.medWealth, fr) + " $)." : "Positive median wealth at age " + D.deathAge + " (" + fmtN(D.medWealth, fr) + ").");
  // Build risks
  if (succPct < 75) risks.push(fr ? "Taux de réussite de " + succPct + " % — des ajustements pourraient être nécessaires." : "Success rate of " + succPct + "% — adjustments may be needed.");
  if (D.initialRate > 4) risks.push(fr ? "Taux de retrait initial de " + fmtPctRaw(D.initialRate) + " % — au-dessus du seuil de 4 % historiquement soutenable." : "Initial withdrawal rate of " + fmtPctRaw(D.initialRate) + "% — above the historically sustainable 4% threshold.");
  if (D.govCoveragePct < 0.35) risks.push(fr ? "Les revenus garantis ne couvrent que " + Math.round(D.govCoveragePct * 100) + " % du revenu cible — dépendance élevée au portefeuille." : "Guaranteed income covers only " + Math.round(D.govCoveragePct * 100) + "% of target — high portfolio dependency.");
  if (D.ruinPct > 15) risks.push(fr ? "Risque d\u2019épuisement dans " + D.ruinPct + " % des scénarios." : "Depletion risk in " + D.ruinPct + "% of scenarios.");
  if (D.debtBal > 0) risks.push(fr ? "Solde de dettes de " + fmtN(D.debtBal, fr) + " $ — pression supplémentaire sur les retraits." : "Debt balance of " + fmtN(D.debtBal, fr) + " — additional pressure on withdrawals.");
  if (!D.gkActive) risks.push(fr ? "Dépenses fixes — aucune flexibilité modélisée en cas de baisse des marchés." : "Fixed spending — no flexibility modelled in case of market downturn.");
  // Ensure at least 1 of each
  if (strengths.length === 0) strengths.push(fr ? "Le portefeuille est modélisé avec des hypothèses prudentes (queues épaisses)." : "The portfolio is modelled with conservative assumptions (fat tails).");
  if (risks.length === 0) risks.push(fr ? "Aucun risque majeur identifié dans les paramètres actuels." : "No major risk identified in current parameters.");
  var secSR = '<section>' + secH(nextSec(), fr ? "Forces et risques identifiés" : "Identified Strengths & Risks", "") +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">' +
    '<div><h3 style="font-size:14px;font-weight:700;color:#2A8C46;margin-bottom:12px;">' + (fr ? "Forces" : "Strengths") + '</h3>' +
    strengths.map(function(s){ return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:#333;line-height:1.6;"><span style="color:#2A8C46;flex-shrink:0;font-weight:700;">+</span><span>' + s + '</span></div>'; }).join("") +
    '</div><div><h3 style="font-size:14px;font-weight:700;color:#CC4444;margin-bottom:12px;">' + (fr ? "Risques" : "Risks") + '</h3>' +
    risks.map(function(r){ return '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;font-size:13px;color:#333;line-height:1.6;"><span style="color:#CC4444;flex-shrink:0;font-weight:700;">−</span><span>' + r + '</span></div>'; }).join("") +
    '</div></div></section>';

  // ── Observations complémentaires ──────────────────────
  var hasObs = (ai && ai.obs_1 && ai.obs_1.trim()) || (ai && ai.obs_2 && ai.obs_2.trim()) || (ai && ai.obs_3 && ai.obs_3.trim());
  var sec11 = hasObs ? '<section>' + secH(nextSec(), fr ? "Observations complémentaires" : "Additional Observations", "") +
    aiSlot("obs_1", fr ? "Le taux de retrait initial de " + fmtPctRaw(D.initialRate) + " % représente la pression annuelle exercée sur le portefeuille pour combler l\u2019écart entre les revenus garantis et le revenu cible." : "The initial withdrawal rate of " + fmtPctRaw(D.initialRate) + "% represents the annual pressure on the portfolio to fill the gap between guaranteed income and target spending.") +
    aiSlot("obs_2", fr ? "La répartition entre actions (" + Math.round(D.allocR * 100) + " %) et obligations (" + Math.round((1 - D.allocR) * 100) + " %) évolue graduellement vers une posture plus prudente avec l\u2019âge." : "The split between equities (" + Math.round(D.allocR * 100) + "%) and bonds (" + Math.round((1 - D.allocR) * 100) + "%) gradually shifts toward a more conservative posture with age.") +
    aiSlot("obs_3", "") + '</section>' : "";

  // ── Closing frame — recontextualization before methodology ─
  var closingFrame = '<div style="background:linear-gradient(135deg,#1A1208 0%,#2D2010 100%);color:#fff;border-radius:14px;padding:28px;margin:24px 0;">' +
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#C4944A;margin-bottom:12px;font-weight:600;">' +
    (fr ? "En résumé" : "In summary") + '</div>' +
    '<div style="font-size:15px;line-height:1.8;color:#E8E0D4;">' +
    (succPct >= 85
      ? (fr ? "Les simulations suggèrent que votre plan de décaissement pourrait résister dans " + succPct + " % des scénarios. Avec un taux de retrait initial de " + fmtPctRaw(D.initialRate) + " % et des revenus garantis couvrant " + Math.round(D.govCoveragePct * 100) + " % du revenu cible, la structure apparaît solide. Ces résultats restent des projections — un suivi régulier permettrait de valider leur trajectoire."
           : "Simulations suggest your drawdown plan could hold in " + succPct + "% of scenarios. With an initial withdrawal rate of " + fmtPctRaw(D.initialRate) + "% and guaranteed income covering " + Math.round(D.govCoveragePct * 100) + "% of target, the structure appears solid. These remain projections — regular monitoring would help validate their trajectory.")
      : succPct >= 50
      ? (fr ? "Votre plan de décaissement montre un taux de réussite de " + succPct + " %. L\u2019écart entre le revenu cible et les revenus garantis (" + mirrorGap + ") représente la pression principale sur le portefeuille." + (D.gkActive ? " Les règles de flexibilité actives pourraient aider à absorber les chocs de marché." : " L\u2019absence de flexibilité dans les dépenses augmente la sensibilité aux premières années de retrait.") + " Les sections précédentes identifient les leviers qui pourraient influencer ce résultat."
           : "Your drawdown plan shows a " + succPct + "% success rate. The gap between target income and guaranteed income (" + mirrorGap + ") represents the main pressure on the portfolio." + (D.gkActive ? " Active spending flexibility rules could help absorb market shocks." : " The lack of spending flexibility increases sensitivity to early withdrawal years.") + " Previous sections identify the levers that could influence this outcome.")
      : (fr ? "Les simulations indiquent un taux de réussite de " + succPct + " %. Le portefeuille subit une pression importante avec un taux de retrait de " + fmtPctRaw(D.initialRate) + " %. " + (D.ruinPct > 0 && D.medRuin < 999 ? "L\u2019âge médian d\u2019épuisement est estimé à " + D.medRuin + " ans. " : "") + "Les scénarios de réduction (section robustesse) et le timing des prestations pourraient offrir des pistes d\u2019ajustement."
           : "Simulations indicate a " + succPct + "% success rate. The portfolio faces significant pressure with a " + fmtPctRaw(D.initialRate) + "% withdrawal rate. " + (D.ruinPct > 0 && D.medRuin < 999 ? "Median depletion age is estimated at " + D.medRuin + ". " : "") + "Reduction scenarios (robustness section) and benefit timing could offer adjustment paths."))
    + '</div></div>';

  // ── Methodology ───────────────────────────────────────
  var sec12 = '<section>' + secH(nextSec(), fr ? "Hypothèses et méthodologie" : "Assumptions & Methodology", "") +
    '<table class="data-table"><tbody>' +
    '<tr><td>' + (fr ? "Simulations" : "Simulations") + '</td><td>' + fmtN(D.nSim, fr) + '</td></tr>' +
    '<tr><td>' + (fr ? "Rendement espéré — actions" : "Expected return — equities") + '</td><td>' + (D.eqRet * 100).toFixed(1) + ' %</td></tr>' +
    '<tr><td>' + (fr ? "Rendement espéré — obligations" : "Expected return — bonds") + '</td><td>' + (D.bndRet * 100).toFixed(1) + ' %</td></tr>' +
    '<tr><td>' + (fr ? "Inflation" : "Inflation") + '</td><td>' + (D.inf * 100).toFixed(1) + ' %</td></tr>' +
    '<tr><td>' + (fr ? "Répartition actions / obligations (départ)" : "Equities / bonds split (start)") + '</td><td>' + Math.round(D.allocR * 100) + " % / " + Math.round((1 - D.allocR) * 100) + ' %</td></tr>' +
    '<tr><td>' + (fr ? "Glissement annuel (réduction des actions)" : "Annual glide (equity reduction)") + '</td><td>' + (D.glideSpd > 0 ? Math.round(D.glideSpd * 100) + " %/an" : (fr ? "Non actif" : "Not active")) + '</td></tr>' +
    '<tr><td>' + (fr ? "Mortalité stochastique" : "Stochastic mortality") + '</td><td>' + (fr ? "Oui — tables CPM-2023" : "Yes — CPM-2023 tables") + '</td></tr>' +
    '<tr><td>' + (fr ? "Distribution des rendements" : "Return distribution") + '</td><td>' + (fr ? "t-Student (df=5) — queues épaisses" : "t-Student (df=5) — fat tails") + '</td></tr>' +
    '<tr><td>' + (fr ? "Stratégie de retrait" : "Withdrawal strategy") + '</td><td>' + (fr ? "Optimisation fiscale annuelle" : "Annual tax optimization") + '</td></tr>' +
    '<tr><td>' + (fr ? "Règles de flexibilité" : "Flexibility rules") + '</td><td>' + (D.gkActive ? (fr ? "Actives (ajustements automatiques)" : "Active (automatic adjustments)") : (fr ? "Non actives (dépenses fixes)" : "Not active (fixed spending)")) + '</td></tr>' +
    '</tbody></table>' +
    '<div style="margin-top:20px;padding:16px 18px;background:#F8F4EE;border-radius:10px;border:1px solid #E8E0D4;">' +
    '<h3 style="font-size:14px;font-weight:700;color:#1A1208;margin-bottom:10px;">' + (fr ? "Comment lire ce bilan" : "How to read this assessment") + '</h3>' +
    '<div style="font-size:13px;color:#666;line-height:1.7;">' +
    '<p style="margin-bottom:8px;">' + (fr
      ? "La <strong>note de durabilité</strong> (A+ à F) indique le pourcentage de scénarios simulés dans lesquels votre portefeuille pourrait durer toute la retraite. Un taux de 75 % signifie que dans 3 scénarios sur 4, le capital pourrait suffire."
      : "The <strong>sustainability grade</strong> (A+ to F) indicates the percentage of simulated scenarios in which your portfolio could last through retirement. A 75% rate means that in 3 out of 4 scenarios, capital could be sufficient.") + '</p>' +
    '<p style="margin-bottom:8px;">' + (fr
      ? "Le <strong>patrimoine médian</strong> correspond au résultat du scénario central — la moitié des simulations se terminent au-dessus, l\u2019autre moitié en dessous."
      : "The <strong>median wealth</strong> corresponds to the central scenario result — half of simulations end above, the other half below.") + '</p>' +
    '<p>' + (fr
      ? "Les fourchettes <strong>P10–P90</strong> encadrent les résultats probables : 80 % des scénarios se situent dans cette plage."
      : "The <strong>P10–P90</strong> ranges bracket likely outcomes: 80% of scenarios fall within this range.") + '</p>' +
    '</div></div>' +
    '</section>';

  // ── Disclaimer ───────────────────────────────────────────
  var disclaimer = '<div class="disclaimer-section">' +
    '<h3>' + (fr ? "Avertissements importants" : "Important Disclaimers") + '</h3>' +
    '<p>' + (fr
      ? "Ce bilan est fourni à titre informatif et éducatif seulement. Il ne constitue pas un avis financier, fiscal ou juridique personnalisé. Les résultats sont des projections probabilistes basées sur des hypothèses de modélisation qui pourraient ne pas refléter l'évolution réelle des marchés, de la fiscalité ou de votre situation personnelle."
      : "This assessment is provided for informational and educational purposes only. It does not constitute personalized financial, tax, or legal advice. Results are probabilistic projections based on modelling assumptions that may not reflect actual market performance, taxation, or personal circumstances.") + '</p>' +
    '<p>' + (fr
      ? "Tout écart entre les hypothèses retenues et la réalité pourrait modifier significativement les résultats. Les rendements passés ne garantissent pas les rendements futurs. L'utilisation de cet outil ne crée aucune relation client avec BuildFi Technologies inc."
      : "Any deviation between assumed and actual conditions could materially affect results. Past performance does not guarantee future results. Using this tool does not create a client relationship with BuildFi Technologies inc.") + '</p>' +
    '<p style="margin-top:12px;font-size:12px;">BuildFi Technologies inc. | support@buildfi.ca | ' +
    (fr ? "Produit numérique — livraison instantanée" : "Digital product — instant delivery") + '</p>' +
    '</div>';

  // ── Full document ────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${fr ? "Horizon — buildfi.ca" : "Horizon — buildfi.ca"}</title>
<style>${css}</style>
</head>
<body>
<div class="container">

  <div class="report-header">
    <div class="logo"><svg width="120" height="32" viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><text x="0" y="26" font-family="'DM Sans','Helvetica Neue',sans-serif" font-size="28" font-weight="700" fill="#1A1208">build<tspan fill="#C4944A">fi</tspan></text></svg></div>
    <div class="tier-badge">${fr ? "Horizon" : "Horizon"}</div>
    <p style="color:var(--gray);font-size:13px;margin-top:12px;">${new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA", {year:"numeric",month:"long",day:"numeric"})}</p>
  </div>

  <div style="background:#FDFBF7;border:1px solid #E8E0D0;border-radius:6px;padding:12px 16px;margin:12px 0 20px;font-size:13px;color:#555;line-height:1.7">
    <strong>${fr ? "Comment lire ce bilan" : "How to read this assessment"}</strong><br>
    ${fr
      ? "Ce bilan projette la durabilité de vos revenus de retraite à travers " + (D.nSim || 5000).toLocaleString("fr-CA") + " scénarios économiques différents — rendements variables, inflation, longévité. Le taux de réussite indique dans combien de ces scénarios votre revenu pourrait couvrir vos dépenses jusqu\u2019à la fin."
      : "This assessment projects the sustainability of your retirement income across " + (D.nSim || 5000).toLocaleString("en-CA") + " different economic scenarios — variable returns, inflation, longevity. The success rate indicates in how many of these scenarios your income could cover expenses to the end."}
  </div>

  ${sec1}
  ${succPct < 50 && secLeviers ? '<div style="background:#FDF5F5;border:1px solid #E8C0C0;border-radius:12px;padding:18px 22px;margin:0 0 24px;"><div style="font-size:14px;line-height:1.7;color:#333;">' + (fr ? '<strong style="color:#CC4444;">Attention :</strong> Le taux de réussite actuel de ' + succPct + ' % indique que des ajustements pourraient être nécessaires. Les <strong>leviers identifiés</strong> plus bas dans ce bilan montrent les variables qui auraient le plus d\u2019impact.' : '<strong style="color:#CC4444;">Attention:</strong> The current ' + succPct + '% success rate indicates adjustments may be needed. The <strong>identified levers</strong> later in this assessment show the variables that could have the most impact.') + '</div></div>' : ''}
  ${sec2}
  ${sec3}
  ${sec4}
  ${sec4b}
  ${sec5}
  ${sec6}
  ${sec7}
  ${sec8}
  ${sec9}
  ${sec10}
  ${secLeviers}
  ${secSR}
  ${sec11}
  ${closingFrame}
  ${sec12}
  ${disclaimer}

</div>
</body>
</html>`;
}

// ── Strings helper (bilingual labels used in multiple places) ──────────
function strings(fr, D) {
  return { fr: fr, D: D };
}
