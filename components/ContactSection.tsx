import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";

/**
 * §5 Contact + footer (ink). Contact details are the real ones from the shop
 * (BRIEF.md "Real data"); the form is a demo without a backend.
 */
export default function ContactSection() {
  return (
    <section id="contact" className="bg-ink text-foreground">
      <div className="mx-auto max-w-6xl px-6 pt-24 md:px-12 md:pt-36">
        <Reveal>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.32em] text-white/50">
            § 05 · Contact
          </p>
          <h2 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.6rem)] font-medium leading-[1.02] tracking-[-0.035em]">
            <span className="text-gradient">Kom langs, </span>
            <span className="font-serif italic font-normal text-white/85">pas er één.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-14 md:mt-20 md:grid-cols-2 md:gap-20">
          <Reveal>
            <dl className="flex flex-col gap-8">
              <div>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/45">
                  Winkel
                </dt>
                <dd className="mt-2 text-[1.05rem] font-light leading-[1.7] text-white/80">
                  SSK European Baseball Center
                  <br />
                  Heulweg 128B
                  <br />
                  2295KK Kwintsheul
                </dd>
              </div>
              <div className="hairline" />
              <div>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/45">
                  Telefoon
                </dt>
                <dd className="mt-2 text-[1.05rem] font-light text-white/80">
                  <a href="tel:+31174501888" className="transition-colors hover:text-white">
                    +31 174 501 888
                  </a>
                </dd>
              </div>
              <div className="hairline" />
              <div>
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-white/45">
                  E-mail
                </dt>
                <dd className="mt-2 text-[1.05rem] font-light text-white/80">
                  <a
                    href="mailto:info@sskeurope.com"
                    className="transition-colors hover:text-white"
                  >
                    info@sskeurope.com
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={120}>
            <div className="glass-panel rounded-2xl p-6 md:p-8">
              <ContactForm />
            </div>
          </Reveal>
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto mt-24 max-w-6xl px-6 pb-10 md:mt-32 md:px-12">
        <div className="hairline" />
        <div className="mt-6 flex flex-col gap-2 pb-2 font-mono text-[0.62rem] uppercase tracking-[0.25em] text-white/35 md:flex-row md:items-center md:justify-between">
          <span>SSK European Baseball Center · Kwintsheul</span>
          <span>Concept-demo · geen officiële SSK-site</span>
        </div>
      </footer>
    </section>
  );
}
