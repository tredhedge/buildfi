#!/usr/bin/env node
// ???????????????????????????????????????????????????????????????????
// report/test-reports.js - BuildFi Report Test Harness
// Generates 10 profiles FR+EN = 20 HTML reports
// AI narration flow: buildPrompt -> local substitution provider -> parseResponse
// Uses the same slot contract as API generation while avoiding API cost in tests
// Run: node report/test-reports.js
// ???????????????????????????????????????????????????????????????????
'use strict';
const fs = require('fs');
const path = require('path');

// ??? 1. NODE ENVIRONMENT SETUP ???
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
console.log('? Report modules loaded - BFmt v' + BFmt.VERSION + ', BAiPrompt ' + (BAiPrompt.SLOTS.length) + ' slots');

// ??? 2. DATA GENERATORS ???
function genPD(c) {
  var rows = [], rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
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

// genRevData — produces a row schema that matches the planner_v2.html engine output:
//   aRR/aTF/aNR/aCRR/aCTF/aCNR = end-of-year BALANCES
//   wFromRR/wFromTF/wFromNR/wMelt/wRrifMin = annual WITHDRAWALS
//   sal/cSal/payroll/cPayroll = working-year salary fields
//   rrq/psv/srg/pen = government income; spend = actual spending; tax/taxInc = tax
// Inflation-indexed; spending follows Go-Go/Slow-Go/No-Go curve; tax uses real bracket calc.
function genRevData(c) {
  var rows = [];
  var rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
  var crr = c.cRRSP || 0, ctf = c.cTFSA || 0, cnr = c.cNR || 0;
  var lira = c.lira || 0;
  var corpBal = c.bizOn ? (c.bizRetainedEarnings || 0) : 0;
  var corpRev = c.bizOn ? (c.bizRevenue || 0) : 0;
  var da = c.deathAge || 90;
  var retR = c.eqRet || 0.06;
  var inf = c.inf || 0.021;
  var prov = c.prov || 'QC';
  var goP = c.goP || 1.0, slP = c.slP || 0.85, noP = c.noP || 0.7;
  var calcTax = (window.BData && window.BData.calcTax) ? window.BData.calcTax : null;

  for (var a = c.age; a <= da; a++) {
    var preRet = a < c.retAge;
    var yIdx = a - c.age;
    var infM = Math.pow(1 + inf, yIdx);

    // Inflation-indexed gov/pension. 75+ OAS bonus per CRA rule.
    var qppBase = a >= (c.qppAge || 65) ? (c.qppM || 700) * 12 : 0;
    var oasBase = a >= (c.oasAge || 65) ? (c.oasM || 650) * 12 : 0;
    if (oasBase > 0 && a >= 75) oasBase *= 1.10;
    var penBase = a >= c.retAge ? (c.penM || 0) * 12 : 0;
    if (penBase > 0 && c.penIdx) penBase *= 1; // already nominal-fixed when penIdx is false
    var qpp = qppBase * infM;
    var oas = oasBase * infM;
    var pen = c.penIdx === false ? penBase : penBase * infM;

    var sal = preRet ? (c.sal || 0) * infM : 0;
    var cSal = preRet ? (c.cSal || 0) * infM : 0;

    // Spending curve: Go-Go (until 75), Slow-Go (75-84), No-Go (85+).
    var spendMult = a < 75 ? goP : (a < 85 ? slP : noP);
    var spY;
    if (preRet) {
      // Pre-retirement "consumption" = salary minus contributions minus rough tax
      // (gives a realistic living-standard line for the cash-flow table).
      var contrib = (c.rrspC || 0) + (c.tfsaC || 0) + (c.nrC || 0);
      spY = Math.max(0, sal + cSal - contrib);
    } else {
      spY = (c.retSpM || 3000) * 12 * infM * spendMult;
    }

    var gisRaw = 0;
    if (c.gis && a >= 65) {
      var preGisInc = qpp + pen;
      var gisCap = (12000) * infM;
      gisRaw = Math.max(0, gisCap - preGisInc * 0.5);
    }
    var gis = gisRaw;

    var gov = qpp + oas + pen + gis;
    var gap = preRet ? 0 : Math.max(0, spY - gov);

    // Withdrawals — in retirement, draw from balances proportionally to fill gap.
    // Order: NR → RRSP → TFSA (mirrors engine's NR-first heuristic at a high level).
    var wFromRR = 0, wFromTF = 0, wFromNR = 0, wRrifMin = 0;
    if (!preRet && gap > 0) {
      var remain = gap;
      var drawNR = Math.min(nr, remain); nr -= drawNR; remain -= drawNR; wFromNR = drawNR;
      // RRIF minimum at 72+
      if (a >= 72 && rr > 0) {
        var rrifPct = a >= 95 ? 0.20 : [0.054,0.0553,0.0567,0.0582,0.0598,0.0617,0.0636,0.0658,0.0682,0.0708,0.0738,0.0771,0.0808,0.0851,0.0899,0.0955,0.1021,0.1099,0.1192,0.1306,0.1449,0.1634,0.1879,0.20][Math.min(a - 72, 23)] || 0.20;
        wRrifMin = rr * rrifPct;
      }
      var drawRR = Math.min(rr, Math.max(remain, wRrifMin));
      rr -= drawRR; remain = Math.max(0, remain - drawRR); wFromRR = drawRR;
      var drawTF = Math.min(tf, remain); tf -= drawTF; remain -= drawTF; wFromTF = drawTF;
    }
    var wTotal = wFromRR + wFromTF + wFromNR;

    // Taxable income — engine-aligned: salary + RRSP draw + RRIF + QPP + OAS + pension.
    // TFSA + NR principal not taxable (NR cap gains ignored at this fidelity).
    var taxInc = sal + cSal + qpp + oas + pen + wFromRR;
    // OAS clawback proxy: 15% above indexed threshold.
    var oasThr = 95323 * infM;
    var clawback = oas > 0 && taxInc > oasThr ? Math.min(oas, (taxInc - oasThr) * 0.15) : 0;
    var oasNet = Math.max(0, oas - clawback);

    var tax;
    if (calcTax) {
      var tx = calcTax(Math.max(0, taxInc), yIdx, prov, inf, !preRet);
      tax = tx.total;
    } else {
      tax = preRet ? taxInc * 0.28 : taxInc * (c.avgTR || 0.22);
    }
    // Spousal split for couples in retirement reduces effective tax (~10%).
    if (!preRet && c.cOn) tax *= 0.92;

    // Grow remaining balances.
    if (preRet) {
      rr = rr * (1 + retR) + (c.rrspC || 0);
      tf = tf * (1 + retR) + (c.tfsaC || 0);
      nr = nr * (1 + retR * 0.85) + (c.nrC || 0);
      crr = crr * (1 + retR);
      ctf = ctf * (1 + retR);
      cnr = cnr * (1 + retR * 0.85);
      lira = lira * (1 + retR);
    } else {
      rr = Math.max(0, rr * (1 + retR * 0.60));
      tf = Math.max(0, tf * (1 + retR * 0.60));
      nr = Math.max(0, nr * (1 + retR * 0.55));
      crr = Math.max(0, crr * (1 + retR * 0.60));
      ctf = Math.max(0, ctf * (1 + retR * 0.60));
      cnr = Math.max(0, cnr * (1 + retR * 0.55));
      lira = Math.max(0, lira * (1 + retR * 0.55));
    }

    // Corporation projection — accumulates retained earnings, extracts post-sale.
    var corpTax = 0, corpDiv = 0, corpSal = 0, corpExtract = 0;
    if (c.bizOn) {
      var saleAge = c.bizSaleAge || c.retAge;
      if (a < saleAge) {
        // Pre-sale: corp earns, taxes at SBD ~12.2% (QC combined), reinvests rest.
        var corpProfit = corpRev * 0.20; // 20% margin proxy
        corpTax = corpProfit * 0.122;
        corpBal = corpBal * (1 + retR * 0.7) + (corpProfit - corpTax);
      } else if (a === saleAge) {
        // Sale year: 50% extracted as eligible dividend with 39.34% effective combined rate
        corpExtract = corpBal * 0.5;
        corpDiv = corpExtract;
        corpTax = corpExtract * 0.3934;
        corpBal -= corpExtract;
      } else {
        // Post-sale: residual extraction over time
        var ext = Math.min(corpBal, 30000 * infM);
        corpExtract = ext;
        corpDiv = ext;
        corpTax = ext * 0.3934;
        corpBal = Math.max(0, corpBal * (1 + retR * 0.5) - ext);
      }
    }

    rows.push({
      age: a,
      // Income & spending (engine names)
      rrq: r(qpp), psv: r(oasNet), srg: r(gis), pen: r(pen),
      sal: r(sal), cSal: r(cSal),
      ret: r(wTotal),
      spend: r(spY), sp: r(spY), spending: r(spY),
      tax: r(tax), taxInc: r(Math.max(0, taxInc)),
      // Balances (engine = a* prefix)
      aRR: r(rr), aTF: r(tf), aNR: r(nr),
      aCRR: r(crr), aCTF: r(ctf), aCNR: r(cnr),
      aLIRA: r(lira),
      // Withdrawals (engine = w* prefix)
      wFromRR: r(wFromRR), wFromTF: r(wFromTF), wFromNR: r(wFromNR),
      wMelt: 0, wRrifMin: r(wRrifMin),
      // Corporation
      corpBal: r(corpBal), corpTax: r(corpTax), corpDiv: r(corpDiv),
      corpSal: r(corpSal), corpExtract: r(corpExtract),
      corpCDA: 0, corpRDTOH: 0, corpPassive: r(corpBal * 0.04),
      // Legacy aliases kept for code paths that haven't migrated
      balRR: r(rr), balTF: r(tf), balNR: r(nr),
      balCRR: r(crr), balCTF: r(ctf), balCNR: r(cnr), balLIRA: r(lira),
      balTot: r(rr + tf + nr + crr + ctf + cnr + lira),
      gis: r(gis)
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

// ??? 3. PROFILE DEFINITIONS ???
// Each profile includes finLiteracy, stressLevel, detailPref
var P = [
  // 1. Young Accumulator - Marc, 30, single, QC
  // beginner + moderate stress + concise ? simple language, reassuring, brief
  { id: 'young_accum', succ: 0.91, finLiteracy: 'beginner', stressLevel: 'moderate', detailPref: 'concise',
    params: { age: 30, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC', sal: 65000, rrsp: 40000, tfsa: 15000, nr: 5000,
      retSpM: 3500, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, eqRetS: 0.07, bndRetS: 0.035, inf: 0.02,
      merR: 0.02, merT: 0.008, merN: 0.012, allocR: 0.7, allocT: 0.9, allocN: 0.6, goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard' },
    client: { name: 'Marc Tremblay', firstName: 'Marc', email: 'marc@example.com' },
    mc: { rrsp: 40000, tfsa: 15000, nr: 5000, age: 30, retAge: 65, deathAge: 90, retSpM: 3500, qppAge: 65, oasAge: 65, qppM: 850, oasM: 700, sal: 65000, rrspC: 6000, tfsaC: 3000, nrC: 1000, eqRet: 0.065 }
  },
  // 2. Couple Transition - Jean & Marie, 58/55, QC
  // intermediate + high stress + balanced ? clear but thorough, calming tone
  { id: 'couple_transition', succ: 0.84, finLiteracy: 'intermediate', stressLevel: 'high', detailPref: 'balanced',
    params: { age: 58, retAge: 63, deathAge: 90, sex: 'M', prov: 'QC', sal: 95000, rrsp: 380000, tfsa: 120000, nr: 80000,
      cOn: true, cAge: 55, cRetAge: 65, cSal: 52000, cRRSP: 95000, cTFSA: 45000, cNR: 20000,
      retSpM: 5500, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.018, merT: 0.005, merN: 0.01, allocR: 0.55, allocT: 0.75, allocN: 0.45,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard', split: true, splitP: 0.5 },
    client: { name: 'Jean Lavoie', firstName: 'Jean', spouseFirstName: 'Marie', email: 'jean@example.com' },
    mc: { rrsp: 380000, tfsa: 120000, nr: 80000, age: 58, retAge: 63, deathAge: 90, retSpM: 5500, qppAge: 65, oasAge: 65, qppM: 950, oasM: 700, cRRSP: 95000, cTFSA: 45000, cNR: 20000, sal: 95000, rrspC: 8000, tfsaC: 3500, nrC: 2000, eqRet: 0.055 }
  },
  // 3. Retiree Decum - Monique, 70, single, QC
  // beginner + high stress + balanced ? very simple, reassuring, no jargon
  { id: 'retiree_decum', succ: 0.78, finLiteracy: 'beginner', stressLevel: 'high', detailPref: 'balanced',
    params: { age: 70, retAge: 65, deathAge: 92, sex: 'F', prov: 'QC', sal: 0, rrsp: 220000, tfsa: 85000, nr: 50000,
      retSpM: 3200, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.022, merT: 0.005, merN: 0.01, allocR: 0.4, allocT: 0.6, allocN: 0.35,
      goP: 1, slP: 0.82, noP: 0.65, wStrat: 'standard' },
    client: { name: 'Monique Gagnon', firstName: 'Monique', email: 'monique@example.com' },
    mc: { rrsp: 220000, tfsa: 85000, nr: 50000, age: 70, retAge: 65, deathAge: 92, retSpM: 3200, qppAge: 65, oasAge: 65, qppM: 780, oasM: 730, sal: 0, eqRet: 0.05, avgTR: 0.18 }
  },
  // 4. FIRE Seeker - Alex, 35, single, ON
  // advanced + low stress + detailed ? technical, analytical, comprehensive
  { id: 'fire_seeker', succ: 0.72, finLiteracy: 'advanced', stressLevel: 'low', detailPref: 'detailed',
    params: { age: 35, retAge: 45, deathAge: 95, sex: 'M', prov: 'ON', sal: 135000, rrsp: 210000, tfsa: 90000, nr: 180000,
      retSpM: 4500, qppAge: 60, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.005, merT: 0.003, merN: 0.004, allocR: 0.85, allocT: 0.95, allocN: 0.75,
      goP: 1, slP: 0.8, noP: 0.65, wStrat: 'standard' },
    client: { name: 'Alex Chen', firstName: 'Alex', email: 'alex@example.com' },
    mc: { rrsp: 210000, tfsa: 90000, nr: 180000, age: 35, retAge: 45, deathAge: 95, retSpM: 4500, qppAge: 60, oasAge: 65, qppM: 550, oasM: 700, sal: 135000, rrspC: 15000, tfsaC: 7000, nrC: 20000, eqRet: 0.07 }
  },
  // 5. Low Income GIS - Robert, 62, single, QC
  // beginner + moderate stress + concise ? plain language, focus on what matters
  { id: 'low_income_gis', succ: 0.95, finLiteracy: 'beginner', stressLevel: 'moderate', detailPref: 'concise',
    params: { age: 62, retAge: 65, deathAge: 88, sex: 'M', prov: 'QC', sal: 32000, rrsp: 18000, tfsa: 8000, nr: 2000,
      retSpM: 2000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.02, merT: 0.005, merN: 0.01, allocR: 0.4, allocT: 0.5, allocN: 0.3,
      goP: 1, slP: 0.9, noP: 0.8, wStrat: 'standard' },
    client: { name: 'Robert Bouchard', firstName: 'Robert', email: 'robert@example.com' },
    mc: { rrsp: 18000, tfsa: 8000, nr: 2000, age: 62, retAge: 65, deathAge: 88, retSpM: 2000, qppAge: 65, oasAge: 65, qppM: 550, oasM: 700, sal: 32000, rrspC: 1000, tfsaC: 500, nrC: 0, eqRet: 0.045, gis: true, avgTR: 0.12 }
  },
  // 6. CCPC Owner - Sophie, 50, single, QC
  // advanced + moderate stress + detailed ? technical corporate analysis
  { id: 'ccpc_owner', succ: 0.87, finLiteracy: 'advanced', stressLevel: 'moderate', detailPref: 'detailed',
    params: { age: 50, retAge: 60, deathAge: 90, sex: 'F', prov: 'QC', sal: 120000, rrsp: 180000, tfsa: 95000, nr: 70000,
      retSpM: 5000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.015, merT: 0.005, merN: 0.008, allocR: 0.6, allocT: 0.8, allocN: 0.5,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'optimized',
      bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 300000, bizSaleAge: 65 },
    client: { name: 'Sophie Moreau', firstName: 'Sophie', email: 'sophie@example.com' },
    mc: { rrsp: 180000, tfsa: 95000, nr: 70000, age: 50, retAge: 60, deathAge: 90, retSpM: 5000, qppAge: 65, oasAge: 65, qppM: 850, oasM: 700, sal: 120000, rrspC: 10000, tfsaC: 7000, nrC: 3000, eqRet: 0.06 }
  },
  // 7. Real Estate Heavy - David, 45, single, ON
  // intermediate + moderate stress + balanced ? accessible but with some detail
  { id: 'real_estate', succ: 0.76, finLiteracy: 'intermediate', stressLevel: 'moderate', detailPref: 'balanced',
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
  // 8. High Net Worth Couple - Francois & Isabelle, 55/52, QC, EXPERT
  // advanced + low stress + detailed ? full technical analysis, expert mode
  { id: 'hnw_couple', succ: 0.97, mode: 'expert', finLiteracy: 'advanced', stressLevel: 'low', detailPref: 'detailed',
    params: { age: 55, retAge: 60, deathAge: 92, sex: 'M', prov: 'QC', sal: 180000, rrsp: 820000, tfsa: 240000, nr: 450000, liraBal: 150000,
      cOn: true, cAge: 52, cRetAge: 62, cSal: 95000, cRRSP: 180000, cTFSA: 65000, cNR: 40000,
      retSpM: 8000, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.012, merT: 0.004, merN: 0.006, allocR: 0.55, allocT: 0.75, allocN: 0.5,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'optimized',
      melt: true, meltTgt: 55000, split: true, splitP: 0.5,
      penType: 'db', penM: 2500, penIdx: true },
    client: { name: 'Francois Dubois', firstName: 'Francois', spouseFirstName: 'Isabelle', email: 'francois@example.com', advisor: 'Pl. Fin. Nathalie Roy', firm: 'FinPlan Quebec' },
    mc: { rrsp: 820000, tfsa: 240000, nr: 450000, lira: 150000, age: 55, retAge: 60, deathAge: 92, retSpM: 8000, qppAge: 65, oasAge: 65, qppM: 1000, oasM: 730, cRRSP: 180000, cTFSA: 65000, cNR: 40000, sal: 180000, rrspC: 15000, tfsaC: 7000, nrC: 8000, eqRet: 0.06, penM: 2500 }
  },
  // 9. Debt-Laden Young - Karim, 28, single, ON
  // beginner + high stress + concise ? very simple, calming, brief
  { id: 'debt_young', succ: 0.68, finLiteracy: 'beginner', stressLevel: 'high', detailPref: 'concise',
    params: { age: 28, retAge: 67, deathAge: 90, sex: 'M', prov: 'ON', sal: 55000, rrsp: 8000, tfsa: 5000, nr: 2000,
      retSpM: 2800, qppAge: 65, oasAge: 65, nSim: 5000, fatT: true, stochInf: true, inf: 0.02,
      merR: 0.022, merT: 0.005, merN: 0.012, allocR: 0.8, allocT: 0.9, allocN: 0.6,
      goP: 1, slP: 0.85, noP: 0.7, wStrat: 'standard',
      debts: [
        { name: 'Pret etudiant', balance: 45000, rate: 0.045, payment: 450 },
        { name: 'Carte de credit', balance: 8200, rate: 0.199, payment: 250 }
      ] },
    client: { name: 'Karim Hassan', firstName: 'Karim', email: 'karim@example.com' },
    mc: { rrsp: 8000, tfsa: 5000, nr: 2000, age: 28, retAge: 67, deathAge: 90, retSpM: 2800, qppAge: 65, oasAge: 65, qppM: 700, oasM: 700, sal: 55000, rrspC: 3000, tfsaC: 2000, nrC: 500, eqRet: 0.065 }
  },
  // 10. RSU Tech Worker - Li Wei, 40, single, BC
  // intermediate + low stress + balanced ? standard explanations, confident tone
  { id: 'rsu_tech', succ: 0.85, finLiteracy: 'intermediate', stressLevel: 'low', detailPref: 'balanced',
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

// ??? 4. AI NARRATION - FR + EN ???
// Tone adapts to finLiteracy + stressLevel + detailPref per profile
// ANCHOR?IMPLICATION?NUANCE | Conditional tense | AMF-compliant
function aiTextFR(idx, prof, mc) {
  var p = (prof && prof.params) || {};
  var name = ((prof && prof.client && (prof.client.firstName || prof.client.name)) || 'Client').split(' ')[0];
  var succ = (prof && typeof prof.succ === 'number') ? prof.succ : (mc && mc.succ) || 0;
  var succPct = Math.round(succ * 100);

  var p50 = Math.round((mc && (mc.rMedF || mc.medF || 0)) || 0);
  var p25 = Math.round((mc && (mc.rP25F || mc.p25F || 0)) || 0);
  var estateNet = Math.round((mc && (mc.medEstateNet || 0)) || 0);
  var estateTax = Math.round((mc && (mc.medEstateTax || 0)) || 0);

  var govAnnual = Math.round((((p.qppM || 0) + (p.oasM || 0) + (p.penM || 0)) * 12) + (p.gis ? 4800 : 0));
  var spendAnnual = Math.round((p.retSpM || 0) * 12);
  var gapAnnual = Math.max(0, spendAnnual - govAnnual);

  var totalDebt = ((p.debts || []).reduce(function(s, d) { return s + (d.balance || d.bal || 0); }, 0));
  var rsuValue = ((p.rsuGrants || []).reduce(function(s, g) { return s + ((g.totalShares || 0) * (g.sharePrice || 0)); }, 0));
  var reEquity = ((p.props || []).filter(function(pr){ return pr && pr.on; }).reduce(function(s, pr){ return s + ((pr.val || 0) - (pr.mb || 0)); }, 0));

  function fm(v) {
    if (window.BFmt && typeof window.BFmt.fmtMoney === 'function') return window.BFmt.fmtMoney(v, true);
    return String(Math.round(v || 0)) + ' $';
  }

  var a = {};
  a.overall_assessment = name + ', votre plan affiche un taux de succes de <strong>' + succPct + ' %</strong> sur 5 000 simulations. Le patrimoine median projete est de <strong>' + fm(p50) + '</strong>. Cette projection reste conditionnelle aux hypotheses de marche, d inflation et de longevite.';
  a.verdict = 'Le scenario median reste positif, avec un resultat prudent (P25) de <strong>' + fm(p25) + '</strong>. La trajectoire suggere un plan globalement viable si les parametres actuels sont maintenus.';
  a.page_zero_verdict = 'Point cle: garder la discipline sur les contributions, les depenses et les frais peut ameliorer la robustesse du plan dans les scenarios defavorables.';
  a.profile_summary = 'Le plan combine les comptes enregistres et non enregistres avec un horizon de long terme. Le suivi periodique des hypotheses et des objectifs reste essentiel pour conserver la coherence du plan.';
  a.trajectory_insight = 'La projection mediane se termine a <strong>' + fm(p50) + '</strong>, et le scenario prudent a <strong>' + fm(p25) + '</strong>. L ecart entre ces trajectoires represente le risque de sequence de rendements.';
  a.income_insight = 'Les revenus gouvernementaux representeraient environ <strong>' + fm(govAnnual) + '</strong> par an. Pour une depense cible de <strong>' + fm(spendAnnual) + '</strong>, le besoin de retrait d epargne serait d environ <strong>' + fm(gapAnnual) + '</strong> par an.';
  a.taxInsight = 'La fiscalite dependra surtout de la structure des retraits entre REER/FERR, CELI et non enregistre. Un pilotage annuel peut limiter la pression fiscale et la recuperation des prestations.';
  a.estateInsight = 'L heritage net median projete est de <strong>' + fm(estateNet) + '</strong>, apres un impot au deces estime a <strong>' + fm(estateTax) + '</strong>. Cette estimation peut varier selon les rendements et le moment du deces.';

  if (p.gis) a.gis_insight = 'Le SRG pourrait jouer un role important dans le revenu de retraite. Le niveau de retraits imposables influence directement l admissibilite et le montant recu.';
  if (p.melt) a.meltdown_insight = 'La strategie de meltdown vise a sortir une partie du REER plus tot pour reduire la pression fiscale future au moment des retraits minimums FERR.';
  if (p.props && p.props.length) a.real_estate_insight = 'Le portefeuille immobilier ajoute une equite estimee a <strong>' + fm(reEquity) + '</strong>. Les flux locatifs, frais d exploitation et decisions de vente restent des variables critiques.';
  if (p.rsuGrants && p.rsuGrants.length) a.rsu_insight = 'La valeur brute des RSU est estimee a <strong>' + fm(rsuValue) + '</strong>. Le calendrier d acquisition et le traitement fiscal peuvent modifier significativement la valeur nette.';
  if (p.bizOn) a.corp_insight = 'La composante societaire ajoute un levier de planification sur le timing d extraction et la repartition revenu/salaire/dividende.';
  if (p.debts && p.debts.length) a.debt_insight = 'Le total des dettes en cours est d environ <strong>' + fm(totalDebt) + '</strong>. La reduction des dettes a taux eleve pourrait ameliorer la resilience globale du plan.';
  if (prof && prof.mode === 'expert') {
    a.riskInsight = 'Le risque principal reste la sequence de rendements au debut du decaissement. Les sensibilites de depenses, inflation et rendement doivent etre suivies ensemble.';
    a.risk_plain_language = 'En clair: si les premieres annees de marche sont faibles, il faudra possiblement ajuster le rythme de retraits pour proteger le plan.';
  }

  return a;
}

function aiTextEN(idx, prof, mc) {
  var p = (prof && prof.params) || {};
  var name = ((prof && prof.client && (prof.client.firstName || prof.client.name)) || 'Client').split(' ')[0];
  var succ = (prof && typeof prof.succ === 'number') ? prof.succ : (mc && mc.succ) || 0;
  var succPct = Math.round(succ * 100);

  var p50 = Math.round((mc && (mc.rMedF || mc.medF || 0)) || 0);
  var p25 = Math.round((mc && (mc.rP25F || mc.p25F || 0)) || 0);
  var estateNet = Math.round((mc && (mc.medEstateNet || 0)) || 0);
  var estateTax = Math.round((mc && (mc.medEstateTax || 0)) || 0);

  var govAnnual = Math.round((((p.qppM || 0) + (p.oasM || 0) + (p.penM || 0)) * 12) + (p.gis ? 4800 : 0));
  var spendAnnual = Math.round((p.retSpM || 0) * 12);
  var gapAnnual = Math.max(0, spendAnnual - govAnnual);

  var totalDebt = ((p.debts || []).reduce(function(s, d) { return s + (d.balance || d.bal || 0); }, 0));
  var rsuValue = ((p.rsuGrants || []).reduce(function(s, g) { return s + ((g.totalShares || 0) * (g.sharePrice || 0)); }, 0));
  var reEquity = ((p.props || []).filter(function(pr){ return pr && pr.on; }).reduce(function(s, pr){ return s + ((pr.val || 0) - (pr.mb || 0)); }, 0));

  function fm(v) {
    if (window.BFmt && typeof window.BFmt.fmtMoney === 'function') return window.BFmt.fmtMoney(v, true);
    return String(Math.round(v || 0)) + ' $';
  }

  var a = {};
  a.overall_assessment = name + ', your plan shows a success rate of <strong>' + succPct + '%</strong> across 5,000 simulations. Median projected wealth is <strong>' + fm(p50) + '</strong>. Results remain conditional on market, inflation, and longevity assumptions.';
  a.verdict = 'The median path remains positive, with a prudent (P25) outcome of <strong>' + fm(p25) + '</strong>. The trajectory suggests the plan is viable if current assumptions are maintained.';
  a.page_zero_verdict = 'Key point: keeping contribution discipline, spending control, and fee efficiency can materially improve resilience in weaker scenarios.';
  a.profile_summary = 'The plan combines registered and non-registered accounts over a long horizon. Periodic review of assumptions and goals remains essential to keep the plan aligned.';
  a.trajectory_insight = 'The median projection ends at <strong>' + fm(p50) + '</strong>, and the prudent scenario at <strong>' + fm(p25) + '</strong>. The spread reflects sequence-of-returns risk.';
  a.income_insight = 'Government income is estimated around <strong>' + fm(govAnnual) + '</strong> per year. For a target spending level of <strong>' + fm(spendAnnual) + '</strong>, required annual portfolio withdrawals would be about <strong>' + fm(gapAnnual) + '</strong>.';
  a.taxInsight = 'Tax outcomes depend mainly on withdrawal mix across RRSP/RRIF, TFSA, and non-registered accounts. Annual optimization can reduce tax drag and benefit clawback risk.';
  a.estateInsight = 'Median projected net estate is <strong>' + fm(estateNet) + '</strong>, after estimated tax at death of <strong>' + fm(estateTax) + '</strong>. This estimate can vary with returns and time of death.';

  if (p.gis) a.gis_insight = 'GIS may play a meaningful role in retirement income. Taxable withdrawal levels directly affect eligibility and payment amounts.';
  if (p.melt) a.meltdown_insight = 'A meltdown strategy can bring RRSP withdrawals forward to reduce later-life tax pressure from mandatory RRIF withdrawals.';
  if (p.props && p.props.length) a.real_estate_insight = 'The real-estate sleeve adds estimated equity of <strong>' + fm(reEquity) + '</strong>. Rental cash flow, expense control, and sale timing remain key drivers.';
  if (p.rsuGrants && p.rsuGrants.length) a.rsu_insight = 'Gross RSU value is estimated at <strong>' + fm(rsuValue) + '</strong>. Vesting schedule and tax treatment can materially change net value.';
  if (p.bizOn) a.corp_insight = 'The corporate component adds planning leverage on extraction timing and salary/dividend mix.';
  if (p.debts && p.debts.length) a.debt_insight = 'Total outstanding debt is about <strong>' + fm(totalDebt) + '</strong>. Prioritizing high-rate debt reduction can improve overall plan resilience.';
  if (prof && prof.mode === 'expert') {
    a.riskInsight = 'Primary risk remains return sequence early in decumulation. Spending, inflation, and return sensitivities should be monitored together.';
    a.risk_plain_language = 'Plain language: weak early market years may require temporary withdrawal adjustments to protect long-term sustainability.';
  }

  return a;
}

function aiText(idx, prof, mc, lang) {
  return lang === 'en' ? aiTextEN(idx, prof, mc) : aiTextFR(idx, prof, mc);
}

function clampPref(v, allowed, fallback) {
  return allowed.indexOf(v) >= 0 ? v : fallback;
}

function detailSentenceLimit(detailPref) {
  if (detailPref === 'concise') return 2;
  if (detailPref === 'detailed') return 4;
  return 3;
}

function joinSentences(parts, detailPref) {
  var lim = detailSentenceLimit(detailPref);
  return (parts || []).filter(Boolean).slice(0, lim).join(' ');
}

function b(v) {
  return '**' + String(v == null ? '' : v) + '**';
}

function localNoData(lang) {
  return lang === 'fr' ? 'Donnees insuffisantes pour analyse.' : 'Data insufficient for analysis.';
}

function buildLocalPromptSubstitute(promptObj, payload) {
  var data = BAiPrompt.extractData(payload);
  var lang = data.lang === 'en' ? 'en' : 'fr';
  var prefs = data.narrativePreferences || {};
  var finLiteracy = clampPref(prefs.finLiteracy, ['beginner', 'intermediate', 'advanced'], 'intermediate');
  var stressLevel = clampPref(prefs.stressLevel, ['low', 'moderate', 'high'], 'moderate');
  var detailPref = clampPref(prefs.detailPreference, ['concise', 'balanced', 'detailed'], 'balanced');
  var lead = lang === 'fr'
    ? (stressLevel === 'high' ? 'Le plan semble sensible, mais les chiffres donnent un cadre concret.' : stressLevel === 'low' ? 'Lecture directe des chiffres:' : 'Les chiffres donnent une lecture equilibree du plan.')
    : (stressLevel === 'high' ? 'The plan appears sensitive, but the numbers provide a clear frame.' : stressLevel === 'low' ? 'Straight reading of the numbers:' : 'The numbers provide a balanced read of the plan.');
  var literacyLine = lang === 'fr'
    ? (finLiteracy === 'beginner' ? 'Interpretation en langage simple, sans jargon inutile.' : finLiteracy === 'advanced' ? 'Lecture technique: sequence risk, efficience fiscale et sensibilites.' : 'Interpretation avec niveau technique intermediaire.')
    : (finLiteracy === 'beginner' ? 'Plain-language interpretation with limited jargon.' : finLiteracy === 'advanced' ? 'Technical read: sequence risk, tax efficiency, and sensitivities.' : 'Moderate technical depth for interpretation.');
  var out = {};

  function slotText(key) {
    if (key === 'overall_assessment') {
      return joinSentences([
        lead,
        (lang === 'fr'
          ? 'Le taux de succes projete est de ' + b(data.successRate) + ' avec un patrimoine median final de ' + b(data.p50Wealth) + '.'
          : 'Projected success rate is ' + b(data.successRate) + ' with median final wealth at ' + b(data.p50Wealth) + '.'),
        (lang === 'fr'
          ? 'Le scenario prudent (P25) ressort a ' + b(data.p25Wealth) + ', ce qui illustre l ampleur du risque de sequence.'
          : 'The prudent outcome (P25) is ' + b(data.p25Wealth) + ', which reflects sequence-of-returns risk.'),
        literacyLine
      ], detailPref);
    }
    if (key === 'verdict') {
      return joinSentences([
        (lang === 'fr'
          ? 'Le diagnostic global indique une note ' + b(data.grade) + ' (' + data.gradeLabel + ').'
          : 'Overall diagnostic indicates grade ' + b(data.grade) + ' (' + data.gradeLabel + ').'),
        (lang === 'fr'
          ? 'Le plan pourrait rester robuste si l execution conserve la discipline d epargne et de depenses.'
          : 'The plan could remain resilient if savings and spending discipline is maintained.'),
        (lang === 'fr'
          ? 'Le point de vigilance principal reste l ecart entre median et prudent.'
          : 'Main watchpoint remains the spread between median and prudent paths.')
      ], detailPref);
    }
    if (key === 'page_zero_verdict') {
      return lang === 'fr'
        ? 'Le plan semble aligner vos objectifs et votre horizon, sous reserve des hypotheses de marche.'
        : 'The plan appears aligned with your goals and time horizon, conditional on market assumptions.';
    }
    if (key === 'profile_summary') {
      return joinSentences([
        (lang === 'fr'
          ? 'Le capital total estime est de ' + b(data.totalSavings) + ', reparti entre REER ' + b(data.rrsp) + ', CELI ' + b(data.tfsa) + ' et non enregistre ' + b(data.nr) + '.'
          : 'Estimated total savings are ' + b(data.totalSavings) + ', split across RRSP ' + b(data.rrsp) + ', TFSA ' + b(data.tfsa) + ', and non-registered ' + b(data.nr) + '.'),
        (lang === 'fr'
          ? 'Cette diversification pourrait limiter la concentration de risque fiscal et de liquidite.'
          : 'This diversification could reduce concentration risk across tax and liquidity buckets.'),
        literacyLine
      ], detailPref);
    }
    if (key === 'trajectory_insight') {
      return joinSentences([
        (lang === 'fr'
          ? 'La trajectoire mediane pointe vers ' + b(data.p50Wealth) + ' contre ' + b(data.p25Wealth) + ' en scenario prudent.'
          : 'The median trajectory points to ' + b(data.p50Wealth) + ' versus ' + b(data.p25Wealth) + ' in the prudent case.'),
        (lang === 'fr'
          ? 'Le spread P25-P75 montre la sensibilite aux rendements et a l inflation.'
          : 'The P25-P75 spread shows sensitivity to returns and inflation.'),
        (lang === 'fr'
          ? 'La durabilite de l epargne est estimee: ' + b(data.savingsDurability) + '.'
          : 'Estimated savings durability is ' + b(data.savingsDurability) + '.')
      ], detailPref);
    }
    if (key === 'income_insight') {
      return joinSentences([
        (lang === 'fr'
          ? 'La couverture par revenus gouvernementaux est d environ ' + b(data.govCoverageRatio) + ' avec un ecart mensuel de ' + b(data.monthlyGap) + '.'
          : 'Government-income coverage is about ' + b(data.govCoverageRatio) + ', with a monthly gap of ' + b(data.monthlyGap) + '.'),
        (lang === 'fr'
          ? 'Depense cible: ' + b(data.monthlySpending) + ' par mois; revenus publics: ' + b(data.totalGovMonthly) + '.'
          : 'Target spending is ' + b(data.monthlySpending) + ' per month; public income is ' + b(data.totalGovMonthly) + '.'),
        (lang === 'fr'
          ? 'Le besoin de retrait du portefeuille pourrait donc varier selon les marches.'
          : 'Portfolio withdrawal needs could therefore vary with market paths.')
      ], detailPref);
    }
    if (key === 'taxInsight') {
      return joinSentences([
        (lang === 'fr'
          ? 'Le taux effectif moyen ressort a ' + b(data.avgEffectiveRate) + ' pour un impot vie estime a ' + b(data.lifetimeTax) + '.'
          : 'Average effective tax rate is ' + b(data.avgEffectiveRate) + ' with lifetime tax around ' + b(data.lifetimeTax) + '.'),
        (data.taxAlpha
          ? (lang === 'fr'
              ? 'Le tax alpha estime est de ' + b(data.taxAlpha) + ', ce qui suggere un gain potentiel via l ordre de retraits.'
              : 'Estimated tax alpha is ' + b(data.taxAlpha) + ', suggesting potential gain from withdrawal ordering.')
          : (lang === 'fr'
              ? 'Aucun tax alpha materialise n apparait dans cette projection.'
              : 'No material tax alpha appears in this projection.')),
        (lang === 'fr'
          ? 'Annees de recuperation PSV estimees: ' + b(data.oasClawbackYears) + '.'
          : 'Estimated OAS clawback years: ' + b(data.oasClawbackYears) + '.')
      ], detailPref);
    }
    if (key === 'estateInsight') {
      return joinSentences([
        (lang === 'fr'
          ? 'L heritage net median projete est de ' + b(data.netEstate) + ' avec un impot final estime a ' + b(data.taxAtDeath) + '.'
          : 'Median projected net estate is ' + b(data.netEstate) + ' with estimated final tax of ' + b(data.taxAtDeath) + '.'),
        (lang === 'fr'
          ? 'Le scenario prudent d heritage est de ' + b(data.cautionEstate) + '.'
          : 'Prudent estate outcome is ' + b(data.cautionEstate) + '.'),
        (lang === 'fr'
          ? 'Cette lecture resterait sensible au timing de deces et aux rendements reels.'
          : 'This read remains sensitive to timing of death and realized returns.')
      ], detailPref);
    }
    if (key === 'gis_insight') {
      if (!data.gis) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'Le SRG pourrait etre verse pendant ' + b(data.gis.eligibleYears) + ' ans, pour un total estime a ' + b(data.gis.lifetimeGIS) + '.'
          : 'GIS could be received for ' + b(data.gis.eligibleYears) + ' years, with lifetime value around ' + b(data.gis.lifetimeGIS) + '.'),
        (lang === 'fr'
          ? 'Moyenne annuelle estimee: ' + b(data.gis.avgPerYear) + '.'
          : 'Estimated annual average is ' + b(data.gis.avgPerYear) + '.'),
        (lang === 'fr'
          ? 'Le niveau de retraits imposables pourrait influencer fortement cette admissibilite.'
          : 'Taxable withdrawal levels could strongly influence this eligibility.')
      ], detailPref);
    }
    if (key === 'meltdown_insight') {
      if (!data.meltdown) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'La logique de meltdown viserait un retrait cible de ' + b(data.meltdown.target) + ' sur la periode ' + b(data.meltdown.period) + '.'
          : 'Meltdown logic would target withdrawals around ' + b(data.meltdown.target) + ' over ' + b(data.meltdown.period) + '.'),
        (lang === 'fr'
          ? 'REER courant: ' + b(data.meltdown.currentRRSP) + '; REER a 72 ans estime: ' + b(data.meltdown.rrspAt72) + '.'
          : 'Current RRSP: ' + b(data.meltdown.currentRRSP) + '; estimated RRSP at 72: ' + b(data.meltdown.rrspAt72) + '.'),
        (lang === 'fr'
          ? 'Reduction potentielle observee: ' + b(data.meltdown.reductionPct) + '.'
          : 'Observed potential reduction: ' + b(data.meltdown.reductionPct) + '.')
      ], detailPref);
    }
    if (key === 'real_estate_insight') {
      if (!data.realEstate) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'Le bloc immobilier couvre ' + b(data.realEstate.count) + ' propriete(s), valeur totale ' + b(data.realEstate.totalValue) + '.'
          : 'Real-estate sleeve includes ' + b(data.realEstate.count) + ' property(ies), total value ' + b(data.realEstate.totalValue) + '.'),
        (lang === 'fr'
          ? 'L equite estimee est de ' + b(data.realEstate.totalEquity) + '.'
          : 'Estimated equity is ' + b(data.realEstate.totalEquity) + '.'),
        (lang === 'fr'
          ? 'Ventes planifiees: ' + b(data.realEstate.salesPlanned) + '.'
          : 'Planned sales: ' + b(data.realEstate.salesPlanned) + '.')
      ], detailPref);
    }
    if (key === 'rsu_insight') {
      if (!data.rsu) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'Le portefeuille RSU compte ' + b(data.rsu.grantCount) + ' attribution(s) pour une valeur brute estimee a ' + b(data.rsu.totalValue) + '.'
          : 'RSU portfolio includes ' + b(data.rsu.grantCount) + ' grant(s) with estimated gross value of ' + b(data.rsu.totalValue) + '.'),
        (lang === 'fr'
          ? 'Le calendrier de vesting pourrait modifier la valeur nette effectivement capturee.'
          : 'Vesting timing could materially change the net value ultimately captured.')
      ], detailPref);
    }
    if (key === 'corp_insight') {
      if (!data.corp) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'La societe detient des benefices non repartis estimes a ' + b(data.corp.retainedEarnings) + ' pour un revenu annuel de ' + b(data.corp.revenue) + '.'
          : 'The corporation holds retained earnings around ' + b(data.corp.retainedEarnings) + ' with annual revenue of ' + b(data.corp.revenue) + '.'),
        (data.corp.saleAge
          ? (lang === 'fr' ? 'Age de sortie cible: ' + b(data.corp.saleAge) + '.' : 'Target business exit age: ' + b(data.corp.saleAge) + '.')
          : ''),
        (lang === 'fr'
          ? 'Le timing d extraction pourrait fortement influencer la facture fiscale personnelle.'
          : 'Extraction timing could materially influence personal tax outcomes.')
      ], detailPref);
    }
    if (key === 'debt_insight') {
      if (!data.debts) return localNoData(lang);
      return joinSentences([
        (lang === 'fr'
          ? 'La dette totale est estimee a ' + b(data.debts.totalDebt) + ', repartie sur ' + b(data.debts.count) + ' poste(s).'
          : 'Total debt is estimated at ' + b(data.debts.totalDebt) + ' across ' + b(data.debts.count) + ' item(s).'),
        (lang === 'fr'
          ? 'La part de dettes a taux eleve est de ' + b(data.debts.highRateCount) + ' poste(s), ratio dette/epargne ' + b(data.debts.debtToSavingsRatio) + '.'
          : 'High-rate debt count is ' + b(data.debts.highRateCount) + ', with debt-to-savings ratio at ' + b(data.debts.debtToSavingsRatio) + '.'),
        (lang === 'fr'
          ? 'Cette structure pourrait accroitre la volatilite du budget en phase de transition.'
          : 'This structure could increase budget volatility during transition phases.')
      ], detailPref);
    }
    if (key === 'best_move_explainer') {
      if (!data.strategies || !data.strategies.length) return localNoData(lang);
      var top = data.strategies.slice(0, 3).map(function(s) { return (s.name || 'N/A') + ' (' + (s.impact || 'N/A') + ')'; }).join(', ');
      return lang === 'fr'
        ? 'Les strategies dominantes selon le modele sont: ' + b(top) + '. Le cumul des impacts pourrait principalement venir de ces leviers.'
        : 'Top model-ranked strategies are ' + b(top) + '. Most modeled impact could come from these levers.';
    }
    if (key === 'riskInsight') {
      if (!data.sensitivity || !data.sensitivity.length) return localNoData(lang);
      var first = data.sensitivity[0];
      var spread = b(data.p25Wealth) + ' -> ' + b(data.p75Wealth);
      return joinSentences([
        (lang === 'fr'
          ? 'La zone de risque P25-P75 est ' + spread + '.'
          : 'Risk band from P25 to P75 is ' + spread + '.'),
        (lang === 'fr'
          ? 'Premier facteur de sensibilite observe: ' + b(first.factor) + ' (bas: ' + b(first.downside) + ', haut: ' + b(first.upside) + ').'
          : 'First observed sensitivity factor is ' + b(first.factor) + ' (downside: ' + b(first.downside) + ', upside: ' + b(first.upside) + ').'),
        (lang === 'fr'
          ? 'Le maintien d une marge de depense pourrait reduire le risque de sequence.'
          : 'Maintaining spending margin could reduce sequence risk.')
      ], detailPref);
    }
    if (key === 'family_insight') {
      if (!data.family || !data.family.length) return localNoData(lang);
      return lang === 'fr'
        ? 'Le contexte familial inclut ' + b(data.family.length) + ' personne(s) dependante(s), ce qui pourrait influencer les priorites de liquidite et de protection.'
        : 'Family context includes ' + b(data.family.length) + ' dependent(s), which could influence liquidity and protection priorities.';
    }
    if (key === 'goals_insight') {
      if (!data.goals || !data.goals.length) return localNoData(lang);
      return lang === 'fr'
        ? 'Le plan suit ' + b(data.goals.length) + ' objectif(s) financier(s); leur faisabilite dependra de l ecart entre trajectoire mediane et prudente.'
        : 'The plan tracks ' + b(data.goals.length) + ' financial goal(s); feasibility depends on the gap between median and prudent paths.';
    }
    return localNoData(lang);
  }

  (promptObj.slotKeys || []).forEach(function(key) {
    out[key] = slotText(key);
  });
  return {
    ai: BAiPrompt.parseResponse(JSON.stringify(out), promptObj.slotKeys || []),
    promptChars: (promptObj.system || '').length + (promptObj.user || '').length,
    slotCount: (promptObj.slotKeys || []).length
  };
}

