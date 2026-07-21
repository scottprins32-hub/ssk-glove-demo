import Image from "next/image";
import glovePalm from "@/public/gloves/advanced-tan-1175-palm.webp";
import Reveal from "@/components/Reveal";

/**
 * §2 Craft (paper) — annotated anatomy of an SSK glove.
 *
 * Until the exploded-view still from the hero video lands, the palm side of
 * the real SSK Advanced 11.75" Tan (shop photo, cut out) carries the
 * annotations. Component descriptors and the 25/75 break-in stat come from
 * the shop's product pages — see "Real data" in BRIEF.md.
 */

type Part = {
  label: string;
  desc: string;
  x: number; // dot position, % of image box
  y: number;
  side: "left" | "right";
};

const parts: Part[] = [
  { label: "web", desc: "elke serie z'n eigen webpatroon", x: 26, y: 18, side: "left" },
  { label: "vetersluiting", desc: "top grain leren veters", x: 66, y: 10, side: "right" },
  { label: "leer", desc: "premium Japans Nameshi-leer", x: 75, y: 57, side: "right" },
  { label: "voering", desc: "plush leren palmvoering", x: 42, y: 90, side: "left" },
];

function Dot() {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: "var(--leather-grad)" }}
    />
  );
}

export default function CraftSection() {
  return (
    <section id="craft" className="bg-paper text-ink md:overflow-x-clip">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-36">
        <Reveal>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-ink/50">
            § 02 · Anatomie
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            <span className="text-gradient-dark">Vier onderdelen, één vorm.</span>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[clamp(0.95rem,1.05vw,1.05rem)] font-light leading-[1.65] text-ink/65">
            Dezelfde onderdelen in elke SSK — van Advanced tot ProEdge. Het
            verschil zit in het leer, het web en de afwerking.
          </p>
        </Reveal>

        {/* Annotated figure (desktop) */}
        <Reveal className="mt-16 md:mt-20">
          <div className="relative mx-auto w-[min(80vw,600px)]">
            <Image
              src={glovePalm}
              alt="Palmzijde van de SSK Advanced 11.75″ handschoen met onderdelen: web, vetersluiting, leer en voering"
              sizes="(min-width: 768px) 600px, 80vw"
              className="h-auto w-full drop-shadow-[0_30px_50px_rgba(13,11,9,0.18)]"
            />
            {parts.map((p) => (
              <div
                key={p.label}
                className="absolute hidden items-center gap-3 md:flex"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform:
                    p.side === "left"
                      ? "translate(-100%, -50%)"
                      : "translateY(-50%)",
                }}
              >
                {p.side === "right" && <Dot />}
                {p.side === "right" && <span className="h-px w-10 bg-ink/25" />}
                <span
                  className={`w-max max-w-[17ch] ${p.side === "left" ? "text-right" : ""}`}
                >
                  <span className="block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-ink/80">
                    {p.label}
                  </span>
                  <span className="mt-1 block text-xs font-light leading-snug text-ink/55">
                    {p.desc}
                  </span>
                </span>
                {p.side === "left" && <span className="h-px w-10 bg-ink/25" />}
                {p.side === "left" && <Dot />}
              </div>
            ))}
          </div>

          {/* Component list (mobile) */}
          <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:hidden">
            {parts.map((p) => (
              <li key={p.label} className="flex items-start gap-3">
                <span className="mt-[3px]">
                  <Dot />
                </span>
                <span>
                  <span className="block font-mono text-[0.62rem] uppercase tracking-[0.28em] text-ink/80">
                    {p.label}
                  </span>
                  <span className="mt-1 block text-sm font-light text-ink/55">
                    {p.desc}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Stat with accent + emotional line */}
        <Reveal className="mt-20 md:mt-28" delay={120}>
          <div className="hairline-dark" />
          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-display text-[clamp(3rem,6vw,4.5rem)] font-medium leading-none tracking-[-0.04em]">
                <span className="text-gradient-leather">25 / 75</span>
              </p>
              <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.3em] text-ink/50">
                % fabriek · % speler — break-in
              </p>
            </div>
            <p className="font-serif text-[clamp(1.4rem,2.2vw,1.9rem)] italic leading-snug text-ink/75 md:max-w-[24ch] md:text-right">
              De laatste 75% vorm je zelf.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
