/**
 * lib/schemas/engine.ts
 *
 * v1 JSON contract for /api/simulate.
 *
 * Front-end posts: { v: 1, params, options }
 * Back-end returns: { v: 1, ok: true, mc, derived, charts, meta } | { v: 1, ok: false, error }
 *
 * The contract is versioned. Bumping `v` requires explicit support on both
 * sides; old versions stay supported until the deprecation date in
 * docs/ARCH-FE-BE-SPLIT.md.
 *
 * No external dependencies (zod intentionally omitted to keep bundle lean).
 * The hand-rolled validator below mirrors the same shape and returns the
 * first error encountered (fail-fast for clear API messages).
 */

// ── Engine params (canonical shape passed to lib/engine/index.js#runMC) ──

export type Province =
  | "QC" | "ON" | "BC" | "AB" | "SK" | "MB"
  | "NB" | "NS" | "PE" | "NL" | "NT" | "YT" | "NU";

export type Sex = "M" | "F";

export type Phase = "accum" | "transition" | "decum";

export type SKU = "bilan360" | "planner";

/**
 * EngineParams — the input shape consumed by lib/engine/runMC.
 *
 * Field names match the existing engine (planner_v3.html-derived) so the
 * server-side engine module stays a drop-in. Many fields are optional;
 * the engine fills sane defaults.
 */
export interface EngineParams {
  // Identity / required
  age: number;
  retAge: number;
  sex: Sex;
  prov: Province;
  deathAge?: number;

  // Couple
  cAge?: number;
  cSex?: Sex;
  cRetAge?: number;
  cIncome?: number;
  cRrsp?: number;
  cTfsa?: number;
  cNr?: number;
  cLira?: number;
  cMonthlyContrib?: number;
  cPenType?: "none" | "db" | "dc";
  cPenM?: number;
  cPenIdx?: number;
  cQppAge?: number;
  cOasAge?: number;
  pensionSplitting?: boolean;

  // Income / contributions
  income?: number;
  monthlyContrib?: number;
  retIncome?: number;     // annual retirement spend target
  retSpM?: number;        // monthly retirement spend target (engine uses this)

  // Account balances
  rrsp?: number;
  tfsa?: number;
  nr?: number;             // non-registered
  nrACB?: number;          // ACB tracking for capital-gains
  lira?: number;
  fhsa?: number;

  // Properties
  homeValue?: number;
  mortgageBal?: number;
  rental1Value?: number;
  rental1Income?: number;
  rental2Value?: number;
  rental2Income?: number;

  // CCPC (incorporated business owner)
  bizOn?: boolean;
  bizCorp?: number;
  bizActive?: number;
  bizPassive?: number;

  // Government benefits
  qppAge?: number;
  oasAge?: number;
  qppFactor?: number;

  // Pension
  penType?: "none" | "db" | "dc";
  penM?: number;
  penIdx?: number;

  // Returns / inflation (advanced overlay only)
  retEq?: number;
  retBd?: number;
  inf?: number;
  glide?: number;

  // RSU / equity comp
  rsuShares?: number;
  rsuPrice?: number;

  // Catch-all for anything we haven't surfaced explicitly yet. Keep
  // the door open while the wizard expands; engine will ignore unknown keys.
  [k: string]: unknown;
}

export interface SimulateOptions {
  /** Number of MC paths. Clamped server-side to [1000, 5000]. */
  paths?: number;
  /** When true, run with a fixed seed (debug + tests). */
  deterministic?: boolean;
  /** When true, also runs Anthropic AI narration (slower; consumes a credit). */
  withAI?: boolean;
}

export interface SimulateRequest {
  v: 1;
  /** Optional wizard draft id (KV key under wizard:{id}) for save+resume. */
  wizardId?: string;
  params: EngineParams;
  options?: SimulateOptions;
}

// ── Response shapes ─────────────────────────────────────────────────────

export interface MCSummary {
  successRate: number;
  grade: string;
  medianWealth: number;
  percentiles: {
    p5: number; p25: number; p50: number; p75: number; p95: number;
  };
  liquidWealth: {
    median: number; p5: number; p25: number; p75: number; p95: number;
  };
  estate: {
    medianTax: number;
    medianNet: number;
    p5Net: number; p25Net: number; p75Net: number; p95Net: number;
  };
  ruin: {
    medianAge: number | null;
    pct: number;
    p5Age: number | null;
    p10Age: number | null;
  };
  // Bulky time-series + aux blobs — front-end charts hydrate from these.
  yearByYear: unknown;
  medRevData: unknown;
  sensitivity: unknown;
  medPath: unknown;
  histogram: unknown;
  deathVsRuin: unknown;
  gk: {
    on: true;
    avgCuts: number;
    avgRaises: number;
    avgSpend: number;
    p5MinSpend: number;
  } | null;
}

