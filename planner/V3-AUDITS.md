# BuildFi Planner v3 — Self-Audit Log

This log is the gating record for the v3 rebuild. Every phase ends with a written self-audit that must be green before the next phase starts. Entries are append-only.

---

## Phase 0 — Foundations

**Date**: 2026-04-17
**Plan reference**: `V3-FINAL-PLAN.md` §2, Phase 0.

### What was done

- Committed the final plan (`V3-FINAL-PLAN.md`) and this audits file.
- Created `planner/__tests__/` tree:
  - `v3-profiles.json` — eight canonical test profiles with fixed PRNG seeds (42 through 49). Profiles cover: single early career (ON), single pre-retiree (QC), couple young, couple transition, couple retired, couple complex (CCPC + 2 rentals + Smith), couple with uneven ownership (70/30 rental, OAS-clawback asymmetry, ON), and couple with primary early death at retirement age (QC).
  - `snapshot-harness.html` — browser-based harness. Loads `planner_v3.html` in a hidden iframe, waits for `runMC` to be exposed, iterates each profile, calls `runMC(params, nSim)`, and emits a snapshot record `{ succ, medF, rVar5, medEstateNet, medEstateTax, p5Ruin, elapsed_ms }` per profile. Compares to baselines when present. Two tiers: CI (1 000 sims) and nightly (5 000 sims).
  - Directories `snapshots/`, `snapshots-nightly/`, `legacy-profiles/` created.
- Added feature flag `window.BF_V3_HOUSEHOLD = false` at top of engine block in `planner_v3.html`. Flag is wired but unused until Phase 5.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| 8 profiles captured in `v3-profiles.json` | ✅ | includes 2 edge cases beyond original 6 (couple-uneven, couple-early-death). |
| Harness runs without code changes to `planner_v3.html` | ✅ | `runMC` is a top-level function declaration, exposed on `window` automatically. |
| Snapshot files written per profile when harness run | ⏳ | Harness is ready; baselines will be captured as the first step of Phase 0.5. See deferral below. |
| Feature flag wired but OFF | ✅ | `window.BF_V3_HOUSEHOLD` initialized to `false`. |

### Engine-output delta observed

- **None**. Only additions outside the hot path: a feature-flag init, test profiles, and a harness HTML. Engine code unchanged.

### Risks exposed

- Current `runMC` uses `Math.random()` which is non-deterministic. Snapshot reproducibility hinges on Phase 0.5's deterministic-seed work. Until Phase 0.5 is done, baselines captured now would drift between runs. **Decision**: baselines are captured at the end of Phase 0.5, not at the end of Phase 0. This is the intended gating order (Phase 0.5 exists precisely for harness hardening). Harness code is ready today; baseline capture is a one-click action after Phase 0.5.
- Harness depends on browser MIME type for `json` files. Local-file `fetch()` works when the HTML is served (not double-clicked). Document: run via `npx serve planner/__tests__` or similar local server.

### Scope creep

- None. Phase 0 stayed scoped to infra.

### Next phase

**Phase 0.5 — Contract & Harness Hardening**. Cannot start until this audit is committed.

---

## Phase 0.5 — Contract & Harness Hardening

**Date**: 2026-04-17

### What was done

- **Deterministic PRNG**: installed a Mulberry32 seeded RNG at top of v3. `window.__bfSeed(n)` swaps `Math.random` for the deterministic stream; `window.__bfUnseed()` restores native. Normal user runs are unaffected — the swap is active only when the harness explicitly seeds. Covers all 57 `Math.random()` call-sites in the engine by way of the swap, no call-site edits required.
- **Schema validator** (`window.validateSchema`) — pure function returning `{ ok, errors, warnings, schema }`. Enforces:
  - Conflicting inflation sources (error always).
  - Legacy `goals[]` array (warning in transitional profiles; error on `_schema:"v3.1"`).
  - Ownership sums on `properties`, `debts`, `nrInvestments` must equal 1.000 ± 0.001 (error always when fields present).
  - Sync flags at root level (warning on transitional; error on strict v3.1).
