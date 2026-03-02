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
import { computeDerivedProfile, computeRenderPlan } from "./ai-profile";

var REPORT_VERSION = 'v6';

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
// DATA GENERATORS: whatIf, snapshot5yr, heuristics
// ============================================================
function buildWhatIf(p, mc, D, fr) {
  try {
    var start = Date.now();
    var timeout = 3000;
    var scenarios = [];
    function quickSim(modP) {
      if (Date.now() - start > timeout) return null;
      try { return runMC(modP, 500); } catch(e) { return null; }
    }
    function gradeFor(pct) {
      if (pct >= 95) return "A+"; if (pct >= 90) return "A"; if (pct >= 85) return "A-";
      if (pct >= 80) return "B+"; if (pct >= 70) return "B"; if (pct >= 50) return "C";
      if (pct >= 30) return "D"; return "F";
    }
    // 1. Reduce spending by 500$/mo
    var p1 = Object.assign({}, p); p1.retSpM = Math.max(0, p1.retSpM - 500);
    var mc1 = quickSim(p1);
    if (mc1) { var pct1 = Math.round(mc1.succ * 100); scenarios.push({type:"up", title:fr?"R\u00e9duire les d\u00e9penses de 500 $/mois":"Reduce spending by $500/mo", detail:D.retSpM+" $ \u2192 "+p1.retSpM+" $/"+( fr?"mois":"mo"), newPct:pct1, newGrade:gradeFor(pct1)}); }
    // 2. Delay retirement by 2 years
    var p2 = Object.assign({}, p); p2.retAge = p2.retAge + 2;
    var mc2 = quickSim(p2);
    if (mc2) { var pct2 = Math.round(mc2.succ * 100); scenarios.push({type:"up", title:fr?"Reporter la retraite de 2 ans":"Delay retirement by 2 years", detail:D.retAge+" "+( fr?"ans":"yr")+" \u2192 "+p2.retAge+" "+(fr?"ans":"yr"), newPct:pct2, newGrade:gradeFor(pct2)}); }
    // 3. Increase contributions by 200$/mo (2400$/yr)
    var p3 = Object.assign({}, p); p3.rrspC = (p3.rrspC||0) + 2400;
    var mc3 = quickSim(p3);
    if (mc3) { var pct3 = Math.round(mc3.succ * 100); var oldC = Math.round(((p.rrspC||0)+(p.tfsaC||0)+(p.nrC||0))/12); scenarios.push({type:"up", title:fr?"Augmenter les cotisations de 200 $/mois":"Increase contributions by $200/mo", detail:oldC+" $ \u2192 "+(oldC+200)+" $/"+( fr?"mois":"mo"), newPct:pct3, newGrade:gradeFor(pct3)}); }
    // 4. Market crash (heuristic — no MC)
    var crashPct = Math.max(30, D.successPct - 14);
    scenarios.push({type:"down", title:fr?"Krach boursier la premi\u00e8re ann\u00e9e de retraite":"Market crash in first year of retirement", detail:fr?"-40 % sur les actions \u00e0 "+D.retAge+" ans":"-40% on equities at age "+D.retAge, newPct:crashPct, newGrade:gradeFor(crashPct)});
    return scenarios;
  } catch(e) {
    console.warn("buildWhatIf failed, using fallback:", e.message);
    return [];
  }
}

function buildSnapshot5yr(mc, D) {
  try {
    var rd = mc.medRevData || [];
    if (rd.length === 0) return [];
    var inf = D.inf || 0.021;
    var baseAge = D.age;
    var ages = [D.retAge, D.qppAge, 70, 75, 80, 85, D.deathAge];
    // Deduplicate and sort
    var seen = {}; var unique = [];
    ages.forEach(function(a) { if (!seen[a] && a >= D.retAge && a <= D.deathAge) { seen[a] = true; unique.push(a); }});
    unique.sort(function(a,b){return a-b;});
    var rows = [];
    var prevBal = Infinity;
    unique.forEach(function(targetAge) {
      // Find closest row
      var best = null, bestDiff = 999;
      rd.forEach(function(r) { var diff = Math.abs(r.age - targetAge); if (diff < bestDiff) { bestDiff = diff; best = r; }});
      if (!best) return;
      // Deflate nominal values to real (today's dollars)
      var yrsFromNow = targetAge - baseAge;
      var deflator = Math.pow(1 + inf, yrsFromNow);
      var bal = Math.round(((best.aRR||0) + (best.aTF||0) + (best.aNR||0) + (best.aDC||0)) / deflator);
      // D1: enforce monotonically decreasing patrimoine
      bal = Math.min(bal, prevBal);
      prevBal = bal;
      var revGov = Math.round(((best.rrq||0) + (best.psv||0) + (best.pen||0)) / deflator);
      var dep = Math.round((best.spend||0) / deflator);
      var revEp = Math.max(0, dep - revGov);
      rows.push({age:targetAge, bal:bal, revGov:revGov, revEp:revEp, dep:dep});
    });
    return rows;
  } catch(e) {
    console.warn("buildSnapshot5yr failed:", e.message);
    return [];
  }
}

