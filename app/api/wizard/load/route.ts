// /app/api/wizard/load/route.ts
//
// Adaptive Wizard -- load a draft.
//
// GET /api/wizard/load?draftId=wd_xxx
// -> { v: 1, ok: true, draft: WizardDraft } | 404 { v: 1, ok: false, error }
//
// No auth required. The draftId is the access token (opaque UUID-based).
// If a userId is bound to the draft and the request supplies a different
// session, we still return the draft -- ownership semantics are enforced
// at the application layer (e.g. "this draft belongs to a paid Planner
// account; you must sign in to convert it"). For Phase 2.0 we keep it
// simple: knowing the draftId = access. UI never exposes draftId in URLs.

import { NextRequest, NextResponse } from "next/server";
import { getWizardDraft } from "@/lib/kv";
import type { WizardDraft, LoadResponse, ErrResponse } from "@/lib/schemas/wizard";

export const runtime = "nodejs";
export const maxDuration = 10;

function err(status: number, error: string) {
  const body: ErrResponse = { v: 1, ok: false, error };
  return NextResponse.json(body, { status });
}

export async function GET(req: NextRequest) {
  const draftId = new URL(req.url).searchParams.get("draftId");
  if (!draftId) return err(400, "Missing draftId query parameter");
  if (!/^wd_[a-zA-Z0-9-]+$/.test(draftId)) return err(400, "Invalid draftId format");

  const draft = await getWizardDraft<WizardDraft>(draftId);
  if (!draft) return err(404, "Draft not found or expired");

  const res: LoadResponse = { v: 1, ok: true, draft };
  return NextResponse.json(res);
}
