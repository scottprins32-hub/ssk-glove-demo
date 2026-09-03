# SSK glove configurator

A 2.5D glove configurator for **SSK Europe** (sskeurope.ccvshop.nl). A customer
picks a colour for each part of the glove, sees it on a photoreal render, and
finishes with a reference code that identifies the exact build.

It exists to replace the Google Form SSK currently uses to take custom glove
orders. It is meant to live at its own URL and be linked from the shop, with
the reference code travelling back to SSK alongside the order.

Live working page: `glove_builder/customiser/` — serve that directory. For
places that allow only one file, `glove_builder/customiser/dist/index.html` is
the same app folded into a single self-contained page with the fonts and every
asset embedded, and no outbound requests at all.

## What is here

| Path | What it is |
|---|---|
| `glove_builder/customiser/` | The configurator: `index.html` + `app.js` + `assets/` |
| `glove_builder/customiser/ds/` | SSK Europe design system tokens (navy / stitch red / chalk) |
| `glove_builder/customiser/dist/` | Single-file build for places that allow only one file |
| `glove_builder/layers/rainbow-back-4x/` | The zone layers the page composites (2536×3000 RGBA) |
| `glove_builder/refine_zones.py` | Turns raw SAM3 masks into clean, disjoint, SSK-true zone layers |
| `glove_builder/colour_evidence.py` | Reads the leather colours off photographs of finished gloves |
| `glove_builder/colour-evidence.json` | What those photographs said, and which colours it was enough to change |
| `glove_builder/sheen.py` | Measures each highlight layer and evens them out |
| `glove_builder/render_check.mjs` | Paints the glove one colour and checks every zone comes back that colour |
| `glove_builder/state_check.mjs` | Poisons a saved draft field by field and checks the page still comes up |
| `glove_builder/keyboard_check.mjs` | Builds the glove with Tab and Enter and checks focus survives every repaint |
| `glove_builder/runs/rainbow-back/masks_raw/` | The raw SAM3 masks, committed so the pipeline re-runs without a GPU |
| `glove_builder/source/` | The 4× upscaled source photograph the layers are cut from |
| `glove_builder/zones_rainbow_back.json` | Per-zone boxes and HSV rules for the back view |
| `glove_builder/form_spec.json`, `form_assets/` | SSK's real order form, scraped — 36 questions and its images |
| `glove_builder/sam3-cpu.patch` | Four upstream SAM3 fixes needed to run it on CPU |
| `BRIEF.md` | The separate brief for the cinematic one-page SSK demo |

## Rebuilding

Nothing here needs a GPU or a model download. From a clean checkout:

```bash
python -m venv .venv && .venv/bin/pip install -r glove_builder/requirements.txt

# raw masks -> clean zone layers
.venv/bin/python glove_builder/refine_zones.py \
    --run   glove_builder/runs/rainbow-back \
    --image glove_builder/images/SSK-Pro-Custom-12.5-Outfield-Glove-Rainbow-RHT/01_2222198493.jpg \
    --image-hr glove_builder/source/rainbow_back_4x.png \
    --zones glove_builder/zones_rainbow_back.json \
    --final glove_builder/layers/rainbow-back-4x --smooth

# photographs of finished gloves -> the leather palette (optional; the
# committed colour-evidence.json is what build_assets reads)
.venv/bin/python glove_builder/colour_evidence.py --photos <drive folder> --apply

# zone layers -> the configurator's assets (one file per layer + glove-data.json)
.venv/bin/python glove_builder/customiser/build_assets.py \
    --layers glove_builder/layers/rainbow-back-4x \
    --out    glove_builder/customiser/assets

# the checks: the palette still says what the photographs say, the highlight
# scales still match the assets, every zone still renders its own colour, and a
# draft saved by an older version of the page still opens
.venv/bin/python glove_builder/colour_evidence.py --photos <drive folder> --check
.venv/bin/python glove_builder/sheen.py --assets glove_builder/customiser/assets --check
node glove_builder/render_check.mjs
node glove_builder/state_check.mjs
node glove_builder/keyboard_check.mjs

# optional: fold the whole app into one self-contained file
.venv/bin/python glove_builder/customiser/bundle.py
```

The app uses ES modules and `fetch`, so serve it rather than opening the file
directly:

```bash
python -m http.server -d glove_builder/customiser 8000
```

SAM3 itself is only needed to segment a **new** photograph. Install it from
`facebookresearch/sam3` and apply `glove_builder/sam3-cpu.patch` first — stock
SAM3 crashes on CPU in the fused bf16 MLP and on a pinned-memory transfer.

## The configurator

