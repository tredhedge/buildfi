// planner/report/realai/ship-loop.ts
// ─────────────────────────────────────────────────────────────────────────────
// Bilan 360 SHIP LOOP — prod-faithful render + gate harness.
// Implements docs/BILAN360-SHIP-LOOP-SPEC.md. Runs the REAL production code
// path (translate → MC → extract → buildAIPrompt360 → render → gate) so the
// only substituted node is narration (supplied by Claude-the-agent, written to
// responses/{key}.json). Run with tsx:
//
//   npx tsx planner/report/realai/ship-loop.ts dump   [--base=DIR] [--only=ids]
//   (agent narrates prompts/*.json → responses/*.json)
//   npx tsx planner/report/realai/ship-loop.ts render [--base=DIR] [--only=ids]
//   npx tsx planner/report/realai/ship-loop.ts report [--base=DIR]
//
// MC is stochastic, so `dump` FREEZES the computed numbers to payload/{key}.json
// and `render` reuses them — guaranteeing the narration's numbers match the
// rendered numbers (no spurious provenance failures from run-to-run variance).
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// ── Renderer-agnostic LAB QA (REPORT-MODEL-CONSOLIDATION.md step 3) ──
// Load the lab's contract + arbiter + the renderer-AGNOSTIC auditors (they read
// canonical metrics + AI slots, not the DOM) via CJS require. We run only the
// safe subset on a pack built from the MODEL, so the deep numeric/semantic checks
// the prod gate misses apply to the real 360 report without any DOM coupling.
const _require = createRequire(import.meta.url);
const _reviewDir = path.resolve(process.cwd(), "planner/report/review");
const _contract = _require(path.join(_reviewDir, "review-contract.js"));
const _arbiter = _require(path.join(_reviewDir, "review-arbiter.js"));
function _loadAuditor(file: string): any {
  try { return _require(path.join(_reviewDir, "reviewers", file)); } catch { return null; }
}
// The renderer-AGNOSTIC subset (read canonical + AI slots + visible text, not the
// report-pdf.js DOM). The 7 DOM-coupled auditors (data/table/chart/action/depth/
// visual/trust) are intentionally NOT loaded — they belong to the renderer rewrite.
const _AGNOSTIC_AUDITORS: Array<{ label: string; mod: any }> = [
  { label: "canonical-quote", mod: _loadAuditor("canonical-quote-auditor.js") },
  { label: "risk-collapse", mod: _loadAuditor("risk-collapse-auditor.js") },
  { label: "language", mod: _loadAuditor("language-auditor.js") },
  { label: "compliance", mod: _loadAuditor("compliance-auditor.js") },
  { label: "narration", mod: _loadAuditor("narration-auditor.js") },
  { label: "thesis-coherence", mod: _loadAuditor("thesis-coherence-auditor.js") },
  { label: "scope-reconciliation", mod: _loadAuditor("scope-reconciliation-auditor.js") },
  { label: "polish", mod: _loadAuditor("polish-auditor.js") },
];
function _safeAudit(mod: any, pack: any, label: string): any[] {
  if (!mod || typeof mod.audit !== "function") return [];
  try { return mod.audit(pack) || []; }
  catch (e: any) {
    return [{ id: `auditor-error-${label}`, reviewer: label, severity: "minor", category: "auditor_error", message: `${label} threw: ${e?.message}`, fix_kind: "manual" }];
  }
}

// Build the canonical bag from a FLOORED mc (real wealth ≥0) so it agrees with the
// model — otherwise the lab's raw-mc canonical (negative for failing plans) would
// false-flag the correctly-floored narration. This is the same single-source fix.
function buildLabCanonical(mc: any, extraRuns: any): any {
  const floored = { ...mc };
  for (const k of ["rMedF", "rP5F", "rP25F", "rP75F", "rP95F", "medEstateNet", "medEstate"]) {
    if (Number.isFinite(Number(floored[k]))) floored[k] = Math.max(0, Number(floored[k]));
  }
  if (!floored._stress && extraRuns) {
    floored._stress = {
      crash08: extraRuns.mcStressCrash08, stagflation: extraRuns.mcStressStagflation, prolonged: extraRuns.mcStressProlonged,
    };
  }
  return _contract.buildCanonicalMetrics({ succVal: mc?.succ, mc: floored, _sensData: mc?._sensData });
}