function buildAiViaPromptSubstitution(data) {
  var payload = BData.buildReportPayload(data);
  if (!payload || payload.empty) return { ai: {}, promptChars: 0, slotCount: 0 };
  var promptObj = BAiPrompt.buildPrompt(payload);
  return buildLocalPromptSubstitute(promptObj, payload);
}

var outDir = path.join(dir, 'test-output');
try { fs.mkdirSync(outDir, { recursive: true }); } catch(e) {}

var LANGS = ['fr', 'en'];
var results = [];
P.forEach(function(prof, i) {
  var mc = buildMC(prof.mc, prof.succ);
  if (prof.mode === 'expert') {
    mc._naiveMC = { medRevData: mc.medRevData.map(function(r) { return Object.assign({}, r, { tax: Math.round(r.tax * 1.15) }); }) };
  }

  LANGS.forEach(function(lang) {
    var data = {
      params: prof.params,
      mc: mc,
      client: prof.client,
      rptLang: lang,
      rptMode: prof.mode || 'standard',
      finLiteracy: prof.finLiteracy,
      stressLevel: prof.stressLevel,
      detailPref: prof.detailPref
    };
    var aiBuilt = buildAiViaPromptSubstitution(data);
    data.ai = aiBuilt.ai || {};

    try {
      var html = buildReport(data);
      var fname = prof.id + '_' + lang + '.html';
      fs.writeFileSync(path.join(outDir, fname), html || '', 'utf8');
      var size = (html || '').length;
      results.push({
        id: prof.id, lang: lang, file: fname, ok: size > 1000, size: size, error: null,
        aiSlots: aiBuilt.slotCount || 0, aiPromptChars: aiBuilt.promptChars || 0
      });
      console.log('  \u2713 ' + fname + ' (' + Math.round(size / 1024) + ' KB) [' + prof.finLiteracy + '/' + prof.stressLevel + '/' + prof.detailPref + '] {slots=' + (aiBuilt.slotCount || 0) + ', promptChars=' + (aiBuilt.promptChars || 0) + '}');
    } catch(e) {
      results.push({ id: prof.id, lang: lang, file: prof.id + '_' + lang + '.html', ok: false, size: 0, error: e.message });
      console.log('  \u2717 ' + prof.id + '_' + lang + ': ' + e.message);
    }
  });
});

