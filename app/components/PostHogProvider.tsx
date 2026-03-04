"use client";

import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// PostHogProvider
// ---------------------------------------------------------------------------
// Injects the PostHog snippet via <script> and initialises the SDK once.
// Uses the window.posthog approach already established in lib/tracking.ts.
// No npm package needed -- the snippet loads posthog-js from the CDN.
// ---------------------------------------------------------------------------

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = "https://us.i.posthog.com"; // US cloud instance

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialized = useRef(false);

  useEffect(() => {
    // Guard: SSR, missing key, no consent, or already loaded
    if (typeof window === "undefined") return;
    if (!POSTHOG_KEY) return;
    if (localStorage.getItem("buildfi_consent") !== "yes") return;
    if (initialized.current) return;
    initialized.current = true;

    // If posthog is already on the page (e.g. manual snippet), just init
    if (window.posthog) return;

    // PostHog standard async snippet -----------------------------------------
    // This mirrors the official snippet from https://posthog.com/docs/libraries/js
    // but adapted for dynamic injection inside a React effect.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const ph: any[] = [];
    const proxy = (...args: any[]) => {
      ph.push(args);
    };

    // Stub the methods tracking.ts expects so calls made before the script
    // loads are queued and replayed automatically by posthog-js.
    const stubMethods = [
      "capture",
      "identify",
      "getFeatureFlag",
      "onFeatureFlags",
      "reloadFeatureFlags",
      "register",
      "reset",
      "opt_in_capturing",
      "opt_out_capturing",
    ];
    const stub: Record<string, any> = {
      _i: [POSTHOG_KEY, { api_host: POSTHOG_HOST }, "posthog"],
      _stubbed: true,
    };
    stubMethods.forEach((m) => {
      stub[m] = (...args: any[]) => {
        proxy(m, ...args);
      };
    });
    (window as any).posthog = stub;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // Inject the real posthog-js script
    const script = document.createElement("script");
    script.src = `${POSTHOG_HOST}/static/array.js`;
    script.async = true;
    script.onload = () => {
      // posthog-js replaces window.posthog on load; call init
      if ((window as any).posthog && (window as any).posthog.init) {
        (window as any).posthog.init(POSTHOG_KEY, {
          api_host: POSTHOG_HOST,
          // Capture pageviews automatically (SPA-friendly)
          capture_pageview: true,
          capture_pageleave: true,
          // Feature flags: fetch on load so getFeatureFlag() works immediately
          bootstrap: {},
          loaded: (posthog: any) => {
            // Replay queued calls
            ph.forEach(([method, ...args]) => {
              if (typeof posthog[method] === "function") {
                posthog[method](...args);
              }
            });
          },
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  return <>{children}</>;
}
