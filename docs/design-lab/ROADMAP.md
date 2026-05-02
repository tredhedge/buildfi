# Portfolio Roadmap

## Goal
Make BuildFi feel like one portfolio instead of several adjacent products.

The target is:
- one brand
- two deliberate expressions
- shared tokens and shared behavior underneath

## Portfolio Model

### 1. Product
Surfaces:
- marketing website
- pricing / conversion pages
- debt tool
- decumulation tool
- planner
- future dashboard / app shell

Characteristics:
- cooler slate / navy palette
- clearer interaction affordances
- stronger utility/navigation emphasis
- same dark/light toggle behavior everywhere

### 2. Editorial
Surfaces:
- guides
- AI reports
- publication-style reading experiences

Characteristics:
- warmer cream / gold palette
- calmer reading rhythm
- serif-supported heading system
- stronger chapter pacing and print-readiness

## Principles
- The website should belong to Product, not become a third style.
- Guides and reports should belong to Editorial.
- Both expressions should share the same logo, number typography, spacing logic, and quality bar.
- Style can differ. Trust should not.

## Phases

### Phase 0 — Inventory and token extraction
- create shared semantic tokens for color, spacing, radius, shadow, typography
- stop copying palettes inline across tools/pages
- standardize a single theme persistence key and dark/light behavior

### Phase 1 — Typography cleanup
- remove accidental font overrides like Arial in the Next app shell
- choose the real product sans stack
- choose the real editorial sans + serif pairing
- keep one mono system across the portfolio

### Phase 2 — Product system unification
- align marketing, debt, decumulation, and planner to the Product expression
- unify headers, footers, controls, cards, and navigation rhythm

### Phase 3 — Editorial system unification
- align guides and reports to the Editorial expression
- unify chapter covers, TOC behavior, tables, captions, and callouts

### Phase 4 — Report view modes
- keep one canonical reading view for reports
- test alternate view modes like Explore view without changing plan logic
- preserve experiments in `design-lab/experiments/report-view-toggle`

### Phase 5 — Promotion rules
- do not promote experiments directly from `final`
- first stabilize in `design-lab`
- then port into shared runtime files with explicit QA

## Immediate Priorities
1. Preserve the report reading/explore toggle concept.
2. Extract shared design tokens.
3. Fix the Next app font mismatch.
4. Decide the canonical Product and Editorial palettes.

