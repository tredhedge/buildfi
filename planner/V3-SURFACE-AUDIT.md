# BuildFi Planner v3 — Surface Audit (Sidebar · Tabs · PDF · Excel)

**Date**: 2026-04-17
**Auditor**: self-evaluation after Phase 10 session close
**Scope**: Does every metric land on every surface correctly and consistently?

This document complements `V3-AUDITS.md` (phase-by-phase log) by giving an honest evaluation per surface and naming cross-surface gaps.

---

## Scoring summary

| Surface | Coverage | Consistency | Bilingual | AMF | UX quality | Overall |
|---|---|---|---|---|---|---|
| **Sidebar** (planner_v3.html inputs) | 9/10 | 10/10 | 10/10 | 10/10 | 8/10 | **B+** |
| **Tabs** (Dashboard / Report / … / Guide) | 7/10 | 7/10 | 10/10 | 10/10 | 7/10 | **C+** |
| **PDF report** (report-pdf.js) | 7/10 | 5/10 | 10/10 | 9/10 | 7/10 | **C+** |
| **Excel report** (report-excel.js) | 7/10 | 5/10 | 10/10 | 10/10 | 7/10 | **C+** |

Aggregate: **C+ / B−**. The sidebar has leapt forward this session; the outputs (tabs, PDF, Excel) now lag it by one or two rounds of work, primarily because per-owner and resilience concepts introduced in the sidebar have not yet landed in the export layers.

---

## 1. Sidebar — **B+**

### Strengths

- 12 modules grouped by life-phase with separators. Rail is scannable.
- Every module has an icon, title, and one-sentence caption. Business and Debts captions now signal *who the module is for*.
- Progressive disclosure on Real Estate, Debts, Insurance. Fields reveal as the user fills in.
- Couple model: Single/Couple pill + 4 sync toggles cut spouse fields from 40 → ~10.
- Ownership pills (Vous / Conjoint / 50/50 / Personnalisé + slider) on properties and debts.
- Strategy radio (Standard / Meltdown / Bridge) promoted from 3 clicks deep.
- Validation messages are full sentences, bilingual, and tied to jump-links from the Diagnostic tab.
- Acronyms expanded inline (LCGE, DPA/CCA, HELOC, ITA 8517, MER).
- Accessibility: aria-label + aria-pressed on rail, focus-visible rings, reduced-motion, high-contrast fallbacks.

### Weaknesses

- **Unified events editor is read-only** (Phase 4A). Adding/removing a one-time event still requires clicking into four different sections.
- **NR investments not yet ownership-splittable**. The `nr` + `nrC` fields are flat numerics; no per-NR ownership slider.
- **Advanced drawer wrapping is partial**. Market assumptions wrapped; stress scenarios and 2nd shock are not.
- **Inline label density** on dense modules (Savings, Model) is still high on small screens; the `.bf-subsec` card class exists but is not yet applied everywhere.

### Top 3 follow-ups

1. Make the Phase 4A events view an editor (Part B + C). One click to add a new event across all owner/kind combos.
2. Wrap Stress Scenario + 2nd Shock in a `<details class="bf-adv-drawer">`.
3. Convert NR from flat `nr/nrC` to an array of `{ balance, contrib, owner }` rows.

---

## 2. Tabs — **C+**

### Strengths

- 32 tab definitions organised into 8 logical groups (Dashboard / Report / Cashflow / Wealth / Risk / Tax / Optimization / Guide) + conditional Business group.
- Bilingual labels and teasers everywhere (no missing FR or EN).
- All tabs read from the same `mc` object, so year-by-year data is mathematically consistent by construction.
- AMF-clean: no directive phrasing surfaced.

### Weaknesses

- **No Resilience score.** Introduced in the sidebar's Plan Health Summary, but not yet rendered as a first-class KPI in the Dashboard KPI grid. User asks "am I resilient?" and the tab doesn't answer directly.
- **Owner-series chart refactor not shipped.** Income chart (Tab 2) still shows aggregate household income. Per-owner series (RRQ_self / RRQ_spouse / Pension_self / Pension_spouse / Withdraw_joint) is blocked by the deferred Phase 6 engine.
- **Estate tab (Tab 8) shows household only.** In couple mode, no "your share vs spouse share" breakdown. Blocked by Phase 5B engine.
- **Tab 9 (Detailed report) dynamically re-renders the PDF on every keystroke.** No memoization. Slow on larger profiles. Needs a `useMemo` on the `buildReport()` call keyed on `(profile, mc)` identity.
- **Spending Curve preset metadata not in any tab.** The sidebar remembers *how* retSpM was set (Flat / Gradual / Smile) but the tabs never surface it. Audit-trail gap.

### Top 3 follow-ups

1. Add a `Resilience: N %` KPI card to the Dashboard KPI grid, using the same formula shipped in the Plan Health Summary.
2. Memoize Tab 9's `buildReport()` call so it doesn't rerun on keystrokes inside form inputs.
3. Add a small "Spending curve: Blanchett Smile" chip somewhere visible (top of Cashflow tab or Dashboard header) so users see which preset drove the numbers.

---

## 3. PDF report (report-pdf.js) — **C+**

### Strengths

- 21 sections cover the full plan: cover → diagnostic → levers → profile → family → goals → projection → revenue → strategies → tax → GIS → meltdown → succession → real estate → RSU → corporation → debts → insurance → risk → methodology.
- Conditional rendering is thoughtful: sections only render when data is present (e.g. Meltdown section only if `melt=true`).
- Phased ordering: Accumulation puts Projection first; Decumulation puts Revenue first. Good narrative flow.
- Bilingual parity is complete.
- Insurance section explicitly disclaims: "not insurance advice."
- AMF-safe phrasing overall; one borderline "should be validated with a planner" at line 1727.

