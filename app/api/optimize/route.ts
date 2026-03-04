// /app/api/optimize/route.ts
// Expert 8-axis optimizer — ported from planner.html launchOptimizer()
// 2-pass algorithm: sweep all combos (1000 sims) → confirm top 50 (1000 sims)
// Scoring: 40% success + 25% wealth + 20% tax efficiency + 15% estate

import { NextRequest, NextResponse } from "next/server";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  validateBaseParams,
  gradeFromSuccess,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";

export const maxDuration = 120;
export const runtime = "nodejs";

// ── Types ────────────────────────────────────────────────────

interface Combo {
  retAge: number;
  strat: string;
  melt: boolean;
  meltTgt: number;
  qppAge: number;
  oasAge: number;
  splitP: number;
  retSpM: number;
  ptM: number;
  ptYrs: number;
}

interface Pass1Result {
  c: Combo;
  succ: number;
  medF: number;
  estTax: number;
  estNet: number;
}

interface ConfirmedResult extends Pass1Result {
  taxEff: number;
  score: number;
}

// ── Lever labels ─────────────────────────────────────────────

const LEVER_LABELS: Record<string, { fr: string; en: string }> = {
  retAge: { fr: "Age retraite", en: "Retirement age" },
  strat: { fr: "Strategie retrait", en: "Withdrawal strategy" },
  melt: { fr: "Meltdown REER", en: "RRSP meltdown" },
  qppAge: { fr: "Age RRQ/RPC", en: "QPP/CPP age" },
  oasAge: { fr: "Age PSV/OAS", en: "OAS age" },
  splitP: { fr: "Fractionnement", en: "Pension splitting" },
  retSpM: { fr: "Depenses retraite", en: "Retirement spending" },
  ptWork: { fr: "Travail partiel", en: "Part-time work" },
};

