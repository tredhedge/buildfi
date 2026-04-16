# Report Metric Lineage Dictionary

Last updated: 2026-04-16
Scope: planner single-stream report (`planner/report/*`).

## 1. KPI Lineage

| Metric (Display) | Formula / Rule | Source Field(s) | Source Function / Module | Typical Section |
| --- | --- | --- | --- | --- |
| Success Rate | `succVal = mc.succ` when MC is available | `mc.succ` | `buildReportPayload` in `report-data.js` | cover, executive summary |
| Median Wealth (P50) | median terminal wealth from MC | `mc.rMedF` or `mc.medF` | `buildReportPayload` consumption in `report-pdf.js` | assessment/projection |
| Prudent Wealth (P25) | lower quantile terminal wealth | `mc.rP25F` or `mc.p25F` | renderer usage in `report-pdf.js` | assessment/projection |
| Gov Income Annual | `govY = (qppM + oasM + spouse benefits) * 12` | `qppM`, `oasM`, `cQppM`, `cOasM` | `buildReportPayload` | revenue |
| Spending Annual | `spendY = totalSpM * 12` | `retSpM`, `cRetSpM` | `buildReportPayload` | revenue |
| Coverage Ratio | `covRatio = govY / spendY` | `govY`, `spendY` | `buildReportPayload` | revenue |
| Gap Monthly | `gapM = max(0, totalSpM - govM)` | `totalSpM`, `govM` | `buildReportPayload` | assessment/revenue |
| Weighted MER | weighted mean by registered/non-registered balances | `merR`, `merT`, `merN`, balances | `buildReportPayload` | tax/fees |
| Fee Cost Horizon | iterative fee drag approximation over horizon | `totalBal`, `merWt`, horizon | `buildReportPayload` loop | tax/fees |
| Tax Lifetime (optimized) | sum of yearly tax rows | `revData[].tax` | `buildReportPayload` (`_optTax`) | tax |
| Tax Alpha | `_taxAlpha = _naiveTax - _optTax` when naive path exists | `mc._naiveMC.medRevData` + `revData` | `buildReportPayload` | tax |
| Avg Effective Tax Rate | `_optTax / sum(revData.taxInc)` | `revData[].tax`, `revData[].taxInc` | `buildReportPayload` | tax |
| OAS Clawback Years | count of years where `taxInc > indexed threshold` | `revData[].taxInc`, `OAS_CLAWBACK_THR` | `buildReportPayload` | tax |
| Withdrawal % at Retirement | `_wdPct = retRow.ret / _retBal` | `revData` and/or `mc.pD` | `buildReportPayload` | executive summary |
| Net Estate (median) | MC-derived net estate statistic | `mc.medEstateNet` | MC payload upstream + renderer | succession |
| Estate Tax (median) | MC-derived estate tax statistic | `mc.medEstateTax` | MC payload upstream + renderer | succession |

## 2. Calculator Lineage

| Calculator | Purpose | Key Inputs | Output |
| --- | --- | --- | --- |
| `calcTax` | federal + provincial tax, retirement credits, dividend credits, ON surtax | taxable income, province, year index, inflation, retired flag, dividend info | tax breakdown + effective/marginal rates |
| `calcQPP` | QPP/CPP pension estimate with age adjustment and RRQ2 component | start age, average earnings, years contributed | monthly pension amount |
| `calcOAS` | OAS amount with deferral and clawback | start age, income, year index, inflation, current age | monthly OAS amount |
| `calcPayroll` | employee payroll deduction model | salary, province, year index, inflation | annual payroll deductions |

## 3. AI Slot Lineage

AI slot content should only use values already present in payload lineage above.

| AI Slot | Numeric source expectation |
| --- | --- |
| `overall_assessment` | success rate + median wealth |
| `verdict` | P25/P50 trajectory |
| `trajectory_insight` | projected wealth path values |
| `income_insight` | gov income, spending, gap |
| `taxInsight` | tax totals/rates/clawback context |
| `estateInsight` | net estate + estate tax |
| optional specialty slots | specialty profile values only (debt, real estate, RSU, corporate) |

## 4. Quality Controls Linked to Lineage

1. `sprint0` blocks malformed output and obvious numeric/rendering defects.
2. `sprint6` blocks visual and language regressions in FR and EN.
3. strict EN mode ensures bilingual artifact completeness.

## 5. Change Rule

Any new displayed metric must be added to this dictionary with:

1. formula,
2. source field path,
3. source function/module,
4. report section where shown.
