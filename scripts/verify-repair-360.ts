// scripts/verify-repair-360.ts — SEMANTIC verify→repair loop (2026-06-18)
// ─────────────────────────────────────────────────────────────────────────────
// The convergent algorithm the free-form prompt could not reach on its own:
// an Opus *verifier* (the blind Pl.Fin. reviewer, in-loop) cross-checks every
// claim in the narration against the ground-truth data + rendered structure,
// returns SLOT-ATTRIBUTED blockers each with a concrete correction, and an Opus
// *repair* pass rewrites ONLY those slots with the correction. Re-render, re-verify,
// loop until the verifier returns no blocker (deliver/minor) or maxRounds is hit.
//
// This is the SEMANTIC half of auto-repair. The existing autoRepairNarration closes
// the format/foreign-number half (deterministic guardrail); this closes the
// "incomes equivalent but they're 92k/72k" / "references a chart that doesn't render"
// half that only a competent reader catches. Verifier and writer are both Opus, so
// the loop converges: the verifier is as strong as the writer.
//
//   npx tsx scripts/verify-repair-360.ts midcouple_qc_fr,sells_bc_en [--base=DIR] [--rounds=3]
//
// Reads prompts/{key}.json + payload/{key}.json + responses/{key}.json + out/{key}.html
// (all frozen by ship-loop dump/render + prod-narrate). Re-renders via ship-loop so
// the loop measures exactly what a customer would receive.
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { sanitizeAISlots360 } from "../lib/ai-constants";

const ROOT = join(__dirname, "..");
if (!process.env.ANTHROPIC_API_KEY) {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^\s*ANTHROPIC_API_KEY\s*=\s*['"]?([^'"\n]+)/m);
  if (m) process.env.ANTHROPIC_API_KEY = m[1].trim();
}
if (!process.env.ANTHROPIC_API_KEY) { console.error("No ANTHROPIC_API_KEY"); process.exit(1); }

const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith("--base="));
const BASE = baseArg ? baseArg.slice(7) : "planner/report/realai/corpus-30";
const roundsArg = args.find((a) => a.startsWith("--rounds="));
const MAX_ROUNDS = roundsArg ? Number(roundsArg.slice(9)) : 3;
const KEYS = (args.find((a) => !a.startsWith("--")) || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!KEYS.length) { console.error("Pass keys: npx tsx scripts/verify-repair-360.ts key1,key2"); process.exit(1); }

const MODEL = "claude-opus-4-8";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function callJSON(sys: string, usr: string, maxTokens = 8000): Promise<any> {
  const r = await client.messages.create({
    model: MODEL, max_tokens: maxTokens, system: sys,
    messages: [{ role: "user", content: usr + "\n\nOutput the JSON object and NOTHING else — no preamble, no explanation, no markdown fences." }],
  });
  let text = (r.content as any[]).filter((b) => b.type === "text").map((b) => b.text).join("");
  text = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
  // Robust: slice from the first "{" to the last "}" in case anything leaks around it.
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) text = text.slice(a, b + 1);
  return JSON.parse(text);
}

// Structural ground truth from the RENDERED html — so the verifier can flag prose
// that references an element the report does not actually contain.
function structuralFacts(html: string) {
  const sectionIds = [...html.matchAll(/id="(sec-[a-z0-9-]+)"/gi)].map((m) => m[1]);
  const charts: string[] = [];
  if (/id="fanChart"/.test(html)) charts.push("fan chart (portfolio percentile bands over time)");
  if (/id="incomeChart"/.test(html)) charts.push("income chart (income sources by age)");
  const hasTornado = /tornado/i.test(html);
  // Action/lever cards: the render uses a repeated card marker; count the action list items.
  const leverCards = (html.match(/class="[^"]*\baction-card\b[^"]*"/g) || []).length
    || (html.match(/class="[^"]*\blever\b[^"]*"/g) || []).length;
  return { charts, hasTornado, leverCards, sectionCount: sectionIds.length };
}

const VERIFY_SCHEMA_NOTE = `Return ONLY a JSON object:
{
 "verdict": "deliver" | "minor" | "do-not-deliver",
 "readsLikePlanner": true | false,
 "findings": [
   { "slot": "<the EXACT slot key from the NARRATION block whose text is wrong; use \\"(structural)\\" only if no slot owns it>",
     "severity": "blocker" | "major",
     "problem": "<quote the offending text and the conflicting data value>",
     "correction": "<one concrete instruction telling the writer what to say instead, grounded in the data>" }
 ]
}
"blocker" = would mislead the client or embarrass the firm (fabricated/wrong number, individual-vs-household mismatch, internal contradiction, a claim that contradicts the client's own data, a reference to an element the report does not contain). "major" = serious but a planner could still send. Cosmetic-only ⇒ verdict "minor" with majors only. No blockers ⇒ never "do-not-deliver".`;

