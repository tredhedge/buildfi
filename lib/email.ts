// /lib/email.ts
// Email delivery via Resend — table-based HTML for Outlook/Gmail compat

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const BG = "#FEFCF9";
const DARK = "#1A1208";
const GOLD = "#C4944A";
const GRAY = "#666666";
const BORDER = "#E8E0D4";
const CARD_BG = "#F8F4EE";

interface SendReportParams {
  to: string;
  lang: "fr" | "en";
  tier: string;
  downloadUrl: string;
  grade: string;
  successPct: number;
  feedbackToken?: string;
}

export async function sendReportEmail(params: SendReportParams) {
  const { to, lang, tier, downloadUrl, grade, successPct } = params;
  const fr = lang === "fr";

  const tierName = fr
    ? { essentiel: "Essentiel", intermediaire: "Intermédiaire", expert: "Expert" }[tier] || tier
    : { essentiel: "Essential", intermediaire: "Intermediate", expert: "Expert" }[tier] || tier;

  const subject = fr
    ? `Votre bilan ${tierName} buildfi.ca est prêt — Note ${grade}`
    : `Your buildfi.ca ${tierName} assessment is ready — Grade ${grade}`;

  const html = buildEmailHTML({ lang, tier, tierName, grade, successPct, downloadUrl, feedbackToken: params.feedbackToken });

  const text = fr
    ? `${subject}\n\nVotre bilan personnalisé est prêt.\nNote: ${grade} | Taux de réussite: ${successPct}%\n\nConsulter mon bilan: ${downloadUrl}\n\nCe lien est valide 30 jours.\n\nCet outil est fourni à titre informatif et educatif seulement. Il ne constitue pas un avis financier personnalisé.\n\nsupport@buildfi.ca | buildfi.ca`
    : `${subject}\n\nYour personalized assessment is ready.\nGrade: ${grade} | Success rate: ${successPct}%\n\nView my assessment: ${downloadUrl}\n\nThis link is valid for 30 days.\n\nThis tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.\n\nsupport@buildfi.ca | buildfi.ca`;

  const { data, error } = await resend.emails.send({
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
    console.error("[email] Send failed:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  return data;
}

function buildEmailHTML(params: {
  lang: "fr" | "en";
  tier: string;
  tierName: string;
  grade: string;
  successPct: number;
  downloadUrl: string;
  feedbackToken?: string;
}): string {
  const { lang, tier, tierName, grade, successPct, downloadUrl, feedbackToken } = params;
  const fr = lang === "fr";

  // A-3: Dynamic preheader
  const preheader = fr
    ? `Note ${grade} \u2014 taux de r\u00e9ussite ${successPct}%. Votre bilan personnalis\u00e9 est pr\u00eat.`
    : `Grade ${grade} \u2014 ${successPct}% success rate. Your personalized report is ready.`;

  // Invisible spacer to push preheader and prevent Gmail from pulling body text
  const preheaderPad = "&#847; &zwnj; &nbsp; ".repeat(30);

  // E-3: All user-facing strings, fully bilingual
  const s = {
    tagline: fr ? "Planification financi\u00e8re accessible" : "Accessible financial planning",
    tierLabel: fr ? `Bilan ${tierName}` : `${tierName} Assessment`,
    successLabel: fr ? `Taux de r\u00e9ussite\u00a0: ${successPct}\u00a0%` : `Success rate: ${successPct}%`,
    bodyP1: fr
      ? "Votre bilan de retraite personnalis\u00e9 est pr\u00eat. Cliquez le bouton ci-dessous pour le consulter."
      : "Your personalized retirement assessment is ready. Click the button below to view it.",
    // E-7: "Monte Carlo" removed — replaced with "scénarios"
    bodyP2: fr
      ? "Ce rapport est bas\u00e9 sur 5\u00a0000 sc\u00e9narios de votre situation financi\u00e8re. Chaque dollar provient directement du moteur de calcul\u00a0\u2014\u00a0aucune estimation approximative."
      : "This report is based on 5,000 scenarios of your financial situation. Every dollar comes directly from the calculation engine\u2009\u2014\u2009no rough estimates.",
    cta: fr ? "Consulter mon bilan" : "View my assessment",
    linkExpiry: fr ? "Ce lien est valide 30\u00a0jours" : "This link is valid for 30\u00a0days",
    fallbackLink: fr ? "Si le bouton ne fonctionne pas\u00a0:" : "If the button doesn\u2019t work:",
    upsellTitle: fr ? "Envie d\u2019aller plus loin\u00a0?" : "Want to go further?",
    // E-1: "stratégies optimisées" → "approches possibles"
    // E-2: "Votre note pourrait changer" → "Une analyse plus détaillée..."
    upsellBody: fr
      ? (tier === "intermediaire"
        ? "Le Simulateur Expert int\u00e8gre la planification RESP, la conversion REER\u00a0\u2192\u00a0FERR optimis\u00e9e, 5\u00a0profils de risque, la strat\u00e9gie FRV/CRI avanc\u00e9e et l\u2019analyse successorale compl\u00e8te. Une analyse encore plus approfondie pourrait r\u00e9v\u00e9ler des leviers suppl\u00e9mentaires."
        : "Le rapport Interm\u00e9diaire analyse votre immobilier, votre couple, vos dettes en d\u00e9tail et explore 5\u00a0approches possibles. Une analyse plus d\u00e9taill\u00e9e pourrait r\u00e9v\u00e9ler un portrait diff\u00e9rent.")
      : (tier === "intermediaire"
        ? "The Expert Simulator includes RESP planning, optimized RRSP\u00a0\u2192\u00a0RRIF conversion, 5\u00a0risk profiles, advanced LIF/LIRA strategy, and full estate analysis. An even deeper analysis could reveal additional levers."
        : "The Interm\u00e9diaire report analyzes your real estate, couple dynamics, and debts in detail, exploring 5\u00a0possible approaches. A more detailed analysis could reveal a different picture."),
    upsellCta: fr ? "En savoir plus\u00a0\u2192" : "Learn more\u00a0\u2192",
    disclaimer: fr
      ? "Cet outil est fourni \u00e0 titre informatif et \u00e9ducatif seulement. Il ne constitue pas un avis financier personnalis\u00e9."
      : "This tool is provided for informational and educational purposes only. It does not constitute personalized financial advice.",
    location: fr ? "Qu\u00e9bec, Canada" : "Quebec, Canada",
    productType: fr ? "Produit num\u00e9rique\u00a0\u2014\u00a0livraison instantan\u00e9e" : "Digital product\u00a0\u2014\u00a0instant delivery",
    contactLabel: fr ? "Une question\u00a0?" : "Questions?",
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${lang}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${fr ? "Votre bilan buildfi.ca" : "Your buildfi.ca assessment"}</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};-webkit-font-smoothing:antialiased;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%;">

  <!-- Preheader (hidden preview text) -->
  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${preheader}${preheaderPad}
  </div>

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Inner container (580px) -->
        <table role="presentation" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

          <!-- LOGO -->
          <!-- E-6: font-weight:700 (Helvetica Neue native weight) -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-family:${FONT};font-size:26px;font-weight:700;color:${DARK};letter-spacing:-0.5px;">build</span><span style="font-family:${FONT};font-size:26px;font-weight:700;color:${GOLD};letter-spacing:-0.5px;">fi</span>
              <br/>
              <span style="font-family:${FONT};font-size:11px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:2px;">
                ${s.tagline}
              </span>
            </td>
          </tr>

          <!-- GRADE CARD -->
          <!-- E-5: border-radius:16px ignored by Outlook desktop (falls back to rectangle). Acceptable. -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:16px;border:2px solid ${GOLD};">
                <tr>
                  <td align="center" style="padding:36px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:12px;color:${GOLD};font-weight:600;text-transform:uppercase;letter-spacing:1.5px;padding-bottom:14px;">
                          ${s.tierLabel}
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:56px;font-weight:700;color:${DARK};line-height:1;">
                          ${grade}
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:14px;color:${GRAY};padding-top:10px;">
                          ${s.successLabel}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY TEXT -->
          <tr>
            <td style="font-family:${FONT};font-size:15px;color:#333333;line-height:1.8;padding-bottom:28px;">
              <p style="margin:0 0 14px 0;">${s.bodyP1}</p>
              <p style="margin:0;">${s.bodyP2}</p>
            </td>
          </tr>

          <!-- CTA BUTTON (bulletproof — table-based for Outlook) -->
          <tr>
            <td align="center" style="padding-bottom:4px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td align="center" style="background-color:${GOLD};border-radius:10px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${downloadUrl}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="21%" fillcolor="${GOLD}" stroke="f">
                    <center style="color:#ffffff;font-family:${FONT};font-size:15px;font-weight:700;">
                      ${s.cta}
                    </center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${downloadUrl}" style="display:inline-block;padding:14px 40px;color:#ffffff;text-decoration:none;font-family:${FONT};font-size:15px;font-weight:700;line-height:1.2;">
                      ${s.cta}
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- A-1: Plaintext fallback link below CTA -->
          <tr>
            <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-top:12px;padding-bottom:4px;">
              ${s.fallbackLink} <a href="${downloadUrl}" style="color:${GOLD};text-decoration:underline;">${fr ? "Ouvrir mon rapport directement" : "Open my report directly"}</a>
            </td>
          </tr>

          <tr>
            <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;padding-bottom:32px;">
              ${s.linkExpiry}
            </td>
          </tr>

          <!-- BONUS RESOURCES -->
          <tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
                <tr>
                  <td style="padding:18px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:10px;">
                          ${fr ? "Ressources incluses" : "Included resources"}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family:${FONT};font-size:12px;color:${GRAY};line-height:2;">
                          &#8226;&nbsp;<a href="https://www.buildfi.ca/${fr ? "guide-101-les-bases-de-vos-finances.pdf" : "guide-101-your-financial-basics.pdf"}" style="color:${GOLD};text-decoration:none;font-weight:600;">${fr ? "Guide 101 : Les bases de vos finances" : "Guide 101: Your Financial Basics"}</a> (PDF)<br>
                          <!-- Guide 201+301 is Intermediaire-only -->
                          &#8226;&nbsp;<a href="https://www.buildfi.ca/outils/dettes" style="color:${GOLD};text-decoration:none;font-weight:600;">${fr ? "Outil d\u2019analyse des dettes" : "Debt analysis tool"}</a> \u2014 ${fr ? "interactif, z\u00e9ro frais" : "interactive, zero cost"}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FEEDBACK LINK -->
          ${feedbackToken ? `<tr>
            <td align="center" style="padding-bottom:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
                <tr>
                  <td style="padding:16px 24px;text-align:center;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:13px;font-weight:600;color:${DARK};padding-bottom:6px;">
                          ${fr ? "Votre avis compte" : "Your feedback matters"}
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:12px;color:${GRAY};line-height:1.6;padding-bottom:8px;">
                          ${fr ? "Notez votre rapport en un clic \u2014 cela nous aide \u00e0 am\u00e9liorer buildfi.ca." : "Rate your report in one click \u2014 it helps us improve buildfi.ca."}
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="font-family:${FONT};font-size:13px;padding-top:4px;">
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/api/feedback?token=${feedbackToken}&rating=5" style="color:${GOLD};text-decoration:none;font-size:24px;padding:0 3px;">&#9733;</a>
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/api/feedback?token=${feedbackToken}&rating=4" style="color:${GOLD};text-decoration:none;font-size:24px;padding:0 3px;">&#9733;</a>
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/api/feedback?token=${feedbackToken}&rating=3" style="color:#d4cec4;text-decoration:none;font-size:24px;padding:0 3px;">&#9733;</a>
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/api/feedback?token=${feedbackToken}&rating=2" style="color:#d4cec4;text-decoration:none;font-size:24px;padding:0 3px;">&#9733;</a>
                          <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://www.buildfi.ca"}/api/feedback?token=${feedbackToken}&rating=1" style="color:#d4cec4;text-decoration:none;font-size:24px;padding:0 3px;">&#9733;</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- UPSELL (hidden for expert tier — no higher tier) -->
          ${tier === "expert" ? "" : `<tr>
            <td style="padding-bottom:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CARD_BG};border-radius:10px;border:1px solid ${BORDER};">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};padding-bottom:8px;">
                          ${s.upsellTitle}
                        </td>
                      </tr>
                      <tr>
                        <td style="font-family:${FONT};font-size:13px;color:${GRAY};line-height:1.7;">
                          ${s.upsellBody}
                        </td>
                      </tr>
                      <!-- A-2: Upsell CTA link -->
                      <tr>
                        <td style="font-family:${FONT};font-size:13px;color:${GOLD};font-weight:700;padding-top:10px;">
                          <a href="https://www.buildfi.ca/index.html#products" style="color:${GOLD};text-decoration:none;">
                            ${s.upsellCta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`}

          <!-- FOOTER -->
          <tr>
            <td style="border-top:1px solid ${BORDER};padding-top:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:10px;">
                    <a href="https://www.buildfi.ca/conditions.html" style="color:${GOLD};text-decoration:none;">${fr ? "Conditions" : "Terms"}</a>
                    &nbsp;&middot;&nbsp;
                    <a href="https://www.buildfi.ca/confidentialite.html" style="color:${GOLD};text-decoration:none;">${fr ? "Confidentialit\u00e9" : "Privacy"}</a>
                    &nbsp;&middot;&nbsp;
                    <a href="https://www.buildfi.ca/avis-legal.html" style="color:${GOLD};text-decoration:none;">${fr ? "Avis l\u00e9gal" : "Legal"}</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
                    ${s.disclaimer}
                  </td>
                </tr>
                <!-- E-4: Contact link -->
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
                    ${s.contactLabel} <a href="mailto:support@buildfi.ca" style="color:${GOLD};text-decoration:none;">support@buildfi.ca</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
                    <span style="font-weight:700;color:${DARK};">build</span><span style="font-weight:700;color:${GOLD};">fi</span><span style="color:#999999;">.ca</span> &mdash; ${s.location}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:11px;color:#999999;line-height:1.8;padding-bottom:6px;">
                    ${s.productType}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="font-family:${FONT};font-size:10px;color:#bbbbbb;line-height:1.8;">
                    <a href="mailto:support@buildfi.ca?subject=${fr ? "D%C3%A9sabonnement" : "Unsubscribe"}" style="color:#bbbbbb;text-decoration:underline;">${fr ? "Se d\u00e9sabonner" : "Unsubscribe"}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
        <!-- /Inner container -->

      </td>
    </tr>
  </table>
  <!-- /Outer wrapper -->

</body>
</html>`;
}
