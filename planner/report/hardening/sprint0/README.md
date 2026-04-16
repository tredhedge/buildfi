# Sprint 0 Hardening (FR Reports)

This folder sets a reproducible baseline and hard quality gates for the 10 FR report personas.

## Commands

1. Generate 10 FR reports + capture baseline manifest + summary:

```bash
node planner/report/hardening/sprint0/capture-fr-baseline.js
```

2. Build the harsh defect ledger from current baseline:

```bash
node planner/report/hardening/sprint0/build-defect-ledger.js
```

3. Run no-ship gates (fails on critical quality defects):

```bash
node planner/report/hardening/sprint0/check-no-ship-gates.js
```

## Artifacts

- `baseline-fr-manifest.json`: checksums, sizes, and quality metrics per report.
- `baseline-fr-summary.md`: one-table quick scan for all 10 files.
- `defect-ledger.fr.md`: severity-ranked findings for triage.
- `no-ship-gates.md`: release blocker definitions.

## Intent

Sprint 0 is not UI polishing. It is a trust lock:

1. Freeze outputs.
2. Measure quality issues consistently.
3. Block releases when critical defects persist.
