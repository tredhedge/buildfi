# Round 3.0 - Planner Bridge Beta

Date: 2026-04-28  
Location: `design-lab/experiments/round-3-0-planner-bridge`

## Goal

Test the planner as the bridge between:

- Product mode
- Reading mode

without rebuilding the production planner yet.

## Why this round exists

Earlier rounds clarified:

- guides and reports belong to Reading
- debt and decum belong to Product

What was still unresolved:

- whether the planner should live entirely in Product
- whether the planner should borrow from Reading
- how the planner should prepare users for report handoff

This beta answers that by treating the planner as a bridge surface.

## Core idea

One planner. Two views. One underlying plan.

- `Builder view`
  - setup-first
  - control-aware
  - faster interaction loop

- `Reading view`
  - calmer
  - more interpretive
  - more chapter-like explanation

The data and baseline do not change. Only the presentation emphasis changes.

## Shared planner contract being tested

1. left setup rail keeps Product behavior
2. main shell holds baseline, explored scenario, trajectory, and actions
3. right insight rail explains the bridge logic
4. report language appears inside the planner before the report is generated

## What this beta should help decide

- whether theme + view toggles belong in the planner
- whether the planner should own a reading mode
- whether the planner can unify the portfolio more effectively than the website can

## Success criteria

- planner feels like neither a raw lab console nor a disguised report
- builder and reading views feel like two valid uses of one planner
- report handoff feels more natural
- the implementation path for Product mode becomes clearer after this beta
