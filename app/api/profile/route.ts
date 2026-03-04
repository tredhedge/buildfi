// /app/api/profile/route.ts
// Expert saved profile management — rename and delete
// Auth: Bearer token (same pattern as other Expert API routes)

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { updateExpertProfile } from "@/lib/kv";

// ── PUT — Rename a saved profile ─────────────────────────────────

export async function PUT(req: NextRequest) {
  const auth = await verifyToken(req);
  if (!auth.authenticated || !auth.profile || !auth.email) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: 401 }
    );
  }

  let body: { profileId?: string; newName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { profileId, newName } = body;
  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json(
      { error: "profileId is required" },
      { status: 400 }
    );
  }
  if (!newName || typeof newName !== "string" || newName.trim().length === 0) {
    return NextResponse.json(
      { error: "newName is required and must be non-empty" },
      { status: 400 }
    );
  }
  if (newName.trim().length > 60) {
    return NextResponse.json(
      { error: "newName must be 60 characters or fewer" },
      { status: 400 }
    );
  }

  const profile = auth.profile;
  const idx = profile.profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const updatedProfiles = profile.profiles.map((p) =>
    p.id === profileId ? { ...p, name: newName.trim() } : p
  );

  const updated = await updateExpertProfile(auth.email, {
    profiles: updatedProfiles,
    changelog: [
      ...profile.changelog,
      {
        date: now,
        action: "profile_renamed",
        details: { profileId, oldName: profile.profiles[idx].name, newName: newName.trim() },
      },
    ],
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    profile: updatedProfiles[idx],
  });
}

// ── DELETE — Remove a saved profile ──────────────────────────────

export async function DELETE(req: NextRequest) {
  const auth = await verifyToken(req);
  if (!auth.authenticated || !auth.profile || !auth.email) {
    return NextResponse.json(
      { error: auth.error || "Unauthorized" },
      { status: 401 }
    );
  }

  // DELETE body: read from URL search params (more standard) or body
  let profileId: string | null = null;

  // Try URL search params first
  const url = new URL(req.url);
  profileId = url.searchParams.get("profileId");

  // Fallback to JSON body
  if (!profileId) {
    try {
      const body = await req.json();
      profileId = body.profileId || null;
    } catch {
      // No body — profileId must come from query params
    }
  }

  if (!profileId || typeof profileId !== "string") {
    return NextResponse.json(
      { error: "profileId is required (query param or JSON body)" },
      { status: 400 }
    );
  }

  const profile = auth.profile;
  const target = profile.profiles.find((p) => p.id === profileId);
  if (!target) {
    return NextResponse.json(
      { error: "Profile not found" },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const filteredProfiles = profile.profiles.filter((p) => p.id !== profileId);

  const updated = await updateExpertProfile(auth.email, {
    profiles: filteredProfiles,
    changelog: [
      ...profile.changelog,
      {
        date: now,
        action: "profile_deleted",
        details: { profileId, name: target.name },
      },
    ],
  });

  if (!updated) {
    return NextResponse.json(
      { error: "Failed to delete profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    remaining: filteredProfiles.length,
  });
}
