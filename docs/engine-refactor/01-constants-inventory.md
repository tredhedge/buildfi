# Phase 1 — Constants Inventory

**Date**: 2026-04-14
**Source**: `planner_v2.html` v11.12.9, engine block lines 1489-6283
**Total**: ~620 hardcoded business constants

---

## Summary by Domain

| Domain | Count | Lines | Annual Update? |
|--------|-------|-------|----------------|
| Fiscal — Federal | 18 | 1490-1588 | Yes |
| Fiscal — Provincial (13 prov.) | 156 | 1528-1540 | Yes |
| Fiscal — Ontario Surtax | 4 | 1632-1633 | Yes |
| Fiscal — Dividends (gross-up/credits) | 6 | 1552-1588 | Yes |
| Fiscal — Capital Gains | 6 | 3228, 4500, 5531 | When legislation changes |
| Fiscal — RRIF Minimums | 25 | 1746 (dup at 5865) | Rarely |
| Fiscal — TFSA/FHSA | 12 | 1503, 3799-3809, 5113-5144 | Yes (TFSA limit) |
| Fiscal — FTQ/Donations | 4 | 5606-5613 | Rarely |
| Fiscal — NR Tax Drag | 2 | 4483-4500, 5125 | No |
| Fiscal — LIRA/FRV | 3 | 5210-5215 | Rarely |
| Gov-Programs — OAS | 6 | 1494-1495, 1714-1720 | Yes |
| Gov-Programs — QPP/CPP | 10 | 1498-1501, 1701-1705 | Yes |
| Gov-Programs — GIS | 6 | 1496-1497, 1729-1742 | Yes (quarterly) |
| Gov-Programs — GST Credit | 4 | 5025-5029 | Yes |
| Gov-Programs — RESP/CESG | 3 | 5168-5170 | Rarely |
| Gov-Programs — QPP Survivor | 2 | 5043 | Rarely |
| Corporate — CCPC Rates (13 prov.) | 39 | 1664-1676 | Yes |
| Corporate — SBD/RDTOH | 5 | 1657-1686 | When legislation changes |
| Corporate — LCGE | 1 | 5526 | When legislation changes |
| Corporate — DC/CCPC Behavior | 6 | 5453-5509 | No |
| Payroll — QPP/CPP Contributions | 4 | 4521-4528 | Yes |
| Payroll — EI | 3 | 4530-4531 | Yes |
| Payroll — RQAP | 2 | 4536-4537 | Yes |
| Markets — 2-Asset Defaults | 4 | 4549-4553 | No |
| Markets — 8-Asset Returns/Vol | 16 | 4578-4585 | No |
| Markets — Correlation 5×5 | 50 | 4278-4295 | No |
| Markets — Correlation 8×8 | 128 | 4297-4318 | No |
| Markets — Other (PE, PM, FX, RE) | 12 | 4742-4782 | No |
| Markets — Dividend Yields/WHT | 8 | 4485-4514 | Rarely |
| Mortality — CPM Male | 71 | 4345-4401 | ~10 years |
| Mortality — CPM Female | 71 | 4402-4458 | ~10 years |
| Mortality — Improvement/Cap | 3 | 4462-4465 | ~10 years |
| Stress — 9 Scenarios | ~90 | 4249-4276 | No |
| Behavior — Spending Smile | 6 | 3875-3878, 4783 | No |
| Behavior — CFG_SMOOTH | 8 | 1506-1513 | No |
| Behavior — Guyton-Klinger | 5 | 5075-5083 | No |
| Behavior — Health Costs | 3 | 3874, 3878, 4785 | No |
| Behavior — Spending Composition | 3 | 4788 | No |
| Defaults — Allocation | 8 | 3816, 4479, 4555-4557 | No |
| Defaults — Inflation | 2 | 3814, 4549 | No |
| Defaults — Fees (MER) | 4 | 1826, 4545-4548 | No |
| Defaults — Real Estate | 8 | 4657-4664, 4851-4902 | No |
| Defaults — Insurance | 13 | 6521-6556 | No |
| Defaults — MC Clamps | 12 | 4545-4598 | No |
| Defaults — Sensitivity Ranges | 14 | 6141-6150 | No |
| Estate — Probate (10 prov.) | 14 | 5737-5747 | Rarely |
| Estate — Property Sale | 2 | 5366-5382 | No |
| Test Reference Values | ~40 | 1760-1818, 2688-2840 | Match engine |