function buildHeuristics(p, D, fr) {
  try {
    var isQC = p.prov === "QC";
    var items = [];
    var totalSav = p.rrsp + p.tfsa + p.nr;
    if (totalSav > 0) {
      var rPct = Math.round(p.rrsp / totalSav * 100);
      var tPct = Math.round(p.tfsa / totalSav * 100);
      var nPct = 100 - rPct - tPct;
      items.push({field:fr?"R\u00e9partition REER/C\u00c9LI/NR":"RRSP/TFSA/NR split", value:rPct+" % / "+tPct+" % / "+nPct+" %", source:fr?"Estimation par \u00e2ge ("+p.age+" ans)":"Estimate by age ("+p.age+")"});
    }
    if (p.dcBal > 0) items.push({field:fr?"Cotisation employeur (CD)":"Employer DC", value:fDol(p.dcBal), source:fr?"Estimation : 6 % du salaire":"Estimate: 6% of salary"});
    items.push({field:fr?"D\u00e9penses de retraite":"Retirement spending", value:fDol(p.retSpM)+"/"+( fr?"mois":"mo"), source:fr?"Style de vie du questionnaire":"Questionnaire lifestyle"});
    items.push({field:fr?"R\u00e9partition d\u2019actifs":"Asset allocation", value:Math.round(p.allocR*100)+" % "+( fr?"actions":"equities")+" / "+Math.round((1-p.allocR)*100)+" % "+( fr?"obligations":"bonds"), source:fr?"Profil de risque":"Risk profile"});
    var merAvg = (p.merR * p.rrsp + p.merT * p.tfsa + p.merN * p.nr) / Math.max(1, totalSav);
    items.push({field:fr?"Frais de gestion":"Management fees", value:(merAvg*100).toFixed(2)+" %", source:fr?"Moyenne pond\u00e9r\u00e9e":"Weighted average"});
    items.push({field:fr?"D\u00e9but "+(isQC?"RRQ":"RPC"):"Start "+(isQC?"QPP":"CPP"), value:p.qppAge+" "+( fr?"ans":"yr"), source:fr?"Align\u00e9 avec l\u2019\u00e2ge de retraite":"Aligned with retirement age"});
    return items;
  } catch(e) {
    console.warn("buildHeuristics failed:", e.message);
    return [];
  }
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
  var margRate = taxInfo ? (taxInfo.marg || 0.30) : 0.30;
  var merW = (p.merR * p.rrsp + p.merT * p.tfsa + p.merN * p.nr) / Math.max(1, p.rrsp + p.tfsa + p.nr);
  var feeCost = Math.round(merW * retBal * (p.deathAge - p.retAge));
  var succPct = Math.round(mc.succ * 100);
  // Grade scale aligned with planner_v2 (8 levels)
  var grade;
  if (succPct >= 95) grade = "A+";
  else if (succPct >= 90) grade = "A";
  else if (succPct >= 85) grade = "A-";
  else if (succPct >= 80) grade = "B+";
  else if (succPct >= 70) grade = "B";
  else if (succPct >= 50) grade = "C";
  else if (succPct >= 30) grade = "D";
  else grade = "F";

  var isQC = p.prov === "QC";
  var rp = p._report || {};
  var q = p._quiz || {};
  var annualContrib = (p.rrspC||0) + (p.tfsaC||0) + (p.nrC||0);
  var monthlyContrib = Math.round(annualContrib / 12);

  var D = {
    age:p.age, retAge:p.retAge, sex:p.sex, prov:p.prov, sal:p.sal,
    deathAge:p.deathAge, avgDeath:p.sex==="F"?87:84,
    totalSavings:p.rrsp+p.tfsa+p.nr, rrsp:p.rrsp, tfsa:p.tfsa, nr:p.nr,
    retYearBalance:retBal, retBal:retBal,
    qppMonthly:qppM, oasMonthly:oasM, dbPensionMonthly:penMo,
    govMonthly:govM, coveragePct:coverPct, gapMonthly:gapM,
    retSpM:p.retSpM, withdrawalRatePct:wdPct,
    successPct:succPct, succ:mc.succ, grade:grade,
    rMedF:Math.round(mc.rMedF||0), rP5F:Math.round(mc.rP5F||0),
    rP25F:Math.round(mc.rP25F||0), rP75F:Math.round(mc.rP75F||0),
    rP95F:Math.round(mc.rP95F||0),
    medRuin:mc.medRuin||999, p5Ruin:mc.p5Ruin||999,
    taxCurrentEffective:taxCurrEff, taxRetirementEffective:taxRetEff,
    taxCurrentMarginal:Math.round(margRate*100),
    margRate:margRate,
    merWeighted:merW, feeCostLifetime:feeCost,
    penType:p.penType, dcBal:p.dcBal, hasPension:p.penType!=="none",
    ptM:p.ptM, ptYrs:p.ptYrs,
    qppAge:p.qppAge, oasAge:p.oasAge,
    inf:p.inf||0.02, nSim:5000,
    medRevData:mc.medRevData,
    expReturn:p.allocR*0.07+(1-p.allocR)*0.035,
    afterTaxReturn:(p.allocR*0.07+(1-p.allocR)*0.035)*(1-margRate*0.5),
    // ── New fields (Commit 2) ──
    income:p.sal,
    monthlyContrib:monthlyContrib,
    rrspC:Math.round((p.rrspC||0)/12), tfsaC:Math.round((p.tfsaC||0)/12), nrC:Math.round((p.nrC||0)/12),
    savingsRate:p.sal>0 ? Math.round(annualContrib/p.sal*100) : 0,
    hasDC:p.penType==="cd",
    employer:q.employer||"",
    couple:q.couple==="yes",
    homeVal:rp.homeVal||0, mortBal:rp.mortBal||0,
    equity:Math.max(0,(rp.homeVal||0)-(rp.mortBal||0)),
    mortFreeAge:rp.mortFreeAge||0, mortPayment:rp.mortPayment||0,
    debts:rp.debts||[], debtBal:rp.debtBal||0, debtAnnualCost:rp.debtAnnualCost||0,
    qppLabel:isQC?"RRQ":"CPP",
    medEstateNet:Math.round(mc.medEstateNet||0), medEstateTax:Math.round(mc.medEstateTax||0),
    date:new Date().toISOString().slice(0,10), version:"11.12.9",
  };

  // Generate derived data (all with try/catch, never crashes)
  // Language is re-generated at render time for whatIf/heuristics — see renderReport_v6
  D.snapshot5yr = buildSnapshot5yr(mc, D);
  D._p = p; D._mc = mc; // stash refs for language-aware regeneration at render time

  return D;
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
  var yrsToGrow = Math.max(0, baseParams.retAge - baseParams.age);
  var totalSav = (baseParams.rrsp||0) + (baseParams.tfsa||0) + (baseParams.nr||0);
  var merW = totalSav > 0
    ? (baseParams.merR * baseParams.rrsp + baseParams.merT * baseParams.tfsa + baseParams.merN * baseParams.nr) / totalSav
    : (baseParams.merR || 0.015);
  var expRet = (baseParams.allocR || 0.7) * 0.07 + (1 - (baseParams.allocR || 0.7)) * 0.035 - merW;
  return Math.round(lostContrib * Math.pow(1 + expRet, yrsToGrow));
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
      why: fr ? "Rendement instantané de 50-100 %. Généralement considéré comme prioritaire." : "Instant 50-100% return. Generally considered first.",
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
      why: fr ? "Taux de " + pct(d.rate) + " garanti. Le rendement garanti est généralement considéré comme un point d\u2019attention prioritaire."
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
      why: fr ? "Taux marginal de " + pct(margRate) + " \u2264 40 %. Souvent considéré en premier." : "Marginal rate " + pct(margRate) + " ≤ 40%. Often considered first.",
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
// AI PROMPT BUILDER (enriched with DerivedProfile + RenderPlan)
// ============================================================
function buildAIPrompt(D, p, fr, quiz) {
  var q = p._quiz || {}, rp = p._report || {};
  var isQC = p.prov === "QC";
  var gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada") : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  var oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  // --- Behavioral profile (from proposal) ---
  var profile = computeDerivedProfile(quiz || {}, D, p);
  var plan = computeRenderPlan(profile, D);

  // --- Tone (now driven by RenderPlan instead of just confidence) ---
  var toneDesc = plan.tone === "warm" ? "Extra warm, reassuring. Lead with positives. Avoid alarming language."
    : plan.tone === "data-forward" ? "Data-driven, confident. Precise numbers. Skip hedging."
    : "Professional, balanced. Mix numbers with context.";

  var litDesc = profile.literacy === "basic" ? "Simple language. Define financial terms. One idea per sentence."
    : profile.literacy === "advanced" ? "Technical terms OK. Reference rates and ratios directly."
    : "Some financial vocabulary OK. Brief inline explanations.";

  // --- Existing instruction maps (preserved) ---
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

  // --- Emphasis block (from proposal) ---
  var emphasisLines = [];
  if (plan.emphasizeDebt) emphasisLines.push("EMPHASIS: Debt impact is the primary friction point. Mathematical cost only.");
  if (plan.emphasizeFees) emphasisLines.push("EMPHASIS: Fee drag is significant. Highlight compounding cost.");
  if (plan.emphasizeGov) emphasisLines.push("EMPHASIS: Government coverage is low. Focus on gap funding.");
  var emphasisBlock = emphasisLines.length > 0 ? emphasisLines.join("\n") + "\n" : "";

  // --- Risk ordering (from proposal) ---
  var riskOrder = plan.worstCasePlacement === "standard"
    ? "RISK ORDER: Include stress test early, keep tone calm."
    : "RISK ORDER: Do not lead with worst-case. Mention it later and soften with context.";

  // --- DATA block (preserved from original) ---
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

  // --- SYSTEM PROMPT (enriched with anti-hallucination + micro-structure + AMF) ---
  var sys = "You narrate buildfi.ca Essentiel reports.\n"
    + "\n=== COMPLIANCE (AMF / OSFI) ===\n"
    + "This is an EDUCATIONAL tool, NOT financial advice.\n"
    + "1. Facts from DATA may use present tense.\n"
    + "2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).\n"
    + "3. NEVER use prescriptive verbs: devriez, recommandons, conseillons, il faut, devez, assurez-vous, you should, you must, we recommend.\n"
    + "4. Observational language only. Describe what numbers show; do not prescribe actions.\n"
    + "5. Do not shame debt. State the mathematical cost only.\n"
    + "6. NEVER suggest combining scenarios or adding their effects together.\n"
    + "\n=== NUMERIC SAFETY ===\n"
    + "- Use ONLY numbers that appear in the DATA block. Do NOT invent, round, estimate, or extrapolate any figure.\n"
    + "- No external averages, no typical ranges, no invented thresholds.\n"
    + "\n=== STYLE ===\n"
    + "- Language: " + (fr ? "French (vous)" : "English") + ".\n"
    + "- Reading level: Grade 10. Short sentences. No jargon.\n"
    + "- Acronyms: NEVER use acronyms. Write in full: " + gP + ", " + oN + ".\n"
    + "\n=== MICRO-STRUCTURE PER SLOT (MANDATORY) ===\n"
    + "Sentence 1: One specific numeric observation from DATA.\n"
    + "Sentence 2: Plain-language implication (conditional tense).\n"
    + "Sentence 3: Nuance about variability or condition (conditional), if applicable.\n"
    + "\n=== PERSONALIZATION (MANDATORY) ===\n"
    + "- In snapshot_intro, mirror exactly one idea from WIN or WORRIES (without quoting).\n"
    + "- If WORRIES is empty, mirror one positive habit from savings.\n"
    + "- Keep a coherent emotional arc: start reassuring, frame risk as manageable variability.\n"
    + "\n=== OUTPUT ===\n"
    + "- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences. No trailing commas.\n"
    + "- If you cannot comply, output {}.";

  // --- USER PROMPT (enriched with profile + emphasis + risk order) ---
  var usr = "TONE: " + plan.tone.toUpperCase() + " \u2014 " + toneDesc + "\n"
    + "LITERACY: " + profile.literacy + " \u2014 " + litDesc + "\n"
    + emphasisBlock
    + riskOrder + "\n"
    + winInstr + "\n" + fixInstr + "\n"
    + (wInstr ? "WORRIES: " + wInstr + "\n" : "")
    + "PROFILE: anxiety=" + profile.anxiety + ", discipline=" + profile.discipline
    + ", friction=" + profile.primaryFriction + ", theme=" + profile.narrativeTheme + "\n"
    + (cplSlot ? cplSlot + "\n" : "") + (propSlot ? propSlot + "\n" : "") + (ptSlot ? ptSlot + "\n" : "")
    + "\nDATA: " + JSON.stringify(data)
    + '\n\nReturn JSON (2-3 sentences each, micro-structure: number \u2192 implication \u2192 nuance):\n'
    + '{"snapshot_intro":"Grade ' + D.grade + ' + WIN acknowledgment.",'
    + debtSlot
    + '"savings_context":"Trajectory from current to projected.",'
    + '"gov_explanation":"' + gP + ' + ' + oN + ' breakdown.",'
    + '"gap_explanation":"Gap + withdrawal rate + sustainability.",'
    + '"tax_insight":"Current vs retirement rate comparison.",'
    + '"longevity_good":"Median + optimistic scenario.",'
    + '"longevity_watch":"Pessimistic scenario + critical years.",'
    + '"obs_1":"FIX-driven observation.",'
    + '"obs_2":"Government coverage observation.",'
    + '"obs_3":"Fee impact observation.",'
    + '"upgrade_hook":"Personalized for ' + hooks + '."}';

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
// RENDER REPORT V5 (preserved fallback — switch REPORT_VERSION to 'v5' to revert)
// ============================================================
function renderReport_v5(D, mc, quiz, ai, aiLoading, lang, costDelay, minReturn) {
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
  var totalSav = D.totalSavings + (D.penType === "cd" ? D.dcBal : 0);
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
  h += card(kvr(t("Âge","Age"), D.age + t(" ans"," years")) + kvr(t("Retraite prévue","Planned retirement"), D.retAge + t(" ans"," years") + ' (' + yrsToRet + t(" ans)"," years)")) + kvr(t("Revenu annuel","Annual income"), fDol(D.sal)) + kvr("Province", D.prov) + kvr(t("Dépenses prévues à la retraite","Planned retirement spending"), fDol(D.retSpM) + t(" $/mois"," $/mo")) + (D.hasPension ? kvr(t("Régime de pension d'employeur","Employer pension plan"), D.penType === "cd" ? t("Cotisations déterminées","Defined contribution") + " (" + fDol(D.dcBal) + ")" : t("Prestations déterminées","Defined benefit") + " (" + fDol(D.dbPensionMonthly) + t(" $/mois"," $/mo") + ")") : ''));
  h += secEnd();

  // === S3: SAVINGS with Wealth Chart + Account Breakdown ===
  h += secH(3, t("Votre épargne","Your Savings"));
  h += aiSlot(ai.savings_context);
  h += '<div class="rpt-grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">' + kp(fDol(totalSav), t("Épargne totale","Total savings"), null, D.penType==="cd"?t("incluant pension","including pension"):null) + kp(fDol(D.retYearBalance), t("Projeté à la retraite","Projected at retirement"), "var(--gn)") + kp(D.withdrawalRatePct + "%", t("Taux de retrait annuel","Annual withdrawal rate"), D.withdrawalRatePct <= 4 ? "var(--gn)" : "var(--am)", t("règle des 4% = repère","4% rule = benchmark")) + '</div>';
  // Wealth chart
  h += card('<div style="font-size:11px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;padding-left:8px">' + t("Projection du patrimoine","Wealth projection") + '</div>' + wealthChartSVG(), 'padding:16px 12px 8px');
  // Account breakdown
  h += card(kvr(t("Compte de retraite enregistré (REER)","Registered retirement account (RRSP)"), fDol(D.rrsp)) + kvr(t("Compte d'épargne libre d'impôt (CELI)","Tax-free savings account (TFSA)"), fDol(D.tfsa)) + kvr(t("Placements non enregistrés","Non-registered investments"), fDol(D.nr)) + (D.penType === "cd" ? kvr(t("Régime à cotisations déterminées","Defined contribution plan"), fDol(D.dcBal)) : ''));
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
    h += '<div style="font-size:13px;font-weight:700;color:var(--ts);margin:18px 0 10px;border-bottom:1px solid var(--bd);padding-bottom:6px">' + t("Comparatif \u2014 impact financier par cat\u00e9gorie","Comparative \u2014 financial impact by category") + '</div>';
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
  h += '<div style="font-size:13px;color:#888;line-height:1.75;margin-bottom:16px;padding:10px 14px;background:#FDFBF7;border-radius:6px;border:1px solid var(--bdl)">' + t("Chaque sc\u00e9nario est \u00e9valu\u00e9 isol\u00e9ment; les effets ne s\u2019additionneraient pas automatiquement.","Each scenario is evaluated in isolation; the effects would not automatically add up.") + '</div>';

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
  h += card('<div style="line-height:1.85"><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Simulation Monte Carlo","Monte Carlo Simulation") + '</strong><div style="font-size:14px;color:#444;margin-top:6px">' + t("Plutôt que de prédire un seul avenir, nous en simulons " + D.nSim.toLocaleString() + ". Chaque simulation génère une séquence unique de rendements boursiers, de taux d'inflation et de durée de vie — créant " + D.nSim.toLocaleString() + " histoires économiques différentes. Votre taux de réussite de " + D.successPct + "% signifie que dans " + D.successPct + "% de ces histoires, votre argent pourrait durer toute votre retraite.", "Rather than predicting one future, we simulate " + D.nSim.toLocaleString() + ". Each simulation generates a unique sequence of stock returns, inflation rates, and lifespan — creating " + D.nSim.toLocaleString() + " different economic stories. Your " + D.successPct + "% success rate means that in " + D.successPct + "% of those stories, your money could last through retirement.") + '</div></div><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Hypothèses clés","Key assumptions") + '</strong><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:8px;font-size:13px">' + kvr(t("Tables de mortalité","Mortality tables"), "CPM 2023 (Canada)") + kvr(t("Inflation projetée","Projected inflation"), (D.inf*100).toFixed(1) + "% / " + t("an","year")) + kvr(t("Rendements boursiers","Market returns"), t("Distribution historique","Historical distribution")) + kvr(t("Barèmes d'impôts","Tax brackets"), D.prov + " 2026") + kvr(t("Nombre de simulations","Number of simulations"), D.nSim.toLocaleString()) + kvr(t("Modèle de dépenses","Spending model"), t("Montant constant (ajust\u00e9 pour inflation)","Constant amount (inflation-adjusted)")) + '</div><div style="font-size:12px;color:#888;margin-top:8px;padding:6px 12px;background:#FDFBF7;border-radius:4px;border:1px solid var(--bdl)">' + t("Esp\u00e9rance de vie estim\u00e9e (table CPM 2023)","Estimated life expectancy (CPM 2023 table)") + '</div></div><div style="margin-bottom:20px"><strong style="color:var(--g);font-size:15px">' + t("Approche heuristique — ce que nous avons estimé","Heuristic approach — what we estimated") + '</strong><div style="font-size:14px;color:#555;margin-top:6px">' + t("Certaines données sont estimées à partir de vos réponses au questionnaire : la répartition entre vos différents comptes, vos dépenses de retraite et la croissance de vos revenus. Ces estimations utilisent des moyennes statistiques canadiennes et peuvent différer de votre situation réelle. Le niveau Intermédiaire permet de préciser chacun de ces paramètres pour des résultats plus fidèles.", "Some data is estimated from your questionnaire answers: the split between your different accounts, your retirement spending, and income growth. These estimates use Canadian statistical averages and may differ from your actual situation. The Intermediate tier allows each of these parameters to be specified precisely for more accurate results.") + '</div></div><div><strong style="color:var(--g);font-size:15px">' + t("Limitations","Limitations") + '</strong><div style="font-size:14px;color:#555;margin-top:6px">' + t("Ce modèle ne tient pas compte de : la vente de propriété ou le downsizing, les héritages reçus, les changements majeurs de carrière, les coûts de santé exceptionnels, les modifications législatives futures, ni les revenus de location. Les rendements passés ne garantissent pas les rendements futurs. Les projections fiscales utilisent les barèmes de 2026 et ne tiennent pas compte des changements futurs.", "This model does not account for: property sales or downsizing, inheritances received, major career changes, exceptional health costs, future legislative changes, or rental income. Past returns do not guarantee future performance. Tax projections use 2026 brackets and do not account for future changes.") + '</div></div></div>');
  h += secEnd();

  // === DISCLAIMER (full v4) ===
  h += '<div style="background:#FDF3F3;border:1px solid #E8C8C8;border-radius:10px;padding:24px;font-size:13px;color:#666;line-height:1.85;text-align:center;margin-bottom:28px"><strong style="color:#CC4444;font-size:14px;display:block;margin-bottom:8px">' + t("AVERTISSEMENT IMPORTANT","IMPORTANT DISCLAIMER") + '</strong>' + t("Ce rapport est un outil éducatif basé sur des projections mathématiques. Il NE constitue PAS un conseil financier, fiscal ou juridique personnalisé. Les résultats sont des estimations qui peuvent ne pas refléter votre situation réelle. Aucune garantie de rendement n'est implicite ou explicite. Il serait souvent pertinent de valider ces \u00e9l\u00e9ments avec un planificateur financier accr\u00e9dit\u00e9. buildfi.ca n'est pas un conseiller en placement inscrit au sens de la Loi sur les valeurs mobili\u00e8res.", "This report is an educational tool based on mathematical projections. It does NOT constitute personalized financial, tax, or legal advice. Results are estimates that may not reflect your actual situation. No guarantee of returns is implied or expressed. It would often be relevant to validate these elements with an accredited financial planner. buildfi.ca is not a registered investment advisor under securities legislation.") + '</div>';

  // === CTAs ===
  h += '<div class="rpt-cta-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">';
  h += '<div style="background:linear-gradient(135deg,#7C60B8,#9B80D8);border-radius:10px;padding:20px;color:#fff;text-align:center">'
    + '<div style="font-size:14px;font-weight:800;margin-bottom:8px">' + t("Rapport Intermédiaire","Intermediate Report") + '</div>'
    + '<div style="font-size:12px;opacity:.9;line-height:1.65;margin-bottom:10px">' + t("16 sections sp\u00e9cialis\u00e9es. Votre note "+D.grade+" pourrait-elle atteindre A? Analyses " + gP + ", immobilier, couple, CCPC.","16 specialized sections. Could your "+D.grade+" grade reach A? " + gP + ", real estate, couple, CCPC analysis.") + '</div>'
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


// ============================================================
// V6 HELPERS: gradeInfo, format, charts
// ============================================================
function gradeInfo(s, fr) {
  var t = function(f,e){return fr?f:e;};
  if(s>=.95)return{g:"A+",l:t("Excellent","Excellent"),c:"var(--gn)"};
  if(s>=.90)return{g:"A",l:t("Très solide","Very solid"),c:"var(--gn)"};
  if(s>=.85)return{g:"A-",l:t("Solide","Solid"),c:"var(--gn)"};
  if(s>=.80)return{g:"B+",l:t("Acceptable","Acceptable"),c:"var(--bl)"};
  if(s>=.70)return{g:"B",l:t("Correct, à renforcer","Adequate, room to improve"),c:"var(--amr)"};
  if(s>=.50)return{g:"C",l:t("À risque","At risk"),c:"var(--amr)"};
  if(s>=.30)return{g:"D",l:t("En danger","At risk"),c:"var(--rd)"};
  return{g:"F",l:t("Critique","Critical"),c:"var(--rd)"};
}
function fDolV6(v){if(v==null||isNaN(v)||!isFinite(v))return"\u2014";return new Intl.NumberFormat("fr-CA",{style:"decimal",maximumFractionDigits:0}).format(Math.round(v))+" $";}
function fKV6(v){if(v==null||isNaN(v)||!isFinite(v))return"\u2014";if(Math.abs(v)<1000)return Math.round(v)+" $";if(Math.abs(v)>=1e6)return(v/1e6).toFixed(1)+"M $";return Math.round(v/1e3)+"K $";}

function buildFanV6(pD, retAge, fr) {
  var t = function(f,e){return fr?f:e;};
  var W=740,H=370,ml=58,mr=42,mt=22,mb=52;
  var w=W-ml-mr,h=H-mt-mb;
  var data=pD;if(!data||data.length<2)return"";
  var yMin=0,yMax=0;
  data.forEach(function(d){yMax=Math.max(yMax,d.rp95||0,d.rp75||0,d.rp50||0);});
  yMax=Math.ceil(yMax*1.08/100000)*100000;if(yMax<100000)yMax=100000;
  var yRange=yMax-yMin;
  function xP(i){return ml+i/(data.length-1)*w;}
  function yP(v){return mt+h-(Math.max(0,v)-yMin)/yRange*h;}
  function mkLine(k){return data.map(function(d,i){return(i===0?"M":"L")+xP(i).toFixed(1)+","+yP(d[k]||0).toFixed(1);}).join("");}
  function mkArea(k){var ln=mkLine(k);return ln+"L"+xP(data.length-1).toFixed(1)+","+yP(0).toFixed(1)+"L"+xP(0).toFixed(1)+","+yP(0).toFixed(1)+"Z";}
  var s='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">';
  for(var g=0;g<=5;g++){var gy=mt+g/5*h,gv=yMax*(1-g/5);
    s+='<line x1="'+ml+'" y1="'+gy+'" x2="'+(W-mr)+'" y2="'+gy+'" stroke="#555" stroke-dasharray="3,3" opacity="0.15"/>';
    s+='<text x="'+(ml-8)+'" y="'+(gy+4)+'" text-anchor="end" font-size="11" font-family="var(--mono)" fill="var(--tm)">'+fKV6(gv)+'</text>';}
  s+='<path d="'+mkArea("rp95")+'" fill="var(--bl)" fill-opacity="0.06"/>';
  s+='<path d="'+mkArea("rp75")+'" fill="var(--bl)" fill-opacity="0.08"/>';
  s+='<path d="'+mkArea("rp50")+'" fill="var(--bl)" fill-opacity="0.10"/>';
  s+='<path d="'+mkArea("rp25")+'" fill="var(--am)" fill-opacity="0.08"/>';
  s+='<path d="'+mkArea("rp5")+'" fill="var(--rd)" fill-opacity="0.07"/>';
  s+='<path d="'+mkLine("rp95")+'" fill="none" stroke="var(--bl)" stroke-width="1" opacity="0.35"/>';
  s+='<path d="'+mkLine("rp75")+'" fill="none" stroke="var(--bl)" stroke-width="1" opacity="0.45"/>';
  s+='<path d="'+mkLine("rp25")+'" fill="none" stroke="var(--am)" stroke-width="1" opacity="0.5"/>';
  s+='<path d="'+mkLine("rp5")+'" fill="none" stroke="var(--rd)" stroke-width="1" opacity="0.5"/>';
  s+='<path d="'+mkLine("rp50")+'" fill="none" stroke="var(--bl)" stroke-width="2.5"/>';
  var retIdx=-1;for(var ri=0;ri<data.length;ri++){if(data[ri].age>=retAge){retIdx=ri;break;}}
  if(retIdx>=0){var rx=xP(retIdx);
    s+='<line x1="'+rx+'" y1="'+mt+'" x2="'+rx+'" y2="'+(mt+h)+'" stroke="var(--gd)" stroke-dasharray="6,3" stroke-width="1.5"/>';
    // E10: annotation circle + P50 label at retirement point
    var retP50=data[retIdx].rp50||0;
    s+='<circle cx="'+rx+'" cy="'+yP(retP50)+'" r="4" fill="var(--bl)" stroke="#fff" stroke-width="1.5"/>';
    s+='<text x="'+(rx+8)+'" y="'+(yP(retP50)-8)+'" font-size="10" font-weight="600" fill="var(--bl)">'+fKV6(retP50)+'</text>';
    s+='<text x="'+rx+'" y="'+(mt-6)+'" text-anchor="middle" font-size="10" font-weight="700" fill="var(--gd)">'+t("Retraite","Retirement")+'</text>';}
  var li=data.length-1,lx=xP(li)+5;
  var labels=[["rp95","P95","var(--bl)"],["rp75","P75","var(--bl)"],["rp50","P50","var(--bl)"],["rp25","P25","var(--am)"],["rp5","P5","var(--rd)"]];
  var prevY=-999;
  labels.forEach(function(lb){
    var ly2=yP(data[li][lb[0]]||0);
    if(Math.abs(ly2-prevY)<12)ly2=prevY+12;
    s+='<text x="'+lx+'" y="'+(ly2+3)+'" font-size="9" font-weight="600" fill="'+lb[2]+'" opacity="0.7">'+lb[1]+'</text>';
    prevY=ly2;});
  s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+(mt+h)+'" y2="'+(mt+h)+'" stroke="var(--tm)" opacity="0.3"/>';
  var step=Math.max(1,Math.round(data.length/9));
  for(var xi=0;xi<data.length;xi+=step)s+='<text x="'+xP(xi)+'" y="'+(mt+h+18)+'" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--tm)">'+data[xi].age+'</text>';
  if((data.length-1)%step>1)s+='<text x="'+xP(data.length-1)+'" y="'+(mt+h+18)+'" text-anchor="middle" font-size="11" font-family="var(--mono)" fill="var(--tm)">'+data[data.length-1].age+'</text>';
  var ly=H-8;
  s+='<line x1="'+ml+'" x2="'+(ml+18)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--bl)" stroke-width="2.5"/>';
  s+='<text x="'+(ml+22)+'" y="'+(ly+3)+'" font-size="9.5" fill="var(--tm)">'+t("M\u00e9diane (P50)","Median (P50)")+'</text>';
  s+='<line x1="'+(ml+120)+'" x2="'+(ml+138)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--bl)" stroke-width="1" opacity="0.4"/>';
  s+='<text x="'+(ml+142)+'" y="'+(ly+3)+'" font-size="9.5" fill="var(--tm)">P75 / P95</text>';
  s+='<line x1="'+(ml+210)+'" x2="'+(ml+228)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--am)" stroke-width="1" opacity="0.5"/>';
  s+='<text x="'+(ml+232)+'" y="'+(ly+3)+'" font-size="9.5" fill="var(--tm)">P25</text>';
  s+='<line x1="'+(ml+270)+'" x2="'+(ml+288)+'" y1="'+ly+'" y2="'+ly+'" stroke="var(--rd)" stroke-width="1" opacity="0.5"/>';
  s+='<text x="'+(ml+292)+'" y="'+(ly+3)+'" font-size="9.5" fill="var(--tm)">P5</text>';
  s+='</svg>';return s;
}

