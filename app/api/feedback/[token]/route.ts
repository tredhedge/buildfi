// /app/api/feedback/[token]/route.ts
// GET: fetch feedback record by token (for feedback page)
// POST: submit extended feedback (rating, nps, text, testimonial)

import { NextRequest, NextResponse } from "next/server";
import { getFeedbackByToken, updateFeedbackFull } from "@/lib/kv";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const record = await getFeedbackByToken(token);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(record);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const record = await getFeedbackByToken(token);
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  const rating = typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5
    ? body.rating
    : undefined;

  const nps = typeof body.nps === "boolean" ? body.nps : undefined;
  const text = typeof body.text === "string" ? body.text.slice(0, 500) : undefined;

  const validConsents = ["named", "anonymous", "none"];
  const testimonialConsent = validConsents.includes(body.testimonialConsent)
    ? body.testimonialConsent
    : undefined;
  const testimonialText = typeof body.testimonialText === "string"
    ? body.testimonialText.slice(0, 300)
    : undefined;

  const source = record.source || "page";

  const updated = await updateFeedbackFull(token, {
    ...(rating !== undefined && { rating }),
    ...(nps !== undefined && { nps }),
    ...(text !== undefined && { text }),
    ...(testimonialConsent !== undefined && { testimonialConsent }),
    ...(testimonialText !== undefined && { testimonialText }),
    source,
  });

  if (!updated) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, couponUnlocked: updated.couponUnlocked });
}
