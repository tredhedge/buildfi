# BuildFi Planner v3 — Cockpit ↔ Blueprint Implementation Plan

**Date**: 2026-04-17
**Scope**: Restructure the data-entry surface into two layouts sharing one state. Sidebar becomes the *cockpit* (≈ 30 lever fields); full-screen form becomes the *blueprint* (the complete 190-parameter document with collapsibles and smart pre-fills).
**Target file**: `planner/planner_v3.html`.
**Gating**: every phase ships behind a feature flag until acceptance criteria are met; any phase can be reverted with a single `git revert`.

---

## 1. Objectives

1. **Sidebar breathes**: Tier-1 levers only, 3–6 fields per module average, ≤ 30 fields total. No scroll fatigue on any module.
2. **Full technical depth remains accessible**: every one of the 190 variables stays editable, but moved to a form layout that can host labels, tooltips, illustrations, validation, and defaults.
3. **Zero engine regression**: shared React state; sidebar and form bind to the same hooks. No copy, no sync step, no drift possible.

---

## 2. Guiding principles

1. **Cockpit vs blueprint** — cockpit is what you tweak weekly, blueprint is what you set once per year or at onboarding. Frequency of interaction is the sorting criterion, not complexity.
2. **Single source of truth** — one state hook per variable. Both layouts read and write through it. Never cache.
3. **Smart defaults are opt-in visibility, opt-out value** — pre-fills render in muted italic until the user types; the value is live in the engine the whole time.
4. **No progress bars** — retirement planning is continuous. Forms show "revu le 15 avril" per section, not completion %.
5. **Componentized primitives** — one `<Field>` component; two layout contexts (`compact` / `expanded`). Bug fixes land once.
6. **Incremental and reversible** — every phase is a shippable commit; every commit can be reverted without breaking state.
7. **AMF and bilingual parity maintained** — every form label passes the compliance linter.

---

## 3. Data contract — zero drift

### Shared state rule

Every variable in `planner_v3.html` is a `useState` hook. Both sidebar and form `<Field>` components bind to the same hook. The form does NOT maintain its own copy. Writes propagate instantly to the engine via `_mcBaseParams` on the next render.

```
                   ┌─────────────────────────┐
                   │  useState("age", 45)    │
                   └──────────┬──────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
   ┌──────────▼──────────┐        ┌──────────▼──────────┐
   │ Sidebar <Field>     │        │ Form <Field>        │
   │  compact context    │        │  expanded context   │
   └─────────────────────┘        └─────────────────────┘
```

### Layout contexts

A single `<Field>` primitive accepts props:
```js
{ v, set, label, labelEn, help, helpEn, placeholder, defaultValue,
  tier: "cockpit" | "blueprint", ownerTag: "self" | "spouse" | "household",
  required: boolean, kind: "number" | "slider" | "select" | "check" | "text" }
```

`FieldCompact` renders it as a tight slider/numfield (current sidebar style).
`FieldExpanded` renders it with full label, help text, default placeholder, two-column layout.

### Serialization

Save/load JSON is the same — it already has every variable as a top-level key. No migration needed for data; only the UI reshape.

---

## 4. Tiering rules — objective criteria

To avoid bikeshedding on every borderline field, a variable goes to the **cockpit** (sidebar) only if it meets at least **two** of these:

- **A. KPI sensitivity**: changing the value within a realistic range moves `mc.succ` by ≥ 3 pp or `medF` by ≥ 10 % in the reference profile (`couple-transition`).
- **B. User-collected**: the value comes from a document the user reads (pay stub, statement, account page). Not an assumption.
- **C. Decision lever**: the value represents a choice the user can actively make (retire at 62 vs 65, meltdown yes/no) rather than a technical parameter.

Fields that meet **only one** or **zero** criteria go to the **blueprint** (form).

When on the fence: **default to blueprint**. Keeping the sidebar lean is the top goal.

---

## 5. Tiering table

Exhaustive classification of the 190 variables. Sidebar total ≈ 32 fields when couple active; ≈ 22 fields when single.

