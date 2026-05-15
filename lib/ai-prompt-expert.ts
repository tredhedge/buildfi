// lib/ai-prompt-expert.ts — AI prompt builder for Expert tier ($129)
// Section-based: generates 4 batches of prompts for parallel Anthropic calls
// Each batch = system + user prompt → returns narration for 3-6 sections
// Pattern: extends ai-prompt-inter.ts with adaptive sections from STRATEGY §22
//
// PII AUDIT (2026-04-26 — Sprint 4 Loi 25 review):
//   No email, last name, or direct identifier may flow into Anthropic.
//   Verified: zero email-like substrings in this file. The quiz/profile
//   data carries no name fields. If that changes, scrub here.

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
    + "\n=== DECISION-NARRATIVE FRAMING (2026-05-14 IA refactor) ===\n"
    + "Each section answers ONE decision question (see per-section defs).\n"
    + "Lead with the answer — the so-what. Numbers come second, framing third.\n"
    + "Avoid topic dumps. Every paragraph should advance the reader toward a clearer decision.\n"
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
    // Each entry: "[DECISION QUESTION] — [content guidance]". The decision
    // question is what the reader is trying to answer when they reach this
    // section. The narration should LEAD with the answer (observationally).
    const defs: Record<string, string> = {
      // Situation
      sommaire_executif: "Decision: where do you stand? — Grade, success rate, top 3 observations. 5-6 sentences.",
      revenus_retraite: "Decision: what will you live on in retirement? — Income breakdown across " + gP + ", " + oN + ", pension, portfolio. 5-6 sentences.",
      // Trajectory
      projection_patrimoine: "Decision: how will your wealth evolve? — Fan chart context, real vs nominal, accumulation phase. 5-6 sentences.",
      diagnostic_robustesse: "Decision: how robust is the plan? — Success rate, percentile bands, ruin risk. 5-6 sentences.",
      // Threats
      stress_tests: "Decision: what would survive a crash? — Worst-case scenarios, recovery paths. 4-5 sentences.",
      dettes: "Decision: are your debts weighing on the plan? — Mathematical cost, payoff timeline. 3-4 sentences.",
      assurance: "Decision: are your protections enough? — Coverage adequacy, cost-benefit. 3-4 sentences.",
      // Levers
      priorites_action: "Decision: which levers move the needle most? — Synthesis of top observational levers (NOT prescriptive). 4-5 sentences.",
      analyse_fiscale: "Decision: where is tax costing you most? — Current vs retirement rates, marginal brackets, efficiency margins. 5-6 sentences.",
      decaissement: "Decision: in what order to withdraw? — Optimal vs meltdown vs TFSA-first comparison. 4-5 sentences.",
      couple: "Decision: how does the couple optimize income? — Income splitting, survivor impact. 4-5 sentences.",
      corporatif: "Decision: what about your corp at retirement? — Retained earnings, extraction timeline. 4-5 sentences.",
      remuneration: "Decision: salary or dividend? — Compensation mix tradeoff. 3-4 sentences.",
      immobilier: "Decision: how does real estate fit the plan? — Equity, mortgage impact, downsizing math. 4-5 sentences.",
      pension_db: "Decision: how does your DB pension integrate? — Indexation, bridge strategy. 4-5 sentences.",
      resp: "Decision: will your kids be funded? — CESG, education funding timeline. 3-4 sentences.",
      // Scenarios
      comparaison_scenarios: "Decision: which scenario holds up best? — Variant deltas, key trade-offs. 5-6 sentences.",
      // Mechanics / appendix
      observations_detaillees: "Decision: what details deserve attention? — 5 detailed observations. Each: number -> implication -> nuance. 8-10 sentences total.",
      driver_attribution: "Decision: what drives the outcome? — WHY for each KPI. 5-6 sentences.",
      pour_professionnel: "Decision: what to bring your advisor? — Key assumptions, parameters. 3-4 sentences.",
      questions_fiscaliste: "Decision: what to validate with your tax advisor? — 5-7 personalized questions. Brief context per question.",
      hypotheses_methodo: "Decision: how were these numbers calculated? — MC sims, tax constants, assumptions. 3-4 sentences.",
      disclaimers: "Legal disclaimer paragraph. Educational tool, not financial advice. 3 sentences.",
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
