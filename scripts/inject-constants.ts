// scripts/inject-constants.ts
// ══════════════════════════════════════════════════════════════════════════════
// Build-time injection of engine constants into planner_v2.html
// ══════════════════════════════════════════════════════════════════════════════
// Reads engine-constants-2026.ts and engine-defaults.ts, merges them into a
// single `var C = {...};` block, and injects it into planner_v2.html right
// after the /*__ENGINE_START__*/ marker.
//
// Usage:  npx tsx scripts/inject-constants.ts
//
// On first run, inserts the block with injection markers.
// On subsequent runs, replaces the content between the markers.
// ══════════════════════════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// 1. Import the typed constant objects
// ---------------------------------------------------------------------------

import ENGINE_CONSTANTS from "../lib/constants/engine-constants-2026";
import ENGINE_DEFAULTS from "../lib/constants/engine-defaults";

// ---------------------------------------------------------------------------
// 2. Merge: defaults first, then constants (constants win on key conflicts)
// ---------------------------------------------------------------------------

const merged: Record<string, unknown> = {
  ...(ENGINE_DEFAULTS as unknown as Record<string, unknown>),
  ...(ENGINE_CONSTANTS as unknown as Record<string, unknown>),
};

// ---------------------------------------------------------------------------
// 3. Serialize to ES5-safe JavaScript
// ---------------------------------------------------------------------------

/**
 * Recursively serialize a value to ES5-safe JavaScript string.
 * - Uses `var`, no const/let, no arrow functions.
 * - Preserves nested objects/arrays with 2-space indent.
 * - Numbers, strings, booleans, null rendered literally.
 */
function toES5(value: unknown, indent: number = 0): string {
  var pad = "  ".repeat(indent);
  var innerPad = "  ".repeat(indent + 1);

  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    // JSON.stringify handles escaping
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";

    // Check if all elements are primitives (for compact single-line arrays)
    var allPrimitive = value.every(function (v) {
      return (
        typeof v === "number" ||
        typeof v === "boolean" ||
        typeof v === "string" ||
        v === null
      );
    });

    // Check if elements are arrays themselves (matrix rows)
    var isMatrix = value.length > 0 && Array.isArray(value[0]);

    if (allPrimitive && JSON.stringify(value).length < 100) {
      // Short primitive array: single line
      return "[" + value.map(function (v) { return toES5(v, 0); }).join(", ") + "]";
    }

    // Multi-line array
    var lines: string[] = [];
    lines.push("[");
    for (var i = 0; i < value.length; i++) {
      var comma = i < value.length - 1 ? "," : "";
      if (isMatrix || !allPrimitive) {
        lines.push(innerPad + toES5(value[i], indent + 1) + comma);
      } else {
        lines.push(innerPad + toES5(value[i], indent + 1) + comma);
      }
    }
    lines.push(pad + "]");
    return lines.join("\n");
  }

  if (typeof value === "object") {
    var obj = value as Record<string, unknown>;
    var keys = Object.keys(obj);
    if (keys.length === 0) return "{}";

    // Check if it's a small flat object (for compact inline rendering)
    var allFlat = keys.every(function (k) {
      var v = obj[k];
      return (
        typeof v === "number" ||
        typeof v === "boolean" ||
        typeof v === "string" ||
        v === null
      );
    });

    if (allFlat && JSON.stringify(obj).length < 80) {
      // Short flat object: single line
      return (
        "{ " +
        keys
          .map(function (k) {
            return safeKey(k) + ": " + toES5(obj[k], 0);
          })
          .join(", ") +
        " }"
      );
    }

    // Multi-line object
    var objLines: string[] = [];
    objLines.push("{");
    for (var j = 0; j < keys.length; j++) {
      var key = keys[j];
      var trailingComma = j < keys.length - 1 ? "," : "";
      objLines.push(
        innerPad + safeKey(key) + ": " + toES5(obj[key], indent + 1) + trailingComma
      );
    }
    objLines.push(pad + "}");
    return objLines.join("\n");
  }

  // Fallback
  return String(value);
}

