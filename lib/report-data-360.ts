// /lib/report-data-360.ts
// Short, stable data adapter for Bilan 360 report rendering.

type AnyRec = Record<string, any>;

function n(v: any, d = 0): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function realDeflator(baseAge: number, age: number, inf: number): number {
  return 1 / Math.pow(1 + inf, Math.max(0, age - baseAge));
}

function pickPD(row: AnyRec, key: string, fallback = 0): number {
  const v = n(row?.[key], NaN);
  if (Number.isFinite(v)) return v;
  return fallback;
}

function toRealPortfolioFromMedRow(row: AnyRec, baseAge: number, inf: number): number {
  const nominal =
    n(row?.aRR) +
    n(row?.aTF) +
    n(row?.aNR) +
    n(row?.aDC) +
    n(row?.aPE) +
    n(row?.aPM) +
    n(row?.aLIRA) +
    n(row?.aCRR) +
    n(row?.aCTF) +
    n(row?.aCNR);
  return Math.round(nominal * realDeflator(baseAge, n(row?.age, baseAge), inf));
}

function nearestRowByAge(rows: AnyRec[], age: number): AnyRec | null {
  if (!rows.length) return null;
  let best = rows[0];
  let bestDist = Math.abs(n(best.age) - age);
  for (const r of rows) {
    const d = Math.abs(n(r.age) - age);
    if (d < bestDist) {
      best = r;
      bestDist = d;
    }
  }
  return best;
}

function runSucc(extra: AnyRec | null | undefined): number | null {
  if (!extra || extra.succ == null) return null;
  return clamp(Math.round(n(extra.succ) * 100), 0, 100);
}

/**
 * Canonical client-facing figures the report narrates — the SINGLE SOURCE OF TRUTH
 * (docs/REPORT-MODEL-CONSOLIDATION.md). The prompt DATA block + slot hints (and, in
 * step 3, the renderer-agnostic QA) all read these instead of re-deriving, which is
 * what kills the number-drift bug class. Expressions mirror the slot hints in
 * ai-prompt-360.ts EXACTLY so the figures are byte-identical.
 */
