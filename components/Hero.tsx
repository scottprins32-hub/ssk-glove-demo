/**
 * Hero — static-placeholder form (§1 of the brief).
 *
 * The scroll-scrubbed exploded-glove video isn't in yet. Until it lands, the
 * background is a CSS dark-studio set (spotlight + vignette + noise) with a
 * clearly marked slot where the glove still goes. The overlay contract below
 * (eyebrow / two-tone headline / lead / CTA / frame bars) is final and carries
 * over unchanged to the canvas-scrub version.
 *
 * When the video arrives: swap the background + glove-slot layers for the
 * ScrollVideo component (see BRIEF.md §1 for the ffmpeg frame-extraction step).
 */
export default function Hero() {
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

      {/* Placeholder slot for the dark-studio glove still ([CHECK] asset pending) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[62%] hidden aspect-square w-[min(44vw,560px)] -translate-y-1/2 items-center justify-center rounded-full md:left-[68%] md:flex md:-translate-x-1/2"
      >
        <div className="absolute inset-0 rounded-full border border-white/[0.06]" />
        <div className="absolute inset-6 rounded-full border border-dashed border-white/[0.08]" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.3em] text-white/25">
          studiofoto volgt
        </span>
      </div>

      <div className="noise-overlay relative z-10 flex h-full w-full flex-col justify-between px-6 py-10 md:px-12">
        {/* Top bar */}
        <header className="flex items-start justify-between">
          <span className="font-display text-sm font-semibold tracking-[0.08em] uppercase">
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
          <p className="mt-6 max-w-[52ch] text-[clamp(1rem,1.1vw,1.1rem)] font-light leading-[1.65] text-white/70">
            Leer, vetersluiting, web, voering — in een SSK-handschoen heeft
            elk detail een reden. Bekijk ze van dichtbij.
          </p>
          <a
            href="#contact"
            className="mt-10 inline-block rounded-full border border-white/30 bg-black/20 px-7 py-3 text-sm tracking-wide text-white backdrop-blur-sm transition-colors duration-300 hover:border-white/60"
          >
            Bekijk de collectie
          </a>
        </div>

        {/* Bottom bar */}
        <footer className="flex items-end justify-between">
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/40">
            01 — 05
          </span>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/40">
            Scroll ↓
          </span>
        </footer>
      </div>
    </section>
  );
}
