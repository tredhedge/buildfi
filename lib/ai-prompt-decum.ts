// lib/ai-prompt-decum.ts — Décaissement tier AI narration prompt
// 12 slots, DerivedProfile integration, 9-combo voice matrix, narrative arc,
// dynamic obs routing, worry patterns, enriched DATA block, AMF/OSFI compliant
//
// Slots: snapshot_intro, longevity_context, spending_flex_obs, income_mix_obs,
//        tax_timing_obs, meltdown_obs, cpp_timing_obs, sequence_obs, estate_obs,
//        obs_1, obs_2, obs_3

import { FORBIDDEN_TERMS } from "@/lib/ai-constants";
import { computeDerivedProfile, computeRenderPlan, computeCompositeSignals } from "@/lib/ai-profile";
import type { DerivedProfile, RenderPlan, CompositeSignals } from "@/lib/ai-profile";

// ── Plain-language replacements (banned jargon) ───────────────────────────
const PLAIN_LANG_NOTE = `
JARGON INTERDIT (jamais dans le texte visible) :
- "Guyton-Klinger" → "règles de flexibilité des dépenses" ou "ajustements automatiques des retraits"
- "Monte Carlo" → "simulations" ou "scénarios"
- "séquence de rendements" → "l'ordre dans lequel les rendements arrivent"
- "volatilité" → "fluctuations" ou "variations"
- "allocation d'actifs" → "répartition entre actions et obligations"
- "duration" → "durée moyenne des obligations"
- "alpha / beta / Sharpe" → bannir sans équivalent grand public
- "drawdown" → "ponctions" ou "retraits"
- "decumulation" → bannir entièrement dans le texte client
- "RRIF" → "FERR" (en français) ou "Registered Retirement Income Fund" (en anglais, première occurrence)
- "OAS clawback" → "récupération de la Sécurité de la vieillesse" ou "OAS recovery tax"
`;

