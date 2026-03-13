import { translateToMC } from "../lib/quiz-translator.ts";
import { runMC } from "../lib/engine/index.js";
import { extractReportData, renderReportHTML } from "../lib/report-html.js";

type QuizInput = Record<string, unknown>;

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function renderSnapshot(quiz: QuizInput, lang: "fr" | "en", feedbackToken: string): string {
  const params = translateToMC(quiz as any);
  const mc = runMC(params as any, 700);
  const D = extractReportData(mc as any, params as any);
  return renderReportHTML(D as any, mc as any, quiz as any, lang, {} as any, 0, 0, feedbackToken);
}

function runPhase3Checks() {
  const lowConfidenceFr: QuizInput = {
    age: 37,
    retAge: 65,
    sex: "F",
    prov: "QC",
    income: 76000,
    totalSavings: 95000,
    monthlyContrib: 550,
    savingsDetail: true,
    rrsp: 50000,
    tfsa: 30000,
    nr: 15000,
    employer: "x",
    lifestyle: "active",
    risk: "balanced",
    homeowner: true,
    homeValue: 470000,
    mortgage: 285000,
    mortgageAmort: 24,
    debts: [{ type: "cc", amount: 7000 }],
    couple: "no",
    parttime: "no",
    confidence: 1,
    objective: "security",
    worries: ["runout", "tax"],
  };

  const highConfidenceEn: QuizInput = {
    age: 46,
    retAge: 62,
    sex: "M",
    prov: "ON",
    income: 128000,
    totalSavings: 390000,
    monthlyContrib: 1450,
    savingsDetail: true,
    rrsp: 240000,
    tfsa: 90000,
    nr: 60000,
    employer: "large",
    lifestyle: "active",
    risk: "growth",
    homeowner: true,
    homeValue: 760000,
    mortgage: 180000,
    mortgageAmort: 12,
    debts: [{ type: "car", amount: 12000 }],
    couple: "yes",
    parttime: "maybe",
    confidence: 5,
    objective: "growth",
    worries: ["inflation", "market"],
  };

  const frToken = "phase3-token-fr";
  const enToken = "phase3-token-en";

  const frHtml = renderSnapshot(lowConfidenceFr, "fr", frToken);
  const enHtml = renderSnapshot(highConfidenceEn, "en", enToken);

  // Personalization: confidence-based reading path
  assert(frHtml.includes('data-reading-path="guided"'), "Missing guided reading path for low confidence profile");
  assert(enHtml.includes('data-reading-path="advanced"'), "Missing advanced reading path for high confidence profile");

  // Personalization: objective tags + localized labels
  assert(frHtml.includes('data-objective="security"'), "Missing objective tag for FR profile");
  assert(enHtml.includes('data-objective="growth"'), "Missing objective tag for EN profile");
  assert(frHtml.includes("Parcours de lecture recommande (guide)"), "Missing FR reading-path label");
  assert(enHtml.includes("Recommended reading path (advanced)"), "Missing EN reading-path label");

  // Feedback instrumentation context in report body
  assert(frHtml.includes('data-feedback-context="true"'), "Missing feedback context marker in FR report");
  assert(frHtml.includes('data-report-stream="bilan"'), "Missing report stream marker in FR report");
  assert(frHtml.includes('data-confidence="1"'), "Missing feedback confidence marker in FR report");
  assert(frHtml.includes('data-objective="security"'), "Missing feedback objective marker in FR report");

  // Feedback stars block + context propagation in links
  assert(frHtml.includes('data-feedback-stars="true"'), "Missing feedback stars block in FR report");
  assert(frHtml.includes(`/api/feedback?token=${frToken}&rating=5`), "Missing FR rating link with token");
  assert(frHtml.includes("stream=bilan"), "Missing stream query param in rating links");
  assert(frHtml.includes("confidence=1"), "Missing confidence query param in rating links");
  assert(frHtml.includes("objective=security"), "Missing objective query param in rating links");

  assert(enHtml.includes('data-feedback-stars="true"'), "Missing feedback stars block in EN report");
  assert(enHtml.includes(`/api/feedback?token=${enToken}&rating=5`), "Missing EN rating link with token");
  assert(enHtml.includes("confidence=5"), "Missing EN confidence query param in rating links");
  assert(enHtml.includes("objective=growth"), "Missing EN objective query param in rating links");

  // Placeholder should always be replaced
  assert(!frHtml.includes("<!-- FEEDBACK_STARS -->"), "Feedback placeholder still present in FR HTML");
  assert(!enHtml.includes("<!-- FEEDBACK_STARS -->"), "Feedback placeholder still present in EN HTML");

  console.log("[phase3-bilan] All checks passed");
}

try {
  runPhase3Checks();
  process.exit(0);
} catch (err: any) {
  console.error("[phase3-bilan] FAILED:", err?.message || err);
  process.exit(1);
}
