# BuildFi v4 — Variable Inventory (from v3 state)

**Source**: `planner_v3.html` `useState` declarations + `_mcBaseParams` + save/load.
**Date**: 2026-04-19
**Purpose**: exhaustive list of every engine-relevant variable v4's form must cover, with the exact v3 key name. v4 profile JSON uses these same keys so profiles round-trip between v3 and v4.

Legend:
- 🟢 = v4 already covers
- 🟡 = v4 partial (key exists but UI incomplete)
- 🔴 = v4 missing (gap to fill)
- ⚪ = UI-only state in v3, not consumed by engine, not needed in v4 form

---

## 1. Identity / Profile (11 vars)

| Key | v3 default | v4 status | Notes |
|---|---|---|---|
| `firstName` | `""` | 🟢 | Profile module |
| `lastName` | `""` | 🟢 | |
| `age` | `35` | 🟢 | |
| `sex` | `"M"` | 🟢 | |
| `prov` | `"QC"` | 🟢 | All 13 provinces |
| `retAge` | `62` | 🟢 | |
| `deathAge` | `90` | 🟢 | Honoured only if `stochMort=false` |
| `sal` | `0` | 🟢 | |
| `cDOB` | `""` | 🔴 | Date-of-birth text |
| `cAddr` | `""` | 🔴 | Address |
| `cPhone` / `cEmail` | `""` | 🔴 | |
| `cAdvisor` / `cFirm` / `cNotes` | `""` | 🔴 | Advisor tag |
| `cName` (derived from firstName+lastName) | auto | 🟢 | Not a separate field |

## 2. AI tone & goals (4 vars)

| Key | Default | Status | Notes |
|---|---|---|---|
| `stressLevel` | `"moderate"` | 🔴 | low / moderate / high |
| `finLiteracy` | `"intermediate"` | 🔴 | beginner / intermediate / advanced |
| `detailPref` | `"balanced"` | 🔴 | concise / balanced / detailed |
| `goals[]` | `[{type:"retirement",...}]` | 🔴 | Array editor: retirement, education, lumpsum |

## 3. Savings — primary (13 vars)

| Key | Default | Status |
|---|---|---|
| `rrsp` | `0` | 🟢 |
| `rrspC` | `0` | 🟢 |
| `tfsa` | `0` | 🟢 |
| `tfsaC` | `0` | 🟢 |
| `nr` | `0` | 🟢 |
| `nrC` | `0` | 🟢 |
| `contGr` | `0` | 🔴 Contribution growth rate |
| `liraBal` | `0` | 🟢 |
| `rrspRoom` | `0` | 🔴 Unused RRSP room |
| `fhsaBal` | `0` | 🟢 |
| `fhsaC` | `8000` | 🔴 Not entered separately in v4 yet |
| `fhsaForHome` | `false` | 🔴 |
| `fhsaHomeAge` | `0` | 🔴 |

## 4. Allocations & glide (10 vars)

| Key | Default | Status |
|---|---|---|
| `allocR` | `0.6` | 🟢 |
| `allocT` | `0.6` | 🟢 |
| `allocN` | `0.6` | 🟢 (labeled 0.5 in v4 hint but state default in v3 is 0.6) |
| `multiAsset` | `false` | 🔴 |
| `globalAlloc` | `{can:0.25,us:0.35,intl:0.2,em:0.05,bnd:0.15}` | 🔴 |
| `allocOverride` | `{rrsp:null,tfsa:null,nr:null}` | 🔴 |
| `maPerAcct` | `false` | 🔴 |
| `glide` | `false` | 🔴 |
| `glideSpd` | `0.02` | 🔴 |
| `rebal` | `false` | 🔴 |

## 5. Fees (4 vars)

| Key | Default | Status |
|---|---|---|
| `merR` | `0.005` | 🟢 |
| `merT` | `0.003` | 🟢 |
| `merN` | `0.003` | 🟢 |
| `nrTaxDrag` | `0.003` | 🔴 |

## 6. Market assumptions (5 vars)

| Key | Default | Status |
|---|---|---|
| `eqRetS` | `0.07` | 🟢 |
| `eqVolS` | `0.16` | 🟢 |
| `bndRetS` | `0.035` | 🟢 |
| `bndVolS` | `0.06` | 🟢 |
| `fxVol` | `0` | 🔴 |

## 7. Inflation (3 vars)

