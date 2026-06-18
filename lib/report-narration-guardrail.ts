// lib/report-narration-guardrail.ts
// Production guardrail for the FINISHED AI narration of a report. Runs after MC
// + AI narration are produced (the only point where the real content exists) and
// before delivery. Validates the narration on four axes — the honest "guardrails
// that work":
//
//   1. ACCURACY (unit-aware provenance): every number the AI states must be
//      GROUNDED in a number the model was given, MATCHED WITHIN ITS UNIT — a
//      dollar amount can only be grounded by a dollar value, a percent by a
//      percent, an age/year by an age/year. A "$70" and a "70 %" and "70 years"
//      are NOT interchangeable. Catches fabricated numbers AND unit confusion.
//   2. LOGIC (consistency): a fragile success band must not be narrated with
//      "on track / solid / durable" prose (without a qualifier).
//   3. COMPLIANCE: the production AMF FORBIDDEN_TERMS (single source) + FR
//      engineering jargon ("meltdown") in the actual AI text.
//   4. COMPLETENESS: no empty required slot, unsubstituted [[PLACEHOLDER]],
//      undefined / NaN, locale acronym leak, or currency-format leak.
//
// PROVENANCE design (audit 2026-06-17): the prompt DATA block is raw JSON
// (e.g. {"results":{"pct":70,"med":99874},"gov":{"oas":742}}) — values carry NO
// unit on the number itself, only via their schema key. So we parse the DATA
// JSON and classify each value's unit from its key/path (money / pct / ageYears /
// ratio). Narration numbers get their unit from DECORATION ($, K$, %, "ans"/
// "years"). A decorated number is grounded only by a same-unit value (with a
// small rounding tolerance, since narration rounds 99,874 → "~100 K$"). Undecorated
// bare numbers match any pool (lenient — avoids false-positives on plain counts).
// This makes every value identifiable by its unit while still favouring delivery.
// Severity drives the caller: only BLOCKERS force the human fallback; MAJORS are
// repair-attempted but never block.
//
// Pure functions (no fs / no framework) so it is unit-testable and runs inside
// the webhook budget.

import { FORBIDDEN_TERMS } from "./ai-constants";

export type NarrationSeverity = "blocker" | "major";
export type Unit = "money" | "pct" | "ageYears" | "ratio" | "generic";

export interface NarrationFinding {
  slot: string;
  kind: string;
  detail: string;
  severity: NarrationSeverity;
}

export interface NarrationVerdict {
  ok: boolean;
  /** True when no BLOCKER findings remain — the signal the caller uses to hold/ship. */
  okToShip: boolean;
  findings: NarrationFinding[];
  /** Distinct slots with at least one finding — what auto-repair should regenerate. */
  repairableSlots: string[];
}

// ── Number parsing (FR + EN) ────────────────────────────────────────────────
const SPACES = /[    ]/g; // space / NBSP / narrow-NBSP / thin

function parseLocaleNumber(s: string, lang: "fr" | "en"): number {
  let t = String(s).replace(SPACES, ""); // strip thousands spaces/NBSP
  if (lang === "fr") t = t.replace(/\./g, "").replace(",", "."); // FR: comma decimal
  else t = t.replace(/,/g, ""); // EN: comma thousands
  return parseFloat(t);
}

// ── DATA-side: classify each schema value's unit by key/path ────────────────
function classifyKey(parent: string, key: string): Unit {
  const k = key.toLowerCase();
  const p = (parent || "").toLowerCase();
  if (/^(age|retage|cage|avgdeath|deathage|qppage|oasage|cretage)$/.test(k)) return "ageYears";
  if (/(years|yrs|months)$/.test(k) || /^(yrstoret|retirementyears|coverageyears|bridgeyears)$/.test(k)) return "ageYears";
  if (/^(mer|ratio)$/.test(k)) return "ratio";
  if (/^(pct|cover|succ|savingsrate|wd|longevity|divers)$/.test(k)) return "pct";
  if (/rate$|score$/.test(k)) return "pct";
  if (p === "tax" && /^(curr|ret|marg)$/.test(k)) return "pct";
  if (p === "scores") return "pct";
  if (/^p\d+/.test(k) || /favorable$/.test(k) || /estate$/.test(k) || /wealth$/.test(k) || /^medf?$/.test(k)) return "money";
  if (/^(med|cost|retbal|rrsp|tfsa|nr|lira|monthlycontrib|contrib|pension|qpp|oas|gap|bridgecost|mo|total|sal|income|debt|bal|amount|value)$/.test(k)) return "money";
  return "generic";
}