function verifierSys(lang: "fr" | "en") {
  return `You are a senior Quebec financial planner (Pl. Fin.) doing a COLD, adversarial pre-send review of a retirement report about to be EMAILED to a paying client. You have no prior context. Assume nothing is correct until you check it against the DATA. Catch anything that would mislead the client or embarrass the firm.

You are given: (1) DATA — the actual computed numbers (the single source of truth; for a COUPLE/HOUSEHOLD profile, income/tax/coverage claims must be on a HOUSEHOLD basis), (2) STRUCTURE — which charts/sections the report actually renders, (3) NARRATION — the AI-written slots keyed by slot id (this is the prose the client reads).

Cross-check EVERY quantitative and qualitative claim in each NARRATION slot against DATA and STRUCTURE. Flag: numbers absent from DATA (fabrications); contradictions between slots or between a slot and DATA; individual-vs-household mismatches; arithmetic that does not sum; qualitative claims that contradict the data; references to a chart/section/element STRUCTURE says is absent; AMF-tone breaches (must be observational + conditional — could/would/might, pourrait/serait — never should/recommend/must/devriez/recommandons/il faut).

RUN THESE EXPLICIT DERIVED-QUANTITY CHECKS (the narrator must QUOTE these, never recompute or infer them — a wrong computed figure is a BLOCKER):
- "X months/mois of (retirement) income" about fees: compute fees.lifetimeCost ÷ householdRetTargetMonthly (the monthly retirement income); if the stated months differ from that by more than ~10%, BLOCKER (quote both).
- Any claim the partners' incomes are "equal/identical/équivalents/identiques": compare incomeIndividual vs (householdIncome − incomeIndividual); if they differ by more than ~10%, BLOCKER (the parenthetical "combined" total is NOT each partner's income).
- Any "effective tax rate goes from A% to B%, a gap of $G/yr": for a couple, G must be on the HOUSEHOLD income, not the individual's; flag an individual-basis gap presented as household.
- Replacement %, coverage %, withdrawal %: must equal the DATA values, not a recomputation.

Attribute each finding to the EXACT slot key whose text carries the error, so it can be rewritten. ${lang === "fr" ? "The report is in FRENCH (fr-CA number format)." : "The report is in ENGLISH (en-CA number format)."}

${VERIFY_SCHEMA_NOTE}`;
}

function repairSys(lang: "fr" | "en") {
  return lang === "fr"
    ? `Vous êtes un planificateur financier (Pl. Fin.) qui RÉVISE la narration d'un rapport de retraite. On vous donne le bloc DONNÉES (seule source de vérité), la narration actuelle et une liste de CORRECTIONS factuelles à appliquer. Régénérez UNIQUEMENT les champs listés, sous forme d'objet JSON avec exactement ces clés. N'utilisez QUE des nombres présents dans DONNÉES. Pour un couple, raisonnez sur une base de MÉNAGE. Conservez un registre observationnel et conditionnel (pourrait/serait ; jamais devriez/recommandons/il faut). Format monétaire fr-CA. Ne réintroduisez aucune des erreurs signalées et ne référencez aucun élément absent du rapport.`
    : `You are a financial planner (Pl. Fin.) REVISING the narration of a retirement report. You are given the DATA block (sole source of truth), the current narration, and a list of factual CORRECTIONS to apply. Regenerate ONLY the listed fields, as a JSON object with exactly those keys. Use ONLY numbers present in DATA. For a couple, reason on a HOUSEHOLD basis. Keep an observational, conditional register (could/would/might; never should/recommend/must). en-CA currency format. Do not reintroduce any flagged error and do not reference any element absent from the report.`;
}

function reRender(idOrKey: string) {
  execFileSync("npx", ["tsx", "planner/report/realai/ship-loop.ts", "render", `--base=${BASE}`, `--only=${idOrKey}`],
    { cwd: ROOT, stdio: "pipe", shell: process.platform === "win32" });
}

