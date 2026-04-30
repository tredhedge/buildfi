# Round 2.8 - Guide System

Date: 2026-04-28  
Location: `design-lab/experiments/round-2-8-guide-system`

## Goal

Lock the guide architecture before implementation:

- one guide content model
- one shared Reading shell
- two output modes:
  - interactive web guide
  - PDF/static guide

## Why this round exists

Round 2.6 proved the guides belong in the Reading family.  
Round 2.7 proved fuller guide pages can work.

What was still unresolved:

- how interactive moments should sit inside the guide
- how PDF/static output should stay coherent
- whether the web guide and PDF guide should be treated as two separate products

This round answers: no. They should be one guide system with two render modes.

## Core system rule

Every guide chapter should contain:

1. shared lesson
2. shared worked example or explanation
3. shared takeaway
4. optional interactive enhancement
5. explicit PDF/static fallback

The fallback is not an afterthought. It is part of the chapter contract.

## What is being tested

### Guide 101

- simpler chapter spine
- gentler interactive inserts
- stronger proof that the PDF/static mode still teaches clearly

### Guide 201/301

- more strategic structure
- richer report-adjacent shell
- clear separation between core 201 and bonus 301
- explicit advanced-interaction fallback logic

## Implementation recommendation if this direction holds

1. Extract a shared guide shell
   - cover
   - rail / TOC
   - chapter opener
   - section wrapper
   - CTA / endcap

2. Move guide content into chapter data modules
   - headline
   - framing copy
   - takeaway
   - interactive block definition
   - static fallback definition

3. Build output renderers
   - interactive web renderer
   - PDF/static renderer

4. Keep SEO articles separate
   - they are not part of this system

## Success criteria

- Guide 101 and 201/301 feel like one Reading family
- interactive mode is richer without hijacking the guide
- PDF/static mode feels complete, not like a broken export
- the architecture path is clearer than it was after Round 2.7
