# BuildFi Client Report Benchmark Checklist

Updated: 2026-04-26

Purpose: turn the benchmark ambition in `BENCHMARK-MATRIX.md` into a practical delivery checklist for the current HTML reports in `report/realai/final`.

Scope reviewed:
- Current shipped set in `report/realai/final`
- Internal ship summary in `report/realai/review/_summary.json`
- Spot checks against earlier `report/realai/output` reports

Use this document as the client-facing quality bar. A report can be mathematically correct and still fail this bar if it feels internal, unfinished, or hard for an advisor to defend in front of a client.

---

## 1. Executive View

Current status versus the target standard set by tools like NaviPlan, Conquest, and similar planning software:

| Area | Benchmark bar | Current status | Verdict |
|---|---|---|---|
| Numerical truthfulness | Narrative, labels, and key figures must stay aligned | Much better than earlier iterations; current `final` set fixes major misframing seen in `output` | Partial |
| Client-ready prose | No internal engine language, no awkward AI phrasing, no template leakage | Still exposes engine-language and unfinished phrasing in shipped reports | Fail |
| Advisor actionability | Clear sequencing, timing, and decision framing | Stronger now; action plans are meaningfully improved | Partial |
| Localization quality | Native EN/FR phrasing, no mixed-language UI | Mixed-language remnants remain in FR reports | Fail |
| Presentation packaging | Clean export, no internal app scaffolding in final client artifact | Full simulator and raw model payload still shipped inside report HTML | Fail |
| Enterprise credibility | Report should look deliberate, controlled, and defensible in a planning meeting | Closer than before, but still feels like a hybrid between report and internal tool | Partial |

Bottom line:
- The current `final` set is clearly better than prior iterations.
- It is not yet benchmark-competitive as a polished client deliverable.
- The biggest remaining gap is not the math. It is packaging, language discipline, and export quality.

---

## 2. Must-Have Gates

These are the non-negotiables for a report that should feel credible beside established planning outputs.

| Gate | Requirement | Why it matters | Current state |
|---|---|---|---|
| G1 | No unresolved placeholders or advisory scaffolding in client copy | Advisors cannot defend `case-dependent`, `to be modeled`, or similar unfinished output in front of clients | Failing in sampled shipped reports |
| G2 | No internal engine or model-language in the narrative body | Clients should not see implementation framing like `traceable to an engine output`, `alpha`, or distribution jargon unless isolated to methodology | Failing |
| G3 | One language per report, fully localized | FR reports cannot contain `high`, `medium`, EN punctuation habits, or mixed labels | Failing |
| G4 | Currency and compact-number formatting must be native to locale | English reports should not show `346K$`; FR and EN should each use natural conventions | Failing |
| G5 | Final client export must not embed internal simulator code or raw scenario payloads | A client report should not ship with full browser-side Monte Carlo engine and re-simulator code | Failing |
| G6 | Opening letter and action plan must read as finished editorial content | Duplicate salutations or abrupt template seams damage trust fast | Failing in spot checks |
| G7 | Action plan must contain concrete advisor-ready outputs | Every action needs timing, rationale, and a client-safe description | Partial |
| G8 | Methodology must be available but quarantined from the main story | Advanced assumptions belong in appendix/methodology, not in the cover and executive story layer | Partial |
| G9 | Offline-safe rendering for advisor distribution | Font loading and rendering should survive PDF/export/offline use | Partial |
| G10 | Report artifact should be intentionally packaged for client delivery | Separate "interactive tool" and "client report" modes are needed | Failing |

Ship rule:
- Do not call the output benchmark-competitive until all ten gates are at least `Partial` and gates `G1` through `G6` are fully `Pass`.

---

## 3. What Is Better Than Before

The current `final` set does show real progress.

| Improvement | Evidence | Why it matters |
|---|---|---|
| Narrative is more aligned with actual outcomes | Earlier `output/ccpc_owner_en.html` framed the plan as robust; current `final/ccpc_owner_en.html` correctly frames it as at-risk | This is a major trust improvement |
| Shipped set now follows the internal release gate | `final` now lines up with the shipped profiles listed in `review/_summary.json` | Better discipline between review and final output |
| Action plans are more structured | Current reports group levers by timing window and priority | This is closer to advisor workflow |
| Executive summaries are denser and more decision-oriented | The current summary layer is more useful than the older lightweight tile summary | Better first-page utility |
| More visible planning differentiation | Draw-order, tax strategy, and stress framing are more developed | Stronger competitive identity |

This means the project is not stuck. The gap is narrowing. The remaining work is mostly about turning a strong analytical artifact into a polished client artifact.

---

## 4. Current Failure Patterns

These are the recurring issues that still keep the reports below the target bar.