(async () => {
  for (const key of KEYS) {
    const prompt = JSON.parse(readFileSync(join(ROOT, BASE, "prompts", `${key}.json`), "utf8"));
    const payload = JSON.parse(readFileSync(join(ROOT, BASE, "payload", `${key}.json`), "utf8"));
    const lang: "fr" | "en" = prompt.lang === "en" ? "en" : "fr";
    const respPath = join(ROOT, BASE, "responses", `${key}.json`);
    const htmlPath = join(ROOT, BASE, "out", `${key}.html`);
    const slotKeys: string[] = prompt.slotKeys || [];
    // GROUND TRUTH = exactly the data surface the NARRATOR was given (prompt.usr embeds the
    // curated DATA pool: client inputs from params + computed metrics from D). Checking the
    // narration against anything narrower (e.g. only buildfiData) makes the verifier call the
    // client's real inputs "fabricated" and the repair pass strips correct facts. "Fabricated"
    // must mean "absent from what the writer was authorized to use" — which is prompt.usr.
    const dataBlock = prompt.usr +
      `\n\n[EMBED — also shown to the client] ${JSON.stringify(payload.buildfiData)}`;

    console.log(`\n=== ${key} (${lang}, ${slotKeys.length} slots, ≤${MAX_ROUNDS} rounds) ===`);
    const trail: string[] = [];

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const narration = JSON.parse(readFileSync(respPath, "utf8"));
      const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
      const struct = structuralFacts(html);

      // Only show the verifier the slots that carry prose (non-empty).
      const slots: Record<string, string> = {};
      for (const k of slotKeys) if (narration[k] && String(narration[k]).trim()) slots[k] = String(narration[k]);

      const verifyUsr =
        `DATA (source of truth):\n${dataBlock}\n\n` +
        `STRUCTURE (what the report actually renders): charts = [${struct.charts.join("; ") || "none"}]; ` +
        `a tornado/sensitivity chart is ${struct.hasTornado ? "PRESENT" : "ABSENT"}; ` +
        `${struct.leverCards} action/lever card(s) render; ${struct.sectionCount} sections.\n\n` +
        `NARRATION (slot key → client-facing text):\n${JSON.stringify(slots, null, 1)}`;

      const v = await callJSON(verifierSys(lang), verifyUsr);
      const findings: any[] = Array.isArray(v.findings) ? v.findings : [];
      const blockers = findings.filter((f) => f.severity === "blocker");
      trail.push(`r${round}: ${v.verdict} (blockers=${blockers.length}, majors=${findings.length - blockers.length}, planner=${v.readsLikePlanner})`);
      console.log(`  [r${round}] verdict=${v.verdict} blockers=${blockers.length} majors=${findings.length - blockers.length}`);
      for (const f of blockers) console.log(`     ⛔ ${f.slot}: ${String(f.problem).slice(0, 140)}`);

      if (blockers.length === 0) { console.log(`  ✓ ${key}: no blockers — ${v.verdict}`); break; }
      if (round === MAX_ROUNDS) { console.log(`  ✗ ${key}: still ${blockers.length} blocker(s) after ${MAX_ROUNDS} rounds → human-hold`); break; }

      // Repair ONLY the slot-attributed blockers (skip "(structural)" — those need a code/template fix, not re-narration).
      const repairable = blockers.filter((f) => f.slot && f.slot !== "(structural)" && slotKeys.includes(f.slot));
      const structural = blockers.filter((f) => !repairable.includes(f));
      if (structural.length) for (const f of structural) console.log(`     ⚠ non-slot blocker (needs code/template fix): ${f.slot} — ${String(f.problem).slice(0, 120)}`);
      if (!repairable.length) { console.log(`  ✗ ${key}: blockers are structural/template, not slot-repairable → stop`); break; }

      const fixList = repairable.map((f) =>
        `- "${f.slot}": PROBLEM — ${f.problem}\n   CORRECTION — ${f.correction}`).join("\n");
      const repairUsr =
        prompt.usr +
        `\n\n--- ${lang === "fr" ? "CORRECTIONS FACTUELLES À APPLIQUER" : "FACTUAL CORRECTIONS TO APPLY"} ---\n` +
        `${lang === "fr" ? "Régénérez UNIQUEMENT ces champs (objet JSON, ces clés exactes)" : "Regenerate ONLY these fields (JSON object, exactly these keys)"}:\n${fixList}`;

      const repaired = sanitizeAISlots360(await callJSON(repairSys(lang), repairUsr)) as Record<string, string>;
      let changed = 0;
      for (const f of repairable) {
        const val = repaired[f.slot];
        if (typeof val === "string" && val.trim()) { narration[f.slot] = val; changed++; }
      }
      if (!changed) { console.log(`  ✗ ${key}: repair returned nothing usable → stop`); break; }
      writeFileSync(respPath, JSON.stringify(narration, null, 2));
      console.log(`  ↻ repaired ${changed} slot(s): ${repairable.map((f) => f.slot).join(", ")} — re-rendering…`);
      reRender(key);
    }
    console.log(`  TRAIL ${key}: ${trail.join("  →  ")}`);
  }
})();