| Key | Default | Status |
|---|---|---|
| `inf` | `0.021` | 🟢 |
| `infHealth` | `0.02` | 🟢 (health inflation field) |
| `infHousing` | `0.01` | 🔴 |

## 8. Retirement spending & smile curve (6 vars)

| Key | Default | Status |
|---|---|---|
| `retSpM` | `0` | 🟢 |
| `goP` | `1` | 🔴 Go-Go phase multiplier |
| `slP` | `1` | 🔴 Slow-Go phase multiplier |
| `noP` | `1` | 🔴 No-Go phase multiplier |
| `smileSlAge` | `75` | 🔴 Slow-Go age transition |
| `smileNoAge` | `85` | 🔴 No-Go age transition |

## 9. Primary events & part-time (11 vars)

| Key | Default | Status |
|---|---|---|
| `ev1Age` / `ev1Amt` / `ev1Name` | `0` / `0` / `""` | 🔴 Expense event 1 |
| `ev2Age` / `ev2Amt` / `ev2Name` | `0` / `0` / `""` | 🔴 Expense event 2 |
| `inc1Age` / `inc1Amt` / `inc1Name` | `0` / `0` / `""` | 🔴 Income event 1 |
| `inc2Age` / `inc2Amt` / `inc2Name` | `0` / `0` / `""` | 🔴 Income event 2 |
| `inc3Age` / `inc3Amt` / `inc3Name` | `0` / `0` / `""` | 🔴 Income event 3 |
| `ptM` | `0` | 🟢 |
| `ptYrs` | `5` | 🟢 |

## 10. Government pensions (4 vars)

| Key | Default | Status |
|---|---|---|
| `qppAge` | `65` | 🟢 |
| `avgE` | `0` | 🔴 Avg pensionable earnings — hidden in v4 |
| `qppYrs` | `0` | 🔴 Contribution years |
| `oasAge` | `65` | 🟢 |

## 11. Pension 1 (11 vars)

| Key | Default | Status |
|---|---|---|
| `penType` | `"none"` | 🟢 |
| `penM` | `0` | 🟢 Shown only when DB |
| `penIdx` | `0` | 🔴 Indexation 0/1/2 |
| `dcBal` | `0` | 🔴 Surfaced via penType=CD |
| `dcY` | `0.05` | 🔴 DC yield |
| `penEE` | `0` | 🔴 Employee contrib |
| `penER` | `0` | 🔴 Employer contrib |
| `penEEpct` | `0.05` | 🔴 EE % when percent mode |
| `penERpct` | `0.05` | 🔴 ER % |
| `penPctMode` | `false` | 🔴 Dollar vs percent |
| `penMER` | `0.01` | 🔴 Fund MER |
| `bridge` | `false` | 🔴 |
| `brAmt` | `500` | 🔴 |
| `brEnd` | `65` | 🔴 |

## 12. Pension 2 (6 vars)

| Key | Default | Status |
|---|---|---|
| `pen2Type` | `"none"` | 🔴 |
| `pen2M` | `0` | 🔴 |
| `pen2Idx` | `0` | 🔴 |
| `dc2Bal` | `0` | 🔴 |
| `pen2EE` | `0` | 🔴 |
| `pen2ER` | `0` | 🔴 |

## 13. Commuted value analysis (4 vars)

| Key | Default | Status |
|---|---|---|
| `cvAnalysis` | `false` | 🔴 |
| `cvAmount` | `0` | 🔴 |
| `cvTransferMax` | `0` | 🔴 ITA 8517 limit |
| `dbSurvivorPct` | `60` | 🔴 |

## 14. Insurance — primary (11 vars)

| Key | Default | Status |
|---|---|---|
| `insVieType` | `"temp"` | 🔴 life type (none/temp/perm) |
| `insVieCov` | `0` | 🔴 term/perm coverage |
| `insViePrime` | `0` | 🔴 premium |
| `insVieDur` | `20` | 🔴 term duration |
| `insInvCov` | `60` | 🔴 disability coverage % |
| `insInvPrime` | `0` | 🔴 |
| `insMGCov` | `0` | 🔴 critical illness coverage |
| `insMGPrime` | `0` | 🔴 |
| `insColPrime` | `0` | 🔴 group insurance |
| `lifeInsBenefit` | `0` | 🟢 (shown as "life insurance" in v4) |
| `lifeInsPremium` | `0` | 🟢 |

