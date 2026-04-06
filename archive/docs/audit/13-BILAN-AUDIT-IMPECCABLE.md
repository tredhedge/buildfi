# 13-BILAN-AUDIT-IMPECCABLE.md
> Scope: Bilan (Essentiel) quality audit with Inter/Decum cross-check for coherence.
> Date: 2026-03-12
> Mode: Read-only audit (no runtime product overwrite)

---

## 1) Executive Summary

The Bilan report base is strong, but 4 P0 issues prevent "impeccable" consistency:
- Prompt contract conflict on slot length (2 vs 2-3 sentences).
- Essentiel prompt path uses raw `quizAnswers` while Inter uses normalized `_quiz`.
- Narrative density is high (multiple intro blocks before core sections), hurting fast comprehension.
- Cross-report footer/referral copy still carries discount framing ("15% off"), which conflicts with a no-upsell-in-report posture.

The plan should start with prompt/contract hardening + transition discipline before visual polish.

---

## 2) Key Findings (Prioritized)

## P0-1 Prompt contract conflict (Essentiel)
- File: `lib/report-html.js`
- Evidence:
  - `sys`: "Maximum 2 sentences per slot" (`line 621`)
  - `usr`: "Return JSON with 2-3 sentences per slot" (`line 675`)
- Risk:
  - Unstable output style and inconsistent section rhythm.
- Fix direction:
  - Define one slot-length rule for Essentiel and enforce it in both `sys` and `usr`.

## P0-2 Input contract mismatch (Essentiel vs Inter)
- File: `app/api/webhook/route.ts`
- Evidence:
  - Inter uses normalized quiz from translator: `const quiz = params._quiz || {}` (`line 241`) and passes it to prompt builder (`line 242`).
  - Essentiel passes raw `quizAnswers` to prompt builder (`line 259`) instead of `params._quiz`.
- Risk:
  - Behavioral drift between tiers and weaker prompt control for Bilan.
- Fix direction:
  - Pass normalized payload (`params._quiz`) to Essentiel prompt builder (same architecture as Inter).

## P0-3 Experience overload in Bilan opening flow
- File: `lib/report-html.js`
- Evidence:
  - Decision card + objective callout + "30 secondes" mirror + reading guide + TLDR are all stacked before later diagnostics (`lines 1240-1385`).
- Risk:
  - Strong content quality, but too much early text for low-confidence users.
- Fix direction:
  - Keep one primary summary block, move secondary explanatory blocks lower, preserve transitions.

## P0-4 No-upsell posture not fully consistent in report footers
- Files:
  - `lib/report-html.js` (`lines 1790-1795`)
  - `lib/report-html-inter.js` (`lines 1576-1579`)
  - `lib/report-html-decum.js` (`lines 1020-1022`)
- Evidence:
  - Referral block includes discount framing ("15% off / 15% rabais").
- Risk:
  - Mixed message vs "self-contained report" strategy.
- Fix direction:
  - Replace discount-led referral copy with neutral "share if useful" copy.

---

## 3) Important P1 Findings

## P1-1 Structural parity drift between renderers
- `lib/report-html-inter.js` uses explicit numbered sections and consistent `sec-*` anchors.
- `lib/report-html-decum.js` uses a different section assembly style and no anchor parity.
- Impact:
  - Harder to maintain one coherence contract for formatting/navigation.

## P1-2 Terminology drift in customer-facing labels
- Inter header still references "Snapshot 360" while product strategy is "Bilan 360".
- Decum title still "Horizon" in report title and badge.
- Impact:
  - Brand coherence risk across products.

## P1-3 Test gap on narrative/transitions
- Existing tests are strong for calculations and rendering integrity.
- Missing strict tests for:
  - required transition presence/order,
  - sentence-count contract per slot,
  - cross-section narrative continuity.

---

## 4) What Already Looks Good

- Translator coverage is robust and explicit by tier:
  - `lib/quiz-translator.ts`
  - `lib/quiz-translator-inter.ts`
  - `lib/quiz-translator-decum.ts`
- Shared sanitization and compliance filtering are in place:
  - `lib/ai-constants.ts`
- Inter prompt architecture is mature (voice matrix, orthogonality, slot controls):
  - `lib/ai-prompt-inter.ts`

---

## 5) Parallel-Safe Execution Plan (No Product Overwrite)

## Track A - Prompt + translator contract (P0)
- A1: Unify Essentiel slot-length rule in both `sys` + `usr`.
- A2: Route Essentiel prompt input through normalized `_quiz`.
- A3: Add one contract check test for slot-length instruction consistency.

## Track B - Narrative flow cleanup (P0)
- B1: Reduce opening cognitive load in Bilan (single primary summary).
- B2: Keep bridge sentences per section; enforce "what you see -> what it means -> what changes".
- B3: Maintain existing sections/order unless explicitly approved for cutover.

## Track C - Cross-report coherence (P1)
- C1: Remove discount-led referral copy from all report footers.
- C2: Align naming: Bilan / Bilan 360 / Decum stream label policy.
- C3: Add minimal cross-report formatting parity checklist.

## Track D - QA hardening (P1)
- D1: Add transition presence tests (Bilan).
- D2: Add narrative contract tests (slot sentence count + non-empty transitions).
- D3: Keep existing calculation suite unchanged.

---

## 6) Suggested First Sprint (48h)

1. Fix P0-1 and P0-2 (prompt + input contract).
2. Do minimal opening-flow simplification in Bilan (P0-3) behind parallel-safe checks.
3. Replace footer discount framing (P0-4).
4. Run existing report tests + new narrative contract checks.