### Tier 1 — Cockpit (sidebar)

| Module | Fields | Notes |
|---|---|---|
| Profile | `age`, `sex`, `prov`, `retAge`, `deathAge`, `sal`, `firstName`, `lastName` | Identity + retirement timing. |
| Cashflow | `retSpM`, `ptM`, `ptYrs` | Monthly household spending + optional part-time at retirement. |
| Savings | `rrsp`, `rrspC`, `tfsa`, `tfsaC`, `nr`, `nrC`, `liraBal` | Balances + contributions only. **Allocations + MER move to blueprint.** |
| Strategy | radio Std/Meltdown/Bridge, `meltTgt` (if melt), `brAmt`/`brEnd` (if bridge), `split` | The strategic choice. |
| Pension | `qppAge`, `oasAge`, `penType`, `penM` (if DB) or `dcBal` (if CD) | **Contribs, indexation, pen2 move to blueprint.** |
| Real estate (per prop) | `pr.val`, `pr.mb`, `pr.rent`, `pr.pri` flag, ownership pill | **Appreciation, DPA, HELOC, Smith, refi, downsizing move to blueprint.** |
| Debts (per debt) | `d.type`, `d.bal`, `d.rate`, `d.pay`, ownership pill | **Smith deductibility stays here (one click).** |
| Conjoint (when `cOn`) | `cFirstName`, `cLastName`, `cAge`, `cSex`, `cSal`, 4 sync toggles | Sync toggles hide the 10+ fields that default to primary. |

**Single mode: ≈ 22 sidebar fields. Couple mode: ≈ 32 sidebar fields.**

### Tier 2 — Blueprint (form)

Everything else. Full list below grouped by section. All ≈ 160 fields.

