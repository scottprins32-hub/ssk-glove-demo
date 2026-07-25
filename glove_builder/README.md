# SSK 2.5D Glove Builder — SAM3 cutout pipeline

Goal: replace the current Google Form ordering flow with a visual glove
configurator for SSK Europe (sskeurope.ccvshop.nl). A customer picks a model
(e.g. AP1-1175 / AP1-1200), a web type (Spiral I, I-Web, SMS, SMK, H-Web,
Basket, Sasaki I/II, ...) and a color per zone (SSK leather colors 10 White
through 93 Grey), and sees a realistic 2.5D preview built from photo layers.

## Pipeline

1. **Photograph** each glove model straight-on (back view and palm view),
   even light, plain background. A light/neutral leather colorway works best —
   recoloring light leather to any target color looks far better than
   recoloring dark leather.
2. **Segment** each customizable zone with SAM3 (`make_cutouts.py`): web,
   laces, binding/welting, back panels (Back1–9 on the SSK order sheet),
   thumb/pinky loops, lining, belt, logo, embroidery.
3. **Export** each zone as a grayscale mask + transparent RGBA layer.
4. **Configure**: the web frontend stacks the layers and tints each one
   (multiply/HSL shift) with the selected SSK color; web-type choice swaps the
   web layer group.

## Usage

```bash
# one-time: request access at https://huggingface.co/facebook/sam3, then
.venv/bin/hf auth login          # paste your HF token

.venv/bin/python glove_builder/make_cutouts.py \
    --image glove_builder/images/ap1-1200-back.jpg \
    --prompts glove_builder/prompts.json
```

Outputs land in `out/<image name>/`:

- `masks/<zone>.png` — grayscale mask per zone
- `layers/<zone>.png` — transparent RGBA cutout per zone
- `preview.jpg` — all zones color-coded for a quick visual check
- `report.json` — instance counts and confidence scores per prompt

Text prompts get you most of the way; zones SAM3 can't isolate by text alone
(e.g. individual back panels Back1 vs Back2) can be refined with box/point
prompts — planned as a follow-up interactive step.

Put source photos in `glove_builder/images/` (kept out of git history only if
they are large; small JPEGs are fine to commit).
