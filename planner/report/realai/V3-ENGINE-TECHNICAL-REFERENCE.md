# planner_v3 Engine — Complete Technical Reference

**Source:** `planner/planner_v3.html` (BuildFi Laboratoire v12.0.0)
**Engine code:** ~5000 lines, lines 1882–7376 of `planner_v3.html`
**Audience:** Engineers, tax/compliance specialists, anyone who needs to understand what each number in a BuildFi report means and how it was computed.
**Conventions:** All amounts are in nominal CAD unless noted. All tax/benefit constants are 2026 values, indexed to year `y` by `(1 + p.inf)^y`. Code snippets are extracted verbatim from `planner_v3.html` and may show character-encoding artefacts (the source file uses CP1252 in some comment blocks).

---

## Table of contents

- [Part 1 — Architecture & data flow](#part-1--architecture--data-flow)
- [Part 2 — Constants reference (the `C` object)](#part-2--constants-reference-the-c-object)
- [Part 3 — Tax math (`calcTax`, `calcCorpTax`, `calcPayroll`)](#part-3--tax-math-calctax-calccorptax-calcpayroll)
- [Part 4 — Government benefits (`calcQPP`, `calcOAS`, `calcGIS`)](#part-4--government-benefits-calcqpp-calcoas-calcgis)
- [Part 5 — Withdrawal floors (`getRRIFMin`, `oasClbThrFor`)](#part-5--withdrawal-floors-getrrifmin-oasclbthrfor)
- [Part 6 — Stochastic primitives (`chol`, `tRn`, `stochDeath`, `sMul`, `pCr`, blends)](#part-6--stochastic-primitives-chol-trn-stochdeath-smul-pcr-blends)
- [Part 7 — Auxiliary functions (`calcNRItemizedTax`, `calcWHT`, `divEligibleFactor`)](#part-7--auxiliary-functions-calcnritemizedtax-calcwht-divisibilityfactor)
- [Part 8 — Registered accounts encyclopedia](#part-8--registered-accounts-encyclopedia)
- [Part 9 — Deterministic engine (`optimizeDecum`)](#part-9--deterministic-engine-optimizedecum)
- [Part 10 — Monte Carlo engine (`runMC`)](#part-10--monte-carlo-engine-runmc)
- [Part 11 — Stress scenarios (`STR` catalog)](#part-11--stress-scenarios-str-catalog)
- [Part 12 — Result schema](#part-12--result-schema)
- [Part 13 — Invariants & defensive guards](#part-13--invariants--defensive-guards)
- [Part 14 — Known limitations & flagged items](#part-14--known-limitations--flagged-items)
- [Part 15 — Reproducibility (running the engine outside the browser)](#part-15--reproducibility-running-the-engine-outside-the-browser)

---

## Part 1 — Architecture & data flow

### 1.1 What the engine is

The BuildFi engine is a Canadian retirement-planning calculator embedded in `planner_v3.html`. It produces two kinds of output from one input parameter object `p`:

1. **A deterministic projection** (`optimizeDecum(p)`) — one path showing exactly what happens year-by-year if all expected returns hit. Used for the in-page "Projection déterministe" table.
2. **A Monte Carlo distribution** (`runMC(p, N)`) — `N` independent simulations (typically 1000–5000) capturing return / inflation / mortality randomness. Used for success rate, percentile bands, fan charts.

Both engines call the same tax + benefit primitives (`calcTax`, `calcQPP`, `calcOAS`, `calcGIS`, `getRRIFMin`, `calcCorpTax`, `calcPayroll`).

### 1.2 The `p` parameter object

`p` is a flat JavaScript object with ~150 fields covering:

- Identity & timeline (`age`, `retAge`, `deathAge`, `sex`, `prov`)
- Compensation (`sal`, `salVol`, `disabProb`, `contGr`)
- Account balances (`rrsp`, `tfsa`, `nr`, `fhsaBal`, `liraBal`, `peBal`, `pmBal`, `dcBal`, `dc2Bal`)
- Annual contributions (`rrspC`, `tfsaC`, `nrC`, `fhsaC`)
- Spending (`retSpM`, `goP`, `slP`, `noP`, `smileSlAge`, `smileNoAge`, `healthAge`, `healthMul`)
- Government benefits (`qppAge`, `oasAge`, `avgE`, `qppYrs`, `gis` flag)
- Returns + risk (`eqRet`, `eqVol`, `bndRet`, `bndVol`, `inf`, `fatT`, `stochMort`, `stochInf`)
- Allocation (`allocR`, `allocT`, `allocN`, `glide`, `glideSpd`, `multiAsset`, `assetAlloc`, `allocOverride`)
- Fees (`merR`, `merT`, `merN`, `nrTaxDrag`)
- Pension (`penType`, `penM`, `penIdx`, `bridge`, `brAmt`, `brEnd`, `pen2Type`, `pen2M`, `pen2Idx`)
- Withdrawal strategy (`wStrat`, `melt`, `meltTgt`, `rrifTax`, `gkOn`)
- Spousal coordination (`cOn`, `cAge`, `cRetAge`, `cDeath`, `cSex`, `cSal`, `cRRSP`, `cTFSA`, `cNR`, `cQppAge`, `cAvgE`, `cQppYrs`, `cOasAge`, `cPenType`, `cPenM`, `cRetSpM`, `cFhsaBal`, `cFhsaC`, `cLiraBal`, `cLifeInsBenefit`, `cLifeInsPremium`, `qppShare`, `split`, `splitP`)
- Real estate (`props[]` with each entry having `on`, `val`, `mb`, `mr`, `ma`, `ri`, `rm`, `ox`, `pt`, `ins`, `sa`, `pri`, `cg`, `helocRate`, `helocMax`, `smithOn`, `refiAge`, `refiAmt`, `dsAge`, `dpaOn`, `dpaRate`, `landPct`)
- Corporate / CCPC (`bizOn`, `bizType`, `bizRevenue`, `bizExpenses`, `bizGrowth`, `bizVolatility`, `bizRemun`, `bizSalaryPct`, `bizRetainedEarnings`, `bizInvAlloc`, `bizExtractMode`, `bizExtractYrs`, `bizOasOptim`, `bizSaleAge`, `bizSalePrice`, `bizSaleACB`, `bizLCGE`, `bizDebtBal`, `bizDebtRate`, `bizDebtAmort`)
- IPP (`ippOn`, `ippBal`, `ippBal2`)
- Family / events / goals / debts / RSU (`family[]`, `goals[]`, `debts[]`, `rsuGrants[]`, `ev1Age`, `ev1Amt`, `ev1Name`, `inc1Age`, `inc1Amt`, `inc1Name`, …)
- RESP / education (`respOn`, `respContrib`, `respYrsLeft`, `respKids`, `respReturnAge`, `respAlready`)
- Insurance (`insOn`, `lifeInsBenefit`, `lifeInsPremium`)
- Stress (`strs`, `stWhen`, `stAge`, `strs2`, `stWhen2`, `stAge2`, `custEq`, `custBd`, `custInf`)
- MC controls (`nSim`, `fatT`, `stochMort`, `stochInf`, `eqRetS`, `eqVolS`, `bndRetS`, `bndVolS`)
- Cost basis & cap gains (`costBase`, `cgIncLo`, `cgIncHi`, `cgThresh`)
- Charitable & misc (`donAnn`, `ftqOn`, `ftqAmt`)

Every field is optional except `age`, `retAge`, and `sal`. Defaults are applied through `||` fallbacks throughout the engine plus a sanitization pass at the top of `runMC`.

### 1.3 Top-level data flow

```
                         ┌─────────────────────────┐
                         │  Quiz / Wizard / API    │
                         │  (validateSchema)       │
                         └────────────┬────────────┘
                                      │  p (params)
                                      ▼
        ┌────────────────────────────────────────────────────────┐
        │  optimizeDecum(p)                runMC(p, N)           │
        │  ───────────────                 ────────────          │
        │  Single deterministic            N independent          │
        │  year-by-year projection         simulations with       │
        │                                  random returns,         │
        │                                  inflation, mortality    │
        └─────────────┬────────────────────────────┬──────────────┘
                      │                            │
                      ▼                            ▼
              { schedule[],                 { pD[], medRevData[],
                totalTax, totalGIS,           sens[], succ, medF,
                oasClawbackYrs,               p5F/p25F/p50F/p75F/p95F,
                finalBal,                     medEstateNet/Tax,
                retStart }                    p5/25/75/95EstateNet/Tax,
                                              ruinAges, deathAges,
                                              sf, p5Ruin, gkAvg…,
                                              histogram, deathVsRuin }
```

### 1.4 Function call graph (engine-only)

```
runMC ──┬─ stochDeath               ──┬─ CPM_M / CPM_F (mortality tables)
        ├─ tRn (×5 to 8 per year)    └─ random uniform
        ├─ chol (precomputed CHL)
        ├─ blendRet / blendMulti
        ├─ calcQPP / calcOAS / calcGIS
        ├─ getRRIFMin                ──── RRIF table (C.RRIF_MIN)
        ├─ calcTax  ─────────────────── PROV_TAX, FED_BRACKETS, FED_RATES
        ├─ calcCorpTax
        ├─ calcPayroll
        ├─ calcNRItemizedTax  ────────── divEligibleFactor
        ├─ calcWHT
        ├─ sMul (spending smile)
        └─ pCr (pension credit)

optimizeDecum ──── same primitives (deterministic path through the same logic)
```

### 1.5 Engine vs UI

The engine is wrapped in inline `<script>` tags inside `planner_v3.html`. The same file also contains React UI components (Slider, ChartTooltip, MiniArea, etc.). The audit extractor (`report/realai/extract-v3-engine.mjs`) lifts only the engine block (constants → `runMC`) into a Node-runnable module to permit headless testing.

---

## Part 2 — Constants reference (the `C` object)

All constants live in a single literal at lines 1882–2547 of `planner_v3.html` (the `var C = { … }` block, terminated by the `/*__INJECTED_CONSTANTS_END__*/` marker). Below is the full inventory grouped by purpose. Values shown are 2026.

### 2.1 Returns & volatility (asset-class)

```js
eqRet: 0.07,   eqVol: 0.16,     // generic equity (2-class mode)
bndRet: 0.035, bndVol: 0.06,    // generic bonds
canRet: 0.07,  canVol: 0.16,    // Canadian equity (8-class mode)
usRet: 0.08,   usVol: 0.17,     // US equity
intlRet: 0.07, intlVol: 0.18,   // EAFE
emRet: 0.085,  emVol: 0.23,     // emerging markets
peRet: 0.12,   peVol: 0.25,     // private equity
pmRet: 0.03,   pmVol: 0.15,     // private mortgage
dcRet: 0.05,   dcVol: 0.08,     // DC pension portfolio
fxVol: 0.08,   reVol: 0.10,     // FX translation, real-estate price
```

These are **default** expected returns. The user can override any of them per `p.eqRet`, `p.eqVol`, etc. The runMC sanitization clamps to physical ranges (eqRet ∈ [-5%, +20%], eqVol ∈ [1%, 50%], etc.).

### 2.2 Default allocations

```js
allocR: 0.6,   // equity % in RRSP (rest = bonds)
allocT: 0.8,   // equity % in TFSA
allocN: 0.5,   // equity % in non-registered
multiAsset: { can: 0.25, us: 0.35, intl: 0.20, em: 0.05, bnd: 0.15 }, // 8-class default
```

### 2.3 Fees

```js
merR: 0.01,    // RRSP MER
merT: 0.005,   // TFSA MER
merN: 0.005,   // NR MER
nrTaxDrag: 0.009, // implicit tax drag in NR account when itemized accounting is OFF
penMER: 0.01,  // employer pension MER
peFee: 0.02,   // PE fund fee
```

### 2.4 Inflation & spending

```js
inflation: 0.021,                 // Bank of Canada target ~2%
goP: 1,    slP: 0.85,  noP: 0.75, // Go-Go / Slow-Go / No-Go spending multipliers (deterministic)
mcSlP: 0.82, mcNoP: 0.92,         // MC variants (slightly different to capture variance)
smileSlAge: 75, smileNoAge: 85,   // age transitions
healthAge: 85, healthMul: 0.02,   // health-cost growth: +2%/yr above 85
healthCostMax: 2,                 // max 2× base spending
spendingBase: 0.7, spendingHousing: 0.15, spendingHealth: 0.15, // budget composition
```

The **Blanchett spending smile** is implemented via `sMul(age, retAge, goP, slP, noP, slAge, noAge)`. See Part 6.

### 2.5 Smoothing knobs (`smooth` sub-object)

```js
smooth: {
  melt: 0.4,          // max year-over-year meltdown change (40%)
  meltFloor: 5000,    // minimum absolute change ($5K) to allow movement
  spend: 0.3,         // max spending-layer (RRSP+TFSA+NR draw) change
  spendFloor: 10000,
  back: 0.4,          // backward-pass cap
  backFloor: 15000,
  nrOver: 1.5,        // NR target capped at 1.5× current spending need
  mcBlend: 0.7        // MC memory weight: 70% prior decision / 30% target
}
```

These tame the optimizer's tendency to swing wildly year-to-year. Without `meltFloor`, low-balance accounts could trigger meltdown changes that look erratic in the year-by-year report.

### 2.6 Guyton-Klinger guardrails

```js
gkCeil: 0.055,     // initial WR ceiling (5.5%)
gkFloor: 0.03,     // initial WR floor (3%)
gkCut: 0.10,       // 10% spending cut when ceiling breached
gkRaise: 0.10,     // 10% raise when floor breached
gkMaxCut: 0.25,    // cumulative max cut (25%)
```

### 2.7 Glide path

```js
glideSpeed: 0.02,    // 2%/yr de-risking (equity → bonds approaching retirement)
glideFloor: 0.25,    // floor for general allocation
glideEqFloor: 0.20,  // absolute equity floor (never go below 20%)
```

### 2.8 Real-estate constants

```js
mortgageRate: 0.05,    // default fixed rate when none given
propAppreciation: 0.035,
helocRate: 0.065,
rentalInflation: 0.02,
reCostInflation: 0.03,
refiAmortYears: 25,
replacementRent: 1500, // /month rent assumed when forced primary residence sale
HELOC_MAX_LTV: 0.65,
REFI_MAX_LTV: 0.80,
CCA_RATE: 0.04,        // class 1 building depreciation
LAND_PORTION: 0.30,    // default land/building split
PROPERTY_SALE_COST: 0.05, // 5% transaction cost
```

### 2.9 Pension defaults

```js
dcWithdrawalRate: 0.04,
dcRrifConversionAge: 72,
partialIndexation: 0.5, // 50% indexation default for partially indexed DB plans
annuityRate: 0.04,
deathAge: 90,
spouseDeathAge: 90,
```

### 2.10 RESP / education

```js
respGrowthRate: 0.05,
CESG_MAX_ELIGIBLE_ANNUAL: 2500,  // annual CESG-eligible contrib
CESG_MATCH_RATE: 0.20,            // 20% federal match (basic)
```

### 2.11 Corporate / CCPC

```js
bizSalaryPct: 0.5,
corpPassiveAlloc: 0.4,
corpExtractYears: 10,
bizSaleACB: 100,
SBD_LIMIT: 500000,         // small business deduction limit
PASSIVE_GRIND_THRESHOLD: 50000, // SBD reduced $5/$1 above this
CORP_RATES: {
  QC: { small: 0.122, general: 0.265, passive: 0.5017 },
  ON: { small: 0.122, general: 0.265, passive: 0.5017 },
  BC: { small: 0.110, general: 0.270, passive: 0.5067 },
  // ...
}
```

### 2.12 Tax brackets & credits (federal)

```js
TAX_BASE_YEAR: 2026,
FED_BRACKETS: [58523, 117045, 181440, 258482], // top of brackets 1-4
FED_RATES:    [0.14,  0.205,  0.26,   0.29,   0.33], // 5 marginal rates
FED_PERSONAL: 16452,           // BPA
FED_AGE_AMT:    8790,          // age amount
FED_AGE_THRESH: 44325,         // age-amount phase-out start
FED_CREDIT_RATE: 0.15,         // non-refundable credit rate
FED_AGE_CLAWBACK_RATE: 0.15,   // 15¢ phase-out per $1 above threshold
PENSION_CREDIT_MAX: 2000,
ELIG_GROSSUP: 1.38,            // eligible-dividend gross-up (38%)
NON_ELIG_GROSSUP: 1.15,        // non-eligible (15%)
FED_ELIG_DTC: 0.150198,        // federal eligible-dividend tax credit
FED_NON_ELIG_DTC: 0.090301,    // federal non-eligible DTC
```

### 2.13 Provincial brackets (`PROV_TAX`)

Each province carries:

- `b`: bracket-top thresholds (length n)
- `r`: marginal rates (length n+1)
- `pd`: provincial basic personal amount
- `abate`: federal abatement multiplier (`0.835` for QC = 16.5% reduction, `1` for all others)
- `eligDivCr`: provincial eligible-dividend tax credit rate
- `nonEligDivCr`: provincial non-eligible DTC
- `ageAmt`: provincial age amount
- `ageThresh`: provincial age-amount phase-out start (0 = no phase-out)
- `penAmt`: provincial pension-income credit amount

Quebec example:
```js
QC: {
  b: [54345, 108730, 132245],
  r: [0.14, 0.19, 0.24, 0.2575],
  pd: 18952,
  abate: 0.835,
  eligDivCr: 0.1118,
  nonEligDivCr: 0.039362,
  ageAmt: 3903,
  ageThresh: 0,
  penAmt: 2918
}
```

All 13 provinces (QC, ON, BC, AB, SK, MB, NB, NS, PE, NL, NT, YT, NU) are present. Bracket and rate values are 2026 published values (Revenu Québec, ON Form 428, etc.).

### 2.14 ON surtax

```js
ON_SURTAX_THR1: 5710, // 2026 ON Form 428: 20% surtax above $5,710 prov tax
ON_SURTAX_RATE1: 0.20,
ON_SURTAX_THR2: 7307, // additional 36% above $7,307
ON_SURTAX_RATE2: 0.36,
```

(Updated in the audit from 2024 values $4,991 / $6,387 to 2026 values.)

### 2.15 Government benefits

```js
OAS_CLAWBACK_THR: 95323,         // 2026 OAS recovery threshold
OAS_MAX_MONTHLY: 742.31,         // 2026 Q1
OAS_DEFERRAL_BONUS_PER_MONTH: 0.006, // +0.6%/month (=+7.2%/yr deferral)
OAS_MAX_DEFERRAL_FACTOR: 1.36,   // cap at 60-month deferral
OAS_75_PLUS_BONUS: 1.10,         // +10% for 75+
OAS_CLAWBACK_RATE: 0.15,         // 15¢ per $1 above threshold

GIS_MAX_SINGLE: 1105.43,
GIS_MAX_COUPLE: 667.41,
GIS_EMPLOYMENT_FULL_EXEMPT: 5000,    // first $5K of employment income exempt
GIS_EMPLOYMENT_PARTIAL_CEILING: 15000, // 50% inclusion between $5K and $15K
gisIncomeThreshold: 22000,           // GIS-protection threshold (engine internal)

QPP_MAX_MONTHLY: 1507.65,            // CPP/QPP max @ 65 with enhancement
QPP_MGA: 74600,                      // 2026 YMPE
QPP_YAMPE: 85000,                    // 2026 YAMPE (CPP2 ceiling)
QPP2_MAX_MONTHLY: 81.00,             // CPP2 enhancement at YAMPE
QPP_BASIC_EXEMPTION: 3500,
QPP_RATE_QC: 0.064,
CPP_RATE_ROC: 0.0595,
QPP2_CPP2_RATE: 0.04,
QPP_MAX_CONTRIB_YEARS: 40,
QPP_EARLY_REDUCTION_PER_MONTH: 0.006, // 0.6%/month early (-7.2%/yr)
QPP_LATE_BONUS_PER_MONTH: 0.007,      // 0.7%/month late (+8.4%/yr)
QPP_ADJ_FLOOR: 0.64,                  // [-36% floor]
QPP_ADJ_CAP: 1.42,                    // [+42% ceiling]
QPP_SURVIVOR_FRACTION: 0.6,           // 60% to survivor
QPP_SURVIVOR_CAP_MONTHLY: 813,
```

### 2.16 RRIF table (`RRIF_MIN`)

Verbatim from CRA Schedule 7300. Key values:

| Age | Factor | Age | Factor | Age | Factor |
|-----|--------|-----|--------|-----|--------|
| 71  | 0.0528 | 80  | 0.0682 | 89  | 0.1099 |
| 72  | 0.0540 | 81  | 0.0708 | 90  | 0.1192 |
| 73  | 0.0553 | 82  | 0.0738 | 91  | 0.1306 |
| 74  | 0.0567 | 83  | 0.0771 | 92  | 0.1449 |
| 75  | 0.0582 | 84  | 0.0808 | 93  | 0.1634 |
| 76  | 0.0598 | 85  | 0.0851 | 94  | 0.1879 |
| 77  | 0.0617 | 86  | 0.0899 | 95+ | 0.2000 |
| 78  | 0.0636 | 87  | 0.0955 |     |        |
| 79  | 0.0658 | 88  | 0.1021 |     |        |

`RRIF_MIN_95_PLUS: 0.20` is used for ages 95–105.

### 2.17 Account / contribution caps

```js
TFSA_INDEX_ROUNDING: 500,           // round annual TFSA limit to nearest $500
TFSA_ANNUAL_LIMIT: 7000,             // 2024-2026
TFSA_LIMITS: [...]                   // historical schedule from 2009 ($5K) → 2026 ($7K)
FHSA_LIFETIME_MAX: 40000,
FHSA_ANNUAL_LIMIT: 8000,
FHSA_MAX_YEARS: 15,
FHSA_MANDATORY_CLOSE_AGE: 71,
```

### 2.18 Capital gains

```js
CG_THRESHOLD: 250000,        // CRA $250K split (2024+)
CG_INCLUSION_LOW: 0.50,      // first $250K @ 50%
CG_INCLUSION_HIGH: 0.6667,   // excess @ 66.67%
```

### 2.19 Pension splitting / sharing

```js
PENSION_SPLIT_MAX: 0.5,          // 50% split rate
QPP_SHARING_TAX_FACTOR: 0.15,    // proxy for tax benefit of QPP equalization
```

### 2.20 Probate (per province)

```js
PROBATE: {
  ON: { exempt: 50000, rate: 0.015 },
  BC: { exempt: 50000, rate: 0.014 },
  NS: { rate: 0.015 }, NB: { rate: 0.015 }, PE: { rate: 0.015 },
  NL: { rate: 0.006 }, SK: { rate: 0.007, cap: 7000 }, MB: { rate: 0.007, cap: 7000 },
  AB: { flat: 525 }, QC: { flat: 1200 },
  NT: { rate: 0.004 }, YT: { rate: 0.004 }, NU: { rate: 0.004 },
  DEFAULT: { rate: 0.004 }
}
```

### 2.21 Mortality (`CPM_M`, `CPM_F`)

CPM-2014 base rates (qx = annual death probability) projected to 2023 base year via Scale MI-2017. Sample (male):

| Age | qx | Age | qx | Age | qx |
|-----|------|-----|------|-----|------|
| 30  | 0.00034 | 65 | 0.00631 | 90 | 0.2001 |
| 50  | 0.0013  | 75 | 0.0232  | 95 | 0.39 |
| 60  | 0.00394 | 85 | 0.09701 | 100 | 0.6783 |

Female table is similar but lower across all ages. Both extend to 105. `stochDeath` applies further annual improvement of `0.99^(impYrs + (age-startAge))` from 2023 onward.

### 2.22 Correlation matrices (`CRM`, `CRM8`, crisis variants)

5-class matrix `CRM` (eq, bond, inf, PE, PM) — DMS 2024 values.
8-class matrix `CRM8` (canEq, usEq, intlEq, emEq, bond, inf, PE, PM) for multi-asset mode.
Each has a `_CRISIS` variant where eq-bond correlation goes more negative (flight to quality).

Example `CRM[0]` (equity row): `[1, 0.20, -0.40, 0.65, 0.05]`. Cholesky factor `CHL` is precomputed at module load.

### 2.23 Stochastic primitives

```js
CRISIS_THRESHOLD: -0.10, // shock of -10%+ triggers CRM_CRISIS
STOCH_INF_VOL: 0.015,     // ±1.5% per-year inflation noise
```

### 2.24 Engine internals

```js
fallbackMargRate: 0.42,
detMargRate: 0.40,
ruinThreshold: 100,        // balance below $100 = ruined
dustThreshold: 100,
wdSampleSims: 30,           // # of sims tracked for medRevData withdrawal sampling
shortfallInterval: 3,
sensSims: 50,               // sims used for sensitivity computation
histogramBins: { min: 8, max: 20 },
deathRuinMaxAge: 105,
deathRuinBucket: 5,
```

### 2.25 Other constants

- `RSU_TAX_RATE: 0.45` — flat top-bracket assumption for RSU vest tax
- `disabilityMonths: 6` — months of disability assumed in MC random event
- `salaryVolFloor: 0.20`, `peLockYears: 3`, `peLockHaircut: 0.30`
- `meltdownTarget: 58523` (default = first federal bracket top)
- `WHT_RATE_FOREIGN: 0.15` — withholding tax on foreign dividends
- `DONATION_*`, `FTQ_CSN_*`, `FRV_*`, `EI_*`, `RQAP_*` — see source for charitable giving, FTQ-CSN credit, FRV/LIF rules, payroll deductions

---

## Part 3 — Tax math (`calcTax`, `calcCorpTax`, `calcPayroll`)

### 3.1 `calcTax(inc, yr, prov, infR, retired, divInfo)` — personal income tax

Computes federal + provincial tax on an income figure for a given year, province, with optional dividend info and retiree credits.

**Signature:**
```js
function calcTax(inc, yr, prov, infR, retired, divInfo) { ... }
```

**Inputs:**
- `inc` — non-dividend taxable income in nominal year-`yr` dollars
- `yr` — year offset from `TAX_BASE_YEAR` (2026)
- `prov` — 2-letter province code
- `infR` — annual inflation rate for indexation (default 0.02)
- `retired` — boolean; controls pension + age credits
- `divInfo` — optional `{ eligDiv: cash$, nonEligDiv: cash$ }` for dividend treatment

**Returns:**
```js
{
  total,        // total tax (fed + prov, after surtax)
  fed,          // federal tax (post-credits, post-abatement, post-DTC)
  prov,         // provincial tax (post-credits, post-DTC, post-surtax)
  eff,          // total / cash income (effective rate)
  marg,         // marginal rate (fed*abate + prov, on actual taxable income)
  fedEff, provEff,
  divCredFed, divCredProv,  // dollar value of dividend tax credits applied
  taxableInc    // grossed-up taxable income used in bracket lookup
}
```

**Step-by-step algorithm:**

1. **Indexation factor:** `idx = (1 + infR)^yr`. All thresholds (brackets, BPA, age amount, OAS clawback) are multiplied by `idx`.

2. **Dividend gross-up:**
   ```js
   if (divInfo) {
     eligTaxable = divInfo.eligDiv * 1.38;        // 38% gross-up
     nonEligTaxable = divInfo.nonEligDiv * 1.15;  // 15% gross-up
   }
   var totalTaxableInc = inc + eligTaxable + nonEligTaxable;
   ```
   Bracket lookups always use `totalTaxableInc` (post-gross-up), matching CRA T1 General.

3. **Zero-income early exit:** Returns `{ total: 0, …, marg: 0.14 }` if `totalTaxableInc <= 0`.

4. **Federal bracket walk:**
   ```js
   var fb = FED_BRACKETS.map(v => v * idx);  // indexed thresholds
   var fed = 0, prev = 0;
   for (i = 0; i < fb.length; i++) {
     if (totalTaxableInc <= fb[i]) { fed += (totalTaxableInc - prev) * fr[i]; break; }
     fed += (fb[i] - prev) * fr[i];
     prev = fb[i];
     if (i === fb.length - 1) fed += (totalTaxableInc - fb[i]) * fr[i + 1]; // top bracket
   }
   ```

5. **Federal credits (subtracted at 15%):**
   - **BPA:** `fpd = 16452 * idx`, credit = `fpd * 0.14` (at lowest rate 14%, not 15%, per CRA — this matches the engine's first rate of 0.14)
   - **Pension credit (if retired):** `min(2000 * idx, eligible_pension) × 0.15`
   - **Age credit (if retired):** `max(0, 8790*idx − 0.15 × max(0, totalTaxableInc − 44325*idx)) × 0.15`

   ```js
   fed = max(0, fed - fpd*fr[0] - (retired ? penCreditMax * 0.15 : 0)
                                - (retired ? ageCreditAmt * 0.15 : 0));
   ```

6. **QC abatement:**
   ```js
   fed *= pt.abate;  // QC: × 0.835 (16.5% reduction); all other prov: × 1
   ```

7. **Federal dividend tax credit** (applied **after** abatement — see Part 14 §14.1 for the flagged ordering issue):
   ```js
   var divCredFed = eligTaxable * 0.150198 + nonEligTaxable * 0.090301;
   fed = max(0, fed - divCredFed);
   ```

8. **Provincial bracket walk:** Identical structure to federal, using `pt.b`, `pt.r`, indexed by `idx`.

9. **Provincial credits:** BPA (`pd`), age amount (with optional ageThresh phase-out), pension amount (`penAmt`). All applied at the **lowest provincial rate** (`pr2[0]`).

10. **ON surtax** (Ontario only):
    ```js
    if (prov === "ON") {
      if (ptax > C.ON_SURTAX_THR1 * idx) onSur += (ptax - C.ON_SURTAX_THR1 * idx) * 0.20;
      if (ptax > C.ON_SURTAX_THR2 * idx) onSur += (ptax - C.ON_SURTAX_THR2 * idx) * 0.36;
      ptax += onSur;
    }
    ```
    Surtax applies AFTER all non-refundable credits, BEFORE total summation, per ON Form 428.

11. **Provincial dividend credits:**
    ```js
    var provEligCr = eligTaxable * pt.eligDivCr;
    var provNonEligCr = nonEligTaxable * pt.nonEligDivCr;
    ptax = max(0, ptax - provEligCr - provNonEligCr);
    ```
    Note: this is **before** the ON surtax in the engine — confirm whether ON Form 428 has the order reversed.

12. **Total + marginal rate:**
    ```js
    total = max(0, fed) + max(0, ptax);
    marg = fedMarg * pt.abate + provMarg;
    ```
    Marginal rates `fedMarg` and `provMarg` are looked up by walking brackets one more time.

13. **Effective rate:**
    ```js
    var cashInc = inc + (divInfo ? divInfo.eligDiv + divInfo.nonEligDiv : 0);
    eff = cashInc > 0 ? total / cashInc : 0;
    ```
    Note: divisor is **cash income**, not grossed-up taxable income, so eff% is comparable to take-home reasoning.

### 3.2 `calcCorpTax(activeIncome, passiveIncome, prov, yr, infR)` — CCPC tax

```js
function calcCorpTax(activeIncome, passiveIncome, prov, yr, infR) {
  var idx = Math.pow(1 + (infR || 0.02), yr || 0);
  var sbd = C.SBD_LIMIT * idx; // $500K business limit, indexed
  // Passive income grind: SBD reduced $5/$1 of passive income above $50K
  var passiveGrind = max(0, passiveIncome - C.PASSIVE_GRIND_THRESHOLD * idx);
  var adjustedSBD = max(0, sbd - 5 * passiveGrind);
  var cr = CORP_RATES[prov] || CORP_RATES.QC;
  var smallBizInc = min(max(0, activeIncome), adjustedSBD);
  var generalInc = max(0, activeIncome - adjustedSBD);
  var activeTax = smallBizInc * cr.small + generalInc * cr.general;
  // Passive taxed at ~50%
  var passiveTax = max(0, passiveIncome) * cr.passive;
  // RDTOH: ~30.67% of passive added to refundable pool
  var rdtohAdded = max(0, passiveIncome) * 0.3067;
  return {
    activeTax, passiveTax, totalTax: activeTax + passiveTax,
    rdtohAdded,
    smallBizPortion: smallBizInc,    // → eligible for non-eligible dividends
    generalPortion: generalInc,       // → GRIP, can pay eligible dividends
    adjustedSBD,
    effectiveRate: totalInc > 0 ? totalTax / totalInc : 0
  };
}
```

**SBD passive grind** is the centrepiece: every $1 of passive investment income above $50,000 reduces the business limit by $5. At $200K passive ($150K above threshold), `adjustedSBD = 500,000 − 5×150,000 = −250,000 → clamped to 0`. All active income then taxed at general rate.

**Combined CCPC rates** (per `CORP_RATES`):
- QC / ON: small 12.2%, general 26.5%, passive 50.17%
- BC: small 11.0%, general 27.0%, passive 50.67%
- AB: small 11.0%, general 23.0%, passive 46.67%
- (etc., one entry per province)

### 3.3 `calcPayroll(sal, prov, yr, infR)` — employee payroll deductions

Returns dollar amount of CPP/QPP + EI (+ RQAP for QC) deducted from gross salary.

```js
function calcPayroll(sal, prov, yr, infR) {
  if (sal <= 0) return 0;
  var inf = Math.pow(1 + (infR || 0.02), yr || 0);
  var isQC = (prov || "QC") === "QC";

  // QPP/CPP: rate × pensionable earnings ($3,500-YMPE)
  var qppExempt = 3500 * inf;
  var qppMax = QPP_MGA * inf;     // 74600 indexed
  var qppPensionable = max(0, min(sal, qppMax) - qppExempt);
  var qppRate = isQC ? 0.064 : 0.0595;
  var qpp = qppPensionable * qppRate;

  // QPP2/CPP2: 4% on YMPE-YAMPE ($74,600 - $85,000)
  var qpp2Max = QPP_YAMPE * inf;
  var qpp2Pensionable = max(0, min(sal, qpp2Max) - qppMax);
  var qpp2 = qpp2Pensionable * 0.04;

  // EI
  var eiMIE = 65700 * inf;
  var eiRate = isQC ? 0.0127 : 0.0158;
  var ei = min(sal, eiMIE) * eiRate;

  // RQAP (QC parental insurance, QC only)
  var rqap = isQC ? min(sal, 94000 * inf) * 0.00494 : 0;

  return Math.round(qpp + qpp2 + ei + rqap);
}
```

This function is **not** called as part of the simulation loop — it's used by report-side derivations (e.g., to display gross-to-net pay on the cash flow). The MC loop computes income net of payroll implicitly via the salary path.

---

## Part 4 — Government benefits (`calcQPP`, `calcOAS`, `calcGIS`)

### 4.1 `calcQPP(startAge, avgEarn, yrsContrib)` — CPP/QPP monthly benefit

Returns base monthly benefit (in 2026 dollars) at start age, given lifetime average earnings and years of contribution.

```js
function calcQPP(startAge, avgEarn, yrsContrib) {
  var maxM = QPP_MAX_MONTHLY;          // 1507.65
  var mga = QPP_MGA;                    // 74600
  var ratio = min(1, avgEarn / mga) * min(1, yrsContrib / 40);
  var adj = 1;
  if (startAge < 65) adj = 1 - 0.006 * (65 - startAge) * 12;  // -0.6%/mo early
  else if (startAge > 65) adj = 1 + 0.007 * (startAge - 65) * 12;  // +0.7%/mo late
  adj = max(0.64, min(1.42, adj));     // [-36%, +42%]
  var base = maxM * ratio * adj;
  // CPP2 enhancement on YMPE-YAMPE earnings
  var rrq2 = avgEarn > mga ? 81 * min(1, (min(avgEarn, 85000) - 74600) / (85000 - 74600))
                                * min(1, yrsContrib / 40) * adj : 0;
  return base + rrq2;
}
```

**Worked examples:**

| startAge | avgEarn | yrsContrib | result |
|----------|---------|------------|--------|
| 65 | $74,600 | 40 | $1,507.65 (max) |
| 60 | $74,600 | 40 | $1,507.65 × 0.64 = $964.90 |
| 70 | $74,600 | 40 | $1,507.65 × 1.42 = $2,140.86 |
| 65 | $74,600 | 20 | $1,507.65 × 0.5 = $753.83 |
| 65 | $35,000 | 40 | $1,507.65 × (35000/74600) = $707.30 |
| 65 | $85,000 | 40 | $1,507.65 + $81 = $1,588.65 (full CPP2) |

Boundary clamps at 0.64 and 1.42 are intentional — they protect against typo-level startAge values (the actual 60-year window is 60–70).

### 4.2 `calcOAS(startAge, income, yr, infR, currentAge)` — OAS monthly benefit

```js
function calcOAS(startAge, income, yr, infR, currentAge) {
  var idxO = Math.pow(1 + (infR || 0.02), yr || 0);
  var maxM = OAS_MAX_MONTHLY * idxO;     // 742.31 indexed
  var adj = 1;
  if (startAge > 65) adj = 1 + 0.006 * (startAge - 65) * 12;  // +0.6%/mo deferral
  adj = min(1.36, adj);                   // cap at 60-month deferral
  var oas = maxM * adj;
  if ((currentAge || startAge) >= 75) oas *= 1.10;   // 75+ enhancement
  var oasThr = OAS_CLAWBACK_THR * idxO;   // 95323 indexed
  if (income > oasThr) oas = max(0, oas - (income - oasThr) * 0.15 / 12);
  return oas;
}
```

**Key behaviour:**

- `startAge` controls the deferral bonus only (one-time decision at start).
- `currentAge` controls the 75+ bonus — a person who started OAS at 65 still gets 1.10× when they turn 75.
- Clawback uses **monthly** reduction — `(income − thr) × 15% ÷ 12`.
- Income passed in is **annual taxable** income in current-year nominal dollars; threshold is indexed.
- `oasClbThrFor(age, baseAge, inf)` is a helper that returns the indexed threshold for a given age — used inside `optimizeDecum` and `runMC` to ensure clawback comparisons are always against the indexed value.

### 4.3 `calcGIS(age, nonOASincome, yr, infR, hasSpouse, employmentInc)` — GIS supplement

```js
function calcGIS(age, nonOASincome, yr, infR, hasSpouse, employmentInc) {
  if (age < 65) return 0;
  var idx = Math.pow(1 + (infR || 0.02), yr || 0);
  var maxGIS = (hasSpouse ? GIS_MAX_COUPLE : GIS_MAX_SINGLE) * idx;

  // Employment income exemption (Bill C-19, applied 2025+)
  var empInc = max(0, employmentInc || 0);
  var empCountable = 0;
  if (empInc > 15000) {
    // First $5K exempt, next $10K @ 50%, rest @ 100%
    empCountable = 5000 + (empInc - 15000);
  } else if (empInc > 5000) {
    empCountable = (empInc - 5000) * 0.5;
  }
  // Non-employment income unchanged
  var nonEmpInc = max(0, nonOASincome - empInc);
  var adjIncome = nonEmpInc + empCountable;

  var reduction = adjIncome * 0.5 / 12;   // 50¢ per $1 of countable income
  return max(0, maxGIS - reduction);
}
```

**The 50¢ clawback** is the dominant feature: every $1 of taxable income (post employment exemption) reduces GIS by $0.50/yr (~$0.04/mo). For low-income retirees, **drawing from RRSP is double-taxed in effect** — once at marginal rate, then again as GIS reduction.

The engine's `optimizeDecum` implements a `gisEligible` flag (line 4943) that checks `fixedTaxable / infM < 22000` and routes withdrawals to TFSA/NR first to protect GIS.

---

## Part 5 — Withdrawal floors (`getRRIFMin`, `oasClbThrFor`)

### 5.1 `getRRIFMin(age, bal)`

```js
function getRRIFMin(age, bal) {
  return age >= 95 ? bal * 0.2
       : RRIF[age] ? bal * RRIF[age]
       : age >= 71 ? bal * 0.2
       : 0;
}
```

- Ages < 71: returns 0 (RRIF withdrawals not yet mandatory; RRSP can stay an RRSP).
- Ages 71–94: indexes into the CRA prescribed-rate table (`C.RRIF_MIN`).
- Ages 95+: flat 20% (matches CRA's final published row).
- The fall-through `age >= 71 ? bal * 0.2` catches the case where `age` is in [71, 94] but happens to be a non-integer or somehow misses the table lookup — defensive.

### 5.2 `oasClbThrFor(age, baseAge, inf)`

```js
function oasClbThrFor(age, baseAge, inf) {
  var yrs = max(0, (age || 0) - (baseAge || 0));
  return OAS_CLAWBACK_THR * Math.pow(1 + (inf || 0), yrs);
}
```

Wraps the clawback-threshold indexation. Used everywhere OAS clawback is checked against a per-year `taxInc`. Without this helper (or equivalent), comparisons would mix nominal year-Y income against unindexed 2026 threshold and over-state clawback years.

---

## Part 6 — Stochastic primitives

### 6.1 `chol(m)` — Cholesky decomposition

```js
function chol(m) {
  var n = m.length, L = m.map(r => r.map(() => 0));
  for (var i = 0; i < n; i++) for (var j = 0; j <= i; j++) {
    var s = 0;
    for (var k = 0; k < j; k++) s += L[i][k] * L[j][k];
    L[i][j] = i === j
      ? Math.sqrt(Math.max(1e-3, m[i][i] - s))   // diagonal: floor at √0.001 to handle non-PSD
      : (m[i][j] - s) / (L[j][j] || 1);          // off-diagonal
  }
  return L;
}
```

Standard lower-triangular Cholesky. The `Math.max(1e-3, ...)` floor on diagonal entries protects against non-positive-definite correlation matrices (which would otherwise cause `Math.sqrt(negative) → NaN`). Tiny noise injection; doesn't materially distort PSD inputs.

Precomputed at module load:
```js
var CHL = chol(CRM);            // 5×5 base
var CHL_CRISIS = chol(CRM_CRISIS); // 5×5 stressed
var CHL8 = chol(CRM8);          // 8×8 multi-asset
var CHL8_CRISIS = chol(CRM8_CRISIS);
```

### 6.2 `tRn(df)` — t-distribution sampler

```js
function tRn(df) {
  var u = Math.random(), v = Math.random();
  var z = Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * v);
  if (!df || df > 30) return z;     // t with df > 30 ≈ normal
  var c2 = 0;
  for (var i = 0; i < df; i++) {
    var x = Math.sqrt(-2 * Math.log(Math.max(Math.random(), 1e-10))) * Math.cos(2 * Math.PI * Math.random());
    c2 += x * x;                     // sum of df independent N(0,1)² = chi-square(df)
  }
  return z / Math.sqrt(c2 / df);     // standard t-distribution
}
```

- Box-Muller generates standard normals.
- Chi-square sample built from `df` independent N(0,1)² draws.
- For `df > 30` (or undefined), returns plain normal (t converges to normal).
- BuildFi typically uses `df = 5` (`p.fatT = true`), giving fat-tailed returns (kurtosis ~6 vs normal kurtosis 3). Without fat tails (`p.fatT = false`), the engine passes `df = 999` ≈ normal.

### 6.3 `stochDeath(startAge, sexCode)` — stochastic death age

```js
function stochDeath(startAge, sexCode) {
  var tbl = sexCode === "F" ? CPM_F : CPM_M;
  var age = startAge;
  var impYrs = 2026 - 2023;             // 3 years of mortality improvement applied at start
  while (age <= 105) {
    var baseQx = tbl[Math.floor(age)] || tbl[Math.min(100, Math.floor(age / 5) * 5)] || 1e-3;
    var qx = baseQx * Math.pow(0.99, impYrs + (age - startAge));  // 1%/yr improvement
    if (Math.random() < qx) return age;
    age++;
  }
  return 105;                           // CPM cap
}
```

- Uses CPM-2014 base rates (the `CPM_M` / `CPM_F` tables) with annual mortality improvement of 1%/year compounding from 2023 (Scale MI-2017 approximation).
- Walks year-by-year until either Bernoulli trial fires (death) or reaches 105 (cap).
- Empirical life expectancy at 65: ~86 (M), ~88.5 (F) — matches CIA published tables.
- Non-integer `startAge` is floored when looking up the base rate.

### 6.4 `sMul(age, retAge, goP, slP, noP, slAge, noAge)` — Blanchett spending smile

```js
function sMul(age, ra, g, sl, n, slAge, noAge) {
  if (age < ra) return 0;
  var s1 = slAge || Math.max(ra + 10, 75);
  var s2 = noAge || Math.max(s1 + 10, 85);
  if (age < s1) return g;       // Go-Go phase
  if (age < s2) return sl;      // Slow-Go phase
  return n;                     // No-Go phase
}
```

Returns the spending-multiplier in the year `age` for someone retired at `ra`:
- **Go-Go** (typically retAge → 75): full spending (`goP`, default 1.0)
- **Slow-Go** (75 → 85): reduced (`slP`, default 0.85 deterministic / 0.82 MC)
- **No-Go** (85+): further reduced (`noP`, default 0.75 / 0.92 MC)

Pre-retirement: returns 0 (spending is zero in the engine pre-retirement; salary funds living standard implicitly via the contributions).

### 6.5 `pCr(pi, age)` — pension credit value

```js
function pCr(pi, age) {
  return age < 65 || pi <= 0 ? 0 : Math.min(2000, pi) * (0.15 * 0.835 + 0.14);
}
```

Returns the **dollar value** of the federal+QC pension credit on `pi` of eligible pension income at `age`.
- `min(2000, pi)`: only first $2,000 of eligible pension income qualifies.
- `0.15 * 0.835 + 0.14`: federal credit (15%, post-QC abatement) + QC credit (14% lowest provincial rate). This is hard-coded for QC — other provinces use `pt.penAmt` inside `calcTax`.

### 6.6 `blendRet`, `blendMulti`, `resolveAlloc`

```js
function blendRet(eqRet, bondRet, eqPct) {
  return eqRet * eqPct + bondRet * (1 - eqPct);  // 2-class portfolio return
}

function blendMulti(rets, alloc) {
  return rets.can * alloc.can + rets.us * alloc.us + rets.intl * alloc.intl
       + rets.em * alloc.em + rets.bnd * alloc.bnd;  // 5-component blend
}

function resolveAlloc(p, acctKey) {
  // Per-account override → global multiAsset → default
  if (p.allocOverride && p.allocOverride[acctKey]) return p.allocOverride[acctKey];
  return p.assetAlloc || { can: 0.25, us: 0.35, intl: 0.20, em: 0.05, bnd: 0.15 };
}
```

---

## Part 7 — Auxiliary functions

### 7.1 `divEligibleFactor(prov)`

Returns a province-specific factor (~0.5–0.8) used in `calcNRItemizedTax` to convert from "marginal rate" to "effective tax rate on Canadian eligible dividends" (after gross-up + DTC).

```js
var _DIV_ELIG_FACTOR = {
  QC: 0.75, ON: 0.73, BC: 0.68, AB: 0.71, SK: 0.68, MB: 0.76, NB: 0.70,
  NS: 0.79, PE: 0.75, NL: 0.80, YT: 0.54, NT: 0.58, NU: 0.62
};
function divEligibleFactor(prov) {
  return (_DIV_ELIG_FACTOR[prov] != null) ? _DIV_ELIG_FACTOR[prov] : 0.70;
}
```

Derived from EY 2026 personal tax rate tables, top-bracket effective eligible-dividend rates ÷ top marginal rates. Slightly understates benefit at lower incomes (DTC has a larger absolute effect in lower brackets).

### 7.2 `calcNRItemizedTax(nrBal, retNR_gross, alloc, margRate, bndR, prov)`

Itemized tax on a non-registered account, decomposing total return into dividend / interest / capital gain components and taxing each by its CRA treatment.

```js
function calcNRItemizedTax(nrBal, retNR_gross, alloc, margRate, bndR, prov) {
  if (nrBal <= 0) return 0;
  var turnover = 0.10;          // passive ETF turnover assumption
  var divCAN = nrBal * alloc.can * 0.030;       // 3% Cdn dividend yield
  var divUS = nrBal * alloc.us * 0.015;         // 1.5% US dividend yield
  var divINTL = nrBal * (alloc.intl + alloc.em) * 0.020;
  var interest = nrBal * alloc.bnd * Math.max(0, bndR);
  var totalReturn = nrBal * retNR_gross;
  var distributed = divCAN + divUS + divINTL + interest;
  var capGain = Math.max(0, totalReturn - distributed);

  var taxDivCAN = divCAN * margRate * divEligibleFactor(prov);    // eligible-div effective tax
  var whtUS = divUS * 0.15;                                        // foreign WHT paid
  var whtINTL = divINTL * 0.15;
  var taxDivForeign = Math.max(0, (divUS + divINTL) * margRate - whtUS - whtINTL); // net of FTC
  var taxInterest = interest * margRate;

  // Capital gains: $250K split applied to REALIZED portion only
  var capGainRealized = capGain * turnover;                        // turnover-based realization
  var CG_THR = 250000;
  var taxableCG = capGainRealized > CG_THR
    ? CG_THR * 0.50 + (capGainRealized - CG_THR) * 0.6667
    : capGainRealized * 0.50;
  var taxCapGain = taxableCG * margRate;

  return Math.max(0, taxDivCAN + taxDivForeign + taxInterest + taxCapGain);
}
```

Used in `optimizeDecum` and `runMC` when `p.multiAsset === true` — replaces the simplified `nrTaxDrag` constant (default 0.9%) with itemized tax flows.

### 7.3 `calcWHT(alloc, acctType)`

Foreign withholding-tax drag on dividends from inside RRSPs and TFSAs.

```js
function calcWHT(alloc, acctType) {
  if (acctType === 'rrsp') {
    // RRSP: US WHT exempt by treaty; INTL/EM = 15%
    return alloc.intl * 0.020 * 0.15 + alloc.em * 0.020 * 0.15;
  } else if (acctType === 'tfsa') {
    // TFSA: US = 15% (no treaty exemption), INTL/EM = 15%
    return alloc.us * 0.015 * 0.15 + alloc.intl * 0.020 * 0.15 + alloc.em * 0.020 * 0.15;
  }
  return 0; // NR handled via itemized tax
}
```

Tiny absolute drag (<0.5%) but it compounds over 30+ year horizons.

---

## Part 8 — Registered accounts encyclopedia

### 8.1 RRSP (`p.rrsp`, `p.rrspC`)

- Contributions deductible in year made (engine doesn't model contribution tax savings explicitly because `p.sal` is gross — net-of-tax is computed by `calcTax`).
- Annual contribution capped at `Math.min(p.rrspC || 0, …)` — the engine does NOT enforce CRA's 18%-of-prior-year-income contribution cap; it trusts the user input.
- Grows at `retRR = blendRet(eqRet, bondRet, allocR) − merR` (or `blendMulti − merR − calcWHT(.., 'rrsp')` in multi-asset mode).
- Mandatory conversion to RRIF at age 71 (engine doesn't explicitly convert — but `getRRIFMin(age, rr)` returns 0 below 71, then the prescribed rate from 71 onward, automatically forcing minimum withdrawals).
- Withdrawals fully taxable as ordinary income.

### 8.2 TFSA (`p.tfsa`, `p.tfsaC`)

- **TFSA room tracking** is unique among engine accounts:
  ```js
  var _tfsaYrs18 = max(0, min(p.age - 17, 18)); // years eligible since 2009 launch (max 18)
  var _tfsaCumLim = /* historical cumulative limits 2009→2026 */;
  var _tfsaNetContrib = min(tf, _tfsaCumLim);   // conservative: assume balance is contrib + gains
  var tfsaRoom = max(0, _tfsaCumLim - _tfsaNetContrib);
  ```
- New room each year: `Math.round(7000 * (1+inf)^y / 500) * 500` (rounded to nearest $500 per CRA).
- **Restored room from prior-year withdrawals**: `_tfsaLastYrWith` accumulates withdrawals during year Y, added to `tfsaRoom` at start of year Y+1.
- Contributions capped at `Math.min(p.tfsaC, tfsaRoom)`.
- Withdrawals tax-free, do NOT affect GIS or OAS clawback.

### 8.3 Non-registered (`p.nr`, `p.nrC`)

- Two accounting modes:
  - **Simplified** (`p.multiAsset !== true`): grows at `eqRet*allocN + bndRet*(1-allocN) - merN - nrTaxDrag` where `nrTaxDrag` is a flat 0.9% drag.
  - **Itemized** (`p.multiAsset === true`): grows at gross return, then `calcNRItemizedTax` deducts dividend / interest / cap-gain tax explicitly.
- ACB tracking: `nrACB = p.costBase || nr` initially; updated when shares vest from RSU or proceeds from FHSA/property sale flow in.

### 8.4 FHSA / CELIAPP (`p.fhsaBal`, `p.fhsaC`, `p.fhsaForHome`, `p.fhsaHomeAge`)

- Contributions tax-deductible (like RRSP), withdrawals for first home tax-free (like TFSA).
- $40K lifetime / $8K annual limit (`FHSA_LIFETIME_MAX`, `FHSA_ANNUAL_LIMIT`).
- Account closes at age 71 OR after 15 years (whichever first) — at close, balance rolls to RRSP.
- If `p.fhsaForHome === true` and `age === p.fhsaHomeAge`: balance rolls to NR (non-taxable as it's a qualifying withdrawal), modeling first home purchase.

```js
if (fhsa > 0 || fhsaContrib < fhsaMax) {
  fhsa *= (1 + retTF);  // grows tax-free like TFSA
  if (!retired && fhsaContrib < fhsaMax) {
    var fhsaAdd = Math.min(p.fhsaC || 0, 8000, fhsaMax - fhsaContrib);
    fhsa += fhsaAdd;
    fhsaContrib += fhsaAdd;
  }
  // Home purchase
  if (p.fhsaForHome && age === p.fhsaHomeAge && fhsa > 0) {
    nr += fhsa; nrACB += fhsa;
    fhsa = 0; fhsaContrib = fhsaMax;  // close
  }
  // Mandatory rollover at 71 or 15 yrs
  var _fhsaYrsOpen = y + Math.min(5, Math.ceil((p.fhsaBal || 0) / 8000));
  if ((age >= 71 || _fhsaYrsOpen >= 15) && fhsa > 0 && !p.fhsaForHome) {
    rr += fhsa;  // roll to RRSP, no room consumed
    fhsa = 0;
  }
}
```

### 8.5 RESP (`p.respOn`, `p.respContrib`, `p.respYrsLeft`, `p.respKids`, `p.respReturnAge`, `p.respAlready`)

- Federal CESG match: 20% of first $2,500 contributed annually per child (`CESG_MAX_ELIGIBLE_ANNUAL`, `CESG_MATCH_RATE`).
- Engine treatment: RESP contributions are **deducted from NR account** during accumulation years (modelled as a parallel sleeve). The engine's `respOn` flag drives this debit but the explicit RESP balance is not tracked as a separate top-level field in the result schema — it's an outflow from NR.
- Test coverage: see `T("RESP","Reduces NR", ...)` test at line 3085.

### 8.6 LIRA (`p.liraBal`, `p.cLiraBal`)

- Locked-in retirement account from prior employment.
- Treated identically to RRSP for return + tax purposes; difference is **withdrawal restrictions** (LIRA → LIF/FRV with min/max annual draws).
- Engine carries `lira` and `cLira` balances through the simulation but doesn't enforce LIF max-withdrawal rules separately — they're folded into the global withdrawal target.

### 8.7 IPP (`p.ippOn`, `p.ippBal`, `p.ippBal2`)

Individual Pension Plan — for incorporated professionals.

- Higher contribution limits than RRSP (employer + employee).
- Modeled via `_ippBal` carried through `runMC` (line 5730).
- Rolls to RRSP-equivalent treatment at retirement.

### 8.8 PE / Private Equity (`p.peBal`, `p.peY`, `p.peV`, `p.peFee`, `p.peLock`, `p.peExit`, `p.peExitStrat`, `p.peExitYrs`)

- Higher expected return (12% default), higher volatility (25%), illiquid.
- 3-year lockup with 30% exit haircut (`peLockYears`, `peLockHaircut`) when forced to exit early.
- Exit via scheduled liquidation (`peExitStrat` ∈ "linear" | "balloon" | …) over `peExitYrs`.

### 8.9 PM / Private Mortgage (`p.pmBal`, `p.pmY`, `p.pmV`, `p.pmExit`, …)

- Lower return (3%), lower vol (15%), debt-like.
- Same exit mechanics as PE.

### 8.10 DC / Defined Contribution Pension (`p.dcBal`, `p.dc2Bal`)

- Employer-sponsored DC plan balance.
- Default 4% annual withdrawal rate during retirement (`dcWithdrawalRate`).
- Converts to RRIF at age 72 (`dcRrifConversionAge`).

### 8.11 RPDB / RREGOP / Public Pension (via `p.penType`)

- `penType ∈ {"db", "cd", "rpdb", "rrs", "rver", "none"}`
- DB ("db"): pays `p.penM`/month, indexed if `p.penIdx === true`, partially indexed at 50% otherwise.
- CD/RPDB/RRS/RVER: treated as DC (4% draw).
- Bridge benefit: if `p.bridge === true`, pays `p.brAmt`/month from retirement until `p.brEnd` age (typically 65, when CPP/QPP starts).

### 8.12 NR with foreign assets (multi-asset mode)

When `p.multiAsset === true`:
- Allocation defined per asset class via `p.assetAlloc` or per-account via `p.allocOverride`.
- Foreign WHT applied per `calcWHT` (RRSP exempt for US; TFSA + NR not).
- Itemized tax via `calcNRItemizedTax`.

### 8.13 CCPC / Corporate (`p.bizOn`, `p.bizRevenue`, `p.bizExpenses`, `p.bizRetainedEarnings`, `p.bizSaleAge`, …)

- `corpBal` carried through MC; grows with retained earnings (revenue × margin − corp tax via `calcCorpTax`).
- Salary vs dividend extraction split via `p.bizSalaryPct`.
- Sale at `p.bizSaleAge`: `bizSalePrice` realized, `bizSaleACB` deducted, capital gain treated under CCPC LCGE if applicable (`p.bizLCGE`).

---

## Part 9 — Deterministic engine (`optimizeDecum`)

### 9.1 Purpose

Single deterministic year-by-year projection. Used:
- For the in-page "Projection déterministe" table.
- Inside MC for the first sim only (`si === 0`) when `runMC` needs a deterministic anchor.

Returns `{ schedule, totalTax, totalGIS, oasClawbackYrs, finalBal, retStart }`.

### 9.2 Setup phase

```js
function optimizeDecum(p) {
  if (p.deathAge == null || isNaN(p.deathAge)) p.deathAge = 90;  // P0 guard
  var maxYrs = p.deathAge - p.age;
  var schedule = [];
  var rr = p.rrsp || 0, tf = p.tfsa || 0, nr = p.nr || 0;
  // TFSA cumulative room: full historical schedule from 2009
  var _tfsaYrs18 = ... ;
  var _tfsaCumLim = ... ;  // sum of $5K/yr × 4yrs + $5.5K/yr × 2yrs + $10K/yr × 1yr + ...
  var tfsaRoom = max(0, _tfsaCumLim - min(tf, _tfsaCumLim));
  var fhsa = p.fhsaBal || 0, ...;
  var nrACB = p.costBase || nr;
  var crr, ctf, cnr, cFhsa /* spousal balances if cOn */;
  var reVals = (p.props || []).filter(pr => pr.on).map(...);

  var inf = p.inf || 0.021;
  var eqRet = p.eqRet || 0.07, bndRet = p.bndRet || 0.035;
  var allocR = p.allocR || 0.6, allocT = p.allocT || 0.8, allocN = p.allocN || 0.5;
  // Multi-asset returns
  var _detMA = p.multiAsset === true;
  if (_detMA) {
    retRR = blendMulti(rets, _dAllocRR) - merR - calcWHT(_dAllocRR, 'rrsp');
    retTF = blendMulti(rets, _dAllocTF) - merT - calcWHT(_dAllocTF, 'tfsa');
    retNR = blendMulti(rets, _detAllocNR) - merN;  // NR tax via calcNRItemizedTax
  } else {
    retRR = eqRet * allocR + bndRet * (1 - allocR) - merR;
    retTF = eqRet * allocT + bndRet * (1 - allocT) - merT;
    retNR = eqRet * allocN + bndRet * (1 - allocN) - merN;
  }
```

### 9.3 Main loop — one iteration per year

For `y = 0` to `maxYrs`:

#### 9.3.a Age & survivor handling

```js
var age = p.age + y;
var infM = Math.pow(1 + inf, y);
var retired = age >= p.retAge;
var cAge2 = p.cOn ? p.cAge + y : 0;
var cRetired = p.cOn && cAge2 >= (p.cRetAge || p.retAge);
var cAlive = p.cOn && cAge2 <= cSimDeath;

// Spousal rollover at death
if (p.cOn && !cAlive && cAge2 === cSimDeath + 1) {
  rr += crr; tf += ctf; nr += cnr;  // accounts roll to surviving spouse
  crr = 0; ctf = 0; cnr = 0;
}
```

#### 9.3.b Government income

```js
var qpp = age >= p.qppAge ? calcQPP(p.qppAge, p.avgE, p.qppYrs) * 12 * infM : 0;
var oas = age >= p.oasAge ? calcOAS(p.oasAge, 0, y, inf, age) * 12 : 0;  // first pass without clawback

var penMonth = 0;
if (p.penType === "db" && retired) {
  penMonth = (p.penM || 0) * (p.penIdx ? infM : 1);
  if (p.bridge && age < p.brEnd) penMonth += (p.brAmt || 0);
}
if (["cd","rpdb","rrs","rver"].indexOf(p.penType) >= 0 && retired) {
  penMonth = (p.dcBal || 0) * 0.04 / 12;
}
var ptInc = retired && p.ptM > 0 && y < p.ptYrs ? p.ptM * 12 * infM : 0;  // part-time inc
var penAnn = penMonth * 12;
```

#### 9.3.c Spending (Blanchett smile)

```js
var smileMul = 1;
if (retired) {
  var slA = p.smileSlAge || max(p.retAge + 10, 75);
  var noA = p.smileNoAge || max(slA + 10, 85);
  var hA = p.healthAge || 85;
  if (age < slA) smileMul = p.goP || 1;
  else if (age < noA) smileMul = p.slP || 0.85;
  else smileMul = p.noP || 0.75;
  if (age >= hA) smileMul *= Math.pow(1 + p.healthMul, age - hA + 1);
}
var spending = retired ? (p.retSpM || 0) * 12 * infM * smileMul : 0;
if (p.cOn && cAlive && cRetired) spending += (p.cRetSpM || 0) * 12 * infM * smileMul;
// Goal-based spending (extra)
spending += calcGoalSpending(p.goals, age, infM);
```

#### 9.3.d RRIF mandatory withdrawal

```js
var rrifMin = getRRIFMin(age, rr);
var cRrifMin = p.cOn && cAlive ? getRRIFMin(age + (p.cAge - p.age), crr) : 0;

var fixedTaxable = qpp + penAnn + ptInc + rrifMin + cRrifMin;
```

#### 9.3.e GIS-eligible flag (low-income protection)

```js
var gisEligible = age >= 65 && fixedTaxable / infM < 22000;
```

If true, the optimizer routes withdrawals to TFSA → NR before RRSP, to avoid GIS clawback.

#### 9.3.f OAS recalculation with clawback

```js
if (age >= p.oasAge) {
  var estInc = fixedTaxable + (retired ? max(0, spending - fixedTaxable - oas) * 0.5 : 0);
  oas = calcOAS(p.oasAge, estInc / infM, y, inf, age) * 12;
}
var govInc = qpp + oas + penAnn + ptInc;
```

#### 9.3.g Pre-retirement vs retirement branch

**If pre-retirement (`!retired`):**

```js
rr = rr * (1 + retRR) + (p.rrspC || 0);
var _tfsaAnnLim = Math.round(7000 * (1+inf)^y / 500) * 500;
tfsaRoom += _tfsaAnnLim + _tfsaLastYrWith;
var _tfsaActualC = Math.min(p.tfsaC || 7000, tfsaRoom);
tf = tf * (1 + retTF) + _tfsaActualC;
tfsaRoom -= _tfsaActualC;
nr = (multi-asset path) OR (nr * (1 + retNR - nrTaxDrag) + (p.nrC || 0));
// Spousal accumulation if couple
// RSU vest (deterministic)
// FHSA grow + contrib + auto-rollover at 71
// Snapshot balances + skip retirement branch
schedule.push(row); continue;
```

**If retirement (`retired`):**

The optimizer runs through this multi-step decision sequence:

##### Step 1 — Apply RRIF minimum (mandatory)

```js
if (rrifMin > 0) rr = max(0, rr - rrifMin);
if (cRrifMin > 0) crr = max(0, crr - cRrifMin);
```

##### Step 2 — Compute net spending need

```js
var totalFixed = govInc + rrifMin + cRrifMin;
var need = max(0, spending - totalFixed);
```

##### Step 3 — Meltdown logic

If `p.melt === true` and `age < 72` and RRSP > 0:

```js
var _rawMeltTarget = 0;
if (age < p.qppAge) {
  // Pre-QPP: fill the first federal bracket from RRSP
  _rawMeltTarget = max(0, fedBr1 - fixedTaxable);
} else {
  // Post-QPP: fill up to OAS clawback OR second bracket (whichever lower)
  var roomToOAS = max(0, oasClawThr - fixedTaxable);
  var roomToBr2 = max(0, fedBr2 - fixedTaxable);
  _rawMeltTarget = min(roomToOAS, roomToBr2);
  if (age >= 65 && fixedTaxable < penCreditMax + qpp) {
    _rawMeltTarget = max(_rawMeltTarget, penCreditMax);  // ensure pension credit captured
  }
  _rawMeltTarget = max(0, _rawMeltTarget - rrifMin);
}

// Smoothing: max year-to-year change capped at 40% (or $5K floor)
var _prevMelt = schedule[length-1].meltdown || 0;
var _meltMaxChg = max(_prevMelt * 0.40, 5000);
meltAmt = min(rr, max(
  max(0, _prevMelt - _meltMaxChg),
  min(_rawMeltTarget, _prevMelt + _meltMaxChg)
));
if (meltAmt > 0) rr -= meltAmt;
```

Excess meltdown (above spending need) is parked in TFSA if room exists.

##### Step 4 — Determine source for remaining need

```js
need = max(0, need - meltAmt);

// NR depletion target (smooth over remaining horizon)
var _nrDepYrs = max(5, min(20, (p.deathAge - age) * 0.5));
var _retYrIdx = max(0, age - p.retAge);
var _nrTarget = nr > 0 ? nr / max(1, _nrDepYrs - _retYrIdx) : 0;
_nrTarget = min(_nrTarget, max(need, 1) * 1.5);  // cap at 1.5× need

var totalTaxable = fixedTaxable + meltAmt;
var oasRisk = totalTaxable > oasClawThr * 0.85;

if (gisEligible || oasRisk) {
  // Protect GIS/OAS: NR → TFSA → RRSP order
  wNR = min(nr, max(need, _nrTarget)); nr -= wNR; need -= wNR;
  wTF = min(tf, need); tf -= wTF; need -= wTF;
  wRR = min(rr, need); rr -= wRR; need -= wRR;
} else {
  // Normal: NR (target) → RRSP (up to OAS clawback room) → TFSA
  wNR = min(nr, max(need, _nrTarget)); nr -= wNR; need -= wNR;
  rrspRoom = max(0, oasClawThr - totalTaxable);
  wRR = min(rr, min(need, rrspRoom)); rr -= wRR; need -= wRR;
  wTF = min(tf, need); tf -= wTF; need -= wTF;
  if (need > 0) {
    // Final pass: tap remaining RRSP if TFSA exhausted
    wRR2 = min(rr, need); rr -= wRR2; need -= wRR2;
  }
}

// Spousal accounts as last resort
if (need > 0 && p.cOn) {
  wCR = min(crr, need); crr -= wCR; need -= wCR;
  wCT = min(ctf, need); ctf -= wCT; need -= wCT;
  wCNR = min(cnr, need); cnr -= wCNR; need -= wCNR;
}

// HELOC as emergency
if (need > 0) {
  for (each property) {
    helocRoom = max(0, val * 0.65 - mb - heloc);
    helocDraw = min(need, helocRoom);
    heloc += helocDraw; need -= helocDraw;
  }
}

// Forced sale if still short
if (need > 0 && retired) {
  // 1. Sell rentals (cheapest equity first), proceeds to TFSA → NR
  // 2. Sell primary residence last; add replacement rent to spending
}
```

##### Step 5 — Reinvest meltdown surplus

```js
if (availFromMelt > 0) {
  var toTF = min(availFromMelt, simplifiedRoom * 0.5);
  tf += toTF;
  nr += availFromMelt - toTF;
}
```

##### Step 6 — Compute GIS

```js
var finalTaxable = fixedTaxable + meltAmt + row.fromRRSP;
var gis = age >= 65 ? calcGIS(age, finalTaxable / infM, y, inf, p.cOn && cAlive, ptInc / infM) * 12 : 0;
row.gis = gis;
```

##### Step 7 — Compute tax (couple-aware)

```js
var taxInc = qpp + (age >= p.oasAge ? calcOAS(p.oasAge, finalTaxable, y, inf, age) * 12 : 0)
           + penAnn + ptInc + rrifMin + meltAmt + row.fromRRSP;
var cTaxInc = (couple computation including cQPP, cOAS, cRRIF, cPen);

var tx1 = calcTax(taxInc, y, p.prov, inf, retired);
var tx2 = cTaxInc > 0 ? calcTax(cTaxInc, y, p.prov, inf, cRetired) : { total: 0, marg: 0 };
var tx = { total: tx1.total + tx2.total, ... };

row.tax = tx.total;
row.taxInc = taxInc + cTaxInc;
row.effRate = tx.eff;
row.margRate = tx.marg;
```

##### Step 8 — Snapshot balances

```js
row.balRR = rr; row.balTF = tf; row.balNR = nr;
row.balCRR = crr; row.balCTF = ctf; row.balCNR = cnr;
row.reEquity = sum(reVals[i].v - mb - heloc);
row.totalWithdraw = rrifMin + cRrifMin + meltAmt + row.fromRRSP + row.fromTFSA + row.fromNR;
row.netIncome = totalFixed + meltAmt + row.fromRRSP + row.fromTFSA + row.fromNR + gis - row.tax;
schedule.push(row);
```

### 9.4 Post-loop smoothing passes

After all years built:

**Spending-layer soft cap (forward pass):**

```js
for each retired year:
  var spendTot = fromRRSP + fromTFSA + fromNR;
  if (prevSpendTotal > 0) {
    var maxDelta = max(prevSpendTotal * 0.30, 10000);
    if (spendTot > prevSpendTotal + maxDelta) {
      // Trim NR first, then RRSP, then TFSA
      var excess = spendTot - (prevSpendTotal + maxDelta);
      // ... reduce
    }
  }
```

Prevents the year-to-year withdrawal pattern from oscillating wildly (e.g., $10K one year, $80K next).

**Backward pass — caps only:**

```js
for (bp = length - 2; bp >= 0; bp--) {
  var currSp = schedule[bp].fromRRSP + .fromTFSA + .fromNR;
  var nextSp = schedule[bp+1].fromRRSP + .fromTFSA + .fromNR;
  var maxD2 = max(nextSp * 0.40, 15000);
  if (currSp > nextSp + maxD2) {
    var over = currSp - (nextSp + maxD2);
    // Reduce schedule[bp].fromNR first, then fromRRSP
  }
}
```

### 9.5 Return value

```js
return {
  schedule,         // array of per-year row objects
  totalTax,         // sum of tax during retirement years
  totalGIS,         // sum of GIS received
  oasClawbackYrs,   // count of years where taxInc > indexed clawback threshold
  finalBal,         // last row's balRR + balTF + balNR
  retStart          // index of first retirement year in schedule
};
```

---

## Part 10 — Monte Carlo engine (`runMC`)

### 10.1 Purpose

Run `N` independent simulations sampling from joint return / inflation / mortality distributions. Returns success rate, percentile bands, sensitivity, estate distribution, etc.

### 10.2 Structure

```
runMC(p, N) ──┬─ Param sanitization (clamp to physical ranges)
              ├─ Setup multi-asset / Cholesky factors
              ├─ for si = 0 to N-1:
              │    ├─ Sample stochastic death age
              │    ├─ Per-sim memory state (NR/RRSP smoothing)
              │    ├─ for y = 0 to maxYrs:
              │    │    ├─ Sample correlated returns (Cholesky × N(0,1))
              │    │    ├─ Apply stress shocks if active
              │    │    ├─ Sample stochastic inflation
              │    │    ├─ Build year's state (similar to optimizeDecum but with random returns)
              │    │    ├─ Track GK guardrail decisions
              │    │    ├─ Run withdrawal logic
              │    │    ├─ Compute tax (with pension splitting if applicable)
              │    │    ├─ Update balances + path[]
              │    │    └─ Detect ruin
              │    ├─ Record sim outcome (fins, ruinAge, deathAge, estate)
              │    └─ Push path to all[]
              ├─ Filter NaN/Infinity from fins[] (P0 defense)
              ├─ Sort fins[]
              ├─ Build histogram (with isFinite guard)
              ├─ Build death-vs-ruin buckets
              ├─ Compute sens[] (sensitivity)
              ├─ Aggregate medRevData (median path) with withdrawal sampling
              └─ Return aggregated result object
```

### 10.3 Param sanitization (defensive top-of-function)

```js
function runMC(p, N, _progressCb) {
  // P0 guard: deathAge default
  if (p.deathAge == null || isNaN(p.deathAge)) p.deathAge = p.stochMort ? 95 : 90;

  // Rate clamps (prevent typo-level disaster)
  p.merR = max(0, min(p.merR || 0, 0.05));
  p.eqRet = max(-0.05, min(p.eqRet || 0.07, 0.20));
  p.eqVol = max(0.01, min(p.eqVol || 0.16, 0.50));
  // ...

  // Allocation 0-1
  p.allocR = max(0, min(p.allocR != null ? p.allocR : 0.6, 1));

  // Multi-asset alloc auto-normalize if sum != 1
  if (p.multiAsset && p.assetAlloc) {
    var maSum = p.assetAlloc.can + ... + p.assetAlloc.bnd;
    if (maSum > 0 && Math.abs(maSum - 1) > 0.01) {
      // re-normalize all weights
    }
    if (p.allocOverride) { /* same for per-account overrides */ }
  }

  // Dollar non-negative
  p.rrsp = max(0, p.rrsp || 0);
  // ... all balance fields, sal, retSpM

  // Spending phase clamps
  p.goP = max(0, min(p.goP || 1, 1.5));
  p.healthMul = max(0, min(p.healthMul || 0, 0.10));
}
```

### 10.4 Per-year random sampling

For each year `y`:

```js
// 1. Detect crisis (negative shock) for correlation matrix selection
var inCrisis = sEq < C.CRISIS_THRESHOLD;  // -10% shock or worse
var useL = inCrisis ? CHL_CRISIS : CHL;

// 2. Generate independent N(0,1) samples (5 in 2-class, 8 in multi-asset)
rw = [];
for (i = 0; i < 5; i++) rw.push(p.fatT ? tRn(5) : tRn(999));

// 3. Apply Cholesky to get correlated zz
zz = useL.map(row => row.reduce((s, v, i) => s + v * rw[i], 0));

// 4. Construct asset returns
eqR = eqRet2 + eqVol2 * zz[0] + sEq;       // sEq = stress shock for year y
bndR = bndRet2 + bndVol2 * zz[1] + sBd;
infShock = sInfOvr !== null ? sInfOvr
        : p.stochInf ? p.inf + 0.015 * zz[2]
        : p.inf;
infShock = max(0.005, min(0.08, infShock));
```

In multi-asset mode (`p.multiAsset === true`), 8 independent draws → 8 correlated returns (canEq, usEq, intlEq, emEq, bond, inflation, PE, PM). The PE/PM returns are decorrelated from broad equity but retain a configurable correlation per `CRM8`.

### 10.5 Per-sim contamination protection

```js
for (var si = 0; si < N; si++) {
  if (_maOn) _maMargRate = _maMargRateInit;  // reset per-sim
  // ...
}
```

The `_maMargRateInit` save/restore prevents a previous sim's marginal-rate update from contaminating the next sim's pre-retirement marginal calculation.

### 10.6 GK guardrail decisions (when `p.gkOn === true`)

```js
// Initial WR
var initWR = spending / portfolioBal;
var ceil = 1.20 * initWR;      // 20% above baseline
var floor = 0.80 * initWR;
var maxCutCum = 0.25;          // cap on cumulative cuts

if (currentWR > ceil) {
  spending *= 0.90;            // 10% cut
  gkSpendFactor *= 0.90;
  gkCutCount++;
  gkCutYrs++;
  gkCurCutStreak++;
  gkMaxCutStreak = max(gkMaxCutStreak, gkCurCutStreak);
} else if (currentWR < floor) {
  if (gkSpendFactor < 1.0) {
    spending *= 1.10;          // restore (up to 1.0 max)
    gkSpendFactor = min(1.0, gkSpendFactor * 1.10);
    gkRaiseCount++;
  }
  gkCurCutStreak = 0;
}
```

These are tracked across sims and surfaced in the return object as `gkAvgCuts`, `gkAvgRaises`, `gkP5MinSpend`, etc.

### 10.7 Pension splitting (post-65, with caveats)

```js
if (p.split && age >= 65 && (penMonth > 0 || rrifMin > 0) && p.cOn && cAlive) {
  var eligiblePenInc = penMonth * 12 + (age >= 65 ? rrifMin : 0);
  var splitAmt = eligiblePenInc * (p.splitP || 0.5);
  // Compute tax benefit: (taxBefore_split - taxAfter_split)
  var myInc = qpp + oas + penMonth * 12 + estRrifMin + ptInc;
  var spInc = cInc;
  var taxBefore = calcTax(myInc / infM, ...) + calcTax(spInc / infM, ...);
  var taxAfter = calcTax((myInc - splitAmt) / infM, ...) + calcTax((spInc + splitAmt) / infM, ...);
  splitB = max(0, taxBefore - taxAfter);
}
```

**Note**: this can produce NaN under specific edge configurations (one spouse dead + active splitting + zero RRIF), which is what triggered the P0.2 histogram crash. The audit applied defensive `isFinite()` filters at the result stage; root-cause investigation in this block is recommended.

### 10.8 Defensive NaN filter (post P0.2 fix)

```js
// After sim loop, before sort/percentile extraction:
fins = fins.filter(x => isFinite(x));
liqFins = liqFins.filter(x => isFinite(x));
if (fins.length === 0) fins = [0];
if (liqFins.length === 0) liqFins = [0];
fins.sort((a, b) => a - b);
liqFins.sort((a, b) => a - b);
```

Without this, NaN values in `fins[]` would corrupt the sort (JavaScript's compare with NaN is undefined behaviour) and crash the histogram `_histBins[NaN]` lookup.

### 10.9 Histogram (post P0.2 fix)

```js
var _histBins = [];
if (fins.length > 0) {
  var _hMin = fins[0], _hMax = fins[fins.length - 1];
  var _hRange = _hMax - _hMin || 1;
  var _nBins = min(20, max(8, Math.ceil(Math.sqrt(N))));
  var _bw = _hRange / _nBins;
  for (var bi = 0; bi < _nBins; bi++) {
    _histBins.push({ lo: _hMin + bi*_bw, hi: _hMin + (bi+1)*_bw, count: 0 });
  }
  fins.forEach(f => {
    if (!isFinite(f)) return;       // P0.2 defense
    var idx = min(_nBins - 1, max(0, Math.floor((f - _hMin) / _bw)));
    if (_histBins[idx]) _histBins[idx].count++;
  });
}
```

### 10.10 Sensitivity computation

`runMC` computes `sens[]` by re-running mini-MCs with one parameter perturbed at a time:

```js
sens = [
  { name: "Equity returns",  lo: -45000, hi: 62000 },  // ±1σ effect
  { name: "Inflation",        lo: -28000, hi: 31000 },
  { name: "Spending",         lo: -55000, hi: 48000 },
  { name: "Longevity",        lo: -15000, hi: 22000 }
];
```

### 10.11 medRevData enrichment (engine)

After the per-sim loop, `runMC` builds a single representative "median revenue data" array by:

1. Picking the simulation closest to median final wealth (`medSimIdx`).
2. Walking that sim's path year-by-year.
3. For each retirement year, computing `wRrifMin`, `wFromRR`, `wFromTF`, `wFromNR`, `wMelt` by **balance delta** (previous year minus current year, only positive deltas).
4. Optionally overriding withdrawal fields with the median across `wdSampleSims` (default 30) tracked sims for stability.
5. Adding income components: `rrq`, `psv`, `srg`, `pen`, `pt`, `ret`, `spend`, `tax`, `taxInc`, `sal`, `cSal`, `payroll`, `cPayroll`, `aRR`/`aTF`/`aNR`/etc. (account balances), `corpBal`/`corpTax`/`corpDiv`/`corpExtract`/`corpCDA`/`corpRDTOH`.

### 10.12 Return value

See Part 12 for the full schema.

---

## Part 11 — Stress scenarios (`STR` catalog)

Each entry in the `STR` object defines a multi-year shock applied additively to baseline returns + inflation:

```js
STR = {
  none: { eq: [], bd: [], inf: [], ... },
  crash08: {
    eq: [-0.37, -0.22, 0.15, 0.02],     // year 0 shock, year 1, ...
    bd: [+0.05, +0.08, +0.02, -0.01],
    inf: [0.038, 0.002, 0.018, 0.012]   // override inflation
  },
  dotcom: { eq: [-0.10, -0.13, -0.23, +0.26, +0.09], ... },
  inflation70: { eq: [...10 years...], bd: [...], inf: [...] },
  stagflation: { eq: [-0.14, -0.08, -0.12, +0.02, -0.05], ... },
  japan: { eq: [+0.01, -0.02, ..., -0.01], ... },     // 10-year flat
  covid: { eq: [-0.34, +0.18, +0.27, +0.01], ... },
  longevity: { eq: [], bd: [], inf: [], extra: { deathAge: 5 } },
  ratehike: { eq: [-0.12, -0.08, -0.05, +0.03, +0.06], ... },
  prolonged: { eq: [-0.15, ..., +0.08], ... },        // 8 years
  custom: { eq: [], bd: [], inf: [] }                 // user-provided
};
```

Activation: `p.strs` selects the scenario, `p.stWhen` selects timing ("ret" / "now" / "before" / explicit age), `p.stAge` parameterizes "before". A **second stress** can stack via `p.strs2` / `p.stWhen2` / `p.stAge2`.

```js
var stStartAge = p.stWhen === "ret" ? p.retAge
              : p.stWhen === "now" ? p.age
              : p.stWhen === "before" ? max(p.age, p.retAge - p.stAge)
              : p.stAge || p.retAge;
var stIdx = age - stStartAge;
var sEq = stIdx >= 0 && stIdx < stDef.eq.length ? stDef.eq[stIdx] : 0;
// ... applied additively to that year's eqR, bndR, infShock
```

---

## Part 12 — Result schema

`runMC(p, N)` returns:

```js
{
  // Path data
  pD,                        // deterministic path enriched (mp_total, mp_rr, mp_tf, ...)
  medPath: medPathBilan,     // median sim's per-year state objects
  medSimFinal,               // final wealth of median sim (raw)
  medSimRuin,                // ruin age of median sim
  medSimDeath,
  medSimFinalR,              // medSimFinal / discount factor
  medSimEstateTax,
  medSimEstateNet,

  // Success metric
  succ,                      // proportion of sims where balance > ruinThreshold at death

  // All sim final balances (sorted)
  fins,                      // sorted ascending (NaN-filtered)

  // Survival fraction by age (for survival curve chart)
  sf,                        // [{ age, pct }]

  // Ruin metrics
  medRuin,                   // median ruin age
  ruinPct,                   // % of sims that hit ruin
  p5Ruin,                    // 5th percentile ruin age (or 999 = never)
  p10Ruin,

  // Discounting
  discFinal,                 // (1+inf)^horizon

  // Sensitivity
  sens,                      // [{ name, lo, hi }] dollar impact at ±1σ

  // Year-by-year revenue data
  revData,                   // raw per-year aggregate
  medRevData,                // enriched median path year-by-year (full schema, see below)

  // Mortality
  avgDeath,
  deathAges, cDeathAges, ruinAges,

  // Wealth percentiles (nominal)
  medF: fins[N*0.5],
  p5F: var5,                 // = sorted 5th percentile = VaR 5%
  p25F: fins[N*0.25],
  p75F: fins[N*0.75],
  p95F: fins[N*0.95],
  mean,
  sd,
  var5,                      // 5th percentile (used as p5F)
  cvar5,                     // mean of bottom 5% (conditional VaR)

  // Wealth percentiles (real, discounted by inflation)
  rMedF, rP5F, rP25F, rP75F, rP95F,
  rMean, rSD, rVar5, rCvar5,

  // Liquid wealth (excludes real estate)
  liqMedF, liqP5, liqP25, liqP75, liqP95,
  rLiqMedF, rLiqP5,
  hasRE,                     // bool: at least one property active

  // Estate distribution
  medEstateTax, medEstateNet,
  p5EstateNet, p10EstateNet, p25EstateNet, p75EstateNet, p90EstateNet, p95EstateNet,
  p5EstateTax, p25EstateTax, p75EstateTax, p95EstateTax,
  avgEstateTax,

  // Histogram & death-vs-ruin
  histogram: [{ lo, hi, count }],
  deathVsRuin: [{ age, alive, ruin }],

  // Guyton-Klinger statistics
  gkOn,
  gkAvgCuts, gkAvgRaises, gkAvgSpend,
  gkP5MinSpend, gkMedianCuts, gkP95Cuts,
  gkAvgCutYrs, gkMedianCutYrs, gkAvgMaxStreak
}
```

### medRevData row schema (per year)

```js
{
  age, rrq, psv, srg, pen, pt,        // government + pension income
  ret,                                  // total withdrawal need
  spend,                                // actual spending (capped if balances exhausted)
  tax, taxInc,                          // total tax + taxable income
  penCont,                              // pension contributions (working years)
  sal, payroll, cSal, cPayroll,         // salary + payroll deductions (couple)
  // Account end-of-year balances
  aRR, aTF, aNR, aPE, aPM, aDC, aCRR, aCTF, aCNR, aRE, aLIRA,
  // Withdrawals (annual)
  wFromRR, wFromTF, wFromNR, wMelt, wRrifMin,
  // Real estate
  peExit, pmExit,
  gis,
  // Corporation
  corpBal, corpTax, corpSal, corpDiv, corpExtract, corpCDA, corpRDTOH
}
```

---

## Part 13 — Invariants & defensive guards

### 13.1 Sortedness invariant

After `fins.sort(...)`, the percentile extraction relies on:
- `p5F = fins[floor(N*0.05)]`
- `p25F = fins[floor(N*0.25)]`
- `medF = fins[floor(N*0.5)]`
- `p75F = fins[floor(N*0.75)]`
- `p95F = fins[floor(N*0.95)]`

These respect `p5F ≤ p25F ≤ medF ≤ p75F ≤ p95F` only if `fins` is sorted. The defensive NaN filter (post-P0.2) is required because NaN compromises the sort.

### 13.2 NaN guards

After P0.2 fix, two layers protect against NaN:
1. `fins.filter(isFinite)` before sort
2. `if (!isFinite(f)) return` inside histogram `forEach`
3. `if (_histBins[idx]) _histBins[idx].count++` defensive index check

### 13.3 deathAge guard (P0.1)

```js
// At top of runMC:
if (p.deathAge == null || isNaN(p.deathAge)) p.deathAge = p.stochMort ? 95 : 90;

// At top of optimizeDecum:
if (p.deathAge == null || isNaN(p.deathAge)) p.deathAge = 90;
```

### 13.4 Param sanitization (top of `runMC`)

All numeric params clamped to physical ranges:

| Param | Min | Max | Default |
|-------|-----|-----|---------|
| `merR/T/N` | 0 | 0.05 | 0 |
| `nrTaxDrag` | 0 | 0.03 | 0 |
| `inf` | 0 | 0.10 | 0.021 |
| `eqRet` | -0.05 | 0.20 | 0.07 |
| `eqVol` | 0.01 | 0.50 | 0.16 |
| `bndRet` | -0.02 | 0.12 | 0.035 |
| `bndVol` | 0.01 | 0.25 | 0.06 |
| `allocR/T/N` | 0 | 1 | 0.6/0.8/0.5 |
| `goP/slP/noP` | 0 | 1.5 | 1/0.85/0.75 |
| `healthMul` | 0 | 0.10 | 0 |
| dollar fields (`rrsp`, `tfsa`, `nr`, `sal`, `retSpM`) | 0 | ∞ | 0 |
| `qppYrs` | 0 | ∞ | 0 |
| `qppAge` | (default 60) |

### 13.5 Multi-asset auto-normalization

If `p.assetAlloc` weights don't sum to 1.0 (within ±0.01), they're divided by the sum to normalize. Same for per-account `allocOverride` weights.

### 13.6 Per-sim isolation

Variables that should reset between sims:
- `_mcPrevNR`, `_mcPrevRR`: smoothing memory
- `_maMargRate`: marginal rate (saved/restored from `_maMargRateInit`)
- `gkSpendFactor`, `gkMinFactor`, `gkCurCutStreak`, etc.: GK state
- `_mcTfsaRoom`, `_mcTfsaLastW`: TFSA room tracking

If any of these accumulate across sims, success rates would be biased.

---

## Part 14 — Known limitations & flagged items

### 14.1 P1 — QC dividend tax credit ordering (FLAGGED, not fixed)

`calcTax` applies federal dividend credit AFTER QC abatement (line 2641 in source):

```js
fed *= pt.abate;                           // QC abatement (× 0.835)
fed = max(0, fed - divCredFed);            // dividend credit AFTER
```

Per CRA T1 General appearance, dividend credit should subtract before abatement. Engine carries a code comment citing internal `PASSATION_CCPC_MODULE.md §4.6` justifying the order. Numerical impact: under-taxes QC dividend recipients by ~16.5% of credit value. **Requires tax-expert review.**

### 14.2 P1 — Pension splitting × couple-mortality NaN (root cause not eliminated)

The pension-splitting block (line 6098-6107 in source) can produce NaN in `splitB` under specific edge configurations:
- One spouse already deceased (`cInc` NaN propagation)
- Combined with `estRrifMin` of zero
- Combined with active `p.split === true`

The defensive `isFinite` filter (P0.2 fix) prevents the resulting histogram crash. The underlying NaN in `splitB` is currently masked, not eliminated. Recommend root-cause investigation in production runs.

### 14.3 P2 — Capital gains $250K cliff in `calcNRItemizedTax`

The graduated split is applied **per-year per-call**, so a sudden NR realization of exactly $251K vs $249K creates a discontinuity in tax at the boundary. This matches engine behavior elsewhere (PE/PM exits, deemed disposition at death) and is per CRA rules — but produces step changes the user might find counterintuitive.

### 14.4 Engine doesn't enforce CRA contribution limits

- RRSP contribution: engine accepts `p.rrspC` at face value — doesn't enforce 18% of prior year income or annual maximum (~$32K for 2026).
- Pension adjustment (PA): not modeled. DC/DB plan members have reduced RRSP room in real life.

### 14.5 Engine doesn't model province change mid-life

If `p.prov` is set, all calculations use that province for all years. Real residents who move provinces would have multi-province tax filings.

### 14.6 LIF max withdrawal not enforced

LIRA → LIF conversion at retirement triggers minimum AND maximum annual draw rules in real life. Engine respects RRIF minimum via `getRRIFMin` but doesn't cap LIF withdrawals at the maximum (which is province-specific).

### 14.7 Donations & charitable giving

`p.donAnn` (annual donation $) is captured but not deducted as a tax credit in `calcTax` — engine doesn't model the $200 / $200+ first-tier donation credit split. Would need a follow-up to thread `donations` into `calcTax` as a credit.

### 14.8 RSU vesting tax

`p.rsuGrants` carry vested shares as ordinary income but use a flat `RSU_TAX_RATE = 0.45` rather than running through `calcTax`. Conservative for top-bracket employees, may under-tax those in lower brackets.

---

## Part 15 — Reproducibility (running the engine outside the browser)

### 15.1 Extract to Node

```bash
node planner/report/realai/extract-v3-engine.mjs
```

Pulls the engine block from `planner_v3.html` into a Node-runnable CommonJS module at `planner/report/realai/v3-engine.cjs`. Re-run after any engine edit.

### 15.2 Programmatic invocation

```js
const E = require('./planner/report/realai/v3-engine.cjs');

// Deterministic
const det = E.optimizeDecum({
  age: 50, retAge: 65, deathAge: 90, sex: 'M', prov: 'QC',
  sal: 90000, rrsp: 250000, tfsa: 80000, nr: 50000,
  rrspC: 8000, tfsaC: 6000, nrC: 5000,
  retSpM: 5000, qppAge: 65, oasAge: 65, avgE: 90000, qppYrs: 25,
  inf: 0.021, eqRet: 0.06,
  merR: 0.005, merT: 0.005, merN: 0.005,
  allocR: 0.6, allocT: 0.7, allocN: 0.5,
  wStrat: 'optimized'
});
console.log('Final balance:', det.finalBal);
console.log('OAS clawback yrs:', det.oasClawbackYrs);

// Monte Carlo
const mc = E.runMC(/* same params */, 1000);
console.log('Success rate:', (mc.succ * 100).toFixed(1) + '%');
console.log('Median wealth:', mc.medF);
console.log('P5 wealth (VaR):', mc.p5F);
```

### 15.3 Audit suites

```bash
# Tax + benefits + RRIF + MC primitives + edge cases (140 assertions)
node planner/report/realai/v3-engine-audit.cjs

# Deterministic engine + estate sortedness + QC div ordering + aux fns
node planner/report/realai/v3-engine-audit-deep.cjs

# Path features (GK/splitting/RE/CCPC/multi-asset/spousal) + 31-input what-if
node planner/report/realai/v3-engine-audit-final.cjs
```

Expected: 218+ pass, 0 fail.

### 15.4 Production webhook integration

The production webhook (`/api/webhook` after Stripe payment) imports `lib/engine/index.js` (a hand-port of the same engine). Drift between `lib/engine/index.js` and `planner_v3.html` is a real risk — both files must be updated in lockstep when constants or logic change. Tax constants (`FED_BRACKETS`, `OAS_CLAWBACK_THR`, `PROV_TAX[*].b`, ON surtax thresholds) should be reviewed each January after Service Canada / Revenu Québec / CRA publish indexed values.

The audit confirmed `lib/engine/index.js` has at least one drift (QC bracket [108680] vs v3's correct [108730]). Until the lib/engine path is reconciled, consumers should prefer the v3 path.

---

## Appendix A — Function signatures (one-liner)

| Function | Signature | Returns |
|----------|-----------|---------|
| `calcTax(inc, yr, prov, infR, retired, divInfo)` | personal income tax | `{ total, fed, prov, eff, marg, fedEff, provEff, divCredFed, divCredProv, taxableInc }` |
| `calcCorpTax(activeIncome, passiveIncome, prov, yr, infR)` | CCPC tax | `{ activeTax, passiveTax, totalTax, rdtohAdded, smallBizPortion, generalPortion, adjustedSBD, effectiveRate }` |
| `calcQPP(startAge, avgEarn, yrsContrib)` | $/month | scalar |
| `calcOAS(startAge, income, yr, infR, currentAge)` | $/month | scalar |
| `calcGIS(age, nonOASincome, yr, infR, hasSpouse, employmentInc)` | $/month | scalar |
| `getRRIFMin(age, bal)` | RRIF minimum withdrawal $ | scalar |
| `oasClbThrFor(age, baseAge, inf)` | indexed OAS clawback threshold $ | scalar |
| `chol(m)` | lower-triangular Cholesky factor | matrix |
| `tRn(df)` | t-distribution sample (≈ normal if df > 30) | scalar |
| `stochDeath(startAge, sexCode)` | stochastic death age | int |
| `sMul(age, ra, g, sl, n, slAge, noAge)` | spending multiplier | scalar |
| `pCr(pi, age)` | pension credit value (QC) | scalar |
| `blendRet(eqRet, bondRet, eqPct)` | 2-class blended return | scalar |
| `blendMulti(rets, alloc)` | 5-component blended return | scalar |
| `resolveAlloc(p, acctKey)` | allocation object for account | object |
| `divEligibleFactor(prov)` | dividend effective-rate factor | scalar |
| `calcNRItemizedTax(nrBal, retNR_gross, alloc, margRate, bndR, prov)` | itemized NR tax $ | scalar |
| `calcWHT(alloc, acctType)` | foreign WHT drag | scalar |
| `calcPayroll(sal, prov, yr, infR)` | CPP/EI/RQAP $ | scalar |
| `optimizeDecum(p)` | deterministic projection | `{ schedule, totalTax, totalGIS, oasClawbackYrs, finalBal, retStart }` |
| `runMC(p, N, _progressCb)` | Monte Carlo results | (see Part 12) |

## Appendix B — File map

| File | Purpose |
|------|---------|
| `planner/planner_v3.html` | Source of truth — engine + UI |
| `planner/planner_v2.html` | Prior version (still in production for some paths) |
| `lib/engine/index.js` | Server-side mirror used by `/api/webhook` (DRIFT-PRONE) |
| `planner/report/realai/extract-v3-engine.mjs` | Engine extractor |
| `planner/report/realai/v3-engine.cjs` | Auto-generated Node module |
| `planner/report/realai/v3-engine-audit.cjs` | Audit suite #1 |
| `planner/report/realai/v3-engine-audit-deep.cjs` | Audit suite #2 (deterministic + sortedness) |
| `planner/report/realai/v3-engine-audit-final.cjs` | Audit suite #3 (paths + what-if) |
| `planner/report/realai/V3-ENGINE-AUDIT-REPORT.md` | Last audit report |
| `planner/report/realai/V3-ENGINE-TECHNICAL-REFERENCE.md` | This document |

---

*End of reference. Last verified: 2026-04-20. For changes to constants, recompute the audit (`node planner/report/realai/v3-engine-audit*.cjs`) and refresh this document.*
