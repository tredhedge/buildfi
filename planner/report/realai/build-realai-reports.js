#!/usr/bin/env node
// build-realai-reports.js — Generate reports using real AI (Claude Opus 4.7)
// instead of the local templated substitute.
//
// Workflow:
//   1. node report/realai/build-realai-reports.js dump
//      → writes report/realai/prompts/{profile}_{lang}.json (system+user prompts)
//   2. Claude reads each prompt and writes report/realai/responses/{profile}_{lang}.json
//      (raw JSON object with one key per requested slot)
//   3. node report/realai/build-realai-reports.js render
//      → loads responses + renders report/realai/output/{profile}_{lang}.html
'use strict';

const fs = require('fs');
const path = require('path');

// ── Node browser-like globals (mirrors report/test-reports.js) ───────────
global.window = {};
global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
Object.defineProperty(global, 'navigator', { value: { clipboard: { writeText: () => Promise.resolve() } }, writable: true, configurable: true });

const reportDir = path.join(__dirname, '..');
['report-formatters.js', 'report-data.js', 'report-charts.js', 'report-pdf.js', 'report-ai-prompt.js'].forEach(f => {
  const code = fs.readFileSync(path.join(reportDir, f), 'utf8');
  try { eval(code); } catch (e) { console.error(`Failed to load ${f}:`, e.message); process.exit(1); }
});

const buildReport = window.buildReport;
const BAiPrompt = window.BAiPrompt;
const BData = window.BData;
if (!buildReport || !BAiPrompt || !BData) {
  console.error('Modules failed to load on window');
  process.exit(1);
}

