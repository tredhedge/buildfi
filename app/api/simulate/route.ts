// /app/api/simulate/route.ts
// Expert MC simulation endpoint — runs Monte Carlo and returns full results
// Used by: Simulator UI (S4), export pipeline (S6)

import { NextRequest, NextResponse } from "next/server";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  validateBaseParams,
  formatMCResults,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { params, sims: rawSims } = body;

    if (!params || typeof params !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing params object" },
        { status: 400 }
      );
    }

    // Clamp sims: minimum 1000, maximum 5000
    const sims = Math.max(1000, Math.min(Number(rawSims) || 1000, 5000));

    // Auth + rate limiting (export-tier for 5000 sims, recalc otherwise)
    const authResult = await authenticateAndRateLimit(
      req,
      sims >= 5000 ? "export" : "recalc"
    );
    if (authResult instanceof NextResponse) return authResult;

    // Validate required params
    const validationError = validateBaseParams(params);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    // Run MC simulation
    const start = Date.now();
    const mc = runMC(params, sims);
    const durationMs = Date.now() - start;

    if (!mc) {
      return NextResponse.json(
        { success: false, error: "MC engine returned null" },
        { status: 500 }
      );
    }

    console.log(
      `[simulate] ${sims} sims in ${durationMs}ms for ${authResult.email}`
    );

    return NextResponse.json({
      success: true,
      results: formatMCResults(mc),
      meta: {
        sims,
        durationMs,
        remaining: authResult.remaining,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
      },
    });
  } catch (err) {
    console.error("[simulate] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Simulation failed",
      },
      { status: 500 }
    );
  }
}