function parseSections360(html: string): Array<{ id: string; title: string }> {
  const out: Array<{ id: string; title: string }> = [];
  const re = /id="(sec-[a-z0-9-]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(html || ""))) !== null) out.push({ id: m[1], title: m[1] });
  return out;
}

// Run the agnostic auditor subset on a model-derived pack; return a slim verdict.
function runLabQA(p: Persona, pl: any, ai: Record<string, any>, html: string) {
  const canonical = buildLabCanonical(pl.mcBase, pl.extraRuns);
  const pack = {
    profile: {
      id: p.id, lang: p.lang, sku: "bilan360", params: pl.params,
      case_driver: (p as any).case_driver || null,
      finLiteracy: p.prefs?.finLiteracy, stressLevel: p.prefs?.stressLevel, detailPref: p.prefs?.detailPref,
      client: p.client || {},
    },
    canonical, ai_slots: ai,
    sections: parseSections360(html),
    charts: [], percentages: [], revData: [], html, dPayload: {},
  };
  const findings = _AGNOSTIC_AUDITORS.map((a) => _safeAudit(a.mod, pack, a.label));
  const arb = _arbiter.arbitrate(findings);
  // canonical-quote stays ADVISORY (non-blocking), by design decision (Step 3, 2026-06-18):
  // its proximity concept-matcher assumes ONE canonical value per concept, but a real
  // report legitimately cites MANY — the overall success rate PLUS each strategy's
  // (79%, 85%…) PLUS each CPP-claim-age scenario's, and the overall median PLUS each
  // strategy's median. So it flags "79% ≠ 80%" when 79% is a strategy's rate. Tightening
  // (dropped P25/P75, narrowed the window) cut the noise but the multi-value ambiguity is
  // fundamental — promoting it to blocking would false-block any report that compares
  // strategies (the majority). The narration GUARDRAIL already enforces numeric integrity
  // (every number must trace to DATA by value+unit), so nothing fabricated ships. To make
  // canonical-quote blocking it would need prompt-level metric tagging (which number = which
  // concept) — tracked as future work. risk-collapse + the 6 text/compliance auditors gate.
  const ADVISORY_CATS = new Set(["canonical_quote_drift"]);
  const gating = arb.findings.filter((f: any) => !ADVISORY_CATS.has(f.category));
  const advisories = arb.findings.filter((f: any) => ADVISORY_CATS.has(f.category));
  const blockers = gating.filter((f: any) => f.severity === "blocker");
  const majors = gating.filter((f: any) => f.severity === "major");
  return {
    canShip: blockers.length === 0 && majors.length === 0,
    blockerCount: blockers.length, majorCount: majors.length,
    blockerCategories: blockers.map((f: any) => f.category),
    majorCategories: majors.map((f: any) => f.category),
    findings: gating.map((f: any) => ({ reviewer: f.reviewer, severity: f.severity, category: f.category, message: f.message })),
    advisories: advisories.map((f: any) => ({ category: f.category, reviewer: f.reviewer, message: f.message })),
    auditorsRun: _AGNOSTIC_AUDITORS.filter((a) => a.mod).map((a) => a.label),
  };
}
import { translateBilan360 } from "@/lib/quiz-translator-360";
import { runMC } from "@/lib/engine";
import { run5Strategies } from "@/lib/strategies-inter";
import {
  determinePhase,
  extractReportData360,
  renderReportHTML360,
} from "@/lib/report-html-360";
import { buildBuildFiData } from "@/lib/report-data-360";
import { buildAIPrompt360 } from "@/lib/ai-prompt-360";
import { sanitizeAISlots360, AI_SLOTS_360 } from "@/lib/ai-constants";
import { evaluateReportShip } from "@/lib/report-ship-gate";
import { evaluateNarration } from "@/lib/report-narration-guardrail";
// DATA-TRUTH gate (2026-07-02): invariants on the facts object + full-HTML
// locale/structure lint. This is the gate the "impossible gis report shipped
// as A+" defect proved was missing — it validates the NUMBERS, not the prose.
import { runCoherenceGate } from "@/lib/report-coherence-gate";

