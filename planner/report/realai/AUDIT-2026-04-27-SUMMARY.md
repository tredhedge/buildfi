# Audit Session — 2026-04-27 Late Night

## TL;DR

- **Pipeline: 20/20 ship gate met** (was 4/20 at session start). 0 blockers across all profiles.
- **10 parallel audit sub-agents** ran across 10 dimensions of the report deliverable. All findings reviewed; actionable fixes implemented.
- **Two new auditors** added to the ship gate: `trust-gate-auditor.js` + extended `language-auditor.js`.
- **Premium QA checklist** committed at `planner/report/realai/PREMIUM-QA-CHECKLIST.md` for per-batch sign-off.

---

## What got fixed tonight

### Wave 1 — Premium polish layer (cover + exec summary)
- Cover: dropped Planner SKU pill, reader-profile combo banner, methodology footer ("Basé sur 5000 scénarios"), version footer ("v12.0.0 · buildfi.ca"), sim-distribution meta-line under hero gauge.
- Cover title: "Plan financier" replaces "Plan de retraite" everywhere (cover, page header, browser `<title>`).
- Exec summary heading: "Sommaire exécutif" replaces "Synthèse exécutive".
- Score gauge: viewBox tightened (220×115); score number recentered with explicit y=68 baseline + `butt` linecap (eliminates end-cap bleeds at 0% / 100%); tick markers contained inside the 14px stroke band.
- TOC: density-mode coverage badges + bilingual legend removed (was internal product chrome and failed WCAG color-contrast).

### Wave 2 — Language purity sweep
- Bulk substitute "Meltdown REER" → "Décaissement anticipé du REER" across renderer FR strings.
- "Simulateur What-If" → "Simulateur de scénarios" in FR client prose. Plain-mode readers see "Essayez d'autres scénarios".
- profiles.json: François Dubois (cedilla) replaces Francois Dubois.
- Tornado callout: passes `fr` flag through to `svgTornado` so the "Sensitivity saturated" prose translates correctly.
- Methodology feature list: "Décaissement anticipé REER" properly ternary'd so EN reports show "RRSP meltdown" instead of leaking FR.

### Wave 3 — Content-depth case-driver beats
Added required content beats to the deterministic narrative for 5 case-drivers:
- `gap_savings`: cites "unused RRSP contribution room" + "retire later" + "extends accumulation".
- `debt_paydown`: cites "rembourser ou investir" + "rendement après impôt" + "coût d'opportunité".
- `fire_bridge`: cites "early vs deferred CPP/OAS" with +42% CPP / +36% OAS deferral math.
- `db_pension_split`: cites the DB formula explicitly ("years of service × accrual rate × final earnings, rule of 80/85/90").
- `hnw_estate`: cites "spousal rollover" + "estate freeze" + "alter-ego trust" + "donor-advised fund".
- `late_start_savings`: cites "shortfall / lifestyle adjustment" tradeoff.

These closed 11 content-missing-beat majors that were blocking 8 profiles from shipping.

### Wave 4 — Auditor hardening
- New `trust-gate-auditor.js`: hard ship-blocking checks for blank KPI tiles, mixed-language classifier labels, placeholder copy, internal engineering vocabulary leaks. Wired into review-orchestrator after content-depth.
- Extended `language-auditor.js`: adds FR/EN engineering-jargon-mix detector (Meltdown / What-If / Drawdown in FR; méthodologie / synthèse / décaissement in EN) and name-variant detector (catches Francois vs François in same report).
- Updated `table-auditor.js` + `visual-integrity-auditor.js`: now classifier-aware. Plain-mode readers (`jargonMode='plain'`) legitimately omit `sec-stress` and `sec-risk` — auditors no longer flag those omissions as blockers.

### Wave 5 — Fan chart visual polish
- Chip handler rewritten: chip background/border matches active trace color (red / gold / green). Year-end value label anchored on the active percentile path via deterministic d-attribute parsing (regex extracts last numeric pair).
- Bands fade to ~2% opacity when a focused scenario is active.
- Tornado: when ±1σ swings collapse to ~$0 magnitude (plan pinned at boundary), substitute a "Sensitivity saturated" callout instead of an empty axis.

### Wave 6 — Embedded What-If simulator browser fix
- Inlined `report-constants-2026.js` into shipped HTML before the engine script. The simulator was throwing `Cannot read properties of undefined (reading 'map')` on every quick-scenario click because `report-engine.js` reads `window.BFConstants` at module scope and the shipped HTML never inlined the constants module.

### Wave 7 — TOC + section consistency (Audit 3 fix)
Added missing entries: `sec-timeline`, `sec-closing-recap`, `sec-whatif`, `sec-glossary`, `sec-insurance` (when applicable), `sec-premium-deepdive` (Planner SKU). Conditional gating per data availability + classifier.

### Wave 8 — Beginner-mode polish (Audit 8 fix)
- Cover title: beginner readers (`jargonMode='plain'`) see "Plan financier" / "Financial Plan" + "Aperçu personnalisé" / "Personalized snapshot" instead of "Detailed Report".
- `_relevanceGate` extended to hide `sec-risk` and `sec-stress` for plain readers.
- TOC entries for those sections suppressed when `jargonMode='plain'`.
- Auditors (table + visual) updated to NOT flag the legitimate plain-mode omissions.

