// lib/ai-prompt-inter.ts — AI prompt builder for Intermediaire tier ($59)
// Ported from quiz-intermediaire.html generateAI() lines 3381-3421
// Enhanced with DerivedProfile (matching Essentiel pattern in report-html.js)

import { computeDerivedProfile, computeRenderPlan } from "./ai-profile";

/** Build system + user prompts for Inter AI narration (claude-sonnet-4). */
export function buildAIPromptInter(
  D: Record<string, any>,
  params: Record<string, any>,
  fr: boolean,
  quiz: Record<string, any>,
  stratData?: Array<{ key: string; succ: number; medF: number }>
): { sys: string; usr: string } {
  const q = params._quiz || {}, rp = params._report || {};

  // Province-aware full names (zero acronyms)
  const isQC = params.prov === "QC";
  const gP = fr ? (isQC ? "Regime de rentes du Quebec" : "Regime de pensions du Canada")
                : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la Securite de la vieillesse" : "Old Age Security";

  // DerivedProfile + RenderPlan (replaces simple confidence-based tone)
  const profile = computeDerivedProfile(quiz || {}, D, params);
  const plan = computeRenderPlan(profile, D);

  const toneDesc = plan.tone === "warm" ? "Extra warm, reassuring. Lead with positives. Avoid alarming language."
    : plan.tone === "data-forward" ? "Data-driven, confident. Precise numbers. Skip hedging."
    : "Professional, balanced. Mix numbers with context.";
  const litDesc = profile.literacy === "basic" ? "Simple language. Define financial terms. One idea per sentence."
    : profile.literacy === "advanced" ? "Technical terms OK. Reference rates and ratios directly."
    : "Some financial vocabulary OK. Brief inline explanations.";

  // Emphasis block from RenderPlan
  const emphasisLines: string[] = [];
  if (plan.emphasizeDebt) emphasisLines.push("EMPHASIS: Debt impact is the primary friction point. Mathematical cost only.");
  if (plan.emphasizeFees) emphasisLines.push("EMPHASIS: Fee drag is significant. Highlight compounding cost.");
  if (plan.emphasizeGov) emphasisLines.push("EMPHASIS: Government coverage is low. Focus on gap funding.");
  const emphasisBlock = emphasisLines.length > 0 ? emphasisLines.join("\n") + "\n" : "";

  // Worry expansions (ported from source, updated slot references)
  const worries: string[] = q.worries || [];
  const worryMap: Record<string, string> = {
    runout: "EXPAND longevity_risk to 3-4 sentences.", tax: "EXPAND tax_context to 3-4 sentences.",
    inflation: "Note: all amounts are inflation-adjusted.", health: "Note health-care costs in longevity_risk.",
    market: "Reference volatility in sequence_risk.", legacy: "Mention estate planning in obs_5.",
  };
  const wInstr = worries.map((w: string) => worryMap[w] || "").filter(Boolean).join(" ");

  // Contextual helpers
  const ptSlot = D.ptM > 0 ? "Part-time bridge: " + D.ptM + "$/mo x " + D.ptYrs + "yrs." : "";
  const cplSlot = q.couple === "yes" ? "Household context." : "";
  const propSlot = rp.mortBal > 0
    ? (rp.mortFreeAge > params.retAge ? "Mortgage extends " + (rp.mortFreeAge - params.retAge) + "yrs into retirement."
      : "Mortgage paid by age " + rp.mortFreeAge + ".") : "";
  const riskOrder = plan.worstCasePlacement === "standard"
    ? "RISK ORDER: Include stress test early, keep tone calm."
    : "RISK ORDER: Do not lead with worst-case. Mention it later and soften with context.";

  // DATA block (ported from source with full Inter fields)
  const data: Record<string, any> = {
    profile: { age: D.age, retAge: D.retAge, prov: D.prov, sex: D.sex,
               couple: q.couple, source: q.source, qppAge: D.qppAge, oasAge: D.oasAge },
    savings: { total: D.totalSavings, retBal: D.retBal, rrsp: D.rrsp, tfsa: D.tfsa, nr: D.nr },
    debt: rp.debtBal > 0 ? { total: rp.debtBal, annual: rp.debtAnnualCost } : null,
    property: rp.homeVal > 0 ? { value: rp.homeVal, mortgage: rp.mortBal, equity: rp.equity } : null,
    gov: { qpp: D.qppMonthly, oas: D.oasMonthly, pension: D.dbPensionMonthly, total: D.govMonthly, cover: D.coveragePct },
    spend: { mo: D.retSpM, gap: D.gapMonthly, wd: D.withdrawalRatePct },
    results: { pct: D.successPct, grade: D.grade, med: D.rMedF, p5: D.rP5F, p25: D.rP25F, p75: D.rP75F },
    tax: { curr: D.taxCurrentEffective, ret: D.taxRetirementEffective, marg: D.taxCurrentMarginal },
    scores: { longevity: D.longevityScore, tax: D.taxScore, gov: D.covScore, divers: D.diverScore },
    bizOn: rp.bizOn, cOn: params.cOn, succObjective: q.succObjective || "neutral",
  };
  if (stratData && stratData.length > 0) {
    data.strategies = stratData.map((s) => ({ key: s.key, succ: s.succ, medF: s.medF }));
  }

  // === SYSTEM PROMPT ===
  const sys = "You narrate buildfi.ca Intermediaire reports ($59 tier).\n"
    + "\n=== COMPLIANCE (AMF / OSFI) ===\n"
    + "This is an EDUCATIONAL tool, NOT financial advice.\n"
    + "1. Facts from DATA may use present tense.\n"
    + "2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).\n"
    + "3. FORBIDDEN verbs (never use): devriez, recommandons, conseillons, il faut, devez, assurez-vous, "
    + "considerez, optimisez, priorisez, plan d'action, recommandation(s), you should, you must, we recommend.\n"
    + "4. Observational language only. Describe what numbers show; do not prescribe actions.\n"
    + "5. Do not shame debt. State the mathematical cost only.\n"
    + "6. NEVER suggest combining scenarios or adding their effects together.\n"
    + "7. Use 'Cette analyse suggere' or 'Les donnees indiquent', never directive language.\n"
    + "\n=== NUMERIC SAFETY ===\n"
    + "- Use ONLY numbers that appear in the DATA block. Do NOT invent, round, estimate, or extrapolate any figure.\n"
    + "- No external averages, no typical ranges, no invented thresholds.\n"
    + "\n=== STYLE ===\n"
    + "- Language: " + (fr ? "French (vous)" : "English") + ".\n"
    + "- Reading level: Grade 10. Short sentences. No jargon.\n"
    + "- Acronyms: NEVER use acronyms. Write in full: " + gP + ", " + oN + ".\n"
    + "\n=== MICRO-STRUCTURE PER SLOT (MANDATORY) ===\n"
    + "Sentence 1: One specific numeric observation from DATA (chiffre).\n"
    + "Sentence 2: Plain-language implication (conditional tense) (implication).\n"
    + "Sentence 3: Nuance about variability or condition (conditional), if applicable (nuance).\n"
    + "\n=== OUTPUT ===\n"
    + "- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences. No trailing commas.\n"
    + "- If you cannot comply, output {}.";

  // === SLOT DEFINITIONS — 15 base + conditional (16 with CCPC) ===
  const coupleDesc = params.cOn ? "Household optimization. 2-3 sentences." : "N/A -- solo";
  const stratDesc = stratData && stratData.length > 0
    ? "Best strategy from comparison. Reference DATA.strategies. 2-3 sentences."
    : "General strategy context based on profile. 2-3 sentences.";

  const slots: string[] = [
    '"snapshot_intro":"Grade ' + D.grade + ' + win acknowledgment. 2-3 sentences."',
    '"savings_context":"Savings trajectory from current to projected. 2-3 sentences."',
    '"income_mix":"Income sources breakdown -- ' + gP + ', ' + oN + ', pension, portfolio withdrawal. 2-3 sentences."',
    '"tax_context":"Current vs retirement effective rate comparison. 2-3 sentences."',
    '"longevity_risk":"Fan chart context. Pessimistic scenario. 2-3 sentences."',
    '"sequence_risk":"Sequence-of-returns risk in context of withdrawal rate and equity exposure. 2 sentences."',
    '"benchmark_context":"How this person compares to age/income peer group. Encouraging tone. 2 sentences."',
    '"obs_1":"Primary lever. FIX-driven observation."',
    '"obs_2":"Government coverage depth."',
    '"obs_3":"Fee impact observation."',
    '"obs_4":"Contextual analysis."',
    '"obs_5":"Risk and longevity observation."',
    '"priority_actions":"Waterfall rationale. 2-3 sentences."',
    '"strategy_highlight":"' + stratDesc.replace(/"/g, '\\"') + '"',
    '"couple_analysis":"' + coupleDesc + '"',
  ];
  const ctaSlots: string[] = rp.bizOn ? ['"ccpc_context":"CCPC strategy highlight. 2-3 sentences."'] : [];

  // === USER PROMPT ===
  const usr = "TONE: " + plan.tone.toUpperCase() + " -- " + toneDesc + "\n"
    + "LITERACY: " + profile.literacy + " -- " + litDesc + "\n"
    + emphasisBlock + riskOrder + "\n"
    + "PROFILE: anxiety=" + profile.anxiety + ", discipline=" + profile.discipline
    + ", friction=" + profile.primaryFriction + ", theme=" + profile.narrativeTheme + "\n"
    + (wInstr ? "WORRIES: " + wInstr + "\n" : "")
    + (cplSlot ? cplSlot + "\n" : "") + (propSlot ? propSlot + "\n" : "") + (ptSlot ? ptSlot + "\n" : "")
    + "\nDATA: " + JSON.stringify(data)
    + "\n\nReturn ONLY valid JSON (2-3 sentences each, micro-structure: number -> implication -> nuance):\n"
    + "{" + slots.concat(ctaSlots).join(",") + "}";

  return { sys, usr };
}
