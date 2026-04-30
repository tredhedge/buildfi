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
   editorial section. Cream panel with gold-tinted border + uppercase
   gold kicker label.
   ──────────────────────────────────────────────────────────────────── */
export function ToolCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: CL.panel,
      border: `1px solid ${CL.accentLine}`,
      borderRadius: 18,
      padding: 22,
      margin: "18px 0",
    }}>
      <div className="bfe-kicker" style={{ marginBottom: 12 }}>{title}</div>
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
  const bar =
    tone === "caution" ? CL.red :
    tone === "check"   ? CL.green :
    tone === "rule"    ? CL.gold :
                         CL.ink;
  const kickerColor = tone === "caution" ? CL.red : tone === "check" ? CL.green : CL.gold;
  return (
    <div style={{
      background: CL.panel,
      borderLeft: `2px solid ${bar}`,
      padding: "12px 16px",
      borderRadius: "0 8px 8px 0",
      fontSize: 14,
      color: CL.text,
      lineHeight: 1.6,
      margin: "12px 0",
    }}>
      {kicker ? (
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: kickerColor,
          textTransform: "uppercase",
          letterSpacing: ".18em",
          marginBottom: 4,
        }}>{kicker}</div>
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
  const accent = tone === "good" ? CL.green : tone === "bad" ? CL.red : CL.gold;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 10,
      alignItems: "center",
      background: CL.panel,
      border: `1px solid ${CL.line}`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: 8,
      padding: "12px 16px",
    }}>
      <div>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: accent,
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