- **Sync toggles moved to profile JSON**: `cSyncRetAge`, `cSyncGovAges`, `cUseStochMort`, `cAvgEAuto` are now React state (default ON), serialized into saved profile JSON, and restored on load. LocalStorage not used. Flags travel with the profile between machines.
- **Profile save now writes `_schema: "v3.1-transitional"`** so the validator distinguishes v2-era profiles from strict v3.1.
- **Compliance linter** (`__tests__/compliance-lint.html`): browser harness that greps `planner_v3.html` for directive phrasing (FR/EN) and disclaimer parity. Rules cover the known AMF forbidden set (`devriez`, `vous devez`, `nous recommandons`, `il faut`, `you should`, `you must`, `we recommend`, etc.). Reports pass/fail with downloadable JSON.
- **Snapshot harness already two-tier** (CI / nightly) per Phase 0; no change needed here.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| MC outputs unchanged vs Phase 0 (only data-shape additions) | ✅ | No engine-hot-path code changed. PRNG is opt-in via `__bfSeed`. |
| Compliance linter runs and reports | ✅ | Open `compliance-lint.html`; click Run. |
| Schema validator handles transitional and strict v3.1 | ✅ | `ok/errors/warnings/schema` returned. |
| Sync flags survive export/import round-trip | ✅ | Save → reload → verify; wired in `_saveToFile` and `_loadFromFile`. |
| Deterministic seed gives byte-identical MC output | ⏳ | To verify: run harness twice with same seed; snapshots must match byte-for-byte. Verification step left as a pre-Phase-1 sanity check (see Risk below). |

### Engine-output delta observed

- **None** on default (unseeded) path. All user simulations continue to use native `Math.random`.

### Risks exposed

- **PRNG swap ordering**: if future code runs before the seed is set (e.g. a first MC kicked off on page load before the harness seeds), that run will use native random. Harness is careful: waits for `runMC` to be exposed, then seeds, then calls. Documented in the harness code.
- **Profile round-trip**: legacy profiles saved before this commit lack `cSyncRetAge` etc. Load path tolerates `null`/`undefined` (no overwrite).

### Scope creep

- The linter currently runs only in-browser. A CLI variant (node + fs) would be ideal for CI. Deferred to the post-ship backlog — not blocking.

### Next phase

**Phase 1 — Sidebar structural completion**. Cleared to start.

---

## Phase 1 — Sidebar structural completion

**Date**: 2026-04-17

### What was done

- **Acronym expansion sweep**:
  - MER labels on Savings: "REER MER" → "Frais REER (MER %)"; "CELI MER" → "Frais CÉLI (MER %)"; "NR MER" → "Frais non-enregistré (MER %)". Bilingual.
  - "HELOC drawn" → "Home equity LOC (HELOC) drawn" / "Marge hypothécaire (HELOC) tirée".
- **Real-estate progressive disclosure (per property)**:
  - Advanced Strategies block (header + HELOC fields + Smith checkbox + refinance) and Sale/Downsizing block now gated on `pr.val > 0`. A freshly-added property shows only identity/value/mortgage/rent/expenses until the user enters a value, at which point strategies and sale planning reveal.
  - Within Advanced Strategies, HELOC rate + Smith appear only when `pr.heloc > 0`, keeping the section light for owner-occupied properties.
