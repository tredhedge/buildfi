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
    ? "Votre acc\u00e8s Laboratoire \u2014 buildfi.ca"
    : "Your Lab access \u2014 buildfi.ca";

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: isNewAccount
      ? (fr ? "Bienvenue dans le Laboratoire" : "Welcome to the Lab")
      : (fr ? "Votre lien d\u2019acc\u00e8s" : "Your access link"),
    bodyP1: isNewAccount
      ? (fr
        ? "Merci pour votre achat. Votre Laboratoire est pr\u00eat. Cliquez le bouton ci-dessous pour y acc\u00e9der."
        : "Thank you for your purchase. Your Lab is ready. Click the button below to access it.")
      : (fr
        ? "Voici votre nouveau lien d\u2019acc\u00e8s au Laboratoire. Ce lien remplace tout lien pr\u00e9c\u00e9dent."
        : "Here is your new Lab access link. This link replaces any previous link."),
    bodyP2: fr
      ? "Ce lien est permanent et personnel. Ajoutez-le \u00e0 vos favoris pour un acc\u00e8s rapide."
      : "This link is permanent and personal. Bookmark it for quick access.",
    cta: fr ? "Acc\u00e9der \u00e0 mon simulateur" : "Access my simulator",
    fallback: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    fallbackLink: fr ? "Ouvrir directement" : "Open directly",
    includes: fr ? "Votre acc\u00e8s Laboratoire inclut\u00a0:" : "Your Lab access includes:",
    feat1: fr ? "Simulations illimit\u00e9es avec recalcul instantan\u00e9" : "Unlimited simulations with instant recalculation",
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
              <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
              <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se d\u00e9sabonner" : "Unsubscribe"}</a>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  const text = fr
    ? `${subject}\n\n${isNewAccount ? "Bienvenue dans le Laboratoire." : "Votre lien d'accès."}\n\nAccéder à mon Laboratoire: ${magicUrl}\n\nCe lien expire dans 24h. Si vous n'avez pas demandé cet accès, ignorez ce courriel.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\n${isNewAccount ? "Welcome to the Lab." : "Your access link."}\n\nAccess my Lab: ${magicUrl}\n\nThis link expires in 24h. If you did not request this access, ignore this email.\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
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
    ? `Votre bilan Laboratoire buildfi.ca est pr\u00eat \u2014 Note ${grade}`
    : `Your buildfi.ca Lab assessment is ready \u2014 Grade ${grade}`;

  const preheader = fr
    ? `Note ${grade} \u2014 taux de r\u00e9ussite ${successPct}%. Votre bilan Laboratoire personnalis\u00e9 est pr\u00eat.`
    : `Grade ${grade} \u2014 ${successPct}% success rate. Your personalized Lab assessment is ready.`;

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    tierLabel: fr ? "Bilan Laboratoire" : "Lab Assessment",
    successLabel: fr ? `Taux de r\u00e9ussite\u00a0: ${successPct}\u00a0%` : `Success rate: ${successPct}%`,
    bodyP1: fr
      ? "Votre bilan Laboratoire personnalis\u00e9 est pr\u00eat. Cliquez le bouton ci-dessous pour le consulter."
      : "Your personalized Lab assessment is ready. Click the button below to view it.",
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
      ? "Votre 2e bilan est automatiquement \u00e0 50\u00a0% de rabais"
      : "Your 2nd assessment is automatically 50% off",
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
              <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.productType}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
              <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se d\u00e9sabonner" : "Unsubscribe"}</a>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;

  const text = fr
    ? `${subject}\n\nVotre bilan Laboratoire est prêt.\nNote: ${grade} | Taux de réussite: ${successPct}%\n\nConsulter mon bilan: ${downloadUrl}\nOuvrir mon Laboratoire: ${magicLinkUrl}\n\nCe lien est valide 30 jours.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nYour Lab assessment is ready.\nGrade: ${grade} | Success rate: ${successPct}%\n\nView my assessment: ${downloadUrl}\nOpen my Lab: ${magicLinkUrl}\n\nThis link is valid for 30 days.\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
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
      replyTo: "support@buildfi.ca",
      to: [adminEmail],
      subject: `[BuildFi ALERT] ${subject}`,
      html: `<pre style="font-family:monospace;font-size:13px;white-space:pre-wrap;">${body}</pre>`,
      text: `[BuildFi ALERT] ${subject}\n\n${body}`,
      headers: {
        "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-Priority": "1",
      },
    });
  } catch (err) {
    // Don't throw — admin alert failure must not crash the pipeline
    console.error("[email-expert] Admin alert send failed:", err);
  }
}

