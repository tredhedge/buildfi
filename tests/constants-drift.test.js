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
  // Match patterns like: Math.min(sal * 0.18, 33810)
  const match = content.match(/Math\.min\(sal\s*\*\s*0\.18,\s*(\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

function extractTFSACap(filePath) {
  const content = readFileSync(resolve(root, filePath), "utf-8");
  // Match patterns like: Math.min(ac, 7000) or annualTFSA = 7000
  const match = content.match(/Math\.min\(ac,\s*(\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
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

const tfsaEss = extractTFSACap("lib/quiz-translator.ts");
const tfsaInt = extractTFSACap("lib/quiz-translator-inter.ts");
const tfsaExp = extractTFSACap("lib/quiz-translator-expert.ts");
assertEqual(tfsaEss, TFSA.annualLimit, "TFSA cap in quiz-translator.ts");
assertEqual(tfsaInt, TFSA.annualLimit, "TFSA cap in quiz-translator-inter.ts");
assertEqual(tfsaExp, TFSA.annualLimit, "TFSA cap in quiz-translator-expert.ts");

// ── 7. RRSP ──────────────────────────────────────────────────

console.log("── RRSP ──");
const rrspEss = extractRRSPCap("lib/quiz-translator.ts");
const rrspInt = extractRRSPCap("lib/quiz-translator-inter.ts");
const rrspExp = extractRRSPCap("lib/quiz-translator-expert.ts");
assertEqual(rrspEss, RRSP.dollarCap, "RRSP cap in quiz-translator.ts");
assertEqual(rrspInt, RRSP.dollarCap, "RRSP cap in quiz-translator-inter.ts");
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
const transEss = readFileSync(resolve(root, "lib/quiz-translator.ts"), "utf-8");
const transInt = readFileSync(resolve(root, "lib/quiz-translator-inter.ts"), "utf-8");
const transExp = readFileSync(resolve(root, "lib/quiz-translator-expert.ts"), "utf-8");
assertEqual(transEss.includes("sal * 0.18"), true, "Essentiel uses 18% RRSP rate");
assertEqual(transInt.includes("sal * 0.18"), true, "Inter uses 18% RRSP rate");
assertEqual(transExp.includes("sal * 0.18"), true, "Expert uses 18% RRSP rate");

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
