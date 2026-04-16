# Release Checklist (Planner Report)

Use this checklist before every release touching `planner/report/*`.

## A. Mandatory Gates

1. `npm run report:release:gate` passes.
2. `npm run report:sprint6:fr-en` passes.
3. `npm run report:gates:fr` passes.

## B. Artifact Integrity

1. `planner/report/test-output` contains 10 FR and 10 EN outputs for benchmark profiles.
2. `planner/report/hardening/sprint0/baseline-fr-manifest.json` exists and is fresh.
3. `planner/report/hardening/sprint0/defect-ledger.fr.md` exists.

## C. Documentation Integrity

1. `planner/report/hardening/sprint7/TECHNICAL-METHODOLOGY-A-TO-Z.md` updated if logic changed.
2. `planner/report/hardening/sprint7/REPORT-METRIC-LINEAGE.md` updated if KPI/formula changed.
3. `planner/report/hardening/MASTER-IMPLEMENTATION-LOG.md` updated with change journal entry.

## D. Product Quality Spot Check

1. Review one FR and one EN report end-to-end.
2. Confirm no encoding artifacts, no escaped markup, no broken charts.
3. Confirm AI blocks do not contradict visible KPI values.

## E. Optional Deep Gate

1. Run `npm run report:release:gate:full` for full suite + build checks.
