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
      const stripped = val.replace(/<[^>]*>/g, "").slice(0, maxLen);
      // Two-pass: try to soften prescriptive verbs first (you should → you
      // could, etc.). Only drop if the rewrite still trips the regex.
      const clean = softenAISlot(stripped);
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

// AMF/OSFI forbidden prescriptive terms + scenario combination + filler + glissements.
// Codex audit 2026-05-01: broadened to catch "should/must" without the "you"
// prefix (the AI was emitting "savings should grow" / "the plan must rebalance"
// which dropped through the prior regex). Also catches "consider <X>ing"
// imperative + "make sure" + "ensure" + "ought to" + "il faut"/"il faudrait"
// without the "que" qualifier.
export const FORBIDDEN_TERMS =
  /\bdevriez\b|\bdevrait\b|\bdevraient\b|\bdevra(s|i|ent)?\b|\bfaudrait\b|\bil faut\b|\brecommandons\b|\brecommande\b|\bconseillons\b|\bconseille\b|\bvous devez\b|\bassurez-vous\b|\bil est essentiel\b|\bil est crucial\b|\bil est impératif\b|\bwe recommend\b|\bwe suggest\b|\bwe advise\b|\byou should\b|\byou must\b|\byou ought to\b|\byou need to\b|\bmake sure (that |to )?\b|\bensure that\b|\bcombiner les\b|\bcombine the\b|\bconsiderez\b|\bconsidérez\b|\bconsider \w+ing\b|\boptimisez\b|\bpriorisez\b|\bplan d'action\b|\baction plan\b|\brecommandation\b|\brecommandations\b|\brecommendation\b|\brecommendations\b|\bil est important de noter\b|\bil convient de souligner\b|\bil convient de noter\b|\bil est à noter\b|\bnotons que\b|\bsoulignons que\b|\bmentionnons que\b|\bit is important to note\b|\bit should be noted\b|\bworth noting\b/i;

// Soft-rewrite map: when an AI slot trips a violation that is rescuable by a
// simple verb swap, do that BEFORE dropping. Preserves the observation while
// removing the prescriptive verb. Order matters — multi-word patterns first
// so "you should consider" doesn't become "you might consider <X>ing" then
// trip the consider rule.
export const SOFT_REWRITES: Array<[RegExp, string]> = [
  [/\bwe recommend\s+/gi, "an option to consider is "],
  [/\bwe suggest\s+/gi, "one approach is "],
  [/\bwe advise\s+/gi, "one approach is "],
  [/\byou should\s+/gi, "you could "],
  [/\byou must\s+/gi, "the plan would benefit from "],
  [/\byou ought to\s+/gi, "you could "],
  [/\byou need to\s+/gi, "the plan benefits from "],
  [/\bmake sure (?:that |to )?/gi, "an avenue is to "],
  [/\bensure that\s+/gi, "an avenue is that "],
  [/\bvous devez\s+/gi, "vous pourriez "],
  [/\bvous devriez\s+/gi, "vous pourriez "],
  [/\bdevriez\s+/gi, "pourriez "],
  [/\bdevrait\s+/gi, "pourrait "],
  [/\bdevraient\s+/gi, "pourraient "],
  [/\bil faut\s+/gi, "une avenue est de "],
  [/\bil faudrait\s+/gi, "il pourrait être utile de "],
  [/\brecommandons\s+/gi, "observons que "],
  [/\bconseillons\s+/gi, "observons que "],
  [/\boptimisez\s+/gi, "une optimisation possible : "],
  [/\bpriorisez\s+/gi, "une priorisation possible : "],
];

// Defensive disclaimer patterns that are safe even though they contain forbidden terms.
// Strip these before running FORBIDDEN_TERMS check so "ne sont pas des recommandations" etc. pass.
const SAFE_DISCLAIMER_PATTERNS =
  /ne (sont|constitue(nt)?|s'agi(t|ssent)) pas (d'une?|des?) recommandation(s)?/gi;

/**
 * Apply soft rewrites to convert prescriptive AI output into observational
 * tone. Each rule is tried in sequence; later rules see the output of
 * earlier ones. Returns the rewritten string. Codex audit 2026-05-01.
 */
export function softenAISlot(text: string): string {
  if (typeof text !== "string") return text;
  let out = text;
  for (const [pattern, replacement] of SOFT_REWRITES) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

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
 * Canonical decision-flow order for Expert sections (2026-05-14 IA refactor).
 *
 * Section order matters: pre-refactor the array was built in BASE → CONDITIONAL
 * → EXCLUSIVE order, which pushed conditional sections (stress_tests, dettes,
 * etc.) AFTER the disclaimers. Worse, topic-grouping ("Tax analysis" → "Levers
 * identified" → "Observations") buried the actionable synthesis under
 * appendix-adjacent content.
 *
 * The new order walks the reader through a decision flow:
 *   1. Situation       — where do you stand?
 *   2. Trajectory      — does the plan hold?
 *   3. Threats         — what could break it?
 *   4. Levers          — what moves the needle? (synthesis first, then details)
 *   5. Scenarios       — which path holds best?
 *   6. Mechanics       — how was this calculated?
 *   7. Appendix/legal  — disclosure, change history, meeting prep
 *
 * `getActiveExpertSections` builds the set as before, then sorts against this
 * array. Sections not listed here fall to the end (defensive against typos).
 */
export const EXPERT_SECTION_ORDER: ExpertSectionKey[] = [
  // Situation
  "sommaire_executif",
  "revenus_retraite",
  // Trajectory
  "projection_patrimoine",
  "diagnostic_robustesse",
  // Threats
  "stress_tests",
  "dettes",
  "assurance",
  // Levers (synthesis → tax → decum → household → corp → real estate → DB → RESP)
  "priorites_action",
  "analyse_fiscale",
  "decaissement",
  "couple",
  "corporatif",
  "remuneration",
  "immobilier",
  "pension_db",
  "resp",
  // Scenarios
  "comparaison_scenarios",
  // Mechanics + appendix
  "observations_detaillees",
  "driver_attribution",
  "pour_professionnel",
  "questions_fiscaliste",
  "historique_modifications",
  "hypotheses_methodo",
  "disclaimers",
];

/**
 * Determine which Expert sections are active based on profile.
 * Output is sorted by EXPERT_SECTION_ORDER (decision-flow IA).
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
  const set = new Set<ExpertSectionKey>(EXPERT_SECTIONS_BASE);

  if (profile.couple) set.add("couple");
  if (profile.homeowner) set.add("immobilier");
  if (profile.pensionDB) set.add("pension_db");
  if (profile.ccpc) { set.add("corporatif"); set.add("remuneration"); }
  if (profile.hasDebt) set.add("dettes");
  if (profile.sophistication !== "rapide") set.add("decaissement");
  if (profile.grade && ["C+", "C", "D", "F"].includes(profile.grade)) set.add("stress_tests");
  if (profile.hasInsurance) set.add("assurance");
  if (profile.hasRESP) set.add("resp");

  // Exclusive Expert sections
  if (profile.hasScenarios) set.add("comparaison_scenarios");
  set.add("driver_attribution");
  set.add("pour_professionnel");
  set.add("questions_fiscaliste");
  if (profile.hasChangelog) set.add("historique_modifications");

  // Sort by canonical decision-flow order. Sections outside the canon (would
  // be a typo) fall to the end so we never lose them silently.
  const rank = new Map(EXPERT_SECTION_ORDER.map((k, i) => [k, i]));
  return Array.from(set).sort(
    (a, b) => (rank.get(a) ?? 999) - (rank.get(b) ?? 999)
  );
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