type Persona = {
  id: string;
  lang: "fr" | "en";
  phase?: string;
  prefs?: Record<string, any>;
  client?: Record<string, any>;
  answers: Record<string, any>;
};

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const mode = argv.find((a) => !a.startsWith("--")) || "dump";
const getOpt = (name: string, def: string) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : def;
};
const BASE = path.resolve(process.cwd(), getOpt("base", "planner/report/realai/corpus"));
const onlyArg = getOpt("only", "");
const ONLY = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim())) : null;

const dir = (d: string) => path.join(BASE, d);
const ensure = (d: string) => fs.mkdirSync(dir(d), { recursive: true });
const keyOf = (p: Persona) => `${p.id}_${p.lang}`;

function loadProfiles(): Persona[] {
  const f = path.join(BASE, "profiles.json");
  if (!fs.existsSync(f)) throw new Error(`No profiles.json in ${BASE}`);
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  const list: Persona[] = raw.profiles || raw;
  return ONLY ? list.filter((p) => ONLY.has(p.id) || ONLY.has(keyOf(p))) : list;
}

// ── ReportModel invariant validator (REPORT-MODEL-CONSOLIDATION.md step 2) ──
// Enforces the single-source invariants on the model (D): client wealth is REAL +
// floored ≥0, required fields present & finite, no NaN/undefined in the canon block.
// Lives here for now; promote into lib/report-data-360.ts (shared with the webhook)
// during consolidation step 1.
function validateReportModel(D: any): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const finite = (k: string) => {
    const v = D?.[k];
    if (v == null || !Number.isFinite(Number(v))) problems.push(`missing_or_nonfinite:${k}`);
  };
  ["successPct", "rMedF", "rP25F", "rP75F"].forEach(finite);
  if (D?.grade == null || String(D.grade).trim() === "") problems.push("missing:grade");
  // Real wealth must never be negative (floored at 0 at the model boundary).
  for (const k of ["rMedF", "rP5F", "rP25F", "rP75F", "rP95F"]) {
    const v = Number(D?.[k]);
    if (Number.isFinite(v) && v < 0) problems.push(`negative_wealth:${k}=${v}`);
  }
  // Canon block: no NaN/undefined leaking.
  const canon = D?.canon || {};
  for (const [k, v] of Object.entries(canon)) {
    if (Array.isArray(v)) { if (v.some((x) => !Number.isFinite(Number(x)))) problems.push(`canon_nonfinite:${k}`); }
    else if (v != null && typeof v === "number" && !Number.isFinite(v)) problems.push(`canon_nonfinite:${k}`);
  }
  return { ok: problems.length === 0, problems };
}

// ── The prod MC orchestration (mirrors app/api/webhook/route.ts handleBilan360Purchase) ──
// ship-loop 2026-06-18: deterministic per-profile seed. The engine honors params._seed
// (index.js ~908, "common random numbers"). Without it every dump re-runs 5000 sims with
// fresh randomness, the success/strategy numbers drift ±1-2%, and a narration written
// against the prior dump suddenly reads as foreign_number. Seeding makes dumps fully
// reproducible AND — because base, strategies and stress all share the seed (common random
// numbers) — makes statu_quo === base exactly, dissolving the 80/81 drift at its source.
function stableSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return (h >>> 0) || 1;
}

