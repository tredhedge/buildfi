# Sprint 8 - Release Hardening

Sprint 8 defines final go/no-go controls before shipping report engine changes.

## Automation

Release gate script:

1. `planner/report/hardening/sprint8/release-gate.js`

NPM commands:

1. `npm run report:release:gate`
2. `npm run report:release:gate:full`

## What the gate checks

1. Full FR+EN hardening chain is green (`report:sprint6:fr-en`).
2. All 20 report artifacts exist in `planner/report/test-output`.
3. Required hardening artifacts and technical docs are present.
4. Optional full run can include `qa:full`.

## Release policy

No release is allowed if the gate fails.