---

## 1. Fiscal — Federal Tax

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1490 | TAX_BASE_YEAR | 2026 | Reference year for indexing |
| 1491 | FED_BRACKETS | [58523, 117045, 181440, 258482] | 4 bracket thresholds |
| 1492 | FED_RATES | [0.14, 0.205, 0.26, 0.29, 0.33] | 5 marginal rates (14% base = Bill C-69) |
| 1493 | FED_PERSONAL | 16452 | Basic personal amount |
| 1502 | PENSION_CREDIT_MAX | 2000 | Max eligible pension income for 15% credit |
| 1566 | _ageAmt | 8790 | Federal age credit amount |
| 1567 | _ageThresh | 44325 | Federal age credit income threshold |
| 1569 | (age clawback rate) | 0.15 | 15% clawback on age credit |
| 1581 | (personal credit rate) | 0.15 | 15% rate on personal/pension/age amounts |

## 2. Fiscal — Dividend Integration

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1552 | (eligible gross-up) | 1.38 | 38% gross-up |
| 1553 | (non-eligible gross-up) | 1.15 | 15% gross-up |
| 1587 | fedEligCr rate | 0.150198 | Federal eligible DTC |
| 1588 | fedNonEligCr rate | 0.090301 | Federal non-eligible DTC |

## 3. Fiscal — Provincial Tax (13 Provinces)

Each province has: brackets (b), rates (r), personal deduction (pd), abatement, eligDivCr, nonEligDivCr, ageAmt, ageThresh, penAmt.

| Line | Prov | Brackets | Rates | PD | Abate | EligDivCr | NonEligDivCr | AgeAmt | AgeThresh | PenAmt |
|------|------|----------|-------|----|-------|-----------|-------------|--------|-----------|--------|
| 1528 | QC | 54345, 108730, 132245 | 0.14, 0.19, 0.24, 0.2575 | 18952 | 0.835 | 0.1118 | 0.039362 | 3903 | 0 | 2918 |
| 1529 | ON | 53891, 107785, 150000, 220000 | 0.0505, 0.0915, 0.1116, 0.1216, 0.1316 | 12091 | 1 | 0.10 | 0.029863 | 5286 | 42335 | 1580 |
| 1530 | BC | 49159, 98320, 112883, 137073, 185854, 259197 | 0.0506, 0.077, 0.105, 0.1229, 0.147, 0.168, 0.205 | 12901 | 1 | 0.12 | 0.0196 | 5766 | 42660 | 1000 |
| 1531 | AB | 154259, 185203, 246938, 370220 | 0.1, 0.12, 0.13, 0.14, 0.15 | 22769 | 1 | 0.0812 | 0.0218 | 5553 | 43906 | 1491 |
| 1532 | SK | 54532, 155805 | 0.105, 0.125, 0.145 | 20381 | 1 | 0.11 | 0.02105 | 5518 | 0 | 1000 |
| 1533 | MB | 47000, 100000 | 0.108, 0.1275, 0.174 | 15780 | 1 | 0.08 | 0.007835 | 3728 | 0 | 1000 |
| 1534 | NB | 51306, 102614, 190081 | 0.094, 0.14, 0.16, 0.195 | 13396 | 1 | 0.14 | 0.027518 | 5849 | 42553 | 1000 |
| 1535 | NS | 30182, 60364, 94860, 153000 | 0.0879, 0.1495, 0.1667, 0.175, 0.21 | 8651 | 1 | 0.0885 | 0.015 | 4897 | 0 | 1000 |
| 1536 | PE | 33538, 67079 | 0.098, 0.138, 0.167 | 13865 | 1 | 0.105 | 0.013 | 4862 | 0 | 1000 |
| 1537 | NL | 44062, 88123, 157329, 220262, 281387, 562714 | 0.087, 0.145, 0.158, 0.178, 0.198, 0.208, 0.213 | 11034 | 1 | 0.063 | 0.032 | 7742 | 39880 | 1000 |
| 1538 | NT | 51963, 103931, 169067 | 0.059, 0.086, 0.122, 0.1405 | 17041 | 1 | 0.115 | 0.06 | 8200 | 0 | 1000 |
| 1539 | YT | 58523, 117045, 181440, 258482, 500000 | 0.064, 0.09, 0.109, 0.128, 0.15, 0.16 | 16452 | 1 | 0.1202 | 0.0067 | 8790 | 44325 | 2000 |
| 1540 | NU | 54333, 108668, 177231 | 0.04, 0.07, 0.09, 0.115 | 18284 | 1 | 0.0551 | 0.025904 | 14865 | 0 | 2000 |

