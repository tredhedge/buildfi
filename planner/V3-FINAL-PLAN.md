# BuildFi Planner v3 — Final Professional Plan

**Date**: 2026-04-17 · revised after internal review
**Scope**: Sidebar + data model + engine + UX/UI + report parity.
**Target file**: `planner/planner_v3.html` (single-file by deployment constraint; split is out of scope — see §7).
**Approach**: sequential, no short-cuts, each phase gated by acceptance criteria **and** a self-audit before the next phase starts.

---

## 0. Principles

1. **Household-first data model**. A single person is a 1-owner household. A couple is a 2-owner household. Every entity (property, debt, investment, event) carries an explicit owner attribution.
2. **Engine reflects reality**. OAS clawback is per-person. Capital gains split by owner fraction. Estate rollover to surviving spouse. Pension splitting optimized, not manual %. Joint spending met by optimal joint withdrawal.
3. **UX answers "who — what — when" per entity**. No field exists in the UI that doesn't affect a decision.
4. **Progressive disclosure everywhere**. Zero-valued entities show a single entry point; details reveal on value.
5. **Bilingual parity**. FR and EN equally polished. All acronyms (DPA, LCGE, CCA, HELOC, ITA 8517, MER, RRQ, RPC, PSV, CELIAPP, CCPC) expanded inline or in captions.
6. **AMF compliance**. Observational, conditional-tense language. No directive advice. Every validation message is a complete sentence. Linted at build time.
7. **No regressions**. Every engine change is gated by a test-profile library with golden Monte Carlo outputs, fixed seeds, and tolerance bands.
8. **Self-audit gate**. Every phase ends with a written self-audit posted to `V3-AUDITS.md` before the next phase begins.

---

## 1. Target data contract

### Household (shared)
```ts
{
  schema: "v3.1",
  province: "QC" | "ON" | ...,
  retSpM: number,                    // monthly spending, joint (household level)
  budget: { housing, transport, food, family, alimony, telecom, leisure, insurance, other },
  events: Event[],                   // includes goals as kind:"goal"
  properties: Property[],            // each carries ownership: { self, spouse }
  debts: Debt[],                     // each carries ownership
  nrInvestments: NR[],               // each carries ownership
  children: Child[],
  cOn: boolean                       // couple mode active
}

Event   = { id, kind: "income"|"expense"|"goal", ownership: OwnerSplit, age: number, amount: number, inflated: boolean, label: string }
Property = { id, value, mortgage{...}, rent, expenses, appreciation, ownership: OwnerSplit, isPrincipal: boolean, ... }
Debt     = { id, type, balance, rate, payment, term, deductible, ownership: OwnerSplit }
NR       = { balance, contrib, ownership: OwnerSplit }
```

### Ownership split (not enum — percentage)
```ts
OwnerSplit = { self: number, spouse: number }   // each in [0, 1], must sum to 1
```
`{self:1, spouse:0}` = self-only. `{self:0, spouse:1}` = spouse-only. `{self:0.5, spouse:0.5}` = joint. `{self:0.7, spouse:0.3}` = uneven. UI exposes common presets (Vous / Conjoint / 50/50) + a "Custom split" pill for arbitrary percentages.

### Person (one or two — `persons: [primary, spouse?]`)
```ts
{
  name, age, sex,
  retAge, deathAge,                  // deathAge only honoured when useStochMort = false
  sal,
  rrsp, rrspC, tfsa, tfsaC, fhsa, fhsaC, lira,
  qpp: { age, avgE, yrsContrib, shareWithSpouse },
  oas: { age },
  pension: { type, amount|balance, indexation, bridge: { amount, endAge }, ee, er, mer },
  insurance: { life: {type, cov, prem, dur}, disability: {cov, prem}, ci: {cov, prem}, group: {prem} },
  syncFlags: {                       // spouse-only, lives IN PROFILE JSON
    retAgeFromPrimary: boolean,
    govAgesFromPrimary: boolean,
    useStochMort: boolean,
    avgEAuto: boolean
  }
}
```

### Model (global simulation — single source)
```ts
{
  nSim, seed: number,                // fixed seed for reproducibility
  market: { eqRet, eqVol, bndRet, bndVol, inflation },   // inflation lives here, nowhere else
  stochMort, stochInf, fatTails,
  spendingCurve: "flat"|"gradual"|"smile"|"custom",
  spendingCurveParams: { goP, slP, noP, smileSlAge, smileNoAge },
  stressScenario1, stressScenario2
}
```

