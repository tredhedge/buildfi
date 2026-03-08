// tests/report-shared.test.ts
// ══════════════════════════════════════════════════════════════════════
// Tests for lib/report-shared.ts — shared report helpers
// ══════════════════════════════════════════════════════════════════════
// Run: npx tsx tests/report-shared.test.ts

import assert from "node:assert/strict";
import {
  gradeFromSuccess,
  gradeColor,
  gradeLabel,
  successColor,
  fmtDollars,
  fmtNumber,
  fmtPct,
  fmtPctRaw,
  fmtPctInt,
  escHtml,
  probTranslation,
} from "../lib/report-shared";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(label: string, actual: unknown, expected: unknown) {
  try {
    assert.deepStrictEqual(actual, expected);
    pass++;
  } catch {
    fail++;
    failures.push(`  FAIL: ${label}\n    got:      ${JSON.stringify(actual)}\n    expected: ${JSON.stringify(expected)}`);
  }
}

function checkIncludes(label: string, actual: string, substr: string) {
  if (actual.includes(substr)) {
    pass++;
  } else {
    fail++;
    failures.push(`  FAIL: ${label}\n    "${actual}" does not include "${substr}"`);
  }
}

// ── gradeFromSuccess ─────────────────────────────────────────────────

console.log("═══ gradeFromSuccess ═══");
check("95 → A+", gradeFromSuccess(95), "A+");
check("100 → A+", gradeFromSuccess(100), "A+");
check("85 → A", gradeFromSuccess(85), "A");
check("94 → A", gradeFromSuccess(94), "A");
check("75 → B+", gradeFromSuccess(75), "B+");
check("65 → B", gradeFromSuccess(65), "B");
check("55 → C+", gradeFromSuccess(55), "C+");
check("45 → C", gradeFromSuccess(45), "C");
check("35 → D", gradeFromSuccess(35), "D");
check("34 → F", gradeFromSuccess(34), "F");
check("0 → F", gradeFromSuccess(0), "F");

// ── gradeColor ───────────────────────────────────────────────────────

console.log("═══ gradeColor ═══");
check("A+ → green", gradeColor("A+"), "#2A8C46");
check("A → green", gradeColor("A"), "#2A8C46");
check("B+ → blue", gradeColor("B+"), "#4680C0");
check("B → blue", gradeColor("B"), "#4680C0");
check("C+ → amber", gradeColor("C+"), "#E0882A");
check("C → amber", gradeColor("C"), "#E0882A");
check("D → red", gradeColor("D"), "#CC4444");
check("F → red", gradeColor("F"), "#CC4444");

// ── gradeLabel ───────────────────────────────────────────────────────

console.log("═══ gradeLabel ═══");
check("90 FR → Très solide", gradeLabel(90, true), "Très solide");
check("90 EN → Very solid", gradeLabel(90, false), "Very solid");
check("70 FR → Solide", gradeLabel(70, true), "Solide");
check("50 FR → Fragile", gradeLabel(50, true), "Fragile");
check("30 FR → À corriger", gradeLabel(30, true), "À corriger");
check("30 EN → Needs attention", gradeLabel(30, false), "Needs attention");

// ── successColor ─────────────────────────────────────────────────────

console.log("═══ successColor ═══");
check("0.95 → green", successColor(0.95), "#2A8C46");
check("0.90 → green", successColor(0.90), "#2A8C46");
check("0.75 → amber", successColor(0.75), "#B89830");
check("0.60 → red", successColor(0.60), "#CC4444");

// ── fmtNumber ────────────────────────────────────────────────────────

console.log("═══ fmtNumber ═══");
// Just verify it doesn't crash and produces locale-formatted output
check("fmtNumber(1234, true) is string", typeof fmtNumber(1234, true), "string");
check("fmtNumber(1234, false) is string", typeof fmtNumber(1234, false), "string");

// ── fmtDollars ───────────────────────────────────────────────────────

console.log("═══ fmtDollars ═══");
check("null → dash", fmtDollars(null as any, true), "\u2014");
check("NaN → dash", fmtDollars(NaN, false), "\u2014");
checkIncludes("positive includes $", fmtDollars(1000, true), "$");
checkIncludes("negative includes minus", fmtDollars(-500, true), "\u2212");

// ── fmtPct / fmtPctRaw ──────────────────────────────────────────────

console.log("═══ fmtPct / fmtPctRaw ═══");
check("fmtPct(4.5) → '4.5 %'", fmtPct(4.5), "4.5 %");
check("fmtPct(4.0) → '4 %'", fmtPct(4.0), "4 %");
check("fmtPctRaw(4.56) → 4.6", fmtPctRaw(4.56), 4.6);
check("fmtPctRaw(4.0) → 4", fmtPctRaw(4.0), 4);
check("fmtPctInt(0.72) → '72%'", fmtPctInt(72), "72%");

// ── escHtml ──────────────────────────────────────────────────────────

console.log("═══ escHtml ═══");
check("escHtml empty", escHtml(""), "");
check("escHtml null", escHtml(null as any), "");
check("escHtml <b>", escHtml("<b>test</b>"), "&lt;b&gt;test&lt;/b&gt;");
check("escHtml &", escHtml("A & B"), "A &amp; B");
check('escHtml "', escHtml('"hello"'), "&quot;hello&quot;");

// ── probTranslation ─────────────────────────────────────────────────

console.log("═══ probTranslation ═══");

// Accumulation tier (Ess/Inter)
checkIncludes("0% FR accum → totalité", probTranslation(0, true, "accumulation"), "totalité");
checkIncludes("0% FR accum → épargne", probTranslation(0, true, "accumulation"), "épargne");
checkIncludes("50% EN accum → 1 out of 2", probTranslation(50, false, "accumulation"), "1 out of 2");
checkIncludes("80% FR accum → 1 scénario sur 10", probTranslation(80, true, "accumulation"), "1 scénario sur 10");
checkIncludes("100% EN accum → all simulated", probTranslation(100, false, "accumulation"), "all simulated scenarios");

// Decumulation tier — different wording
checkIncludes("0% FR decum → insuffisant", probTranslation(0, true, "decumulation"), "insuffisant");
checkIncludes("5% FR decum → ajustements", probTranslation(5, true, "decumulation"), "ajustements");
checkIncludes("100% FR decum → totalité", probTranslation(100, true, "decumulation"), "totalité");

// Both tiers converge for high success
checkIncludes("95% FR accum → grande majorité", probTranslation(95, true, "accumulation"), "grande majorité");
checkIncludes("95% FR decum → grande majorité", probTranslation(95, true, "decumulation"), "grande majorité");

// All 9 brackets covered
const brackets = [0, 5, 20, 35, 50, 60, 80, 95, 100];
for (const pct of brackets) {
  const textFr = probTranslation(pct, true, "accumulation");
  const textEn = probTranslation(pct, false, "accumulation");
  check(`bracket ${pct}% FR is string`, typeof textFr, "string");
  check(`bracket ${pct}% EN is string`, typeof textEn, "string");
  checkIncludes(`bracket ${pct}% FR starts with 'Autrement'`, textFr, "Autrement");
  checkIncludes(`bracket ${pct}% EN starts with 'In other'`, textEn, "In other");
}

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`report-shared.ts: ${pass} pass, ${fail} fail (${pass + fail} total)`);
if (failures.length > 0) {
  console.log("\nFAILURES:");
  failures.forEach(f => console.log(f));
  process.exit(1);
} else {
  console.log("All tests pass. ✓");
}
