/**
 * lib/schemas/wizard.ts
 *
 * v1 JSON contract for the Adaptive Wizard API:
 *   POST /api/wizard/classify  -- Mode 1 answers -> blocks + phase
 *   POST /api/wizard/save      -- partial draft persisted to KV (90d TTL)
 *   GET  /api/wizard/load      -- retrieve saved draft
 *
 * Decisions baked in (docs/ARCH-FE-BE-SPLIT.md sec.11):
 *   - Wizard draft TTL: 90 days (decision #4).
 *   - Anonymous Bilan 360: a sessionId works as the key when no user is
 *     signed in; auth users key by userId (decision #2).
 *
 * Hand-rolled validators (no zod dep) -- same pattern as
 * lib/schemas/engine.ts.
 */

import type { Mode1Profile } from "../wizard/blocks";
import type { Phase as EnginePhase } from "./engine";

// ── Phase mapping (Mode 1 -> engine phase) ─────────────────────────────
//
// blocks.ts uses `pre-retire | transition | retired`.
// Engine uses `accum | transition | decum`.
// This map is the single conversion point.

export function mapWizardPhaseToEngine(phase: Mode1Profile["phase"]): EnginePhase {
  if (phase === "retired") return "decum";
  if (phase === "transition") return "transition";
  return "accum";
}

// ── /api/wizard/classify ───────────────────────────────────────────────

export interface ClassifyRequest {
  v: 1;
  mode1: Partial<Mode1Profile>;
}

export interface ClassifyResponse {
  v: 1;
  ok: true;
  /** Blocks the wizard should show in Mode 2, in order. */
  blocksToShow: string[];
  /** Engine-ready phase (accum / transition / decum). */
  phase: EnginePhase;
  /** Mirror Mode 1 flag for convenience -- avoids client re-deriving. */
  isCouple: boolean;
  /** Total Mode 2 fields the user will face. UI uses this for the
      "We'll ask you about ~32 more questions" preface. */
  estimatedQuestions: number;
}

// ── /api/wizard/save ───────────────────────────────────────────────────

export interface WizardDraft {
  v: 1;
  /** Stable id used as KV key. Server creates this on first save. */
  draftId: string;
  /** When the draft was first created (epoch ms). */
  createdAt: number;
  /** When the draft was last touched (epoch ms). Renews TTL. */
  updatedAt: number;
  /** Optional binding to authenticated user. Anonymous drafts key by sessionId. */
  userId?: string;
  /** Mode 1 classifier answers (may be partial during input). */
  mode1: Partial<Mode1Profile>;
  /** Mode 2 personalized field values. Field ids match blocks.ts. */
  mode2: Record<string, unknown>;
  /** Mode 3 advanced overrides (Planner SKU only). */
  mode3?: Record<string, unknown>;
  /** SKU the user is filling out for. Locks Mode 3 access. */
  sku: "bilan360" | "planner";
  /** Lang the wizard was running in when last saved. */
  lang: "fr" | "en";
}

export interface SaveRequest {
  v: 1;
  draftId?: string;
  userId?: string;
  mode1?: Partial<Mode1Profile>;
  mode2?: Record<string, unknown>;
  mode3?: Record<string, unknown>;
  sku: "bilan360" | "planner";
  lang: "fr" | "en";
}

export interface SaveResponse {
  v: 1;
  ok: true;
  draftId: string;
  updatedAt: number;
  expiresAt: number;
}

// ── /api/wizard/load ───────────────────────────────────────────────────

export interface LoadResponse {
  v: 1;
  ok: true;
  draft: WizardDraft;
}

export interface ErrResponse {
  v: 1;
  ok: false;
  error: string;
}

