#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const REPORT_DIR = path.resolve(__dirname, "..", "..");
const OUTPUT_DIR = path.join(REPORT_DIR, "test-output");
const BASELINE_MANIFEST = path.join(__dirname, "..", "sprint0", "baseline-fr-manifest.json");
const REQUIRE_EN = process.argv.includes("--require-en") || process.env.REPORT_REQUIRE_EN === "1";

const LOCALE_RULES = {
  fr: {
    minSectionCount: 7,
    leakageLabel: "english UI leakage",
    leakageRegex:
      /(Table of Contents|Retirement Plan|Tax Strategy|AI Analysis|Prepared for|Detailed Report)/gi,
    anchors: [/Table des mati/i, /(Mise en garde|Avertissement)/i, /(Analyse assist|Analyse IA)/i],
    minAnchorHits: 2
  },
  en: {
    minSectionCount: 7,
    leakageLabel: "french UI leakage",
    leakageRegex:
      /(Table des mati|Mise en garde|Plan de retraite|Analyse assist|Rapport detaille|Prepare pour)/gi,
    anchors: [/Table of Contents/i, /(Disclaimer|Important Notice|Warning)/i, /(AI Analysis|AI-Assisted|AI Insight)/i],
    minAnchorHits: 2
  }
};

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function extractVisibleText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function loadBaselineManifest() {
  if (!fs.existsSync(BASELINE_MANIFEST)) {
    throw new Error(`Missing baseline manifest: ${BASELINE_MANIFEST}. Run report:sprint0:fr first.`);
  }
  return JSON.parse(fs.readFileSync(BASELINE_MANIFEST, "utf8"));
}

function buildBaselineIndex(manifest) {
  const idx = new Map();
  (manifest.files || []).forEach((f) => idx.set(f.file, f));
  return idx;
}

function evaluateFile(fileName, lang, baselineRow) {
  const fullPath = path.join(OUTPUT_DIR, fileName);
  if (!fs.existsSync(fullPath)) {
    return { file: fileName, lang, failures: [`missing file: ${fileName}`] };
  }

  const html = fs.readFileSync(fullPath, "utf8");
  const visibleText = extractVisibleText(html);
  const stat = fs.statSync(fullPath);
  const rules = LOCALE_RULES[lang];
  const anchorHitCount = rules.anchors.reduce((acc, regex) => acc + (regex.test(visibleText) ? 1 : 0), 0);

  const metrics = {
    sectionCount: countMatches(html, /id="sec-[^"]+"/gi),
    aiCallouts: countMatches(html, /callout callout-ai/gi),
    chartBlocks: countMatches(html, /class="chart-block"/gi),
    chartLegends: countMatches(html, /class="chart-legend"/gi),
    kpiCards: countMatches(html, /class="kpi"/gi),
    tableCount: countMatches(html, /class="tbl"/gi),
    narrativeCount: countMatches(html, /class="narr"/gi),
    escapedStrongCount: countMatches(html, /&lt;strong&gt;/gi),
    mojibakeCount: countMatches(html, /(\u00c3|\uFFFD)/g),
    hasUndefined: /undefined/i.test(html),
    hasNaN: /\bNaN\b/.test(html),
    localeLeakCount: countMatches(visibleText, rules.leakageRegex),
    anchorHitCount
  };

  const failures = [];

  if (metrics.sectionCount < rules.minSectionCount) failures.push(`low section count (${metrics.sectionCount})`);
  if (metrics.chartBlocks < 2) failures.push(`low chart-block count (${metrics.chartBlocks})`);
  if (metrics.kpiCards < 6) failures.push(`low KPI count (${metrics.kpiCards})`);
  if (metrics.tableCount < 2) failures.push(`low table count (${metrics.tableCount})`);
  if (metrics.narrativeCount < 4) failures.push(`low narrative count (${metrics.narrativeCount})`);

  if (metrics.escapedStrongCount > 0) failures.push(`escaped strong tags visible (${metrics.escapedStrongCount})`);
  if (metrics.mojibakeCount > 0) failures.push(`encoding artifacts detected (${metrics.mojibakeCount})`);
  if (metrics.hasUndefined) failures.push("contains undefined");
  if (metrics.hasNaN) failures.push("contains NaN");
  if (metrics.localeLeakCount > 0) failures.push(`${rules.leakageLabel} detected (${metrics.localeLeakCount})`);
  if (metrics.anchorHitCount < rules.minAnchorHits) {
    failures.push(`missing expected ${lang.toUpperCase()} anchors (hits=${metrics.anchorHitCount}/${rules.anchors.length})`);
  }

  if (!html.includes("class=\"chart-title\"")) failures.push("missing chart-title blocks");
  if (!html.includes("class=\"chart-legend\"")) failures.push("missing chart-legend blocks");
  if (!html.includes("print-color-adjust:exact")) failures.push("missing print color-adjust rule");
  if (!html.includes(".chart-block{break-inside:avoid;page-break-inside:avoid}")) {
    failures.push("missing chart print break guard");
  }

  if (baselineRow && baselineRow.metrics) {
    const baseSections = baselineRow.metrics.sectionCount || 0;
    const baseAi = baselineRow.metrics.aiCallouts || 0;
    const baseSize = baselineRow.sizeBytes || 0;

    if (Math.abs(metrics.sectionCount - baseSections) > 1) {
      failures.push(`section drift too large (baseline=${baseSections}, current=${metrics.sectionCount})`);
    }
    if (Math.abs(metrics.aiCallouts - baseAi) > 4) {
      failures.push(`AI block drift too large (baseline=${baseAi}, current=${metrics.aiCallouts})`);
    }
    if (baseSize > 0) {
      const ratio = stat.size / baseSize;
      if (ratio < 0.75 || ratio > 1.35) {
        failures.push(`size drift too large (${ratio.toFixed(2)}x vs baseline)`);
      }
    }
  }

  return { file: fileName, lang, metrics, failures };
}

