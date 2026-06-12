# Inventory (Current Entry Points)

Source: `planner_v2.html`

## Script dependencies

- Line 374: `./vendor/exceljs.min.js`
- Line 375: `./vendor/xlsx.full.min.js`

## Report renderer

- Start: line 8322  
  `var reportHTML = useMemo(function() {`
- End marker: line 9400  
  dependency array closure for the `useMemo`.

Snapshot file:

- `snapshots/report_usememo_snapshot.txt` (approx line range 8314-9420)

## Export helpers

- Line 9596: `_exportCSV(headers, rows, filename)`
- Line 9684: `_exportFullReportXLSX()` (SheetJS workbook)
- Line 9945: `_exportFullReportXLSX_Pro()` (ExcelJS + template flow)

Snapshot file:

- `snapshots/export_excel_snapshot.txt` (approx line range 9588-10410)

## UI wiring (report tab controls)

- Line 15680: Excel export button uses `_exportFullReportXLSX_Pro`
- Line 15683: HTML download guard (`reportHTML.length < 100`)
- Line 15690: HTML report filename download
- Line 15708: iframe uses `srcDoc: reportHTML`

Snapshot file:

- `snapshots/report_ui_snapshot.txt` (approx line range 15652-15720)

## Additional export touchpoints

- Line 19274: methodology CSV export call
- Line 19879-19882: alternate HTML export/download flow

