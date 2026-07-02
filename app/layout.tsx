import type { Metadata, Viewport } from "next";
import { DM_Sans, Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import PostHogProvider from "./components/PostHogProvider";

/*
  Mobile viewport — explicit (Next.js auto-injects a default if absent, but
  declaring it lets us opt into viewport-fit: cover so iOS Safari respects
  env(safe-area-inset-*) padding on notched devices, and pin the initial
  scale to 1 so the page never loads zoomed.
*/
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1420" },
  ],
};

/*
  BuildFi font stack (2026-04-28 design-system unification):
  - DM Sans      → Product surfaces (marketing, tools, planner, dashboard)
  - Inter        → Editorial surfaces (guides, AI reports)
  - Playfair     → Editorial serif headings
  - JetBrains Mono → numbers everywhere (both systems)

  Each font registers a CSS variable consumed by lib/design/{product,editorial}.css.
*/
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // Canonical host is www (apex 307s to it in prod). metadataBase also makes
  // relative asset URLs (og-image, icons) resolve to absolute www URLs.
  metadataBase: new URL("https://www.buildfi.ca"),
  title: "BuildFi — Planification retraite canadienne bilingue | 29,99 $",
  description:
    "Plan de retraite testé contre krach, inflation et longévité. Fiscalité 2026 fédéral + 13 provinces et territoires. Bilingue FR/EN. CPP/RRQ, PSV, meltdown REER, CCPC, fractionnement. Bilan dès 29,99 $, Planner 69,99 $.",
  keywords: [
    "planification retraite Canada",
    "bilan retraite Québec",
    "calculateur retraite bilingue",
    "récupération PSV",
    "meltdown REER",
    "RRQ 60 65 70",
    "CCPC retraite",
    "retirement planning Canada",
    "bilingual retirement calculator",
  ],
  openGraph: {
    title: "BuildFi — Planification retraite canadienne bilingue",
    description:
      "Plan testé contre krach, inflation, longévité. Fiscalité Canada 2026 — 13 provinces et territoires. Bilingue FR/EN. Bilan 29,99 $ · Planner 69,99 $. Projections observationnelles, pas un conseil financier.",
    url: "https://www.buildfi.ca",
    type: "website",
    locale: "fr_CA",
    siteName: "BuildFi",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "BuildFi — Planification retraite canadienne" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "BuildFi — Planification retraite canadienne",
    description: "Plan testé contre l'adversité. Bilan 29,99 $. 13 provinces. Bilingue FR/EN.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  // No alternates here on purpose: a root-level canonical is inherited by every
  // page that doesn't override it, which stamped "canonical = homepage" on
  // /support, /merci, etc. — telling crawlers those pages are duplicates of the
  // landing. Canonicals + hreflang are declared per page (each layout.tsx); the
  // landing itself is static public/index.html and carries its own tags.
  robots: { index: true, follow: true },
  // Search Console / Bing verification (T1) — DNS TXT verification is preferred
  // (no code change). If meta-tag verification is chosen instead, uncomment:
  // verification: {
  //   google: "[À FOURNIR — Maitre]",
  //   other: { "msvalidate.01": "[À FOURNIR — Maitre]" },
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${dmSans.variable} ${inter.variable} ${playfair.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