// ── Main handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { params } = body;

    if (!params || typeof params !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing params object" },
        { status: 400 }
      );
    }

    // Auth + rate limiting (recalc tier)
    const authResult = await authenticateAndRateLimit(req, "recalc");
    if (authResult instanceof NextResponse) return authResult;

    const validationError = validateBaseParams(params);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const start = Date.now();

    // ── Run baseline ───────────────────────────────────────
    const baseMC = runMC(params, 1000) as Record<string, any> | null;
    if (!baseMC) {
      return NextResponse.json(
        { success: false, error: "Baseline MC failed" },
        { status: 500 }
      );
    }
    const baseSc = baseMC.succ;
    const baseMedF = baseMC.rMedF || baseMC.medF || 0;

    // ── Build combo grid (ported from planner.html:13893-13910) ──

    const age = Number(params.age);
    const retAge = Number(params.retAge);
    const retSpM = Number(params.retSpM) || 0;
    const cOn = !!params.cOn;

    // Axis values — reduced grid for couple profiles to prevent timeout
    const isLargeGrid = cOn; // Couple profiles double the splitP axis
    const rAges: number[] = [];
    const rRange = isLargeGrid ? 2 : 3; // ±2 for couples, ±3 for solo
    for (let ra = Math.max(age + 1, retAge - rRange); ra <= Math.min(75, retAge + rRange); ra++) {
      rAges.push(ra);
    }

    const strats = ["optimal", "optimized", "tfsaFirst"];

    const mOpts: { on: boolean; tgt: number }[] = [
      { on: false, tgt: 0 },
      { on: true, tgt: 58523 },
      { on: true, tgt: 114750 },
    ];
    const rSpY = Math.round(retSpM * 12 * 0.8);
    if (!isLargeGrid && rSpY > 10000 && rSpY !== 58523 && rSpY !== 114750) {
      mOpts.push({ on: true, tgt: rSpY });
    }

    const qAs = isLargeGrid ? [60, 65, 70] : [60, 63, 65, 67, 70];
    const oAs = isLargeGrid ? [65, 70] : [65, 67, 70];
    const spOs = cOn ? [0, 0.50] : [0];

    const spLevels = isLargeGrid
      ? [retSpM, Math.round(retSpM * 0.85)]
      : [retSpM, Math.round(retSpM * 0.9), Math.round(retSpM * 0.8)];
    const ptLevels = isLargeGrid
      ? [{ m: 0, y: 0 }, { m: 3000, y: 5 }]
      : [{ m: 0, y: 0 }, { m: 2000, y: 2 }, { m: 3000, y: 5 }];

    // Generate all combos
    const combos: Combo[] = [];
    for (const rA of rAges) {
      for (const st of strats) {
        for (const mo of mOpts) {
          for (const qA of qAs) {
            for (const oA of oAs) {
              // Skip impractical: OAS before QPP when QPP > 67
              if (oA < qA && qA > 67) continue;
              for (const sp of spOs) {
                for (const spM of spLevels) {
                  for (const ptL of ptLevels) {
                    combos.push({
                      retAge: rA,
                      strat: st,
                      melt: mo.on,
                      meltTgt: mo.tgt,
                      qppAge: qA,
                      oasAge: oA,
                      splitP: sp,
                      retSpM: spM,
                      ptM: ptL.m,
                      ptYrs: ptL.y,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    // Cap combos to prevent timeout — randomly sample if too many
    const MAX_COMBOS = 5000;
    if (combos.length > MAX_COMBOS) {
      // Fisher-Yates shuffle, then truncate
      for (let i = combos.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [combos[i], combos[j]] = [combos[j], combos[i]];
      }
      combos.length = MAX_COMBOS;
    }

    // Adaptive sims: if too many combos, use fewer sims per pass
    const simsP1 = combos.length > 3000 ? 1000 : 1000;

    // ── Pass 1: sweep ────────────────────────────────────────
    const pass1: Pass1Result[] = [];
    let skippedCount = 0;
    for (const c of combos) {
      try {
        const pp = Object.assign({}, params, {
          retAge: c.retAge,
          wStrat: c.strat,
          melt: c.melt,
          meltTgt: c.meltTgt,
          qppAge: c.qppAge,
          oasAge: c.oasAge,
          split: c.splitP > 0,
          splitP: c.splitP,
          retSpM: c.retSpM,
          ptM: c.ptM,
          ptYrs: c.ptYrs,
        });
        const r = runMC(pp, simsP1) as Record<string, any> | null;
        if (r) {
          pass1.push({
            c,
            succ: r.succ,
            medF: r.rMedF || r.medF || 0,
            estTax: r.medEstateTax || 0,
            estNet: r.medEstateNet || 0,
          });
        } else {
          skippedCount++;
        }
      } catch (_) {
        skippedCount++;
      }
    }

    // Sort pass 1 by success then wealth
    pass1.sort((a, b) => b.succ - a.succ || b.medF - a.medF);

    // ── Pass 2: confirm top 50 ──────────────────────────────
    const top50 = pass1.slice(0, 50);
    const confirmed: ConfirmedResult[] = [];

    for (const t of top50) {
      try {
        const pp = Object.assign({}, params, {
          retAge: t.c.retAge,
          wStrat: t.c.strat,
          melt: t.c.melt,
          meltTgt: t.c.meltTgt,
          qppAge: t.c.qppAge,
          oasAge: t.c.oasAge,
          split: t.c.splitP > 0,
          splitP: t.c.splitP,
          retSpM: t.c.retSpM,
          ptM: t.c.ptM,
          ptYrs: t.c.ptYrs,
        });
        const r2 = runMC(pp, 1000) as Record<string, any> | null;
        if (r2) {
          const totalIncome =
            (r2.medTotalIncome as number) ||
            retSpM * 12 * Math.max(1, (params.deathAge || 90) - t.c.retAge);
          const taxEff =
            totalIncome > 0
              ? 1 - ((r2.medTotalTax || r2.medEstateTax || 0) as number) / totalIncome
              : 0.5;
          confirmed.push({
            ...t,
            succ: r2.succ,
            medF: r2.rMedF || r2.medF || 0,
            estTax: r2.medEstateTax || 0,
            estNet: r2.medEstateNet || 0,
            taxEff,
            score: 0, // calculated below
          });
        }
      } catch (_) {
        // Skip
      }
    }

    if (!confirmed.length) {
      return NextResponse.json({
        success: true,
        baseline: { successRate: baseSc, medianWealth: baseMedF },
        top10: [],
        levers: [],
        meta: {
          totalTested: combos.length,
          pass2Count: 0,
          skippedCount,
          durationMs: Date.now() - start,
        },
      });
    }

    // ── Scoring (40/25/20/15) ────────────────────────────────
    const vals = (fn: (r: ConfirmedResult) => number) => confirmed.map(fn);
    const hi = (a: number[]) => Math.max(...a);
    const lo = (a: number[]) => Math.min(...a);
    const nm = (v: number, mn: number, mx: number) =>
      mx > mn ? (v - mn) / (mx - mn) : 0.5;

    const scs = vals((r) => r.succ);
    const mfs = vals((r) => r.medF);
    const tes = vals((r) => r.taxEff);
    const ens = vals((r) => r.estNet);

    for (const r of confirmed) {
      r.score =
        nm(r.succ, lo(scs), hi(scs)) * 0.4 +
        nm(r.medF, lo(mfs), hi(mfs)) * 0.25 +
        nm(r.taxEff, lo(tes), hi(tes)) * 0.2 +
        nm(r.estNet, lo(ens), hi(ens)) * 0.15;
    }

    confirmed.sort((a, b) => b.score - a.score);

    // ── Lever analysis ───────────────────────────────────────
    const axes = [
      "retAge", "strat", "melt", "qppAge", "oasAge", "splitP", "retSpM", "ptWork",
    ];

    const levers: {
      axis: string;
      label_fr: string;
      label_en: string;
      currentValue: string;
      bestValue: string;
      delta_pp: number;
    }[] = [];

    for (const d of axes) {
      const byVal: Record<string, number[]> = {};
      for (const r of confirmed) {
        let k: string;
        if (d === "melt") k = r.c.melt ? "On" : "Off";
        else if (d === "splitP")
          k = r.c.splitP > 0 ? Math.round(r.c.splitP * 100) + "%" : "Off";
        else if (d === "strat") k = r.c.strat;
        else if (d === "retSpM") k = String(r.c.retSpM);
        else if (d === "ptWork")
          k = r.c.ptM > 0 ? `${r.c.ptM}/m${r.c.ptYrs ? ` x ${r.c.ptYrs}y` : ""}` : "Off";
        else k = String((r.c as unknown as Record<string, unknown>)[d]);

        if (!byVal[k]) byVal[k] = [];
        byVal[k].push(r.succ);
      }

      let bestKey: string | null = null;
      let bestAvg = -1;
      for (const [k, arr] of Object.entries(byVal)) {
        const avg = arr.reduce((s, v) => s + v, 0) / arr.length;
        if (avg > bestAvg) {
          bestAvg = avg;
          bestKey = k;
        }
      }

      const delta = Math.round((bestAvg - baseSc) * 100);
      const labels = LEVER_LABELS[d] || { fr: d, en: d };

      // Current value for display
      let currentVal: string;
      if (d === "retAge") currentVal = String(retAge);
      else if (d === "strat") currentVal = String(params.wStrat || "optimal");
      else if (d === "melt") currentVal = params.melt ? "On" : "Off";
      else if (d === "qppAge") currentVal = String(params.qppAge || 65);
      else if (d === "oasAge") currentVal = String(params.oasAge || 65);
      else if (d === "splitP")
        currentVal = params.split ? Math.round((params.splitP || 0) * 100) + "%" : "Off";
      else if (d === "retSpM") currentVal = String(retSpM);
      else if (d === "ptWork")
        currentVal = params.ptM > 0 ? `${params.ptM}/m${params.ptYrs ? ` x ${params.ptYrs}y` : ""}` : "Off";
      else currentVal = "?";

      levers.push({
        axis: d,
        label_fr: labels.fr,
        label_en: labels.en,
        currentValue: currentVal,
        bestValue: bestKey || currentVal,
        delta_pp: delta,
      });
    }

    // Sort levers by absolute delta, descending
    levers.sort((a, b) => Math.abs(b.delta_pp) - Math.abs(a.delta_pp));

    // ── Format top 10 ────────────────────────────────────────
    const top10 = confirmed.slice(0, 10).map((r, i) => ({
      rank: i + 1,
      params_changed: {
        retAge: r.c.retAge,
        strat: r.c.strat,
        melt: r.c.melt,
        meltTgt: r.c.meltTgt,
        qppAge: r.c.qppAge,
        oasAge: r.c.oasAge,
        splitP: r.c.splitP,
        retSpM: r.c.retSpM,
        ptM: r.c.ptM,
        ptYrs: r.c.ptYrs,
      },
      successRate: r.succ,
      grade: gradeFromSuccess(r.succ),
      medianWealth: Math.round(r.medF),
      score: Math.round(r.score * 1000) / 1000,
      delta_pp: Math.round((r.succ - baseSc) * 100),
    }));

    const durationMs = Date.now() - start;
    console.log(
      `[optimize] ${combos.length} combos, ${confirmed.length} confirmed in ${durationMs}ms for ${authResult.email}`
    );

    return NextResponse.json({
      success: true,
      baseline: {
        successRate: baseSc,
        grade: gradeFromSuccess(baseSc),
        medianWealth: Math.round(baseMedF),
      },
      top10,
      levers,
      meta: {
        totalTested: combos.length,
        pass2Count: confirmed.length,
        skippedCount,
        durationMs,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
      },
    });
  } catch (err) {
    console.error("[optimize] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Optimization failed",
      },
      { status: 500 }
    );
  }
}
