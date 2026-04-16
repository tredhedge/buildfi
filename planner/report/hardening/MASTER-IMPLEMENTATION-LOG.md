# BuildFi Report Hardening - Master Implementation Log

Last updated: 2026-04-16 (end-of-cycle update)  
Owner: Codex + tredh

## 1) Purpose

Single source of truth for this hardening program:

1. What we are fixing.
2. In what order.
3. How to run checks.
4. What is done vs pending.
5. How to resume quickly when context is long.

## 2) Quality Target (non-negotiable)

We are targeting production-grade quality (Naviplan/Conquest-level trust bar):

1. Data integrity first.
2. AI narrative grounded to validated numbers.
3. Clean FR/EN rendering (no encoding defects).
4. Premium UX/UI only after trust gates pass.

## 3) Canonical Paths

1. Report modules: `planner/report/`
2. Test harness: `planner/report/test-reports.js`
3. FR outputs: `planner/report/test-output/*_fr.html`
4. EN outputs: `planner/report/test-output/*_en.html`
5. Sprint 0 hardening tools: `planner/report/hardening/sprint0/`

## 4) Commands (reference)

From repo root (`buildfi/`):

```bash
npm run report:fr
npm run report:fr-en
npm run report:baseline:fr
npm run report:defects:fr
npm run report:gates:fr
npm run report:sprint0:fr
npm run report:regression:fr
npm run report:regression:fr-en
npm run report:sprint6:fr
npm run report:sprint6:fr-en
npm run report:release:gate
npm run report:release:gate:full
```

## 5) Current Status

### Sprint 0 - Baseline + Gates

Status: COMPLETED (tooling in place, gates currently passing)

Implemented files:

1. `planner/report/hardening/sprint0/capture-fr-baseline.js`
2. `planner/report/hardening/sprint0/build-defect-ledger.js`
3. `planner/report/hardening/sprint0/check-no-ship-gates.js`
4. `planner/report/hardening/sprint0/no-ship-gates.md`
5. `planner/report/hardening/sprint0/README.md`

Generated artifacts:

1. `planner/report/hardening/sprint0/baseline-fr-manifest.json`
2. `planner/report/hardening/sprint0/baseline-fr-summary.md`
3. `planner/report/hardening/sprint0/defect-ledger.fr.md`

### Snapshot of key findings (latest run)

1. 20/20 reports generated (10 FR + 10 EN).
2. `report:gates:fr` => PASS.
3. `report:regression:fr-en` => PASS.
4. `report:sprint6:fr-en` => PASS.

### Sprint 6 - Visual/Language Regression CI

Status: COMPLETED (FR+EN strict mode green)

Implemented files:

1. `planner/report/hardening/sprint6/check-visual-language-regression.js`
2. `planner/report/hardening/sprint6/README.md`

Implemented npm scripts:

1. `report:regression:fr`
2. `report:regression:fr-en` (strict EN required)
3. `report:sprint6:fr`
4. `report:sprint6:fr-en` (strict EN required)

### Sprint 7 - Full Technical Documentation

Status: COMPLETED

Implemented files:

1. `planner/report/hardening/sprint7/TECHNICAL-METHODOLOGY-A-TO-Z.md`
2. `planner/report/hardening/sprint7/REPORT-METRIC-LINEAGE.md`
3. `planner/report/hardening/sprint7/README.md`

### Sprint 8 - Release Hardening + Controlled Rollout

Status: COMPLETED

Implemented files:

1. `planner/report/hardening/sprint8/release-gate.js`
2. `planner/report/hardening/sprint8/README.md`
3. `planner/report/hardening/sprint8/RELEASE-CHECKLIST.md`

Implemented npm scripts:

1. `report:release:gate`
2. `report:release:gate:full`

## 6) Program Roadmap (execution order)

1. Sprint 0: Baseline + no-ship gates.
2. Sprint 1: Central assumptions registry + typed report payload contract.
3. Sprint 2: Engine lineage + cross-section consistency validators.
4. Sprint 3: UTF-8/rendering reliability and escaped markup cleanup.
5. Sprint 4: AI grounding and contradiction blocking.
6. Sprint 5: UX/UI hierarchy + chart clarity + print quality.
7. Sprint 6: CI regression suite and visual/language checks.
8. Sprint 7: Full technical methodology documentation (A to Z).
9. Sprint 8: release hardening and controlled rollout.

## 7) Rules for All Next Steps

1. Do not bypass gate failures.
2. Do not ship if P0/P1 trust issues remain.
3. Preserve deterministic test harness for persona comparisons.
4. Any new metric shown in report must be traceable to source formula/fields.
5. AI text must not introduce numbers outside validated payload.

## 8) Post-Cycle Backlog (Next Major Wave)

Goal: move remaining hardcoded assumptions into a versioned registry and complete deeper engine governance.

### Backlog checklist

1. Create assumptions registry file structure (versioned).
2. Define schema for registry (types, units, locale notes).
3. Inventory hardcoded constants in report engine modules.
4. Migrate constants to registry references in prioritized modules.
5. Expand payload schema enforcement and metric lineage coverage.
6. Add stronger cross-section consistency validators at API boundary.

### Acceptance (next wave)

1. No business constants hardcoded in targeted modules.
2. Report generation fails fast on schema violations.
3. Mapping exists for every major KPI shown in report.

