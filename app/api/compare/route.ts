// /app/api/compare/route.ts
// Expert variant comparison endpoint — "Tester une decision"
// Runs 2-3 variants side by side, each at 1000 sims

import { NextRequest, NextResponse } from "next/server";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  validateBaseParams,
  formatMCCompact,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseParams, variants, sims: rawSims } = body;

    if (!baseParams || typeof baseParams !== "object") {
      return NextResponse.json(
        { success: false, error: "Missing baseParams object" },
        { status: 400 }
      );
    }

    if (!Array.isArray(variants) || variants.length < 2 || variants.length > 3) {
      return NextResponse.json(
        { success: false, error: "variants must be an array of 2-3 items" },
        { status: 400 }
      );
    }

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v || typeof v !== "object" || !v.label || typeof v.overrides !== "object") {
        return NextResponse.json(
          { success: false, error: `Variant ${i}: must have label (string) and overrides (object)` },
          { status: 400 }
        );
      }
    }

    const sims = Math.max(1000, Math.min(Number(rawSims) || 1000, 5000));

    // Auth + rate limiting
    const authResult = await authenticateAndRateLimit(req, "recalc");
    if (authResult instanceof NextResponse) return authResult;

    const validationError = validateBaseParams(baseParams);
    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const start = Date.now();

    // Run each variant
    const results: {
      label: string;
      successRate: number;
      grade: string;
      medianWealth: number;
      p25Wealth: number;
      p75Wealth: number;
      medianEstateTax: number;
      medianEstateNet: number;
      ruinPct: number;
      medianRuinAge: number | null;
    }[] = [];

    for (const v of variants) {
      const mergedParams = Object.assign({}, baseParams, v.overrides);
      const mc = runMC(mergedParams, sims);

      if (!mc) {
        results.push({
          label: v.label,
          successRate: 0,
          grade: "F",
          medianWealth: 0,
          p25Wealth: 0,
          p75Wealth: 0,
          medianEstateTax: 0,
          medianEstateNet: 0,
          ruinPct: 1,
          medianRuinAge: null,
        });
        continue;
      }

      results.push({
        label: v.label,
        ...formatMCCompact(mc),
      });
    }

    const durationMs = Date.now() - start;
    console.log(
      `[compare] ${variants.length} variants × ${sims} sims in ${durationMs}ms for ${authResult.email}`
    );

    return NextResponse.json({
      success: true,
      variants: results,
      meta: {
        sims,
        durationMs,
        variantCount: variants.length,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
      },
    });
  } catch (err) {
    console.error("[compare] Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Comparison failed",
      },
      { status: 500 }
    );
  }
}
