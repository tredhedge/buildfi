import { translateToMC } from "../lib/quiz-translator.ts";
import { runMC } from "../lib/engine/index.js";
import { extractReportData, renderReportHTML } from "../lib/report-html.js";

type QuizInput = Record<string, unknown>;

type RenderResult = {
  html: string;
  successPct: number;
};

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function renderSnapshot(quiz: QuizInput, lang: "fr" | "en", ai: Record<string, string> = {}): RenderResult {
  const params = translateToMC(quiz as any);
  const mc = runMC(params as any, 700);
  const D = extractReportData(mc as any, params as any);
  const html = renderReportHTML(D as any, mc as any, quiz as any, lang, ai as any, 0, 0);
  return { html, successPct: Math.round((mc?.succ || 0) * 100) };
}

function countMatches(text: string, re: RegExp): number {
  return (text.match(re) || []).length;
}

function runPhase1Checks() {
  const profileWithDebt: QuizInput = {
    age: 38,
    retAge: 65,
    sex: "F",
    prov: "QC",
    income: 78000,
    totalSavings: 125000,
    monthlyContrib: 700,
    savingsDetail: true,
    rrsp: 70000,
    tfsa: 30000,
    nr: 25000,
    employer: "x",
    lifestyle: "active",
    risk: "balanced",
    homeowner: true,
    homeValue: 520000,
    mortgage: 310000,
    mortgageAmort: 23,
    debts: [
      { type: "cc", amount: 12000 },
      { type: "loc", amount: 8000 },
    ],
    couple: "no",
    parttime: "no",
    confidence: 2,
    objective: "security",
    worries: ["runout", "market"],
  };

  const profileNoDebt: QuizInput = {
    age: 43,
    retAge: 63,
    sex: "M",
    prov: "ON",
    income: 112000,
    totalSavings: 280000,
    monthlyContrib: 1100,
    savingsDetail: true,
    rrsp: 170000,
    tfsa: 70000,
    nr: 40000,
    employer: "large",
    lifestyle: "active",
    risk: "growth",
    homeowner: true,
    homeValue: 680000,
    mortgage: 190000,
    mortgageAmort: 16,
    debts: [],
    couple: "yes",
    parttime: "maybe",
    confidence: 4,
    objective: "growth",
    worries: ["tax", "inflation"],
  };

  const frDebt = renderSnapshot(profileWithDebt, "fr", {});
  const enNoDebt = renderSnapshot(profileNoDebt, "en", {});

  for (const sample of [frDebt, enNoDebt]) {
    assert(sample.html.length > 6000, "Rendered HTML is unexpectedly short");
    assert(!sample.html.includes("undefined"), "Rendered HTML contains 'undefined'");
    assert(!sample.html.includes("NaN"), "Rendered HTML contains NaN");

    const transitionCount = countMatches(sample.html, /data-transition="true"/g);
    assert(transitionCount >= 6, `Expected >= 6 transitions, got ${transitionCount}`);

    const requiredPairs = [
      'data-transition-from="note" data-transition-to="profil"',
      'data-transition-from="profil" data-transition-to="projection"',
      'data-transition-from="projection" data-transition-to="revenus"',
      'data-transition-from="revenus" data-transition-to="epargne"',
      'data-transition-from="epargne" data-transition-to="priorite"',
      'data-transition-from="priorite" data-transition-to="fiscalite"',
    ];

    for (const pair of requiredPairs) {
      assert(sample.html.includes(pair), `Missing transition marker: ${pair}`);
    }

    const idxNote = sample.html.indexOf('data-transition-from="note"');
    const idxProfile = sample.html.indexOf('data-transition-from="profil"');
    const idxProjection = sample.html.indexOf('data-transition-from="projection"');
    assert(idxNote >= 0 && idxProfile > idxNote && idxProjection > idxProfile, "Transition order is not stable");

    assert(sample.html.includes('data-next-action="7d"'), "Missing 7-day next-action block");

    assert(!sample.html.includes("15% off"), "Found old upsell text: 15% off");
    assert(!sample.html.includes("15 % rabais"), "Found old upsell text: 15 % rabais");
  }

  // AI-off fallback quality checks
  assert(frDebt.html.includes("Lecture prioritaire"), "Missing obs_2 fallback in FR (AI-off)");
  assert(frDebt.html.includes("frais pondérés"), "Missing obs_3 fallback in FR (AI-off)");

  // Ensure custom AI slots still override fallback when provided
  const aiOverride = renderSnapshot(profileNoDebt, "fr", {
    obs_2: "OBS2_CUSTOM_PHASE1_CHECK",
    obs_3: "OBS3_CUSTOM_PHASE1_CHECK",
  });
  assert(aiOverride.html.includes("OBS2_CUSTOM_PHASE1_CHECK"), "Custom obs_2 AI slot not rendered");
  assert(aiOverride.html.includes("OBS3_CUSTOM_PHASE1_CHECK"), "Custom obs_3 AI slot not rendered");

  console.log("[phase1-bilan] All checks passed");
  console.log(`[phase1-bilan] FR profile success=${frDebt.successPct}% | EN profile success=${enNoDebt.successPct}%`);
}

try {
  runPhase1Checks();
  process.exit(0);
} catch (err: any) {
  console.error("[phase1-bilan] FAILED:", err?.message || err);
  process.exit(1);
}
