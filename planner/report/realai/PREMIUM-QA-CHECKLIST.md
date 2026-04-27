# Premium Report — Per-Batch QA Checklist

> Sign-off gate before declaring a 5-profile or 20-profile batch
> "shippable". Every box must be ticked **per profile**, not globally.
> Estimated cost: ~5 min/profile. A 5-profile batch is ~25 min.

Discovered after Codex review 2026-04-27 surfaced 8 trust/polish gaps
that the auto-auditors didn't catch. The auditors are now stricter
(`trust-gate-auditor.js` + `language-auditor.js` jargon-mix block),
but human eyeballing is still required for layout, voice, and
audience fit.

---

## Workflow

1. Run `node planner/report/realai/run-pipeline.mjs --only=<id1>,<id2>`.
2. Open each shipped HTML in a browser (not the editor preview — needs
   real layout + JS for interactive widgets).
3. Walk the checklist below in order. Stop at the first failure and
   file a fix; don't keep going.
4. After all boxes tick, run:
   `node planner/report/realai/tests/classifier-behavior.test.mjs`
   `node planner/report/realai/tests/render-profile-derivation.test.mjs`
   Both must be 100% pass.
5. Commit with a "review: <date> batch <ids>" suffix.

---

## Cover (visible in browser)

- [ ] Client name shows correct diacritics (François, Éric, Hélène, Anaïs,
      etc.). No bare-ASCII version anywhere on the page.
- [ ] No "Reader profile —" / "Profil lecteur —" combo banner.
- [ ] No SKU pill ("Planner — Simulator + 5 AI reports").
- [ ] No "Basé sur 5000 scénarios Monte Carlo · t-Student" footer.
- [ ] No version footer ("BuildFi Technologies inc. · buildfi.ca · v12.0.0").
- [ ] Cover title reads "Plan financier" (not "Plan de retraite").
- [ ] Cover sub reads "Plan financier personnalisé" (FR) / "Personalized
      Financial Plan" (EN).
- [ ] Score gauge visible: arc + score + "/ 100" label correctly aligned
      INSIDE the arc opening, not below or beside it.

## Executive summary (page 2)

- [ ] Heading "Sommaire exécutif" (FR) / "Executive summary" (EN). NOT
      "Synthèse exécutive".
- [ ] "Score de préparation" has the explainer line: "Préparation
      structurelle... différent du taux de succès". Reader can tell
      what the 100 measures.
- [ ] Median wealth tile: never "—" (em-dash). $0 acceptable IF the
      sub-line shows "· corp ≈ $X" qualifier (CCPC owners).
