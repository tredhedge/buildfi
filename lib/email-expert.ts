// /lib/email-expert.ts
// Expert-specific email templates: magic link + report delivery
// Same table-based HTML, palette, and font stack as lib/email.ts

import { Resend } from "resend";
import { buildMagicLinkUrl } from "@/lib/auth";

const resend = new Resend(process.env.RESEND_API_KEY);

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BG = "#FEFCF9";
const DARK = "#1A1208";
const GOLD = "#c4944a";
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
    ? "Votre acc\u00e8s Planner \u2014 buildfi.ca"
    : "Your Planner access \u2014 buildfi.ca";

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: isNewAccount
      ? (fr ? "Bienvenue dans le Planner" : "Welcome to the Planner")
      : (fr ? "Votre lien d\u2019acc\u00e8s" : "Your access link"),
    bodyP1: isNewAccount
      ? (fr
        ? "Merci pour votre achat. Votre Planner est pr\u00eat. Cliquez le bouton ci-dessous pour y acc\u00e9der."
        : "Thank you for your purchase. Your Planner is ready. Click the button below to access it.")
      : (fr
        ? "Voici votre nouveau lien d\u2019acc\u00e8s au Planner. Ce lien remplace tout lien pr\u00e9c\u00e9dent."
        : "Here is your new Planner access link. This link replaces any previous link."),
    bodyP2: fr
      ? "Ce lien est permanent et personnel. Ajoutez-le \u00e0 vos favoris pour un acc\u00e8s rapide."
      : "This link is permanent and personal. Bookmark it for quick access.",
    cta: fr ? "Acc\u00e9der \u00e0 mon simulateur" : "Access my simulator",
    fallback: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    fallbackLink: fr ? "Ouvrir directement" : "Open directly",
    includes: fr ? "Votre acc\u00e8s Planner inclut\u00a0:" : "Your Planner access includes:",
    feat1: fr ? "Simulations illimit\u00e9es avec recalcul instantan\u00e9" : "Unlimited simulations with instant recalculation",
    feat2: fr ? "5 rapports IA personnalis\u00e9s" : "5 personalized AI reports",
    feat3: fr ? "Acc\u00e8s \u00e0 vie \u2014 paiement unique, sans abonnement" : "Lifetime access \u2014 one-time payment, no subscription",
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
    ? `${subject}\n\n${isNewAccount ? "Bienvenue dans le Planner." : "Votre lien d'accès."}\n\nAccéder à mon Planner: ${magicUrl}\n\nCe lien est permanent et personnel — ajoutez-le à vos favoris. Si vous n'avez pas demandé cet accès, ignorez ce courriel.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\n${isNewAccount ? "Welcome to the Planner." : "Your access link."}\n\nAccess my Planner: ${magicUrl}\n\nThis link is permanent and personal — bookmark it. If you did not request this access, ignore this email.\n\nsupport@buildfi.ca | buildfi.ca`;

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
    ? `Votre rapport Planner buildfi.ca est pr\u00eat \u2014 Note ${grade}`
    : `Your buildfi.ca Planner report is ready \u2014 Grade ${grade}`;

  const preheader = fr
    ? `Note ${grade} \u2014 taux de r\u00e9ussite ${successPct}%. Votre rapport Planner personnalis\u00e9 est pr\u00eat.`
    : `Grade ${grade} \u2014 ${successPct}% success rate. Your personalized Planner report is ready.`;

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    tierLabel: fr ? "Rapport Planner" : "Planner Report",
    successLabel: fr ? `Taux de r\u00e9ussite\u00a0: ${successPct}\u00a0%` : `Success rate: ${successPct}%`,
    bodyP1: fr
      ? "Votre rapport Planner personnalis\u00e9 est pr\u00eat. Cliquez le bouton ci-dessous pour le consulter."
      : "Your personalized Planner report is ready. Click the button below to view it.",
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
    ? `${subject}\n\nVotre rapport Planner est prêt.\nNote: ${grade} | Taux de réussite: ${successPct}%\n\nConsulter mon rapport: ${downloadUrl}\nOuvrir mon Planner: ${magicLinkUrl}\n\nCe lien est valide 30 jours.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nYour Planner report is ready.\nGrade: ${grade} | Success rate: ${successPct}%\n\nView my report: ${downloadUrl}\nOpen my Planner: ${magicLinkUrl}\n\nThis link is valid for 30 days.\n\nsupport@buildfi.ca | buildfi.ca`;

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

// ── Referral Auto-Upgrade Congratulations Email ─────────────

interface ReferralUpgradeParams {
  to: string;
  lang: "fr" | "en";
  creditsAdded: number;
  newTotal: number;
}

