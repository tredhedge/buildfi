// /public/logo.js — BuildFi logo (single source of truth)
// Usage: <script src="/logo.js"></script>
// Then call: logoSVG("lg","light") or logoSVG("sm","dark")
// Sizes: "lg" (1.2x), "md" (0.85x), "sm" (0.55x)
// Contexts: "light" (navy blocks on cream/white bg), "dark" (cream blocks on navy bg)
//
// Logo: 3 stacking blocks (foundation → building → independence)
// Font: Plus Jakarta Sans 700
// Colors: navy #1a2744, gold #c49a1a, cream #faf8f4

function logoSVG(size, context) {
  var isDark = context === "dark";
  var blockFill = isDark ? "#faf8f4" : "#1a2744";
  var midOpacity = isDark ? "0.40" : "0.50";
  var textFill = isDark ? "#faf8f4" : "#1a2744";
  var goldFill = "#c49a1a";

  // Scale factors
  var s = size === "lg" ? 1.2 : size === "md" ? 0.85 : 0.55;
  var w = Math.round(220 * s);
  var h = Math.round(48 * s);

  // ViewBox 0 0 220 48 — tighter than 270 52, blocks are proportionally larger
  // Blocks: bottom=widest (foundation), mid=offset right (building), top=gold (independence)
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 220 48" style="display:block">'
    + '<g>'
    + '<rect x="0" y="32" width="28" height="8" rx="2" fill="' + blockFill + '"/>'
    + '<rect x="4" y="22" width="26" height="8" rx="2" fill="' + blockFill + '" opacity="' + midOpacity + '"/>'
    + '<rect x="8" y="12" width="24" height="8" rx="2" fill="' + goldFill + '"/>'
    + '</g>'
    + '<text x="40" y="38" font-family="\'Plus Jakarta Sans\',sans-serif" font-size="34" font-weight="700" letter-spacing="-0.5">'
    + '<tspan fill="' + textFill + '">build</tspan><tspan fill="' + goldFill + '">fi</tspan>'
    + '</text></svg>';
}
