// /lib/email-expert.ts
// Expert-specific email templates: magic link + report delivery
// Same table-based HTML, palette, and font stack as lib/email.ts

import { Resend } from "resend";
import { buildMagicLinkUrl } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BG = "#FEFCF9";
const DARK = "#1A1208";
const GOLD = "#C4944A";
const GRAY = "#666666";
const BORDER = "#E8E0D4";
const CARD_BG = "#F8F4EE";

// ── Magic Link Email ──────────────────────────────────────

interface MagicLinkParams {
  to: string;
  lang: "fr" | "en";
  token: string;
  isNewAccount: boolean;
}

export async function sendMagicLinkEmail(params: MagicLinkParams) {
  const { to, lang, token, isNewAccount } = params;
  const fr = lang === "fr";
  const magicUrl = buildMagicLinkUrl(token);

  const subject = fr
    ? "Votre acc\u00e8s Simulateur Expert \u2014 buildfi.ca"
    : "Your Expert Simulator access \u2014 buildfi.ca";

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: isNewAccount
      ? (fr ? "Bienvenue dans le Simulateur Expert" : "Welcome to the Expert Simulator")
      : (fr ? "Votre lien d\u2019acc\u00e8s" : "Your access link"),
    bodyP1: isNewAccount
      ? (fr
        ? "Merci pour votre achat. Votre Simulateur Expert est pr\u00eat. Cliquez le bouton ci-dessous pour y acc\u00e9der."
        : "Thank you for your purchase. Your Expert Simulator is ready. Click the button below to access it.")
      : (fr
        ? "Voici votre nouveau lien d\u2019acc\u00e8s au Simulateur Expert. Ce lien remplace tout lien pr\u00e9c\u00e9dent."
        : "Here is your new Expert Simulator access link. This link replaces any previous link."),
    bodyP2: fr
      ? "Ce lien est permanent et personnel. Ajoutez-le \u00e0 vos favoris pour un acc\u00e8s rapide."
      : "This link is permanent and personal. Bookmark it for quick access.",
    cta: fr ? "Acc\u00e9der \u00e0 mon simulateur" : "Access my simulator",
    fallback: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    fallbackLink: fr ? "Ouvrir directement" : "Open directly",
    includes: fr ? "Votre acc\u00e8s Expert inclut\u00a0:" : "Your Expert access includes:",
    feat1: fr ? "Simulateur illimit\u00e9 avec recalcul instantan\u00e9" : "Unlimited simulator with instant recalculation",
    feat2: fr ? "5 exports AI personnalis\u00e9s" : "5 personalized AI exports",
    feat3: fr ? "3 workflows\u00a0: Tester, Optimiser, Bilan Annuel" : "3 workflows: Test, Optimize, Annual Review",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue pas un avis financier personnalis\u00e9."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada",
    contact: fr ? "Une question\u00a0?" : "Questions?",
  };

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]><style type="text/css">table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;">

  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${s.heading}${"&#847; &zwnj; &nbsp; ".repeat(30)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
          <br/><span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${s.tagline}</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="font-family:${FONT};font-size:22px;font-weight:700;color:${DARK};padding-bottom:16px;text-align:center;">
          ${s.heading}
        </td></tr>

        <!-- Body -->
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:28px;">
          <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
          <p style="margin:0;">${s.bodyP2}</p>
        </td></tr>

        <!-- CTA Button -->
        <tr><td align="center" style="padding-bottom:4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${magicUrl}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="21%" fillcolor="${GOLD}" stroke="f">
              <center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">${s.cta}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${magicUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">${s.cta}</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- Fallback link -->
        <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-top:12px;padding-bottom:28px;">
          ${s.fallback} <a href="${magicUrl}" style="color:${GOLD};text-decoration:underline;">${s.fallbackLink}</a>
        </td></tr>

        <!-- Features card -->
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">${s.includes}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:2;">
                  &bull; ${s.feat1}<br/>&bull; ${s.feat2}<br/>&bull; ${s.feat3}
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("[email-expert] Magic link send failed:", error);
    throw new Error(`Magic link email failed: ${error.message}`);
  }
}

