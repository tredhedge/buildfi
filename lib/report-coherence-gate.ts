// /lib/report-coherence-gate.ts
// ─────────────────────────────────────────────────────────────────────────────
// DATA-TRUTH gate for Bilan 360 reports (2026-07-02, SSOT consolidation).
//
// The existing QA stack (number-provenance, narration guardrail, AMF sanitizer,
// ship-gate) validates that the NARRATION faithfully reflects the DATA it was
// given. Nothing validated that the DATA ITSELF was coherent — which is how a
// physically impossible report (gis: $287,916 median ending wealth from a
// $16,660 never-drawn portfolio; $123,393 lifetime fees on $21K of assets)
// shipped as grade A+ with 0 blockers. This gate closes that hole: it re-derives
// invariants from first principles on the facts object (report-facts-360.js)
// and BLOCKS ship when they fail. It does not trust the engine, the extract,
// or the renderer.
//
// Design rules:
//  • Invariants only — no LLM, no heuristics that vary run to run.
//  • Each check is HIGH-CONFIDENCE: a blocker means "a financially literate
//    reader could prove this report wrong with a calculator".
//  • Callers decide enforcement: the corpus harness gates fullPass on it; the
//    live webhook logs in warn mode unless BF_COHERENCE_ENFORCE=1 (a gate bug
//    must never silently eat a paying customer's report — same fail-open
//    philosophy as report-ship-gate.ts, but observable).
// ─────────────────────────────────────────────────────────────────────────────

export interface CoherenceFinding {
  id: string;
  severity: "blocker" | "warning";
  message: string;
  expected?: number | string;
  actual?: number | string;
}

export interface CoherenceVerdict {
  ok: boolean;
  blockers: CoherenceFinding[];
  warnings: CoherenceFinding[];
}

const num = (v: any, d = 0): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
};

/**
 * Core data-truth invariants on the facts object D (built by
 * buildReportFacts360). Pure function of (D, params).
 */