## 4. Fiscal — Ontario Surtax

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1632 | ON surtax threshold 1 | 4991 | 20% on prov tax above this (indexed) |
| 1632 | ON surtax rate 1 | 0.20 | |
| 1633 | ON surtax threshold 2 | 6387 | Additional 36% above this (indexed) |
| 1633 | ON surtax rate 2 | 0.36 | |

## 5. Fiscal — Capital Gains Inclusion

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4500 | CG threshold | 250000 | Above this: 66.67% inclusion |
| 4500/5531 | cgIncLo | 0.5 | 50% inclusion below threshold |
| 4500/5531 | cgIncHi | 0.6667 | 66.67% above threshold |

## 6. Fiscal — RRIF Minimum Rates

| Age | Rate | Age | Rate | Age | Rate |
|-----|------|-----|------|-----|------|
| 71 | 0.0528 | 80 | 0.0682 | 89 | 0.1099 |
| 72 | 0.054 | 81 | 0.0708 | 90 | 0.1192 |
| 73 | 0.0553 | 82 | 0.0738 | 91 | 0.1306 |
| 74 | 0.0567 | 83 | 0.0771 | 92 | 0.1449 |
| 75 | 0.0582 | 84 | 0.0808 | 93 | 0.1634 |
| 76 | 0.0598 | 85 | 0.0851 | 94 | 0.1879 |
| 77 | 0.0617 | 86 | 0.0899 | 95+ | 0.20 |
| 78 | 0.0636 | 87 | 0.0955 | | |
| 79 | 0.0658 | 88 | 0.1021 | | |

**Note**: RRIF table appears TWICE (L1746 and L5865). Must keep synchronized.

## 7. Fiscal — TFSA Historical Limits

| Year(s) | Limit | Line |
|----------|-------|------|
| 2009-2012 | $5,000 | 3800 |
| 2013-2014 | $5,500 | 3800 |
| 2015 | $10,000 | 3801 |
| 2016-2018 | $5,500 | 3801 |
| 2019-2022 | $6,000 | 3802 |
| 2023 | $6,500 | 3802 |
| 2024+ | $7,000 | 3803 |

## 8. Fiscal — FHSA

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 3809 | fhsaMax | 40000 | Lifetime cap |
| 3941/5138 | (annual limit) | 8000 | Annual contribution limit |
| 3950/5144 | (max years) | 15 | Max years before RRSP rollover |
| 3950/5144 | (mandatory close age) | 71 | Must roll to RRSP by age 71 |

## 9. Fiscal — FTQ/CSN & Donations

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 5606 | FTQ max contribution | 5000 | Max eligible for 30% credit |
| 5606 | FTQ credit rate | 0.30 | 30% tax credit |
| 5613 | Donation credit (≤$200) | 0.15 | Federal 15% |
| 5613 | Donation credit (>$200) | 0.29 | Federal 29% |

## 10. Fiscal — NR Tax / WHT

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4483 | ETF turnover | 0.10 | Passive ETF annual turnover |
| 4485 | CAN div yield | 0.030 | Canadian equity |
| 4486 | US div yield | 0.015 | US equity |
| 4487 | INTL/EM div yield | 0.020 | International/EM |
| 4493 | Eligible div discount | 0.70 | Effective tax = margRate × 0.70 |
| 4494 | WHT rate (foreign NR) | 0.15 | 15% WHT |
| 4507 | RRSP US WHT | 0 | Treaty exemption |
| 5125 | nrTaxDrag default | 0.009 | Default NR drag 0.9% |

## 11. Fiscal — LIRA/FRV

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 5210 | FRV max age divisor (QC) | 90 | balance / (90 - age) |
| 5210 | FRV unlock min age | 55 | Available from age 55 |
| 5215 | LIRA dust threshold | 100 | Fully liquidate below $100 |

## 12. Gov-Programs — OAS

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1494 | OAS_CLAWBACK_THR | 95323 | 2026 recovery threshold |
| 1495 | OAS_MAX_MONTHLY | 742.31 | 2026 max at 65 |
| 1714 | OAS deferral bonus | 0.006/mo | 7.2%/yr enhancement after 65 |
| 1715 | OAS max adj | 1.36 | Cap at 70 = +36% |
| 1718 | OAS 75+ bonus | 1.10 | +10% at age 75+ |
| 1720 | OAS clawback rate | 0.15 | 15% recovery tax |

