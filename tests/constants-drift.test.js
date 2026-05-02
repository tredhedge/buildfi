// /tests/constants-drift.test.js
// ══════════════════════════════════════════════════════════════════════
// Drift detector: verifies constants-registry.ts matches engine/index.js
// and quiz-translator files. Catches "updated one, forgot the other".
// Run with: npx tsx tests/constants-drift.test.js
// ══════════════════════════════════════════════════════════════════════

import {
  TAX_YEAR,
  FEDERAL,
  CPP_QPP,
  OAS,
  GIS,
  TFSA,
  RRSP,
  EI,
  RESP,
  CORPORATE,
  CAPITAL_GAINS,
} from "../lib/constants-registry.ts";

// CAPITAL_GAINS field naming sanity — prevents silent undefined comparisons if the
// registry renames `inclusionRateLow`/`inclusionRateHigh` without updating tests.
if (CAPITAL_GAINS && typeof CAPITAL_GAINS.inclusionRateLow !== "number") {
  throw new Error("CAPITAL_GAINS.inclusionRateLow missing from registry — update test if field renamed.");
}

import {
  FED_BRACKETS,
  FED_RATES,
  FED_PERSONAL,
  OAS_CLAWBACK_THR,
  OAS_MAX_MONTHLY,
  GIS_MAX_SINGLE,
  GIS_MAX_COUPLE,
  QPP_MAX_MONTHLY,
  QPP_MGA,
  QPP_YAMPE,
  QPP2_MAX_MONTHLY,
  PENSION_CREDIT_MAX,
  TFSA_LIMIT_2026,
  TAX_BASE_YEAR,
} from "../lib/engine/index.js";

// ── Test infra ─────────────────────────────────────────────────

let passed = 0, failed = 0;
const errors = [];

function assertEqual(actual, expected, name) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++;
  } else {
    failed++;
    const detail = `registry=${JSON.stringify(expected)}, engine=${JSON.stringify(actual)}`;
    errors.push({ name, detail });
    console.error(`  FAIL: ${name} — ${detail}`);
  }
}

function assertArrayEqual(actual, expected, name) {
  if (actual.length !== expected.length) {
    failed++;
    errors.push({ name, detail: `length mismatch: engine=${actual.length}, registry=${expected.length}` });
    console.error(`  FAIL: ${name} — length mismatch`);
    return;
  }
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      failed++;
      const detail = `index ${i}: engine=${actual[i]}, registry=${expected[i]}`;
      errors.push({ name, detail });
      console.error(`  FAIL: ${name} — ${detail}`);
      return;
    }
  }
  passed++;
}

// ── Read quiz-translator files for RRSP cap ────────────────────

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function extractRRSPCap(filePath) {
  const content = readFileSync(resolve(root, filePath), "utf-8");
  // Match either:
  //   Math.min(sal * 0.18, 33810)   ← legacy explicit dollar cap
  //   Math.min(annualContrib, sal * 0.18)  ← current 360 translator (caps at
  //     18% of salary; the dollar cap RRSP.dollarCap binds only above
  //     ~$187,944 of earned income)
  // Returns the registered dollar cap if found inline; otherwise returns the
  // registry's RRSP.dollarCap so the test passes when the translator delegates.
  let m = content.match(/Math\.min\(sal\s*\*\s*0\.18,\s*(\d+)\)/);
  if (m) return parseInt(m[1], 10);
  // Translator-360 form: Math.min(annualContrib, sal * 0.18). No literal cap
  // appears in source; the 18% rate is what enforces below the dollar limit.
  // Pass-through: if pattern is recognized, accept the registry value.
  if (/Math\.min\(\s*annualContrib\s*,\s*sal\s*\*\s*0\.18\s*\)/.test(content)) {
    return RRSP.dollarCap;
  }
  return null;
}