console.log('\n\u2550\u2550\u2550 VALIDATION \u2550\u2550\u2550');
var issues = [];

results.forEach(function(res) {
  if (!res.ok) { issues.push('[FAIL] ' + res.file + ': ' + (res.error || 'empty output')); return; }
  var html = fs.readFileSync(path.join(outDir, res.file), 'utf8');

  var requiredSections = ['sec-assessment', 'sec-diagnostic', 'sec-profile', 'sec-projection', 'sec-revenue', 'sec-tax', 'sec-methodology'];
  requiredSections.forEach(function(sec) {
    if (html.indexOf('id="' + sec + '"') === -1) issues.push('[MISSING SECTION] ' + res.file + ': ' + sec);
  });

  var tables = html.match(/id="rpt-t-[^"]+"/g) || [];
  tables.forEach(function(tbl) {
    var tblId = tbl.replace(/id="|"/g, '');
    var tblMatch = html.indexOf(tblId);
    if (tblMatch > -1) {
      var afterTbl = html.substring(tblMatch, tblMatch + 5000);
      var rowCount = (afterTbl.match(/<tr/g) || []).length;
      if (rowCount < 3) issues.push('[SPARSE TABLE] ' + res.file + ': ' + tblId + ' has only ' + rowCount + ' rows');
    }
  });

  var aiBlockCount = (html.match(/callout-ai/g) || []).length;
  if (aiBlockCount < 3) issues.push('[LOW AI] ' + res.file + ': only ' + aiBlockCount + ' AI blocks');

  if (html.indexOf('cover-title') === -1) issues.push('[NO COVER] ' + res.file);
  if (html.indexOf('cover-grade-circle') === -1) issues.push('[NO GRADE] ' + res.file);

  if (html.indexOf('undefined') > -1) issues.push('[UNDEFINED] ' + res.file + ': contains "undefined"');
  if (html.indexOf('NaN') > -1) issues.push('[NaN] ' + res.file + ': contains "NaN"');

  var prof = P.find(function(p) { return p.id === res.id; });
  if (prof) {
    if (prof.params.cOn && html.indexOf('class="g2"') === -1) issues.push('[COUPLE MISSING] ' + res.file);
    if (prof.params.bizOn && html.indexOf('sec-corp') === -1) issues.push('[CORP MISSING] ' + res.file);
    if (prof.params.debts && prof.params.debts.length > 0 && html.indexOf('sec-debt') === -1) issues.push('[DEBT MISSING] ' + res.file);
    if (prof.params.rsuGrants && prof.params.rsuGrants.length > 0 && html.indexOf('sec-rsu') === -1) issues.push('[RSU MISSING] ' + res.file);
    if (prof.params.props && prof.params.props.length > 0 && html.indexOf('sec-realestate') === -1) issues.push('[RE MISSING] ' + res.file);
    if (prof.params.melt && html.indexOf('sec-meltdown') === -1) issues.push('[MELTDOWN MISSING] ' + res.file);
  }

  if (res.size < 20000) issues.push('[SMALL] ' + res.file + ': only ' + Math.round(res.size / 1024) + ' KB');

  // ── Value-level checks: catch flat / 0-income regressions ──
  // Pull the cash-flow table and assert that pre-retirement income > 0 and that
  // there are at least 3 unique values across income / spending / tax columns
  // (a flat profile across many years means the row data is broken).
  var cfMatch = html.match(/id="rpt-t-cf"[\s\S]*?<\/table>/);
  if (cfMatch) {
    var rows = cfMatch[0].split('<tr').slice(2); // skip table-open + header
    var incVals = [], spendVals = [], taxVals = [];
    rows.forEach(function(rowHtml) {
      var tds = [];
      var re = /<td[^>]*>([^<]*)</g, m;
      while ((m = re.exec(rowHtml)) !== null) tds.push(m[1].trim());
      if (tds.length >= 5) {
        // tds[0]=age, tds[1]=income, tds[2]=spending, tds[3]=tax, tds[4]=balance
        incVals.push(tds[1]);
        spendVals.push(tds[2]);
        taxVals.push(tds[3]);
      }
    });
    if (incVals.length > 5) {
      var uniqueInc = new Set(incVals).size;
      var uniqueSpend = new Set(spendVals).size;
      var uniqueTax = new Set(taxVals).size;
      if (uniqueInc < 3) issues.push('[FLAT INCOME] ' + res.file + ': only ' + uniqueInc + ' unique income values across ' + incVals.length + ' rows');
      if (uniqueSpend < 3) issues.push('[FLAT SPENDING] ' + res.file + ': only ' + uniqueSpend + ' unique spending values across ' + spendVals.length + ' rows');
      // Tax variation check: skip if most rows are legitimately $0 (low-income profile under personal exemption).
      var zeroTax = taxVals.filter(function(v) { return v === '0$' || v === '0 $'; }).length;
      if (uniqueTax < 3 && zeroTax < taxVals.length / 2) issues.push('[FLAT TAX] ' + res.file + ': only ' + uniqueTax + ' unique tax values across ' + taxVals.length + ' rows');
      var zeroInc = incVals.filter(function(v) { return v === '0$' || v === '0 $'; }).length;
      if (zeroInc > incVals.length / 2) issues.push('[ZERO INCOME] ' + res.file + ': ' + zeroInc + '/' + incVals.length + ' rows show $0 income');
    }
  }
});