interface Pools {
  money: number[];
  pct: number[];
  ageYears: number[];
  ratio: number[];
  generic: number[];
  parsed: boolean;
}

function emptyPools(): Pools {
  return { money: [], pct: [], ageYears: [], ratio: [], generic: [], parsed: false };
}

function walk(node: any, parentKey: string, pools: Pools): void {
  if (node == null) return;
  if (typeof node === "number" && Number.isFinite(node)) {
    pools[classifyKey(parentKey, parentKey)].push(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const v of node) walk(v, parentKey, pools);
    return;
  }
  if (typeof node === "object") {
    for (const [key, v] of Object.entries(node)) {
      if (typeof v === "number" && Number.isFinite(v)) pools[classifyKey(parentKey, key)].push(v);
      else walk(v, key, pools);
    }
  }
}

/** Build unit-classified allowed pools from the prompt's DATA JSON block. */
function buildPools(promptUser: string, lang: "fr" | "en"): Pools {
  const pools = emptyPools();
  const m = String(promptUser || "").match(/=== DATA ===\s*([\s\S]*?)(?:\n\n=== |$)/);
  if (m) {
    try {
      walk(JSON.parse(m[1].trim()), "", pools);
      pools.parsed = true;
      return pools;
    } catch {
      /* fall through to flat extraction */
    }
  }
  // Fallback (e.g. tests / non-JSON DATA): every number → generic, lenient.
  const NUM = /(\$\s?)?(\d[\d.,\s]*\d|\d)\s?(k\$|K\$|M\$|m\$|%|K|k|M)?/gi;
  for (const x of String(promptUser || "").matchAll(NUM)) {
    const v = parseLocaleNumber(x[2], lang);
    if (!Number.isFinite(v)) continue;
    const suf = (x[3] || "").toLowerCase();
    let val = v;
    if (suf === "k" || suf === "k$") val = v * 1_000;
    else if (suf === "m" || suf === "m$") val = v * 1_000_000;
    pools.generic.push(val);
  }
  return pools;
}

// ── Narration-side: number + unit from decoration ──────────────────────────
// Bug fix (ship-loop 2026-06-18): the magnitude group is case-insensitive, so the
// BARE k/K/M alternatives used to match the first LETTER of a following word —
// "12 mois" → 12×M = 12 000 000; "$4,378 monthly" → 4.38 billion — fabricating
// huge "foreign" numbers the guardrail then rejected (hit every next_horizon
// "dans 12 mois"). Guard the bare suffixes with a negative lookahead so they fire
// only as true magnitudes ("$1.2M", "5k "), never as a word's leading letter.
const LETTER = "(?![A-Za-z\\u00C0-\\u024F])";
const TOK_RE = new RegExp(
  "(\\$\\s?)?(\\d[\\d.,    ]*\\d|\\d)\\s?" +
  "(k\\$|K\\$|M\\$|m\\$|%|K" + LETTER + "|k" + LETTER + "|M" + LETTER + "|millions?|thousands?)?" +
  "\\s*(ans?|années?|year|years|yr|yrs|mois|month|months)?",
  "gi"
);

interface NarrNum { value: number; unit: Unit; bare: boolean; }