function buildDonutV6(streams, fr) {
  var t = function(f,e){return fr?f:e;};
  var sz=180,cx=90,cy=90,r=65,r2=45,total=0;
  streams.forEach(function(s){total+=s.monthly;});
  if(total<=0)return"";
  var svg='<svg width="'+sz+'" height="'+sz+'" viewBox="0 0 '+sz+' '+sz+'">';
  var ang=-90;streams.forEach(function(s){
    var pc=s.monthly/total,sw=pc*360,sr=ang*Math.PI/180,er=(ang+sw)*Math.PI/180,la=sw>180?1:0;
    var x1=cx+r*Math.cos(sr),y1=cy+r*Math.sin(sr),x2=cx+r*Math.cos(er),y2=cy+r*Math.sin(er);
    var x3=cx+r2*Math.cos(er),y3=cy+r2*Math.sin(er),x4=cx+r2*Math.cos(sr),y4=cy+r2*Math.sin(sr);
    svg+='<path d="M'+x1+','+y1+' A'+r+','+r+' 0 '+la+',1 '+x2+','+y2+' L'+x3+','+y3+' A'+r2+','+r2+' 0 '+la+',0 '+x4+','+y4+' Z" fill="'+s.color+'" opacity="0.85"/>';
    ang+=sw;});
  svg+='<text x="'+cx+'" y="'+(cy-4)+'" text-anchor="middle" font-family="var(--mono)" font-size="16" font-weight="700" fill="var(--tx)">'+fDolV6(total)+'</text>';
  svg+='<text x="'+cx+'" y="'+(cy+12)+'" text-anchor="middle" font-size="10" fill="var(--tm)">/ '+t("mois","mo")+'</text></svg>';return svg;
}

