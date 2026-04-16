"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT_DIR = path.resolve(__dirname, "..", "..", "..", "..");
const REPORT_DIR = path.resolve(__dirname, "..", "..");
const TEST_OUTPUT_DIR = path.join(REPORT_DIR, "test-output");

const PROFILE_IDS = [
  "young_accum",
  "couple_transition",
  "retiree_decum",
  "fire_seeker",
  "low_income_gis",
  "ccpc_owner",
  "real_estate",
  "hnw_couple",
  "debt_young",
  "rsu_tech"
];

const LANGS = ["fr", "en"];

const REQUIRED_ARTIFACTS = [
  path.join(REPORT_DIR, "hardening", "sprint0", "baseline-fr-manifest.json"),
  path.join(REPORT_DIR, "hardening", "sprint0", "baseline-fr-summary.md"),
  path.join(REPORT_DIR, "hardening", "sprint0", "defect-ledger.fr.md"),
  path.join(REPORT_DIR, "hardening", "sprint7", "TECHNICAL-METHODOLOGY-A-TO-Z.md"),
  path.join(REPORT_DIR, "hardening", "sprint7", "REPORT-METRIC-LINEAGE.md"),
  path.join(REPORT_DIR, "hardening", "sprint8", "README.md"),
  path.join(REPORT_DIR, "hardening", "sprint8", "RELEASE-CHECKLIST.md")
];

function runNpmScript(scriptName) {
  const result = spawnSync(`npm run ${scriptName}`, {
    cwd: ROOT_DIR,
    stdio: "inherit",
    shell: true
  });
  if (result.error) {
    throw new Error(`npm run ${scriptName} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed with exit code ${result.status}`);
  }
}

function expectedReportFiles() {
  const files = [];
  PROFILE_IDS.forEach((id) => {
    LANGS.forEach((lang) => files.push(`${id}_${lang}.html`));
  });
  return files;
}

function assertReportsExist() {
  const missing = expectedReportFiles().filter(
    (fileName) => !fs.existsSync(path.join(TEST_OUTPUT_DIR, fileName))
  );
  if (missing.length > 0) {
    throw new Error(`Missing expected report artifacts (${missing.length}): ${missing.join(", ")}`);
  }
}

function assertRequiredArtifactsExist() {
  const missing = REQUIRED_ARTIFACTS.filter((filePath) => !fs.existsSync(filePath));
  if (missing.length > 0) {
    throw new Error(
      "Missing required hardening artifacts:\n" + missing.map((m) => `- ${m}`).join("\n")
    );
  }
}

function main() {
  const full = process.argv.includes("--full");

  console.log("[release-gate] Step 1/4: Running report hardening chain (FR+EN strict)...");
  runNpmScript("report:sprint6:fr-en");

  console.log("[release-gate] Step 2/4: Verifying expected report artifacts...");
  assertReportsExist();

  console.log("[release-gate] Step 3/4: Verifying hardening docs/artifacts...");
  assertRequiredArtifactsExist();

  // KPI snapshot — blocks silent number drift. If a persona's median estate
  // moves $200k between runs without an intentional engine change, this fails.
  console.log("[release-gate] Step 4/5: KPI snapshot diff vs baseline...");
  runNpmScript("report:kpi:snapshot");

  // Cross-section consistency — grade letter, narrative success rate, and P50
  // cross-references must agree within each rendered report.
  console.log("[release-gate] Step 5/5: Cross-section numerical consistency...");
  runNpmScript("report:xsect");

  if (full) {
    console.log("[release-gate] Optional full suite: npm run qa:full");
    runNpmScript("qa:full");
  }

  console.log("[release-gate] PASS: release gate checks completed successfully.");
}

main();
