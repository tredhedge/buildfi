"use client";
/**
 * BuildFi Editorial reusable components.
 *
 * Importable by any guide / report surface that has opted into the
 * Editorial system (see docs/DESIGN-SYSTEM.md). All components honor:
 * - Single voice: cream paper background, ink body text, thin colored
 *   bar (2-3px) carrying semantic meaning.
 * - No flooded color backgrounds in prose.
 * - Reserved tones: gold = rule/principle, red = caution/myth/pitfall,
 *   green = intrinsically positive verification, ink = neutral info.
 *
 * Source of truth lives here; do not copy-paste these into guide files.
 */
import React from "react";
import { getEditorialPalette } from "./editorial.tokens";

const CL = getEditorialPalette();

/* ────────────────────────────────────────────────────────────────────
   Section — chapter scaffold
   ────────────────────────────────────────────────────────────────────
   Pattern: chapter card (kicker "Chapter N" + Playfair title + serif
   italic subtitle) followed by a section card holding the lesson body.
   ──────────────────────────────────────────────────────────────────── */
export function Section({
  num, title, sub, children, id, fr, kickerOverride, kickerColor,
}: {
  num: number;
  title: string;
  sub: string;
  children: React.ReactNode;
  id: string;
  fr: boolean;
  /** Optional override for the chapter kicker text (e.g. "Bonus 301 · Chapter 8") */
  kickerOverride?: string;
  /** Optional override for the kicker color (defaults to gold via CSS) */
  kickerColor?: string;
}) {
  const kicker = kickerOverride ?? (fr ? `Chapitre ${num}` : `Chapter ${num}`);
  return (
    <>
      <section className="bfe-chapter" id={id}>
        <div className="bfe-kicker" style={kickerColor ? { color: kickerColor } : undefined}>{kicker}</div>
        <h2 className="bfe-title-chapter">{title}</h2>
        <div style={{
          fontSize: 18,
          color: CL.muted,
          fontStyle: "italic",
          marginTop: 10,
          fontFamily: 'var(--font-playfair),Georgia,serif',
          maxWidth: 720,
        }}>{sub}</div>
      </section>
      <section className="bfe-section">
        {children}
      </section>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ToolCard — wrapper for embedded interactive widgets inside an
   editorial section.

   Prominence pass (2026-04-29): tools are interactive value, not just
   another callout. They get a 2px gold border, slightly warmer cream
   background, soft gold-tinted shadow, and a kicker prefixed with an
   "Outil interactif" / "Interactive tool" eyebrow so the reader sees
   immediately "this is something to use, not just read."
   ──────────────────────────────────────────────────────────────────── */
export function ToolCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "rgba(255, 251, 242, 0.96)",
      border: `2px solid ${CL.gold}`,
      borderRadius: 18,
      padding: "26px 26px 24px",
      margin: "20px 0",
      boxShadow: "0 14px 32px rgba(196, 148, 74, 0.13), 0 2px 6px rgba(56, 42, 19, 0.06)",
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 800,
        color: CL.gold,
        textTransform: "uppercase",
        letterSpacing: ".22em",
        marginBottom: 6,
        opacity: 0.82,
      }}>◆  Outil interactif · Interactive tool</div>
      <div className="bfe-kicker" style={{ marginBottom: 14, fontSize: 14, letterSpacing: ".12em" }}>{title}</div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Note — editorial-style callout
   ────────────────────────────────────────────────────────────────────
   Cream paper, ink body text, thin 2px colored bar on the left. The
   bar carries the meaning, not a flooded background. Optional small
   uppercase kicker label inherits the bar's tone color.

   Tones:
     "rule"    (gold)  — best practice, principle, takeaway.
     "caution" (red)   — pitfall, myth, common mistake, trap.
     "info"    (ink)   — neutral observation, statistic, nuance.
     "check"   (green) — intrinsically positive verification.
   ──────────────────────────────────────────────────────────────────── */
