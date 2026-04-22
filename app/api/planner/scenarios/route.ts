// /app/api/planner/scenarios/route.ts
// CRUD for Planner user's saved scenarios (up to 5 per profile).
// GET  ?token=xxx              → list scenarios
// POST { token, name, data }   → save (create or update by name)
// DELETE ?token=xxx&id=yyy     → delete by id

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getExpertProfileByToken, updateExpertProfile } from "@/lib/kv";
import type { SavedProfile } from "@/lib/kv";

export const runtime = "nodejs";

const MAX_SCENARIOS = 5;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") || "";
  const result = await getExpertProfileByToken(token);
  if (!result) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  return NextResponse.json({ ok: true, scenarios: result.profile.profiles || [] });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({}));
  const { token, name, data, id } = body as { token?: string; name?: string; data?: Record<string, unknown>; id?: string };
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  if (!name || typeof name !== "string" || name.length > 80) {
    return NextResponse.json({ error: "Invalid scenario name" }, { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return NextResponse.json({ error: "Missing scenario data" }, { status: 400 });
  }

  const result = await getExpertProfileByToken(token);
  if (!result) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const { email, profile } = result;

  const profiles: SavedProfile[] = [...(profile.profiles || [])];
  const now = new Date().toISOString();

  if (id) {
    // Update existing scenario
    const idx = profiles.findIndex((p) => p.id === id);
    if (idx < 0) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
    profiles[idx] = { ...profiles[idx], name, data, lastUsed: now };
  } else {
    // Create new scenario
    if (profiles.length >= MAX_SCENARIOS) {
      return NextResponse.json(
        {
          error: "scenario_limit_reached",
          message: `Maximum ${MAX_SCENARIOS} scenarios reached. Delete one before saving another.`,
          limit: MAX_SCENARIOS,
        },
        { status: 400 }
      );
    }
    profiles.push({
      id: randomUUID(),
      name,
      data,
      created: now,
      lastUsed: now,
    });
  }

  await updateExpertProfile(email, { profiles });
  return NextResponse.json({ ok: true, scenarios: profiles });
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const token = req.nextUrl.searchParams.get("token") || "";
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });
  if (!id) return NextResponse.json({ error: "Missing scenario id" }, { status: 400 });

  const result = await getExpertProfileByToken(token);
  if (!result) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  const { email, profile } = result;

  const profiles = (profile.profiles || []).filter((p) => p.id !== id);
  await updateExpertProfile(email, { profiles });
  return NextResponse.json({ ok: true, scenarios: profiles });
}
