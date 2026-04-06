# AUDIT-PROMPT.md
> Updated 2026-03-12 - aligned with current product model.

Use this prompt at the end of major build sessions to audit quality before release.

## Audit Scope
Audit all three products under the current model:
- Bilan (9.99)
- Bilan 360 (accumulation + decumulation streams)
- Laboratoire (simulator + AI reports)

## Priority Order
1. Data correctness (calculations, routing, output integrity)
2. Report coherence across products (formatting/presentation/structure)
3. AI narration quality (grounding, clarity, AMF-safe language)
4. UX reliability (errors, loading states, dead ends)
5. Compliance/security checks

## Required Checks

### A. Routing and pipeline integrity
- Bilan 360 routing question correctly dispatches to the intended stream.
- Checkout metadata preserves selected stream.
- Webhook routes to correct translator/renderer.

### B. Report coherence contract
Verify parity across Bilan, Bilan 360 accum/decum, and Laboratoire exports:
- formatting conventions
- visual hierarchy
- section flow
- fallback behavior

### C. AI narration quality
- Text tied to user data, not generic filler.
- No empty AI slots or broken fallback sections.
- FR and EN outputs maintain equivalent quality.

### D. AMF-safe language
- No prescriptive advisory wording.
- Conditional/observational language maintained.

### E. Security and reliability
- No key exposure
- No broken auth flows
- No silent checkout/report failures

## Output format
Return a prioritized issue list:
- P0: ship blockers
- P1: quality risks
- P2: polish

Include file references and concise repro notes.
Do not patch during audit; list issues first.
