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
  var w = Math.round(270 * s);
  var h = Math.round(52 * s);

  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 270 52" style="display:block">'
    + '<g transform="translate(0,2)">'
    + '<rect x="0" y="34" width="25" height="7" rx="1.8" fill="' + blockFill + '"/>'
    + '<rect x="3.5" y="23.5" width="23.5" height="7" rx="1.8" fill="' + blockFill + '" opacity="' + midOpacity + '"/>'
    + '<rect x="7" y="13" width="22" height="7" rx="1.8" fill="' + goldFill + '"/>'
    + '</g>'
    + '<text x="42" y="41" font-family="\'Plus Jakarta Sans\',sans-serif" font-size="35" font-weight="700" letter-spacing="-0.6">'
    + '<tspan fill="' + textFill + '">build</tspan><tspan fill="' + goldFill + '">fi</tspan>'
    + '</text></svg>';
}
