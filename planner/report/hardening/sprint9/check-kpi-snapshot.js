#!/usr/bin/env node
// sprint9/check-kpi-snapshot.js
//
// Persona KPI snapshot gate. Extracts headline numbers from each generated
// persona report and compares against a frozen baseline. This is the layer the
// existing hardening pipeline was missing: sprint0 checks for encoding/mojibake
// defects and sprint6 does structural/language regression, but neither catches
// silent number drift ("median estate went from $850k to $420k, report still
// parses fine, gate passes").
//
// Usage:
//   node planner/report/hardening/sprint9/check-kpi-snapshot.js          # compare
//   node planner/report/hardening/sprint9/check-kpi-snapshot.js --write  # rewrite baseline
//
// Exit 1 on drift unless --write given. Tolerance is configured per metric
// (most are exact-match; percent-based ones allow ±1% absolute drift to absorb
// MC noise). Before regenerating a baseline, verify the drift is intentional.

"use strict";

const fs = require("fs");
const path = require("path");

const REPORT_DIR = path.resolve(__dirname, "..", "..");
const TEST_OUTPUT_DIR = path.join(REPORT_DIR, "test-output");
const BASELINE_PATH = path.join(__dirname, "kpi-baseline.json");

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

// Label → { fr, en } — used to locate the KPI in the HTML.
// `tol` is the tolerance applied during diff; see diffValues below.
const KPI_SPEC = [
  { key: "successRate",    fr: "Taux de succès",      en: "Success rate",        tol: { type: "pctAbs", v: 1 } },
  { key: "p50Wealth",      fr: "P50 patrimoine",      en: "P50 wealth",          tol: { type: "money", v: 5 } },
  { key: "p25Wealth",      fr: "P25 prudent",         en: "P25 cautious",        tol: { type: "money", v: 5 } },
  { key: "durability",     fr: "Durabilité",          en: "Savings durability",  tol: { type: "exact" } },
  { key: "initialWR",      fr: "Retrait initial",     en: "Init. WR",            tol: { type: "pctAbs", v: 1 } },
  { key: "monthlyGap",     fr: "Écart mensuel",       en: "Monthly gap",         tol: { type: "money", v: 5 } },
  { key: "lifetimeTax",    fr: "Impôt viager",        en: "Lifetime tax",        tol: { type: "money", v: 5 } },
  { key: "oasClawbackYrs", fr: "Années récup. PSV",   en: "OAS clawback",        tol: { type: "exact" } },
  { key: "horizon",        fr: "Horizon",             en: "Horizon",             tol: { type: "exact" } }
];

// Extract a KPI value by its label. The report renders KPIs as
//   <div class="kpi-v" style="color:X">VALUE</div><div class="kpi-l">LABEL</div>
// where VALUE is often wrapped in `<span class="mono">…</span>`. We capture the
// entire inner HTML of kpi-v, then strip tags to get the displayed text.
function extractKpi(html, labelText) {
  const esc = labelText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    '<div class="kpi-v"[^>]*>((?:(?!</div>).)*)</div><div class="kpi-l">' + esc,
    "i"
  );
  const m = html.match(re);
  if (!m) return null;
  // Strip HTML tags and decode common entities.
  return m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .trim();
}

// Parse money strings ("485 K$", "$485K", "1,2 M$", "$1.2M", "—") into a number.
// Returns null for non-money / non-parseable inputs (including em-dash placeholder).
function parseMoney(s) {
  if (s == null || s === "\u2014" || s === "-") return null;
  const raw = String(s).replace(/[\u00a0\u2212\s]/g, "").replace(",", ".");
  // Match leading optional sign, number, optional K/M suffix, optional $ marker.
  const m = raw.match(/^(-?)\$?(-?)(\d+(?:\.\d+)?)([KM]?)\$?$/);
  if (!m) return null;
  const sign = (m[1] === "-" || m[2] === "-") ? -1 : 1;
  let v = parseFloat(m[3]);
  if (m[4] === "K") v *= 1e3;
  else if (m[4] === "M") v *= 1e6;
  return sign * v;
}

