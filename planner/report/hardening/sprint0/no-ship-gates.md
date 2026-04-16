# No-Ship Gates (FR Reports)

Any one failed gate blocks release.

## P0 Data and Trust Gates

1. Zero mojibake/encoding corruption in rendered FR text.
2. Zero contradictions between narrative KPIs and AI text for same metric domain.
3. Zero `undefined` and zero `NaN` in final HTML output.
4. 100% of expected persona files generated (10/10).

## P1 Presentation and Content Gates

1. Zero visible escaped markup in user narrative (`&lt;strong&gt;` etc.).
2. Section integrity preserved (minimum structure for all mandatory sections).
3. Locale-safe numeric formatting for FR output.

## Operational Rule

Run these in order:

1. `capture-fr-baseline.js`
2. `build-defect-ledger.js`
3. `check-no-ship-gates.js`

Release only when `check-no-ship-gates.js` exits with success.