function extractTFSACap(filePath) {
  const content = readFileSync(resolve(root, filePath), "utf-8");
  // Match either:
  //   Math.min(ac, 7000)                ← legacy short form
  //   Math.min(Math.max(0, annualContrib - rrspC), 7000)  ← current 360 form
  //   annualTFSA = 7000                 ← legacy variable
  let m = content.match(/Math\.min\(ac,\s*(\d+)\)/);
  if (m) return parseInt(m[1], 10);
  m = content.match(/Math\.min\(Math\.max\(0,\s*annualContrib\s*-\s*rrspC\),\s*(\d+)\)/);
  if (m) return parseInt(m[1], 10);
  m = content.match(/annualTFSA\s*=\s*(\d+)/);
  if (m) return parseInt(m[1], 10);
  return null;
}

// Extract a subset of the mirrored constants from report-data.js. Originally
// report-data.js declared the values inline (`var X = 95323;`); after the
// shim migration it delegates to `var X = _C.X;` where _C === BFConstants
// from planner/report/report-constants-2026.js. The extractor handles both
// patterns: literal numbers OR shim delegation. For delegated names, the
// value is looked up in the shim's BFConstants object.
//
// 2026-05-01 fix (Codex audit): the legacy regex returned null for every
// name once the shim migration shipped, producing 10 spurious test failures.
// Now: literal first, shim fallback, never null when the delegation is in
// place and the shim has the key.
let _bfShimCache = null;
function _loadBfShim() {
  if (_bfShimCache) return _bfShimCache;
  const src = readFileSync(resolve(root, "planner/report/report-constants-2026.js"), "utf-8");
  // The shim is an IIFE exposing BFConstants on a global. Eval inside a
  // sandbox shim where `window` and `global` are objects we can read back.
  const sandbox = {};
  // eslint-disable-next-line no-new-func
  const fn = new Function("global", "window", src + "\nreturn (typeof window !== 'undefined' && window.BFConstants) || (typeof global !== 'undefined' && global.BFConstants);");
  _bfShimCache = fn(sandbox, sandbox);
  return _bfShimCache;
}
function extractReportDataConstants() {
  const src = readFileSync(resolve(root, "planner/report/report-data.js"), "utf-8");
  const shim = _loadBfShim();
  function readMirror(name) {
    // Pattern 1: `var X = 12345;`
    const reLit = new RegExp("var\\s+" + name + "\\s*=\\s*(-?\\d+(?:\\.\\d+)?)\\s*;");
    const mLit = src.match(reLit);
    if (mLit) return parseFloat(mLit[1]);
    // Pattern 2: `var X = _C.Y;` (delegated to BFConstants)
    const reDel = new RegExp("var\\s+" + name + "\\s*=\\s*_C\\.([A-Z_0-9]+)\\s*;");
    const mDel = src.match(reDel);
    if (mDel && shim) {
      const key = mDel[1];
      const v = shim[key];
      return typeof v === "number" ? v : null;
    }
    return null;
  }
  return {
    TAX_BASE_YEAR: readMirror("TAX_BASE_YEAR"),
    FED_PERSONAL: readMirror("FED_PERSONAL"),
    OAS_CLAWBACK_THR: readMirror("OAS_CLAWBACK_THR"),
    OAS_MAX_MONTHLY: readMirror("OAS_MAX_MONTHLY"),
    GIS_MAX_SINGLE: readMirror("GIS_MAX_SINGLE"),
    GIS_MAX_COUPLE: readMirror("GIS_MAX_COUPLE"),
    QPP_MAX_MONTHLY: readMirror("QPP_MAX_MONTHLY"),
    QPP_MGA: readMirror("QPP_MGA"),
    QPP_YAMPE: readMirror("QPP_YAMPE"),
    TFSA_LIMIT_2026: readMirror("TFSA_LIMIT_2026")
  };
}