export function buildReportModelCanon(
  D: AnyRec,
  params: AnyRec,
  stratData?: Array<{ key: string; succ: number; medF: number }>
): AnyRec {
  const rp: AnyRec = params._report || {};
  const totalWealth =
    (rp.rrsp ?? params.rrsp ?? 0) + (rp.tfsa ?? params.tfsa ?? 0) + (rp.nr ?? params.nr ?? 0) +
    (rp.cRRSP ?? params.cRRSP ?? 0) + (rp.cTFSA ?? params.cTFSA ?? 0) + (rp.cNR ?? params.cNR ?? 0);
  const taxDiffPerYear = (D.sal || 0) > 0
    ? Math.round(D.sal * Math.abs((D.taxCurrentEffective || 0) - (D.taxRetirementEffective || 0)) / 100)
    : 0;
  // Household-aware figures (2026-06-18 blind-review fix): for couples, replacement and the
  // spending target must be HOUSEHOLD, and gov coverage must be STEADY-STATE (post-CPP/OAS,
  // incl. spouse). These come pre-computed from the extract (D.*) — single-sourced here so
  // they land in the guardrail's allowed-number pool and the narrator cites them, not the
  // bridge-snapshot $0 / individual figures.
  const householdIncome = D.householdIncome ?? (D.sal || 0);
  const householdTargetAnnual = Math.round((D.householdRetTargetMonthly ?? (D.retSpM || 0)) * 12);
  const canon: AnyRec = {
    income: D.sal || 0,
    householdIncome,
    retTargetAnnual: householdTargetAnnual,
    householdRetTargetMonthly: Math.round(D.householdRetTargetMonthly ?? (D.retSpM || 0)),
    retSpendReduction: Math.max(0, householdIncome - householdTargetAnnual),
    replacementPct: D.householdReplacementPct ?? ((D.sal || 0) > 0 ? Math.round(((D.retSpM || 0) * 12) / D.sal * 100) : 0),
    retGovMonthly: Math.round(D.retGovMonthly || 0),
    retGovCoveragePct: Math.round(D.retGovCoveragePct || 0),
    // Verified steady-state gov component split (sums to retGovMonthly) — lets the narrator cite
    // QPP/OAS/GIS/spouse parts without the guardrail flagging them as foreign numbers.
    retQppPrimaryMonthly: Math.round(D.retQppPrimaryMonthly || 0),
    retOasPrimaryMonthly: Math.round(D.retOasPrimaryMonthly || 0),
    retGisMonthly: Math.round(D.retGisMonthly || 0),
    retPenMonthly: Math.round(D.retPenMonthly || 0),
    retSpouseGovMonthly: Math.round(D.retSpouseGovMonthly || 0),
    retSteadyAge: Math.round(D.retSteadyAge || 0),
    bridgeYears: Math.round(D.bridgeYears || 0),
    bridgeCostReal: Math.round(D.bridgeCostReal || 0),
    taxDiffPerYear,
    rrspSharePct: totalWealth > 0 ? Math.round(((params.rrsp ?? 0) / totalWealth) * 100) : 0,
    gkMaxCutPct: Math.round((params.gkMaxCut ?? 0.20) * 100),
    gkMaxCutMonthly: Math.round((params.gkMaxCut ?? 0.20) * (D.retSpM || 0)), // spendFlexHint asks to "translate into monthly dollar impact"
    withdrawalRatePct: D.withdrawalRatePct, // narrated in every phase but DATA.spend is ACCUM/TRANSITION-only
    reviewMonths: 12, // the next_horizon hint always closes on a 12-month check-in
    mcScenarios: 5000, // narration may cite the simulation count ("5,000 scenarios")
  };
  if (params.cOn) {
    canon.partnerSavingsTotal = (params.cRRSP ?? 0) + (params.cTFSA ?? 0) + (params.cNR ?? 0);
  }
  if (stratData && stratData.length > 0) {
    // stratDesc asks the narrator for the "median wealth difference vs statu_quo".
    const sq = stratData.find((s) => s.key === "statu_quo") || stratData[0];
    const sqMed = Math.max(0, sq.medF);
    canon.stratDeltasVsStatuQuo = stratData.map((s) => Math.abs(Math.max(0, s.medF) - sqMed));
  }
  return canon;
}