| Pattern | Typical example | Why it hurts |
|---|---|---|
| Placeholder recommendation fields | `$ impact: case-dependent`, `Success effect: to be modeled` | Feels unfinished and internal |
| Internal explanatory language | `traceable to an engine output`, `alpha`, model jargon on the cover or summary | Sounds like a quant notebook, not an advisor deliverable |
| Mixed localization | `Confiance : high` in FR reports | Makes bilingual quality look untrustworthy |
| Wrong EN compact currency style | `346K$` | Signals template leakage and poor localization |
| Template seams | duplicated salutation in an opening letter | Small mistake, large trust cost |
| App/report hybrid output | report contains interactive scripts, a browser-side engine, and a live re-simulator | Bloated, risky, and not enterprise-clean |
| Live web dependency in final artifact | Google Fonts `@import` in shipped HTML | Weakens export resilience |

---

## 5. Benchmark Checklist

Score each category `Pass`, `Partial`, or `Fail` during QA.

| Category | Pass definition | Current status |
|---|---|---|
| Cover quality | Clean branding, strong promise, no technical leakage, natural date/currency/labels | Partial |
| Executive summary | Fast to understand, numerically honest, client-safe wording | Partial |
| Advisor letter | Personal, fluent, no duplicated greetings, no internal language | Partial |
| Section architecture | Clear flow from summary to diagnosis to actions | Pass |
| Action plan | Advisor-usable actions with timing, impact framing, and clean prose | Partial |
| Charts and tables | Clear labeling, client-safe legends, no approximate/internal wording | Partial |
| Methodology placement | Technical detail pushed to the back | Partial |
| Localization | Native FR/EN with no bleed-through | Fail |
| Currency and notation | Native locale formatting throughout | Fail |
| Packaging/export | Final report stripped of internal simulator and raw payloads | Fail |
| Compliance tone | Observational, not over-prescriptive, no unsupported claims | Partial |
| Enterprise polish | Looks like a deliberate final document, not a rendered app snapshot | Partial |

Suggested benchmark threshold:
- `Pass` on at least 9 of 12 categories
- No `Fail` allowed in `Localization`, `Currency and notation`, or `Packaging/export`

---

## 6. Immediate Priority Order

If we want the fastest path from "good internal report" to "competitive client deliverable," the work should happen in this order:

1. Remove unfinished action-card scaffolding from the final export.
2. Split client report mode from interactive app mode.
3. Fix localization and currency formatting across EN/FR.
4. Strip internal engine-language from cover, letter, summary, and action plan prose.
5. Add a final editorial pass for template seams and awkward phrasing.
6. Make final export self-contained for offline/PDF use.

Why this order:
- Steps 1 to 4 change how credible the report feels immediately.
- Step 5 improves trust at the sentence level.
- Step 6 improves enterprise distribution and reduces brittle rendering behavior.

---

## 7. Recommended Implementation Backlog

| Priority | Work item | Outcome |
|---|---|---|
| P0 | Add a client-export sanitizer that removes simulator scripts, browser-side engine code, and raw payload blobs from final HTML | Turns report into a true client artifact |
| P0 | Replace placeholder action metrics with either real computed values or no metric at all | Removes unfinished feel |
| P0 | Centralize locale formatting for EN/FR currency, compact numbers, dates, labels, and confidence tags | Fixes repeated polish drift |
| P1 | Add a narrative scrubber for banned internal phrasing in cover, summary, and letter sections | Stops engine-language leakage |
| P1 | Add ship-gate checks for mixed-language confidence labels and EN `K$` formatting | Makes the failure impossible to reintroduce silently |
| P1 | Add ship-gate checks for duplicate greeting patterns and other common template seams | Improves editorial trust |
| P2 | Add a dedicated appendix style for methodology so advanced assumptions stay available without polluting the main story | Better client readability |
| P2 | Add advisor-branding/export presets | Moves closer to enterprise report expectations |

---

## 8. Definition Of "Competitive"

For this project, "competitive with NaviPlan / Conquest / similar tools" should mean:

- An advisor can send the report without apologizing for the format.
- A client can understand the first three pages without verbal translation.
- The math, narrative, and action plan all tell the same story.
- The report looks finished even when printed, exported to PDF, or viewed offline.
- The interactive simulator exists as a separate enhancement, not as leakage inside the report artifact.

Until those conditions are true, the product may be analytically strong, but it is not yet benchmark-competitive as a finished client report.

---

## 9. Simple Release Test

Before calling a report "ready to benchmark against established planning tools," answer these nine questions:

1. Would an advisor be comfortable sending this PDF unchanged?
2. Does the first page avoid all internal model jargon?
3. Do the executive summary and grade match the actual success profile?
4. Are all recommendations fully written, with no placeholders or unresolved metrics?
5. Is the report fully natural in its target language?
6. Are money/date/notation formats native to that language?
7. Is the client artifact free of simulator code and raw embedded model data?
8. Does the methodology stay in the back instead of dominating the story?
9. Does the report feel intentionally designed, not merely rendered?

Passing rule:
- If any answer is `no`, the report is not yet at benchmark standard.