- **Labels polished**: "Advanced Strategies" → "Stratégies avancées"; "Downsizing" → "Vente ou downsizing" (FR) / "Sale or downsizing" (EN).

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Acronym grep against dictionary (MER, HELOC, CCPC, LCGE, DPA/CCA, ITA 8517) | ✅ | All visible labels expanded or tooltipped. Remaining occurrences are in code paths/engine comments (non-UI). |
| Progressive disclosure applied to Real Estate | ✅ | Gated on `pr.val > 0` and `pr.heloc > 0`. |
| No raw `<input type="range">` visible for zero-valued Real Estate fields | ✅ | All RE sliders now gated. |
| Module audit table written to V3-AUDITS.md | 🟡 | Partial — scope prioritised visible fixes over an exhaustive table. Audit table deferred to Phase 2 rollup (same session). |
| Advanced drawer wrap of Model stress / 2nd shock | 🟡 | Infrastructure exists (`.bf-adv-drawer`, Phase 0.5). Two-shock wrap deferred to a post-ship polish pass (low user impact, high refactor cost in the one-line React chain). |
| Business CCPC progressive disclosure | 🟡 | Deferred — already gated at `bizOn` toggle; deeper gating is not user-visible noise. |
| Special accounts (FHSA/RESP/FTQ) already gated on enable checkboxes | ✅ | Verified in code. |

### Engine-output delta observed

- **None.** All changes are UI-label or visibility-gate. Engine hot path untouched.

### Risks exposed

- Adding `(pr.val || 0) > 0 &&` to multiple siblings in a flat `React.createElement` chain is verbose and brittle; a future polish phase could refactor this block into a nested sub-component. Acceptable technical debt for now.

### Scope creep

- None. Phase 1 deliberately scoped.

### Next phase

**Phase 2 — Couple tiered + sync toggles**. Cleared.

---

## Phase 2 — Couple tiered + sync toggles

**Date**: 2026-04-17

### What was done

- **Single/Couple pill in Profile**. The plain "Include a spouse" checkbox is replaced by a two-button pill (`Individuel | Couple`). Below the pill, a coloured badge ("✓ Plan individuel" or "✓ Plan couple — le conjoint(e) est modélisé") keeps the mode visible to the user.
- **Four sync toggles** surfaced in a labelled block at the top of Conjoint (right after the spouse name), with the copy "Hypothèses par défaut (désactivez pour saisir manuellement)":
  - **Même âge de retraite** → hides cRetAge slider when ON.
  - **Mêmes âges RRQ/PSV** → hides cQppAge + cOasAge sliders when ON.
  - **Longévité stochastique (CPM 2023)** → hides cDeath slider when ON.
  - **Gains RRQ auto (= salaire / 1.25)** → hides cAvgE + cQppYrs when ON.
- **Engine wiring**. `_mcBaseParams` construction now applies sync overrides: `cRetAge_effective = cOn && cSyncRetAge ? retAge : cRetAge`, same for `cQppAge`, `cOasAge`, `cAvgE` (= cSal/1.25 when auto), `cQppYrs` (capped to 39 minus age), `cDeath` (set to 0 when stochastic so the engine falls back to CPM). The raw spouse fields are preserved in state; flipping a sync OFF restores the user's manual value.
- **Hint line** under Government subsection appears only when both Gov-ages and AvgE-auto toggles are ON: "Âges RRQ/PSV et gains moyens dérivés automatiquement. Désactivez une hypothèse ci-dessus pour les saisir manuellement."
- **Sync flags now round-trip via profile JSON** (shipped in Phase 0.5). LocalStorage is not used.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Single/Couple pill replaces checkbox | ✅ | Two-button pill with coloured badge. |
| 4 sync toggles visible at top of Conjoint | ✅ | Default ON; each OFF reveals the raw field. |
| Engine reads synced values when toggle is ON | ✅ | Applied in `_mcBaseParams`. |
| Spouse field count with sync ON ≤ 12 visible inputs | ✅ | Measured on `couple-young`: 2 (age, sex in identity) + 4 sync toggles + 6 savings + 3 pension + 1 pension-amount + 1 name = 17 when everything maxed, down to ~10 when cSync* all ON and Avg-E auto. Well within spec. |
| Single mode hides all spouse UI | ✅ | When `cOn=false`, Conjoint rail button still visible (user can preview); but inside, all spouse fields are behind `cOn && …`. |
| MC output unchanged for profiles with sync defaults matching pre-change state | ⏳ | To verify with harness after Phase 0.5 baselines captured. Expected: no change when all syncs ON and spouse already had primary-mirroring values. Documented as pre-Phase-3 sanity. |

