// /lib/email.ts
// Email delivery via Resend — sends the PDF report after purchase
// Includes PDF as attachment + download link

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReportParams {
  to: string;
  lang: "fr" | "en";
  tier: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
  downloadUrl: string;
  grade: string;
  successPct: number;
}

export async function sendReportEmail(params: SendReportParams) {
  const { to, lang, tier, pdfBuffer, pdfFilename, downloadUrl, grade, successPct } = params;
  const fr = lang === "fr";

  const tierName = fr
    ? { essentiel: "Essentiel", intermediaire: "Intermédiaire", expert: "Expert" }[tier] || tier
    : { essentiel: "Essential", intermediaire: "Intermediate", expert: "Expert" }[tier] || tier;

  const subject = fr
    ? `Votre rapport ${tierName} buildfi.ca est prêt — Note ${grade}`
    : `Your buildfi.ca ${tierName} report is ready — Grade ${grade}`;

  const html = buildEmailHTML({ lang, tierName, grade, successPct, downloadUrl });

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM || "BuildFi <rapport@buildfi.ca>",
    to: [to],
    subject,
    html,
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
    // Tag for analytics
    tags: [
      { name: "tier", value: tier },
      { name: "grade", value: grade },
    ],
  });

  if (error) {
    console.error("[email] Send failed:", error);
    throw new Error(`Email delivery failed: ${error.message}`);
  }

  return data;
}

function buildEmailHTML(params: {
  lang: "fr" | "en";
  tierName: string;
  grade: string;
  successPct: number;
  downloadUrl: string;
}): string {
  const { lang, tierName, grade, successPct, downloadUrl } = params;
  const fr = lang === "fr";

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#FEFCF9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <div style="max-width:580px;margin:0 auto;padding:40px 24px">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="font-size:24px;font-weight:800;color:#1A1208;letter-spacing:-0.5px">buildfi.ca</div>
      <div style="font-size:11px;color:#C4944A;font-weight:600;text-transform:uppercase;letter-spacing:2px;margin-top:4px">
        ${fr ? "Planification financière accessible" : "Accessible financial planning"}
      </div>
    </div>

    <!-- Grade card -->
    <div style="background:linear-gradient(135deg,#1A1208,#2C1F0A);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
      <div style="font-size:12px;color:#C4944A;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px">
        ${fr ? `Rapport ${tierName}` : `${tierName} Report`}
      </div>
      <div style="font-size:56px;font-weight:800;color:#FFFFFF;line-height:1">${grade}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:8px">
        ${fr ? `Taux de réussite : ${successPct}%` : `Success rate: ${successPct}%`}
      </div>
    </div>

    <!-- Message -->
    <div style="font-size:15px;color:#333;line-height:1.8;margin-bottom:28px">
      <p>${fr
        ? "Votre rapport de retraite personnalisé est prêt. Il est attaché à ce courriel en PDF et disponible au lien ci-dessous."
        : "Your personalized retirement report is ready. It's attached to this email as a PDF and available at the link below."
      }</p>
      <p>${fr
        ? "Ce rapport est basé sur 5 000 simulations Monte Carlo de votre situation financière. Chaque dollar dans le rapport provient directement du moteur de calcul — aucune estimation approximative."
        : "This report is based on 5,000 Monte Carlo simulations of your financial situation. Every dollar in the report comes directly from the calculation engine — no rough estimates."
      }</p>
    </div>

    <!-- Download button -->
    <div style="text-align:center;margin-bottom:32px">
      <a href="${downloadUrl}" 
         style="display:inline-block;background:linear-gradient(135deg,#C4944A,#D4A85A);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700">
        ${fr ? "Télécharger mon rapport" : "Download my report"}
      </a>
      <div style="font-size:11px;color:#999;margin-top:8px">
        ${fr ? "Ce lien est valide 30 jours" : "This link is valid for 30 days"}
      </div>
    </div>

    <!-- Upsell hint (subtle) -->
    <div style="background:#F8F4EE;border-radius:10px;padding:20px;margin-bottom:28px;border:1px solid #E8E0D4">
      <div style="font-size:13px;font-weight:700;color:#1A1208;margin-bottom:6px">
        ${fr ? "Envie d'aller plus loin?" : "Want to go further?"}
      </div>
      <div style="font-size:13px;color:#666;line-height:1.7">
        ${fr
          ? "Le rapport Intermédiaire analyse votre immobilier, votre couple, vos dettes en détail et compare 5 stratégies optimisées. Votre note pourrait changer."
          : "The Intermediate report analyzes your real estate, couple dynamics, debt in detail and compares 5 optimized strategies. Your grade could change."
        }
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid #E8E0D4;font-size:11px;color:#999;line-height:1.8">
      <p>${fr
        ? "Ce rapport est un outil éducatif. Il ne constitue pas un avis financier personnalisé."
        : "This report is an educational tool. It does not constitute personalized financial advice."
      }</p>
      <p>buildfi.ca — Montréal, QC</p>
      <p>${fr ? "Garantie satisfaction 30 jours" : "30-day satisfaction guarantee"}</p>
    </div>

  </div>
</body>
</html>`;
}
