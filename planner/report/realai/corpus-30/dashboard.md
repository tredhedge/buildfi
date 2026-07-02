# Bilan 360 ship-loop — run report

Profiles: **22**  |  prod-pass: **86.4%** (19/22)  |  full-pass (prod+lab): **86.4%** (19/22)

## Failure classes (most frequent first)

- `coverage:empty_slots` × **22** — e.g. gis_on_en, gis_qc_fr, hnw_bc_en, hnw_on_en, hugesave_qc_fr
- `data:C6_implausible_growth` × **2** — e.g. gis_on_en, gis_qc_fr
- `data:C4_withdrawal_vs_coverage` × **1** — e.g. veryold_ab_en

## Per-profile

- ❌ prod `gis_on_en` (DECUM, grade A+, 100%) — slots 27/30
- ❌ prod `gis_qc_fr` (DECUM, grade A+, 100%) — slots 27/30
- ✅ `hnw_bc_en` (ACCUM, grade C+, 63%) — slots 28/29
- ✅ `hnw_on_en` (ACCUM, grade C+, 62%) — slots 28/29
- ✅ `hugesave_qc_fr` (ACCUM, grade B, 72%) — slots 27/29
- ✅ `latedebt_on_en` (TRANSITION, grade F, 0%) — slots 30/33
- ✅ `latedebt_qc_fr` (TRANSITION, grade F, 0%) — slots 30/33
- ✅ `midcouple_ab_en` (ACCUM, grade C+, 57%) — slots 28/29
- ✅ `midcouple_qc_fr` (ACCUM, grade C+, 57%) — slots 28/29
- ✅ `preretdb_on_en` (TRANSITION, grade B+, 75%) — slots 32/33
- ✅ `preretdb_qc_fr` (TRANSITION, grade A+, 100%) — slots 32/33
- ✅ `reteqage_qc_fr` (DECUM, grade B+, 78%) — slots 28/30
- ✅ `retmodest_bc_en` (DECUM, grade A+, 100%) — slots 27/30
- ✅ `retmodest_on_en` (DECUM, grade A+, 100%) — slots 27/30
- ✅ `retmodest_qc_fr` (DECUM, grade A+, 100%) — slots 27/30
- ✅ `sells_bc_en` (TRANSITION, grade A+, 99%) — slots 31/33
- ✅ `sells_qc_fr` (TRANSITION, grade A+, 98%) — slots 32/33
- ❌ prod `veryold_ab_en` (DECUM, grade B+, 82%) — slots 27/30
- ✅ `veryold_qc_fr` (DECUM, grade C, 48%) — slots 27/30
- ✅ `young_on_en` (ACCUM, grade F, 28%) — slots 26/29
- ✅ `young_qc_fr` (ACCUM, grade D, 40%) — slots 26/29
- ✅ `zerosave_ab_en` (TRANSITION, grade F, 0%) — slots 30/33