function computeProfile(p: Persona) {
  const quiz = p.answers as Record<string, any>;
  const lang = p.lang;
  const fr = lang === "fr";
  const age = Number(quiz.age) || 30;
  const retAge = Number(quiz.retAge) || 65;
  const phase = determinePhase(age, retAge);

  const seed = stableSeed(keyOf(p));
  const params = translateBilan360(quiz, phase);
  (params as any)._seed = seed;
  const mcBase = runMC(params, 5000);
  if (!mcBase) throw new Error(`MC baseline null for ${keyOf(p)}`);

  let stratData: any[] | null = null;
  let mcMelt1: any = null, mcMelt2: any = null;
  let mcC60: any = null, mcC65: any = null, mcC70: any = null;

  if (phase === "ACCUM" || phase === "TRANSITION") stratData = run5Strategies(params as any);

  if (phase === "TRANSITION" || phase === "DECUM") {
    const meltTarget: number = (params as any)._report?.meltTarget ?? 58523;
    const meltIsBase = !!(params as any)._report?.meltIsBase;
    if (!meltIsBase) {
      const melt2Target = Math.round(meltTarget * 0.75);
      mcMelt1 = runMC({ ...params, retIncome: meltTarget, retSpM: Math.round(meltTarget / 12) } as any, 1000);
      mcMelt2 = runMC({ ...params, retIncome: melt2Target, retSpM: Math.round(melt2Target / 12) } as any, 1000);
    }
  }

  if (phase === "TRANSITION" || phase === "DECUM") {
    const alreadyClaiming = quiz.qppAlreadyClaiming === true || quiz.qppAlreadyClaiming === "true";
    if (!alreadyClaiming) {
      const pC60 = { ...translateBilan360({ ...quiz, qppPlannedAge: 60, qppAlreadyClaiming: false }, phase), _seed: seed };
      const pC65 = { ...translateBilan360({ ...quiz, qppPlannedAge: 65, qppAlreadyClaiming: false }, phase), _seed: seed };
      const pC70 = { ...translateBilan360({ ...quiz, qppPlannedAge: 70, qppAlreadyClaiming: false }, phase), _seed: seed };
      mcC60 = runMC(pC60 as any, 1000);
      mcC65 = runMC(pC65 as any, 1000);
      mcC70 = runMC(pC70 as any, 1000);
    }
  }

  const stWhen = phase === "ACCUM" ? "ret" : "now";
  const mcStressCrash08 = runMC({ ...params, strs: "crash08", stWhen } as any, 1000);
  const mcStressStagflation = runMC({ ...params, strs: "stagflation", stWhen } as any, 1000);
  const mcStressProlonged = runMC({ ...params, strs: "prolonged", stWhen } as any, 1000);

  const extraRuns = { stratData, mcMelt1, mcMelt2, mcC60, mcC65, mcC70, mcStressCrash08, mcStressStagflation, mcStressProlonged };
  const D = extractReportData360(mcBase as any, params, phase, extraRuns);
  const buildfiData = buildBuildFiData(mcBase as any, params, phase, lang, extraRuns);
  const prompt = buildAIPrompt360(D as any, params, fr, quiz, phase, (stratData as any) || undefined);
  const band: "fragile" | "sound" = Number((mcBase as any).succ ?? 1) < 0.45 ? "fragile" : "sound";

  return { quiz, lang, fr, phase, params, mcBase, extraRuns, D, buildfiData, prompt, band };
}

// Phase-active slot keys (mirrors ai-prompt-360.ts §11 SLOT DEFINITIONS).
function activeSlots(phase: string): string[] {
  const base = [
    "biggest_risk", "best_lever", "snapshot_intro", "mirror_block", "revenue_analysis",
    "gov_explanation", "longevity_analysis", "priority_actions", "tax_analysis", "estate_analysis",
    "obs_1", "obs_1_title", "obs_2", "obs_2_title", "obs_3", "obs_3_title",
    "obs_4", "obs_4_title", "obs_5", "obs_5_title",
    "next_horizon", "model_blind_spots", "efficiency_gap", "couple_analysis", "property_analysis",
  ];
  if (phase === "ACCUM" || phase === "TRANSITION") base.push("savings_analysis", "what_if_analysis", "strategy_comparison", "fees_analysis");
  if (phase === "TRANSITION" || phase === "DECUM") base.push("cpp_timing", "spending_flex", "sequence_risk", "strengths_risks");
  if (phase === "DECUM") base.push("meltdown_analysis");
  return base.filter((k) => (AI_SLOTS_360 as readonly string[]).includes(k));
}

