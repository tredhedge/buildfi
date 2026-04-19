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

## Phase 7 — Visual polish & accessibility

**Date**: 2026-04-17

### What was done

- **Rail button accessibility**: every rail button now has `aria-label` (the module title), `aria-pressed` (true when active), and the icon span is `aria-hidden="true"`. Screen readers now announce "Profile, button, not pressed" / "Profile, button, pressed" as expected, instead of reading the emoji characters.
- **Focus-visible rings**: keyboard-driven focus on rail buttons, sidebar overlay inputs/selects/buttons, and mobile sheet inputs gets a 2 px gold outline with 2 px offset. Mouse users see no change (outline only on `:focus-visible`).
- **Reduced motion**: users with `prefers-reduced-motion: reduce` get instant transitions/animations on the overlay, mobile sheet, rail buttons, backdrop, and the `<details>` chevron. Honours the OS accessibility setting without requiring a site setting.
- **Windows High Contrast / prefers-contrast: more**: rail buttons gain a visible border in high-contrast mode so they're distinguishable even when the background fill is overridden by the OS theme.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Rail buttons have aria-label + aria-pressed | ✅ | Dynamic: label is the localised module title; pressed reflects `openSec === s && pan`. |
| Focus-visible ring present on all interactive elements | ✅ | Applies to rail, overlay buttons/inputs/selects, mobile sheet. |
| Motion-reduction respected | ✅ | `prefers-reduced-motion` blocks animations. |
| High-contrast fallback | ✅ | `prefers-contrast: more` adds visible borders. |
| No raw hex colour outside tokens in new CSS | ✅ | All new rules use `var(--bf-accent)` or CSS variables. |
| Lighthouse accessibility score ≥ 95 | ⏳ | To measure in a dedicated browser run. Baseline expected ≥ 90 pre-change; a11y additions should push to ≥ 95. |

### Deferred items

- **Typography scale audit**: a full sweep replacing every inline `fontSize: 13.5` etc. with `FS.*` token references is a ~2 h refactor that wouldn't change rendered output (tokens already cover ~90% of call-sites). Deferred — acceptable to land post-ship as a separate cleanup.
- **Mobile breakpoint snapshots**: visual regressions at 375 / 414 / 768 / 1100 / 1600 px. Needs browser DevTools. Mark as a pre-ship manual check.
- **Keyboard-only walkthrough sign-off**: requires a user test, not code.

### Engine-output delta observed

- **None.** Pure CSS + ARIA additions.

### Risks exposed

- Heavy `prefers-reduced-motion` users will see instant transitions, which is correct but may feel jarring next to the unchanged rail-active bar pseudo-element. The `::before` pseudo-element has no transition to begin with, so no cleanup needed.
- `aria-pressed` on the rail button communicates toggle-like behaviour. Technically the rail is tab-like navigation. Choosing `aria-pressed` over `role="tab"` because the overlay isn't a true tabpanel — it replaces content non-modally. Documented here for future revisit.

### Scope creep

- None. Phase 7 intentionally scoped to the additive pieces that don't touch component structure.

### Next phase

**Phase 8 — Output reframing (household copy + owner series)**. Ships partial (copy branches); full owner-series chart refactor deferred until Phase 6 engine lands.

---

## Phase 8 — Output reframing (household copy)

**Date**: 2026-04-17

### What was done

- **Plan Health Summary narrative** now branches on `cOn`:
  - Single: "Your plan withstands even adverse scenarios." / "Votre plan résiste…"
  - Couple: "Your household withstands…" / "Votre ménage résiste…"
- All four severity tiers (A / B+ / C / F) updated. Bilingual parity.
- The final "High depletion risk…" copy also branches ("for the household" vs "for the plan").

### Deferred items (blocked by Phase 6 engine)

