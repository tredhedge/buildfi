#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════
// report/test-reports.js — BuildFi Report Test Harness
// Generates 10 profiles × 2 languages = 20 HTML reports
// AI narration written inline following ai-prompt-360 rules
// Run: node report/test-reports.js
// ═══════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');

// ═══ 1. NODE ENVIRONMENT SETUP ═══
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
Object.defineProperty(global, 'navigator', {
  value: { clipboard: { writeText: () => Promise.resolve() } },
  writable: true, configurable: true
});

const dir = __dirname;
['report-formatters.js', 'report-data.js', 'report-charts.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
  const code = fs.readFileSync(path.join(dir, f), 'utf8');
  try { eval(code); } catch (e) { console.error(`Failed to load ${f}:`, e.message); process.exit(1); }
});

const buildReport = window.buildReport;
const BFmt = window.BFmt;
const BData = window.BData;
const BAiPrompt = window.BAiPrompt;
if (!buildReport) { console.error('buildReport not found on window'); process.exit(1); }
if (!BAiPrompt) { console.error('BAiPrompt not found on window'); process.exit(1); }
console.log('✓ Report modules loaded — BFmt v' + BFmt.VERSION + ', BAiPrompt ' + (BAiPrompt.SLOTS.length) + ' slots');

// ═══ 2. DATA GENERATORS ═══
function genPD(c) {
  var rows = [], rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
  // Include couple assets in the portfolio trajectory
  var crr = c.cRRSP || 0, ctf = c.cTFSA || 0, cnr = c.cNR || 0;
  var da = c.deathAge || 90, retR = c.eqRet || 0.06;
  for (var a = c.age; a <= da; a++) {
    var preRet = a < c.retAge;
    if (preRet) {
      rr = rr * (1 + retR) + (c.rrspC || 0);
      tf = tf * (1 + retR) + (c.tfsaC || 0);
      nr = nr * (1 + retR * 0.8) + (c.nrC || 0);
      crr = crr * (1 + retR * 0.95);
      ctf = ctf * (1 + retR * 0.95);
      cnr = cnr * (1 + retR * 0.75);
    } else {
      var total = rr + tf + nr + crr + ctf + cnr;
      var qpp = a >= (c.qppAge || 65) ? (c.qppM || 700) * 12 : 0;
      var oas = a >= (c.oasAge || 65) ? (c.oasM || 650) * 12 : 0;
      var pen = a >= c.retAge ? (c.penM || 0) * 12 : 0;
      var gov = qpp + oas + pen;
      var gap = Math.max(0, (c.retSpM || 3000) * 12 - gov);
      if (total > 0 && gap > 0) {
        var ratio = Math.min(0.95, gap / total);
        rr -= rr * ratio; tf -= tf * ratio; nr -= nr * ratio;
        crr -= crr * ratio; ctf -= ctf * ratio; cnr -= cnr * ratio;
      }
      rr = Math.max(0, rr * (1 + retR * 0.65));
      tf = Math.max(0, tf * (1 + retR * 0.65));
      nr = Math.max(0, nr * (1 + retR * 0.65));
      crr = Math.max(0, crr * (1 + retR * 0.60));
      ctf = Math.max(0, ctf * (1 + retR * 0.60));
      cnr = Math.max(0, cnr * (1 + retR * 0.55));
    }
    var tot = rr + tf + nr + crr + ctf + cnr;
    var sp = Math.max(tot * 0.03, 5000) * Math.sqrt(Math.max(1, a - c.age));
    rows.push({
      age: a, mp_total: r(tot), mp_rr: r(rr), mp_tf: r(tf), mp_nr: r(nr),
      rmp_total: r(tot), rmp_rr: r(rr), rmp_tf: r(tf), rmp_nr: r(nr),
      p5: r(Math.max(0, tot - sp * 2.2)), p25: r(Math.max(0, tot - sp * 0.85)),
      p50: r(tot), p75: r(tot + sp * 0.85), p95: r(tot + sp * 2.2)
    });
  }
  return rows;
}

function genRevData(c) {
  var rows = [], rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
  var da = c.deathAge || 90, retR = c.eqRet || 0.06;
  for (var a = c.age; a <= da; a++) {
    var preRet = a < c.retAge;
    var qpp = a >= (c.qppAge || 65) ? (c.qppM || 700) * 12 : 0;
    var oas = a >= (c.oasAge || 65) ? (c.oasM || 650) * 12 : 0;
    var pen = a >= c.retAge ? (c.penM || 0) * 12 : 0;
    var gis = (c.gis && a >= 65 && (qpp + oas) < 25000) ? Math.max(0, (6000 - (qpp + oas) * 0.5)) : 0;
    var spY = preRet ? (c.sal || 50000) : (c.retSpM || 3000) * 12;
    var gov = qpp + oas + pen + gis;
    var gap = preRet ? 0 : Math.max(0, spY - gov);
    var total = rr + tf + nr;
    var aRR = 0, aTF = 0, aNR = 0;
    if (!preRet && total > 0 && gap > 0) {
      var rat = Math.min(0.95, gap / total);
      aRR = r(rr * rat); aTF = r(tf * rat); aNR = r(nr * rat);
    }
    var taxInc = qpp + oas + pen + aRR + (preRet ? (c.sal || 50000) : 0);
    var tax = preRet ? r(taxInc * 0.28) : r(taxInc * (c.avgTR || 0.22));
    if (preRet) {
      rr = rr * (1 + retR) + (c.rrspC || 0);
      tf = tf * (1 + retR) + (c.tfsaC || 0);
      nr = nr * (1 + retR * 0.8) + (c.nrC || 0);
    } else {
      rr = Math.max(0, (rr - aRR) * (1 + retR * 0.65));
      tf = Math.max(0, (tf - aTF) * (1 + retR * 0.65));
      nr = Math.max(0, (nr - aNR) * (1 + retR * 0.65));
    }
    rows.push({
      age: a, rrq: r(qpp), psv: r(oas), pen: r(pen), ret: aRR + aTF + aNR,
      srg: r(gis), sp: r(spY), spending: r(spY), tax: tax, taxInc: r(taxInc),
      balRR: r(rr), balTF: r(tf), balNR: r(nr), balTot: r(rr + tf + nr),
      balCRR: c.cRRSP ? r(c.cRRSP * Math.pow(1.04, a - c.age)) : 0,
      balCTF: c.cTFSA ? r(c.cTFSA * Math.pow(1.04, a - c.age)) : 0,
      balCNR: c.cNR ? r(c.cNR * Math.pow(1.04, a - c.age)) : 0,
      balLIRA: c.lira ? r(c.lira * Math.pow(1.04, a - c.age)) : 0,
      aRR: aRR, aTF: aTF, aNR: aNR
    });
  }
  return rows;
}

function r(v) { return Math.round(v); }

function buildMC(cfg, succ) {
  var pD = genPD(cfg);
  var revData = genRevData(cfg);
  var last = pD[pD.length - 1] || {};
  return {
    pD: pD, medRevData: revData, revData: revData,
    succ: succ, rMedF: last.p50, medF: last.p50,
    rP25F: last.p25, p25F: last.p25, rP75F: last.p75, p75F: last.p75,
    p5Ruin: succ >= 0.85 ? 999 : (cfg.deathAge || 90) - 5,
    medEstateNet: r((last.p50 || 0) * 0.7), medEstateTax: r((last.p50 || 0) * 0.25),
    p25EstateNet: r((last.p25 || 0) * 0.6), p5EstateNet: r((last.p5 || 0) * 0.5),
    gkOn: cfg.gk || false,
    _sensReturn: { lo: -45000, hi: 62000 }, _sensInflation: { lo: -28000, hi: 31000 },
    _sensSpending: { lo: -55000, hi: 48000 }, _sensMortality: { lo: -15000, hi: 22000 }
  };
}

