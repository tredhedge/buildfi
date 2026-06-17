// lib/ai-prompt-360.ts — Unified AI prompt builder for Bilan 360 ($19.99)
// Single adaptive prompt that branches on life phase (ACCUM/TRANSITION/DECUM)
// 34 slots matching report-html-360.js renderer expectations
// Ports quality patterns from ai-prompt-inter.ts + ai-prompt-decum.ts
//
// PII AUDIT (2026-04-26 — Sprint 4 Loi 25 review):
//   This prompt MUST NOT contain raw email, last name, or any direct
//   identifier. The current quiz schema (lib/wizard/blocks.ts) collects
//   no name field, so no first names are passed either. Verified: zero
//   email-like substrings in this file (no email leaks).
//   If a future change adds a name field to the wizard, scrub here before
//   inserting into prompt strings.
//
// Slots: biggest_risk, best_lever, snapshot_intro, mirror_block,
//   revenue_analysis, savings_analysis, gov_explanation, cpp_timing,
//   longevity_analysis, spending_flex, what_if_analysis, strategy_comparison,
//   sequence_risk, meltdown_analysis, priority_actions, tax_analysis,
//   fees_analysis, couple_analysis, property_analysis, strengths_risks,
//   estate_analysis, obs_1-5, obs_1_title-5_title,
//   next_horizon, model_blind_spots, efficiency_gap

import { computeDerivedProfile, computeRenderPlan, computeCompositeSignals } from "./ai-profile";

const PLAIN_LANG_NOTE = `
JARGON INTERDIT (jamais dans le texte visible) :
- "Guyton-Klinger" → "règles de flexibilité des dépenses" ou "ajustements automatiques des retraits"
- "Monte Carlo" → "simulations" ou "scénarios"
- "séquence de rendements" → "l'ordre dans lequel les rendements arrivent"
- "volatilité" → "fluctuations" ou "variations"
- "allocation d'actifs" → "répartition entre actions et obligations"
- "drawdown" → "ponctions" ou "retraits"
- "decumulation" → bannir entièrement dans le texte client
- "RRIF" → "FERR" (en français) ou "Registered Retirement Income Fund" (en anglais, première occurrence)
- "OAS clawback" → "récupération de la Sécurité de la vieillesse" ou "OAS recovery tax"
`;

