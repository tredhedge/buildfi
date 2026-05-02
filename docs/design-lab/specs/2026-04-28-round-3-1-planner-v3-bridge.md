# Round 3.1 - Planner V3 Bridge

Date: 2026-04-28  
Location: `design-lab/experiments/round-3-1-planner-v3-bridge`

## Goal

Correct the previous planner beta by staying anchored to the real Planner V3 structure.

## What changed from Round 3.0

Round 3.0 drifted too far into a new planner product.

This round keeps the actual V3 substrate:

- fixed left rail
- cockpit / sidebar overlay
- progress strip
- merged navigation model
- tabbed center
- longform drawer

## Core idea

The bridge should happen inside V3, not instead of V3.

The planner keeps its simulator identity while gaining a more coherent reading layer.

## What V3.1 is testing

1. Longform drawer as the main reading bridge
2. Better relationship between:
   - Detailed report
   - Guide
   - Explain-this-plan behavior
3. Stronger explanation inside the same V3 shell
4. A more natural handoff from simulation to reading

## What should stay in V3

- rail navigation
- cockpit parameters
- What If / analysis tabs
- simulator-first workflow

## What should improve

- report should feel native to planner outputs
- guide should feel less like a detached appendix
- longform drawer should become a deliberate reading layer
- chart + interpretation pairing should be clearer

## Success criteria

- the prototype still feels recognizably like Planner V3
- the bridge idea feels more believable than Round 3.0
- reading/report behavior feels integrated rather than bolted on
- the next implementation steps become clearer
