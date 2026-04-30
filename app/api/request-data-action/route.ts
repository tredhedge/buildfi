// /app/api/request-data-action/route.ts
// Loi 25 / LPRPDE — initiates a self-serve refund or deletion.
// ══════════════════════════════════════════════════════════════════════
// Flow:
//   1. User submits ?action=refund|delete&email=...
//   2. We mint a single-use token (24h TTL) and email a magic link to the
//      address ON FILE (must match a known Stripe customer or KV profile).
//   3. The user clicks the link. /api/refund or /api/data/delete consumes
//      the single-use token (atomic mark-as-used). Reuse → 410 Gone.
//
// Why a separate token family from the 366d session token: refund + delete
// are destructive. A long-lived session token must NOT authorize them.
//
// Anti-abuse:
//   - Email validated with the same regex as /api/checkout
//   - Rate limit by IP (3 requests / 15 min) to prevent spam
//   - Always returns 200 with a generic message, even if the email isn't
//     in our system, so we don't leak account existence.
// ══════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createSingleUseToken, type SingleUseAction } from "@/lib/auth";
import { redis } from "@/lib/kv";
import { hashEmail } from "@/lib/consent";

const resend = new Resend(process.env.RESEND_API_KEY);

const RL_WINDOW_SEC = 15 * 60;
const RL_MAX = 3;

async function isRateLimited(ip: string): Promise<boolean> {
  const key = `ratelimit:request-data-action:${ip}`;
  const now = Date.now();
  const timestamps: number[] = (await redis.get<number[]>(key)) || [];
  const recent = timestamps.filter((t) => now - t < RL_WINDOW_SEC * 1000);
  if (recent.length >= RL_MAX) return true;
  recent.push(now);
  await redis.set(key, recent, { ex: RL_WINDOW_SEC });
  return false;
}

function isValidEmail(email: string): boolean {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function isValidAction(action: string): action is SingleUseAction {
  return action === "refund" || action === "delete";
}

function buildActionUrl(action: SingleUseAction, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.BASE_URL ||
    "https://www.buildfi.ca";
  const path = action === "refund" ? "/api/refund" : "/api/data/delete";
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  let email = url.searchParams.get("email") || "";
  let action = url.searchParams.get("action") || "";

  // Body fallback for POST
  if (req.method === "POST" && (!email || !action)) {
    try {
      const body = await req.json();
      email = email || (body.email as string) || "";
      action = action || (body.action as string) || "";
    } catch {
      // Body wasn't JSON — fall through.
    }
  }

  email = email.trim().toLowerCase();
  action = action.trim().toLowerCase();

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (!isValidAction(action)) {
    return NextResponse.json(
      { error: "invalid_action", message: "action must be refund or delete" },
      { status: 400 }
    );
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests, try again later." },
      { status: 429 }
    );
  }

  // Mint token — note we always mint, even if no profile exists for this
  // email, so the response is shape-stable and we don't leak account info.
  const { token, expiresAt } = await createSingleUseToken(email, action);
  const link = buildActionUrl(action, token);

  // Send transactional email. Failure here is logged but does not change
  // the user-facing response (still 200) — both for privacy and to avoid
  // confirming whether an email exists in our system.
  try {
    if (process.env.RESEND_API_KEY) {
      const fr = (req.headers.get("accept-language") || "fr").startsWith("fr");
      const subject = fr
        ? action === "refund"
          ? "Confirmer votre demande de remboursement — buildfi.ca"
          : "Confirmer votre demande de suppression — buildfi.ca"
        : action === "refund"
          ? "Confirm your refund request — buildfi.ca"
          : "Confirm your deletion request — buildfi.ca";

      const cta = fr
        ? action === "refund"
          ? "Confirmer le remboursement"
          : "Confirmer la suppression"
        : action === "refund"
          ? "Confirm refund"
          : "Confirm deletion";

      const intro = fr
        ? "Vous avez demandé une action sur votre compte. Cliquez le bouton ci-dessous pour confirmer. Le lien expire dans 24 heures et ne peut être utilisé qu'une seule fois."
        : "You requested an action on your account. Click the button below to confirm. This link expires in 24 hours and can be used only once.";

      const html = `
<!DOCTYPE html><html lang="${fr ? "fr" : "en"}"><body style="font-family:Helvetica,Arial,sans-serif;background:#FEFCF9;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #E8E0D4;">
    <h1 style="font-size:20px;color:#1A1208;margin:0 0 16px;">${subject}</h1>
    <p style="font-size:14px;color:#444;line-height:1.6;">${intro}</p>
    <p style="text-align:center;margin:28px 0;">
      <a href="${link}" style="background:#c4944a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">${cta}</a>
    </p>
    <p style="font-size:12px;color:#888;line-height:1.6;">
      ${fr ? "Si vous n'avez pas fait cette demande, ignorez ce courriel." : "If you did not request this, ignore this email."}
    </p>
    <p style="font-size:11px;color:#aaa;margin-top:24px;word-break:break-all;">
      ${fr ? "Si le bouton ne fonctionne pas, copiez ce lien :" : "If the button doesn't work, copy this link:"}<br/>
      ${link}
    </p>
  </div>
</body></html>`.trim();

      await resend.emails.send({
        from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
        replyTo: "support@buildfi.ca",
        to: [email],
        subject,
        html,
      });
    } else {
      console.warn("[request-data-action] RESEND_API_KEY missing — skipping email");
    }
  } catch (e) {
    console.error(
      `[request-data-action] email send failed action=${action} emailHashed=${hashEmail(email)}:`,
      e
    );
  }

  console.log(
    `[request-data-action] minted token action=${action} emailHashed=${hashEmail(email)} expiresAt=${expiresAt}`
  );

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for this email, a confirmation link has been sent. Check your inbox.",
    expiresAt,
  });
}
