// report-export-service.js — BuildFi Report Export Orchestration
// Depends on: report-formatters.js, report-data.js, report-charts.js, report-pdf.js, report-excel.js
// Exports: window.BExport
(function() {
  "use strict";

  // Verify all dependencies loaded
  function _checkDeps() {
    var missing = [];
    if (!window.BFmt) missing.push("report-formatters.js");
    if (!window.BData) missing.push("report-data.js");
    if (!window.BCharts) missing.push("report-charts.js");
    if (!window.buildReport) missing.push("report-pdf.js");
    if (!window.buildExcel) missing.push("report-excel.js");
    if (!window.BAiPrompt) missing.push("report-ai-prompt.js");
    return missing;
  }

  // CLASSIFIER-RENDER-PLAN Phase 6 — export contract.
  // Exported reports (HTML download, print, PDF) must include every block the
  // simulator can render, regardless of the reader's classifier preferences.
  // Rationale: an exported PDF is a permanent artifact handed to advisors, tax
  // preparers, family members. They cannot toggle a 3-state view; they need the
  // full chartTier='full' + densityMode='deep' rendering by default.
  // Reader-screen (in-app) rendering still respects the live renderProfile.
  function _exportProfile() {
    return {
      finLiteracy: 'advanced',
      stressLevel: 'low',         // direct, no softening
      detailPref:  'detailed'     // deep
    };
  }
  function _withExportRenderProfile(data) {
    if (!data) return data;
    var ep = _exportProfile();
    var clone = {};
    for (var k in data) { if (Object.prototype.hasOwnProperty.call(data, k)) clone[k] = data[k]; }
    clone.finLiteracy = ep.finLiteracy;
    clone.stressLevel = ep.stressLevel;
    clone.detailPref  = ep.detailPref;
    clone._exportMode = true;
    // Codex 2026-04-27 P1: PDF/print/download exports go to a client.
    // Default clientExport=true so the simulator section + report-whatif.js
    // runtime are stripped. Caller can opt-out via data.clientExport=false
    // (e.g. internal advisor working copy).
    clone.clientExport = data.clientExport !== false;
    return clone;
  }

  // Generate HTML report string. exportMode=true forces the full/deep render.
  function generateReport(data, opts) {
    var missing = _checkDeps();
    if (missing.length > 0) {
      console.error("[BExport] Missing dependencies:", missing.join(", "));
      return '<p style="padding:20px;color:red">Report modules not loaded: ' + missing.join(", ") + '</p>';
    }
    var payload = (opts && opts.exportMode) ? _withExportRenderProfile(data) : data;
    return window.buildReport(payload);
  }

  // Lazy-load the Excel vendor bundles on first export. Together these are
  // ~1.8MB; pre-loading them on every planner open forces that cost on every
  // user even though most never export. We inject <script> tags at click time
  // and cache the promise so repeat clicks don't re-download.
  var _vendorPromise = null;
  function _loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function() { resolve(); };
      s.onerror = function() { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(s);
    });
  }
  function _loadExcelVendors() {
    if (window.XLSX && window.ExcelJS) return Promise.resolve();
    if (_vendorPromise) return _vendorPromise;
    _vendorPromise = Promise.all([
      window.XLSX ? Promise.resolve() : _loadScript("./vendor/xlsx.full.min.js"),
      window.ExcelJS ? Promise.resolve() : _loadScript("./vendor/exceljs.min.js")
    ]).catch(function(e) {
      _vendorPromise = null; // allow retry after a transient failure
      throw e;
    });
    return _vendorPromise;
  }

  // Export to Excel — loads vendor libraries on demand.
  function exportExcel(data) {
    return _loadExcelVendors()
      .then(function() {
        if (!window.XLSX) { alert("SheetJS (XLSX) not loaded. Cannot export to Excel."); return; }
        if (typeof window.buildExcel !== "function") { alert("report-excel.js not loaded."); return; }
        window.buildExcel(data);
      })
      .catch(function(e) {
        console.error("[BExport] Excel vendor load failed:", e);
        alert("Excel export unavailable: " + (e && e.message || "could not load vendor libraries."));
      });
  }

  // Print report (opens in new window). Forces export render profile so the
  // printed artifact is comprehensive regardless of reader's screen settings.
  function printReport(data) {
    var html = generateReport(data, { exportMode: true });
    if (!html) return;
    var win = window.open("", "_blank");
    if (!win) { alert("Popup blocked. Allow popups for printing."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); }, 500);
  }

  // Download report as HTML file. Forces export render profile so the saved
  // artifact carries the full report regardless of the reader's classifier.
  function downloadHTML(data) {
    var html = generateReport(data, { exportMode: true });
    if (!html) return;
    var blob = new Blob([html], { type: "text/html;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    var name = (data.client && data.client.name) || "client";
    a.download = "buildfi-rapport-" + name.replace(/[^a-zA-Z0-9]/g, "_") + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Build AI prompt from report data (for single API call)
  function buildAiPrompt(data) {
    if (!window.BAiPrompt) {
      console.error("[BExport] BAiPrompt not loaded");
      return null;
    }
    if (!window.BData) {
      console.error("[BExport] BData not loaded");
      return null;
    }
    var d = window.BData.buildReportPayload(data);
    if (d.empty) return null;
    return window.BAiPrompt.buildPrompt(d);
  }

  // Parse AI response into slot map
  function parseAiResponse(text, slotKeys) {
    if (!window.BAiPrompt) return {};
    return window.BAiPrompt.parseResponse(text, slotKeys);
  }

  window.BExport = Object.freeze({
    generateReport: generateReport,
    exportExcel: exportExcel,
    printReport: printReport,
    downloadHTML: downloadHTML,
    checkDeps: _checkDeps,
    buildAiPrompt: buildAiPrompt,
    parseAiResponse: parseAiResponse
  });

})();
