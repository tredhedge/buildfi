# BuildFi Planner Report Engine - Technical Methodology (A to Z)

Last updated: 2026-04-16
Scope: single report stream under `planner/report/*`.

## 1. Objective and Trust Bar

This document defines how the planner report is computed, transformed, narrated, rendered, validated, and released.

Primary quality order:

1. Data integrity.
2. Numeric lineage traceability.
3. Language/rendering quality (FR and EN).
4. UX/UI clarity and print fidelity.

## 2. Runtime Architecture

## 2.1 Core modules

1. `planner/report/report-formatters.js` (`window.BFmt`): formatting, localized labels, profile helpers, safe HTML helpers.
2. `planner/report/report-data.js` (`window.BData`): constants, tax and benefit calculators, payload normalization and derived metrics.
3. `planner/report/report-charts.js` (`window.BCharts`): SVG chart builders (area/fan/stacked bars/histograms and legends).
4. `planner/report/report-pdf.js` (`window.buildReport`): report assembler (cover, TOC, sections, callouts, tables, print CSS).
5. `planner/report/test-reports.js`: deterministic multi-profile harness (FR+EN), regression generation baseline.

## 2.2 Dependency order

Modules are loaded in this order in the harness:

1. `report-formatters.js`
2. `report-data.js`
3. `report-charts.js`
4. `report-pdf.js`
5. `report-ai-prompt.js`

`window.buildReport` requires all three runtime dependencies: `BFmt`, `BData`, `BCharts`.

## 3. Inputs and Contract

## 3.1 Primary input object (`buildReport(data)`)

Key fields:

1. `params`: planner assumptions and profile state.
2. `mc`: Monte Carlo output (or deterministic fallback transformed to pseudo-MC shape).
3. `client`: display identity and advisor metadata.
4. `ai` or `aiReport`: optional narrative slots.
5. `rptLang`: `fr` or `en`.
6. `rptMode`: currently single stream (`standard`/`expert` internals supported; legacy `essentiel` normalized to `standard`).

## 3.2 AI slot normalization

In `buildReportPayload`, AI fields are normalized from multiple naming conventions:

1. camelCase -> snake_case.
2. API 360 labels -> renderer slots.
3. expert blocks -> shared slots.

This prevents report breakage when upstream providers emit variant keys.

## 4. Assumptions and Fiscal Constants

Constants are currently centralized in `report-data.js` (2026 basis), including:

1. Federal brackets and rates.
2. Provincial brackets/rates/credits for all provinces.
3. OAS/QPP/GIS parameter values.
4. smoothing configuration constants.

Main functions:

1. `calcTax(inc, yr, prov, infR, retired, divInfo)`.
2. `calcQPP(startAge, avgEarn, yrsContrib)`.
3. `calcOAS(startAge, income, yr, infR, currentAge)`.
4. `calcPayroll(sal, prov, yr, infR)`.

## 5. Core Computation Pipeline

## 5.1 Payload build (`buildReportPayload`)

The data builder computes, among others:

1. Government income (`govM`, `govY`).
2. Annual spending (`spendY`) and coverage ratio (`covRatio = govY / spendY`).
3. Funding gap (`gapM`).
4. weighted MER (`merWt`).
5. tax metrics (`_optTax`, `_naiveTax`, `_taxAlpha`, `avgEffRate`).
6. OAS clawback year count (`oasClbkYrs`).
7. fee drag approximation over horizon (`feeCost`).
8. retirement withdrawal baseline (`_retBal`, `_wdPct`).

## 5.2 Deterministic fallback behavior

If full MC rows are absent but deterministic schedule exists:

1. deterministic schedule is converted to MC-compatible rows.
2. report renders in degraded-but-valid mode.
3. empty-state guard prevents malformed output.

## 6. Rendering Methodology

## 6.1 Report structure

`report-pdf.js` builds a complete HTML document with:

1. cover page.
2. dynamic TOC.
3. section pages (`sec-*` anchors).
4. callouts, KPI cards, tables, charts.
5. methodology and disclaimer footer.

## 6.2 Visual system

1. Design tokens from `BFmt.COLORS`.
2. print-safe CSS (`print-color-adjust: exact`).
3. chart wrappers with `break-inside: avoid` for pagination robustness.
4. unified `chart-title` and `chart-legend` system.

## 6.3 Localization

1. language selected by `rptLang`.
2. localized strings through formatter label helper (`L`).
3. report harness now generates FR and EN outputs for all profiles.

## 7. AI Narrative Methodology

## 7.1 Policy

AI narrative is display-only commentary. It must not invent independent numbers.

## 7.2 Source of truth

All numbers in narrative must originate from already-computed payload metrics.

## 7.3 Slot insertion

AI blocks are inserted only where section schema allows. Missing AI in export mode does not inject UX placeholders.

## 8. Validation and QA Gates

## 8.1 Generation harness checks (`test-reports.js`)

For each generated report file:

1. required section anchors.
2. minimum table row density.
3. minimum AI block presence.
4. cover and grade presence.
5. no `undefined` or `NaN`.
6. profile-specific section presence.
7. minimum size threshold.

## 8.2 Sprint 0 gates (`hardening/sprint0`)

1. baseline capture (FR manifest).
2. defect ledger.
3. no-ship gate checks.

Blocking defects include:

1. encoding corruption markers.
2. escaped formatting leakage.
3. succession mismatch.
4. undefined/NaN output.

## 8.3 Sprint 6 regression (`hardening/sprint6`)

1. structural drift checks vs baseline.
2. render artifact checks.
3. FR anchors + EN leakage detection (visible text).
4. EN anchors + FR leakage detection (visible text).
5. strict EN mode (`--require-en`) to fail if EN artifacts are missing.

## 9. Release Hardening (Sprint 8)

Release gate command: `npm run report:release:gate`.

Gate sequence:

1. run full FR+EN report hardening chain (`report:sprint6:fr-en`).
2. verify 20 expected output artifacts exist.
3. verify mandatory hardening artifacts/docs exist.
4. optional deep run (`--full`) can include full QA suite.

## 10. Known Limits and Risk Notes

1. Constants are still module-local constants, not yet versioned registry files.
2. The FR baseline manifest remains FR-scoped; EN uses structural checks plus FR baseline drift bounds.
3. AI quality is slot-constrained but still depends on upstream prompt/provider quality.
4. This methodology documents current implementation, not future tax-law changes.

## 11. Operating Procedure

For each change touching report engine:

1. run `npm run report:sprint6:fr-en`.
2. resolve all no-ship and sprint6 failures.
3. refresh hardening logs if behavior changed.
4. only ship after release gate passes.

## 12. A-Z Index (quick)

1. Assumptions: section 4.
2. Benefits (QPP/OAS/GIS): sections 4-5.
3. Charts: section 6.
4. Data lineage: sections 3 and 5.
5. Encoding and language quality: section 8.
6. Fiscal engine: section 4.
7. Localization: section 6.
8. Monte Carlo integration: section 5.
9. Narrative AI policy: section 7.
10. Output gating: sections 8 and 9.