// ── Modes ────────────────────────────────────────────────────────────────────
function doDump() {
  ["prompts", "payload"].forEach(ensure);
  const profiles = loadProfiles();
  for (const p of profiles) {
    const key = keyOf(p);
    const t0 = Date.now();
    const c = computeProfile(p);
    fs.writeFileSync(path.join(dir("prompts"), `${key}.json`), JSON.stringify({
      id: p.id, key, lang: c.lang, phase: c.phase,
      grade: (c.D as any).grade, successPct: (c.D as any).successPct, band: c.band,
      slotKeys: activeSlots(c.phase),
      sys: c.prompt.sys, usr: c.prompt.usr,
    }, null, 2));
    // Freeze the numbers the prompt was built from so render reuses them.
    fs.writeFileSync(path.join(dir("payload"), `${key}.json`), JSON.stringify({
      key, lang: c.lang, phase: c.phase, band: c.band,
      params: c.params, mcBase: c.mcBase, extraRuns: c.extraRuns, D: c.D, buildfiData: c.buildfiData,
      promptUser: c.prompt.usr,
    }));
    console.log(`[dump] ${key.padEnd(28)} phase=${c.phase.padEnd(10)} grade=${String((c.D as any).grade).padEnd(2)} succ=${(c.D as any).successPct}% band=${c.band} (${Date.now() - t0}ms)`);
  }
  console.log(`[dump] ${profiles.length} profiles → ${dir("prompts")} + ${dir("payload")}`);
}

// Rebuild ONLY the prompt + guardrail pool from the FROZEN payload (no MC re-run),
// so existing narration stays number-consistent after a prompt-side fix.
function doReprompt() {
  const profiles = loadProfiles();
  for (const p of profiles) {
    const key = keyOf(p);
    const plF = path.join(dir("payload"), `${key}.json`);
    if (!fs.existsSync(plF)) { console.warn(`[reprompt] SKIP ${key} — no payload`); continue; }
    const pl = JSON.parse(fs.readFileSync(plF, "utf8"));
    const fr = pl.lang === "fr";
    const stratData = pl.extraRuns?.stratData || undefined;
    // Recompute D + buildfiData from the FROZEN mcBase (no MC re-run) so renderer/
    // extract-layer fixes take effect deterministically without changing the numbers
    // the narration was written against.
    const D = extractReportData360(pl.mcBase, pl.params, pl.phase, pl.extraRuns);
    const buildfiData = buildBuildFiData(pl.mcBase, pl.params, pl.phase, pl.lang, pl.extraRuns);
    const prompt = buildAIPrompt360(D, pl.params, fr, p.answers, pl.phase, stratData);
    pl.D = D; pl.buildfiData = buildfiData; pl.promptUser = prompt.usr;
    fs.writeFileSync(plF, JSON.stringify(pl));
    const prF = path.join(dir("prompts"), `${key}.json`);
    if (fs.existsSync(prF)) {
      const pr = JSON.parse(fs.readFileSync(prF, "utf8"));
      pr.sys = prompt.sys; pr.usr = prompt.usr; pr.slotKeys = activeSlots(pl.phase);
      fs.writeFileSync(prF, JSON.stringify(pr, null, 2));
    }
    console.log(`[reprompt] ${key} — prompt + guardrail pool refreshed (MC frozen)`);
  }
}

