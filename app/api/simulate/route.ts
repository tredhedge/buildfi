// /app/api/simulate/route.ts
//
// v1 JSON contract — see lib/schemas/engine.ts and docs/ARCH-FE-BE-SPLIT.md.
//
// Request:  { v: 1, params, options?: { paths, deterministic, withAI } }
// Response: { v: 1, ok: true, mc, meta } | { v: 1, ok: false, error }
//
// Flow:
//   1. Auth + rate limit (existing helper).
//   2. Validate request against v1 contract (lib/schemas/engine.ts).
//   3. Hash params -> KV cache lookup. Hit -> return cached + cacheHit=true.
//   4. Miss -> runMC, format, store under sim:v1:{hash} (10 min TTL), return.
//
// Engine source: lib/engine/index.js (already canonical server engine).
// The legacy non-versioned shape (`{ params, sims }`) is still accepted and
// auto-upgraded to v1 internally to keep existing callers working during
// the FE/BE split (Phase 0). New callers MUST send v: 1.

import { NextRequest, NextResponse } from "next/server";
import { runMC } from "@/lib/engine";
import {
  authenticateAndRateLimit,
  formatMCResults,
  ENGINE_VERSION,
  CONSTANTS_YEAR,
} from "@/lib/api-helpers";
import {
  validateSimulateRequest,
  stableHashParams,
  type SimulateResponse,
  type SimulateResponseErr,
} from "@/lib/schemas/engine";
import { getSimCache, setSimCache, SIM_CACHE_TTL } from "@/lib/kv";

export const maxDuration = 60;
export const runtime = "nodejs";

const MIN_PATHS = 1000;
const MAX_PATHS = 5000;
const DEFAULT_PATHS = 1000;

function err(status: number, error: string, fields?: Record<string, string>) {
  const body: SimulateResponseErr = { v: 1, ok: false, error, ...(fields ? { fields } : {}) };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();

    // Backwards-compat: legacy callers send `{ params, sims }`. Auto-wrap.
    const body = raw && typeof raw === "object" && raw.v === undefined && raw.params
      ? { v: 1, params: raw.params, options: { paths: raw.sims } }
      : raw;

    const validation = validateSimulateRequest(body);
    if (!validation.ok) return err(400, validation.error);
    const { params, options } = validation.value;

    const paths = Math.max(
      MIN_PATHS,
      Math.min(Number(options?.paths) || DEFAULT_PATHS, MAX_PATHS),
    );

    // Auth + rate limit. 5000-path runs spend the export tier; smaller runs
    // the recalc tier (cheaper bucket).
    const authResult = await authenticateAndRateLimit(
      req,
      paths >= MAX_PATHS ? "export" : "recalc",
    );
    if (authResult instanceof NextResponse) return authResult;

    const paramHash = await stableHashParams(params, paths);

    // Cache lookup — skip when withAI is requested (AI re-runs always count).
    if (!options?.withAI) {
      const cached = await getSimCache<{ mc: unknown; durationMs: number }>(paramHash);
      if (cached) {
        const body: SimulateResponse = {
          v: 1,
          ok: true,
          mc: cached.mc as SimulateResponse extends { mc: infer M } ? M : never,
          meta: {
            paths,
            durationMs: cached.durationMs,
            cacheHit: true,
            paramHash,
            engineVersion: ENGINE_VERSION,
            constantsYear: CONSTANTS_YEAR,
            cacheUntil: Date.now() + SIM_CACHE_TTL * 1000,
          },
        };
        return NextResponse.json(body);
      }
    }

    // Run MC. Shallow clone — runMC mutates params during sanitization.
    const start = Date.now();
    const mc = runMC({ ...params }, paths);
    const durationMs = Date.now() - start;

    if (!mc) return err(500, "MC engine returned null");

    const formatted = formatMCResults(mc);

    // Cache miss -> store. Best-effort; KV failure must not break the response.
    if (!options?.withAI) {
      try {
        await setSimCache(paramHash, { mc: formatted, durationMs });
      } catch (cacheErr) {
        console.error("[simulate] cache set failed", cacheErr);
      }
    }

    console.log(
      `[simulate] v1 paths=${paths} ms=${durationMs} hash=${paramHash.slice(0, 8)} for ${authResult.email}`,
    );

    const ok: SimulateResponse = {
      v: 1,
      ok: true,
      mc: formatted as SimulateResponse extends { mc: infer M } ? M : never,
      meta: {
        paths,
        durationMs,
        cacheHit: false,
        paramHash,
        engineVersion: ENGINE_VERSION,
        constantsYear: CONSTANTS_YEAR,
        cacheUntil: options?.withAI ? Date.now() : Date.now() + SIM_CACHE_TTL * 1000,
      },
    };
    return NextResponse.json(ok);
  } catch (e) {
    console.error("[simulate] error", e);
    return err(500, e instanceof Error ? e.message : "Simulation failed");
  }
}
