# Report Baseline (Step 1)

This folder freezes the current report/export implementation before we extract
PDF/Excel logic into separate scripts.

## Scope

- Source file: `planner_v2.html`
- Report renderer (HTML for iframe): `reportHTML` `useMemo`
- Export paths:
  - CSV helper
  - XLSX (SheetJS)
  - XLSX premium/template (ExcelJS)
  - HTML report download buttons

## Snapshots captured

- `snapshots/report_usememo_snapshot.txt`
- `snapshots/export_excel_snapshot.txt`
- `snapshots/report_ui_snapshot.txt`
- `report_usememo_dependencies.txt`
- `manifest.json`

Each snapshot contains `lineNumber:source` rows from `planner_v2.html`.

## Why this baseline exists

1. Preserve behavior while we refactor.
2. Compare old vs new output section-by-section.
3. Keep rollback options simple.

## Re-generate snapshots

Run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/report_baseline_extract.ps1
```
