# v4 Sidebar — Proposed Outlay

**Date**: 2026-04-19
**Context**: Form (`planner_v4.html`) holds every variable. The sidebar (`planner_v3.html`) should be a cockpit with the ~40 highest-leverage levers — everything else stays in the form.

## 1. Guiding principles

1. **Only levers that move the plan.** If changing a variable doesn't change `mc.succ` by ≥ 3 pp or `medF` by ≥ 10 %, it goes to the form.
2. **One click to simulate, one click to jump to depth.** Every sidebar module has a "📋 Ouvrir dans le formulaire" link at the top.
3. **No assumptions.** `eqRetS`, `inf`, `merR`, `nSim`, `stochMort` — none of these belong in the cockpit. They are set once, live in the form.
4. **Couple mode hides instead of duplicates.** Sync toggles (already built) keep spouse fields off by default.
5. **No scroll per module.** Every module fits one viewport height (~700 px) on a 13" MacBook.

## 2. Proposed sidebar modules & fields

Eight compact modules. Numbers shown are field counts when single (S) / when couple (C). Target: **32 S / 42 C**.

### Module 1 — Profil (identité + timing) — 5 S / 6 C

Top of rail. The anchor. Everything the plan depends on chronologically.

| Field | Type | Why cockpit |
|---|---|---|
| `firstName`, `lastName` | text (inline, side-by-side) | Personalization of report |
| `age` | slider 18–80 | Drives horizon, contribution room |
| `sex` | 2-pill | Mortality table branch |
| `prov` | dropdown | Tax engine, GIS, RRQ vs CPP |
| `retAge` | slider 45–75 | The biggest KPI lever |

**Blueprint-only**: `deathAge` (only relevant when stochMort=OFF), `detailPref/stressLevel/finLiteracy`, report-tone triplet.

### Module 2 — Conjoint (when `cOn`) — 0 S / 5 C

Appears only in couple mode. Everything else for spouse is in form.

| Field | Type | Why cockpit |
|---|---|---|
| Couple / Single pill | 2-pill | The mode switch itself |
| `cFirstName` | text | Report personalization |
| `cAge`, `cSex` | slider + 2-pill | Household mortality + QPP calc |
| `cSal` | number | Drives spouse RRQ + contributions |
| Sync toggles panel (5 boxes) | Checkboxes | **cSyncRetAge · cSyncGovAges · cUseStochMort · cAvgEAuto · cSyncPortfolio** — default ON; flipping reveals spouse-specific fields, which go to form |

**Blueprint-only**: every unsynced spouse field (`cRetAge`, `cQppAge`, `cOasAge`, `cDeath`, `cAllocR/T/N`, `cMerR/T/N`, `cPenType`, `cPenM`, `cPen2Type`, etc. — 40+ fields).

### Module 3 — Flux (cashflow) — 3 fields

| Field | Type | Why cockpit |
|---|---|---|
| `sal` | number | Primary income |
| `retSpM` | number | **THE number** — household monthly spending in retirement |
| `ptM` + `ptYrs` (collapse to 1 row) | number + slider | Part-time work lever (optional) |

**Blueprint-only**: `revSec`, budget categories (9 fields), `ev1/2` expenses, `inc1/2/3` income events, `penAlim`, `healthMul`, `healthAge`, smile-curve fields.

### Module 4 — Épargne (balances + contributions) — 6 fields

One line per account type. Balances and yearly contributions only.

| Field | Type | Why cockpit |
|---|---|---|
| `rrsp` + `rrspC` (2-col) | number | REER balance + yearly |
| `tfsa` + `tfsaC` (2-col) | number | CÉLI balance + yearly |
| `nr` + `nrC` (2-col) | number | Non-registered balance + yearly |

**Blueprint-only**: `allocR/T/N`, `merR/T/N`, `multiAsset`, `allocOverride`, `glide`, `glideSpd`, `nrTaxDrag`, `fxVol`, `costBase`, `cgIncLo/Hi/Thresh`, `fhsa*`, `lira*`, `resp*`, `ftq*`, `rsuGrants`.

### Module 5 — Immobilier (per property) — 4 per card

One card per property via `props[]`. Cockpit shows lever fields only.

| Field | Type | Why cockpit |
|---|---|---|
| `val` | number | Current value |
| `mb` | number | Mortgage balance |
| `rm` (if rental) | number | Monthly rent |
| `pri` checkbox | Toggle | Principal residence flag |
| Ownership pill (couple mode) | 4-pill + slider | Self / Spouse / 50-50 / Custom |