// ── Renewal Email Templates (J-30, J-7, J-0, J+3) ─────────

export interface RenewalEmailParams {
  to: string;
  lang: "fr" | "en";
  token: string;
  expiryDate: string;
  reportsCount: number;
  profilesCount: number;
}

// Shared helper: build renewal checkout URL
function renewalCheckoutUrl(to: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  return `${base}/api/checkout?type=renewal&email=${encodeURIComponent(to)}`;
}

// Shared helper: format expiry date for display
function formatExpiryDate(iso: string, fr: boolean): string {
  return new Date(iso).toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Shared helper: build the standard renewal email HTML shell
function buildRenewalHtml(opts: {
  lang: "fr" | "en";
  subject: string;
  preheader: string;
  heading: string;
  bodyParagraphs: string[];
  cardContent: string | null;
  ctaUrl: string;
  ctaLabel: string;
  secondaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  infoNote: string | null;
}): string {
  const fr = opts.lang === "fr";
  const tagline = fr ? "Planification financière accessible" : "Accessible financial planning";
  const disclaimer = fr
    ? "Cet outil est fourni à titre informatif et éducatif seulement. Il ne constitue pas un avis financier personnalisé."
    : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.";
  const contact = fr ? "Une question\u00a0?" : "Questions?";
  const location = fr ? "Québec, Canada" : "Quebec, Canada";

  const bodyHtml = opts.bodyParagraphs
    .map((p, i) => `<p style="margin:0${i < opts.bodyParagraphs.length - 1 ? " 0 14px 0" : ""};">${p}</p>`)
    .join("\n          ");

  const cardSection = opts.cardContent
    ? `
        <!-- Value card -->
        <tr><td style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:20px 24px;">
              ${opts.cardContent}
            </td></tr>
          </table>
        </td></tr>`
    : "";

  const secondaryCta = opts.secondaryCtaUrl && opts.secondaryCtaLabel
    ? `
        <!-- Secondary CTA -->
        <tr><td align="center" style="padding-bottom:4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="border:2px solid ${GOLD};border-radius:10px;">
              <a href="${opts.secondaryCtaUrl}" style="display:inline-block;padding:12px 36px;color:${GOLD};text-decoration:none;font-family:${FONT};font-size:14px;font-weight:700;line-height:1.2;">${opts.secondaryCtaLabel}</a>
            </td></tr>
          </table>
        </td></tr>`
    : "";

  const infoBox = opts.infoNote
    ? `
        <!-- Info note -->
        <tr><td style="font-family:${FONT};font-size:12px;color:#999999;line-height:1.6;text-align:center;padding:16px;margin-bottom:24px;background-color:${CARD_BG};border-radius:8px;">
          ${opts.infoNote}
        </td></tr>`
    : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${opts.lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${opts.subject}</title>
  <!--[if mso]><style type="text/css">table{border-collapse:collapse;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;">

  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${opts.preheader}${"&#847; &zwnj; &nbsp; ".repeat(30)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
          <br/><span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${tagline}</span>
        </td></tr>

        <!-- Heading -->
        <tr><td style="font-family:${FONT};font-size:22px;font-weight:700;color:${DARK};padding-bottom:16px;text-align:center;">
          ${opts.heading}
        </td></tr>

        <!-- Body -->
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:28px;">
          ${bodyHtml}
        </td></tr>
${cardSection}
        <!-- CTA Button -->
        <tr><td align="center" style="padding-bottom:12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${opts.ctaUrl}" style="height:48px;v-text-anchor:middle;width:300px;" arcsize="21%" fillcolor="${GOLD}" stroke="f">
              <center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">${opts.ctaLabel}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <a href="${opts.ctaUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">${opts.ctaLabel}</a>
              <!--<![endif]-->
            </td></tr>
          </table>
        </td></tr>
${secondaryCta}
${infoBox}
        <!-- Footer -->
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialité" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis légal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
              <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se désabonner" : "Unsubscribe"}</a>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`;
}

// ── J-30: Renewal Reminder (30 days before expiry) ──────────

export async function sendRenewalReminderJ30Email(params: RenewalEmailParams) {
  const { to, lang, token, expiryDate, reportsCount, profilesCount } = params;
  const fr = lang === "fr";
  const expFormatted = formatExpiryDate(expiryDate, fr);
  const checkoutUrl = renewalCheckoutUrl(to);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  const simUrl = `${base}/acces?token=${token}`;

  const subject = fr
    ? "Votre Laboratoire expire dans 30 jours"
    : "Your Lab expires in 30 days";

  const heading = fr
    ? "30 jours avant l\u2019expiration"
    : "30 days until expiration";

  const bodyP1 = fr
    ? `Votre accès au Laboratoire expire le ${expFormatted}.`
    : `Your Lab access expires on ${expFormatted}.`;

  const bodyP2 = fr
    ? "Le renouvellement est de 29\u00a0$/an et inclut l\u2019accès continu au Laboratoire, 3 exports AI personnalisés et le Bilan Annuel."
    : "Renewal is $29/year and includes continued Lab access, 3 personalized AI exports, and the Annual Assessment.";

  // Value summary card
  const valueLines: string[] = [];
  if (reportsCount > 0) {
    valueLines.push(fr
      ? `${reportsCount} bilan${reportsCount > 1 ? "s" : ""} généré${reportsCount > 1 ? "s" : ""}`
      : `${reportsCount} report${reportsCount > 1 ? "s" : ""} generated`);
  }
  if (profilesCount > 0) {
    valueLines.push(fr
      ? `${profilesCount} profil${profilesCount > 1 ? "s" : ""} sauvegardé${profilesCount > 1 ? "s" : ""}`
      : `${profilesCount} saved profile${profilesCount > 1 ? "s" : ""}`);
  }
  valueLines.push(fr ? "Recalculs illimites" : "Unlimited recalculations");

  const cardContent = `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">${fr ? "Votre utilisation Laboratoire" : "Your Lab usage"}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:2;">
                  ${valueLines.map(l => `&bull; ${l}`).join("<br/>")}
                </td></tr>
              </table>`;

  const html = buildRenewalHtml({
    lang,
    subject,
    preheader: fr
      ? `Expire le ${expFormatted}. Renouvelez pour 29 $/an.`
      : `Expires ${expFormatted}. Renew for $29/year.`,
    heading,
    bodyParagraphs: [bodyP1, bodyP2],
    cardContent,
    ctaUrl: checkoutUrl,
    ctaLabel: fr ? "Renouveler maintenant \u2014 29\u00a0$/an" : "Renew now \u2014 $29/year",
    secondaryCtaUrl: simUrl,
    secondaryCtaLabel: fr ? "Ouvrir mon simulateur" : "Open my simulator",
    infoNote: null,
  });

  const text = fr
    ? `${subject}\n\nVotre Laboratoire expire le ${expFormatted}.\nRenouvelez pour 29 $/an: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nYour Lab expires on ${expFormatted}.\nRenew for $29/year: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Renewal J-30 send failed:", error);
    throw new Error(`Renewal J-30 email failed: ${error.message}`);
  }
}

// ── J-7: Urgent Renewal Reminder (7 days before expiry) ─────

export async function sendRenewalReminderJ7Email(params: RenewalEmailParams) {
  const { to, lang, token, expiryDate, reportsCount, profilesCount } = params;
  const fr = lang === "fr";
  const expFormatted = formatExpiryDate(expiryDate, fr);
  const checkoutUrl = renewalCheckoutUrl(to);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  const simUrl = `${base}/acces?token=${token}`;

  const subject = fr
    ? "Rappel : votre accès Laboratoire expire dans 7 jours"
    : "Reminder: your Lab access expires in 7 days";

  const heading = fr
    ? "7 jours restants"
    : "7 days remaining";

  const bodyP1 = fr
    ? `Votre accès au Laboratoire expire le ${expFormatted}. Après cette date, le Laboratoire passera en lecture seule.`
    : `Your Lab access expires on ${expFormatted}. After that date, the Lab will switch to read-only mode.`;

  const bodyP2 = fr
    ? `Vos ${profilesCount} profil${profilesCount !== 1 ? "s" : ""} et ${reportsCount} bilan${reportsCount !== 1 ? "s" : ""} seront conservés 12 mois. Le renouvellement à 29\u00a0$/an réactive immédiatement l\u2019ensemble de vos outils.`
    : `Your ${profilesCount} profile${profilesCount !== 1 ? "s" : ""} and ${reportsCount} report${reportsCount !== 1 ? "s" : ""} will be preserved for 12 months. Renewal at $29/year reactivates all your tools immediately.`;

  const html = buildRenewalHtml({
    lang,
    subject,
    preheader: fr
      ? `Plus que 7 jours. Renouvelez pour conserver votre simulateur.`
      : `Only 7 days left. Renew to keep your simulator.`,
    heading,
    bodyParagraphs: [bodyP1, bodyP2],
    cardContent: null,
    ctaUrl: checkoutUrl,
    ctaLabel: fr ? "Renouveler maintenant \u2014 29\u00a0$/an" : "Renew now \u2014 $29/year",
    secondaryCtaUrl: simUrl,
    secondaryCtaLabel: fr ? "Ouvrir mon simulateur" : "Open my simulator",
    infoNote: fr
      ? "Après expiration, vos données seront conservées 12 mois en lecture seule."
      : "After expiration, your data will be preserved for 12 months in read-only mode.",
  });

  const text = fr
    ? `${subject}\n\nPlus que 7 jours. Renouvelez pour conserver votre simulateur.\nRenouveler: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nOnly 7 days left. Renew to keep your simulator.\nRenew: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Renewal J-7 send failed:", error);
    throw new Error(`Renewal J-7 email failed: ${error.message}`);
  }
}

// ── J-0: Expiry Day Notice ──────────────────────────────────

export async function sendRenewalExpiryEmail(params: RenewalEmailParams) {
  const { to, lang, token, expiryDate, reportsCount, profilesCount } = params;
  const fr = lang === "fr";
  const checkoutUrl = renewalCheckoutUrl(to);
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  const simUrl = `${base}/acces?token=${token}`;

  const subject = fr
    ? "Votre accès Laboratoire expire aujourd\u2019hui"
    : "Your Lab access expires today";

  const heading = fr
    ? "Votre accès expire aujourd\u2019hui"
    : "Your access expires today";

  const bodyP1 = fr
    ? "Votre accès au Laboratoire arrive à échéance. Une période de grâce de quelques jours vous permet encore de naviguer et de consulter vos données."
    : "Your Lab access is expiring. A short grace period still allows you to browse and view your data.";

  const bodyP2 = fr
    ? "Pour continuer à recalculer vos scénarios et générer des bilans AI, le renouvellement à 29\u00a0$/an réactive instantanément votre simulateur complet."
    : "To continue recalculating your scenarios and generating AI assessments, renewal at $29/year instantly reactivates your full simulator.";

  const bodyP3 = fr
    ? `Vos ${profilesCount} profil${profilesCount !== 1 ? "s" : ""} et ${reportsCount} bilan${reportsCount !== 1 ? "s" : ""} restent accessibles en lecture seule pendant 12 mois.`
    : `Your ${profilesCount} profile${profilesCount !== 1 ? "s" : ""} and ${reportsCount} report${reportsCount !== 1 ? "s" : ""} remain accessible in read-only mode for 12 months.`;

  const html = buildRenewalHtml({
    lang,
    subject,
    preheader: fr
      ? "Dernier jour d\u2019accès complet. Renouvelez pour continuer."
      : "Last day of full access. Renew to continue.",
    heading,
    bodyParagraphs: [bodyP1, bodyP2, bodyP3],
    cardContent: null,
    ctaUrl: checkoutUrl,
    ctaLabel: fr ? "Renouveler maintenant \u2014 29\u00a0$/an" : "Renew now \u2014 $29/year",
    secondaryCtaUrl: simUrl,
    secondaryCtaLabel: fr ? "Consulter mes données" : "View my data",
    infoNote: fr
      ? "Si vous ne renouvelez pas, vos données seront conservées 12 mois puis supprimées."
      : "If you do not renew, your data will be kept for 12 months then deleted.",
  });

  const text = fr
    ? `${subject}\n\nDernier jour d'accès complet. Renouvelez pour continuer.\nRenouveler: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nLast day of full access. Renew to continue.\nRenew: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Renewal J-0 send failed:", error);
    throw new Error(`Renewal J-0 email failed: ${error.message}`);
  }
}

// ── J+3: Grace Period Notice (read-only warning) ────────────

export async function sendRenewalGraceEmail(params: RenewalEmailParams) {
  const { to, lang, token, expiryDate, reportsCount, profilesCount } = params;
  const fr = lang === "fr";
  const expFormatted = formatExpiryDate(expiryDate, fr);
  const checkoutUrl = renewalCheckoutUrl(to);

  const subject = fr
    ? "Votre Laboratoire est en lecture seule"
    : "Your Lab is in read-only mode";

  const heading = fr
    ? "Votre simulateur est en lecture seule"
    : "Your simulator is in read-only mode";

  const bodyP1 = fr
    ? `Votre accès Laboratoire a expiré le ${expFormatted}. Le Laboratoire est maintenant en mode lecture seule\u00a0: vous pouvez consulter vos bilans existants, mais les recalculs et les exports AI ne sont plus disponibles.`
    : `Your Lab access expired on ${expFormatted}. The Lab is now in read-only mode: you can view your existing assessments, but recalculations and AI exports are no longer available.`;

  const bodyP2 = fr
    ? `Vos ${profilesCount} profil${profilesCount !== 1 ? "s" : ""} et ${reportsCount} bilan${reportsCount !== 1 ? "s" : ""} sont préservés pendant 12 mois. Rien n\u2019est perdu.`
    : `Your ${profilesCount} profile${profilesCount !== 1 ? "s" : ""} and ${reportsCount} report${reportsCount !== 1 ? "s" : ""} are preserved for 12 months. Nothing is lost.`;

  const bodyP3 = fr
    ? "Le renouvellement à 29\u00a0$/an réactive instantanément votre simulateur complet, avec 3 exports AI et le Bilan Annuel inclus."
    : "Renewal at $29/year instantly reactivates your full simulator, with 3 AI exports and the Annual Assessment included.";

  // Value reminder card
  const cardContent = `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">${fr ? "Ce que le renouvellement inclut" : "What renewal includes"}</td></tr>
                <tr><td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:2;">
                  &bull; ${fr ? "Simulations illimitées avec recalcul instantané" : "Unlimited simulations with instant recalculation"}<br/>
                  &bull; ${fr ? "3 exports AI personnalisés" : "3 personalized AI exports"}<br/>
                  &bull; ${fr ? "Bilan Annuel (vérification de janvier)" : "Annual Assessment (January check-up)"}<br/>
                  &bull; ${fr ? "Tous vos profils et données existants" : "All your existing profiles and data"}
                </td></tr>
              </table>`;

  const html = buildRenewalHtml({
    lang,
    subject,
    preheader: fr
      ? "Vos données sont préservées. Réactivez votre simulateur."
      : "Your data is preserved. Reactivate your simulator.",
    heading,
    bodyParagraphs: [bodyP1, bodyP2, bodyP3],
    cardContent,
    ctaUrl: checkoutUrl,
    ctaLabel: fr ? "Réactiver mon simulateur \u2014 29\u00a0$/an" : "Reactivate my simulator \u2014 $29/year",
    infoNote: fr
      ? "Vos données seront conservées 12 mois après expiration. Aucune action requise pour les préserver."
      : "Your data will be preserved for 12 months after expiration. No action needed to keep them.",
  });

  const text = fr
    ? `${subject}\n\nVos données sont préservées. Réactivez votre simulateur.\nRéactiver: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nYour data is preserved. Reactivate your simulator.\nReactivate: ${checkoutUrl}\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Renewal J+3 send failed:", error);
    throw new Error(`Renewal J+3 email failed: ${error.message}`);
  }
}

// ── 6-Month Anniversary Reminder Email ────────────────────

interface AnniversaryReminderParams {
  to: string;
  lang: "fr" | "en";
  lastAccessDate: string;
  contextualQuestions: string[];
  token: string;
}

export async function sendAnniversaryReminderEmail(params: AnniversaryReminderParams) {
  const { to, lang, lastAccessDate, contextualQuestions, token } = params;
  const fr = lang === "fr";
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca";
  const magicUrl = buildMagicLinkUrl(token);
  const lastDate = new Date(lastAccessDate).toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = fr
    ? "Il est peut-\u00eatre temps de recalculer votre plan \u2014 buildfi.ca"
    : "It may be time to recalculate your plan \u2014 buildfi.ca";

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: fr
      ? "6 mois depuis votre dernier calcul"
      : "6 months since your last calculation",
    bodyP1: fr
      ? `Votre dernier calcul date du ${lastDate}. Beaucoup de choses ont pu changer depuis \u2014 revenus, \u00e9pargne, march\u00e9s, objectifs.`
      : `Your last calculation was on ${lastDate}. A lot may have changed since then \u2014 income, savings, markets, goals.`,
    bodyP2: fr
      ? "Voici quelques questions \u00e0 consid\u00e9rer\u00a0:"
      : "Here are a few questions to consider:",
    cta: fr ? "Recalculer mon plan" : "Recalculate my plan",
    fallback: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    fallbackLink: fr ? "Ouvrir directement" : "Open directly",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue pas un avis financier personnalis\u00e9."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada",
    contact: fr ? "Une question\u00a0?" : "Questions?",
    unsubNote: fr
      ? "Vous recevez ce courriel car vous avez un compte Laboratoire actif."
      : "You are receiving this email because you have an active Lab account.",
  };

  const questionsList = contextualQuestions
    .map((q) => `<li style="margin-bottom:8px;font-size:13px;color:${GRAY};line-height:1.6">${q}</li>`)
    .join("");

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
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:20px;">
          <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
          <p style="margin:0 0 10px 0;">${s.bodyP2}</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
            <tr><td style="padding:18px 24px;">
              <ul style="margin:0;padding-left:20px;list-style-type:disc;">
                ${questionsList}
              </ul>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-bottom:4px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr><td align="center" style="background-color:${GOLD};border-radius:10px;">
              <a href="${magicUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">${s.cta}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-top:12px;padding-bottom:28px;">
          ${s.fallback} <a href="${magicUrl}" style="color:${GOLD};text-decoration:underline;">${s.fallbackLink}</a>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:12px;color:#999999;line-height:1.6;text-align:center;padding-bottom:24px;background-color:${CARD_BG};border-radius:8px;padding:16px;">
          ${s.unsubNote}
        </td></tr>
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
              <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se d\u00e9sabonner" : "Unsubscribe"}</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = fr
    ? `${subject}\n\n6 mois depuis votre dernier calcul. Il est peut-etre temps de recalculer.\n\nOuvrir mon simulateur: ${magicUrl}\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\n6 months since your last calculation. It may be time to recalculate.\n\nOpen my simulator: ${magicUrl}\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Anniversary reminder send failed:", error);
    throw new Error(`Anniversary reminder email failed: ${error.message}`);
  }
}

// ── Referral Auto-Upgrade Congratulations Email ─────────────

interface ReferralUpgradeParams {
  to: string;
  lang: "fr" | "en";
  newExpiry: string;
}

export async function sendReferralUpgradeEmail(params: ReferralUpgradeParams) {
  const { to, lang, newExpiry } = params;
  const fr = lang === "fr";
  const expiryFormatted = new Date(newExpiry).toLocaleDateString(fr ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = fr
    ? "F\u00e9licitations\u00a0! 1 an d\u2019acc\u00e8s Laboratoire gratuit \u2014 buildfi.ca"
    : "Congratulations! 1 free year of Lab access \u2014 buildfi.ca";

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: fr ? "1 an d\u2019acc\u00e8s Laboratoire gratuit" : "1 free year of Lab access",
    bodyP1: fr
      ? "Gr\u00e2ce \u00e0 vos 3 r\u00e9f\u00e9rences, vous avez d\u00e9bloqu\u00e9 une ann\u00e9e compl\u00e8te d\u2019acc\u00e8s Laboratoire gratuit\u00a0!"
      : "Thanks to your 3 referrals, you\u2019ve unlocked a full year of free Lab access!",
    bodyP2: fr
      ? `Votre acc\u00e8s Laboratoire est d\u00e9sormais valide jusqu\u2019au ${expiryFormatted}. Vous avez aussi re\u00e7u 3 exports AI suppl\u00e9mentaires.`
      : `Your Lab access is now valid until ${expiryFormatted}. You also received 3 additional AI exports.`,
    bodyP3: fr
      ? "Continuez \u00e0 partager BuildFi \u2014 chaque nouvelle r\u00e9f\u00e9rence contribue \u00e0 rendre la planification financi\u00e8re accessible \u00e0 tous."
      : "Keep sharing BuildFi \u2014 every new referral helps make financial planning accessible to everyone.",
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
          <p style="margin:0 0 14px 0;">${s.bodyP2}</p>
          <p style="margin:0;">${s.bodyP3}</p>
        </td></tr>
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
              <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se d\u00e9sabonner" : "Unsubscribe"}</a>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = fr
    ? `${subject}\n\n1 an d'accès Laboratoire gratuit grâce à vos 3 références!\nValide jusqu'au ${expiryFormatted}. 3 exports AI supplémentaires inclus.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\n1 free year of Lab access thanks to your 3 referrals!\nValid until ${expiryFormatted}. 3 additional AI exports included.\n\nsupport@buildfi.ca | buildfi.ca`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    replyTo: "support@buildfi.ca",
    to: [to],
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": "<mailto:support@buildfi.ca?subject=Unsubscribe>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });

  if (error) {
    console.error("[email-expert] Referral upgrade send failed:", error);
    throw new Error(`Referral upgrade email failed: ${error.message}`);
  }
}
