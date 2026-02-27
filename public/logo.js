// /public/logo.js — BuildFi logo (single source of truth)
// Usage: <script src="/logo.js"></script>
// Then call: logoSVG("lg","light") or logoSVG("sm","dark")
// Sizes: "lg" (1.2x), "md" (0.85x), "sm" (0.55x)
// Contexts: "light" (dark text), "dark" (cream text)

function logoSVG(size, context) {
  var isDark = context === "dark";
  var tFill = isDark ? "#F0E4D4" : "#1A1A1A";
  var s = size === "lg" ? 1.2 : size === "md" ? 0.85 : 0.55;
  var w = Math.round(180 * s);
  var h = Math.round(52 * s);
  var uid = "emb" + size + Math.random().toString(36).slice(2, 6);
  return '<svg width="' + w + '" height="' + h + '" viewBox="0 0 180 52" style="display:block">'
    + '<defs><linearGradient id="' + uid + '" x1="0" y1="1" x2="0" y2="0">'
    + '<stop offset="0%" stop-color="#C45A2C"/><stop offset="100%" stop-color="#E8A84C"/>'
    + '</linearGradient></defs>'
    + '<path d="M14 46 C14 46 8 30 14 18 C20 6 26 12 26 22 C26 12 32 0 38 10 C44 22 38 32 38 32" '
    + 'stroke="url(#' + uid + ')" stroke-width="3" fill="none" stroke-linecap="round"/>'
    + '<text x="48" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" '
    + 'fill="' + tFill + '" letter-spacing="-1.2">build</text>'
    + '<text x="131" y="36" font-family="DM Sans,sans-serif" font-size="32" font-weight="800" '
    + 'fill="url(#' + uid + ')" letter-spacing="-1.2">fi</text></svg>';
}
