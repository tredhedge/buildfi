# BuildFi Design System

**Date locked:** 2026-04-28
**Status:** Phase A complete (foundation). Phase B (per-surface port) pending.
**Source of truth:** [lib/design/](../lib/design/) — six files.

---

## One brand, two expressions

BuildFi has two coherent visual systems that share a brand spine. Every
user-facing surface MUST opt into exactly one of them via the body
attribute `data-bf-system`.

| Expression | `data-bf-system` | Voice | Surfaces |
|---|---|---|---|
| **Product** | `"product"` | Tool-first. Slate/navy. Dense, slightly lab-like. | Marketing site, pricing, debt tool, decumulation tool, planner, dashboard |
| **Editorial** | `"editorial"` | Reading-first. Cream/gold. Calm rhythm, serif headings, print-ready. | Guides (101, 201, meltdown, RRQ), AI reports |

The marketing site belongs to **Product**, not its own third style.
Continuity at the conversion moment matters more than editorial branding.

---

## What the two systems share (the brand spine)

These tokens are identical in both `product.css` and `editorial.css`:

| Token | Value | Why |
|---|---|---|
| Gold accent | `#c4944a` | Single canonical brand color |
| Mono | JetBrains Mono | All numbers everywhere |
| Eyebrow / kicker | 12px gold uppercase, `letter-spacing:.20em`, weight 700 | Same quiet section labeling |
| Radius scale | `28 / 18 / 12 / 999` (lg / md / sm / pill) | Same geometry |
| Theme persistence | `localStorage.buildfi_theme` | Toggle survives navigation |
| Section card border | `1px solid rgba(196,148,74,0.10–0.18)` | Gold-tinted, never neutral grey |
| Background motif | Gold-tinted radial gradient + linear base | Same atmospheric signature |

---

## Where the two systems diverge (deliberately)

| Token | Product | Editorial |
|---|---|---|
| Sans body | DM Sans | Inter |
| Heading face | Same as body (DM Sans, weight 700) | Playfair Display (serif, weight 700/800) |
| Background base | Slate `#0f1520 → #181f2d` (dark) / `#f5f6fa → #edf1f8` (light) | Cream `#f4efe6 → #f8f5ef` (light only) |
| Text color | `#edf2fb` dark / `#182236` light | `#1f2840` ink / `#2a2520` body |
| Has dark mode? | Yes — required for tools | No — single cream mode |
| Card padding | 16px (mini-card), 22px (panel) | 22px (info), 30–46px (chapter / cover) |
| Heading scale | 24 / 30 / 40 | 28 / 34 / 44 / 58 |

---

## File layout

```
lib/design/
  tokens.css                ← Shared tokens (gold, mono, radius, eyebrow). Imported first.
  product.css               ← Product system utilities (.bfp-shell, .bfp-panel, ...)
  editorial.css             ← Editorial system utilities (.bfe-shell, .bfe-chapter, ...)
  product.tokens.ts         ← TS palette for inline-style consumers (debt, decum, marketing)
  editorial.tokens.ts       ← TS palette for inline-style consumers (guides, AI reports)
  product-components.tsx    ← Product-system React utilities (ProductNote, useProductBody)
  editorial-components.tsx  ← Editorial-system React utilities (Section, Note, ToolCard,
                              CompareRow, useEditorialBody, useEditorialRailScrollSpy)
  components/               ← Shared chrome primitives (cross-system)
    Logo.tsx                ← <BuildFiLogo> — single canonical wordmark
    ProductHeader.tsx       ← <ProductHeader> — full nav chrome for Product surfaces
    ProductFooter.tsx       ← <ProductFooter> — full legal/support footer
    EditorialHeader.tsx     ← <EditorialHeader> — minimal logo+back chrome
    EditorialFooter.tsx     ← <EditorialFooter> — minimal publication footer
    index.ts                ← Single import point: import { BuildFiLogo, ... } from "@/lib/design/components"
```

`app/globals.css` imports tokens.css → product.css → editorial.css in that order.
`app/layout.tsx` registers the four fonts as CSS variables consumed by the system files.

---

## How to opt a surface in

### 1. CSS-class consumer (new components):
```tsx
<body data-bf-system="product" data-theme="dark">
  <main className="bfp-shell bfp-shell--two-col">
    <aside className="bfp-rail">…</aside>
    <section className="bfp-panel">…</section>
  </main>
</body>
```

### 2. Inline-style consumer (existing page that builds palettes via JS):
```tsx
import { getProductPalette, THEME_STORAGE_KEY } from "@/lib/design/product.tokens";

const PAL = getProductPalette(theme); // theme = "dark" | "light"
// PAL.bg, PAL.text, PAL.accent, PAL.muted, PAL.line, PAL.blue, PAL.green, PAL.red, PAL.orange
```