// Build fan chart pD fallback from MC endpoints (2-segment interpolation)
function buildPDfallback(D) {
  var d=[];
  var totalSav = D.totalSavings + (D.penType==="cd" ? D.dcBal : 0);
  for(var y=0;y<=D.deathAge-D.age;y++){
    var a=D.age+y,ret=a>=D.retAge;
    var accum=totalSav+(D.retYearBalance-totalSav)*Math.min(1,y/Math.max(1,D.retAge-D.age));
    if(!ret){
      var yearFrac = y / Math.max(1, D.retAge - D.age);
      var spread = yearFrac;
      d.push({age:a,rp5:accum*(1-0.30*spread),rp25:accum*(1-0.15*spread),rp50:accum,rp75:accum*(1+0.15*spread),rp95:accum*(1+0.40*spread)});
      continue;
    }
    var t2=Math.min(1,(a-D.retAge)/Math.max(1,D.deathAge-D.retAge));
    var p50=D.retYearBalance+(D.rMedF-D.retYearBalance)*t2;
    var p75=D.retYearBalance+((D.rP75F||D.rMedF*1.5)-D.retYearBalance)*Math.pow(t2,0.5);
    var p95=D.retYearBalance+((D.rP95F||D.rP75F*1.5)-D.retYearBalance)*Math.pow(t2,0.4);
    var p25=D.retYearBalance+((D.rP25F||D.rP5F*2)-D.retYearBalance)*t2;
    var p5=D.retYearBalance+(D.rP5F-D.retYearBalance)*Math.pow(t2,0.7);
    d.push({age:a,rp5:Math.max(0,p5),rp25:Math.max(0,p25),rp50:Math.max(0,p50),rp75:p75,rp95:p95});
  }
  return d;
}