**Note**: `insVieCov/insViePrime/insVieDur/insInvCov/insInvPrime/insMGCov/insMGPrime/insColPrime` are the **expert-mode** insurance fields in v3. `lifeInsBenefit/lifeInsPremium` are the **standard-mode** simplified pair. v4 currently shows only the standard pair.

## 15. Tax strategy (7 vars)

| Key | Default | Status |
|---|---|---|
| `wStrat` | `"optimal"` | 🔴 withdrawal order |
| `melt` | `false` | 🟡 via strategy pill |
| `meltTgt` | `58523` | 🔴 target bracket |
| `split` | `false` | 🔴 pension splitting |
| `splitP` | `0.5` | 🔴 split % |
| `qppShare` | `false` | 🔴 QPP sharing |
| `rrifTax` | `false` | 🔴 RRIF withholding |

## 16. Mortality & Monte Carlo (4 vars)

| Key | Default | Status |
|---|---|---|
| `nSim` | `1000` | 🟢 |
| `stochMort` | `false` | 🟢 |
| `stochInf` | `false` | 🔴 |
| `fatT` | `false` | 🔴 fat tails |

## 17. Capital gains (4 vars)

| Key | Default | Status |
|---|---|---|
| `cgIncLo` | `0.5` | 🔴 inclusion rate below threshold |
| `cgIncHi` | `0.6667` | 🔴 inclusion rate above threshold |
| `cgThresh` | `250000` | 🔴 threshold |
| `costBase` | `100000` | 🔴 ACB of non-reg |

## 18. Health + risk expert (6 vars)

| Key | Default | Status |
|---|---|---|
| `healthMul` | `0` | 🔴 health cost multiplier |
| `healthAge` | `85` | 🔴 health cost start age |
| `donAnn` | `0` | 🔴 charitable donation |
| `salVol` | `0` | 🔴 salary volatility |
| `disabProb` | `0` | 🔴 disability prob/yr |
| `disabMo` | `6` | 🔴 disability duration months |

## 19. Stress scenarios (9 vars)

| Key | Default | Status |
|---|---|---|
| `strs` | `"none"` | 🔴 primary stress preset |
| `custStrs` | `[-0.2,-0.1,0.05,0.1]` | 🔴 custom equity returns |
| `custBd` | `[0.05,0.03,0,-0.01]` | 🔴 custom bond returns |
| `custInf` | `[0.025,0.03,0.025,0.02]` | 🔴 custom inflation |
| `stWhen` | `"ret"` | 🔴 when shock hits |
| `stAge` | `60` | 🔴 specific shock age |
| `strs2` | `"none"` | 🔴 secondary shock |
| `stWhen2` | `"age"` | 🔴 |
| `stAge2` | `75` | 🔴 |

## 20. Guyton-Klinger guardrails (6 vars)

| Key | Default | Status |
|---|---|---|
| `gkOn` | `false` | 🔴 |
| `gkCeil` | `0.055` | 🔴 |
| `gkFloor` | `0.03` | 🔴 |
| `gkCut` | `0.10` | 🔴 |
| `gkRaise` | `0.10` | 🔴 |
| `gkMaxCut` | `0.25` | 🔴 |

## 21. Real estate (28 keys per item + 2 globals)

**Globals**:
| Key | Default | Status |
|---|---|---|
| `reRntInf` | `0.02` | 🔴 rent inflation |
| `reCostInf` | `0.03` | 🔴 operating cost inflation |

