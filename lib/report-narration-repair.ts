// lib/report-narration-repair.ts
// Auto-repair loop for AI narration. The guardrail (report-narration-guardrail)
// validates the finished narration; when it fails, this regenerates ONLY the
// offending slots with a targeted re-prompt (the DATA block + the exact rule each
// slot broke), re-validates, up to `maxAttempts`. If it still fails, the caller
// serves the needs-attention fallback (the ≤1% human-review path).
//
// The AI call is INJECTED as `narrate(sys, usr) => Promise<slots>` so this is
// framework-free and unit-testable (the webhook passes its own callAnthropic).

import { evaluateNarration } from "./report-narration-guardrail";
import type { NarrationVerdict, NarrationFinding } from "./report-narration-guardrail";

const HUMAN_RULE: Record<string, { en: string; fr: string }> = {
  foreign_number: {
    en: "contains a number that is NOT in the DATA block — use only numbers that appear in DATA",
    fr: "contient un nombre ABSENT du bloc DONNÉES — n'utilisez que des nombres présents dans DONNÉES",
  },
  direction_violation: {
    en: "uses reassuring language though the plan's success is fragile — stay observational and conditional",
    fr: "emploie un ton rassurant alors que le succès du plan est fragile — restez observationnel et conditionnel",
  },
  amf_banned_stem: {
    en: "uses a prescriptive / 'optimize' term — forbidden; use observational, conditional phrasing",
    fr: "emploie un terme prescriptif / « optimis* » — interdit ; utilisez un ton observationnel et conditionnel",
  },
  fr_jargon_meltdown: {
    en: "uses the jargon 'meltdown' — say 'décaissement anticipé' instead",
    fr: "emploie l'anglicisme « meltdown » — dites « décaissement anticipé »",
  },
  unsubstituted_placeholder: {
    en: "contains an unfilled [[PLACEHOLDER]] — write the real text",
    fr: "contient un [[PLACEHOLDER]] non rempli — rédigez le texte réel",
  },
  undefined_or_nan: {
    en: "contains 'undefined' or 'NaN' — write a real value or omit it",
    fr: "contient « undefined » ou « NaN » — indiquez une valeur réelle ou retirez-la",
  },
  empty_required_slot: {
    en: "is missing — this field is required",
    fr: "est manquant — ce champ est obligatoire",
  },
  locale_leak: {
    en: "uses an acronym from the wrong language",
    fr: "emploie un acronyme dans la mauvaise langue",
  },
  format_leak: {
    en: "uses the wrong currency/number format for this language",
    fr: "emploie un format monétaire/numérique incorrect pour cette langue",
  },
};

/** Build a targeted repair user-prompt: the original DATA + the exact fixes needed. */
export function buildRepairPrompt(promptUser: string, findings: NarrationFinding[], lang: "fr" | "en"): string {
  // Group findings by slot so each slot is listed once with all its problems.
  const bySlot = new Map<string, NarrationFinding[]>();
  for (const f of findings) {
    if (!bySlot.has(f.slot)) bySlot.set(f.slot, []);
    bySlot.get(f.slot)!.push(f);
  }
  const lines: string[] = [];
  for (const [slot, fs] of bySlot) {
    const reasons = fs.map((f) => (HUMAN_RULE[f.kind]?.[lang] || f.kind) + (f.detail ? ` (${f.detail})` : "")).join("; ");
    lines.push(`- "${slot}": ${reasons}`);
  }
  const header =
    lang === "fr"
      ? `\n\n--- CORRECTION REQUISE ---\nLes champs de narration suivants comportent des problèmes. Régénérez UNIQUEMENT ces champs sous forme d'objet JSON avec exactement ces clés. N'utilisez QUE des nombres présents dans le bloc DONNÉES ci-dessus. Conservez un registre observationnel et conditionnel (aucune directive, aucun « optimis* », aucun « meltdown »).\nChamps à corriger :`
      : `\n\n--- CORRECTION REQUIRED ---\nThe following narration fields have problems. Regenerate ONLY these fields as a JSON object with exactly these keys. Use ONLY numbers that appear in the DATA block above. Keep an observational, conditional register (no directives, no "optimize", no "meltdown").\nFields to fix:`;
  return promptUser + header + "\n" + lines.join("\n");
}

export interface RepairResult {
  ai: Record<string, string | undefined>;
  verdict: NarrationVerdict;
  attempts: number;
}

/**
 * Validate `aiSlots`; if the guardrail fails, regenerate the offending slots and
 * re-validate, up to `maxAttempts` (default 2). Returns the best narration we
 * could produce plus the final verdict (verdict.ok === false → caller falls back).
 */
export async function autoRepairNarration(opts: {
  aiSlots: Record<string, string | undefined>;
  promptSys: string;
  promptUser: string;
  lang: "fr" | "en";
  band?: "fragile" | "sound";
  requiredSlots?: string[];
  narrate: (sys: string, usr: string) => Promise<Record<string, string | undefined>>;
  maxAttempts?: number;
  onAttempt?: (n: number, verdict: NarrationVerdict) => void;
  /** Epoch ms; no new repair attempt starts at/after this time (budget guard). */
  deadline?: number;
  /** Per-attempt timeout (ms); a slow narrate is abandoned so it can't blow the budget. */
  perAttemptTimeoutMs?: number;
  /** Injectable clock for tests; defaults to Date.now. */
  now?: () => number;
}): Promise<RepairResult> {
  const maxAttempts = opts.maxAttempts ?? 2;
  const now = opts.now ?? (() => Date.now());
  let ai = { ...opts.aiSlots };
  const check = () =>
    evaluateNarration({
      aiSlots: ai,
      promptUser: opts.promptUser,
      lang: opts.lang,
      band: opts.band,
      requiredSlots: opts.requiredSlots,
    });

  let verdict = check();
  let attempts = 0;
  while (!verdict.ok && attempts < maxAttempts) {
    // Budget guard: don't start an attempt we may not be able to finish in time.
    if (opts.deadline != null && now() >= opts.deadline) break;
    attempts++;
    opts.onAttempt?.(attempts, verdict);
    const repairUsr = buildRepairPrompt(opts.promptUser, verdict.findings, opts.lang);
    let repaired: Record<string, string | undefined> = {};
    try {
      const call = opts.narrate(opts.promptSys, repairUsr);
      repaired =
        opts.perAttemptTimeoutMs != null
          ? await Promise.race([
              call,
              new Promise<Record<string, string | undefined>>((_, reject) =>
                setTimeout(() => reject(new Error("repair narrate timeout")), opts.perAttemptTimeoutMs)
              ),
            ])
          : await call;
    } catch {
      break; // narration failed/timed out — keep what we have, let caller fall back
    }
    // Merge only the slots we asked to repair AND that came back non-empty.
    const target = new Set(verdict.repairableSlots);
    let changed = false;
    for (const [slot, val] of Object.entries(repaired)) {
      if (target.has(slot) && typeof val === "string" && val.trim() !== "") {
        ai[slot] = val;
        changed = true;
      }
    }
    if (!changed) break; // nothing usable came back — stop, fall back
    verdict = check();
  }

  return { ai, verdict, attempts };
}