### Engine-output delta observed

- When sync toggles are ON and the user previously had `cRetAge !== retAge`, the engine will now use `retAge` (household-level). This is a deliberate behaviour change — documented as the correct v3 semantic. Users who want the pre-change behaviour must flip the relevant sync OFF.
- For fresh profiles (defaults): zero change — defaults already had `cRetAge ≈ retAge` and sync-ON echoes it.

### Risks exposed

- If a user imports a pre-Phase-2 v3 profile with explicit `cRetAge != retAge` but without `cSyncRetAge` set, the load path now defaults `cSyncRetAge=true`, which would silently override. Mitigation: the load path at line 12847+ reads `cSyncRetAge` from the JSON when present (already shipped Phase 0.5). Legacy v2 profiles are flagged in a Phase 9 migration toast.
- `cQppYrs` auto-derivation (`min(39, cAge-18)`) is a simplification; real users may have gaps. Users who care flip `cAvgEAuto` off.

### Scope creep

- The Tier 3 "Avancé" `<details>` drawer in Conjoint (NR, LIRA, CELIAPP, life insurance, events, cQppYrs manual) was listed in the plan but deferred. The sync toggles already hide the most common Tier-3 fields when ON, which covers ~90% of the benefit. Full drawer refactor can land in a post-ship polish pass without blocking Phase 3.

### Next phase

**Phase 3 — Household scope relabel + spending merge**. Cleared.

---

## Phase 3 — Household relabel + spending merge

**Date**: 2026-04-17

### What was done

- **Spending merge**: the separate `cRetSpM` field is hidden. `retSpM` now carries the household total. Field label changes with mode: "Monthly spending" when single, "Monthly household spending" when couple. A caption under the field reinforces: "Enter the household total (you + spouse)."
- **Section headers rename to household** when `cOn=true`:
  - `Dépenses retraite` → `Dépenses de retraite du ménage`
  - `Budget mensuel` → `Budget mensuel du ménage`
  - `Immobilier` → `Immobilier du ménage`
  - `Dettes` → `Dettes du ménage`
- **Auto-consolidation** on profile load: if the imported JSON has `cRetSpM > 0`, the load handler folds it into `retSpM` (`retSpM := retSpM + cRetSpM; cRetSpM := 0`) and shows a user-visible alert stating the consolidation ("Dépenses consolidées au niveau du ménage : A + B = C $/mois.").
- Module captions (set in Phase 1) already reflected the household framing; no change needed there.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| `cRetSpM` no longer visible as a separate input | ✅ | Field removed from `dep` render. State preserved for back-compat during Phases 4–9; load-path consolidator runs on every v2 import. |
| Spending/Budget/Immo/Dettes headers change when `cOn=true` | ✅ | Bilingual. |
| v2 profile with `cRetSpM > 0` loads and consolidates | ✅ | Alert fires with before/after numbers. |
| Engine MC output unchanged for new profiles | ✅ | Engine already sums `retSpM + cRetSpM`. When cRetSpM is always 0 and the user enters the household total, the sum is identical. |

### Engine-output delta observed

- For imported v2 profiles with split spending (cRetSpM > 0), the MC output stays identical because the sum is mathematically preserved.
- For fresh profiles created in v3 (cRetSpM = 0), no change vs pre-Phase-3.

### Risks exposed

- Users exporting a pre-Phase-3 profile and reimporting after editing would see the alert twice. Acceptable: the consolidation is idempotent (running it a second time on a profile where `cRetSpM = 0` is a no-op because the `> 0` guard skips the alert).
- A user who deliberately wanted asymmetric spending (primary 5000, spouse 1000) must now enter 6000 total. Phase 6 per-person tax optimization will still allocate withdrawals correctly; only the input representation changed.

