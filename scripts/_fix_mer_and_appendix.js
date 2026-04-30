// Fix A: rename the assumptions sub-section so it doesn't duplicate
// "Annexe / Appendix" with the Ch.6 chapter title.
// Fix B: extract the MER table out of renderTax into a standalone
// renderFees function, called after renderClosingRecap so section 9
// (Stratégie fiscale) doesn't get sandwiched between tax and draw-order
// by an MER tangent.

const fs = require('fs');
const path = require('path');
const fp = path.join(__dirname, '..', 'planner', 'report', 'report-pdf.js');
let s = fs.readFileSync(fp, 'utf8');
const NL = s.includes('\r\n') ? '\r\n' : '\n';

// ── Fix A: rename assumptions section heading + TOC label ─────────────
const oldHeading = "    h += F.Sec(secN, fr ? 'Annexe \\u2014 Hypoth\\u00e8ses' : 'Appendix \\u2014 Assumptions', 'sec-assumptions');";
const newHeading = "    h += F.Sec(secN, fr ? 'Hypoth\\u00e8ses d\\u00e9taill\\u00e9es' : 'Detailed assumptions', 'sec-assumptions');";
if (s.includes(oldHeading)) s = s.replace(oldHeading, newHeading);
else { console.error('assumptions heading not found'); process.exit(1); }

const oldTocAss = "_tocN++; tocSections.push({ n: _tocN, id: 'sec-assumptions', label: d.fr ? 'Annexe \\u2014 Hypoth\\u00e8ses' : 'Appendix \\u2014 Assumptions' });";
const newTocAss = "_tocN++; tocSections.push({ n: _tocN, id: 'sec-assumptions', label: d.fr ? 'Hypoth\\u00e8ses d\\u00e9taill\\u00e9es' : 'Detailed assumptions' });";
if (s.includes(oldTocAss)) s = s.replace(oldTocAss, newTocAss);
else { console.error('assumptions TOC label not found'); process.exit(1); }

// Also update the densityWrap summary fallback text (used in compact readers).
s = s.replace(
  /'Annexe \\u2014 hypoth\\u00e8ses d\\u00e9taill\\u00e9es \(cliquer pour ouvrir\)'/g,
  "'Hypoth\\u00e8ses d\\u00e9taill\\u00e9es (cliquer pour ouvrir)'"
);
s = s.replace(
  /'Appendix \\u2014 detailed assumptions \(click to open\)'/g,
  "'Detailed assumptions (click to open)'"
);

// ── Fix B: extract MER block from renderTax into renderFees ───────────
// Strip the MER call out of renderTax — it's a single-line call to
// _renderMERImpactTable, preceded by a comment block.
const oldMerCall = "    // MER impact section \\u2014 header / KPIs / assumptions / table / note.\r\n    // Codex 2026-04-27 review: KPIs were rendered above the section\r\n    // header. Moved inside _renderMERImpactTable so the section opens\r\n    // with its title, grounds the reader in their own numbers, then\r\n    // explains the comparison table. Cleaner narrative flow.\r\n    h += _renderMERImpactTable(d, fr, f$);";
// First check whether the patch comment exists; if not, fall back to the
// original two-line call ("// MER impact comparison table" + the call).
let merFound = false;
if (s.includes(oldMerCall)) {
  s = s.replace(oldMerCall, "    // MER impact moved out of renderTax — see renderFees() called from" + NL +
                            "    // the body orchestrator after the strategy cluster. Codex 2026-04-27:" + NL +
                            "    // the MER tangent was sandwiched between tax narrative and the" + NL +
                            "    // draw-order section that follows; flow broken. Now it's its own" + NL +
                            "    // section at the tail of the strategy chapter.");
  merFound = true;
} else {
  // Try the un-patched form
  const fallbackCall = "    // MER impact comparison table \\u2014 always shown so the reader can place\r\n    // themselves on the spectrum of placement types. Hypotheses explicit.\r\n    h += _renderMERImpactTable(d, fr, f$);";
  if (s.includes(fallbackCall)) {
    s = s.replace(fallbackCall, "    // MER impact moved out of renderTax \\u2014 see renderFees().");
    merFound = true;
  }
}
if (!merFound) { console.error('MER call site in renderTax not found'); process.exit(1); }

