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

function nextSectionIndex(html: string, currentId: string): number {
  const sectionOrder = [
    "sec-note",
    "sec-profil",
    "sec-projection",
    "sec-revenus",
    "sec-epargne",
    "sec-priorite",
    "sec-renforcer",
    "sec-fiscalite",
    "sec-methode",
    "sec-signaux",
    "sec-conclusion",
  ];

  const currentPos = sectionOrder.indexOf(currentId);
  if (currentPos < 0) return html.length;
  for (let i = currentPos + 1; i < sectionOrder.length; i++) {
    const marker = `id="${sectionOrder[i]}"`;
    const idx = html.indexOf(marker);
    if (idx >= 0) return idx;
  }
  return html.length;
}

function assertIntentInSection(html: string, sectionId: string) {
  const start = html.indexOf(`id="${sectionId}"`);
  assert(start >= 0, `Missing section: ${sectionId}`);
  const end = nextSectionIndex(html, sectionId);
  const slice = html.slice(start, end);
  assert(slice.includes('data-section-intent="true"'), `Missing section intent block in ${sectionId}`);
}

function runPhase2Checks() {
  const frProfile: QuizInput = {
    age: 39,
    retAge: 64,
    sex: "F",
    prov: "QC",
    income: 82000,
    totalSavings: 150000,
    monthlyContrib: 800,
    savingsDetail: true,
    rrsp: 90000,
    tfsa: 35000,
    nr: 25000,
    employer: "x",
    lifestyle: "active",
    risk: "balanced",
    homeowner: true,
    homeValue: 540000,
    mortgage: 295000,
    mortgageAmort: 21,
    debts: [
      { type: "cc", amount: 9000 },
      { type: "loc", amount: 6000 },
    ],
    couple: "no",
    parttime: "no",
    confidence: 3,
    objective: "security",
    worries: ["runout", "tax"],
  };

  const enProfile: QuizInput = {
    age: 44,
    retAge: 63,
    sex: "M",
    prov: "ON",
    income: 120000,
    totalSavings: 310000,
    monthlyContrib: 1200,
    savingsDetail: true,
    rrsp: 190000,
    tfsa: 80000,
    nr: 40000,
    employer: "large",
    lifestyle: "active",
    risk: "growth",
    homeowner: true,
    homeValue: 720000,
    mortgage: 210000,
    mortgageAmort: 15,
    debts: [{ type: "car", amount: 15000 }],
    couple: "yes",
    parttime: "maybe",
    confidence: 4,
    objective: "growth",
    worries: ["inflation", "market"],
  };

  const fr = renderSnapshot(frProfile, "fr", {});
  const en = renderSnapshot(enProfile, "en", {});

  for (const sample of [fr, en]) {
    assert(sample.html.length > 6000, "Rendered HTML is unexpectedly short");
    assert(!sample.html.includes("undefined"), "Rendered HTML contains 'undefined'");
    assert(!sample.html.includes("NaN"), "Rendered HTML contains NaN");

    const transitionCount = countMatches(sample.html, /data-transition="true"/g);
    assert(transitionCount >= 6, `Expected >= 6 transitions, got ${transitionCount}`);

    const intentCount = countMatches(sample.html, /data-section-intent="true"/g);
    assert(intentCount >= 6, `Expected >= 6 section intent blocks, got ${intentCount}`);

    assert(sample.html.includes('data-transition-from="note" data-transition-to="profil"'), "Missing note->profil transition");
    assert(sample.html.includes('data-transition-from="profil" data-transition-to="projection"'), "Missing profil->projection transition");
    assert(sample.html.includes('data-transition-from="projection" data-transition-to="revenus"'), "Missing projection->revenus transition");
    assert(sample.html.includes('data-transition-from="revenus" data-transition-to="epargne"'), "Missing revenus->epargne transition");
    assert(sample.html.includes('data-transition-from="epargne" data-transition-to="priorite"'), "Missing epargne->priorite transition");
    assert(sample.html.includes('data-transition-from="priorite" data-transition-to="fiscalite"'), "Missing priorite->fiscalite transition");

    assertIntentInSection(sample.html, "sec-profil");
    assertIntentInSection(sample.html, "sec-projection");
    assertIntentInSection(sample.html, "sec-revenus");
    assertIntentInSection(sample.html, "sec-epargne");
    assertIntentInSection(sample.html, "sec-priorite");
    assertIntentInSection(sample.html, "sec-fiscalite");

    // Phase 2 presentation guards: intent cards must remain printable/mobile-safe
    assert(
      sample.html.includes('.c,.cm,.co,.ai,.intent{break-inside:avoid;page-break-inside:avoid}'),
      "Missing print guard for intent blocks",
    );
    assert(
      sample.html.includes(".intent-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}"),
      "Missing intent grid base CSS",
    );
    assert(
      sample.html.includes("@media(max-width:700px){.intent-grid{grid-template-columns:1fr}}"),
      "Missing intent grid mobile CSS",
    );
  }

  assert(fr.html.includes("Ce que vous voyez"), "Missing FR intent label: Ce que vous voyez");
  assert(fr.html.includes("Ce que cela signifie"), "Missing FR intent label: Ce que cela signifie");
  assert(fr.html.includes("Ce que cela change"), "Missing FR intent label: Ce que cela change");

  assert(en.html.includes("What you see"), "Missing EN intent label: What you see");
  assert(en.html.includes("What it means"), "Missing EN intent label: What it means");
  assert(en.html.includes("What it changes"), "Missing EN intent label: What it changes");

  console.log("[phase2-bilan] All checks passed");
  console.log(`[phase2-bilan] FR success=${fr.successPct}% | EN success=${en.successPct}%`);
}

try {
  runPhase2Checks();
  process.exit(0);
} catch (err: any) {
  console.error("[phase2-bilan] FAILED:", err?.message || err);
  process.exit(1);
}