### Schema validator
A pure function `validateSchema(profile) → { ok: boolean, errors: string[] }` runs on every load and before every export. Rejects profiles that:
- Duplicate inflation sources.
- Define goals outside the events array.
- Omit or mis-sum `ownership` on shared entities.
- Store sync flags outside `persons[1].syncFlags`.

---

## 2. Phased execution

Each phase is self-contained. Phases run in order. A **self-audit** must be written to `planner/V3-AUDITS.md` before the next phase starts, covering: (a) what was done, (b) acceptance criteria met/deferred, (c) engine deltas observed in the snapshot harness, (d) risks exposed, (e) scope creep.

---

### Phase 0 — Foundations (4 h)

**Purpose**: lock the ground so later phases don't regress.

1. Commit this plan document.
2. **Test-profile library** (`planner/__tests__/v3-profiles.json`): eight profiles covering edge cases identified in review.
   - `single-early` — age 32, modest savings, high contrib rate (ON).
   - `single-preret` — age 58, retires at 65, DB pension (QC).
   - `couple-young` — 35/33, 2 kids, mortgage, 1 RRSP each (QC).
   - `couple-transition` — 55/53, pre-retirement, 1 DB + 1 CD, 1 rental (QC).
   - `couple-retired` — 70/68, retired, QPP/OAS active, 1 rental, meltdown (QC).
   - `couple-complex` — 50/48, CCPC, 2 rentals, FHSA, Smith, DB survivor (QC).
   - **`couple-uneven`** — 50/48, rental held 70/30, high-OAS-clawback spouse + low-income spouse (ON).
   - **`couple-early-death`** — 60/58, primary dies at 65 in stress scenario, spouse inherits.
3. **Snapshot harness** (`planner/__tests__/snapshot-harness.html`, opens in browser or headless Chrome):
   - Loads each profile.
   - Calls `runMC(profile, 1000, {seed: profile.seed})`.
   - Writes `{ grade, succ, medF, rVar5, medEstateNet, medEstateTax, p5Ruin }` to `planner/__tests__/snapshots/{profile}.json`.
   - Second tier: nightly 5 000-sim run written to `snapshots-nightly/`.
4. **Feature flag**: `window.BF_V3_HOUSEHOLD = false`. Default OFF.
5. Write initial audit to `V3-AUDITS.md`.

**Acceptance**:
- Harness runs each profile without errors.
- Snapshot file exists for each profile.
- Re-running with the same seed produces byte-identical snapshots.

**Self-audit checklist**: ✅ 8 profiles captured · ✅ re-run reproducibility verified · ✅ flag wired but OFF · ✅ engine behavior unchanged.

---

### Phase 0.5 — Contract & Harness Hardening (3 h)

**Purpose**: fix data-contract ambiguities and harden the test harness *before* any engine work.

1. **Unify inflation**: remove any household-level inflation field; engine reads `model.market.inflation` exclusively. Schema validator enforces.
2. **Fold goals into events**: migrate legacy `family[]` goal entries into `events[]` with `kind:"goal"`. Delete the `goals[]` array concept.
3. **Ownership as percentage**: introduce `OwnerSplit = {self, spouse}` on all shared entities. Default for migrated data: `{self:0.5, spouse:0.5}` for joint, `{self:1, spouse:0}` for self-only.
4. **Sync toggles in profile schema**: move `cSyncRetAge`, `cSyncGovAges`, `cUseStochMort`, `cAvgEAuto` from localStorage into `persons[1].syncFlags`. Read/write at load/export.
5. **Fixed-seed MC**: extend `runMC` signature to accept `{ seed }`; PRNG (Mulberry32 or similar deterministic) replaces any `Math.random()` in the MC core.
6. **Tolerance bands** in harness: pass if `|succ - baseline.succ| ≤ 0.003` (0.3 pp), `|medF - baseline.medF| ≤ 1.5 %`, `|rVar5 - baseline.rVar5| ≤ 2 %`. Outside → fail.
7. **Two-tier runs**: CI (1 000 sims) on each commit, nightly (5 000 sims) against `snapshots-nightly/`.
8. **Legal/compliance linter**: a grep script over the v3 file that flags forbidden phrasing (`devriez`, `vous devez`, `recommandons`, `il faut`, `you should`, `we recommend`, `you must`) and asserts disclaimer parity between FR and EN. Blocks commit if violations found.
9. **Schema validator**: ship as exported function; run on every profile load and before every export.
10. Write audit to `V3-AUDITS.md`.