## 13. Gov-Programs — QPP/CPP

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1498 | QPP_MAX_MONTHLY | 1507.65 | 2026 max at 65 (incl. enhancement) |
| 1499 | QPP_MGA | 74600 | 2026 YMPE |
| 1500 | QPP_YAMPE | 85000 | 2026 second ceiling |
| 1501 | QPP2_MAX_MONTHLY | 81.00 | CPP2 enhancement estimate |
| 1701 | QPP max contrib years | 40 | Full benefit denominator |
| 1703 | QPP early reduction | 0.006/mo | 7.2%/yr before 65 |
| 1704 | QPP late bonus | 0.007/mo | 8.4%/yr after 65 |
| 1705 | QPP adj floor | 0.64 | Min factor (age 60) |
| 1705 | QPP adj cap | 1.42 | Max factor (age 70) |
| 5043 | QPP survivor cap | 784/mo | Survivor pension max monthly |
| 5043 | QPP survivor fraction | 0.60 | 60% of deceased's QPP |

## 14. Gov-Programs — GIS

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1496 | GIS_MAX_SINGLE | 1105.43 | 2026 Q1 max single |
| 1497 | GIS_MAX_COUPLE | 665.41 | 2026 Q1 max couple |
| 1729 | GIS employment full exempt | 5000 | First $5K fully exempt |
| 1731 | GIS employment partial ceiling | 15000 | 50% exempt zone ceiling |
| 1736 | GIS partial exemption rate | 0.50 | 50% on $5K-$15K |
| 1742 | GIS reduction rate | 0.50 | 50% clawback on adjusted income |
| 3900 | GIS income threshold | 22000 | GIS-aware withdrawal threshold |

## 15. Gov-Programs — GST/HST Credit

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 5025 | GST credit base (single) | 519 | 2025 GST/HST credit |
| 5026 | GST credit supplement (spouse) | 171 | Additional when coupled |
| 5028 | GST phaseout threshold | 44324 | 5% clawback starts |
| 5029 | GST phaseout rate | 0.05 | 5% clawback rate |

## 16. Gov-Programs — RESP/CESG

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 5168 | CESG max eligible annual | 2500 | Max annual contribution for match |
| 5168 | CESG match rate | 0.20 | 20% grant |
| 5170 | RESP growth assumption | 0.05 | 5% annual growth |

## 17. Corporate — CCPC Rates (13 Provinces)

| Line | Prov | Small | General | Passive |
|------|------|-------|---------|---------|
| 1664 | QC | 0.122 | 0.265 | 0.5017 |
| 1665 | ON | 0.122 | 0.265 | 0.5017 |
| 1666 | BC | 0.11 | 0.27 | 0.5067 |
| 1667 | AB | 0.11 | 0.23 | 0.4667 |
| 1668 | SK | 0.11 | 0.27 | 0.5067 |
| 1669 | MB | 0.11 | 0.27 | 0.5067 |
| 1670 | NB | 0.115 | 0.29 | 0.5267 |
| 1671 | NS | 0.115 | 0.29 | 0.5267 |
| 1672 | PE | 0.10 | 0.31 | 0.5467 |
| 1673 | NL | 0.12 | 0.30 | 0.5367 |
| 1674 | NT | 0.11 | 0.265 | 0.5017 |
| 1675 | YT | 0.11 | 0.27 | 0.5067 |
| 1676 | NU | 0.12 | 0.27 | 0.5067 |

## 18. Corporate — SBD / RDTOH / LCGE

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1658 | SBD business limit | 500000 | Indexed |
| 1660 | Passive grind threshold | 50000 | SBD grind starts |
| 1661 | Passive grind factor | 5 | $5 per $1 excess |
| 1686 | RDTOH rate | 0.3067 | 30.67% of passive income |
| 5509 | RDTOH refund rate | 0.3833 | 38.33% of dividends paid |
| 5526 | LCGE | 1250000 | $1.25M lifetime exemption |

