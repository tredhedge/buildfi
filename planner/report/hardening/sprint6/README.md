# Sprint 6 Hardening (FR + EN CI Regression)

Sprint 6 adds CI-focused regression checks on top of Sprint 0 gates.

## Scope

1. Visual structure stability (sections, charts, KPI/table density).
2. Language quality checks in both directions:
3. FR files: detect EN leakage.
4. EN files: detect FR leakage.
5. Rendering quality checks (no escaped markup, no mojibake, no NaN/undefined).
6. Drift control vs baseline manifest (size and structural tolerances).

## Commands

1. Run sprint 6 checks only (assumes fresh reports already generated):

```bash
npm run report:regression:fr
```

2. Enforce EN presence + EN quality checks:

```bash
npm run report:regression:fr-en
```

3. Run full sprint 6 pipeline (regen FR + sprint0 gates + sprint6 regression):

```bash
npm run report:sprint6:fr
```

4. Full pipeline with strict EN requirement:

```bash
npm run report:sprint6:fr-en
```

## Pass Criteria

1. 10/10 FR report files evaluated.
2. EN checks execute when `_en.html` files are present, or always in strict mode (`--require-en`).
3. No structural, language, or rendering failures.
4. Drift vs baseline remains within thresholds.
