// lib/ai-profile.ts — DerivedProfile + RenderPlan
// Computes behavioral signals from actual quiz fields + MC results
// Used by buildAIPrompt() to personalize AI narration tone and focus

export type Anxiety = "low" | "moderate" | "high";
export type Discipline = "low" | "moderate" | "high";
export type Literacy = "basic" | "intermediate" | "advanced";
export type PrimaryFriction = "debt" | "savings-rate" | "spending" | "timeline" | "fees";
export type NarrativeTheme = "security" | "growth" | "optimization" | "catch-up";
export type Tone = "warm" | "balanced" | "data-forward";

export type ProfileType =
  | "debt-heavy" | "early-retirement" | "ccpc" | "couple"
  | "pre-retirement" | "critical" | "optimized" | "mortgage-focus" | "general";

export interface DerivedProfile {
  anxiety: Anxiety;
  discipline: Discipline;
  literacy: Literacy;
  complexityScore: number;       // 0-10
  primaryFriction: PrimaryFriction;
  riskMismatch: boolean;
  narrativeTheme: NarrativeTheme;
  profileType?: ProfileType;
}

export interface CompositeSignals {
  conservativeGrowthTrap?: boolean;
  debtDragOverSavings?: boolean;
  mortgageInRetirement?: { yearsInRet: number; payment: number };
  highEffortLowResult?: boolean;
  timeLeverage?: { years: number };
  preRetUrgency?: { years: number };
  tfsaHeavy?: number;     // percentage
  rrspHeavy?: number;     // percentage
  riskMismatch?: boolean;
  coupleAsymmetry?: { incomeRatio: number; retAgeGap: number; savingsRatio: number };
  bizExtractWindow?: { yearsToSale: number; yearsTilRet: number };
  bridgePeriod?: { years: number; totalCost: number };
  withdrawalStress?: { ratio: number };
}

export interface RenderPlan {
  tone: Tone;
  worstCasePlacement: "prominent" | "standard";
  showRiskWindow: boolean;
  emphasizeDebt: boolean;
  emphasizeFees: boolean;
  emphasizeGov: boolean;
}

/**
 * Compute behavioral profile from actual quiz + MC-derived report data.
 * @param quiz - raw quizAnswers from quiz-essentiel.html
 * @param D    - post-extractReportData object (57 fields)
 * @param params - post-translateToMC object (contains _quiz, _report)
 */
