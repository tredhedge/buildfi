# Codex Review Deferrals — folded into CLASSIFIER-RENDER-PLAN.md

**Date**: 2026-04-26
**Source**: External Codex review of shipped reports (this session)
**Plan reference**: [CLASSIFIER-RENDER-PLAN.md](./CLASSIFIER-RENDER-PLAN.md)

---

## Summary

The Codex review surfaced 7 findings (3 High, 3 Medium, 1 Low). 4 of them
were isolated bug fixes shipped immediately. 3 of them overlap directly
with the CLASSIFIER-RENDER-PLAN architecture and are deferred to land
naturally as part of the plan's phases. **Re-check these after the plan
ships** to confirm the issues are closed by the planned work.

---

## Shipped immediately (4 fixes)

| # | Codex finding | Where | What landed |
|---|---|---|---|
| HIGH-1 | Action-card scaffolding ("$ impact: case-dependent" / "to be set" / "to be modeled") | [report-pdf.js:renderActionPlan lead-grid](../report-pdf.js) | Lead-grid only renders when ALL 3 cells (impact, when, lift) have concrete data. Otherwise suppressed — rationale prose covers the lever. |
| HIGH-1b | "à documenter année par année" in meltdown action rationale | [report-actions.js cd-meltdown](../report-actions.js) | Rewrote to "The Tax Strategy section shows the year-by-year shape of this lever" / "La section Stratégie fiscale détaille le calendrier année par année". |
| MED-1 | EN reports show "346K$" instead of "$346K" | [report-formatters.js fmtCompact + fmtTableK](../report-formatters.js) | Reads `window.__bfLang` set by buildReport. EN: `$346K` / `$1.2M` / `$0`. FR: `346 K$` / `1,2 M$` / `0 $`. fmtTableK aligned same way. |
| MED-2 | FR reports leak "Confiance : high" (English string) | [report-pdf.js renderActionPlan](../report-pdf.js) | Translation map: `high → élevée`, `medium → moyenne`, `low → faible`. EN unchanged. |
| LOW-1 | "Dear Margaret" doubled (deterministic + AI both emit salutation) | [report-pdf.js renderLetter](../report-pdf.js) | Deterministic salutation suppressed when the AI letter already opens with the client's first name in the first 50 chars. |

---

## Deferred to land via CLASSIFIER-RENDER-PLAN (3 findings)

### HIGH-2 — Strip internal/quant language ("alpha", "engine output", "t-Student" in body copy)

**Why deferred:** Plan section 3 introduces a `jargonMode` axis (`plain` /
`mixed` / `technical`) on `renderProfile` derived from `finLiteracy`.
Phase 1 includes a jargon-swap table and Phase 2 wires it through. A
one-off jargon strip now would either (a) hardcode "remove alpha" in
multiple files defeating Phase 1's centralization, or (b) remove "alpha"
from all profiles including advanced readers who expect the precision.

**Plan-managed solution:** Phase 1 jargon swap table + Phase 2 dispatch.
Beginner gets "tax savings" instead of "tax alpha"; advanced reader
keeps "tax alpha"; mixed gets first-use definition then term.

**Re-check after Phase 2 ships:**
- grep generated reports for `\balpha\b` outside methodology — should
  appear ONLY in `chartTier='full'` reports (i.e. advanced readers).
- grep for "engine output" / "traceable to an engine" — should be 0
  matches in body copy regardless of profile (this phrase has no place
  in client-facing output).
- "t-Student" should appear ONLY in methodology block.

### HIGH-3 — Static-render profile (no JS engine, no What-If, no raw payloads)

**Why deferred:** Plan Phase 6 owns the print/PDF profile. The plan
explicitly states "Print/PDF export always uses `full` + `deep` regardless
of in-app preference" (section 4 acceptance, section 7 Phase 4
implementation rules, section 10 critical rule #5). A one-off
`d.staticOnly` flag now would create a SECOND dispatch axis competing
with `chartTier` / `densityMode` / `representation`.