## 19. Payroll Deductions

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4521 | QPP basic exemption | 3500 | Indexed |
| 4523 | QPP rate (QC) | 0.064 | 6.4% employee |
| 4523 | CPP rate (ROC) | 0.0595 | 5.95% employee |
| 4528 | QPP2/CPP2 rate | 0.04 | On YMPE-YAMPE band |
| 4530 | EI MIE | 65700 | Max insurable earnings |
| 4531 | EI rate (QC) | 0.0127 | 1.27% |
| 4531 | EI rate (ROC) | 0.0158 | 1.58% |
| 4536 | RQAP max | 94000 | Max insurable |
| 4537 | RQAP rate | 0.00494 | 0.494% |

## 20. Markets — Default Returns/Volatility

### 2-Asset (Simple Mode)

| Line | Name | Value |
|------|------|-------|
| 4549-4550 | eqRet / eqVol | 0.07 / 0.16 |
| 4552-4553 | bndRet / bndVol | 0.035 / 0.06 |

### 8-Asset (Multi-Asset Mode)

| Line | Asset | Return | Volatility |
|------|-------|--------|------------|
| 4578-4579 | CAN Equity | 0.070 | 0.16 |
| 4580-4581 | US Equity | 0.080 | 0.17 |
| 4582-4583 | INTL Equity | 0.070 | 0.18 |
| 4584-4585 | EM Equity | 0.085 | 0.23 |
| 4780 | Private Equity | 0.12 | 0.25 |
| 4781 | Precious Metals | 0.03 | 0.15 |
| 4782 | DC Plan | 0.05 | 0.08 |

### Other Market Parameters

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4708 | Crisis threshold | -0.15 | Equity shock < -15% triggers crisis regime |
| 4712 | Fat-tail df | 5 | Student-t degrees of freedom |
| 4719 | INTL stress beta | 0.9 | INTL gets 90% of stress shock |
| 4720 | EM stress beta | 0.8 | EM gets 80% |
| 4736 | Stochastic inflation vol | 0.015 | 1.5% |
| 4737 | Inflation floor / cap | 0.005 / 0.08 | 0.5% to 8% |
| 4742-4743 | RE vol / rho | 0.10 / 0.35 | RE volatility and equity-RE correlation |
| 4747 | Crisis RE correlation | 0.6 | Elevated in crisis |
| 4779 | FX volatility | 0.08 | Currency risk |

## 21. Correlation Matrices

### CRM (5×5 Normal Regime) — Line 4278

|  | Eq | Bond | Inf | PE | PM |
|--|-----|------|-----|-----|-----|
| Eq | 1 | 0.2 | -0.2 | 0.65 | 0.05 |
| Bond | 0.2 | 1 | -0.4 | 0.1 | 0.15 |
| Inf | -0.2 | -0.4 | 1 | -0.1 | 0.25 |
| PE | 0.65 | 0.1 | -0.1 | 1 | 0.1 |
| PM | 0.05 | 0.15 | 0.25 | 0.1 | 1 |

### CRM_CRISIS (5×5 Crisis) — Line 4293

|  | Eq | Bond | Inf | PE | PM |
|--|-----|------|-----|-----|-----|
| Eq | 1 | -0.3 | 0.1 | 0.85 | 0.15 |
| Bond | -0.3 | 1 | -0.1 | -0.2 | 0.1 |
| Inf | 0.1 | -0.1 | 1 | 0.05 | 0.3 |
| PE | 0.85 | -0.2 | 0.05 | 1 | 0.2 |
| PM | 0.15 | 0.1 | 0.3 | 0.2 | 1 |

CRM8 (8×8) and CRM8_CRISIS (8×8) at lines 4297-4318 — 128 values total. Too large for inline display; see CSV.

## 22. Mortality — CPM-2023

71 male + 71 female mortality rates (ages 30-100). See CSV for full table.

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4462 | Base year | 2023 | CPM projection base |
| 4463 | Max age | 105 | Hard cap on stochastic death age |
| 4465 | Improvement factor | 0.99 | 1%/yr mortality improvement |
| 4464 | Fallback qx | 0.001 | Default if age not in table |

## 23. Stress Scenarios

9 scenarios with equity, bond, and inflation paths:

| Line | Scenario | Duration | Eq Range | Notes |
|------|----------|----------|----------|-------|
| 4249 | crash08 | 4 yrs | -37% to +15% | GFC: flight to quality |
| 4252 | dotcom | 5 yrs | -23% to +26% | 2000-2004 |
| 4255 | inflation70 | 10 yrs | -26% to +12% | Stagflation, CPI to 13.5% |
| 4258 | stagflation | 5 yrs | -14% to +2% | Modern stagflation |
| 4261 | japan | 10 yrs | -3% to +2% | Lost decade, deflation |
| 4264 | covid | 4 yrs | -34% to +27% | V-shaped recovery |
| 4267 | longevity | +5 yrs | — | Adds 5 years to death age |
| 4270 | ratehike | 5 yrs | -12% to +6% | Rising rate environment |
| 4273 | prolonged | 8 yrs | -15% to +8% | Extended recession |

## 24. Behavior — Spending Smile (Blanchett)

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 3875 | goP | 1.0 | Go-Go phase multiplier |
| 3876 | slP | 0.85 | Slow-Go phase multiplier |
| 3877 | noP | 0.75 | No-Go phase multiplier |
| 3872 | smileSlAge | max(retAge+10, 75) | Slow-Go start age |
| 3873 | smileNoAge | max(slAge+10, 85) | No-Go start age |
| 4783 | slP (MC) | 0.82 | MC uses slightly different value |
| 4783 | noP (MC) | 0.92 | MC uses different value — **DIVERGENCE** |

**Flag**: MC at L4783 uses slP=0.82, noP=0.92 vs optimizer at L3876-3877 which uses slP=0.85, noP=0.75. Intentional or bug?

## 25. Behavior — CFG_SMOOTH (Withdrawal Smoothing)

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 1506 | MELT | 0.40 | Max year-to-year meltdown change |
| 1507 | MELT_FLOOR | 5000 | Min absolute change ($) |
| 1508 | SPEND | 0.30 | Max year-to-year spending change |
| 1509 | SPEND_FLOOR | 10000 | Min absolute change ($) |
| 1510 | BACK | 0.40 | Backward pass cap |
| 1511 | BACK_FLOOR | 15000 | Backward pass min ($) |
| 1512 | NR_OVER | 1.5 | Max NR withdrawal multiple |
| 1513 | MC_BLEND | 0.70 | MC memory weight |

## 26. Behavior — Guyton-Klinger Guardrails

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 5076 | gkCeil | 0.055 | Ceiling withdrawal rate |
| 5081 | gkFloor | 0.03 | Floor withdrawal rate |
| 5078 | gkCut | 0.10 | Per-trigger spending cut |
| 5083 | gkRaise | 0.10 | Per-trigger spending raise |
| 5075 | gkMaxCut | 0.25 | Max cumulative cut |

## 27. Behavior — Health Costs & Spending Composition

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 3874 | healthAge | 85 | Health costs escalate from this age |
| 3878 | healthMul | 0.02 | 2%/yr escalation |
| 4785 | healthCost max | 2.0 | Cap at 200% |
| 4788 | spending base | 0.70 | 70% uses general inflation |
| 4788 | spending housing | 0.15 | 15% uses housing inflation |
| 4788 | spending health | 0.15 | 15% uses health inflation |

## 28. Defaults — Allocation & Fees

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4555 | allocR default | 0.60 | RRSP equity allocation |
| 4556 | allocT default | 0.80 | TFSA equity allocation |
| 4557 | allocN default | 0.50 | NR equity allocation |
| 4479 | Multi-asset default | CAN 25%, US 35%, INTL 20%, EM 5%, BND 15% | |
| 4545-4548 | MER clamp | 0 to 0.05 | For all accounts |
| 4607 | glideSpd | 0.02 | 2%/yr equity reduction |
| 4750 | glide floor | 0.25 | Min equity factor |

## 29. Defaults — Real Estate

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 4657 | Mortgage rate default | 0.05 | 5% |
| 4658 | Property appreciation | 0.035 | 3.5% |
| 4661 | HELOC rate default | 0.065 | 6.5% |
| 4662 | helocMax LTV | 0.65 | 65% |
| 4664 | CCA rate | 0.04 | 4% depreciation |
| 4664 | landPct | 0.30 | 30% non-depreciable |
| 4851 | RE annual decline floor | -0.20 | Max 20% drop |
| 4884 | Refinance max LTV | 0.80 | 80% |
| 4889 | Refinance amort | 25 yrs | 25×12 months |
| 4901 | Rental inflation | 0.02 | 2%/yr |
| 4902 | RE operating cost inflation | 0.03 | 3%/yr |

## 30. Defaults — Insurance

