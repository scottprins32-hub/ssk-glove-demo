# Handoff — store-shoot pass, 23 Sep 2026

## What was built

- **Rainbow bullet patch and SSK wordmark** cut from the store macros
  (DSC05744, DSC05728). The engine now draws a photographed patch before
  falling back to the raw cut-out, which is why Rainbow never showed.
- **Wrist badges fitted to the real patch footprint.** The footprint is read
  off the belt's blue border, the leather under it is inpainted, and each
  badge is fitted by rotation plus uniform scale for best overlap.
- **Badge colours matched to SSK's catalogue** thread colours; White/Gold and
  Red/Gold added in the two unused Silicone slots, so the 4-bit reference code
  is unchanged.
- **Two new webs rendered:** SMLEE (photo 8) and Em Rocket (DSC05715, RAW).
  Trapeze and Modified Trapeze are specced in `make_web.py` but not shipped:
  their lace lattices need a hand trace in the tracer.
- **All-round relight** of the store photos (`flatten_light.py`): light is read
  off each glove's shell leather and divided out inside the silhouette.
- **Finger hood** now cut from Scott's close-up DSC05724.
- **Tracer** includes the store photos (`make_tracer.py`).
- **Bag configurator** (other repo, `ssk-bag-configurator`): PEO-42B piping
  question closed from the 2026 catalogue; all 16 models checked against it.
- **Kit Builder outline** written as a Claude Doc (not in this repo).

## Files changed

- `glove_builder/customiser/build_assets.py` — `wrist_patch()`, `fit_badge()`,
  new COMBO_SLUGS, BULLET_OPTIONS slots 3–4
- `glove_builder/customiser/glove-engine.js` — `drawBullet` asset-first order
- `glove_builder/customiser/recolor_badge.py` — catalogue hexes, `white_region`
- `glove_builder/customiser/glove-catalog.js` — render slugs for SMLEE, Em Rocket
- `glove_builder/make_web.py` — lace saturation/brightness bounds, 4 store specs
- `glove_builder/make_pad.py` — hood from `images/store-2026-09/hood.jpg`
- `glove_builder/flatten_light.py` — new
- `glove_builder/make_tracer.py` — store photos included
- `glove_builder/images/store-2026-09/`, `layers/webs/{smlee,em-rocket}/`,
  `layers/hood/`, badge PNGs, `assets/`, `dist/`
- `README.md` — web counts and shoot notes

## Least sure about

- **The relight.** It flattens shading by dividing out a smoothed light field;
  on dark leather it lifts noise and it can make leather look flat rather than
  lit. Judged by eye only, on four photos.
- **Web outlines** for SMLEE and Em Rocket were read off gridded crops, not
  traced. They pass at app size; a close look may show edges off by a few px.
- **Badge colours** are medians of SSK's product photos, which are themselves
  retouched. White/Gold and Red/Gold are not in SSK's catalogue list; Pim
  should confirm they are orderable.
- **Hood placement** reuses the old top/bottom fractions from the catalogue
  photo; the new photo was not checked against a hood-wearing glove on the
  rig.
