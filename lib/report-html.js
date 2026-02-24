// /lib/report-html.js
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Rapport Essentiel — HTML Renderer (SERVER-SIDE)
// ══════════════════════════════════════════════════════════════════════
// Mechanical 1:1 port from quiz-essentiel.html lines 2740-3034
// Source version: v11.12.9
// DO NOT modify layout, copy, sections, or SVG charts.
// Every section, every line of copy matches the validated source.
//
// Used by: /api/webhook → renderReportHTML() → Puppeteer → PDF
// ══════════════════════════════════════════════════════════════════════
/* eslint-disable */

import { translateToMC } from "./quiz-translator";
import { calcTax, runMC } from "./engine";

// ============================================================
// AUDIT GUARDRAILS: validate MC results before rendering
// ============================================================
function validateMC(mc, p) {
  var e = [];
  if (!mc || mc._placeholder) e.push("MC_NULL");
  else {
    if (mc.succ == null || isNaN(mc.succ) || mc.succ < 0 || mc.succ > 1) e.push("SUCC:" + mc.succ);
    if (!mc.medRevData || mc.medRevData.length === 0) e.push("REVDATA_EMPTY");
    if (mc.medF == null || isNaN(mc.medF)) e.push("MEDF:" + mc.medF);
  }
  if (p.retSpM <= 0) e.push("SPEND_ZERO");
  if (p.age >= p.retAge) e.push("ALREADY_RETIRED");
  return {valid:e.length===0, errors:e};
}

// ============================================================
// DATA ADAPTER: runMC output → report/AI data shape
// ============================================================
function extractReportData(mc, p) {
  var rd = mc.medRevData || [];
  var retRow = rd.find(function(r){return r.age >= p.retAge;}) || {};
  var qppM = Math.round((retRow.rrq || 0) / 12);
  var oasM = Math.round((retRow.psv || 0) / 12);
  var penMo = Math.round((retRow.pen || 0) / 12);
  var govM = qppM + oasM + penMo;
  var coverPct = p.retSpM > 0 ? Math.round(govM / p.retSpM * 100) : 0;
  var gapM = Math.max(0, p.retSpM - govM);
  var retBal = retRow ? Math.round((retRow.aRR||0) + (retRow.aTF||0) + (retRow.aNR||0) + (retRow.aDC||0)) : 0;
  var annualW = gapM * 12;
  var wdPct = retBal > 0 ? Math.round(annualW / retBal * 1000) / 10 : 99;
  var workRow = rd.find(function(r){return r.age === p.age;}) || {};
  var taxCurrEff = workRow.taxInc > 0 ? Math.round((workRow.tax||0) / workRow.taxInc * 100) : 0;
  var taxRetRow = rd.find(function(r){return r.age === p.retAge + 2;}) || retRow;
  var taxRetEff = taxRetRow && taxRetRow.taxInc > 0 ? Math.round((taxRetRow.tax||0) / taxRetRow.taxInc * 100) : 0;
  var taxInfo = calcTax(p.sal, 0, p.prov, 0);
  var margRate = taxInfo ? taxInfo.marginal / 100 : 0.30;
  var merW = (p.merR * p.rrsp + p.merT * p.tfsa + p.merN * p.nr) / Math.max(1, p.rrsp + p.tfsa + p.nr);
  var feeCost = Math.round(merW * retBal * (p.deathAge - p.retAge));
  var succPct = Math.round(mc.succ * 100);
  var grade;
  if (succPct >= 95) grade = "A+";
  else if (succPct >= 90) grade = "A";
  else if (succPct >= 85) grade = "A\u2212";
  else if (succPct >= 80) grade = "B+";
  else if (succPct >= 75) grade = "B";
  else if (succPct >= 70) grade = "B\u2212";
  else if (succPct >= 60) grade = "C+";
  else if (succPct >= 50) grade = "C";
  else if (succPct >= 40) grade = "D";
  else grade = "F";

  return {
    age:p.age, retAge:p.retAge, sex:p.sex, prov:p.prov, sal:p.sal,
    deathAge:p.deathAge, avgDeath:p.sex==="F"?87:84,
    totalSavings:p.rrsp+p.tfsa+p.nr, rrsp:p.rrsp, tfsa:p.tfsa, nr:p.nr,
    retYearBalance:retBal, retBal:retBal,
    qppMonthly:qppM, oasMonthly:oasM, dbPensionMonthly:penMo,
    govMonthly:govM, coveragePct:coverPct, gapMonthly:gapM,
    retSpM:p.retSpM, withdrawalRatePct:wdPct,
    successPct:succPct, succ:mc.succ, grade:grade,
    rMedF:Math.round(mc.medF||0), rP5F:Math.round(mc.var5||0),
    rP25F:Math.round(mc.p25F||0), rP75F:Math.round(mc.p75F||0),
    rP95F:Math.round(mc.p95F||0),
    medRuin:mc.medRuin||999, p5Ruin:mc.p5Ruin||999,
    taxCurrentEffective:taxCurrEff, taxRetirementEffective:taxRetEff,
    taxCurrentMarginal:Math.round(margRate*100),
    margRate:margRate,
    merWeighted:merW, feeCostLifetime:feeCost,
    penType:p.penType, dcBal:p.dcBal, hasPension:p.penType!=="none",
    ptM:p.ptM, ptYrs:p.ptYrs,
    qppAge:p.qppAge, oasAge:p.oasAge,
    inf:p.inf, nSim:5000,
    medRevData:mc.medRevData,
    expReturn:p.allocR*0.07+(1-p.allocR)*0.035,
    afterTaxReturn:(p.allocR*0.07+(1-p.allocR)*0.035)*(1-margRate*0.5),
  };
}

// ============================================================
// COST OF DELAY + MIN VIABLE RETURN
// ============================================================
export function calcMinViableReturn(baseParams) {
  var p = Object.assign({}, baseParams);
  var lo = 0.01, hi = 0.15, mid, succMid, itr = 0;
  while (hi - lo > 0.002 && itr < 12) {
    mid = (lo + hi) / 2; p.eqRet = mid;
    var mc = runMC(p, 200);
    succMid = mc ? mc.succ : 0;
    if (succMid >= 0.5) hi = mid; else lo = mid;
    itr++;
  }
  return Math.round((lo + hi) / 2 * 1000) / 10;
}

export function calcCostOfDelay(baseParams) {
  var lostContrib = (baseParams.rrspC || 0) + (baseParams.tfsaC || 0) + (baseParams.nrC || 0);
  var yrsToGrow = baseParams.deathAge - baseParams.retAge;
  var expRet = (baseParams.allocR || 0.7) * 0.07 + (1 - (baseParams.allocR || 0.7)) * 0.035 - (baseParams.merR || 0.015);
  return Math.round(lostContrib * 12 * Math.pow(1 + expRet, yrsToGrow));
}

