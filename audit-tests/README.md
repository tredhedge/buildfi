# BuildFi audit regression harness

Companion to `buildfi_audit_2026-06-10.md` + the modules addendum. Drop this
folder into the repo as `audit-tests/` and commit it BEFORE any fix.

## Setup (once per session)
    cd audit-tests
    python3 extract_engine.py ../planner_v3.html   # regenerates engine.js / sam.js / extras.js
    node run_suite.js ../planner_v3.html           # embedded 505-test suite

Re-run BOTH after every change to planner_v3.html (the extractor must re-run —
the .js files are derived artifacts, never edit them directly).

## Scripts and their acceptance criteria

| Script | Tests | Before fixes (current) | After fixes (gate) |
|---|---|---|---|
| run_suite.js | embedded suite | 503/505 (2 stale ON baselines) | **505/505** after re-baselining EXP_TAX.ON with 2026 surtax thresholds |
| verify2.js EXP 2b | falsy-zero (audit 1.5) | eqRet:0 grows at 7% (791K vs 376K) | eqRet:0 and eqRet:1e-12 produce **identical** finals |
| verify2.js EXP 3-clean | det. double-deposit (1.3) | total = 965,390 (+165,390 phantom) | total = **800,000 ± $1** (exact conservation, zero returns) |
| verify2.js EXP 5 | MC surplus evaporation (1.4) | total = 452,373 ($548K vanished) | total = **1,000,000 ± noise** (unspent RRIF reinvested) |
| verify2.js EXP 2-clean | tax funding (1.1) | Σtax reported, balances unaffected | conservation becomes `Δassets = −Σspend −Σtax +Σgov`; succ/p5 drop vs pre-fix is EXPECTED |
| verify.js EXP 1 | generator stats (1.2) | fatT eqSd ≈ 0.2066 | fatT eqSd ≈ **0.16** (±0.002), corr ≈ 0.20 preserved |
| verify.js EXP 4 | OAS deflation (2.5) | $10,416 OAS granted at $264K income | OAS in cash flow = OAS in taxInc = **$0** for that case |
| patch_test.js | end-to-end A/B | base 98.2% vs taxed 93.2% | after 1.1 lands, base run itself ≈ the taxed numbers; keep as historical reference |
| trace.js | year-by-year debug traces | — | use when a gate fails |

## Sequencing (keeps every diff reviewable)
0. Commit baseline + this folder. Add a seed hook to runMC (accept `p._seed`,
   use a local PRNG instead of Math.random) — makes every later A/B deterministic.
1. **ftfy pass first, alone**: `python3 -c "import ftfy,io;s=open('planner_v3.html',encoding='utf-8').read();open('planner_v3.html','w',encoding='utf-8',newline='\n').write(ftfy.fix_text(s))"` then strip BOM. Run run_suite.js immediately — must stay 503/505. Own commit; never interleave with logic changes.
2. Constants only (audit 1.6, 2.1, 2.2, 2.13 + addendum D rates): CG default 0.50,
   AB 8% bracket, EI/RQAP 2026, MB/NS corp small rates, un-index SBD/grind, maxRRSP card 33,810.
3. Conservation: delete the optimizeDecum step-5 block + room clobber (1.3); add
   runMC surplus reinvestment (1.4). Gates: EXP 3-clean and EXP 5 exact.
4. tRn standardization (1.2) + falsy-zero sweep (1.5). Gates: EXP 1, EXP 2b.
5. Tax funding (1.1) — last, because it shifts every success-rate baseline.
   Then re-baseline EXP_TAX.ON and tighten run_suite.js exit code to fail>0.
6. SAM re-route through paired-seed runMC; hide or fix the 4 inert cards.
7. Longform `_BF_TO_ENGINE` unconditional ÷100; OAS deflation (2.5); p5Ruin sort;
   QC LIF rule; remaining Tier-2/addendum items per the reports.

Context tip for the agent: never read planner_v3.html whole. Work via the
__ENGINE_START__/__ENGINE_END__ markers and targeted greps; the engine block is
~6K lines of the 22.7K.