// ── Expert Report Delivery Email ──────────────────────────

interface ExpertDeliveryParams {
  to: string;
  lang: "fr" | "en";
  downloadUrl: string;
  grade: string;
  successPct: number;
  magicLinkUrl: string;
  referralCode: string;
}

export async function sendExpertDeliveryEmail(params: ExpertDeliveryParams) {
  const { to, lang, downloadUrl, grade, successPct, magicLinkUrl, referralCode } = params;
  const fr = lang === "fr";
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  const referralUrl = `${base}?ref=${referralCode}`;

  const subject = fr
    ? `Votre bilan Expert buildfi.ca est pr\u00eat \u2014 Note ${grade}`
    : `Your buildfi.ca Expert assessment is ready \u2014 Grade ${grade}`;

  const preheader = fr
    ? `Note ${grade} \u2014 taux de r\u00e9ussite ${successPct}%. Votre bilan Expert personnalis\u00e9 est pr\u00eat.`
    : `Grade ${grade} \u2014 ${successPct}% success rate. Your personalized Expert assessment is ready.`;

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    tierLabel: fr ? "Bilan Expert" : "Expert Assessment",
    successLabel: fr ? `Taux de r\u00e9ussite\u00a0: ${successPct}\u00a0%` : `Success rate: ${successPct}%`,
    bodyP1: fr
      ? "Votre bilan Expert personnalis\u00e9 est pr\u00eat. Cliquez le bouton ci-dessous pour le consulter."
      : "Your personalized Expert assessment is ready. Click the button below to view it.",
    bodyP2: fr
      ? "Ce bilan est bas\u00e9 sur 5\u00a0000 sc\u00e9narios de votre situation financi\u00e8re. Chaque dollar provient directement du moteur de calcul\u00a0\u2014\u00a0aucune estimation approximative."
      : "This assessment is based on 5,000 scenarios of your financial situation. Every dollar comes directly from the calculation engine\u2009\u2014\u2009no rough estimates.",
    ctaReport: fr ? "Consulter mon bilan" : "View my assessment",
    ctaSim: fr ? "Ouvrir mon simulateur" : "Open my simulator",
    fallback: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    fallbackLink: fr ? "Ouvrir mon bilan directement" : "Open my assessment directly",
    linkExpiry: fr ? "Ce lien est valide 30\u00a0jours" : "This link is valid for 30\u00a0days",
    shareTitle: fr ? "Ce bilan a \u00e9t\u00e9 utile\u00a0?" : "Was this assessment helpful?",
    shareSecond: fr
      ? "Obtenez un 2e bilan \u00e0 50\u00a0% de rabais avec le code SECOND50"
      : "Get a 2nd assessment at 50% off with code SECOND50",
    shareRefer: fr
      ? "Partagez BuildFi avec un proche et recevez des r\u00e9compenses"
      : "Share BuildFi with someone you know and earn rewards",
    referCta: fr ? "Mon lien de r\u00e9f\u00e9rence" : "My referral link",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue pas un avis financier personnalis\u00e9."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada",
    contact: fr ? "Une question\u00a0?" : "Questions?",
    productType: fr ? "Produit num\u00e9rique\u00a0\u2014\u00a0livraison instantan\u00e9e" : "Digital product\u00a0\u2014\u00a0instant delivery",
  };

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
  <!--[if mso]><style type="text/css">table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;">

  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}${"&#847; &zwnj; &nbsp; ".repeat(30)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
          <br/><span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${s.tagline}</span>
        </td></tr>

        <!-- Grade Card -->
        <tr><td align="center" style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:16px;border:2px solid ${GOLD};">
            <tr><td align="center" style="padding:36px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" style="font-family:${FONT};font-size:12px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:14px;">${s.tierLabel}</td></tr>
                <tr><td align="center" style="font-family:${FONT};font-size:56px;font-weight:700;color:${DARK};line-height:1;">${grade}</td></tr>
                <tr><td align="center" style="font-family:${FONT};font-size:14px;color:${GRAY};padding-top:10px;">${s.successLabel}</td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:28px;">
          <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
          <p style="margin:0;">${s.bodyP2}</p>
        </td></tr>

        <!-- CTA: View Report -->
        <tr><td align="center" style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${downloadUrl}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="${GOLD}" stroke="f">
              <center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">${s.ctaReport}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${downloadUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">${s.ctaReport}</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>

        <!-- CTA: Open Simulator -->
        <tr><td align="center" style="padding-bottom:4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="border:2px solid ${GOLD};border-radius:10px;">
              <a href="${magicLinkUrl}" style="display:inline-block;padding:12px 36px;color:${GOLD};text-decoration:none;font-family:${FONT};font-size:14px;font-weight:700;line-height:1.2;">${s.ctaSim}</a>
            </td></tr>
          </table>
        </td></tr>

        <!-- Fallback link -->
        <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-top:12px;padding-bottom:4px;">
          ${s.fallback} <a href="${downloadUrl}" style="color:${GOLD};text-decoration:underline;">${s.fallbackLink}</a>
        </td></tr>
        <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-bottom:28px;">${s.linkExpiry}</td></tr>

        <!-- Bonus Resources -->
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:18px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">${fr ? "Ressources incluses" : "Included resources"}</td></tr>
                <tr><td style="font-family:${FONT};font-size:12px;color:${GRAY};line-height:2;">
                  &bull;&nbsp;<a href="https://www.buildfi.ca/${fr ? "guide-101-les-bases-de-vos-finances.pdf" : "guide-101-your-financial-basics.pdf"}" style="color:${GOLD};text-decoration:none;font-weight:600;">${fr ? "Guide 101 : Les bases de vos finances" : "Guide 101: Your Financial Basics"}</a> (PDF)<br>
                  &bull;&nbsp;<a href="https://www.buildfi.ca/${fr ? "guide-201-optimiser-votre-retraite.pdf" : "guide-201-optimize-your-retirement.pdf"}" style="color:${GOLD};text-decoration:none;font-weight:600;">${fr ? "Guide 201+301 : Optimiser et ma\u00eetriser votre retraite" : "Guide 201+301: Optimize & Master Your Retirement"}</a> (PDF)<br>
                  &bull;&nbsp;<a href="https://www.buildfi.ca/outils/dettes" style="color:${GOLD};text-decoration:none;font-weight:600;">${fr ? "Outil d\u2019analyse des dettes" : "Debt analysis tool"}</a> \u2014 ${fr ? "interactif, z\u00e9ro frais" : "interactive, zero cost"}
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Share / Referral Card -->
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:20px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">${s.shareTitle}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:1.8;padding-bottom:6px;">&bull; ${s.shareSecond}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:1.8;padding-bottom:10px;">&bull; ${s.shareRefer}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GOLD};font-weight:700;">
                  <a href="${referralUrl}" style="color:${GOLD};text-decoration:none;">${s.referCta} &rarr;</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;">${s.productType}</td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("[email-expert] Delivery send failed:", error);
    throw new Error(`Expert delivery email failed: ${error.message}`);
  }
}

