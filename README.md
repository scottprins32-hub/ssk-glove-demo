# SSK glove configurator

A 2.5D glove configurator for **SSK Europe** (sskeurope.ccvshop.nl). A customer
picks a colour for each part of the glove, sees it on a photoreal render, and
finishes with a reference code that identifies the exact build.

It exists to replace the Google Form SSK currently uses to take custom glove
orders. It is meant to live at its own URL and be linked from the shop, with
the reference code travelling back to SSK alongside the order.

Live working page: `glove_builder/customiser/index.html` — a single
self-contained file, no server and no build step required to view it.

## What is here

| Path | What it is |
|---|---|
| `glove_builder/customiser/` | The configurator: `template.html` + `build_assets.py` produce `index.html` |
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

# zone layers -> the configurator page
.venv/bin/python glove_builder/customiser/build_assets.py \
    --layers glove_builder/layers/rainbow-back-4x \
    --out    glove_builder/customiser/index.html
```

SAM3 itself is only needed to segment a **new** photograph. Install it from
`facebookresearch/sam3` and apply `glove_builder/sam3-cpu.patch` first — stock
SAM3 crashes on CPU in the fused bf16 MLP and on a pinned-memory transfer.

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

## Not represented yet

SSK's form asks 36 questions; the configurator covers 16 of them. Absent and
required: name, phone, hand, glove size, finger pad/hood, web type, palm
colour, Back 1 (wingtip thumb) and Back 9 (wingtip pinky). The whole thumb
personalisation block (name, font, number, circle colour) and the index-finger
flag option are also missing.
