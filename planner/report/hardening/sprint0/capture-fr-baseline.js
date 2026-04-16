#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const REPORT_DIR = path.resolve(__dirname, "..", "..");
const TEST_SCRIPT = path.join(REPORT_DIR, "test-reports.js");
const TEST_OUTPUT_DIR = path.join(REPORT_DIR, "test-output");
const MANIFEST_PATH = path.join(__dirname, "baseline-fr-manifest.json");
const SUMMARY_PATH = path.join(__dirname, "baseline-fr-summary.md");

const EXPECTED_FILES = [
  "ccpc_owner_fr.html",
  "couple_transition_fr.html",
  "debt_young_fr.html",
  "fire_seeker_fr.html",
  "hnw_couple_fr.html",
  "low_income_gis_fr.html",
  "real_estate_fr.html",
  "retiree_decum_fr.html",
  "rsu_tech_fr.html",
  "young_accum_fr.html"
];

const skipGenerate = process.argv.includes("--skip-generate");

function runGenerator() {
  const result = spawnSync("node", [TEST_SCRIPT], {
    cwd: REPORT_DIR,
    stdio: "inherit",
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`Report generator failed with exit code ${result.status}`);
  }
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function normalizeNumberToken(raw) {
  return String(raw)
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00A0/g, " ")
    .replace(/\$/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".");
}

function parseMoney(raw) {
  const token = normalizeNumberToken(raw);
  if (!token) return null;
  const mult = /m$/i.test(token) ? 1_000_000 : /k$/i.test(token) ? 1_000 : 1;
  const clean = token.replace(/[mk]$/i, "").replace(/[^0-9.]/g, "");
  if (!clean) return null;
  const value = Number.parseFloat(clean);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * mult);
}

function extractSuccessionBlock(html) {
  const match = html.match(/id="sec-succession"([\s\S]*?)id="sec-methodology"/i);
  return match ? match[1] : "";
}

function extractSuccessionNumbers(block) {
  if (!block) return { narrativeNet: null, aiNet: null, mismatchRatio: null, mismatch: false };

  const narrativeMatch = block.match(/h.{0,2}ritage net(?:[^<]*?)<strong>([^<]+)<\/strong>/i);
  const aiCalloutMatch = block.match(/callout callout-ai[\s\S]*?<p>([\s\S]*?)<\/p>/i);
  const aiValueMatch =
    aiCalloutMatch &&
    aiCalloutMatch[1].match(
      /(?:&lt;strong&gt;|<strong>)([^<]+?)(?:&lt;\/strong&gt;|<\/strong>)/i
    );

  const narrativeNet = narrativeMatch ? parseMoney(narrativeMatch[1]) : null;
  const aiNet = aiValueMatch ? parseMoney(aiValueMatch[1]) : null;

  let mismatch = false;
  let mismatchRatio = null;
  if (narrativeNet && aiNet && aiNet > 0) {
    mismatchRatio = Number((narrativeNet / aiNet).toFixed(2));
    mismatch = mismatchRatio > 1.5 || mismatchRatio < 0.67;
  }

  return { narrativeNet, aiNet, mismatchRatio, mismatch };
}

function analyzeFile(fileName) {
  const fullPath = path.join(TEST_OUTPUT_DIR, fileName);
  const html = fs.readFileSync(fullPath, "utf8");
  const hash = crypto.createHash("sha256").update(html, "utf8").digest("hex");
  const stat = fs.statSync(fullPath);

  const sectionCount = countMatches(html, /id="sec-[^"]+"/gi);
  const aiCallouts = countMatches(html, /callout callout-ai/gi);
  const escapedStrongCount = countMatches(html, /&lt;strong&gt;/gi);
  const mojibakeCount = countMatches(html, /(\u00c3|\uFFFD)/g);
  const hasUndefined = /undefined/i.test(html);
  const hasNaN = /\bNaN\b/.test(html);

  const succession = extractSuccessionNumbers(extractSuccessionBlock(html));

  return {
    file: fileName,
    path: fullPath,
    sizeBytes: stat.size,
    sha256: hash,
    modifiedAt: stat.mtime.toISOString(),
    metrics: {
      sectionCount,
      aiCallouts,
      escapedStrongCount,
      mojibakeCount,
      hasUndefined,
      hasNaN,
      successionNarrativeNet: succession.narrativeNet,
      successionAiNet: succession.aiNet,
      successionMismatchRatio: succession.mismatchRatio,
      successionMismatch: succession.mismatch
    }
  };
}

function aggregate(rows) {
  return rows.reduce(
    (acc, row) => {
      const m = row.metrics;
      acc.totalSizeBytes += row.sizeBytes;
      acc.totalAiCallouts += m.aiCallouts;
      acc.totalSections += m.sectionCount;
      acc.filesWithMojibake += m.mojibakeCount > 0 ? 1 : 0;
      acc.filesWithEscapedStrong += m.escapedStrongCount > 0 ? 1 : 0;
      acc.filesWithUndefined += m.hasUndefined ? 1 : 0;
      acc.filesWithNaN += m.hasNaN ? 1 : 0;
      acc.filesWithSuccessionMismatch += m.successionMismatch ? 1 : 0;
      return acc;
    },
    {
      totalSizeBytes: 0,
      totalAiCallouts: 0,
      totalSections: 0,
      filesWithMojibake: 0,
      filesWithEscapedStrong: 0,
      filesWithUndefined: 0,
      filesWithNaN: 0,
      filesWithSuccessionMismatch: 0
    }
  );
}

function toKB(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

function writeSummary(manifest) {
  const lines = [];
  lines.push("# FR Baseline Summary");
  lines.push("");
  lines.push(`Generated: ${manifest.generatedAt}`);
  lines.push(`Profiles found: ${manifest.files.length}`);
  lines.push(`Total size: ${toKB(manifest.aggregate.totalSizeBytes)}`);
  lines.push("");
  lines.push("| File | Size | Sections | AI blocks | Mojibake | Escaped strong | Succession mismatch |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  manifest.files.forEach((f) => {
    lines.push(
      `| ${f.file} | ${toKB(f.sizeBytes)} | ${f.metrics.sectionCount} | ${f.metrics.aiCallouts} | ${f.metrics.mojibakeCount} | ${f.metrics.escapedStrongCount} | ${f.metrics.successionMismatch ? "yes" : "no"} |`
    );
  });
  lines.push("");
  fs.writeFileSync(SUMMARY_PATH, lines.join("\n"), "utf8");
}

function main() {
  if (!skipGenerate) {
    console.log("[baseline] Generating FR reports from test harness...");
    runGenerator();
  } else {
    console.log("[baseline] Skipping report generation (using current test-output).");
  }

  const files = fs
    .readdirSync(TEST_OUTPUT_DIR)
    .filter((f) => f.endsWith("_fr.html"))
    .sort();

  const missing = EXPECTED_FILES.filter((f) => !files.includes(f));
  if (missing.length) {
    throw new Error(`Missing expected FR reports: ${missing.join(", ")}`);
  }

  const analyzed = EXPECTED_FILES.map(analyzeFile);
  const manifest = {
    generatedAt: new Date().toISOString(),
    baselineType: "fr-reports-sprint0",
    generatorScript: TEST_SCRIPT,
    outputDir: TEST_OUTPUT_DIR,
    files: analyzed,
    aggregate: aggregate(analyzed)
  };

  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeSummary(manifest);

  console.log(`[baseline] Manifest written: ${MANIFEST_PATH}`);
  console.log(`[baseline] Summary written:  ${SUMMARY_PATH}`);
}

main();