Eight steps, one decision at a time, in Dutch by default with an EN/NL toggle.
It covers all 36 questions of SSK's order form — including the nine the old
builder had no answer for — and marks the fields the back view cannot show
(the two wingtips and the palm) rather than pretending they are not asked. Prices: € 294,95 for the stock Pro glove, € 374,95 configured.

Work in progress is kept in local storage, so a refresh and even a browser
restart keep it, and nothing about the customer leaves the device; "copy link"
puts the design (without their name and phone) into a URL on request. Step 1
opens on a blank glove and four colourways SSK has actually built, read off
their own photographs. Step 4 is the colour step: pick a part on the glove or
from the chip list, then a colour; the picked zone lifts slightly so you can
see what you are about to change.

## How the render works

Each zone is exported as a luminance-normalised greyscale "tint base" plus
alpha. The browser multiplies the chosen colour over that base, so one
photograph drives every colourway while keeping the leather's shading. A
parallel id-map PNG gives click-to-select on the glove itself.

A multiply can only darken, so the leather's sheen is carried by a second
`_hi` layer that is added after the tint — that is what keeps a white glove
from going grey and a black one from going flat. How *much* sheen is not the
layer's to decide: every highlight was cut from the same photograph and
carries that glove's own lighting, so unscaled they disagreed by a factor of
seven. Picking Navy everywhere produced a navy glove with a #615C60 grey belt.
`glove_builder/sheen.py` measures each layer where a colour is read from it
and stores the scale that brings them together, in `glove-data.json` rather
than in new pixels: the highlight's shape is right, only its strength was
inherited.

`node glove_builder/render_check.mjs` is the check that would have caught it.
It paints the whole glove one colour and reads every zone back off the canvas
through the id map and the layer's own alpha; one colour in has to give one
colour out, within the sheen the renderer adds on purpose. A cavity is held to
its own declared depth instead, because it is built to come out darker.

One scenario is left-handed, which is the only thing watching an alignment
nothing else tests: the render is mirrored and the id map is not, so the two
can drift apart without a pixel looking wrong, and a customer would pick the
pinky and colour the thumb. Thirteen of fifteen zones read byte-identical
between the two hands, and the other two — the SSK mark and the panel it sits
on, both drawn un-mirrored so the letters stay readable — agree within four
levels.

It needs node and a Playwright chromium, and nothing the shipped page depends
on.