### 3. Editorial:
```tsx
import { getEditorialPalette } from "@/lib/design/editorial.tokens";
const PAL = getEditorialPalette(); // single mode, no theme arg
```

---

## Component primitives (cross-system chrome)

Added 2026-04-29 (Plan v2.2 / Phase 0). Replaces inline copies of the
logo + ad-hoc headers / footers that were scattered across surfaces.

### `<BuildFiLogo>` — canonical wordmark
Single source of truth for the wordmark. Decision recorded here: the
wordmark uses **DM Sans** (Product canonical sans), not Plus Jakarta Sans.
The previous inline copy in `app/page.tsx` referenced an unregistered
font and silently fell back to system sans. One brand identity across
marketing, product chrome, and the wordmark itself.

```tsx
import { BuildFiLogo } from "@/lib/design/components";
<BuildFiLogo theme="dark" size="md" />
<BuildFiLogo system="editorial" size="sm" /> // forces light, single-mode editorial
```

### `<ProductHeader>` / `<ProductFooter>` — full chrome
For: marketing landing, debt tool, decumulation tool, expert dashboard,
wizard, acheter-planner, secondary product surfaces (`/merci`, `/feedback`,
`/not-found`, `/error`, `/acces`, `/simulateur`, `/outils/bilan-annuel`).

```tsx
import { ProductHeader, ProductFooter } from "@/lib/design/components";

<ProductHeader
  theme={theme}
  toggleTheme={toggleTheme}
  lang={lang}
  setLang={setLang}
  links={[
    { label: t.navTools, href: "#tools" },
    { label: t.navPricing, href: "#pricing" },
    { label: t.navFAQ, href: "#faq" },
  ]}
  cta={{ label: t.navCTA, href: "#pricing" }}
/>
{/* ... page body ... */}
<ProductFooter theme={theme} lang={lang} />
```

### `<EditorialHeader>` / `<EditorialFooter>` — minimal publication chrome
For: guides (101, 201, meltdown, RRQ), AI reports, articles, long-form
legal (`/confidentialite`, `/support`, `/mises-a-jour`).

Deliberately lighter than the Product variants — reports/articles need
to feel like publications, not wrapped app surfaces. Logo block + back
link + small AMF/observational footer. No nav row, no theme toggle (Editorial
is single-mode).

```tsx
import { EditorialHeader, EditorialFooter } from "@/lib/design/components";

<EditorialHeader lang="fr" eyebrow="Guide avancé · 10 min" />
{/* ... article body inside .bfe-shell ... */}
<EditorialFooter lang="fr" />
```

### Why two header / footer pairs?
Product surfaces are tools — users expect persistent nav chrome (theme
toggle, FR/EN switch, pricing CTA always reachable). Editorial surfaces
are reading destinations — heavy chrome competes with the prose. The
two pairs share the brand spine (logo, gold, fonts) but diverge on
chrome density on purpose.

---

## Port order (Phase B)

Don't port everything at once. Each surface gets one PR. Order:

1. **Debt tool** ([app/outils/dettes/page.jsx](../app/outils/dettes/page.jsx))
2. **Decumulation tool** ([app/outils/decaissement/page.jsx](../app/outils/decaissement/page.jsx))
3. **Marketing landing** ([app/page.tsx](../app/page.tsx))
4. **Guide 101** ([app/guides/101/page.tsx](../app/guides/101/page.tsx))
5. **Guide 201** ([app/guides/201/page.tsx](../app/guides/201/page.tsx)) and meltdown / RRQ siblings
6. **Planner v3** ([planner/planner_v3.html](../planner/planner_v3.html)) — last, hardest, gets the round 3.2 polish at the same time
7. **AI report renderer** — audit only; verify it imports from `editorial.tokens.ts` instead of inlining

Each PR replaces inline palette objects with imports from `lib/design/*.tokens.ts`
or class names from `lib/design/*.css`. Visual diff should be small on the
first PR (debt) since round 3.3 was already aligned to its current shape.

---

## Locked decisions (do not relitigate without writing here first)

- **One canonical gold:** `#c4944a`. The `#d2a764` and `#c49a1a` variants from
  earlier surfaces are deprecated. Replace on touch.
- **One mono:** JetBrains Mono. Geist Mono was loaded by `layout.tsx` and never
  used; removed 2026-04-28.
- **One theme-persistence key:** `localStorage.buildfi_theme`. Planner v3 must
  adopt it during its port (currently has no light mode at all).
- **One radius scale:** 28 / 18 / 12 / 999.
- **Marketing belongs to Product**, not Editorial. Editorial may appear inside
  marketing as a "Guides" preview block, but the page chrome stays Product.
