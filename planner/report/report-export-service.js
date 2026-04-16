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

  // Export to Excel
  function exportExcel(data) {
    if (!window.XLSX) {
      alert("SheetJS (XLSX) not loaded. Cannot export to Excel.");
      return;
    }
    if (typeof window.buildExcel !== "function") {
      alert("report-excel.js not loaded.");
      return;
    }
    window.buildExcel(data);
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

  window.BExport = {
    generateReport: generateReport,
    exportExcel: exportExcel,
    printReport: printReport,
    downloadHTML: downloadHTML,
    checkDeps: _checkDeps,
    buildAiPrompt: buildAiPrompt,
    parseAiResponse: parseAiResponse
  };

})();
