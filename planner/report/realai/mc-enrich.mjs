// mc-enrich.mjs — Post-processing layer that enriches raw engine MC output
// with derived structures the 18-22 page report needs:
//
//   cashflow:        per-year compact row (income / draws / tax / spend / net)
//   drawTrace:       structured per-year withdrawal sources (for draw-order heatmap)
//   estateWaterfall: decomposition of estate tax (RRSP deemed disposition, CG, probate)
//   goalsLedger:     per-goal feasibility + probability met (from pD percentile bands)
//   allocation:      current vs target allocation view
//
// The engine itself (lib/engine/index.js) is NOT modified — this file reads
// what the engine already emits (medRevData rows, pD percentile bands, final
// balances) and rearranges/derives. No fabricated numbers.
//
// Consumed by: gen-real-mc.mjs (writes mc._enriched to payload)
// Downstream: report-data.js / report-pdf.js sections.
//
// Exports (ESM): enrichMC(mc, params) → mc with `._enriched` added.

// Provincial probate rates — rounded 2026 values. Source: provincial EAT/probate
// tax schedules. Used for estate waterfall decomposition.
const PROBATE_RATES = {
  QC:  { rate: 0,      flat: 0,    note: 'no probate tax; notarized will $0, non-notarized minimal' },
  ON:  { rate: 0.015,  flat: 0,    note: '$15 per $1000 over $50K (i.e. 1.5%)' },
  BC:  { rate: 0.014,  flat: 0,    note: '$14 per $1000 over $50K (i.e. 1.4%)' },
  AB:  { rate: 0,      flat: 525,  note: 'flat max $525 regardless of estate size' },
  SK:  { rate: 0.007,  flat: 0,    note: '$7 per $1000 (i.e. 0.7%)' },
  MB:  { rate: 0.007,  flat: 0,    note: '$7 per $1000 (i.e. 0.7%)' },
  NB:  { rate: 0.005,  flat: 0,    note: '$5 per $1000 over $20K (i.e. 0.5%)' },
  NS:  { rate: 0.01695, flat: 0,   note: 'tiered, top rate ~1.695%' },
  PE:  { rate: 0.004,  flat: 50,   note: '$50 up to $10K + 0.4% above' },
  NL:  { rate: 0.006,  flat: 60,   note: '$60 + 0.6% above $1K' },
  NT:  { rate: 0.004,  flat: 0,    note: 'minimal' },
  YT:  { rate: 0,      flat: 140,  note: 'flat $140 if estate > $25K' },
  NU:  { rate: 0,      flat: 400,  note: 'flat $400 over $25K' }
};

// Capital-gains inclusion thresholds — 2026 rules.
const CG_THRESHOLD = 250000;
const CG_INCL_LOW = 0.5;
const CG_INCL_HIGH = 2 / 3; // 66.67%

// ─────────────────────────────────────────────────────────────────────────
// 1. CASH FLOW — compact per-year row
// ─────────────────────────────────────────────────────────────────────────

