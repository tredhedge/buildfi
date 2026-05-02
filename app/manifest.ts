// app/manifest.ts -- Next.js 16 native web app manifest.
//
// Phase 5 of the FE/BE split (docs/ARCH-FE-BE-SPLIT.md).
//
// Replaces the legacy /planner/manifest.json once planner_v3.html is
// retired. Per locked decision #6 we are NOT shipping the simulator as
// a PWA-installable offline app -- the engine is server-side and there
// is no value in an offline-only shell. This manifest exists so:
//   - touch icons resolve correctly across iOS / Android
//   - the marketing site can still be added to home-screen as a bookmark
//   - browsers don't fall back to a guessed favicon
//
// Service worker is intentionally omitted.

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BuildFi -- Planification retraite canadienne",
    short_name: "BuildFi",
    description:
      "Plan de retraite testé contre krach, inflation et longévité. Bilingue FR/EN.",
    start_url: "/",
    display: "browser",
    background_color: "#1a1714",
    theme_color: "#1a1714",
    orientation: "any",
    lang: "fr-CA",
    icons: [
      { src: "/icon192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    categories: ["finance", "productivity"],
  };
}