export async function sendReferralUpgradeEmail(params: ReferralUpgradeParams) {
  const { to, lang, creditsAdded, newTotal } = params;
  const fr = lang === "fr";

  const subject = fr
    ? `F\u00e9licitations\u00a0! ${creditsAdded} rapports IA gratuits \u2014 buildfi.ca`
    : `Congratulations! ${creditsAdded} free AI reports \u2014 buildfi.ca`;

  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    heading: fr ? `${creditsAdded} rapports IA gratuits` : `${creditsAdded} free AI reports`,
    bodyP1: fr
      ? `Gr\u00e2ce \u00e0 vos 3 r\u00e9f\u00e9rences, vous avez d\u00e9bloqu\u00e9 ${creditsAdded} rapports IA gratuits, ajout\u00e9s \u00e0 votre compte Planner\u00a0!`
      : `Thanks to your 3 referrals, you\u2019ve unlocked ${creditsAdded} free AI reports, added to your Planner account!`,
    bodyP2: fr
      ? `Vous avez maintenant ${newTotal} rapport${newTotal > 1 ? "s" : ""} IA \u00e0 g\u00e9n\u00e9rer quand vous le souhaitez \u2014 aucune expiration, aucun abonnement.`
      : `You now have ${newTotal} AI report${newTotal > 1 ? "s" : ""} to generate whenever you like \u2014 no expiry, no subscription.`,
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
    ? `${subject}\n\n${creditsAdded} rapports IA gratuits grâce à vos 3 références !\nVous avez maintenant ${newTotal} rapport(s) IA — aucune expiration.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\n${creditsAdded} free AI reports thanks to your 3 referrals!\nYou now have ${newTotal} AI report(s) — no expiry.\n\nsupport@buildfi.ca | buildfi.ca`;

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

// ── Report Pack Purchase Receipt ──────────────────────────
// Confirmation for the +4 AI report credits top-up ($19.99), sold only to
// existing Planner customers. Also covers the legacy +1 addon.

interface ReportPackReceiptParams {
  to: string;
  lang: "fr" | "en";
  creditsAdded: number;
  newTotal: number;
}

export async function sendReportPackReceiptEmail(params: ReportPackReceiptParams) {
  const { to, lang, creditsAdded, newTotal } = params;
  const fr = lang === "fr";

  const subject = fr
    ? `Reçu — ${creditsAdded} rapports IA ajoutés (buildfi.ca)`
    : `Receipt — ${creditsAdded} AI reports added (buildfi.ca)`;

  const s = {
    tagline: fr ? "Planification financière accessible" : "Accessible financial planning",
    heading: fr ? "Merci pour votre achat" : "Thank you for your purchase",
    bodyP1: fr
      ? `${creditsAdded} rapports IA ont été ajoutés à votre compte Planner.`
      : `${creditsAdded} AI reports have been added to your Planner account.`,
    bodyP2: fr
      ? `Vous avez maintenant ${newTotal} rapport${newTotal > 1 ? "s" : ""} IA à générer quand vous le souhaitez — aucune expiration, aucun abonnement.`
      : `You now have ${newTotal} AI report${newTotal > 1 ? "s" : ""} to generate whenever you like — no expiry, no subscription.`,
    balanceLabel: fr ? "Solde de rapports IA" : "AI report balance",
    disclaimer: fr
      ? "Cet outil est fourni à titre informatif et éducatif seulement. Il ne constitue pas un avis financier personnalisé."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Québec, Canada" : "Quebec, Canada",
    contact: fr ? "Une question ?" : "Questions?",
    productType: fr ? "Produit numérique — livraison instantanée" : "Digital product — instant delivery",
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
    ${s.heading}${"&#847; &zwnj; &nbsp; ".repeat(20)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">
        <tr><td align="center" style="padding-bottom:32px;">
          <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
          <br/><span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">${s.tagline}</span>
        </td></tr>
        <tr><td style="font-family:${FONT};font-size:22px;font-weight:700;color:${DARK};padding-bottom:16px;text-align:center;">${s.heading}</td></tr>
        <tr><td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:24px;">
          <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
          <p style="margin:0;">${s.bodyP2}</p>
        </td></tr>
        <!-- Balance card -->
        <tr><td align="center" style="padding-bottom:28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:16px;border:2px solid ${GOLD};">
            <tr><td align="center" style="padding:28px 24px;">
              <div style="font-family:${FONT};font-size:12px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:10px;">${s.balanceLabel}</div>
              <div style="font-family:${FONT};font-size:44px;font-weight:700;color:${DARK};line-height:1;">${newTotal}</div>
              <div style="font-family:${FONT};font-size:13px;color:${GRAY};padding-top:8px;">${fr ? `+${creditsAdded} ajoutés` : `+${creditsAdded} added`}</div>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="border-top:1px solid ${BORDER};padding-top:24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
              <a href="https://www.buildfi.ca/conditions" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/confidentialite" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialité" : "Privacy"}</a>
              &nbsp;&middot;&nbsp;
              <a href="https://www.buildfi.ca/avis-legal" style="color:${GOLD};text-decoration:none;">${fr ? "Avis légal" : "Legal"}</a>
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.disclaimer}</td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.contact} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a></td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
              <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
            </td></tr>
            <tr><td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">${s.productType}</td></tr>
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

  const text = fr
    ? `${subject}\n\nMerci pour votre achat.\n${creditsAdded} rapports IA ajoutés — solde: ${newTotal}.\nAucune expiration, aucun abonnement.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nThank you for your purchase.\n${creditsAdded} AI reports added — balance: ${newTotal}.\nNo expiry, no subscription.\n\nsupport@buildfi.ca | buildfi.ca`;

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
    console.error("[email-expert] Report pack receipt send failed:", error);
    throw new Error(`Report pack receipt email failed: ${error.message}`);
  }
}