- **Editorial is single-mode** (cream paper). No dark Editorial.
- **The website is the entry point** — if it doesn't match the tools it sells,
  the user lands somewhere that doesn't match anything they'll see again.

---

## Phase B port log (2026-04-28)

Status of each surface after Phase B:

| Surface | Status | Notes |
|---|---|---|
| Marketing landing ([app/page.tsx](../app/page.tsx)) | ✅ Ported | Product. Avenir Next → DM Sans. |
| Debt tool ([app/outils/dettes/page.jsx](../app/outils/dettes/page.jsx)) | ✅ Ported | Product. Inline `PAL_*` removed. |
| Decumulation tool ([app/outils/decaissement/page.jsx](../app/outils/decaissement/page.jsx)) | ✅ Ported | Product. Inline `CL_*` removed. |
| Acheter-Planner ([app/acheter-planner/page.tsx](../app/acheter-planner/page.tsx)) | ✅ Ported | Product. Defaults to dark. |
| Expert dashboard ([app/expert/page.tsx](../app/expert/page.tsx)) | ✅ Ported | Product. Static light. |
| Wizard ([app/wizard/page.tsx](../app/wizard/page.tsx)) | ✅ Ported | Product. Toggle preserved. |
| Guide 101 ([app/guides/101/page.tsx](../app/guides/101/page.tsx)) | ✅ Ported | Editorial. Avenir Next → Inter. |
| Guide 201 ([app/guides/201/page.tsx](../app/guides/201/page.tsx)) | ✅ Ported | Editorial + local `purple` extension for advanced strategy callouts. |
| Guide meltdown-reer ([app/guides/meltdown-reer/page.tsx](../app/guides/meltdown-reer/page.tsx)) | ✅ Ported | Editorial. Was previously cool slate — now warm cream (intended unification). |
| Guide rrq-60-65-70 ([app/guides/rrq-60-65-70/page.tsx](../app/guides/rrq-60-65-70/page.tsx)) | ✅ Ported | Editorial. Same upgrade as meltdown. |
| Planner v3 ([planner/planner_v3.html](../planner/planner_v3.html)) | ⏳ Deferred | 22 600 lines, standalone HTML. Will receive round-3-2-planner-v3-polish in a separate session. |
| AI report renderer ([lib/report-html-expert.ts](../lib/report-html-expert.ts)) | ⚠️ Audit only | Already on Editorial palette. 18 occurrences of legacy gold `#c49a1a` — should normalize to `#c4944a` in a future renderer pass that includes a coordinated regen of all generated reports. Inlines styles rather than importing `lib/design/editorial.css`. |
| AI report renderer 360 ([lib/report-html-360.js](../lib/report-html-360.js)) | ✅ Clean | 0 inline gold hexes. |
| `lib/report-shared.ts` | ✅ Clean | Uses helper getters for grade color, not raw hexes. |

## Plan v2.2 final state (2026-04-29) — 12 commits, ~80% complete

Final state of the standardization push as of session F. Twelve commits
on `codex-report-premium-rebuild` branch covering Phase 0 through Phase
4e + Phase 7 cleanup.

| Phase | Status | Notes |
|---|---|---|
| 0 — Foundation primitives | ✅ | Logo, headers, footers, editorial.css promote, warm shadow, chart palette |
| 1 — Color normalization | ✅ | 24 files, `#c49a1a` → `#c4944a` |
| 2 — Secondary surfaces port | ✅ | 9 surfaces, font + wordmark norm |
| 3 — Editorial CSS hardening | ✅ | New tokens (`--bfe-prose`, `--bfe-nav-rest`, `--bfe-scroll-margin`), inline-toc utility, print refinements |
| 4a — Report renderer canonical injection | ✅ | tokens.css + editorial.css + Google Fonts bootstrap; fixed `+`-prefix patch leak in report-html-360.js |
| 4b — Hybrid sheet shell (expert) | ✅ | `.bfe-shell--guide` + `.bfe-cover` + chapter sheets via secH/secEnd |
| 4c — Sticky rail TOC + scroll-spy (expert) | ✅ | Vanilla JS, ~1.5KB, no framework |
| 4d — Interactive/PDF mode switch | ✅ | localStorage `bf_report_view_mode`, body[data-bf-mode] gate |
| 4e — Print/PDF visual parity | ✅ | PDF mode CSS mirrors @media print rules |
| 4f — Re-render 20 finals | ⏳ deferred | Needs npm install reset (node_modules OneDrive-corrupted) |
| 5 — Tools polish (BuildFiLogo unify) | ✅ | landing, debt, decum, acheter-planner, wizard |
| 6a — Article guides (meltdown + rrq) | ✅ | Real substrate work — section IDs, RAIL_TOC, EditorialHeader |
| 6b/6c — Guides 101 + 201 | ✅ no-op | Already aligned from prior Phase B port (verified) |
| 7 — Cross-surface cleanup | ✅ | Final residual cleanup of expert, wizard, ErrorBoundary, bilan-annuel email template |