---

## Findings from the 10 audit sub-agents

| # | Audit Scope | Verdict | Action |
|---|---|---|---|
| 1 | Language purity | False positives on orphan files (deleted); canonical files **CLEAN** | Orphan cleanup |
| 2 | Cover + exec summary | False positives on orphan files; canonical **CLEAN** (no version footer / methodology / SKU pill) | Orphan cleanup |
| 3 | TOC consistency | 31/31 MAJOR (universal undercount: timeline/closing-recap/whatif/glossary missing) | Fix shipped |
| 4 | KPI tile integrity | 6 BLOCKER em-dashes — all on stale orphan files | Orphan cleanup |
| 5 | Charts data integrity | 0 blockers, 0 majors, 1 minor (lite-tier omits chart by design) | None needed |
| 6 | AMF compliance + tone | 0 prescriptive verbs; tone-band thresholds initially adjusted then reverted (cascading regression) | Reverted |
| 7 | AI narrative quality | 0 blockers, 0 majors; taxInsight slot 62w avg (target 80w) | Future improvement |
| 8 | Beginner mode | 2 MAJOR: "Detailed Report" cover label + risk/stress visible in TOC | Both fixed |
| 9 | Premium tier value | 1.45x word ratio Planner/Bilan; fire_seeker (Bilan) edge case noted | Future review |
| 10 | Print/PDF hygiene | 11/11 PASS | None needed |

---

## What remains for next session

### Real partial deliveries (architectural debt, not bugs)
1. **Phase 2 central dispatch**: only fan + tornado route through `resolveRepresentation`. Income waterfall, fee_impact, draw-order still ad-hoc.
2. **Phase 3 leadWith**: revenue/projection/risk reorder only. Doesn't re-rank goals, real-estate, corp.
3. **Phase 6 export contract**: forces full/deep on print + downloadHTML. PDF-download path not battle-tested in the live app.
4. **AI canonical-quote drift queue**: 19/20 profiles still have AI slots flagged for canonical-quote / tone-band drift. Pipeline ships deterministic fallback in the meantime. Ideal next step: AI re-generation loop with the canonical numbers pinned as inline `{{}}` placeholders so the model literally cannot drift.

### Audit-driven follow-ups
1. **taxInsight depth**: AI slot averages 62 words; target is 80. Re-prompt the LLM with stricter min-length per slot.
2. **fire_seeker_fr (Bilan SKU) word count**: 82K words exceeds most Planner reports. Either move to Planner SKU OR force `densityMode=balanced` on Bilan.
3. **Tone-band thresholds**: keep monitoring. The 0.75/0.50/0.25 thresholds are stable but read as too generous for some readers; revisit with user feedback.
4. **govt_db_couple_ab_en classifier**: profile is `int/low/det` not `adv/*/det`. Confirm intent.

---

## Metrics

| Metric | Start of session | End of session |
|---|---|---|
| Profiles shipped | 4/20 | 20/20 |
| Trust-gate blockers | unknown (no auditor) | 0 |
| Language-leak blockers | 12 jargon-mix | 0 |
| Content-depth majors | 11 missing beats | 0 |
| TOC undercount findings | 31/31 majors | 0 |
| Audit sub-agents run in parallel | 0 | 10 |
| New auditors added to ship gate | 0 | 2 |

---

## Files changed (summary)

- `planner/report/report-pdf.js` — cover cleanup, gauge re-center, TOC additions, beginner cover title, FR meltdown sweep, tornado fr flag, render-risk + stress relevance gates.
- `planner/report/report-render-profile.js` — `_relevanceGate` extended for risk + stress + sensitivity.
- `planner/report/report-actions.js` — FR meltdown labels updated.
- `planner/report/report-glossary.js` — FR meltdown label updated.
- `planner/report/report-formatters.js` — cover_sub label updated.
- `planner/report/report-charts.js` — tornado boundary callout.
- `planner/report/report-interactive.js` — fan chart chip handler rewrite, click-affordance hint, system-font print fallback.
- `planner/report/review/reviewers/language-auditor.js` — jargon-mix + name-variant detection.
- `planner/report/review/reviewers/trust-gate-auditor.js` — NEW.
- `planner/report/review/reviewers/table-auditor.js` — classifier-aware mandatory section logic.
- `planner/report/review/reviewers/visual-integrity-auditor.js` — classifier-aware risk-section check.
- `planner/report/review/review-orchestrator.js` — wire trust-gate auditor.
- `planner/report/realai/run-pipeline.mjs` — `--only` filter, BF_CONSTANTS_JS load, combo-suffix output.
- `planner/report/realai/profiles.json` — François Dubois cedilla restored.
- `planner/report/realai/responses/*.json` — bulk jargon-mix substitution (FR responses).
- `planner/report/realai/PREMIUM-QA-CHECKLIST.md` — NEW.
- `planner/report/realai/AUDIT-2026-04-27-SUMMARY.md` — THIS FILE.
