// /lib/email-feedback.ts
// Feedback loop email templates — J+3 stars, J+7 testimonial request, J+14 reminder
// Table-based HTML for Outlook/Gmail compatibility

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BG = "#FEFCF9";
const DARK = "#1A1208";
const GOLD = "#C4944A";
const GRAY = "#666666";
const BORDER = "#E8E0D4";
const CARD_BG = "#F8F4EE";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";

function emailWrapper(lang: "fr" | "en", preheader: string, body: string): string {
  const fr = lang === "fr";
  const preheaderPad = "&#847; &zwnj; &nbsp; ".repeat(30);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>buildfi.ca</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${preheader}${preheaderPad}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-family:${FONT};font-size:22px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:22px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
        </td></tr>
        ${body}
        <tr><td style="border-top:1px solid ${BORDER};padding-top:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999;line-height:1.8;padding-bottom:6px;">
              <a href="${BASE_URL}/conditions" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="${BASE_URL}/confidentialite" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="${BASE_URL}/avis-legal" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999;line-height:1.8;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999;">.ca</span> &mdash; ${fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada"}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── J+3: Star rating request ─────────────────────────────────

export async function sendFeedbackEmail(params: {
  to: string;
  lang: "fr" | "en";
  feedbackToken: string;
  tier: string;
}): Promise<void> {
  const { to, lang, feedbackToken, tier } = params;
  const fr = lang === "fr";

  const subject = fr
    ? "Votre avis sur votre rapport buildfi.ca"
    : "Your feedback on your buildfi.ca report";

  const stars = [5, 4, 3, 2, 1].map(n =>
    `<a href="${BASE_URL}/api/feedback?token=${feedbackToken}&rating=${n}" style="color:${n <= 3 ? '#d4cec4' : GOLD};text-decoration:none;font-size:28px;padding:0 3px;">&#9733;</a>`
  ).join("");

  const body = `
        <tr><td style="font-family:${FONT};font-size:15px;color:#333;line-height:1.8;padding-bottom:20px;">
          ${fr ? "Bonjour," : "Hello,"}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:14px;color:#555;line-height:1.8;padding-bottom:20px;">
          ${fr
            ? "Il y a 3 jours, vous avez re\u00e7u votre rapport buildfi.ca. Nous esp\u00e9rons qu\u2019il vous a \u00e9t\u00e9 utile."
            : "3 days ago, you received your buildfi.ca report. We hope it was helpful."}
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-family:${FONT};font-size:15px;font-weight:700;color:${DARK};margin-bottom:14px;">
                ${fr ? "Comment \u00e9valuez-vous votre rapport\u00a0?" : "How would you rate your report?"}
              </div>
              <div>${stars}</div>
              <div style="font-family:${FONT};font-size:11px;color:#999;margin-top:10px;">
                ${fr ? "Cliquez une \u00e9toile \u2014 cela prend 2 secondes" : "Click a star \u2014 it takes 2 seconds"}
              </div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:13px;color:${GOLD};font-weight:600;text-align:center;padding-bottom:24px;">
          ${fr ? "Votre avis d\u00e9bloque 50\u00a0% de rabais sur un 2e bilan. Le rabais est appliqu\u00e9 automatiquement au paiement." : "Your feedback unlocks 50% off a 2nd assessment. The discount is applied automatically at checkout."}
        </td></tr>`;

  const html = emailWrapper(lang, fr ? "Donnez votre avis \u2014 2 secondes" : "Share your feedback \u2014 2 seconds", body);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-feedback] J+3 send failed:", error);
    throw new Error(`Feedback email failed: ${error.message}`);
  }
}

// ── J+7: Testimonial request (only if rating >= 4 + NPS yes) ─

export async function sendTestimonialRequestEmail(params: {
  to: string;
  lang: "fr" | "en";
  feedbackToken: string;
}): Promise<void> {
  const { to, lang, feedbackToken } = params;
  const fr = lang === "fr";

  const subject = fr
    ? "Votre t\u00e9moignage pourrait aider d\u2019autres personnes"
    : "Your testimonial could help others";

  const body = `
        <tr><td style="font-family:${FONT};font-size:15px;color:#333;line-height:1.8;padding-bottom:20px;">
          ${fr ? "Bonjour," : "Hello,"}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:14px;color:#555;line-height:1.8;padding-bottom:20px;">
          ${fr
            ? "Merci d\u2019avoir \u00e9valu\u00e9 votre rapport buildfi.ca ! Votre avis positif nous motive \u00e9norm\u00e9ment."
            : "Thank you for rating your buildfi.ca report! Your positive feedback means a lot to us."}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:14px;color:#555;line-height:1.8;padding-bottom:20px;">
          ${fr
            ? "Accepteriez-vous de partager un court t\u00e9moignage\u00a0? Cela aide d\u2019autres personnes \u00e0 d\u00e9couvrir buildfi.ca."
            : "Would you share a short testimonial? It helps others discover buildfi.ca."}
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <a href="${BASE_URL}/feedback/${feedbackToken}" style="display:inline-block;padding:12px 32px;color:#fff;text-decoration:none;font-family:${FONT};font-size:14px;font-weight:700;">
                ${fr ? "\u00c9crire un t\u00e9moignage" : "Write a testimonial"}
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:12px;color:#999;text-align:center;padding-bottom:24px;">
          ${fr ? "30 secondes \u2014 vous pouvez rester anonyme." : "30 seconds \u2014 you can stay anonymous."}
        </td></tr>`;

  const html = emailWrapper(lang, fr ? "Un t\u00e9moignage en 30 secondes" : "A testimonial in 30 seconds", body);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-feedback] J+7 send failed:", error);
    throw new Error(`Testimonial email failed: ${error.message}`);
  }
}