function doRender() {
  ["out", "verdicts"].forEach(ensure);
  const profiles = loadProfiles();
  for (const p of profiles) {
    const key = keyOf(p);
    const payloadF = path.join(dir("payload"), `${key}.json`);
    const respF = path.join(dir("responses"), `${key}.json`);
    if (!fs.existsSync(payloadF)) { console.warn(`[render] SKIP ${key} — no payload (run dump first)`); continue; }
    const pl = JSON.parse(fs.readFileSync(payloadF, "utf8"));
    const rawNarration = fs.existsSync(respF) ? JSON.parse(fs.readFileSync(respF, "utf8")) : {};
    const ai = sanitizeAISlots360(rawNarration);

    const html = renderReportHTML360(
      pl.D, pl.mcBase, pl.params, pl.lang, ai, pl.phase, `${key}-fbk`, pl.extraRuns, pl.buildfiData, { clientExport: false }
    );
    fs.writeFileSync(path.join(dir("out"), `${key}.html`), html);

    // ── PROD-side gate (mirrors webhook exactly) ──
    const narr = evaluateNarration({ aiSlots: ai, promptUser: pl.promptUser, lang: pl.lang, band: pl.band });
    const ship = evaluateReportShip(html, pl.lang, { coreInvalid: pl.D?._integrity?.coreInvalid === true });
    const slotsReturned = Object.keys(ai).filter((k) => ai[k] && String(ai[k]).trim()).length;
    const slotsExpected = activeSlots(pl.phase).length;
    const model = validateReportModel(pl.D);
    const lab = runLabQA(p, pl, ai, html);
    // Data-truth gate: numbers must be internally coherent AND plausible
    // BEFORE any prose-level pass matters. Blocks prodPass.
    const coherence = runCoherenceGate(pl.D, pl.params, html, pl.lang);

    const prodPass = ship.ok && narr.ok && model.ok && coherence.ok;
    const verdict = {
      key, lang: pl.lang, phase: pl.phase, band: pl.band,
      grade: pl.D?.grade, successPct: pl.D?.successPct,
      model: { valid: model.ok, problems: model.problems },
      coherence: {
        ok: coherence.ok,
        blockers: coherence.blockers.map((b) => ({ id: b.id, message: b.message, expected: b.expected, actual: b.actual })),
        warnings: coherence.warnings.map((w) => ({ id: w.id, message: w.message, expected: w.expected, actual: w.actual })),
      },
      prod: {
        shipOk: ship.ok, shipReasons: ship.reasons,
        narrationOk: narr.ok, narrationFindings: narr.findings,
        pass: prodPass,
      },
      narrationCoverage: { returned: slotsReturned, expected: slotsExpected, emptySlots: slotsExpected - slotsReturned },
      htmlBytes: html.length,
      lab, // renderer-agnostic auditor subset (canonical-quote, risk-collapse)
      fullPass: prodPass && lab.canShip,
    };
    fs.writeFileSync(path.join(dir("verdicts"), `${key}.json`), JSON.stringify(verdict, null, 2));
    const tag = verdict.fullPass ? "FULL-PASS" : (prodPass ? "LAB-FAIL " : "PROD-FAIL");
    console.log(`[render] ${key.padEnd(28)} ${tag} ship=${ship.ok} narr=${narr.ok} model=${model.ok} data=${coherence.ok} lab=${lab.canShip} slots=${slotsReturned}/${slotsExpected}` +
      `${ship.ok ? "" : " [" + ship.reasons.join(",") + "]"}${narr.ok ? "" : " narr:[" + narr.findings.map((f: any) => f.slot + ":" + f.kind).join(",") + "]"}` +
      `${coherence.ok ? "" : " data:[" + coherence.blockers.map((b) => b.id).join(",") + "]"}` +
      `${lab.canShip ? "" : " lab:[" + [...lab.blockerCategories, ...lab.majorCategories].join(",") + "]"}`);
  }
}