**Per-property (`props[i]`)**:
| Key | Default | Status |
|---|---|---|
| `on` | `false` | 🟢 |
| `name` | `""` | 🟡 not yet editable in v4 |
| `val` | `0` | 🟢 |
| `ri` | `0` | 🟢 appreciation |
| `mb` | `0` | 🟢 mortgage balance |
| `mr` | `0` | 🟡 rate (v4 uses `rate`) ⚠️ KEY NAME DIFFERS |
| `mr2` | `0` | 🔴 renewal rate |
| `mt1` | `5` | 🔴 term months/years |
| `ma` | `25` | 🟡 amort (v4 uses `amort`) ⚠️ KEY NAME DIFFERS |
| `rm` | `0` | 🟡 rent monthly (v4 uses `rent`) ⚠️ KEY NAME DIFFERS |
| `ox` | `0` | 🟡 operating exp (v4 uses `exp`) ⚠️ KEY NAME DIFFERS |
| `pt` | `0` | 🟡 prop tax (v4 uses `tax`) ⚠️ KEY NAME DIFFERS |
| `ins` | `0` | 🟢 |
| `pa` | `35` | 🔴 purchase age |
| `sa` | `0` | 🔴 sale age (duplicate of dsAge?) |
| `pri` | `true` | 🟢 principal residence |
| `cg` | `0.5` | 🔴 CG inclusion rate |
| `dsAge` | `0` | 🟢 downsize age |
| `dsVal` | `0` | 🟢 |
| `heloc` | `0` | 🟢 |
| `helocRate` | `0.065` | 🟢 |
| `helocMax` | `0.65` | 🔴 |
| `smithOn` | `false` | 🟢 |
| `refiAge` | `0` | 🟢 |
| `refiAmt` | `0` | 🟢 |
| `dpaOn` | `false` | 🟢 |
| `dpaRate` | `0.04` | 🟢 |
| `landPct` | `0.30` | 🔴 land % |
| `ownerSelf` / `ownerSpouse` | `0.5` / `0.5` | 🟢 (v4 Phase 5A) |

**⚠️ Critical**: v4's dynamic editor uses `rate`/`amort`/`rent`/`exp`/`tax` but v3's engine reads `mr`/`ma`/`rm`/`ox`/`pt`. **v4 must match v3 keys** or profiles won't simulate. Fix in v4 next pass.

## 22. Debts (8 keys per item)

| Key | Default | Status |
|---|---|---|
| `type` | `"other"` | 🟢 |
| `bal` | `0` | 🟢 |
| `rate` | `0.08` | 🟢 |
| `term` | `0` | 🟢 |
| `pay` | `0` | 🟢 |
| `deductible` | `false` | 🟢 |
| `ownerSelf` / `ownerSpouse` | `0.5` / `0.5` | 🟢 |

## 23. Alt investments — PE/PM (13 vars)

| Key | Default | Status |
|---|---|---|
| `peBal` | `0` | 🔴 |
| `peY` | `0.12` | 🔴 |
| `peV` | `0.25` | 🔴 |
| `peFee` | `0.02` | 🔴 |
| `peLock` | `3` | 🔴 |
| `peExit` | `0` | 🔴 |
| `peExitStrat` | `"lump"` | 🔴 |
| `peExitYrs` | `5` | 🔴 |
| `pmBal` | `0` | 🔴 |
| `pmY` | `0.03` | 🔴 |
| `pmV` | `0.15` | 🔴 |
| `pmExit` | `0` | 🔴 |
| `pmExitStrat` | `"lump"` | 🔴 |
| `pmExitYrs` | `5` | 🔴 |

## 24. RSU grants (array)

| Key | Default | Status |
|---|---|---|
| `rsuGrants[]` | `[]` | 🔴 per-grant: name, shares, price, growth, vesting, exercise age |

## 25. Business / CCPC (21 vars)

| Key | Default | Status |
|---|---|---|
| `bizOn` | `false` | 🔴 |
| `bizType` | `"ccpc"` | 🔴 ccpc / sole |
| `bizRevenue` | `0` | 🔴 |
| `bizVolatility` | `0` | 🔴 |
| `bizGrowth` | `0` | 🔴 |
| `bizExpenses` | `0` | 🔴 |
| `bizRemun` | `"salary"` | 🔴 |
| `bizSalaryPct` | `1.0` | 🔴 |
| `bizRetainedEarnings` | `0` | 🔴 |
| `bizInvAlloc` | `0.4` | 🔴 |
| `bizExtractMode` | `"dividend"` | 🔴 |
| `bizExtractYrs` | `10` | 🔴 |
| `bizOasOptim` | `false` | 🔴 |
| `bizSaleAge` | `0` | 🔴 |
| `bizSalePrice` | `0` | 🔴 |
| `bizSaleACB` | `100` | 🔴 |
| `bizLCGE` | `true` | 🔴 |
| `bizDebtBal` | `0` | 🔴 |
| `bizDebtRate` | `0.06` | 🔴 |
| `bizDebtAmort` | `10` | 🔴 |
| `ippOn` | `false` | 🔴 individual pension plan |
| `ippBal2` | `0` | 🔴 |

## 26. RESP (6 vars)