function buildPriority(D, p, fr) {
  var isQC = p.prov === "QC";
  var margRate = D.margRate || 0.30;
  var expRet = D.expReturn || 0.053;
  var afterTaxRet = D.afterTaxReturn || 0.035;
  var pct = function(v) { return (v * 100).toFixed(1) + "%"; };
  var priorities = [];

  // 1. Employer match (if DC or large)
  if (p._quiz.employer === "large" || p._quiz.employer === "tech") {
    priorities.push({
      name: fr ? "Cotisation employeur (contrepartie)" : "Employer match contribution",
      rate: "50-100%",
      why: fr ? "Rendement instantané de 50-100%. Généralement priorisé." : "Instant 50-100% return. Generally considered first.",
      color: "#2A8C46", priority: 1
    });
  }

  // 2. High-interest debts (>10%)
  (p._report.debts || []).filter(function(d){return d.rate >= 0.10;}).forEach(function(d) {
    var tl = fr ? {cc:"Carte de crédit",student:"Prêt étudiant",car:"Prêt automobile",loc:"Marge de crédit"}
               : {cc:"Credit card",student:"Student loan",car:"Car loan",loc:"Line of credit"};
    priorities.push({
      name: (tl[d.type] || d.type) + " (" + Math.round(d.bal).toLocaleString() + " $)",
      rate: pct(d.rate),
      why: fr ? "Taux de " + pct(d.rate) + " garanti. Le remboursement est généralement priorisé."
             : "Guaranteed " + pct(d.rate) + " rate. Repayment is often favoured.",
      color: "#CC4444", priority: 2
    });
  });

  // 3. RRSP vs TFSA order depends on marginal rate
  if (margRate > 0.4) {
    priorities.push({
      name: fr ? "Régime enregistré d'épargne-retraite" : "Registered Retirement Savings Plan",
      rate: pct(margRate),
      why: fr ? "Taux marginal de " + pct(margRate) + " > 40%. Déduction fiscale élevée."
             : "Marginal rate " + pct(margRate) + " > 40%. High tax deduction.",
      color: "#4680C0", priority: 3
    });
    priorities.push({
      name: fr ? "Compte d'épargne libre d'impôt" : "Tax-Free Savings Account",
      rate: pct(expRet),
      why: fr ? "Croissance libre d'impôt. Après le régime enregistré." : "Tax-free growth. After registered plan.",
      color: "#2A8C46", priority: 4
    });
  } else {
    priorities.push({
      name: fr ? "Compte d'épargne libre d'impôt" : "Tax-Free Savings Account",
      rate: pct(expRet),
      why: fr ? "Taux marginal de " + pct(margRate) + " ≤ 40%. Souvent priorisé." : "Marginal rate " + pct(margRate) + " ≤ 40%. Often favoured.",
      color: "#2A8C46", priority: 3
    });
    priorities.push({
      name: fr ? "Régime enregistré d'épargne-retraite" : "Registered Retirement Savings Plan",
      rate: pct(margRate),
      why: fr ? "Déduction modérée. Après le compte libre d'impôt." : "Moderate deduction. After tax-free account.",
      color: "#4680C0", priority: 4
    });
  }

  // 4. Medium-rate debts (4-10%)
  (p._report.debts || []).filter(function(d){return d.rate >= 0.04 && d.rate < 0.10;}).forEach(function(d) {
    var tl = fr ? {cc:"Carte de crédit",student:"Prêt étudiant",car:"Prêt automobile",loc:"Marge de crédit"}
               : {cc:"Credit card",student:"Student loan",car:"Car loan",loc:"Line of credit"};
    priorities.push({
      name: (tl[d.type] || d.type) + " (" + Math.round(d.bal).toLocaleString() + " $)",
      rate: pct(d.rate),
      why: d.rate > afterTaxRet
        ? (fr ? "Taux > rendement après impôt. Le remboursement est généralement favorisé." : "Rate > after-tax return. Repayment is generally favored.")
        : (fr ? "Taux < rendement. Paiement minimum acceptable." : "Rate < return. Minimum payment acceptable."),
      color: "#B89830", priority: 5
    });
  });

  // 5. Mortgage
  if (p._report.mortBal > 0) {
    var mmr = 0.055;
    priorities.push({
      name: fr ? "Hypothèque (" + Math.round(p._report.mortBal).toLocaleString() + " $)" : "Mortgage (" + Math.round(p._report.mortBal).toLocaleString() + " $)",
      rate: pct(mmr),
      why: mmr > afterTaxRet
        ? (fr ? "Taux > rendement après impôt. Le remboursement accéléré est souvent favorisé." : "Rate > after-tax return. Accelerated repayment is often favored.")
        : (fr ? "Taux < rendement après impôt. L'investissement est souvent favorisé." : "Rate < after-tax return. Investing is often favored."),
      color: "#B89830", priority: 6
    });
  }

  return priorities;
}


// ============================================================
// AI PROMPT BUILDER
// ============================================================
function buildAIPrompt(D, p, fr) {
  var q = p._quiz, rp = p._report;
  var isQC = p.prov === "QC";
  var gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada") : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  var oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  var confInstr = q.confidence <= 2 ? "TONE: Extra warm, reassuring. Lead with positives." : q.confidence >= 4 ? "TONE: Data-forward, confident. Specific numbers." : "TONE: Balanced, professional.";
  var winMap = {home:fr?"Ouvrir en reconnaissant l'achat immobilier.":"Open acknowledging home purchase.",debtfree:fr?"Ouvrir en soulignant l'absence de dettes.":"Open acknowledging debt-free status.",saving:fr?"Ouvrir en reconnaissant l'habitude d'épargne.":"Open acknowledging consistent saving.",investing:fr?"Ouvrir en reconnaissant les connaissances en investissement.":"Open acknowledging investing knowledge.",business:fr?"Ouvrir en reconnaissant l'esprit entrepreneurial.":"Open acknowledging entrepreneurial ability.",none:fr?"Ce rapport est un point de départ.":"This report is a starting point."};
  var winInstr = "WIN: " + (winMap[q.win] || winMap.none);
  var fixMap = {save_more:"Lead obs_1 with savings rate.",debt:"Lead obs_1 with debt cost and payoff.",invest:"Lead obs_1 with fee impact.",tax:"Lead obs_1 with tax rate savings.",retire_early:"Lead obs_1 with withdrawal rate.",clarity:"Lead obs_1 with success rate."};
  var fixInstr = "FIX: " + (fixMap[q.fix] || "");
  var worryMap = {runout:"EXPAND longevity to 3-4 sentences.",tax:"EXPAND tax to 3-4 sentences.",inflation:"Note: all amounts inflation-adjusted.",health:"Note health costs.",market:"Reference volatility.",legacy:"Mention estate."};
  var wInstr = (q.worries||[]).map(function(w){return worryMap[w]||"";}).filter(Boolean).join(" ");

  var debtSlot = rp.debtBal > 0 ? '"debt_impact":"Debt cost, payoff, opportunity cost. No shaming.",' : "";
  var ptSlot = D.ptM > 0 ? "Part-time bridge: " + D.ptM + "$/mo x " + D.ptYrs + "yrs." : "";
  var cplSlot = q.couple === "yes" ? "Household context." : "";
  var propSlot = rp.mortBal > 0 ? (rp.mortFreeAge > p.retAge ? "Mortgage extends " + (rp.mortFreeAge - p.retAge) + "yrs into retirement." : "Mortgage paid by age " + rp.mortFreeAge + ".") : "";

  var hooks = [q.couple==="yes"?"couple":null, rp.homeVal>0?"homeowner":null, rp.debtBal>0?"debt":null].filter(Boolean).join("+");

  var data = {
    profile:{age:D.age, retAge:D.retAge, prov:D.prov, sex:D.sex, couple:q.couple, qppAge:D.qppAge, oasAge:D.oasAge},
    savings:{total:D.totalSavings, retBal:D.retYearBalance},
    debt:rp.debtBal > 0 ? rp.debts.map(function(d){return {type:d.type,bal:d.bal,rate:d.rate,annualCost:d.annualCost,months:d.months};}) : null,
    property:rp.homeVal > 0 ? {value:rp.homeVal,mortgage:rp.mortBal,equity:rp.equity,paidOffAge:rp.mortFreeAge} : null,
    gov:{qpp:D.qppMonthly,oas:D.oasMonthly,db:D.dbPensionMonthly,total:D.govMonthly,cover:D.coveragePct},
    spend:{mo:D.retSpM,gap:D.gapMonthly,wd:D.withdrawalRatePct},
    results:{pct:D.successPct,grade:D.grade,med:D.rMedF,p5:D.rP5F,p25:D.rP25F,p75:D.rP75F},
    tax:{eff:D.taxCurrentEffective,retEff:D.taxRetirementEffective},
    fees:{mer:D.merWeighted,cost:D.feeCostLifetime}
  };

  var sys = "You narrate buildfi.ca Essentiel reports.\nRULES: Observational only. CONDITIONAL tense. Never directive.\nCite numbers. Grade 10 reading. Short sentences.\nNo acronyms: " + gP + ", " + oN + ".\nJSON only. No markdown.";

  var usr = "LANG: " + (fr ? "French (vous)" : "English") + "\n" + confInstr + "\n" + winInstr + "\n" + fixInstr + "\n"
    + (wInstr ? "WORRIES: " + wInstr + "\n" : "") + (cplSlot ? cplSlot + "\n" : "") + (propSlot ? propSlot + "\n" : "") + (ptSlot ? ptSlot + "\n" : "")
    + "\nDATA: " + JSON.stringify(data)
    + '\n\nJSON (2-3 sentences each):\n{"snapshot_intro":"Grade + WIN.",' + debtSlot + '"savings_context":"Trajectory.","gov_explanation":"' + gP + ' + ' + oN + '.","gap_explanation":"Gap + sustainability.","tax_insight":"Rate comparison.","longevity_good":"Median + optimistic.","longevity_watch":"Pessimistic.","obs_1":"FIX-driven.","obs_2":"Coverage.","obs_3":"Fees.","upgrade_hook":"For ' + hooks + '."}';

  return {sys:sys, usr:usr};
}