### Hard-locked invariants
- Zero `#c49a1a` / `#d2a764` in production code paths (`app/`, `lib/`, `components/`)
- Zero `Newsreader` font references in production code (only doc-comments mentioning the migration)
- Zero `Plus Jakarta Sans` references in production code
- Zero `Avenir Next` references (Apple-only paid font)
- One canonical wordmark via `<BuildFiLogo>` from `lib/design/components`
- AI report renderer = canonical Editorial reference (Inter + Playfair + JetBrains Mono via Google Fonts bootstrap; tokens.css + editorial.css inlined)
- All chapter anchors carry scroll-margin for clean rail-click landing
- Mode switch and rail are `.bfe-interactive-only` — vanish in PDF preview and actual print

### Out of scope (deliberate)
- `public/*.html` legacy standalone files (avis-legal, bilan-360, conditions, confidentialite, expert-landing, index, quiz-*) — deprecated, not routed from app/.
- `planner/planner_v3.html` — 22 600-line standalone, separately scheduled for round-3-2-planner-v3-polish.
- AI report renderer's `report-html-360.js` rail TOC — it's a dashboard view (single screen with KPI grid + charts), not a long-form report; rail would be incongruent.

### Known deferred work
- **Phase 4f re-render 20 finals**: requires `rm -rf node_modules && npm install` to fix the OneDrive-corrupted install (lib.dom.d.ts missing), then `npm run report:fr-en` to regenerate the canonical 20 outputs under `planner/report/realai/{corrected,final}/`.
- **Visual smoke test on `buildfi-rho.vercel.app`**: defer until DNS un-blocks `buildfi.ca` (Cloudflare ticket pending) AND `npm install` reset.

## Phase B addendum (2026-04-29) — Plan v2.2 corrections

**Reference: round 3.7 (reading-real-clones)** was the canonical Editorial substrate
(prototype dir removed 2026-05-01 in cleanup). It demonstrated the rail +
hybrid-sheet + interactive/PDF-mode-switch patterns against real guide
content; `lib/design/editorial.css` already contains those classes
(`.bfe-shell--guide`, `.bfe-rail`, `.bfe-cover`, `.bfe-chapter`, `.bfe-section`,
`.bfe-toc-item`, `.bfe-mode-switch`, `.bfe-btn-gold`, `.bfe-btn-glass`,
`.bfe-mono`).

### Changes locked 2026-04-29
- **Editorial shadow**: warm-tinted (`0 14px 34px rgba(56,42,19,0.09)`) replaces
  the previous navy-tinted shadow. A cream-paper system shouldn't carry navy
  shadows. Mirrored in both `editorial.css` (`--bfe-shadow`) and
  `editorial.tokens.ts` (`EDITORIAL.shadow`).
- **`EDITORIAL.paperWarm = #ece4d9`**: warmer cream for chapter-cover
  gradient stops only. Page background stays `#faf7f1` (paler, easier on
  long reads). `paperWarm` is for hero / cover gradient terminations.
- **`EDITORIAL_CHART` palette**: chart colors are now semantic tokens
  (`p50`, `p25p75`, `p5p95`, `gov`, `withdraw`, `spend`) rather than raw
  hex scattered across `report-html-360.js`. Promoted from inline
  `#2F67A3 / #7CA7D9 / #9FC1E8 / #2A8C46 / #C7A13A / #D78E8E` usage.
- **Wordmark font decision (Option A)**: `<BuildFiLogo>` uses
  `var(--font-dm-sans)`. The previous Plus Jakarta Sans reference is
  removed — it was never registered and silently fell back system sans.

### Sequence — what's coming next
1. Phase 1: color normalization across 10 secondary surfaces (`#c49a1a` → `#c4944a`)
2. Phase 4a: AI report renderer canonical token + CSS + font bootstrap
3. Phase 3: editorial.css hardening post-validation
4. Phase 6: substrate work on guides (real section IDs + rail TOC)
5. Phase 5: tool polish using shared chrome primitives
6. Phase 2: secondary surfaces ported in bulk
7. Phase 4d/e/f: report mode switch + print audit + re-render 20 finals
8. Phase 7: cross-surface QA + screenshots

Tracking lives in the active session todo list.

## Backups

Pre-system production files are preserved under
[backups/2026-04-28-pre-design-system/](../backups/2026-04-28-pre-design-system/)
in case any porting decision needs to be reverted (13 files).

## Dead-end iterations

Six superseded design-lab rounds were moved to
[docs/design-lab/archive/2026-04-28-superseded/](design-lab/archive/2026-04-28-superseded/).
Do not promote from there without re-evaluating against the active rounds.