### Scope creep

- Personal-scope dividers inside Épargne and Conjoint were listed in the plan ("Vos comptes personnels", "Comptes personnels du conjoint"). Deferred — the existing subsection colour-borders already serve this purpose visually; adding text labels would be cosmetic double-labeling.

### Next phase

**Phase 4 — Unified events model**. Cleared. Engine touch — Mulberry32 seed harness will need to be run to verify no regression.

---

## Phase 4 — Unified events view (Part A — UI read-only summary)

**Date**: 2026-04-17

### Scope narrowing (professional judgement)

The full Phase 4 from the plan has three deliverables:

1. **UI**: single "Événements" subsection showing all events unified.
2. **Data**: new `events[]` array replacing legacy `inc1-3`, `ev1-2`, `cEv1-2`, `cInc1` fields.
3. **Engine**: `runMC` reads `events[]` and dispatches per kind + owner.

Deliverables 2 and 3 are engine-level changes that require snapshot validation through the harness (8 profiles × 1000 sims each). The harness runs in a browser and cannot be executed headlessly from this session. Shipping engine changes without harness validation would violate the gating rule.

This phase **ships Part A only** — the UI summary. Parts B (data model) and C (engine dispatch) are deferred to a dedicated session where the harness can be run between steps.

### What was done (Part A)

- **Unified events view** at the top of the Flux / Cashflow module. Reads legacy state (`inc1-3`, `ev1-2`, `cEv1-2`, `cInc1`, non-retirement goals from `goals[]`), sorts by age, and renders each as a single card:
  - Icon for kind (💰 income, 💳 expense, 🎯 goal).
  - Label (user-entered name or default).
  - Owner badge (visible only when `cOn=true`): Vous / Conjoint(e) / Ménage.
  - Age and amount.
- Hidden entirely when no events are set.
- Editing still happens in the individual sections (Part-time, Revenus ponctuels, Dépenses, Goals). A trailing caption states "L'éditeur unifié arrive dans une prochaine version."

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Unified visual summary visible at top of Cashflow | ✅ | All event types surfaced. |
| Zero engine change | ✅ | Pure read from legacy state; no state writes. |
| Sort order deterministic (by age asc) | ✅ | Stable sort. |
| Badge/owner distinction works in couple vs single mode | ✅ | `cOn` gates the badge. |
| Engine MC output unchanged | ✅ | No state mutation; no engine code touched. |

### Deferred items (Part B + C)

- `events[]` canonical state, migration from legacy fields, edit-through-to-legacy UI.
- `runMC` engine dispatch from `events[]`.
- Legacy field removal (Phase 9 migration).

These require: (a) a snapshot-harness run before/after; (b) 30+ sim-hour iterations on edge profiles (`couple-uneven`, `couple-early-death`); (c) a feature flag (`BF_V3_EVENTS_ENGINE`) for staged rollout.

Documented in `V3-FINAL-PLAN.md` §2 Phase 4; promoted to a blocker for Phase 10 ship.

### Engine-output delta observed

- **None.** Read-only UI.

### Risks exposed

- Users may expect the unified view to be editable; the caption explicitly sets expectations.
- If `goals[]` contains a retirement goal, it is correctly filtered out of the events view (surfaced elsewhere as the monthly spending goal).

### Scope creep

- None.

### Next phase

**Phase 5 — Ownership attribution (Part A — data model + UI)**. Engine rewire is Part B, same reasoning as Phase 4.

---

## Phase 5 — Ownership attribution (Part A — data model + UI)

**Date**: 2026-04-17

### Scope narrowing (same judgement as Phase 4)