function extractNarrationNumbers(text: string, lang: "fr" | "en"): NarrNum[] {
  if (!text) return [];
  const cleaned = String(text).replace(/\b[Pp]\d{1,3}\b/g, " "); // drop P25/p5 labels
  const out: NarrNum[] = [];
  for (const m of cleaned.matchAll(TOK_RE)) {
    const raw = m[2];
    if (raw == null) continue;
    // Bug fix (ship-loop 2026-06-18): the tokenizer's separator class allows a comma
    // followed by a space, so an inline LIST like "60, 65, or 70" (CPP claim ages)
    // merged into "6065". A real number never has a comma immediately followed by
    // whitespace (thousands sep is comma+digit or space+digit) — so skip list joins.
    if (/,[    ]/.test(raw)) continue;
    const v = parseLocaleNumber(raw, lang);
    if (!Number.isFinite(v)) continue;
    const moneyMag = (m[3] || "").toLowerCase();
    const timeWord = (m[4] || "").toLowerCase();
    const hasDollar = !!m[1] || /\$/.test(moneyMag);
    let value = v;
    let unit: Unit = "generic";
    let bare = false;
    if (moneyMag === "k" || moneyMag === "k$" || /^thousands?$/.test(moneyMag)) { value = v * 1_000; unit = "money"; }
    else if (moneyMag === "m" || moneyMag === "m$" || /^millions?$/.test(moneyMag)) { value = v * 1_000_000; unit = "money"; }
    else if (moneyMag === "%") unit = "pct";
    else if (hasDollar) unit = "money";
    else if (timeWord) unit = "ageYears";
    else bare = true;
    out.push({ value, unit, bare });
  }
  return out;
}

const DOMAIN_AGES = new Set([18, 60, 65, 66, 67, 70, 71, 72]);

function near(n: number, arr: number[], relTol: number): boolean {
  for (const d of arr) if (Math.abs(n - d) <= Math.max(1, relTol * Math.abs(d))) return true;
  return false;
}

/** Is a narrated number grounded by a same-unit value the model was given? */
function isGrounded(nn: NarrNum, pools: Pools): boolean {
  const { value: n, unit, bare } = nn;
  // Years / dates and small counts are always acceptable.
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return true;
  if (bare && Number.isInteger(n) && n >= 0 && n <= 12) return true;
  if ((bare || unit === "ageYears") && DOMAIN_AGES.has(n)) return true;

  if (unit === "money") return near(n, pools.money, 0.02) || near(n, pools.generic, 0.02);
  if (unit === "pct") return near(n, pools.pct, 0.02) || near(n, pools.ratio.map((r) => r * 100), 0.05) || near(n, pools.generic, 0.02);
  if (unit === "ageYears") return near(n, pools.ageYears, 0.02) || near(n, pools.generic, 0.02);
  if (unit === "ratio") return near(n, pools.ratio, 0.05) || near(n, pools.pct.map((p) => p / 100), 0.05) || near(n, pools.generic, 0.05);
  // bare / undecorated: lenient — match ANY pool (avoids false-positives on plain counts).
  return (
    near(n, pools.ageYears, 0.02) || near(n, pools.generic, 0.02) ||
    near(n, pools.money, 0.02) || near(n, pools.pct, 0.02) || near(n, pools.ratio, 0.05)
  );
}