## 9) Session Resume Protocol

At start of each session:

1. Read this file first.
2. Run `npm run report:release:gate`.
3. Confirm all gates are green.
4. Continue only the next open backlog item.
5. Append a short entry to `10) Change Journal`.

## 10) Change Journal

### 2026-04-16

1. Added Sprint 0 baseline + ledger + no-ship gate scripts.
2. Added npm scripts for repeatable execution.
3. Generated baseline artifacts and validated that gates fail on known defects.
4. Created this master log to keep continuity over long conversation/work cycles.
5. Added API report audit gates (pre-render + post-render) for `/api/export` and `/api/webhook`.
6. New shared audit module: `lib/report-audit.ts` with blocking checks for:
7. Invalid chronology/metrics payload.
8. AI content defects (`undefined`, `NaN`, escaped markup, encoding artifacts).
9. Rendered HTML defects (`charset`, escaped markup, encoding artifacts, broken structure).
10. Added payload contract module: `lib/report-payload-contract.ts`.
11. Integrated contract enforcement into pre-render audit (`payload_contract_violation` as critical).
12. Contract coverage:
13. Expert payload: required numeric/string fields + `projTable`/`medRevData` shape + chronology/range checks.
14. Bilan360 payload: required numeric/string fields + `pdSeries`/`decumTable` shape + chronology/range checks.

### 2026-04-16 (Scope Realignment + P3/P4 Progress)

1. Re-aligned implementation scope to the single planner report stream only: `planner/report/*`.
2. Confirmed API touchpoints used by report flow are orchestrated from planner UI (`planner/planner_v2.html`) while renderer modules stay in `planner/report/*`.
3. Fixed escaped markup in AI callouts by hardening `AiBlock` in `planner/report/report-formatters.js`:
4. Keeps HTML escaping by default.
5. Restores only safe inline emphasis (`<strong>`, `<em>`) and markdown bold rendering.
6. Refactored `planner/report/test-reports.js` AI fixture generation:
7. Removed corrupted hardcoded narrative block.
8. Replaced with deterministic, data-linked AI test narration (including estate values sourced from MC payload).
9. Updated baseline extraction in `capture-fr-baseline.js`:
10. Succession AI parser now supports both escaped and rendered `<strong>`.
11. Mojibake detector tuned to avoid false positives on valid French glyphs (e.g., `Â` in `Âge`).
12. Current Sprint 0 status after rerun: `NO-SHIP GATES PASSED`.

### 2026-04-16 (P5 - UX/UI + Chart + Print Pass)

1. Upgraded report visual hierarchy in `planner/report/report-pdf.js`:
2. Stronger section headers (`.sec`), refined KPI/table readability, subtle zebra rows for dense tables.
3. Added reusable chart UI classes (`.chart-block`, `.chart-title`, `.chart-legend*`) for consistent visual language.
4. Improved print CSS to better preserve block integrity and color fidelity (`print-color-adjust`, keep chart blocks intact).
5. Improved chart clarity in `planner/report/report-charts.js`:
6. Added explicit axes for area/fan/histogram charts.
7. Forced last x-axis tick labels to render (avoids truncating end horizon labels).
8. Unified legends and chart wrappers across chart types for cleaner scanability.
9. Localized deterministic marker labels in histogram/fan chart context (`fr` vs `en` rendering).
10. Regression validation rerun completed:
11. `npm run report:sprint0:fr` => `NO-SHIP GATES PASSED`.

### 2026-04-16 (P6 - CI Regression FR + EN readiness)

1. Added Sprint 6 regression script: `planner/report/hardening/sprint6/check-visual-language-regression.js`.
2. Added dual-language quality logic:
3. FR checks (structural + render + FR anchors + EN leakage detection on visible text).
4. EN checks (structural + render + EN anchors + FR leakage detection on visible text).
5. Added strict EN mode with `--require-en` (fails when `_en.html` files are missing).
6. Added npm scripts:
7. `report:regression:fr`, `report:regression:fr-en`, `report:sprint6:fr`, `report:sprint6:fr-en`.
8. Added/updated Sprint 6 documentation in `planner/report/hardening/sprint6/README.md`.
9. Validation results:
10. `npm run report:sprint6:fr` => PASS.
11. `npm run report:regression:fr-en` => expected FAIL (missing EN artifacts), confirming strict mode works.

### 2026-04-16 (P6 closure + P7/P8 completion)

1. Upgraded `planner/report/test-reports.js` to generate both FR and EN artifacts for all 10 benchmark profiles (20 files total).
2. Added bilingual deterministic AI fixture generation (`aiTextFR` + `aiTextEN`) with shared numeric grounding.
3. Removed mojibake-causing profile fixture strings in benchmark data (HNW and debt profiles).
4. Validated strict bilingual hardening path:
5. `npm run report:sprint6:fr-en` => PASS.
6. Added Sprint 7 technical documentation bundle:
7. `sprint7/TECHNICAL-METHODOLOGY-A-TO-Z.md`.
8. `sprint7/REPORT-METRIC-LINEAGE.md`.
9. Added Sprint 8 release hardening bundle:
10. `sprint8/release-gate.js`, `sprint8/README.md`, `sprint8/RELEASE-CHECKLIST.md`.
11. Added release scripts: `report:release:gate`, `report:release:gate:full`.