// ═══ 3. PROFILE DEFINITIONS ═══
var P = [
  // 1. Young Accumulator — Marc, 30, single, QC
  { id: 'young_accum', succ: 0.91,
    params: { age: 30, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC', sal: 65000, rrsp: 40000, tfsa: 15000, nr: 5000,
      retSpM: 3500, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, eqRetS: 0.07, bndRetS: 0.035, inf: 0.02,
      merR: 0.02, merT: 0.008, merN: 0.012, allocR: 0.7, allocT: 0.9, allocN: 0.6, goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard' },
    client: { name: 'Marc Tremblay', firstName: 'Marc', email: 'marc@example.com' },
    mc: { rrsp: 40000, tfsa: 15000, nr: 5000, age: 30, retAge: 65, deathAge: 90, retSpM: 3500, qppAge: 65, oasAge: 65, qppM: 850, oasM: 700, sal: 65000, rrspC: 6000, tfsaC: 3000, nrC: 1000, eqRet: 0.065 }
  },
  // 2. Couple Transition — Jean & Marie, 58/55, QC
  { id: 'couple_transition', succ: 0.84,
    params: { age: 58, retAge: 63, deathAge: 90, sex: 'M', prov: 'QC', sal: 95000, rrsp: 380000, tfsa: 120000, nr: 80000,
      cOn: true, cAge: 55, cRetAge: 65, cSal: 52000, cRRSP: 95000, cTFSA: 45000, cNR: 20000,
      retSpM: 5500, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.018, merT: 0.005, merN: 0.01, allocR: 0.55, allocT: 0.75, allocN: 0.45,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard', split: true, splitP: 0.5 },
    client: { name: 'Jean Lavoie', firstName: 'Jean', spouseFirstName: 'Marie', email: 'jean@example.com' },
    mc: { rrsp: 380000, tfsa: 120000, nr: 80000, age: 58, retAge: 63, deathAge: 90, retSpM: 5500, qppAge: 65, oasAge: 65, qppM: 950, oasM: 700, cRRSP: 95000, cTFSA: 45000, cNR: 20000, sal: 95000, rrspC: 8000, tfsaC: 3500, nrC: 2000, eqRet: 0.055 }
  },
  // 3. Retiree Decum — Monique, 70, single, QC
  { id: 'retiree_decum', succ: 0.78,
    params: { age: 70, retAge: 65, deathAge: 92, sex: 'F', prov: 'QC', sal: 0, rrsp: 220000, tfsa: 85000, nr: 50000,
      retSpM: 3200, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.022, merT: 0.005, merN: 0.01, allocR: 0.4, allocT: 0.6, allocN: 0.35,
      goP: 1, slP: 0.82, noP: 0.65, wStrat: 'standard' },
    client: { name: 'Monique Gagnon', firstName: 'Monique', email: 'monique@example.com' },
    mc: { rrsp: 220000, tfsa: 85000, nr: 50000, age: 70, retAge: 65, deathAge: 92, retSpM: 3200, qppAge: 65, oasAge: 65, qppM: 780, oasM: 730, sal: 0, eqRet: 0.05, avgTR: 0.18 }
  },
  // 4. FIRE Seeker — Alex, 35, single, ON
  { id: 'fire_seeker', succ: 0.72,
    params: { age: 35, retAge: 45, deathAge: 95, sex: 'M', prov: 'ON', sal: 135000, rrsp: 210000, tfsa: 90000, nr: 180000,
      retSpM: 4500, qppAge: 60, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.005, merT: 0.003, merN: 0.004, allocR: 0.85, allocT: 0.95, allocN: 0.75,
      goP: 1, slP: 0.8, noP: 0.65, wStrat: 'standard' },
    client: { name: 'Alex Chen', firstName: 'Alex', email: 'alex@example.com' },
    mc: { rrsp: 210000, tfsa: 90000, nr: 180000, age: 35, retAge: 45, deathAge: 95, retSpM: 4500, qppAge: 60, oasAge: 65, qppM: 550, oasM: 700, sal: 135000, rrspC: 15000, tfsaC: 7000, nrC: 20000, eqRet: 0.07 }
  },
  // 5. Low Income GIS — Robert, 62, single, QC
  { id: 'low_income_gis', succ: 0.95,
    params: { age: 62, retAge: 65, deathAge: 88, sex: 'M', prov: 'QC', sal: 32000, rrsp: 18000, tfsa: 8000, nr: 2000,
      retSpM: 2000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.02, merT: 0.005, merN: 0.01, allocR: 0.4, allocT: 0.5, allocN: 0.3,
      goP: 1, slP: 0.9, noP: 0.8, wStrat: 'standard' },
    client: { name: 'Robert Bouchard', firstName: 'Robert', email: 'robert@example.com' },
    mc: { rrsp: 18000, tfsa: 8000, nr: 2000, age: 62, retAge: 65, deathAge: 88, retSpM: 2000, qppAge: 65, oasAge: 65, qppM: 550, oasM: 700, sal: 32000, rrspC: 1000, tfsaC: 500, nrC: 0, eqRet: 0.045, gis: true, avgTR: 0.12 }
  },
  // 6. CCPC Owner — Sophie, 50, single, QC
  { id: 'ccpc_owner', succ: 0.87,
    params: { age: 50, retAge: 60, deathAge: 90, sex: 'F', prov: 'QC', sal: 120000, rrsp: 180000, tfsa: 95000, nr: 70000,
      retSpM: 5000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.015, merT: 0.005, merN: 0.008, allocR: 0.6, allocT: 0.8, allocN: 0.5,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'optimized',
      bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 300000, bizSaleAge: 65 },
    client: { name: 'Sophie Moreau', firstName: 'Sophie', email: 'sophie@example.com' },
    mc: { rrsp: 180000, tfsa: 95000, nr: 70000, age: 50, retAge: 60, deathAge: 90, retSpM: 5000, qppAge: 65, oasAge: 65, qppM: 850, oasM: 700, sal: 120000, rrspC: 10000, tfsaC: 7000, nrC: 3000, eqRet: 0.06 }
  },
  // 7. Real Estate Heavy — David, 45, single, ON
  { id: 'real_estate', succ: 0.76,
    params: { age: 45, retAge: 65, deathAge: 90, sex: 'M', prov: 'ON', sal: 88000, rrsp: 65000, tfsa: 40000, nr: 25000,
      retSpM: 4000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.022, merT: 0.005, merN: 0.012, allocR: 0.6, allocT: 0.8, allocN: 0.5,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard',
      props: [
        { on: true, nm: '123 Queen St', val: 450000, mb: 320000, mr: 0.055, ma: 20, rm: 2200, pt: 3800, ins: 1200, ox: 2400, ri: 0.03, sa: 0 },
        { on: true, nm: '88 King Ave', val: 420000, mb: 290000, mr: 0.052, ma: 22, rm: 2000, pt: 3500, ins: 1100, ox: 2100, ri: 0.03, sa: 70 }
      ] },
    client: { name: 'David Park', firstName: 'David', email: 'david@example.com' },
    mc: { rrsp: 65000, tfsa: 40000, nr: 25000, age: 45, retAge: 65, deathAge: 90, retSpM: 4000, qppAge: 65, oasAge: 65, qppM: 780, oasM: 700, sal: 88000, rrspC: 5000, tfsaC: 3000, nrC: 1000, eqRet: 0.06 }
  },
  // 8. High Net Worth Couple — François & Isabelle, 55/52, QC, EXPERT
  { id: 'hnw_couple', succ: 0.97, mode: 'expert',
    params: { age: 55, retAge: 60, deathAge: 92, sex: 'M', prov: 'QC', sal: 180000, rrsp: 820000, tfsa: 240000, nr: 450000, liraBal: 150000,
      cOn: true, cAge: 52, cRetAge: 62, cSal: 95000, cRRSP: 180000, cTFSA: 65000, cNR: 40000,
      retSpM: 8000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.012, merT: 0.004, merN: 0.006, allocR: 0.55, allocT: 0.75, allocN: 0.5,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'optimized',
      melt: true, meltTgt: 55000, split: true, splitP: 0.5,
      penType: 'db', penM: 2500, penIdx: true },
    client: { name: 'François Dubois', firstName: 'François', spouseFirstName: 'Isabelle', email: 'francois@example.com', advisor: 'Pl. Fin. Nathalie Roy', firm: 'FinPlan Québec' },
    mc: { rrsp: 820000, tfsa: 240000, nr: 450000, lira: 150000, age: 55, retAge: 60, deathAge: 92, retSpM: 8000, qppAge: 65, oasAge: 65, qppM: 1000, oasM: 730, cRRSP: 180000, cTFSA: 65000, cNR: 40000, sal: 180000, rrspC: 15000, tfsaC: 7000, nrC: 8000, eqRet: 0.06, penM: 2500 }
  },
  // 9. Debt-Laden Young — Karim, 28, single, ON
  { id: 'debt_young', succ: 0.68,
    params: { age: 28, retAge: 67, deathAge: 90, sex: 'M', prov: 'ON', sal: 55000, rrsp: 8000, tfsa: 5000, nr: 2000,
      retSpM: 2800, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.022, merT: 0.005, merN: 0.012, allocR: 0.8, allocT: 0.9, allocN: 0.6,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard',
      debts: [
        { name: 'Student Loan', balance: 45000, rate: 0.045, payment: 450 },
        { name: 'Credit Card', balance: 8200, rate: 0.199, payment: 250 }
      ] },
    client: { name: 'Karim Hassan', firstName: 'Karim', email: 'karim@example.com' },
    mc: { rrsp: 8000, tfsa: 5000, nr: 2000, age: 28, retAge: 67, deathAge: 90, retSpM: 2800, qppAge: 65, oasAge: 65, qppM: 700, oasM: 700, sal: 55000, rrspC: 3000, tfsaC: 2000, nrC: 500, eqRet: 0.065 }
  },
  // 10. RSU Tech Worker — Li Wei, 40, single, BC
  { id: 'rsu_tech', succ: 0.85,
    params: { age: 40, retAge: 55, deathAge: 92, sex: 'M', prov: 'BC', sal: 145000, rrsp: 120000, tfsa: 75000, nr: 95000,
      retSpM: 5000, qppAge: 60, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.004, merT: 0.003, merN: 0.004, allocR: 0.8, allocT: 0.9, allocN: 0.7,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard',
      rsuGrants: [
        { name: 'TechCo RSU 2024', totalShares: 500, sharePrice: 220, vestingYears: 4, exerciseAge: 44, margRate: 0.48 },
        { name: 'TechCo RSU 2025', totalShares: 350, sharePrice: 245, vestingYears: 4, exerciseAge: 45, margRate: 0.48 }
      ] },
    client: { name: 'Li Wei Zhang', firstName: 'Li Wei', email: 'liwei@example.com' },
    mc: { rrsp: 120000, tfsa: 75000, nr: 95000, age: 40, retAge: 55, deathAge: 92, retSpM: 5000, qppAge: 60, oasAge: 65, qppM: 580, oasM: 700, sal: 145000, rrspC: 12000, tfsaC: 7000, nrC: 10000, eqRet: 0.065 }
  }
];

// ═══ 4. AI NARRATION ═══
// Following ai-prompt-360 rules: conditional tense, observational, 2-3 sentences, ANCHOR→IMPLICATION→NUANCE
function aiText(idx, fr) {
  var a = {};
  switch(idx) {
    case 0: // Marc, 30, young accum
      if (fr) {
        a.overall_assessment = "Marc, votre plan obtient la note A (91 %) avec un patrimoine m\u00e9dian de 1,1 M$ \u00e0 la retraite. Les prestations gouvernementales pourraient couvrir 44 % de vos d\u00e9penses, et votre taux de retrait initial de 2,1 % est bien en dessous du seuil de 4 %. La structure \u00e0 dominante REER (67 %) pourrait cr\u00e9er une concentration fiscale apr\u00e8s 72 ans \u2014 diversifier vers le C\u00c9LI au fil du temps pourrait r\u00e9duire cet effet.";
        a.verdict = "Le moteur de simulation attribue la note A (91 %) au plan de Marc, ce qui indique que le patrimoine demeure positif à l'horizon dans 91 % des 5 000 scénarios testés. Avec 35 années de cotisation devant lui et un patrimoine actuel de 60 000 $, la trajectoire médiane pourrait atteindre environ 1,1 M$ en dollars réels à 65 ans. Ce résultat repose sur des hypothèses de rendement et d'inflation qui pourraient évoluer.";
        a.profile_summary = "Le portefeuille de Marc totalise 60 000 $, réparti à 67 % en REER, 25 % en CÉLI et 8 % en non-enregistré. Les revenus gouvernementaux (Régime de rentes du Québec + Pension de la Sécurité de la vieillesse) pourraient couvrir environ 44 % des dépenses de retraite prévues de 42 000 $ par année, laissant un écart mensuel d'environ 1 950 $ à combler par les retraits d'épargne.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine passant de 60 000 $ aujourd'hui à environ 1,1 M$ à la retraite, puis déclinant vers 380 000 $ à 90 ans. La fourchette P25–P75 en fin d'horizon se situe entre 180 000 $ et 620 000 $, ce qui reflète 60 ans d'incertitude de marché cumulée.";
        a.income_insight = "Les revenus gouvernementaux combinés pourraient totaliser environ 18 600 $ par année à partir de 65 ans. Les 23 400 $ restants pour atteindre le niveau de dépenses visé de 42 000 $ proviendraient des retraits d'épargne, ce qui représente un taux de retrait initial d'environ 2,1 % du patrimoine projeté à la retraite.";
        a.taxInsight = "Le taux effectif moyen en retraite se situe autour de 18 %, principalement alimenté par les retraits REER imposables. La structure actuelle à dominante REER (67 % du portefeuille) pourrait générer des retraits FERR obligatoires plus élevés après 72 ans, augmentant le revenu imposable dans les tranches supérieures.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 265 000 $, après un impôt au décès d'environ 95 000 $ sur la disposition réputée du REER/FERR. Dans un scénario prudent (P25), l'héritage net pourrait se situer autour de 110 000 $.";
      } else {
        a.overall_assessment = "Marc, your plan receives an A grade (91%) with median wealth of $1.1M at retirement. Government benefits could cover 44% of spending, and your initial withdrawal rate of 2.1% sits well below the 4% threshold. The RRSP-heavy structure (67%) could create tax concentration after age 72 \u2014 diversifying toward TFSA over time could reduce this effect.";
        a.verdict = "The simulation engine assigns Marc's plan an A grade (91%), indicating wealth remains positive at the horizon in 91% of 5,000 tested scenarios. With 35 years of contributions ahead and current savings of $60,000, the median trajectory could reach approximately $1.1M in real dollars at age 65. This projection rests on return and inflation assumptions that could evolve.";
        a.profile_summary = "Marc's portfolio totals $60,000, allocated 67% to RRSP, 25% to TFSA, and 8% to non-registered. Government income (Quebec Pension Plan + Old Age Security) could cover approximately 44% of planned retirement spending of $42,000 per year, leaving a monthly gap of about $1,950 to be funded from savings withdrawals.";
        a.trajectory_insight = "The median simulation projects wealth growing from $60,000 today to approximately $1.1M at retirement, then declining to $380,000 at age 90. The P25–P75 range at end of horizon falls between $180,000 and $620,000, reflecting 60 years of cumulative market uncertainty.";
        a.income_insight = "Combined government income could total approximately $18,600 per year starting at age 65. The remaining $23,400 to reach the targeted spending level of $42,000 would come from savings withdrawals, representing an initial withdrawal rate of approximately 2.1% of projected retirement wealth.";
        a.taxInsight = "The average effective tax rate in retirement sits around 18%, primarily driven by taxable RRSP withdrawals. The current RRSP-heavy structure (67% of portfolio) could generate higher mandatory RRIF withdrawals after age 72, pushing taxable income into higher brackets.";
        a.estateInsight = "The median net estate value is estimated at approximately $265,000, after tax at death of about $95,000 on deemed RRSP/RRIF disposition. In a cautious scenario (P25), the net estate could be around $110,000.";
      }
      break;

    case 1: // Jean & Marie, couple transition
      if (fr) {
        a.overall_assessment = "Le m\u00e9nage Lavoie obtient la note B+ (84 %) avec un patrimoine combin\u00e9 de 740 000 $. Les revenus gouvernementaux des deux conjoints pourraient couvrir 54 % des d\u00e9penses de 66 000 $, mais la p\u00e9riode de pont de 2 ans sans prestations cr\u00e9e une pression initiale sur les retraits. Le fractionnement de revenus de pension \u00e0 50 % pourrait att\u00e9nuer la charge fiscale du m\u00e9nage.";
        a.verdict = "Le plan du ménage Lavoie reçoit la note B+ (84 %), ce qui indique une trajectoire viable mais avec des zones de vulnérabilité dans les scénarios défavorables. Le patrimoine combiné de 740 000 $ (incluant les comptes du conjoint) constitue le socle de la projection, mais les 2 années de pont entre 63 et 65 ans sans revenus gouvernementaux pourraient exercer une pression sur les premiers retraits.";
        a.profile_summary = "Jean et Marie disposent d'un patrimoine combiné de 740 000 $, avec deux sources de revenus totalisant 147 000 $ par année. Les revenus gouvernementaux combinés (deux Régimes de rentes du Québec + deux Pensions de la Sécurité de la vieillesse) pourraient couvrir 54 % des dépenses prévues de 66 000 $ par année. Le fractionnement de revenus de pension à 50 % pourrait réduire la charge fiscale du ménage.";
        a.trajectory_insight = "La simulation médiane montre le patrimoine atteignant environ 780 000 $ à la retraite de Jean (63 ans), puis déclinant progressivement vers 210 000 $ à 90 ans. La fourchette P25–P75 en fin d'horizon varie entre 85 000 $ et 380 000 $, une dispersion qui reflète la sensibilité au séquencement des rendements dans les premières années de retraite.";
        a.income_insight = "Entre 63 et 65 ans, le ménage devrait puiser intégralement dans l'épargne pour couvrir les 66 000 $ de dépenses annuelles. À partir de 65 ans, les revenus gouvernementaux combinés pourraient atteindre environ 35 400 $ par année, réduisant l'écart à combler à 30 600 $ — soit 2 550 $ par mois de retraits.";
        a.taxInsight = "Le taux effectif moyen en retraite se situe autour de 21 %. Le fractionnement des revenus de pension à 50 % entre Jean et Marie pourrait réduire l'impôt combiné en équilibrant les paliers d'imposition des deux conjoints.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 147 000 $. Le roulement au conjoint survivant pourrait différer la disposition réputée des comptes enregistrés au deuxième décès.";
      } else {
        a.overall_assessment = "The Lavoie household receives a B+ grade (84%) with combined wealth of $740,000. Government income from both spouses could cover 54% of $66,000 in spending, but the 2-year bridge without benefits creates initial withdrawal pressure. Pension income splitting at 50% could mitigate the household tax burden.";
        a.verdict = "The Lavoie household plan receives a B+ grade (84%), indicating a viable trajectory with some vulnerability in adverse scenarios. The combined wealth of $740,000 (including spouse accounts) forms the projection's foundation, but the 2-year bridge between age 63 and 65 without government income could pressure early withdrawals.";
        a.profile_summary = "Jean and Marie hold combined wealth of $740,000, with two income sources totaling $147,000 per year. Combined government income (two Quebec Pension Plans + two Old Age Security) could cover 54% of planned spending of $66,000 per year. Pension income splitting at 50% could reduce the household tax burden.";
        a.trajectory_insight = "The median simulation shows wealth reaching approximately $780,000 at Jean's retirement (age 63), then gradually declining to $210,000 at age 90. The P25–P75 range at end of horizon varies between $85,000 and $380,000, reflecting sensitivity to return sequencing in the early retirement years.";
        a.income_insight = "Between ages 63 and 65, the household would draw entirely from savings to cover the $66,000 in annual spending. Starting at 65, combined government income could reach approximately $35,400 per year, reducing the gap to $30,600 — or $2,550 per month in withdrawals.";
        a.taxInsight = "The average effective tax rate in retirement sits around 21%. Pension income splitting at 50% between Jean and Marie could reduce combined tax by balancing both spouses' tax brackets.";
        a.estateInsight = "The median net estate value is estimated at approximately $147,000. Spousal rollover could defer deemed disposition of registered accounts to the second death.";
      }
      break;

    case 2: // Monique, 70, retiree decum
      if (fr) {
        a.overall_assessment = "Monique obtient la note B (78 %) avec un patrimoine de 355 000 $ en d\u00e9caissement depuis 5 ans. Les revenus gouvernementaux couvrent 46 % des d\u00e9penses de 3 200 $ par mois, et le taux de retrait actuel de 5,7 % d\u00e9passe le seuil de 4 % souvent cit\u00e9 dans la litt\u00e9rature. La conversion FERR obligatoire est d\u00e9j\u00e0 en cours \u2014 les retraits minimums augmenteront progressivement.";
        a.verdict = "Le moteur de simulation attribue la note B (78 %) au plan de Monique, ce qui indique que l'épargne pourrait durer jusqu'à l'horizon dans environ 4 scénarios sur 5. Le patrimoine actuel de 355 000 $ est en phase de décaissement depuis 5 ans, et la trajectoire médiane montre un solde d'environ 120 000 $ à 92 ans. Dans un scénario prudent (P25), l'épargne pourrait s'épuiser vers 87 ans — les revenus gouvernementaux continueraient toutefois d'être versés.";
        a.profile_summary = "Monique est à la retraite depuis 5 ans, avec un portefeuille de 355 000 $ composé de 62 % en REER, 24 % en CÉLI et 14 % en non-enregistré. Les revenus gouvernementaux (Régime de rentes du Québec à 780 $ par mois + Pension de la Sécurité de la vieillesse à 730 $ par mois) couvrent 46 % des dépenses mensuelles de 3 200 $. L'écart de 1 720 $ par mois provient des retraits d'épargne.";
        a.trajectory_insight = "Le patrimoine est passé d'un point haut estimé à environ 420 000 $ à 65 ans au niveau actuel de 355 000 $ à 70 ans. La simulation médiane projette un solde d'environ 120 000 $ à 92 ans, mais la fourchette P25–P75 s'étend de 0 $ à 280 000 $, reflétant la sensibilité accrue aux rendements en phase de décaissement.";
        a.income_insight = "Les revenus gouvernementaux totalisent environ 18 120 $ par année. Les dépenses annuelles de 38 400 $ nécessitent des retraits d'épargne de 20 280 $ par année, ce qui représente un taux de retrait de 5,7 % du portefeuille actuel — au-dessus du seuil de 4 % souvent cité dans la littérature financière.";
        a.taxInsight = "Le taux effectif moyen se situe autour de 18 %. La conversion FERR obligatoire est déjà en cours et les retraits minimums augmenteront progressivement, ce qui pourrait pousser le revenu imposable au-delà du seuil de récupération de la Pension de la Sécurité de la vieillesse dans certaines années.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 84 000 $. L'impôt au décès sur la disposition réputée du REER/FERR pourrait représenter environ 30 % de la valeur brute des comptes enregistrés.";
      } else {
        a.overall_assessment = "Monique receives a B grade (78%) with $355,000 in savings, in drawdown for 5 years. Government income covers 46% of $3,200/mo in spending, and the current withdrawal rate of 5.7% exceeds the commonly cited 4% threshold. Mandatory RRIF conversion is already underway \u2014 minimum withdrawals will increase progressively.";
        a.verdict = "The simulation engine assigns Monique's plan a B grade (78%), indicating savings could last through the horizon in roughly 4 out of 5 scenarios. Current wealth of $355,000 has been in drawdown for 5 years, and the median trajectory shows a balance of approximately $120,000 at age 92. In a cautious scenario (P25), savings could be depleted around age 87 — government income would continue regardless.";
        a.profile_summary = "Monique has been retired for 5 years, with a portfolio of $355,000 composed of 62% RRSP, 24% TFSA, and 14% non-registered. Government income (Quebec Pension Plan at $780/mo + Old Age Security at $730/mo) covers 46% of monthly spending of $3,200. The $1,720/mo gap is funded from savings withdrawals.";
        a.trajectory_insight = "Wealth declined from an estimated peak of approximately $420,000 at age 65 to the current $355,000 at age 70. The median simulation projects a balance of approximately $120,000 at age 92, but the P25–P75 range spans from $0 to $280,000, reflecting heightened sensitivity to returns during drawdown.";
        a.income_insight = "Government income totals approximately $18,120 per year. Annual spending of $38,400 requires savings withdrawals of $20,280 per year, representing a withdrawal rate of 5.7% of current portfolio — above the 4% threshold often cited in financial literature.";
        a.taxInsight = "The average effective rate sits around 18%. Mandatory RRIF conversion is already underway and minimum withdrawals will increase progressively, which could push taxable income above the Old Age Security recovery threshold in some years.";
        a.estateInsight = "The median net estate value is estimated at approximately $84,000. Tax at death on deemed RRSP/RRIF disposition could represent about 30% of registered account gross value.";
      }
      break;

    case 3: // Alex, 35, FIRE
      if (fr) {
        a.overall_assessment = "Alex obtient la note B (72 %) avec un patrimoine de 480 000 $ et un objectif FIRE \u00e0 45 ans. La retraite anticip\u00e9e cr\u00e9e un pont de 20 ans avant la Pension de la S\u00e9curit\u00e9 de la vieillesse, pendant lequel le portefeuille devrait couvrir la totalit\u00e9 des 54 000 $ de d\u00e9penses. Les frais bas (0,4 %) et l\u2019allocation agressive (85 % actions) soutiennent la croissance, mais 28 % des sc\u00e9narios montrent un \u00e9puisement avant l\u2019horizon.";
        a.verdict = "Le plan d'Alex reçoit la note B (72 %), ce qui signifie que l'épargne pourrait ne pas durer jusqu'à 95 ans dans environ 28 % des scénarios simulés. La retraite à 45 ans crée un pont de 15 ans avant le Régime de pensions du Canada (60 ans) et de 20 ans avant la Pension de la Sécurité de la vieillesse (65 ans), pendant lesquels la totalité des 54 000 $ de dépenses annuelles reposerait sur le portefeuille de 480 000 $.";
        a.profile_summary = "Alex dispose de 480 000 $ répartis entre REER (44 %), CÉLI (19 %) et non-enregistré (37 %). La structure à faibles frais (frais de gestion moyens de 0,4 %) et l'allocation agressive (85 % actions en REER) reflètent un profil orienté vers la croissance. Les cotisations annuelles de 42 000 $ au cours des 10 prochaines années pourraient porter le patrimoine à environ 800 000 $ à 45 ans.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine d'environ 800 000 $ à la retraite (45 ans), suivi de 15 années de décaissement intégral avant que les revenus gouvernementaux n'entrent en jeu. Le patrimoine pourrait atteindre son point le plus bas vers 65 ans, autour de 280 000 $ en médiane, avant de se stabiliser avec l'ajout du Régime de pensions du Canada et de la Pension de la Sécurité de la vieillesse.";
        a.income_insight = "Entre 45 et 60 ans, aucun revenu gouvernemental n'est disponible — les retraits annuels de 54 000 $ proviendraient entièrement du portefeuille. À partir de 60 ans, le Régime de pensions du Canada pourrait ajouter 6 600 $ par année, puis la Pension de la Sécurité de la vieillesse ajouterait 8 400 $ supplémentaires à 65 ans, réduisant le déficit à combler à 39 000 $.";
        a.taxInsight = "Avec un salaire actuel de 135 000 $ et un taux marginal ontarien élevé, les cotisations REER génèrent un avantage fiscal important. En retraite anticipée, les premiers retraits pourraient se faire à un taux effectif bas (15-18 %) avant que les prestations gouvernementales ne s'ajoutent au revenu imposable.";
        a.estateInsight = "La valeur successorale dépend fortement du moment du décès par rapport à l'épuisement potentiel du portefeuille. La médiane indique un héritage net d'environ 190 000 $, mais dans un scénario P25, la valeur pourrait être proche de zéro.";
      } else {
        a.overall_assessment = "Alex receives a B grade (72%) with $480,000 in savings and a FIRE target of age 45. Early retirement creates a 20-year bridge before OAS, during which the portfolio must cover the full $54,000 in spending. Low fees (0.4%) and aggressive allocation (85% equities) support growth, but 28% of scenarios show depletion before the horizon.";
        a.verdict = "Alex's plan receives a B grade (72%), meaning savings may not last to age 95 in approximately 28% of simulated scenarios. Retiring at 45 creates a 15-year bridge before the Canada Pension Plan (age 60) and a 20-year bridge before Old Age Security (age 65), during which the full $54,000 in annual spending would rest on the $480,000 portfolio.";
        a.profile_summary = "Alex holds $480,000 split across RRSP (44%), TFSA (19%), and non-registered (37%). The low-fee structure (average MER of 0.4%) and aggressive allocation (85% equities in RRSP) reflect a growth-oriented profile. Annual contributions of $42,000 over the next 10 years could bring wealth to approximately $800,000 at age 45.";
        a.trajectory_insight = "The median simulation projects wealth of approximately $800,000 at retirement (age 45), followed by 15 years of full drawdown before government income kicks in. Wealth could reach its lowest point around age 65, at approximately $280,000 median, before stabilizing with the addition of CPP and OAS.";
        a.income_insight = "Between ages 45 and 60, no government income is available — annual withdrawals of $54,000 would come entirely from the portfolio. Starting at age 60, CPP could add $6,600 per year, then OAS would add another $8,400 at age 65, reducing the gap to $39,000.";
        a.taxInsight = "With a current salary of $135,000 and a high Ontario marginal rate, RRSP contributions generate significant tax benefit. In early retirement, initial withdrawals could be made at a low effective rate (15-18%) before government benefits add to taxable income.";
        a.estateInsight = "Estate value depends heavily on timing of death relative to potential portfolio depletion. The median indicates a net estate of approximately $190,000, but in a P25 scenario, the value could be near zero.";
      }
      break;

    case 4: // Robert, 62, low income GIS
      if (fr) {
        a.overall_assessment = "Robert obtient la note A (95 %) avec un patrimoine modeste de 28 000 $, mais une forte couverture gouvernementale. Les prestations combin\u00e9es (RRQ + PSV + SRG) pourraient couvrir 83 % des d\u00e9penses de 24 000 $ par ann\u00e9e. Le Suppl\u00e9ment de revenu garanti est un atout cl\u00e9 \u2014 les retraits REER/FERR d\u00e9clenchent toutefois la r\u00e9cup\u00e9ration \u00e0 50 \u00a2 par dollar.";
        a.verdict = "Le plan de Robert reçoit la note A (95 %), ce qui indique une trajectoire stable grâce à la combinaison de revenus gouvernementaux élevés par rapport à des besoins de dépenses contenus. Le patrimoine de 28 000 $ joue un rôle de coussin plutôt que de source principale — les revenus du Régime de rentes du Québec, de la Pension de la Sécurité de la vieillesse et du Supplément de revenu garanti pourraient couvrir 83 % des dépenses prévues de 24 000 $ par année.";
        a.profile_summary = "Le portefeuille de Robert totalise 28 000 $, avec 64 % en REER et 29 % en CÉLI. Le niveau de dépenses visé de 2 000 $ par mois est couvert en grande partie par les revenus gouvernementaux — un profil où la stabilité des prestations prime sur la performance du portefeuille.";
        a.trajectory_insight = "La simulation médiane montre le patrimoine croissant légèrement jusqu'à 65 ans (environ 34 000 $), puis déclinant lentement à mesure que le faible écart mensuel est comblé par de petits retraits. Le patrimoine pourrait se maintenir au-dessus de 10 000 $ jusqu'à 88 ans dans le scénario médian.";
        a.income_insight = "Les revenus gouvernementaux combinés (Régime de rentes du Québec 550 $/mois + Pension de la Sécurité de la vieillesse 700 $/mois + Supplément de revenu garanti estimé à environ 400 $/mois) pourraient totaliser 19 800 $ par année. L'écart de 4 200 $ par année serait comblé par de modestes retraits d'épargne de 350 $ par mois.";
        a.taxInsight = "Le taux effectif moyen en retraite pourrait être inférieur à 12 %, grâce au faible revenu imposable et aux crédits d'impôt pour revenu de pension et en raison de l'âge. Le Supplément de revenu garanti n'est pas imposable mais est récupéré à 50 ¢ par dollar de revenu au-delà du seuil.";
        a.gis_insight = "Le Supplément de revenu garanti représente une part importante du revenu de retraite. Les retraits REER/FERR augmentent le revenu qui déclenche la récupération — le CÉLI, dont les retraits ne sont pas imposables, pourrait être privilégié pendant les années d'admissibilité au Supplément de revenu garanti.";
        a.estateInsight = "La valeur successorale est modeste, avec un héritage net médian d'environ 15 000 $. L'impôt au décès serait limité en raison du faible solde REER résiduel.";
      } else {
        a.overall_assessment = "Robert receives an A grade (95%) with modest savings of $28,000 but strong government coverage. Combined benefits (QPP + OAS + GIS) could cover 83% of $24,000 in annual spending. The Guaranteed Income Supplement is a key asset \u2014 though RRSP/RRIF withdrawals trigger the 50\u00a2-per-dollar clawback.";
        a.verdict = "Robert's plan receives an A grade (95%), indicating a stable trajectory thanks to the combination of high government income relative to contained spending needs. The $28,000 portfolio serves as a cushion rather than a primary source — Quebec Pension Plan, Old Age Security, and Guaranteed Income Supplement income could cover 83% of planned spending of $24,000 per year.";
        a.profile_summary = "Robert's portfolio totals $28,000, with 64% in RRSP and 29% in TFSA. The targeted spending level of $2,000 per month is largely covered by government income — a profile where benefit stability outweighs portfolio performance.";
        a.trajectory_insight = "The median simulation shows wealth growing slightly to age 65 (approximately $34,000), then declining slowly as the small monthly gap is filled by modest withdrawals. Wealth could remain above $10,000 through age 88 in the median scenario.";
        a.income_insight = "Combined government income (QPP $550/mo + OAS $700/mo + estimated GIS of approximately $400/mo) could total $19,800 per year. The $4,200 annual gap would be filled by modest savings withdrawals of $350 per month.";
        a.taxInsight = "The average effective rate in retirement could be below 12%, thanks to low taxable income and pension income/age tax credits. GIS is not taxable but is clawed back at 50¢ per dollar above the threshold.";
        a.gis_insight = "The Guaranteed Income Supplement represents a significant portion of retirement income. RRSP/RRIF withdrawals increase income that triggers the clawback — TFSA, whose withdrawals are not taxable, could be prioritized during GIS-eligible years.";
        a.estateInsight = "Estate value is modest, with a median net estate of approximately $15,000. Tax at death would be limited due to the low residual RRSP balance.";
      }
      break;

    case 5: // Sophie, 50, CCPC
      if (fr) {
        a.overall_assessment = "Sophie obtient la note A- (87 %) avec un patrimoine personnel de 345 000 $ et 300 000 $ en b\u00e9n\u00e9fices non r\u00e9partis dans sa soci\u00e9t\u00e9 par actions. La retraite \u00e0 60 ans cr\u00e9e un pont de 5 ans que la corporation pourrait couvrir. L\u2019exon\u00e9ration cumulative de gains en capital de 1 250 000 $ est un levier majeur pour la vente d\u2019actions admissibles.";
        a.verdict = "Le plan de Sophie reçoit la note A- (87 %), ce qui indique une trajectoire solide soutenue par un patrimoine personnel de 345 000 $ et un solde corporatif de 300 000 $ en bénéfices non répartis. La retraite à 60 ans crée un pont de 5 ans avant les revenus gouvernementaux, mais la corporation offre une flexibilité d'extraction pour couvrir cette période.";
        a.profile_summary = "Sophie dispose d'un patrimoine personnel de 345 000 $ (REER 52 %, CÉLI 28 %, non-enregistré 20 %) complété par 300 000 $ de bénéfices non répartis dans sa société par actions. Le taux de cotisation actuel et les revenus d'entreprise pourraient porter le patrimoine total (personnel + corporatif) à environ 900 000 $ à la retraite.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine personnel d'environ 520 000 $ à 60 ans, sans compter le solde corporatif. La fourchette P25–P75 en fin d'horizon se situe entre 180 000 $ et 520 000 $, ce qui reflète la sensibilité aux rendements sur un horizon de 40 ans.";
        a.income_insight = "Entre 60 et 65 ans, les retraits d'épargne et l'extraction corporative couvriraient la totalité des 60 000 $ de dépenses annuelles. À partir de 65 ans, le Régime de rentes du Québec (850 $/mois) et la Pension de la Sécurité de la vieillesse (700 $/mois) pourraient fournir 18 600 $ par année, réduisant l'écart à 41 400 $.";
        a.taxInsight = "Le taux intégré (corporatif + personnel) se situe autour de 48 % pour les revenus d'entreprise actifs au Québec. La stratégie d'extraction combinant salaire et dividendes pourrait être coordonnée avec les retraits personnels pour maintenir le revenu imposable dans les tranches inférieures.";
        a.corp_insight = "La société par actions détient 300 000 $ en bénéfices non répartis. L'exonération cumulative des gains en capital de 1 250 000 $ est disponible lors de la vente d'actions admissibles d'une société privée sous contrôle canadien active. La vente prévue à 65 ans pourrait libérer des liquidités importantes avec un traitement fiscal avantageux.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 220 000 $, incluant le solde corporatif résiduel. La planification successorale corporative (gel successoral, fiducie familiale) pourrait influencer la charge fiscale au décès.";
      } else {
        a.overall_assessment = "Sophie receives an A- grade (87%) with personal wealth of $345,000 and $300,000 in corporate retained earnings. Retiring at 60 creates a 5-year bridge that the corporation could cover. The $1,250,000 lifetime capital gains exemption is a major lever for qualifying share sales.";
        a.verdict = "Sophie's plan receives an A- grade (87%), indicating a solid trajectory supported by personal wealth of $345,000 and a corporate balance of $300,000 in retained earnings. Retiring at 60 creates a 5-year bridge before government income, but the corporation offers extraction flexibility to cover this period.";
        a.profile_summary = "Sophie holds personal wealth of $345,000 (RRSP 52%, TFSA 28%, non-registered 20%) complemented by $300,000 in retained earnings in her corporation. Current contribution rates and business income could bring total wealth (personal + corporate) to approximately $900,000 at retirement.";
        a.trajectory_insight = "The median simulation projects personal wealth of approximately $520,000 at age 60, excluding the corporate balance. The P25–P75 range at end of horizon sits between $180,000 and $520,000, reflecting return sensitivity over a 40-year horizon.";
        a.income_insight = "Between ages 60 and 65, savings withdrawals and corporate extraction would cover the full $60,000 in annual spending. Starting at 65, QPP ($850/mo) and OAS ($700/mo) could provide $18,600 per year, reducing the gap to $41,400.";
        a.taxInsight = "The integrated rate (corporate + personal) sits around 48% for active business income in Quebec. The extraction strategy combining salary and dividends could be coordinated with personal withdrawals to keep taxable income in lower brackets.";
        a.corp_insight = "The corporation holds $300,000 in retained earnings. The $1,250,000 lifetime capital gains exemption is available when selling qualifying shares of an active Canadian-controlled private corporation. The planned sale at age 65 could release significant liquidity with favorable tax treatment.";
        a.estateInsight = "The median net estate value is estimated at approximately $220,000, including the residual corporate balance. Corporate estate planning (estate freeze, family trust) could influence the tax burden at death.";
      }
      break;

    case 6: // David, 45, real estate
      if (fr) {
        a.overall_assessment = "David obtient la note B (76 %) avec 130 000 $ en \u00e9pargne financi\u00e8re et 260 000 $ d\u2019\u00e9quit\u00e9 immobili\u00e8re dans 2 propri\u00e9t\u00e9s locatives. La concentration immobili\u00e8re (67 % de la valeur nette) cr\u00e9e une vuln\u00e9rabilit\u00e9 de liquidit\u00e9. La vente pr\u00e9vue du 88 King Ave \u00e0 70 ans pourrait lib\u00e9rer environ 260 000 $ et prolonger la dur\u00e9e de vie du portefeuille.";
        a.verdict = "Le plan de David reçoit la note B (76 %), ce qui indique une trajectoire viable mais avec une vulnérabilité liée à la concentration immobilière. Le patrimoine financier de 130 000 $ est complété par une équité immobilière de 260 000 $ dans deux propriétés locatives, mais 67 % de la valeur nette totale est illiquide.";
        a.profile_summary = "David dispose de 130 000 $ en épargne financière (REER 50 %, CÉLI 31 %, non-enregistré 19 %) et de deux propriétés locatives avec une équité combinée de 260 000 $. La valeur nette totale est d'environ 390 000 $, dont 67 % est immobilisée dans l'immobilier.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine financier d'environ 340 000 $ à 65 ans, sans compter l'équité immobilière qui pourrait atteindre 520 000 $. La vente du 88 King Ave à 70 ans libérerait des liquidités qui prolongeraient la durée de vie du portefeuille.";
        a.income_insight = "Les revenus locatifs nets combinés des deux propriétés sont d'environ 800 $ par mois après les paiements hypothécaires, les taxes et l'entretien. À la retraite, les revenus gouvernementaux (Régime de pensions du Canada + Pension de la Sécurité de la vieillesse) pourraient ajouter 17 760 $ par année.";
        a.taxInsight = "Les revenus locatifs sont imposables au taux marginal, et les gains en capital lors de la vente des propriétés locatives seraient assujettis au taux d'inclusion. L'amortissement récupéré lors de la vente pourrait créer une charge fiscale ponctuelle importante.";
        a.real_estate_insight = "Les deux propriétés génèrent un flux de trésorerie net combiné d'environ 800 $ par mois. L'hypothèque du 123 Queen St (320 000 $ à 5,5 %) coûte plus cher en intérêts que le rendement locatif net, ce qui crée un flux de trésorerie négatif sur cette propriété prise isolément. La vente prévue du 88 King Ave à 70 ans pourrait libérer environ 260 000 $ d'équité nette.";
        a.estateInsight = "La valeur successorale totale inclut l'équité immobilière résiduelle et le portefeuille financier. L'impôt sur les gains en capital des propriétés locatives et la disposition réputée du REER pourraient réduire la valeur nette transférable.";
      } else {
        a.overall_assessment = "David receives a B grade (76%) with $130,000 in financial savings and $260,000 in real estate equity across 2 rental properties. Real estate concentration (67% of net worth) creates liquidity vulnerability. The planned sale of 88 King Ave at age 70 could free approximately $260,000 and extend portfolio longevity.";
        a.verdict = "David's plan receives a B grade (76%), indicating a viable trajectory but with vulnerability tied to real estate concentration. Financial wealth of $130,000 is complemented by $260,000 in real estate equity across two rental properties, but 67% of total net worth is illiquid.";
        a.profile_summary = "David holds $130,000 in financial savings (RRSP 50%, TFSA 31%, non-registered 19%) and two rental properties with combined equity of $260,000. Total net worth is approximately $390,000, of which 67% is locked in real estate.";
        a.trajectory_insight = "The median simulation projects financial wealth of approximately $340,000 at age 65, excluding real estate equity which could reach $520,000. The sale of 88 King Ave at age 70 would free liquidity to extend portfolio longevity.";
        a.income_insight = "Combined net rental income from both properties is approximately $800 per month after mortgage payments, taxes, and maintenance. At retirement, government income (CPP + OAS) could add $17,760 per year.";
        a.taxInsight = "Rental income is taxable at the marginal rate, and capital gains on rental property sales would be subject to the inclusion rate. Recaptured depreciation at sale could create a significant one-time tax charge.";
        a.real_estate_insight = "Both properties generate combined net cash flow of approximately $800 per month. The 123 Queen St mortgage ($320,000 at 5.5%) costs more in interest than the net rental yield, creating negative cash flow on that property alone. The planned sale of 88 King Ave at age 70 could free approximately $260,000 in net equity.";
        a.estateInsight = "Total estate value includes residual real estate equity and the financial portfolio. Capital gains tax on rental properties and deemed RRSP disposition could reduce the net transferable value.";
      }
      break;

    case 7: // François & Isabelle, HNW couple, expert
      if (fr) {
        a.overall_assessment = "Le m\u00e9nage Dubois obtient la note A+ (97 %) avec un patrimoine combin\u00e9 de 1,94 M$ et une pension \u00e0 prestations d\u00e9termin\u00e9es de 2 500 $/mois. Les revenus gouvernementaux et la pension pourraient couvrir 96 % des 96 000 $ de d\u00e9penses. La strat\u00e9gie de meltdown REER \u00e0 55 000 $/an vise un alpha fiscal de 180 000 $. Les frais de gestion REER de 1,2 % repr\u00e9sentent le co\u00fbt le plus \u00e9lev\u00e9.";
        a.verdict = "Le plan Dubois reçoit la note A+ (97 %), ce qui signifie que le patrimoine demeure positif dans la quasi-totalité des 5 000 scénarios testés. Ce résultat reflète la capacité de survie du plan dans l'éventail de conditions simulées — il ne constitue pas une garantie. Avec un patrimoine combiné de 1,94 M$ (incluant le CRI et les comptes du conjoint), la question pertinente n'est pas si l'argent durera, mais plutôt comment chaque dollar pourrait travailler plus efficacement.";
        a.page_zero_verdict = "François et Isabelle disposent d'un patrimoine combiné de 1,94 M$, soutenu par une pension à prestations déterminées de 2 500 $ par mois. Le taux de succès de 97 % indique une marge confortable. La stratégie de meltdown REER à 55 000 $ par année vise à réduire la masse imposable avant la conversion FERR obligatoire à 72 ans. Le fractionnement de revenus de pension à 50 % entre les conjoints pourrait réduire l'impôt combiné.";
        a.profile_summary = "Le ménage Dubois détient un portefeuille diversifié : REER 820 000 $, CÉLI 240 000 $, non-enregistré 450 000 $, CRI 150 000 $, plus les comptes d'Isabelle totalisant 285 000 $. La pension à prestations déterminées de 2 500 $ par mois et les frais de gestion bas (1,2 % REER, 0,4 % CÉLI) contribuent à la robustesse du plan.";
        a.trajectory_insight = "La simulation médiane montre le patrimoine passant de 1,94 M$ à environ 2,1 M$ à la retraite (60 ans), puis déclinant vers 820 000 $ à 92 ans. La fourchette P25–P75 en fin d'horizon se situe entre 450 000 $ et 1,3 M$, une dispersion qui reflète 37 ans de projection.";
        a.income_insight = "La pension à prestations déterminées (30 000 $ par année) combinée aux revenus gouvernementaux des deux conjoints (environ 62 400 $ par année à partir de 65 ans) pourrait couvrir 96 % des dépenses de 96 000 $. L'écart résiduel de 3 600 $ par année est négligeable par rapport au patrimoine.";
        a.taxInsight = "L'alpha fiscal généré par la stratégie de décaissement pourrait totaliser environ 180 000 $ sur l'horizon de projection. Le meltdown REER à 55 000 $ par année entre 60 et 72 ans vise à réduire le solde REER avant la conversion FERR, diminuant les retraits minimums obligatoires et la récupération potentielle de la Pension de la Sécurité de la vieillesse.";
        a.meltdown_insight = "Le meltdown REER vise à extraire les fonds à un taux marginal inférieur pendant les années 60-72, plutôt que de subir des retraits FERR obligatoires à un taux potentiellement plus élevé après 72 ans. Avec un REER initial de 820 000 $ et une cible de 55 000 $ par année pendant 12 ans, le solde REER pourrait être réduit d'environ 60 % avant la conversion.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 575 000 $, après un impôt au décès d'environ 205 000 $. Le roulement au conjoint survivant pourrait différer la totalité de cet impôt au deuxième décès.";
        a.best_move_explainer = "Les frais de gestion du REER (1,2 %) représentent le coût le plus élevé du portefeuille — une réduction vers 0,5 % pourrait libérer environ 85 000 $ supplémentaires sur l'horizon de projection. La coordination entre le meltdown REER et le fractionnement de pension vise à maintenir les deux conjoints dans des tranches d'imposition similaires, ce qui pourrait réduire l'impôt combiné de 3 000 $ à 5 000 $ par année pendant les premières années de retraite.";
        a.strengths = ["Pension DB indexée couvrant 31 % des dépenses sans risque de marché", "Diversification entre 6 comptes réduisant le risque de concentration fiscale", "Marge de sécurité : patrimoine 20× supérieur à l'écart annuel à combler"];
        a.vulnerabilities = ["Concentration REER (42 %) exposant aux retraits FERR obligatoires croissants", "Écart de 3 ans entre les retraites des conjoints créant une période de transition asymétrique", "Frais de gestion REER de 1,2 % érodant environ 9 800 $ par année sur le solde actuel"];
        a.riskInsight = "La fourchette P25\u2013P75 en fin d\u2019horizon se situe entre 450 000 $ et 1,3 M$, soit une dispersion de 850 000 $ qui refl\u00e8te l\u2019incertitude sur 37 ans. Le facteur le plus sensible est le rendement des march\u00e9s, suivi des d\u00e9penses. La durabilit\u00e9 de l\u2019\u00e9pargne n\u2019est jamais menac\u00e9e, m\u00eame dans le P5.";
        a.couple_insight = "L\u2019\u00e9cart de 3 ans entre les retraites cr\u00e9e une p\u00e9riode de transition asym\u00e9trique o\u00f9 Fran\u00e7ois est retrait\u00e9 mais Isabelle contribue encore. Le fractionnement de pension \u00e0 50 % vise \u00e0 \u00e9galiser les revenus imposables des deux conjoints.";
      } else {
        a.overall_assessment = "The Dubois household receives an A+ grade (97%) with combined wealth of $1.94M and a defined benefit pension of $2,500/mo. Government income plus the pension could cover 96% of $96,000 in spending. The RRSP meltdown strategy at $55,000/yr targets a tax alpha of $180,000. RRSP management fees of 1.2% represent the highest cost.";
        a.verdict = "The Dubois plan receives an A+ grade (97%), meaning wealth remains positive in virtually all 5,000 tested scenarios. This result reflects the plan's survival capacity across the simulated range of conditions — it is not a guarantee. With combined wealth of $1.94M (including LIRA and spouse accounts), the relevant question is not whether the money will last, but rather how each dollar could work more efficiently.";
        a.page_zero_verdict = "François and Isabelle hold combined wealth of $1.94M, supported by a defined benefit pension of $2,500 per month. The 97% success rate indicates a comfortable margin. The RRSP meltdown strategy at $55,000 per year aims to reduce the taxable mass before mandatory RRIF conversion at age 72. Pension income splitting at 50% between spouses could reduce combined tax.";
        a.profile_summary = "The Dubois household holds a diversified portfolio: RRSP $820,000, TFSA $240,000, non-registered $450,000, LIRA $150,000, plus Isabelle's accounts totaling $285,000. The defined benefit pension of $2,500/mo and low fees (1.2% RRSP, 0.4% TFSA) contribute to plan robustness.";
        a.trajectory_insight = "The median simulation shows wealth growing from $1.94M to approximately $2.1M at retirement (age 60), then declining toward $820,000 at age 92. The P25–P75 range at end of horizon sits between $450,000 and $1.3M, a spread reflecting 37 years of projection.";
        a.income_insight = "The defined benefit pension ($30,000/yr) combined with both spouses' government income (approximately $62,400/yr starting at 65) could cover 96% of $96,000 in spending. The residual gap of $3,600 per year is negligible relative to the wealth base.";
        a.taxInsight = "The tax alpha generated by the withdrawal strategy could total approximately $180,000 over the projection horizon. The RRSP meltdown at $55,000/yr between ages 60 and 72 aims to reduce the RRSP balance before RRIF conversion, lowering mandatory minimum withdrawals and potential OAS recovery tax.";
        a.meltdown_insight = "The RRSP meltdown aims to extract funds at a lower marginal rate during ages 60-72, rather than facing mandatory RRIF withdrawals at a potentially higher rate after 72. With an initial RRSP of $820,000 and a target of $55,000/yr over 12 years, the RRSP balance could be reduced by approximately 60% before conversion.";
        a.estateInsight = "The median net estate value is estimated at approximately $575,000, after tax at death of about $205,000. Spousal rollover could defer the entirety of this tax to the second death.";
        a.best_move_explainer = "RRSP management fees (1.2%) represent the portfolio's highest cost — a reduction toward 0.5% could free approximately $85,000 over the projection horizon. Coordinating the RRSP meltdown with pension splitting aims to keep both spouses in similar tax brackets, which could reduce combined tax by $3,000 to $5,000 per year during the early retirement years.";
        a.strengths = ["Indexed DB pension covering 31% of spending without market risk", "Diversification across 6 accounts reducing fiscal concentration risk", "Safety margin: wealth 20× greater than the annual gap to fill"];
        a.vulnerabilities = ["RRSP concentration (42%) exposing to rising mandatory RRIF withdrawals", "3-year gap between spouse retirements creating an asymmetric transition period", "RRSP management fees of 1.2% eroding approximately $9,800 per year on current balance"];
        a.riskInsight = "The P25\u2013P75 range at end of horizon sits between $450,000 and $1.3M, a spread of $850,000 reflecting uncertainty over 37 years. The most sensitive factor is market returns, followed by spending. Savings durability is never threatened, even at the P5 level.";
        a.couple_insight = "The 3-year gap between retirements creates an asymmetric transition period where Fran\u00e7ois is retired but Isabelle is still contributing. Pension splitting at 50% aims to equalize taxable income between both spouses.";
      }
      break;

    case 8: // Karim, 28, debt
      if (fr) {
        a.overall_assessment = "Karim obtient la note C (68 %) avec un patrimoine de 15 000 $ et des dettes de 53 200 $, soit un ratio dette/\u00e9pargne de 355 %. La carte de cr\u00e9dit \u00e0 19,9 % co\u00fbte 1 631 $ par ann\u00e9e en int\u00e9r\u00eats \u2014 un rendement n\u00e9gatif qui d\u00e9passe le rendement attendu du portefeuille. Avec 39 ans avant la retraite, le temps est le levier principal.";
        a.verdict = "Le plan de Karim reçoit la note C (68 %), ce qui indique que l'épargne pourrait ne pas durer jusqu'à l'horizon dans environ un tiers des scénarios simulés. Le patrimoine de 15 000 $ est nettement inférieur aux dettes actives de 53 200 $, créant un ratio dette/épargne de 355 %. Avec 39 ans avant la retraite, le temps constitue un levier important.";
        a.profile_summary = "Karim dispose de 15 000 $ en épargne (REER 53 %, CÉLI 33 %, non-enregistré 14 %) et porte 53 200 $ de dettes (prêt étudiant 45 000 $ à 4,5 % et carte de crédit 8 200 $ à 19,9 %). Les paiements de dette de 700 $ par mois représentent 15 % du salaire brut de 55 000 $.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine d'environ 680 000 $ à 67 ans, en supposant le maintien des cotisations actuelles de 5 500 $ par année. La fourchette P25–P75 en fin d'horizon se situe entre 320 000 $ et 1,1 M$, une dispersion importante qui reflète 62 ans de projection.";
        a.income_insight = "Les revenus gouvernementaux combinés (Régime de pensions du Canada + Pension de la Sécurité de la vieillesse) pourraient totaliser environ 16 800 $ par année à partir de 65 ans. Les dépenses prévues de 33 600 $ nécessiteraient des retraits d'épargne de 16 800 $ par année, soit un taux de retrait initial d'environ 2,5 %.";
        a.taxInsight = "Le taux effectif moyen en retraite se situerait autour de 16 %. Le solde REER projeté relativement élevé (65 % du portefeuille en fin de période) pourrait générer des retraits FERR obligatoires croissants après 72 ans.";
        a.debt_insight = "La carte de crédit à 19,9 % coûte 1 631 $ en intérêts par année sur le solde de 8 200 $, ce qui équivaut à un rendement négatif qui dépasse de loin le rendement attendu du portefeuille. Le prêt étudiant à 4,5 % génère un coût d'intérêt de 2 025 $ par année. Les deux dettes combinées coûtent 3 656 $ en intérêts annuels — soit plus que les cotisations d'épargne actuelles de 5 500 $.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 475 000 $, reflétant les 39 années de croissance composée. L'impôt au décès sur le REER résiduel pourrait représenter environ 25 % de la valeur des comptes enregistrés.";
      } else {
        a.overall_assessment = "Karim receives a C grade (68%) with $15,000 in savings and $53,200 in debt, a debt-to-savings ratio of 355%. The 19.9% credit card costs $1,631 in annual interest \u2014 a negative return exceeding the portfolio's expected return. With 39 years until retirement, time is the primary lever.";
        a.verdict = "Karim's plan receives a C grade (68%), indicating savings may not last to the horizon in approximately one-third of simulated scenarios. Current wealth of $15,000 is far below active debts of $53,200, creating a debt-to-savings ratio of 355%. With 39 years until retirement, time is a significant lever.";
        a.profile_summary = "Karim holds $15,000 in savings (RRSP 53%, TFSA 33%, non-registered 14%) and carries $53,200 in debt (student loan $45,000 at 4.5% and credit card $8,200 at 19.9%). Debt payments of $700/mo represent 15% of the $55,000 gross salary.";
        a.trajectory_insight = "The median simulation projects wealth of approximately $680,000 at age 67, assuming current contributions of $5,500 per year are maintained. The P25–P75 range at end of horizon sits between $320,000 and $1.1M, a wide spread reflecting 62 years of projection.";
        a.income_insight = "Combined government income (CPP + OAS) could total approximately $16,800 per year starting at age 65. Planned spending of $33,600 would require savings withdrawals of $16,800 per year, or an initial withdrawal rate of approximately 2.5%.";
        a.taxInsight = "The average effective rate in retirement would sit around 16%. The projected relatively high RRSP balance (65% of portfolio at end of period) could generate increasing mandatory RRIF withdrawals after age 72.";
        a.debt_insight = "The credit card at 19.9% costs $1,631 in annual interest on the $8,200 balance, equivalent to a negative return that far exceeds the portfolio's expected return. The student loan at 4.5% generates $2,025 in annual interest cost. Both debts combined cost $3,656 in annual interest — more than the current savings contributions of $5,500.";
        a.estateInsight = "The median net estate value is estimated at approximately $475,000, reflecting 39 years of compound growth. Tax at death on the residual RRSP could represent approximately 25% of registered account value.";
      }
      break;

    case 9: // Li Wei, 40, RSU tech
      if (fr) {
        a.overall_assessment = "Li Wei obtient la note A- (85 %) avec un patrimoine de 290 000 $ et des octrois RSU d\u2019une valeur brute de 195 750 $. La retraite \u00e0 55 ans cr\u00e9e un pont de 10 ans avant la PSV. L\u2019imp\u00f4t \u00e0 l\u2019acquisition des RSU (taux d\u2019inclusion de 50 %) est d\u2019environ 47 000 $ \u2014 l\u2019\u00e9talement de l\u2019exercice sur 4 ans pourrait r\u00e9duire le taux marginal effectif.";
        a.verdict = "Le plan de Li Wei reçoit la note A- (85 %), ce qui indique une trajectoire solide soutenue par un patrimoine de 290 000 $ et des octrois RSU d'une valeur de 195 750 $. La retraite à 55 ans crée un pont de 5 ans avant le Régime de pensions du Canada et de 10 ans avant la Pension de la Sécurité de la vieillesse, une période pendant laquelle le portefeuille devrait couvrir la totalité des 60 000 $ de dépenses annuelles.";
        a.profile_summary = "Li Wei dispose de 290 000 $ en épargne financière (REER 41 %, CÉLI 26 %, non-enregistré 33 %) complétés par deux octrois RSU totalisant 195 750 $ en valeur brute. Les frais de gestion très bas (0,4 % en moyenne) et l'allocation orientée croissance (80 % actions en REER) reflètent un profil de technologie.";
        a.trajectory_insight = "La simulation médiane projette un patrimoine d'environ 850 000 $ à 55 ans (incluant la valeur nette des RSU après impôt). La fourchette P25–P75 en fin d'horizon se situe entre 280 000 $ et 750 000 $, une dispersion qui reflète 52 ans de projection et la volatilité inhérente aux actions.";
        a.income_insight = "Entre 55 et 60 ans, aucun revenu gouvernemental n'est disponible — les retraits annuels de 60 000 $ proviendraient du portefeuille. Le Régime de pensions du Canada à 60 ans pourrait ajouter 6 960 $ par année, puis la Pension de la Sécurité de la vieillesse ajouterait 8 400 $ à 65 ans.";
        a.taxInsight = "Le taux effectif en retraite pourrait se situer autour de 20 %. La réalisation des RSU crée un avantage imposable au taux marginal de 48 %, partiellement compensé par la déduction pour options d'achat de 50 % sur les actions de sociétés publiques admissibles.";
        a.rsu_insight = "Les deux octrois RSU totalisent 850 unités d'une valeur brute de 195 750 $. L'impôt estimé à l'acquisition (taux d'inclusion de 50 %) est d'environ 47 000 $, laissant une valeur nette après impôt d'environ 149 000 $. L'étalement de l'exercice sur 4 ans pourrait réduire le taux marginal effectif en évitant l'accumulation dans une seule année fiscale.";
        a.estateInsight = "La valeur successorale nette médiane est estimée à environ 310 000 $. L'impôt au décès dépendrait du ratio REER/CÉLI/non-enregistré à ce moment — le CÉLI étant exonéré de disposition réputée.";
      } else {
        a.overall_assessment = "Li Wei receives an A- grade (85%) with $290,000 in savings and RSU grants worth $195,750 gross. Retiring at 55 creates a 10-year bridge before OAS. RSU vesting tax (50% inclusion rate) is approximately $47,000 \u2014 spreading the exercise over 4 years could reduce the effective marginal rate.";
        a.verdict = "Li Wei's plan receives an A- grade (85%), indicating a solid trajectory supported by $290,000 in savings and RSU grants worth $195,750. Retiring at 55 creates a 5-year bridge before CPP and a 10-year bridge before OAS, a period during which the portfolio would need to cover the full $60,000 in annual spending.";
        a.profile_summary = "Li Wei holds $290,000 in financial savings (RRSP 41%, TFSA 26%, non-registered 33%) complemented by two RSU grants totaling $195,750 in gross value. Very low management fees (0.4% average) and a growth-oriented allocation (80% equities in RRSP) reflect a tech-sector profile.";
        a.trajectory_insight = "The median simulation projects wealth of approximately $850,000 at age 55 (including net RSU value after tax). The P25–P75 range at end of horizon sits between $280,000 and $750,000, reflecting 52 years of projection and inherent equity volatility.";
        a.income_insight = "Between ages 55 and 60, no government income is available — annual withdrawals of $60,000 would come from the portfolio. CPP at age 60 could add $6,960 per year, then OAS would add $8,400 at age 65.";
        a.taxInsight = "The effective rate in retirement could sit around 20%. RSU vesting creates an employment benefit taxable at the 48% marginal rate, partially offset by the 50% stock option deduction for qualifying public company shares.";
        a.rsu_insight = "The two RSU grants total 850 units with a gross value of $195,750. Estimated tax at vesting (50% inclusion rate) is approximately $47,000, leaving an after-tax value of about $149,000. Spreading the exercise over 4 years could reduce the effective marginal rate by avoiding accumulation in a single tax year.";
        a.estateInsight = "The median net estate value is estimated at approximately $310,000. Tax at death would depend on the RRSP/TFSA/non-registered ratio at that time — TFSA being exempt from deemed disposition.";
      }
      break;
  }
  return a;
}

// ═══ 5. GENERATE 20 REPORTS ═══
var outDir = path.join(dir, 'test-output');
try { fs.mkdirSync(outDir, { recursive: true }); } catch(e) {}

var results = [];
P.forEach(function(prof, i) {
  var mc = buildMC(prof.mc, prof.succ);
  // Add naive MC comparison for expert profiles
  if (prof.mode === 'expert') {
    mc._naiveMC = { medRevData: mc.medRevData.map(function(r) { return Object.assign({}, r, { tax: Math.round(r.tax * 1.15) }); }) };
  }

  ['fr', 'en'].forEach(function(lang) {
    var fr = lang === 'fr';
    var data = {
      params: prof.params,
      mc: mc,
      client: prof.client,
      ai: aiText(i, fr),
      rptLang: lang,
      rptMode: prof.mode || 'standard'
    };

    try {
      var html = buildReport(data);
      var fname = prof.id + '_' + lang + '.html';
      fs.writeFileSync(path.join(outDir, fname), html || '', 'utf8');
      var size = (html || '').length;
      results.push({ id: prof.id, lang: lang, ok: size > 1000, size: size, error: null });
      console.log('  ✓ ' + fname + ' (' + Math.round(size / 1024) + ' KB)');
    } catch(e) {
      results.push({ id: prof.id, lang: lang, ok: false, size: 0, error: e.message });
      console.log('  ✗ ' + prof.id + '_' + lang + ': ' + e.message);
    }
  });
});

// ═══ 6. VALIDATION ═══
console.log('\n═══ VALIDATION ═══');
var issues = [];

results.forEach(function(res) {
  if (!res.ok) { issues.push('[FAIL] ' + res.id + '_' + res.lang + ': ' + (res.error || 'empty output')); return; }
  var html = fs.readFileSync(path.join(outDir, res.id + '_' + res.lang + '.html'), 'utf8');

  // Check required sections
  var requiredSections = ['sec-assessment', 'sec-diagnostic', 'sec-profile', 'sec-projection', 'sec-revenue', 'sec-tax', 'sec-methodology'];
  requiredSections.forEach(function(sec) {
    if (html.indexOf('id="' + sec + '"') === -1) issues.push('[MISSING SECTION] ' + res.id + '_' + res.lang + ': ' + sec);
  });

  // Check tables have rows
  var tables = html.match(/id="rpt-t-[^"]+"/g) || [];
  tables.forEach(function(tbl) {
    var tblId = tbl.replace(/id="|"/g, '');
    var tblMatch = html.indexOf(tblId);
    if (tblMatch > -1) {
      var afterTbl = html.substring(tblMatch, tblMatch + 5000);
      var rowCount = (afterTbl.match(/<tr/g) || []).length;
      if (rowCount < 3) issues.push('[SPARSE TABLE] ' + res.id + '_' + res.lang + ': ' + tblId + ' has only ' + rowCount + ' rows');
    }
  });

  // Check AI text appears
  var aiBlockCount = (html.match(/callout-ai/g) || []).length;
  if (aiBlockCount < 3) issues.push('[LOW AI] ' + res.id + '_' + res.lang + ': only ' + aiBlockCount + ' AI blocks');

  // Check cover page
  if (html.indexOf('cover-title') === -1) issues.push('[NO COVER] ' + res.id + '_' + res.lang);
  if (html.indexOf('cover-grade-circle') === -1) issues.push('[NO GRADE] ' + res.id + '_' + res.lang);

  // Check for "undefined" or "NaN" in output
  if (html.indexOf('undefined') > -1) issues.push('[UNDEFINED] ' + res.id + '_' + res.lang + ': contains "undefined"');
  if (html.indexOf('NaN') > -1) issues.push('[NaN] ' + res.id + '_' + res.lang + ': contains "NaN"');

  // Check conditional sections for specific profiles
  var prof = P.find(function(p) { return p.id === res.id; });
  if (prof) {
    if (prof.params.cOn && html.toLowerCase().indexOf('conjoint') === -1 && html.indexOf('Spouse') === -1 && html.indexOf('class="g2"') === -1) issues.push('[COUPLE MISSING] ' + res.id + '_' + res.lang);
    if (prof.params.bizOn && html.indexOf('sec-corp') === -1) issues.push('[CORP MISSING] ' + res.id + '_' + res.lang);
    if (prof.params.debts && prof.params.debts.length > 0 && html.indexOf('sec-debt') === -1) issues.push('[DEBT MISSING] ' + res.id + '_' + res.lang);
    if (prof.params.rsuGrants && prof.params.rsuGrants.length > 0 && html.indexOf('sec-rsu') === -1) issues.push('[RSU MISSING] ' + res.id + '_' + res.lang);
    if (prof.params.props && prof.params.props.length > 0 && html.indexOf('sec-realestate') === -1) issues.push('[RE MISSING] ' + res.id + '_' + res.lang);
    if (prof.params.melt && html.indexOf('sec-meltdown') === -1) issues.push('[MELTDOWN MISSING] ' + res.id + '_' + res.lang);
  }

  // Check file size
  if (res.size < 20000) issues.push('[SMALL] ' + res.id + '_' + res.lang + ': only ' + Math.round(res.size / 1024) + ' KB');
});

// ═══ 7. REPORT CARD ═══
console.log('\n═══ REPORT CARD ═══');
var passed = results.filter(function(r) { return r.ok; }).length;
console.log('Reports generated: ' + passed + '/' + results.length);
console.log('Total issues: ' + issues.length);
if (issues.length > 0) {
  console.log('\nIssues:');
  issues.forEach(function(iss) { console.log('  ' + iss); });
} else {
  console.log('\n✓ All 20 reports passed validation');
}

// Summary table
console.log('\n═══ SIZE SUMMARY ═══');
console.log('Profile'.padEnd(22) + 'FR'.padStart(8) + 'EN'.padStart(8));
console.log('─'.repeat(38));
P.forEach(function(prof) {
  var frR = results.find(function(r) { return r.id === prof.id && r.lang === 'fr'; });
  var enR = results.find(function(r) { return r.id === prof.id && r.lang === 'en'; });
  var frSz = frR && frR.ok ? Math.round(frR.size / 1024) + 'K' : 'FAIL';
  var enSz = enR && enR.ok ? Math.round(enR.size / 1024) + 'K' : 'FAIL';
  console.log(prof.id.padEnd(22) + frSz.padStart(8) + enSz.padStart(8));
});
