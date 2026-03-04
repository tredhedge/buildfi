// lib/ai-prompt-expert.ts — AI prompt builder for Expert tier ($129)
// Section-based: generates 4 batches of prompts for parallel Anthropic calls
// Each batch = system + user prompt → returns narration for 3-6 sections
// Pattern: extends ai-prompt-inter.ts with adaptive sections from STRATEGY §22

import { computeDerivedProfile, computeRenderPlan } from "./ai-profile";
import { type ExpertSectionKey, getActiveExpertSections } from "./ai-constants";

export interface ExpertPromptBatch {
  batchId: string;
  sections: ExpertSectionKey[];
  sys: string;
  usr: string;
}

/**
 * Build 4 parallel prompt batches for Expert report AI narration.
 * Returns array of { batchId, sections, sys, usr } for parallel Anthropic calls.
 */
export function buildExpertPromptBatches(
  D: Record<string, any>,
  mc: Record<string, any>,
  params: Record<string, any>,
  quiz: Record<string, any>,
  activeSections: ExpertSectionKey[]
): ExpertPromptBatch[] {
  const q = params._quiz || {};
  const rp = params._report || {};
  const fr = (quiz.lang || "fr") === "fr";

  // Province-aware full names (zero acronyms)
  const isQC = params.prov === "QC";
  const gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada")
              : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  // DerivedProfile + RenderPlan
  const profile = computeDerivedProfile(quiz || {}, D, params);
  const plan = computeRenderPlan(profile, D);

  const toneDesc = plan.tone === "warm" ? "Extra warm, reassuring. Lead with positives."
    : plan.tone === "data-forward" ? "Data-driven, confident. Precise numbers."
    : "Professional, balanced. Mix numbers with context.";

  // Shared system prompt (compliance + style)
  const sharedSys = "You narrate buildfi.ca Expert reports ($129 tier).\n"
    + "\n=== COMPLIANCE (AMF / OSFI) ===\n"
    + "This is an EDUCATIONAL tool, NOT financial advice.\n"
    + "1. Facts from DATA may use present tense.\n"
    + "2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).\n"
    + "3. FORBIDDEN verbs (never use): devriez, recommandons, conseillons, il faut, devez, assurez-vous, "
    + "considerez, optimisez, priorisez, plan d'action, recommandation(s), you should, you must, we recommend.\n"
    + "4. Observational language only. Describe what numbers show; do not prescribe actions.\n"
    + "5. Do not shame debt. State the mathematical cost only.\n"
    + "6. NEVER suggest combining scenarios or adding their effects together.\n"
    + "7. Use 'Cette analyse suggère' or 'Les données indiquent', never directive language.\n"
    + "8. Use 'bilan' not 'rapport', 'observations' not 'recommandations', 'leviers identifies' not 'plan d'action'.\n"
    + "\n=== NUMERIC SAFETY ===\n"
    + "- Use ONLY numbers from DATA. Do NOT invent, round, estimate, or extrapolate.\n"
    + "\n=== STYLE ===\n"
    + "- Language: " + (fr ? "French (vous)" : "English") + ".\n"
    + "- Reading level: Grade 10. Short sentences. No jargon.\n"
    + "- Acronyms: NEVER use acronyms. Write in full: " + gP + ", " + oN + ".\n"
    + "- Tone: " + plan.tone.toUpperCase() + " — " + toneDesc + "\n"
    + "\n=== OUTPUT ===\n"
    + "- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences.\n"
    + "- Each section value is a paragraph (4-8 sentences for main sections, 2-3 for minor).\n"
    + "- If you cannot comply, output {}.";

  // Shared DATA block
  const data: Record<string, any> = {
    profile: { age: D.age, retAge: D.retAge, prov: D.prov, sex: D.sex, couple: q.couple, source: q.source },
    savings: { total: D.totalSavings, rrsp: D.rrsp, tfsa: D.tfsa, nr: D.nr },
    debt: rp.debtBal > 0 ? { total: rp.debtBal, annual: rp.debtAnnualCost } : null,
    property: rp.homeVal > 0 ? { value: rp.homeVal, mortgage: rp.mortBal, equity: rp.equity } : null,
    gov: { qpp: D.qppMonthly, oas: D.oasMonthly, pension: D.dbPensionMonthly, total: D.govMonthly, cover: D.coveragePct },
    spend: { mo: D.retSpM, gap: D.gapMonthly, wd: D.withdrawalRatePct },
    results: { pct: D.successPct, grade: D.grade, med: D.rMedF, p5: D.rP5F, p25: D.rP25F, p75: D.rP75F },
    tax: { curr: D.taxCurrentEffective, ret: D.taxRetirementEffective, marg: D.taxCurrentMarginal },
    estate: { medianNet: mc.medEstateNet, medianTax: mc.medEstateTax },
    bizOn: rp.bizOn, cOn: params.cOn,
  };

  const dataStr = JSON.stringify(data);
  const profileCtx = "PROFILE: anxiety=" + profile.anxiety + ", discipline=" + profile.discipline
    + ", friction=" + profile.primaryFriction + ", theme=" + profile.narrativeTheme;

  // Split sections into 4 batches
  const batch1Sections = activeSections.filter(s =>
    ["sommaire_executif", "diagnostic_robustesse", "revenus_retraite"].includes(s)
  );
  const batch2Sections = activeSections.filter(s =>
    ["projection_patrimoine", "analyse_fiscale", "hypotheses_methodo"].includes(s)
  );
  const batch3Sections = activeSections.filter(s =>
    ["priorites_action", "observations_detaillees", "couple", "immobilier",
     "pension_db", "corporatif", "remuneration", "dettes", "decaissement",
     "stress_tests", "assurance", "resp"].includes(s)
  );
  const batch4Sections = activeSections.filter(s =>
    ["comparaison_scenarios", "driver_attribution", "pour_professionnel",
     "questions_fiscaliste", "historique_modifications", "disclaimers"].includes(s)
  );

  const sectionPrompt = (sections: ExpertSectionKey[]): string => {
    const defs: Record<string, string> = {
      sommaire_executif: "Executive summary: grade, success rate, 3 key findings. 5-6 sentences.",
      hypotheses_methodo: "Methodology: MC sims, tax constants, assumptions. 3-4 sentences.",
      diagnostic_robustesse: "Robustness diagnostic: success rate, percentile bands, ruin risk. 5-6 sentences.",
      revenus_retraite: "Retirement income breakdown: " + gP + ", " + oN + ", pension, portfolio. 5-6 sentences.",
      projection_patrimoine: "Wealth projection: fan chart context, real vs nominal, accumulation phase. 5-6 sentences.",
      analyse_fiscale: "Tax analysis: current vs retirement rates, marginal brackets, optimization. 5-6 sentences.",
      priorites_action: "Priority levers identified (observational, not prescriptive). 4-5 sentences.",
      observations_detaillees: "5 detailed observations. Each: number -> implication -> nuance. 8-10 sentences total.",
      disclaimers: "Legal disclaimer paragraph. Educational tool, not financial advice. 3 sentences.",
      couple: "Household analysis: income splitting, survivor impact. 4-5 sentences.",
      immobilier: "Real estate analysis: equity, mortgage impact, downsizing. 4-5 sentences.",
      pension_db: "DB pension analysis: indexation, bridge strategy. 4-5 sentences.",
      corporatif: "Corporate structure: retained earnings, extraction timeline. 4-5 sentences.",
      remuneration: "Compensation strategy: salary vs dividends mix. 3-4 sentences.",
      dettes: "Debt impact: mathematical cost, payoff timeline. 3-4 sentences.",
      decaissement: "Withdrawal sequencing: optimal vs meltdown vs TFSA-first. 4-5 sentences.",
      stress_tests: "Stress test results: worst-case scenarios, recovery paths. 4-5 sentences.",
      assurance: "Insurance analysis: coverage adequacy, cost-benefit. 3-4 sentences.",
      resp: "RESP analysis: CESG, education funding timeline. 3-4 sentences.",
      comparaison_scenarios: "Scenario comparison: variant deltas, key trade-offs. 5-6 sentences.",
      driver_attribution: "Driver attribution: WHY for each KPI. 5-6 sentences.",
      pour_professionnel: "For your professional: key assumptions, parameters. 3-4 sentences.",
      questions_fiscaliste: "5-7 personalized questions for tax advisor. Brief context per question.",
      historique_modifications: "Changelog summary: what changed since last assessment. 3-4 sentences.",
    };

    return sections.map(s => `"${s}":"${defs[s] || "2-3 sentences."}"`).join(",");
  };

  const batches: ExpertPromptBatch[] = [];

  if (batch1Sections.length > 0) {
    batches.push({
      batchId: "batch1",
      sections: batch1Sections,
      sys: sharedSys,
      usr: profileCtx + "\nDATA: " + dataStr
        + "\n\nReturn JSON for these sections:\n{" + sectionPrompt(batch1Sections) + "}",
    });
  }

  if (batch2Sections.length > 0) {
    batches.push({
      batchId: "batch2",
      sections: batch2Sections,
      sys: sharedSys,
      usr: profileCtx + "\nDATA: " + dataStr
        + "\n\nReturn JSON for these sections:\n{" + sectionPrompt(batch2Sections) + "}",
    });
  }

  if (batch3Sections.length > 0) {
    batches.push({
      batchId: "batch3",
      sections: batch3Sections,
      sys: sharedSys,
      usr: profileCtx + "\nDATA: " + dataStr
        + "\n\nReturn JSON for these sections:\n{" + sectionPrompt(batch3Sections) + "}",
    });
  }

  if (batch4Sections.length > 0) {
    batches.push({
      batchId: "batch4",
      sections: batch4Sections,
      sys: sharedSys,
      usr: profileCtx + "\nDATA: " + dataStr
        + "\n\nReturn JSON for these sections:\n{" + sectionPrompt(batch4Sections) + "}",
    });
  }

  return batches;
}

/**
 * Determine active sections for an Expert profile.
 * Convenience wrapper around getActiveExpertSections.
 */
export function detectExpertSections(
  params: Record<string, any>,
  mc: Record<string, any>,
  grade: string
): ExpertSectionKey[] {
  const q = params._quiz || {};
  const rp = params._report || {};

  return getActiveExpertSections({
    couple: !!params.cOn,
    homeowner: (params.props || []).some((p: any) => p.on && p.pri),
    pensionDB: params.penType === "db",
    ccpc: !!rp.bizOn,
    hasDebt: (rp.debtBal || 0) > 0,
    hasInsurance: (params.lifeInsBenefit || 0) > 0,
    hasRESP: (params.respKids || 0) > 0,
    grade,
    sophistication: q.sophistication || "rapide",
    hasScenarios: false,
    hasChangelog: false,
  });
}
