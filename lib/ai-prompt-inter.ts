// lib/ai-prompt-inter.ts — AI prompt builder for Intermediaire tier ($59)
// Major upgrade: voice matrix, narrative arc, worry combos, dynamic obs routing,
// composite signals, per-slot hints, enriched DATA block, AMF-hardened sys prompt

import { computeDerivedProfile, computeRenderPlan, computeCompositeSignals } from "./ai-profile";
import type { CompositeSignals } from "./ai-profile";

/** Build system + user prompts for Inter AI narration (claude-sonnet-4). */
export function buildAIPromptInter(
  D: Record<string, any>,
  params: Record<string, any>,
  fr: boolean,
  quiz: Record<string, any>,
  stratData?: Array<{ key: string; succ: number; medF: number }>
): { sys: string; usr: string; obsLabels: Record<string, string> } {
  const q = params._quiz || {}, rp = params._report || {};

  // Province-aware full names (zero acronyms)
  const isQC = params.prov === "QC";
  const gP = fr ? (isQC ? "Régime de rentes du Québec" : "Régime de pensions du Canada")
              : (isQC ? "Quebec Pension Plan" : "Canada Pension Plan");
  const oN = fr ? "Pension de la Sécurité de la vieillesse" : "Old Age Security";

  // DerivedProfile + RenderPlan + CompositeSignals
  const profile = computeDerivedProfile(quiz || {}, D, params);
  const plan = computeRenderPlan(profile, D);
  const signals = computeCompositeSignals(quiz || {}, D, params, profile);

  // ════════════════════════════════════════════════════════════════
  // 1. VOICE MATRIX (tone × literacy = 9 combos)
  // ════════════════════════════════════════════════════════════════
  const voiceMatrix: Record<string, string> = {
    "warm+basic": "Write like a patient, kind teacher. One idea per sentence. Lead every slot with something positive or reassuring before any number. Use everyday analogies. Define any financial term inline. Never alarm.",
    "warm+intermediate": "Write like a trusted advisor having coffee. Warm but informed. Use numbers naturally in context. When delivering a difficult number, immediately follow with a softer frame. Light financial vocabulary OK.",
    "warm+advanced": "Write like a calm, experienced colleague. Technical precision is welcome but always wrapped in reassurance. Acknowledge sophistication. Use ratios and rates directly, but frame every risk as manageable variability.",
    "balanced+basic": "Write like a clear, friendly explainer. Simple sentences. One number per sentence max. Always follow a number with what it means in plain words. Avoid stacking data points.",
    "balanced+intermediate": "Write like a sharp financial journalist. Mix data with narrative. Each slot should feel like a mini-paragraph that tells a story: here's the number, here's what it means for your life, here's the nuance. Natural flow.",
    "balanced+advanced": "Write like a portfolio analyst briefing a knowledgeable client. Direct, confident, precise. Reference rates, ratios, and percentages without hedging. Implications should be specific and quantified.",
    "data-forward+basic": "Write like a data scientist explaining to a friend. Lead with the most striking number. Explain its meaning in one plain sentence. Keep it punchy — short sentences, clear cause-effect.",
    "data-forward+intermediate": "Write like a Bloomberg terminal summary for a retail investor. Dense but readable. Each sentence carries a data point or an implication. No filler. Comparative framing preferred.",
    "data-forward+advanced": "Write like a quant analyst's internal memo. Maximum density. Reference withdrawal rates, coverage ratios, real vs nominal, fee drag basis points. Every sentence must carry information. Zero fluff.",
  };
  const voiceKey = plan.tone + "+" + profile.literacy;
  const voiceInstr = voiceMatrix[voiceKey] || voiceMatrix["balanced+intermediate"];

  // ════════════════════════════════════════════════════════════════
  // 2. NARRATIVE ARC (theme-driven global framing)
  // ════════════════════════════════════════════════════════════════
  const arcMap: Record<string, string> = {
    security: "NARRATIVE ARC: This person seeks safety above all. Open with what is solid and protected. Frame every number through the lens of 'what is secure.' Risks = manageable variability, never threats. Close each slot with a stabilizing thought. Journey: reassurance → understanding → grounded confidence.",
    growth: "NARRATIVE ARC: This person is building momentum. Open with trajectory and compounding power. Frame numbers as progress markers. Risks = speed bumps, not roadblocks. Close each slot with forward-looking potential. Journey: recognition → momentum → possibility.",
    optimization: "NARRATIVE ARC: This person is already in good shape and wants to fine-tune. Open with efficiency metrics. Frame numbers as levers to pull. Skip generic reassurance. Close each slot with a specific efficiency insight. Journey: validation → precision → mastery.",
    "catch-up": "NARRATIVE ARC: This person started late or faces a gap. Be honest but never defeatist. Open with what they CAN still influence. Frame numbers as starting points, not verdicts. Close each slot with the next achievable milestone. Journey: honesty → agency → achievable next step.",
  };
  const narrativeArc = arcMap[profile.narrativeTheme] || arcMap.growth;

  // ════════════════════════════════════════════════════════════════
  // 3. WORRY COMBINATION PATTERNS
  // ════════════════════════════════════════════════════════════════
  const worries: string[] = q.worries || [];
  const worrySet: Record<string, boolean> = {};
  worries.forEach((w: string) => { worrySet[w] = true; });

  const worryCombos: string[] = [];
  if (worrySet.runout && worrySet.health)
    worryCombos.push("WORRY PATTERN [existential]: Client fears running out AND health costs. Every slot should subtly reinforce safety nets and controllable factors. Longevity slots get extra depth. Never catastrophize.");
  if (worrySet.tax && worrySet.legacy)
    worryCombos.push("WORRY PATTERN [estate-optimizer]: Client thinks about tax efficiency AND legacy. tax_context should explore retirement bracket advantage. obs_5 should address estate structure.");
  if (worrySet.market && worrySet.inflation)
    worryCombos.push("WORRY PATTERN [investor-anxiety]: Client worries about both market drops AND purchasing power. Frame all amounts as inflation-adjusted (they are). Reference the real-return approach.");
  if (worrySet.runout && worrySet.inflation && worrySet.health)
    worryCombos.push("WORRY PATTERN [maximum-anxiety]: 3+ fears active. Lead EVERY slot with the reassuring data point first. One idea per sentence. Build confidence gradually — do not stack risks.");
  if (worrySet.tax && worrySet.market && params.cOn)
    worryCombos.push("WORRY PATTERN [couple-fiscal-anxiety]: Tax + market worries in a couple household. couple_analysis should explore pension splitting benefits and household-level diversification between registered/non-registered accounts.");
  if (worries.length === 0)
    worryCombos.push("WORRY PATTERN [confident/disengaged]: No worries selected. Mirror savings habits or situation positives in snapshot_intro. Keep tone matter-of-fact.");

  const worryBlock = worryCombos.join("\n");

  // Legacy per-worry expansions
  const worryMap: Record<string, string> = {
    runout: "EXPAND longevity_risk to 3-4 sentences. Emphasize median vs pessimistic scenarios.",
    tax: "EXPAND tax_context to 3-4 sentences. Compare effective rates.",
    inflation: "All amounts are already inflation-adjusted — state this explicitly once.",
    health: "Acknowledge health cost uncertainty in longevity_risk.",
    market: "Reference that simulations model 5,000 market scenarios including crashes in sequence_risk.",
    legacy: "Connect estate projection to stated legacy concern in obs_5.",
  };
  const wInstr = worries.map((w: string) => worryMap[w] || "").filter(Boolean).join(" ");

  // ════════════════════════════════════════════════════════════════
  // 4. COMPUTED CONTEXT HELPERS
  // ════════════════════════════════════════════════════════════════
  const yrsToRet = Math.max(0, (D.retAge || 65) - (D.age || 40));
  const retYears = Math.max(0, (D.deathAge || 87) - (D.retAge || 65));
  const totalAccounts = (D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0);
  const monthlyContrib = quiz.monthlyContrib || D.monthlyContrib || 0;
  const savingsRate = D.sal > 0 ? Math.round(monthlyContrib * 12 / D.sal * 100) : 0;
  const autonomyYears = D.gapMonthly > 0 ? Math.round((D.retBal || 0) / (D.gapMonthly * 12) * 10) / 10 : 99;
  const taxDiffPerYear = D.sal > 0 ? Math.round(D.sal * Math.abs((D.taxCurrentEffective || 0) - (D.taxRetirementEffective || 0)) / 100) : 0;

  const ptSlot = D.ptM > 0 ? "Part-time bridge: " + D.ptM + "$/mo × " + D.ptYrs + "yrs — delays portfolio withdrawal." : "";
  const propSlot = rp.mortBal > 0
    ? (rp.mortFreeAge > (params.retAge || 65) ? "MORTGAGE IN RETIREMENT: extends " + (rp.mortFreeAge - (params.retAge || 65)) + " years past retirement. " + (rp.mortPayment || 0) + "$/mo added to retirement spending."
      : "Mortgage paid by age " + rp.mortFreeAge + " — housing costs drop at retirement.") : "";

  // WIN/FIX maps (ported from Essentiel)
  const winMap: Record<string, string> = {
    home: fr ? "Ouvrir en reconnaissant l'achat immobilier comme un actif concret." : "Open acknowledging home purchase as a tangible asset.",
    debtfree: fr ? "Ouvrir en soulignant l'absence de dettes — un avantage réel." : "Open acknowledging debt-free status as a real advantage.",
    saving: fr ? "Ouvrir en reconnaissant l'habitude d'épargne — c'est le facteur le plus déterminant." : "Open acknowledging consistent saving habit — the most impactful factor.",
    investing: fr ? "Ouvrir en reconnaissant les connaissances en investissement." : "Open acknowledging investing knowledge.",
    business: fr ? "Ouvrir en reconnaissant l'esprit entrepreneurial." : "Open acknowledging entrepreneurial ability.",
    none: fr ? "Ce bilan est un point de départ — le premier pas est le plus important." : "This assessment is a starting point — the first step matters most.",
  };
  const winInstr = "WIN: " + (winMap[q.win] || winMap.none);
  const fixMap: Record<string, string> = {
    save_more: "Lead obs_1 with savings rate context: current rate is " + savingsRate + "% of income.",
    debt: "Lead obs_1 with debt cost: " + (rp.debtAnnualCost || 0) + "$/yr in interest.",
    invest: "Lead obs_1 with fee impact: " + (D.feeCostLifetime || 0) + "$ lifetime cost.",
    tax: "Lead obs_1 with tax rate comparison: " + (D.taxCurrentEffective || 0) + "% now vs " + (D.taxRetirementEffective || 0) + "% retirement.",
    retire_early: "Lead obs_1 with withdrawal rate: " + (D.withdrawalRatePct || 0) + "% is " + ((D.withdrawalRatePct || 0) > 4 ? "above" : "within") + " traditional sustainability thresholds.",
    clarity: "Lead obs_1 with success rate interpretation: " + (D.successPct || 0) + "% means " + (D.successPct || 0) + " of 5,000 simulated futures met the goal.",
  };
  const fixInstr = "FIX: " + (fixMap[q.fix] || "Lead obs_1 with the most impactful lever from DATA.");

  // Emphasis block from RenderPlan + signals
  const emphasisLines: string[] = [];
  if (plan.emphasizeDebt) emphasisLines.push("EMPHASIS: Debt is the primary friction. Every dollar of interest is a dollar not compounding.");
  if (plan.emphasizeFees) emphasisLines.push("EMPHASIS: Fee drag is significant. Highlight compounding cost.");
  if (plan.emphasizeGov) emphasisLines.push("EMPHASIS: Government coverage is low (" + (D.coveragePct || 0) + "%). Focus on gap funding.");
  if (signals.conservativeGrowthTrap) emphasisLines.push("EMPHASIS: Conservative allocation may limit growth needed for plan success. Note the tension without prescribing.");
  if (signals.highEffortLowResult) emphasisLines.push("EMPHASIS: Strong savings effort (" + savingsRate + "%) but success rate is " + (D.successPct || 0) + "%. Acknowledge the effort, explain what limits the outcome.");
  const emphasisBlock = emphasisLines.length > 0 ? emphasisLines.join("\n") + "\n" : "";

  const riskOrder = plan.worstCasePlacement === "standard"
    ? "RISK ORDER: Include stress test early, keep tone calm."
    : "RISK ORDER: Do not lead with worst-case. Build confidence first, mention risk later with context.";

  // ════════════════════════════════════════════════════════════════
  // 5. DYNAMIC OBS ROUTING (obs_2 through obs_5)
  // ════════════════════════════════════════════════════════════════
  const bestStrat = stratData && stratData.length > 0
    ? stratData.reduce((a, b) => b.succ > a.succ ? b : a, stratData[0]).key : "statu_quo";

  const obsPool: Array<{ topic: string; labelFr: string; labelEn: string; instr: string }> = [];

  // Priority-ordered topic candidates
  if (signals.debtDragOverSavings)
    obsPool.push({ topic: "debt-drag", labelFr: "Poids de la dette", labelEn: "Debt drag", instr: "Interest-to-savings ratio: annual debt interest (" + (rp.debtAnnualCost || 0) + "$) vs annual contributions (" + (monthlyContrib * 12) + "$). Quantify the drain on wealth accumulation." });

  if (signals.bridgePeriod)
    obsPool.push({ topic: "bridge-period", labelFr: "Période de pont", labelEn: "Bridge period", instr: "Bridge period survival: " + signals.bridgePeriod.years + " years of self-funding before government income starts. Total draw needed: " + signals.bridgePeriod.totalCost + "$ over that period. What this means for portfolio sustainability." });

  if (signals.coupleAsymmetry)
    obsPool.push({ topic: "couple-asymmetry", labelFr: "Asymétrie du ménage", labelEn: "Household asymmetry", instr: "Income asymmetry between partners (ratio: " + signals.coupleAsymmetry.incomeRatio + "%). " + (signals.coupleAsymmetry.retAgeGap > 0 ? "Retirement age gap of " + signals.coupleAsymmetry.retAgeGap + " years creates a staggered transition." : "") + " What this means for household income stability during the transition." });

  // Fee-impact ONLY if best strategy is NOT low_mer (avoids repeating strategy_highlight)
  if (bestStrat !== "low_mer")
    obsPool.push({ topic: "fee-impact", labelFr: "Impact des frais", labelEn: "Fee impact", instr: "Fee impact: management fees of " + Math.round((D.merWeighted || 0) * 10000) / 100 + "% per year = " + (D.feeCostLifetime || 0) + "$ in total fees over the plan. Translate into months of retirement income lost to fees." });

  if (signals.withdrawalStress)
    obsPool.push({ topic: "withdrawal-stress", labelFr: "Pression de retrait", labelEn: "Withdrawal pressure", instr: "Withdrawal stress: withdrawal rate (" + (D.withdrawalRatePct || 0) + "%) exceeds expected portfolio return by " + signals.withdrawalStress.ratio + "x. This means the portfolio would shrink in real terms even in an average year. What conditions would need to hold for sustainability." });

  if (signals.mortgageInRetirement)
    obsPool.push({ topic: "mortgage-retirement", labelFr: "Hypothèque à la retraite", labelEn: "Mortgage in retirement", instr: "Mortgage extends " + signals.mortgageInRetirement.yearsInRet + " years into retirement at " + signals.mortgageInRetirement.payment + "$/mo. Total retirement mortgage cost: " + (signals.mortgageInRetirement.payment * 12 * signals.mortgageInRetirement.yearsInRet) + "$. Impact on withdrawal sustainability." });

  if (signals.bizExtractWindow)
    obsPool.push({ topic: "biz-extract", labelFr: "Fenêtre d'extraction", labelEn: "Extraction window", instr: "Business extraction window: " + signals.bizExtractWindow.yearsToSale + " years until potential sale vs " + signals.bizExtractWindow.yearsTilRet + " years until retirement. The timing gap between these events affects dividend/salary mix optimization." });

  if (D.successPct >= 90 && (D.rMedF || 0) > 200000)
    obsPool.push({ topic: "estate-structure", labelFr: "Structure successorale", labelEn: "Estate structure", instr: "Estate structure: " + Math.round(D.rMedF || 0) + "$ median residual. Registered accounts are fully taxable at death. Tax-free savings pass tax-free. Observe the split implications." });

  obsPool.push({ topic: "gov-coverage", labelFr: "Couverture gouvernementale", labelEn: "Government coverage", instr: "Government coverage depth: " + gP + " " + (D.qppMonthly || 0) + "$/mo + " + oN + " " + (D.oasMonthly || 0) + "$/mo" + ((D.dbPensionMonthly || 0) > 0 ? " + pension " + D.dbPensionMonthly + "$/mo" : "") + " = " + (D.govMonthly || 0) + "$/mo covering " + (D.coveragePct || 0) + "% of spending. What the remaining " + (100 - (D.coveragePct || 0)) + "% means in annual personal draw." });

  if (Math.abs((D.taxCurrentEffective || 0) - (D.taxRetirementEffective || 0)) >= 5)
    obsPool.push({ topic: "tax-bracket-shift", labelFr: "Décalage fiscal", labelEn: "Tax bracket shift", instr: "Tax bracket shift: effective rate moves from " + (D.taxCurrentEffective || 0) + "% to " + (D.taxRetirementEffective || 0) + "% in retirement. This " + ((D.taxCurrentEffective || 0) > (D.taxRetirementEffective || 0) ? "drop" : "increase") + " represents ~" + taxDiffPerYear + "$/yr difference. What this means for RRSP vs TFSA optimization." });

  if (signals.riskMismatch)
    obsPool.push({ topic: "risk-mismatch", labelFr: "Profil de risque", labelEn: "Risk profile", instr: "Risk mismatch: chosen risk profile (" + (q.risk || "balanced") + ") and plan outcome (" + (D.successPct || 0) + "% success) suggest a tension between comfort level and growth needs. Describe what the numbers show without prescribing." });

  if (signals.timeLeverage)
    obsPool.push({ topic: "time-leverage", labelFr: "Effet du temps", labelEn: "Time leverage", instr: "Compounding runway: with " + yrsToRet + " years to retirement, each dollar saved today could multiply " + Math.round(Math.pow(1 + (D.expReturn || 0.05), yrsToRet)) + "x in real terms. Frame the power of early consistency." });

  // Fallback
  obsPool.push({ topic: "unique-insight", labelFr: "Observation unique", labelEn: "Unique insight", instr: "Unique profile insight: identify the single most interesting tension or opportunity in this profile that hasn't been covered in other slots. Be specific, not generic." });

  // Assign obs_2-obs_5 from pool (no repeats, max 4)
  const obsAssigned = obsPool.slice(0, 4);
  const obs2Instr = obsAssigned[0]?.instr || "Government coverage depth observation.";
  const obs3Instr = obsAssigned[1]?.instr || "Fee impact or savings trajectory observation.";
  const obs4Instr = obsAssigned[2]?.instr || "Contextual analysis: unique profile observation.";
  const obs5Instr = obsAssigned[3]?.instr || "Risk and longevity observation.";

  // ════════════════════════════════════════════════════════════════
  // 6. COUPLE_ANALYSIS — profile-aware instructions
  // ════════════════════════════════════════════════════════════════
  let coupleDesc: string;
  if (!params.cOn) {
    coupleDesc = "N/A -- solo profile.";
  } else if (signals.coupleAsymmetry && signals.coupleAsymmetry.incomeRatio < 50) {
    coupleDesc = "Income asymmetry: one partner earns significantly more (ratio " + signals.coupleAsymmetry.incomeRatio + "%). Explore pension splitting benefit, bracket disparity between partners, and what happens if the higher earner retires first. DO NOT repeat tax rate or success rate already stated in snapshot_intro.";
  } else if (signals.coupleAsymmetry && signals.coupleAsymmetry.retAgeGap >= 3) {
    coupleDesc = "Staggered retirement: " + signals.coupleAsymmetry.retAgeGap + "-year gap between retirement ages. Explore the cost of single-income years, survivor benefit implications, and coordinated drawdown order. DO NOT repeat tax rate or success rate already stated in snapshot_intro.";
  } else {
    coupleDesc = "Household coordination: explore coordinated drawdown order (which accounts to draw first), survivor pension benefits, and household-level tax bracket management. Focus on the COUPLE dynamic — what changes when you model two people instead of one. DO NOT repeat tax rate or success rate already stated in snapshot_intro.";
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
    optimization: "Close with precision — the specific efficiency gain available.",
    "catch-up": "Close with the next achievable milestone — not the destination, the next step.",
  };
  const priorityInstr = "Explain WHY " + frictionExplain + " matters most for THIS person — connect it to their specific numbers, not generic rules. Include one lifestyle-level observation (what this means in monthly dollars or years of autonomy). " + (themeClose[profile.narrativeTheme] || themeClose.growth) + " Write as flowing narrative, NOT a numbered list.";

  // ════════════════════════════════════════════════════════════════
  // 8. ENRICHED DATA BLOCK
  // ════════════════════════════════════════════════════════════════
  const data: Record<string, any> = {
    profile: {
      age: D.age, retAge: D.retAge, prov: D.prov, sex: D.sex,
      couple: q.couple, source: q.source, qppAge: D.qppAge, oasAge: D.oasAge,
      profileType: profile.profileType, narrativeTheme: profile.narrativeTheme,
      riskProfile: q.risk, lifestyle: q.lifestyle,
    },
    savings: {
      total: D.totalSavings, retBal: D.retBal, rrsp: D.rrsp, tfsa: D.tfsa, nr: D.nr,
      lira: D.liraBal || 0, dc: D.dcBal || 0,
      monthlyContrib: monthlyContrib, savingsRate: savingsRate,
    },
    debt: rp.debtBal > 0 ? { total: rp.debtBal, annual: rp.debtAnnualCost } : null,
    property: rp.homeVal > 0 ? { value: rp.homeVal, mortgage: rp.mortBal, equity: rp.equity } : null,
    gov: {
      qpp: D.qppMonthly, oas: D.oasMonthly, pension: D.dbPensionMonthly,
      total: D.govMonthly, cover: D.coveragePct,
    },
    spend: { mo: D.retSpM, gap: D.gapMonthly, wd: D.withdrawalRatePct },
    results: {
      pct: D.successPct, grade: D.grade, med: D.rMedF, p5: D.rP5F, p25: D.rP25F, p75: D.rP75F,
      p95: D.rP95F || 0, medRuin: D.medRuin || 0, p5Ruin: D.p5Ruin || 0,
      medEstateTax: D.medEstateTax || 0, medEstateNet: D.medEstateNet || 0,
      p25EstateNet: D.p25EstateNet || 0, p75EstateNet: D.p75EstateNet || 0,
    },
    tax: { curr: D.taxCurrentEffective, ret: D.taxRetirementEffective, marg: D.taxCurrentMarginal },
    fees: { mer: D.merWeighted || 0, cost: D.feeCostLifetime || 0 },
    timeline: {
      yrsToRet: yrsToRet, retirementYears: retYears,
      avgDeath: D.avgDeath || D.deathAge || 87,
    },
    scores: { longevity: D.longevityScore, tax: D.taxScore, gov: D.covScore, divers: D.diverScore },
    bizOn: rp.bizOn, cOn: params.cOn, succObjective: q.succObjective || "neutral",
  };

  // Couple block
  if (params.cOn) {
    data.couple = {
      partnerAge: params.cAge, partnerRetAge: params.cRetAge, partnerIncome: params.cSal,
      retAgeGap: Math.abs((params.retAge || 65) - (params.cRetAge || 65)),
      incomeRatio: signals.coupleAsymmetry ? signals.coupleAsymmetry.incomeRatio : 100,
    };
  }

  // Business block
  if (rp.bizOn) {
    data.business = {
      revenue: params.bizRevenue || 0, expenses: params.bizExpenses || 0,
      retained: params.bizBNR || 0, remun: params.bizRemun || "salary",
      saleAge: params.bizSaleAge || 0,
      extractYrs: signals.bizExtractWindow ? signals.bizExtractWindow.yearsToSale : 0,
    };
  }

  // Signals block
  const sigKeys = Object.keys(signals);
  if (sigKeys.length > 0) {
    data.signals = signals;
  }

  // Strategies (convert decimal success to percentage)
  if (stratData && stratData.length > 0) {
    data.strategies = stratData.map((s) => ({
      key: s.key,
      succ: Math.round(s.succ * 100),
      medF: s.medF,
    }));
  }

  // ════════════════════════════════════════════════════════════════
  // 9. PER-SLOT IMPLICATION HINTS
  // ════════════════════════════════════════════════════════════════
  const gradeMetaphor = D.grade === "A+" ? "Excellent — the plan is robust in nearly all simulated futures."
    : D.grade === "A" ? "Strong — the plan succeeds in most scenarios with a comfortable margin."
    : D.grade === "B" ? "Solid — the plan works in the majority of cases but has some vulnerability."
    : D.grade === "C" ? "Moderate — the plan succeeds roughly half the time. There is room to improve."
    : D.grade === "D" ? "Fragile — the plan struggles in most scenarios. Key levers could shift the outcome."
    : "Critical — the plan does not meet the goal in current form. Immediate adjustments needed.";

  const snapshotHint = "Grade " + D.grade + " (" + D.successPct + "%). " + gradeMetaphor + " Weave in WIN acknowledgment. Set the emotional tone for the entire report.";
  const savingsHint = "Current savings " + (D.totalSavings || 0) + "$ → projected " + (D.retBal || 0) + "$ at retirement. This represents ~" + autonomyYears + " years of autonomous spending at the current gap. Savings rate: " + savingsRate + "% of income.";
  const incomeMixHint = gP + " " + (D.qppMonthly || 0) + "$/mo + " + oN + " " + (D.oasMonthly || 0) + "$/mo" + ((D.dbPensionMonthly || 0) > 0 ? " + pension " + D.dbPensionMonthly + "$/mo" : "") + " = " + (D.govMonthly || 0) + "$/mo covering " + (D.coveragePct || 0) + "% of spending. Activation ages: " + gP + " at " + (D.qppAge || 65) + ", " + oN + " at " + (D.oasAge || 65) + ".";
  const taxHint = "Current effective rate " + (D.taxCurrentEffective || 0) + "% → retirement " + (D.taxRetirementEffective || 0) + "%. " + (taxDiffPerYear > 0 ? "This difference represents ~" + taxDiffPerYear + "$/yr." : "Rates are similar.");
  const longevityHint = "Fan chart spread: P25=" + (D.rP25F || 0) + "$ to P75=" + (D.rP75F || 0) + "$. This " + ((D.rP75F || 0) - (D.rP25F || 0)) + "$ range represents the uncertainty between cautious and optimistic scenarios.";
  const benchmarkHint = "Self-comparison ONLY. Savings-to-lifetime-need ratio: " + (D.retBal || 0) + "$ projected vs " + ((D.gapMonthly || 0) * 12 * retYears) + "$ total gap over " + retYears + " years. DO NOT invent external averages or peer comparisons. Compare this person to their own goal, not to others.";

  // Strategy highlight
  const stratDesc = stratData && stratData.length > 0
    ? "Best strategy from DATA.strategies comparison. Reference the specific success rate improvement and median wealth difference vs statu_quo. Explain what this strategy changes in plain terms."
    : "General strategy context based on profile. What levers could shift the outcome.";

  // ════════════════════════════════════════════════════════════════
  // 10. SYSTEM PROMPT
  // ════════════════════════════════════════════════════════════════
  const sys = "You narrate buildfi.ca Intermediaire reports ($59 tier).\n"
    + "You write like a human financial planner who studied this person's file for an hour — not a template engine filling slots.\n"
    + "Each slot must feel like it was written specifically for THIS person. If two different profiles could produce the same text, you've failed.\n"
    + "\n=== COMPLIANCE (AMF / OSFI — NON-NEGOTIABLE) ===\n"
    + "This is an EDUCATIONAL tool, NOT financial advice.\n"
    + "1. Facts from DATA may use present tense.\n"
    + "2. Any implication, projection, or outcome MUST use conditional tense (pourrait/serait/could/would).\n"
    + "3. Use 'pourrait + infinitive' construction. NEVER use single-word conditional future (ajouterait, constituerait, permettrait). Instead: 'pourrait ajouter', 'pourrait constituer', 'pourrait permettre'.\n"
    + "4. FORBIDDEN verbs (never use): devriez, recommandons, conseillons, il faut, devez, assurez-vous, "
    + "considerez, optimisez, priorisez, plan d'action, recommandation(s), you should, you must, we recommend.\n"
    + "5. Observational language ONLY. Describe what numbers show; never prescribe actions.\n"
    + "6. Do not shame debt. State the mathematical cost only.\n"
    + "7. NEVER suggest combining scenarios or adding their effects together.\n"
    + "8. Use 'Cette analyse suggère' or 'Les données indiquent', never directive language.\n"
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
    + "\n=== LANGUAGE ===\n"
    + "- " + (fr ? "French (vous). Naturel, pas robotique. Variez les tournures de phrase." : "English. Natural, not robotic. Vary sentence structure.") + "\n"
    + "- Grade 10 reading level. Short sentences. No jargon.\n"
    + "- Acronyms: NEVER use acronyms. Write in full: " + gP + ", " + oN + ".\n"
    + (fr ? "- ACCENTS: You MUST use proper French diacritics (é, è, ê, ë, à, â, ç, î, ï, ô, ù, û). Write \"réussite\" not \"reussite\", \"épargne\" not \"epargne\", \"scénario\" not \"scenario\". Zero tolerance — every missing accent is a defect.\n" : "")
    + "\n=== VOICE ===\n"
    + voiceInstr + "\n"
    + "\n=== SLOT STRUCTURE (MANDATORY) ===\n"
    + "Each slot = 2-3 sentences following this arc:\n"
    + "1. ANCHOR: One specific number from DATA, stated as fact.\n"
    + "2. IMPLICATION: What this number means for this person's daily life, in conditional tense. Be concrete — translate abstract numbers into months of income, years of autonomy, or dollars per day.\n"
    + "3. NUANCE: A condition, variability factor, or contextual detail that adds depth (conditional tense).\n"
    + "\n=== DEDUPLICATION (CRITICAL) ===\n"
    + "- Each obs slot (obs_1 through obs_5) MUST cover a DIFFERENT topic. Never repeat the same subject across obs slots.\n"
    + "- obs slots MUST NOT repeat the topic of strategy_highlight. If strategy_highlight discusses fees, no obs slot should discuss fees.\n"
    + "- couple_analysis MUST NOT repeat success rate, grade, or tax rates already stated in snapshot_intro or tax_context.\n"
    + "- priority_actions MUST NOT be a numbered list. It must be a flowing narrative paragraph.\n"
    + "\n=== PERSONALIZATION ===\n"
    + "- snapshot_intro MUST mirror exactly one idea from the WIN acknowledgment — woven naturally, never quoted.\n"
    + "- If no worries, mirror one positive financial habit.\n"
    + "- benchmark_context uses self-comparison ONLY. Never invent external stats or peer groups.\n"
    + "\n=== OUTPUT ===\n"
    + "- Output ONLY a single valid JSON object. No markdown. No preamble. No code fences. No trailing commas.\n"
    + "- If you cannot comply, output {}.";

  // ════════════════════════════════════════════════════════════════
  // 11. SLOT DEFINITIONS
  // ════════════════════════════════════════════════════════════════
  // Objectif slot data
  const objective = q.lifestyle || q.objective || "";
  const objectifInstr = objective
    ? "The user's stated retirement objective is '" + objective + "'. In 2 sentences, reflect what this means in dollar terms given their current trajectory (" + (D.successPct || 0) + "% success, " + (D.retSpM || 0) + "$/mo target). Connect the gap (or surplus) between their goal and the median projection."
    : "";

  const slots: string[] = [
    '"snapshot_intro":"' + snapshotHint.replace(/"/g, '\\"') + '"',
    ...(objectifInstr ? ['"objectif":"' + objectifInstr.replace(/"/g, '\\"') + '"'] : []),
    '"savings_context":"' + savingsHint.replace(/"/g, '\\"') + '"',
    '"income_mix":"' + incomeMixHint.replace(/"/g, '\\"') + '"',
    '"tax_context":"' + taxHint.replace(/"/g, '\\"') + '"',
    '"longevity_risk":"' + longevityHint.replace(/"/g, '\\"') + '"',
    '"sequence_risk":"Sequence-of-returns risk in context of withdrawal rate (' + (D.withdrawalRatePct || 0) + '%) and equity exposure (' + ((q.risk || 'balanced') === 'growth' ? '85%' : (q.risk || 'balanced') === 'conservative' ? '50%' : '70%') + '). What a bad sequence in the first 5 retirement years could mean. 2 sentences."',
    '"benchmark_context":"' + benchmarkHint.replace(/"/g, '\\"') + '"',
    '"obs_1":"' + (fixMap[q.fix] || 'Most impactful lever from DATA.').replace(/"/g, '\\"') + " Never start with 'Le levier'. Start with the specific number or fact.\"",
    '"obs_2":"' + obs2Instr.replace(/"/g, '\\"') + '"',
    '"obs_3":"' + obs3Instr.replace(/"/g, '\\"') + '"',
    '"obs_4":"' + obs4Instr.replace(/"/g, '\\"') + '"',
    '"obs_5":"' + obs5Instr.replace(/"/g, '\\"') + '"',
    '"priority_actions":"' + priorityInstr.replace(/"/g, '\\"') + '"',
    '"strategy_highlight":"' + stratDesc.replace(/"/g, '\\"') + '"',
    '"couple_analysis":"' + coupleDesc.replace(/"/g, '\\"') + '"',
  ];
  const ctaSlots: string[] = rp.bizOn ? ['"ccpc_context":"CCPC strategy: explore the timing of dividend vs salary extraction, retained earnings deployment, and business value in the retirement plan. Reference DATA.business fields. 2-3 sentences."'] : [];

  // ════════════════════════════════════════════════════════════════
  // 12. USER PROMPT
  // ════════════════════════════════════════════════════════════════
  const usr = "=== VOICE ===\n" + voiceInstr + "\n\n"
    + "=== NARRATIVE ARC ===\n" + narrativeArc + "\n\n"
    + emphasisBlock + riskOrder + "\n\n"
    + "=== PERSONALIZATION HOOKS ===\n"
    + winInstr + "\n" + fixInstr + "\n"
    + "PROFILE: anxiety=" + profile.anxiety + ", discipline=" + profile.discipline
    + ", friction=" + profile.primaryFriction + ", theme=" + profile.narrativeTheme
    + ", profileType=" + (profile.profileType || "general") + "\n"
    + (wInstr ? "WORRY EXPANSIONS: " + wInstr + "\n" : "")
    + worryBlock + "\n"
    + (propSlot ? propSlot + "\n" : "") + (ptSlot ? ptSlot + "\n" : "")
    + "\n=== DATA ===\n" + JSON.stringify(data)
    + "\n\n=== SLOT INSTRUCTIONS ===\n"
    + "Return JSON with 2-3 sentences per slot. Each sentence must carry information. Zero filler.\n"
    + "{" + slots.concat(ctaSlots).join(",") + "}";

  const obsLabels: Record<string, string> = {
    obs_2: fr ? (obsAssigned[0]?.labelFr || "Observation 2") : (obsAssigned[0]?.labelEn || "Observation 2"),
    obs_2_topic: obsAssigned[0]?.topic || "gov-coverage",
    obs_3: fr ? (obsAssigned[1]?.labelFr || "Observation 3") : (obsAssigned[1]?.labelEn || "Observation 3"),
    obs_3_topic: obsAssigned[1]?.topic || "fee-impact",
    obs_4: fr ? (obsAssigned[2]?.labelFr || "Observation 4") : (obsAssigned[2]?.labelEn || "Observation 4"),
    obs_4_topic: obsAssigned[2]?.topic || "unique-insight",
    obs_5: fr ? (obsAssigned[3]?.labelFr || "Observation 5") : (obsAssigned[3]?.labelEn || "Observation 5"),
    obs_5_topic: obsAssigned[3]?.topic || "unique-insight",
  };

  return { sys, usr, obsLabels };
}
