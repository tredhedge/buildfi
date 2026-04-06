# Fiscal Constants — Annual Update Checklist

**When**: Every November, after CRA publishes indexed amounts for the next tax year.
**Who**: Developer with access to CRA, Service Canada, Retraite Quebec, and provincial tax act publications.
**Time estimate**: 2-3 hours (research) + 1 hour (code + tests).

---

## Automated Monitoring (added 2026-03-03)

An automated constants-check system supplements this manual process:

- **Registry**: `lib/constants-registry.ts` — master registry of 200+ fiscal constants with CRA/SCA source URLs
- **Cron scraper**: `app/api/cron/constants-check/route.ts` — fetches CRA pages, parses values, compares to registry, emails diff
- **Schedule**: Jan 10 + Feb 10 at 14:00 UTC (`0 14 10 1,2 *` in `vercel.json`)
- **Manual trigger**: `GET /api/cron/constants-check?secret=<CRON_SECRET>`
- **Email**: Sends diff to `CONSTANTS_NOTIFY_EMAIL` env var (defaults to tredhedge@gmail.com)
- **Scrapes**: Federal brackets, CPP/QPP, OAS, GIS, TFSA, RRSP, EI

**Workflow**: When the cron detects drift, you receive an email with the diffs. Then follow the manual checklist below to update engine/index.js + planner.html + quiz-translators + constants-registry.ts.

---

## Pre-flight

- [ ] Confirm CRA has published the T1 General for the new tax year
- [ ] Confirm provincial budgets / indexation notices are final
- [ ] Confirm Service Canada has published OAS/GIS/CPP amounts for Jan 1

---

## Step-by-step

### 1. Create new constants file

Copy `lib/constants/fiscal-YYYY.ts` from the previous year:

```bash
cp lib/constants/fiscal-2026.ts lib/constants/fiscal-YYYY.ts
```

Update the file header, metadata year, and `verifiedDate`.

### 2. Update federal brackets and rates

Source: [CRA T1 General](https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package.html)

- `FED_BRACKETS` — indexed bracket thresholds
- `FED_RATES` — verify rates (rarely change, but check budget)
- `FED_PERSONAL` — basic personal amount (indexed)

### 3. Update provincial brackets

Source: Each province's finance ministry / tax act indexation bulletin.

For each of the 13 provinces/territories in `provincial`:
- `b` — bracket thresholds
- `r` — marginal rates
- `pd` — basic personal deduction
- `eligDivCr` / `nonEligDivCr` — dividend tax credit rates
- `ageAmt` / `ageThresh` — age credit amount and income threshold
- `penAmt` — pension income amount

Cross-reference: RCGT or EY annual tax tables (usually published in December).

### 4. Update OAS / GIS amounts

Source: [Service Canada — Old Age Security](https://www.canada.ca/en/services/benefits/publicpensions/cpp/old-age-security.html)

- `OAS_CLAWBACK_THR` — OAS recovery threshold (indexed)
- `OAS_MAX_MONTHLY` — maximum OAS monthly payment
- `GIS_MAX_SINGLE` — GIS max for single (Q1 of new year)
- `GIS_MAX_COUPLE` — GIS max for couple (Q1 of new year)

Note: GIS is indexed quarterly. Use the January value for the new year.

### 5. Update QPP / CPP amounts

Source: [Retraite Quebec](https://www.retraitequebec.gouv.qc.ca/) and [Service Canada — CPP](https://www.canada.ca/en/services/benefits/publicpensions/cpp.html)

- `QPP_MAX_MONTHLY` — max monthly at 65 (including enhancement)
- `QPP_MGA` — YMPE (maximum pensionable earnings)
- `QPP_YAMPE` — second ceiling (Year's Additional Maximum Pensionable Earnings)
- `QPP2_MAX_MONTHLY` — CPP2 enhancement max monthly estimate

### 6. Update TFSA limit

Source: [CRA — TFSA](https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account.html)

- `TFSA_LIMIT` — annual contribution limit
- `PENSION_CREDIT_MAX` — pension income credit max (usually $2,000, verify)

### 7. Run debt tool tests

```bash
node tests/debt-tool-tests.js
```

Expected: **200/200 pass**. These tests do not depend on fiscal constants but confirm no collateral breakage.

### 8. Run engine tests

Open `planner.html` in a browser and run the built-in test suite.

Expected: **453/453 pass** (or current count). If any fail, the constants change likely introduced a mismatch with planner.html.

### 9. Run baseline profile comparison

Pick 5 representative profiles (stored in `tests/baseline-profiles/` if available, or manually):

1. QC single, $60K income, age 35, RRSP $50K
2. ON couple, $120K combined, age 55, mortgage $200K
3. BC single, $200K income, age 62, pre-retirement
4. AB single, $40K income, age 28, TFSA focus
5. QC couple, $90K combined, age 67, retired

Run each through `runMC()` with the old and new constants. Verify:
- Success rate within +/- 2 percentage points
- Total tax within +/- $500

If deltas exceed thresholds, investigate whether the source values are correct.

### 10. Update lib/constants/index.ts

In `lib/constants/index.ts`:

1. Add the import: `import { FISCAL_YYYY } from "./fiscal-YYYY";`
2. Add to `CONSTANTS_BY_YEAR`: `YYYY: FISCAL_YYYY,`
3. Update `LATEST_YEAR` to `YYYY`

### 11. Update planner.html constants section

planner.html is the source of truth. Update the corresponding constants block so that values match exactly.

### 12. Update lib/engine/index.js constants section

Update lines 16-56 in `lib/engine/index.js` to match the new values. These must be identical to both `planner.html` and the new `fiscal-YYYY.ts`.

### 13. Document changes

- Update `metadata.verifiedDate` in the new `fiscal-YYYY.ts`
- Update `metadata.sources` if any source URLs changed
- Add a changelog entry (PR description or STATUS.md) listing what changed and by how much

---

## Verification via build

After all updates, run the full build to confirm TypeScript compilation:

```bash
npm run build
```

The constants file is type-checked at build time. Any structural mismatch (missing field, wrong type) will fail the build.

---

## Rollback

If the new constants cause test failures that cannot be resolved:

1. Revert `LATEST_YEAR` in `lib/constants/index.ts` to the previous year
2. Revert `lib/engine/index.js` lines 16-56 to previous values
3. Revert `planner.html` constants to previous values
4. Keep the new `fiscal-YYYY.ts` file as a draft (do not delete)
5. Investigate and retry

---

## Notes

- The engine (`lib/engine/index.js`) still uses its own hardcoded constants inline. The `lib/constants/fiscal-YYYY.ts` file is a reference copy for the update pipeline. Both must stay in sync.
- Never update engine constants without updating planner.html (and vice versa). Rule: "planner.html is source of truth -- if bug found, fix BOTH."
- GIS amounts change quarterly. The January value is canonical for the fiscal year file, but the engine indexes by CPI so minor quarterly drift is acceptable.
