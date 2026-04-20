# Excel Report Improvements — Tracking Log

Anchor for the multi-sprint polish pass identified in the 2026-04-20 audit.
Items listed in descending impact order. Check off as commits land.

**Source of truth for engine alignment**: every cell must come from either
- `mc.*` (Monte Carlo results from `runMC`)
- `params.*` (profile params the user set)
- `window.BData.*` (calcTax, calcQPP, calcOAS — engine-shared functions)
- `window.BFmt.*` (formatter helpers shared with HTML report)

Never compute a proxy unless the engine doesn't expose the figure; when a
proxy is used, it must be documented in a "Basis" or "Notes" cell so the
user can see it's an approximation.

---

## P0 — Critical content gaps (engine provides data, Excel omits it)

- [x] **P0.1 — Spouse sheet** ✓ (commit pending)
- [x] **P0.2 — Insurance sheet** ✓ (commit pending)
- [x] **P0.3 — Debts sheet** ✓ (commit pending)
      Couples currently get only primary figures. Engine fully models spouse
      (DC accumulation, bridge, pen2, part-time, NR tax, independent
      portfolio).
      Sources: `params.cOn`, `params.c*` fields, `mc.pD[].crr/ctf/cnr/cdc`
      (if present), revData spouse columns.
      Target: dedicated "Conjoint(e)" / "Spouse" tab with profile,
      savings, gov pensions, employer pension, income projection by year,
      events & part-time, insurance.

- [ ] **P0.2 — Insurance sheet**
      Life / disability / critical illness / group coverage all modeled by
      engine (premiums drained, death benefit paid, disability comp,
      CI lump sum). Zero Excel surface.
      Sources: `params.insViePrime/Cov/Type/Dur`, `insInvPrime/Cov`,
      `insMGPrime/Cov`, `insColPrime`, spouse mirrors. Total premium flow
      from `mc.revData` implied subtraction.
      Target: premium summary + coverage breakdown + gap analysis
      (via `calcInsuranceNeed` from `window.BData` if available).

- [ ] **P0.3 — Debts sheet**
      `params.debts[]` with balance/rate/term/deductible tracked by engine.
      No Excel onglet.
      Sources: `params.debts[]`; compute amortization schedule via the
      standard annuity formula already used in the longform UI.
      Target: per-debt schedule (balance, interest, principal, payoff
      year), total household debt service year-by-year.

## P1 — Important depth + auditability

- [x] **P1.1 — Goals / RESP sheet** ✓ (commit pending)
      `params.goals[]` (retirement, education, lump-sum) + RESP fields
      projected by engine. No reporting.
      Target: per-goal table (name, amount, start/end age, inflation,
      funding status from relevant MC balance/income).

- [x] **P1.2 — Assumptions-used appendix** ✓ (commit pending)
      Methodology tab describes engine; doesn't expose the actual numeric
      values used by THIS plan. Auditability zero.
      Sources: all `params.*` scalar fields that influenced the MC.
      Target: one flat table ~30 rows: inflation 2.1 %, eq return 6.8 %,
      bond return 3.2 %, MER R/T/N, allocR/T/N, mortality CPM 2023, etc.

- [x] **P1.3 — Travailleur autonome (sole-prop) block** ✓ (commit pending)
      Engine added `bizType === "sole"` branch (T2125, self-emp CPP,
      no LCGE). Business tab only handles CCPC.
      Sources: `params.bizType`, `bizSoleRev/Exp/Growth/Vol`,
      `revData[y].bizSoleNet/bizSoleCppDeduct`.
      Target: inline block inside Entreprise tab that renders when
      bizType === "sole" instead of the CCPC grid.

## P2 — Depth on existing sheets

- [x] **P2.1 — Mortgage amortization schedule per property** ✓ (commit pending)
      Real Estate tab is one row per property. Users expect year-by-year
      amortization.
      Sources: `params.props[]` (mb, mr, ma, mr2 at renewal).
      Target: separate table per active property, year × (opening balance,
      interest, principal, closing balance, renewal impact).

- [x] **P2.2 — Diagnostic + recommendations** ✓ (commit pending)
      HTML report has strengths / weaknesses / prioritized recommendations.
      Excel has one single action row.
      Sources: same logic the HTML report uses (likely in `report-pdf.js`
      or `report-data.js`). Reuse rather than recompute.
      Target: "Diagnostic" tab with 3 columns (Strengths / Weaknesses /
      Actions), up to 5 rows each.

