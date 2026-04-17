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