export function computeDerivedProfile(
  quiz: Record<string, any>,
  D: Record<string, any>,
  params: Record<string, any>
): DerivedProfile {
  const q = params._quiz || {};
  const rp = params._report || {};

  // --- Anxiety: explicit quiz answer > data-derived fallback ---
  const worryCount = (q.worries || []).length;
  let anxiety: Anxiety;
  if (q.psych_anxiety === "calm") anxiety = "low";
  else if (q.psych_anxiety === "high") anxiety = "high";
  else if (q.psych_anxiety === "mild") anxiety = "moderate";
  else {
    const confidence = q.confidence || 3;
    if (confidence <= 2) anxiety = "high";
    else if (confidence >= 4) anxiety = "low";
    else anxiety = "moderate";
    if (worryCount >= 3 && anxiety !== "high") {
      anxiety = anxiety === "low" ? "moderate" : "high";
    }
  }

  // --- Discipline: explicit quiz answer > data-derived fallback ---
  let discipline: Discipline;
  if (q.psych_discipline === "strong") discipline = "high";
  else if (q.psych_discipline === "low") discipline = "low";
  else if (q.psych_discipline === "moderate") discipline = "moderate";
  else {
    const income = quiz.income || 70000;
    const monthlyContrib = quiz.monthlyContrib || 0;
    const savingsRate = (monthlyContrib * 12) / Math.max(1, income);
    if (savingsRate >= 0.15) discipline = "high";
    else if (savingsRate >= 0.05) discipline = "moderate";
    else discipline = "low";
  }

  // --- Literacy: explicit quiz answer > data-derived fallback ---
  let literacy: Literacy;
  if (q.psych_literacy === "high") literacy = "advanced";
  else if (q.psych_literacy === "low") literacy = "basic";
  else if (q.psych_literacy === "medium") literacy = "intermediate";
  else {
    let litScore = 0;
    if (q.savingsDetail) litScore += 2;
    if (q.risk && q.risk !== "balanced") litScore += 1;
    if (q.employer && q.employer !== "x" && q.employer !== "small") litScore += 1;
    literacy = litScore >= 3 ? "advanced" : litScore >= 1 ? "intermediate" : "basic";
  }

  // --- Complexity: count of active financial dimensions ---
  let complexity = 0;
  if (rp.debtBal > 0) complexity += 2;
  if (rp.homeVal > 0) complexity += 2;
  if (q.couple === "yes") complexity += 1;
  if (q.parttime !== "no" && q.parttime) complexity += 1;
  if (D.hasPension) complexity += 1;
  if (worryCount > 0) complexity += 1;
  if (rp.debts && rp.debts.length > 1) complexity += 1;
  const complexityScore = Math.min(10, complexity);

  // --- Primary friction: biggest cost driver ---
  let primaryFriction: PrimaryFriction = "savings-rate";
  const hasHighRateDebt = rp.debts && rp.debts.some((d: any) => d.rate >= 0.10);
  if (hasHighRateDebt) primaryFriction = "debt";
  else if (D.withdrawalRatePct > 5) primaryFriction = "spending";
  else if (D.successPct < 60) primaryFriction = "timeline";
  else if (D.feeCostLifetime > 100000) primaryFriction = "fees";

  // --- Risk mismatch: behavior vs allocation gap ---
  const riskMismatch =
    (q.risk === "conservative" && D.successPct < 70) ||
    (q.risk === "growth" && D.successPct >= 95);

  // --- Narrative theme: global framing ---
  let narrativeTheme: NarrativeTheme = "growth";
  if (anxiety === "high") narrativeTheme = "security";
  else if (D.successPct >= 90 && rp.debtBal === 0) narrativeTheme = "optimization";
  else if (D.successPct < 60) narrativeTheme = "catch-up";

  // --- Profile type: priority hierarchy ---
  let profileType: ProfileType = "general";
  if (hasHighRateDebt && rp.debtBal > 20000) profileType = "debt-heavy";
  else if (params.retAge && params.retAge <= 50) profileType = "early-retirement";
  else if (rp.bizOn) profileType = "ccpc";
  else if (q.couple === "yes") profileType = "couple";
  else if ((D.retAge || 65) - (D.age || 40) <= 5) profileType = "pre-retirement";
  else if (D.successPct <= 30) profileType = "critical";
  else if (D.successPct >= 90 && rp.debtBal === 0) profileType = "optimized";
  else if (rp.mortBal > 0 && rp.mortFreeAge > (params.retAge || 65)) profileType = "mortgage-focus";

  return {
    anxiety,
    discipline,
    literacy,
    complexityScore,
    primaryFriction,
    riskMismatch,
    narrativeTheme,
    profileType,
  };
}

/**
 * Compute render plan from profile + report data.
 * Controls prompt tone and emphasis flags.
 */
export function computeRenderPlan(
  profile: DerivedProfile,
  D: Record<string, any>
): RenderPlan {
  return {
    tone: profile.anxiety === "high" ? "warm"
        : profile.literacy === "advanced" ? "data-forward"
        : "balanced",
    worstCasePlacement: D.successPct < 70 ? "prominent" : "standard",
    showRiskWindow: (D.qppAge || 65) > (D.retAge || 65),
    emphasizeDebt: profile.primaryFriction === "debt",
    emphasizeFees: (D.feeCostLifetime || 0) > 50000,
    emphasizeGov: (D.coveragePct || 50) < 40,
  };
}

/**
 * Compute composite behavioral signals from quiz + MC data.
 * Used by Inter prompt for dynamic obs routing and enriched DATA block.
 */