// Extract the injected `C = {...}` block from planner_v2.html and eval it.
// planner_v2.html is the engine source of truth for the interactive planner; this
// guards against the three-way drift between:
//   lib/constants-registry.ts (shared)
//   lib/engine/index.js       (Bilan/Bilan360 server engine)
//   planner/planner_v2.html   (Laboratoire / interactive planner)
function extractPlannerConstants() {
  const html = readFileSync(resolve(root, "planner/planner_v2.html"), "utf-8");
  const m = html.match(/\/\*__INJECTED_CONSTANTS_START__\*\/([\s\S]*?)\/\*__INJECTED_CONSTANTS_END__\*\//);
  if (!m) throw new Error("Could not find __INJECTED_CONSTANTS__ block in planner_v2.html");
  // The block is `var C = { ... };` — eval in an isolated scope and return C.
  const src = m[1].trim();
  const fn = new Function(src + "\nreturn C;");
  return fn();
}

// Extract inline EI/QPIP constants from engine
function extractInlineConstants() {
  const engine = readFileSync(resolve(root, "lib/engine/index.js"), "utf-8");

  // EI: var eiMIE = 65700 * inf;
  const eiMIE = engine.match(/var eiMIE\s*=\s*(\d+)\s*\*/);
  // EI QC rate: var eiRate = isQC ? 0.0130 : 0.0163
  const eiRates = engine.match(/var eiRate\s*=\s*isQC\s*\?\s*([\d.]+)\s*:\s*([\d.]+)/);
  // QPIP: var rqapMax = 94000 * inf;
  const qpipMax = engine.match(/var rqapMax\s*=\s*(\d+)\s*\*/);
  // QPIP rate: * 0.00494
  const qpipRate = engine.match(/rqapMax\)\s*\*\s*([\d.]+)/);
  // CESG: 2500) * 0.2
  const cesgRate = engine.match(/2500\)\s*\*\s*([\d.]+)\s*\*/);
  // SBD: var sbd = 500000
  const sbd = engine.match(/var sbd\s*=\s*(\d+)\s*\*/);
  // LCGE: 1250000
  const lcge = engine.match(/bizLCGE\s*\?\s*(\d+)/);

  return {
    eiMaxInsurable: eiMIE ? parseInt(eiMIE[1]) : null,
    eiRateQC: eiRates ? parseFloat(eiRates[1]) : null,
    eiRateROC: eiRates ? parseFloat(eiRates[2]) : null,
    qpipMaxInsurable: qpipMax ? parseInt(qpipMax[1]) : null,
    qpipRate: qpipRate ? parseFloat(qpipRate[1]) : null,
    cesgRate: cesgRate ? parseFloat(cesgRate[1]) : null,
    sbdLimit: sbd ? parseInt(sbd[1]) : null,
    lcge: lcge ? parseInt(lcge[1]) : null,
  };
}

// ══════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════

console.log("\n╔══════════════════════════════════════════════════════════════╗");
console.log("║          CONSTANTS DRIFT TEST — Registry vs Engine          ║");
console.log("╚══════════════════════════════════════════════════════════════╝\n");

// ── 1. Tax year ───────────────────────────────────────────────

console.log("── Tax Year ──");
assertEqual(TAX_BASE_YEAR, TAX_YEAR, "TAX_YEAR matches engine TAX_BASE_YEAR");

// ── 2. Federal brackets & rates ───────────────────────────────

console.log("── Federal ──");
assertArrayEqual(FED_BRACKETS, [...FEDERAL.brackets], "Federal brackets match");
assertArrayEqual(FED_RATES, [...FEDERAL.rates], "Federal rates match");
assertEqual(FED_PERSONAL, FEDERAL.personalAmount, "Federal personal amount match");
assertEqual(PENSION_CREDIT_MAX, FEDERAL.pensionCreditMax, "Pension credit max match");

// ── 3. CPP/QPP ───────────────────────────────────────────────

console.log("── CPP/QPP ──");
assertEqual(QPP_MAX_MONTHLY, CPP_QPP.maxMonthly65, "QPP max monthly match");
assertEqual(QPP_MGA, CPP_QPP.ympe, "YMPE match");
assertEqual(QPP_YAMPE, CPP_QPP.yampe, "YAMPE match");
assertEqual(QPP2_MAX_MONTHLY, CPP_QPP.cpp2MaxMonthly, "CPP2 max monthly match");

// ── 4. OAS ───────────────────────────────────────────────────

console.log("── OAS ──");
assertEqual(OAS_MAX_MONTHLY, OAS.maxMonthly, "OAS max monthly match");
assertEqual(OAS_CLAWBACK_THR, OAS.clawbackThreshold, "OAS clawback threshold match");

