import Reveal from "@/components/Reveal";

/**
 * §4 Proces (paper) — the three steps from the brief:
 * kies je model → pas & bestel → inspelen en spelen.
 */

const steps = [
  {
    n: "01",
    title: "Kies je model",
    body: "Positie, maat en serie — infield, pitcher, outfield, catcher of eerste honk. Van Advanced tot ProEdge.",
  },
  {
    n: "02",
    title: "Pas & bestel",
    body: "Pas hem in de winkel in Kwintsheul of bestel direct. Rechts- en linksvangend, honkbal en softbal.",
  },
  {
    n: "03",
    title: "Inspelen en spelen",
    body: "25% is al gedaan in de fabriek. De overige 75% speel je er zelf in — tot hij precies jouw vorm heeft.",
  },
];

export default function ProcesSection() {
  return (
    <section id="proces" className="bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-36">
        <Reveal>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-ink/50">
            § 04 · Proces
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            <span className="text-gradient-dark">In drie stappen op het veld.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-12 md:mt-20 md:grid-cols-3 md:gap-10">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 110}>
              <div className="hairline-dark" />
              <p className="mt-6 font-mono text-[0.62rem] uppercase tracking-[0.3em]">
                <span className="text-gradient-leather font-semibold">{s.n}</span>
              </p>
              <h3 className="mt-3 font-display text-xl font-medium tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="mt-3 max-w-[36ch] text-[0.95rem] font-light leading-[1.65] text-ink/60">
                {s.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