// ============================================================
// FORMAT HELPERS
// ============================================================
function fDol(n) {
  if (n == null || isNaN(n)) return "\u2014";
  return (n < 0 ? "-" : "") + Math.abs(Math.round(n)).toString().replace(/\B(?=(?:\d{3})+(?!\d))/g, " ") + " $";
}

function gCol(s) { return s >= 0.9 ? "#2A8C46" : s >= 0.75 ? "#B89830" : "#CC4444"; }

// ============================================================
// RENDER REPORT (8 sections, 4 SVG charts, bilingual)
// ============================================================
function renderReport(D, mc, quiz, ai, aiLoading, lang, costDelay, minReturn) {
  costDelay = costDelay || 0;
  minReturn = minReturn || 0;
  var fr = lang === "fr", t = function(f,e){return fr?f:e;};
  var isQC = D.prov === "QC";
  var gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada") : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  var oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";
  var sC = gCol(D.succ);
  var circ = 2 * Math.PI * 48;
  var dashVal = circ * (1 - D.succ);
  var txSav = Math.round(D.retSpM * 12 * (D.taxCurrentEffective - D.taxRetirementEffective) / 100);
  var params = translateToMC(quiz);
  var rp = params._report;
  var priorities = buildPriority(D, params, fr);
  var totalSav = D.totalSavings + (D.penType === "dc" ? D.dcBal : 0);
  var yrsToRet = D.retAge - D.age;
  var planHorizon = D.deathAge - D.age;

  function aiSlot(text) {
    if (aiLoading) return '<div style="font-size:14px;color:var(--pr);line-height:1.8;margin:12px 0;padding:14px 18px;background:var(--bga);border-radius:8px;border-left:3px solid var(--pr);font-style:italic">...</div>';
    if (!text) return '';
    return '<div style="font-size:14px;color:#444;line-height:1.8;margin:12px 0">' + text + '</div>';
  }
  function secH(n, title) { return '<div style="margin-bottom:52px"><div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--g);font-weight:700;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:18px;padding-bottom:10px;border-bottom:2px solid var(--g)"><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--g),var(--gl));color:#fff;font-size:12px;font-weight:800">' + n + '</span>' + title + '</div>'; }
  function secEnd() { return '</div>'; }
  function card(inner, s) { return '<div style="background:var(--bgc);border:1px solid var(--bd);border-radius:10px;padding:20px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.03);' + (s||'') + '">' + inner + '</div>'; }
  function kp(v, l, c, sub) { return '<div style="text-align:center;padding:16px 10px 12px;border:1px solid var(--bd);border-radius:10px;background:var(--bgc);border-top:3px solid ' + (c||'var(--g)') + '"><div style="font-family:monospace;font-size:20px;font-weight:700;color:' + (c||'var(--g)') + '">' + v + '</div><div style="font-size:11px;color:#666;margin-top:4px;font-weight:600">' + l + '</div>' + (sub ? '<div style="font-size:10px;color:#999;margin-top:2px">' + sub + '</div>' : '') + '</div>'; }
  function kvr(k, v) { return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bdl);font-size:13px"><span style="color:var(--ts)">' + k + '</span><span style="font-family:monospace;font-weight:600">' + v + '</span></div>'; }
  function co(inner, type) { var m = {insight:["var(--gnbg)","var(--gn)"], warning:["var(--ambg)","var(--am)"], info:["var(--gbg)","var(--g)"]}; var c = m[type] || m.info; return '<div style="background:' + c[0] + ';border:1px solid ' + c[1] + ';border-left:4px solid ' + c[1] + ';border-radius:6px;padding:14px 16px;font-size:13px;color:#333;margin:12px 0;line-height:1.8">' + inner + '</div>'; }

  // === WEALTH CHART SVG ===
  function wealthChartSVG() {
    var cy = (params.rrspC||0) + (params.tfsaC||0) + (params.nrC||0);
    var ages = []; for (var a = D.age; a <= 90; a++) ages.push(a);
    var vals = ages.map(function(a) {
      if (a < D.retAge) { var y = a - D.age; return totalSav * Math.pow(1.05, y) + cy * ((Math.pow(1.05, y) - 1) / 0.05); }
      var b = D.retYearBalance;
      for (var y2 = 0; y2 < a - D.retAge; y2++) {
        var g = (D.retAge + y2) >= D.qppAge ? D.govMonthly * 12 : 0;
        b = b * 1.04 - Math.max(0, D.retSpM * 12 - g);
        if (b < 0) { b = 0; break; }
      }
      return Math.max(0, b);
    });
    var mx = Math.max.apply(null, vals) * 1.08;
    var W = 680, H = 220, P = 52, PR = 16, PT = 20, PB = 36, CW = W - P - PR, CH = H - PT - PB;
    var bw = Math.max(2, Math.floor(CW / ages.length) - 1);
    var ri = ages.indexOf(D.retAge), gi = ages.indexOf(D.qppAge);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) { var yy = PT + CH - CH * g / 4; svg += '<line x1="' + P + '" x2="' + (W-PR) + '" y1="' + yy + '" y2="' + yy + '" stroke="#E8E0D4" stroke-width="0.5"/><text x="' + (P-6) + '" y="' + (yy+3) + '" text-anchor="end" font-size="9" fill="#aaa" font-family="monospace">' + Math.round(mx*g/4/1000) + 'K</text>'; }
    for (var i = 0; i < ages.length; i++) { var x = P + i * (bw + 1), bH = Math.max(0.5, vals[i] / mx * CH), y = PT + CH - bH; svg += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bH + '" fill="' + (ages[i] >= D.retAge ? "#C4944A" : "#D4A85A") + '" rx="1" opacity="' + (ages[i] >= D.retAge ? 1 : 0.65) + '"/>'; if (i % 5 === 0) svg += '<text x="' + (x + bw/2) + '" y="' + (H-8) + '" text-anchor="middle" font-size="8" fill="#aaa" font-family="monospace">' + ages[i] + '</text>'; }
    if (ri >= 0) svg += '<line x1="' + (P+ri*(bw+1)) + '" x2="' + (P+ri*(bw+1)) + '" y1="' + PT + '" y2="' + (PT+CH) + '" stroke="#C4944A" stroke-dasharray="4,3" stroke-width="1.5"/><text x="' + (P+ri*(bw+1)+4) + '" y="' + (PT+12) + '" font-size="9" fill="#C4944A" font-weight="700">' + t("Retraite","Retirement") + '</text>';
    if (gi >= 0) svg += '<line x1="' + (P+gi*(bw+1)) + '" x2="' + (P+gi*(bw+1)) + '" y1="' + PT + '" y2="' + (PT+CH) + '" stroke="#2A8C46" stroke-dasharray="3,4" stroke-width="1" opacity="0.6"/><text x="' + (P+gi*(bw+1)+4) + '" y="' + (PT+24) + '" font-size="8" fill="#2A8C46" font-weight="600">' + t("Prestations gouv.","Gov. benefits") + '</text>';
    svg += '</svg>';
    return svg;
  }

  // === FAN CHART SVG ===
  function fanChartSVG() {
    var ages = []; for (var a = D.retAge; a <= 90; a++) ages.push(a);
    var n = ages.length, start = D.retYearBalance;
    var ends = {p5:D.rP5F, p25:D.rP25F||D.rP5F*2, p50:D.rMedF, p75:D.rP75F, p95:D.rP95F};
    var W = 680, H = 260, P = 52, PR = 16, PT = 24, PB = 36, CW = W - P - PR, CH = H - PT - PB;
    var mx = Math.max(start, ends.p95||ends.p75*1.5) * 1.05;
    var curve = function(endV) { return ages.map(function(_, i) { var tt = i/(n-1), k = tt*tt*(3-2*tt); return Math.max(0, start + (endV - start) * k); }); };
    var p95 = curve(ends.p95), p75 = curve(ends.p75), p50 = curve(ends.p50), p25 = curve(ends.p25), p5 = curve(ends.p5);
    var sx = function(i) { return P + (i/(n-1)) * CW; };
    var sy = function(v) { return PT + CH - (Math.min(v, mx) / mx) * CH; };
    var pts = function(arr) { return arr.map(function(v,i){return sx(i)+","+sy(v);}).join(" "); };
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) { var yy = PT + CH - CH * g / 4; svg += '<line x1="' + P + '" x2="' + (W-PR) + '" y1="' + yy + '" y2="' + yy + '" stroke="#E8E0D4" stroke-width="0.5"/><text x="' + (P-6) + '" y="' + (yy+3) + '" text-anchor="end" font-size="9" fill="#aaa" font-family="monospace">' + Math.round(mx*g/4/1000) + 'K</text>'; }
    svg += '<polygon points="' + pts(p95) + ' ' + pts(p5.slice().reverse()) + '" fill="rgba(196,148,74,0.08)"/>';
    svg += '<polygon points="' + pts(p75) + ' ' + pts(p25.slice().reverse()) + '" fill="rgba(196,148,74,0.20)"/>';
    svg += '<polyline points="' + pts(p50) + '" fill="none" stroke="#C4944A" stroke-width="2.5" stroke-linejoin="round"/>';
    ages.forEach(function(a,i) { if (i % 5 === 0 || i === n-1) svg += '<text x="' + sx(i) + '" y="' + (H-8) + '" text-anchor="middle" font-size="9" fill="#888" font-family="monospace">' + a + ' ' + t("ans","yrs") + '</text>'; });
    svg += '<rect x="' + (P+8) + '" y="4" width="12" height="12" fill="rgba(196,148,74,0.20)" rx="2"/><text x="' + (P+24) + '" y="13" font-size="9" fill="#888">' + t("Probable (milieu 50%)","Likely (middle 50%)") + '</text>';
    svg += '<rect x="' + (P+195) + '" y="4" width="12" height="12" fill="rgba(196,148,74,0.08)" rx="2"/><text x="' + (P+211) + '" y="13" font-size="9" fill="#888">' + t("Possible (90% des cas)","Possible (90% of cases)") + '</text>';
    svg += '<line x1="' + (P+390) + '" x2="' + (P+412) + '" y1="10" y2="10" stroke="#C4944A" stroke-width="2.5"/><text x="' + (P+417) + '" y="13" font-size="9" fill="#888">' + t("Résultat médian","Median outcome") + '</text>';
    svg += '</svg>';
    return svg;
  }

  var h = '';


  // Header
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:36px;flex-wrap:wrap"><div><h1 style="font-size:30px;font-weight:800;color:var(--g);letter-spacing:-0.5px">buildfi.ca</h1><div style="font-size:14px;color:#888;margin-top:2px">' + t("Rapport Essentiel","Essentials Report") + ' — ' + new Date().toLocaleDateString(fr?"fr-CA":"en-CA") + '</div></div><div style="text-align:right;font-size:10px;color:#bbb;line-height:1.8">v11.12.9<br>' + D.nSim.toLocaleString() + ' simulations<br>' + D.prov + '</div></div>';

  // === S1: GRADE ===
  h += secH(1, t("Votre note","Your Grade"));
  h += card('<div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap"><div style="position:relative;width:120px;height:120px;flex-shrink:0"><svg width="120" height="120" style="transform:rotate(-90deg)"><circle cx="60" cy="60" r="48" fill="none" stroke="var(--bd)" stroke-width="8"/><circle cx="60" cy="60" r="48" fill="none" stroke="' + sC + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + dashVal + '"/></svg><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-family:monospace;font-size:42px;font-weight:900;color:' + sC + '">' + D.grade + '</div></div><div style="flex:1;min-width:220px"><div style="display:inline-block;padding:5px 18px;border-radius:20px;font-weight:800;font-size:13px;color:#fff;background:' + sC + ';margin-bottom:10px">' + D.grade + ' — ' + (D.successPct >= 90 ? t("Excellent","Excellent") : D.successPct >= 75 ? t("Solide","Solid") : D.successPct >= 50 ? t("À travailler","Needs work") : t("Attention","Warning")) + '</div><div style="font-size:14px;color:#555;line-height:1.8">' + t("Nous avons simulé " + D.nSim.toLocaleString() + " avenirs économiques différents pour votre plan — krachs boursiers, poussées d'inflation, longévité variable. Dans " + D.successPct + "% de ces scénarios, votre argent pourrait durer toute votre retraite. C'est ce qui détermine votre note.", "We simulated " + D.nSim.toLocaleString() + " different economic futures for your plan — market crashes, inflation spikes, varying lifespans. In " + D.successPct + "% of those scenarios, your money could last through retirement. That determines your grade.") + '</div>' + aiSlot(ai.snapshot_intro) + '</div></div>');
  h += co(t("Tous les montants de ce rapport sont en dollars d'aujourd'hui — ajustés pour l'inflation projetée à " + (D.inf*100).toFixed(1) + "% par année.","All amounts in this report are in today's dollars — adjusted for projected inflation at " + (D.inf*100).toFixed(1) + "% per year."), "info");
  h += secEnd();

  // === S2: PROFILE with Timeline ===
  h += secH(2, t("Votre profil","Your Profile"));
  // Timeline
  var tlEv = [{a:D.age,l:t("Aujourd'hui","Today"),c:"#4680C0",on:true},{a:D.retAge,l:t("Retraite","Retirement"),c:"#C4944A"},{a:D.qppAge,l:t("Prestations gouvernementales","Government benefits"),c:"#2A8C46"},{a:D.avgDeath,l:t("Âge médian de décès","Median death age"),c:"#888"}];
  h += '<div style="position:relative;padding:28px 20px 16px;background:#FDFBF7;border:1px solid var(--bd);border-radius:10px;margin:14px 0"><div style="position:absolute;top:38px;left:50px;right:50px;height:3px;background:linear-gradient(90deg,#4680C0,#C4944A,#2A8C46,#888);border-radius:2px;opacity:.2"></div><div style="display:flex;justify-content:space-between;position:relative">';
  tlEv.forEach(function(e){h+='<div style="text-align:center;z-index:1"><div style="width:' + (e.on?18:14) + 'px;height:' + (e.on?18:14) + 'px;border-radius:50%;background:' + (e.on?e.c:'#fff') + ';border:2.5px solid ' + e.c + ';margin:0 auto 6px"></div><div style="font-family:monospace;font-size:14px;font-weight:700">' + e.a + ' ' + t("ans","yrs") + '</div><div style="font-size:10px;color:#888;max-width:90px;margin:2px auto 0;line-height:1.4">' + e.l + '</div></div>';});
  h += '</div></div>';
  h += card(kvr(t("Âge","Age"), D.age + t(" ans"," years")) + kvr(t("Retraite prévue","Planned retirement"), D.retAge + t(" ans"," years") + ' (' + yrsToRet + t(" ans)"," years)")) + kvr(t("Revenu annuel","Annual income"), fDol(D.sal)) + kvr("Province", D.prov) + kvr(t("Dépenses prévues à la retraite","Planned retirement spending"), fDol(D.retSpM) + t(" $/mois"," $/mo")) + (D.hasPension ? kvr(t("Régime de pension d'employeur","Employer pension plan"), D.penType === "dc" ? t("Cotisations déterminées","Defined contribution") + " (" + fDol(D.dcBal) + ")" : t("Prestations déterminées","Defined benefit") + " (" + fDol(D.dbPensionMonthly) + t(" $/mois"," $/mo") + ")") : ''));
  h += secEnd();

  // === S3: SAVINGS with Wealth Chart + Account Breakdown ===
  h += secH(3, t("Votre épargne","Your Savings"));
  h += aiSlot(ai.savings_context);
  h += '<div class="rpt-grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">' + kp(fDol(totalSav), t("Épargne totale","Total savings"), null, D.penType==="dc"?t("incluant pension","including pension"):null) + kp(fDol(D.retYearBalance), t("Projeté à la retraite","Projected at retirement"), "var(--gn)") + kp(D.withdrawalRatePct + "%", t("Taux de retrait annuel","Annual withdrawal rate"), D.withdrawalRatePct <= 4 ? "var(--gn)" : "var(--am)", t("règle des 4% = repère","4% rule = benchmark")) + '</div>';
  // Wealth chart
  h += card('<div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-left:8px">' + t("Projection du patrimoine","Wealth projection") + '</div>' + wealthChartSVG(), 'padding:16px 12px 8px');
  // Account breakdown
  h += card(kvr(t("Compte de retraite enregistré (REER)","Registered retirement account (RRSP)"), fDol(D.rrsp)) + kvr(t("Compte d'épargne libre d'impôt (CELI)","Tax-free savings account (TFSA)"), fDol(D.tfsa)) + kvr(t("Placements non enregistrés","Non-registered investments"), fDol(D.nr)) + (D.penType === "dc" ? kvr(t("Régime à cotisations déterminées","Defined contribution plan"), fDol(D.dcBal)) : ''));
  h += secEnd();

  // === S4 (conditional): DEBT PRIORITY ===
  var sn = 4;
  if (rp.debtBal > 0 || rp.mortBal > 0) {
    h += secH(sn, t("Dette vs Investissement","Debt vs Investment"));
    h += aiSlot(ai.debt_impact);
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:14px">';
    h += kp(Math.round(D.margRate*100) + "%", t("Taux marginal","Marginal rate"));
    h += kp((D.expReturn*100).toFixed(1) + "%", t("Rend. espéré","Exp. return"));
    h += kp((D.afterTaxReturn*100).toFixed(1) + "%", t("Rend. après impôt","After-tax return"));
    if (rp.debtBal > 0) h += kp(fDol(rp.debtBal), t("Dettes totales","Total debts"), "var(--rd)");
    if (rp.mortBal > 0) h += kp(fDol(rp.mortBal), t("Hypothèque","Mortgage"), "var(--am)");
    h += '</div>';
    h += '<div style="font-size:13px;font-weight:700;color:var(--ts);margin:18px 0 10px;border-bottom:1px solid var(--bd);padding-bottom:6px">' + t("Ordre de priorité courant","Current priority order") + '</div>';
    priorities.forEach(function(p, i) {
      h += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--bdl)">';
      h += '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:' + p.color + ';color:#fff;font-size:12px;font-weight:800;flex-shrink:0">' + (i+1) + '</span>';
      h += '<div style="flex:1"><div style="font-weight:700;font-size:15px">' + p.name + '</div><div style="font-size:12px;color:var(--ts);margin-top:2px">' + p.why + '</div></div>';
      h += '<span style="font-family:monospace;font-weight:700;font-size:15px;color:' + p.color + '">' + p.rate + '</span>';
      h += '</div>';
    });
    h += secEnd();
    sn++;
  }

  // === RETIREMENT INCOME ===
  h += secH(sn, t("Vos revenus à la retraite","Your Retirement Income"));
  h += aiSlot(ai.gov_explanation);
  // Donut
  var gMo = D.govMonthly, sMo = D.gapMonthly, totMo = gMo + sMo || 1;
  var govPct = Math.round(gMo / totMo * 100);
  var dC = 2 * Math.PI * 70, gDash = govPct / 100 * dC;
  h += '<div class="rpt-donut" style="display:flex;align-items:center;gap:36px;flex-wrap:wrap;justify-content:center;padding:20px 0">';
  h += '<svg width="180" height="180" viewBox="0 0 180 180"><circle cx="90" cy="90" r="70" fill="none" stroke="#2A8C46" stroke-width="22" stroke-dasharray="' + gDash + ' ' + (dC-gDash) + '" transform="rotate(-90 90 90)" opacity=".85"/><circle cx="90" cy="90" r="70" fill="none" stroke="#C4944A" stroke-width="22" stroke-dasharray="' + (dC-gDash) + ' ' + gDash + '" stroke-dashoffset="' + (-gDash) + '" transform="rotate(-90 90 90)" opacity=".85"/><text x="90" y="86" text-anchor="middle" font-size="22" font-weight="800" fill="#1A1A1A" font-family="monospace">' + fDol(totMo).replace(" $","") + '</text><text x="90" y="104" text-anchor="middle" font-size="10" fill="#888">/' + t("mois","mo") + '</text></svg>';
  h += '<div style="display:flex;flex-direction:column;gap:16px">';
  h += '<div style="display:flex;align-items:center;gap:10px"><div style="width:14px;height:14px;border-radius:4px;background:#2A8C46;flex-shrink:0"></div><div><div style="font-size:14px;font-weight:700;color:#333">' + t("Prestations gouvernementales","Government benefits") + '</div><div style="font-size:12px;color:#888;font-family:monospace">' + fDol(gMo) + '/' + t("mois","mo") + ' — ' + govPct + '%</div></div></div>';
  h += '<div style="display:flex;align-items:center;gap:10px"><div style="width:14px;height:14px;border-radius:4px;background:#C4944A;flex-shrink:0"></div><div><div style="font-size:14px;font-weight:700;color:#333">' + t("Épargne et placements","Savings and investments") + '</div><div style="font-size:12px;color:#888;font-family:monospace">' + fDol(sMo) + '/' + t("mois","mo") + ' — ' + (100-govPct) + '%</div></div></div>';
  h += '</div></div>';
  // Benefits detail
  h += card('<div style="padding:10px 0;border-bottom:1px solid var(--bdl)"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:14px;font-weight:600">' + gP + '</div><div style="font-size:11px;color:#999">' + t("Début à ","Starts at age ") + D.qppAge + t(" ans"," years") + '</div></div><span style="font-family:monospace;font-weight:700;font-size:15px">' + fDol(D.qppMonthly) + '/' + t("mois","mo") + '</span></div></div><div style="padding:10px 0;border-bottom:1px solid var(--bdl)"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:14px;font-weight:600">' + oN + '</div><div style="font-size:11px;color:#999">' + t("Début à ","Starts at age ") + D.oasAge + t(" ans"," years") + '</div></div><span style="font-family:monospace;font-weight:700;font-size:15px">' + fDol(D.oasMonthly) + '/' + t("mois","mo") + '</span></div></div>' + (D.dbPensionMonthly > 0 ? kvr(t("Pension d'employeur","Employer pension"), fDol(D.dbPensionMonthly) + '/' + t("mois","mo")) : '') + '<div style="padding:10px 0"><div style="display:flex;justify-content:space-between;align-items:center"><div style="font-size:14px;font-weight:600">' + t("Dépenses mensuelles prévues","Planned monthly spending") + '</div><span style="font-family:monospace;font-weight:700;font-size:15px;color:var(--rd)">' + fDol(D.retSpM) + '/' + t("mois","mo") + '</span></div></div>');
  // Gap paragraph
  h += '<div style="font-size:14px;color:#444;line-height:1.8;margin:12px 0">' + (ai.gap_explanation || t("La différence entre vos revenus gouvernementaux (" + fDol(gMo) + " $) et vos dépenses (" + fDol(D.retSpM) + " $) créerait un écart de " + fDol(sMo) + " $ que vos économies personnelles devraient combler. Vos retraits représenteraient " + D.withdrawalRatePct + " % de votre portefeuille annuellement, un taux qui pourrait être " + (D.withdrawalRatePct <= 4 ? "viable" : "élevé") + " selon votre plan de " + (D.deathAge - D.retAge) + " ans.", "The difference between your government income (" + fDol(gMo) + ") and spending (" + fDol(D.retSpM) + ") could create a " + fDol(sMo) + " gap that your personal savings would need to cover. Your withdrawals would represent " + D.withdrawalRatePct + "% of your portfolio annually, a rate that could be " + (D.withdrawalRatePct <= 4 ? "sustainable" : "elevated") + " over your " + (D.deathAge - D.retAge) + "-year plan.")) + '</div>';
  h += co(t("Les prestations gouvernementales pourraient couvrir " + govPct + "% de vos dépenses prévues. Les " + (100-govPct) + "% restants (" + fDol(sMo) + " par mois) pourraient être puisés dans votre épargne et vos placements.", "Government benefits could cover " + govPct + "% of your planned spending. The remaining " + (100-govPct) + "% (" + fDol(sMo) + " per month) could be drawn from your savings and investments."), govPct >= 50 ? "insight" : "warning");
  h += secEnd();

  // === TAX ===
  sn++;
  h += secH(sn, t("Votre fiscalité","Your Tax Picture"));
  h += aiSlot(ai.tax_insight);
  h += card('<div style="display:flex;flex-direction:column;gap:14px">' + [{l:t("Taux marginal actuel","Current marginal rate"),v:D.taxCurrentMarginal,c:"#CC4444"},{l:t("Taux effectif actuel","Current effective rate"),v:D.taxCurrentEffective,c:"#B89830"},{l:t("Taux effectif retraite","Retirement effective rate"),v:D.taxRetirementEffective,c:"#2A8C46"}].map(function(b){return '<div style="display:flex;align-items:center;gap:12px"><div style="width:150px;font-size:12px;color:#666;text-align:right;flex-shrink:0">' + b.l + '</div><div style="flex:1;background:#F5F0E8;border-radius:4px;height:28px;overflow:hidden"><div style="width:' + b.v + '%;height:100%;background:' + b.c + ';border-radius:4px;opacity:.8"></div></div><div style="font-family:monospace;font-size:15px;font-weight:700;color:' + b.c + ';width:55px;text-align:right">' + b.v + '%</div></div>';}).join("") + '</div>');
  if (txSav > 0) h += co(t(D.taxCurrentEffective + "% → " + D.taxRetirementEffective + "% = ~" + fDol(txSav) + "/an d'économies potentielles.", D.taxCurrentEffective + "% → " + D.taxRetirementEffective + "% = ~" + fDol(txSav) + "/yr potential savings."), "insight");
  h += secEnd();

  // === LONGEVITY with Fan Chart + Favorable/Watch boxes ===
  sn++;
  h += secH(sn, t("Durée de vie de votre plan","How Long Your Plan Lasts"));
  h += '<div class="rpt-grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">' + kp(fDol(D.rP5F), t("Scénario pessimiste","Pessimistic scenario"), "var(--rd)", t("Pire 5% des cas","Worst 5% of cases")) + kp(fDol(D.rMedF), t("Scénario médian","Median scenario"), "var(--g)", t("Résultat le plus probable","Most likely result")) + kp(fDol(D.rP75F), t("Scénario optimiste","Optimistic scenario"), "var(--gn)", t("Meilleur 25% des cas","Best 25% of cases")) + '</div>';
  // Fan chart
  h += card('<div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-left:8px">' + t("Dispersion du patrimoine à la retraite","Retirement wealth distribution") + '</div>' + fanChartSVG(), 'padding:16px 12px 8px');
  // Favorable + Watch boxes
  h += '<div class="rpt-grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0">';
  h += card('<div style="font-size:11px;color:#2A8C46;font-weight:700;text-transform:uppercase;margin-bottom:6px">' + t("Scénario favorable","Favorable scenario") + '</div><div style="font-size:13px;color:#444;line-height:1.75">' + (ai.longevity_good || t("Dans un scénario médian, vous pourriez terminer votre retraite avec " + fDol(D.rMedF) + " encore disponibles. Dans les scénarios plus optimistes (25 % des cas), ce montant pourrait même atteindre " + fDol(D.rP75F) + ".", "In the median scenario, you could end retirement with " + fDol(D.rMedF) + " still available. In more optimistic scenarios (25% of cases), this could reach " + fDol(D.rP75F) + ".")) + '</div>', 'border-top:3px solid #2A8C46;padding:16px');
  h += card('<div style="font-size:11px;color:#B89830;font-weight:700;text-transform:uppercase;margin-bottom:6px">' + t("À surveiller","To watch") + '</div><div style="font-size:13px;color:#444;line-height:1.75">' + (ai.longevity_watch || t("Dans les scénarios plus difficiles (5 % des cas), votre épargne pourrait descendre à " + fDol(D.rP5F) + " vers la fin de votre plan. Les premières années de retraite avant " + D.qppAge + " ans sont les plus importantes, car elles précèdent vos revenus gouvernementaux.", "In tougher scenarios (5% of cases), your savings could drop to " + fDol(D.rP5F) + " near the end of your plan. The first years of retirement before age " + D.qppAge + " are most critical, as they precede government income.")) + '</div>', 'border-top:3px solid #B89830;padding:16px');
  h += '</div>';
  h += secEnd();

  // === P1.8 / P1.9 — Coût de l'inaction + Point de bascule ===
  sn++;
  h += secH(sn, t("Leviers critiques","Critical levers"));

  // P1.8 — Coût de l'inaction
  if(costDelay>0){
    var cdColor=costDelay>50000?"var(--rd)":costDelay>20000?"var(--am)":"var(--ts)";
    h+=card(
      '<div style="display:flex;align-items:flex-start;gap:16px">'
      +'<div style="font-size:28px;flex-shrink:0">⏳</div>'
      +'<div style="flex:1">'
      +'<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">'+t("P1.8 — Coût de l'inaction (1 an)","P1.8 — Cost of waiting (1 year)")+'</div>'
      +'<div style="font-size:30px;font-weight:900;font-family:monospace;color:'+cdColor+';margin-bottom:8px">'+fDol(costDelay)+'</div>'
      +'<div style="font-size:13px;color:var(--ts);line-height:1.75;margin-bottom:10px">'+t(
        "Si vous attendez un an de plus avant de commencer à épargner, ce montant représente la valeur futur de vos cotisations manquantes — compound sur toute votre période de retraite.",
        "If you wait one more year before starting to save, this amount represents the future value of your missed contributions — compounded over your full retirement period."
      )+'</div>'
      +'<div style="font-size:12px;padding:10px 14px;background:var(--gbg);border-radius:8px;color:var(--ts)">'
      +'<strong>'+t("Ce que cela signifie :","What this means:")+'</strong> '+t(
        "Chaque année d'attente coûte davantage que la précédente, car la croissance composée travaille contre vous. La meilleure action possible n'est pas la plus grosse — c'est la plus rapide.",
        "Each year of waiting costs more than the last, because compound growth works against you. The best action isn't the biggest — it's the fastest."
      )+'</div>'
      +'</div></div>',
      'border-left:4px solid '+cdColor
    );
  }

  // P1.9 — Point de bascule / seuil critique
  if(minReturn>0){
    var mrColor=minReturn<=4?"var(--gn)":minReturn<=7?"var(--am)":"var(--rd)";
    var mrLabel=minReturn<=3?t("Très accessible","Very accessible"):minReturn<=5?t("Accessible","Accessible"):minReturn<=7?t("Exigeant","Demanding"):t("Difficile à atteindre","Difficult to reach");
    h+=card(
      '<div style="display:flex;align-items:flex-start;gap:16px">'
      +'<div style="font-size:28px;flex-shrink:0">📊</div>'
      +'<div style="flex:1">'
      +'<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">'+t("P1.9 — Rendement minimum viable","P1.9 — Minimum viable return")+'</div>'
      +'<div style="display:flex;align-items:baseline;gap:12px;margin-bottom:10px">'
      +'<div style="font-size:30px;font-weight:900;font-family:monospace;color:'+mrColor+'">'+minReturn+'%</div>'
      +'<div style="font-size:12px;padding:3px 10px;border-radius:12px;background:'+mrColor+'20;color:'+mrColor+';font-weight:700">'+mrLabel+'</div>'
      +'</div>'
      +'<div style="font-size:13px;color:var(--ts);line-height:1.75;margin-bottom:10px">'+t(
        "C'est le rendement annuel minimum que votre portefeuille doit générer pour que votre plan ait au moins 50% de chances de tenir toute la retraite — dans les conditions actuelles.",
        "This is the minimum annual return your portfolio needs to generate for your plan to have at least a 50% chance of lasting through retirement — under current conditions."
      )+'</div>'
      +'<div style="font-size:12px;padding:10px 14px;background:var(--gbg);border-radius:8px;color:var(--ts)">'
      +'<strong>'+t("Ce que cela signifie :","What this means:")+'</strong> '
      +(minReturn<=4
        ? t("Un rendement de "+minReturn+"% est réaliste avec un portefeuille diversifié. Votre plan est robuste face aux cycles de marché normaux.","A "+minReturn+"% return is realistic with a diversified portfolio. Your plan holds up to normal market cycles.")
        : minReturn<=7
          ? t("Un rendement de "+minReturn+"% est atteignable mais suppose de maintenir une exposition actions suffisante. Évitez de réduire le risque trop tôt.","A "+minReturn+"% return is achievable but assumes maintaining sufficient equity exposure. Avoid de-risking too early.")
          : t("Un rendement de "+minReturn+"% exige une prise de risque importante. Considérez augmenter vos cotisations ou reporter légèrement la retraite pour réduire ce seuil.","A "+minReturn+"% return requires significant risk-taking. Consider increasing contributions or slightly delaying retirement to lower this threshold.")
      )+'</div>'
      +'</div></div>',
      'border-left:4px solid '+mrColor
    );
  }

  h += secEnd();

  // === OBSERVATIONS with "Ce que cela signifie" ===
  sn++;
  h += secH(sn, "Observations");
  var observations = [
    {t2:t("Taux de retrait","Withdrawal rate"), tx:ai.obs_1 || t("Le taux de retrait annuel initial de " + D.withdrawalRatePct + "% " + (D.withdrawalRatePct <= 4 ? "pourrait se situer dans la zone historiquement durable." : "pourrait légèrement dépasser le seuil de 4%, mais les prestations gouvernementales pourraient contribuer à la durabilité du plan."), "The initial annual withdrawal rate of " + D.withdrawalRatePct + "% " + (D.withdrawalRatePct <= 4 ? "could fall within the historically sustainable range." : "could slightly exceed the 4% threshold, but government benefits could contribute to the plan's sustainability.")), im:D.withdrawalRatePct+"%", c:"var(--g)", m:t("La règle des 4% suggère qu'un retrait annuel de 4% du portefeuille au début de la retraite a historiquement permis de maintenir les fonds pendant 30 ans et plus.","The 4% rule suggests that withdrawing 4% of your portfolio annually at the start of retirement has historically sustained funds for 30+ years.")},
    {t2:t("Couverture gouvernementale","Government coverage"), tx:ai.obs_2 || t("Les programmes gouvernementaux couvriraient " + D.coveragePct + " % de vos dépenses mensuelles, laissant un écart de " + fDol(D.gapMonthly) + " par mois à financer par vos économies personnelles.","Government programs could cover " + D.coveragePct + "% of your monthly spending, leaving a " + fDol(D.gapMonthly) + " per month gap to fund from personal savings."), im:D.coveragePct+"%", c:"var(--gn)", m:t("Plus la part couverte par les prestations est élevée, moins votre plan dépend des rendements boursiers. À " + D.coveragePct + "%, vos placements devraient fournir " + fDol(D.gapMonthly) + " par mois.","The more spending covered by benefits, the less your plan depends on market returns. At " + D.coveragePct + "%, your investments would need to provide " + fDol(D.gapMonthly) + " per month.")},
    {t2:t("Frais de gestion","Management fees"), tx:ai.obs_3 || t("Les frais de gestion pondérés de " + (D.merWeighted*100).toFixed(2) + " % sur vos placements pourraient représenter environ " + fDol(D.feeCostLifetime) + " en coûts cumulatifs sur la durée de votre plan de retraite.","The weighted average management fees of " + (D.merWeighted*100).toFixed(2) + "% on your investments could represent approximately " + fDol(D.feeCostLifetime) + " in estimated cumulative costs over your retirement plan."), im:fDol(D.feeCostLifetime), c:"var(--bl)", m:t("Les frais sont prélevés chaque année sur la valeur de vos placements. Sur " + planHorizon + " ans, même un pourcentage qui semble faible s'accumule de façon importante grâce aux intérêts composés.","Fees are charged each year on your investment balance. Over " + planHorizon + " years, even a seemingly small percentage compounds significantly.")}
  ];
  observations.forEach(function(o, i) {
    h += card('<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><div style="display:flex;align-items:center;gap:10px"><span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;font-size:12px;font-weight:800;color:#fff;background:' + o.c + '">' + (i+1) + '</span><span style="font-weight:700;font-size:15px">' + o.t2 + '</span></div><span style="font-family:monospace;font-size:14px;font-weight:700;color:' + o.c + ';background:' + o.c + '10;padding:4px 14px;border-radius:14px">' + o.im + '</span></div><div style="font-size:14px;color:#444;line-height:1.8;margin-bottom:8px">' + o.tx + '</div><div style="font-size:12px;color:#888;line-height:1.7;padding:10px 14px;background:#FDFBF7;border-radius:6px"><strong style="color:#666">' + t("Ce que cela signifie : ","What this means: ") + '</strong>' + o.m + '</div>', 'border-left:4px solid ' + o.c + ';padding:18px 20px;margin-bottom:14px');
  });
  h += secEnd();

  // === METHODOLOGY (full v4) ===
  sn++;
  h += secH(sn, t("Méthodologie","Methodology"));
  h += card('<div style="line-height:1.85"><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Simulation Monte Carlo","Monte Carlo Simulation") + '</strong><div style="font-size:14px;color:#444;margin-top:6px">' + t("Plutôt que de prédire un seul avenir, nous en simulons " + D.nSim.toLocaleString() + ". Chaque simulation génère une séquence unique de rendements boursiers, de taux d'inflation et de durée de vie — créant " + D.nSim.toLocaleString() + " histoires économiques différentes. Votre taux de réussite de " + D.successPct + "% signifie que dans " + D.successPct + "% de ces histoires, votre argent pourrait durer toute votre retraite.", "Rather than predicting one future, we simulate " + D.nSim.toLocaleString() + ". Each simulation generates a unique sequence of stock returns, inflation rates, and lifespan — creating " + D.nSim.toLocaleString() + " different economic stories. Your " + D.successPct + "% success rate means that in " + D.successPct + "% of those stories, your money could last through retirement.") + '</div></div><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Hypothèses clés","Key assumptions") + '</strong><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:8px;font-size:13px">' + kvr(t("Tables de mortalité","Mortality tables"), "CPM 2023 (Canada)") + kvr(t("Inflation projetée","Projected inflation"), (D.inf*100).toFixed(1) + "% / " + t("an","year")) + kvr(t("Rendements boursiers","Market returns"), t("Distribution historique","Historical distribution")) + kvr(t("Barèmes d'impôts","Tax brackets"), D.prov + " 2026") + kvr(t("Nombre de simulations","Number of simulations"), D.nSim.toLocaleString()) + kvr(t("Modèle de dépenses","Spending model"), t("Montant constant (ajusté pour inflation)","Constant amount (inflation-adjusted)")) + '</div></div><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Approche heuristique — ce que nous avons estimé","Heuristic approach — what we estimated") + '</strong><div style="font-size:14px;color:#555;margin-top:6px">' + t("Certaines données sont estimées à partir de vos réponses au questionnaire : la répartition entre vos différents comptes, vos dépenses de retraite et la croissance de vos revenus. Ces estimations utilisent des moyennes statistiques canadiennes et peuvent différer de votre situation réelle. Le niveau Intermédiaire permet de préciser chacun de ces paramètres pour des résultats plus fidèles.", "Some data is estimated from your questionnaire answers: the split between your different accounts, your retirement spending, and income growth. These estimates use Canadian statistical averages and may differ from your actual situation. The Intermediate tier allows each of these parameters to be specified precisely for more accurate results.") + '</div></div><div><strong style="color:var(--g);font-size:15px">' + t("Limitations","Limitations") + '</strong><div style="font-size:14px;color:#555;margin-top:6px">' + t("Ce modèle ne tient pas compte de : la vente de propriété ou le downsizing, les héritages reçus, les changements majeurs de carrière, les coûts de santé exceptionnels, les modifications législatives futures, ni les revenus de location. Les rendements passés ne garantissent pas les rendements futurs. Les projections fiscales utilisent les barèmes de 2026 et ne tiennent pas compte des changements futurs.", "This model does not account for: property sales or downsizing, inheritances received, major career changes, exceptional health costs, future legislative changes, or rental income. Past returns do not guarantee future performance. Tax projections use 2026 brackets and do not account for future changes.") + '</div></div></div>');
  h += secEnd();

  // === DISCLAIMER (full v4) ===
  h += '<div style="background:#FDF3F3;border:1px solid #E8C8C8;border-radius:10px;padding:24px;font-size:13px;color:#666;line-height:1.85;text-align:center;margin-bottom:28px"><strong style="color:#CC4444;font-size:14px;display:block;margin-bottom:8px">' + t("AVERTISSEMENT IMPORTANT","IMPORTANT DISCLAIMER") + '</strong>' + t("Ce rapport est un outil éducatif basé sur des projections mathématiques. Il NE constitue PAS un conseil financier, fiscal ou juridique personnalisé. Les résultats sont des estimations qui peuvent ne pas refléter votre situation réelle. Aucune garantie de rendement n'est implicite ou explicite. Consultez un planificateur financier accrédité pour des recommandations adaptées à votre situation. buildfi.ca n'est pas un conseiller en placement inscrit au sens de la Loi sur les valeurs mobilières.", "This report is an educational tool based on mathematical projections. It does NOT constitute personalized financial, tax, or legal advice. Results are estimates that may not reflect your actual situation. No guarantee of returns is implied or expressed. Consult an accredited financial planner for recommendations tailored to your situation. buildfi.ca is not a registered investment advisor under securities legislation.") + '</div>';

  // === CTAs ===
  h += '<div class="rpt-cta-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">';
  h += '<div style="background:linear-gradient(135deg,#7C60B8,#9B80D8);border-radius:10px;padding:20px;color:#fff;text-align:center">'
    + '<div style="font-size:14px;font-weight:800;margin-bottom:8px">' + t("Rapport Intermédiaire","Intermediate Report") + '</div>'
    + '<div style="font-size:12px;opacity:.9;line-height:1.65;margin-bottom:10px">' + t("16 sections spécialisées. Votre note "+D.grade+" pourrait-elle atteindre A? Analyses RRQ/RPC, immobilier, couple, CCPC.","16 specialized sections. Could your "+D.grade+" grade reach A? QPP/CPP, real estate, couple, CCPC analysis.") + '</div>'
    + '<div style="background:rgba(255,255,255,.2);border-radius:6px;padding:6px 14px;font-size:13px;font-weight:800;display:inline-block">69 $</div>'
    + '</div>';
  h += '<div style="background:linear-gradient(135deg,#1A1208,#2C1F0A);border-radius:10px;padding:20px;color:#fff;text-align:center">'
    + '<div style="font-size:11px;font-weight:700;color:var(--g);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">buildfi.ca</div>'
    + '<div style="font-size:14px;font-weight:800;margin-bottom:8px">' + t("Simulateur Expert","Expert Simulator") + '</div>'
    + '<div style="font-size:12px;opacity:.85;line-height:1.65;margin-bottom:10px">' + t("RESP, planification corporative, FRV/FERR, analyse successorale. 5 profils de risque distincts.","RESP, corporate planning, LIF/RRIF, estate analysis. 5 distinct risk profiles.") + '</div>'
    + '<div style="background:var(--g);border-radius:6px;padding:6px 14px;font-size:13px;font-weight:800;display:inline-block;color:#1A1208">139 $</div>'
    + '</div>';
  h += '</div>';

  h += '<div style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:10px;border:1px solid var(--bd);background:var(--bgc);cursor:pointer" onclick="window.print()">';
  h += '<span style="font-size:18px">🖨️</span>';
  h += '<div><div style="font-size:13px;font-weight:600;color:var(--ts)">'+t("Imprimer ou sauvegarder en PDF","Print or save as PDF")+'</div>';
  h += '<div style="font-size:11px;color:var(--tm)">'+t("Conservez une copie de votre rapport","Keep a copy of your report")+'</div></div></div></div>';

  if (ai.upgrade_hook) h += '<div style="margin-top:12px;padding:12px 16px;background:var(--bga);border-radius:8px;font-size:12px;color:var(--pr);line-height:1.8;border-left:3px solid var(--pr)">' + ai.upgrade_hook + '</div>';

  // Footer
  h += '<div style="text-align:center;padding-top:20px;border-top:1px solid var(--bd);font-size:10px;color:#bbb">buildfi.ca — Essentiel — v11.12.9 — ' + D.nSim + ' simulations — ' + D.prov + '</div>';

  return '<div style="font-family:DM Sans,-apple-system,sans-serif;color:var(--tx);background:var(--bg);max-width:820px;margin:0 auto;padding:32px 28px 56px;font-size:15px;line-height:1.7">' + h + '</div>';
}