// ── J+14: Reminder (only if no feedback at all) ─────────────

export async function sendFeedbackReminderEmail(params: {
  to: string;
  lang: "fr" | "en";
  feedbackToken: string;
}): Promise<void> {
  const { to, lang, feedbackToken } = params;
  const fr = lang === "fr";

  const subject = fr
    ? "Dernier rappel \u2014 50 % de rabais sur un 2e bilan"
    : "Last reminder \u2014 50% off a 2nd assessment";

  const stars = [5, 4, 3, 2, 1].map(n =>
    `<a href="${BASE_URL}/api/feedback?token=${feedbackToken}&rating=${n}" style="color:${n <= 3 ? '#d4cec4' : GOLD};text-decoration:none;font-size:28px;padding:0 3px;">&#9733;</a>`
  ).join("");

  const body = `
        <tr><td style="font-family:${FONT};font-size:15px;color:#333;line-height:1.8;padding-bottom:20px;">
          ${fr ? "Bonjour," : "Hello,"}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:14px;color:#555;line-height:1.8;padding-bottom:20px;">
          ${fr
            ? "Vous n\u2019avez pas encore \u00e9valu\u00e9 votre bilan buildfi.ca. Un clic suffit \u2014 et cela d\u00e9bloque 50\u00a0% de rabais sur un 2e bilan, appliqu\u00e9 automatiquement au paiement."
            : "You haven\u2019t rated your buildfi.ca assessment yet. One click is all it takes \u2014 and it unlocks 50% off a 2nd assessment, applied automatically at checkout."}
        </td></tr>
        <tr><td align="center" style="padding-bottom:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:20px;text-align:center;">
              <div style="font-family:${FONT};font-size:14px;font-weight:600;color:${DARK};margin-bottom:12px;">
                ${fr ? "Votre avis en un clic" : "Your feedback in one click"}
              </div>
              <div>${stars}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:12px;color:#999;text-align:center;padding-bottom:24px;">
          ${fr ? "Ceci est notre dernier rappel \u2014 nous ne vous \u00e9crirons plus \u00e0 ce sujet." : "This is our last reminder \u2014 we won\u2019t email you about this again."}
        </td></tr>`;

  const html = emailWrapper(lang, fr ? "Dernier rappel \u2014 50 % sur un 2e bilan" : "Last reminder \u2014 50% off a 2nd assessment", body);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-feedback] J+14 send failed:", error);
    throw new Error(`Reminder email failed: ${error.message}`);
  }
}

// ── Referral conversion notification ────────────────────────

export async function sendReferralConversionEmail(params: {
  to: string;
  lang: "fr" | "en";
  conversions: number;
}): Promise<void> {
  const { to, lang, conversions } = params;
  const fr = lang === "fr";

  const subject = fr
    ? `Quelqu\u2019un a utilis\u00e9 votre lien de partage ! (#${conversions})`
    : `Someone used your referral link! (#${conversions})`;

  const body = `
        <tr><td style="font-family:${FONT};font-size:15px;color:#333;line-height:1.8;padding-bottom:20px;">
          ${fr ? "Bonne nouvelle\u00a0!" : "Great news!"}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:14px;color:#555;line-height:1.8;padding-bottom:20px;">
          ${fr
            ? `Quelqu\u2019un a achet\u00e9 un rapport gr\u00e2ce \u00e0 votre lien de partage. C\u2019est votre conversion #${conversions}.`
            : `Someone purchased a report through your referral link. This is conversion #${conversions}.`}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:1.8;padding-bottom:24px;">
          ${conversions === 1
            ? (fr ? "R\u00e9compense d\u00e9bloqu\u00e9e\u00a0: 50 % de rabais sur votre prochain achat." : "Reward unlocked: 50% off your next purchase.")
            : conversions === 3
              ? (fr ? "R\u00e9compense d\u00e9bloqu\u00e9e\u00a0: 1 export AI gratuit ajout\u00e9 \u00e0 votre compte." : "Reward unlocked: 1 free AI export added to your account.")
              : conversions === 5
                ? (fr ? "R\u00e9compense d\u00e9bloqu\u00e9e\u00a0: 1 an d\u2019acc\u00e8s Laboratoire gratuit\u00a0!" : "Reward unlocked: 1 free year of Lab access!")
                : (fr ? "Continuez \u00e0 partager pour d\u00e9bloquer plus de r\u00e9compenses." : "Keep sharing to unlock more rewards.")}
        </td></tr>`;

  const html = emailWrapper(lang, fr ? "Nouvelle conversion via votre lien" : "New conversion via your link", body);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-feedback] Referral notification failed:", error);
  }
}