- [x] **P2.3 — Year-by-year stress trajectory** ✓ (commit pending)
      Solved by re-running the worst-impact scenario at N=500 via
      window.runMC at export time (~2-3s). Graceful fallback to a note
      when runMC isn't reachable (Node test harness, pre-engine state).

## P3 — Polish + nice-to-haves

- [x] **P3.1 — Terminal wealth histogram data** ✓ (commit pending)
      `mc.histogram` is emitted by the engine, unused by Excel.
      Target: a table (bin low / bin high / count / probability) so users
      can pivot-chart it themselves.

- [x] **P3.2 — Death vs ruin pairs** ✓ (commit pending)
      `mc.deathVsRuin` emitted. Unused.
      Target: scatter data table (sim #, death age, ruin age) for
      joint-distribution analysis.

- [x] **P3.3 — Composite resilience score** ✓ (commit pending)
      HTML computes `succ × min(1, VaR5 / (5 × annual spending))`.
      Excel has succ and VaR5 separated.
      Target: single KPI cell on Sommaire with the composite, labeled.

- [x] **P3.4 — Bracket-fill efficiency (meltdown analysis)** ✓ (commit pending)
      For meltdown users, show which federal bracket was targeted each
      year and % filled.
      Sources: `mc.medRevData[].taxInc`, `params.meltTgt`.
      Target: column addition to Fiscalité tab.

---

---

## P4 — Workbook intelligence (post-P3)

- [ ] **P4.1 — Cross-sheet formula references**
      Sommaire values that mirror cells on Cash Flow / MC Wealth / Estate
      are currently hardcoded. Replace with `='Cash Flow'!K50` so edits
      propagate. Makes the workbook a live exploration tool instead of
      a frozen snapshot.

- [ ] **P4.2 — CCPC salary vs dividend comparison table**
      Engine runs MC; users can only compare strategies by re-running.
      Excel can surface a side-by-side table (total extracted after
      corporate + personal tax, year-by-year cash to household) using
      the existing `wStrat === "optimized" ? mc._naiveMC : null` pattern,
      applied to bizRemun.

- [x] **P4.3 — Excel-side QA hook** ✓ (commit pending)
      BReportQA.auditReport covers HTML. Add auditExcel(buffer, payload)
      that reads back the xlsx and checks: required sheets present,
      no #REF / #DIV/0 in cached formulas, numeric cells are numeric
      (not strings), currency format codes applied to money cells.

- [x] **P4.4 — Explicit page breaks** ✓ (commit pending)
      Some sheets (Cash Flow, Withdrawals, Methodology) span multiple
      pages when printed landscape-letter. Add pageBreaks at section
      boundaries so each block starts on a fresh page.

- [ ] **P4.5 — Scenarios comparison (retire at 62/65/68)**
      HTML report has a "what if you retired 3 years earlier / later"
      scenario delta. Port via re-running runMC at N=300 each retAge
      option, display as a table on Summary.

- [ ] **P4.6 — Tax breakdown by source**
      Cash Flow shows lumped tax. Engine has tiQpp / tiOas / tiPen /
      tiRrif / tiDraw / tiRe / tiOther on revData. Tax sheet could
      show a 6-column income decomposition per year.

## Completed (running list)

Phase 0 (the original sprint):
- P0.1 Spouse sheet — [commit 4845f65](#)
- P0.2 Insurance sheet — [commit 4845f65](#)
- P0.3 Debts sheet — [commit 4845f65](#)
- P1.1 Goals/RESP sheet — [commit 567a884](#)
- P1.2 Assumptions appendix — [commit 567a884](#)
- P1.3 Sole-prop branch — [commit 567a884](#)
- P2.1 Mortgage amortization — [commit 007f330](#)
- P2.2 Diagnostic tab — [commit 007f330](#)
- P3.1 Terminal wealth histogram — [commit a10ce6b](#)
- P3.2 Death vs ruin buckets — [commit a10ce6b](#)
- P3.3 Composite resilience — [commit a10ce6b](#)
- P3.4 Bracket-fill efficiency — [commit a10ce6b](#)
- P2.3 Stress trajectory year-by-year — [commit 587bb3a](#)
