# PLAN-PIVOT.md - Execution Plan v2
> Realigned plan based on current product vision.
> Mis a jour: 2026-03-12

---

## 0. Canonical Target

| Product | Price | Core value |
|---|---|---|
| Bilan | 9.99 CAD | Solid report for simple profiles. |
| Bilan 360 | 19.99 CAD | Single product with 2 streams: accumulation + decumulation. |
| Laboratoire | 49.99 CAD | Advanced simulator + AI report credits. |
| Laboratoire renewal | 19.99 or 24.99 CAD/year (TBD) | Annual continuity of Lab capabilities. |

Lab quota target: 5-10 AI reports (final number TBD).

## 1. Product Principles (non-negotiable)
- Product quality first, website second.
- AI narration is central product value.
- No free-hub-first strategy.
- No forced upsell ladder between report products.
- Reports must be coherent between products (formatting, presentation, structure).

## 2. Phase Plan

### Phase 1 - Bilan (9.99) Quality Uplift [ACTIVE]
Goal: deliver a report that competes with free tools and paid alternatives.

P0 tasks:
- BIL-01: Audit current Bilan report end-to-end (data correctness + readability)
- BIL-02: Strengthen AI narration quality (fact grounding, less generic copy)
- BIL-03: Enforce fallback parity when AI fails
- BIL-04: Normalize report formatting with shared helpers
- BIL-05: Add/report consistency checklist for QA signoff
- BIL-06: Validate bilingual parity FR/EN
- BIL-07: Final pass on AMF-safe language

Done criteria:
- Report quality accepted on representative test profiles.
- No section quality cliff between AI-on and AI-fallback mode.
- Consistency checklist fully green.

### Phase 2 - Bilan 360 Merge and Questionnaire Routing
Goal: one product, two streams, clear intake routing.

P0 tasks:
- B360-01: Add routing question early in flow (accumulation vs decumulation)
- B360-02: Route to existing intermediaire/decaissement pipelines
- B360-03: Align copy and section naming under Bilan 360 branding
- B360-04: Standardize visual + structural output across both streams
- B360-05: Verify checkout metadata includes selected stream
- B360-06: Validate webhook routing and report delivery for both paths

Done criteria:
- Both streams share one product identity.
- No technical ambiguity in checkout/webhook/report pipelines.

### Phase 3 - Laboratoire Upgrade
Goal: keep Lab as premium exploration environment.

P0 tasks:
- LAB-01: Clarify simulator workflows and output readability
- LAB-02: Improve AI export quality and consistency with report standards
- LAB-03: Implement/validate AI report quota system (configurable)
- LAB-04: Implement renewal handling with configurable price tier
- LAB-05: Ensure Lab output style remains coherent with Bilan/Bilan 360

Open decisions:
- Renewal = 19.99 or 24.99
- Quota = between 5 and 10 reports

Done criteria:
- Stable simulator + clear export value proposition
- Renewal and quota model locked and documented

### Phase 4 - Website and Packaging
Goal: align marketing surfaces after product quality is locked.

P0 tasks:
- WEB-01: Update landing/product cards/pricing to canonical model
- WEB-02: Align CTA routing with new product map
- WEB-03: Update legal/pricing references and email copy
- WEB-04: Final QA on bilingual consistency

## 3. Report Consistency Contract (cross-phase)
This is mandatory for all phases.

Every report must maintain:
- shared formatting conventions
- shared presentation quality baseline
- shared structural logic
- shared AI narrative discipline

Canonical technical checklist lives in `docs/TECH-REFERENCE.md`.

## 4. Work Sequence for this cycle
1. Execute Phase 1 (Bilan quality) immediately.
2. Then implement Phase 2 routing for Bilan 360.
3. Then execute Phase 3 Lab upgrades.
4. Website updates only in Phase 4.
