#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.join(__dirname, "baseline-fr-manifest.json");

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Missing manifest at ${MANIFEST_PATH}. Run capture-fr-baseline.js first.`
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function main() {
  const manifest = loadManifest();
  const failures = [];

  if (manifest.files.length !== 10) {
    failures.push(`Expected 10 FR reports, found ${manifest.files.length}.`);
  }

  manifest.files.forEach((f) => {
    const m = f.metrics;
    if (m.mojibakeCount > 0) {
      failures.push(`${f.file}: mojibake detected (${m.mojibakeCount}).`);
    }
    if (m.escapedStrongCount > 0) {
      failures.push(
        `${f.file}: escaped HTML formatting visible (${m.escapedStrongCount}).`
      );
    }
    if (m.successionMismatch) {
      failures.push(
        `${f.file}: succession mismatch (ratio=${m.successionMismatchRatio}).`
      );
    }
    if (m.hasUndefined) {
      failures.push(`${f.file}: contains "undefined".`);
    }
    if (m.hasNaN) {
      failures.push(`${f.file}: contains "NaN".`);
    }
  });

  if (failures.length > 0) {
    console.error("NO-SHIP GATES FAILED:");
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log("NO-SHIP GATES PASSED.");
}

main();
