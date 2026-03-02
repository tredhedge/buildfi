// lib/ai-profile.ts — DerivedProfile + RenderPlan
// Computes behavioral signals from actual quiz fields + MC results
// Used by buildAIPrompt() to personalize AI narration tone and focus

export type Anxiety = "low" | "moderate" | "high";
export type Discipline = "low" | "moderate" | "high";
export type Literacy = "basic" | "intermediate" | "advanced";
export type PrimaryFriction = "debt" | "savings-rate" | "spending" | "timeline" | "fees";
export type NarrativeTheme = "security" | "growth" | "optimization" | "catch-up";
export type Tone = "warm" | "balanced" | "data-forward";

export interface DerivedProfile {
  anxiety: Anxiety;
  discipline: Discipline;
  literacy: Literacy;
  complexityScore: number;       // 0-10
  primaryFriction: PrimaryFriction;
  riskMismatch: boolean;
  narrativeTheme: NarrativeTheme;
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

  return {
    anxiety,
    discipline,
    literacy,
    complexityScore,
    primaryFriction,
    riskMismatch,
    narrativeTheme,
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
