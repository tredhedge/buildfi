# BuildFi Engine Full Audit (2026-04-14)

## Scope
- Core engine: `lib/engine/index.js` (2410 lines)
- API integration: `app/api/simulate/route.ts`, `app/api/compare/route.ts`, `app/api/optimize/route.ts`, `app/api/export/route.ts`, `lib/api-helpers.ts`
- Constants pipeline: `lib/constants-registry.ts`, `lib/constants/fiscal-2026.ts`, `lib/constants/index.ts`
- UI coupling points: `app/simulateur/page.tsx`

## Verification Run
- `npm run build`: pass
- `npm run test:constants`: pass
- `npx tsx tests/fiscal-constants-sync.test.ts`: pass
- `npm run lint:amf`: fail (4 violations, report/compliance copy)
- `npx tsx tests/s3-api.test.ts`: fail (grade-scale assertions)
- `npx tsx tests/s10-audit.test.ts`: fail (grade-scale assertions + 5000 sims perf threshold)

---

## Executive Summary
- Overall engine is functional in production flow, but there are critical robustness gaps.
- Most urgent issue: missing `deathAge` guard can crash `runMC`.
- There is architecture drift: constants exist in a central registry but engine still uses hardcoded values.
- Comparison/optimization reliability is degraded by parameter naming mismatches and non-deterministic RNG across variants.

---

## Findings (Prioritized)

### P0-1: Engine can crash when `deathAge` is missing
- `validateBaseParams` does not require `deathAge` in `lib/api-helpers.ts:69`.
- `runMC` computes `Math.floor(p.deathAge - p.age)` in `lib/engine/index.js:889`.
- This can produce empty path and break on final extraction (`path[path.length - 1].total`) in `lib/engine/index.js:1856`.
- Impact: API 500s on malformed payloads, unstable external integrations.

### P1-1: Compare allowlist uses spouse key names inconsistent with engine contract
- Allowlist in `app/api/compare/route.ts:42-43` uses `cRrsp/cTfsa/cNr` and `cRrspC/cTfsaC/cNrC`.
- Engine and simulator primarily use `cRRSP/cTFSA/cNR` and `cRRSPC/cTFSAC/cNRC`.
- Impact: overrides can be silently ignored/stripped depending on source payload.

### P1-2: `wStrat="optimized"` falls back to TFSA-first behavior when `_optSchedule` is absent
- Branch in `lib/engine/index.js:1450` requires both `wStrat === "optimized"` and `_optSchedule`.
- If `_optSchedule` is missing, code falls into generic `else` branch (`tfsaFirst` order) at `lib/engine/index.js:1499`.
- UI/optimizer can set strategy to optimized (`app/simulateur/page.tsx:1245`, `app/api/optimize/route.ts:113`) without supplying schedule.
- Impact: behavior-label mismatch and potentially large tax/regime differences.

### P1-3: Input object mutation inside `runMC` leaks side effects
- `runMC` sanitizes by mutating `p` directly from `lib/engine/index.js:859`.
- Routes pass request params object directly (e.g., `app/api/export/route.ts:104`) and reuse it later for report generation (`app/api/export/route.ts:115`).
- Impact: hidden coupling, hard-to-debug differences between raw and reported assumptions.

### P1-4: Constants drift between “registry” and engine hardcoded values
- Example mismatches:
  - NS non-eligible dividend credit: `0.0299` in `lib/constants-registry.ts:68` vs `0.021568` in `lib/engine/index.js:50`
  - PE: `0.0163` vs `0.027` (`:69` vs `:51`)
  - NL: `0.032` vs `0.021739` (`:70` vs `:52`)
  - NT: `0.06` vs `0.02302` (`:71` vs `:53`)
  - YT eligible/non-eligible mismatch (`:72` vs `:54`)
- Impact: governance risk and possible false confidence in update tooling.

### P1-5: MC results formatter has falsy-value bug for liquid percentiles
- In `lib/api-helpers.ts:110-112`, checks are truthy (`mc.liqP25 ? ...`) instead of nullish checks.
- A valid `0` value would incorrectly fallback to another percentile.
- Impact: edge-case misreporting in exported/API summaries.