// ============================================================
// RENDER REPORT V6 (v6 layout with CSS classes, v6 charts)
// ============================================================
function renderReport_v6(D, mc, quiz, ai, aiLoading, lang, costDelay, minReturn) {
  costDelay = costDelay || 0;
  minReturn = minReturn || 0;
  var fr = lang === "fr";
  var t = function(f,e){return fr?f:e;};
  var isQC = D.prov === "QC";
  var f$ = fDolV6;

  // Compute fields not yet in D (will be moved to extractReportData in Commit 2)
  var provLabels = {QC:"Qu\u00e9bec",ON:"Ontario",BC:"Colombie-Britannique",AB:"Alberta",MB:"Manitoba",SK:"Saskatchewan",NS:"Nouvelle-\u00c9cosse",NB:"Nouveau-Brunswick",PE:"\u00cele-du-Prince-\u00c9douard",NL:"Terre-Neuve-et-Labrador",NT:"Territoires du Nord-Ouest",NU:"Nunavut",YT:"Yukon"};
  var provLabel = (fr ? provLabels[D.prov] : D.prov) || D.prov;
  var qppLabel = isQC ? "RRQ" : "CPP";
  var params = translateToMC(quiz);
  var rp = params._report || {};
  var priorities = buildPriority(D, params, fr);
  var hasDC = D.hasDC || D.penType === "cd";
  var totalSav = D.totalSavings + (hasDC ? D.dcBal : 0);
  var monthlyContrib = D.monthlyContrib || Math.round(((params.rrspC||0) + (params.tfsaC||0) + (params.nrC||0)) / 12);
  var savingsRate = D.savingsRate || (D.sal > 0 ? Math.round(monthlyContrib * 12 / D.sal * 100) : 0);
  var date = D.date || new Date().toLocaleDateString(fr?"fr-CA":"en-CA");
  var vulnYrs = Math.max(0, D.qppAge - D.retAge);
  var gi = gradeInfo(D.succ, fr);
  // Regenerate language-sensitive data at render time
  if (D._p && D._mc) {
    D.whatIf = buildWhatIf(D._p, D._mc, D, fr);
    D.heuristics = buildHeuristics(D._p, D, fr);
  } else {
    D.whatIf = D.whatIf || [];
    D.heuristics = D.heuristics || [];
  }
  ai = ai || {};

  // Income streams for donut
  var incStreams = [
    {label: qppLabel, monthly: D.qppMonthly, color: "#4680C0"},
    {label: t("Pension de la S\u00e9curit\u00e9 de la vieillesse (PSV)","Old Age Security (OAS)"), monthly: D.oasMonthly, color: "#2A8C46"},
  ];
  if (D.dbPensionMonthly > 0) incStreams.push({label: t("R\u00e9gime de retraite","Pension plan"), monthly: D.dbPensionMonthly, color: "#7B61A6"});
  incStreams.push({label: t("\u00c9pargne","Savings"), monthly: D.gapMonthly, color: "#C4944A"});

  // Fan chart data: use mc.pD if available, else build fallback
  var pD = (mc && mc.pD) ? mc.pD : buildPDfallback(D);

  var h = '', sn = 0;

  // ═══ HEADER ═══
  h += '<div class="rpt">';
  h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;flex-wrap:wrap">';
  h += '<div>';
  h += '<svg xmlns="http://www.w3.org/2000/svg" width="153" height="44" viewBox="0 0 180 52"><defs><linearGradient id="embG" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#C45A2C"/><stop offset="100%" stop-color="#E8A84C"/></linearGradient></defs><path d="M14 46 C14 46 8 30 14 18 C20 6 26 12 26 22 C26 12 32 0 38 10 C44 22 38 32 38 32" stroke="url(#embG)" stroke-width="3" fill="none" stroke-linecap="round"/><text x="48" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" fill="#1A1A1A" letter-spacing="-1.2">build</text><text x="131" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" fill="url(#embG)" letter-spacing="-1.2">fi</text></svg>';
  h += '<div style="font-size:13px;color:var(--tm);margin-top:4px">' + t("Rapport Essentiel","Essential Report") + ' \u2014 ' + date + '</div></div>';
  h += '<div style="text-align:right;font-size:10px;color:var(--tl);line-height:1.9">' + provLabel + '<br>' + D.nSim.toLocaleString() + ' ' + t("sc\u00e9narios","scenarios") + '<br>' + date + '</div></div>';

  // ═══ MINI TABLE DES MATIÈRES ═══
  var tocItems = [
    [t("Note","Grade"), "#sec-note"],
    [t("Profil","Profile"), "#sec-profil"],
    [t("Projection","Projection"), "#sec-projection"],
    [t("Revenus","Income"), "#sec-revenus"],
    [t("\u00c9pargne","Savings"), "#sec-epargne"],
    [t("Priorit\u00e9s","Priorities"), "#sec-priorite"],
    [t("Fiscalit\u00e9","Taxes"), "#sec-fiscalite"]
  ];
  h += '<div class="np" style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 32px">';
  tocItems.forEach(function(item){
    h += '<a href="' + item[1] + '" style="font-size:11px;text-decoration:none;color:var(--ts);padding:5px 10px;border:1px solid var(--bd);border-radius:999px;background:var(--cd)">' + item[0] + '</a>';
  });
  h += '</div>';

  // ═══ 1. NOTE ═══
  sn++;
  h += '<div class="sg" id="sec-note"><div class="sh"><span class="sn">' + sn + '</span>' + t("Votre note de retraite","Your retirement grade") + '</div>';
  var circ = 2 * Math.PI * 48, off = circ * (1 - D.succ);
  h += '<div class="c"><div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">';
  h += '<div style="position:relative;width:130px;height:130px;flex-shrink:0">';
  h += '<svg width="130" height="130" style="transform:rotate(-90deg)"><circle cx="65" cy="65" r="48" fill="none" stroke="var(--bd)" stroke-width="9"/>';
  h += '<circle cx="65" cy="65" r="48" fill="none" stroke="' + gi.c + '" stroke-width="9" stroke-linecap="round" stroke-dasharray="' + circ + '" stroke-dashoffset="' + off + '"/></svg>';
  h += '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center"><div style="font-family:var(--mono);font-size:40px;font-weight:900;color:' + gi.c + ';line-height:1">' + gi.g + '</div></div></div>';
  h += '<div style="flex:1;min-width:240px">';
  h += '<div style="display:inline-block;padding:5px 18px;border-radius:20px;font-weight:800;font-size:13px;color:#fff;background:' + gi.c + ';margin-bottom:12px">' + gi.g + ' \u2014 ' + gi.l + '</div>';
  if (ai.snapshot_intro) h += '<div style="font-size:14px;color:var(--ts);line-height:1.85">' + ai.snapshot_intro + '</div>';
  else h += '<div style="font-size:14px;color:var(--ts);line-height:1.85">' + t("Cet outil a simul\u00e9 " + D.nSim.toLocaleString() + " avenirs \u00e9conomiques diff\u00e9rents. Dans <strong>" + D.successPct + " %</strong> de ces sc\u00e9narios, votre argent pourrait durer toute votre retraite.", "This tool simulated " + D.nSim.toLocaleString() + " different economic futures. In <strong>" + D.successPct + "%</strong> of scenarios, your money could last through retirement.") + '</div>';
  h += '</div></div></div>';
  h += '<div class="co cog">' + t("Tous les montants sont en <strong>dollars d\u2019aujourd\u2019hui</strong> \u2014 ajust\u00e9s pour l\u2019inflation projet\u00e9e \u00e0 " + (D.inf*100).toFixed(1) + " % par ann\u00e9e.", "All amounts are in <strong>today\u2019s dollars</strong> \u2014 adjusted for projected inflation of " + (D.inf*100).toFixed(1) + "% per year.") + '</div>';
  // TL;DR 3 bullets (data-driven, no AI dependency)
  var tldrRisk = vulnYrs > 0
    ? t("P\u00e9riode vuln\u00e9rable " + D.retAge + "\u2013" + D.qppAge + " : tout repose sur l\u2019\u00e9pargne avant le " + qppLabel + " et la PSV.",
        "Vulnerable period " + D.retAge + "\u2013" + D.qppAge + ": everything relies on savings before " + qppLabel + " and OAS.")
    : (D.withdrawalRatePct > 4
      ? t("Taux de retrait de " + D.withdrawalRatePct + " % : l\u00e9g\u00e8rement au-dessus du seuil de 4 % historiquement soutenable.",
          "Withdrawal rate of " + D.withdrawalRatePct + "%: slightly above the historically sustainable 4% threshold.")
      : t("Taux de retrait de " + D.withdrawalRatePct + " % : sous le seuil de 4 % historiquement soutenable.",
          "Withdrawal rate of " + D.withdrawalRatePct + "%: below the historically sustainable 4% threshold."));
  var tldrAction = '';
  if (D.debtBal > 0 && D.debts && D.debts.length) {
    var worstDebt = D.debts.reduce(function(a,b){return a.rate > b.rate ? a : b;});
    tldrAction = t("Rendement garanti de " + Math.round(worstDebt.rate*100) + " % sur chaque dollar rembours\u00e9 sur la dette la plus co\u00fbteuse.",
                    "Guaranteed " + Math.round(worstDebt.rate*100) + "% return on every dollar paid toward the costliest debt.");
  } else {
    tldrAction = t("Cotisation mensuelle de " + f$(monthlyContrib) + " \u2014 chaque dollar additionnel b\u00e9n\u00e9ficie de " + (D.retAge - D.age) + " ans d\u2019int\u00e9r\u00eats compos\u00e9s.",
                    "Monthly contribution of " + f$(monthlyContrib) + " \u2014 each additional dollar benefits from " + (D.retAge - D.age) + " years of compounding.");
  }
  h += '<div class="c" style="padding:18px 20px;margin-top:14px">';
  h += '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px"><span style="width:22px;text-align:center;flex-shrink:0;font-size:15px">\u2705</span><div style="font-size:14px;line-height:1.6"><strong>' + gi.g + ' (' + D.successPct + ' %)</strong> : ' + t("plan viable dans la majorit\u00e9 des sc\u00e9narios simul\u00e9s.","viable plan in the majority of simulated scenarios.") + '</div></div>';
  h += '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px"><span style="width:22px;text-align:center;flex-shrink:0;font-size:15px">\u26a0\ufe0f</span><div style="font-size:14px;line-height:1.6">' + tldrRisk + '</div></div>';
  h += '<div style="display:flex;gap:10px;align-items:flex-start"><span style="width:22px;text-align:center;flex-shrink:0;font-size:15px">\ud83c\udfaf</span><div style="font-size:14px;line-height:1.6">' + tldrAction + '</div></div>';
  h += '</div>';
  h += '</div>';

  // ═══ 2. PROFIL ═══
  sn++;
  h += '<div class="sg" id="sec-profil"><div class="sh"><span class="sn">' + sn + '</span>' + t("Votre profil","Your profile") + '</div>';
  h += '<div class="cm" style="padding:28px 20px 16px;position:relative">';
  h += '<div style="position:absolute;top:38px;left:50px;right:50px;height:3px;background:linear-gradient(90deg,var(--bl),var(--gd),var(--gn),var(--tm));border-radius:2px;opacity:.2"></div>';
  h += '<div style="display:flex;justify-content:space-between;position:relative">';
  [{a:D.age,l:t("Aujourd\u2019hui","Today"),c:"var(--bl)",f:true},{a:D.retAge,l:t("Retraite","Retirement"),c:"var(--gd)"},{a:D.qppAge,l:qppLabel+" + PSV",c:"var(--gn)"},{a:D.avgDeath,l:t("Esp\u00e9rance de vie","Life expectancy"),c:"var(--tm)"}].forEach(function(pt){
    h += '<div style="text-align:center;z-index:1"><div style="width:' + (pt.f?18:14) + 'px;height:' + (pt.f?18:14) + 'px;border-radius:50%;background:' + (pt.f?pt.c:"#fff") + ';border:2.5px solid ' + pt.c + ';margin:0 auto 6px"></div>';
    h += '<div class="mono" style="font-size:14px">' + pt.a + '</div>';
    h += '<div style="font-size:10px;color:var(--tm);max-width:90px;margin:2px auto 0;line-height:1.4">' + pt.l + '</div></div>';});
  h += '</div></div>';
  h += '<div class="c">';
  var profRows = [
    [t("Revenu annuel","Annual income"), f$(D.sal)],
    [t("Retraite","Retirement"), D.retAge + " " + t("ans","yr")],
    ["Province", provLabel],
    [t("D\u00e9penses souhait\u00e9es","Desired spending"), f$(D.retSpM) + "/" + t("mois","mo")]
  ];
  if (hasDC) profRows.push([t("R\u00e9gime employeur","Employer plan"), "CD \u2014 " + f$(D.dcBal)]);
  if (D.homeVal > 0) profRows.push([t("Propri\u00e9t\u00e9","Property"), f$(D.homeVal) + " (" + t("\u00e9quit\u00e9","equity") + ": " + f$(D.equity) + ")"]);
  // E7: Quiz data in profile
  var quizData = quiz || {};
  var quizP = translateToMC(quizData);
  var quizQ = quizP._quiz || {};
  var riskLabels = {conservative:t("Prudent","Conservative"),balanced:t("\u00c9quilibr\u00e9","Balanced"),growth:t("Croissance","Growth")};
  if (quizQ.risk) profRows.push([t("Profil de risque","Risk profile"), riskLabels[quizQ.risk] || quizQ.risk]);
  if (quizQ.confidence) profRows.push([t("Confiance financi\u00e8re","Financial confidence"), quizQ.confidence + "/5"]);
  if (quizQ.worries && quizQ.worries.length) {
    var worryLabels = {runout:t("Manquer d\u2019argent","Running out"),tax:t("Imp\u00f4ts","Taxes"),inflation:t("Inflation","Inflation"),health:t("Sant\u00e9","Health"),market:t("March\u00e9s","Markets"),legacy:t("H\u00e9ritage","Legacy")};
    profRows.push([t("Pr\u00e9occupations","Concerns"), quizQ.worries.map(function(w){return worryLabels[w]||w;}).join(", ")]);
  }
  profRows.forEach(function(r){ h += '<div class="dr"><span class="dl">' + r[0] + '</span><span class="dv">' + r[1] + '</span></div>'; });
  h += '</div></div>';

  // ═══ 3. PROJECTION ═══
  sn++;
  h += '<div class="sg" id="sec-projection"><div class="sh"><span class="sn">' + sn + '</span>' + t("Projection de votre patrimoine","Your wealth projection") + '</div>';
  h += '<div class="kg">';
  h += '<div class="kp krd"><div class="kv">' + f$(D.rP5F) + '</div><div class="kl"><span class="tip" tabindex="0" data-tip="' + t("R\u00e9sultat observ\u00e9 dans seulement 5 % des sc\u00e9narios les plus difficiles.","Result observed in only 5% of the most difficult scenarios.") + '">' + t("Pessimiste (P5)","Pessimistic (P5)") + '</span></div><div class="ks">' + t("Dans 5 % des sc\u00e9narios les plus difficiles","In the most difficult 5% of scenarios") + '</div></div>';
  h += '<div class="kp kam"><div class="kv">' + f$(D.rMedF) + '</div><div class="kl">' + t("M\u00e9dian","Median") + '</div><div class="ks">' + t("R\u00e9sultat le plus probable","Most likely result") + '</div></div>';
  h += '<div class="kp kgn"><div class="kv">' + f$(D.rP75F) + '</div><div class="kl">' + t("Optimiste","Optimistic") + '</div><div class="ks">' + t("Dans 25 % des sc\u00e9narios les plus favorables","In the most favourable 25% of scenarios") + '</div></div>';
  h += '</div>';
  h += '<div class="c" style="padding:16px"><div style="font-size:12px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px">' + t("\u00c9ventail de r\u00e9sultats \u2014 patrimoine total","Range of outcomes \u2014 total wealth") + '</div>';
  h += buildFanV6(pD, D.retAge, fr) + '</div>';
  h += '<div class="g2" style="margin:14px 0">';
  h += '<div class="c" style="border-top:3px solid var(--gn);padding:16px"><div style="font-size:11px;color:var(--gn);font-weight:700;text-transform:uppercase;margin-bottom:6px">' + t("Sc\u00e9nario favorable","Favourable") + '</div><div style="font-size:13px;color:#444;line-height:1.75">' + (ai.longevity_good || t("Dans un sc\u00e9nario m\u00e9dian, vous pourriez terminer votre plan avec environ " + f$(D.rMedF) + " encore disponibles.", "In the median scenario, you could end your plan with about " + f$(D.rMedF) + " still available.")) + '</div></div>';
  h += '<div class="c" style="border-top:3px solid var(--am);padding:16px"><div style="font-size:11px;color:var(--am);font-weight:700;text-transform:uppercase;margin-bottom:6px">' + t("\u00c0 surveiller","To watch") + '</div><div style="font-size:13px;color:#444;line-height:1.75">' + (ai.longevity_watch || t("Dans les sc\u00e9narios les plus difficiles, votre patrimoine pourrait descendre \u00e0 environ " + f$(D.rP5F) + " en fin de plan.", "In the toughest scenarios, your wealth could drop to about " + f$(D.rP5F) + " at the end of your plan.")) + '</div></div>';
  h += '</div></div>';

  // ═══ 4. REVENUS ═══
  sn++;
  h += '<div class="sg" id="sec-revenus"><div class="sh"><span class="sn">' + sn + '</span>' + t("Vos revenus \u00e0 la retraite","Your retirement income") + '</div>';
  h += '<div class="ai">' + (ai.gov_explanation || t("Les revenus gouvernementaux (" + qppLabel + " + PSV) couvriraient environ " + D.coveragePct + " % de vos d\u00e9penses projet\u00e9es. Le reste proviendrait de votre \u00e9pargne.", "Government income (" + qppLabel + " + OAS) would cover about " + D.coveragePct + "% of your projected spending. The rest would come from your savings.")) + '</div>';
  h += '<div class="c"><div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap">';
  h += '<div style="flex-shrink:0">' + buildDonutV6(incStreams, fr) + '</div>';
  h += '<div style="flex:1;min-width:220px">';
  incStreams.forEach(function(s){
    h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
    h += '<div style="width:12px;height:12px;border-radius:3px;background:' + s.color + ';flex-shrink:0"></div>';
    h += '<span style="flex:1;font-size:14px;color:var(--ts)">' + s.label + '</span>';
    h += '<span class="mono" style="font-size:14px">' + f$(s.monthly) + '/' + t("mois","mo") + '</span></div>';});
  h += '<div style="border-top:1px solid var(--bd);margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-size:13px">';
  h += '<span class="dl">' + t("Couverture gouv.","Gov. coverage") + '</span>';
  h += '<span class="mono" style="color:' + (D.coveragePct >= 50 ? "var(--gn)" : D.coveragePct >= 30 ? "var(--am)" : "var(--rd)") + '">' + D.coveragePct + ' %</span></div></div></div></div>';
  h += '<div class="ai">' + (ai.gap_explanation || (D.gapMonthly > 0
    ? t("L\u2019\u00e9cart entre vos d\u00e9penses et les revenus gouvernementaux serait de " + f$(D.gapMonthly) + "/mois. Ce montant proviendrait de vos \u00e9pargnes personnelles.", "The gap between your spending and government income would be " + f$(D.gapMonthly) + "/mo. This amount would come from your personal savings.")
    : t("Vos revenus gouvernementaux couvriraient la totalit\u00e9 de vos d\u00e9penses projet\u00e9es dans ce sc\u00e9nario.", "Your government income would cover all of your projected spending in this scenario."))) + '</div>';
  if (vulnYrs > 0) {
    h += '<div class="co cord">' + t("<strong>P\u00e9riode vuln\u00e9rable :</strong> Les " + vulnYrs + " premi\u00e8res ann\u00e9es (" + D.retAge + "\u2013" + D.qppAge + "), avant le " + qppLabel + " et la Pension de la S\u00e9curit\u00e9 de la vieillesse, reposeraient sur votre \u00e9pargne. Environ " + f$(D.gapMonthly * vulnYrs * 12) + " \u00e0 puiser.", "<strong>Vulnerable period:</strong> The first " + vulnYrs + " years (" + D.retAge + "\u2013" + D.qppAge + "), before " + qppLabel + " and Old Age Security, would rely on savings. About " + f$(D.gapMonthly * vulnYrs * 12) + " from investments.") + '</div>';
  }
  h += '</div>';

  // ═══ 5. ÉPARGNE ═══
  sn++;
  h += '<div class="sg" id="sec-epargne"><div class="sh"><span class="sn">' + sn + '</span>' + t("Votre \u00e9pargne","Your savings") + '</div>';
  h += '<div class="ai">' + (ai.savings_context || t("Votre \u00e9pargne actuelle de " + f$(totalSav) + " pourrait atteindre " + f$(D.retYearBalance) + " \u00e0 " + D.retAge + " ans, selon le sc\u00e9nario m\u00e9dian.", "Your current savings of " + f$(totalSav) + " could grow to " + f$(D.retYearBalance) + " by age " + D.retAge + " in the median scenario.")) + '</div>';
  h += '<div class="c">';
  h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;flex-wrap:wrap;gap:8px">';
  h += '<div><div style="font-size:13px;color:var(--ts)">' + t("\u00c9pargne actuelle","Current savings") + '</div>';
  h += '<div class="mono" style="font-size:24px;letter-spacing:-0.5px">' + f$(totalSav) + '</div></div>';
  h += '<div style="text-align:right"><div style="font-size:13px;color:var(--ts)">' + t("Projet\u00e9 \u00e0","Projected at") + ' ' + D.retAge + ' ' + t("ans","yr") + '</div>';
  h += '<div class="mono" style="font-size:24px;letter-spacing:-0.5px;color:var(--gn)">' + f$(D.retYearBalance) + '</div></div></div>';
  var acctRows = [
    [t("REER","RRSP"), D.rrsp, D.rrspC||0],
    [t("C\u00c9LI","TFSA"), D.tfsa, D.tfsaC||0],
    [t("Non enregistr\u00e9","Non-reg."), D.nr, D.nrC||0]
  ];
  if (hasDC) acctRows.push([t("R\u00e9gime CD","DC plan"), D.dcBal, 0]);
  acctRows.forEach(function(r){
    h += '<div class="dr"><span class="dl">' + r[0] + '</span><span class="dv">' + f$(r[1]) + (r[2] > 0 ? ' <span style="font-size:11px;color:var(--gn)">(+' + f$(r[2]) + '/' + t("mois","mo") + ')</span>' : '') + '</span></div>';});
  h += '<div style="border-top:2px solid var(--bd);margin-top:6px;padding-top:8px">';
  h += '<div class="dr"><span class="dl" style="font-weight:600">' + t("Cotisation totale","Total contribution") + '</span><span class="dv" style="color:var(--gn)">' + f$(monthlyContrib) + '/' + t("mois","mo") + ' <span style="font-size:11px;color:var(--tm)">(' + savingsRate + ' % ' + t("du revenu","of income") + ')</span></span></div></div>';
  h += '</div>';
  if (ai.obs_1) h += '<div class="ai">' + ai.obs_1 + '</div>';
  else h += '<div class="ai">' + t("Votre taux d\u2019\u00e9pargne de " + savingsRate + " % contribue \u00e0 la solidit\u00e9 de votre plan.", "Your savings rate of " + savingsRate + "% contributes to the strength of your plan.") + '</div>';
  // D4: Debt callout if debt > 0
  if (D.debtBal > 0) {
    h += '<div class="co cord">' + t("<strong>Dette active :</strong> Solde total de " + f$(D.debtBal) + " avec un co\u00fbt annuel estim\u00e9 de " + f$(D.debtAnnualCost) + " en int\u00e9r\u00eats. Ce montant r\u00e9duit votre capacit\u00e9 d\u2019\u00e9pargne nette.", "<strong>Active debt:</strong> Total balance of " + f$(D.debtBal) + " with estimated annual cost of " + f$(D.debtAnnualCost) + " in interest. This reduces your net savings capacity.") + '</div>';
  }
  h += '</div>';

  // ═══ 6. PRIORITÉ ═══
  if (priorities && priorities.length) {
    sn++;
    h += '<div class="sg" id="sec-priorite"><div class="sh"><span class="sn">' + sn + '</span>' + t("Comparatif \u2014 impact financier par cat\u00e9gorie","Comparative \u2014 financial impact by category") + '</div>';
    h += '<div style="font-size:14px;color:var(--ts);line-height:1.7;margin-bottom:16px">' + t("Bas\u00e9 sur votre <span class=\"tip\" tabindex=\"0\" data-tip=\"Taux d\u2019imp\u00f4t sur le prochain dollar gagn\u00e9.\">taux marginal</span> de " + D.taxCurrentMarginal.toFixed(1) + " %, vos dettes et votre type d\u2019employeur.", "Based on your " + D.taxCurrentMarginal.toFixed(1) + "% <span class=\"tip\" tabindex=\"0\" data-tip=\"Tax rate on the next dollar earned.\">marginal rate</span>, debts, and employer type.") + '</div>';
    priorities.forEach(function(p, i) {
      h += '<div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--bdl)">';
      h += '<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:' + p.color + ';color:#fff;font-size:12px;font-weight:800;flex-shrink:0">' + (i+1) + '</span>';
      h += '<div style="flex:1"><div style="font-weight:700;font-size:15px">' + p.name + '</div><div style="font-size:12px;color:var(--ts);margin-top:2px">' + p.why + '</div></div>';
      h += '<span class="mono" style="font-size:15px;color:' + p.color + '">' + p.rate + '</span></div>';
    });
    h += '<div class="ex">' + t("Cet ordre est une observation g\u00e9n\u00e9rale bas\u00e9e sur les principes de rendement ajust\u00e9 pour le risque. Il ne constitue pas une recommandation personnalis\u00e9e.", "This order is a general observation based on risk-adjusted return principles. It is not personalized advice.") + '</div>';
    if (ai.obs_2) h += '<div class="ai">' + ai.obs_2 + '</div>';
    h += '</div>';
  }

  // ═══ 7. ET SI... (CONDITIONAL — empty in commit 1) ═══
  if (D.whatIf && D.whatIf.length) {
    var wiTitle = D.successPct >= 85 ? t("Votre marge de manoeuvre","Your flexibility") : D.successPct >= 65 ? t("Et si vous changiez une chose ?","What if you changed one thing?") : t("Comment renforcer votre plan","How to strengthen your plan");
    sn++;
    h += '<div class="sg"><div class="sh"><span class="sn">' + sn + '</span>' + wiTitle + '</div>';
    h += '<div style="font-size:14px;color:var(--ts);line-height:1.7;margin-bottom:20px">' + t("Chaque carte montre l\u2019effet d\u2019un seul changement sur votre taux de r\u00e9ussite.", "Each card shows the effect of a single change on your success rate.") + '</div>';
    D.whatIf.forEach(function(w) {
      var isUp = w.type === "up", delta = w.newPct - D.successPct;
      var bCol = isUp ? "var(--gn)" : "var(--rd)";
      var bgCol = isUp ? "rgba(42,140,70,.04)" : "rgba(204,68,68,.04)";
      var ngc = w.newGrade.charAt(0) === "A" ? "var(--gn)" : w.newGrade === "B+" ? "var(--gn)" : w.newGrade === "B" ? "var(--am)" : w.newGrade === "C" ? "var(--am)" : "var(--rd)";
      h += '<div style="background:' + bgCol + ';border:1px solid ' + (isUp ? "rgba(42,140,70,.2)" : "rgba(204,68,68,.2)") + ';border-left:4px solid ' + bCol + ';border-radius:10px;padding:18px 20px;margin-bottom:12px">';
      h += '<div style="font-size:15px;font-weight:700;margin-bottom:2px">' + (isUp ? "\u2197 " : "\u26a0 ") + w.title + '</div>';
      h += '<div style="font-size:13px;color:var(--tm);margin-bottom:14px">' + w.detail + '</div>';
      h += '<div style="display:flex;align-items:center;gap:16px">';
      h += '<div style="text-align:center;min-width:52px"><div class="mono" style="font-size:22px;font-weight:800;color:' + gi.c + '">' + D.successPct + '%</div><div style="font-size:10px;color:var(--tm);font-weight:600">' + gi.g + '</div></div>';
      h += '<div style="flex:1"><div style="position:relative;height:8px;background:var(--bdl);border-radius:4px;margin-bottom:6px">';
      h += '<div style="position:absolute;left:' + D.successPct + '%;top:-2px;width:2px;height:12px;background:var(--tm);border-radius:1px"></div>';
      h += '<div style="position:absolute;left:' + Math.min(D.successPct, w.newPct) + '%;width:' + Math.abs(delta) + '%;height:100%;background:' + bCol + ';border-radius:4px;opacity:0.6"></div>';
      h += '<div style="position:absolute;left:' + w.newPct + '%;top:-3px;width:3px;height:14px;background:' + bCol + ';border-radius:2px"></div>';
      h += '</div><div class="mono" style="font-size:11px;color:' + bCol + ';font-weight:700;text-align:center">' + (delta > 0 ? "+" : "") + delta + ' points</div></div>';
      h += '<div style="text-align:center;min-width:52px"><div class="mono" style="font-size:22px;font-weight:800;color:' + ngc + '">' + w.newPct + '%</div><div style="font-size:10px;color:var(--tm);font-weight:600">' + w.newGrade + '</div></div>';
      h += '</div></div>';
    });
    h += '<div class="ex">' + t("Ces sc\u00e9narios ne sont pas des recommandations. Ils illustrent l\u2019effet math\u00e9matique de chaque changement.", "These are not recommendations. They illustrate the mathematical effect of each change.") + '</div></div>';
  }

  // ═══ 8. FISCALITÉ & FRAIS ═══
  sn++;
  h += '<div class="sg" id="sec-fiscalite"><div class="sh"><span class="sn">' + sn + '</span>' + t("Votre fiscalit\u00e9 et vos frais","Your taxes & fees") + '</div>';
  h += '<div class="c"><div class="g2" style="margin-bottom:16px">';
  h += '<div style="text-align:center;padding:16px;border-radius:8px;background:var(--gbg)"><div style="font-size:12px;color:var(--ts);margin-bottom:4px"><span class="tip" tabindex="0" data-tip="' + t("Pourcentage total d\u2019imp\u00f4t pay\u00e9 sur l\u2019ensemble de vos revenus.","Total percentage of tax paid on all your income.") + '">' + t("Taux effectif actuel","Current effective rate") + '</span></div><div class="mono" style="font-size:24px;color:var(--gd)">' + D.taxCurrentEffective.toFixed(1) + ' %</div></div>';
  h += '<div style="text-align:center;padding:16px;border-radius:8px;background:var(--gnbg)"><div style="font-size:12px;color:var(--ts);margin-bottom:4px">' + t("Taux effectif retraite (est.)","Retirement effective rate (est.)") + '</div><div class="mono" style="font-size:24px;color:var(--gn)">' + D.taxRetirementEffective.toFixed(1) + ' %</div></div></div>';
  var txSav = Math.round(D.retSpM * 12 * (D.taxCurrentEffective - D.taxRetirementEffective) / 100);
  if (txSav > 0) h += '<div class="co cogn">' + D.taxCurrentEffective.toFixed(1) + ' % \u2192 ' + D.taxRetirementEffective.toFixed(1) + ' % = ' + t("environ","approx.") + ' ' + f$(txSav) + '/' + t("an d\u2019\u00e9conomies potentielles","yr in potential savings") + '</div>';
  // D2: MER/fees KPI + cumulative cost
  if (D.merWeighted > 0) {
    h += '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--bdl)">';
    h += '<div style="font-size:12px;font-weight:700;color:var(--ts);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">' + t("Frais de gestion","Management fees") + '</div>';
    h += '<div class="g2">';
    h += '<div style="text-align:center;padding:16px;border-radius:8px;background:var(--gbg)"><div style="font-size:12px;color:var(--ts);margin-bottom:4px">' + t("Frais pond\u00e9r\u00e9s (RFG)","Weighted MER") + '</div><div class="mono" style="font-size:24px;color:var(--gd)">' + (D.merWeighted*100).toFixed(2) + ' %</div></div>';
    h += '<div style="text-align:center;padding:16px;border-radius:8px;background:var(--rdbg)"><div style="font-size:12px;color:var(--ts);margin-bottom:4px">' + t("Co\u00fbt cumulatif estim\u00e9","Estimated cumulative cost") + '</div><div class="mono" style="font-size:24px;color:var(--rd)">' + f$(D.feeCostLifetime) + '</div></div>';
    h += '</div>';
    h += '<div class="ex">' + t("Les frais sont pr\u00e9lev\u00e9s chaque ann\u00e9e sur la valeur de vos placements. Sur la dur\u00e9e de votre plan, m\u00eame un pourcentage qui semble faible s\u2019accumule de fa\u00e7on importante.", "Fees are charged each year on your investment balance. Over the duration of your plan, even a seemingly small percentage compounds significantly.") + '</div></div>';
  }
  h += '</div>';
  if (ai.obs_3) h += '<div class="ai">' + ai.obs_3 + '</div>';
  h += '</div>';

  // ═══ 9. PLAN AUX 5 ANS (CONDITIONAL — empty in commit 1) ═══
  if (D.snapshot5yr && D.snapshot5yr.length) {
    sn++;
    h += '<div class="sg"><div class="sh"><span class="sn">' + sn + '</span>' + t("\u00c9volution de votre plan aux 5 ans","5-year plan snapshot") + '</div>';
    h += '<div style="font-size:14px;color:var(--ts);line-height:1.7;margin-bottom:16px">' + t("Sc\u00e9nario m\u00e9dian. Les revenus gouvernementaux commencent \u00e0 " + D.qppAge + " ans.", "Median scenario. Government income starts at age " + D.qppAge + ".") + '</div>';
    h += '<div class="c" style="padding:0;overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">';
    h += '<thead><tr style="background:var(--gbg);border-bottom:2px solid var(--bd)">';
    [t("\u00c2ge","Age"),t("Patrimoine","Wealth"),t("Rev. gouv.","Gov. income"),t("Retrait \u00e9pargne","From savings"),t("D\u00e9penses","Spending")].forEach(function(th){
      h += '<th style="padding:10px 12px;text-align:right;font-weight:700;color:var(--gd);font-size:11px;text-transform:uppercase;letter-spacing:0.5px">' + th + '</th>';});
    h += '</tr></thead><tbody>';
    D.snapshot5yr.forEach(function(row, i){
      var isGovStart = row.age === D.qppAge;
      var bg = isGovStart ? 'var(--gnbg)' : (i % 2 === 0 ? 'transparent' : 'var(--gbg)');
      var borderLeft = isGovStart ? 'border-left:3px solid var(--gn);' : '';
      var balColor = row.bal > 300000 ? 'var(--gn)' : row.bal > 100000 ? 'var(--am)' : 'var(--rd)';
      h += '<tr style="background:' + bg + ';border-bottom:1px solid var(--bdl);' + borderLeft + '">';
      h += '<td style="padding:10px 12px;text-align:right;font-weight:700">' + row.age + ' ' + t("ans","yr") + (row.age === D.retAge ? ' <span style="font-size:9px;color:var(--gd)">' + t("(retraite)","(ret.)") + '</span>' : '') + (isGovStart ? ' <span style="font-size:9px;color:var(--gn);font-weight:700">' + t("(d\u00e9but " + qppLabel + "+PSV)","(" + qppLabel + "+OAS start)") + '</span>' : '') + '</td>';
      h += '<td style="padding:10px 12px;text-align:right;font-family:var(--mono);font-weight:600;color:' + balColor + '">' + f$(row.bal) + '</td>';
      h += '<td style="padding:10px 12px;text-align:right;font-family:var(--mono);color:var(--gn)">' + f$(row.revGov) + '/' + t("an","yr") + '</td>';
      h += '<td style="padding:10px 12px;text-align:right;font-family:var(--mono);color:var(--am)">' + f$(row.revEp) + '/' + t("an","yr") + '</td>';
      h += '<td style="padding:10px 12px;text-align:right;font-family:var(--mono)">' + f$(row.dep) + '/' + t("an","yr") + '</td></tr>';});
    h += '</tbody></table></div>';
    h += '<div class="ex">' + t("Le rapport Interm\u00e9diaire offre cette projection pour chaque ann\u00e9e avec des percentiles d\u00e9taill\u00e9s.", "The Intermediate report provides this for every year with detailed percentiles.") + '</div></div>';
  }

  // ═══ 10. HYPOTHÈSES (CONDITIONAL — empty in commit 1) ═══
  if (D.heuristics && D.heuristics.length) {
    sn++;
    h += '<div class="sg"><div class="sh"><span class="sn">' + sn + '</span>' + t("Hypoth\u00e8ses et estimations","Assumptions & estimates") + '</div>';
    h += '<div style="font-size:14px;color:var(--ts);line-height:1.7;margin-bottom:16px">' + t("Le niveau Essentiel utilise des heuristiques pour compl\u00e9ter les donn\u00e9es que vous n\u2019avez pas fournies. Le niveau Interm\u00e9diaire permet de pr\u00e9ciser chacun de ces param\u00e8tres.", "The Essential tier uses heuristics to fill in data you did not provide. The Intermediate tier lets you specify each parameter.") + '</div>';
    h += '<div class="c">';
    D.heuristics.forEach(function(h2){
      h += '<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--bdl);font-size:13px">';
      h += '<div style="flex:1;font-weight:600;color:var(--ts)">' + h2.field + '</div>';
      h += '<div style="width:120px;font-family:var(--mono);font-weight:600;text-align:right">' + h2.value + '</div>';
      h += '<div style="flex:1.5;color:var(--tm);font-size:12px">' + h2.source + '</div></div>';
    });
    h += '</div></div>';
  }

  // ═══ 11. MÉTHODOLOGIE ═══
  sn++;
  h += '<div class="sg"><div class="sh"><span class="sn">' + sn + '</span>' + t("M\u00e9thodologie","Methodology") + '</div>';
  h += '<div class="c" style="line-height:1.85">';
  h += '<div style="margin-bottom:22px"><strong style="color:var(--gd);font-size:15px">' + t("Simulation Monte Carlo","Monte Carlo simulation") + '</strong>';
  h += '<div style="font-size:14px;color:#444;margin-top:6px">' + t("Plut\u00f4t que de pr\u00e9dire un seul avenir, l\u2019outil en simule " + D.nSim.toLocaleString() + ". Chaque simulation g\u00e9n\u00e8re une s\u00e9quence unique de rendements, d\u2019inflation et de dur\u00e9e de vie. Votre taux de r\u00e9ussite de " + D.successPct + " % signifie que dans " + D.successPct + " % de ces sc\u00e9narios, votre argent pourrait durer toute votre retraite.", "Rather than predicting a single future, this tool simulates " + D.nSim.toLocaleString() + ". Each generates a unique sequence of returns, inflation, and lifespan. Your " + D.successPct + "% success rate means your money could last in " + D.successPct + "% of them.") + '</div></div>';
  h += '<div style="margin-bottom:22px"><strong style="color:var(--gd);font-size:15px">' + t("Hypoth\u00e8ses cl\u00e9s","Key assumptions") + '</strong>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-top:8px;font-size:13px">';
  [[t("Tables canadiennes de mortalit\u00e9","Canadian mortality tables"),"CPM 2023"],[t("Inflation","Inflation"),(D.inf*100).toFixed(1)+"%/"+t("an","yr")],
   [t("Rendements","Returns"),t("Historique + queues \u00e9paisses","Historical + fat tails")],[t("Imp\u00f4ts","Taxes"),D.prov+" 2026"],
   [t("Simulations","Simulations"),D.nSim.toLocaleString()],[t("Actifs corr\u00e9l\u00e9s","Correlated assets"),t("Matrice de corr\u00e9lation","Correlation matrix")]].forEach(function(r){
    h += '<div class="dr"><span class="dl">' + r[0] + '</span><span class="dv">' + r[1] + '</span></div>';});
  h += '</div></div>';
  // C2: Grade system explanation
  h += '<div style="margin-bottom:22px"><strong style="color:var(--gd);font-size:15px">' + t("Syst\u00e8me de notes","Grading system") + '</strong>';
  h += '<div style="font-size:13px;color:#555;margin-top:6px;line-height:1.8">' + t("A+ = 95 %+, A = 90 %+, A- = 85 %+, B+ = 80 %+, B = 70 %+, C = 50 %+, D = 30 %+, F = moins de 30 %. Le pourcentage repr\u00e9sente la proportion de sc\u00e9narios o\u00f9 votre argent pourrait durer toute la retraite.", "A+ = 95%+, A = 90%+, A- = 85%+, B+ = 80%+, B = 70%+, C = 50%+, D = 30%+, F = under 30%. The percentage represents the proportion of scenarios where your money could last through retirement.") + '</div></div>';
  // C2: Fat tails + variables
  h += '<div style="margin-bottom:22px"><strong style="color:var(--gd);font-size:15px">' + t("Mod\u00e9lisation avanc\u00e9e","Advanced modelling") + '</strong>';
  h += '<div style="font-size:13px;color:#555;margin-top:6px;line-height:1.8">' + t("Les mauvais sc\u00e9narios sont volontairement plus s\u00e9v\u00e8res que la moyenne historique (queues \u00e9paisses). Variables mod\u00e9lis\u00e9es : inflation, rendements boursiers, dur\u00e9e de vie, imp\u00f4ts. Les actifs sont corr\u00e9l\u00e9s entre eux pour refl\u00e9ter les conditions r\u00e9elles de march\u00e9.", "Bad scenarios are deliberately more severe than the historical average (fat tails). Modelled variables: inflation, market returns, lifespan, taxes. Assets are correlated to reflect real market conditions.") + '</div></div>';
  h += '<div><strong style="color:var(--gd);font-size:15px">' + t("Limitations","Limitations") + '</strong>';
  h += '<div style="font-size:14px;color:#555;margin-top:6px">' + t("Ne tient pas compte de : vente de propri\u00e9t\u00e9, h\u00e9ritages, changements de carri\u00e8re, co\u00fbts de sant\u00e9 exceptionnels, modifications l\u00e9gislatives futures, revenus de location. Les rendements pass\u00e9s ne garantissent pas les rendements futurs.", "Does not account for: property sales, inheritances, career changes, exceptional health costs, future legislation, or rental income. Past returns do not guarantee future returns.") + '</div></div>';
  h += '</div>';
  // D3: Estate mini-section (conditional)
  if (D.medEstateNet > 0) {
    h += '<div class="c"><div style="font-size:13px;color:var(--ts);line-height:1.8">';
    h += '<strong>' + t("Patrimoine net projet\u00e9 en fin de plan (m\u00e9dian)","Projected net estate at end of plan (median)") + ' :</strong> ' + f$(D.medEstateNet);
    if (D.medEstateTax > 0) h += ' \u2014 ' + t("Imp\u00f4ts successoraux estim\u00e9s","Estimated estate taxes") + ' : ' + f$(D.medEstateTax);
    h += '</div></div>';
  }
  h += '</div>';

  // ═══ COST OF DELAY + MIN RETURN (before disclaimer) ═══
  if (costDelay > 0) {
    var cdColor = costDelay > 50000 ? "var(--rd)" : costDelay > 20000 ? "var(--am)" : "var(--ts)";
    h += '<div class="c" style="border-left:4px solid ' + cdColor + '">';
    h += '<div style="display:flex;align-items:flex-start;gap:16px">';
    h += '<div style="font-size:28px;flex-shrink:0">\u23f3</div>';
    h += '<div style="flex:1">';
    h += '<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">' + t("Co\u00fbt de l\u2019inaction (1 an)","Cost of waiting (1 year)") + '</div>';
    h += '<div class="mono" style="font-size:30px;font-weight:900;color:' + cdColor + ';margin-bottom:8px">' + f$(costDelay) + '</div>';
    h += '<div style="font-size:13px;color:var(--ts);line-height:1.75">' + t("Si vous attendez un an de plus avant de commencer \u00e0 \u00e9pargner, ce montant repr\u00e9sente la valeur future de vos cotisations manquantes.", "If you wait one more year before starting to save, this amount represents the future value of your missed contributions.") + '</div>';
    h += '</div></div></div>';
  }
  if (minReturn > 0) {
    var mrColor = minReturn <= 4 ? "var(--gn)" : minReturn <= 7 ? "var(--am)" : "var(--rd)";
    h += '<div class="c" style="border-left:4px solid ' + mrColor + ';margin-top:14px">';
    h += '<div style="display:flex;align-items:flex-start;gap:16px">';
    h += '<div style="font-size:28px;flex-shrink:0">\ud83d\udcca</div>';
    h += '<div style="flex:1">';
    h += '<div style="font-size:13px;font-weight:800;color:var(--ts);text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">' + t("Rendement minimum viable","Minimum viable return") + '</div>';
    h += '<div class="mono" style="font-size:30px;font-weight:900;color:' + mrColor + ';margin-bottom:8px">' + minReturn + '%</div>';
    h += '<div style="font-size:13px;color:var(--ts);line-height:1.75">' + t("Le rendement annuel minimum pour que votre plan ait au moins 50 % de chances de tenir toute la retraite.", "The minimum annual return for your plan to have at least a 50% chance of lasting through retirement.") + '</div>';
    h += '</div></div></div>';
  }

  // ═══ DISCLAIMER (A5 — texte exact TECH-REFERENCE.md §6) ═══
  h += '<div style="background:#FDF8F3;border-left:4px solid var(--rd);border-radius:var(--rad);padding:22px;font-size:13px;color:#666;line-height:1.85;margin-bottom:28px">';
  h += '<strong style="color:var(--rd);font-size:13px;display:block;margin-bottom:6px">' + t("AVERTISSEMENT IMPORTANT","IMPORTANT DISCLAIMER") + '</strong>';
  h += t("Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue en aucun cas un conseil financier, fiscal, juridique ou de placement personnalis\u00e9. Les projections sont bas\u00e9es sur des hypoth\u00e8ses qui peuvent ne pas se r\u00e9aliser. Consultez un planificateur financier certifi\u00e9 (Pl. Fin.) ou un conseiller autoris\u00e9 avant de prendre toute d\u00e9cision financi\u00e8re importante. buildfi.ca n\u2019est pas un conseiller en placement inscrit au sens de la Loi sur les valeurs mobili\u00e8res.", "This tool is provided for informational and educational purposes only. It does not constitute personalized financial, tax, legal or investment advice. Projections are based on assumptions that may not materialize. Consult a certified financial planner or licensed advisor before making any important financial decisions. buildfi.ca is not a registered investment advisor under securities law.");
  h += '</div>';

  // ═══ UPSELL CTAs (F1: principal = filled gradient, F3: features box) ═══
  if (ai.upgrade_hook) h += '<div class="ai" style="margin:20px 0">' + ai.upgrade_hook + '</div>';
  h += '<div class="c" style="margin-bottom:16px;padding:18px"><div style="font-size:14px;font-weight:700;color:var(--ts);margin-bottom:10px">' + t("Prochaine \u00e9tape : affiner avec vos vrais param\u00e8tres","Next step: refine with your actual parameters") + '</div>';
  h += '<div style="font-size:13px;color:var(--ts);line-height:2">\u2022 ' + t("16 sections sp\u00e9cialis\u00e9es d\u2019analyse","16 specialized analysis sections") + '<br>\u2022 ' + t("Strat\u00e9gie de d\u00e9caissement optimale","Optimal decumulation strategy") + '<br>\u2022 ' + t("Report du " + qppLabel + " \u00e0 70 ans (+42 %)","Deferring " + qppLabel + " to age 70 (+42%)") + '<br>\u2022 ' + t("Simulation de sc\u00e9narios personnalis\u00e9s","Custom scenario simulation") + '</div>';
  h += '<div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bdl);font-size:12px;color:var(--tm);line-height:1.8">';
  h += t("R\u00e9sultat attendu : une note potentiellement plus pr\u00e9cise et des strat\u00e9gies de d\u00e9caissement personnalis\u00e9es.", "Expected result: a potentially more precise grade and personalized decumulation strategies.");
  h += '</div></div>';
  h += '<div class="g2 np" style="margin-bottom:28px">';
  h += '<a href="/quiz/intermediaire" style="display:block;text-align:center;padding:18px;background:linear-gradient(135deg,var(--gd),var(--gl));color:#fff;border-radius:var(--rad);text-decoration:none;font-weight:700;font-size:15px">' + t("Interm\u00e9diaire \u2014 69 $","Intermediate \u2014 $69") + '<div style="font-size:11px;font-weight:400;opacity:.8;margin-top:4px">' + t("16 sections \u00b7 strat\u00e9gie de d\u00e9caissement \u00b7 " + qppLabel + " optimal","16 sections \u00b7 decumulation strategy \u00b7 optimal " + qppLabel) + '</div></a>';
  h += '<a href="/quiz/expert" style="display:block;text-align:center;padding:18px;border:2px solid var(--bd);color:var(--tx);border-radius:var(--rad);text-decoration:none;font-weight:700;font-size:15px">' + t("Expert \u2014 139 $","Expert \u2014 $139") + '<div style="font-size:11px;font-weight:400;color:var(--tm);margin-top:4px">' + t("28 sections \u00b7 immobilier \u00b7 couple \u00b7 incorpor\u00e9","28 sections \u00b7 real estate \u00b7 couple \u00b7 incorporated") + '</div></a>';
  h += '</div>';

  // ═══ PRINT BUTTON ═══
  h += '<div class="np" style="margin-bottom:14px"><div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-radius:var(--rad);border:1px solid var(--bd);background:var(--cd);cursor:pointer" onclick="window.print()">';
  h += '<span style="font-size:18px">\ud83d\udda8\ufe0f</span>';
  h += '<div><div style="font-size:13px;font-weight:600;color:var(--ts)">' + t("Imprimer ou sauvegarder en PDF","Print or save as PDF") + '</div>';
  h += '<div style="font-size:11px;color:var(--tm)">' + t("Conservez une copie de votre rapport","Keep a copy of your report") + '</div></div></div></div>';

  // ═══ DONNÉES UTILISÉES + VERSION ═══
  h += '<div style="font-size:11px;color:var(--tl);line-height:1.8;text-align:center;margin-bottom:16px">';
  h += t("Donn\u00e9es utilis\u00e9es : revenu, \u00e9pargne, d\u00e9penses, dettes, province, \u00e2ge de retraite, profil de risque",
         "Data used: income, savings, spending, debts, province, retirement age, risk profile");
  h += '<br>' + t("Version du mod\u00e8le","Model version") + ' : ' + D.version + ' \u00b7 ' + D.prov + ' 2026 \u00b7 ' + D.nSim.toLocaleString() + ' ' + t("simulations","simulations");
  h += '</div>';

  // ═══ FOOTER ═══
  h += '<div style="text-align:center;padding:24px 0;border-top:1px solid var(--bd);margin-top:20px">';
  h += '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="29" viewBox="0 0 180 52"><defs><linearGradient id="embGf" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#C45A2C"/><stop offset="100%" stop-color="#E8A84C"/></linearGradient></defs><path d="M14 46 C14 46 8 30 14 18 C20 6 26 12 26 22 C26 12 32 0 38 10 C44 22 38 32 38 32" stroke="url(#embGf)" stroke-width="3" fill="none" stroke-linecap="round"/><text x="48" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" fill="#1A1A1A" letter-spacing="-1.2">build</text><text x="131" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" fill="url(#embGf)" letter-spacing="-1.2">fi</text></svg>';
  h += '<div style="font-size:11px;color:var(--tl);margin-top:6px">' + t("Rapport g\u00e9n\u00e9r\u00e9 automatiquement","Automatically generated report") + ' \u00b7 ' + date + '</div>';
  h += '<div style="font-size:10px;color:var(--tl);margin-top:2px">' + t("Cet outil ne constitue pas un conseil financier personnalis\u00e9.","This tool does not constitute personalized financial advice.") + '</div>';
  h += '</div>';

  h += '</div>'; // close .rpt
  return h;
}