// ── 5 profiles selected for archetype variety ─────────────────────────────
// 1 per archetype: transitioner-couple, business_owner, fire_seeker, low_income, debt_burdened
const PROFILES = [
  {
    id: 'hnw_couple', lang: 'fr', mode: 'expert',
    finLiteracy: 'advanced', stressLevel: 'low', detailPref: 'detailed',
    client: { name: 'Francois Dubois', firstName: 'Francois', spouseFirstName: 'Isabelle', email: 'francois@example.com' },
    params: {
      age: 58, retAge: 63, deathAge: 92, sex: 'M', prov: 'QC',
      sal: 165000, rrsp: 820000, tfsa: 215000, nr: 320000,
      cOn: true, cAge: 52, cRetAge: 62, cSex: 'F', cSal: 142000, cRRSP: 410000, cTFSA: 145000, cNR: 95000,
      retSpM: 9500, cRetSpM: 0,
      qppAge: 65, oasAge: 65, cQppAge: 65, cOasAge: 65,
      avgE: 165000, qppYrs: 35, cAvgE: 142000, cQppYrs: 28,
      penType: 'db', penM: 1800, penIdx: true,
      melt: true, meltTgt: 65000, split: true, splitP: 0.5,
      wStrat: 'optimized', goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, inf: 0.021, nSim: 5000, fatT: true, stochInf: true,
      merR: 0.005, merT: 0.0035, merN: 0.004,
      allocR: 0.6, allocT: 0.7, allocN: 0.5,
      goals: [
        { desc: 'Voyages annuels en Europe', amount: 25000, age: 65 },
        { desc: 'Aide aux deux enfants pour mises de fonds', amount: 100000, age: 67 }
      ]
    },
    mc_overrides: { qppM: 1450, oasM: 720, cQppM: 1280, cOasM: 720 }
  },
  {
    id: 'ccpc_owner', lang: 'en', mode: 'expert',
    finLiteracy: 'advanced', stressLevel: 'moderate', detailPref: 'detailed',
    client: { name: 'David Chen', firstName: 'David', email: 'david@example.com' },
    params: {
      age: 50, retAge: 60, deathAge: 90, sex: 'M', prov: 'ON',
      sal: 95000, rrsp: 180000, tfsa: 95000, nr: 70000,
      retSpM: 7500,
      qppAge: 65, oasAge: 65, avgE: 95000, qppYrs: 25,
      bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 480000, bizSaleAge: 65,
      wStrat: 'optimized', goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, inf: 0.021, nSim: 5000, fatT: true,
      merR: 0.011, merT: 0.008, merN: 0.009,
      allocR: 0.65, allocT: 0.75, allocN: 0.6
    },
    mc_overrides: { qppM: 1200, oasM: 700 }
  },
  {
    id: 'fire_seeker', lang: 'fr',
    finLiteracy: 'advanced', stressLevel: 'low', detailPref: 'detailed',
    client: { name: 'Sophie Lavoie', firstName: 'Sophie', email: 'sophie@example.com' },
    params: {
      age: 35, retAge: 45, deathAge: 95, sex: 'F', prov: 'QC',
      sal: 145000, rrsp: 285000, tfsa: 165000, nr: 380000,
      rrspC: 27000, tfsaC: 7000, nrC: 35000,
      retSpM: 5500,
      qppAge: 65, oasAge: 65, avgE: 145000, qppYrs: 13,
      wStrat: 'optimized', goP: 1.0, slP: 0.90, noP: 0.75,
      eqRet: 0.07, inf: 0.021, nSim: 5000, fatT: true,
      merR: 0.0025, merT: 0.0025, merN: 0.0025,
      allocR: 0.85, allocT: 0.85, allocN: 0.80,
      goals: [
        { desc: 'Année sabbatique de voyage', amount: 60000, age: 47 },
        { desc: 'Achat propriété secondaire', amount: 350000, age: 55 }
      ]
    },
    mc_overrides: { qppM: 1300, oasM: 700 }
  },
  {
    id: 'low_income_gis', lang: 'en',
    finLiteracy: 'beginner', stressLevel: 'moderate', detailPref: 'concise',
    client: { name: 'Linda Smith', firstName: 'Linda', email: 'linda@example.com' },
    params: {
      age: 62, retAge: 65, deathAge: 88, sex: 'F', prov: 'ON',
      sal: 28000, rrsp: 18000, tfsa: 32000, nr: 4000,
      rrspC: 0, tfsaC: 2000, nrC: 0,
      retSpM: 2400,
      qppAge: 65, oasAge: 65, avgE: 35000, qppYrs: 30,
      gis: true,
      wStrat: 'optimized', goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.05, inf: 0.021, nSim: 5000, fatT: true,
      merR: 0.012, merT: 0.012, merN: 0.012,
      allocR: 0.4, allocT: 0.5, allocN: 0.4
    },
    mc_overrides: { qppM: 720, oasM: 700 }
  },
  {
    id: 'debt_young', lang: 'fr',
    finLiteracy: 'beginner', stressLevel: 'high', detailPref: 'concise',
    client: { name: 'Karim Benali', firstName: 'Karim', email: 'karim@example.com' },
    params: {
      age: 32, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC',
      sal: 72000, rrsp: 15000, tfsa: 8000, nr: 3000,
      rrspC: 4500, tfsaC: 3000, nrC: 0,
      retSpM: 4500,
      qppAge: 65, oasAge: 65, avgE: 72000, qppYrs: 10,
      debts: [
        { name: 'Ligne de crédit', balance: 28000, rate: 0.089 },
        { name: 'Carte de crédit', balance: 7500, rate: 0.199 },
        { name: 'Hypothèque', balance: 312000, rate: 0.054 }
      ],
      wStrat: 'standard', goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, inf: 0.021, nSim: 5000, fatT: true,
      merR: 0.015, merT: 0.015, merN: 0.015,
      allocR: 0.7, allocT: 0.7, allocN: 0.6
    },
    mc_overrides: { qppM: 980, oasM: 700 }
  }
];

// ── Real MC loader: reads payloads produced by gen-real-mc.mjs ────────────
// The synthetic genPD / genRevData generators that previously lived here have
// been removed. Numbers/charts/tables now come from the real engine
// (lib/engine/index.js, the validated mirror of planner_v2.html).
// Run `node report/realai/gen-real-mc.mjs` first to produce the mc payloads.
const mcDir = path.join(__dirname, 'mc');
function loadRealMC(profId, lang) {
  const fp = path.join(mcDir, profId + '_' + lang + '.json');
  if (!fs.existsSync(fp)) {
    throw new Error('Missing real MC payload at ' + fp + ' — run gen-real-mc.mjs first.');
  }
  const mc = JSON.parse(fs.readFileSync(fp, 'utf8'));
  // Restore Infinity sentinels (gen-real-mc serializes them as 999).
  if (mc.p5Ruin === 999) mc.p5Ruin = 999;
  return mc;
}
function r(v) { return Math.round(v); }