**Acceptance**:
- Snapshot diffs after this phase: zero change in MC outputs (only data-shape migrations).
- Linter runs and finds no violations on current v3.
- All 8 profiles pass schema validation.

**Self-audit checklist**: ✅ inflation single-sourced · ✅ goals in events · ✅ ownership as % · ✅ sync in profile · ✅ deterministic seed · ✅ tolerances defined · ✅ linter active · ✅ validator active.

---

### Phase 1 — Sidebar structural completion (3 h)

**Purpose**: finish what's half-done before stacking new features.

1. Complete **progressive disclosure** across all modules: any zero-valued entity renders only a single entry point; details reveal on value.
2. Wrap all expert-mode assumptions in `<details class="bf-adv-drawer">`: Model stress, Model 2nd shock, Savings market hypotheses (done), per-account MER, Immo advanced strategies per property.
3. Apply `.bf-subsec` card wrapper consistently around subsection header + fields.
4. Finish acronym sweep (see §0 principle 5 list).
5. Verify validation tone across spouse + debt entries.

**Acceptance** (objective):
- Module-by-module audit table in `V3-AUDITS.md` showing every input field with its disclosure rule.
- No raw `<input type="range">` visible in default state for a zero-valued entity.
- No acronym in any visible label without inline expansion or tooltip — verified by `grep` against a term dictionary.

**Self-audit checklist**: ✅ default-state screenshots for all 12 modules · ✅ acronym grep clean · ✅ validation message grep clean · ✅ snapshot harness unchanged.

---

### Phase 2 — Couple tiered + sync (2.5 h)

**Purpose**: couples enter ~10 spouse fields instead of 40.

1. **Conjoint restructured** in three tiers (Essentiels / Retraite / Avancé). Tier 3 collapsed.
2. **Sync toggles** now in `syncFlags` (per Phase 0.5). Toggle ON auto-derives; OFF reveals raw field.
3. **Single/couple pill** replaces "Include a spouse" checkbox.
4. **Couple badge** ("✓ Plan couple" or "✓ Plan individuel") in Profile header.

**Acceptance** (objective):
- Couple with sync toggles ON: spouse field count (visible inputs) ≤ 12 measured by a DOM count test.
- Single mode: zero couple-specific DOM elements (verified by selector count).
- MC success rate within tolerance bands for each test profile.

**Self-audit checklist**: ✅ DOM counts measured · ✅ 8-profile snapshots pass · ✅ sync toggle round-trips through export/import.

---

### Phase 3 — Household scope relabel + spending merge (2 h)

**Purpose**: make the household the unit of spending without engine math change.

1. Hide `cRetSpM`; auto-consolidate on v2-profile load.
2. Relabel spending, budget, properties, debts with "du ménage" / "household" when `cOn=true`.
3. Add personal-scope dividers in Épargne (you) and Conjoint→Retraite (spouse).

**Acceptance** (objective):
- Profiles with `cRetSpM > 0` migrate to `retSpM += cRetSpM` on load; migration toast shown.
- String-audit table verifies "ménage" appears in all 4 household modules and nowhere else.
- MC success rate unchanged within tolerance.

**Self-audit checklist**: ✅ migration tested on v2 export · ✅ labels verified by grep · ✅ snapshots green.

---

### Phase 4 — Unified events model (engine touch, 4 h)

**Purpose**: replace triplication (`ev1/ev2`, `inc1-3`, `cEv1/cEv2`, `cInc1`, goals) with a single events array.

1. New shape per Phase 0.5 contract. `events[]` is the single array.
2. Load-time migration: legacy fields → events; legacy fields deleted from in-memory state; kept in saved JSON until Phase 9 ships.
3. **UI**: single "Événements" subsection in Flux with table editor (kind, owner, age, amount, label, inflated).
4. **Engine**: `runMC` reads events per year and dispatches per kind + owner. Remove hard-coded event paths.
5. Detailed report updated with owner columns.

