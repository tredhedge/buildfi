// lib/ai-constants.ts — Shared AI narration types, slot names, and sanitization

// ─── Essentiel tier slots ─────────────────────────────────────────────
export const AI_SLOTS = [
  "snapshot_intro",
  "savings_context",
  "debt_impact",
  "gov_explanation",
  "gap_explanation",
  "tax_insight",
  "longevity_good",
  "longevity_watch",
  "obs_1",
  "obs_2",
  "obs_3",
  "succession_note",
] as const;

export type AISlotKey = (typeof AI_SLOTS)[number];
export type AINarration = Partial<Record<AISlotKey, string>>;

// Max length overrides per slot (default 500)
export const AI_SLOT_MAX_LENGTH: Partial<Record<AISlotKey, number>> = {
  succession_note: 300,
};


// ─── Bilan 360 tier slots ─────────────────────────────────────────────
export const AI_SLOTS_360 = [
  "biggest_risk",
  "best_lever",
  "snapshot_intro",
  "mirror_block",
  "revenue_analysis",
  "savings_analysis",
  "gov_explanation",
  "cpp_timing",
  "longevity_analysis",
  "spending_flex",
  "what_if_analysis",
  "strategy_comparison",
  "sequence_risk",
  "meltdown_analysis",
  "priority_actions",
  "tax_analysis",
  "fees_analysis",
  "couple_analysis",
  "property_analysis",
  "strengths_risks",
  "estate_analysis",
  "obs_1",
  "obs_1_title",
  "obs_2",
  "obs_2_title",
  "obs_3",
  "obs_3_title",
  "obs_4",
  "obs_4_title",
  "obs_5",
  "obs_5_title",
  "next_horizon",
  "model_blind_spots",
  "efficiency_gap",
] as const;

export type AISlotKey360 = (typeof AI_SLOTS_360)[number];
export type AINarration360 = Partial<Record<AISlotKey360, string>>;

export const AI_SLOT_MAX_LENGTH_360: Partial<Record<AISlotKey360, number>> = {
  mirror_block: 1000,
  priority_actions: 900,
  couple_analysis: 900,
  property_analysis: 900,
  strengths_risks: 800,
  meltdown_analysis: 800,
  efficiency_gap: 900,
  next_horizon: 600,
  model_blind_spots: 600,
  obs_1_title: 60,
  obs_2_title: 60,
  obs_3_title: 60,
  obs_4_title: 60,
  obs_5_title: 60,
};

/**
 * Sanitize raw AI output for Bilan 360 tier.
 */
export function sanitizeAISlots360(raw: Record<string, any>): AINarration360 {
  const result: AINarration360 = {};
  for (const key of AI_SLOTS_360) {
    const val = raw[key];
    if (val && typeof val === "string") {
      const maxLen = AI_SLOT_MAX_LENGTH_360[key] || 800;
      const clean = val.replace(/<[^>]*>/g, "").slice(0, maxLen);
      const forCheck = clean.replace(SAFE_DISCLAIMER_PATTERNS, "");
      if (!FORBIDDEN_TERMS.test(forCheck)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}" (360), dropping`);
      }
    }
  }
  return result;
}

// AMF/OSFI forbidden prescriptive terms + scenario combination + filler + glissements
export const FORBIDDEN_TERMS =
  /\bdevriez\b|\bdevrait\b|\brecommandons\b|\bconseillons\b|\bvous devez\b|\bil faut que\b|\bassurez-vous\b|\bwe recommend\b|\byou should\b|\byou must\b|\bcombiner les\b|\bcombine the\b|\bconsiderez\b|\bconsidérez\b|\boptimisez\b|\bpriorisez\b|\bplan d'action\b|\brecommandation\b|\brecommandations\b|\bil est important de noter\b|\bil convient de souligner\b|\bil convient de noter\b|\bil est à noter\b|\bnotons que\b|\bsoulignons que\b|\bmentionnons que\b|\bit is important to note\b|\bit should be noted\b|\bworth noting\b/i;

// Defensive disclaimer patterns that are safe even though they contain forbidden terms.
// Strip these before running FORBIDDEN_TERMS check so "ne sont pas des recommandations" etc. pass.
const SAFE_DISCLAIMER_PATTERNS =
  /ne (sont|constitue(nt)?|s'agi(t|ssent)) pas (d'une?|des?) recommandation(s)?/gi;