export function Note({
  tone = "info",
  kicker,
  children,
}: {
  tone?: "rule" | "caution" | "info" | "check";
  kicker?: string;
  children: React.ReactNode;
}) {
  /*
    Editorial balance pass (2026-04-29 v2): all bars stay gold or ink
    (no semantic floods), but tone now varies *weight* — bar thickness,
    background warmth, kicker emphasis — so the visual hierarchy reads
    again without painting the page red/green/blue.
      caution: 5px gold bar + warm-amber tinted background + bold kicker
      rule:    4px gold bar + cream panel
      check:   3px gold bar + ✓ in kicker
      info:    2px ink-soft bar + muted kicker (recedes)
  */
  const tones = {
    caution: { bar: CL.gold, barW: 5, bg: "rgba(196,148,74,0.07)", kicker: CL.gold, kickerW: 800 as const },
    rule:    { bar: CL.gold, barW: 4, bg: CL.panel,                kicker: CL.gold, kickerW: 700 as const },
    check:   { bar: CL.gold, barW: 3, bg: CL.panel,                kicker: CL.gold, kickerW: 700 as const },
    info:    { bar: CL.ink,  barW: 2, bg: CL.panel,                kicker: CL.muted, kickerW: 600 as const },
  } as const;
  const t = tones[tone];
  const kickerLabel = kicker
    ? (tone === "check" ? `✓  ${kicker}` : kicker)
    : null;
  return (
    <div className={`bfe-note bfe-note--${tone}`} style={{
      background: t.bg,
      borderLeft: `${t.barW}px solid ${t.bar}`,
      padding: "12px 16px",
      borderRadius: "0 8px 8px 0",
      fontSize: 14,
      color: CL.text,
      lineHeight: 1.6,
      margin: "12px 0",
      transition: "background 180ms ease, box-shadow 180ms ease",
    }}>
      {kickerLabel ? (
        <div style={{
          fontSize: 11,
          fontWeight: t.kickerW,
          color: t.kicker,
          textTransform: "uppercase",
          letterSpacing: ".18em",
          marginBottom: 4,
        }}>{kickerLabel}</div>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CompareRow — labeled comparison line
   ────────────────────────────────────────────────────────────────────
   Cream paper card with a thin 3px colored left bar (good=green,
   bad=red, neutral=gold). Small uppercase kicker inherits the bar
   tone; value renders in ink JetBrains Mono so the comparison is
   driven by typography, not flood color.
   ──────────────────────────────────────────────────────────────────── */
export function CompareRow({
  tone, label, sublabel, value,
}: {
  tone: "good" | "neutral" | "bad";
  label: string;
  sublabel?: string;
  value: string;
}) {
  /*
    Editorial restraint pass (2026-04-29): all CompareRow bars + kickers
    now use gold. The bar opacity varies subtly by tone (good=full gold,
    neutral=mid, bad=line) so a row sequence still reads as a comparison
    sequence visually, but no red/green floods. The numeric value carries
    the semantic — a positive number reads good on its own.
  */
  const barOpacity = tone === "good" ? 1 : tone === "neutral" ? 0.6 : 0.3;
  const bar = `color-mix(in srgb, ${CL.gold} ${Math.round(barOpacity * 100)}%, transparent)`;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 10,
      alignItems: "center",
      background: CL.panel,
      border: `1px solid ${CL.line}`,
      borderLeft: `3px solid ${bar}`,
      borderRadius: 8,
      padding: "12px 16px",
    }}>
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: CL.gold,
          textTransform: "uppercase",
          letterSpacing: ".18em",
          marginBottom: 2,
        }}>{label}</div>
        {sublabel ? <div style={{ fontSize: 13, color: CL.muted }}>{sublabel}</div> : null}
      </div>
      <strong style={{
        fontSize: 18,
        color: CL.ink,
        fontFamily: 'var(--font-jetbrains-mono),"Courier New",monospace',
        fontWeight: 700,
      }}>{value}</strong>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   useEditorialBody — opt the document body into the Editorial system
   ────────────────────────────────────────────────────────────────────
   Sets body[data-bf-system="editorial"] on mount, cleans up on unmount
   so subsequent navigation back to a Product surface doesn't inherit
   editorial fonts/background.
   ──────────────────────────────────────────────────────────────────── */
import { useEffect } from "react";
export function useEditorialBody() {
  useEffect(() => {
    document.body.dataset.bfSystem = "editorial";
    return () => { delete document.body.dataset.bfSystem; };
  }, []);
}

/* ────────────────────────────────────────────────────────────────────
   useEditorialRailScrollSpy — bold the rail nav item for the section
   currently visible in the viewport. Also auto-scrolls the rail itself
   when the rail overflows internally (max-height: calc(100vh - 40px)).
   ────────────────────────────────────────────────────────────────────
   Activation rule: the topmost section whose top has crossed the focus
   line (28% of the viewport) is "current". Mirrors the codex AI-report
   scroll-spy implementation. URL hash is updated via replaceState so
   refresh keeps you in place without polluting browser history.
   ──────────────────────────────────────────────────────────────────── */
export function useEditorialRailScrollSpy(railSelector: string = ".bfe-rail") {
  useEffect(() => {
    const rail = document.querySelector<HTMLElement>(railSelector);
    if (!rail) return;
    const links = Array.from(rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    type Record = { id: string; target: HTMLElement; link: HTMLAnchorElement };
    const records: Record[] = links
      .map((a) => {
        const href = a.getAttribute("href");
        if (!href) return null;
        const id = href.slice(1);
        const target = document.getElementById(id);
        if (!target) return null;
        return { id, target, link: a };
      })
      .filter((r): r is Record => r !== null);
    if (!records.length) return;

    let currentId = "";
    let ticking = false;

    function activate(id: string) {
      let activeLink: HTMLAnchorElement | null = null;
      for (const r of records) {
        const isActive = r.id === id;
        r.link.classList.toggle("is-active", isActive);
        if (isActive) activeLink = r.link;
      }
      // Keep the active link visible inside the rail's scroll container.
      if (activeLink) {
        try { activeLink.scrollIntoView({ block: "nearest" }); } catch {}
      }
    }

    function compute(): string {
      const focusLine = window.innerHeight * 0.28;
      let chosen = records[0];
      for (const r of records) {
        const rect = r.target.getBoundingClientRect();
        if (rect.top <= focusLine) chosen = r;
      }
      return chosen.id;
    }

    function sync() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const next = compute();
        if (next === currentId) return;
        currentId = next;
        activate(next);
        try { history.replaceState(null, "", "#" + next); } catch {}
      });
    }

    // Click on a rail link: activate immediately so the bold doesn't lag
    // the smooth-scroll animation.
    function onClick(e: Event) {
      const a = (e.currentTarget as HTMLAnchorElement);
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const id = href.slice(1);
      currentId = id;
      activate(id);
    }
    for (const r of records) r.link.addEventListener("click", onClick);

    activate(records[0].id);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      for (const r of records) r.link.removeEventListener("click", onClick);
    };
  }, [railSelector]);
}