**Acceptance** (objective):
- All 8 profiles re-run through harness: diffs within tolerance.
- Import of every `planner/__tests__/legacy-profiles/*.json` round-trips cleanly.
- Removing a legacy field from input does not break engine (unit test).

**Self-audit checklist**: ✅ migration matrix (legacy → new) documented · ✅ per-profile diff table · ✅ UI editor usability notes.

---

### Phase 5 — Ownership attribution (engine change, 5 h)

**Purpose**: reflect real couple tax treatment.

Behind `BF_V3_HOUSEHOLD = true`.

1. `OwnerSplit` field active on `properties`, `debts`, `nrInvestments`, `events`.
2. **UI**: ownership pill per item with 3 presets (Vous / Conjoint / 50-50) + Custom % input. Hidden when single.
3. **Engine**:
   - **Capital gains at sale**: split by `ownership.self`, `ownership.spouse` fractions; added to each person's taxable income.
   - **Mortgage/HELOC interest deduction**: allocated to the owner(s) proportionally.
   - **Estate**: spouse-owned assets roll over tax-free; joint survivorship; self-only → deemed disposition with spousal rollover where applicable.
   - **OAS clawback**: computed per person on personal taxable income.
4. Validate against `couple-uneven` profile: 70/30 rental shifts 70 % of CG to primary.

**Acceptance** (objective):
- `couple-uneven` with rental 100/0 vs 70/30 vs 0/100 produces three distinct estate splits and three distinct OAS clawback outcomes.
- Single profiles: zero observable behavior change (flag-gated).
- All 8 profiles pass tolerance.

**Self-audit checklist**: ✅ ownership fraction arithmetic verified on paper · ✅ edge cases (100/0, 0/100, 50/50, 70/30) tested · ✅ single-user path byte-identical to Phase 4 output.

---

### Phase 6 — Per-person tax with joint-spending optimizer (5 h)

**Purpose**: simulate two taxpayers meeting a joint consumption floor.

1. Engine loop restructured: per year → compute per-person income → per-person tax → solve joint withdrawal.
2. **Pension splitting**: automatic optimizer sweeping 0..50%, picks minimizing % each year. Manual slider behind "Override auto" toggle.
3. **QPP sharing**: auto-toggled when both eligible; equalizes RRQ income.
4. **Meltdown**: per-person target bracket; optimizer melts each person's RRSP to their own bracket ceiling.

**Acceptance** (objective):
- `couple-retired` with meltdown: per-person income streams deterministic across runs with same seed.
- Pension splitting auto-value ≤ manual-slider tax for ≥ 95 % of years.
- `single-*` profiles: diff within tolerance.

**Self-audit checklist**: ✅ seeded reproducibility · ✅ per-profile runtime ≤ 3 s @ 1 000 sims · ✅ optimizer convergence logged.

---

### Phase 7 — Visual polish & rhythm (3 h)

**Purpose**: the planner looks deliberate, not assembled. Runs AFTER data + engine are locked.

1. Typography tokens (one scale). No raw `fontSize` in component code — only token references.
2. Colour discipline: gold = action, blue = info, green = success, red = errors only. No decorative purple.
3. Spacing tokens: 8/12/20 px rhythm.
4. Rail: 4 px active bar, 1 px separator @ 50 % alpha, 150 ms hover easing.
5. Animation timings: overlay slide 280 ± 20 ms, drawer 200 ± 20 ms, focus ring always present.
6. Mobile breakpoints: 480 / 1100 / 1600 px snapshots.
7. Accessibility: all icon buttons `aria-label`, keyboard rail nav (arrow keys + Enter), Lighthouse a11y ≥ 95, contrast ≥ 4.5:1 (text) and 3:1 (large).

**Acceptance** (objective):
- No raw font-size / color hex in sidebar code — grep verified.
- Animation timings measured in DevTools performance tab, within ± 20 ms.
- Lighthouse accessibility ≥ 95 on three representative tabs.
- Keyboard-only walkthrough recorded and signed off.

**Self-audit checklist**: ✅ token coverage 100 % · ✅ Lighthouse report attached · ✅ keyboard walkthrough video or checklist · ✅ snapshots by breakpoint.

---

### Phase 8 — Output reframing (3 h)

**Purpose**: outputs speak "household" when couple, "you" when single.