| Line | Name | Value | Notes |
|------|------|-------|-------|
| 6521 | Survivor income factor | 0.70 | 70% of couple spending |
| 6522 | Per-child coverage | 250000 | $250K per child |
| 6535 | Final expenses | 15000 | Funeral/estate costs |

### Term Life Premium Rates (per $1,000 coverage)

| Age | Female | Male |
|-----|--------|------|
| <35 | 0.50 | 0.65 |
| 35-44 | 0.70 | 0.90 |
| 45-54 | 1.20 | 1.60 |
| 55-64 | 2.50 | 3.50 |
| 65+ | 5.00 | 7.00 |

## 31. Estate — Probate by Province

| Line | Prov | Rule | Notes |
|------|------|------|-------|
| 5739 | ON | 1.5% above $50K | |
| 5740 | BC | 1.4% above $50K | |
| 5741 | NS/NB/PE | 1.5% flat | |
| 5742 | NL | 0.6% flat | |
| 5743 | SK | 0.7% capped $7K | |
| 5744 | MB | 0.7% capped $7K | |
| 5745 | AB | $525 flat | |
| 5746 | QC | $1,200 flat | Notarized will |
| 5747 | default | 0.4% flat | NT/YT/NU |

## 32. MC Sanitization Clamps

| Line | Parameter | Default | Min | Max |
|------|-----------|---------|-----|-----|
| 4545-4547 | MER (all) | — | 0 | 0.05 |
| 4548 | nrTaxDrag | 0.009 | 0 | 0.03 |
| 4549 | inf | 0.021 | 0 | 0.10 |
| 4550 | eqRet | 0.07 | -0.05 | 0.20 |
| 4551 | eqVol | 0.16 | 0.01 | 0.50 |
| 4552 | bndRet | 0.035 | -0.02 | 0.12 |
| 4553 | bndVol | 0.06 | 0.01 | 0.25 |
| 4594 | goP | 1.0 | 0 | 1.5 |
| 4595 | slP | 0.85 | 0 | 1.5 |
| 4596 | noP | 0.75 | 0 | 1.5 |
| 4598 | healthMul | 0.02 | 0 | 0.10 |

## 33. Sensitivity Analysis Ranges

| Line | Parameter | Range | Notes |
|------|-----------|-------|-------|
| 6141 | Spending | ±20% | ×0.8 and ×1.2 |
| 6142-6143 | Allocation (RRSP/TFSA) | ±0.20 | ±20 percentage points |
| 6144 | Inflation | ±0.01 | ±1 pp |
| 6145 | Retirement age | ±3 yrs | Floor 55 |
| 6146 | Equity return | ±0.03 | ±3 pp |
| 6147 | Equity volatility | ±0.05 | ±5 pp |
| 6148 | QPP start age | ±3 yrs | Floor 60, cap 72 |
| 6149 | OAS start age | ±2 yrs | Floor 65, cap 72 |
| 6150 | DB pension | ±20% | ×0.8 and ×1.2 |

---

## Risks & Flags

### P0 — Critical
1. **RRIF table duplicated** at L1746 and L5865. Both must be kept in sync until centralized.
2. **Spending smile divergence**: MC (L4783) uses slP=0.82, noP=0.92 vs optimizer (L3876-3877) which uses slP=0.85, noP=0.75. Needs clarification: intentional behavioral difference or copy-paste drift?

### P1 — Significant
3. **Multiple default declarations**: `inf` default appears at L1825 (0.021), L3814 (0.021), L4549 (0.021) — three copies to maintain.
4. **Multiple allocation defaults**: `allocR/T/N` defaults appear at L1826, L3816, L4555-4557, L6095 — four copies.
5. **Property sale cost 0.95 (5%)** appears at both L4094 and L5366 — two copies.
6. **nrTaxDrag** has two different defaults: 0.003 at L1826 (test baseline) vs 0.009 at L5125/L3920 (MC/optimizer). The 0.009 is likely the "real" default, 0.003 is test-specific.

### P2 — Moderate
7. **DC withdrawal rate 0.04** appears at L3863, L5004, L5036, L5039, L5563 — five copies.
8. **Meltdown target 58523** appears at L5015 and L5253 — duplicated.
9. **TFSA limit 7000** appears at L1503, L3803, L3917, L4144, L5113, L5202 — six copies.
10. **FHSA constants** appear at L3809+L3941+L3950 and L5138+L5144 — duplicated.