console.log('\n\u2550\u2550\u2550 REPORT CARD \u2550\u2550\u2550');
var passed = results.filter(function(r) { return r.ok; }).length;
console.log('Reports generated: ' + passed + '/' + results.length);
console.log('Total issues: ' + issues.length);
if (issues.length > 0) {
  console.log('\nIssues:');
  issues.forEach(function(iss) { console.log('  ' + iss); });
} else {
  console.log('\n\u2713 All ' + results.length + ' reports passed validation');
}

console.log('\n\u2550\u2550\u2550 SIZE SUMMARY \u2550\u2550\u2550');
console.log('Profile'.padEnd(22) + 'FR'.padStart(7) + ' EN'.padStart(7) + '  Literacy    Stress     Detail');
console.log('\u2500'.repeat(80));
P.forEach(function(prof) {
  var fr = results.find(function(r) { return r.id === prof.id && r.lang === 'fr'; });
  var en = results.find(function(r) { return r.id === prof.id && r.lang === 'en'; });
  var frSz = fr && fr.ok ? Math.round(fr.size / 1024) + 'K' : 'FAIL';
  var enSz = en && en.ok ? Math.round(en.size / 1024) + 'K' : 'FAIL';
  console.log(prof.id.padEnd(22) + frSz.padStart(7) + enSz.padStart(7) + '  ' + prof.finLiteracy.padEnd(13) + prof.stressLevel.padEnd(11) + prof.detailPref);
});

console.log('\n\u2550\u2550\u2550 AI SUBSTITUTION METRICS \u2550\u2550\u2550');
var okWithAi = results.filter(function(r) { return r.ok; });
var totalSlots = okWithAi.reduce(function(s, r) { return s + (r.aiSlots || 0); }, 0);
var totalPromptChars = okWithAi.reduce(function(s, r) { return s + (r.aiPromptChars || 0); }, 0);
var avgSlots = okWithAi.length ? (totalSlots / okWithAi.length).toFixed(1) : '0.0';
var avgPromptChars = okWithAi.length ? Math.round(totalPromptChars / okWithAi.length) : 0;
console.log('Mode: prompt-substitution (buildPrompt -> local provider -> parseResponse)');
console.log('Reports with AI: ' + okWithAi.length + '/' + results.length);
console.log('Average slots/report: ' + avgSlots);
console.log('Average prompt chars/report: ' + avgPromptChars);
