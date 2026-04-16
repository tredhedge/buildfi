#!/usr/bin/env node
// sprint9/check-cross-section-consistency.js
//
// Cross-section numerical consistency checks. Every persona report quotes the
// same core numbers (success rate, grade, wealth band) in multiple places —
// KPI strip, header, AI narrative, decision card. A rendering bug or stale
// substitution can make these diverge silently; the structural gates
// (sprint0/sprint6) won't catch it.
//
// Checks applied per report:
//   1. Grade letter in the document matches BFmt.grade(successRate).letter.
//   2. AI narrative "taux de succès de X%"/"X% success rate" matches KPI.
//   3. P50 wealth in KPI appears at least once in the body.
//
// Run: node planner/report/hardening/sprint9/check-cross-section-consistency.js

"use strict";

const fs = require("fs");
const path = require("path");

const REPORT_DIR = path.resolve(__dirname, "..", "..");
const TEST_OUTPUT_DIR = path.join(REPORT_DIR, "test-output");

const PROFILE_IDS = [
  "young_accum", "couple_transition", "retiree_decum", "fire_seeker",
  "low_income_gis", "ccpc_owner", "real_estate", "hnw_couple",
  "debt_young", "rsu_tech"
];

// Mirror BFmt.grade ladder (intentional duplication to keep this gate
// independent from the formatter under test — if they drift, we want this to
// shout, not silently agree).
function expectedGrade(pct) {
  if (pct == null) return null;
  var s = pct / 100;
  if (s >= 0.95) return "A+";
  if (s >= 0.90) return "A";
  if (s >= 0.85) return "A-";
  if (s >= 0.80) return "B+";
  if (s >= 0.70) return "B";
  if (s >= 0.50) return "C";
  if (s >= 0.30) return "D";
  return "F";
}

function extractKpiValue(html, labelText) {
  const esc = labelText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    '<div class="kpi-v"[^>]*>((?:(?!</div>).)*)</div><div class="kpi-l">' + esc,
    "i"
  );
  const m = html.match(re);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
}

function parsePct(s) {
  if (s == null) return null;
  const m = String(s).match(/(-?\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
}

// Pull the grade letter that the report itself printed (in the decision card).
// Matches the standalone letter inside a styled span/div, not letters embedded
// in words. `A+`, `A-`, `B+`, `B`, `C`, `D`, `F` are valid.
function extractDisplayedGrade(html) {
  // The decision card renders the grade letter in a prominent div.
  // Example: <div style="font-size:48px;font-weight:700;color:#2a8c46">A</div>
  const m = html.match(/font-size:\s*\d+px[^"]*"[^>]*>([ABCDF][+\-]?)<\/div>/);
  return m ? m[1] : null;
}

// Pull the success-rate mention from the AI narrative / body prose. The AI
// emphasises key numbers with markdown `**bold**` which AiBlock escapes + then
// promotes to `<strong>`; the regex therefore allows optional HTML tags around
// the digits and is non-greedy across them.
function extractNarrativeSuccessPct(html, lang) {
  const re = lang === "fr"
    ? /taux de succès de\s*(?:<[^>]+>\s*)*(\d{1,3})\s*%/i
    : /(?:<[^>]+>\s*)*(\d{1,3})\s*%\s*success rate/i;
  const m = html.match(re);
  return m ? parseInt(m[1], 10) : null;
}

function extractP50Wealth(html) {
  return extractKpiValue(html, "P50 patrimoine") || extractKpiValue(html, "P50 wealth");
}

function countSubstring(html, needle) {
  if (!needle) return 0;
  // Plain substring count — fast, tolerant of surrounding markup.
  let c = 0, i = 0;
  while ((i = html.indexOf(needle, i)) !== -1) { c++; i += needle.length; }
  return c;
}

function checkReport(id, lang) {
  const file = path.join(TEST_OUTPUT_DIR, `${id}_${lang}.html`);
  if (!fs.existsSync(file)) {
    return [{ level: "fail", msg: `missing artifact ${file}` }];
  }
  const html = fs.readFileSync(file, "utf8");
  const findings = [];

  // 1. Grade consistency
  const succLabel = lang === "fr" ? "Taux de succès" : "Success rate";
  const succStr = extractKpiValue(html, succLabel);
  const succPct = parsePct(succStr);
  const displayed = extractDisplayedGrade(html);
  const expected = expectedGrade(succPct);

  if (succPct != null && expected && displayed && displayed !== expected) {
    findings.push({
      level: "fail",
      msg: `grade mismatch: KPI ${succPct}% → expected ${expected}, displayed ${displayed}`
    });
  }

  // 2. AI narrative success rate agrees with KPI (within 1pp for rounding)
  const narrPct = extractNarrativeSuccessPct(html, lang);
  if (narrPct != null && succPct != null && Math.abs(narrPct - succPct) > 1) {
    findings.push({
      level: "fail",
      msg: `narrative success rate diverges: KPI ${succPct}% vs prose ${narrPct}%`
    });
  }

  // 3. P50 wealth from KPI should appear somewhere else in the body
  const p50 = extractP50Wealth(html);
  if (p50 && p50 !== "\u2014") {
    // The KPI itself counts as one occurrence; require >= 2 total so at least
    // one other section (AI, projection narrative, estate, etc.) quotes the
    // same number.
    if (countSubstring(html, p50) < 2) {
      findings.push({
        level: "warn",
        msg: `P50 wealth ${p50} appears only in the KPI strip (no cross-reference)`
      });
    }
  }

  return findings;
}

function main() {
  const failures = [];
  const warnings = [];

  for (const id of PROFILE_IDS) {
    for (const lang of ["fr", "en"]) {
      const fs2 = checkReport(id, lang);
      for (const f of fs2) {
        const line = `${id} [${lang}]: ${f.msg}`;
        if (f.level === "fail") failures.push(line);
        else warnings.push(line);
      }
    }
  }

  if (warnings.length > 0) {
    console.warn("[xsect] WARN: " + warnings.length + " soft consistency finding(s):");
    warnings.forEach(function(w) { console.warn("  - " + w); });
  }

  if (failures.length > 0) {
    console.error("[xsect] FAIL: " + failures.length + " cross-section inconsistency/ies:");
    failures.forEach(function(f) { console.error("  - " + f); });
    process.exit(1);
  }

  console.log("[xsect] PASS: grade, narrative success rate, and P50 references are consistent.");
}

main();
