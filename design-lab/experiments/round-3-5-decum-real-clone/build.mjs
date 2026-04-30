import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.join(__dirname, "src", "main.jsx")],
  bundle: true,
  outfile: path.join(__dirname, "app.js"),
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

console.log("Built app.js");