export function evaluateReportCoherence(D: any, params: any): CoherenceVerdict {
  const blockers: CoherenceFinding[] = [];
  const warnings: CoherenceFinding[] = [];
  const push = (severity: "blocker" | "warning", id: string, message: string, expected?: any, actual?: any) =>
    (severity === "blocker" ? blockers : warnings).push({ id, severity, message, expected, actual });

  // ── C1: guaranteed-income components must sum to the total ────────────────
  const compSum = num(D.retQppPrimaryMonthly) + num(D.retOasPrimaryMonthly) + num(D.retGisMonthly) + num(D.retPenMonthly) + num(D.retSpouseGovMonthly);
  if (Math.abs(compSum - num(D.retGovMonthly)) > 2) {
    push("blocker", "C1_gov_components_sum", "Guaranteed-income component split does not sum to the total the report quotes.", num(D.retGovMonthly), compSum);
  }

  // ── C2: coverage % must equal gov ÷ target on the SAME basis ──────────────
  const tgt = num(D.householdRetTargetMonthly);
  if (tgt > 0) {
    const cov = Math.round((num(D.retGovMonthly) / tgt) * 100);
    if (Math.abs(cov - num(D.retGovCoveragePct)) > 1.5) {
      push("blocker", "C2_coverage_definition", "Coverage % does not equal guaranteed income ÷ spending target.", cov, num(D.retGovCoveragePct));
    }
  }

  // ── C3: THE gap must equal target − guaranteed (single basis) ─────────────
  const gapExpected = Math.max(0, tgt - num(D.retGovMonthly));
  if (Math.abs(gapExpected - num(D.gapMonthly)) > 2) {
    push("blocker", "C3_gap_reconciliation", "Strategic-synthesis gap does not reconcile with spending − guaranteed income.", gapExpected, num(D.gapMonthly));
  }

  // ── C4: withdrawal rate must be on a sane basis ────────────────────────────
  const wd = D.withdrawalRatePct;
  if (wd != null) {
    if (num(wd) < 0 || num(wd) > 25) {
      push("blocker", "C4_withdrawal_range", "Withdrawal-rate KPI outside plausible bounds — wrong denominator basis.", "0–25%", num(wd));
    } else if (num(wd) > 15) {
      push("warning", "C4_withdrawal_high", "Withdrawal rate above 15% — verify the basis before shipping.", "≤15%", num(wd));
    }
    // Funding-needs reconciliation (2026-07-02 calibration): first-year
    // withdrawals must be explainable by the report's own data — spending +
    // taxes − guaranteed income (same row, same age), plus forced RRIF
    // minimums, plus a settle-mechanics tolerance. Comparing wd against the
    // STEADY-STATE coverage % was an age-mixing false positive (veryold:
    // coverage 101% at the later plateau, real gap + taxes + forced RRIF at
    // 78). Withdrawals beyond every visible funding need = phantom draws.
    const wdAllowance = num(D.wdFundingNeedAnnualAtRet) + num(D.rrifMinAnnualAtRet)
      + Math.max(3000, 0.02 * num(D.retYearBalance));
    if (num(D.wdAnnualRealAtRet) > wdAllowance) {
      push("blocker", "C4_withdrawal_vs_coverage", "First-year withdrawals exceed every funding need visible in the report (spending + taxes − guaranteed income + forced RRIF minimums).", Math.round(wdAllowance), num(D.wdAnnualRealAtRet));
    }
  }

  // ── C5: percentile ordering ────────────────────────────────────────────────
  const p5 = num(D.rP5F), p25 = num(D.rP25F), p50 = num(D.rMedF), p75 = num(D.rP75F);
  if (p5 > p25 + 1 || p25 > p50 + 1 || p50 > p75 + 1) {
    push("blocker", "C5_percentile_order", "Final-wealth percentiles are not ordered (P5 ≤ P25 ≤ P50 ≤ P75).", "p5≤p25≤p50≤p75", `${p5}/${p25}/${p50}/${p75}`);
  }

  // ── C6: ending-wealth plausibility (inflow-aware real-CAGR bound) ──────────
  // Median ending wealth cannot exceed what today's portfolio plus EVERY visible
  // inflow (contributions, reinvested gov surplus, property sales, business sale)
  // could reach at a deliberately generous 8% REAL return. This is the invariant
  // that catches the gis-class engine defect ($16.6K → $288K real with zero
  // visible inflows) that every narration-level gate is blind to.
  const yrs = Math.max(1, num(D.deathAge, 95) - num(D.age, 40));
  const yrsToRet = Math.max(0, num(D.retAge, 65) - num(D.age, 40));
  const contribAnnual = num(params?.rrspC) + num(params?.tfsaC) + num(params?.nrC);
  const saleInflows = (Array.isArray(D.properties) ? D.properties : [])
    .filter((p: any) => num(p.saleAge) > 0)
    .reduce((s: number, p: any) => s + num(p.equity), 0)
    + num(D.business?.salePrice) + num(D.business?.retained);
  const inflows = contribAnnual * yrsToRet + num(D.surplusLifetimeReal) + saleInflows;
  const upper = (num(D.retBal) + inflows + 1000) * Math.pow(1.08, yrs);
  if (p50 > upper) {
    push("blocker", "C6_implausible_growth", "Median ending wealth exceeds what today's portfolio plus every visible inflow could reach at 8% real — engine output not explainable by the report's own data.", Math.round(upper), p50);
  }

  // ── C7: lifetime fees vs AUM ───────────────────────────────────────────────
  // Fees cannot exceed MER × the LARGEST portfolio value × horizon (generous:
  // as if the portfolio sat at its peak the whole time). Catches the old
  // "MER × terminal wealth × full retirement" formula class.
  const maxAUM = Math.max(num(D.retBal), num(D.retYearBalance), ...(Array.isArray(D.pdSeries) ? D.pdSeries.map((r: any) => num(r.p50)) : [0]));
  const feeCap = num(D.merWeighted) * maxAUM * yrs * 1.2 + 500;
  if (num(D.feeCostLifetime) > feeCap) {
    push("blocker", "C7_fee_overstatement", "Lifetime fee cost exceeds MER × peak AUM × horizon — fee formula on the wrong basis.", Math.round(feeCap), num(D.feeCostLifetime));
  }

  // ── C8: snapshot rows internally consistent ───────────────────────────────
  for (const r of (Array.isArray(D.decumTable) ? D.decumTable : [])) {
    const short = Math.max(0, num(r.spendMonthly) - num(r.govMonthly) - num(r.portWithdrawMonthly));
    if (Math.abs(short - num(r.shortfallMonthly)) > 1) {
      push("blocker", "C8_snapshot_row", `Snapshot row at age ${r.age}: shortfall ≠ spending − guaranteed − withdrawal.`, short, num(r.shortfallMonthly));
      break;
    }
  }

  // ── C9/C10: cross-metric sanity (warnings) ────────────────────────────────
  const estateCap = p50 + num(D.reEquity) + num(D.lifeInsBenefit) + num(D.cLifeInsBenefit) + num(D.business?.salePrice) + 50000;
  if (num(D.medEstate) > estateCap) {
    push("warning", "C9_estate_vs_final", "Median estate exceeds median final wealth + property equity + insurance — verify estate basis.", Math.round(estateCap), num(D.medEstate));
  }
  if (num(D.successPct) >= 90 && D.medDepletionAge != null) {
    push("warning", "C10_success_vs_depletion", "≥90% success but the median path depletes — verify success definition vs chart.", "no median depletion", D.medDepletionAge);
  }

  return { ok: blockers.length === 0, blockers, warnings };
}

