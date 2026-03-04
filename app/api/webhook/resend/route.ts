// /app/api/webhook/resend/route.ts
// Resend webhook handler — email bounce/complaint/delivery monitoring
//
// Events handled:
//   email.delivered  — increment delivery counter
//   email.bounced    — store bounce record + increment counter + alert check
//   email.complained — store complaint record + increment counter + alert check
//
// Webhook verification via Svix headers (svix-id, svix-timestamp, svix-signature)
// Uses HMAC-SHA256 to verify payload integrity.
//
// Required env vars:
//   RESEND_WEBHOOK_SECRET — Svix signing secret from Resend dashboard (whsec_...)
//                           If not set, accepts all requests (dev mode) with console.warn
//
// KV keys written:
//   email:stats              — { delivered, bounced, complained, lastUpdated }
//   email:bounce:{email}     — { type, date, emailId }
//   email:complaint:{email}  — { date, emailId }

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import {
  recordDelivery,
  recordBounce,
  recordComplaint,
  checkAlertThresholds,
} from "@/lib/email-monitor";

export const runtime = "nodejs";

// ── Svix webhook verification ────────────────────────────

/**
 * Verify Resend webhook signature (Svix format).
 * Resend signs webhooks with Svix. The signature is HMAC-SHA256 of
 * `${msgId}.${timestamp}.${body}` using the base64-decoded secret.
 *
 * @returns true if signature is valid or if no secret is configured (dev mode)
 */
function verifyWebhookSignature(
  payload: string,
  headers: {
    svixId: string | null;
    svixTimestamp: string | null;
    svixSignature: string | null;
  }
): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET;

  // Reject if no secret configured (production safety)
  if (!secret) {
    console.error(
      "[resend-webhook] RESEND_WEBHOOK_SECRET not set — rejecting unverified webhook"
    );
    return false;
  }

  const { svixId, svixTimestamp, svixSignature } = headers;

  // All three Svix headers must be present
  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("[resend-webhook] Missing Svix headers");
    return false;
  }

  // Reject timestamps older than 5 minutes (replay protection)
  const timestampSeconds = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSeconds)) {
    console.error("[resend-webhook] Invalid svix-timestamp");
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampSeconds) > 300) {
    console.error(
      `[resend-webhook] Timestamp too old: ${timestampSeconds} vs now ${now}`
    );
    return false;
  }

  // Svix secret format: "whsec_<base64>" — strip prefix
  const secretBytes = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64"
  );

  // Signature content: "{msgId}.{timestamp}.{body}"
  const signatureContent = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSignature = createHmac("sha256", secretBytes)
    .update(signatureContent)
    .digest("base64");

  // svix-signature header contains one or more "v1,{base64}" entries separated by spaces
  const signatures = svixSignature.split(" ");
  for (const sig of signatures) {
    const [version, value] = sig.split(",");
    if (version === "v1" && value) {
      // Constant-time comparison
      try {
        const expected = Buffer.from(expectedSignature);
        const received = Buffer.from(value);
        if (
          expected.length === received.length &&
          timingSafeEqual(expected, received)
        ) {
          return true;
        }
      } catch {
        // Length mismatch — continue checking other signatures
      }
    }
  }

  console.error("[resend-webhook] Signature verification failed");
  return false;
}

// ── Resend event types ───────────────────────────────────

interface ResendEventData {
  email_id?: string;
  created_at?: string;
  to?: string[];
  // Bounce-specific fields
  bounce?: {
    type?: string; // "hard" | "soft"
    message?: string;
  };
}

interface ResendWebhookEvent {
  type: string;
  data: ResendEventData;
  created_at?: string;
}

// ── POST handler ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Verify webhook signature
  const isValid = verifyWebhookSignature(body, {
    svixId: req.headers.get("svix-id"),
    svixTimestamp: req.headers.get("svix-timestamp"),
    svixSignature: req.headers.get("svix-signature"),
  });

  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  // Parse event
  let event: ResendWebhookEvent;
  try {
    event = JSON.parse(body) as ResendWebhookEvent;
  } catch {
    console.error("[resend-webhook] Failed to parse JSON body");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = event;
  const emailId = data.email_id || "";
  const recipients = data.to || [];
  const recipient = recipients[0] || "unknown";

  console.log(
    `[resend-webhook] Event: ${type} | emailId: ${emailId} | to: ${recipient}`
  );

  try {
    switch (type) {
      case "email.delivered": {
        await recordDelivery();
        console.log(`[resend-webhook] Delivery recorded for ${recipient}`);
        break;
      }

      case "email.bounced": {
        const bounceType = data.bounce?.type || "unknown";
        await recordBounce(recipient, bounceType, emailId);
        console.warn(
          `[resend-webhook] BOUNCE (${bounceType}) for ${recipient} — emailId: ${emailId}`
        );

        // Check alert thresholds after bounce
        const bounceAlerts = await checkAlertThresholds();
        for (const alert of bounceAlerts) {
          console.warn(`[resend-webhook] ALERT: ${alert.message}`);
        }
        break;
      }

      case "email.complained": {
        await recordComplaint(recipient, emailId);
        console.warn(
          `[resend-webhook] COMPLAINT from ${recipient} — emailId: ${emailId}`
        );

        // Check alert thresholds after complaint
        const complaintAlerts = await checkAlertThresholds();
        for (const alert of complaintAlerts) {
          console.warn(`[resend-webhook] ALERT: ${alert.message}`);
        }
        break;
      }

      default: {
        // Log unhandled events but return 200 (Resend expects acknowledgement)
        console.log(`[resend-webhook] Unhandled event type: ${type}`);
      }
    }
  } catch (err) {
    console.error(`[resend-webhook] Error processing ${type}:`, err);
    // Return 500 so Resend retries
    return NextResponse.json(
      { error: "Internal processing error" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