// ══════════════════════════════════════════════════════════════════════
// PUBLIC API: renderReportHTML()
// Wraps renderReport in a complete HTML document for Puppeteer PDF
// ══════════════════════════════════════════════════════════════════════
export function renderReportHTML(D, mc, quiz, lang, ai, costDelay, minReturn) {
  var fr = lang === "fr";
  var date = new Date().toLocaleDateString(fr?"fr-CA":"en-CA");

  var reportBody = REPORT_VERSION === 'v6'
    ? renderReport_v6(D, mc, quiz, ai || {}, false, lang, costDelay || 0, minReturn || 0)
    : renderReport_v5(D, mc, quiz, ai || {}, false, lang, costDelay || 0, minReturn || 0);

  if (REPORT_VERSION === 'v6') {
    return '<!DOCTYPE html>' +
'<html lang="' + lang + '">' +
'<head>' +
'<meta charset="UTF-8">' +
'<meta name="viewport" content="width=device-width,initial-scale=1">' +
'<title>buildfi.ca \u2014 ' + (fr ? "Rapport Essentiel" : "Essential Report") + ' \u2014 ' + date + '</title>' +
'<link rel="preconnect" href="https://fonts.googleapis.com">' +
'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
'<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">' +
'<style>' +
'*{margin:0;padding:0;box-sizing:border-box}' +
':root{' +
'  --gd:#C4944A;--gl:#D4A85A;--gbg:rgba(196,148,74,.07);' +
'  --gn:#2A8C46;--gnbg:rgba(42,140,70,.06);' +
'  --am:#B89830;--amr:#D48C00;--ambg:rgba(184,152,48,.06);' +
'  --rd:#CC4444;--rdbg:rgba(204,68,68,.06);' +
'  --bl:#4680C0;--blbg:rgba(70,128,192,.06);' +
'  --pr:#7C60B8;' +
'  --tx:#1A1A1A;--ts:#555;--tm:#888;--tl:#bbb;' +
'  --bg:#FEFCF9;--cd:#fff;--bd:#E8E0D4;--bdl:#F0ECE4;' +
'  --sans:\'DM Sans\',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;' +
'  --mono:\'JetBrains Mono\',\'SF Mono\',monospace;' +
'  --rad:10px;' +
'}' +
'body{font-family:var(--sans);color:var(--tx);background:var(--bg);' +
'  -webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;' +
'  -webkit-print-color-adjust:exact;print-color-adjust:exact}' +
'@media print{body{background:#fff}.np{display:none!important}.pb{page-break-before:always}' +
'  .c,.cm,.co,.ai{break-inside:avoid;page-break-inside:avoid}' +
'  .sh{break-after:avoid;page-break-after:avoid}' +
'  p,li{orphans:3;widows:3}' +
'  :root{--gd:#7A5520;--gl:#7A5520;--bd:#D7C9B8;--bdl:#E6DCD0;--tm:#666;--tl:#777;--amr:#996600}' +
'  .sh{border-bottom:2px solid var(--gd)}' +
'  .c,.cm{box-shadow:none;border-color:var(--bd)}' +
'}' +
'.rpt{max-width:820px;margin:0 auto;padding:40px 32px 60px;font-size:15px;line-height:1.75}' +
'@media(max-width:600px){.rpt{padding:24px 16px 40px;font-size:14px}}' +
'.mono{font-family:var(--mono);font-weight:600}' +
'.sg{margin-bottom:52px}' +
'.sh{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--gd);font-weight:700;' +
'  text-transform:uppercase;letter-spacing:1.2px;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid var(--gd)}' +
'.sn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;' +
'  background:linear-gradient(135deg,var(--gd),var(--gl));color:#fff;font-size:12px;font-weight:800;flex-shrink:0}' +
'.c{background:var(--cd);border:1px solid var(--bd);border-radius:var(--rad);padding:22px;margin-bottom:14px;box-shadow:0 1px 3px rgba(0,0,0,.02)}' +
'.cm{background:#FDFBF7;border:1px solid var(--bd);border-radius:var(--rad);padding:22px;margin-bottom:14px}' +
'.co{border-radius:6px;padding:14px 16px;font-size:13px;line-height:1.8;margin:14px 0}' +
'.cog{background:var(--gbg);border-left:4px solid var(--gd);color:#333}' +
'.cogn{background:var(--gnbg);border-left:4px solid var(--gn);color:#333}' +
'.coam{background:var(--ambg);border-left:4px solid var(--am);color:#333}' +
'.cord{background:var(--rdbg);border-left:4px solid var(--rd);color:#333}' +
'.dr{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bdl);font-size:14px}' +
'.dr:last-child{border-bottom:none}' +
'.dl{color:var(--ts)}.dv{font-family:var(--mono);font-weight:600;text-align:right}' +
'.kg{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}' +
'@media(max-width:600px){.kg{grid-template-columns:1fr}}' +
'.kp{border-radius:var(--rad);padding:16px;text-align:center}' +
'.kv{font-family:var(--mono);font-size:22px;font-weight:700;margin-bottom:4px}' +
'.kl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}' +
'.ks{font-size:10px;color:var(--tm);margin-top:2px}' +
'.krd{background:var(--rdbg);border:1.5px solid var(--rd)}.krd .kv,.krd .kl{color:var(--rd)}' +
'.kam{background:var(--ambg);border:1.5px solid var(--am)}.kam .kv,.kam .kl{color:var(--am)}' +
'.kgn{background:var(--gnbg);border:1.5px solid var(--gn)}.kgn .kv,.kgn .kl{color:var(--gn)}' +
'.ex{font-size:12.5px;color:#777;line-height:1.7;padding:10px 14px;background:#FDFBF7;border-radius:6px;margin-top:10px}' +
'.ex strong{color:#555}' +
'.ai{font-size:14px;color:#444;line-height:1.85;margin:14px 0;padding:14px 18px;background:rgba(124,96,184,.04);border-radius:8px;border-left:3px solid var(--pr)}' +
'svg{shape-rendering:geometricPrecision}' +
'.g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}' +
'@media(max-width:600px){.g2{grid-template-columns:1fr}}' +
'.mono,.dv,.kv,table,.numXL,.numL,.numM{font-variant-numeric:tabular-nums}' +
'.tip{border-bottom:1px dotted var(--tm);cursor:help;position:relative}' +
'.tip:hover::after,.tip:focus::after{content:attr(data-tip);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);' +
'  background:#222;color:#fff;padding:6px 10px;border-radius:6px;font-size:11px;max-width:240px;white-space:normal;z-index:10;' +
'  pointer-events:none;line-height:1.5;font-family:var(--sans);font-weight:400}' +
'@media print{.tip{border-bottom:none}.tip::after{display:none}}' +
'@media(max-width:600px){.dr{padding:11px 0}.ai{padding:14px 14px}.sg{margin-bottom:48px}}' +
'</style>' +
'</head>' +
'<body>' + reportBody + '</body></html>';
  }

  // V5 fallback CSS (unchanged)
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
'    @media screen and (max-width:520px){' +
'      .rpt-grid3{grid-template-columns:1fr!important}' +
'      .rpt-grid2{grid-template-columns:1fr!important}' +
'      .rpt-cta-grid{grid-template-columns:1fr!important}' +
'      .rpt-donut{flex-direction:column!important;text-align:center}' +
'    }' +
'    svg{shape-rendering:geometricPrecision}' +
'  </style>' +
'</head>' +
'<body>' + reportBody + '</body></html>';
}

// Also export helpers for use by webhook
export { validateMC, extractReportData, buildAIPrompt };
