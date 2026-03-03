// /app/api/feedback/route.ts
// Star rating handler — GET validates token+rating, records it, redirects to feedback page
// POST handler added in Batch 3 for extended feedback form submission

import { NextRequest, NextResponse } from "next/server";
import { getFeedbackByToken, updateFeedbackRating } from "@/lib/kv";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const ratingStr = req.nextUrl.searchParams.get("rating");

  if (!token || !ratingStr) {
    return NextResponse.json({ error: "Missing token or rating" }, { status: 400 });
  }

  const rating = parseInt(ratingStr, 10);
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating (1-5)" }, { status: 400 });
  }

  const record = await getFeedbackByToken(token);
  if (!record) {
    return NextResponse.json({ error: "Invalid feedback token" }, { status: 404 });
  }

  await updateFeedbackRating(token, rating, "report");

  // Redirect to feedback page for optional extended feedback
  return NextResponse.redirect(`${BASE_URL}/feedback/${token}?rated=${rating}`);
}
