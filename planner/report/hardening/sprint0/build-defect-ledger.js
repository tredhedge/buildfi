#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.join(__dirname, "baseline-fr-manifest.json");
const LEDGER_PATH = path.join(__dirname, "defect-ledger.fr.md");

const SEVERITY_LABEL = {
  P0: "Critical",
  P1: "High",
  P2: "Medium",
  P3: "Low"
};

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(
      `Missing manifest at ${MANIFEST_PATH}. Run capture-fr-baseline.js first.`
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function pushIssue(out, file, severity, category, detail) {
  out.push({ file, severity, category, detail });
}

function collectIssues(manifest) {
  const issues = [];

  manifest.files.forEach((f) => {
    const m = f.metrics;
    if (m.mojibakeCount > 0) {
      pushIssue(
        issues,
        f.file,
        "P0",
        "encoding",
        `Detected ${m.mojibakeCount} mojibake markers (UTF-8 pipeline corruption).`
      );
    }
    if (m.successionMismatch) {
      pushIssue(
        issues,
        f.file,
        "P0",
        "data-integrity",
        `Succession narrative mismatch: report=${m.successionNarrativeNet ?? "n/a"} vs AI=${m.successionAiNet ?? "n/a"} (ratio=${m.successionMismatchRatio ?? "n/a"}).`
      );
    }
    if (m.hasUndefined) {
      pushIssue(
        issues,
        f.file,
        "P0",
        "rendering",
        `Output contains "undefined".`
      );
    }
    if (m.hasNaN) {
      pushIssue(
        issues,
        f.file,
        "P0",
        "rendering",
        `Output contains "NaN".`
      );
    }
    if (m.escapedStrongCount > 0) {
      pushIssue(
        issues,
        f.file,
        "P1",
        "content-presentation",
        `Detected ${m.escapedStrongCount} escaped <strong> tags visible to users.`
      );
    }
    if (m.aiCallouts >= 9) {
      pushIssue(
        issues,
        f.file,
        "P2",
        "ux-ai-density",
        `AI density is high (${m.aiCallouts} callouts), likely reducing signal-to-noise.`
      );
    }
    if (m.sectionCount < 7) {
      pushIssue(
        issues,
        f.file,
        "P1",
        "structure",
        `Low section count (${m.sectionCount}) may indicate missing report blocks.`
      );
    }
  });

  return issues.sort((a, b) => {
    const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
    const r = rank[a.severity] - rank[b.severity];
    return r !== 0 ? r : a.file.localeCompare(b.file);
  });
}

function groupBySeverity(issues) {
  return issues.reduce((acc, item) => {
    acc[item.severity] = (acc[item.severity] || 0) + 1;
    return acc;
  }, {});
}

function writeLedger(manifest, issues) {
  const sev = groupBySeverity(issues);
  const lines = [];

  lines.push("# FR Report Defect Ledger (Harsh)");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Baseline source: ${MANIFEST_PATH}`);
  lines.push(`Profiles audited: ${manifest.files.length}`);
  lines.push("");
  lines.push("## Executive Verdict");
  lines.push("");
  lines.push(
    "Current FR report quality is not release-safe. Data trust and text rendering must be fixed before UX polish work."
  );
  lines.push("");
  lines.push("## Severity Summary");
  lines.push("");
  lines.push(`- P0: ${sev.P0 || 0}`);
  lines.push(`- P1: ${sev.P1 || 0}`);
  lines.push(`- P2: ${sev.P2 || 0}`);
  lines.push(`- P3: ${sev.P3 || 0}`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");

  if (!issues.length) {
    lines.push("- No findings detected.");
  } else {
    issues.forEach((i) => {
      lines.push(
        `- [${i.severity}] [${SEVERITY_LABEL[i.severity]}] ${i.file} | ${i.category} | ${i.detail}`
      );
    });
  }

  lines.push("");
  lines.push("## Immediate Priority Order");
  lines.push("");
  lines.push("1. Fix UTF-8/encoding pipeline.");
  lines.push("2. Enforce AI numeric grounding against validated payload.");
  lines.push("3. Remove escaped HTML in user-visible narrative.");
  lines.push("4. Reduce AI callout density and improve section signal.");
  lines.push("");

  fs.writeFileSync(LEDGER_PATH, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const manifest = loadManifest();
  const issues = collectIssues(manifest);
  writeLedger(manifest, issues);
  console.log(`[ledger] Written: ${LEDGER_PATH}`);
  console.log(`[ledger] Findings: ${issues.length}`);
}

main();
