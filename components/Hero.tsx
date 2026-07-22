"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import ScrollVideo from "@/components/ScrollVideo";
import gloveTan from "@/public/gloves/advanced-tan-1175.webp";

/**
 * Hero (§1). Two forms sharing one overlay:
 *
 * - Static (SSR + mobile + prefers-reduced-motion): CSS dark-studio backdrop
 *   with the real SSK Advanced 11.75" Tan still — the plain stacked layout
 *   the brief requires under 768px.
 * - Scrub (desktop, motion-OK, after hydration): the Kling exploded-glove
 *   clip as 121 extracted frames, canvas-scrubbed over 3 viewport heights
 *   via ScrollVideo. Frame 1 matches the static still, so the upgrade is
 *   seamless.
 */

const FRAME_COUNT = 121; // ls public/frames/desktop | wc -l

function Overlay({ scrub }: { scrub: boolean }) {
  return (
    <div className="noise-overlay relative z-10 flex h-full w-full flex-col justify-between px-6 py-10 md:px-12">
      {/* Top bar */}
      <header className="flex items-start justify-between">
        <span className="font-display text-sm font-semibold tracking-[0.08em] uppercase text-white">
          SSK
        </span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/40">
          Honkbal · Handschoenen
        </span>
      </header>

      {/* Headline block */}
      <div className="mx-auto w-full max-w-6xl">
        <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-white/50">
          § 01 · Handschoenen
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.6rem,7vw,5.6rem)] font-medium leading-[0.95] tracking-[-0.045em]">
          <span className="text-gradient">Elk onderdeel </span>
          <span className="text-gradient-leather shimmer">telt</span>
          <span className="text-gradient">.</span>
        </h1>
        <p className="mt-6 max-w-[46ch] text-[clamp(1rem,1.1vw,1.1rem)] font-light leading-[1.65] text-white/70">
          Leer, vetersluiting, web, voering — in een SSK-handschoen heeft elk
          detail een reden. Ontdek de series, van Advanced tot ProEdge.
        </p>
        <a
          href="#contact"
          className="pointer-events-auto mt-10 inline-block rounded-full border border-white/30 bg-black/20 px-7 py-3 text-sm tracking-wide text-white backdrop-blur-sm transition-colors duration-300 hover:border-white/60"
        >
          Bekijk de collectie
        </a>
      </div>

      {/* Bottom bar */}
      <footer className="flex items-end justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/40">
          SSK European Baseball Center · Kwintsheul
        </span>
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/40">
          {scrub ? "Scroll — elk onderdeel" : "Scroll ↓"}
        </span>
      </footer>
    </div>
  );
}

export default function Hero() {
  const [scrub, setScrub] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (desktop && !reduced) setScrub(true);
  }, []);

  if (scrub) {
    return (
      <ScrollVideo
        desktop={{ dir: "/frames/desktop", count: FRAME_COUNT }}
        scrollLength={3}
        className="bg-ink"
      >
        <Overlay scrub />
      </ScrollVideo>
    );
  }

  return (
    <section className="relative flex h-svh min-h-[640px] w-full flex-col overflow-hidden bg-ink">
      {/* Dark-studio backdrop: warm key light low-center, falling off to ink */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: [
            "radial-gradient(ellipse 58% 46% at 68% 62%, rgba(224, 168, 96, 0.13), transparent 70%)",
            "radial-gradient(ellipse 85% 70% at 60% 65%, rgba(185, 123, 46, 0.07), transparent 65%)",
            "radial-gradient(ellipse 120% 60% at 50% 108%, rgba(240, 192, 122, 0.06), transparent 60%)",
            "var(--color-ink)",
          ].join(", "),
        }}
      />

      {/* Real product still in the studio spotlight (SSK Advanced 11.75" Tan) */}
      <div className="pointer-events-none absolute bottom-[6%] right-[-14%] w-[min(56vw,290px)] md:bottom-auto md:left-[68%] md:right-auto md:top-[58%] md:w-[min(36vw,500px)] md:-translate-x-1/2 md:-translate-y-1/2">
        <Image
          src={gloveTan}
          alt="SSK Advanced 11.75″ Pitcher/Infield handschoen, tan leer"
          fetchPriority="high"
          sizes="(min-width: 768px) 36vw, 56vw"
          className="h-auto w-full drop-shadow-[0_48px_90px_rgba(0,0,0,0.65)]"
        />
        <p className="mt-5 hidden text-center font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/35 md:block">
          Advanced · 11.75″ Pitcher/Infield · € 249,95
        </p>
      </div>

      <Overlay scrub={false} />
    </section>
  );
}