export interface SimulateResponseOk {
  v: 1;
  ok: true;
  mc: MCSummary;
  meta: {
    paths: number;
    durationMs: number;
    cacheHit: boolean;
    paramHash: string;
    engineVersion: string;
    constantsYear: number;
    /** When this response is acceptable to reuse from cache (epoch ms). */
    cacheUntil: number;
  };
}

export interface SimulateResponseErr {
  v: 1;
  ok: false;
  error: string;
  /** Optional field-level hints for the wizard to highlight inputs. */
  fields?: Record<string, string>;
}

export type SimulateResponse = SimulateResponseOk | SimulateResponseErr;

// ── Validator (no zod) ──────────────────────────────────────────────────

const VALID_PROV: Province[] = [
  "QC", "ON", "BC", "AB", "SK", "MB", "NB", "NS", "PE", "NL", "NT", "YT", "NU",
];

export type ValidationResult =
  | { ok: true; value: SimulateRequest }
  | { ok: false; error: string };

/**
 * validateSimulateRequest — fail-fast, returns the first error.
 *
 * Intentionally lenient on engine-internal fields (defaults are filled by
 * runMC). Strict only on identity (age/retAge/sex/prov/deathAge) which the
 * engine cannot recover from.
 */
export function validateSimulateRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const b = body as Record<string, unknown>;

  if (b.v !== 1) {
    return { ok: false, error: `Unsupported contract version: ${String(b.v)}. Expected v: 1.` };
  }

  if (typeof b.params !== "object" || b.params === null) {
    return { ok: false, error: "Missing params object" };
  }
  const p = b.params as Record<string, unknown>;

  const age = Number(p.age);
  if (!Number.isFinite(age) || age < 18 || age > 85) {
    return { ok: false, error: "params.age must be a number between 18 and 85" };
  }
  const retAge = Number(p.retAge);
  if (!Number.isFinite(retAge) || retAge <= age) {
    return { ok: false, error: "params.retAge must be greater than params.age" };
  }
  if (retAge > 85) {
    return { ok: false, error: "params.retAge must be <= 85" };
  }
  if (p.sex !== "M" && p.sex !== "F") {
    return { ok: false, error: "params.sex must be 'M' or 'F'" };
  }
  if (typeof p.prov !== "string" || !VALID_PROV.includes(p.prov as Province)) {
    return { ok: false, error: `params.prov must be one of: ${VALID_PROV.join(", ")}` };
  }

  // Default deathAge if absent (engine also defaults; we set here so the
  // hash is stable across "client sent it" vs "client omitted it").
  if (p.deathAge == null) {
    p.deathAge = 90;
  } else {
    const da = Number(p.deathAge);
    if (!Number.isFinite(da) || da <= age) {
      return { ok: false, error: "params.deathAge must be greater than params.age" };
    }
  }

  // Options
  let options: SimulateOptions = {};
  if (b.options !== undefined) {
    if (typeof b.options !== "object" || b.options === null) {
      return { ok: false, error: "options must be an object" };
    }
    const o = b.options as Record<string, unknown>;
    if (o.paths !== undefined) {
      const n = Number(o.paths);
      if (!Number.isFinite(n)) {
        return { ok: false, error: "options.paths must be a number" };
      }
      options.paths = n;
    }
    if (o.deterministic !== undefined) options.deterministic = Boolean(o.deterministic);
    if (o.withAI !== undefined) options.withAI = Boolean(o.withAI);
  }

  return {
    ok: true,
    value: {
      v: 1,
      wizardId: typeof b.wizardId === "string" ? b.wizardId : undefined,
      params: p as unknown as EngineParams,
      options,
    },
  };
}

// ── Param hashing for cache key ─────────────────────────────────────────

/**
 * stableHashParams — produces a deterministic hex hash of engine params.
 *
 * Sorts keys before serializing so `{a:1,b:2}` and `{b:2,a:1}` collide.
 * Uses Node crypto (route runs on Node runtime, not Edge).
 */
export async function stableHashParams(params: EngineParams, paths: number): Promise<string> {
  const sorted = canonicalize({ ...params, _paths: paths });
  const { createHash } = await import("crypto");
  return createHash("sha256").update(sorted).digest("hex").slice(0, 32);
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}
