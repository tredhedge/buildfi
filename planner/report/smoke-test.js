// smoke-test.js — Verify report module exports and basic contract
// Run: node report/smoke-test.js
(function() {
  "use strict";

  // Minimal browser-like global
  var window = global;
  window.window = window;

  var pass = 0, fail = 0;
  function assert(cond, msg) {
    if (cond) { pass++; console.log("  ✓ " + msg); }
    else { fail++; console.error("  ✗ " + msg); }
  }

  // ── 1. Load modules in order ──────────────────────────────────────
  console.log("\n=== Loading modules ===");

  require("./report-formatters.js");
  assert(typeof window.BFmt === "object", "BFmt exported");

  require("./report-data.js");
  assert(typeof window.BData === "object", "BData exported");

  require("./report-charts.js");
  assert(typeof window.BCharts === "object", "BCharts exported");

  require("./report-pdf.js");
  assert(typeof window.buildReport === "function", "buildReport exported");

  // Skip report-excel.js (needs XLSX) — just verify it parses
  try {
    // It will return early because BFmt/BData are available but XLSX isn't
    // But it should not crash
    require("./report-excel.js");
    assert(typeof window.buildExcel === "function", "buildExcel exported");
  } catch(e) {
    assert(false, "buildExcel load error: " + e.message);
  }

  require("./report-ai-prompt.js");
  assert(typeof window.BAiPrompt === "object", "BAiPrompt exported");

  require("./report-export-service.js");
  assert(typeof window.BExport === "object", "BExport exported");

  // ── 2. BFmt contract ──────────────────────────────────────────────
  console.log("\n=== BFmt contract ===");
  var F = window.BFmt;
  assert(typeof F.fmtMoney === "function", "fmtMoney");
  assert(typeof F.fmtCompact === "function", "fmtCompact");
  assert(typeof F.fmtPct === "function", "fmtPct");
  assert(typeof F.fmtCurrency === "function", "fmtCurrency");
  assert(typeof F.fmtInt === "function", "fmtInt");
  assert(typeof F.fmtDate === "function", "fmtDate");
  assert(typeof F.fmtDateShort === "function", "fmtDateShort");
  assert(typeof F.grade === "function", "grade");
  assert(typeof F.succColor === "function", "succColor");
  assert(typeof F.detectProfile === "function", "detectProfile");
  assert(typeof F.L === "function", "L");
  assert(typeof F.qppLabel === "function", "qppLabel");
  assert(typeof F.COLORS === "object", "COLORS");
  assert(typeof F.VERSION === "string", "VERSION");
  assert(typeof F.esc === "function", "esc");
  assert(typeof F.Sec === "function", "Sec");
  assert(typeof F.KPI === "function", "KPI");
  assert(typeof F.Card === "function", "Card");
  assert(typeof F.R === "function", "R");
  assert(typeof F.CopyBtn === "function", "CopyBtn");
  assert(typeof F.AiBlock === "function", "AiBlock");
  assert(typeof F.Insight === "function", "Insight");
  assert(typeof F.Warning === "function", "Warning");
  assert(typeof F.RecoCard === "function", "RecoCard");
  assert(typeof F.Skeleton === "function", "Skeleton");
  assert(typeof F.pc === "function", "pc");

  // Spot checks
  assert(F.fmtMoney(1234.56, true) !== "", "fmtMoney returns non-empty");
  assert(F.fmtPct(0.75, 1, true) !== "", "fmtPct returns non-empty");
  assert(F.grade(0.95, true).letter === "A+", "grade A+ for 95%");
  assert(F.grade(0.6, false).letter === "C", "grade C for 60%");
  assert(F.succColor(0.9).length > 0, "succColor returns color");
  assert(F.qppLabel("QC", true) === "RRQ", "qppLabel QC/FR");
  assert(F.qppLabel("ON", false) === "CPP", "qppLabel ON/EN");
  assert(F.esc("<b>") === "&lt;b&gt;", "esc escapes HTML");

  // ── 3. BData contract ─────────────────────────────────────────────
  console.log("\n=== BData contract ===");
  var D = window.BData;
  assert(typeof D.calcTax === "function", "calcTax");
  assert(typeof D.calcQPP === "function", "calcQPP");
  assert(typeof D.calcOAS === "function", "calcOAS");
  assert(typeof D.buildReportPayload === "function", "buildReportPayload");
  assert(typeof D.TAX_BASE_YEAR === "number", "TAX_BASE_YEAR");
  assert(typeof D.PROV_TAX === "object", "PROV_TAX");
  assert(Object.keys(D.PROV_TAX).length >= 13, "13+ provinces in PROV_TAX");

  // buildReportPayload with null → should not crash
  var d = D.buildReportPayload(null);
  assert(d.empty === true, "buildReportPayload(null) → empty");

  // buildReportPayload with minimal data
  var d2 = D.buildReportPayload({ mc: { pD: [{ age: 65, p50: 500000 }], medF: 500000 }, params: { age: 35, retAge: 65, deathAge: 95, sal: 80000, retSpM: 4000, prov: "QC" } });
  assert(d2.empty !== true, "buildReportPayload with MC data → not empty");
  assert(typeof d2.p === "object", "buildReportPayload returns p");
  assert(typeof d2.mc === "object", "buildReportPayload returns mc");
  assert(typeof d2.fr === "boolean", "buildReportPayload returns fr");

  // ── 4. BCharts contract ───────────────────────────────────────────
  console.log("\n=== BCharts contract ===");
  var Ch = window.BCharts;
  assert(typeof Ch.svgArea === "function", "svgArea");
  assert(typeof Ch.svgFanChart === "function", "svgFanChart");
  assert(typeof Ch.svgTornado === "function", "svgTornado");
  assert(typeof Ch.svgHistogram === "function", "svgHistogram");
  assert(typeof Ch.svgWaterfall === "function", "svgWaterfall");
  assert(typeof Ch.svgTimeline === "function", "svgTimeline");
  assert(typeof Ch.svgDonut === "function", "svgDonut");

  // ── 4b. BAiPrompt contract ────────────────────────────────────────
  console.log("\n=== BAiPrompt contract ===");
  var Ai = window.BAiPrompt;
  assert(typeof Ai.buildPrompt === "function", "buildPrompt");
  assert(typeof Ai.parseResponse === "function", "parseResponse");
  assert(typeof Ai.extractData === "function", "extractData");
  assert(Array.isArray(Ai.SLOTS), "SLOTS is array");
  assert(Ai.SLOTS.length >= 15, "15+ slots defined (" + Ai.SLOTS.length + ")");
  // First slot is advisor_letter (updated in 2026-04 rewrite). We also
  // assert the presence of the load-bearing slots regardless of ordering.
  assert(Ai.SLOTS[0].key === "advisor_letter", "first slot is advisor_letter");
  assert(Ai.SLOTS.some(function (s) { return s.key === "overall_assessment"; }), "overall_assessment slot present");
  assert(Ai.SLOTS.some(function (s) { return s.key === "verdict"; }), "verdict slot present");

  // parseResponse with valid JSON (leaves markdown intact; AiBlock promotes it safely)
  var _testJson = '{"verdict": "Test **bold** text", "extra": "ignored"}';
  var _parsed = Ai.parseResponse(_testJson, ["verdict"]);
  assert(_parsed.verdict === "Test **bold** text", "parseResponse preserves markdown (no HTML conversion)");
  assert(!_parsed.extra, "parseResponse filters to requested slots only");

  // parseResponse with code fences
  var _fenced = '```json\n{"verdict": "OK"}\n```';
  var _parsedFence = Ai.parseResponse(_fenced, ["verdict"]);
  assert(_parsedFence.verdict === "OK", "parseResponse strips code fences");

  // AiBlock: HTML in AI output stays escaped; only markdown is promoted
  var _hostile = F.AiBlock("hello <img src=x onerror=alert(1)> **safe**", true);
  assert(_hostile.indexOf("<img") < 0, "AiBlock escapes raw HTML from AI");
  assert(_hostile.indexOf("&lt;img") >= 0, "AiBlock renders HTML as escaped entities");
  assert(_hostile.indexOf("<strong>safe</strong>") >= 0, "AiBlock promotes **bold** to <strong>");

  // ── 5. BExport contract ───────────────────────────────────────────
  console.log("\n=== BExport contract ===");
  var E = window.BExport;
  assert(typeof E.generateReport === "function", "generateReport");
  assert(typeof E.exportExcel === "function", "exportExcel");
  assert(typeof E.printReport === "function", "printReport");
  assert(typeof E.downloadHTML === "function", "downloadHTML");
  assert(typeof E.checkDeps === "function", "checkDeps");
  assert(typeof E.buildAiPrompt === "function", "buildAiPrompt");
  assert(typeof E.parseAiResponse === "function", "parseAiResponse");

  // checkDeps should report no missing deps (except XLSX)
  var missing = E.checkDeps();
  assert(missing.length === 0, "checkDeps: no missing deps (all loaded)");

  // ── 6. Integration: buildReport with minimal data ─────────────────
  console.log("\n=== Integration: buildReport ===");
  var html = window.buildReport({
    mc: { pD: [{ age: 65, p5: 200000, p25: 350000, p50: 500000, p75: 650000, p95: 800000 }], medF: 500000, var5: 200000, var95: 800000, succRate: 0.85, n: 5000 },
    params: { age: 35, retAge: 65, deathAge: 95, sal: 80000, retSpM: 4000, prov: "QC", rrsp: 50000, tfsa: 30000, nr: 10000 },
    client: { name: "Test Client" },
    rptLang: "fr"
  });
  assert(typeof html === "string", "buildReport returns string");
  assert(html.length > 1000, "buildReport returns substantial HTML (" + html.length + " chars)");
  assert(html.indexOf("<!DOCTYPE html>") >= 0 || html.indexOf("<!doctype html>") >= 0, "buildReport returns full HTML document");
  assert(html.indexOf("Test Client") >= 0, "buildReport includes client name");
  assert(html.indexOf("BuildFi") >= 0, "buildReport includes BuildFi branding");

  // Empty data → loading/empty state
  var emptyHtml = window.buildReport({});
  assert(typeof emptyHtml === "string", "buildReport({}) returns string");

  // Null data → should not crash
  var nullHtml = window.buildReport(null);
  assert(typeof nullHtml === "string", "buildReport(null) returns string");

  // ── 7. Pre-release QA audit (Gate 4) ──────────────────────────────
  console.log("\n=== BReportQA (Gate 4 pre-release audit) ===");
  require("./report-qa.js");
  assert(typeof window.BReportQA === "object", "BReportQA exported");
  assert(typeof window.BReportQA.auditReport === "function", "auditReport fn exported");

  // Happy path: full report with valid data → should have no blocking issues.
  var fullPayload = {
    mc: { pD: [{ age: 65, p5: 200000, p25: 350000, p50: 500000, p75: 650000, p95: 800000 }], medF: 500000, var5: 200000, var95: 800000, succRate: 0.85, n: 5000 },
    params: { age: 35, retAge: 65, deathAge: 95, sal: 80000, retSpM: 4000, prov: "QC", rrsp: 50000, tfsa: 30000, nr: 10000 },
    client: { name: "Test Client" },
    rptLang: "fr",
    lang: "fr"
  };
  var audit = window.BReportQA.auditReport(html, fullPayload);
  assert(audit && typeof audit === "object", "auditReport returns result");
  assert(Array.isArray(audit.blocking), "audit.blocking is array");
  assert(Array.isArray(audit.warnings), "audit.warnings is array");
  if (audit.blocking.length > 0) {
    console.log("  BLOCKING ISSUES:");
    audit.blocking.forEach(function (b) { console.log("    - " + b.check + ": " + b.detail); });
  }
  if (audit.warnings.length > 0) {
    console.log("  WARNINGS:");
    audit.warnings.forEach(function (w) { console.log("    - " + w.check + ": " + w.detail); });
  }
  // The real report is built with minimal data; section detection may warn
  // but placeholder check must pass.
  var placeholders = audit.blocking.filter(function (b) { return b.check === "placeholder"; });
  assert(placeholders.length === 0, "no placeholder leakage (undefined/NaN/{{}}/TODO)");

  // Negative case: corrupted HTML with undefined should be flagged blocking.
  // Pad content so we clear the 500-char minimum-length sanity check.
  var badHtml = "<!DOCTYPE html><html><body><h1>undefined</h1><p>medF = NaN</p><span>{{missing}}</span>"
    + "<p>" + new Array(120).join("filler ") + "</p></body></html>";
  var auditBad = window.BReportQA.auditReport(badHtml, { lang: "fr" });
  var badPh = auditBad.blocking.filter(function (b) { return b.check === "placeholder"; });
  assert(badPh.length >= 3, "bad HTML triggers 3+ placeholder-blocking (undefined, NaN, {{}}) — got " + badPh.length);

  // Missing HTML should block at html-length.
  var auditNull = window.BReportQA.auditReport(null, {});
  var lenBlock = auditNull.blocking.filter(function (b) { return b.check === "html-length"; });
  assert(lenBlock.length === 1, "null HTML triggers html-length block");

  // P4.3 — Excel-side QA hook
  assert(typeof window.BReportQA.auditExcel === "function", "auditExcel fn exported");
  // Null workbook → blocking
  var auditNullExcel = window.BReportQA.auditExcel(null, {});
  var excelInvalid = auditNullExcel.blocking.filter(function (b) { return b.check === "excel-invalid"; });
  assert(excelInvalid.length === 1, "null workbook triggers excel-invalid block");
  // Empty workbook → missing-sheet blocks for each required pair
  var fakeWb = { worksheets: [] };
  var auditEmptyExcel = window.BReportQA.auditExcel(fakeWb, { lang: "fr" });
  var missingBlocks = auditEmptyExcel.blocking.filter(function (b) { return b.check === "sheet-missing"; });
  assert(missingBlocks.length === 6, "empty workbook flags 6 missing required sheets, got " + missingBlocks.length);
  // Workbook with all required sheets → no sheet-missing blocks
  var minimalWb = {
    worksheets: [
      { name: "Sommaire", eachRow: function () {} },
      { name: "Profil", eachRow: function () {} },
      { name: "Projection d\u00e9terministe", eachRow: function () {} },
      { name: "Flux de tr\u00e9sorerie", eachRow: function () {} },
      { name: "Fiscalit\u00e9", eachRow: function () {} },
      { name: "M\u00e9thodologie", eachRow: function () {} }
    ],
    getWorksheet: function (n) { return this.worksheets.find(function (w) { return w.name === n; }); }
  };
  var auditMin = window.BReportQA.auditExcel(minimalWb, { lang: "fr" });
  var minMissing = auditMin.blocking.filter(function (b) { return b.check === "sheet-missing"; });
  assert(minMissing.length === 0, "minimal workbook has 0 sheet-missing blocks, got " + minMissing.length);

  // ── Results ────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════");
  console.log("  " + pass + " passed, " + fail + " failed");
  console.log("══════════════════════════════════════\n");
  process.exit(fail > 0 ? 1 : 0);
})();