/**
 * Returns the key as-is if it's a valid JS identifier, otherwise quotes it.
 */
function safeKey(key: string): string {
  // Valid JS identifier: starts with letter/$/_, contains letters/digits/$/_
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
    return key;
  }
  return JSON.stringify(key);
}

// Build the var C = {...}; block
var constantCount = Object.keys(merged).length;
var jsBlock = "var C = " + toES5(merged, 0) + ";";

// Wrap with injection markers
var injectedBlock =
  "/*__INJECTED_CONSTANTS_START__*/\n" +
  jsBlock +
  "\n/*__INJECTED_CONSTANTS_END__*/";

// ---------------------------------------------------------------------------
// 4. Read planner_v2.html
// ---------------------------------------------------------------------------

var plannerPath = resolve(__dirname, "..", "planner_v2.html");
var original = readFileSync(plannerPath, "utf-8");
var originalSize = Buffer.byteLength(original, "utf-8");

// ---------------------------------------------------------------------------
// 5. Inject or replace
// ---------------------------------------------------------------------------

var ENGINE_START_MARKER = "/*__ENGINE_START__*/";
var INJECT_START = "/*__INJECTED_CONSTANTS_START__*/";
var INJECT_END = "/*__INJECTED_CONSTANTS_END__*/";

var result: string;
var mode: string;

var injectStartIdx = original.indexOf(INJECT_START);
var injectEndIdx = original.indexOf(INJECT_END);

if (injectStartIdx !== -1 && injectEndIdx !== -1) {
  // Subsequent run: replace existing injection
  var endOfMarker = injectEndIdx + INJECT_END.length;
  result =
    original.substring(0, injectStartIdx) +
    injectedBlock +
    original.substring(endOfMarker);
  mode = "replaced";
} else {
  // First run: inject right after /*__ENGINE_START__*/
  // We need to find the standalone marker (on its own line), not the one
  // referenced inside a string literal in the worker extraction code.
  // The standalone marker is preceded by a newline, so search for "\n" + marker.
  var searchPattern = "\n" + ENGINE_START_MARKER;
  var searchIdx = original.indexOf(searchPattern);
  if (searchIdx === -1) {
    console.error(
      "ERROR: Could not find standalone " + ENGINE_START_MARKER + " in " + plannerPath
    );
    process.exit(1);
  }
  // engineStartIdx points to the start of the marker itself (skip the \n)
  var engineStartIdx = searchIdx + 1;
  var insertPos = engineStartIdx + ENGINE_START_MARKER.length;
  // Insert on the next line after the marker
  result =
    original.substring(0, insertPos) +
    "\n" +
    injectedBlock +
    "\n" +
    original.substring(insertPos);
  mode = "injected (first run)";
}

// ---------------------------------------------------------------------------
// 6. Write back
// ---------------------------------------------------------------------------

writeFileSync(plannerPath, result, "utf-8");
var newSize = Buffer.byteLength(result, "utf-8");

// ---------------------------------------------------------------------------
// 7. Report
// ---------------------------------------------------------------------------

console.log("inject-constants: " + mode);
console.log(
  "  Constants merged: " +
    Object.keys(ENGINE_CONSTANTS as unknown as Record<string, unknown>).length +
    " from engine-constants-2026"
);
console.log(
  "  Defaults merged:  " +
    Object.keys(ENGINE_DEFAULTS as unknown as Record<string, unknown>).length +
    " from engine-defaults"
);
console.log("  Total keys in C:  " + constantCount);
console.log(
  "  File size:        " +
    (originalSize / 1024).toFixed(1) +
    " KB -> " +
    (newSize / 1024).toFixed(1) +
    " KB (" +
    (newSize > originalSize ? "+" : "") +
    ((newSize - originalSize) / 1024).toFixed(1) +
    " KB)"
);
console.log("  Output:           " + plannerPath);