### Weaknesses

- **No per-owner estate split in Succession.** Shows household net estate and per-heir bequests but not the per-spouse net-worth line. When a user imports a couple-uneven profile with a 70/30 rental, the Succession page shows joint figures. Blocked by Phase 5B engine.
- **No Resilience score.** Same as tabs — the headline metric introduced in v3 never makes it into the PDF.
- **No Spending Curve preset mention.** Profile section shows `totalSpM` but not which curve produced it.
- **No ownership fractions on Real Estate properties.** A 70/30 rental prints as if it were joint.
- **No sync-flag transparency.** The PDF doesn't state "spouse QPP ages mirrored from primary" when the user has the toggle ON. Transparency gap for auditors or second-opinion advisers.
- **Borderline "should be validated"** (line 1727) — trivial to rephrase to "may be validated" / "pourrait être validée".

### Top 3 follow-ups

1. Add a per-spouse net-worth subsection to Succession (requires Phase 5B ownership engine).
2. Add a "Resilience score" badge next to the grade on the cover page and the Diagnostic section.
3. Print the sync-flag state in Profile section so the reader sees which spouse assumptions were auto-derived vs manual.

---

## 4. Excel report (report-excel.js) — **C+**

### Strengths

- 14 sheets, strongly structured: Cover → README → Sommaire → Profil → Projection → Flux → MC Wealth → Withdrawals → Fiscalité → Sensitivity → Succession → Immobilier → Entreprise → Méthodologie.
- Data density appropriate: 150–300 rows per sheet, not bloated.
- Formulas on derived cells (effective rate = tax / taxable income) rather than hard-coded numbers. Good.
- Bilingual parity complete across all sheet names, column headers, and cell labels.
- AMF-clean: zero directive phrasing.
- Methodology sheet reiterates non-advice disclaimer.

### Weaknesses

- **Static snapshot, not live workbook.** Formulas don't cross-sheet-reference. Editing Projection doesn't cascade into Flux. User expectation mismatch: Excel is usually live.
- **Same per-owner gap as PDF.** Succession sheet shows household only.
- **Same Resilience gap.** Sommaire sheet shows success + P50 wealth; no Resilience row.
- **Same Spending Curve preset gap.** Sheet shows amount, not derivation.
- **Stress-test tornado uses hard-coded ±% multipliers.** A plan that is already high-return sees the same ±2% stress as a conservative plan. Not personalised.
- **No parity check against PDF.** Both read the same engine output but select and label data independently. Silent drift possible.

### Top 3 follow-ups

1. Add a per-spouse column to Sommaire and Succession sheets (after Phase 5B).
2. Replace hard-coded stress multipliers with profile-aware ranges (e.g. `±min(0.05, current_savings_rate)`).
3. Add an `Integrity` sheet that re-computes Sommaire KPIs from the same raw inputs and flags any discrepancy with the planner's MC output — ships the parity harness inside the Excel itself.

---

## 5. Cross-surface gaps

Three themes recur across tabs, PDF, and Excel:

| Gap | Where missing | Root cause | Fix location |
|---|---|---|---|
| **Resilience score** | All 3 export surfaces | Introduced in sidebar Plan Health only | Tabs + PDF + Excel each need a new KPI row |
| **Per-owner financial split** (couple mode) | All 3 export surfaces | Phase 5B engine deferred | Engine first (`BF_V3_HOUSEHOLD=true`), then propagate |
| **Spending Curve preset state** | All 3 export surfaces | Never surfaced outside sidebar | Add `spendingCurvePreset` to the report-data payload; render in each surface |

These three gaps are the highest-leverage fixes: one piece of metadata in `report-data.js` lights up all three surfaces at once.

---

## 6. Recommended sequencing for the next session

1. **First** — wire the parity harness (`parity-harness.html` `getReportOutputs()` stub). Requires exposing `buildReportData()` from `report-data.js` as a browser import. ~1 h.
2. **Second** — add `spendingCurvePreset`, `resilienceScore`, and `ownershipFractions` to the report-data payload. Propagates to PDF + Excel tabs with minimal per-surface code. ~2 h.
3. **Third** — ship Phase 5B (ownership engine) behind `BF_V3_HOUSEHOLD`. Then Phase 6 (per-person tax). ~6–8 h combined.
4. **Fourth** — add a per-spouse column to Succession (PDF + Excel) once engine data is per-owner. ~1 h.
5. **Fifth** — memoize Tab 9's `buildReport()` render. ~15 min.

Total post-session engine + export-parity work: **~10–12 focused hours**, extending the 42 h already consumed in this rebuild.

---

## 7. What scored badly on me (self-critique)

- I landed 13 commits in one session. That's dense. Each commit is small and scoped, but the session audit trail is long — a code reviewer coming in fresh has to walk through V3-AUDITS.md to understand why certain phases are Partial vs Complete.
- Phases 4A, 5A, 8 all carry `🟡 Partial` verdicts. Honest but cumulatively means the v3 rebuild is more "structurally shifted" than "production-ready." The next session's engine work is load-bearing for shipping.
- I deferred engine phases (4B, 5B, 6, 8.5B) because I cannot run the snapshot harness from this session. That's the right call, but it means v3 cannot yet replace v2 in production.
- I did not fix the borderline "should be validated" in PDF line 1727. Should be a one-line change — flagging it here instead of doing it inline was a small omission.

---

**End of audit.**