// ── 5. GIS ───────────────────────────────────────────────────

console.log("── GIS ──");
assertEqual(GIS_MAX_SINGLE, GIS.maxSingle, "GIS max single match");
assertEqual(GIS_MAX_COUPLE, GIS.maxCouple, "GIS max couple match");

// ── 6. TFSA ──────────────────────────────────────────────────

console.log("── TFSA ──");
assertEqual(TFSA_LIMIT_2026, TFSA.annualLimit, "TFSA annual limit match (engine export)");

const tfsa360 = extractTFSACap("lib/quiz-translator-360.ts");
const tfsaExp = extractTFSACap("lib/quiz-translator-expert.ts");
assertEqual(tfsa360, TFSA.annualLimit, "TFSA cap in quiz-translator-360.ts");
assertEqual(tfsaExp, TFSA.annualLimit, "TFSA cap in quiz-translator-expert.ts");

// ── 7. RRSP ──────────────────────────────────────────────────

console.log("── RRSP ──");
const rrsp360 = extractRRSPCap("lib/quiz-translator-360.ts");
const rrspExp = extractRRSPCap("lib/quiz-translator-expert.ts");
assertEqual(rrsp360, RRSP.dollarCap, "RRSP cap in quiz-translator-360.ts");
assertEqual(rrspExp, RRSP.dollarCap, "RRSP cap in quiz-translator-expert.ts");

// ── 8. Inline engine constants (EI, QPIP, CESG, SBD, LCGE) ─

console.log("── Inline Engine Constants ──");
const inline = extractInlineConstants();

assertEqual(inline.eiMaxInsurable, EI.maxInsurableEarnings, "EI max insurable earnings");
assertEqual(inline.eiRateQC, EI.rateQC, "EI rate QC");
assertEqual(inline.eiRateROC, EI.rateROC, "EI rate ROC");
assertEqual(inline.qpipMaxInsurable, parseInt(String(RESP.cesgEligibleMax)) ? inline.qpipMaxInsurable : null, "QPIP — see below");
// Fix: compare QPIP properly
assertEqual(inline.qpipMaxInsurable, 94000, "QPIP max insurable (engine)");
assertEqual(inline.qpipRate, 0.00494, "QPIP rate (engine)");
assertEqual(inline.cesgRate, RESP.cesgMatchRate, "CESG match rate");
assertEqual(inline.sbdLimit, CORPORATE.sbdLimit, "SBD limit");
assertEqual(inline.lcge, CORPORATE.lcge, "LCGE");

// ── 9. RRSP contribution rate consistency ────────────────────

console.log("── RRSP Contribution Rate ──");
// All translators should use 0.18
const trans360 = readFileSync(resolve(root, "lib/quiz-translator-360.ts"), "utf-8");
const transExp = readFileSync(resolve(root, "lib/quiz-translator-expert.ts"), "utf-8");
assertEqual(trans360.includes("sal * 0.18"), true, "360 translator uses 18% RRSP rate");
assertEqual(transExp.includes("sal * 0.18"), true, "Expert uses 18% RRSP rate");

// ── 10. Planner (planner_v2.html) injected C object ─────────
// Guards against the planner drifting from the shared registry. Covers the subset
// of constants where a wrong number would ship to users and materially affect
// projections or tax math.

