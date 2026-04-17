# Next-Session Handoff — BuildFi Planner

Paste the block below at the start of a new Claude conversation.

---

```
You're picking up work on BuildFi's planner_v2.html (a 19,800-line Canadian
retirement-planning React-in-HTML monolith). Repo root:
c:\Users\tredh\OneDrive\Documents\GitHub\buildfi
Main branch is pushed through commit ffac784. Read docs/ARCH-BILAN-360.md,
docs/STATUS.md, CLAUDE.md, and planner/report/hardening/MASTER-IMPLEMENTATION-LOG.md
before changing anything substantive.

============================================================================
WHAT'S SHIPPED AND STABLE (don't redo)
============================================================================
- 17-finding audit complete: P0 correctness, P3 polish, SW rewrite, lazy
  vendor loading, constants-drift test extended to planner_v2.html +
  report-data.js.
- Sprint 9 test infra added: sprint9/check-kpi-snapshot.js (180 persona KPI
  assertions) and sprint9/check-cross-section-consistency.js. Both gate
  into npm run report:release:gate (steps 4 & 5).
- UX features on Diagnostic tab: sticky plan-health bar across all tabs,
  4 hero KPIs clickable to drill-in tabs (success→6, P50→7, depletion→16,
  gov income→2), recompute delta badges (▲+Xpp, ▲$K) driven by
  _prevMcRef + useEffect at line ~8303.
- FIRE lens toggle (🔥 pill in Diagnostic "MESURES CLÉS" header,
  persisted localStorage `bf_fire_lens`). When on: FI number, savings
  rate, years-to-FI closed-form, Lean/FIRE/Fat classification, Coast /
  Barista / before-FI warning badges.
- Insurance retrofits: calcInsuranceNeed now returns premiumRange
  {low,mid,high} instead of a point quote; SAM "Assurance vie 500K$"
  renamed to "Évaluer la couverture" with advisor handoff; sidebar
  disclaimer badge under lifeInsBenefit when > 0; needs-analyzer UI
  disclaimer expanded; scripts/lint-amf.js extended with 10 insurance
  forbidden phrases + planner/ in SCAN_DIRS.
- Report Insurance section: renderInsurance() in report-pdf.js, between
  Debts and Risk, deterministic-only (no AI), AMF-safe.
- Diagnostic tab coverage chip strip below FIRE lens, surfaces
  lifeInsBenefit/premium/disability + estate reflection.
- Sidebar Profil: Goals (Objectifs) promoted above AI Tone with a
  prominent gradient-accent header (was buried below AI tone). 🎯 icon,
  "Ce qui pilote le plan" subtitle.
- Engine fixes: mc.pD "jumpy median" accessor bug fixed — all stacked
  wealth charts now use mp_* accessors (single medPath). Deterministic
  _detWealth now includes reEquity. OAS clawback threshold indexed
  consistently via oasClbThrFor(). Capgains $250k cliff → split.
  GIS_MAX_COUPLE drift 665.41→667.41 fixed in planner + report-data.
- Verified: 87/87 smoke tests, release gate PASS, AMF lint 0 violations,
  constants drift 53/55 pass (2 pre-existing in quiz-translator-360.ts,
  unrelated).

============================================================================
KNOWN SHARP EDGES / ONGOING RISKS
============================================================================
1. RUNTIME STATE-VAR vs ENGINE-VAR NAMING TRAP.
   Several fixes chased ReferenceErrors where I used engine-local names
   (eqRet, ptInc, disabilityMonths) instead of React state-hook names
   (eqRetS, ptM, disabMo). Before referencing ANY "state-ish" variable
   inside a tab 5 / Diagnostic render block, grep for the useState
   declaration:
     grep -n "useState(.*)[,)].*<name>" planner/planner_v2.html
   Engine payload (`p.foo`) and React render scope (`foo`) often have
   different names — don't assume.

2. SHITTY EXCEL REPORT (explicitly flagged by user).
   report-excel.js is ~1150 lines, has had "20 passes" and user still
   rates it poor. Needs a real rewrite pass. Specific things suspected
   without a fresh audit:
   - Numeric cells pre-formatted as strings (breaks Excel formulas).
     See _fmtM / _fmtK returning "X $" text into cells.
   - Grade thresholds previously drifted from HTML (unified in last
     audit — verify still correct).
   - Currency-locale handling (fr-CA only baked into some formats).
   - Column widths inconsistent across sheets.
   - No formula columns — just static values, so users can't audit math
     by unhiding computation.
   - 14-tab layout may have dead sheets.
   Open report-excel.js with fresh eyes. Audit against an actual
   generated xlsx (run the export for a persona and open in Excel).
   Document specific complaints before patching — don't do another pass
   over the same surface without knowing what was wrong.

3. MOBILE UNTESTED.
   Everything shipped is desktop-first. Sticky bar, 4-col KPI grids,
   FIRE card, insurance chip strip will break at <500px. Do the audit
   (5 breakpoints × 8 tabs, document breaks) before shipping anything
   new to mobile users.

4. INSURANCE — LEGAL CONSULT NEEDED BEFORE PUBLIC RELEASE.
   Current retrofits (range instead of quote, softened SAM, disclaimers,
   AMF lint) put the module in defensible territory, but before
   insurance moves out of Expert/Laboratoire tier to anything
   direct-to-consumer, do a 1-hour consult with an AMF-experienced
   Canadian regulatory lawyer. Specifically ask about the needs-gap
   output and the softened SAM wording.

5. DETERMINISTIC REFERENCE LINE still excludes FHSA / DC / pension / corp
   because optimizeDecum doesn't model them. For a HNW CCPC persona the
   deterministic will still "weird-flat" against the MC. Non-trivial
   engine work to fix; deferred.

6. SCENARIO COMPARE — not built. High user-value, ~2-3 day work.
   Plan: data model + localStorage store + save/load UI (day 1), delta
   engine with field-level significance thresholds reusing KPI-snapshot
   tolerance config (day 2), 2-column layout + P50 chart overlay +
   narrative diff (day 3).

7. ENGINE HAS NO OWN UNIT TESTS. The "453 tests" in user memory don't
   exist in this repo. constants-drift.test.js catches CONSTANT drift
   across planner / report-data / registry. Actual math isn't tested at
   the engine level. Hardest thing to retrofit — defer until the above
   is done.

8. KPI BASELINE DISCIPLINE. When you make a legitimate engine change,
   the sprint9 KPI baseline will fail. Workflow:
     npm run report:fr-en           # regenerate reports
     npm run report:kpi:rebaseline  # rewrite baseline after inspection
     npm run report:release:gate    # verify everything else still passes
   NEVER rebaseline without first eyeballing the diff to confirm the
   change is intentional.

============================================================================
SUGGESTED ORDER OF WORK
============================================================================
A. Spend 20 min in the browser.
   Open planner_v2.html. Click through FIRE lens, sidebar Goals, insurance
   inputs, each hero KPI, the Assurances report section. Confirm no
   runtime errors and the Goals promotion reads right. Fix any runtime
   bugs first — state-var traps.

B. Excel report rewrite (user priority).
   - Generate an xlsx for young_accum and open in Excel.
   - Document specific failure modes (not just "it's bad" — list the
     specific cells / sheets / formulas that fail).
   - Decide: rewrite or surgical fix based on the specifics.
   - Plan before coding.

C. Mobile audit + fixes (half day).
   Screenshot pass at 360/414/768/1024/1440. Responsive grids, sticky-bar
   compact mode <500px, touch-friendly tooltips.

D. Scenario compare (2-3 days).
   Data model + store + delta engine + UI (outlined above).

E. Legal consult (user responsibility) before insurance goes public.

============================================================================
VERIFICATION CHECKLIST BEFORE COMMITTING ANY PLANNER CHANGE
============================================================================
  node planner/report/smoke-test.js           # 87/87
  npm run report:release:gate                 # 5/5 steps PASS
  npx tsx tests/constants-drift.test.js       # 53 pass (2 pre-existing fail OK)
  node scripts/lint-amf.js                    # 0 violations
  # inline script syntax validator:
  node -e "const h=require('fs').readFileSync('planner/planner_v2.html','utf8');
           const re=/<script(?:[^>]*)>([\s\S]*?)<\/script>/g; let m,i=0,e=0;
           while(m=re.exec(h)){i++;if(m[1].trim().length<20)continue;
           try{new Function(m[1]);}catch(err){e++;console.error('#'+i+': '+err.message);}}
           console.log('ok='+i,'err='+e);"

And most importantly: open the page in Chrome DevTools and watch the console.
Report-layer tests don't catch React render errors.

============================================================================
IMPORTANT REPO / WORKFLOW CONVENTIONS
============================================================================
- Never commit without explicit user ask.
- Use HEREDOC commit messages with Co-Authored-By: Claude Opus 4.7 line.
- Never use --no-verify, --amend (unless asked), or git add -A without
  inspecting. Windows OneDrive + git occasionally drops untracked
  directories from staging; verify with `git show HEAD --stat` after commit.
- realai/ is the user's WIP, not in scope. Don't stage it.
- AMF-compliance: conditional verbs only, no prescriptive language. The
  lint catches common ones; re-read before shipping user-facing text.

============================================================================
START HERE
============================================================================
1. Read MEMORY.md at C:\Users\tredh\.claude\projects\c--Users-tredh-OneDrive-
   Documents-GitHub-buildfi\memory\MEMORY.md for user context (paused
   project, family priority, etc.).
2. Run the verification checklist above. If anything is red, fix that
   before new work.
3. Ask the user which of A-E to tackle. Don't assume.
```

