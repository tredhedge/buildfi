# Realai pipeline — filename convention

## Output filename pattern

```
{profileId}_{lang}__{lit3}_{stress3}_{det3}.html
```

### Components

| Component | Source | Values |
|---|---|---|
| `profileId` | `profiles.json` `id` field | e.g. `hnw_couple`, `low_income_gis`, `ccpc_owner` |
| `lang` | `profiles.json` `lang` field | `en` or `fr` |
| `lit3` | First 3 chars of `finLiteracy` | `beg` (beginner), `int` (intermediate), `adv` (advanced) |
| `stress3` | First 3 chars of `stressLevel` | `low`, `mod` (moderate), `hig` (high) |
| `det3` | First 3 chars of `detailPref` | `con` (concise), `bal` (balanced), `det` (detailed) |

### Examples

- `low_income_gis_en__beg_mod_con.html` — Linda Smith, EN, beginner literacy, moderate stress, concise detail
- `hnw_couple_fr__adv_low_det.html` — François Dubois, FR, advanced literacy, low stress, detailed
- `ccpc_owner_en__adv_mod_det.html` — David Chen, EN, advanced, moderate stress, detailed
- `govt_db_couple_ab_en__adv_low_det.html` — Robert Anderson, EN, advanced, low stress, detailed

### Why the `__double-underscore` separator?

Single-underscore would be ambiguous — `low_income_gis_en_beg_mod_con` could parse as
either `low_income_gis_en` + `beg_mod_con` OR `low_income_gis` + `en_beg_mod_con`.
The double underscore makes the boundary unambiguous for shell glob filtering and
sort operations.

### Files written per pipeline run

For each `{profileId}_{lang}` profile in `profiles.json`:

1. **`draft/{combo}.html`** — first-pass render (before fix-plan correction).
2. **`corrected/{combo}.html`** — second-pass render after `correction-pass.js` applied
   the auditor fix-plan.
3. **`final/{combo}.html`** — same as corrected, copied to `final/` only when
   `arbResult2.can_ship === true && !data2._dataBlocked`. This is the canonical
   client deliverable.
4. **`review/{profileId}_{lang}.{review-pack,findings,fix-plan,postfix-findings}.json`** —
   review pipeline artifacts (no combo suffix on these — keyed by profile).
5. **`review/{combo}.fail.json`** — only written when ship gate fails; lists
   remaining blockers + ai_regen queue.

### Filtering one profile at a time

```bash
node planner/report/realai/run-pipeline.mjs --only=ccpc_owner,low_income_gis_en
```

`--only` accepts a comma-separated list of `profileId` values (no language suffix).
The pipeline filters `profiles.json` to only matching IDs and re-renders just those.

### SKU density cap

As of 2026-04-27, the renderer enforces a SKU-coupled density cap inside
`deriveRenderProfile(finLiteracy, stressLevel, detailPref, sku)`:

- `sku='bilan'` + `detailPref='detailed'` → resolves to `densityMode='balanced'`
  (caps the 22-page Planner-grade density on a $29.99 product).
- `sku='planner'` + `detailPref='detailed'` → resolves to `densityMode='deep'`
  (allowed, as part of the $69.99 premium tier).

The output filename still reflects the requested `detailPref` (e.g. `__adv_low_det`)
even when capped. The classifier metadata in `<body data-bf-density-mode="...">`
reflects the EFFECTIVE density.

### Combo coverage matrix

For QA review, the 20 reference profiles span:

| `lit3` | `stress3` | `det3` | Profile count |
|---|---|---|---|
| `beg` | `mod` | `con` | 3 (low_income_gis, single_parent_qc, rrsp_only_late_starter) |
| `beg` | `hig` | `con` | 1 (debt_young) |
| `beg` | `hig` | `bal` | 1 (widow_late_decum) |
| `int` | `mod` | `bal` | 1 (immigrant_partial_qpp) |
| `int` | `hig` | `bal` | 3 (sandwich_gen, late_starter, post_divorce) |
| `int` | `low` | `bal` | 1 (conservative_retiree) |
| `int` | `low` | `det` | 0 (was govt_db_couple_ab — promoted to adv 2026-04-27) |
| `int` | `hig` | `con` | 1 |
| `adv` | `mod` | `det` | 3 (ccpc_owner, rental_heavy_couple, sandwich_gen) |
| `adv` | `low` | `det` | 5+ (hnw_couple, fire_seeker, no_heir_estate, rental_landlord, govt_db_couple_ab, high_rrsp_oas_clawback, early_retiree_single) |

The matrix is intentionally non-uniform — each profile's classifier reflects the
plausible reader for that life situation, not synthetic 27-cell coverage.

### Migration / cleanup notes

- 2026-04-26: pre-classifier output was written to `{profileId}_{lang}.html`
  (no combo suffix). Those orphan files are deleted as of commit `885888f`.
- The pipeline ONLY writes combo-suffixed files going forward.
- If you grep `final/*.html | grep -v "__"` and find any matches, they're
  stale and should be deleted.
