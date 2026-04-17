#!/usr/bin/env node
// gen-real-mc.mjs — Run the REAL Monte Carlo engine (lib/engine/index.js,
// extracted from planner_v2.html) for the 5 realai profiles and dump the
// full mc payload to realai/mc/{profile}_{lang}.json.
//
// build-realai-reports.js (render mode) loads these payloads instead of the
// synthetic genPD/genRevData generators it carried previously. That gives us:
//   numbers/charts/tables  →  real engine
//   AI prose                →  Opus 4.7 responses written to realai/responses
//
// Run: node report/realai/gen-real-mc.mjs

import { runMC } from '../../../lib/engine/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mcDir = path.join(__dirname, 'mc');

// 5 profiles — same as build-realai-reports.js but enriched with the engine's
// expected params (eqVol/bndVol/stochMort/penIdx default-on so MC is realistic).
const PROFILES = [
  {
    id: 'hnw_couple', lang: 'fr', mode: 'expert',
    params: {
      age: 58, retAge: 63, deathAge: 92, sex: 'M', prov: 'QC',
      sal: 165000, rrsp: 820000, tfsa: 215000, nr: 320000,
      cOn: true, cAge: 52, cRetAge: 62, cSex: 'F', cSal: 142000, cRRSP: 410000, cTFSA: 145000, cNR: 95000,
      retSpM: 9500, cRetSpM: 0,
      qppAge: 65, oasAge: 65, cQppAge: 65, cOasAge: 65,
      avgE: 165000, qppYrs: 35, cAvgE: 142000, cQppYrs: 28,
      penType: 'db', penM: 1800, penIdx: true,
      melt: true, meltTgt: 65000, split: true, splitP: 0.5,
      wStrat: 'optimized',
      goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
      inf: 0.021, fatT: true, stochInf: true, stochMort: false,
      merR: 0.005, merT: 0.0035, merN: 0.004,
      allocR: 0.6, allocT: 0.7, allocN: 0.5
    },
    nSim: 2000
  },
  {
    id: 'ccpc_owner', lang: 'en', mode: 'expert',
    params: {
      age: 50, retAge: 60, deathAge: 90, sex: 'M', prov: 'ON',
      sal: 95000, rrsp: 180000, tfsa: 95000, nr: 70000,
      retSpM: 7500,
      qppAge: 65, oasAge: 65, avgE: 95000, qppYrs: 25,
      bizOn: true, bizRevenue: 250000, bizRetainedEarnings: 480000, bizSaleAge: 65,
      wStrat: 'optimized',
      goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
      inf: 0.021, fatT: true, stochInf: true, stochMort: false,
      merR: 0.011, merT: 0.008, merN: 0.009,
      allocR: 0.65, allocT: 0.75, allocN: 0.6
    },
    nSim: 2000
  },
  {
    id: 'fire_seeker', lang: 'fr',
    params: {
      age: 35, retAge: 45, deathAge: 95, sex: 'F', prov: 'QC',
      sal: 145000, rrsp: 285000, tfsa: 165000, nr: 380000,
      rrspC: 27000, tfsaC: 7000, nrC: 35000,
      retSpM: 5500,
      qppAge: 65, oasAge: 65, avgE: 145000, qppYrs: 13,
      wStrat: 'optimized',
      goP: 1.0, slP: 0.90, noP: 0.75,
      eqRet: 0.07, eqVol: 0.18, bndRet: 0.035, bndVol: 0.06,
      inf: 0.021, fatT: true, stochInf: true, stochMort: false,
      merR: 0.0025, merT: 0.0025, merN: 0.0025,
      allocR: 0.85, allocT: 0.85, allocN: 0.80
    },
    nSim: 2000
  },
  {
    id: 'low_income_gis', lang: 'en',
    params: {
      age: 62, retAge: 65, deathAge: 88, sex: 'F', prov: 'ON',
      sal: 28000, rrsp: 18000, tfsa: 32000, nr: 4000,
      rrspC: 0, tfsaC: 2000, nrC: 0,
      retSpM: 2400,
      qppAge: 65, oasAge: 65, avgE: 35000, qppYrs: 30,
      wStrat: 'optimized',
      goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.05, eqVol: 0.12, bndRet: 0.035, bndVol: 0.06,
      inf: 0.021, fatT: true, stochInf: true, stochMort: false,
      merR: 0.012, merT: 0.012, merN: 0.012,
      allocR: 0.4, allocT: 0.5, allocN: 0.4
    },
    nSim: 2000
  },
  {
    id: 'debt_young', lang: 'fr',
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
      wStrat: 'standard',
      goP: 1.0, slP: 0.85, noP: 0.7,
      eqRet: 0.06, eqVol: 0.16, bndRet: 0.035, bndVol: 0.06,
      inf: 0.021, fatT: true, stochInf: true, stochMort: false,
      merR: 0.015, merT: 0.015, merN: 0.015,
      allocR: 0.7, allocT: 0.7, allocN: 0.6
    },
    nSim: 2000
  }
];

// Strip undefined/Infinity/circular before JSON.stringify (some MC fields contain
// Infinity for "never depleted" sentinels which JSON.stringify renders as null).
function safeJSON(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (v === Infinity) return 999;
    if (v === -Infinity) return -999;
    if (typeof v === 'number' && Number.isNaN(v)) return null;
    return v;
  }, 2);
}

async function main() {
  console.log('Running real engine MC for ' + PROFILES.length + ' profiles...\n');
  for (const prof of PROFILES) {
    const t0 = Date.now();
    process.stdout.write('  ' + prof.id + '_' + prof.lang + ' (N=' + prof.nSim + ')... ');
    let mc;
    try {
      mc = runMC(prof.params, prof.nSim);
      if (!mc) { console.log('runMC returned null'); continue; }
    } catch (e) {
      console.log('ERROR: ' + e.message);
      continue;
    }
    const dt = Date.now() - t0;
    // Drop the per-sim raw matrix (mc.all) to keep JSON small — renderer doesn't use it.
    if (mc.all) delete mc.all;
    if (mc.fins) delete mc.fins; // raw fin distribution (per-sim) — large array
    const fname = prof.id + '_' + prof.lang + '.json';
    fs.writeFileSync(path.join(mcDir, fname), safeJSON(mc));
    const sz = Math.round(fs.statSync(path.join(mcDir, fname)).size / 1024);
    console.log('succ=' + (mc.succ != null ? Math.round(mc.succ * 100) + '%' : 'n/a')
      + '  medF=' + (mc.medF != null ? '$' + Math.round(mc.medF / 1000) + 'K' : 'n/a')
      + '  pD=' + (mc.pD ? mc.pD.length : 0) + '  rev=' + (mc.medRevData ? mc.medRevData.length : 0)
      + '  ' + sz + 'KB  (' + dt + 'ms)');
  }
  console.log('\nNext: node report/realai/build-realai-reports.js render');
}

main().catch(e => { console.error(e); process.exit(1); });
