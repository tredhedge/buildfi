# realai/ — Real-AI Report Pipeline

End-to-end pipeline that takes a profile JSON, runs Monte Carlo, calls
Anthropic Claude for slot narration, and renders the final HTML report.

## Source vs generated

```
profiles.json            source — 20 canonical profiles + variants
content-requirements.json source — minimum content per phase
prompts/                 source — system + user prompt templates per SKU/phase

run-pipeline.mjs         orchestrator (calls everything below)
gen-real-mc.mjs          source — Monte Carlo runner
build-realai-reports.js  source — renderer driver (uses report-pdf.js)
ai-regen.mjs             source — re-runs AI for a single profile
mc-enrich.mjs            source — enrichment pass after MC
matrix-render.mjs        source — per-variant render fan-out
md-to-html.mjs           source — markdown helper
qa-check.mjs             source — post-render gates
review/                  source — reviewers + correction pass

mc/                      generated — MC json per profile (consumed by build-)
responses/               generated — Claude responses (consumed by build-)
output/                  generated — final rendered HTML (20 profiles)
review/_*.json           generated — reviewer artifacts (findings, fix-plans)
review/*.fail.json       generated — per-variant rejection logs (gitignored)
tests/                   source — pipeline unit tests
```

## Run

```bash
node planner/report/realai/run-pipeline.mjs
# or per-stage:
node planner/report/realai/gen-real-mc.mjs
node planner/report/realai/build-realai-reports.js
```

`mc/`, `responses/`, `output/` are committed for reproducibility. They
regenerate cleanly on a full pipeline run; the per-variant `*.fail.json`
files in `review/` are gitignored (see root `.gitignore`).