// ── Validators ─────────────────────────────────────────────────────────

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const VALID_PHASES = ["pre-retire", "transition", "retired"] as const;
const VALID_EMPLOYMENT = ["employed", "self-employed", "not-working", "retired"] as const;
const VALID_SKU = ["bilan360", "planner"] as const;
const VALID_LANG = ["fr", "en"] as const;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Lenient: every Mode 1 field optional. UI streams partial states. */
function validateMode1Partial(v: unknown): Result<Partial<Mode1Profile>> {
  if (v === undefined) return { ok: true, value: {} };
  if (!isObject(v)) return { ok: false, error: "mode1 must be an object" };

  const out: Partial<Mode1Profile> = {};
  if (v.phase !== undefined) {
    if (!VALID_PHASES.includes(v.phase as Mode1Profile["phase"])) {
      return { ok: false, error: `mode1.phase must be one of: ${VALID_PHASES.join(", ")}` };
    }
    out.phase = v.phase as Mode1Profile["phase"];
  }
  if (v.hasSpouse !== undefined) out.hasSpouse = Boolean(v.hasSpouse);
  if (v.employmentStatus !== undefined) {
    if (!VALID_EMPLOYMENT.includes(v.employmentStatus as Mode1Profile["employmentStatus"])) {
      return { ok: false, error: `mode1.employmentStatus must be one of: ${VALID_EMPLOYMENT.join(", ")}` };
    }
    out.employmentStatus = v.employmentStatus as Mode1Profile["employmentStatus"];
  }
  if (v.hasDebt !== undefined) out.hasDebt = Boolean(v.hasDebt);
  if (v.homeOwner !== undefined) out.homeOwner = Boolean(v.homeOwner);
  if (v.rentalCount !== undefined) {
    const n = Number(v.rentalCount);
    if (!Number.isFinite(n) || n < 0 || n > 3) {
      return { ok: false, error: "mode1.rentalCount must be 0-3" };
    }
    out.rentalCount = n as Mode1Profile["rentalCount"];
  }
  if (v.hasCCPC !== undefined) out.hasCCPC = Boolean(v.hasCCPC);
  if (v.hasDBPension !== undefined) out.hasDBPension = Boolean(v.hasDBPension);
  if (v.hasLIRA !== undefined) out.hasLIRA = Boolean(v.hasLIRA);
  if (v.hasInsurance !== undefined) out.hasInsurance = Boolean(v.hasInsurance);
  if (v.hasEstateGoals !== undefined) out.hasEstateGoals = Boolean(v.hasEstateGoals);
  return { ok: true, value: out };
}

export function validateClassifyRequest(body: unknown): Result<ClassifyRequest> {
  if (!isObject(body)) return { ok: false, error: "Body must be a JSON object" };
  if (body.v !== 1) return { ok: false, error: `Unsupported contract version: ${String(body.v)}. Expected v: 1.` };
  const m1 = validateMode1Partial(body.mode1);
  if (!m1.ok) return m1;
  return { ok: true, value: { v: 1, mode1: m1.value } };
}

export function validateSaveRequest(body: unknown): Result<SaveRequest> {
  if (!isObject(body)) return { ok: false, error: "Body must be a JSON object" };
  if (body.v !== 1) return { ok: false, error: `Unsupported contract version: ${String(body.v)}. Expected v: 1.` };
  if (!VALID_SKU.includes(body.sku as SaveRequest["sku"])) {
    return { ok: false, error: `sku must be one of: ${VALID_SKU.join(", ")}` };
  }
  if (!VALID_LANG.includes(body.lang as SaveRequest["lang"])) {
    return { ok: false, error: `lang must be one of: ${VALID_LANG.join(", ")}` };
  }
  const m1 = validateMode1Partial(body.mode1);
  if (!m1.ok) return m1;

  if (body.mode2 !== undefined && !isObject(body.mode2)) {
    return { ok: false, error: "mode2 must be an object" };
  }
  if (body.mode3 !== undefined && !isObject(body.mode3)) {
    return { ok: false, error: "mode3 must be an object" };
  }

  return {
    ok: true,
    value: {
      v: 1,
      draftId: typeof body.draftId === "string" ? body.draftId : undefined,
      userId: typeof body.userId === "string" ? body.userId : undefined,
      mode1: m1.value,
      mode2: (body.mode2 as Record<string, unknown> | undefined) ?? undefined,
      mode3: (body.mode3 as Record<string, unknown> | undefined) ?? undefined,
      sku: body.sku as SaveRequest["sku"],
      lang: body.lang as SaveRequest["lang"],
    },
  };
}

// ── TTL constant (locked decision #4: 90 days) ────────────────────────

export const WIZARD_DRAFT_TTL_SECONDS = 90 * 24 * 60 * 60;