// ══════════════════════════════════════════════════════════════════════
// PUBLIC API: renderReportHTML()
// Wraps renderReport() in a complete HTML document for Puppeteer PDF
// ══════════════════════════════════════════════════════════════════════
export function renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn) {
  var fr = lang === "fr";
  var reportBody = renderReport(D, mc, quiz, ai || {}, false, lang, costDelay || 0, minReturn || 0);
  
  return '<!DOCTYPE html>' +
'<html lang="' + lang + '">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width,initial-scale=1">' +
'  <title>buildfi.ca \u2014 ' + (fr ? "Rapport Essentiel" : "Essential Report") + '</title>' +
'  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
'  <style>' +
'    *{margin:0;padding:0;box-sizing:border-box}' +
'    body{font-family:DM Sans,-apple-system,sans-serif;background:#FEFCF9;color:#1A1A1A;' +
'      -webkit-print-color-adjust:exact;print-color-adjust:exact}' +
'    :root{' +
'      --g:#C4944A;--gl:#D4A85A;--gn:#2A8C46;--gnl:#3AA856;--am:#B89830;' +
'      --rd:#CC4444;--bl:#4680C0;--pr:#7C60B8;--tx:#1A1A1A;--ts:#555;--tm:#888;' +
'      --bg:#FEFCF9;--bgc:#fff;--bd:#E8E0D4;--bdl:#F0ECE4;' +
'      --gbg:rgba(196,148,74,.08);--gnbg:rgba(42,140,70,.06);--ambg:rgba(184,152,48,.06);' +
'      --rdbg:rgba(204,68,68,.06);--bga:rgba(124,96,184,.04);' +
'    }' +
'    @media print{body{background:#fff}.no-print{display:none!important}}' +
'    svg{shape-rendering:geometricPrecision}' +
'  </style>' +
'</head>' +
'<body>' + reportBody + '</body></html>';
}

// Also export helpers for use by webhook
export { validateMC, extractReportData, buildAIPrompt };
