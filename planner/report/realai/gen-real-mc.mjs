#!/usr/bin/env node
// gen-real-mc.mjs — Run the Monte Carlo engine for the realai profiles.
//
// ENGINE SOURCE (authoritative, read before editing):
//   Uses `lib/engine/index.js` — the planner_v2.html mirror (validated, 453 tests).
//   NOT `report/realai/v3-engine.cjs` (extract of planner_v3.html).
//
// Why v2 and not v3:
//   v3 has documented P0 correctness bugs confirmed by direct repro:
//     - percentile filtering biased → p25F ≈ $7K with medF ≈ $1.4M (nonsense)
//     - medPath / medSimFinal selection logic known inconsistent (see audit §3)
//   Migration to v3 is blocked on those fixes. See V3-ENGINE-AUDIT-REPORT.md.
//
// Profiles: read from profiles.json (single source, shared with build-realai-reports.js)
//
// For each profile this script runs:
//   1. Baseline MC (base params, full nSim)
//   2. Naive comparator MC (wStrat='standard', reduced nSim) → `_naive`
//   3. Four sensitivity sweeps (returns ±1%, inflation ±1%) → `_sweeps`
//   4. Six named stress scenarios (GFC-like, stagflation, longevity, etc.) → `_stress`
//   5. Enrichment post-processing via mc-enrich.mjs → `_enriched`
//        (cashflow, drawTrace, estateWaterfall, goalsLedger, allocation)
//
// Output: realai/mc/{profile}_{lang}.json  (consumed by build-realai-reports.js)
// Run: node report/realai/gen-real-mc.mjs

import { runMC } from '../../../lib/engine/index.js';
import { enrichMC } from './mc-enrich.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mcDir = path.join(__dirname, 'mc');
const profilesPath = path.join(__dirname, 'profiles.json');

const PROFILES = JSON.parse(fs.readFileSync(profilesPath, 'utf8')).profiles;

// Sweep + stress sims use reduced count for speed — percentile stability less
// critical when comparing deltas vs baseline. 500 sims is the floor below which
// t-Student tail estimates get noisy.
const SWEEP_SIMS = 500;
const STRESS_SIMS = 500;
const NAIVE_SIMS = 1000;

// Safe JSON — Infinity sentinels are converted to 999, NaN to null.
function safeJSON(obj) {
  return JSON.stringify(obj, (k, v) => {
    if (v === Infinity) return 999;
    if (v === -Infinity) return -999;
    if (typeof v === 'number' && Number.isNaN(v)) return null;
    return v;
  }, 2);
}

// Compact MC summary — keep only the fields downstream consumers need.
// Drops per-percentile pD (kept in baseline only) and raw fins to save space.
function compactMC(mc) {
  return {
    succ: mc.succ,
    medF: mc.medF, rMedF: mc.rMedF,
    p25F: mc.p25F, p75F: mc.p75F, p5F: mc.p5F, p95F: mc.p95F,
    rP25F: mc.rP25F, rP75F: mc.rP75F, rP5F: mc.rP5F, rP95F: mc.rP95F,
    mean: mc.mean, sd: mc.sd,
    medEstateNet: mc.medEstateNet, medEstateTax: mc.medEstateTax,
    p5Ruin: mc.p5Ruin, medRuin: mc.medRuin, ruinPct: mc.ruinPct
  };
}

// 2026-05-15 — translate profile-shape rentals[] into engine-shape props[].
//   Engine reads p.props (each {on, pri, val, mb, ri}); the realai profiles
//   carry params.rentals (each {name, value, mortgage, rate, rentMonthly,
//   expenseMonthly}). Pre-fix, the rentals were silently dropped: engine
//   saw no props → reM=0/reEqM=0/reMtgM=0 → the rental narrative in cached
//   AI prose described properties the engine had no record of (visible in
//   rental_heavy_couple_fr where prose discusses "plex et condo" but
//   engine output had reM=0 across all years).
//   Mapping: pr.val = r.value; pr.mb = r.mortgage; pr.ri = annual rent
//   yield (rentMonthly*12 / value), default 0.035 if missing; pr.on=true;
//   pr.pri=false (rentals are never primary residence).
function rentalsToProps(rentals) {
  if (!Array.isArray(rentals)) return null;
  return rentals.map(r => ({
    on: true,
    pri: false,
    val: r.value || 0,
    mb: r.mortgage || 0,
    ri: (r.rentMonthly && r.value) ? (r.rentMonthly * 12 / r.value) : 0.035
  }));
}