| Key | Default | Status |
|---|---|---|
| `respOn` | `false` | 🔴 |
| `respContrib` | `208` | 🔴 monthly |
| `respYrsLeft` | `10` | 🔴 |
| `respReturnAge` | `48` | 🔴 |
| `respKids` | `1` | 🔴 |
| `respAlready` | `0` | 🔴 |

## 27. FTQ / Fondaction (2 vars)

| Key | Default | Status |
|---|---|---|
| `ftqOn` | `false` | 🔴 |
| `ftqAmt` | `5000` | 🔴 |

## 28. Spouse — identity (7 vars)

| Key | Default | Status |
|---|---|---|
| `cOn` | `false` | 🟢 via plan-mode pill |
| `cAge` | `33` | 🟢 |
| `cSex` | `"F"` | 🟢 |
| `cRetAge` | `62` | 🟡 sidebar has it; v4 form has it hidden behind sync |
| `cDeath` | `88` | 🟡 |
| `cSpouseName` | `""` | 🟢 |
| `cSpouseLastName` | `""` | 🟢 |

## 29. Spouse — savings (10 vars)

| Key | Default | Status |
|---|---|---|
| `cRRSP` | `0` | 🔴 |
| `cRRSPC` | `0` | 🔴 |
| `cTFSA` | `0` | 🔴 |
| `cTFSAC` | `0` | 🔴 |
| `cNR` | `0` | 🔴 |
| `cNRC` | `0` | 🔴 |
| `cFhsaBal` | `0` | 🔴 |
| `cFhsaC` | `8000` | 🔴 |
| `cLiraBal` | `0` | 🔴 |
| `cSal` | `0` | 🟢 |

## 30. Spouse — gov pensions (4 vars)

| Key | Default | Status |
|---|---|---|
| `cQppAge` | `65` | 🔴 |
| `cAvgE` | `0` | 🔴 |
| `cQppYrs` | `0` | 🔴 |
| `cOasAge` | `65` | 🔴 |

## 31. Spouse — pensions (13 vars)

| Key | Default | Status |
|---|---|---|
| `cPenType` | `"none"` | 🔴 |
| `cPenM` | `0` | 🔴 |
| `cPenIdx` | `0` | 🔴 |
| `cDCBal2` | `0` | 🔴 |
| `cPenEE` / `cPenER` / `cPenMER` | `0` / `0` / `0.005` | 🔴 |
| `cPen2Type` | `"none"` | 🔴 |
| `cPen2M` / `cPen2Idx` / `cDC2Bal` / `cPen2EE` / `cPen2ER` | `0` | 🔴 |
| `cBridge` / `cBrAmt` / `cBrEnd` | `false` / `0` / `65` | 🔴 |

## 32. Spouse — insurance (10 vars)

| Key | Default | Status |
|---|---|---|
| `cSyncInsLife` | `true` | 🔴 |
| `cInsVieType` | `"none"` | 🔴 |
| `cInsVieDur` | `20` | 🔴 |
| `cInsInvCov` / `cInsInvPrime` | `0` | 🔴 |
| `cInsMGCov` / `cInsMGPrime` | `0` | 🔴 |
| `cInsColPrime` | `0` | 🔴 |
| `cLifeInsBenefit` / `cLifeInsPremium` | `0` | 🔴 |

## 33. Spouse — portfolio (7 vars)

| Key | Default | Status |
|---|---|---|
| `cSyncPortfolio` | `true` | 🔴 |
| `cAllocR` / `cAllocT` / `cAllocN` | `0.6` / `0.6` / `0.5` | 🔴 |
| `cMerR` / `cMerT` / `cMerN` | `0.01` / `0.005` / `0.005` | 🔴 |

## 34. Spouse — events & part-time (14 vars)

| Key | Default | Status |
|---|---|---|
| `cEv1Age` / `cEv1Amt` / `cEv1Name` | `0` / `0` / `""` | 🔴 |
| `cEv2Age` / `cEv2Amt` / `cEv2Name` | `0` / `0` / `""` | 🔴 |
| `cInc1Age` / `cInc1Amt` / `cInc1Name` | `0` / `0` / `""` | 🔴 |
| `cInc2Age` / `cInc2Amt` / `cInc2Name` | `0` / `0` / `""` | 🔴 |
| `cInc3Age` / `cInc3Amt` / `cInc3Name` | `0` / `0` / `""` | 🔴 |
| `cPtM` / `cPtYrs` | `0` / `5` | 🔴 |