- [ ] No mixed-language classifier values ("intermediate / low /
      balanced" in an FR report).
- [ ] No internal engineering vocabulary ("Sprint", "Phase", "renderProfile",
      "fix-plan", "case_driver", "omittedBlocks") in client prose.

## Table of contents

- [ ] No density-mode legend (green/gold/blue dots + "Inclus dans Court").
- [ ] No coverage badges per row.
- [ ] No FR/EN jargon mix in section labels ("Stratégie Meltdown REER" →
      should be "Stratégie de décaissement anticipé du REER").
- [ ] Numbered sequence is contiguous; section IDs in TOC match those
      in the rendered body.

## MC fan chart (Projection Monte Carlo)

- [ ] Three chips: Prudent (P25, red), Médian (P50, gold), Favorable
      (P75, green). Active chip background + border match trace color.
- [ ] On "Prudent (P25)" click: red P25 line near the BOTTOM of the
      band; green P75 line hidden; gold P50 line dimmed to ~12%.
- [ ] On "Favorable (P75)" click: green P75 line near the TOP of the
      band; red hidden; gold dimmed.
- [ ] End-of-line value label sits ON the active percentile line at
      its actual y-position (not on a different line).
- [ ] Click-affordance hint visible at first ("Cliquez sur une année ↓").

## Tornado / sensitivity

- [ ] If chart present: actual bars visible (not just an empty axis with
      labels).
- [ ] If plan is at boundary (P25/P50 = $0): "Sensibilité saturée"
      callout shown instead of empty chart, with explanatory prose.

## Savings donut (Profile section)

- [ ] Inner ring = stocks/bonds allocation (lighter shades).
- [ ] Outer ring = account type (REER/CELI/NR with saturated colors).
- [ ] Caption matches: "Anneau intérieur: actions/obligations · Anneau
      extérieur: type de compte" (FR) or equivalent EN.
- [ ] If user did NOT provide allocR/T/N: no inner equity/bond ring at
      all (don't visualize engine defaults).

## Section ordering by classifier

- [ ] `data-bf-leadwith="floor"` (calm reader): revenue section before
      projection section in HTML order.
- [ ] `data-bf-leadwith="dispersion"` (direct reader, expert mode): risk
      section appears before projection.
- [ ] `data-bf-leadwith="projection"` (neutral, accumulator): default
      order — projection then revenue.

## AI narrative content

- [ ] Every numeric quote in AI narrative MATCHES canonical engine
      output (within $1K rounding tolerance for currency, 0.5pts for
      rates). NO eyeballed values.
- [ ] Case-driver content beats present:
  - debt_paydown: "rembourser…investir" or "rendement après impôt" or
    "coût d'opportunité".
  - hnw_estate: at least one of estate freeze / alter-ego trust /
    fiducie / charitable / fondation.
  - debt_young: debt-vs-invest tradeoff explicitly named.
  - rrsp_only_late_starter: shortfall_or_lifestyle_compromise named.
  - immigrant_partial_qpp: contribution_room_addressed +
    retirement_age_lever named.
- [ ] Tone: AMF-conditional ("pourrait" / "could" / "would"). No
      "vous devez" / "you should" imperatives.

## Language purity (FR-only OR EN-only — no mix)

- [ ] No EN engineering jargon in FR copy: "Meltdown", "What-If",
      "Drawdown", "Sequence of returns", "Simulator", "Dashboard".
- [ ] No bare-ASCII names where diacritic version is canonical
      (Francois, Helene, Eric → François, Hélène, Éric).
- [ ] No "What-If Simulator" heading in FR — should be "Simulateur"
      or "Essayez d'autres scénarios" for plain readers.

## Print preview (Ctrl+P or Cmd+P)

- [ ] Sticky bar / view-toggle / chip bars / hint badges all hidden.
- [ ] No `data-bf-chart-data="..."` JSON payload visible in printed
      HTML (stripped via beforeprint listener).
- [ ] System fonts (Inter / Georgia / Courier) render — no FOUT, no
      web-font flash.
- [ ] Page numbers + "buildfi.ca" running header present.

## Beginner mode special case (`__beg_*_con`)

For beginner / concise variants ONLY:

- [ ] Cover label NOT "Detailed Report" / "Rapport détaillé" (still TODO).
- [ ] Stress-tests section, sensitivity section, RSU section, asset-
      location section all hidden (relevance gate).
- [ ] Fan chart replaced by P25/P50/P75 prose summary.
- [ ] Methodology, assumptions, glossary collapsed inside `<details>`.
- [ ] No "What-If Simulator" heading; should read "Try other scenarios"
      / "Essayez d'autres scénarios".
- [ ] No technical methodology footer on cover.
- [ ] No "Every number is traceable" trust copy (or shortened FR variant).

---

## Auto-auditor expectations (run as gate)

After manual checks pass, the pipeline summary should report:

- 0 blocker findings per shipped profile.
- Trust-gate auditor returns 0 findings (any finding is a BLOCKER and
  blocks ship).
- Language auditor returns 0 jargon-mix findings (BLOCKER).
- Content-depth auditor: max 1 major per profile, never blocker.
- AI canonical-quote auditor: 0 majors. If any present, fix the
  AI slot in `responses/{profile}.json` before declaring batch shipped.

---

## Known partial deliveries (NOT done — track per pass)

- Phase 2 central dispatch: only fan + tornado route through
  `resolveRepresentation`. Income waterfall, fee_impact, draw-order
  still ad-hoc.
- Phase 3 leadWith: revenue/projection/risk reorder only. Doesn't
  re-rank goals, real-estate, corp.
- Phase 6 export contract: forces full/deep on print + downloadHTML
  routes only. PDF download path not battle-tested in the live app.
- Beginner-mode cover label: still says "Detailed Report" /
  "Rapport détaillé". Should compress to "Plan financier" only.

---

**Sign-off line — fill before declaring batch shipped:**

```
Batch:           [ id1, id2, id3, id4, id5 ]
Date reviewed:   YYYY-MM-DD
Reviewer:        <name>
Pipeline status: shipped <N>/5 (failures: <profile>)
Auto-audit:      0 blocker (trust-gate clean: yes/no)
Manual checks:   <count> ticks / <total>
Notes:           <any deviations or reasons reviewer is over-riding>
```
