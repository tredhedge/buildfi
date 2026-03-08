#!/usr/bin/env node
// /scripts/lint-amf.js
// Cross-platform AMF/OSFI compliance checker (replaces bash-dependent lint:amf)
// Scans lib/, public/, app/ for forbidden advisory language and exits 1 if found.
//
// Zero-tolerance terms (see docs/TECH-REFERENCE.md §6):
//   devriez, recommandons, vous devez, il faut que,
//   conseillons, assurez-vous, priorisez, plan d'action
//
// Exemptions: documentation strings, AMF comment references, sanitiz* functions,
// the check script itself, and expected occurrences in AI prompt files.

const fs = require("fs");
const path = require("path");

const FORBIDDEN = [
  /\bdevriez\b/i,
  /\brecommandons\b/i,
  /vous devez\b/i,
  /il faut que\b/i,
  /\bconseillons\b/i,
  /\bassurez-vous\b/i,
  /\bpriorisez\b/i,
  /plan d['']action/i,
];

// Lines that contain these strings are exempted (documentation / code comments about what NOT to do)
const EXEMPT_LINE_PATTERNS = [
  /NEVER use/i,
  /forbidden/i,
  /interdits/i,
  /lint:amf/i,
  /devez savoir/i,
  /JAMAIS utiliser/i,
  /sanitiz/i,
  /function\(\).*return lang/i,
  // Lines quoting forbidden terms as negative examples in AI prompts / sanitizers
  /considerez.*priorisez/i,
  /plan d.action.*recommandation/i,
  /not.*plan d.action/i,
  // Regex pattern literals (e.g., the AMF sanitizer regex itself in ai-constants.ts)
  /\\bdevriez\\b/,
  /\\bvous devez\\b/,
];

// File paths (relative) exempted entirely — these list forbidden terms in AI instructions
const EXEMPT_FILE_SUFFIXES = [
  "ai-prompt-expert.ts",
  "ai-prompt-inter.ts",
  "ai-prompt-decum.ts",
  "ai-constants.ts",
  "scripts/lint-amf.js",
];

const SCAN_DIRS = ["lib", "public", "app"];
const INCLUDE_EXTS = new Set([".ts", ".tsx", ".js", ".html"]);

let violations = 0;
const results = [];

function isExemptLine(line) {
  return EXEMPT_LINE_PATTERNS.some((re) => re.test(line));
}

function isExemptFile(filePath) {
  const normalized = filePath.replace(/\\/g, "/");
  return EXEMPT_FILE_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

function scanFile(filePath) {
  if (isExemptFile(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    if (isExemptLine(line)) return;
    for (const pattern of FORBIDDEN) {
      if (pattern.test(line)) {
        results.push({ file: filePath, line: i + 1, text: line.trim(), pattern: pattern.source });
        violations++;
        break;
      }
    }
  });
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .next, .git
      if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue;
      walk(full);
    } else if (entry.isFile() && INCLUDE_EXTS.has(path.extname(entry.name))) {
      scanFile(full);
    }
  }
}

const root = path.resolve(__dirname, "..");
for (const dir of SCAN_DIRS) {
  walk(path.join(root, dir));
}

if (violations === 0) {
  console.log("AMF lint: 0 violations — PASS");
  process.exit(0);
} else {
  console.error(`\nAMF lint FAILED: ${violations} violation(s) found\n`);
  for (const r of results) {
    console.error(`  ${r.file}:${r.line}  [/${r.pattern}/]`);
    console.error(`    > ${r.text.slice(0, 120)}`);
  }
  console.error("\nFix all violations before committing. See docs/TECH-REFERENCE.md §6.\n");
  process.exit(1);
}
