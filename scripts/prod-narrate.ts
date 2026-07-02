// scripts/prod-narrate.ts — PROD-FAITHFUL narration runner (2026-06-18)
// Replicates the webhook's exact narration path so the ship-loop measures what a REAL
// customer would get: Anthropic API (Opus) → sanitizeAISlots360 → autoRepairNarration(≤2).
// Reads prompts/{key}.json (frozen by `ship-loop dump`) and writes responses/{key}.json,
// so the existing `ship-loop render` + gate + blind review run on API-narrated output.
//   Usage: npx tsx scripts/prod-narrate.ts key1,key2,...   [--base=DIR]
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sanitizeAISlots360 } from "../lib/ai-constants";
import { autoRepairNarration } from "../lib/report-narration-repair";

const ROOT = join(__dirname, "..");
// Load ANTHROPIC_API_KEY from .env.local (tsx doesn't auto-load it like Next.js does).
if (!process.env.ANTHROPIC_API_KEY) {
  const env = readFileSync(join(ROOT, ".env.local"), "utf8");
  const m = env.match(/^\s*ANTHROPIC_API_KEY\s*=\s*['"]?([^'"\n]+)/m);
  if (m) process.env.ANTHROPIC_API_KEY = m[1].trim();
}
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error("No ANTHROPIC_API_KEY"); process.exit(1); }

const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith("--base="));
const BASE = baseArg ? baseArg.slice(7) : "planner/report/realai/corpus-30";
const KEYS = (args.find((a) => !a.startsWith("--")) || "").split(",").map((s) => s.trim()).filter(Boolean);
if (!KEYS.length) { console.error("Pass keys: npx tsx scripts/prod-narrate.ts key1,key2"); process.exit(1); }

const MODEL = "claude-opus-4-8"; // exact webhook narrationModel/repairModel
const client = new Anthropic({ apiKey });

// Faithful re-implementation of the webhook's callAnthropic (lib path is webhook-local).
async function callAnthropic(sys: string, usr: string): Promise<Record<string, string | undefined>> {
  const r = await client.messages.create({ model: MODEL, max_tokens: 8000, system: sys, messages: [{ role: "user", content: usr }] });
  const text = (r.content as any[]).filter((b) => b.type === "text").map((b) => b.text).join("");
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
  return sanitizeAISlots360(JSON.parse(cleaned)) as Record<string, string | undefined>;
}

(async () => {
  for (const key of KEYS) {
    const p = JSON.parse(readFileSync(join(ROOT, BASE, "prompts", `${key}.json`), "utf8"));
    const lang: "fr" | "en" = p.lang === "en" ? "en" : "fr";
    try {
      const t0 = Date.now();
      const initial = await callAnthropic(p.sys, p.usr);
      const repair = await autoRepairNarration({
        aiSlots: initial, promptSys: p.sys, promptUser: p.usr, lang,
        band: p.band === "fragile" ? "fragile" : "sound",
        maxAttempts: 4, // number-free is a strict new constraint; number-dense retired profiles need a few passes to fully strip digits (was 2)
        narrate: (sys, usr) => callAnthropic(sys, usr),
        onAttempt: (n, v) => console.log(`  [${key}] repair ${n}: ${v.findings.map((f: any) => f.slot + ":" + f.kind).join(", ")}`),
      });
      writeFileSync(join(ROOT, BASE, "responses", `${key}.json`), JSON.stringify(repair.ai, null, 2), "utf8");
      const secs = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`${key.padEnd(22)} narrationOk=${repair.verdict.ok} attempts=${repair.attempts} slots=${Object.values(repair.ai).filter(Boolean).length}/${p.slotKeys.length} (${secs}s)` +
        (repair.verdict.ok ? "" : ` [${repair.verdict.findings.map((f: any) => f.slot + ":" + f.kind).join(",")}]`));
    } catch (e: any) {
      console.error(`${key}: ERROR ${e?.message || e}`);
    }
  }
})();