// ── Admin Alert Email ─────────────────────────────────────

export async function sendAdminAlert(subject: string, body: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "support@buildfi.ca";
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
      to: [adminEmail],
      subject: `[BuildFi ALERT] ${subject}`,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${body}</pre>`,
    });
  } catch (err) {
    // Don't throw — admin alert failure must not crash the pipeline
    console.error("[email-expert] Admin alert send failed:", err);
  }
}

// ── Renewal Reminder Emails (J-30, J-7, J-0) ──────────────

interface RenewalParams {
  to: string;
  lang: "fr" | "en";
  daysLeft: 30 | 7 | 0;
  renewUrl: string;
  downloadUrl: string; // data export URL
}

export async function sendRenewalEmail(params: RenewalParams) {
  const { to, lang, daysLeft, renewUrl, downloadUrl } = params;
  const fr = lang === "fr";

  const subjects: Record<number, { fr: string; en: string }> = {
    30: {
      fr: "Votre acc\u00e8s Expert expire dans 30 jours",
      en: "Your Expert access expires in 30 days",
    },
    7: {
      fr: "Rappel : votre acc\u00e8s Expert expire dans 7 jours",
      en: "Reminder: your Expert access expires in 7 days",
    },
    0: {
      fr: "Votre acc\u00e8s Expert expire aujourd'hui",
      en: "Your Expert access expires today",
    },
  };

  const subject = subjects[daysLeft][fr ? "fr" : "en"];

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: daysLeft === 0
      ? (fr ? "Dernier jour" : "Last day")
      : (fr ? `${daysLeft} jours restants` : `${daysLeft} days remaining`),
    bodyP1: daysLeft === 30
      ? (fr
        ? "Votre acc\u00e8s au Simulateur Expert expire dans 30 jours. Renouvelez pour conserver votre simulateur, vos profils et vos donn\u00e9es."
        : "Your Expert Simulator access expires in 30 days. Renew to keep your simulator, profiles, and data.")
      : daysLeft === 7
      ? (fr
        ? "Votre acc\u00e8s Expert expire dans 7 jours. Apr\u00e8s expiration, votre profil sera conserv\u00e9 12 mois, mais le simulateur ne sera plus accessible."
        : "Your Expert access expires in 7 days. After expiration, your profile will be kept for 12 months, but the simulator will no longer be accessible.")
      : (fr
        ? "C'est le dernier jour de votre acc\u00e8s Expert. Renouvelez maintenant pour un acc\u00e8s continu, ou t\u00e9l\u00e9chargez vos donn\u00e9es."
        : "This is the last day of your Expert access. Renew now for continued access, or download your data."),
    bodyP2: fr
      ? "Le renouvellement est de 29\u00a0$/an et inclut le simulateur illimit\u00e9, 3 exports AI et le Bilan Annuel."
      : "Renewal is $29/year and includes the unlimited simulator, 3 AI exports, and the Annual Assessment.",
    ctaRenew: fr ? "Renouveler mon acc\u00e8s \u2014 29 $/an" : "Renew my access \u2014 $29/year",
    ctaDownload: fr ? "T\u00e9l\u00e9charger mes donn\u00e9es" : "Download my data",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue pas un avis financier personnalis\u00e9."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada",
    contact: fr ? "Une question\u00a0?" : "Questions?",
    unsubNote: fr
      ? "Si vous ne renouvelez pas, vos donn\u00e9es seront conserv\u00e9es 12 mois puis supprim\u00e9es."
      : "If you do not renew, your data will be kept for 12 months then deleted.",
  };

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${s.heading}${"&#847; &zwnj; &nbsp; ".repeat(20)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
          <br/><span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${s.tagline}</span>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:22px;font-weight:700;color:${DARK};padding-bottom:16px;text-align:center;">
          ${s.heading}
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:28px;">
          <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
          <p style="margin:0;">${s.bodyP2}</p>
        </td></tr>
        <tr><td align="center" style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <a href="${renewUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">${s.ctaRenew}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:28px;">
          <a href="${downloadUrl}" style="font-family:${FONT};font-size:13px;color:${GOLD};text-decoration:underline;">${s.ctaDownload}</a>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:12px;color:#999999;line-height:1.6;text-align:center;padding-bottom:24px;background-color:${CARD_BG};border-radius:8px;padding:16px;">
          ${s.unsubNote}
        </td></tr>
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error(`[email-expert] Renewal (J-${daysLeft}) send failed:`, error);
    throw new Error(`Renewal email failed: ${error.message}`);
  }
}
