// tests/engine-ssot-sync.test.ts — 2026-06-18
// ─────────────────────────────────────────────────────────────────────────────
// ENGINE SSOT GUARD: lib/engine/index.js is GENERATED from planner_v3.html's engine
// block (scripts/gen-engine-from-planner.mjs). This test regenerates from the current
// planner_v3 and fails if the committed lib/engine/index.js has drifted — i.e. someone
// edited the engine logic in planner_v3 (or the shim constants) without re-promoting,
// or hand-edited lib/engine. Keeps the two copies from silently diverging.
//   Fix on failure: `npm run promote-engine` (regenerate + copy), then re-run gates.
//   Run: npx tsx tests/engine-ssot-sync.test.ts
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LIVE = join(ROOT, "lib", "engine", "index.js");
const CAND = join(ROOT, "lib", "engine", "index.candidate.js");

// Regenerate the candidate from the current planner_v3 (also runs the C↔shim drift guard).
try {
  execSync("node scripts/gen-engine-from-planner.mjs", { cwd: ROOT, stdio: "pipe" });
} catch (e: any) {
  console.error("✗ engine SSOT: generator failed (likely C↔shim drift) —\n" + (e.stdout?.toString() || e.message));
  process.exit(1);
}

const live = readFileSync(LIVE, "utf8");
const cand = readFileSync(CAND, "utf8");
console.log("══════════════════════════════════════════════════════════════");
if (live === cand) {
  console.log("  ENGINE SSOT SYNC OK: lib/engine/index.js === fresh regeneration from planner_v3.");
  console.log("══════════════════════════════════════════════════════════════");
} else {
  // Find first differing line for a useful message.
  const lv = live.split("\n"), cv = cand.split("\n");
  let i = 0; while (i < lv.length && i < cv.length && lv[i] === cv[i]) i++;
  console.log("  ENGINE SSOT DRIFT: lib/engine/index.js differs from a fresh regeneration.");
  console.log(`  First diff at line ${i + 1}:`);
  console.log(`    live: ${(lv[i] ?? "<EOF>").slice(0, 100)}`);
  console.log(`    gen : ${(cv[i] ?? "<EOF>").slice(0, 100)}`);
  console.log("  → planner_v3 engine (or shim constants) changed without re-promoting.");
  console.log("    Fix: npm run promote-engine, then re-run gates.");
  console.log("══════════════════════════════════════════════════════════════");
  process.exit(1);
}
