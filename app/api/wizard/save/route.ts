// /app/api/wizard/save/route.ts
//
// Adaptive Wizard -- save (or update) a draft.
//
// POST { v: 1, draftId?, userId?, mode1?, mode2?, mode3?, sku, lang }
// -> { v: 1, ok: true, draftId, updatedAt, expiresAt }
//
// Behavior:
//   - First save: server generates a draftId (UUID) and creates the draft.
//   - Subsequent saves: client passes draftId; server merges incoming
//     fields and refreshes the 90-day TTL.
//   - Anonymous: anyone can save with no userId. The draftId is the only
//     handle. Front-end persists draftId in localStorage.
//   - Auth (Planner SKU): client passes userId from session; server uses
//     it as part of the draft for later listing.
//
// No rate limit yet -- KV writes are cheap and the wizard naturally
// debounces. Add one when the simulator goes live.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  validateSaveRequest,
  WIZARD_DRAFT_TTL_SECONDS,
  type SaveRequest,
  type SaveResponse,
  type WizardDraft,
  type ErrResponse,
} from "@/lib/schemas/wizard";
import { getWizardDraft, setWizardDraft } from "@/lib/kv";

export const runtime = "nodejs";
export const maxDuration = 10;

function err(status: number, error: string) {
  const body: ErrResponse = { v: 1, ok: false, error };
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch { return err(400, "Invalid JSON body"); }

  const r = validateSaveRequest(body);
  if (!r.ok) return err(400, r.error);
  const v = r.value;

  const now = Date.now();
  const draftId = v.draftId || `wd_${randomUUID()}`;

  let draft: WizardDraft;
  if (v.draftId) {
    const existing = await getWizardDraft<WizardDraft>(draftId);
    if (!existing) {
      // Caller passed a draftId that doesn't exist (expired or wrong).
      // Treat as fresh save under that id rather than 404 -- this matches
      // a typical "user reopened browser, draftId still in localStorage,
      // but KV ttl expired" flow.
      draft = newDraft(draftId, now, v);
    } else {
      draft = {
        ...existing,
        updatedAt: now,
        userId: v.userId ?? existing.userId,
        sku: v.sku,
        lang: v.lang,
        mode1: { ...existing.mode1, ...(v.mode1 || {}) },
        mode2: { ...existing.mode2, ...(v.mode2 || {}) },
        mode3: v.mode3 ? { ...(existing.mode3 || {}), ...v.mode3 } : existing.mode3,
      };
    }
  } else {
    draft = newDraft(draftId, now, v);
  }

  await setWizardDraft(draftId, draft);

  const res: SaveResponse = {
    v: 1,
    ok: true,
    draftId,
    updatedAt: now,
    expiresAt: now + WIZARD_DRAFT_TTL_SECONDS * 1000,
  };
  return NextResponse.json(res);
}

function newDraft(draftId: string, now: number, v: SaveRequest): WizardDraft {
  return {
    v: 1,
    draftId,
    createdAt: now,
    updatedAt: now,
    userId: v.userId,
    mode1: v.mode1 ?? {},
    mode2: v.mode2 ?? {},
    mode3: v.mode3,
    sku: v.sku,
    lang: v.lang,
  };
}