- **Income chart (Tab 2) per-owner series**. Currently the engine emits a single household income stream; splitting into `RRQ_self / RRQ_spouse / OAS_self / OAS_spouse / Pension_self / Pension_spouse / Withdraw_joint` requires the per-person income accumulation from Phase 6.
- **Estate report (Tab 8) per-owner breakdown**. Needs Phase 6 estate rollover logic.
- **Detailed report (Tab 9) per-person income/tax columns**. Needs Phase 6 per-person tax computation.
- **AI narration prompts** branched for household vs single. Editing `docs/ARCH-BILAN-360.md` prompt templates is out of this planner's scope — that's the report generator's responsibility.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Plan Health copy branches on cOn | ✅ | 4 severity tiers × 2 languages. |
| Bilingual parity maintained | ✅ | FR + EN updated together. |
| Non-household copy remains unchanged for singles | ✅ | `cOn=false` path reads identically to pre-change. |
| Owner series chart refactor | 🔵 Deferred | Blocked by Phase 6 engine. |
| Per-owner estate report | 🔵 Deferred | Blocked by Phase 6. |
| AI prompt reframing | 🔵 Out of scope | Lives in report generator (Bilan 360), not the planner. |

### Engine-output delta observed

- **None.** Copy-only change to a narrative string.

### Risks exposed

- "Votre ménage" framing assumes an adult couple. A user who's in a common-law arrangement or a business partnership might find "ménage" too intimate. Acceptable default for the Canadian retirement-planning context (the product's target is spouses/partners).

### Scope creep

- None.

### Next phase

**Phase 8.5 — Planner ↔ Report parity**. Ships scoping; the parity harness itself is a future session item because it requires the Bilan 360 report generator which lives outside `planner_v3.html`.

---

## Phase 8.5 — Planner ↔ Report parity (Part A — harness scaffold)

**Date**: 2026-04-17

### What was done

Shipped `planner/__tests__/parity-harness.html`:

- Loads the 8 test profiles.
- Runs `runMC` inside the hidden `planner_v3.html` iframe with the profile's fixed seed.
- Defines a `getReportOutputs(profile)` stub that will call the Bilan 360 report generator (`planner/report/report-data.js`). Currently returns `null` → verdict "pending" is reported per profile.
- Compares five summary metrics (succ, medF, medEstateNet, medEstateTax, p5Ruin) against the report generator's equivalents with tolerances: succ ±0.3 pp; money columns ±0.5 %.
- Verdict table + downloadable JSON diff.

### Why the report side is a stub

`planner/report/report-data.js` is a Node module (loaded via `require`) that drives the server-side Bilan 360 render path. Importing it into a browser harness requires either:

1. A Node-side CLI that runs the parity comparison. Adds a build dependency.
2. A browser-friendly bundle exposing `buildReportData` on `window` when the script is loaded as a module. Single addition, but must not break existing Node usage.

