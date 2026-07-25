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

# zone layers -> the configurator's assets (one file per layer + glove-data.json)
.venv/bin/python glove_builder/customiser/build_assets.py \
    --layers glove_builder/layers/rainbow-back-4x \
    --out    glove_builder/customiser/assets

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
(the two wingtips, the palm, and the pad colour) rather than pretending they
are not asked. Prices: € 294,95 for the stock Pro glove, € 374,95 configured.

The whole design is in the URL, so a refresh keeps it and a link restores it.
Step 4 is the colour step: pick a part on the glove or from the chip list,
then a colour; the picked zone lifts slightly so you can see what you are
about to change.

## How the render works

Each zone is exported as a luminance-normalised greyscale "tint base" plus
alpha. The browser multiplies the chosen colour over that base, so one
photograph drives every colourway while keeping the leather's shading. A
parallel id-map PNG gives click-to-select on the glove itself.

The reference code packs every choice into one string (5 bits per zone for its
index in that zone's palette, 4 bits for the bullet logo, base36). It decodes
as well as encodes, so it is written into the URL hash — a refresh or a
forwarded link reopens the exact design.

## Scope today

Back view only, of one glove (SSK Pro Custom 12.5" outfield), photographed in
a rainbow calibration colourway so every zone has a distinct hue to segment on.

Palm, thumb and pinky views and the 13 web types need their own photographs.
Adding a view is new zone boxes and hue rules per angle — the machinery is the
same.

Known gaps worth fixing before this is shown as finished are tracked in the
audit notes rather than here; the largest are that colours render darker than
the SSK swatch they came from, that the hand opening reads as a flat oval, and
that dark colourways lose their shading because the tint can only darken.

## Still to come

All 36 order-form questions are asked, but five of them cannot be *previewed*
from a back-view photograph: Back 1 and Back 9 (the wingtips), Back 8 (the
preview merges it into Back 7), the palm, and the pad/hood colour. Those are
collected and labelled as not shown rather than hidden. The other views will
fix that.

The web-type picker uses SSK's own form thumbnails, which carry burned-in
Japanese captions — they want reshooting or cropping. And nothing is wired to
a backend yet: the flow ends with a reference code and a copyable
specification, which is what SSK receives alongside the order.
