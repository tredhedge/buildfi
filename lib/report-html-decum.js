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

var REPORT_VERSION_DECUM = 'v1';

// ── Grade scale ──────────────────────────────────────────────────────
function gradeFromSucc(pct) {
  if (pct >= 95) return "A+";
  if (pct >= 85) return "A";
  if (pct >= 75) return "B+";
  if (pct >= 65) return "B";
  if (pct >= 55) return "C+";
  if (pct >= 45) return "C";
  if (pct >= 35) return "D";
  return "F";
}

function gradeColor(grade) {
  if (grade === "A+" || grade === "A") return "#2A8C46";
  if (grade === "B+" || grade === "B") return "#4A7FC1";
  if (grade === "C+" || grade === "C") return "#E0882A";
  return "#CC4444";
}

// ── Number helpers ───────────────────────────────────────────────────
function fmt(n) { return Math.round(n).toLocaleString("fr-CA"); }
function fmtEn(n) { return Math.round(n).toLocaleString("en-CA"); }
function fmtN(n, fr) { return fr ? fmt(n) : fmtEn(n); }
function fmtPct(n) { return (Math.round(n * 10) / 10).toString() + " %"; }
function fmtPctRaw(n) { return Math.round(n * 10) / 10; }

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
  if (rpt.qppMonthly) qppMonthly = rpt.qppMonthly;
  if (rpt.oasMonthly) oasMonthly = rpt.oasMonthly;
  if (rpt.penMonthly) penMonthly = rpt.penMonthly;
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
      (p.cRrspBal || 0) + (p.cTfsaBal || 0) + (p.cNrBal || 0),
    retBal: retBal,
    medWealth: medWealth, p10Wealth: p10Wealth, p25Wealth: p25Wealth,
    p75Wealth: p75Wealth, p90Wealth: p90Wealth,
    medEstate: medEstate, p10Estate: p10Estate, p25Estate: p25Estate,
    // Income
    retIncome: retIncome, retIncomeMonthly: retIncomeMonthly,
    qppMonthly: qppMonthly, oasMonthly: oasMonthly, penMonthly: penMonthly,
    govMonthly: govMonthly, govCoveragePct: govCoveragePct,
    initialWithdrawal: initialWithdrawal, initialRate: initialRate,
    cPenMonthly: rpt.cPenMonthly || 0,
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
  function escHtml(s) {
    return (s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
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
      '<polyline points="' + bndPts + '" fill="none" stroke="#4A7FC1" stroke-width="2.5" stroke-dasharray="5,3"/>' +
      '<text x="' + (PAD_L + chartW + 4) + '" y="' + yp(endR) + '" font-size="9" fill="#2A8C46" dominant-baseline="middle">' + Math.round(endR * 100) + '%</text>' +
      '<text x="' + (PAD_L + chartW + 4) + '" y="' + yp(1 - endR) + '" font-size="9" fill="#4A7FC1" dominant-baseline="middle">' + Math.round((1 - endR) * 100) + '%</text>' +
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
        : "The desired income (" + fmtN(D.retIncome, fr) + ") is already at or below the first federal bracket. Additional reduction analysis is not applicable.")
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
      '<th>' + (fr ? "Revenu brut" : "Gross income") + '</th>' +
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
      '<tr><td>' + (fr ? "Scénario optimiste (75 %)" : "Optimistic scenario (75%)") + '</td><td>' + fmtN(D.p25Estate > D.medEstate ? D.p25Estate : D.medEstate, fr) + ' $</td></tr>' +
      '<tr style="background:#F8F4EE;"><td><strong>' + (fr ? "Préférence déclarée" : "Declared preference") + '</strong></td><td><strong>' + prefLabel + '</strong></td></tr>' +
      '</tbody></table>';
  }

  // ── CSS ──────────────────────────────────────────────────
  var css = `
:root{--gold:#C4944A;--dark:#1A1208;--bg:#FEFCF9;--card:#F8F4EE;--border:#E8E0D4;--green:#2A8C46;--blue:#4A7FC1;--red:#CC4444;--gray:#666;}
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
.ai-narration{background:var(--card);border-left:3px solid var(--gold);padding:14px 16px;border-radius:0 8px 8px 0;font-size:15px;color:#333;line-height:1.7;margin:16px 0;font-style:italic;}
p{margin-bottom:12px;font-size:15px;color:#333;}
.prog-bg{background:#eee;border-radius:4px;height:6px;margin-top:4px;}
.prog-fill{height:6px;border-radius:4px;transition:width 0.3s;}
.data-table{width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;}
.data-table th{background:var(--dark);color:#fff;font-weight:600;padding:10px 12px;text-align:left;font-size:13px;}
.data-table td{padding:9px 12px;border-bottom:1px solid var(--border);}
.data-table tr:nth-child(even) td{background:var(--card);}
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

  // ── Section 1: Tableau de bord global ───────────────────
  var sec1 = '<section>' + secH("1", fr ? "Tableau de bord global" : "Global Dashboard", "") +
    '<div style="text-align:center;">' +
    '<div class="grade-card">' +
    '<div class="grade-label">' + (fr ? "Note de durabilité" : "Sustainability Grade") + '</div>' +
    '<div class="grade-letter" style="color:' + gColor + ';">' + grade + '</div>' +
    '<div class="grade-sub">' + (fr ? "Taux de réussite" : "Success rate") + ' : ' + succPct + ' %</div>' +
    '</div></div>' +
    '<div class="stats-grid">' +
    statBox(fr ? "Patrimoine total" : "Total wealth", fmtN(D.totalWealth, fr) + " $", fr ? "Au départ" : "At start") +
    statBox(fr ? "Patrimoine médian" : "Median wealth", fmtN(D.medWealth, fr) + " $", fr ? "À " + D.deathAge + " ans (réel)" : "At age " + D.deathAge + " (real)") +
    statBox(fr ? "Revenu garanti" : "Guaranteed income", fmtN(D.govMonthly, fr) + " $/mo", fr ? Math.round(D.govCoveragePct * 100) + " % de couverture" : Math.round(D.govCoveragePct * 100) + "% coverage") +
    statBox(fr ? "Retrait initial" : "Initial withdrawal", fmtPct(D.initialRate / 100), fr ? "Taux d'utilisation du portefeuille" : "Portfolio draw rate") +
    '</div>' +
    aiSlot("snapshot_intro", fr
      ? "Ce bilan analyse la durabilité de votre portefeuille en décaissement sur la base de " + D.nSim + " scénarios."
      : "This assessment analyzes your portfolio's sustainability in drawdown based on " + D.nSim + " scenarios.")
    + '</section>';

  // ── Section 2: Revenus garantis ─────────────────────────
  var govCovPct = Math.round(D.govCoveragePct * 100);
  var portfolioCovPct = Math.max(0, 100 - govCovPct);
  var sec2 = '<section>' + secH("2", fr ? "Mes revenus garantis" : "My Guaranteed Income", "") +
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
       : "Your guaranteed income covers " + govCovPct + "% of your target income of " + fmtN(D.retIncome, fr) + " per year.") +
    '</p></div>' +
    aiSlot("income_mix_obs", "") + '</section>';

  // ── Section 3: Durabilité du portefeuille ───────────────
  var fanChartSVG = buildFanChart();
  var sec3 = '<section>' + secH("3", fr ? "Durabilité du portefeuille" : "Portfolio Sustainability", "") +
    '<div class="highlight-block">' +
    '<div class="h-title">' + (fr ? "Patrimoine médian à " + D.deathAge + " ans (dollars d'aujourd'hui)" : "Median wealth at age " + D.deathAge + " (today's dollars)") + '</div>' +
    '<div class="h-val">' + fmtN(D.medWealth, fr) + ' $</div>' +
    '<div class="h-sub">' + (fr ? "P10 : " + fmtN(D.p10Wealth, fr) + " $ | P90 : " + fmtN(D.p90Wealth, fr) + " $" : "P10: " + fmtN(D.p10Wealth, fr) + " | P90: " + fmtN(D.p90Wealth, fr)) + '</div>' +
    '</div>' +
    (fanChartSVG ? '<div class="chart-wrap">' + fanChartSVG +
    '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:var(--gold);height:3px;"></div> ' + (fr ? "Médiane" : "Median") + '</div>' +
    '<div class="legend-item"><div class="legend-dot" style="background:rgba(196,148,74,0.3);width:20px;height:12px;border-radius:3px;"></div> ' + (fr ? "Fourchette P10–P90" : "P10–P90 range") + '</div></div></div>' : '') +
    '<h3 style="font-size:15px;font-weight:700;margin:20px 0 12px;">' + (fr ? "Projections quinquennales" : "Five-year projections") + '</h3>' +
    buildProjTable() +
    aiSlot("sequence_obs", "") + '</section>';

  // ── Section 4: Stratégie de décaissement ────────────────
  var wdOrder = [];
  if (D.isQC) {
    wdOrder = [
      { name: fr ? "Non enregistré" : "Non-registered", why: fr ? "Impôt sur les gains en capital seulement (50 % d'inclusion)" : "Capital gains tax only (50% inclusion)" },
      { name: fr ? "REER / FERR" : "RRSP / RRIF", why: fr ? "Imposable en totalité — defer aussi longtemps que possible" : "Fully taxable — defer as long as possible" },
      { name: fr ? "CÉLI" : "TFSA", why: fr ? "Croissance et retraits libres d'impôt — utiliser en dernier" : "Tax-free growth and withdrawals — use last" }
    ];
  } else {
    wdOrder = [
      { name: fr ? "Non enregistré" : "Non-registered", why: fr ? "Impôt sur les gains en capital seulement" : "Capital gains tax only" },
      { name: "RRSP / RRIF", why: fr ? "Entièrement imposable" : "Fully taxable" },
      { name: "TFSA", why: fr ? "Retraits sans impôt" : "Tax-free withdrawals" }
    ];
  }
  var sec4 = '<section>' + secH("4", fr ? "Stratégie de décaissement" : "Drawdown Strategy", "") +
    '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px;">' + (fr ? "Ordre optimal de décaissement" : "Optimal withdrawal order") + '</h3>' +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
    (fr ? "La stratégie utilisée (optimisation annuelle) analyse chaque dollar de retrait selon la situation fiscale de l'année."
       : "The strategy used (annual optimization) analyzes each withdrawal dollar based on the year's tax situation.")
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
    aiSlot("spending_flex_obs", "") + '</section>';

  // ── Section 5: Timing CPP/QPP ────────────────────────────
  var sec5 = "";
  if (!D.alreadyClaiming && D.mc60Succ !== null) {
    sec5 = '<section>' + secH("5", fr ? ("Timing " + fr_govSingle + " : 60, 65 ou 70 ans") : ("Timing " + fr_govSingle + ": 60, 65 or 70"), "") +
      '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
      (fr ? "Chaque scénario ci-dessous correspond à une demande au même âge, toutes autres variables égales. Les simulations ont été recalculées indépendamment (1 000 scénarios chacune)."
         : "Each scenario below corresponds to claiming at that age, all other variables equal. Simulations were recalculated independently (1,000 scenarios each).")
      + '</p>' +
      buildCPPTimingBlock() +
      aiSlot("cpp_timing_obs", "") + '</section>';
  }

  // ── Section 6: Analyse meltdown ─────────────────────────
  var sec6 = '<section>' + secH("6", fr ? "Analyse de robustesse : scénarios de réduction" : "Robustness Analysis: Reduction Scenarios", "") +
    '<p style="color:var(--gray);font-size:14px;margin-bottom:16px;">' +
    (fr ? "Cette section montre l'impact d'une réduction des dépenses sur le taux de réussite. Chaque scénario a été simulé indépendamment (1 000 scénarios)."
       : "This section shows the impact of spending reductions on the success rate. Each scenario was simulated independently (1,000 scenarios).")
    + '</p>' +
    buildMeltdownBlock() +
    aiSlot("meltdown_obs", "") + '</section>';

  // ── Section 7: Répartition et glissement ────────────────
  var sec7 = '<section>' + secH("7", fr ? "Répartition d'actifs et glissement" : "Asset Allocation & Glide Path", "") +
    '<div class="stats-grid">' +
    statBox(fr ? "Actions (départ)" : "Equities (start)", Math.round(D.allocR * 100) + " %", "") +
    statBox(fr ? "Obligations (départ)" : "Bonds (start)", Math.round((1 - D.allocR) * 100) + " %", "") +
    statBox(fr ? "Actions (fin)" : "Equities (end)", Math.round(D.endAllocR * 100) + " %", fr ? "À " + D.deathAge + " ans" : "At age " + D.deathAge) +
    statBox(fr ? "Glissement annuel" : "Annual glide", (D.glideSpd > 0 ? "−" + Math.round(D.glideSpd * 100) + " %" : fr ? "Non actif" : "Not active"), "") +
    '</div>' +
    '<div class="chart-wrap">' + buildGlideChart() +
    '<div class="legend"><div class="legend-item"><div class="legend-dot" style="background:var(--green);"></div> ' + (fr ? "Actions" : "Equities") + '</div><div class="legend-item"><div class="legend-dot" style="background:var(--blue);"></div> ' + (fr ? "Obligations" : "Bonds") + '</div></div></div>' +
    aiSlot("obs_2", "") + '</section>';

  // ── Section 8: Profil de dépenses ───────────────────────
  var sec8 = '<section>' + secH("8", fr ? "Profil de dépenses — courbe naturelle" : "Spending Profile — Natural Curve", "") +
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

  // ── Section 9: Distribution de longévité ────────────────
  var sec9 = '<section>' + secH("9", fr ? "Distribution de longévité" : "Longevity Distribution", "") +
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
    aiSlot("longevity_context", "") + '</section>';

  // ── Section 10: Succession ───────────────────────────────
  var sec10 = '<section>' + secH("10", fr ? "Portrait successoral" : "Estate Overview", "") +
    buildSuccessionTable() +
    aiSlot("estate_obs", "") + '</section>';

  // ── Section 11: Observations complémentaires ─────────────
  var hasObs1 = ai && ai.obs_1 && ai.obs_1.trim();
  var sec11 = hasObs1 ? '<section>' + secH("11", fr ? "Observations complémentaires" : "Additional Observations", "") +
    aiSlot("obs_1", "") + '</section>' : "";

  // ── Section 12: Hypothèses et méthodologie ──────────────
  var sec12 = '<section>' + secH(hasObs1 ? "12" : "11", fr ? "Hypothèses et méthodologie" : "Assumptions & Methodology", "") +
    '<table class="data-table"><tbody>' +
    '<tr><td>' + (fr ? "Simulations" : "Simulations") + '</td><td>' + fmtN(D.nSim, fr) + '</td></tr>' +
    '<tr><td>' + (fr ? "Rendement espéré — actions" : "Expected return — equities") + '</td><td>' + fmtPct(D.eqRet) + '</td></tr>' +
    '<tr><td>' + (fr ? "Rendement espéré — obligations" : "Expected return — bonds") + '</td><td>' + fmtPct(D.bndRet) + '</td></tr>' +
    '<tr><td>' + (fr ? "Inflation" : "Inflation") + '</td><td>' + fmtPct(D.inf) + '</td></tr>' +
    '<tr><td>' + (fr ? "Répartition actions / obligations (départ)" : "Equities / bonds split (start)") + '</td><td>' + Math.round(D.allocR * 100) + " % / " + Math.round((1 - D.allocR) * 100) + ' %</td></tr>' +
    '<tr><td>' + (fr ? "Glissement annuel (réduction des actions)" : "Annual glide (equity reduction)") + '</td><td>' + (D.glideSpd > 0 ? Math.round(D.glideSpd * 100) + " %/an" : (fr ? "Non actif" : "Not active")) + '</td></tr>' +
    '<tr><td>' + (fr ? "Mortalité stochastique" : "Stochastic mortality") + '</td><td>' + (fr ? "Oui — tables CPM-2023" : "Yes — CPM-2023 tables") + '</td></tr>' +
    '<tr><td>' + (fr ? "Distribution des rendements" : "Return distribution") + '</td><td>' + (fr ? "t-Student (df=5) — queues épaisses" : "t-Student (df=5) — fat tails") + '</td></tr>' +
    '<tr><td>' + (fr ? "Stratégie de retrait" : "Withdrawal strategy") + '</td><td>' + (fr ? "Optimisation fiscale annuelle" : "Annual tax optimization") + '</td></tr>' +
    '<tr><td>' + (fr ? "Règles de flexibilité" : "Flexibility rules") + '</td><td>' + (D.gkActive ? (fr ? "Actives (ajustements automatiques)" : "Active (automatic adjustments)") : (fr ? "Non actives (dépenses fixes)" : "Not active (fixed spending)")) + '</td></tr>' +
    '</tbody></table>' +
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
<title>${fr ? "Bilan Décaissement — buildfi.ca" : "Decumulation Assessment — buildfi.ca"}</title>
<style>${css}</style>
</head>
<body>
<div class="container">

  <div class="report-header">
    <div class="logo">build<span>fi</span></div>
    <div class="tier-badge">${fr ? "Bilan Décaissement" : "Decumulation Assessment"}</div>
    <p style="color:var(--gray);font-size:13px;margin-top:12px;">${new Date().toLocaleDateString(fr ? "fr-CA" : "en-CA", {year:"numeric",month:"long",day:"numeric"})}</p>
  </div>

  ${sec1}
  ${sec2}
  ${sec3}
  ${sec4}
  ${sec5}
  ${sec6}
  ${sec7}
  ${sec8}
  ${sec9}
  ${sec10}
  ${sec11}
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