The reference code packs every choice into one string (5 bits per zone for its
index in that zone's palette, 4 bits for the bullet logo, base36). It decodes
as well as encodes, so "copy link" can put a whole design in a URL and pasting
one back reopens it exactly.

## Where the colours come from

SSK's colour chart was photographed off a phone screen, so the 28 leather
hexes started out eyeballed from the names. They are now read off photographs
of finished custom gloves whose filenames name the colourway —
`glove_builder/colour_evidence.py`, with what it found in
`colour-evidence.json`. Eight leathers moved, the largest by 96 units (Mint);
Red, Camel, Orange, Grey and Electric Blue stayed, because their photographs
do not contradict the chart, and that agreement is what makes the eight worth
acting on.

Two are refused outright, with a measurement rather than an opinion: the shots
are exposed for the white paper they were taken on, so a sixth of the white
leather is a flat 255 with nothing behind it, and White and Camel cannot be
read from them at all. A frame exposed for the glove would settle both.

Stitching and embroidery keep the chart values throughout. Those are thread,
and no photograph here resolves a stitch line, so the leather's measurement is
not theirs to inherit.

## One assumption still standing

The builder moves **Palm** and **Back 2** together, on the assumption that they
are one piece of leather, and it is the only constraint in the tool with
nothing behind it. It is worth settling because it takes a choice away: SSK's
own order form asks for the two colours separately.

The rainbow glove cannot answer it. It wears one turquoise across the palm, the
web and the thumb's back panel, so the shared colour there is a colourway
choice, not a seam. Asking is a sentence — the same kind of sentence that
settled PEO-37C's belt on the bag side in one reply.

## Scope today

Back view only, of one glove (SSK Pro Custom 12.5" outfield), photographed in
a rainbow calibration colourway so every zone has a distinct hue to segment on.

Palm, thumb and pinky views and the 13 web types need their own photographs.
Adding a view is new zone boxes and hue rules per angle — the machinery is the
same.

Known gaps are tracked in the audit notes rather than here. Three that used to
be listed have since been measured or fixed, so they are recorded here rather
than left for someone to chase:

- *"Colours render darker than the SSK swatch they came from."* Measured
  across seven leather colours on a finger panel, the rendered mean sits
  **1.5% below** the swatch hex — invisible, and side by side the lit part of
  a panel matches its chip. Re-cutting the layers from the real photograph
  did not move this number (1.46% before, 1.51% after), so it was never a
  resolution artefact either. Since then every zone is checked, not just a
  panel: `render_check.mjs` paints the whole glove one colour and asserts each
  zone reads back within 25 of the hex it was given.
- *"Dark colourways lose their shading because the tint can only darken."*
  The specular pass added with `lighter` is what answers this, and it works:
  as a proportion of the colour's own brightness, black keeps **38%** of
  p5–p95 luminance range against white's 14%. In absolute terms it is 9
  levels against 34, which is little but is also what black leather does.
- *"The hand opening reads as a flat oval."* It is a cavity now, lit as one.

What is still missing is not a defect but a photograph. The palm, both
wingtips and the pad cannot be previewed from a back view at all, and two
leathers — White and Camel — cannot be read from the colourway photographs
because the camera blew them out.

There is no list of hex codes to ask SSK for, and there never will be. Pim,
asked for one: *"Hex codes hebben zij niet, die codes die ervoor staan van
10-90 gebruiken zij, want bij elke stof is het een beetje anders."* The
number is the colour, and the same number on a different leather is a
slightly different colour — so a single hex per code cannot be right for all
of them, and SSK sensibly do not publish one. Every hex in this project is
therefore ours, inferred, and the only way to make it better is a better
photograph: the swatch card flat, evenly lit, with a white sheet in the
frame to key the white balance off.

### The one photo session that unblocks most of this

Every web so far is a different glove, under different light, from a
different camera position, warped into this glove's opening. The material is
solved — every web is cut from one sheet now, and its own surface is taken
off its own photograph — but the *shapes* still come from photographs that do
not line up, and each one has to be traced by hand.

A repeatable rig fixes that, and it does not need to be fancy:

- Camera on a tripod or propped, not moved between shots.
- Glove flat on a white sheet, its position marked so each one lands in the
  same place. White matters twice over: it is what tells a web's real windows
  from its leather, because daylight through a web photographs as background.
- Window light, or a lamp bounced off a wall. No flash — the flash is what
  made the first webs look varnished.
- **Shoot the rainbow calibration glove first, then every other glove without
  touching anything.** That is the point of the whole exercise: anything shot
  in the same frame drops into the opening with almost no warping, which is
  the "immediately fits perfectly" property of the configurators Scott is
  being compared to.

In one session, ideally: the eight remaining webs (SMS, SMLEE, Modified
Trapeze, Basket, Em Rocket, Sasaki 1, Sasaki 2, Trapeze), the rainbow glove's
thumb and pinky sides, and the palm. And, separately, the leather swatch card
flat with a white sheet in frame.

A hood and a pad glove would be worth adding to that list even though both are
drawn already. They come from close-ups of two other gloves, so where they sit
on the finger is set by fractions measured off those photographs rather than
read off this one — which took three tries to get right, and is the sort of
thing one frame settles for good.

## Still to come

All 36 order-form questions are asked, plus pinky embroidery — not on the
form, but Pim confirmed it is orderable and Scott's own glove carries it.
Four of the 36 cannot be *previewed* from a back-view photograph: Back 1 and
Back 9 (the wingtips), Back 8 (the preview merges it into Back 7), and the
palm. Those are collected and labelled as not shown rather than hidden. The
other views will fix that. The pad and the hood are both drawn now, cut from
SSK's own photographs of them, so the pad/hood colour is previewed too — the
one thing it needs is for one of them to be fitted.

The web-type picker draws its own thumbnails for the five webs that can be
rendered — the customer's colours, the customer's hand, cropped to the web.
The other eight still use SSK's form photographs, which are a different glove
in a different colour each and several of which carry burned-in Japanese
captions; the note under the picker says when the preview cannot follow. Those
eight go away with one photo session (see the shoot rig above). And nothing is
wired to a backend yet: the flow ends with a reference code and a copyable
specification, which is what SSK receives alongside the order.

## Hosting

`vercel.json` serves `glove_builder/customiser` as the site root — the hosted
build, not `dist/index.html`. The single file is for places that can only take
one file; on a real host the split build is smaller per visit because the
browser keeps the 4.4 MB of assets between pages.

There is no build step. Import the repository on Vercel, framework "Other",
and the config does the rest; every push to `main` redeploys.

Assets are served `must-revalidate`. Their names do not change when they are
rebuilt — `glove.webp` is `glove.webp` whatever is in it — so a cached copy
would go on showing yesterday's glove after a deploy. That already caught us
once locally: a screenshot of a fix that had not actually been applied.

The site is closed to crawlers, by `robots.txt` and by an `X-Robots-Tag`
header for the crawlers that ignore it. The photographs, the logo and the
prices on these pages are SSK's, and publishing them is their call. Delete
both when they say yes.
