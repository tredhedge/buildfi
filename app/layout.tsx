import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PostHogProvider from "./components/PostHogProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
      "Plan testé contre krach, inflation, longévité. Fiscalité Canada 2026 — 13 provinces et territoires. Bilingue FR/EN. Bilan 29,99 $ · Planner 69,99 $. AMF-compliant.",
    url: "https://buildfi.ca",
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
  alternates: {
    canonical: "https://buildfi.ca",
    languages: { "fr-CA": "https://buildfi.ca", "en-CA": "https://buildfi.ca?lang=en" },
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
