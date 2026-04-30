# Round 3.4 - Debt Tool Real Clone

Date: 2026-04-28

## Goal

Test the debt tool using the **same method that worked for the report**:

- clone the real surface
- preserve real logic
- preserve real tabs and flows
- polish the format only

## What stays intact

- inventory flow
- strategies tab
- simulator tab
- repay-vs-invest tab
- calendar tab
- true-cost tab
- bilingual toggle
- link / save / load / print behaviors

## What changes

- tighter but cleaner shell
- more coherent Product dark/light backgrounds
- improved spacing and width
- calmer tab/header treatment
- slightly stronger section hierarchy

## Isolation

- lives only in `design-lab`
- uses `buildfi_debts_v1_lab` instead of the production localStorage key
