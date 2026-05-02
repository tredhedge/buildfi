# Round 2.9 - Tool System

Date: 2026-04-28  
Location: `design-lab/experiments/round-2-9-tool-system`

## Goal

Lock the Product-family architecture before implementation:

- one shared Product shell
- one shared interaction grammar
- two different tool personalities:
  - decum as the calmest, most interpretive Product surface
  - debt as the tightest, most operational Product surface

## Why this round exists

Round 2.7 proved the tools could feel related.

What was still unresolved:

- what exactly should be shared
- how decum and debt should differ beyond copy
- whether the Product family could stay coherent without becoming a generic dashboard system

This round answers that by making the system explicit.

## Shared Product contract

Both tools should share:

1. theme persistence and dark/light behavior
2. topbar and brand chrome
3. summary band pattern
4. rail navigation pattern
5. input-card grammar
6. baseline-versus-explored compare strip
7. chart wrapper and caption logic
8. action guidance stack

## Intended differences

### Decum

- more spacing
- more interpretation
- longer-horizon language
- planning-oriented presets
- calmer chart explanation

### Debt

- tighter pacing
- faster comparison
- more urgent copy
- stronger operational cues
- more explicit action pressure

## Implementation recommendation if this direction holds

1. Extract shared Product shell primitives
   - topbar
   - summary band
   - input card
   - scenario chips
   - compare strip
   - chart shell
   - action list

2. Add tool-specific configuration
   - density
   - label tone
   - chart caption style
   - action emphasis

3. Keep decum as the first future bridge toward planner
   - calmer
   - more interpretive
   - more explanation-friendly

## Success criteria

- debt and decum feel clearly related
- debt and decum do not feel identical
- decum feels calmer without losing tool credibility
- debt feels sharper without becoming noisy
- the architecture path is clearer than it was after Round 2.7
