// lib/report-ship-gate.ts
// Renderer-agnostic pre-upload ship gate for the LIVE client paths (Bilan 360
// webhook + Expert/Planner regenerate). Audit 2026-06-16 (planner/report/AUDIT.md):
// production rendered + uploaded reports with NO gate, so a broken/implausible
// draft (negative final wealth, "Data insufficient", a fabricated figure, an AMF
// banned stem) could be emailed to a paying client.
//
// This gate runs on the FINAL HTML (+ a couple of optional data signals) so it
// works for any renderer (report-html-360.js / report-html-expert.js) without
// depending on the lab's renderer-coupled auditors. On failure the caller serves
// the honest "needs attention" variant (renderNeedsAttentionHTML) instead of the
// raw report. The caller MUST fail OPEN (a gate bug must never block delivery).
//
// Checks are intentionally HIGH-CONFIDENCE only — each one indicates a report
// that should not reach a client — to avoid wrongly degrading a good report.

export interface ShipVerdict {
  ok: boolean;
  reasons: string[];
}

function visibleText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Decide whether a rendered client report is safe to deliver.
 * @param html  the final rendered report HTML
 * @param lang  "fr" | "en"
 * @param opts.coreInvalid  pass the data layer's coreInvalid flag if available
 */
export function evaluateReportShip(
  html: string,
  lang: "fr" | "en",
  opts?: { coreInvalid?: boolean }
): ShipVerdict {
  const reasons: string[] = [];
  if (opts?.coreInvalid) reasons.push("core_data_invalid");

  const vis = visibleText(html);

  // 1. Empty / truncated render. The Bilan 360 production renderer emits an
  //    INTERACTIVE dashboard (~28KB) whose content lives in an embedded data
  //    payload (window.__BUILDFI__), not in static HTML — so its visible
  //    (script-stripped) text is ~2000 chars by design. A static report
  //    (report-pdf.js / clientExport) instead carries its content as visible
  //    text. Treat as empty only when NEITHER signal is present, else a valid
  //    interactive report would wrongly fall to the needs-attention fallback.
  const hasInteractivePayload =
    /window\.__BUILDFI__\s*=/.test(String(html)) &&
    (String(html).match(/<script[\s\S]*?<\/script>/gi) || []).join("").length > 4000;
  if (!html || (vis.length < 2000 && !hasInteractivePayload)) {
    reasons.push("empty_or_tiny_render");
  }

  // 2. Broken-render sentinels in visible copy.
  if (/\bData insufficient\b/i.test(vis)) reasons.push("data_insufficient_sentinel");
  if (/\bundefined\b|\bNaN\b/.test(vis)) reasons.push("undefined_or_nan");
  if (/\[\[[A-Z_]+\]\]/.test(vis)) reasons.push("unsubstituted_placeholder");

  // 3. Negative wealth/dollars in millions shown to the client (real wealth is
  //    floored at 0; a displayed "-3.4M$" / "-$3.4M" is a broken draft). Requires
  //    a currency marker to stay high-confidence.
  if (/-\s*\$\s?\d[\d.,   ]*\s?M\b/i.test(vis) || /-\s*\d[\d.,   ]*\s?M\$/i.test(vis)) {
    reasons.push("negative_millions_displayed");
  }

  // 3b. Negative wealth WITHOUT an "M" suffix shown to the client (e.g. the written
  //     "-3 903 273 $" / "-$3,903,273"). Real wealth is floored at 0, so any large
  //     negative currency (≥1 thousands-group ≈ 4+ digits) is a broken/nominal-leak
  //     draft. ship-loop 2026-06-18 — the M-only check above missed these.
  if (
    /-\s*\$\s?\d{1,3}(?:[ .,   ]\d{3})+/.test(vis) ||
    /-\s*\d{1,3}(?:[ .,   ]\d{3})+\s?\$/.test(vis)
  ) {
    reasons.push("negative_wealth_displayed");
  }

  // 4. AMF banned stems in visible copy (optimis*/optimiz* family, plan d'action).
  if (/\boptimis[a-zàâçéèêëîïôûùüÿœæ]+|\boptimiz[a-z]+|\bplan d['’]action\b|\baction plan\b/i.test(vis)) {
    reasons.push("amf_banned_stem");
  }

  // 5. FR engineering-jargon leak (Codex: "meltdown" must never reach a client).
  if (lang === "fr" && /\bmeltdown\b/i.test(vis)) reasons.push("fr_jargon_meltdown");

  return { ok: reasons.length === 0, reasons };
}

/**
 * Honest, AMF-safe "needs attention" deliverable shown when a report fails the
 * gate. Contains NO projections, figures, or prescriptive language — only a
 * clear, conditional message. Bilingual + branded.
 */
export function renderNeedsAttentionHTML(opts: { firstName?: string; lang: "fr" | "en" }): string {
  const fr = opts.lang === "fr";
  const name = (opts.firstName || "").trim();
  const hello = fr ? (name ? `Bonjour ${escapeHtml(name)},` : "Bonjour,") : (name ? `Hi ${escapeHtml(name)},` : "Hi,");
  const body = fr
    ? "Nous avons rencontré un point lors de la préparation de votre bilan qui nécessite une révision humaine avant l'envoi. Notre équipe le révise et vous fera parvenir votre rapport finalisé dans les 24 heures. Aucune action n'est requise de votre part, et aucun nouveau paiement ne sera demandé."
    : "We encountered an issue while building your report that requires human review before delivery. Our team is reviewing it and will send you the finalized report within 24 hours. No action is needed on your part, and you will not be charged again.";
  const reply = fr
    ? "Des questions entre-temps ? Répondez simplement à votre courriel de confirmation."
    : "Questions in the meantime? Just reply to your confirmation email.";
  const title = fr ? "Votre bilan — révision en cours" : "Your report — under review";
  return (
    '<!doctype html><html lang="' + (fr ? "fr" : "en") + '"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>BuildFi — ' + title + '</title></head>' +
    '<body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f1419;color:#e8eef5;margin:0;padding:48px 20px">' +
    '<div style="max-width:560px;margin:0 auto;background:#161c24;border:1px solid rgba(196,154,26,.25);border-radius:14px;padding:36px">' +
    '<div style="font-weight:700;font-size:20px;color:#c49a1a;letter-spacing:.5px">BuildFi</div>' +
    '<h1 style="font-size:22px;margin:22px 0 10px;font-weight:600">' + hello + '</h1>' +
    '<p style="line-height:1.65;color:#bccbe0;font-size:15px;margin:0 0 18px">' + body + '</p>' +
    '<p style="line-height:1.6;color:#8aa0bb;font-size:13px;margin:0">' + reply + '</p>' +
    '</div></body></html>'
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>
  )[c]);
}