export function computeCompositeSignals(
  quiz: Record<string, any>,
  D: Record<string, any>,
  params: Record<string, any>,
  profile: DerivedProfile
): CompositeSignals {
  const q = params._quiz || {};
  const rp = params._report || {};
  const signals: CompositeSignals = {};

  const totalAccounts = (D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0);
  const monthlyContrib = quiz.monthlyContrib || D.monthlyContrib || 0;
  const annualContrib = monthlyContrib * 12;
  const yrsToRet = Math.max(0, (D.retAge || 65) - (D.age || 40));
  const expReturn = D.expReturn || 0.05;

  // 1. Conservative allocation with low success = growth trap
  if ((q.risk === "conservative" || q.risk === "balanced") && D.successPct < 70 && D.successPct > 0)
    signals.conservativeGrowthTrap = true;

  // 2. Debt interest exceeds annual savings
  if (rp.debtBal > 0 && rp.debtAnnualCost > annualContrib && annualContrib > 0)
    signals.debtDragOverSavings = true;

  // 3. Mortgage extends into retirement
  if (rp.mortFreeAge > 0 && rp.mortFreeAge > (params.retAge || 65))
    signals.mortgageInRetirement = {
      yearsInRet: rp.mortFreeAge - (params.retAge || 65),
      payment: rp.mortPayment || 0,
    };

  // 4. High savings effort but still struggling
  const savingsRate = D.sal > 0 ? (annualContrib / D.sal) : 0;
  if (savingsRate >= 0.15 && D.successPct < 75 && D.successPct > 0)
    signals.highEffortLowResult = true;

  // 5. Young with long compounding runway
  if (D.age < 35 && yrsToRet > 25)
    signals.timeLeverage = { years: yrsToRet };

  // 6. Pre-retirement urgency (5 years or less)
  if (yrsToRet > 0 && yrsToRet <= 5)
    signals.preRetUrgency = { years: yrsToRet };

  // 7. TFSA-heavy allocation (tax-free flexibility)
  if (totalAccounts > 0 && (D.tfsa || 0) / totalAccounts > 0.50)
    signals.tfsaHeavy = Math.round((D.tfsa || 0) / totalAccounts * 100);

  // 8. RRSP-heavy allocation (taxable retirement income)
  if (totalAccounts > 0 && (D.rrsp || 0) / totalAccounts > 0.65)
    signals.rrspHeavy = Math.round((D.rrsp || 0) / totalAccounts * 100);

  // 9. Risk mismatch from DerivedProfile
  if (profile.riskMismatch)
    signals.riskMismatch = true;

  // 10. Couple asymmetry (income/savings/retAge gaps)
  if (params.cOn && params.cSal !== undefined) {
    const mainIncome = D.sal || 0;
    const partnerIncome = params.cSal || 0;
    const incomeRatio = Math.max(mainIncome, partnerIncome) > 0
      ? Math.round(Math.min(mainIncome, partnerIncome) / Math.max(mainIncome, partnerIncome) * 100) : 100;
    const retAgeGap = Math.abs((params.retAge || 65) - (params.cRetAge || 65));
    const mainSav = (D.rrsp || 0) + (D.tfsa || 0) + (D.nr || 0);
    const partnerSav = (params.cRRSP || 0) + (params.cTFSA || 0) + (params.cNR || 0);
    const savingsRatio = Math.max(mainSav, partnerSav) > 0
      ? Math.round(Math.min(mainSav, partnerSav) / Math.max(mainSav, partnerSav) * 100) : 100;
    if (incomeRatio < 60 || retAgeGap >= 3 || savingsRatio < 40)
      signals.coupleAsymmetry = { incomeRatio, retAgeGap, savingsRatio };
  }

  // 11. CCPC extraction window
  if (rp.bizOn && params.bizSaleAge) {
    const yearsToSale = Math.max(0, params.bizSaleAge - (D.age || 40));
    signals.bizExtractWindow = { yearsToSale, yearsTilRet: yrsToRet };
  }

  // 12. Bridge period (self-funded before gov income)
  const qppAge = D.qppAge || 65;
  const retAge = D.retAge || 65;
  if (qppAge > retAge) {
    const bridgeYrs = qppAge - retAge;
    const retSpM = D.retSpM || 0;
    signals.bridgePeriod = { years: bridgeYrs, totalCost: retSpM * 12 * bridgeYrs };
  }

  // 13. Withdrawal stress (withdrawal rate / expected return ratio)
  const wdPct = D.withdrawalRatePct || 0;
  const returnPct = expReturn * 100;
  if (returnPct > 0 && wdPct / returnPct > 1.5)
    signals.withdrawalStress = { ratio: Math.round(wdPct / returnPct * 10) / 10 };

  return signals;
}