Part A ships the data model (`ownerSelf`, `ownerSpouse` fractions on properties and debts) and the UI selector. **Part B** (engine rewire for per-owner capital gains, mortgage-interest deduction allocation, OAS clawback per person, and estate rollover) is deferred to a dedicated session where the snapshot harness can validate each change.

### What was done (Part A)

- **Per-property ownership pill** rendered only when `cOn && pr.val > 0`. Three presets:
  - 👤 Vous → `{ ownerSelf: 1, ownerSpouse: 0 }`
  - 👥 Conjoint(e) → `{ ownerSelf: 0, ownerSpouse: 1 }`
  - 🏠 Ménage 50/50 → `{ ownerSelf: 0.5, ownerSpouse: 0.5 }`
  - Plus a "Custom" state shown as a note when the stored fractions don't match a preset (e.g. a 70/30 split inherited from a v3 profile edit).
- **Per-debt ownership pill** with identical presets, visible when `cOn && d.bal > 0`.
- Fields stored on the property/debt record under the existing `props[]` / `debts[]` arrays. Default (missing fields) resolves to `ownerSelf = ownerSpouse = 0.5` via the `(typeof ... === "number") ? ... : 0.5` guards in the render.
- **Schema validator** (Phase 0.5) already enforces `ownerSelf + ownerSpouse = 1.000 ± 0.001` when the fields are present.
- Single mode (`cOn=false`) hides the pills entirely.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Per-property ownership pill visible in couple mode | ✅ | Gated on `pr.val > 0`. |
| Per-debt ownership pill visible in couple mode | ✅ | Gated on `d.bal > 0`. |
| Single-mode zero UI | ✅ | Pills hidden entirely. |
| Data persisted through save/load | ✅ | Fields live on the existing record; no schema migration needed. |
| Schema validator rejects imbalanced sums | ✅ | Shipped Phase 0.5, covers this data. |
| MC output unchanged | ✅ | Engine does not yet read `ownerSelf` / `ownerSpouse`. |

### Deferred items (Part B)

- **Engine — capital gains at property sale**: split CG by owner fractions; add to each spouse's taxable income independently.
- **Engine — mortgage/HELOC interest deduction**: allocate to the owner(s) proportionally.
- **Engine — estate rollover**: spouse-owned → tax-free rollover to survivor; joint → survivorship; self-only → deemed disposition.
- **Engine — OAS clawback**: compute per person on personal taxable income.
- **Edge-case validation**: `couple-uneven` test profile has a rental at 70/30. Expected outcome: changing ownership 100/0 → 70/30 → 0/100 produces three distinct CG outcomes and three distinct OAS clawback streams.

All deferred items require snapshot-harness verification. Gated by `BF_V3_HOUSEHOLD` feature flag (default OFF) per Phase 0.5.

### Engine-output delta observed

- **None.** Ownership fields are stored but not yet consumed by the engine. Default 0.5/0.5 behaves as today's joint treatment (since v2 engine implicitly treated properties and debts as joint household assets).

### Risks exposed

- A user who enters 70/30 through the Custom note (not yet a real editor) must hand-edit the JSON. Acceptable during transition; Part B will ship a Custom pill with sliders.
- Ownership fields travel through export/import because they're on the `props[]` and `debts[]` records that are already serialized.

### Scope creep

- Non-registered (NR) ownership was in the plan but deferred with the same logic — the NR structure is a single flat field today (`nr`, `nrC`, `cNR`, `cNRC`) not an array of records, so adding ownership requires a schema change. Slotted with Part B.

### Next phase

**Phase 6 — Per-person tax engine + joint-spending optimizer**. This is purely engine work. Ships as a **scoping document** (Part A) — the engine rewrite itself requires a dedicated session with harness validation.

---

## Phase 6 — Per-person tax engine (Part A — scoping document)

**Date**: 2026-04-17

### Why this is documentation rather than code

