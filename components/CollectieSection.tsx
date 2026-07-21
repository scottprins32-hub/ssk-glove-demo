import Image, { type StaticImageData } from "next/image";
import Reveal from "@/components/Reveal";
import advancedSalmon from "@/public/gloves/advanced-salmon-115.webp";
import z9Black from "@/public/gloves/z9-black-colombia-12.webp";
import proCustomNavy from "@/public/gloves/procustom-navy-orange-115.webp";
import proEdgeBlack from "@/public/gloves/proedge-black-red-115.webp";

/**
 * §3 Collectie (ink) — horizontal gallery of real SSK models, one per series,
 * ordered by tier. Names, specs and prices come straight from the shop
 * (BRIEF.md "Real data"); photos are shop stills cut out in public/gloves/.
 */

type Model = {
  n: string;
  series: string;
  spec: string;
  price: string;
  img: StaticImageData;
  alt: string;
};

const models: Model[] = [
  {
    n: "01",
    series: "Advanced",
    spec: "11.5″ infield · salmon/colombia blue",
    price: "€ 194,95",
    img: advancedSalmon,
    alt: "SSK Advanced 11.5″ Infield Glove Salmon/Colombia Blue",
  },
  {
    n: "02",
    series: "Z9",
    spec: "12″ pitcher · black/colombia blue",
    price: "€ 249,95",
    img: z9Black,
    alt: "SSK Z9 12″ Pitcher Glove Black/Colombia Blue",
  },
  {
    n: "03",
    series: "Pro Custom",
    spec: "11.5″ infield · navy/orange",
    price: "€ 294,95",
    img: proCustomNavy,
    alt: "SSK Pro Custom 11.5″ Infield Glove Navy/Orange",
  },
  {
    n: "04",
    series: "ProEdge",
    spec: "11.5″ infield · black/red",
    price: "€ 349,95",
    img: proEdgeBlack,
    alt: "SSK ProEdge 11.5″ Infield Glove Black/Red",
  },
];

export default function CollectieSection() {
  return (
    <section id="collectie" className="bg-ink text-foreground">
      <div className="mx-auto max-w-6xl px-6 pt-24 md:px-12 md:pt-36">
        <Reveal>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-white/50">
            § 03 · Collectie
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            <span className="text-gradient">Kies je serie.</span>
          </h2>
          <p className="mt-5 max-w-[52ch] text-[clamp(0.95rem,1.05vw,1.05rem)] font-light leading-[1.65] text-white/65">
            Vier series, oplopend in leer en afwerking — van Advanced tot
            ProEdge. Alle modellen komen uit de winkel in Kwintsheul.
          </p>
          <div className="hairline-leather mt-8 max-w-40" />
        </Reveal>
      </div>

      <Reveal className="mt-12 md:mt-16">
        <div className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-24 md:px-12 md:pb-36 lg:px-[max(3rem,calc((100vw-72rem)/2+3rem))]">
          {models.map((m) => (
            <article
              key={m.n}
              className="glass-panel group w-[min(78vw,320px)] shrink-0 snap-start rounded-2xl p-6 transition-colors duration-300 hover:border-white/25 md:w-[320px]"
            >
              <header className="flex items-baseline justify-between font-mono text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "var(--leather-grad)" }}
                  />
                  {m.n}
                </span>
                <span>{m.price}</span>
              </header>
              <div className="mt-6 flex h-52 items-center justify-center">
                <Image
                  src={m.img}
                  alt={m.alt}
                  sizes="320px"
                  className="max-h-full w-auto drop-shadow-[0_24px_40px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <h3 className="mt-6 font-display text-xl font-medium tracking-[-0.02em]">
                {m.series}
              </h3>
              <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] leading-relaxed text-white/45">
                {m.spec}
              </p>
            </article>
          ))}

          {/* Tail card: the rest of the collection lives in the shop */}
          <a
            href="#contact"
            className="glass-panel flex w-[min(78vw,320px)] shrink-0 snap-start flex-col items-start justify-between rounded-2xl p-6 transition-colors duration-300 hover:border-white/25 md:w-[320px]"
          >
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
              + meer
            </span>
            <span className="font-serif text-2xl italic leading-snug text-white/80">
              Ook Z7, EBC50, catcher- en eerste-honk­modellen.
            </span>
            <span className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-white/45">
              Vraag ernaar →
            </span>
          </a>
        </div>
      </Reveal>
    </section>
  );
}