### P2-1: Optimizer “adaptive sims” is currently dead logic
- `const simsP1 = combos.length > 3000 ? 1000 : 1000;` in `app/api/optimize/route.ts:182`.
- Impact: code intent/documentation mismatch; no real tuning under load.

### P2-2: Non-deterministic RNG weakens compare/optimizer signal quality
- RNG calls throughout engine (`Math.random`) in `lib/engine/index.js:676`, `:821`, `:1306`, `:1308`, `:1372`, `:1373`.
- Compare and optimizer evaluate scenarios with independent random draws, no shared seeds.
- Impact: scenario ranking noise; low reproducibility between runs.

### P2-3: Grade-scale contract mismatch with tests
- `gradeFromSuccess` in `lib/api-helpers.ts` now uses `A+, A, B+, B, C+, C, D, F`.
- Existing tests still expect `A-` (`tests/s3-api.test.ts:108`, `tests/s10-audit.test.ts` output).
- Impact: persistent CI noise and unclear canonical business rule.

### P2-4: Performance target drift for 5000 simulations
- `tests/s10-audit.test.ts` observed `5000 sims = 11576ms` and fails `<8000ms` target.
- Impact: timeout risk and degraded UX for heavy endpoints.

### P2-5: `validateBaseParams` is too narrow for modern payload surface
- Current required fields: only `age`, `retAge`, `sex`, `prov` in `lib/api-helpers.ts:69`.
- Engine uses many assumptions (`deathAge`, balances, arrays, strategy keys).
- Impact: malformed payloads are accepted too late (inside engine).

---

## Line-by-Line Coverage (Engine, Top-to-Bottom)

### L16-L56 (fiscal constants + provincial tax table)
- Status: functional but duplicated and drift-prone.
- Risk: governance and annual update errors.

### L57-L163 (`calcTax`)
- Status: structurally sound.
- Risk: depends on hardcoded constants (not centralized source of truth).

### L170-L212 (`calcCorpTax`)
- Status: coherent.
- Risk: hardcoded corporate rates; no central source linkage.

### L213-L246 (`calcQPP`, `calcOAS`, `calcGIS`)
- Status: coherent.
- Risk: constants update depends on manual sync.

### L256-L624 (`optimizeDecum`)
- Status: heavy logic, works as heuristic layer.
- Risks:
  - Uses raw `p.inf` in TFSA limit calculations (`lib/engine/index.js:360`, `:403`) instead of normalized local `inf`.
  - High complexity and many policy assumptions without schema guard.

### L625-L855 (stress presets, matrix, mortality helpers, payroll)
- Status: operational.
- Risk: unseeded randomness (reproducibility), magic numbers.

### L856-L2410 (`runMC`)
- Status: core works and returns full metrics.
- Key risks:
  - Input mutation (`:859+`)
  - `deathAge` crash path (`:889`, `:1856`)
  - Strategy fallback mismatch for `optimized` without schedule (`:1450`)
  - High cyclomatic complexity (single monolithic function)
  - No deterministic RNG mode for compare/optimizer quality

---

## Global Architecture Assessment
- Strengths:
  - Rich domain coverage (tax, decumulation, CCPC, mortality, estate, stress, guardrails).
  - Existing validation/tests for constants and build integrity.
- Weaknesses:
  - Contract fragmentation across UI/API/engine naming conventions.
  - Legacy/parallel sources (`planner_v2` style and Next layers) increase divergence risk.
  - Central constants pipeline exists but is not yet the execution source for engine.

---

## Recommended Remediation Order
1. P0 robustness hotfix:
   - Require `deathAge` (or default it) in API validation and guard `runMC` early.
2. Contract unification:
   - Introduce centralized `EngineInputSchema` + key alias normalization.
   - Normalize spouse key naming once at boundary.
3. Strategy safety:
   - If `wStrat="optimized"` and `_optSchedule` missing, fall back to `optimal` explicitly.
4. Constants single source:
   - Make engine consume versioned constants from `lib/constants/*` (read-only import path).
5. Determinism/performance:
   - Add optional seeded RNG for compare/optimize.
   - Revisit optimizer pass sizing and parallelization.
6. Test contract cleanup:
   - Align grade-scale tests and performance thresholds with current product target.

