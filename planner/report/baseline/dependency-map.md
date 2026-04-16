# Dependency Map (reportHTML useMemo)

This map is the transition bridge from inline `useMemo` to external
`buildReport(payload)` and `buildExcel(payload)`.

Raw dependency list:

- `report_usememo_dependencies.txt` (95 deps)

## Proposed grouping for payload v1

### 1) Context

- `rptMode`, `rptLang`, `lang`, `mode`, `prov`

### 2) Core simulation

- `mc`, `aiReport`, `strs`, `gkOn`

### 3) Primary profile

- `age`, `retAge`, `deathAge`, `sal`, `retSpM`
- `rrsp`, `tfsa`, `nr`, `rrspC`, `tfsaC`, `nrC`, `liraBal`, `fhsaBal`, `dcBal`
- `allocR`, `allocT`, `allocN`
- `merR`, `merT`, `merN`
- `qppAge`, `avgE`, `qppYrs`, `oasAge`, `penType`, `penM`
- `wStrat`, `melt`, `meltTgt`, `split`, `splitP`, `glide`, `glideSpd`
- `goP`, `slP`, `noP`, `fatT`, `stochInf`, `stochMort`, `nSim`, `inf`

### 4) Spouse profile

- `cOn`, `cAge`, `cRetAge`, `cSal`, `cRetSpM`
- `cRRSP`, `cTFSA`, `cNR`
- `cQppAge`, `cAvgE`, `cQppYrs`, `cOasAge`
- `cLifeInsBenefit`, `cSpouseName`

### 5) Client metadata

- `cName`, `cDOB`, `cAddr`, `cPhone`, `cEmail`
- `cAdvisor`, `cFirm`, `cNotes`

### 6) Events / incomes / capital gains

- `ev1Age`, `ev1Amt`, `ev1Name`, `ev2Age`, `ev2Amt`, `ev2Name`
- `inc1Age`, `inc1Amt`, `inc1Name`, `inc2Name`, `inc3Name`
- `cgIncLo`, `cgIncHi`

### 7) Assets / liabilities / planning extras

- `props`, `debts`, `goals`, `family`, `samResults`, `rsuGrants`

## Immediate use in next step

This grouping will be converted into `ReportPayload` sections:

1. `meta`
2. `client`
3. `params.primary`
4. `params.spouse`
5. `params.events`
6. `scenario` / `engine`
7. `computed` (from `mc` and report derivations)