/** Build system + user prompts for Décaissement AI narration (claude-sonnet-4). */
export function buildAIPromptDecum(
  D: Record<string, any>,
  params: Record<string, any>,
  fr: boolean,
  quiz: Record<string, any>
): { sys: string; usr: string } {
  const q = params._quiz || {};
  const rpt = params._report || {};

  // Province-aware full names (zero acronyms per CLAUDE.md)
  const isQC = (params.prov || "QC") === "QC";
  const gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada")
            : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  // ════════════════════════════════════════════════════════════════
  // DerivedProfile + RenderPlan + CompositeSignals
  // ════════════════════════════════════════════════════════════════
  // Adapt quiz fields for profile computation (decum has different field names)
  const profileQuiz = {
    ...quiz,
    income: params.retIncome || 0,
    monthlyContrib: 0, // no contributions in decum
    risk: (params.allocR || 0.5) > 0.65 ? "growth" : (params.allocR || 0.5) < 0.45 ? "conservative" : "balanced",
    couple: q.couple || "no",
    worries: q.worries || [],
    confidence: q.confidence || 3,
  };
  const profile = computeDerivedProfile(profileQuiz, D, params);
  const plan = computeRenderPlan(profile, D);
  const signals = computeCompositeSignals(profileQuiz, D, params, profile);

  // ════════════════════════════════════════════════════════════════
  // 1. VOICE MATRIX (tone × literacy = 9 combos)
  // ════════════════════════════════════════════════════════════════
  const voiceMatrix: Record<string, string> = {
    "warm+basic": "Write like a patient, kind guide explaining to someone who rarely reads financial documents. One idea per sentence. Lead every slot with something reassuring before any number. Use everyday analogies (grocery budget, monthly bills). Define any financial term inline. Never alarm.",
    "warm+intermediate": "Write like a trusted advisor having coffee. Warm but informed. Use numbers naturally in context. When delivering a difficult number, immediately follow with a softer frame. Standard financial vocabulary is OK but keep sentences short.",
    "warm+advanced": "Write like a calm, experienced colleague. Technical precision is welcome but always wrapped in context. Acknowledge financial sophistication. Use ratios and rates directly, but frame every risk as manageable variability, not threat.",
    "balanced+basic": "Write like a clear, friendly explainer. Simple sentences. One number per sentence max. Always follow a number with what it means in plain words (years of income, monthly impact). Avoid stacking data points.",
    "balanced+intermediate": "Write like a sharp financial journalist. Mix data with narrative. Each slot tells a mini-story: here is the number, here is what it means for daily life, here is the nuance. Natural flow, no bullet points.",
    "balanced+advanced": "Write like a portfolio analyst briefing a knowledgeable retiree. Direct, confident, precise. Reference rates, coverage ratios, and withdrawal percentages without hedging. Implications should be specific and quantified.",
    "data-forward+basic": "Write like a data scientist explaining to a friend over dinner. Lead with the most striking number. Explain its meaning in one plain sentence. Keep it punchy — short sentences, clear cause-effect.",
    "data-forward+intermediate": "Write like a Bloomberg terminal summary for a retail investor. Dense but readable. Each sentence carries a data point or an implication. No filler. Comparative framing preferred (X vs Y).",
    "data-forward+advanced": "Write like a portfolio analyst's concise briefing. Maximum density. Reference withdrawal rates, coverage ratios, real vs nominal, fee drag percentages, OAS recovery thresholds. Every sentence must carry information. Zero fluff.",
  };
  const voiceKey = plan.tone + "+" + profile.literacy;
  const voiceInstr = voiceMatrix[voiceKey] || voiceMatrix["balanced+intermediate"];

  // ════════════════════════════════════════════════════════════════
  // 2. NARRATIVE ARC (decum-specific themes)
  // ════════════════════════════════════════════════════════════════
  const arcMap: Record<string, string> = {
    security: "NARRATIVE ARC — SUSTAINABILITY: This person's plan is robust. Open with what is solid and protected. Frame every number through the lens of 'what is secure.' Risks = manageable variability, never threats. Close each slot with a stabilizing thought. Journey: validation → understanding → confidence to enjoy retirement.",
    growth: "NARRATIVE ARC — RESILIENCE: This person's plan works but has some vulnerability. Open with what works well. Frame numbers as indicators of strength with areas to watch. Close each slot with what provides resilience. Journey: recognition → awareness → grounded planning.",
    optimization: "NARRATIVE ARC — OPTIMIZATION: This person is in good shape and the plan has room for fine-tuning. Open with efficiency metrics. Frame numbers as levers (timing, sequence, tax). Skip generic reassurance. Close each slot with a specific efficiency insight. Journey: validation → precision → informed choices.",
    "catch-up": "NARRATIVE ARC — CAUTION: This person's plan faces real pressure. Be honest but never defeatist. Open with what they CAN still influence — spending flexibility, timing adjustments, allocation shifts. Frame numbers as starting points, not verdicts. Close each slot with an achievable next observation. Journey: honesty → agency → actionable clarity.",
  };
  const narrativeArc = arcMap[profile.narrativeTheme] || arcMap.growth;

  // ════════════════════════════════════════════════════════════════
  // 3. DECUM-SPECIFIC WORRY PATTERNS
  // ════════════════════════════════════════════════════════════════
  const worryPatterns: string[] = [];
  const successPct = Number(D.successPct ?? 50);
  const gkActive = !!params.gkOn;
  const alreadyClaiming = q.qppAlreadyClaiming === true || q.qppAlreadyClaiming === "true";
  // Read wealth from _report (authoritative after translation) with params fallback
  const totalWealth = (rpt.rrsp ?? params.rrsp ?? 0) + (rpt.tfsa ?? params.tfsa ?? 0) + (rpt.nr ?? params.nr ?? 0) +
    (rpt.cRRSP ?? params.cRRSP ?? 0) + (rpt.cTFSA ?? params.cTFSA ?? 0) + (rpt.cNR ?? params.cNR ?? 0);
  const wdRate = D.initialRate ?? 0;

  // Longevity + spending concern
  if (successPct < 70 && !gkActive)
    worryPatterns.push("WORRY PATTERN [longevity-fixed]: Low success rate with fixed spending. Every slot should subtly reinforce that spending flexibility is the most powerful lever. longevity_context gets extra depth. Never catastrophize.");
  if (successPct < 55)
    worryPatterns.push("WORRY PATTERN [critical-sustainability]: Success rate below 55%. Lead EVERY slot with the reassuring data point first. One idea per sentence. Build confidence gradually — do not stack risks. Focus on controllable factors.");
  // OAS clawback zone
  if ((params.retIncome ?? 0) > 95000)
    worryPatterns.push("WORRY PATTERN [oas-clawback]: Income above OAS recovery threshold ($95,323 in 2026). tax_timing_obs MUST address this — quantify the recovery tax impact. Frame as mathematical cost, not criticism.");
  // Heavy RRSP with forced conversion
  if (totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.65)
    worryPatterns.push("WORRY PATTERN [rrsp-concentration]: 65%+ of savings in RRSP/RRIF. tax_timing_obs should address RRIF minimum conversion schedule and taxable income implications. obs slots should explore the registered/non-registered balance.");
  // Couple with asymmetric ages
  if (params.cOn && Math.abs((params.age ?? 65) - (params.cAge ?? 65)) >= 5)
    worryPatterns.push("WORRY PATTERN [couple-age-gap]: 5+ year age gap between partners. Longevity and survivor implications differ significantly. longevity_context and estate_obs should address the survivor scenario.");
  // High withdrawal rate
  if (wdRate > 5)
    worryPatterns.push("WORRY PATTERN [withdrawal-pressure]: Withdrawal rate " + wdRate + "% exceeds conventional thresholds. sequence_obs should address early-retirement sequence risk. meltdown_obs should quantify the reduction needed for sustainability.");
  // No worries detected
  if (worryPatterns.length === 0)
    worryPatterns.push("WORRY PATTERN [stable]: No critical concern flags. Mirror what is working well. Keep tone confident and matter-of-fact.");

  const worryBlock = worryPatterns.join("\n");

  // ════════════════════════════════════════════════════════════════
  // 4. DYNAMIC OBS ROUTING (obs_1 through obs_3)
  // ════════════════════════════════════════════════════════════════
  const obsPool: Array<{ topic: string; instr: string }> = [];

  // Priority-ordered topic candidates
  if (params.cOn)
    obsPool.push({ topic: "couple-coordination", instr: "Household coordination: explore coordinated drawdown order between partners, survivor pension implications, and household-level tax bracket management. Income ratio between partners. What changes when modeling two lives instead of one." });

  if (wdRate > 5)
    obsPool.push({ topic: "withdrawal-sustainability", instr: "Withdrawal sustainability: rate of " + wdRate + "% relative to expected portfolio return. What this means for portfolio longevity in average vs adverse scenarios. Frame in years of spending." });

  if (totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.50)
    obsPool.push({ topic: "rrif-conversion", instr: "RRIF conversion dynamics: " + Math.round((params.rrsp ?? 0) / totalWealth * 100) + "% of savings in registered accounts. Minimum withdrawals increase with age (forced at 71). Observe the taxable income trajectory and interaction with government benefits." });

  if ((params.retIncome ?? 0) > 80000)
    obsPool.push({ topic: "oas-threshold", instr: "OAS recovery tax zone: income of " + Math.round(params.retIncome ?? 0) + "$/yr approaches or exceeds the threshold ($95,323 in 2026). Each dollar above triggers 15% recovery. Quantify the impact in annual dollars." });

  if (gkActive && D.gkCutFreq !== null && D.gkCutFreq > 0.15)
    obsPool.push({ topic: "spending-volatility", instr: "Spending adjustment frequency: cuts triggered in " + Math.round((D.gkCutFreq ?? 0) * 100) + "% of simulated years. Average cut when triggered: " + Math.round((D.gkAvgCut ?? 0) * 100) + "%. What this means for monthly budget predictability. Frame in dollar terms." });

  if ((rpt.homeValue ?? 0) > 0)
    obsPool.push({ topic: "home-equity", instr: "Home equity context: property valued at " + Math.round(rpt.homeValue ?? 0) + "$ with " + Math.round(rpt.homeMortgage ?? 0) + "$ remaining. This represents " + (totalWealth > 0 ? Math.round((rpt.homeValue - (rpt.homeMortgage ?? 0)) / (totalWealth + rpt.homeValue) * 100) : 0) + "% of total net worth. Observe the concentration and illiquidity implications without prescribing action." });

  if ((rpt.debtBal ?? 0) > 0)
    obsPool.push({ topic: "debt-in-retirement", instr: "Debt in retirement: " + Math.round(rpt.debtBal ?? 0) + "$ in outstanding debt. Annual interest cost of approximately " + Math.round((rpt.debtBal ?? 0) * 0.07) + "$. State the mathematical cost only — no debt shaming." });

  // Fallback
  obsPool.push({ topic: "unique-insight", instr: "Unique profile insight: identify the single most interesting tension or opportunity in this profile that hasn't been covered in other slots. Be specific to THIS person's numbers, not generic." });

  // Assign obs_1-obs_3 from pool
  const obsAssigned = obsPool.slice(0, 3);
  const obs1Instr = obsAssigned[0]?.instr || "Most impactful observation from DATA.";
  const obs2Instr = obsAssigned[1]?.instr || "Second most impactful observation from DATA.";
  const obs3Instr = obsAssigned[2]?.instr || "Unique profile insight specific to this person.";

  // ════════════════════════════════════════════════════════════════
  // 5. EMPHASIS BLOCK (from RenderPlan + signals)
  // ════════════════════════════════════════════════════════════════
  const emphasisLines: string[] = [];
  if (wdRate > 5) emphasisLines.push("EMPHASIS: Withdrawal rate (" + wdRate + "%) is the primary tension. Every relevant slot should acknowledge this pressure.");
  if (plan.emphasizeGov) emphasisLines.push("EMPHASIS: Government coverage is low (" + Math.round((D.govCoveragePct ?? 0) * 100) + "%). Focus on the gap between guaranteed income and spending needs.");
  if (signals.rrspHeavy) emphasisLines.push("EMPHASIS: RRSP concentration (" + signals.rrspHeavy + "%). RRIF forced withdrawals will drive taxable income upward with age.");
  if (signals.withdrawalStress) emphasisLines.push("EMPHASIS: Withdrawal stress ratio " + (signals.withdrawalStress?.ratio ?? 0) + "x — withdrawals exceed expected return, meaning portfolio shrinks in real terms even in average years.");
  const emphasisBlock = emphasisLines.length > 0 ? emphasisLines.join("\n") + "\n" : "";

  // ════════════════════════════════════════════════════════════════
  // 6. COMPUTED CONTEXT HELPERS
  // ════════════════════════════════════════════════════════════════
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-CA");
  const fmtPct = (n: number) => `${Math.round(n * 10) / 10} %`;

  const couple = !!params.cOn;
  const oasAlreadyClaiming = q.oasAlreadyClaiming === true || q.oasAlreadyClaiming === "true";
  const govLabel = isQC ? "RRQ" : "RPC";
  const age = params.age ?? 65;
  const deathAge = params.deathAge ?? 105;
  const retIncome = params.retIncome ?? 0;
  const govMonthly = rpt.govTotalMonthly ?? 0;
  const govCoveragePct = D.govCoveragePct ?? 0;
  const medWealth = D.medWealth ?? 0;
  const p10Wealth = D.p10Wealth ?? 0;
  const p90Wealth = D.p90Wealth ?? 0;
  const wealthSpread = p90Wealth - p10Wealth;
  const grade = D.grade ?? "C";
  const meltTarget = D.meltTarget ?? 58523;
  const meltSuccessPct = D.melt1Succ ?? null;
  const meltGap = Math.max(0, retIncome - meltTarget);
  const meltIsBase = !!D.meltIsBase;
  const mc60Succ = D.mc60Succ ?? null;
  const mc65Succ = D.mc65Succ ?? null;
  const mc70Succ = D.mc70Succ ?? null;
  const medEstate = D.medEstate ?? 0;
  const p10Estate = D.p10Estate ?? 0;
  const estatePref = D.estatePref || "balanced";
  const gkCutFreq = D.gkCutFreq ?? null;
  const gkAvgCut = D.gkAvgCut ?? null;

  // ════════════════════════════════════════════════════════════════
  // 7. ENRICHED DATA BLOCK (structured JSON like Inter)
  // ════════════════════════════════════════════════════════════════
  const data: Record<string, any> = {
    profile: {
      age, sex: params.sex ?? "M", prov: params.prov ?? "QC",
      couple, cAge: params.cAge, cSex: params.cSex,
      retirementStatus: q.retirementStatus || "retired",
      profileType: profile.profileType, narrativeTheme: profile.narrativeTheme,
      anxiety: profile.anxiety, discipline: profile.discipline, literacy: profile.literacy,
    },
    wealth: {
      total: totalWealth,
      rrsp: rpt.rrsp ?? params.rrsp ?? 0, tfsa: rpt.tfsa ?? params.tfsa ?? 0, nr: rpt.nr ?? params.nr ?? 0,
      rrspPct: totalWealth > 0 ? Math.round((rpt.rrsp ?? params.rrsp ?? 0) / totalWealth * 100) : 0,
      tfsaPct: totalWealth > 0 ? Math.round((rpt.tfsa ?? params.tfsa ?? 0) / totalWealth * 100) : 0,
      homeEquity: rpt.homeEquity ?? 0,
      debtBal: rpt.debtBal ?? 0,
    },
    income: {
      retIncome, retIncomeMonthly: Math.round(retIncome / 12),
      govMonthly, govCoveragePct: Math.round(govCoveragePct * 100),
      qppMonthly: rpt.govQppMonthly ?? D.qppMonthly ?? 0,
      oasMonthly: rpt.govOasMonthly ?? D.oasMonthly ?? 0,
      penMonthly: rpt.govPenMonthly ?? D.penMonthly ?? 0,
      qppAge: params.qppAge ?? 65, oasAge: params.oasAge ?? 65,
      alreadyClaiming, oasAlreadyClaiming,
    },
    results: {
      successPct, grade,
      medWealth, p10Wealth, p90Wealth,
      wealthSpread,
      medEstate, p10Estate,
      initialRate: wdRate,
      ruinPct: D.ruinPct ?? 0, medRuin: D.medRuin ?? 999,
      avgDeath: D.avgDeath ?? (params.sex === "F" ? 87 : 84),
      medDeath: D.medDeath ?? D.avgDeath ?? 85,
    },
    allocation: {
      allocR: params.allocR ?? 0.5,
      endAllocR: D.endAllocR ?? 0.3,
      glideSpd: params.glideSpd ?? 0.01,
      eqRet: params.eqRet ?? 0.065,
      bndRet: params.bndRet ?? 0.03,
      inf: params.inf ?? 0.02,
    },
    spending: {
      flex: q.spendingFlex || "moderate",
      gkActive,
      gkMaxCut: params.gkMaxCut ?? 0.20,
      gkCutFreq, gkAvgCut,
      goP: params.goP ?? 1.05, slP: params.slP ?? 0.88, noP: params.noP ?? 0.75,
    },
    meltdown: {
      meltIsBase, meltTarget,
      meltGap, melt1Succ: meltSuccessPct,
    },
    cppTiming: alreadyClaiming ? null : {
      mc60Succ, mc65Succ, mc70Succ,
    },
    estate: { medEstate, p10Estate, pref: estatePref },
    nSim: D.nSim ?? 5000,
  };
  if (couple) {
    data.couple = {
      partnerAge: params.cAge, partnerSex: params.cSex,
      cRRSP: rpt.cRRSP ?? params.cRRSP ?? 0, cTFSA: rpt.cTFSA ?? params.cTFSA ?? 0, cNR: rpt.cNR ?? params.cNR ?? 0,
      cPenMonthly: rpt.cPenMonthly ?? 0,
    };
  }
  if (Object.keys(signals).length > 0) {
    data.signals = signals;
  }

  // ════════════════════════════════════════════════════════════════
  // 8. PER-SLOT HINTS (anchor/implication/nuance structure)
  // ════════════════════════════════════════════════════════════════
  const gradeMetaphor =
    grade === "A+" ? "Excellent — the portfolio sustains spending in nearly all simulated futures."
    : grade === "A" ? "Strong — the portfolio succeeds in most scenarios with comfortable margin."
    : grade === "B+" || grade === "B" ? "Solid — the portfolio works in the majority of cases but has some vulnerability to extended drawdowns."
    : grade === "C+" || grade === "C" ? "Moderate — the portfolio succeeds roughly half the time. Levers exist to shift the outcome."
    : grade === "D" ? "Fragile — the portfolio struggles in most scenarios. Spending adjustments or timing changes could shift the outcome."
    : "Critical — the portfolio does not meet the goal in current form.";

  const snapshotHint = "Grade " + grade + " (" + successPct + "%). " + gradeMetaphor + " Guaranteed income covers " + Math.round(govCoveragePct * 100) + "% of target spending. Portfolio fills the " + (100 - Math.round(govCoveragePct * 100)) + "% gap. Set the emotional tone for the entire report.";

  const longevityHint = "Median life expectancy from simulations: " + (D.medDeath ?? 85) + " years. Deterministic ceiling: " + deathAge + ". Depletion rate: " + (D.ruinPct ?? 0) + "% of scenarios." + (D.medRuin && D.medRuin < 999 ? " When depletion occurs, median age is " + D.medRuin + "." : "") + " Explain stochastic mortality in simple terms: 'each simulation uses a different lifespan based on Canadian actuarial tables.'";

  const spendFlexHint = gkActive
    ? "Spending flexibility rules are active. Maximum cumulative reduction: " + Math.round((params.gkMaxCut ?? 0.20) * 100) + "%. " + (gkCutFreq !== null ? "Cuts triggered in " + Math.round(gkCutFreq * 100) + "% of simulated years, average cut " + Math.round((gkAvgCut ?? 0) * 100) + "% when triggered." : "") + " Translate into monthly dollar impact: " + Math.round(retIncome / 12) + "$/mo target, maximum reduction to " + Math.round(retIncome / 12 * (1 - (params.gkMaxCut ?? 0.20))) + "$/mo. Do NOT name 'Guyton-Klinger'. Omit this slot (return empty string) if not pertinent."
    : "Spending is fixed (no automatic adjustments). This means the portfolio bears all market risk without any spending cushion. Explain what fixed spending implies for sustainability in adverse scenarios. If success rate is high, note that fixed spending simplifies budgeting.";

  const incomeMixHint = gP + " " + (rpt.govQppMonthly ?? 0) + "$/mo + " + oN + " " + (rpt.govOasMonthly ?? 0) + "$/mo" + ((rpt.govPenMonthly ?? 0) > 0 ? " + DB pension " + (rpt.govPenMonthly ?? 0) + "$/mo" : "") + " = " + govMonthly + "$/mo total guaranteed. This covers " + Math.round(govCoveragePct * 100) + "% of the " + Math.round(retIncome / 12) + "$/mo target. The remaining " + Math.max(0, Math.round(retIncome / 12 - govMonthly)) + "$/mo comes from portfolio withdrawals. Activation ages: " + gP + " at " + (params.qppAge ?? 65) + ", " + oN + " at " + (params.oasAge ?? 65) + ".";

  const rrspVal = rpt.rrsp ?? params.rrsp ?? 0;
  const taxTimingHint = "RRSP/RRIF balance: " + fmt(rrspVal) + "$" + (totalWealth > 0 ? " (" + Math.round(rrspVal / totalWealth * 100) + "% of liquid savings)" : "") + ". RRIF minimum conversion begins at 71 (forced taxable withdrawals that increase with age). OAS recovery threshold: $95,323 (2026) — every dollar above triggers 15% recovery tax. " + (retIncome > 90000 ? "Current target income of " + fmt(retIncome) + "$ is ABOVE the threshold — OAS recovery is active." : retIncome > 80000 ? "Current target of " + fmt(retIncome) + "$ approaches the threshold." : "Current target is below the threshold.") + " Pension income splitting: " + (couple ? "available — could reduce household tax burden." : "N/A (single profile).") + " Observe tax implications of the drawdown sequence. DO NOT prescribe tax strategy.";

  const meltdownHint = meltIsBase
    ? "Income is already at or below the meltdown target (" + fmt(meltTarget) + "$/yr). Margin is zero. Observe what this means for spending flexibility and whether further reduction is feasible."
    : "Meltdown scenario: spending reduced from " + fmt(retIncome) + "$ to " + fmt(meltTarget) + "$/yr (first federal bracket). Gap: " + fmt(meltGap) + "$/yr. " + (meltSuccessPct !== null ? "Success rate at meltdown level: " + meltSuccessPct + "% (vs " + successPct + "% at current level)." : "") + " Frame as a stress test showing the portfolio's response to reduced spending. Include the severe reduction scenario if available.";

  const cppTimingHint = alreadyClaiming
    ? "Return empty string — " + gP + " is already in payment, timing comparison not applicable."
    : "Compare three claiming ages: 60 (" + (mc60Succ ?? "?") + "%), 65 (" + (mc65Succ ?? "?") + "%), 70 (" + (mc70Succ ?? "?") + "%). Each was simulated independently (1,000 scenarios). Observation factuelle — identify which timing produces the highest success rate and by how much. Early claiming = 36% permanent reduction. Late claiming = 42% permanent bonus. DO NOT prescribe which age to choose.";

  const sequenceHint = "Portfolio spread: P10 " + fmt(p10Wealth) + "$ to P90 " + fmt(p90Wealth) + "$ at age " + deathAge + " — a " + fmt(wealthSpread) + "$ range. This spread reflects the impact of the order in which returns arrive, especially in the first 5-10 years of withdrawals. Explain in plain language: two people with identical portfolios and withdrawals can end up with vastly different outcomes depending on whether bad years hit early or late.";

  const estateHint = "Median estate at " + deathAge + ": " + fmt(medEstate) + "$. Pessimistic scenario (P10): " + fmt(p10Estate) + "$. Declared preference: " + (estatePref === "maximize" ? "maximize inheritance" : estatePref === "spenddown" ? "spend it down" : "balanced") + ". Align the observation with this preference. If preference is 'spenddown' and estate is large, note the gap. If preference is 'maximize' and P10 is low, note the risk to that goal.";

  // ════════════════════════════════════════════════════════════════
  // 9. SYSTEM PROMPT
  // ════════════════════════════════════════════════════════════════
  const riskOrder = plan.worstCasePlacement === "standard"
    ? "RISK ORDER: Include risk context where relevant, keep tone calm."
    : "RISK ORDER: Do not lead with worst-case. Build confidence first, mention risk later with context.";

  const sys = `You narrate buildfi.ca Décaissement reports ($59 tier — retirement drawdown analysis).
You write like a human financial planner who studied this retiree's file for an hour — not a template engine filling slots.
Each slot must feel like it was written specifically for THIS person. If two different profiles could produce the same text, you have failed.

=== COMPLIANCE (AMF / OSFI — NON-NEGOTIABLE) ===
This is an EDUCATIONAL tool, NOT financial advice.
1. Facts from DATA may use present tense ("Le taux de réussite est 72 %").
2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).
3. Use 'pourrait + infinitive' construction. NEVER use single-word conditional future (ajouterait, constituerait, permettrait). Instead: 'pourrait ajouter', 'pourrait constituer', 'pourrait permettre'.
4. FORBIDDEN verbs (never use): devriez, recommandons, conseillons, il faut, devez, assurez-vous, considerez, optimisez, priorisez, plan d'action, recommandation(s), you should, you must, we recommend.
5. Observational language ONLY. Describe what numbers show; never prescribe actions.
6. Do not shame debt. State the mathematical cost only.
7. NEVER suggest combining scenarios or adding their effects together.
8. Use 'Cette analyse suggère' or 'Les données indiquent', never directive language.
${PLAIN_LANG_NOTE}

=== FILLER BAN (ZERO TOLERANCE) ===
NEVER write any of these phrases (instant rejection):
- 'il est important de noter', 'il convient de souligner', 'il convient de noter'
- 'dans ce contexte', 'par ailleurs', 'en outre', 'il est à noter'
- 'notons que', 'soulignons que', 'mentionnons que'
- 'it is important to note', 'it should be noted', 'worth noting', 'in this context'
Every sentence must carry information. If you can delete a sentence without losing meaning, delete it.

=== NUMERIC SAFETY ===
- Use ONLY numbers that appear in the DATA block. Do NOT invent, round, estimate, or extrapolate any figure.
- No external averages, no typical ranges, no invented thresholds.
- NEVER translate percentages into ratio phrases ('1 in 4', '3 out of 4', '9 sur 10'). The report template handles probability translation with verified brackets. Use only the exact percentage from DATA: '72 %' or '72 % des scénarios'.

=== LANGUAGE ===
- ${fr ? "French (vous). Naturel, pas robotique. Variez les tournures de phrase." : "English. Natural, not robotic. Vary sentence structure."}
- ${profile.literacy === "advanced" ? "Grade 12 reading level. Precise financial vocabulary OK (withdrawal rate, coverage ratio, real return, OAS clawback). Still keep sentences short and declarative." : "Grade 10 reading level. Short sentences. No jargon."}
- Acronyms: NEVER use acronyms in ${fr ? "French" : "English"}. Write in full: ${gP}, ${oN}.
${fr ? "- ACCENTS: You MUST use proper French diacritics (é, è, ê, ë, à, â, ç, î, ï, ô, ù, û). Write \"réussite\" not \"reussite\", \"épargne\" not \"epargne\", \"scénario\" not \"scenario\". Zero tolerance — every missing accent is a defect." : ""}

=== VOCABULARY BAN (ZERO TOLERANCE) ===
NEVER use these subjective adjectives — they impose judgment on the client's choices:
FR: modeste, raisonnable, agressif, prudent, confortable, élevé (for spending), faible (for spending), ambitieux
EN: modest, reasonable, aggressive, conservative (as character judgment), comfortable, high (for spending), low (for spending), ambitious
PREFERRED ALTERNATIVES:
${fr ? "- 'niveau de dépenses visé', 'objectif plus exigeant', 'marge plus limitée', 'structure plus défensive', 'plus exposé aux actions', 'plus contraint'" : "- 'target spending level', 'more demanding objective', 'tighter margin', 'more defensive structure', 'growth-oriented allocation', 'more constrained'"}

=== UNIQUENESS ===
Test: if you replaced the numbers and the sentence still works unchanged, rewrite it.
BANNED GENERIC CLOSERS (never use):
- 'ce n'est pas un verdict' / 'this is not a verdict'
- 'le temps est votre allié' / 'time is on your side'
- 'le premier pas est le plus important' / 'the first step is the most important'
- 'chaque dollar compte' / 'every dollar counts'
Instead: reference the specific number, timeline, or account type that makes this person's situation unique.

=== VOICE ===
${voiceInstr}

=== PARAGRAPH FORMULA (MANDATORY) ===
Every analytical paragraph must follow: OBSERVATION → CAUSE → IMPLICATION
1. OBSERVATION: State the specific number or fact from DATA (present tense).
2. CAUSE: Explain WHY this number is what it is — what drives it.
3. IMPLICATION: What this means concretely for this person's life (conditional tense). Translate into months of income, years of coverage, or dollars per month.
If you cannot identify a distinct cause, merge steps 1+3. Never stack three observations without explanation.

=== DENSITY (DECUMULATION TIER) ===
2-3 sentences per slot. Adapt complexity to the literacy level in the PROFILE block. For basic literacy: one idea per sentence, everyday analogies (grocery budget, monthly bills). For advanced literacy: reference rates and ratios directly, use comparative framing.

=== SLOT STRUCTURE (MANDATORY) ===
Each slot = 2-3 sentences following this arc:
1. ANCHOR: One specific number from DATA, stated as fact (present tense).
2. IMPLICATION: What this number means for this person's retirement reality, in conditional tense. Be concrete — translate abstract numbers into months of income, years of coverage, or dollars per month.
3. NUANCE: A condition, variability factor, or contextual detail that adds depth (conditional tense).

=== OBSERVATION ORTHOGONALITY ===
obs_1, obs_2, obs_3 must each cover a DIFFERENT analytical dimension:
- Financial (rates, amounts, costs)
- Temporal (timeline, sequence, longevity)
- Behavioral (spending flexibility, drawdown strategy)
Never two obs on the same dimension. Order by impact descending.

=== DEDUPLICATION (CRITICAL) ===
- Each slot MUST cover a DIFFERENT topic. Never repeat the same subject across slots.
- obs slots MUST NOT repeat topics already covered in named slots (income_mix_obs, tax_timing_obs, etc.).
- If a slot instruction says to return empty string (""), do so — do not force content.

=== OUTPUT ===
- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences. No trailing commas.
- If you cannot comply, output {}.`;

  // ════════════════════════════════════════════════════════════════
  // 10. USER PROMPT
  // ════════════════════════════════════════════════════════════════
  const usr = `=== VOICE ===
${voiceInstr}

=== NARRATIVE ARC ===
${narrativeArc}

${emphasisBlock}${riskOrder}

=== PROFILE ===
anxiety=${profile.anxiety}, discipline=${profile.discipline}, literacy=${profile.literacy}
friction=${profile.primaryFriction}, theme=${profile.narrativeTheme}, type=${profile.profileType || "general"}

=== WORRY PATTERNS ===
${worryBlock}

=== DATA ===
${JSON.stringify(data)}

=== SLOT INSTRUCTIONS ===
Return JSON with 2-3 sentences per slot. Each sentence must carry information. Zero filler.
{
  "snapshot_intro":"${snapshotHint.replace(/"/g, '\\"')}",
  "longevity_context":"${longevityHint.replace(/"/g, '\\"')}",
  "spending_flex_obs":"${spendFlexHint.replace(/"/g, '\\"')}",
  "income_mix_obs":"${incomeMixHint.replace(/"/g, '\\"')}",
  "tax_timing_obs":"${taxTimingHint.replace(/"/g, '\\"')}",
  "meltdown_obs":"${meltdownHint.replace(/"/g, '\\"')}",
  "cpp_timing_obs":"${cppTimingHint.replace(/"/g, '\\"')}",
  "sequence_obs":"${sequenceHint.replace(/"/g, '\\"')}",
  "estate_obs":"${estateHint.replace(/"/g, '\\"')}",
  "obs_1":"${obs1Instr.replace(/"/g, '\\"')} Never start with a generic opener. Start with the specific number or fact.",
  "obs_2":"${obs2Instr.replace(/"/g, '\\"')}",
  "obs_3":"${obs3Instr.replace(/"/g, '\\"')}"
}

Respond in ${fr ? "French" : "English"} exclusively. JSON strict. No text outside the JSON object.`;

  return { sys, usr };
}