1. Dashboard header + Plan Health copy branches on `cOn`.
2. Income chart (Tab 2): owner series (RRQ_self, RRQ_spouse, OAS_self, OAS_spouse, Pension_self, Pension_spouse, Withdraw_joint).
3. Estate report (Tab 8): per-owner + joint survivorship columns.
4. Detailed report (Tab 9): per-person income/tax columns + joint spending/wealth columns.
5. AI narration prompts branched: "vous" vs "le ménage".

**Acceptance** (objective):
- String audit: "votre plan" / "votre ménage" used consistently by mode.
- Tab-2 chart: exactly 7 series in couple mode, 4 in single mode.
- AI output sample from each mode reviewed for tone.

**Self-audit checklist**: ✅ couple narrative sample reviewed · ✅ single narrative sample reviewed · ✅ per-owner columns present in detailed report.

---

### Phase 8.5 — Planner ↔ Report parity (2 h)

**Purpose**: ensure the Bilan 360 report's numbers match the planner's MC outputs. Report-trust is in-scope, not post-ship.

1. Automated parity harness: for each of the 8 test profiles, generate both the planner Detailed report and the Bilan 360 report; compare year-by-year: `incomeByYear`, `withdrawalByYear`, `taxByYear`, `estateAtDeath`. Fail if any diff > 0.5 %.
2. Chart sanity assertions: no NaN, no negative wealth at any year, no missing labels.
3. Fix any divergences found (small fix budget reserved).

**Acceptance** (objective):
- Parity harness passes on all 8 profiles.
- Sanity assertions pass.
- A diff report is attached to `V3-AUDITS.md`.

**Self-audit checklist**: ✅ per-profile parity table · ✅ sanity assertions log · ✅ divergences diagnosed.

---

### Phase 9 — Migration & back-compat (2.5 h)

**Purpose**: v2 and intermediate v3 profiles load cleanly.

1. Load-time migration detects `_schema` version; applies transforms to current.
2. Export writes new `_schema: "v3.1"`.
3. Clamp out-of-range fields post-migration.
4. 90-day back-compat window; v2 export bundle in `planner/__tests__/legacy-profiles/` round-trips.

**Acceptance** (objective):
- Every legacy profile in `legacy-profiles/` imports and runs within tolerance.
- Export → re-import cycle is idempotent (schema stable).

**Self-audit checklist**: ✅ all legacy exports tested · ✅ idempotency verified · ✅ migration log written.

---

### Phase 10 — Final acceptance & ship (2.5 h)

**Purpose**: ship v3 as the new baseline.

1. Full regression: 8-profile snapshot diff vs Phase 0 baseline (expected deltas documented per phase).
2. Couple/single toggle end-to-end walkthrough.
3. Bilingual string review — read every visible sidebar string in FR and EN.
4. Performance: MC 5 000 sims on `couple-complex` ≤ 3 s on reference machine (M1-class Chrome).
5. Full Lighthouse run (accessibility, performance, best practices).
6. Compliance linter clean.
7. **Ship**:
   - Rename `planner_v2.html` → `planner_v2_legacy.html`.
   - Rename `planner_v3.html` → `planner_v2.html`.
   - Update `manifest.json` + `sw.js`.
   - Commit with full changelog referencing each phase's audit entry.

**Acceptance** (objective):
- All prior phase audits green.
- Lighthouse and compliance linter reports attached.
- Performance bench measured.

**Self-audit checklist**: ✅ regression table · ✅ bilingual string log · ✅ performance bench · ✅ compliance linter output · ✅ changelog.

---

## 3. Risk register

| Risk | Phase | Mitigation |
|---|---|---|
| MC non-determinism across runs | 0.5 | Fixed seed via deterministic PRNG; harness enforces reproducibility. |
| Engine changes silently alter outputs | 4, 5, 6 | Snapshot harness + tolerance bands + feature flag on risky phases. |
| Report ↔ planner drift | 8.5 | In-scope parity harness with 0.5 % tolerance. |
| Ownership % sum errors (e.g. 55/45.1) | 0.5 | Schema validator rejects sums outside [0.999, 1.001]. |
| Sync toggle round-trip loss across machines | 2 | Stored in profile JSON (Phase 0.5 change). |
| v2 exports fail to import | 9 | Legacy profile suite in `legacy-profiles/` tested every phase. |
| Single-file refactor review friction | all | Phase-scoped banner comments, one commit per phase, diffs stay readable. |
| Optimizer runtime blows up | 6 | Cap iterations + fallback heuristic + runtime budget in acceptance. |
| Output reframing breaks AI prompts | 8 | Gate under prompt flag; sample outputs reviewed before ship. |
| Compliance regressions | 10 | Linter blocks commit; no directive language passes. |
| Mobile layout regression | 7 | Breakpoint snapshots @ 375, 414, 768, 1100, 1600. |