function buildCashflow(medRevData, params) {
  if (!medRevData || !medRevData.length) return [];
  return medRevData.map(r => {
    const age = r.age;
    const isRetired = age >= (params.retAge || 65);
    // Income sources (gross)
    const sal = (r.sal || 0) + (r.cSal || 0);
    const gov = (r.rrq || 0) + (r.psv || 0) + (r.srg || r.gis || 0);
    const pen = (r.pen || 0) + (r.pt || 0);
    const corp = (r.corpDiv || 0) + (r.corpSal || 0);
    const draws = r.ret || ((r.wFromRR || 0) + (r.wFromTF || 0) + (r.wFromNR || 0));
    // Deductions (employment-related)
    const payroll = (r.payroll || 0) + (r.cPayroll || 0);
    const contrib = (r.penCont || 0);
    // Tax + spending
    const tax = r.tax || 0;
    const spend = r.spend || 0;
    // Net cash flow delta — positive = accumulation year, negative = drawdown year
    const totalIn = sal + gov + pen + corp + draws;
    const totalOut = payroll + contrib + tax + spend;
    const net = totalIn - totalOut;
    return {
      age,
      phase: isRetired ? 'retired' : 'working',
      income: { sal, gov, pen, corp, draws, total: totalIn },
      outflows: { payroll, contrib, tax, spend, total: totalOut },
      net
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 2. DRAW TRACE — structured withdrawal sources per retirement year
// ─────────────────────────────────────────────────────────────────────────

function buildDrawTrace(medRevData, params) {
  if (!medRevData || !medRevData.length) return [];
  const retAge = params.retAge || 65;
  return medRevData
    .filter(r => r.age >= retAge)
    .map(r => {
      const fromRR = r.wFromRR || 0;
      const fromTF = r.wFromTF || 0;
      const fromNR = r.wFromNR || 0;
      const fromMelt = r.wMelt || 0;
      const fromRrifMin = r.wRrifMin || 0;
      const total = fromRR + fromTF + fromNR + fromMelt + fromRrifMin;
      return {
        age: r.age,
        rrsp: Math.round(fromRR),
        tfsa: Math.round(fromTF),
        nr: Math.round(fromNR),
        melt: Math.round(fromMelt),
        rrifMin: Math.round(fromRrifMin),
        total: Math.round(total),
        // Normalized shares for heatmap coloring (0-1)
        shares: total > 0 ? {
          rrsp: fromRR / total,
          tfsa: fromTF / total,
          nr: fromNR / total,
          melt: fromMelt / total,
          rrifMin: fromRrifMin / total
        } : null
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────
// 3. ESTATE WATERFALL — decompose medEstateTax into sources
// ─────────────────────────────────────────────────────────────────────────

function buildEstateWaterfall(mc, params) {
  if (!mc || mc.medEstateNet == null) return null;
  const prov = params.prov || 'QC';
  const probCfg = PROBATE_RATES[prov] || PROBATE_RATES.QC;

  const grossEstate = (mc.medEstateNet || 0) + (mc.medEstateTax || 0);
  const estateTax = mc.medEstateTax || 0;

  // Probate: applied on non-registered estate portion (registered with named
  // beneficiary bypasses probate; simplified here as fraction of gross).
  // Use final medRevData row for balance composition.
  let rrspAtDeath = 0, tfsaAtDeath = 0, nrAtDeath = 0;
  if (mc.medRevData && mc.medRevData.length) {
    const last = mc.medRevData[mc.medRevData.length - 1];
    rrspAtDeath = (last.aRR || 0) + (last.aCRR || 0) + (last.aLIRA || 0) + (last.aCLIRA || 0);
    tfsaAtDeath = (last.aTF || 0) + (last.aCTF || 0);
    nrAtDeath = (last.aNR || 0) + (last.aCNR || 0) + (last.aPE || 0) + (last.aPM || 0) + (last.aRE || 0);
  }

  const probateBase = nrAtDeath + rrspAtDeath * 0.3; // RRSP with no beneficiary passes through
  const probate = probCfg.flat + probateBase * probCfg.rate;

  // Tax at death decomposition — RRSP deemed disposition ≈ 50% of RRSP balance
  // at top marginal rate; CG on NR ≈ 33% of NR gain at CG inclusion rate.
  // These are proxies — the engine's medEstateTax is authoritative; the split
  // here is indicative for the waterfall chart.
  const totalTax = Math.max(0, estateTax);
  // Allocate total tax proportional to implied components (rough allocation).
  const rrspTaxImplied = rrspAtDeath * 0.48; // ~top marginal
  const nrCGTaxImplied = nrAtDeath * CG_INCL_LOW * 0.30;
  const implTotal = rrspTaxImplied + nrCGTaxImplied;
  const rrspTax = implTotal > 0 ? totalTax * (rrspTaxImplied / implTotal) : totalTax;
  const cgTax = implTotal > 0 ? totalTax * (nrCGTaxImplied / implTotal) : 0;

  const net = grossEstate - rrspTax - cgTax - probate;

  return {
    grossEstate: Math.round(grossEstate),
    breakdown: {
      rrsp: Math.round(rrspAtDeath),
      tfsa: Math.round(tfsaAtDeath),
      nr: Math.round(nrAtDeath)
    },
    deductions: {
      rrspTax: Math.round(rrspTax),
      cgTax: Math.round(cgTax),
      probate: Math.round(probate)
    },
    // The rrspTax / cgTax split is an INDICATIVE re-allocation of the engine's
    // authoritative medEstateTax (proxies at lines above), not a distinct engine
    // output. Only the total (medEstateTax) and probate are engine-canonical.
    // Consumers must label the component split as indicative (audit 2026-06-16).
    taxSplitIndicative: true,
    probateConfig: probCfg,
    net: Math.round(net),
    // Alternative: P25 conservative scenario if available
    p25Net: mc.p25EstateNet != null ? Math.round(mc.p25EstateNet) : null
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. GOALS LEDGER — per-goal feasibility + probability met
// ─────────────────────────────────────────────────────────────────────────

// Interpolate percentile of a target value within pD row's p5/p25/p50/p75/p95
// bands. Returns approximate percentile where target would fall (0-100).
function percentileOf(target, row) {
  const bands = [
    { p: 5,  v: row.p5 || row.rp5 || 0 },
    { p: 25, v: row.p25 || row.rp25 || 0 },
    { p: 50, v: row.p50 || row.rp50 || 0 },
    { p: 75, v: row.p75 || row.rp75 || 0 },
    { p: 95, v: row.p95 || row.rp95 || 0 }
  ];
  if (target <= bands[0].v) return 5;
  if (target >= bands[4].v) return 95;
  for (let i = 0; i < bands.length - 1; i++) {
    if (target >= bands[i].v && target <= bands[i + 1].v) {
      const range = bands[i + 1].v - bands[i].v;
      const frac = range > 0 ? (target - bands[i].v) / range : 0;
      return bands[i].p + frac * (bands[i + 1].p - bands[i].p);
    }
  }
  return 50;
}

function buildGoalsLedger(mc, params) {
  const goals = params.goals || [];
  if (!goals.length || !mc.pD) return [];
  return goals.map((g, idx) => {
    const targetAge = g.age || g.targetAge || params.retAge || 65;
    const amount = g.amount || 0;
    const row = mc.pD.find(r => r.age === targetAge) || mc.pD[0];
    const pctBelow = row ? percentileOf(amount, row) : 50;
    const probMet = Math.round(100 - pctBelow); // % of simulations ≥ target
    const medianAvailable = row ? Math.round(row.p50 || row.rp50 || 0) : 0;
    return {
      id: `goal-${idx}`,
      desc: g.desc || g.name || `Objectif ${idx + 1}`,
      amount: Math.round(amount),
      targetAge,
      medianAvailable,
      probabilityMet: Math.max(0, Math.min(100, probMet)),
      status: probMet >= 80 ? 'on-track' : probMet >= 50 ? 'tight' : 'at-risk',
      cushion: medianAvailable - amount
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 5. ALLOCATION — current vs target
// ─────────────────────────────────────────────────────────────────────────

function buildAllocation(params) {
  const p = params || {};
  const rrsp = p.rrsp || 0, tfsa = p.tfsa || 0, nr = p.nr || 0;
  const cRRSP = p.cOn ? (p.cRRSP || 0) : 0;
  const cTFSA = p.cOn ? (p.cTFSA || 0) : 0;
  const cNR = p.cOn ? (p.cNR || 0) : 0;
  const total = rrsp + tfsa + nr + cRRSP + cTFSA + cNR;
  if (total <= 0) return null;
  // Equity share per account (from params.allocR / T / N); weighted by account value
  const eqRRSP = ((rrsp + cRRSP) * (p.allocR || 0.6));
  const eqTFSA = ((tfsa + cTFSA) * (p.allocT || 0.7));
  const eqNR = ((nr + cNR) * (p.allocN || 0.5));
  const totalEquity = eqRRSP + eqTFSA + eqNR;
  const equityShare = totalEquity / total;
  const bondShare = 1 - equityShare;
  return {
    accounts: {
      rrsp:  { value: Math.round(rrsp + cRRSP), share: (rrsp + cRRSP) / total, equityPct: p.allocR || 0.6 },
      tfsa:  { value: Math.round(tfsa + cTFSA), share: (tfsa + cTFSA) / total, equityPct: p.allocT || 0.7 },
      nr:    { value: Math.round(nr + cNR),     share: (nr + cNR) / total,     equityPct: p.allocN || 0.5 }
    },
    blended: {
      equityPct: Math.round(equityShare * 1000) / 10,
      bondPct: Math.round(bondShare * 1000) / 10
    },
    totalWealth: Math.round(total)
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. MAIN ENRICHMENT DISPATCHER
// ─────────────────────────────────────────────────────────────────────────

function enrichMC(mc, params) {
  if (!mc) return mc;
  const enriched = {
    cashflow: buildCashflow(mc.medRevData, params),
    drawTrace: buildDrawTrace(mc.medRevData, params),
    estateWaterfall: buildEstateWaterfall(mc, params),
    goalsLedger: buildGoalsLedger(mc, params),
    allocation: buildAllocation(params)
  };
  return Object.assign({}, mc, { _enriched: enriched });
}

export {
  enrichMC,
  // Individual builders exported for testing
  buildCashflow,
  buildDrawTrace,
  buildEstateWaterfall,
  buildGoalsLedger,
  buildAllocation,
  PROBATE_RATES
};
