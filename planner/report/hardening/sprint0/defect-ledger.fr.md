# FR Report Defect Ledger (Harsh)

Generated: 2026-04-17T08:37:22.488Z
Baseline source: C:\Users\tredh\OneDrive\Documents\GitHub\buildfi\planner\report\hardening\sprint0\baseline-fr-manifest.json
Profiles audited: 10

## Executive Verdict

Current FR report quality is not release-safe. Data trust and text rendering must be fixed before UX polish work.

## Severity Summary

- P0: 0
- P1: 0
- P2: 5
- P3: 0

## Findings

- [P2] [Medium] ccpc_owner_fr.html | ux-ai-density | AI density is high (9 callouts), likely reducing signal-to-noise.
- [P2] [Medium] debt_young_fr.html | ux-ai-density | AI density is high (9 callouts), likely reducing signal-to-noise.
- [P2] [Medium] hnw_couple_fr.html | ux-ai-density | AI density is high (10 callouts), likely reducing signal-to-noise.
- [P2] [Medium] real_estate_fr.html | ux-ai-density | AI density is high (9 callouts), likely reducing signal-to-noise.
- [P2] [Medium] rsu_tech_fr.html | ux-ai-density | AI density is high (9 callouts), likely reducing signal-to-noise.

## Immediate Priority Order

1. Fix UTF-8/encoding pipeline.
2. Enforce AI numeric grounding against validated payload.
3. Remove escaped HTML in user-visible narrative.
4. Reduce AI callout density and improve section signal.