---

## 4. Revised effort estimate

| Phase | Hours | Cumulative |
|---|---|---|
| 0 — Foundations | 4 | 4 |
| 0.5 — Contract & Harness Hardening | 3 | 7 |
| 1 — Sidebar completion | 3 | 10 |
| 2 — Couple tiered + sync | 2.5 | 12.5 |
| 3 — Household relabel + merge | 2 | 14.5 |
| 4 — Events unification | 4 | 18.5 |
| 5 — Ownership attribution | 5 | 23.5 |
| 6 — Per-person tax engine | 5 | 28.5 |
| 7 — Visual polish | 3 | 31.5 |
| 8 — Output reframing | 3 | 34.5 |
| 8.5 — Planner↔Report parity | 2 | 36.5 |
| 9 — Migration | 2.5 | 39 |
| 10 — Acceptance & ship | 2.5 | 41.5 |

**Base: ~42 focused engineering hours.** Allowing for QA, debugging, and review cycles typical of a refactor this size: **55–65 hours / 7–8 dev-days**.

---

## 5. Gating rules

1. **No phase skipped**. Phase N starts only after Phase N-1's acceptance is green **and** its self-audit is written to `V3-AUDITS.md`.
2. **Snapshot harness stays green** across every phase boundary (diffs within tolerance or explicitly documented per-phase).
3. **Feature flag gates risky phases** (5, 6); off-path must remain identical to the pre-phase baseline.
4. **No premature UI polish**. Phase 7 starts only after Phase 6 passes.
5. **Bilingual parity** shipped same day as the change.
6. **Compliance linter** must be clean at every commit after Phase 0.5.
7. **Self-audit before next phase**. If a self-audit exposes a scope miss, that miss goes into a follow-up phase; the current phase is not called "done" on hope.

---

## 6. Review feedback ledger

Summary of issues raised in internal review, each resolved in this plan.

| Issue | Resolution |
|---|---|
| Inflation in two places | Unified in `model.market.inflation` (Phase 0.5). |
| Goals separate from events | Folded into `events[]` with `kind:"goal"` (Phase 0.5). |
| Owner as enum misses %-splits | Replaced with `OwnerSplit { self, spouse }` (Phase 0.5). |
| Harness "zero diffs" too weak | Fixed-seed PRNG + tolerance bands + 2 tiers (Phase 0.5). |
| Effort 32 h too optimistic | Revised to 42 h base, 55–65 h realistic. |
| Report trust post-ship | Pulled in-scope as Phase 8.5. |
| Sync toggles localStorage-only | Moved to profile schema (Phase 0.5). |
| Subjective acceptance criteria | Every acceptance rewritten as objective, measurable. |
| Edge-case profiles missing | Added `couple-uneven` + `couple-early-death` to library (Phase 0). |
| No compliance lint | Added blocking linter (Phase 0.5). |
| Single-file refactor risk | Acknowledged; mitigated via banner comments + per-phase commits (out of scope to split). |

---

## 7. Out of scope (deliberate)

- **File splitting / build step**. The planner ships as static HTML by deployment design. Modularizing requires a build pipeline that is a separate project with its own costs.
- **Multi-person households > 2** (e.g. blended families with separate finances). The schema allows it (`persons[]` is an array) but UX/engine target exactly 1 or 2 persons.
- **Cross-border / non-Canadian tax cases**. Scope is QC + 12 other Canadian provinces only.
- **Report template redesign**. Report content is refined (Phase 8.5 parity) but the visual template is unchanged in this plan.

---

## 8. Post-ship (outside this plan)

- Bilan 360 report generator pulls from the new schema directly (engine-as-library refactor).
- Profile-sharing URL (signed, read-only).
- Native scenario A/B with inline diff.
- Mobile-first full redesign (separate effort).

---

**End of plan.**