const FRAGILE_EN = /\b(solid|robust|strong|durable|on track|comfortable|secure|healthy|well[- ]positioned|in good shape|on solid footing|with confidence)\b/i;
const FRAGILE_FR = /\b(solide|robuste|fort|fiable|stable|sain|confortable|durable|en bonne voie|bien parti|rassurant|sans inquiétude|au beau fixe)\b/i;
const QUALIFIER = /\b(but|though|yet|however|while|although|mais|toutefois|cependant|tandis|bien que|malgré)\b/i;
const LEAK_EN_IN_FR = /\b(OAS|RRIF|CPP|GIS)\b/;
const LEAK_FR_IN_EN = /\b(PSV|FERR|RRQ|SRG)\b/;
const GLOSS =
  /(PSV\s*[\/(]\s*OAS|OAS\s*[\/(]\s*PSV|RRQ\s*[\/(]\s*(RPC|CPP)|(RPC|CPP)\s*[\/(]\s*RRQ|SRG\s*[\/(]\s*GIS|GIS\s*[\/(]\s*SRG|FERR\s*[\/(]\s*RRIF|RRIF\s*[\/(]\s*FERR|CELI\s*[\/(]\s*TFSA|TFSA\s*[\/(]\s*CELI|REER\s*[\/(]\s*RRSP|RRSP\s*[\/(]\s*REER)/i;
const FMT_LEAK_EN_IN_FR = /\$\s?\d/;
const FMT_LEAK_FR_IN_EN = /\d[  ]\d{3}\s?\$|\d,\d{1,2}\s?%/;
const FR_JARGON_MELTDOWN = /\bmeltdown\b/i;

const OPENING_SLOTS = new Set([
  "snapshot_intro", "mirror_block", "biggest_risk", "next_horizon",
  "overall_assessment", "verdict", "synthesis", "executive_summary",
  "sommaire_executif", "diagnostic_robustesse",
]);

export function evaluateNarration(opts: {
  aiSlots: Record<string, string | undefined>;
  promptUser: string;
  lang: "fr" | "en";
  band?: "fragile" | "sound";
  requiredSlots?: string[];
}): NarrationVerdict {
  const { aiSlots, promptUser, lang } = opts;
  const fragile = opts.band === "fragile";
  const findings: NarrationFinding[] = [];
  const pools = buildPools(promptUser || "", lang);

  for (const slot of opts.requiredSlots || []) {
    const v = aiSlots[slot];
    if (v == null || String(v).trim() === "") {
      findings.push({ slot, kind: "empty_required_slot", detail: "missing or empty", severity: "blocker" });
    }
  }

  for (const [slot, raw] of Object.entries(aiSlots)) {
    if (typeof raw !== "string" || raw.trim() === "") continue;
    const text = raw;

    if (/\[\[[A-Z_]+\]\]/.test(text)) {
      findings.push({ slot, kind: "unsubstituted_placeholder", detail: (text.match(/\[\[[A-Z_]+\]\]/) || [""])[0], severity: "blocker" });
    }
    if (/\bundefined\b|\bNaN\b/.test(text)) {
      findings.push({ slot, kind: "undefined_or_nan", detail: (text.match(/\bundefined\b|\bNaN\b/) || [""])[0], severity: "blocker" });
    }

    // 1. ACCURACY — unit-aware provenance.
    const foreign = extractNarrationNumbers(text, lang).filter((nn) => !isGrounded(nn, pools));
    if (foreign.length) {
      const detail = [...new Set(foreign.map((f) => `${f.value}${f.unit !== "generic" ? "@" + f.unit : ""}`))].slice(0, 8).join(", ");
      findings.push({ slot, kind: "foreign_number", detail, severity: "blocker" });
    }

    // 2. LOGIC — band/direction (major).
    if (fragile && OPENING_SLOTS.has(slot)) {
      const re = lang === "fr" ? FRAGILE_FR : FRAGILE_EN;
      const m = text.match(re);
      if (m && !QUALIFIER.test(text)) {
        findings.push({ slot, kind: "direction_violation", detail: `"${m[0]}" with fragile band`, severity: "major" });
      }
    }

    // 3. COMPLIANCE — production AMF terms (single source) + FR jargon.
    FORBIDDEN_TERMS.lastIndex = 0;
    const amf = FORBIDDEN_TERMS.exec(text);
    FORBIDDEN_TERMS.lastIndex = 0;
    if (amf) findings.push({ slot, kind: "amf_banned_stem", detail: amf[0], severity: "blocker" });
    if (lang === "fr" && FR_JARGON_MELTDOWN.test(text)) {
      findings.push({ slot, kind: "fr_jargon_meltdown", detail: "meltdown", severity: "blocker" });
    }

    // 4. Locale / format leaks (major).
    const leak = (lang === "fr" ? LEAK_EN_IN_FR : LEAK_FR_IN_EN).exec(text);
    if (leak && !GLOSS.test(text)) findings.push({ slot, kind: "locale_leak", detail: leak[0], severity: "major" });
    const fmt = (lang === "fr" ? FMT_LEAK_EN_IN_FR : FMT_LEAK_FR_IN_EN).exec(text);
    if (fmt) findings.push({ slot, kind: "format_leak", detail: fmt[0].trim(), severity: "major" });
  }

  const repairableSlots = [...new Set(findings.map((f) => f.slot))];
  const hasBlocker = findings.some((f) => f.severity === "blocker");
  return { ok: findings.length === 0, okToShip: !hasBlocker, findings, repairableSlots };
}