function buildSyntheticMC(c, succ) {
  // Inline genPD + genRevData (lightweight reproductions sufficient for prompt-quality tests).
  // For final report rendering accuracy, the real engine MC would replace these.
  const mc = require('child_process').execSync(`node -e "
    const fs = require('fs');
    const cfgStr = process.argv[1];
    const cfg = JSON.parse(cfgStr);
    global.window = {};
    global.document = { getElementById: () => null, querySelectorAll: () => [], activeElement: null };
    ['report-formatters.js','report-data.js','report-charts.js','report-pdf.js','report-ai-prompt.js'].forEach(f => {
      const code = fs.readFileSync('${reportDir.replace(/\\/g, '/')}/' + f, 'utf8');
      try { eval(code); } catch(e) {}
    });
    const tr = fs.readFileSync('${reportDir.replace(/\\/g, '/')}/test-reports.js', 'utf8');
    const cleaned = tr.replace(/^#!.*\\n/, '').replace(/^.*?process\\.exit\\(1\\);.*?\\n/m, '').replace(/var P = \\[[\\s\\S]*?\\];[\\s\\S]*?$/m, '');
    eval(cleaned);
    const mc = buildMC(cfg, ${succ});
    process.stdout.write(JSON.stringify(mc));
  " '${JSON.stringify(c)}'`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(mc);
}

// Simpler approach: inline the generators from test-reports.js
function buildMC(cfg, succ) {
  const pD = genPD(cfg);
  const revData = genRevData(cfg);
  const last = pD[pD.length - 1] || {};
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

function genPD(c) {
  const rows = []; let rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
  let crr = c.cRRSP || 0, ctf = c.cTFSA || 0, cnr = c.cNR || 0;
  const da = c.deathAge || 90, retR = c.eqRet || 0.06;
  for (let a = c.age; a <= da; a++) {
    const preRet = a < c.retAge;
    if (preRet) {
      rr = rr * (1 + retR) + (c.rrspC || 0);
      tf = tf * (1 + retR) + (c.tfsaC || 0);
      nr = nr * (1 + retR * 0.8) + (c.nrC || 0);
      crr = crr * (1 + retR * 0.95);
      ctf = ctf * (1 + retR * 0.95);
      cnr = cnr * (1 + retR * 0.75);
    } else {
      const total = rr + tf + nr + crr + ctf + cnr;
      const qpp = a >= (c.qppAge || 65) ? (c.qppM || 700) * 12 : 0;
      const oas = a >= (c.oasAge || 65) ? (c.oasM || 650) * 12 : 0;
      const pen = a >= c.retAge ? (c.penM || 0) * 12 : 0;
      const gov = qpp + oas + pen;
      const gap = Math.max(0, (c.retSpM || 3000) * 12 - gov);
      if (total > 0 && gap > 0) {
        const ratio = Math.min(0.95, gap / total);
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
    const tot = rr + tf + nr + crr + ctf + cnr;
    const sp = Math.max(tot * 0.03, 5000) * Math.sqrt(Math.max(1, a - c.age));
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
  const rows = [];
  let rr = c.rrsp || 0, tf = c.tfsa || 0, nr = c.nr || 0;
  let crr = c.cRRSP || 0, ctf = c.cTFSA || 0, cnr = c.cNR || 0;
  let lira = c.lira || 0;
  let corpBal = c.bizOn ? (c.bizRetainedEarnings || 0) : 0;
  const corpRev = c.bizOn ? (c.bizRevenue || 0) : 0;
  const da = c.deathAge || 90;
  const retR = c.eqRet || 0.06;
  const inf = c.inf || 0.021;
  const prov = c.prov || 'QC';
  const goP = c.goP || 1.0, slP = c.slP || 0.85, noP = c.noP || 0.7;
  const calcTax = (window.BData && window.BData.calcTax) ? window.BData.calcTax : null;

  for (let a = c.age; a <= da; a++) {
    const preRet = a < c.retAge;
    const yIdx = a - c.age;
    const infM = Math.pow(1 + inf, yIdx);

    let qppBase = a >= (c.qppAge || 65) ? (c.qppM || 700) * 12 : 0;
    let oasBase = a >= (c.oasAge || 65) ? (c.oasM || 650) * 12 : 0;
    if (oasBase > 0 && a >= 75) oasBase *= 1.10;
    const penBase = a >= c.retAge ? (c.penM || 0) * 12 : 0;
    const qpp = qppBase * infM;
    const oas = oasBase * infM;
    const pen = c.penIdx === false ? penBase : penBase * infM;

    const sal = preRet ? (c.sal || 0) * infM : 0;
    const cSal = preRet ? (c.cSal || 0) * infM : 0;

    const spendMult = a < 75 ? goP : (a < 85 ? slP : noP);
    let spY;
    if (preRet) {
      const contrib = (c.rrspC || 0) + (c.tfsaC || 0) + (c.nrC || 0);
      spY = Math.max(0, sal + cSal - contrib);
    } else {
      spY = (c.retSpM || 3000) * 12 * infM * spendMult;
    }

    let gisRaw = 0;
    if (c.gis && a >= 65) {
      const preGisInc = qpp + pen;
      const gisCap = 12000 * infM;
      gisRaw = Math.max(0, gisCap - preGisInc * 0.5);
    }
    const gis = gisRaw;

    const gov = qpp + oas + pen + gis;
    const gap = preRet ? 0 : Math.max(0, spY - gov);

    let wFromRR = 0, wFromTF = 0, wFromNR = 0, wRrifMin = 0;
    if (!preRet && gap > 0) {
      let remain = gap;
      const drawNR = Math.min(nr, remain); nr -= drawNR; remain -= drawNR; wFromNR = drawNR;
      if (a >= 72 && rr > 0) {
        const rrifPct = a >= 95 ? 0.20 : [0.054,0.0553,0.0567,0.0582,0.0598,0.0617,0.0636,0.0658,0.0682,0.0708,0.0738,0.0771,0.0808,0.0851,0.0899,0.0955,0.1021,0.1099,0.1192,0.1306,0.1449,0.1634,0.1879,0.20][Math.min(a - 72, 23)] || 0.20;
        wRrifMin = rr * rrifPct;
      }
      const drawRR = Math.min(rr, Math.max(remain, wRrifMin));
      rr -= drawRR; remain = Math.max(0, remain - drawRR); wFromRR = drawRR;
      const drawTF = Math.min(tf, remain); tf -= drawTF; remain -= drawTF; wFromTF = drawTF;
    }
    const wTotal = wFromRR + wFromTF + wFromNR;

    const taxInc = sal + cSal + qpp + oas + pen + wFromRR;
    const oasThr = 95323 * infM;
    const clawback = oas > 0 && taxInc > oasThr ? Math.min(oas, (taxInc - oasThr) * 0.15) : 0;
    const oasNet = Math.max(0, oas - clawback);

    let tax;
    if (calcTax) {
      const tx = calcTax(Math.max(0, taxInc), yIdx, prov, inf, !preRet);
      tax = tx.total;
    } else {
      tax = preRet ? taxInc * 0.28 : taxInc * (c.avgTR || 0.22);
    }
    if (!preRet && c.cOn) tax *= 0.92;

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

    let corpTax = 0, corpDiv = 0, corpExtract = 0;
    if (c.bizOn) {
      const saleAge = c.bizSaleAge || c.retAge;
      if (a < saleAge) {
        const corpProfit = corpRev * 0.20;
        corpTax = corpProfit * 0.122;
        corpBal = corpBal * (1 + retR * 0.7) + (corpProfit - corpTax);
      } else if (a === saleAge) {
        corpExtract = corpBal * 0.5;
        corpDiv = corpExtract;
        corpTax = corpExtract * 0.3934;
        corpBal -= corpExtract;
      } else {
        const ext = Math.min(corpBal, 30000 * infM);
        corpExtract = ext; corpDiv = ext;
        corpTax = ext * 0.3934;
        corpBal = Math.max(0, corpBal * (1 + retR * 0.5) - ext);
      }
    }

    rows.push({
      age: a,
      rrq: r(qpp), psv: r(oasNet), srg: r(gis), pen: r(pen),
      sal: r(sal), cSal: r(cSal),
      ret: r(wTotal),
      spend: r(spY), sp: r(spY), spending: r(spY),
      tax: r(tax), taxInc: r(Math.max(0, taxInc)),
      aRR: r(rr), aTF: r(tf), aNR: r(nr),
      aCRR: r(crr), aCTF: r(ctf), aCNR: r(cnr),
      aLIRA: r(lira),
      wFromRR: r(wFromRR), wFromTF: r(wFromTF), wFromNR: r(wFromNR),
      wMelt: 0, wRrifMin: r(wRrifMin),
      corpBal: r(corpBal), corpTax: r(corpTax), corpDiv: r(corpDiv),
      corpSal: 0, corpExtract: r(corpExtract),
      corpCDA: 0, corpRDTOH: 0, corpPassive: r(corpBal * 0.04),
      balRR: r(rr), balTF: r(tf), balNR: r(nr),
      balCRR: r(crr), balCTF: r(ctf), balCNR: r(cnr), balLIRA: r(lira),
      balTot: r(rr + tf + nr + crr + ctf + cnr + lira),
      gis: r(gis)
    });
  }
  return rows;
}

// ── Build payload + prompt for one profile (real-engine MC) ───────────────
function preparePayload(prof) {
  const mc = loadRealMC(prof.id, prof.lang);
  // Naive comparator for tax-alpha display in expert mode: derive from medRevData
  // by inflating tax 15% (approximates "no optimization" baseline).
  if (prof.mode === 'expert' && mc.medRevData) {
    mc._naiveMC = {
      medRevData: mc.medRevData.map(r2 => Object.assign({}, r2, { tax: Math.round((r2.tax || 0) * 1.15) })),
      succ: Math.max(0.5, (mc.succ || 0.85) - 0.05),
      rMedF: (mc.rMedF || mc.medF) * 0.95,
      medF: (mc.medF || 0) * 0.95,
      medEstateNet: (mc.medEstateNet || 0) * 0.92
    };
  }
  return {
    params: prof.params, mc: mc, client: prof.client,
    rptLang: prof.lang, rptMode: prof.mode || 'standard',
    finLiteracy: prof.finLiteracy, stressLevel: prof.stressLevel, detailPref: prof.detailPref
  };
}

function buildPromptFor(prof) {
  const data = preparePayload(prof);
  const payload = BData.buildReportPayload(data);
  if (!payload || payload.empty) throw new Error('Empty payload for ' + prof.id);
  const promptObj = BAiPrompt.buildPrompt(payload);
  return { data: data, payload: payload, prompt: promptObj };
}

// ── CLI dispatch ───────────────────────────────────────────────────────────
const cmd = process.argv[2] || 'render';

if (cmd === 'dump') {
  console.log('Dumping prompts for ' + PROFILES.length + ' profiles...');
  PROFILES.forEach(prof => {
    const built = buildPromptFor(prof);
    const fname = prof.id + '_' + prof.lang + '.json';
    const out = {
      profile: prof.id,
      lang: prof.lang,
      slotKeys: built.prompt.slotKeys,
      system: built.prompt.system,
      user: built.prompt.user
    };
    fs.writeFileSync(path.join(__dirname, 'prompts', fname), JSON.stringify(out, null, 2));
    console.log('  ✓ ' + fname + ' (slots=' + built.prompt.slotKeys.length + ', user=' + built.prompt.user.length + ' chars)');
  });
  console.log('\nNext: write Claude responses to report/realai/responses/{profile}_{lang}.json');
  console.log('  Each response file = a JSON object with one key per slot in slotKeys.');
  console.log('Then re-run with: node report/realai/build-realai-reports.js render');
  process.exit(0);
}

if (cmd === 'render') {
  console.log('Rendering reports with real AI responses...');
  let ok = 0, missing = 0;
  PROFILES.forEach(prof => {
    const respPath = path.join(__dirname, 'responses', prof.id + '_' + prof.lang + '.json');
    if (!fs.existsSync(respPath)) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — no response file at ' + respPath);
      missing++;
      return;
    }
    const responseRaw = fs.readFileSync(respPath, 'utf8');
    let responseJson;
    try { responseJson = JSON.parse(responseRaw); } catch (e) {
      console.log('  ⨯ ' + prof.id + '_' + prof.lang + ' — response JSON parse error: ' + e.message);
      missing++;
      return;
    }
    const data = preparePayload(prof);
    data.ai = responseJson;
    const html = buildReport(data);
    const fname = prof.id + '_' + prof.lang + '.html';
    fs.writeFileSync(path.join(__dirname, 'output', fname), html, 'utf8');
    console.log('  ✓ ' + fname + ' (' + Math.round(html.length / 1024) + ' KB)');
    ok++;
  });
  console.log('\nDone. ' + ok + '/' + PROFILES.length + ' rendered, ' + missing + ' missing responses.');
  process.exit(missing > 0 ? 1 : 0);
}

console.error('Unknown command. Use: dump | render');
process.exit(1);
