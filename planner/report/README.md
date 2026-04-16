# report/ — BuildFi Modular Report System

Extracted from `report-builder.js` (monolith) into 5 focused modules + 1 orchestrator.

## Architecture

```
report-formatters.js   → window.BFmt     (zero deps)
report-data.js         → window.BData    (depends on BFmt)
report-charts.js       → window.BCharts  (depends on BFmt)
report-pdf.js          → window.buildReport(data) → HTML string
                          (depends on BFmt, BData, BCharts)
report-excel.js        → window.buildExcel(data) → triggers XLSX download
                          (depends on BFmt, BData, SheetJS)
report-export-service.js → window.BExport (depends on all above)
```

## Load Order (required)

```html
<script src="report/report-formatters.js"></script>
<script src="report/report-data.js"></script>
<script src="report/report-charts.js"></script>
<script src="report/report-pdf.js"></script>
<script src="report/report-excel.js"></script>
<script src="report/report-export-service.js"></script>
```

## Usage

```js
// Generate HTML report
var html = window.buildReport({
  mc: mcResult,        // Monte Carlo output
  detRun: detResult,   // Deterministic run (optional)
  params: { age, retAge, deathAge, sal, retSpM, prov, ... },
  client: { name: "Client Name" },
  rptLang: "fr",       // "fr" or "en"
  rptMode: "standard", // "standard" or "expert"
  aiReport: aiData     // AI narration slots (optional)
});

// Export to Excel (12 tabs)
window.buildExcel({ mc, params, client, ... });
```

## Testing

```bash
node report/smoke-test.js    # 72 contract + integration tests
```

## Module Responsibilities

| Module | Lines | Responsibility |
|--------|-------|---------------|
| formatters | ~360 | Number/date formatting, grade system, brand colors, HTML markup helpers, bilingual labels, profile detection |
| data | ~365 | Tax engine (federal + 13 provinces), QPP/OAS/GIS calculations, `buildReportPayload()` data preparation |
| charts | ~370 | SVG generators: area, fan chart, tornado, histogram, waterfall, timeline, donut |
| pdf | ~1050 | Full HTML report: cover page, 15+ conditional sections, print CSS, dynamic section numbering |
| excel | ~240 | 12-tab XLSX export via SheetJS |
| export-service | ~80 | Orchestration: generate, print, download HTML, export Excel, dependency check |
