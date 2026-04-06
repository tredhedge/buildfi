# AB-TESTING-GUIDE.md

## Overview
BuildFi uses PostHog feature flags for controlled A/B tests.

Current product naming to use in all experiments:
- Bilan (9.99)
- Bilan 360 (19.99)
- Laboratoire (49.99)

Do not use deprecated naming in experiment labels or copy.

## Scope Rules
1. Test wording/layout/ordering only.
2. Do not test different prices live in a way that causes inconsistent checkout expectations.
3. Run one major experiment at a time.
4. Keep FR/EN parity for all tested variants.
5. Archive flags after decision.

## Recommended Experiment Queue
1. Bilan CTA wording clarity
2. Bilan 360 stream-routing explanation copy
3. Laboratoire value framing (simulator + AI reports)
4. Trust signal placement above/below product cards

## Product Quality Constraint
Experiments cannot degrade report coherence or AI narrative quality standards defined in `docs/TECH-REFERENCE.md`.