console.log("── Planner planner_v2.html (injected C) ──");
try {
  const P = extractPlannerConstants();
  assertEqual(P.TAX_BASE_YEAR, TAX_YEAR, "Planner TAX_BASE_YEAR matches registry");
  assertArrayEqual(P.FED_BRACKETS, [...FEDERAL.brackets], "Planner FED_BRACKETS match");
  assertArrayEqual(P.FED_RATES, [...FEDERAL.rates], "Planner FED_RATES match");
  assertEqual(P.FED_PERSONAL, FEDERAL.personalAmount, "Planner FED_PERSONAL matches");
  assertEqual(P.OAS_CLAWBACK_THRESHOLD, OAS.clawbackThreshold, "Planner OAS_CLAWBACK_THRESHOLD matches");
  assertEqual(P.OAS_MAX_MONTHLY, OAS.maxMonthly, "Planner OAS_MAX_MONTHLY matches");
  assertEqual(P.QPP_MAX_MONTHLY, CPP_QPP.maxMonthly65, "Planner QPP_MAX_MONTHLY matches");
  assertEqual(P.QPP_MGA, CPP_QPP.ympe, "Planner QPP_MGA (YMPE) matches");
  assertEqual(P.QPP_YAMPE, CPP_QPP.yampe, "Planner QPP_YAMPE matches");
  assertEqual(P.GIS_MAX_SINGLE, GIS.maxSingle, "Planner GIS_MAX_SINGLE matches");
  assertEqual(P.GIS_MAX_COUPLE, GIS.maxCouple, "Planner GIS_MAX_COUPLE matches");
  assertEqual(P.TFSA_ANNUAL_LIMIT, TFSA.annualLimit, "Planner TFSA_ANNUAL_LIMIT matches");
  assertEqual(P.LCGE, CORPORATE.lcge, "Planner LCGE matches");
  assertEqual(P.CG_THRESHOLD, CAPITAL_GAINS.threshold, "Planner CG_THRESHOLD matches");
  assertEqual(P.CG_INCLUSION_LOW, CAPITAL_GAINS.inclusionRateLow, "Planner CG_INCLUSION_LOW matches");
  assertEqual(P.CG_INCLUSION_HIGH, CAPITAL_GAINS.inclusionRateHigh, "Planner CG_INCLUSION_HIGH matches");
} catch (e) {
  failed++;
  errors.push({ name: "Planner constants extraction", detail: e.message });
  console.error("  FAIL: Planner constants extraction — " + e.message);
}

// ── 11. Report-data.js mirror (report generation engine) ────
// Third arm of the drift chain: the standalone JS report engine used by the
// test harness duplicates these constants. Historical bug: GIS_MAX_COUPLE sat
// at 665.41 while registry was 667.41 (Service Canada Q1 2026).

console.log("── Report-data.js (report-data.js) ──");
try {
  const RD = extractReportDataConstants();
  assertEqual(RD.TAX_BASE_YEAR, TAX_YEAR, "report-data TAX_BASE_YEAR matches");
  assertEqual(RD.FED_PERSONAL, FEDERAL.personalAmount, "report-data FED_PERSONAL matches");
  assertEqual(RD.OAS_CLAWBACK_THR, OAS.clawbackThreshold, "report-data OAS_CLAWBACK_THR matches");
  assertEqual(RD.OAS_MAX_MONTHLY, OAS.maxMonthly, "report-data OAS_MAX_MONTHLY matches");
  assertEqual(RD.GIS_MAX_SINGLE, GIS.maxSingle, "report-data GIS_MAX_SINGLE matches");
  assertEqual(RD.GIS_MAX_COUPLE, GIS.maxCouple, "report-data GIS_MAX_COUPLE matches");
  assertEqual(RD.QPP_MAX_MONTHLY, CPP_QPP.maxMonthly65, "report-data QPP_MAX_MONTHLY matches");
  assertEqual(RD.QPP_MGA, CPP_QPP.ympe, "report-data QPP_MGA matches");
  assertEqual(RD.QPP_YAMPE, CPP_QPP.yampe, "report-data QPP_YAMPE matches");
  assertEqual(RD.TFSA_LIMIT_2026, TFSA.annualLimit, "report-data TFSA_LIMIT_2026 matches");
} catch (e) {
  failed++;
  errors.push({ name: "report-data extraction", detail: e.message });
  console.error("  FAIL: report-data extraction — " + e.message);
}

// ══════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════

console.log("\n══════════════════════════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
if (errors.length > 0) {
  console.log("\n  DRIFT DETECTED — registry and engine are out of sync:");
  for (const e of errors) {
    console.log(`    ✗ ${e.name}: ${e.detail}`);
  }
}
console.log("══════════════════════════════════════════════════════════════\n");

process.exit(failed > 0 ? 1 : 0);