| Section | Variables |
|---|---|
| Portfolio assumptions | `allocR`, `allocT`, `allocN`, `globalAlloc`, `multiAsset`, `allocOverride`, `eqRetS`, `eqVolS`, `bndRetS`, `bndVolS`, `inf`, `infHealth`, `infHousing`, `glide`, `glideSpd`, `nrTaxDrag`, `fxVol` |
| Fund fees | `merR`, `merT`, `merN`, `penMER`, `peFee` |
| Spouse portfolio (unsynced) | `cAllocR`, `cAllocT`, `cAllocN`, `cMerR`, `cMerT`, `cMerN`, `cPenMER` |
| Pension details | `penIdx`, `penEE`, `penER`, `bridge`, `brAmt`, `brEnd`, `avgE`, `qppYrs` |
| Pension 2 | `pen2Type`, `pen2M`, `pen2Idx`, `dc2Bal`, `pen2EE`, `pen2ER` |
| Spouse pension details | `cPenIdx`, `cPenEE`, `cPenER`, `cPenMER`, `cDCBal2`, `cPen2Type`, `cPen2M`, `cPen2Idx`, `cDC2Bal`, `cPen2EE`, `cPen2ER`, `cBridge`, `cBrAmt`, `cBrEnd`, `cAvgE`, `cQppYrs`, `cDeath`, `cRetAge`, `cQppAge`, `cOasAge` (all hidden by sync toggles) |
| Special accounts | `fhsaBal`, `fhsaC`, `fhsaForHome`, `fhsaHomeAge`, `rrspRoom`, `respOn`, `respContrib`, `respYrsLeft`, `respReturnAge`, `respKids`, `respAlready`, `ftqOn`, `ftqAmt` |
| Spouse special | `cFhsaBal`, `cFhsaC`, `cLiraBal`, `cRRSP`, `cRRSPC`, `cTFSA`, `cTFSAC`, `cNR`, `cNRC` (these stay visible in Conjoint cockpit for savings balances, but spouse's advanced accounts go to blueprint) |
| Insurance — primary | `insVieType`, `insVieCov`, `insViePrime`, `insVieDur`, `insInvCov`, `insInvPrime`, `insMGCov`, `insMGPrime`, `insColPrime`, `lifeInsBenefit`, `lifeInsPremium` |
| Insurance — spouse | `cInsVieType`, `cInsVieDur`, `cInsInvCov`, `cInsInvPrime`, `cInsMGCov`, `cInsMGPrime`, `cInsColPrime`, `cLifeInsBenefit`, `cLifeInsPremium`, `cSyncInsLife` |
| Real estate deep | per property: `ri` (appreciation), `amort`, `renewRate`, `tax`, `ins`, `exp` (op ex), `dpaOn`, `dpaRate`, `landPct`, `heloc`, `helocRate`, `smithOn`, `refiAge`, `refiAmt`, `dsAge`, `dsVal`, `costBase`, `cgIncLo`, `cgIncHi`, `cgThresh` |
| Business | `bizOn`, `bizType`, `bizRevenue`, `bizVolatility`, `bizGrowth`, `bizExpenses`, `bizRemun`, `bizSalaryPct`, `bizRetainedEarnings`, `bizInvAlloc`, `bizExtractMode`, `bizExtractYrs`, `bizOasOptim`, `bizSaleAge`, `bizSalePrice`, `bizSaleACB`, `bizLCGE`, `bizDebtBal`, `bizDebtRate`, `bizDebtAmort`, `ippOn`, `ippBal` |
| Alternative investments | `peBal`, `peY`, `peV`, `peLock`, `peExit`, `peExitStrat`, `peExitYrs`, `pmBal`, `pmY`, `pmV`, `pmExit`, `pmExitStrat`, `pmExitYrs` |
| RSU grants | `rsuGrants[]` full editor |
| Events + goals | `ev1Age/Amt/Name`, `ev2Age/Amt/Name`, `inc1-3 Age/Amt/Name`, `cEv1/2`, `cInc1-3`, `goals[]` (education + lump-sum details) |
| Tax / strategy deep | `wStrat`, `splitP`, `qppShare`, `rrifTax`, `cgIncLo`, `cgIncHi`, `cgThresh`, `dbSurvivorPct`, `cvAnalysis`, `cvAmount`, `cvTransferMax` |
| Spending curve | `goP`, `slP`, `noP`, `smileSlAge`, `smileNoAge`, spending-curve preset |
| Health cost model | `healthMul`, `healthAge` |
| Stress scenarios | `strs`, `custStrs`, `custBd`, `custInf`, `stWhen`, `stAge`, `strs2`, `stWhen2`, `stAge2` |
| Mortality | `stochMort`, `stochInf`, `fatT`, `salVol`, `disabProb`, `disabMo` |
| Monte Carlo | `nSim` |
| Charitable + misc | `donAnn`, `contGr` |
| AI report tone | `stressLevel`, `finLiteracy`, `detailPref` |
| Budget categories | `bLogement`, `bTransport`, `bAlim`, `bFamille`, `bTelecom`, `bLoisirs`, `bAssur`, `bAutre`, `penAlim`, `budgetMode`, `revSec` |

### Borderline fields — resolved

| Field | Resolution | Rationale |
|---|---|---|
| `bridge` checkbox | Cockpit | It's a strategy choice, not an assumption. Moves KPI ≥ 3 pp. |
| `brAmt`, `brEnd` | Cockpit (only when bridge is ON) | Conditional — follows the lever. |
| `split` checkbox | Cockpit | Strategic choice. |
| `splitP` (% split value) | Blueprint | Tuning a strategy, not picking one. |
| `meltTgt` | Cockpit (only when meltdown ON) | Sets the depth of the strategy. |
| `allocR` | Blueprint | Assumption, set once, glide path available. |
| `merR` | Blueprint | Technical parameter; median is well-known (0.5 % index / 2 % advisory). |
| `inf` | Blueprint | Assumption; national average. |
| `nSim` | Blueprint | Tuning parameter; 1 000 is fine for most. |
| `stochMort` | Blueprint | Technical switch. |
| Budget categories | Blueprint | Nine fields of noise unless user chose manual mode. Budget mode toggle stays in cockpit; categories move to form. |
| Goals detail (education/lump-sum) | Blueprint | Goals summary in cockpit (list + add button); detail editing in form. |

---

## 6. Component architecture

### Shared `<Field>` primitive

```js
function Field(props) {
  var ctx = React.useContext(LayoutCtx); // "compact" | "expanded"
  if (ctx === "expanded") return FieldExpanded(props);
  return FieldCompact(props);
}
```

- `FieldCompact` (today's style): slim label, slider or numfield, 2-col grid.
- `FieldExpanded`: 3-col row — label + help · input · default-value pill. Wider whitespace.

Both consume the same state hook via `props.v` and `props.set`. Zero duplication.

### Sidebar = cockpit context

```jsx
<LayoutCtx.Provider value="compact">
  <RailOverlay> ...Field rendered compact... </RailOverlay>
</LayoutCtx.Provider>
```

### Form = blueprint context

```jsx
<LayoutCtx.Provider value="expanded">
  <BlueprintForm> ...same Field rendered expanded... </BlueprintForm>
</LayoutCtx.Provider>
```

### Section primitives

- `<Section id="portfolio" title="Hypothèses de portefeuille" open={false}>` — collapsible. Tracks its open state in a `formSections` object so refresh preserves position.
- `<Subsection>` — nested group inside a Section.
- `<Hint>` — the muted-italic placeholder (pre-fill).
- `<Default>` — a "Revert to default" affordance per field (appears on hover).

---

## 7. Smart defaults — declarative, not imperative

A default is attached at state initialization, not patched in:

```js
var _age = useState(45), age = _age[0], sAge = _age[1];
var _defaultAge = 45; // exposed via DEFAULTS map

// In FieldExpanded:
// - If v === _defaultAge AND user never typed, show muted italic + "(default)"
// - If user typed, show bold + "(modified)"
// - Hover over modified → offer "Revert to default"
```

DEFAULTS map is a single object at top of `planner_v3.html` with every variable's default. Adding a new default = one line. Pre-fills are visibly marked in the form; sidebar doesn't surface them (cockpit shows only user-entered values).

### Default tiers

1. **Absolute defaults**: province=QC, inflation=2.1 %, deathAge=93.
2. **Regional** (derived from `prov`): inf, health inf, housing inf.
3. **Demographic** (derived from `age`, `sex`): stoch mortality pre-pick, glide path.
4. **Salary-derived**: `avgE = sal / 1.25`, `qppYrs = min(39, age − 18)`.
5. **Profile templates** (future, out of scope now): "Functionnaire approchant retraite" pre-fills 30+ fields.

---

## 8. Risk register with mitigations

| # | Risk | Mitigation | Ship phase |
|---|---|---|---|
| 1 | 190 variables to tier — bikeshedding | §5 tiering table is the contract. User reviews once; execution is mechanical. | Phase 1 |
| 2 | Borderline fields — ambiguous placement | §4 objective rules + §5 resolved borderline list. Default-to-blueprint when on the fence. | Phase 1 |
| 3 | Two layouts to maintain | `<Field>` primitive + `LayoutCtx`. One bug, one fix, both layouts update. | Phase 2 |
| 4 | Form discoverability | Form ToC + search box; sidebar module header has "📋 Ouvrir formulaire complet →" jump link. URL hash `#section-mer` scrolls precisely. | Phase 5 |
| 5 | Real estate / business entangle levers + blueprint | Per-property card in sidebar shows 4 lever fields + "Éditer détails" button → opens form at that property. | Phase 4 |
| 6 | Pre-filled defaults mask user intent | Muted italic + "(default)" label. "Revue des valeurs par défaut" gate before first Simulate call. | Phase 4 |
| 7 | Progress bar implies completion | No progress bar. "Revu le {date}" timestamp per section. Copy: "Un plan évolue — revenez chaque trimestre." | Phase 3 |
| 8 | Mobile form layout | Single column < 1100 px. One section open at a time. Full-screen sheet with back button. | Phase 3 |
| 9 | State drift between sidebar and form | Shared React state hook per variable. No copy. Impossible to drift by construction. | Phase 2 |
| 10 | Explicit save/exit flow vs live edits | Auto-save (already behaviour today). "Close" is return to dashboard. No submit button. | Phase 3 |
| 11 | Power users lose muscle memory | Sidebar stays, sparser, but present. Returning users land in sidebar as before. Form is opt-in via a button. | Phase 2 |
| 12 | Engine regression during field migration | Shared state = no param-payload changes. Snapshot harness (V3-AUDITS.md Phase 0) runs between each phase. | All phases |
| 13 | Bilingual parity drifts | Compliance linter (V3-AUDITS.md Phase 0.5) blocks commit on string-parity break. | All phases |
| 14 | Goals / events split between cockpit (summary) + blueprint (editor) | Cockpit shows read-only list + "add" button. Add button opens form at goals editor. Consistent with RE/business pattern. | Phase 4 |
| 15 | Spouse view — when sidebar shrinks, where do the 10+ hidden-by-sync spouse fields live? | Form. Conjoint section of the form has the full primary-spouse-side-by-side layout. Sidebar only shows essentials + sync toggles. | Phase 4 |

---

## 9. Phased implementation

Each phase ships as a reviewable commit with an audit entry in `V3-AUDITS.md`. Every phase can be reverted cleanly — no phase leaves the app in a half-working state.

### Phase 1 — Freeze the tiering contract (30 min)

- Update `V3-FINAL-PLAN.md` referencing this file as the authoritative tiering source.
- Produce printable/searchable tiering table (already in §5).
- User sign-off.

**Acceptance**: every variable in `planner_v3.html` state declarations mapped to a tier. Zero variables unclassified.

### Phase 2 — `<Field>` primitive + `LayoutCtx` (3 h)

- Introduce `<Field>` component, `LayoutCtx`, `FieldCompact` (= today's sidebar field), `FieldExpanded` (new, full row with help text + default placeholder).
- Migrate Profile module fields to use `<Field>`. Sidebar looks **identical** post-migration — same visual output, new component substrate.
- Form layer still TODO. Sidebar unchanged.

**Acceptance**: Profile module renders byte-identically to pre-change. Other modules untouched. No engine output change.

### Phase 3 — Blueprint form shell (4 h)

- Add full-screen form layout: hidden by default.
- Triggered by a "📋 Formulaire complet" button in the main header (next to Simulate).
- Form chrome: title, breadcrumb, section collapse controls, search box, ToC sidebar, close button.
- Form body: Profile section only (migrated from Phase 2). Uses `FieldExpanded` via `LayoutCtx.Provider value="expanded"`.
- "Section revue le 2026-04-17" per section (user clicks checkbox to mark).
- Auto-save via existing hooks.
- URL hash routing for deep links.
- Mobile: full-screen sheet, single column, one section open at a time.

**Acceptance**: user clicks form button → form opens → Profile section editable in new layout → close → sidebar still works → identical engine output for identical input.

### Phase 4 — Tier-2 migration, module by module (6 h)

One commit per module. Sidebar shrinks as form absorbs Tier-2 fields.

Order of migration (lightest first):

1. Strategy (Fiscal) module — fields: `splitP`, `qppShare`, `wStrat`. (20 min)
2. Cashflow module — budget categories into form; part-time stays in cockpit. (30 min)
3. Savings module — allocations, MER, special-accounts detail, FHSA home age, RESP. (1 h)
4. Pension module — `penIdx`, `penEE`, `penER`, `penMER`, `pen2*`, `avgE`, `qppYrs`. (1 h)
5. Conjoint module — unsynced spouse fields, spouse portfolio details, spouse insurance details. (1 h)
6. Real estate — deep fields behind "Détails" button per property. (1.5 h)
7. Business module — CCPC extraction, sale, IPP, LCGE. (1 h)
8. Model module — stress, mortality, health cost, MC count. (30 min)
9. Goals + events — editor in form; summary+add in sidebar. (30 min)
10. Insurance — type, duration, critical illness, disability detail. (30 min)

After each: snapshot harness run → sidebar visually lighter → form gains content.

**Acceptance per migration**: snapshot harness green; module still editable both in cockpit (fewer fields) and blueprint (full set); string linter clean.

### Phase 5 — Form polish: search, ToC, pre-fills (3 h)

- Search box at top of form — live-filters sections + fields by label.
- Collapsible ToC on left — shows sections + "revue" timestamp, anchor links.
- Default values render as muted italic placeholders in `FieldExpanded`.
- "(default)" marker next to unmodified fields.
- Hover any field → "↶ revert to default" affordance.
- "Revue des valeurs par défaut" gate: before first Simulate run, if user has never opened the form, show a banner linking them to it once.

**Acceptance**: user can type "mer" and find every MER field; pre-fills visible; revert works.

### Phase 6 — Sidebar esthetic pass (2 h)

Now that the sidebar is 30 fields, apply the visual rhythm promised in Phase 7:
- Module cards with breathing padding.
- Fewer but more prominent labels.
- Single-column where 2-column felt cramped.
- Hover feedback on every interactive element.
- Save/restore sidebar scroll position per module.

**Acceptance**: every sidebar module fits without scroll on a 800-px-tall viewport (reference: MacBook Air).

### Phase 7 — Cross-surface parity + documentation (2 h)

- Update report-data.js so exports include `sectionReviewDates` (Phase 3 feature) for advisor-facing reports.
- Update `V3-AUDITS.md` with closing audit.
- Add a "Guide" section in the Guide tab explaining cockpit vs blueprint.
- Bilingual string review pass.

**Acceptance**: all previous V3 phase audits + this plan's phases green. Linter clean. Lighthouse accessibility ≥ 95.

---

## 10. Total effort estimate

| Phase | Hours |
|---|---|
| 1 — Tiering contract | 0.5 |
| 2 — `<Field>` primitive | 3 |
| 3 — Form shell | 4 |
| 4 — Tier-2 migration (10 modules) | 6 |
| 5 — Form polish | 3 |
| 6 — Sidebar esthetic pass | 2 |
| 7 — Cross-surface + docs | 2 |

**Base: ~20 h.** With QA + debug overhead: **28–32 h / 4 dev-days**.

---

## 11. Rollback plan

Every phase is one commit. If any phase causes regression:

- `git revert <sha>` the phase.
- Sidebar + form both preserve — sidebar falls back to pre-phase-2 state (which is the current v3), form button disappears if removed entirely.
- No data migration, no engine impact.
- State hooks are unchanged across phases — only UI presentation changes.

---

## 12. Gating rules

1. No phase skipped.
2. Snapshot harness green across every phase boundary.
3. Compliance linter clean at every commit.
4. Bilingual parity same-day.
5. Each phase has a written self-audit in `V3-AUDITS.md` before the next phase starts.
6. `git revert` leaves the app in a working state — tested by running harness after a simulated revert on every phase.

---

## 13. Open decisions for user

Before Phase 1 kicks off, these calls need to be locked:

1. **Form entry point**: button in main header, rail icon, or both? *Recommend: button in header labeled "📋 Formulaire complet"; sidebar module header also has "→ Ouvrir dans le formulaire" jump link.*
2. **Form default entry mode**: first-time users land in form or sidebar? *Recommend: sidebar first (faster perceived load), but show a one-time banner suggesting the form for initial setup.*
3. **Search or filter**: is a search box in the form worth 1 h of Phase 5? *Recommend: yes. 190 fields benefit from Ctrl-F.*
4. **Review timestamps per section**: ship or defer? *Recommend: ship (Phase 3). Solves the "when did I last look at this?" problem cheaply.*
5. **Profile templates** ("Functionnaire approchant retraite" pre-fills 30 fields): in this plan or a follow-up? *Recommend: follow-up. This plan is already 20 hours; templates need UX research and compliance review (is pre-filling retirement assumptions for a demographic group responsible? likely needs AMF sign-off on copy).*

---

**Awaiting sign-off on §5 tiering table and §13 decisions. Once locked, Phase 1 commit lands within 30 min.**
