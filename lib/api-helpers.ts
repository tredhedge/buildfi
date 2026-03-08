// /lib/api-helpers.ts
// Shared helpers for Expert API routes (simulate, optimize, compare)
// Auth, rate limiting, validation, and MC result formatting

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, type AuthResult } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const ENGINE_VERSION = "2026-02-27";
export const CONSTANTS_YEAR = 2026;

// ── Auth + Rate Limit ────────────────────────────────────────

export interface AuthenticatedContext {
  email: string;
  token: string;
  remaining: number;
}

export async function authenticateAndRateLimit(
  req: NextRequest,
  type: "export" | "recalc"
): Promise<AuthenticatedContext | NextResponse> {
  const auth: AuthResult = await verifyToken(req);
  if (!auth.authenticated || !auth.email) {
    return NextResponse.json(
      { success: false, error: auth.error || "Unauthorized" },
      { status: 401 }
    );
  }

  const token =
    req.headers.get("authorization")?.slice(7) ||
    new URL(req.url).searchParams.get("token") ||
    "";

  const rl = await checkRateLimit(token, type);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: rl.reason || "Rate limit exceeded",
        retryAfterMs: rl.retryAfterMs,
        remaining: rl.remaining,
      },
      { status: 429 }
    );
  }

  return { email: auth.email, token, remaining: rl.remaining };
}

// ── Grade ────────────────────────────────────────────────────

export function gradeFromSuccess(succ: number): string {
  // Canonical 8-level scale — matches report-html.js, report-html-inter.js, report-html-expert.ts
  if (succ >= 0.95) return "A+";
  if (succ >= 0.85) return "A";
  if (succ >= 0.75) return "B+";
  if (succ >= 0.65) return "B";
  if (succ >= 0.55) return "C+";
  if (succ >= 0.45) return "C";
  if (succ >= 0.35) return "D";
  return "F";
}

// ── Validate base params ─────────────────────────────────────

const REQUIRED_PARAMS = ["age", "retAge", "sex", "prov"] as const;

export function validateBaseParams(
  params: Record<string, unknown>
): string | null {
  for (const key of REQUIRED_PARAMS) {
    if (params[key] == null) return `Missing required param: ${key}`;
  }
  const age = Number(params.age);
  const retAge = Number(params.retAge);
  if (isNaN(age) || age < 18 || age > 85) return "age must be 18-85";
  if (isNaN(retAge) || retAge <= age) return "retAge must be greater than age";
  if (retAge > 85) return "retAge must be <= 85";
  const validProvs = [
    "QC", "ON", "BC", "AB", "SK", "MB", "NB", "NS", "PE", "NL", "NT", "YT", "NU",
  ];
  if (!validProvs.includes(String(params.prov))) return `Invalid prov: ${params.prov}`;
  if (!["M", "F"].includes(String(params.sex))) return `Invalid sex: ${params.sex}`;
  return null;
}

// ── Format MC results ────────────────────────────────────────

export function formatMCResults(mc: Record<string, any>): Record<string, any> {
  const discFinal = mc.discFinal || 1;
  return {
    successRate: mc.succ,
    grade: gradeFromSuccess(mc.succ),
    medianWealth: mc.rMedF,
    // Engine provides p5/p25/p50/p75/p95 — p10/p90 are not computed and omitted
    // to avoid misrepresenting precision to users making retirement decisions.
    percentiles: {
      p5: mc.rP5F,
      p25: mc.rP25F,
      p50: mc.rMedF,
      p75: mc.rP75F,
      p95: mc.rP95F,
    },
    liquidWealth: {
      median: mc.rLiqMedF ?? mc.rMedF,
      p5: mc.rLiqP5 ?? mc.rP5F,
      p25: mc.liqP25 ? mc.liqP25 / discFinal : mc.rP25F,
      p75: mc.liqP75 ? mc.liqP75 / discFinal : mc.rP75F,
      p95: mc.liqP95 ? mc.liqP95 / discFinal : mc.rP95F,
    },
    estate: {
      medianTax: mc.medEstateTax,
      medianNet: mc.medEstateNet,
      p5Net: mc.p5EstateNet,
      p25Net: mc.p25EstateNet,
      p75Net: mc.p75EstateNet,
      p95Net: mc.p95EstateNet,
    },
    ruin: {
      medianAge: mc.medRuin,
      pct: mc.ruinPct,
      p5Age: mc.p5Ruin,
      p10Age: mc.p10Ruin,
    },
    yearByYear: mc.pD,
    medRevData: mc.medRevData,
    sensitivity: mc.sens,
    medPath: mc.medPath,
    gk: mc.gkOn
      ? {
          on: true,
          avgCuts: mc.gkAvgCuts,
          avgRaises: mc.gkAvgRaises,
          avgSpend: mc.gkAvgSpend,
          p5MinSpend: mc.gkP5MinSpend,
        }
      : null,
    histogram: mc.histogram,
    deathVsRuin: mc.deathVsRuin,
  };
}

// ── Format compact MC results (for optimizer/compare) ────────

export function formatMCCompact(mc: Record<string, any>): {
  successRate: number;
  grade: string;
  medianWealth: number;
  p25Wealth: number;
  p75Wealth: number;
  medianEstateTax: number;
  medianEstateNet: number;
  ruinPct: number;
  medianRuinAge: number | null;
} {
  return {
    successRate: mc.succ,
    grade: gradeFromSuccess(mc.succ),
    medianWealth: mc.rMedF,
    p25Wealth: mc.rP25F,
    p75Wealth: mc.rP75F,
    medianEstateTax: mc.medEstateTax,
    medianEstateNet: mc.medEstateNet,
    ruinPct: mc.ruinPct,
    medianRuinAge: mc.medRuin ?? null,
  };
}
