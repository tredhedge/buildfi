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

- [~] **P2.3 — Year-by-year stress trajectory** DEFERRED
      Current cached `stressResults[]` entries carry only aggregate fields
      (name/succ/medF/var5/medRuin). Engine would need to retain per-sim
      pD for each stress scenario, OR the export would need to re-run MC
      at export time (expensive). Real work, skipping for this sprint.

## P3 — Polish + nice-to-haves

- [ ] **P3.1 — Terminal wealth histogram data**
      `mc.histogram` is emitted by the engine, unused by Excel.
      Target: a table (bin low / bin high / count / probability) so users
      can pivot-chart it themselves.

- [ ] **P3.2 — Death vs ruin pairs**
      `mc.deathVsRuin` emitted. Unused.
      Target: scatter data table (sim #, death age, ruin age) for
      joint-distribution analysis.

- [ ] **P3.3 — Composite resilience score**
      HTML computes `succ × min(1, VaR5 / (5 × annual spending))`.
      Excel has succ and VaR5 separated.
      Target: single KPI cell on Sommaire with the composite, labeled.

- [ ] **P3.4 — Bracket-fill efficiency (meltdown analysis)**
      For meltdown users, show which federal bracket was targeted each
      year and % filled.
      Sources: `mc.medRevData[].taxInc`, `params.meltTgt`.
      Target: column addition to Fiscalité tab.

---

## Completed (running list)

_none yet; commits will be linked here as P0/P1/... items land._
