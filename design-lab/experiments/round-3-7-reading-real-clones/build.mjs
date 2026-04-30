import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: {
    "guide-101": path.join(__dirname, "src", "main-guide101.jsx"),
    "guide-201": path.join(__dirname, "src", "main-guide201.jsx"),
    "article-meltdown": path.join(__dirname, "src", "main-article.jsx"),
  },
  bundle: true,
  outdir: __dirname,
  entryNames: "[name]",
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  loader: {
    ".js": "jsx",
    ".jsx": "jsx",
    ".ts": "ts",
    ".tsx": "tsx",
  },
});

console.log("Built round-3-7 reading real clones");