function parsePct(s) {
  if (s == null) return null;
  const m = String(s).match(/(-?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

function diffValues(spec, baselineVal, currentVal) {
  if (baselineVal === currentVal) return null;
  if (baselineVal == null && currentVal == null) return null;

  if (spec.tol.type === "exact") {
    return `baseline="${baselineVal}" current="${currentVal}"`;
  }
  if (spec.tol.type === "pctAbs") {
    const a = parsePct(baselineVal);
    const b = parsePct(currentVal);
    if (a == null || b == null) return `baseline="${baselineVal}" current="${currentVal}" (unparseable)`;
    if (Math.abs(a - b) <= spec.tol.v) return null;
    return `${a}% → ${b}% (Δ ${(b - a).toFixed(2)}pp > ±${spec.tol.v}pp)`;
  }
  if (spec.tol.type === "money") {
    const a = parseMoney(baselineVal);
    const b = parseMoney(currentVal);
    if (a == null || b == null) {
      // If shape changed (e.g. "—" ↔ number), fail.
      if (baselineVal !== currentVal) return `shape changed: baseline="${baselineVal}" current="${currentVal}"`;
      return null;
    }
    const base = Math.max(Math.abs(a), 1);
    const pct = Math.abs(a - b) / base * 100;
    if (pct <= spec.tol.v) return null;
    return `${baselineVal} → ${currentVal} (Δ ${pct.toFixed(1)}% > ±${spec.tol.v}%)`;
  }
  return `${baselineVal} → ${currentVal}`;
}

function extractAllKpis(html, lang) {
  const out = {};
  for (const spec of KPI_SPEC) {
    const label = lang === "fr" ? spec.fr : spec.en;
    out[spec.key] = extractKpi(html, label);
  }
  return out;
}

function main() {
  const write = process.argv.includes("--write");

  const manifestByPersona = {};
  for (const id of PROFILE_IDS) {
    manifestByPersona[id] = {};
    for (const lang of LANGS) {
      const file = path.join(TEST_OUTPUT_DIR, `${id}_${lang}.html`);
      if (!fs.existsSync(file)) {
        throw new Error(`Missing report artifact: ${file}. Run 'npm run report:fr-en' first.`);
      }
      const html = fs.readFileSync(file, "utf8");
      manifestByPersona[id][lang] = extractAllKpis(html, lang);
    }
  }

  if (write) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(manifestByPersona, null, 2) + "\n", "utf8");
    console.log("[kpi-snapshot] Baseline written: " + BASELINE_PATH);
    process.exit(0);
  }

  if (!fs.existsSync(BASELINE_PATH)) {
    console.error("[kpi-snapshot] No baseline found. Run with --write to create one.");
    console.error("  expected at: " + BASELINE_PATH);
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
  const failures = [];

  for (const id of PROFILE_IDS) {
    for (const lang of LANGS) {
      const bl = (baseline[id] || {})[lang] || {};
      const cur = manifestByPersona[id][lang];
      for (const spec of KPI_SPEC) {
        const delta = diffValues(spec, bl[spec.key], cur[spec.key]);
        if (delta) failures.push(`${id} [${lang}] ${spec.key}: ${delta}`);
      }
    }
  }

  const totalChecks = PROFILE_IDS.length * LANGS.length * KPI_SPEC.length;

  if (failures.length > 0) {
    console.error(`[kpi-snapshot] FAIL: ${failures.length}/${totalChecks} KPI drift(s) detected:`);
    failures.forEach(function(f) { console.error("  - " + f); });
    console.error("\nIf the drift is intentional (tax-year update, engine fix), rerun with --write to rebaseline.");
    process.exit(1);
  }

  console.log(`[kpi-snapshot] PASS: ${totalChecks} KPI checks across ${PROFILE_IDS.length} personas × ${LANGS.length} languages.`);
}

main();
