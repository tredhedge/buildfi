// /app/api/wizard/classify/route.ts
//
// Adaptive Wizard -- Mode 1 classifier.
//
// POST { v: 1, mode1: Partial<Mode1Profile> }
// -> { v: 1, ok: true, blocksToShow, phase, isCouple, estimatedQuestions }
//
// No auth required. The classifier is read-only -- it computes the Mode 2
// shape from Mode 1 answers without persisting anything. The wizard saves
// the answers separately via /api/wizard/save.
//
// Edge runtime: this is a cheap pure-CPU lookup with no IO.

import { NextRequest, NextResponse } from "next/server";
import {
  validateClassifyRequest,
  mapWizardPhaseToEngine,
  type ClassifyResponse,
  type ErrResponse,
} from "@/lib/schemas/wizard";
import {
  MODE1_DEFAULT,
  filterBlocksForProfile,
  countFieldsFor,
} from "@/lib/wizard/blocks";

export const runtime = "edge";

function err(status: number, error: string) {
  const body: ErrResponse = { v: 1, ok: false, error };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err(400, "Invalid JSON body"); }

  const r = validateClassifyRequest(body);
  if (!r.ok) return err(400, r.error);

  // Merge partial Mode 1 over defaults so showIf() predicates always have
  // something to evaluate. Missing answers fall back to MODE1_DEFAULT
  // (e.g. assume single, no kids, no rentals).
  const profile = { ...MODE1_DEFAULT, ...r.value.mode1 };

  const blocks = filterBlocksForProfile(profile);
  const blocksToShow = blocks.map((b) => b.id);
  const estimatedQuestions = countFieldsFor(profile);
  const phase = mapWizardPhaseToEngine(profile.phase);

  const ok: ClassifyResponse = {
    v: 1,
    ok: true,
    blocksToShow,
    phase,
    isCouple: profile.hasSpouse,
    estimatedQuestions,
  };
  return NextResponse.json(ok);
}
