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
  "upgrade_hook",
] as const;

export type AISlotKey = (typeof AI_SLOTS)[number];
export type AINarration = Partial<Record<AISlotKey, string>>;

// ─── Intermédiaire tier slots ─────────────────────────────────────────
export const AI_SLOTS_INTER = [
  "snapshot_intro",
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

// AMF/OSFI forbidden prescriptive terms + scenario combination
export const FORBIDDEN_TERMS =
  /devriez|recommandons|conseillons|vous devez|il faut que|assurez-vous|we recommend|you should|you must|combiner les|combine the/i;

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
      // Strip HTML tags, limit length
      const clean = val.replace(/<[^>]*>/g, "").slice(0, 500);
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
      const clean = val.replace(/<[^>]*>/g, "").slice(0, 500);
      if (!FORBIDDEN_TERMS.test(clean)) {
        result[key] = clean;
      } else {
        console.warn(`[ai-constants] Compliance violation in slot "${key}" (inter), dropping`);
      }
    }
  }
  return result;
}