## 35. Spouse — retirement spending legacy (1 var)

| Key | Default | Status |
|---|---|---|
| `cRetSpM` | `0` | ⚠️ Deprecated; household spending is primary's `retSpM`. v4 doesn't need a field. Keep in JSON for v2/v3 back-compat. |

## 36. Sync flags (4 vars)

| Key | Default | Status |
|---|---|---|
| `cSyncRetAge` | `true` | 🟢 |
| `cSyncGovAges` | `true` | 🟢 |
| `cUseStochMort` | `true` | 🟢 |
| `cAvgEAuto` | `true` | 🟢 |

## 37. UI-only state (not in v4 form)

`editing`, `lang`, `selProfile`, `starterPreset`, `profDropOpen`, `wizStep`, `guideSub`, `openSec`, `sbAllOpen`, `tab`, `visitedTabs`, `firstRunTips`, `pan`, `mobSbOpen`, `budgetMode` (partial), `projReal`, `projView`, `whatIfInc`, `detResult`, `showDetRef`, `stressResults`, `sensTab`, `stExpanded`, `stShockAge`, `aiReport`, `aiLoading`, `aiCount`, `aiApiKey`, `aiKeyVisible`, `rptMode`, `rptLang`, `mortView`, `sankeyAge`, `showSankey`, `extraPay`, `payStrat`, `showAmort`, `showMtgAmort`, `insNeedOpen`, `coachApplied`, `coachDismissed`, `optResult`, `optRunning`, `smithResult`, `smithRunning`, `optProgress`, `samResults`, `samView`, `samRunning`, `showReport`, `_frcV`, `_rerunV`, `mcProgress`, `mcComputing`, `mcElapsed`, `optHov`, `penPctMode`, `rebal`, `maPerAcct`, `gkBaseline`

⚪ These are rendering/runtime state. Not persisted in profile JSON; v4 doesn't need fields for them.

---

## Summary

**Engine-relevant variables** to cover in v4 form: **~190** (confirmed).

**v4 current coverage** (after today's commits):
- 🟢 Done: ~55 vars (Identity, most Savings, Allocations primary, Gov pensions partial, Real estate keys *with key-name issue*, Debts, Sync flags)
- 🟡 Partial: ~10 vars (mostly UI gating issues or key-name mismatches)
- 🔴 Missing: ~125 vars (most spouse fields, full insurance, business, events, stress, smile curve, pension depth, PE/PM, RSU, RESP, FTQ, goals, AI tone)

**Critical bugs to fix first**:
1. **v4 property dynamic editor uses `rate`/`amort`/`rent`/`exp`/`tax` but v3 engine reads `mr`/`ma`/`rm`/`ox`/`pt`** → profiles exported from v4 won't simulate correctly in v3. Fix: rename keys in v4's `addProperty()` + `renderProps()` + save/load mapping.
2. **v4 saves flat scalars AND arrays, but ignores `_props`/`_debts` state when loading a v3 profile** whose arrays have the v3 shape (e.g. `mr` instead of `rate`). Add a migration shim in `loadProfile()`.

---

## Priority waves for v4 completion

**Wave A — Key-name alignment (30 min)**: fix `props[].rate→mr`, `amort→ma`, `rent→rm`, `exp→ox`, `tax→pt` in `addProperty()` and `renderProps()`. Add migration on load. **Blocks everything else** — without this, v4 profiles don't interop with v3 engine.

**Wave B — Primary completeness (2 h)**: add the 35 missing primary-person fields (insurance full depth, pension depth, stress scenarios, smile curve, CG, health cost, events editor, goals editor).

**Wave C — Spouse completeness (2 h)**: add the 65 missing spouse fields in a Conjoint section mirroring Wave B structure, with sync toggles where v3 has them.

**Wave D — Advanced / niche (1.5 h)**: Business/CCPC section, RSU, PE/PM, RESP, FTQ, commuted value, Guyton-Klinger.

**Wave E — Engine handoff verification (1 h)**: export from v4, load into v3, simulate, compare to v3-entered equivalent. Document any field that doesn't round-trip.

**Total: ~7 h** to get v4 to true parity with v3.

---

**Next action**: fix Wave A (key-name alignment) immediately since it blocks any v4→v3 handoff. Then commit and attack Wave B.
