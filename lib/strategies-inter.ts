// /lib/strategies-inter.ts
// ══════════════════════════════════════════════════════════════════════
// buildfi.ca Intermediaire — 5-Strategies Engine
// ══════════════════════════════════════════════════════════════════════
// 1:1 port from quiz-intermediaire.html lines 2174-2216
// New module for the Intermediaire tier — does not exist in Essentiel.
//
// Exports:
//   run5Strategies()    — runs 5 retirement strategies via MC simulation
//   calcMinViableReturn() — binary search for minimum equity return at 50% success
//   calcCostOfDelay()   — estimates FV cost of delaying savings by one year
//
// Used by: /api/webhook (Intermediaire path) → report-html-inter
// ══════════════════════════════════════════════════════════════════════

import { runMC } from "./engine";

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

/** MC engine parameter bag — loosely typed to match the JS engine. */
interface MCParams {
  age: number;
  retAge: number;
  deathAge: number;
  rrspC?: number;
  tfsaC?: number;
  nrC?: number;
  rrsp?: number;
  tfsa?: number;
  nr?: number;
  allocR?: number;
  merR?: number;
  merT?: number;
  merN?: number;
  eqRet?: number;
  prov?: string;
  qppAge?: number;
  oasAge?: number;
  melt?: boolean;
  meltTgt?: number;
  [key: string]: unknown;
}

/** Result returned for each strategy from run5Strategies(). */
export interface StrategyResult {
  key: string;
  fr: string;
  en: string;
  succ: number;
  medF: number;
  medEstateTax: number;
  medEstateNet: number;
  p25F: number;
  p75F: number;
}

/** Internal strategy definition. */
interface StrategyDef {
  key: string;
  fr: string;
  en: string;
  p: Partial<MCParams>;
}

// ────────────────────────────────────────────────────────────────────
// run5Strategies
// ────────────────────────────────────────────────────────────────────

export function run5Strategies(baseParams: MCParams): StrategyResult[] {
  var strats: StrategyDef[] = [
    { key: "statu_quo",  fr: "Statu quo",               en: "Status quo",          p: {} },
    { key: "meltdown",   fr: "Décaissement REER",        en: "RRSP meltdown",       p: { melt: true, meltTgt: Math.round(58523 * Math.pow(1.021, Math.max(0, baseParams.retAge - baseParams.age))) } },
    { key: "qpp_70",     fr: "RRQ/RPC à 70 ans",        en: "QPP/CPP at age 70",   p: { qppAge: 70, oasAge: 70 } },
    { key: "low_mer",    fr: "Frais réduits",            en: "Low-fee portfolio",   p: { merR: 0.0018, merT: 0.0018, merN: 0.0018 } },
    { key: "save_more",  fr: "+300 $/mois d'épargne",   en: "+$300/month savings", p: { rrspC: (baseParams.rrspC || 0) + 150, tfsaC: (baseParams.tfsaC || 0) + 150 } },
  ];

  return strats.map(function (s): StrategyResult {
    var p: MCParams = Object.assign({}, baseParams, s.p);
    Object.keys(p).forEach(function (k) { if (p[k] === undefined) delete p[k]; });
    var mc = runMC(p, 1000);
    return {
      key: s.key, fr: s.fr, en: s.en,
      succ: mc ? mc.succ : 0,
      medF: mc ? (mc.rMedF || mc.medF) : 0,
      medEstateTax: mc ? mc.medEstateTax : 0,
      medEstateNet: mc ? mc.medEstateNet : 0,
      p25F: mc ? (mc.rP25F || mc.p25F) : 0,
      p75F: mc ? (mc.rP75F || mc.p75F) : 0,
    };
  });
}

// ────────────────────────────────────────────────────────────────────
// calcMinViableReturn — binary search for 50% success equity return
// ────────────────────────────────────────────────────────────────────

export function calcMinViableReturn(baseParams: MCParams): number {
  var p: MCParams = Object.assign({}, baseParams);
  var lo = 0.01, hi = 0.15, mid: number, succMid: number, itr = 0;
  while (hi - lo > 0.002 && itr < 12) {
    mid = (lo + hi) / 2;
    p.eqRet = mid;
    var mc = runMC(p, 1000);
    succMid = mc ? mc.succ : 0;
    if (succMid >= 0.5) hi = mid; else lo = mid;
    itr++;
  }
  return Math.round((lo + hi) / 2 * 1000) / 10;
}

// ────────────────────────────────────────────────────────────────────
// calcCostOfDelay — FV cost of delaying savings by one year
// ────────────────────────────────────────────────────────────────────

export function calcCostOfDelay(baseParams: MCParams): number {
  var lostContrib = (baseParams.rrspC || 0) + (baseParams.tfsaC || 0) + (baseParams.nrC || 0);
  var yrsToGrow = baseParams.deathAge - baseParams.retAge;
  var expRet = (baseParams.allocR || 0.7) * 0.07 + (1 - (baseParams.allocR || 0.7)) * 0.035 - (baseParams.merR || 0.015);
  // rrspC/tfsaC/nrC are already annual (translators store monthly*12), no *12 needed
  return Math.round(lostContrib * Math.pow(1 + expRet, yrsToGrow));
}