function runCheckSuite(expectedFiles, lang, baselineIndex) {
  return expectedFiles.map((fileName) => evaluateFile(fileName, lang, baselineIndex.get(fileName)));
}

function printSummary(results) {
  const byLang = { fr: [], en: [] };
  results.forEach((row) => {
    if (!byLang[row.lang]) byLang[row.lang] = [];
    byLang[row.lang].push(row);
  });

  Object.keys(byLang).forEach((lang) => {
    if (!byLang[lang].length) return;
    const failed = byLang[lang].filter((r) => r.failures.length > 0);
    console.log(`[sprint6] ${lang.toUpperCase()} files checked: ${byLang[lang].length}`);
    console.log(`[sprint6] ${lang.toUpperCase()} files failed: ${failed.length}`);
  });
}

function main() {
  const manifest = loadBaselineManifest();
  const baselineIndex = buildBaselineIndex(manifest);
  const expectedFrFiles = (manifest.files || []).map((f) => f.file).filter((f) => /_fr\.html$/i.test(f));

  if (expectedFrFiles.length !== 10) {
    throw new Error(`Expected 10 FR baseline files, found ${expectedFrFiles.length}.`);
  }

  const expectedEnFiles = expectedFrFiles.map((file) => file.replace(/_fr\.html$/i, "_en.html"));
  const foundEnFiles = expectedEnFiles.filter((file) => fs.existsSync(path.join(OUTPUT_DIR, file)));
  const shouldCheckEnglish = REQUIRE_EN || foundEnFiles.length > 0;

  const results = [];
  results.push(...runCheckSuite(expectedFrFiles, "fr", baselineIndex));

  if (shouldCheckEnglish) {
    results.push(...runCheckSuite(expectedEnFiles, "en", baselineIndex));
  } else {
    console.log("[sprint6] EN check skipped (no _en.html files found). Use --require-en to enforce.");
  }

  const failed = results.filter((r) => r.failures.length > 0);

  console.log("[sprint6] Visual + language regression summary");
  printSummary(results);
  console.log(`[sprint6] Total files checked: ${results.length}`);
  console.log(`[sprint6] Total files failed: ${failed.length}`);

  if (failed.length > 0) {
    console.error("\nSPRINT6 REGRESSION CHECK FAILED:");
    failed.forEach((row) => {
      console.error(`- ${row.file} (${row.lang.toUpperCase()})`);
      row.failures.forEach((f) => console.error(`  * ${f}`));
    });
    process.exit(1);
  }

  console.log("[sprint6] PASS: visual, language, and drift checks are within thresholds.");
}

main();