**Blueprint-only**: `mr`, `mr2`, `mt1`, `ma`, `ri`, `ox`, `pt`, `ins`, `heloc`, `helocRate`, `smithOn`, `refiAge`, `refiAmt`, `dpaOn`, `dpaRate`, `landPct`, `dsAge`, `dsVal`. (All 18 per-property deep fields → "📋 Détails" button opens form at `#sec-realestate`.)

### Module 6 — Dettes (per debt) — 4 per card

Same pattern as real estate. One card per `debts[]` entry.

| Field | Type | Why cockpit |
|---|---|---|
| `d.type` | dropdown | HELOC / auto / student / card / other |
| `d.bal` | number | Balance |
| `d.rate` | slider | Rate |
| `d.pay` | number | Monthly payment |
| `d.deductible` | checkbox | Smith-manoeuvre flag (one click) |
| Ownership pill (couple) | 4-pill | Same as property |

**Blueprint-only**: `d.term` (most users fill pay; term is auto-calculated).

### Module 7 — Pension (gouvernement + employeur) — 4 S / 5 C

The strategic pension view. Tier-2 details go to form.

| Field | Type | Why cockpit |
|---|---|---|
| `qppAge` | slider 60–72 | Government benefit timing |
| `oasAge` | slider 65–70 | Clawback-sensitive lever |
| `penType` | 3-pill (None / PD / CD) | Pension classification |
| `penM` (if PD) OR `dcBal` (if CD) | number | **Conditional** — only one shows |
| Bridge checkbox (if PD) | Toggle | Reveals `brAmt` + `brEnd` when on |

**Blueprint-only**: `penIdx`, `penEE`, `penER`, `penMER`, `penPctMode`, `avgE`, `qppYrs`, `pen2*` (all 6 second-pension fields), `cvAnalysis` + `cvAmount` + `cvTransferMax` + `dbSurvivorPct`.

### Module 8 — Stratégie (décaissement) — 3 fields

| Field | Type | Why cockpit |
|---|---|---|
| Strategy radio: Standard / Meltdown / Pont | 3-pill | The choice itself |
| `meltTgt` (if meltdown) OR `brAmt`+`brEnd` (if bridge) | Conditional | Depth of the strategy |
| `split` checkbox | Toggle | Pension splitting toggle |

**Blueprint-only**: `wStrat` (retrieval order), `splitP` (the %), `qppShare`, `rrifTax`, `gkOn` + all GK guardrail fields, `bizOasOptim`.

## 3. Modules intentionally removed from cockpit

| Old module | Why removed | Where it lives now |
|---|---|---|
| **Entreprise (Biz)** | 22 fields, niche (CCPC owners only) | `#sec-business` in form |
| **Assurances** | 11 fields, set once, not a frequent lever | `#sec-insurance` in form |
| **Alt (PE / Métaux précieux)** | 14 fields, expert-only, narrow audience | `#sec-alt` in form |
| **RSU** | Dynamic list editor, niche | `#sec-rsu` in form |
| **Modèle (stress, MC, mortalité)** | 100 % assumption tuning | `#sec-assumptions` in form |
| **Budget catégories** | 9 fields, only for manual-mode users | `#sec-income` in form |
| **Fisc (hors stratégie)** | Tax toggles, set once | Absorbed into Strategy or form |

## 4. Flow — where the user lands

```
[Landing page] ──► [Wizard, 5 steps] ──► [Choice screen]
                                              ├── 🎯 Cockpit (Sidebar + charts)  ← default for returning users
                                              └── 📋 Formulaire complet (v4 form) ← first-time deep setup

[Cockpit] ◄═══════════ [📋 Formulaire] button (header)  ═══════════► [Form]
   │                                                                     │
   ├── Each module shows "→ Ouvrir dans le formulaire" (jump link)       │
   │                                                                     │
   └── [▶ Simuler] button at bottom runs MC                               │
                                                                         │
[Form] ◄═══════════════ [🧭 Vue compacte →] button (header) ══════════════┘
   │
   └── [▶ Simuler mon plan] FAB runs MC (via handoff)
```

Mental model: the sidebar is where you **tweak weekly**, the form is where you **set up annually**.

## 5. Rail buttons — new structure

Eight rail entries, grouped by life phase. Each row is one click:

```
┌──────────────────┐
│ 👤  Profil        │ ← identity + timing
│ 👥  Conjoint      │ ← only visible when cOn
├──────────────────┤  (separator between groups)
│ 💸  Flux         │ ← cashflow
│ 📈  Épargne      │ ← accumulated balances
│ 🏠  Immobilier   │ ← per-property cards
│ 💳  Dettes       │ ← per-debt cards
├──────────────────┤
│ 🏛️  Pension      │ ← government + employer
│ 🧾  Stratégie    │ ← withdrawal strategy
├──────────────────┤  (footer controls)
│ 📋  Formulaire   │ ← opens v4 in new tab, profile transfers
│ 📚  Guide        │ ← re-opens wizard
│ 🎯  Cockpit/Full │ ← already shipped in phase 7
│ 🌙  Dark/Light   │
│ 🇫🇷 FR / EN      │
└──────────────────┘
```

## 6. Module panel anatomy (inside overlay)

Every module panel follows the same skeleton:

```
┌────────────────────────────────────────────┐
│ [ICON]  Module title                    [X]│ ← close
│         One-sentence caption explaining    │
│         what goes here.                    │
├────────────────────────────────────────────┤
│ 📋 Besoin d'un champ avancé?               │ ← jump to form (only in cockpit mode)
│    Ouvrir dans le formulaire →             │
├────────────────────────────────────────────┤
│                                            │
│   Field 1 ________________________         │
│   Field 2 ________________________         │
│   ...                                      │
│   (max 8 fields per module)                │
│                                            │
└────────────────────────────────────────────┘
```

## 7. Field-count sanity check

| Module | Single | Couple |
|---|---|---|
| 1. Profil | 5 | 5 |
| 2. Conjoint | 0 | 10 |
| 3. Flux | 3 | 3 |
| 4. Épargne | 6 | 6 |
| 5. Immobilier (per prop) | 4 × n | 5 × n |
| 6. Dettes (per debt) | 4 × n | 5 × n |
| 7. Pension | 4 | 4 |
| 8. Stratégie | 3 | 3 |
| **Base (no props/debts)** | **25** | **36** |
| **+1 property, +1 debt** | **33** | **46** |
| **+3 properties, +2 debts** | **45** | **61** |

Meets your "30–50 max" target for a typical profile (1 home + 1 debt).

## 8. What's NOT in this proposal (deferred)

- **Per-field tooltips in sidebar** — sidebar fields stay tight; users who need explanations click the jump link to see the form version with tooltips.
- **Conditional field reveals inside sidebar** — modules stay flat; complex conditionals (like bridge reveals brAmt/brEnd) keep working but don't gain new reveal logic.
- **Per-property/debt "Détails" drawer** — per-card cockpit is minimal; deep editing is always form-side.
- **Mobile sheet re-layout** — separate pass once cockpit is stable on desktop.

## 9. Implementation path (if you greenlight)

**Phase A — rail restructure (1 h)**
- Remove Biz/Ins/Alt/Model rail buttons from cockpit (already partially done in phase 7.1 — extend to Biz + Ins).
- Rename "Fisc" rail to "Stratégie" and rewrite its content per §2.8.

**Phase B — sidebar module content trim (2 h)**
- Profil: remove AI tone trio (done in phase 7.1), goals editor, deathAge.
- Flux: hide events/budget subsection (done), trim Cashflow to 3 fields.
- Épargne: remove alloc/MER/special accounts (done); keep only 6 balance/contribution fields.
- Pension: remove indexation, contributions, avgE/qppYrs, pen2, CV (done in phase 7.1). Keep only 4-5 Tier-1.

**Phase C — per-card trim (1 h)**
- Property cards: hide HELOC, refi, DPA, Smith, downsizing. Keep val/mb/rm/pri + ownership pill.
- Debt cards: hide term. Keep type/bal/rate/pay/deductible + ownership pill.

**Phase D — jump links + copy polish (30 min)**
- Every module panel: add "📋 Ouvrir dans le formulaire" at the top (already shipped in phase 7).
- Caption each module with the one-sentence "what goes here" (most already have `_bfModMeta`).

**Total**: ~4.5 h, all additive. Each phase reversible via `git revert`.

---

**Please flag before I proceed:**
1. OK with removing Biz + Ins + Alt from cockpit entirely? (Users who need them are expert-tier, form-fluent.)
2. OK with 3-pill pension type (none/PD/CD) vs current 4-option dropdown (adds RPDB)?
3. Per-property ownership pill: keep inline in cockpit card, or move to form?
4. Keep "Goals" editor anywhere in cockpit (currently removed), or form-only?