// ─── Rendered-HTML locale lint (ALL text nodes, not narration-only) ──────────
// The number-provenance format check only saw AI narration; the 96-occurrence
// EN "287,916 $" defect lived in renderer-emitted FACT lines and KPIs. This
// lints the FULL visible text of the final HTML.
function visibleText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ");
}

export function lintReportHtmlLocale(html: string, lang: "fr" | "en"): CoherenceFinding[] {
  const out: CoherenceFinding[] = [];
  const vis = visibleText(html);
  const grab = (re: RegExp) => (vis.match(re) || []).slice(0, 5).map((s) => s.trim());
  if (lang === "en") {
    const postfix = grab(/\d[   ]?\$(?!\d)/g);
    if (postfix.length) out.push({ id: "L1_en_postfix_dollar", severity: "blocker", message: `EN report uses FR postfix currency (${postfix.join(", ")}) — must be $X prefix.`, actual: postfix.join(", ") });
    const frDec = grab(/\d,\d{1,2}[   ]?%/g);
    if (frDec.length) out.push({ id: "L2_en_fr_decimal", severity: "blocker", message: `EN report uses FR decimal comma in percentages (${frDec.join(", ")}).`, actual: frDec.join(", ") });
  } else {
    const prefix = grab(/\$[   ]?\d/g);
    if (prefix.length) out.push({ id: "L3_fr_prefix_dollar", severity: "blocker", message: `FR report uses EN prefix currency (${prefix.join(", ")}) — must be X $ suffix.`, actual: prefix.join(", ") });
    const dotDec = grab(/\d\.\d{1,2}[   ]?%/g);
    if (dotDec.length) out.push({ id: "L4_fr_dot_decimal", severity: "blocker", message: `FR report uses dot decimals in percentages (${dotDec.join(", ")}).`, actual: dotDec.join(", ") });
  }
  return out;
}

// ─── Structure lint: mandatory compliance blocks ─────────────────────────────
export function lintReportStructure(html: string): CoherenceFinding[] {
  const out: CoherenceFinding[] = [];
  if (!/data-bf-disclaimer="1"/.test(String(html || ""))) {
    out.push({ id: "S1_missing_disclaimer", severity: "blocker", message: "Report is missing the mandatory non-advice / AI-disclosure block." });
  }
  if (!/class="assumptions"/.test(String(html || ""))) {
    out.push({ id: "S2_missing_assumptions", severity: "blocker", message: "Report is missing the assumptions table (returns, inflation, MER, horizon)." });
  }
  return out;
}

/**
 * One-call wrapper: data invariants + locale lint + structure lint.
 * Sets `D._dataBlocked = true` when any blocker fires, so downstream ship
 * logic (run-pipeline.mjs pass 6 already gates on _dataBlocked) engages
 * without further wiring.
 */
export function runCoherenceGate(D: any, params: any, html: string, lang: "fr" | "en"): CoherenceVerdict {
  const core = evaluateReportCoherence(D, params);
  const blockers = [...core.blockers, ...lintReportHtmlLocale(html, lang), ...lintReportStructure(html)];
  const verdict: CoherenceVerdict = { ok: blockers.length === 0, blockers, warnings: core.warnings };
  if (!verdict.ok && D && typeof D === "object") D._dataBlocked = true;
  return verdict;
}
