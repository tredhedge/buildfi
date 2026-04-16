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

  // Generate HTML report string
  function generateReport(data) {
    var missing = _checkDeps();
    if (missing.length > 0) {
      console.error("[BExport] Missing dependencies:", missing.join(", "));
      return '<p style="padding:20px;color:red">Report modules not loaded: ' + missing.join(", ") + '</p>';
    }
    return window.buildReport(data);
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

  // Print report (opens in new window)
  function printReport(data) {
    var html = generateReport(data);
    if (!html) return;
    var win = window.open("", "_blank");
    if (!win) { alert("Popup blocked. Allow popups for printing."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(function() { win.print(); }, 500);
  }

  // Download report as HTML file
  function downloadHTML(data) {
    var html = generateReport(data);
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