// Add a renderFees function definition after _renderMERImpactTable's closing brace.
// Find the end of _renderMERImpactTable function — search for the next function declaration after its start.
const merFnStart = s.indexOf("function _renderMERImpactTable");
if (merFnStart < 0) { console.error('_renderMERImpactTable not found'); process.exit(1); }
// Find the end of that function — match the next "  // ===" marker or "  function " at top-level indent.
const merFnEndAnchor = s.indexOf("  // === SECTION:", merFnStart);
const insertPos = merFnEndAnchor > 0 ? merFnEndAnchor : s.indexOf("  function ", merFnStart + 50);
if (insertPos < 0) { console.error('cannot find insertion point after MER fn'); process.exit(1); }
const renderFeesDef =
  "  // === SECTION: Frais & coûts du portefeuille ===" + NL +
  "  // Codex 2026-04-27: MER (management fee impact) was previously" + NL +
  "  // rendered inside renderTax, sandwiched between tax narrative and the" + NL +
  "  // draw-order section that follows. The user flagged the flow break:" + NL +
  "  // section 9 'Stratégie fiscale' shouldn't pivot to fees mid-stream." + NL +
  "  // MER now lives in its own section at the tail of the strategy" + NL +
  "  // chapter — after the closing recap, before chapter 5 (Explore" + NL +
  "  // alternatives). Same content (KPIs + comparison table) just relocated." + NL +
  "  function renderFees(d, secN) {" + NL +
  "    if (!d || !d.p) return '';" + NL +
  "    var fr = d.fr;" + NL +
  "    var f$ = F.fmtCompact;" + NL +
  "    // Only render when MER is non-trivially entered or the comparison" + NL +
  "    // table would be informative. The table is always-on because it's" + NL +
  "    // educational regardless of input." + NL +
  "    var h = secPage();" + NL +
  "    h += F.Sec(secN, fr ? 'Frais & co\\u00fbts du portefeuille' : 'Portfolio fees & costs', 'sec-fees');" + NL +
  "    h += narr(fr" + NL +
  "      ? 'Les frais de gestion (MER) sont d\\u00e9duits ann\\u00e9e apr\\u00e8s ann\\u00e9e du solde du portefeuille. Sur un horizon long, m\\u00eame une diff\\u00e9rence d\\u2019un point de pourcentage entre 0,5\\u202f% et 1,5\\u202f% repr\\u00e9sente plusieurs centaines de milliers de dollars en pouvoir d\\u2019achat \\u00e0 long terme.'" + NL +
  "      : 'Management fees (MER) are deducted from the portfolio balance year after year. Over a long horizon, even a one-point difference between 0.5% and 1.5% translates into hundreds of thousands of dollars in long-term purchasing power.');" + NL +
  "    h += _renderMERImpactTable(d, fr, f$);" + NL +
  "    h += secPageEnd();" + NL +
  "    return h;" + NL +
  "  }" + NL + NL;
s = s.slice(0, insertPos) + renderFeesDef + s.slice(insertPos);

// Add sec-fees to TOC chapter map (Ch.4) + push order (after closing-recap).
const oldChapMap = "    'sec-closing-recap': 4, 'sec-premium-deepdive': 4,";
const newChapMap = "    'sec-closing-recap': 4, 'sec-premium-deepdive': 4, 'sec-fees': 4,";
if (s.includes(oldChapMap)) s = s.replace(oldChapMap, newChapMap);

// Add TOC push for sec-fees right after closing-recap.
const oldTocPush = "    _tocN++; tocSections.push({ n: _tocN, id: 'sec-closing-recap', label: d.fr ? 'Synth\\u00e8se finale' : 'Final synthesis' });";
let foundTocPush = s.includes(oldTocPush);
if (!foundTocPush) {
  // After Conclusion rename, the label is now 'Conclusion'.
  const renamedTocPush = "    _tocN++; tocSections.push({ n: _tocN, id: 'sec-closing-recap', label: d.fr ? 'Conclusion' : 'Conclusion' });";
  if (s.includes(renamedTocPush)) {
    const insertAfter = renamedTocPush + NL +
      "    _tocN++; tocSections.push({ n: _tocN, id: 'sec-fees', label: d.fr ? 'Frais & co\\u00fbts du portefeuille' : 'Portfolio fees & costs' });";
    s = s.replace(renamedTocPush, insertAfter);
    foundTocPush = true;
  }
}
if (!foundTocPush) { console.error('closing-recap toc push not found'); process.exit(1); }

// Wire renderFees into the body render flow — call after renderClosingRecap.
const oldClosingCall = "    var recapHtml = renderClosingRecap(d, secN + 1);\r\n    if (recapHtml) { secN++; h += recapHtml; }";
const newClosingCall = oldClosingCall + NL + NL +
  "    // Codex 2026-04-27: MER moved out of renderTax — render here, at the" + NL +
  "    // tail of the strategy chapter, so it doesn't break the tax-then-" + NL +
  "    // draw-order narrative flow upstream." + NL +
  "    var feesHtml = renderFees(d, secN + 1);" + NL +
  "    if (feesHtml) { secN++; h += feesHtml; }";
if (s.includes(oldClosingCall)) s = s.replace(oldClosingCall, newClosingCall);
else { console.error('closing recap call not found'); process.exit(1); }

fs.writeFileSync(fp, s, 'utf8');
console.log('OK — assumptions rename + MER extracted to renderFees');