/** Build system + user prompts for Bilan 360 AI narration (claude-opus-4-6). */
export function buildAIPrompt360(
  D: Record<string, any>,
  params: Record<string, any>,
  fr: boolean,
  quiz: Record<string, any>,
  phase: string,
  stratData?: Array<{ key: string; succ: number; medF: number }>
): { sys: string; usr: string; obsLabels: Record<string, string> } {
  const q = params._quiz || {};
  const rp = params._report || {};

  // Province-aware full names (zero acronyms)
  const isQC = (params.prov || "QC") === "QC";
  const gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada")
            : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  // DerivedProfile + RenderPlan + CompositeSignals
  const profileQuiz = phase === "DECUM" ? {
    ...quiz,
    income: params.retIncome || 0,
    monthlyContrib: 0,
    risk: (params.allocR || 0.5) > 0.65 ? "growth" : (params.allocR || 0.5) < 0.45 ? "conservative" : "balanced",
    couple: q.couple || "no",
    worries: q.worries || [],
    confidence: q.confidence || 3,
  } : quiz;

  const profile = computeDerivedProfile(profileQuiz || {}, D, params);
  const plan = computeRenderPlan(profile, D);
  const signals = computeCompositeSignals(profileQuiz || {}, D, params, profile);

  // ════════════════════════════════════════════════════════════════
  // 1. VOICE MATRIX (tone × literacy = 9 combos)
  // ════════════════════════════════════════════════════════════════
  const voiceMatrix: Record<string, string> = {
    "warm+basic": "Write like a patient, kind guide. One idea per sentence. Lead every slot with something reassuring before any number. Use everyday analogies. Define any financial term inline. Never alarm.",
    "warm+intermediate": "Write like a trusted advisor having coffee. Warm but informed. Use numbers naturally in context. When delivering a difficult number, immediately follow with a softer frame. Light financial vocabulary OK.",
    "warm+advanced": "Write like a calm, experienced colleague. Technical precision is welcome but always wrapped in context. Acknowledge sophistication. Use ratios and rates directly, but frame every risk as manageable variability.",
    "balanced+basic": "Write like a clear, friendly explainer. Simple sentences. One number per sentence max. Always follow a number with what it means in plain words. Avoid stacking data points.",
    "balanced+intermediate": "Write like a sharp financial journalist. Mix data with narrative. Each slot tells a mini-story: here is the number, here is what it means, here is the nuance. Natural flow.",
    "balanced+advanced": "Write like a portfolio analyst briefing a knowledgeable client. Direct, confident, precise. Reference rates, ratios, and percentages without hedging. Implications should be specific and quantified.",
    "data-forward+basic": "Write like a data scientist explaining to a friend. Lead with the most striking number. Explain its meaning in one plain sentence. Keep it punchy — short sentences, clear cause-effect.",
    "data-forward+intermediate": "Write like a Bloomberg terminal summary for a retail investor. Dense but readable. Each sentence carries a data point or an implication. No filler. Comparative framing preferred.",
    "data-forward+advanced": "Write like a portfolio analyst's concise briefing. Maximum density. Reference withdrawal rates, coverage ratios, real vs nominal, fee drag percentages. Every sentence must carry information. Zero fluff.",
  };
  const voiceKey = plan.tone + "+" + profile.literacy;
  const voiceInstr = voiceMatrix[voiceKey] || voiceMatrix["balanced+intermediate"];

  // ════════════════════════════════════════════════════════════════
  // 2. NARRATIVE ARC (phase-adaptive themes)
  // ════════════════════════════════════════════════════════════════
  const arcMap: Record<string, string> = phase === "DECUM" ? {
    security: "NARRATIVE ARC — SUSTAINABILITY: This person's plan is robust. Open with what is solid and protected. Frame every number through the lens of 'what is secure.' Risks = manageable variability. Journey: validation → understanding → confidence to enjoy retirement.",
    growth: "NARRATIVE ARC — RESILIENCE: This person's plan works but has some vulnerability. Open with what works well. Frame numbers as indicators of strength with areas to watch. Journey: recognition → awareness → grounded planning.",
    optimization: "NARRATIVE ARC — EFFICIENCY: Good shape with room for fine-tuning. Open with efficiency metrics. Frame numbers as levers (timing, sequence, tax). Skip generic reassurance. Journey: validation → precision → informed choices.",
    "catch-up": "NARRATIVE ARC — CAUTION: This person's plan faces real pressure. Be honest but never defeatist. Open with what they CAN still influence — spending flexibility, timing adjustments. Journey: honesty → agency → actionable clarity.",
  } : {
    security: "NARRATIVE ARC: This person seeks safety above all. Open with what is solid and protected. Frame every number through the lens of 'what is secure.' Risks = manageable variability, never threats. Close each slot with a stabilizing thought. Journey: reassurance → understanding → grounded confidence.",
    growth: "NARRATIVE ARC: This person is building momentum. Open with trajectory and compounding power. Frame numbers as progress markers. Risks = speed bumps, not roadblocks. Close each slot with forward-looking potential. Journey: recognition → momentum → possibility.",
    optimization: "NARRATIVE ARC — EFFICIENCY: This person is already in good shape and wants to fine-tune. Open with efficiency metrics. Frame numbers as levers to pull. Skip generic reassurance. Close each slot with a specific efficiency insight. Journey: validation → precision → mastery.",
    "catch-up": "NARRATIVE ARC: This person started late or faces a gap. Be honest but never defeatist. Open with what they CAN still influence. Frame numbers as starting points, not verdicts. Close each slot with the next achievable milestone. Journey: honesty → agency → achievable next step.",
  };
  const narrativeArc = arcMap[profile.narrativeTheme] || arcMap.growth;

  // ════════════════════════════════════════════════════════════════
  // 3. WORRY PATTERNS (phase-adaptive)
  // ════════════════════════════════════════════════════════════════
  const successPct = Number(D.successPct ?? 50);
  const gkActive = !!params.gkOn;
  const alreadyClaiming = q.qppAlreadyClaiming === true || q.qppAlreadyClaiming === "true";
  const wdRate = D.initialRate ?? D.withdrawalRatePct ?? 0;

  const worryPatterns: string[] = [];

  if (phase === "DECUM" || phase === "TRANSITION") {
    // Decum-specific worry patterns (auto-triggered by data)
    if (successPct < 70 && !gkActive)
      worryPatterns.push("WORRY PATTERN [longevity-fixed]: Low success rate with fixed spending. Every slot should subtly reinforce spending flexibility is the most powerful lever.");
    if (successPct < 55)
      worryPatterns.push("WORRY PATTERN [critical-sustainability]: Success rate below 55%. Lead EVERY slot with reassuring data point first. Do not stack risks.");
    if ((params.retIncome ?? 0) > 95000)
      worryPatterns.push("WORRY PATTERN [oas-clawback]: Income above OAS recovery threshold ($95,323). tax_analysis MUST address recovery tax impact.");
    if (wdRate > 5)
      worryPatterns.push("WORRY PATTERN [withdrawal-pressure]: Withdrawal rate " + wdRate + "% exceeds conventional thresholds. sequence_risk should address early sequence risk.");
  }

  if (phase === "ACCUM" || phase === "TRANSITION") {
    // Accum-specific worry patterns (from quiz worries)
    const worries: string[] = q.worries || [];
    const worrySet: Record<string, boolean> = {};
    worries.forEach((w: string) => { worrySet[w] = true; });

    if (worrySet.runout && worrySet.health)
      worryPatterns.push("WORRY PATTERN [existential]: Client fears running out AND health costs. Reinforce safety nets and controllable factors.");
    if (worrySet.tax && worrySet.legacy)
      worryPatterns.push("WORRY PATTERN [estate-efficiency]: Client thinks about tax efficiency AND legacy. tax_analysis should explore retirement bracket advantage.");
    if (worrySet.market && worrySet.inflation)
      worryPatterns.push("WORRY PATTERN [investor-anxiety]: Client worries about both market drops AND purchasing power. Frame all amounts as inflation-adjusted (they are).");
    if (worrySet.runout && worrySet.inflation && worrySet.health)
      worryPatterns.push("WORRY PATTERN [maximum-anxiety]: 3+ fears active. Lead EVERY slot with reassuring data point first. One idea per sentence.");
    if (worrySet.tax && worrySet.market && params.cOn)
      worryPatterns.push("WORRY PATTERN [couple-fiscal-anxiety]: Tax + market worries in a couple household. couple_analysis should explore pension splitting benefits.");
    if (worries.length === 0 && worryPatterns.length === 0)
      worryPatterns.push("WORRY PATTERN [confident/disengaged]: No worries selected. Mirror savings habits or situation positives. Keep tone matter-of-fact.");
  }

  // Couple age gap (all phases)
  if (params.cOn && Math.abs((params.age ?? 65) - (params.cAge ?? 65)) >= 5)
    worryPatterns.push("WORRY PATTERN [couple-age-gap]: 5+ year age gap between partners. Longevity and survivor implications differ.");

  // RRSP concentration (all phases)
  const totalWealth = (rp.rrsp ?? params.rrsp ?? 0) + (rp.tfsa ?? params.tfsa ?? 0) + (rp.nr ?? params.nr ?? 0) +
    (rp.cRRSP ?? params.cRRSP ?? 0) + (rp.cTFSA ?? params.cTFSA ?? 0) + (rp.cNR ?? params.cNR ?? 0);
  if (totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.65)
    worryPatterns.push("WORRY PATTERN [rrsp-concentration]: 65%+ of savings in RRSP. tax_analysis should address RRIF minimum conversion and taxable income trajectory.");

  if (worryPatterns.length === 0)
    worryPatterns.push("WORRY PATTERN [stable]: No critical concern flags. Mirror what is working well. Confident, matter-of-fact tone.");

  const worryBlock = worryPatterns.join("\n");

  // ════════════════════════════════════════════════════════════════
  // 4. COMPUTED CONTEXT HELPERS
  // ════════════════════════════════════════════════════════════════
  const yrsToRet = Math.max(0, (D.retAge || 65) - (D.age || 40));
  const retYears = Math.max(0, (D.deathAge || 87) - (D.retAge || 65));
  const totalAccounts = (D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0);
  const monthlyContrib = phase !== "DECUM" ? (quiz.monthlyContrib || D.monthlyContrib || 0) : 0;
  const savingsRate = D.sal > 0 ? Math.round(monthlyContrib * 12 / D.sal * 100) : 0;
  const autonomyYears = D.gapMonthly > 0 ? Math.round((D.retBal || 0) / (D.gapMonthly * 12) * 10) / 10 : 99;
  const taxDiffPerYear = D.sal > 0 ? Math.round(D.sal * Math.abs((D.taxCurrentEffective || 0) - (D.taxRetirementEffective || 0)) / 100) : 0;
  const fmt = (n: number) => Math.round(n).toLocaleString("fr-CA");

  // Property/mortgage context
  const propSlot = (rp.mortBal > 0
    ? (rp.mortFreeAge > (params.retAge || 65) ? "MORTGAGE IN RETIREMENT: extends " + (rp.mortFreeAge - (params.retAge || 65)) + " years past retirement. " + (rp.mortPayment || 0) + "$/mo added to retirement spending."
      : "Mortgage paid by age " + rp.mortFreeAge + " — housing costs drop at retirement.") : "")
    + (rp.rentals && rp.rentals.length > 0 ? " RENTAL PORTFOLIO: " + rp.rentals.length + " propert" + (rp.rentals.length > 1 ? "ies" : "y") + ", total value " + (rp.rentalTotalValue || 0) + "$, net cash-flow " + ((rp.rentalTotalIncome || 0) - (rp.rentalTotalExpenses || 0)) + "$/yr." : "");

  // WIN/FIX (ACCUM/TRANSITION only)
  let winInstr = "";
  let fixInstr = "";
  if (phase !== "DECUM") {
    const winMap: Record<string, string> = {
      home: fr ? "Ouvrir en reconnaissant l'achat immobilier comme un actif concret." : "Open acknowledging home purchase as a tangible asset.",
      debtfree: fr ? "Ouvrir en soulignant l'absence de dettes — un avantage réel." : "Open acknowledging debt-free status as a real advantage.",
      saving: fr ? "Ouvrir en reconnaissant l'habitude d'épargne — c'est le facteur le plus déterminant." : "Open acknowledging consistent saving habit — the most impactful factor.",
      investing: fr ? "Ouvrir en reconnaissant les connaissances en investissement." : "Open acknowledging investing knowledge.",
      business: fr ? "Ouvrir en reconnaissant l'esprit entrepreneurial." : "Open acknowledging entrepreneurial ability.",
      none: fr ? "Ce bilan est un point de départ — le premier pas est le plus important." : "This assessment is a starting point — the first step matters most.",
    };
    winInstr = "WIN: " + (winMap[q.win] || winMap.none);
    const fixMap: Record<string, string> = {
      save_more: "Lead obs_1 with savings rate context: current rate is " + savingsRate + "% of income.",
      debt: "Lead obs_1 with debt cost: " + (rp.debtAnnualCost || 0) + "$/yr in interest.",
      invest: "Lead obs_1 with fee impact: " + (D.feeCostLifetime || 0) + "$ lifetime cost.",
      tax: "Lead obs_1 with tax rate comparison: " + (D.taxCurrentEffective || 0) + "% now vs " + (D.taxRetirementEffective || 0) + "% retirement.",
      retire_early: "Lead obs_1 with withdrawal rate: " + (D.withdrawalRatePct || 0) + "% is " + ((D.withdrawalRatePct || 0) > 4 ? "above" : "within") + " traditional sustainability thresholds.",
      clarity: "Lead obs_1 with success rate interpretation: " + (D.successPct || 0) + "% means " + (D.successPct || 0) + " of 5,000 simulated futures met the goal.",
    };
    fixInstr = "FIX: " + (fixMap[q.fix] || "Lead obs_1 with the most impactful lever from DATA.");
  }

  // Emphasis block
  const emphasisLines: string[] = [];
  if (plan.emphasizeDebt) emphasisLines.push("EMPHASIS: Debt is the primary friction. Every dollar of interest is a dollar not compounding.");
  if (plan.emphasizeFees) emphasisLines.push("EMPHASIS: Fee drag is significant. Highlight compounding cost.");
  if (plan.emphasizeGov) emphasisLines.push("EMPHASIS: Government coverage is low (" + (D.coveragePct || Math.round((D.govCoveragePct ?? 0) * 100)) + "%). Focus on gap funding.");
  if (signals.conservativeGrowthTrap) emphasisLines.push("EMPHASIS: Conservative allocation may limit growth needed for plan success.");
  if (signals.highEffortLowResult) emphasisLines.push("EMPHASIS: Strong savings effort (" + savingsRate + "%) but success rate is " + successPct + "%. Acknowledge the effort, explain what limits the outcome.");
  if (wdRate > 5 && (phase === "DECUM" || phase === "TRANSITION")) emphasisLines.push("EMPHASIS: Withdrawal rate (" + wdRate + "%) is the primary tension.");
  if (signals.rrspHeavy) emphasisLines.push("EMPHASIS: RRSP concentration (" + signals.rrspHeavy + "%). RRIF forced withdrawals will drive taxable income upward with age.");
  if (signals.withdrawalStress) emphasisLines.push("EMPHASIS: Withdrawal stress ratio " + (signals.withdrawalStress?.ratio ?? 0) + "x — withdrawals exceed expected return.");
  const emphasisBlock = emphasisLines.length > 0 ? emphasisLines.join("\n") + "\n" : "";

  const riskOrder = plan.worstCasePlacement === "standard"
    ? "RISK ORDER: Include risk context where relevant, keep tone calm."
    : "RISK ORDER: Do not lead with worst-case. Build confidence first, mention risk later with context.";

  // ════════════════════════════════════════════════════════════════
  // 5. DYNAMIC OBS ROUTING (obs_1 through obs_5)
  // ════════════════════════════════════════════════════════════════
  const bestStrat = stratData && stratData.length > 0
    ? stratData.reduce((a, b) => b.succ > a.succ ? b : a, stratData[0]).key : "statu_quo";

  const obsPool: Array<{ topic: string; labelFr: string; labelEn: string; instr: string }> = [];

  // Debt drag (ACCUM/TRANSITION)
  if (signals.debtDragOverSavings && phase !== "DECUM")
    obsPool.push({ topic: "debt-drag", labelFr: "Poids de la dette", labelEn: "Debt drag", instr: "Interest-to-savings ratio: annual debt interest (" + (rp.debtAnnualCost || 0) + "$) vs annual contributions (" + (monthlyContrib * 12) + "$). Quantify the drain on wealth accumulation." });

  // Debt in retirement (DECUM)
  if ((rp.debtBal ?? 0) > 0 && phase === "DECUM")
    obsPool.push({ topic: "debt-in-retirement", labelFr: "Dettes à la retraite", labelEn: "Debt in retirement", instr: "Debt in retirement: " + fmt(rp.debtBal ?? 0) + "$ outstanding. Annual interest ~" + fmt((rp.debtBal ?? 0) * 0.07) + "$. State the mathematical cost only." });

  // Bridge period (ACCUM/TRANSITION)
  if (signals.bridgePeriod && phase !== "DECUM")
    obsPool.push({ topic: "bridge-period", labelFr: "Période de pont", labelEn: "Bridge period", instr: "Bridge period: " + signals.bridgePeriod.years + " years of self-funding before government income. Total draw needed: " + signals.bridgePeriod.totalCost + "$." });

  // Couple asymmetry
  if (signals.coupleAsymmetry)
    obsPool.push({ topic: "couple-asymmetry", labelFr: "Asymétrie du ménage", labelEn: "Household asymmetry", instr: "Income asymmetry (ratio: " + signals.coupleAsymmetry.incomeRatio + "%)." + (signals.coupleAsymmetry.retAgeGap > 0 ? " Retirement age gap: " + signals.coupleAsymmetry.retAgeGap + " years." : "") + " What this means for household income stability." });

  // Fee impact — DEPRIORITIZED: skip if best strat is low_mer OR if fees_analysis slot is active (ACCUM/TRANS)
  // Fee observations in obs slots create redundancy with fees_analysis. Only include for DECUM (no fees_analysis slot).
  if (bestStrat !== "low_mer" && phase === "DECUM")
    obsPool.push({ topic: "fee-impact", labelFr: "Impact des frais", labelEn: "Fee impact", instr: "Fee impact: " + Math.round((D.merWeighted || 0) * 10000) / 100 + "% per year = " + (D.feeCostLifetime || 0) + "$ total fees. Translate into months of retirement income lost to fees." });

  // Withdrawal stress
  if (signals.withdrawalStress)
    obsPool.push({ topic: "withdrawal-stress", labelFr: "Pression de retrait", labelEn: "Withdrawal pressure", instr: "Withdrawal rate (" + (D.withdrawalRatePct || wdRate) + "%) exceeds expected return by " + signals.withdrawalStress.ratio + "x. Portfolio would shrink in real terms even in average years." });

  // Mortgage in retirement
  if (signals.mortgageInRetirement)
    obsPool.push({ topic: "mortgage-retirement", labelFr: "Hypothèque à la retraite", labelEn: "Mortgage in retirement", instr: "Mortgage extends " + signals.mortgageInRetirement.yearsInRet + " years into retirement at " + signals.mortgageInRetirement.payment + "$/mo." });

  // Rental portfolio
  if (rp.rentals && rp.rentals.length >= 2) {
    const rTotCF = rp.rentals.reduce((s: number, r: any) => s + (r.cashFlow || 0), 0);
    obsPool.push({ topic: "rental-portfolio", labelFr: "Portefeuille locatif", labelEn: "Rental portfolio", instr: "Rental portfolio: " + rp.rentals.length + " properties, net cash-flow " + rTotCF + "$/yr. What this income stream means for withdrawal pressure." });
  }

  // RRIF conversion (DECUM/TRANSITION)
  if ((phase === "DECUM" || phase === "TRANSITION") && totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.50)
    obsPool.push({ topic: "rrif-conversion", labelFr: "Conversion FERR", labelEn: "RRIF conversion", instr: "RRIF dynamics: " + Math.round((params.rrsp ?? 0) / totalWealth * 100) + "% in registered accounts. Minimum withdrawals increase with age (forced at 71). Taxable income trajectory implications." });

  // OAS threshold (DECUM/TRANSITION)
  if ((phase === "DECUM" || phase === "TRANSITION") && (params.retIncome ?? 0) > 80000)
    obsPool.push({ topic: "oas-threshold", labelFr: "Seuil de récupération PSV", labelEn: "OAS recovery threshold", instr: "OAS recovery zone: income " + fmt(params.retIncome ?? 0) + "$/yr. Each dollar above $95,323 triggers 15% recovery." });

  // Spending volatility (DECUM/TRANSITION with GK)
  if (gkActive && D.gkCutFreq !== null && D.gkCutFreq > 0.15)
    obsPool.push({ topic: "spending-volatility", labelFr: "Variabilité des dépenses", labelEn: "Spending volatility", instr: "Spending adjustments triggered in " + Math.round((D.gkCutFreq ?? 0) * 100) + "% of simulated years. Average cut: " + Math.round((D.gkAvgCut ?? 0) * 100) + "%. Frame in dollar terms." });

  // Home equity
  if ((rp.homeVal ?? rp.homeValue ?? 0) > 0)
    obsPool.push({ topic: "home-equity", labelFr: "Équité immobilière", labelEn: "Home equity", instr: "Property valued at " + fmt(rp.homeVal ?? rp.homeValue ?? 0) + "$ with " + fmt(rp.mortBal ?? rp.homeMortgage ?? 0) + "$ remaining. Concentration and illiquidity implications." });

  // Business (ACCUM/TRANSITION)
  if (signals.bizExtractWindow && phase !== "DECUM")
    obsPool.push({ topic: "biz-extract", labelFr: "Fenêtre d'extraction", labelEn: "Extraction window", instr: "Business extraction window: " + signals.bizExtractWindow.yearsToSale + " years until sale vs " + signals.bizExtractWindow.yearsTilRet + " years until retirement." });

  // Estate structure
  if (D.successPct >= 90 && (D.rMedF || D.medEstate || 0) > 200000)
    obsPool.push({ topic: "estate-structure", labelFr: "Structure successorale", labelEn: "Estate structure", instr: "Estate: " + fmt(D.rMedF || D.medEstate || 0) + "$ median residual. Registered accounts are fully taxable at death. TFSA passes tax-free." });

  // Gov coverage
  obsPool.push({ topic: "gov-coverage", labelFr: "Couverture gouvernementale", labelEn: "Government coverage", instr: gP + " " + (D.qppMonthly || 0) + "$/mo + " + oN + " " + (D.oasMonthly || 0) + "$/mo = " + (D.govMonthly || 0) + "$/mo covering " + (D.coveragePct || Math.round((D.govCoveragePct ?? 0) * 100)) + "% of spending." });

  // Tax bracket shift
  if (Math.abs((D.taxCurrentEffective || 0) - (D.taxRetirementEffective || 0)) >= 5)
    obsPool.push({ topic: "tax-bracket-shift", labelFr: "Décalage fiscal", labelEn: "Tax bracket shift", instr: "Effective rate moves from " + (D.taxCurrentEffective || 0) + "% to " + (D.taxRetirementEffective || 0) + "% in retirement. ~" + taxDiffPerYear + "$/yr difference." });

  // Risk mismatch
  if (signals.riskMismatch)
    obsPool.push({ topic: "risk-mismatch", labelFr: "Profil de risque", labelEn: "Risk profile", instr: "Risk mismatch: chosen risk (" + (q.risk || "balanced") + ") and plan outcome (" + successPct + "% success) suggest a tension." });

  // Time leverage (ACCUM)
  if (signals.timeLeverage && phase === "ACCUM")
    obsPool.push({ topic: "time-leverage", labelFr: "Effet du temps", labelEn: "Time leverage", instr: "Compounding runway: " + yrsToRet + " years to retirement, each dollar saved today could multiply " + Math.round(Math.pow(1 + (D.expReturn || 0.05), yrsToRet)) + "x in real terms." });

  // Pre-retirement urgency (TRANSITION)
  if (signals.preRetUrgency && phase === "TRANSITION")
    obsPool.push({ topic: "pre-ret-urgency", labelFr: "Horizon compressé", labelEn: "Compressed horizon", instr: "Pre-retirement urgency: " + signals.preRetUrgency.years + " year(s) remaining. Accumulation window is closing." });

  // TFSA concentration
  if (signals.tfsaHeavy)
    obsPool.push({ topic: "tfsa-concentration", labelFr: "Concentration CÉLI", labelEn: "TFSA concentration", instr: "TFSA: " + Math.round(signals.tfsaHeavy) + "% of registered savings. Tax-free withdrawal flexibility in retirement." });

  // RRSP concentration
  if (signals.rrspHeavy && !obsPool.some(o => o.topic === "rrif-conversion"))
    obsPool.push({ topic: "rrsp-concentration", labelFr: "Concentration REER", labelEn: "RRSP concentration", instr: "RRSP: " + Math.round(signals.rrspHeavy) + "% of registered savings. Mandatory RRIF conversion at 71." });

  // Fallback
  obsPool.push({ topic: "unique-insight", labelFr: "Observation unique", labelEn: "Unique insight", instr: "Identify the single most interesting tension or opportunity in this profile not covered elsewhere. Be specific to THIS person." });

  // Assign obs_1-obs_5 from pool
  const obsAssigned = obsPool.slice(0, 5);
  // Each obs instruction now requires a bold title prefix for scannability
  const obsTitleInstr = "FORMAT: Start with a bold title (2-4 words), then a colon, then the observation. Example: '**Concentration immobilière** : Votre propriété représente...' The title must be unique and describe the specific insight.";
  const obs1Instr = (obsAssigned[0]?.instr || "Most impactful observation from DATA.") + " " + obsTitleInstr;
  const obs2Instr = (obsAssigned[1]?.instr || "Second most impactful observation.") + " " + obsTitleInstr;
  const obs3Instr = (obsAssigned[2]?.instr || "Third observation.") + " " + obsTitleInstr;
  const obs4Instr = (obsAssigned[3]?.instr || "Contextual analysis.") + " " + obsTitleInstr;
  const obs5Instr = (obsAssigned[4]?.instr || "Unique profile insight.") + " " + obsTitleInstr;

  // ════════════════════════════════════════════════════════════════
  // 6. COUPLE_ANALYSIS — profile-aware
  // ════════════════════════════════════════════════════════════════
  // Survivor scenario estimates (computed from params, not MC)
  const cAge = params.cAge || 0;
  const cSex = params.cSex || "F";
  const mainGovMonthly = (D.qppMonthly || 0) + (D.oasMonthly || 0) + (D.dbPensionMonthly || D.penMonthly || 0);
  const partnerGovMonthly = (rp.cPenMonthly || params.cPenM || 0);
  // QPP/CPP survivor benefit: ~60% of deceased partner's pension
  const mainQppSurvivorBenefit = Math.round((D.qppMonthly || 0) * 0.6);
  const partnerSavings = (params.cRRSP || 0) + (params.cTFSA || 0) + (params.cNR || 0);
  const survivorContext = params.cOn
    ? " SURVIVOR SCENARIO: If the primary earner (age " + (D.age || 65) + ") dies first, the surviving partner would retain their own pensions + ~" + mainQppSurvivorBenefit + "$/mo survivor " + gP + " benefit + the TFSA transfers tax-free. Household income would shift. If the partner (age " + cAge + ") dies first, the primary retains all registered accounts. Partner total savings: " + fmt(partnerSavings) + "$. Address BOTH trajectories briefly."
    : "";

  let coupleDesc: string;
  if (!params.cOn) {
    coupleDesc = "N/A — solo profile. Return empty string.";
  } else if (signals.coupleAsymmetry && signals.coupleAsymmetry.incomeRatio < 50) {
    coupleDesc = "Income asymmetry: ratio " + signals.coupleAsymmetry.incomeRatio + "%. Explore pension splitting benefit, bracket disparity, and what happens if the higher earner retires first." + survivorContext + " DO NOT repeat success rate or grade.";
  } else if (signals.coupleAsymmetry && signals.coupleAsymmetry.retAgeGap >= 3) {
    coupleDesc = "Staggered retirement: " + signals.coupleAsymmetry.retAgeGap + "-year gap. Explore single-income year costs, survivor benefits, coordinated drawdown." + survivorContext;
  } else {
    coupleDesc = "Household coordination: coordinated drawdown order, survivor pension benefits, household tax bracket management. Focus on the COUPLE dynamic." + survivorContext;
  }

  // ════════════════════════════════════════════════════════════════
  // 7. PRIORITY_ACTIONS — narrative-driven
  // ════════════════════════════════════════════════════════════════
  const frictionMap: Record<string, string> = {
    debt: "the cost of carrying debt",
    "savings-rate": "the gap between current savings effort and what the plan needs",
    spending: "the spending level relative to projected income",
    timeline: "the compressed timeline between now and retirement",
    fees: "the compounding effect of management fees over decades",
  };
  const frictionExplain = frictionMap[profile.primaryFriction] || "the primary financial tension";
  const themeClose: Record<string, string> = {
    security: "Close with a stabilizing thought — what is already protected.",
    growth: "Close with forward momentum — what the trajectory could become.",
    optimization: "Close with precision — the specific efficiency improvement available.",
    "catch-up": "Close with the next achievable milestone — not the destination, the next step.",
  };
  const priorityInstr = successPct >= 95
    ? "A+ PROFILE — Do NOT discuss improving success rate (already maxed) or accumulating more or spending less. Instead focus on: (1) fee adjustment (current " + Math.round((D.merWeighted || 0) * 10000) / 100 + "% → quantify gap vs low-fee), (2) tax-efficient withdrawal sequencing (RRSP→RRIF timing, TFSA maximization), (3) estate efficiency, (4) flexibility deployment (what the surplus enables). Frame as: the plan works — here is how each dollar could work harder. " + (themeClose[profile.narrativeTheme] || themeClose.optimization) + " Write as flowing narrative, NOT a numbered list."
    : "Explain WHY " + frictionExplain + " matters most for THIS person — connect it to their specific numbers. Include one lifestyle-level observation (monthly dollars or years of autonomy). " + (themeClose[profile.narrativeTheme] || themeClose.growth) + " Write as flowing narrative, NOT a numbered list.";

  // ════════════════════════════════════════════════════════════════
  // 8. ENRICHED DATA BLOCK
  // ════════════════════════════════════════════════════════════════
  const data: Record<string, any> = {
    phase,
    profile: {
      age: D.age, retAge: D.retAge, prov: D.prov, sex: D.sex,
      couple: q.couple || !!params.cOn, source: q.source,
      qppAge: D.qppAge || params.qppAge, oasAge: D.oasAge || params.oasAge,
      profileType: profile.profileType, narrativeTheme: profile.narrativeTheme,
      riskProfile: q.risk, lifestyle: q.lifestyle,
    },
    savings: {
      total: D.totalSavings || totalWealth, retBal: D.retBal,
      rrsp: D.rrsp || params.rrsp, tfsa: D.tfsa || params.tfsa, nr: D.nr || params.nr,
      lira: D.liraBal || 0,
    },
    gov: {
      qpp: D.qppMonthly, oas: D.oasMonthly, pension: D.dbPensionMonthly || D.penMonthly,
      total: D.govMonthly, cover: D.coveragePct || Math.round((D.govCoveragePct ?? 0) * 100),
    },
    results: {
      pct: successPct, grade: D.grade,
      med: D.rMedF || D.medWealth, p5Floor: D.rP5F || D.p5Wealth,
      p25Cautious: D.rP25F || D.p25Wealth, p75Favorable: D.rP75F || D.p75Wealth,
      savingsDurability: D.medRuin || 0,
      medEstate: D.medEstate || D.medEstateNet || 0,
    },
    tax: { curr: D.taxCurrentEffective, ret: D.taxRetirementEffective, marg: D.taxCurrentMarginal },
    fees: { mer: D.merWeighted || 0, cost: D.feeCostLifetime || 0, investStyle: q.investStyle || "unsure" },
    coverageYears: autonomyYears < 99 ? autonomyYears : null,
    bridgeYears: Math.max(0, (D.qppAge || params.qppAge || 65) - (D.retAge || 65)),
    bridgeCost: Math.max(0, (D.qppAge || params.qppAge || 65) - (D.retAge || 65)) * (D.gapMonthly || 0) * 12,
    feesCostInMonths: (D.retSpM || 1) > 0 ? Math.round((D.feeCostLifetime || 0) / (D.retSpM || 1)) : 0,
    timeline: {
      yrsToRet, retirementYears: retYears,
      avgDeath: D.avgDeath || D.deathAge || 87,
    },
  };

  // Phase-specific data additions
  if (phase === "ACCUM" || phase === "TRANSITION") {
    data.savings.monthlyContrib = monthlyContrib;
    data.savings.savingsRate = savingsRate;
    data.spend = { mo: D.retSpM, gap: D.gapMonthly, wd: D.withdrawalRatePct };
    data.scores = { longevity: D.longevityScore, tax: D.taxScore, gov: D.covScore, divers: D.diverScore };
  }
  if (phase === "DECUM" || phase === "TRANSITION") {
    data.income = {
      retIncome: params.retIncome, retIncomeMonthly: Math.round((params.retIncome || 0) / 12),
      govMonthly: rp.govTotalMonthly || D.govMonthly, govCoveragePct: Math.round((D.govCoveragePct ?? 0) * 100),
      alreadyClaiming, oasAlreadyClaiming: q.oasAlreadyClaiming === true || q.oasAlreadyClaiming === "true",
    };
    data.allocation = {
      allocR: params.allocR, endAllocR: D.endAllocR, glideSpd: params.glideSpd,
      eqRet: params.eqRet, bndRet: params.bndRet, inf: params.inf,
    };
    data.spending = {
      flex: q.spendingFlex || "moderate", gkActive,
      currentMonthly: q.currentSpM || 0, desiredMonthly: params.retSpM || 0,
      gkMaxCut: params.gkMaxCut, gkCutFreq: D.gkCutFreq, gkAvgCut: D.gkAvgCut,
    };
    data.meltdown = {
      meltIsBase: !!D.meltIsBase, meltTarget: D.meltTarget,
      meltGap: D.meltGap, melt1Succ: D.melt1Succ,
    };
    data.cppTiming = alreadyClaiming ? null : {
      mc60Succ: D.mc60Succ, mc65Succ: D.mc65Succ, mc70Succ: D.mc70Succ,
    };
    data.estate = { medEstate: D.medEstate, p10Estate: D.p10Estate, pref: D.estatePref || "balanced" };
  }

  // Debt
  if ((rp.debtBal ?? 0) > 0) data.debt = { total: rp.debtBal, annual: rp.debtAnnualCost };

  // Property
  if ((rp.homeVal ?? rp.homeValue ?? 0) > 0)
    data.property = { value: rp.homeVal ?? rp.homeValue, mortgage: rp.mortBal ?? rp.homeMortgage, equity: rp.equity ?? rp.homeEquity };
  if (rp.rentals && rp.rentals.length > 0)
    data.rentalPortfolio = {
      count: rp.rentals.length,
      properties: rp.rentals.map((r: any) => ({ name: r.name, value: r.value, mortgage: r.mortgage, rent: r.income, expenses: r.expenses, cashFlow: r.cashFlow })),
    };

  // Couple
  if (params.cOn) {
    data.couple = phase === "DECUM" ? {
      partnerAge: params.cAge, partnerSex: params.cSex,
      cRRSP: rp.cRRSP ?? params.cRRSP ?? 0, cTFSA: rp.cTFSA ?? params.cTFSA ?? 0,
      cNR: rp.cNR ?? params.cNR ?? 0, cPenMonthly: rp.cPenMonthly ?? 0,
    } : {
      partnerAge: params.cAge, partnerRetAge: params.cRetAge, partnerIncome: params.cSal,
      retAgeGap: Math.abs((params.retAge || 65) - (params.cRetAge || 65)),
      incomeRatio: signals.coupleAsymmetry ? signals.coupleAsymmetry.incomeRatio : 100,
    };
  }

  // Strategies
  if (stratData && stratData.length > 0) {
    data.strategies = stratData.map((s) => ({
      key: s.key, succ: Math.round(s.succ * 100), medF: s.medF,
    }));
  }

  // Signals
  if (Object.keys(signals).length > 0) data.signals = signals;

  // ════════════════════════════════════════════════════════════════
  // 9. PER-SLOT HINTS
  // ════════════════════════════════════════════════════════════════
  const gradeMetaphor = D.grade === "A+" ? "Excellent — the plan is robust in nearly all simulated futures."
    : D.grade === "A" ? "Strong — the plan succeeds in most scenarios with comfortable margin."
    : D.grade === "B" || D.grade === "B+" ? "Solid — the plan works in the majority of cases but has some vulnerability."
    : D.grade === "C" || D.grade === "C+" ? "Moderate — the plan succeeds roughly half the time. Room to improve."
    : D.grade === "D" ? "Fragile — the plan struggles in most scenarios. Key levers could shift the outcome."
    : "Critical — the plan does not meet the goal in current form.";

  const snapshotHint = "Grade " + D.grade + " (" + successPct + "%). " + gradeMetaphor + (phase !== "DECUM" && winInstr ? " Weave in WIN acknowledgment." : " Set the emotional tone for the report.");

  // biggest_risk / best_lever — UNIQUE to this profile, NOT generic fee thread
  // Fee erosion is almost always the biggest compounding factor. But the client KNOWS fees exist.
  // The thread must identify what is UNIQUE to THIS person — what they couldn't deduce themselves.
  const feeIsObvious = (D.merWeighted || 0) > 0.005; // most profiles
  const profileSpecificRisk = phase === "DECUM" && wdRate > 4.5
    ? "Focus on withdrawal pressure (" + wdRate + "% rate), NOT fees."
    : phase === "DECUM" && !alreadyClaiming && yrsToRet <= 0
    ? "Focus on the bridge period before government income starts, NOT fees."
    : (rp.debtBal ?? 0) > 50000
    ? "Focus on debt cost (" + fmt(rp.debtBal ?? 0) + "$ at " + fmt(rp.debtAnnualCost ?? 0) + "$/yr), NOT fees."
    : params.cOn && signals.coupleAsymmetry && signals.coupleAsymmetry.retAgeGap >= 2
    ? "Focus on the staggered retirement transition between partners, NOT fees."
    : totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.65
    ? "Focus on RRSP concentration (" + Math.round((params.rrsp ?? 0) / totalWealth * 100) + "% registered) and RRIF conversion pressure, NOT fees."
    : successPct >= 95 && (D.medEstate || D.medEstateNet || 0) > 300000
    ? "Focus on estate/succession planning efficiency, NOT fees."
    : (D.govCoveragePct ?? 0) < 0.3 && phase !== "DECUM"
    ? "Focus on the gap between government income and retirement spending, NOT fees."
    : signals.mortgageInRetirement
    ? "Focus on mortgage extending into retirement (" + signals.mortgageInRetirement.yearsInRet + " years), NOT fees."
    : ""; // empty = no override, AI can choose

  const biggestRiskHint = "In ONE sentence, state this person's biggest financial risk based on DATA. Be specific (name the number, the account, the timeline). Use conditional tense." + (profileSpecificRisk ? " " + profileSpecificRisk : (feeIsObvious ? " IMPORTANT: Fee erosion is valid but GENERIC. If there is a more profile-specific risk (withdrawal rate, concentration, bridge period, couple dynamics, debt), prefer that." : ""));
  const bestLeverHint = "In ONE sentence, state the single most impactful lever this person has. Be specific (name the dollar amount, the rate, the action). Observational only — no prescriptive verbs." + (profileSpecificRisk ? " Match the lever to the risk: if the risk is NOT fees, the lever should NOT be 'reduce fees' either." : "");

  // mirror_block — "your situation in 30 seconds"
  const mirrorHint = "Summarize this person's financial situation in 3-4 sentences as if explaining to a friend. Cover: age/retirement timeline, total savings, income sources, key risk. Use the person's actual numbers from DATA. Warm, clear, factual.";

  // Section-specific hints
  const revenueHint = phase === "DECUM"
    ? "Income breakdown: " + fmt(params.retIncome || 0) + "$/yr target. Government covers " + (D.govMonthly || 0) + "$/mo. Portfolio fills the gap. Explain the sustainability of this structure."
    : "Current income " + fmt(D.sal || 0) + "$/yr → retirement target " + fmt(D.retSpM * 12 || 0) + "$/yr. Replacement ratio: " + (D.sal > 0 ? Math.round((D.retSpM * 12 || 0) / D.sal * 100) : 0) + "%. What this means for lifestyle continuity.";

  const savingsHint = "Current savings " + fmt(totalAccounts || totalWealth) + "$ → projected " + fmt(D.retBal || 0) + "$ at retirement. ~" + autonomyYears + " years of autonomous spending. Savings rate: " + savingsRate + "% of income.";

  const govHint = gP + " " + (D.qppMonthly || 0) + "$/mo + " + oN + " " + (D.oasMonthly || 0) + "$/mo = " + (D.govMonthly || 0) + "$/mo covering " + (D.coveragePct || Math.round((D.govCoveragePct ?? 0) * 100)) + "% of spending. Activation ages: " + gP + " at " + (D.qppAge || params.qppAge || 65) + ", " + oN + " at " + (D.oasAge || params.oasAge || 65) + ".";

  const cppTimingHint = alreadyClaiming
    ? "Return empty string — " + gP + " already in payment."
    : "Compare three claiming ages: 60 (" + (D.mc60Succ ?? "?") + "%), 65 (" + (D.mc65Succ ?? "?") + "%), 70 (" + (D.mc70Succ ?? "?") + "%). The reader can toggle between these scenarios using interactive pills. Observational only. DO NOT prescribe which age.";

  const longevityHint = "Fan chart spread: P25 (cautious)=" + fmt(D.rP25F || D.p25Wealth || 0) + "$ to P75 (favorable)=" + fmt(D.rP75F || D.p75Wealth || 0) + "$. This is the likely range — half of all scenarios fall within it. Frame P25 as 'cautious', never 'worst case'. The reader can hover over the interactive fan chart to see percentiles at any age.";

  const spendFlexHint = gkActive
    ? "Spending flexibility active. Max cumulative reduction: " + Math.round((params.gkMaxCut ?? 0.20) * 100) + "%. " + (D.gkCutFreq !== null ? "Cuts triggered in " + Math.round((D.gkCutFreq ?? 0) * 100) + "% of years." : "") + " Translate into monthly dollar impact. Do NOT name 'Guyton-Klinger'. The spending smile chart shows Go-Go/Slow-Go/No-Go phases — the reader can hover to see estimated spending at each age."
    : "Fixed spending — portfolio bears all market risk without spending cushion. Explain implications for sustainability.";

  const whatIfHint = "Reference the what-if scenarios from the report. Which scenario has the biggest impact on success rate? What does this reveal about the plan's sensitivity?";

  const stratDesc = stratData && stratData.length > 0
    ? "Best strategy from DATA.strategies. Reference specific success rate improvement and median wealth difference vs statu_quo."
    : "General strategy context based on profile.";

  const sequenceHint = "Portfolio spread: P25 (cautious) " + fmt(D.rP25F || D.p25Wealth || 0) + "$ to P75 (favorable) " + fmt(D.rP75F || D.p75Wealth || 0) + "$. Explain sequence-of-returns risk in plain language: two identical portfolios can diverge vastly depending on early returns. The tornado chart ranks which parameters have the most impact — reference it. Never mention P95.";

  const meltdownHint = D.meltIsBase
    ? "Income already at or below meltdown target (" + fmt(D.meltTarget || 0) + "$/yr). Zero margin for reduction."
    : "Stress test: spending reduced from " + fmt(params.retIncome || 0) + "$ to " + fmt(D.meltTarget || 0) + "$/yr. " + (D.melt1Succ !== null ? "Success rate at meltdown: " + (D.melt1Succ || 0) + "% vs " + successPct + "% baseline." : "");

  const taxHint = "Current effective rate " + (D.taxCurrentEffective || 0) + "% → retirement " + (D.taxRetirementEffective || 0) + "%. " + (taxDiffPerYear > 0 ? "~" + taxDiffPerYear + "$/yr difference." : "Rates are similar.") + (totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.5 ? " RRSP is " + Math.round((params.rrsp ?? 0) / totalWealth * 100) + "% of savings — RRIF conversion at 71 implications." : "");

  const investStyleLabels: Record<string, string> = {
    diy_stocks: "self-directed stocks (near-zero fees)", low_fee_etf: "low-fee index ETFs",
    high_fee_etf: "higher-fee ETFs/funds", mutual_funds: "actively managed mutual funds", unsure: "unknown vehicle",
  };
  const investStyleLabel = investStyleLabels[q.investStyle] || "unknown vehicle";
  const feesHint = "Investment vehicle: " + investStyleLabel + ". MER " + Math.round((D.merWeighted || 0) * 10000) / 100 + "% → lifetime cost " + fmt(D.feeCostLifetime || 0) + "$. Translate into months of retirement income lost. The interactive fee impact chart lets the reader hover to compare 5 MER scenarios over time." + (q.investStyle === "mutual_funds" ? " The fee drag is substantial — quantify the gap vs a low-fee alternative." : q.investStyle === "diy_stocks" || q.investStyle === "low_fee_etf" ? " Fees are already well-managed — acknowledge this strength." : "");

  const propertyHint = (rp.homeVal ?? rp.homeValue ?? 0) > 0
    ? "Primary: " + fmt(rp.homeVal ?? rp.homeValue ?? 0) + "$, mortgage " + fmt(rp.mortBal ?? rp.homeMortgage ?? 0) + "$." + (rp.rentals && rp.rentals.length > 0 ? " Rentals: " + rp.rentals.length + " properties." : "") + " Observe concentration and role in retirement income."
    : "Return empty string — no property.";

  const strengthsHint = "Identify 2-3 strengths and 2-3 risks specific to THIS profile. Reference actual numbers from DATA. Strengths first, then risks. Each must be a specific data point, not generic.";

  const estateHint = "Median estate: " + fmt(D.medEstate || D.medEstateNet || D.rMedF || 0) + "$. " + (D.p10Estate !== undefined ? "P10: " + fmt(D.p10Estate || 0) + "$. " : "") + "Preference: " + (D.estatePref || "balanced") + ". Align observation with this preference.";

  // next_horizon — forward-looking closing (Upgrade 6)
  const nextHorizonHint = "2-3 sentences. What the data suggests as the most impactful window of action for this person. Observational language only. End with a mention of the annual check-in. "
    + (fr ? "Example tone: 'Les données suggèrent que les trois prochaines années — avant votre retraite — pourraient constituer la fenêtre la plus impactante pour ajuster la structure des frais. La prochaine mise à jour de ce bilan, dans 12 mois, permettrait de mesurer l\\'effet de ces ajustements.'"
      : "Example tone: 'The data suggests the next three years — before retirement — could be the most impactful window for adjusting fee structure. The next update of this assessment, in 12 months, would measure the effect of these adjustments.'");

  // model_blind_spots — profile-specific limitations (Upgrade 6)
  const blindSpotFactors: string[] = [];
  if (params.cOn) blindSpotFactors.push(fr ? "le fractionnement du revenu de pension entre conjoints" : "pension income splitting between spouses");
  if ((rp.homeVal ?? rp.homeValue ?? 0) > 300000) blindSpotFactors.push(fr ? "la vente éventuelle de la propriété de " + fmt(rp.homeVal ?? rp.homeValue ?? 0) + " $" : "potential sale of the " + fmt(rp.homeVal ?? rp.homeValue ?? 0) + "$ property");
  if (totalWealth > 0 && (params.rrsp ?? 0) / totalWealth > 0.50) blindSpotFactors.push(fr ? "les stratégies de décaissement REER progressif avant 71 ans" : "progressive RRSP drawdown strategies before age 71");
  if (phase !== "DECUM") blindSpotFactors.push(fr ? "les événements de vie futurs (changement de carrière, héritage, divorce)" : "future life events (career change, inheritance, divorce)");
  if ((rp.debtBal ?? 0) > 0) blindSpotFactors.push(fr ? "le refinancement ou la consolidation des dettes" : "debt refinancing or consolidation");
  if (phase === "DECUM" || phase === "TRANSITION") blindSpotFactors.push(fr ? "les modifications législatives futures aux programmes gouvernementaux" : "future legislative changes to government programs");

  const blindSpotList = blindSpotFactors.slice(0, 3);
  const modelBlindSpotsHint = "2-3 sentences. Identify the 2-3 unmodeled factors that could have the MOST impact on THIS specific profile. Not generic limitations — specific ones. "
    + "Profile-specific factors to consider: " + blindSpotList.join(", ") + ". "
    + (fr ? "End with: 'Ces dimensions seraient explorables avec le Laboratoire interactif.'" : "End with: 'These dimensions could be explored with the interactive Laboratoire.'");

  // efficiency_gap — A+ profiles only (Upgrade 14)
  const surplusMonthly = (D.govMonthly || 0) - (D.retSpM || 0);
  const efficiencyGapHint = successPct >= 95
    ? "3-4 sentences. Quantify the gap between the current plan (which survives) and an adjusted plan. Use specific numbers from DATA: current fee drag (" + fmt(D.feeCostLifetime || 0) + "$ lifetime), tax structure (current " + (D.taxCurrentEffective || 0) + "% vs retirement " + (D.taxRetirementEffective || 0) + "%), estate tax exposure on RRSP. Frame as: 'Your plan works. Here is what it could look like if every dollar worked as hard as possible.' Focus on EFFICIENCY and FLEXIBILITY, not survival."
    : "Return empty string — efficiency_gap is only for A+ profiles (success >= 95%).";

  // ════════════════════════════════════════════════════════════════
  // 10. SYSTEM PROMPT
  // ════════════════════════════════════════════════════════════════
  const phaseLabel = phase === "ACCUM" ? "accumulation" : phase === "TRANSITION" ? "transition" : "retirement drawdown";

  const sys = "You narrate buildfi.ca Bilan 360 reports ($19.99 tier — " + phaseLabel + " phase).\n"
    + "You write like a human financial planner who studied this person's file for an hour — not a template engine filling slots.\n"
    + "Each slot must feel like it was written specifically for THIS person. If two different profiles could produce the same text, you've failed.\n"
    + "\n=== DECISION-NARRATIVE FRAMING (2026-05-14 IA refactor) ===\n"
    + "The report's sections each answer ONE decision question:\n"
    + "  - 'Your starting point' (where do you stand?)\n"
    + "  - 'Plan endurance over time' (will it hold?)\n"
    + "  - 'Plan reaction to shocks' (what threatens it?)\n"
    + "  - 'Strategic synthesis' (what's the takeaway?)\n"
    + "  - 'Levers within reach' (what moves the needle?)\n"
    + "Lead with the answer — the so-what — then the evidence. Avoid topic dumps.\n"
    + "Every paragraph should advance the reader's understanding of a decision.\n"
    + "\n=== COMPLIANCE (AMF / OSFI — NON-NEGOTIABLE) ===\n"
    + "This is an EDUCATIONAL tool, NOT financial advice.\n"
    + "1. Facts from DATA may use present tense.\n"
    + "2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).\n"
    + "3. Use 'pourrait + infinitive' construction. NEVER use single-word conditional future (ajouterait, constituerait, permettrait). Instead: 'pourrait ajouter', 'pourrait constituer', 'pourrait permettre'.\n"
    + "4. FORBIDDEN verbs (never use): devriez, recommandons, conseillons, il faut, devez, assurez-vous, "
    + "considerez, optimisez, optimiser, optimisé, optimisation, priorisez, plan d'action, recommandation(s), you should, you must, we recommend, optimize, optimized, optimization.\n"
    + "5. Observational language ONLY. Describe what numbers show; never prescribe actions.\n"
    + "6. Do not shame debt. State the mathematical cost only.\n"
    + "7. NEVER suggest combining scenarios or adding their effects together.\n"
    + "8. Use 'Cette analyse suggère' or 'Les données indiquent', never directive language.\n"
    + PLAIN_LANG_NOTE
    + "\n=== FILLER BAN (ZERO TOLERANCE) ===\n"
    + "NEVER write any of these phrases (instant rejection):\n"
    + "- 'il est important de noter', 'il convient de souligner', 'il convient de noter'\n"
    + "- 'dans ce contexte', 'par ailleurs', 'en outre', 'il est à noter'\n"
    + "- 'notons que', 'soulignons que', 'mentionnons que'\n"
    + "- 'it is important to note', 'it should be noted', 'worth noting', 'in this context'\n"
    + "Every sentence must carry information. If you can delete a sentence without losing meaning, delete it.\n"
    + "\n=== NUMERIC SAFETY ===\n"
    + "- Use ONLY numbers that appear in the DATA block. Do NOT invent, round, estimate, or extrapolate any figure.\n"
    + "- No external averages, no typical ranges, no invented thresholds.\n"
    + "- NEVER translate percentages into ratio phrases ('1 in 4', '3 out of 4', '9 sur 10'). Use only the exact percentage from DATA.\n"
    + "- NEVER compute coverage durations (savings / annual spending). Use DATA.coverageYears if available. If not in DATA, do not mention it.\n"
    + "- NEVER multiply monthly amounts by years to get totals — use DATA.bridgeCost instead.\n"
    + "- NEVER calculate ratios not already present in DATA.\n"
    + "- NEVER state RRIF minimum withdrawal rates unless they appear in DATA. You may reference 'minimum withdrawals increase with age' as a general mechanic.\n"
    + "If a number you want to cite is not in DATA, do not cite it. This rule exists because the MC engine uses stochastic paths — simple division produces misleading results.\n"
    + "\n=== LANGUAGE ===\n"
    + "- " + (fr ? "French (vous). Naturel, pas robotique. Variez les tournures de phrase." : "English. Natural, not robotic. Vary sentence structure.") + "\n"
    + "- " + (profile.literacy === "advanced" ? "Grade 12 reading level. Precise financial vocabulary OK." : "Grade 10 reading level. Short sentences. No jargon.") + "\n"
    + "- Acronyms: NEVER use acronyms. Write in full: " + gP + ", " + oN + ".\n"
    + (fr ? "- ACCENTS: You MUST use proper French diacritics (é, è, ê, ë, à, â, ç, î, ï, ô, ù, û). Zero tolerance.\n" : "")
    + "\n=== VOCABULARY BAN (ZERO TOLERANCE) ===\n"
    + "NEVER use these subjective adjectives:\n"
    + "FR: modeste, raisonnable, agressif, prudent, confortable, élevé (for spending), faible (for spending), ambitieux\n"
    + "EN: modest, reasonable, aggressive, conservative (as judgment), comfortable, high/low (for spending), ambitious\n"
    + "NEVER use these directive words (optimis* family):\n"
    + "FR: optimiser, optimisé, optimisée, optimisation, optimisez\n"
    + "EN: optimize, optimized, optimization, optimizing\n"
    + "PREFERRED alternatives: " + (fr ? "'améliorer/ajuster/ajusté/amélioration/ajustement' — always in conditional tense (pourrait améliorer, pourrait ajuster)" : "'improve/adjust/adjusted/improvement/adjustment' — always in conditional tense (could improve, could adjust)") + "\n"
    + "PREFERRED (adjectives): " + (fr ? "'niveau de dépenses visé', 'objectif plus exigeant', 'marge plus limitée', 'structure plus défensive'" : "'target spending level', 'more demanding objective', 'tighter margin', 'more defensive structure'") + "\n"
    + "\n=== UNIQUENESS ===\n"
    + "Test: if you replaced the numbers and the sentence still works unchanged, rewrite it.\n"
    + "BANNED GENERIC CLOSERS: 'ce n'est pas un verdict', 'le temps est votre allié', 'le premier pas est le plus important', 'chaque dollar compte'\n"
    + "\n=== THREAD SELECTION RULE ===\n"
    + "The thread (biggest_risk + best_lever) must identify what is UNIQUE to this person — the insight they could NOT have guessed before reading this report.\n"
    + "BANNED as primary thread: fee-erosion. Management fees are almost always the biggest mathematical lever because they compound over decades. That makes them BORING — every report says the same thing. Fees belong in fees_analysis or obs slots, NOT as the thread.\n"
    + "Choose the thread from what makes THIS profile different:\n"
    + "- A couple with pension covering 100%+ of expenses → thread = estate-efficiency or couple-coordination\n"
    + "- A retiree with >4.5% withdrawal rate → thread = withdrawal-pressure\n"
    + "- A young person with 77% of wealth in illiquid real estate → thread = asset-concentration\n"
    + "- A FIRE profile with 20+ year bridge before government income → thread = bridge-vulnerability\n"
    + "- Someone near OAS clawback threshold → thread = tax-trap\n"
    + "- Someone with 65%+ RRSP facing mandatory RRIF conversions → thread = rrif-escalation\n"
    + "- A late starter with significant debt → thread = debt-vs-savings race\n"
    + "- A couple with staggered retirement → thread = transition-coordination\n"
    + "Fee-erosion may ONLY be the thread if no other structural insight exists — i.e., the profile has no debt, no property, no couple, no pension, average withdrawal rate, and the ONLY differentiating factor is genuinely the fee structure.\n"
    + "\n=== VOICE ===\n" + voiceInstr + "\n"
    + "\n=== PARAGRAPH FORMULA (MANDATORY) ===\n"
    + "OBSERVATION → CAUSE → IMPLICATION\n"
    + "1. OBSERVATION: Specific number from DATA (present tense).\n"
    + "2. CAUSE: Why this number is what it is.\n"
    + "3. IMPLICATION: What it means for this person (conditional tense). Translate into months of income, years of coverage, or dollars per month.\n"
    + "\n=== DENSITY RULE ===\n"
    + "Every AI slot follows the structure: INSIGHT → EVIDENCE → IMPLICATION.\n"
    + "3 sentences maximum per slot. 4 sentences only if the slot covers two distinct data points that require separate evidence.\n"
    + "NEVER:\n"
    + "- Repeat the same number in different phrasings within one slot\n"
    + "- Add a 'concluding sentence' that restates the opening\n"
    + "- Use filler like 'concrètement', 'autrement dit', 'en d'autres termes' to pad\n"
    + "If you can say it in 2 sentences, use 2 sentences. Silence is more premium than padding.\n"
    + "No bullet points in narration.\n"
    + "\n=== SLOT STRUCTURE (MANDATORY) ===\n"
    + "Each slot = 2-3 sentences: ANCHOR (number) → IMPLICATION (conditional) → NUANCE (context).\n"
    + "\n=== OBSERVATION FORMAT (MANDATORY) ===\n"
    + "Each obs slot MUST start with a bold title (2-4 words) followed by a colon, then the observation.\n"
    + "Example: '**Pont gouvernemental** : Les 7 années entre votre retraite et les prestations...'\n"
    + "The title enables scanning — a reader who skips the body text should understand the topic from the title alone.\n"
    + "\n=== OBSERVATION RULES (CRITICAL) ===\n"
    + "Each obs MUST pass the NOVELTY TEST: 'Does this insight appear in ANY other slot?' If yes → rewrite or replace.\n"
    + "BANNED in observations:\n"
    + "- Restating the fee cost (already in fees_analysis)\n"
    + "- Restating the withdrawal rate (already in biggest_risk or priority_actions)\n"
    + "- Restating government coverage percentage (already in gov_explanation)\n"
    + "- Restating the projected balance (already in savings_analysis or longevity_analysis)\n"
    + "REQUIRED: Each observation must reveal a CONNECTION or TENSION between two data points that no single section covers.\n"
    + "obs_1 through obs_5 must each cover a DIFFERENT analytical dimension (financial, temporal, behavioral, structural). Never two on the same dimension.\n"
    + "Each observation must pass: 'Could the client deduce this by looking at the report charts and tables?' If YES → not an observation, it's a caption. Rewrite.\n"
    + "\n=== DEDUPLICATION (CRITICAL) ===\n"
    + "- Each slot covers a DIFFERENT topic. Never repeat across slots.\n"
    + "- obs slots must NOT repeat named slot topics. If fees_analysis discusses fees, NO obs slot can discuss fees.\n"
    + "- couple_analysis must NOT repeat success rate or grade.\n"
    + "- priority_actions must be flowing narrative, NOT a numbered list.\n"
    + "- If a slot instruction says to return empty string, do so.\n"
    + "\n=== 100% SUCCESS RATE RULE ===\n"
    + "When the success rate is 100% across all scenarios, the AI MUST acknowledge in snapshot_intro that this reflects the MODEL's range of tested scenarios, not a guarantee. Include one sentence like:\n"
    + (fr ? "'Ce résultat reflète les 5 000 scénarios testés — incluant des krachs sévères et des périodes prolongées d'inflation — mais ne peut capturer tous les risques possibles (modifications législatives, problèmes de santé majeurs, divorce).'\n"
      : "'This result reflects 5,000 tested scenarios — including severe crashes and prolonged inflation — but cannot capture every possible risk (legislative changes, major health issues, divorce).'\n")
    + "This single sentence massively increases credibility without undermining the result.\n"
    + "\n=== SURVIVAL ≠ QUALITY ===\n"
    + "A 100% success rate means the plan SURVIVES in all tested scenarios. It does NOT mean the plan is OPTIMAL.\n"
    + "For A+ profiles (success >= 95%), explicitly distinguish:\n"
    + "- Survival (does the money last?) — answered by success rate\n"
    + "- Efficiency (is each dollar working as hard as it could?) — answered by fee drag, tax structure, withdrawal sequencing\n"
    + "- Flexibility (how much room is there for life changes?) — answered by what-if deltas\n"
    + "Frame A+ reports around EFFICIENCY and FLEXIBILITY, not survival.\n"
    + "The value of this report for A+ clients is NOT 'you'll be fine' — it's 'here's how your fine plan could be even better.'\n"
    + "\n=== A+ PRIORITY REFRAME ===\n"
    + "For profiles with success rate >= 95%, priority_actions must NOT discuss:\n"
    + "- 'how to improve your success rate' (it's already maxed)\n"
    + "- 'accumulate more' (they have enough)\n"
    + "- 'spend less' (they can afford more)\n"
    + "Instead, priority_actions for A+ MUST focus on:\n"
    + "1. Fee adjustment (quantified: current fees vs. reduced, in $ over plan duration)\n"
    + "2. Tax-efficient withdrawal sequencing (RRSP→RRIF conversion timing, TFSA maximization)\n"
    + "3. Estate efficiency (what % of estate goes to taxes, what could be tax-free)\n"
    + "4. Flexibility deployment (what the surplus enables without reducing success)\n"
    + "\n=== PRECISION CALIBRATION ===\n"
    + "MC outputs (percentiles, success rates, median wealth) are statistical results from 5,000 simulations. You may cite them precisely: '523 719 $', '86 %', 'P25'.\n"
    + "AI-derived implications (coverage duration, per-dollar gains, cumulative effects) are APPROXIMATIONS. You must signal this:\n"
    + "WRONG: 'Ce montant offre 23,3 années de couverture autonome.'\n"
    + "RIGHT: 'Ce montant pourrait couvrir environ 20 à 25 années de retraite selon les rendements.'\n"
    + "RULE: If you compute a number by dividing or multiplying DATA values, present it as an approximation with 'environ' or a range, NEVER as a precise figure.\n"
    + "MC outputs = precise. AI math = approximate. Always.\n"
    + "\n=== INTERACTIVE VISUALS ===\n"
    + "This report includes interactive charts that the reader can explore. Your narration should REFERENCE these visuals where relevant:\n"
    + "- Fan chart (projection section): hover shows percentiles at any age. The P25-P75 band is the primary 'likely range'. Toggle between nominal and real dollars.\n"
    + "- Tornado chart (sensitivity section): ranks which parameters impact success rate most.\n"
    + "- Fee impact chart (fees section): 5 MER scenarios side by side with hover comparison.\n"
    + "- Scenario toggle (CPP timing): pills to compare claiming at 60/65/70.\n"
    + "- Stress test toggle: pills showing base vs crash/stagflation/recession scenarios.\n"
    + "- Income stacked area (revenue section): income sources by age with hover breakdown.\n"
    + "- Asset donut (savings section): portfolio composition with hover detail.\n"
    + "- Risk dashboard (grade section): 4 KPI cards (sequence risk, longevity, estate, tax at death).\n"
    + "- Spending smile (spending section): hover shows estimated spending at each age.\n"
    + "When referencing a visual: use natural phrasing like " + (fr ? "'le graphique ci-dessous permet d\\'explorer...', 'en survolant la projection...'" : "'the chart below lets you explore...', 'hovering over the projection...'") + ". Never say 'click' — use 'hover' or 'explore'.\n"
    + "\n=== OUTPUT ===\n"
    + "- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences. No trailing commas.\n"
    + "- If you cannot comply, output {}.";

  // ════════════════════════════════════════════════════════════════
  // 11. SLOT DEFINITIONS (phase-adaptive)
  // ════════════════════════════════════════════════════════════════
  const slots: string[] = [
    '"biggest_risk":"' + biggestRiskHint.replace(/"/g, '\\"') + '"',
    '"best_lever":"' + bestLeverHint.replace(/"/g, '\\"') + '"',
    '"snapshot_intro":"' + snapshotHint.replace(/"/g, '\\"') + '"',
    '"mirror_block":"' + mirrorHint.replace(/"/g, '\\"') + '"',
    '"revenue_analysis":"' + revenueHint.replace(/"/g, '\\"') + '"',
    '"gov_explanation":"' + govHint.replace(/"/g, '\\"') + '"',
    '"longevity_analysis":"' + longevityHint.replace(/"/g, '\\"') + '"',
    '"priority_actions":"' + priorityInstr.replace(/"/g, '\\"') + '"',
    '"tax_analysis":"' + taxHint.replace(/"/g, '\\"') + '"',
    '"estate_analysis":"' + estateHint.replace(/"/g, '\\"') + '"',
    '"obs_1":"' + obs1Instr.replace(/"/g, '\\"') + ' Never start with a generic opener. If fees_analysis exists, this obs MUST NOT discuss fees."',
    '"obs_1_title":"2-4 words, ' + (fr ? 'French' : 'English') + ', bold header for scanning. No period. Example: ' + (fr ? "'Concentration immobilière'" : "'Asset concentration'") + '"',
    '"obs_2":"' + obs2Instr.replace(/"/g, '\\"') + '"',
    '"obs_2_title":"2-4 words, ' + (fr ? 'French' : 'English') + ', bold header. No period."',
    '"obs_3":"' + obs3Instr.replace(/"/g, '\\"') + '"',
    '"obs_3_title":"2-4 words, ' + (fr ? 'French' : 'English') + ', bold header. No period."',
    '"obs_4":"' + obs4Instr.replace(/"/g, '\\"') + '"',
    '"obs_4_title":"2-4 words, ' + (fr ? 'French' : 'English') + ', bold header. No period."',
    '"obs_5":"' + obs5Instr.replace(/"/g, '\\"') + '"',
    '"obs_5_title":"2-4 words, ' + (fr ? 'French' : 'English') + ', bold header. No period."',
    '"next_horizon":"' + nextHorizonHint.replace(/"/g, '\\"') + '"',
    '"model_blind_spots":"' + modelBlindSpotsHint.replace(/"/g, '\\"') + '"',
    '"efficiency_gap":"' + efficiencyGapHint.replace(/"/g, '\\"') + '"',
    '"couple_analysis":"' + coupleDesc.replace(/"/g, '\\"') + '"',
  ];

  // Phase-conditional slots
  if (phase === "ACCUM" || phase === "TRANSITION") {
    slots.push('"savings_analysis":"' + savingsHint.replace(/"/g, '\\"') + '"');
    slots.push('"what_if_analysis":"' + whatIfHint.replace(/"/g, '\\"') + '"');
    slots.push('"strategy_comparison":"' + stratDesc.replace(/"/g, '\\"') + '"');
    slots.push('"fees_analysis":"' + feesHint.replace(/"/g, '\\"') + '"');
  }

  if (phase === "TRANSITION" || phase === "DECUM") {
    slots.push('"cpp_timing":"' + cppTimingHint.replace(/"/g, '\\"') + '"');
    slots.push('"spending_flex":"' + spendFlexHint.replace(/"/g, '\\"') + '"');
    slots.push('"sequence_risk":"' + sequenceHint.replace(/"/g, '\\"') + '"');
    slots.push('"strengths_risks":"' + strengthsHint.replace(/"/g, '\\"') + '"');
  }

  if (phase === "DECUM") {
    slots.push('"meltdown_analysis":"' + meltdownHint.replace(/"/g, '\\"') + '"');
  }

  // Property (conditional)
  slots.push('"property_analysis":"' + propertyHint.replace(/"/g, '\\"') + '"');

  // ════════════════════════════════════════════════════════════════
  // 12. USER PROMPT
  // ════════════════════════════════════════════════════════════════
  const usr = "=== PHASE ===\n" + phase + " (" + phaseLabel + ")\n\n"
    + "=== VOICE ===\n" + voiceInstr + "\n\n"
    + "=== NARRATIVE ARC ===\n" + narrativeArc + "\n\n"
    + emphasisBlock + riskOrder + "\n\n"
    + "=== PERSONALIZATION HOOKS ===\n"
    + (winInstr ? winInstr + "\n" : "")
    + (fixInstr ? fixInstr + "\n" : "")
    + "PROFILE: anxiety=" + profile.anxiety + ", discipline=" + profile.discipline
    + ", friction=" + profile.primaryFriction + ", theme=" + profile.narrativeTheme
    + ", type=" + (profile.profileType || "general") + "\n"
    + "\n=== WORRY PATTERNS ===\n" + worryBlock + "\n"
    + (propSlot ? "\n=== PROPERTY CONTEXT ===\n" + propSlot + "\n" : "")
    + "\n=== DATA ===\n" + JSON.stringify(data)
    + "\n\n=== SLOT INSTRUCTIONS ===\n"
    + "Return JSON with 2-3 sentences per slot. Each sentence must carry information. Zero filler.\n"
    + "{" + slots.join(",") + "}\n\n"
    + "Respond in " + (fr ? "French" : "English") + " exclusively. JSON strict. No text outside the JSON object.";

  // obsLabels for renderer section headings
  const obsLabels: Record<string, string> = {};
  for (let i = 0; i < Math.min(obsAssigned.length, 5); i++) {
    const n = i + 1;
    obsLabels["obs_" + n] = fr ? obsAssigned[i].labelFr : obsAssigned[i].labelEn;
    obsLabels["obs_" + n + "_topic"] = obsAssigned[i].topic;
  }

  return { sys, usr, obsLabels };
}