function doReport() {
  const vdir = dir("verdicts");
  if (!fs.existsSync(vdir)) { console.error("no verdicts/ — run render first"); process.exit(1); }
  const files = fs.readdirSync(vdir).filter((f) => f.endsWith(".json"));
  const verdicts = files.map((f) => JSON.parse(fs.readFileSync(path.join(vdir, f), "utf8")));
  const n = verdicts.length;
  const prodPass = verdicts.filter((v) => v.prod?.pass).length;
  const labPass = verdicts.filter((v) => v.lab?.canShip).length;
  const fullPass = verdicts.filter((v) => v.prod?.pass && (v.lab == null || v.lab.canShip)).length;

  // Bucket failures by class.
  const buckets: Record<string, { count: number; examples: string[] }> = {};
  const bump = (cls: string, key: string) => {
    buckets[cls] = buckets[cls] || { count: 0, examples: [] };
    buckets[cls].count++;
    if (buckets[cls].examples.length < 5) buckets[cls].examples.push(key);
  };
  for (const v of verdicts) {
    if (v.coherence && !v.coherence.ok) (v.coherence.blockers || []).forEach((b: any) => bump(`data:${b.id}`, v.key));
    if (v.model && !v.model.valid) (v.model.problems || []).forEach((p: string) => bump(`model:${p.split(":")[0]}`, v.key));
    if (!v.prod?.shipOk) (v.prod.shipReasons || []).forEach((r: string) => bump(`prod_ship:${r}`, v.key));
    if (!v.prod?.narrationOk) (v.prod.narrationFindings || []).forEach((f: any) => bump(`narration:${f.kind}`, v.key));
    if (v.narrationCoverage?.emptySlots > 0) bump(`coverage:empty_slots`, v.key);
    if (v.lab && !v.lab.canShip) (v.lab.blockerCategories || []).forEach((c: string) => bump(`lab:${c}`, v.key));
  }

  const report = {
    base: BASE, profiles: n,
    prodPassRate: n ? +(100 * prodPass / n).toFixed(1) : 0,
    labPassRate: n ? +(100 * labPass / n).toFixed(1) : 0,
    fullPassRate: n ? +(100 * fullPass / n).toFixed(1) : 0,
    prodPass, labPass, fullPass,
    failureClasses: Object.entries(buckets).sort((a, b) => b[1].count - a[1].count)
      .map(([cls, info]) => ({ class: cls, count: info.count, examples: info.examples })),
  };
  fs.writeFileSync(path.join(BASE, "corpus-report.json"), JSON.stringify(report, null, 2));

  const lines: string[] = [];
  lines.push(`# Bilan 360 ship-loop — run report`, ``);
  lines.push(`Profiles: **${n}**  |  prod-pass: **${report.prodPassRate}%** (${prodPass}/${n})  |  full-pass (prod+lab): **${report.fullPassRate}%** (${fullPass}/${n})`, ``);
  lines.push(`## Failure classes (most frequent first)`, ``);
  if (report.failureClasses.length === 0) lines.push(`_none_`);
  for (const fc of report.failureClasses) lines.push(`- \`${fc.class}\` × **${fc.count}** — e.g. ${fc.examples.join(", ")}`);
  lines.push(``, `## Per-profile`, ``);
  for (const v of verdicts.sort((a, b) => a.key.localeCompare(b.key))) {
    const tag = v.prod?.pass ? (v.lab == null || v.lab.canShip ? "✅" : "⚠️ lab") : "❌ prod";
    lines.push(`- ${tag} \`${v.key}\` (${v.phase}, grade ${v.grade}, ${v.successPct}%) — slots ${v.narrationCoverage?.returned}/${v.narrationCoverage?.expected}`);
  }
  fs.writeFileSync(path.join(BASE, "dashboard.md"), lines.join("\n"));
  console.log(`[report] prod-pass ${report.prodPassRate}%  full-pass ${report.fullPassRate}%  (${n} profiles)`);
  console.log(`[report] → ${path.join(BASE, "corpus-report.json")} + dashboard.md`);
  for (const fc of report.failureClasses) console.log(`  ${fc.class.padEnd(34)} ×${fc.count}  ${fc.examples.slice(0, 3).join(", ")}`);

  // CI gate: --min=N exits non-zero if the full dual-gate pass rate drops below N.
  const min = Number(getOpt("min", "0"));
  if (min > 0 && report.fullPassRate < min) {
    console.error(`[report] FAIL: full-pass ${report.fullPassRate}% < required ${min}% — a regression introduced a new failure class.`);
    process.exit(1);
  }
}

// ── Dispatch ─────────────────────────────────────────────────────────────────
console.log(`[ship-loop] mode=${mode} base=${BASE}${ONLY ? " only=" + [...ONLY].join(",") : ""}`);
if (mode === "dump") doDump();
else if (mode === "reprompt") doReprompt();
else if (mode === "render") doRender();
else if (mode === "report") doReport();
else if (mode === "all") { doDump(); doRender(); doReport(); }
else { console.error(`unknown mode: ${mode}`); process.exit(1); }
