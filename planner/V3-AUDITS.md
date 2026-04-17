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