export function buildBuildFiData(
  mc: AnyRec,
  params: AnyRec,
  phase: string,
  lang: string = "fr",
  extraRuns: AnyRec = {}
): AnyRec {
  const inf = n(params?.inf, 0.021);
  const baseAge = Math.round(n(params?.age, 40));
  const retAge = Math.round(n(params?.retAge, 65));
  const deathAge = Math.round(n(params?.deathAge, 95));

  const pD = Array.isArray(mc?.pD) ? mc.pD : [];
  const rd = Array.isArray(mc?.medRevData) ? mc.medRevData : [];

  const points = pD.map((r: AnyRec) => ({
    age: Math.round(n(r.age, baseAge)),
    p5: Math.max(0, Math.round(pickPD(r, "rp5", pickPD(r, "p5", 0)))),
    p25: Math.max(0, Math.round(pickPD(r, "rp25", pickPD(r, "p25", 0)))),
    p50: Math.max(0, Math.round(pickPD(r, "rp50", pickPD(r, "p50", 0)))),
    p75: Math.max(0, Math.round(pickPD(r, "rp75", pickPD(r, "p75", 0)))),
    p95: Math.max(0, Math.round(pickPD(r, "rp95", pickPD(r, "p95", 0)))),
  }));

  const incomeByAge = rd.map((r: AnyRec) => {
    const age = Math.round(n(r.age, baseAge));
    const def = realDeflator(baseAge, age, inf);
    // HOUSEHOLD gov: primary + spouse (cQpp/cOas/cGis now emitted by the engine). Without
    // the spouse terms the income chart showed ~1/3 of the householded prose figure (couples).
    const govMonthly = Math.round((n(r.rrq) + n(r.psv) + n(r.gis) + n(r.pen) + n(r.cQpp) + n(r.cOas) + n(r.cGis)) * def / 12);
    const spendMonthly = Math.round(n(r.spend) * def / 12);
    const portWithdrawMonthly = Math.max(0, Math.round(n(r.ret) * def / 12));
    const portfolio = Math.max(0, toRealPortfolioFromMedRow(r, baseAge, inf));
    return { age, govMonthly, spendMonthly, portWithdrawMonthly, portfolio };
  });

  const milestoneAges: number[] = [];
  const start = baseAge;
  const stop = Math.min(105, Math.max(deathAge, baseAge));
  for (let a = start; a <= stop; a += 5) milestoneAges.push(a);
  if (!milestoneAges.includes(stop)) milestoneAges.push(stop);

  const decumRows = milestoneAges.map((age) => {
    const pdRow = nearestRowByAge(pD, age);
    const revRow = nearestRowByAge(rd, age);
    const p50 = Math.max(0, Math.round(pickPD(pdRow || {}, "rp50", pickPD(pdRow || {}, "p50", 0))));
    const def = realDeflator(baseAge, age, inf);
    const govAnnualNom = n(revRow?.rrq) + n(revRow?.psv) + n(revRow?.gis) + n(revRow?.pen) + n(revRow?.cQpp) + n(revRow?.cOas) + n(revRow?.cGis); // household (incl. spouse)
    const govMonthly = Math.round(govAnnualNom * def / 12);
    const spendMonthly = Math.round(n(revRow?.spend) * def / 12);
    let portMonthly = Math.max(0, Math.round(n(revRow?.ret) * def / 12));
    if (p50 <= 0) portMonthly = 0;
    const coveredMonthly = govMonthly + portMonthly;
    const shortfallMonthly = Math.max(0, spendMonthly - coveredMonthly);
    return {
      age,
      p50Portfolio: p50,
      govMonthly,
      portWithdrawMonthly: portMonthly,
      spendMonthly,
      coveredMonthly,
      shortfallMonthly,
    };
  });

  const startPD = nearestRowByAge(pD, baseAge) || {};
  const retPD = nearestRowByAge(pD, retAge) || startPD;
  const p50Now = Math.max(0, Math.round(pickPD(startPD, "rp50", pickPD(startPD, "p50", n(params?.rrsp) + n(params?.tfsa) + n(params?.nr)))));
  const p50Ret = Math.max(0, Math.round(pickPD(retPD, "rp50", pickPD(retPD, "p50", p50Now))));

  const stress = {
    baseline: clamp(Math.round(n(mc?.succ) * 100), 0, 100),
    crash08: runSucc(extraRuns?.mcStressCrash08),
    stagflation: runSucc(extraRuns?.mcStressStagflation),
    prolonged: runSucc(extraRuns?.mcStressProlonged),
  };

  return {
    meta: {
      version: "b360-short-v1",
      lang: lang === "en" ? "en" : "fr",
      phase,
      generatedAt: new Date().toISOString(),
    },
    profile: {
      age: baseAge,
      retAge,
      deathAge,
      prov: params?.prov || "QC",
      cOn: !!params?.cOn,
      cAge: Math.round(n(params?.cAge)),
    },
    headline: {
      successPct: clamp(Math.round(n(mc?.succ) * 100), 0, 100),
      p50Now,
      p50Ret,
      p50Final: Math.max(0, Math.round(n(mc?.rMedF, n(mc?.medF, 0)))),
    },
    chart: {
      startAge: baseAge,
      endAge: stop,
      points,
    },
    incomeByAge,
    decumRows,
    stress,
    cppTiming: {
      age60: runSucc(extraRuns?.mcC60),
      age65: runSucc(extraRuns?.mcC65),
      age70: runSucc(extraRuns?.mcC70),
    },
    debug: {
      nSims: Array.isArray(mc?.fins) ? mc.fins.length : 0,
      hasPD: pD.length > 0,
      hasMedRev: rd.length > 0,
    },
  };
}
