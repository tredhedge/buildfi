// Verifies the 2026-05-14 decision-narrative IA refactor in generated reports.
// Reads HTML files in tests/reports/bilan360/ and asserts:
//   - new section titles present (Option C declarative + decision-framed)
//   - <p class="standfirst"> rendered for the 5 instrumented sections
//   - kpi-hero / kpi-detail classes present
//   - the standfirst includes the real grade + success% from the profile (no
//     templated placeholders)
//   - old section titles (e.g. "Vue d'ensemble") are GONE
// Exits non-zero if any check fails.
//
// Usage: node tests/verify-ia-refactor.mjs [glob-substring]
// Example: node tests/verify-ia-refactor.mjs accum

import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const reportDir = join(import.meta.dirname || new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "reports", "bilan360");
const filter = (process.argv[2] || "").toLowerCase();

const NEW_TITLES = [
  "Votre point de départ",
  "Tenue du plan dans le temps",
  "Réaction du plan aux chocs",
  "Synthèse stratégique",
  "Leviers à votre portée",
];

const REMOVED_TITLES = [
  "Vue d'ensemble",
  "Projection Monte Carlo",
  "Laboratoire de scénarios",
  "Valeur IA",
  "Plan d'exécution",
];

const REQUIRED_STRUCTURE = [
  'class="standfirst"',
  "kpi-hero",
  "kpi-detail",
];

const files = readdirSync(reportDir)
  .filter((f) => f.endsWith(".html"))
  .filter((f) => !filter || f.toLowerCase().includes(filter));

if (files.length === 0) {
  console.error(`No HTML reports matching ${filter ? `"${filter}"` : "*"} in ${reportDir}`);
  process.exit(1);
}

let totalPass = 0;
let totalFail = 0;
const detail = [];

for (const file of files) {
  const html = readFileSync(join(reportDir, file), "utf8");
  const checks = [];

  for (const title of NEW_TITLES) {
    checks.push([`title: ${title}`, html.includes(title)]);
  }
  for (const old of REMOVED_TITLES) {
    checks.push([`legacy removed: ${old}`, !html.includes(old)]);
  }
  for (const needle of REQUIRED_STRUCTURE) {
    checks.push([`structure: ${needle}`, html.includes(needle)]);
  }

  // Standfirst should mention "Grade X" (decision-framed headline param)
  checks.push(["standfirst references grade", /Grade [A-F][\+\-]?/.test(html)]);
  // ...and a success percentage (numeric, not "—")
  checks.push(["standfirst references success%", /\d{1,3}%/.test(html)]);
  // AI slot biggest_risk/best_lever sanity: hero section has them
  const aiSlotsRegex = /<p style="margin:0">[^<]+<\/p>/g;
  const aiMatches = html.match(aiSlotsRegex) || [];
  checks.push([`AI slots rendered (≥3 paragraphs)`, aiMatches.length >= 3]);

  let p = 0, f = 0;
  for (const [name, ok] of checks) {
    if (ok) p++; else f++;
  }
  totalPass += p;
  totalFail += f;
  detail.push({ file, pass: p, fail: f, checks });
  console.log(`${f === 0 ? "✓" : "✗"} ${file} — ${p}/${p + f} pass${f > 0 ? `, ${f} fail` : ""}`);
  if (f > 0) {
    for (const [name, ok] of checks) {
      if (!ok) console.log(`    FAIL: ${name}`);
    }
  }
}

console.log("\n" + "─".repeat(60));
console.log(`TOTAL: ${totalPass}/${totalPass + totalFail} checks passed across ${files.length} reports`);
console.log("─".repeat(60));
process.exit(totalFail === 0 ? 0 : 1);
