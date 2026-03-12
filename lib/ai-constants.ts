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

// ─── Intermédiaire tier slots ─────────────────────────────────────────
export const AI_SLOTS_INTER = [
  "snapshot_intro",
  "objectif",
  "savings_context",
  "income_mix",
  "tax_context",
  "longevity_risk",
  "sequence_risk",
  "benchmark_context",
  "obs_1",
  "obs_2",
  "obs_3",
  "obs_4",
  "obs_5",
  "priority_actions",
  "strategy_highlight",
  "couple_analysis",
  "ccpc_context",
] as const;

export type AISlotKeyInter = (typeof AI_SLOTS_INTER)[number];
export type AINarrationInter = Partial<Record<AISlotKeyInter, string>>;

// Max length overrides per Inter slot (default 500)
export const AI_SLOT_MAX_LENGTH_INTER: Partial<Record<AISlotKeyInter, number>> = {
  priority_actions: 600,
  couple_analysis: 600,
  ccpc_context: 600,
};

// ─── Décaissement tier slots ──────────────────────────────────────────
export const AI_SLOTS_DECUM = [
  "snapshot_intro",
  "longevity_context",
  "spending_flex_obs",
  "income_mix_obs",
  "tax_timing_obs",
  "meltdown_obs",
  "cpp_timing_obs",
  "sequence_obs",
  "estate_obs",
  "obs_1",
  "obs_2",
  "obs_3",
] as const;

export type AISlotKeyDecum = (typeof AI_SLOTS_DECUM)[number];
export type AINarrationDecum = Partial<Record<AISlotKeyDecum, string>>;

export const AI_SLOT_MAX_LENGTH_DECUM: Partial<Record<AISlotKeyDecum, number>> = {
  snapshot_intro: 600,
  tax_timing_obs: 600,
  meltdown_obs: 600,
  estate_obs: 400,
};

/**
 * Sanitize raw AI output for Décaissement tier.
 */
export function sanitizeAISlotsDecum(raw: Record<string, any>): AINarrationDecum {
  const result: AINarrationDecum = {};
  for (const key of AI_SLOTS_DECUM) {
    const val = raw[key];
    if (val && typeof val === "string") {
      const maxLen = AI_SLOT_MAX_LENGTH_DECUM[key] || 500;
      const clean = val.replace(/<[^>]*>/g, "").slice(0, maxLen);
      if (!FORBIDDEN_TERMS.test(clean)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}" (decum), dropping`);
      }
    }
  }
  return result;
}

// AMF/OSFI forbidden prescriptive terms + scenario combination + filler + glissements
export const FORBIDDEN_TERMS =
  /\bdevriez\b|\bdevrait\b|\brecommandons\b|\bconseillons\b|\bvous devez\b|\bil faut que\b|\bassurez-vous\b|\bwe recommend\b|\byou should\b|\byou must\b|\bcombiner les\b|\bcombine the\b|\bconsiderez\b|\bconsidérez\b|\boptimisez\b|\bpriorisez\b|\bplan d'action\b|\brecommandation\b|\brecommandations\b|\bil est important de noter\b|\bil convient de souligner\b|\bil convient de noter\b|\bdans ce contexte\b|\bpar ailleurs\b|\ben outre\b|\bil est à noter\b|\bnotons que\b|\bsoulignons que\b|\bmentionnons que\b|\bit is important to note\b|\bit should be noted\b|\bworth noting\b|\bin this context\b|\bajouterait\b|\bconstituerait\b|\bpermetrait\b|\bpermettrait\b/i;

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
      // Reject if contains forbidden prescriptive terms
      if (!FORBIDDEN_TERMS.test(clean)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}", dropping`);
      }
    }
  }
  return result;
}

/**
 * Sanitize raw AI output for Intermédiaire tier.
 * Same logic as sanitizeAISlots but uses AI_SLOTS_INTER whitelist.
 */
export function sanitizeAISlotsInter(raw: Record<string, any>): AINarrationInter {
  const result: AINarrationInter = {};
  for (const key of AI_SLOTS_INTER) {
    const val = raw[key];
    if (val && typeof val === "string") {
      const maxLen = AI_SLOT_MAX_LENGTH_INTER[key] || 500;
      const clean = val.replace(/<[^>]*>/g, "").slice(0, maxLen);
      if (!FORBIDDEN_TERMS.test(clean)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}" (inter), dropping`);
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
      if (!FORBIDDEN_TERMS.test(clean)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in Expert section "${key}", dropping`);
      }
    }
  }
  return result;
}
