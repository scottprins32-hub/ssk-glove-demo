"use client";

import { useState } from "react";

/** Demo form — deliberately not wired to a backend (per BRIEF.md §5). */
export default function ContactForm() {
  const [sent, setSent] = useState(false);

  const field =
    "w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-light text-white placeholder:text-white/30 outline-none transition-colors duration-300 focus:border-white/40";

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <input type="text" name="naam" placeholder="Naam" className={field} />
      <input type="email" name="email" placeholder="E-mail" className={field} />
      <textarea
        name="bericht"
        placeholder="Waar speel je, en wat zoek je?"
        rows={4}
        className={`${field} resize-none`}
      />
      <button
        type="submit"
        className="mt-2 self-start rounded-full border border-white/30 bg-black/20 px-7 py-3 text-sm tracking-wide text-white transition-colors duration-300 hover:border-white/60"
      >
        Verstuur
      </button>
      <p
        className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-white/40"
        role="status"
      >
        {sent
          ? "Demo — dit formulier is nog niet gekoppeld."
          : "Demo-formulier · nog niet gekoppeld"}
      </p>
    </form>
  );
}