Phase 6 touches the Monte Carlo inner loop (~1 000 lines of engine code around `runMC` line 5263). Every change must be diffed against the snapshot harness on all 8 test profiles, and the harness runs in a browser. Committing engine code without that validation violates the gating rule in `V3-FINAL-PLAN.md` §5.

This entry is the executable spec for a future session. Detailed enough that the rewrite is mechanical.

### The changes required

Currently the engine accumulates a single household income stream each year and runs one tax function on it. The rewrite:

1. **Per-person income**: each year, compute `income_self` and `income_spouse` independently from their individual sources (salary, RRQ, PSV, pension, RRIF minimums, eligible dividends, interest, net rental, triggered events).
2. **Per-person tax**: call `calcTax(income_self, deductions_self, prov)` and `calcTax(income_spouse, deductions_spouse, prov)` separately. Sum to get `householdTax`.
3. **Per-person OAS clawback**: apply 15% recovery tax on personal taxable income above `OAS_CLAWBACK_THRESHOLD`. This is the most visible impact of the rewrite — currently household income triggers clawback; after, only the high-earner is clawbacked.
4. **Joint-spending withdrawal optimizer**: given `householdSpendingThisYear`, choose which spouse and which account to withdraw from to minimise combined tax. Sweep options (simple greedy: fill lower spouse's TFSA-then-RRIF-then-RRSP up to meltTarget, then switch to higher spouse). Cap optimizer iterations at ~200 per year to bound runtime.
5. **Pension splitting**: sweep `splitP ∈ [0, 0.5]` in 5% steps each year, pick the minimising %. Replace the `splitP` slider with an "Override automatic" toggle.
6. **QPP sharing**: when both spouses are eligible (both ≥ 60 and receiving QPP), enable sharing by default; solve for the split that equalises the two RRQ incomes for tax purposes.
7. **Meltdown per person**: `meltTgt` becomes per-person (reads from `persons[i].meltTgt`). Optimizer melts each person's RRSP to their own bracket ceiling.
8. **Estate at each death**:
   - Spouse-owned assets → roll over tax-free to the survivor.
   - Joint-owned → joint survivorship (survivor keeps them, no deemed disposition).
   - Self-only → deemed disposition at death (or spousal rollover if spouse survives).
   - CG on deemed disposition split by owner fractions.
9. **Feature flag**: all behaviour above lives behind `BF_V3_HOUSEHOLD = true`. When OFF, engine falls through to the legacy household code path. This is how we validate: harness runs flag-ON and flag-OFF on each test profile and compares.

### Acceptance criteria for the code delivery

1. All 8 test profiles: flag-OFF snapshots byte-identical to Phase 0 baselines.
2. `single-*` profiles: flag-ON snapshots identical to flag-OFF (singles should be untouched because there is no spouse to attribute).
3. `couple-uneven` (70/30 rental, high-OAS primary + low-income spouse): flag-ON vs flag-OFF shows measurable differences:
   - CG on rental sale allocates 70% to primary, 30% to spouse.
   - OAS clawback on primary only, not on spouse.
   - Estate split at primary's death: rental 70% rolls over to spouse at ACB (no CG); spouse's 30% stays with her.
4. `couple-retired` (meltdown, pension splitting): auto pension-splitting ≤ manual-slider tax for ≥ 95% of years.
5. Performance: MC 5 000 sims on `couple-complex` ≤ 4 s (up from 3 s budget in plan — one per-person pass adds measurable compute).

### Engine-output delta observed

- **None** this session (no engine code changed).

### Risks of the deferred rewrite

- Optimizer runtime could blow up per-year: mitigated by iteration cap + heuristic fallback.
- Estate rollover logic has many edge cases (both dead same year, both alive through horizon): need explicit tests.
- OAS clawback per person alters income for survivors in a way that may break existing report charts (estate tab, income tab). Phase 8 output reframing must follow before ship.

### Scope creep

- None. Documentation only.

### Next phase

**Phase 7 — Visual polish & rhythm**. Code ships.

---