**Plan-managed solution:** Phase 6 escape hatch produces a static profile
naturally — `chartTier='full'`, `densityMode='deep'`, no JS injection,
no `window.__BUILDFI__` payload, no `data-bf-chart-data` attributes
(or stripped at print time via the print stylesheet).

**Re-check after Phase 6 ships:**
- View-source on a printed PDF: zero `<script>` tags, zero `window.__`
  references, zero `data-bf-chart-data` attributes.
- Saved-as-HTML version is self-contained and renders identically when
  loaded in an offline browser.
- Total print payload size measured (plan section 10.17 caps at +30 KB
  for lite, +400 KB for full).

### MED-3 — Live Google Fonts dependency in every report

**Why deferred:** Tied to HIGH-3. Inline fonts only matter for the static
PDF/archive use case — interactive web view is fine fetching from CDN.
Plan Phase 6 covers the "self-contained PDF" path.

**Plan-managed solution:** Phase 6's static profile inlines fonts as
base64 data URIs (~200 KB overhead, well within the +400 KB full
budget). Interactive view keeps the live Google Fonts link.

**Re-check after Phase 6 ships:**
- grep printed PDF for `fonts.googleapis.com` — should be 0 matches.
- grep printed PDF for `data:font/woff` — should match (inlined fonts).
- Open the printed HTML offline (no network) — fonts must render
  correctly.

---

## Coordination notes for the implementer

When CLASSIFIER-RENDER-PLAN starts, the implementer should:

1. **Validate this deferral mapping** against their first-phase reading.
   If HIGH-2 doesn't actually fold cleanly into Phase 1's jargon swap
   table (e.g. because the plan's `jargonMode` axis treats vocabulary
   differently than the Codex review intended), elevate it back to a
   one-off fix rather than waiting for a phase that doesn't address it.
2. **Pick up the re-check checklist above** as part of each phase's
   acceptance criteria. Phase 6 should not ship without confirming the
   3 deferred Codex findings are closed.
3. **Re-snapshot the byte-match baseline.** Plan section 10.1 says
   "Default profile MUST not regress visually" but the baseline assumed
   pre-Sprint-1.5 state. The current default render includes new
   elements (premium badge, sunburst, donut pair, decision timeline,
   premium deep-dive section, scope-reconciliation auditor outputs). The
   byte-match baseline should be re-snapshotted from the current state
   before Phase 1 lands.

---

## Post-plan re-check protocol

After Phase 6 ships:

```bash
# Generate one Bilan and one Planner report in EACH of the 3 toggle states
for sku in bilan planner; do
  for view in default lite-calm-compact full-direct-deep; do
    node planner/report/realai/run-pipeline.mjs --sku=$sku --view=$view
    out="planner/report/realai/final/SAMPLE_${sku}_${view}.html"

    # HIGH-2 re-check: jargon presence
    echo "=== $sku / $view: jargon scan ==="
    grep -cE "\\balpha\\b|engine output|traceable to an engine|t-?Student" "$out"

    # HIGH-3 re-check: interactive stack presence (only on default/full)
    echo "=== $sku / $view: interactive stack scan ==="
    grep -cE "<script|window\\.__BUILDFI__|data-bf-chart-data" "$out"

    # MED-3 re-check: external font ref
    echo "=== $sku / $view: external font scan ==="
    grep -cE "fonts\\.googleapis\\.com|fonts\\.gstatic\\.com" "$out"
  done
done
```

Expected:
- HIGH-2: 0 in `lite-calm-compact`, low single digits in `default`/`full`
  but only in methodology, never in body copy.
- HIGH-3: 0 in PDF/print profile (Phase 6 staticOnly mode); fine in
  interactive web view.
- MED-3: 0 in PDF/print profile; fine in interactive web view.

If any of these surface in the wrong profile, the plan's phase didn't
fully close the Codex finding. File a follow-up.