## Extra notes on report-excel.js (for when item B lands)

Specific symptoms worth checking in a fresh audit:

- **Numbers as strings.** `_fmtM`, `_fmtK`, `_fmtP` (line ~63) return pre-formatted
  strings like `"485,000 $"`. Assigning that to a cell with a currency `numFmt`
  gives a text cell that looks right but breaks formulas / sorting / sums.
  Pattern to fix: set the raw number, let `numFmt` handle display.

- **Grade threshold unification.** The HTML-side unification went through in the
  audit. Verify Excel grades match what the HTML report shows for the same
  persona (regenerate both from the same MC run).

- **Currency locale.** `fmtCurrency` in report-formatters now honors `window.__bfLang`
  + optional `lang` arg. Make sure every Excel cell that displays currency uses
  that, not a hardcoded `fr-CA`.

- **Formulas, not values.** For an export that advisors will audit, key cells
  should be `=D5/C5` not hardcoded percentages. Users lose trust when they can't
  see the math.

- **14 sheets.** Check if any are empty/redundant. Probably some cruft.

- **Fallback path `buildExcelBasic` (xlsx-only)** may have drifted from the
  primary ExcelJS path. Run both and diff.

- **Test matrix:** open a generated file in Excel 2016+, LibreOffice Calc, and
  Google Sheets. Report which one breaks first.