/**
 * Sanitize raw AI output into safe, compliant slot values.
 * - Only keeps recognized slot keys
 * - Strips HTML tags
 * - Max 500 chars per slot
 * - Rejects slots containing forbidden AMF terms
 */
export function sanitizeAISlots(raw: Record<string, any>): AINarration {
  const result: AINarration = {};
  for (const key of AI_SLOTS) {
    const val = raw[key];
    if (val && typeof val === "string") {
      // Strip HTML tags, limit length (per-slot override or default 500)
      const maxLen = AI_SLOT_MAX_LENGTH[key] || 500;
      const clean = val.replace(/<[^>]*>/g, "").slice(0, maxLen);
      // Strip safe disclaimer patterns before checking for forbidden terms
      const forCheck = clean.replace(SAFE_DISCLAIMER_PATTERNS, "");
      if (!FORBIDDEN_TERMS.test(forCheck)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}", dropping`);
      }
    }
  }
  return result;
}

// ─── Expert tier section-based slots ────────────────────────────────────
// Expert uses section-based AI (not flat slots) — each section = 1 prompt batch
export const EXPERT_SECTIONS_BASE = [
  "sommaire_executif",
  "diagnostic_robustesse",
  "revenus_retraite",
  "projection_patrimoine",
  "analyse_fiscale",
  "priorites_action",
  "observations_detaillees",
  "hypotheses_methodo",
  "disclaimers",
] as const;

export const EXPERT_SECTIONS_CONDITIONAL = [
  "couple",
  "immobilier",
  "pension_db",
  "corporatif",
  "remuneration",
  "dettes",
  "decaissement",
  "stress_tests",
  "assurance",
  "resp",
] as const;

export const EXPERT_SECTIONS_EXCLUSIVE = [
  "comparaison_scenarios",
  "driver_attribution",
  "pour_professionnel",
  "questions_fiscaliste",
  "historique_modifications",
] as const;

export type ExpertSectionKey =
  | (typeof EXPERT_SECTIONS_BASE)[number]
  | (typeof EXPERT_SECTIONS_CONDITIONAL)[number]
  | (typeof EXPERT_SECTIONS_EXCLUSIVE)[number];

export type ExpertAINarration = Partial<Record<ExpertSectionKey, string>>;

/**
 * Determine which Expert sections are active based on profile.
 */
export function getActiveExpertSections(profile: {
  couple?: boolean;
  homeowner?: boolean;
  pensionDB?: boolean;
  ccpc?: boolean;
  hasDebt?: boolean;
  hasInsurance?: boolean;
  hasRESP?: boolean;
  grade?: string;
  sophistication?: string;
  hasScenarios?: boolean;
  hasChangelog?: boolean;
}): ExpertSectionKey[] {
  const sections: ExpertSectionKey[] = [...EXPERT_SECTIONS_BASE];

  if (profile.couple) sections.push("couple");
  if (profile.homeowner) sections.push("immobilier");
  if (profile.pensionDB) sections.push("pension_db");
  if (profile.ccpc) { sections.push("corporatif"); sections.push("remuneration"); }
  if (profile.hasDebt) sections.push("dettes");
  if (profile.sophistication !== "rapide") sections.push("decaissement");
  if (profile.grade && ["C+", "C", "D", "F"].includes(profile.grade)) sections.push("stress_tests");
  if (profile.hasInsurance) sections.push("assurance");
  if (profile.hasRESP) sections.push("resp");

  // Exclusive Expert sections
  if (profile.hasScenarios) sections.push("comparaison_scenarios");
  sections.push("driver_attribution");
  sections.push("pour_professionnel");
  sections.push("questions_fiscaliste");
  if (profile.hasChangelog) sections.push("historique_modifications");

  return sections;
}

/**
 * Sanitize raw AI output for Expert tier (section-based).
 * Same compliance logic as other tiers.
 */
export function sanitizeAISlotsExpert(
  raw: Record<string, any>,
  activeSections: ExpertSectionKey[]
): ExpertAINarration {
  const result: ExpertAINarration = {};
  for (const key of activeSections) {
    const val = raw[key];
    if (val && typeof val === "string") {
      // Expert sections can be longer — 2000 char max
      const clean = val.replace(/<[^>]*>/g, "").slice(0, 2000);
      const forCheck = clean.replace(SAFE_DISCLAIMER_PATTERNS, "");
      if (!FORBIDDEN_TERMS.test(forCheck)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in Expert section "${key}", dropping`);
      }
    }
  }
  return result;
}