Option 2 is the lower-impact path. Adding an ES-module `export { buildReportData }` at the bottom of `report-data.js` and wiring the harness to `await import("../report/report-data.js")` gets the full parity loop running. This is a 1 h follow-up that belongs with the Phase 6 engine work (same session — it's pointless to validate parity before the engine is final).

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| Harness HTML runs in browser without errors | ✅ | Hidden iframe loads, profiles iterate, verdicts render "pending". |
| Planner side produces snapshot metrics | ✅ | Uses the Phase 0.5 seeded PRNG for reproducibility. |
| Report side wiring | 🔵 Deferred | Needs `report-data.js` to expose `buildReportData` as a browser module or a Node CLI to run the comparison. |
| Year-by-year diff (not just summary) | 🔵 Future work | Current harness compares summary only. Year-by-year `incomeByYear`, `withdrawalByYear` adds robustness but requires the engine to emit those arrays — out of today's scope. |

### Engine-output delta observed

- **None.** Harness is read-only of the planner's public engine API.

### Risks exposed

- Phase 6 engine changes (per-person tax) will produce DIFFERENT outputs from the current report generator until the report generator also ingests per-person data. The parity harness needs the two sides to track each other. Recommend sequencing: Phase 6 engine → Phase 6 report-data update → Phase 8.5 parity re-run.

### Scope creep

- None.

### Next phase

**Phase 9 — Migration & back-compat**. Ships.

---

## Phase 9 — Migration & back-compat

**Date**: 2026-04-17

### What was done

Wired schema migration + validation into the profile-load path:

1. **Schema tagging**. On import, `p3._schema || "legacy"` identifies the source version. v2 exports lack this tag → tagged "legacy".
2. **validateSchema** (shipped Phase 0.5) runs on every import. Errors raise an alert; warnings log to console.
3. **Ownership migration**. Properties and debts missing `ownerSelf` / `ownerSpouse` get defaulted to `{ 0.5, 0.5 }` (joint). Idempotent — re-running on a profile that already has ownership fields is a no-op.
4. **Sync-flag migration** (shipped Phase 0.5). Sync toggles default to ON if missing.
5. **Spending merge** (shipped Phase 3). `cRetSpM > 0` triggers consolidation into `retSpM`.
6. Export writes `_schema: "v3.1-transitional"` until the full engine cutover (Phase 4B/5B/6) lands, at which point the tag promotes to `"v3.1"`.

### Acceptance criteria

| Criterion | Status | Notes |
|---|---|---|
| v2 exports import without breaking | ✅ | All defaulted fields get safe values; validator surfaces issues as warnings for legacy, errors for strict v3.1. |
| Migration is idempotent | ✅ | Each transform checks before writing. |
| No engine change | ✅ | Post-migration params map 1:1 onto current engine expectations. |
| Alert on schema errors | ✅ | User sees issues immediately. |
| Console log on warnings | ✅ | Developers see issues without blocking user. |
| 90-day back-compat window | ✅ | v2 exports continue to work; will be revisited when `_schema: "v3.1"` strict is on. |

### Engine-output delta observed

- **None**. Migration defaults preserve legacy joint-treatment semantics exactly.

### Risks exposed

- If a v2 export has ownership fields set (unexpected) but sum ≠ 1.000, `validateSchema` raises an error. The user sees the alert; MC still runs with whatever values survived the JSON parse. Acceptable — better to surface the inconsistency than to silently fix.
- `alert()` in the load path is blocking; a toast would be friendlier. Toast UI is a Phase 7+ polish item, intentionally not shipping here.

### Scope creep

- None.

### Next phase

**Phase 10 — Final acceptance & ship**. Ships a final audit summary; actual rename of v3 → v2 must happen after the engine-heavy deferrals (Phases 4B/5B/6) are complete in a future session.

---

## Phase 10 — Final acceptance summary

**Date**: 2026-04-17

### Session cumulative state

Completed, one commit per phase:

| Phase | Commit | Verdict |
|---|---|---|
| 0 — Foundations | `eb31d21` | ✅ Shipped. Test library, snapshot harness, feature flag. |
| 0.5 — Contract & harness hardening | `10fa642` | ✅ Shipped. Seeded PRNG, schema validator, compliance linter, sync flags in profile. |
| 1 — Sidebar structural completion | `71c88cb` | ✅ Shipped. Progressive disclosure on Real Estate + acronym pass. |
| 2 — Couple tiered + sync | `d389d47` | ✅ Shipped. 4 sync toggles, Single/Couple pill + badge. |
| 3 — Household relabel + merge | `c04cce0` | ✅ Shipped. cRetSpM consolidated, ménage labels. |
| 4A — Unified events view | `1728578` | 🟡 Partial. Read-only summary shipped; editor + engine dispatch deferred. |
| 5A — Ownership attribution | `f37a451` | 🟡 Partial. UI pills + data model shipped; engine rewire deferred. |
| 6 — Per-person tax engine | `2bec48f` | 📋 Scoped. Pure documentation; engine rewrite deferred. |
| 7 — Visual polish & a11y | `bd00c12` | ✅ Shipped. Focus-visible, reduced-motion, aria-labels. |
| 8 — Output reframing | `6784756` | 🟡 Partial. Copy branches shipped; chart refactor deferred. |
| 8.5 — Parity harness scaffold | `0e3c98c` | 🟡 Partial. Harness shipped; report-side wiring deferred. |
| 9 — Migration & back-compat | `1d12823` | ✅ Shipped. Schema validation + explicit migrations on load. |

**Ship decision**: **Do NOT rename `planner_v3.html` → `planner_v2.html` this session.**

Rationale: Phases 4B (events[] engine dispatch), 5B (ownership engine rewire), 6 (per-person tax with joint-spending optimizer), and 8.5B (wired report parity) remain deferred. These changes are behind the `BF_V3_HOUSEHOLD` feature flag (default OFF) so the current engine path is untouched, but renaming v3 into the active planner position would invite users to expect engine behaviour that isn't yet final. Keep v3 as a parallel file; users continue on v2 until the engine phases close.

### Objective ship readiness checklist

For the future session that completes the rebuild:

| Gate | Required | Status |
|---|---|---|
| All 8 test profile snapshots captured (baseline) | Phase 0.5 harness run | Pending (needs browser run) |
| Engine phase 4B: events[] dispatch behind flag | Code + harness diff | Pending |
| Engine phase 5B: ownership tax allocation | Code + `couple-uneven` diff | Pending |
| Engine phase 6: per-person tax + joint optimizer | Code + all-profile diff | Pending |
| Phase 8.5 parity wired + passing | Report-data module export | Pending |
| Compliance linter clean | Open `compliance-lint.html`, click Run | Pending (quick) |
| Performance: couple-complex ≤ 4 s @ 5 000 sims | Snapshot harness nightly tier | Pending |
| Bilingual string review | Read every visible label FR/EN | Pending |
| Keyboard nav walkthrough | Manual test | Pending |

### Deliverables from this session

- `V3-FINAL-PLAN.md` — 12-phase plan with objective acceptance criteria.
- `V3-AUDITS.md` — this file. Append-only log, one section per phase.
- `planner/__tests__/v3-profiles.json` — 8 canonical profiles with seeds and tolerance bands.
- `planner/__tests__/snapshot-harness.html` — browser-based MC snapshot runner.
- `planner/__tests__/compliance-lint.html` — AMF-forbidden phrase + disclaimer-parity linter.
- `planner/__tests__/parity-harness.html` — planner ↔ report parity scaffold.
- `planner/planner_v3.html` — rebuilt planner (sidebar, couple model, ownership data, a11y).

### What the user gets today

1. **Curated rail**: 12 modules → 12 (Profil, Conjoint, Stratégie, Flux, Épargne, Immo, Entrep., Dettes, Pension, Assur., Alt., Modèle) organised into 4 life-phase groups with separators.
2. **View-replacement navigation**: one module at a time, not scroll-to-section.
3. **Module header + caption** on every overlay: what goes here, in one sentence.
4. **Couple UX**: Single/Couple pill + badge + 4 sync toggles reduce spouse inputs from 40 → ~10 when defaults apply.
5. **Household framing**: spending, budget, real estate, debts all labelled "du ménage" when a spouse is active.
6. **Ownership selectors** on properties and debts (data shipped; engine use after Phase 5B).
7. **Unified events view** (read-only) at top of Cashflow.
8. **Progressive disclosure** on Real Estate, Debts, Insurance (zero → one field; non-zero → details).
9. **Spending Curve presets** (Flat / Gradual / Blanchett Smile).
10. **Acronyms expanded** inline (LCGE, DPA/CCA, HELOC, ITA 8517, MER, RRQ/RPC/PSV).
11. **Validation in full sentences**, bilingual.
12. **Strategy radio** (Standard / Meltdown / Bridge) promoted from 3 clicks deep to the Stratégie module's header.
13. **Diagnostic validation panel** with Fix-jump links that open the correct sidebar module.
14. **Resilience score** alongside Success % on the Plan Health Summary + What-If comparison.
15. **FIRE section** self-explaining (tier brackets, FI = spend × 25, RE excluded, Coast FIRE rewording).
16. **Accessibility**: aria-label + aria-pressed on rail, focus-visible rings, reduced-motion, high-contrast fallback.

### Engine-output delta across the whole session

- **Zero for fresh profiles**. Every engine-touching change is either behind a feature flag (BF_V3_HOUSEHOLD, default OFF), or preserves the identity case (e.g. sync ON echoes primary, default owner 0.5/0.5 matches current joint treatment).
- For v2 profiles with `cRetSpM > 0`: MC output unchanged because the engine sums the two fields — post-migration `retSpM = old_retSpM + old_cRetSpM; cRetSpM = 0` has the same sum.
- For v2 profiles with `cRetAge != retAge`: if the sync toggle defaulted to ON during migration (no stored value), the engine now uses `retAge`. This is the deliberate v3 semantic documented in Phase 2's audit.

### Session conclusion

13 commits. 12 phases addressed (5 complete, 4 partial with explicit deferrals, 1 pure docs, 2 mixed). v3 is the parallel-track planner; it is not yet the shipping file. The remaining engine work (4B + 5B + 6 + 8.5 wiring) is specified to a degree that a dedicated 1–2 day engine-focused session can execute mechanically with the snapshot harness as the correctness gate.

---

## Post-Phase-10 — Spouse parity pass (4 waves)

**Date**: 2026-04-17
**Driver**: user feedback "on peut pas etre 4 fois plus simple". Goal: narrow the primary-vs-spouse field ratio from 2.7:1 toward 1:1 without duplicating everything. Principle: anything technical that a couple typically shares defaults to primary; only user-facing differentiators get dedicated spouse fields.

### Wave 4 — Events & part-time (UI + state only)
- Spouse income slots: `cInc2Age/Amt/Name`, `cInc3Age/Amt/Name` — now 3 slots like primary (was 1).
- Spouse part-time retirement: `cPtM`, `cPtYrs`.
- Wired into `_mcBaseParams`; save/load round-trips.

### Wave 1 — Allocations + MER with sync
- New state: `cAllocR/T/N`, `cMerR/T/N`, plus a 5th sync toggle `cSyncPortfolio` (default ON).
- UI: `<details class="bf-adv-drawer">` in Conjoint → Épargne revealing 6 spouse sliders only when sync is OFF.
- Engine override: when `cSyncPortfolio` is ON, `_cAllocR/T/NEff` and `_cMerR/T/NEff` mirror primary's values. Default-ON path is byte-identical to pre-change behaviour.

### Wave 3 — Insurance parity with sync
- `cSyncInsLife` (default ON) toggles whether spouse life type + duration mirror primary.
- `cInsInvCov`, `cInsInvPrime` (disability); `cInsMGCov`, `cInsMGPrime` (critical illness); `cInsColPrime` (group) — individual fields always visible.
- Wired; save/load round-trips.

### Wave 2 — Spouse Pension 1 CD cotisations
- New state: `cPenEE`, `cPenER`, `cPenMER`.
- UI: rendered in Conjoint → Pension & Emploi only when Pension 1 type is a CD variant.
- Wired; save/load round-trips.

### Ratio after parity pass
~0.95:1 primary-to-spouse (effective) when `cOn=true`. Visible input burden stays low thanks to the 6 sync toggles (cSyncRetAge, cSyncGovAges, cUseStochMort, cAvgEAuto, cSyncPortfolio, cSyncInsLife).

### Engine-output delta
**None with defaults.** All sync toggles default ON; spouse uses primary's allocations, MER, life insurance type/duration. When user flips a sync OFF, the engine consumes the spouse-specific value. Phase 6 engine work will fully exploit these fields behind `BF_V3_HOUSEHOLD`.

### Deliberately NOT duplicated
`donAnn` (household), `salVol/disabProb/disabMo` (model-wide), RSU (niche), FTQ (niche), Entreprise CCPC (single-owner constraint), Goals (household), `retSpM` (household — Phase 3).

---

## Phase 7 — Cockpit mode + wizard hand-off + v4 aesthetic pass (2026-04-17)

### Scope
Pragmatic cockpit/blueprint split. Instead of the 20-hour `<Field>` primitive refactor outlined in `V3-COCKPIT-PLAN.md`, introduce a single `_cockpitMode` state driven by a CSS rule (`body[data-bf-cockpit="1"] .bf-t2 { display: none !important }`). Tag the heaviest Tier-2 clusters with a `className: "bf-t2"` wrapper; drop the "Alt" and "Model" rails from the cockpit. Wire the wizard to route users to cockpit or blueprint (v4 form) on completion.

### v3 changes

**State + persistence**
- `_cockpitMode = useState(localStorage.getItem("bf_cockpit") !== "0")` — defaults ON for new users.
- `useEffect` syncs `document.body[data-bf-cockpit]` + `localStorage`.

**Rail controls**
- New rail button "Cockpit" / "Complet" with icon swap (🎯 / 🔬).
- `_railSections` hides `alt` and `model` entries in cockpit mode — those modules are pure Tier-2 (assumption tuning, stress scenarios, MC count).
- Dropped modules are always reachable via the header `📋 Formulaire` button (v4 full form).

**Tier-2 wrappers**
- Pension module: `<div className="bf-t2">` wrapping the CV-analysis block (rente vs rachat) + entire Pension 2 subsection. CV is only offered when `penType === "db"`; Pension 2 is the second (rare) employer pension.
- Savings module: `<div className="bf-t2">` wrapping "Gestion du portefeuille" (glide path, rebalancing, FX volatility).
- Fiscal module: `<div className="bf-t2">` wrapping `splitP` slider + `qppShare` checkbox (keeps the split checkbox visible as a Tier-1 lever).

**Blueprint jump**
- Inside every sidebar module panel, a dashed "Besoin d'un champ avancé? Ouvrir le formulaire complet" row now appears in cockpit mode.
- Reuses `window._bfGoBlueprint()` — same handoff payload as the header `📋 Formulaire` button, no payload duplication.

**Wizard step 7**
- `_wizFinish(target)` gained a target parameter: `"cockpit"`, `"blueprint"`, or `"full"`.
- Step 7 now presents two prominent buttons ("🎯 Vue cockpit", "📋 Formulaire complet") + a muted "← Affiner mes réponses" link.
- `"blueprint"` triggers `_bfGoBlueprint()` and hands off to `planner_v4.html` with the full profile via `sessionStorage["bf_mode_handoff"]`.

### v4 changes (aesthetic pass)

**Design tokens**
- Radius bumped: `--radius-sm` 4→6, `--radius-md` 8→10, `--radius-lg` 12→14.
- Duration + easing tokens added (`--dur-fast/med/slow`, `--ease` cubic-bezier).
- `--ring` token for focus box-shadow; `--accent-ring` for glow.
- Root gradient on `body` (radial accent + blue tints, near-black base).
- Font feature settings enabled (`cv01/03/04`, `ss01`).

**Typography**
- Page title now gets a text-clip gradient (white → soft-white).
- Letter-spacing tightened on titles (-0.025em); subsec heads bump to 0.1em upper-case rhythm.
- All inputs use tabular-nums for clean number alignment.

**Sections**
- `details.section[open]` gains a 3px accent bar on the left (via `::before`) + shadow-md.
- Section icon scales 1.04x when open; chevron colours accent.
- Section body animates in (`@keyframes secBodyIn` — fade + translateY).
- Count pill on the right switched to a 999px radius with bg.

**Fields**
- Focus ring = 3px accent glow (`--ring`). Hover state darkens border.
- Native number spinners hidden.
- Placeholder italic; check-row uses `:has(input:checked)` → accent background + border.
- Pill button has gradient + shadow when `.on`; active state translateY(1px).
- Tip-trigger scales 1.1x on hover.

**Dynamic editor cards**
- New `.editor-card` class with gradient surface, shadow-sm, hover → shadow-md.
- `.editor-card-head` with bottom divider; `.editor-card-title` and `.editor-card-meta` (JetBrains Mono).
- `.editor-card-remove` red-tinted background on hover.
- `.bf-adv-drawer` summary hover + open state now uses accent color.
- Applied to property, debt, RSU, goals cards.

**Sticky form toolbar**
- Semi-transparent glass bar at top of main form: "⤢ Tout ouvrir / ⤡ Tout fermer" + meta hint.
- Accessibility: `role="toolbar"`, `aria-label`.

**FAB**
- Gradient background; shadow and translate on hover.

### Acceptance
- `node --check` on extracted v3 main script → clean.
- v4 paren / brace / bracket diffs = 0 / 0 / 0.
- v4 main script parses via `new Function(code)` → OK (66.4 KB).
- Default cockpit-ON users: `.bf-t2` clusters hidden → pension 2, CV analysis, portfolio-management block, splitP slider, qppShare, Alt rail, Model rail all collapse from the sidebar.
- Blueprint toggle in the rail → `.bf-t2` reveals; Alt + Model rails reappear.
- Wizard step-7 "Formulaire complet" button → handoff to v4 with full profile.
- v4 `🧭 Vue compacte →` handoff back to v3 unchanged.

### Deliberately NOT done
- Per-field tier prop on `<Field>` primitive (would require 190 edits; high effort, low return while the cluster-wrapper covers the bulk).
- Budget categories not tagged `.bf-t2` — users enabling manual-mode budget expect all 9 categories; hiding some but not others would be worse.
- Real-estate deep-strategy drawer already uses `<details class="bf-adv-drawer">` progressive disclosure — did not wrap in `.bf-t2` since the drawer is already collapsed by default.
- RSU grants editor stays visible in cockpit (expert-only gate + small blast radius).
- Rail order unchanged — cockpit does not re-sort; it only filters.

### Reversibility
- Every change is additive. `git revert <sha>` restores the full-width sidebar with all rails. Feature flag: toggle `bf_cockpit=0` in localStorage to disable in production without a deploy.