// Run baseline MC for a profile, with all enrichments.
async function runProfile(prof) {
  // Apply rentals → props translation up front so every downstream MC
  // (baseline, naive, sweeps, stress) sees the same property set.
  const base = Object.assign({}, prof.params);
  if (!base.props || !base.props.length) {
    const props = rentalsToProps(base.rentals);
    if (props && props.length) base.props = props;
  }
  const nSim = prof.nSim || 2000;
  const t0 = Date.now();

  // 1. Baseline
  const baseline = runMC(base, nSim);
  if (!baseline) throw new Error('baseline runMC returned null');

  // 2. Naive comparator — same params but wStrat='standard' (non-optimized order)
  const naive = runMC(Object.assign({}, base, { wStrat: 'standard' }), NAIVE_SIMS);

  // 3. Four sensitivity sweeps
  const sweeps = {
    returnsUp:   runMC(Object.assign({}, base, { eqRet: (base.eqRet || 0.06) + 0.01 }), SWEEP_SIMS),
    returnsDown: runMC(Object.assign({}, base, { eqRet: (base.eqRet || 0.06) - 0.01 }), SWEEP_SIMS),
    infUp:       runMC(Object.assign({}, base, { inf:   (base.inf   || 0.021) + 0.01 }), SWEEP_SIMS),
    infDown:     runMC(Object.assign({}, base, { inf:   (base.inf   || 0.021) - 0.01 }), SWEEP_SIMS)
  };

  // 4. Six named stress scenarios
  const stress = {
    gfc2008:       runMC(Object.assign({}, base, { eqRet: (base.eqRet || 0.06) - 0.015, eqVol: (base.eqVol || 0.16) + 0.04 }), STRESS_SIMS),
    stagflation73: runMC(Object.assign({}, base, { eqRet: (base.eqRet || 0.06) - 0.02,  inf: 0.04 }), STRESS_SIMS),
    longevityPlus5: runMC(Object.assign({}, base, { deathAge: (base.deathAge || 90) + 5 }), STRESS_SIMS),
    lostDecade:    runMC(Object.assign({}, base, { eqRet: (base.eqRet || 0.06) - 0.025 }), STRESS_SIMS),
    persistentInf: runMC(Object.assign({}, base, { inf: 0.04 }), STRESS_SIMS),
    spendingUp15:  runMC(Object.assign({}, base, { retSpM: (base.retSpM || 3000) * 1.15 }), STRESS_SIMS)
  };

  // Strip heavy fields from baseline before persistence (pD/medRevData kept).
  if (baseline.all) delete baseline.all;
  if (baseline.fins) delete baseline.fins;

  // Attach supplementary runs (compacted).
  // Named `_naiveMC` for compatibility with existing report-data.js consumer
  // (previously a fabricated field; now real second-run MC with wStrat='standard').
  baseline._naiveMC = compactMC(naive);
  baseline._naiveMC.medRevData = naive.medRevData; // needed for real taxAlpha delta

  baseline._sweeps = {
    returns: { up: compactMC(sweeps.returnsUp),   down: compactMC(sweeps.returnsDown) },
    inflation: { up: compactMC(sweeps.infUp),     down: compactMC(sweeps.infDown) }
  };

  baseline._stress = Object.keys(stress).reduce((acc, k) => {
    acc[k] = compactMC(stress[k]);
    return acc;
  }, {});

  // 5. Enrichment (cashflow, drawTrace, estateWaterfall, goalsLedger, allocation)
  const enriched = enrichMC(baseline, base);

  const dt = Date.now() - t0;
  return { mc: enriched, dt };
}

async function main() {
  console.log('Running MC pipeline for ' + PROFILES.length + ' profiles...');
  console.log('  Per profile: baseline + naive + 4 sweeps + 6 stress + enrichment\n');

  for (const prof of PROFILES) {
    process.stdout.write('  ' + prof.id + '_' + prof.lang + '... ');
    try {
      const { mc, dt } = await runProfile(prof);
      const fname = prof.id + '_' + prof.lang + '.json';
      fs.writeFileSync(path.join(mcDir, fname), safeJSON(mc));
      const sz = Math.round(fs.statSync(path.join(mcDir, fname)).size / 1024);
      const succ = mc.succ != null ? Math.round(mc.succ * 100) + '%' : 'n/a';
      const naiveSucc = mc._naiveMC && mc._naiveMC.succ != null ? Math.round(mc._naiveMC.succ * 100) + '%' : 'n/a';
      const goalsN = mc._enriched && mc._enriched.goalsLedger ? mc._enriched.goalsLedger.length : 0;
      console.log('succ=' + succ + ' (naive=' + naiveSucc + ')  goals=' + goalsN + '  ' + sz + 'KB  (' + Math.round(dt / 1000) + 's)');
    } catch (e) {
      console.log('ERROR: ' + e.message);
    }
  }
  console.log('\nNext: node report/realai/build-realai-reports.js dump → send to Claude → render');
}

main().catch(e => { console.error(e); process.exit(1); });
