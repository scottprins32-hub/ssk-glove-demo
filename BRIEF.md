# SSK Glove Demo — build brief

Cinematic one-page product demo for **SSK Europe** (baseball gloves). Built unasked as a
pitch to the owner ("I made this for SSK — want it live?"). Dutch copy. This file is the
single source of truth for any coding session on this repo — no external context needed.

## Status

- Scaffold: Next.js (App Router, TS, Tailwind v4) + gsap, @gsap/react, lenis,
  framer-motion, lucide-react — all installed.
- Waiting on: the hero video (Kling exploded-view clip). Until it arrives, build
  everything else with a static-image hero placeholder.

## Design tokens (define in `app/globals.css` under `@theme inline`)

- Surfaces: near-black ink `#0d0b09` (warm, leather-adjacent) and warm paper `#f4f1ea`;
  sections alternate dark/light down the page.
- ONE accent: glove-leather amber/tan, 3-stop gradient
  `linear-gradient(100deg, #e0a860 0%, #b97b2e 45%, #f0c07a 100%)` — used as
  punctuation only (one headline word, stats, hairlines, dots).
- Fonts via next/font: Manrope (`--font-manrope`, display + body),
  Instrument Serif italic (`--font-instrument-serif`, emotional lines), default mono for
  metadata. Reference implementation of tokens/utilities (.text-gradient, .glass-panel,
  .hairline, .noise-overlay, reduced-motion block): the sibling repo
  `scottprins32-hub/bp-padel-website` → `app/globals.css`.

## Page plan (build in this order, ONE section at a time, check localhost after each)

1. **Hero (ink)** — scroll-scrubbed exploded-glove video. Until the video lands: static
   dark-studio glove image, same overlay contract (mono eyebrow `§ 01 · Handschoenen`,
   big two-tone headline "Elk onderdeel **telt**." with the accent word gradient-clipped,
   short lead, CTA "Bekijk de collectie" → #contact). When the video arrives: extract
   frames `ffmpeg -i hero-video.mp4 -vf "fps=30,scale=1280:-2:flags=lanczos" -qscale:v 1
   public/frames/desktop/frame_%04d.jpg`, then canvas-scrub component pinned 3 viewport
   heights (copy `components/ScrollVideo.tsx` from the bp-padel-website repo — it is
   proven; hard-code the real frame count).
2. **Craft (paper)** — exploded-view still, annotated: mono labels per component
   (leer / vetersluiting / web / voering), hairline connectors, one stat with accent.
3. **Collectie (ink)** — stacking cards or horizontal gallery of glove models; images in
   `public/gloves/` (real product photos, added by Scott).
4. **Proces (paper)** — 3 steps: kies je model → pas & bestel → inspelen en spelen.
5. **Contact + footer (ink)** — neutral SSK block, demo form (no backend), no invented
   phone/email — leave clearly-labeled slots.

## Rules (non-negotiable)

- One section per prompt/commit; verify in browser before the next.
- No fake testimonials, no invented facts/numbers/contact details — use only what's in
  this brief or clearly mark `[CHECK]`.
- Mobile: every pinned/scrubbed desktop move collapses to a plain stacked layout under
  768px. Respect `prefers-reduced-motion` (static frame, no pin).
- Lenis smooth scroll desktop-only (`(min-width:768px) and (pointer:fine)`), one
  instance, wired to ScrollTrigger (see bp-padel-website `components/SmoothScroll.tsx`).
- Accent discipline: ~90% monochrome; accent as punctuation only.
- `npm run build` must pass before any push.

## Real data (scraped from sskeurope.ccvshop.nl, 2026-07-17 — use ONLY this, no inventing)

### Company / contact (for §5 Contact)
- Naam: SSK European Baseball Center
- Adres: Heulweg 128B, 2295KK Kwintsheul
- Telefoon: +31 174 501 888
- E-mail: info@sskeurope.com

### SSK glove series & prices (for §3 Collectie + stats)
Current SSK-branded field gloves in the shop (prices as listed):
- **ProEdge** — €349,95 (top line; 11.5" infield, 12.75" outfield)
- **Pro Custom** — €294,95 (11.5"–12.75" + 33"/33.5" catcher)
- **Z9** — €249,95 (11.5" infield, 12" pitcher, 12.75" outfield)
- **Advanced** — €194,95–€249,95 (11.5"–12.75"; also softball + 34" catcher €249,95)
- **Z7** — €199,95 (11.5" infield)
- **EBC50** — €149,95 (catcher, 32"–33.5", "Crocodile Pattern")
Series filter on the shop also lists: S20, Win-Dream, EBC20, EBC10, Hero's Dream.
Shop sells other brands too (Rawlings, Wilson, …) — the demo pitches SSK only.

### Product-level facts (from SSK Z9 product page — for §2 Craft copy)
- "Premium Japanese Nameshi Leather" — feel, durability, shape retention
- Top grain leather lacing; plush leather palm lining; premium leather binding;
  rolled welting for shape retention; palm overlap for stability
- Double Spiral I Web ("dirt easily escapes through the web")
- 25% factory break-in / 75% player break-in
- SSK branded glove bag included
- Positions per model (infield/pitcher/outfield/catcher/first base), RHT/LHT

### Product photos
- Shop photo URL pattern:
  `https://sskeurope.ccvshop.nl//Files/2/81000/81585/ProductPhotos/1500x1500/<id>.jpg`
  (white background; cut out for dark sections — see `public/gloves/`)
- In repo: `public/gloves/advanced-tan-1175.webp` = SSK Advanced 11.75"
  Pitcher/Infield Glove Tan RHT, €249,95 (cutout, used in hero)
